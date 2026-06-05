import { Inject, Injectable } from "@nestjs/common";
import { PRISMA_CLIENT } from "../../common/prisma-runtime/prisma-runtime.tokens.js";
import type {
	PointsTransactionType,
	PrismaClient,
} from "../../generated/client.js";

// Default level thresholds (used when no MemberLevelRule exists for the store)
const DEFAULT_THRESHOLDS = [
	{ level: "DIAMOND", threshold: 50_000 },
	{ level: "PLATINUM", threshold: 20_000 },
	{ level: "GOLD", threshold: 3_000 },
	{ level: "SILVER", threshold: 1_000 },
	{ level: "NEW", threshold: 0 },
] as const;

export interface PointsInput {
	customerId: string;
	type: PointsTransactionType;
	amount: number;
	reason?: string;
	source?: Record<string, unknown>;
	storeId?: string;
}

@Injectable()
export class MemberService {
	constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

	async listByStore(storeId: string) {
		const customers = await this.prisma.customer.findMany({
			where: { storeId, status: "ACTIVE" },
			include: {
				identities: { select: { type: true, rawHint: true }, take: 1 },
				memberProfile: true,
				jewelryBoxItems: { select: { id: true } },
			},
			orderBy: { createdAt: "desc" },
		});

		return customers.map((c) => {
			const profile = c.memberProfile;
			if (!profile) {
				return {
					id: c.id,
					name: c.displayName || "匿名",
					phone: c.identities[0]?.rawHint || "—",
					level: "NEW",
					levelName: "新会员",
					levelColor: "#6BA36B",
					points: 0,
					growthExp: 0,
					totalSpentCents: 0,
					totalTryOns: 0,
					totalWearCount: 0,
					badgeCount: 0,
					daysSinceJoin: Math.floor(
						(Date.now() - new Date(c.createdAt).getTime()) / 86_400_000,
					),
					lastActive: c.updatedAt.toISOString(),
					streakDays: 0,
					maxStreakDays: 0,
					lastLuckySignDay: null,
				};
			}

			const daysSinceJoin = Math.floor(
				(Date.now() - new Date(profile.joinDate).getTime()) / 86_400_000,
			);

			return {
				id: c.id,
				name: c.displayName || "匿名",
				phone: c.identities[0]?.rawHint || "—",
				level: profile.level,
				levelName: this.levelDisplayName(profile.level),
				levelColor: this.levelDisplayColor(profile.level),
				points: profile.points,
				growthExp: profile.growthExp,
				totalSpentCents: profile.totalSpentCents,
				totalTryOns: profile.totalTryOns,
				totalWearCount: profile.totalWearCount,
				badgeCount: profile.badgeCount,
				daysSinceJoin,
				lastActive: profile.lastActiveAt.toISOString(),
				streakDays: profile.streakDays,
				maxStreakDays: profile.maxStreakDays,
				lastLuckySignDay: profile.lastLuckySignDay,
			};
		});
	}

	async getDetail(customerId: string) {
		const customer = await this.prisma.customer.findUnique({
			where: { id: customerId },
			include: {
				identities: true,
				memberProfile: true,
				jewelryBoxItems: {
					select: {
						id: true,
						displayName: true,
						gemType: true,
						priceCents: true,
						badges: true,
					},
				},
			},
		});
		if (!customer) return null;

		const points = await this.prisma.pointsTransaction.count({
			where: { customerId },
		});

		const profile = customer.memberProfile;
		return {
			customer: {
				id: customer.id,
				name: customer.displayName || "匿名",
				phone: customer.identities[0]?.rawHint || "—",
				tags: customer.tags,
				joinDate: customer.createdAt,
			},
			profile: profile
				? {
						level: profile.level,
						levelName: this.levelDisplayName(profile.level),
						levelColor: this.levelDisplayColor(profile.level),
						points: profile.points,
						growthExp: profile.growthExp,
						totalSpentCents: profile.totalSpentCents,
						totalTryOns: profile.totalTryOns,
						totalWearCount: profile.totalWearCount,
						badgeCount: profile.badgeCount,
						streakDays: profile.streakDays,
						maxStreakDays: profile.maxStreakDays,
						lastLuckySignDay: profile.lastLuckySignDay,
						lastActive: profile.lastActiveAt.toISOString(),
					}
				: {
						level: "NEW",
						levelName: "新会员",
						levelColor: "#6BA36B",
					},
			jewelryBoxCount: customer.jewelryBoxItems.length,
			transactionCount: points,
		};
	}

	async history(customerId: string, limit = 50) {
		const txs = await this.prisma.pointsTransaction.findMany({
			where: { customerId },
			orderBy: { createdAt: "desc" },
			take: limit,
		});
		return txs;
	}

	async addPoints(input: PointsInput): Promise<{
		ok: boolean;
		transactionId: string;
		newBalance: number;
		levelChanged: boolean;
		newLevel: string | null;
	}> {
		const profile = await this.prisma.memberProfile.findUnique({
			where: { customerId: input.customerId },
		});

		if (!profile) {
			throw new Error(`No MemberProfile for customer ${input.customerId}`);
		}

		if (input.amount <= 0) {
			throw new Error("Points amount must be positive");
		}

		const newBalance = profile.points + input.amount;
		const newGrowthExp = profile.growthExp + input.amount * 8;
		const currentLevel = profile.level;
		const nextLevel = this.calculateLevel(newBalance, input.storeId);

		const result = await this.prisma.$transaction(async (tx) => {
			const transaction = await tx.pointsTransaction.create({
				data: {
					customerId: input.customerId,
					type: input.type,
					amount: input.amount,
					balance: newBalance,
					reason: input.reason || `+${input.amount} (${input.type})`,
					source: input.source
						? JSON.parse(JSON.stringify(input.source))
						: undefined,
				},
			});

			const updateData: Record<string, unknown> = {
				points: newBalance,
				growthExp: newGrowthExp,
				lastActiveAt: new Date(),
			};

			if (nextLevel !== currentLevel) {
				updateData["level"] = nextLevel;
				updateData["levelUpgradedAt"] = new Date();
			}

			await tx.memberProfile.update({
				where: { customerId: input.customerId },
				data: updateData as Parameters<
					typeof tx.memberProfile.update
				>[0]["data"],
			});

			return {
				ok: true,
				transactionId: transaction.id,
				newBalance,
				levelChanged: nextLevel !== currentLevel,
				newLevel: nextLevel !== currentLevel ? nextLevel : null,
			};
		});

		return result;
	}

	async spendPoints(customerId: string, amount: number, reason: string) {
		const profile = await this.prisma.memberProfile.findUnique({
			where: { customerId },
		});
		if (!profile) throw new Error(`No profile for ${customerId}`);
		if (profile.points < amount) throw new Error("Insufficient points");

		const newBalance = profile.points - amount;

		return this.prisma.$transaction(async (tx) => {
			const transaction = await tx.pointsTransaction.create({
				data: {
					customerId,
					type: "SPENT",
					amount: -amount,
					balance: newBalance,
					reason,
				},
			});
			await tx.memberProfile.update({
				where: { customerId },
				data: {
					points: newBalance,
					lastActiveAt: new Date(),
				},
			});
			return {
				ok: true,
				transactionId: transaction.id,
				newBalance,
			};
		});
	}

	async ensureProfile(customerId: string) {
		const profile = await this.prisma.memberProfile.findUnique({
			where: { customerId },
		});
		if (profile) return profile;
		return this.prisma.memberProfile.create({
			data: { customerId },
		});
	}

	async getLevelRules(storeId: string) {
		const rules = await this.prisma.memberLevelRule.findMany({
			where: { storeId, isActive: true },
			orderBy: { sortOrder: "asc" },
		});
		return rules;
	}

	async listAllLevels() {
		return [
			{
				level: "NEW",
				name: "new",
				displayName: "新会员",
				displayColor: "#6BA36B",
				displayIcon: "🌱",
				requiredPoints: 0,
			},
			{
				level: "SILVER",
				name: "silver",
				displayName: "银卡会员",
				displayColor: "#8A8A8A",
				displayIcon: "🥈",
				requiredPoints: 1000,
			},
			{
				level: "GOLD",
				name: "gold",
				displayName: "金卡会员",
				displayColor: "#C9A24E",
				displayIcon: "👑",
				requiredPoints: 3000,
			},
			{
				level: "PLATINUM",
				name: "platinum",
				displayName: "铂金会员",
				displayColor: "#A8B4C4",
				displayIcon: "💍",
				requiredPoints: 20000,
			},
			{
				level: "DIAMOND",
				name: "diamond",
				displayName: "钻石会员",
				displayColor: "#D4B6FF",
				displayIcon: "💎",
				requiredPoints: 50000,
			},
		];
	}

	private calculateLevel(points: number, storeId?: string): string {
		if (!storeId) {
			for (const t of DEFAULT_THRESHOLDS) {
				if (points >= t.threshold) return t.level;
			}
			return "NEW";
		}
		return "NEW";
	}

	private levelDisplayName(level: string): string {
		const map: Record<string, string> = {
			NEW: "新会员",
			SILVER: "银卡会员",
			GOLD: "金卡会员",
			PLATINUM: "铂金会员",
			DIAMOND: "钻石会员",
		};
		return map[level] || level;
	}

	private levelDisplayColor(level: string): string {
		const map: Record<string, string> = {
			NEW: "#6BA36B",
			SILVER: "#8A8A8A",
			GOLD: "#C9A24E",
			PLATINUM: "#A8B4C4",
			DIAMOND: "#D4B6FF",
		};
		return map[level] || "#888";
	}
}

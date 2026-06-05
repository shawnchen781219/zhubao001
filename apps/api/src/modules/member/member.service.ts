import { Inject, Injectable } from "@nestjs/common";
import { PRISMA_CLIENT } from "../../common/prisma-runtime/prisma-runtime.tokens.js";
import type {
	MemberLevel,
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

const LEVEL_ORDER: Record<string, number> = {
	NEW: 0,
	SILVER: 1,
	GOLD: 2,
	PLATINUM: 3,
	DIAMOND: 4,
};

export interface PointsInput {
	customerId: string;
	type: PointsTransactionType;
	amount: number;
	reason?: string;
	source?: Record<string, unknown>;
	storeId?: string;
}

export interface AddPointsResult {
	ok: boolean;
	transactionId: string;
	newBalance: number;
	levelChanged: boolean;
	newLevel: string | null;
	levelLogId: string | null;
	notificationId: string | null;
}

export interface LevelHistoryItem {
	id: string;
	fromLevel: string | null;
	toLevel: string;
	direction: string;
	fromPoints: number;
	toPoints: number;
	triggerPointsBalance: number;
	triggerPointsTransactionId: string | null;
	note: string | null;
	createdAt: Date;
	fromLevelName: string | null;
	toLevelName: string;
	fromLevelColor: string | null;
	toLevelColor: string;
	earnedBenefits: string[];
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
					levelUpgradedAt: null,
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
				levelUpgradedAt: profile.levelUpgradedAt?.toISOString() || null,
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

		// 计算下一等级所需积分
		const currentPoints = profile?.points ?? 0;
		const currentLevel = profile?.level ?? "NEW";
		const nextLevel = this.nextLevelFor(currentLevel);
		const nextLevelThreshold = nextLevel
			? this.levelThreshold(nextLevel)
			: null;
		const pointsToNextLevel =
			nextLevelThreshold !== null
				? Math.max(0, nextLevelThreshold - currentPoints)
				: 0;

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
						levelIcon: this.levelDisplayIcon(profile.level),
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
						levelUpgradedAt: profile.levelUpgradedAt?.toISOString() || null,
						nextLevel: nextLevel
							? {
									level: nextLevel,
									levelName: this.levelDisplayName(nextLevel),
									levelColor: this.levelDisplayColor(nextLevel),
									levelIcon: this.levelDisplayIcon(nextLevel),
									threshold: nextLevelThreshold,
									pointsToNext: pointsToNextLevel,
								}
							: null,
						currentBenefits: this.levelBenefits(profile.level),
					}
				: {
						level: "NEW",
						levelName: "新会员",
						levelColor: "#6BA36B",
						levelIcon: "🌱",
						nextLevel: null,
						currentBenefits: [],
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

	async levelHistory(
		customerId: string,
		limit = 50,
	): Promise<LevelHistoryItem[]> {
		const logs = await this.prisma.memberLevelLog.findMany({
			where: { customerId },
			orderBy: { createdAt: "desc" },
			take: limit,
		});

		return logs.map((log) => ({
			id: log.id,
			fromLevel: log.fromLevel,
			toLevel: log.toLevel,
			direction: log.direction,
			fromPoints: log.fromPoints,
			toPoints: log.toPoints,
			triggerPointsBalance: log.triggerPointsBalance,
			triggerPointsTransactionId: log.triggerPointsTransactionId,
			note: log.note,
			createdAt: log.createdAt,
			fromLevelName: log.fromLevel
				? this.levelDisplayName(log.fromLevel)
				: null,
			toLevelName: this.levelDisplayName(log.toLevel),
			fromLevelColor: log.fromLevel
				? this.levelDisplayColor(log.fromLevel)
				: null,
			toLevelColor: this.levelDisplayColor(log.toLevel),
			earnedBenefits: this.levelBenefits(log.toLevel),
		}));
	}

	async addPoints(input: PointsInput): Promise<AddPointsResult> {
		const customer = await this.prisma.customer.findUnique({
			where: { id: input.customerId },
			select: { storeId: true },
		});
		if (!customer) {
			throw new Error(`No Customer with id ${input.customerId}`);
		}

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
		const levelChanged = nextLevel !== currentLevel;
		const direction = levelChanged
			? this.levelDirectionValue(currentLevel, nextLevel)
			: null;
		// 等级变更的文案与图标
		const notificationInfo = levelChanged
			? this.buildLevelNotification(nextLevel, direction ?? "UPGRADE")
			: null;

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

			let levelLogId: string | null = null;
			let notificationId: string | null = null;

			if (levelChanged && direction && notificationInfo) {
				updateData["level"] = nextLevel;
				updateData["levelUpgradedAt"] = new Date();

				// 1) 创建等级变更历史
				const levelLog = await tx.memberLevelLog.create({
					data: {
						customerId: input.customerId,
						fromLevel: currentLevel,
						toLevel: nextLevel,
						direction,
						triggerPointsBalance: newBalance,
						triggerPointsTransactionId: transaction.id,
						fromPoints: profile.points,
						toPoints: newBalance,
						note: input.reason || `${input.type}`,
					},
				});
				levelLogId = levelLog.id;

				// 2) 创建应用内通知
				const notification = await tx.notification.create({
					data: {
						customerId: input.customerId,
						type: notificationInfo.type as any,
						title: notificationInfo.title,
						body: notificationInfo.body,
						iconEmoji: notificationInfo.iconEmoji,
						actionUrl: notificationInfo.actionUrl,
						payload: JSON.parse(JSON.stringify(notificationInfo.payload)),
					},
				});
				notificationId = notification.id;

				// 3) 写入 EventLog（用于运营审计）
				try {
					await tx.eventLog.create({
						data: {
							storeId: customer.storeId,
							eventType:
								direction === "UPGRADE"
									? ("MEMBER_LEVEL_UPGRADED" as any)
									: ("MEMBER_LEVEL_DOWNGRADED" as any),
							customerId: input.customerId,
							payload: JSON.parse(
								JSON.stringify({
									fromLevel: currentLevel,
									toLevel: nextLevel,
									fromPoints: profile.points,
									toPoints: newBalance,
									pointsTransactionId: transaction.id,
									levelLogId: levelLog.id,
									notificationId: notification.id,
									triggerType: input.type,
								}),
							),
						},
					});
				} catch {
					// 事件记录失败不影响主流程
				}
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
				levelChanged,
				newLevel: levelChanged ? nextLevel : null,
				levelLogId,
				notificationId,
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
		const existing = await this.prisma.memberProfile.findUnique({
			where: { customerId },
		});
		if (existing) return existing;

		return this.prisma.$transaction(async (tx) => {
			const profile = await tx.memberProfile.create({
				data: { customerId },
			});
			// 初始等级记录（INITIAL 方向）
			await tx.memberLevelLog.create({
				data: {
					customerId,
					fromLevel: null,
					toLevel: "NEW",
					direction: "INITIAL",
					triggerPointsBalance: 0,
					fromPoints: 0,
					toPoints: 0,
					note: "会员档案初始化",
				},
			});
			return profile;
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
		const base = [
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
		return base.map((l) => ({
			...l,
			benefits: this.levelBenefits(l.level),
		}));
	}

	private calculateLevel(points: number, storeId?: string): MemberLevel {
		if (!storeId) {
			for (const t of DEFAULT_THRESHOLDS) {
				if (points >= t.threshold) return t.level as MemberLevel;
			}
			return "NEW" as MemberLevel;
		}
		return "NEW" as MemberLevel;
	}

	private nextLevelFor(level: string): string | null {
		const order: string[] = ["NEW", "SILVER", "GOLD", "PLATINUM", "DIAMOND"];
		const idx = order.indexOf(level);
		if (idx < 0 || idx >= order.length - 1) return null;
		return order[idx + 1] ?? null;
	}

	private levelThreshold(level: string): number {
		const map: Record<string, number> = {
			NEW: 0,
			SILVER: 1000,
			GOLD: 3000,
			PLATINUM: 20000,
			DIAMOND: 50000,
		};
		return map[level] ?? 0;
	}

	private levelDirectionValue(
		from: string,
		to: string,
	): "UPGRADE" | "DOWNGRADE" {
		return (LEVEL_ORDER[to] ?? 0) >= (LEVEL_ORDER[from] ?? 0)
			? "UPGRADE"
			: "DOWNGRADE";
	}

	private buildLevelNotification(
		level: string,
		direction: "UPGRADE" | "DOWNGRADE",
	): {
		type: string;
		title: string;
		body: string;
		iconEmoji: string;
		actionUrl: string;
		payload: Record<string, unknown>;
	} {
		const name = this.levelDisplayName(level);
		const icon = this.levelDisplayIcon(level);
		const benefits = this.levelBenefits(level);

		if (direction === "UPGRADE") {
			return {
				type: "MEMBER_LEVEL_UPGRADED",
				title: `🎉 恭喜升级 ${name}`,
				body: `您已成功升级为 ${name}！${benefits.length ? `新解锁 ${benefits.length} 项专属权益。` : ""}`,
				iconEmoji: icon,
				actionUrl: "/member",
				payload: {
					level,
					levelName: name,
					benefits,
				},
			};
		}
		return {
			type: "MEMBER_LEVEL_DOWNGRADED",
			title: `${name} 等级变更`,
			body: `您的会员等级已变更为 ${name}，继续消费可再次升级。`,
			iconEmoji: icon,
			actionUrl: "/member",
			payload: { level, levelName: name, benefits },
		};
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

	private levelDisplayIcon(level: string): string {
		const map: Record<string, string> = {
			NEW: "🌱",
			SILVER: "🥈",
			GOLD: "👑",
			PLATINUM: "💍",
			DIAMOND: "💎",
		};
		return map[level] || "⭐";
	}

	private levelBenefits(level: string): string[] {
		const map: Record<string, string[]> = {
			NEW: ["新人礼包", "首年 1 次免费清洗"],
			SILVER: ["年度免费保养", "生日双倍积分", "9.8 折正价"],
			GOLD: ["年度免费保养 × 2", "生日双倍积分", "9.5 折正价"],
			PLATINUM: [
				"季度免费保养",
				"生日双倍积分 + 免费清洗",
				"9.5 折正价",
				"优先发货",
			],
			DIAMOND: [
				"全年免费保养",
				"生日 3 倍积分 + 专属礼物",
				"9 折正价",
				"优先发货",
				"专属顾问",
			],
		};
		return map[level] || [];
	}
}

import { Inject, Injectable } from "@nestjs/common";
import { PRISMA_CLIENT } from "../../common/prisma-runtime/prisma-runtime.tokens.js";
import type { PrismaClient } from "../../generated/client.js";
// biome-ignore lint/style/useImportType: NestJS DI requires runtime class reference
import { MemberService } from "../member/member.service.js";
import {
	FORTUNES,
	type Fortune,
	getTodayDay,
	pickFortuneByDay,
} from "./fortunes.js";

@Injectable()
export class LuckySignService {
	constructor(
		@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
		private readonly memberService: MemberService,
	) {}

	async revealToday(customerId: string) {
		const day = getTodayDay();
		const existing = await this.prisma.luckySignRecord.findUnique({
			where: { customerId_day: { customerId, day } },
		});
		if (existing) {
			return {
				id: existing.id,
				day: existing.day,
				fortune: existing.fortune as unknown as Fortune,
				revealedAt: existing.revealedAt,
				alreadyRevealed: true,
				streakDays: await this.calcStreak(customerId),
			};
		}

		const fortune = pickFortuneByDay(`${customerId}-${day}`);
		const record = await this.prisma.luckySignRecord.create({
			data: {
				customerId,
				fortuneId: fortune.id,
				fortune: JSON.parse(JSON.stringify(fortune)),
				day,
			},
		});

		// 签到自动加积分 + 更新 streak
		try {
			await this.memberService.addPoints({
				customerId,
				type: "LUCKY_SIGN",
				amount: 50,
				reason: `每日幸运签·${fortune.gem}`,
				source: { fortuneId: fortune.id, day },
			});
			const streak = await this.calcStreak(customerId);
			await this.prisma.memberProfile.update({
				where: { customerId },
				data: {
					streakDays: streak,
					maxStreakDays: { set: Math.max(streak, 0) },
					lastLuckySignDay: day,
					lastActiveAt: new Date(),
				},
			});
		} catch {
			// 积分失败不影响主流程
		}

		return {
			id: record.id,
			day: record.day,
			fortune: record.fortune as unknown as Fortune,
			revealedAt: record.revealedAt,
			alreadyRevealed: false,
			streakDays: await this.calcStreak(customerId),
		};
	}

	async history(customerId: string, limit = 30) {
		const records = await this.prisma.luckySignRecord.findMany({
			where: { customerId },
			orderBy: { revealedAt: "desc" },
			take: limit,
		});
		return {
			records: records.map((r) => ({
				id: r.id,
				day: r.day,
				fortune: r.fortune as unknown as Fortune,
				revealedAt: r.revealedAt,
			})),
			streakDays: await this.calcStreak(customerId),
			totalSigns: await this.prisma.luckySignRecord.count({
				where: { customerId },
			}),
		};
	}

	async findFirstActiveCustomer(storeId: string): Promise<string | null> {
		const c = await this.prisma.customer.findFirst({
			where: { storeId, status: "ACTIVE" },
			select: { id: true },
		});
		return c?.id ?? null;
	}

	private async calcStreak(customerId: string): Promise<number> {
		const records = await this.prisma.luckySignRecord.findMany({
			where: { customerId },
			select: { day: true },
			orderBy: { revealedAt: "desc" },
			take: 365,
		});
		if (records.length === 0) return 0;

		const days = new Set(records.map((r) => r.day));
		let streak = 0;
		const cursor = new Date();
		for (let i = 0; i < 365; i++) {
			const d = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
			if (days.has(d)) {
				streak++;
				cursor.setDate(cursor.getDate() - 1);
			} else if (i === 0) {
				cursor.setDate(cursor.getDate() - 1);
			} else {
				break;
			}
		}
		return streak;
	}
}

export const AVAILABLE_FORTUNES = FORTUNES;

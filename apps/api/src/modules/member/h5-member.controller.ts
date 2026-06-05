import { Controller, Get, Inject, Query, Req, UseGuards } from "@nestjs/common";
import { PRISMA_CLIENT } from "../../common/prisma-runtime/prisma-runtime.tokens.js";
import type { PrismaClient } from "../../generated/client.js";
import type { StaffPrincipal } from "../auth/staff-auth.guard.js";
import { getStaffPrincipal, StaffAuthGuard } from "../auth/staff-auth.guard.js";
// biome-ignore lint/style/useImportType: NestJS DI requires runtime class reference
import { MemberService } from "./member.service.js";

@Controller("member")
@UseGuards(StaffAuthGuard)
export class H5MemberController {
	constructor(
		private readonly svc: MemberService,
		@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
	) {}

	@Get("my")
	async myProfile(@Req() req: Record<symbol, unknown>) {
		const principal = getStaffPrincipal(req) as StaffPrincipal | null;
		const storeId = principal?.storeId ?? "";
		const customers = await this.svc.listByStore(storeId);
		if (!customers.length) {
			return { ok: false, error: "NO_MEMBER" };
		}
		const first = customers[0];
		if (!first) return { ok: false, error: "NO_MEMBER" };

		const detail = await this.svc.getDetail(first.id);
		if (!detail) return { ok: false, error: "NO_MEMBER" };

		const levels = await this.svc.listAllLevels();
		const currentLevelIdx = levels.findIndex(
			(l: { level: string }) => l.level === detail.profile.level,
		);
		const nextLevel =
			currentLevelIdx >= 0 && currentLevelIdx < levels.length - 1
				? levels[currentLevelIdx + 1]
				: null;

		const daysSinceJoin = Math.floor(
			(Date.now() - new Date(detail.customer.joinDate).getTime()) / 86_400_000,
		);

		return {
			ok: true,
			customerId: detail.customer.id,
			name: detail.customer.name,
			phone: detail.customer.phone,
			level: detail.profile.level,
			levelName: detail.profile.levelName,
			levelColor: detail.profile.levelColor,
			points: detail.profile.points,
			growthExp: detail.profile.growthExp,
			totalSpentCents: detail.profile.totalSpentCents,
			totalTryOns: detail.profile.totalTryOns,
			totalWearCount: detail.profile.totalWearCount,
			badgeCount: detail.profile.badgeCount,
			streakDays: detail.profile.streakDays,
			maxStreakDays: detail.profile.maxStreakDays,
			lastLuckySignDay: detail.profile.lastLuckySignDay,
			lastActive: detail.profile.lastActive,
			daysSinceJoin,
			jewelryBoxCount: detail.jewelryBoxCount,
			transactionCount: detail.transactionCount,
			nextLevel: nextLevel
				? {
						level: nextLevel.level,
						name: nextLevel.displayName,
						requiredPoints: nextLevel.requiredPoints,
					}
				: null,
			levels,
		};
	}

	@Get("my/history")
	async myHistory(
		@Req() req: Record<symbol, unknown>,
		@Query("limit") limit?: string,
	) {
		const principal = getStaffPrincipal(req) as StaffPrincipal | null;
		const storeId = principal?.storeId ?? "";
		const customers = await this.svc.listByStore(storeId);
		if (!customers.length) return { history: [] };
		const first = customers[0];
		if (!first) return { history: [] };
		return this.svc.history(first.id, limit ? Number.parseInt(limit, 10) : 30);
	}
}

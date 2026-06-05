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

		const daysSinceJoin = Math.floor(
			(Date.now() - new Date(detail.customer.joinDate).getTime()) / 86_400_000,
		);

		const profile = detail.profile;
		return {
			ok: true,
			customerId: detail.customer.id,
			name: detail.customer.name,
			phone: detail.customer.phone,
			level: profile.level,
			levelName: profile.levelName,
			levelColor: profile.levelColor,
			levelIcon: profile.levelIcon || "",
			points: profile.points,
			growthExp: profile.growthExp,
			totalSpentCents: profile.totalSpentCents,
			totalTryOns: profile.totalTryOns,
			totalWearCount: profile.totalWearCount,
			badgeCount: profile.badgeCount,
			streakDays: profile.streakDays,
			maxStreakDays: profile.maxStreakDays,
			lastLuckySignDay: profile.lastLuckySignDay,
			lastActive: profile.lastActive,
			levelUpgradedAt: profile.levelUpgradedAt || null,
			currentBenefits: Array.isArray(profile.currentBenefits)
				? profile.currentBenefits
				: [],
			daysSinceJoin,
			jewelryBoxCount: detail.jewelryBoxCount,
			transactionCount: detail.transactionCount,
			nextLevel: profile.nextLevel
				? {
						level: profile.nextLevel.level,
						name: profile.nextLevel.levelName,
						requiredPoints: profile.nextLevel.threshold,
						pointsToNext: profile.nextLevel.pointsToNext,
						levelColor: profile.nextLevel.levelColor,
						levelIcon: profile.nextLevel.levelIcon,
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

	@Get("my/level-history")
	async myLevelHistory(
		@Req() req: Record<symbol, unknown>,
		@Query("limit") limit?: string,
	) {
		const principal = getStaffPrincipal(req) as StaffPrincipal | null;
		const storeId = principal?.storeId ?? "";
		const customers = await this.svc.listByStore(storeId);
		if (!customers.length) return { items: [] };
		const first = customers[0];
		if (!first) return { items: [] };
		const items = await this.svc.levelHistory(
			first.id,
			limit ? Number.parseInt(limit, 10) : 50,
		);
		return { items };
	}

	@Get("all-levels")
	async allLevels() {
		return this.svc.listAllLevels();
	}
}

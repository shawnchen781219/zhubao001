import {
	Body,
	Controller,
	Get,
	Inject,
	Patch,
	Query,
	Req,
	UseGuards,
} from "@nestjs/common";
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

	@Patch("me/display-name")
	async updateDisplayName(
		@Req() req: Record<symbol, unknown>,
		@Body() body: { displayName: string },
	) {
		const principal = getStaffPrincipal(req) as StaffPrincipal | null;
		const storeId = principal?.storeId ?? "";

		// 找当前 customer（与 listByStore 一致，按 createdAt desc，取最新）
		const customers = await this.prisma.customer.findMany({
			where: { storeId, status: "ACTIVE" },
			orderBy: { createdAt: "desc" },
			take: 1,
		});
		const customerId = customers[0]?.id;
		if (!customerId) return { ok: false, error: "NO_MEMBER" };

		// 校验 displayName
		const name = typeof body?.displayName === "string" ? body.displayName.trim() : "";
		if (!name) return { ok: false, error: "INVALID_NAME", message: "姓名不能为空" };
		if (name.length > 20) return { ok: false, error: "INVALID_NAME", message: "姓名最长 20 个字" };
		// 禁止特殊符号（允许的字符：中文、字母、数字、空格、·、.、-、_）
		const forbidden = /[<>{}()\[\]\/\\@!#$%^&*+=`~:;'",?|]/.test(name);
		if (forbidden) return { ok: false, error: "INVALID_NAME", message: "姓名包含非法字符" };

		// 更新
		const updated = await this.prisma.customer.update({
			where: { id: customerId },
			data: { displayName: name },
			include: { memberProfile: true },
		});

		// 写 EventLog（不阻塞主流程）
		try {
			await this.prisma.eventLog.create({
				data: {
					storeId,
					eventType: "CUSTOMER_PROFILE_UPDATED",
					customerId,
					payload: { action: "update-display-name", displayName: name },
				},
			});
		} catch {
			// ignore
		}

		return {
			ok: true,
			customerId,
			displayName: name,
			profile: updated.memberProfile
				? {
						level: updated.memberProfile.level,
						points: updated.memberProfile.points,
					}
				: null,
		};
	}
}

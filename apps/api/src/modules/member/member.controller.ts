import {
	Body,
	Controller,
	Get,
	Param,
	Patch,
	Post,
	Query,
	Req,
	UseGuards,
} from "@nestjs/common";
import type { StaffPrincipal } from "../auth/staff-auth.guard.js";
import { getStaffPrincipal, StaffAuthGuard } from "../auth/staff-auth.guard.js";
// biome-ignore lint/style/useImportType: NestJS DI requires runtime class reference
import { MemberService } from "./member.service.js";

@Controller("admin/members")
@UseGuards(StaffAuthGuard)
export class AdminMemberController {
	constructor(private readonly svc: MemberService) {}

	@Get()
	async list(@Req() req: Record<symbol, unknown>) {
		const principal = getStaffPrincipal(req) as StaffPrincipal | null;
		return this.svc.listByStore(principal?.storeId ?? "");
	}

	@Get("stats")
	async stats(@Req() req: Record<symbol, unknown>) {
		const principal = getStaffPrincipal(req) as StaffPrincipal | null;
		const list = await this.svc.listByStore(principal?.storeId ?? "");
		const byTier: Record<string, number> = {};
		let totalPoints = 0;
		for (const m of list) {
			byTier[m.level] = (byTier[m.level] || 0) + 1;
			totalPoints += m.points;
		}
		return {
			totalMembers: list.length,
			totalPoints,
			byTier,
		};
	}

	@Get("levels")
	async levels() {
		return this.svc.listAllLevels();
	}

	@Get(":customerId")
	async detail(@Param("customerId") id: string) {
		return this.svc.getDetail(id);
	}

	@Get(":customerId/history")
	async history(
		@Param("customerId") id: string,
		@Query("limit") limit?: string,
	) {
		return this.svc.history(id, limit ? Number.parseInt(limit, 10) : 50);
	}

	@Post(":customerId/grant")
	async grant(
		@Param("customerId") id: string,
		@Body() body: { amount: number; reason?: string; type?: string },
	) {
		const amount = Math.max(0, body.amount || 0);
		if (!amount) return { ok: false, error: "Invalid amount" };
		return this.svc.addPoints({
			customerId: id,
			type:
				(body.type as Parameters<typeof this.svc.addPoints>[0]["type"]) ||
				"GRANTED",
			amount,
			reason: body.reason || `Manual grant: +${amount}`,
			source: { manual: true },
		});
	}

	@Patch(":customerId/spend")
	async spend(
		@Param("customerId") id: string,
		@Body() body: { amount: number; reason: string },
	) {
		return this.svc.spendPoints(id, body.amount || 0, body.reason || "spend");
	}
}

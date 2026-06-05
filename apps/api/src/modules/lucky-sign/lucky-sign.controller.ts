import { Controller, Get, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { StaffPrincipal } from "../auth/staff-auth.guard.js";
import { getStaffPrincipal, StaffAuthGuard } from "../auth/staff-auth.guard.js";
// biome-ignore lint/style/useImportType: NestJS DI requires runtime class reference
import { AVAILABLE_FORTUNES, LuckySignService } from "./lucky-sign.service.js";

@Controller("lucky-sign")
@UseGuards(StaffAuthGuard)
export class LuckySignController {
	constructor(private readonly service: LuckySignService) {}

	@Post("reveal")
	async reveal(
		@Req() req: Record<symbol, unknown>,
		@Query("customerId") customerId: string | undefined,
	) {
		const principal = getStaffPrincipal(req) as StaffPrincipal | null;
		const resolved = await this.resolveCustomer(
			customerId,
			principal?.storeId ?? "",
		);
		if (!resolved) return { ok: false, error: "NO_CUSTOMER" };
		return this.service.revealToday(resolved);
	}

	@Get("history")
	async history(
		@Req() req: Record<symbol, unknown>,
		@Query("customerId") customerId: string | undefined,
		@Query("limit") limit: string | undefined,
	) {
		const principal = getStaffPrincipal(req) as StaffPrincipal | null;
		const resolved = await this.resolveCustomer(
			customerId,
			principal?.storeId ?? "",
		);
		if (!resolved) return { records: [], streakDays: 0, totalSigns: 0 };
		return this.service.history(
			resolved,
			limit ? Number.parseInt(limit, 10) : 30,
		);
	}

	@Get("fortunes")
	async listFortunes() {
		return { fortunes: AVAILABLE_FORTUNES };
	}

	private async resolveCustomer(
		customerId: string | undefined,
		storeId: string,
	): Promise<string | null> {
		if (customerId?.startsWith("cmp")) return customerId;
		return this.service.findFirstActiveCustomer(storeId);
	}
}

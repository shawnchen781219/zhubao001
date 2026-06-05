import {
	Controller,
	Get,
	Param,
	Post,
	Query,
	Req,
	UseGuards,
} from "@nestjs/common";
import type { StaffPrincipal } from "../auth/staff-auth.guard.js";
import { getStaffPrincipal, StaffAuthGuard } from "../auth/staff-auth.guard.js";
// biome-ignore lint/style/useImportType: NestJS DI requires runtime class reference
import { CouponService } from "./coupon.service.js";

@Controller("admin/coupons")
@UseGuards(StaffAuthGuard)
export class AdminCouponController {
	constructor(private readonly couponService: CouponService) {}

	@Get()
	async list(
		@Req() req: Record<symbol, unknown>,
		@Query("status") status: string | undefined,
		@Query("page") page: string | undefined,
		@Query("pageSize") pageSize: string | undefined,
	) {
		const principal = getStaffPrincipal(req) as StaffPrincipal | null;
		const listOpts: { status?: string; page?: number; pageSize?: number } = {};
		if (status) listOpts.status = status;
		if (page) listOpts.page = Number.parseInt(page, 10);
		if (pageSize) listOpts.pageSize = Number.parseInt(pageSize, 10);
		return this.couponService.listByStore(principal?.storeId ?? "", listOpts);
	}

	@Get("templates")
	async listTemplates(@Req() req: Record<symbol, unknown>) {
		const principal = getStaffPrincipal(req) as StaffPrincipal | null;
		return this.couponService.listTemplates(principal?.storeId ?? "");
	}

	@Post(":id/redeem")
	async redeem(@Param("id") id: string) {
		return this.couponService.redeem(id);
	}
}

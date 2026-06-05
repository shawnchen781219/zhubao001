import {
	Body,
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
import { TryOnService } from "./try-on.service.js";

@Controller("admin/try-on-sessions")
@UseGuards(StaffAuthGuard)
export class AdminTryOnController {
	constructor(private readonly tryOnService: TryOnService) {}

	@Get()
	async list(
		@Req() req: Record<symbol, unknown>,
		@Query("status") status: string | undefined,
		@Query("page") page: string | undefined,
		@Query("pageSize") pageSize: string | undefined,
	) {
		const principal = getStaffPrincipal(req) as StaffPrincipal | null;
		const opts: { status?: string; page?: number; pageSize?: number } = {};
		if (status) opts.status = status;
		if (page) opts.page = Number.parseInt(page, 10);
		if (pageSize) opts.pageSize = Number.parseInt(pageSize, 10);
		return this.tryOnService.listByStore(principal?.storeId ?? "", opts);
	}

	@Get(":id")
	async getSession(@Param("id") id: string) {
		return this.tryOnService.getSession(id);
	}
}

@Controller("try-on")
export class TryOnPublicController {
	constructor(private readonly tryOnService: TryOnService) {}

	@Post("sessions")
	async createSession(
		@Body() body: { storeId: string; deviceId: string; productIds: string[] },
	) {
		return this.tryOnService.createAnonymous(
			body.storeId,
			body.deviceId,
			body.productIds ?? [],
		);
	}

	@Post("sessions/:id/qr")
	async showQr(@Param("id") id: string) {
		return this.tryOnService.showQr(id);
	}

	@Post("sessions/scan")
	async scanQr(@Body() body: { qrToken: string }) {
		const session = await this.tryOnService.scanQr(body.qrToken);
		if (!session) return { ok: false, error: "INVALID_OR_EXPIRED_QR" };
		return { ok: true, data: session };
	}

	@Post("sessions/:id/authorize")
	async authorize(
		@Param("id") id: string,
		@Body() body: { customerId: string },
	) {
		return this.tryOnService.authorize(id, body.customerId);
	}

	@Get("sessions/:id")
	async getSession(@Param("id") id: string) {
		return this.tryOnService.getSession(id);
	}

	@Post("sessions/:id/coupons")
	async issueCoupon(
		@Req() req: Record<symbol, unknown>,
		@Param("id") id: string,
		@Body() body: { templateId: string; customerId?: string; storeId: string },
	) {
		const principal = getStaffPrincipal(req) as StaffPrincipal | null;
		return this.tryOnService.issueCoupon(
			id,
			body.templateId,
			body.customerId ?? null,
			principal?.staffId ?? null,
			body.storeId,
		);
	}
}

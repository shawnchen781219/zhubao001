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
import { MemberService } from "../member/member.service.js";
// biome-ignore lint/style/useImportType: NestJS DI requires runtime class reference
import { NotificationService } from "./notifications.service.js";

@Controller("notifications")
@UseGuards(StaffAuthGuard)
export class NotificationController {
	constructor(
		private readonly svc: NotificationService,
		private readonly memberSvc: MemberService,
	) {}

	@Get()
	async list(
		@Req() req: Record<symbol, unknown>,
		@Query("limit") limit?: string,
		@Query("unread") unread?: string,
	) {
		const customerId = await this.resolveCustomerId(req);
		if (!customerId) return { ok: false, error: "NO_MEMBER" };
		const result = await this.svc.listByCustomer({
			customerId,
			limit: limit ? Number.parseInt(limit, 10) : 50,
			onlyUnread: unread === "1" || unread === "true",
		});
		return { ok: true, ...result };
	}

	@Get("unread-count")
	async unreadCount(@Req() req: Record<symbol, unknown>) {
		const customerId = await this.resolveCustomerId(req);
		if (!customerId) return { ok: true, count: 0 };
		const count = await this.svc.getUnreadCount(customerId);
		return { ok: true, count };
	}

	@Patch(":id/read")
	async markRead(@Req() req: Record<symbol, unknown>, @Param("id") id: string) {
		const customerId = await this.resolveCustomerId(req);
		if (!customerId) return { ok: false, error: "NO_MEMBER" };
		const item = await this.svc.markRead(customerId, id);
		if (!item) return { ok: false, error: "NOT_FOUND" };
		return { ok: true, item };
	}

	@Post("read-all")
	async markAllRead(@Req() req: Record<symbol, unknown>) {
		const customerId = await this.resolveCustomerId(req);
		if (!customerId) return { ok: false, error: "NO_MEMBER" };
		const result = await this.svc.markAllRead(customerId);
		return { ok: true, ...result };
	}

	@Get(":id")
	async get(@Req() req: Record<symbol, unknown>, @Param("id") id: string) {
		const customerId = await this.resolveCustomerId(req);
		if (!customerId) return { ok: false, error: "NO_MEMBER" };
		const result = await this.svc.listByCustomer({
			customerId,
			limit: 200,
		});
		const found = result.items.find((i) => i.id === id);
		if (!found) return { ok: false, error: "NOT_FOUND" };
		return { ok: true, item: found };
	}

	private async resolveCustomerId(
		req: Record<symbol, unknown>,
	): Promise<string | null> {
		const principal = getStaffPrincipal(req) as StaffPrincipal | null;
		const storeId = principal?.storeId ?? "";
		const customers = await this.memberSvc.listByStore(storeId);
		if (!customers.length) return null;
		return customers[0]?.id ?? null;
	}
}

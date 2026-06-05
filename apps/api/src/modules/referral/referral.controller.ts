import {
	Body,
	Controller,
	Get,
	Param,
	Post,
	Req,
	UseGuards,
} from "@nestjs/common";
import type { StaffPrincipal } from "../auth/staff-auth.guard.js";
import { getStaffPrincipal, StaffAuthGuard } from "../auth/staff-auth.guard.js";
// biome-ignore lint/style/useImportType: NestJS DI requires runtime class reference
import { ReferralService } from "./referral.service.js";

@Controller("referral")
@UseGuards(StaffAuthGuard)
export class ReferralController {
	constructor(private readonly service: ReferralService) {}

	@Get("my")
	async getMyCards(@Req() req: Record<symbol, unknown>) {
		const principal = getStaffPrincipal(req) as StaffPrincipal | null;
		const storeId = principal?.storeId ?? "";
		const customerId = await this.service.findFirstActiveCustomer(storeId);
		if (!customerId) return { ok: false, error: "NO_CUSTOMER" };
		return this.service.getOrCreateDefault(customerId, storeId);
	}

	@Post("share")
	async shareCard(
		@Req() req: Record<symbol, unknown>,
		@Body() body: { cardId?: string },
	) {
		const principal = getStaffPrincipal(req) as StaffPrincipal | null;
		const storeId = principal?.storeId ?? "";
		const request = req as unknown as {
			headers?: Record<string, string>;
			ip?: string;
		};
		const visitorIp = request.ip || request.headers?.["x-forwarded-for"] || "";
		const userAgent = request.headers?.["user-agent"] || "";

		let cardId = body.cardId;
		if (!cardId) {
			const customerId = await this.service.findFirstActiveCustomer(storeId);
			if (!customerId) return { ok: false, error: "NO_CUSTOMER" };
			const card = await this.service.getOrCreateDefault(customerId, storeId);
			if (!card) return { ok: false, error: "NO_CARD" };
			cardId = card.id;
		}

		return this.service.shareCard(cardId, visitorIp, userAgent);
	}

	@Get("card/:shareCode")
	async getCardByShareCode(
		@Param("shareCode") shareCode: string,
		@Req() req: Record<symbol, unknown>,
	) {
		const request = req as unknown as {
			headers?: Record<string, string>;
			ip?: string;
		};
		const visitorIp = request.ip || request.headers?.["x-forwarded-for"] || "";
		const userAgent = request.headers?.["user-agent"] || "";
		return this.service.getCardByShareCode(shareCode, visitorIp, userAgent);
	}

	@Post("redeem/:shareCode")
	async redeemCard(
		@Param("shareCode") shareCode: string,
		@Body() body: { visitorName?: string; visitorPhone?: string },
		@Req() req: Record<symbol, unknown>,
	) {
		const request = req as unknown as {
			headers?: Record<string, string>;
			ip?: string;
		};
		const visitorIp = request.ip || request.headers?.["x-forwarded-for"] || "";
		const userAgent = request.headers?.["user-agent"] || "";
		return this.service.redeemCard(
			shareCode,
			body.visitorName,
			body.visitorPhone,
			visitorIp,
			userAgent,
		);
	}

	@Get("stats")
	async getStats(@Req() req: Record<symbol, unknown>) {
		const principal = getStaffPrincipal(req) as StaffPrincipal | null;
		return this.service.getStats(principal?.storeId ?? "");
	}
}

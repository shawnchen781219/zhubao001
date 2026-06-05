import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	Patch,
	Post,
	Query,
	Req,
	UseGuards,
} from "@nestjs/common";
import {
	getStaffPrincipal,
	StaffAuthGuard,
	type StaffPrincipal,
} from "../auth/staff-auth.guard.js";
// biome-ignore lint/style/useImportType: NestJS DI requires runtime class reference
import { TradeInService } from "./trade-in.service.js";

@Controller("trade-in")
export class TradeInController {
	constructor(private readonly tradeInService: TradeInService) {}

	@Post("assess")
	@UseGuards(StaffAuthGuard)
	async createAssessment(
		@Req() req: Record<symbol, unknown>,
		@Body() body: any,
	) {
		const principal = getStaffPrincipal(req) as StaffPrincipal | null;
		const storeId = principal?.storeId ?? "";
		let customerId: string | null = body.customerId || null;
		if (!customerId) {
			customerId = await this.tradeInService.findFirstActiveCustomer(storeId);
		}
		if (!customerId) {
			return { success: false, error: "NO_CUSTOMER" };
		}

		const assessment = await this.tradeInService.createAssessment(
			customerId,
			body,
		);

		return {
			success: true,
			data: assessment,
		};
	}

	@Get("reference")
	async getReferenceData() {
		const reference = this.tradeInService.getReferenceData();
		return {
			success: true,
			data: reference,
		};
	}

	@Get("assessments")
	@UseGuards(StaffAuthGuard)
	async listAssessments(
		@Req() req: Record<symbol, unknown>,
		@Query("customerId") customerId?: string,
		@Query("status") status?: string,
	) {
		const principal = getStaffPrincipal(req) as StaffPrincipal | null;
		let resolvedCustomerId = customerId;
		if (!resolvedCustomerId) {
			const found = await this.tradeInService.findFirstActiveCustomer(
				principal?.storeId ?? "",
			);
			if (found) resolvedCustomerId = found;
		}
		const assessments = await this.tradeInService.listAssessments(
			resolvedCustomerId ?? undefined,
			status,
		);
		return {
			success: true,
			data: assessments,
		};
	}

	@Get("assessments/:id")
	@UseGuards(StaffAuthGuard)
	async getAssessment(@Param("id") id: string) {
		const assessment = await this.tradeInService.getAssessment(id);
		if (!assessment) {
			return { success: false, error: "NOT_FOUND" };
		}
		return {
			success: true,
			data: assessment,
		};
	}

	@Patch("assessments/:id/status")
	@UseGuards(StaffAuthGuard)
	async updateStatus(
		@Req() req: Record<symbol, unknown>,
		@Param("id") id: string,
		@Body() body: { status: string; reviewNote?: string },
	) {
		const principal = getStaffPrincipal(req) as StaffPrincipal | null;
		const reviewedBy = principal?.displayName || principal?.staffId || "admin";
		const assessment = await this.tradeInService.updateStatus(
			id,
			body.status,
			reviewedBy,
			body.reviewNote,
		);
		return {
			success: true,
			data: assessment,
		};
	}

	@Delete("assessments/:id")
	@UseGuards(StaffAuthGuard)
	async deleteAssessment(@Param("id") id: string) {
		const result = await this.tradeInService.deleteAssessment(id);
		return {
			success: true,
			data: result,
		};
	}
}

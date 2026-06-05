import {
	Controller,
	Get,
	Param,
	Patch,
	Query,
	Req,
	UseGuards,
} from "@nestjs/common";
import type { StaffPrincipal } from "../auth/staff-auth.guard.js";
import { getStaffPrincipal, StaffAuthGuard } from "../auth/staff-auth.guard.js";
// biome-ignore lint/style/useImportType: NestJS DI requires runtime class reference for reflect-metadata paramtypes
import { CareService } from "./care.service.js";

@Controller("care")
@UseGuards(StaffAuthGuard)
export class CareController {
	constructor(private readonly service: CareService) {}

	@Get("reminders")
	async list(
		@Req() req: Record<symbol, unknown>,
		@Query("customerId") customerId: string | undefined,
	) {
		const principal = getStaffPrincipal(req) as StaffPrincipal | null;
		const storeId = principal?.storeId ?? "";
		if (customerId?.startsWith("cmp")) {
			return this.service.listByCustomer(customerId);
		}
		const first = await this.service.findFirstActiveCustomer(storeId);
		if (!first) {
			return {
				reminders: [],
				stats: {
					upcoming: 0,
					overdue: 0,
					scheduled: 0,
					completed: 0,
					total: 0,
				},
				customerId: null,
			};
		}
		return this.service.listByCustomer(first);
	}

	@Get("reminders/admin")
	async listByStore(@Req() req: Record<symbol, unknown>) {
		const principal = getStaffPrincipal(req) as StaffPrincipal | null;
		return this.service.listByStore(principal?.storeId ?? "");
	}

	@Patch("reminders/:id/complete")
	async complete(@Param("id") id: string) {
		return this.service.complete(id);
	}

	@Patch("reminders/:id/cancel")
	async cancel(@Param("id") id: string) {
		return this.service.cancel(id);
	}
}

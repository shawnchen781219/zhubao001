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
import { CustomerService } from "./customer.service.js";

@Controller("admin/customers")
@UseGuards(StaffAuthGuard)
export class AdminCustomerController {
	constructor(private readonly customerService: CustomerService) {}

	@Get()
	async list(
		@Req() req: Record<symbol, unknown>,
		@Query("status") status: string | undefined,
		@Query("search") search: string | undefined,
		@Query("page") page: string | undefined,
		@Query("pageSize") pageSize: string | undefined,
	) {
		const principal = getStaffPrincipal(req) as StaffPrincipal | null;
		const listOpts: {
			status?: string;
			search?: string;
			page?: number;
			pageSize?: number;
		} = {};
		if (status) listOpts.status = status;
		if (search) listOpts.search = search;
		if (page) listOpts.page = Number.parseInt(page, 10);
		if (pageSize) listOpts.pageSize = Number.parseInt(pageSize, 10);
		return this.customerService.listByStore(principal?.storeId ?? "", listOpts);
	}

	@Get(":id")
	async getDetail(@Param("id") id: string) {
		return this.customerService.getDetail(id);
	}

	@Post()
	async create(
		@Req() req: Record<symbol, unknown>,
		@Body() body: { displayName: string; phone?: string; tags?: string[] },
	) {
		const principal = getStaffPrincipal(req) as StaffPrincipal | null;
		return this.customerService.create(principal?.storeId ?? "", body);
	}
}

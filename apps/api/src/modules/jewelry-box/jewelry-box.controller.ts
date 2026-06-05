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
import type { StaffPrincipal } from "../auth/staff-auth.guard.js";
import { getStaffPrincipal, StaffAuthGuard } from "../auth/staff-auth.guard.js";
import type {
	JewelryBoxItemInput,
	JewelryBoxUpdateInput,
} from "./jewelry-box.service.js";
// biome-ignore lint/style/useImportType: NestJS DI requires runtime class reference
import { JewelryBoxService } from "./jewelry-box.service.js";

@Controller("jewelry-box")
@UseGuards(StaffAuthGuard)
export class JewelryBoxController {
	constructor(private readonly service: JewelryBoxService) {}

	@Get()
	async list(
		@Req() req: Record<symbol, unknown>,
		@Query("customerId") customerId: string | undefined,
	) {
		const principal = getStaffPrincipal(req) as StaffPrincipal | null;
		return this.service.listByCustomer(
			customerId ?? principal?.storeId ?? "",
			principal?.storeId ?? "",
		);
	}

	@Get(":id")
	async detail(@Param("id") id: string) {
		return this.service.getDetail(id);
	}

	@Post()
	async create(
		@Req() req: Record<symbol, unknown>,
		@Body() body: JewelryBoxItemInput,
	) {
		const principal = getStaffPrincipal(req) as StaffPrincipal | null;
		return this.service.create(principal?.staffId ?? "", body);
	}

	@Patch(":id")
	async update(@Param("id") id: string, @Body() body: JewelryBoxUpdateInput) {
		return this.service.update(id, body);
	}

	@Delete(":id")
	async remove(@Param("id") id: string) {
		return this.service.remove(id);
	}
}

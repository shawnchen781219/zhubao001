import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	Patch,
	Post,
	Req,
	UseGuards,
} from "@nestjs/common";
import type { StaffPrincipal } from "../auth/staff-auth.guard.js";
import { getStaffPrincipal, StaffAuthGuard } from "../auth/staff-auth.guard.js";
// biome-ignore lint/style/useImportType: NestJS DI requires runtime class reference
import { BlindBoxService } from "./blind-box.service.js";

@Controller("blind-box")
@UseGuards(StaffAuthGuard)
export class BlindBoxController {
	constructor(private readonly service: BlindBoxService) {}

	/**
	 * === H5 端接口 ===
	 */

	/**
	 * GET /blind-box/today
	 * 获取今日盲盒预览（奖池信息 + 奖品列表，不透露概率）
	 */
	@Get("today")
	async getToday(@Req() req: Record<symbol, unknown>) {
		const principal = getStaffPrincipal(req) as StaffPrincipal | null;
		const storeId = principal?.storeId ?? "";
		return this.service.getTodayPreview(storeId);
	}

	/**
	 * POST /blind-box/open
	 * 开盲盒（核心接口 - 加权随机 + 库存扣减 + 积分扣减 + 历史）
	 */
	@Post("open")
	async openBox(@Req() req: Record<symbol, unknown>) {
		const principal = getStaffPrincipal(req) as StaffPrincipal | null;
		const storeId = principal?.storeId ?? "";
		const customerId = await this.service.findFirstActiveCustomer(storeId);
		if (!customerId) {
			return { success: false, error: "NO_ACTIVE_CUSTOMER" };
		}
		return this.service.openBox(storeId, customerId);
	}

	/**
	 * GET /blind-box/history
	 * 获取当前用户的开箱历史
	 */
	@Get("history")
	async getHistory(@Req() req: Record<symbol, unknown>) {
		const principal = getStaffPrincipal(req) as StaffPrincipal | null;
		const storeId = principal?.storeId ?? "";
		const customerId = await this.service.findFirstActiveCustomer(storeId);
		if (!customerId) {
			return { records: [], totalOpens: 0 };
		}
		return this.service.getHistory(customerId);
	}

	/**
	 * === Admin 端接口 ===
	 */

	/**
	 * GET /blind-box/admin/pools
	 * 列出所有奖池
	 */
	@Get("admin/pools")
	async listPools(@Req() req: Record<symbol, unknown>) {
		const principal = getStaffPrincipal(req) as StaffPrincipal | null;
		const storeId = principal?.storeId ?? "";
		return this.service.listPools(storeId);
	}

	/**
	 * GET /blind-box/admin/pools/:poolId
	 * 获取奖池详情（含奖品列表、统计）
	 */
	@Get("admin/pools/:poolId")
	async getPoolDetail(
		@Param("poolId") poolId: string,
		@Req() req: Record<symbol, unknown>,
	) {
		const principal = getStaffPrincipal(req) as StaffPrincipal | null;
		const storeId = principal?.storeId ?? "";
		return this.service.getPoolDetail(poolId, storeId);
	}

	/**
	 * POST /blind-box/admin/pools
	 * 创建奖池
	 */
	@Post("admin/pools")
	async createPool(
		@Body() body: any,
		@Req() req: Record<symbol, unknown>,
	) {
		const principal = getStaffPrincipal(req) as StaffPrincipal | null;
		const storeId = principal?.storeId ?? "";
		return this.service.createPool({ ...body, storeId });
	}

	/**
	 * PATCH /blind-box/admin/pools/:poolId
	 * 更新奖池
	 */
	@Patch("admin/pools/:poolId")
	async updatePool(
		@Param("poolId") poolId: string,
		@Body() body: any,
		@Req() req: Record<symbol, unknown>,
	) {
		const principal = getStaffPrincipal(req) as StaffPrincipal | null;
		const storeId = principal?.storeId ?? "";
		return this.service.updatePool(poolId, storeId, body);
	}

	/**
	 * DELETE /blind-box/admin/pools/:poolId
	 * 删除奖池（连带删除所有奖品）
	 */
	@Delete("admin/pools/:poolId")
	async deletePool(
		@Param("poolId") poolId: string,
		@Req() req: Record<symbol, unknown>,
	) {
		const principal = getStaffPrincipal(req) as StaffPrincipal | null;
		const storeId = principal?.storeId ?? "";
		return this.service.deletePool(poolId, storeId);
	}

	/**
	 * POST /blind-box/admin/items
	 * 创建奖品
	 */
	@Post("admin/items")
	async createItem(@Body() body: any) {
		return this.service.createItem(body);
	}

	/**
	 * PATCH /blind-box/admin/items/:itemId
	 * 更新奖品
	 */
	@Patch("admin/items/:itemId")
	async updateItem(@Param("itemId") itemId: string, @Body() body: any) {
		return this.service.updateItem(itemId, body);
	}

	/**
	 * DELETE /blind-box/admin/items/:itemId
	 * 删除奖品
	 */
	@Delete("admin/items/:itemId")
	async deleteItem(@Param("itemId") itemId: string) {
		return this.service.deleteItem(itemId);
	}

	/**
	 * GET /blind-box/admin/stats
	 * 获取盲盒统计
	 */
	@Get("admin/stats")
	async getStats(@Req() req: any) {
		const principal = getStaffPrincipal(req) as StaffPrincipal | null;
		const storeId = principal?.storeId ?? "";
		return this.service.getStats(storeId);
	}
}

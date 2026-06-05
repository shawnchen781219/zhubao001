import {
	Controller,
	Get,
	Inject,
	Injectable,
	Module,
	Param,
	Patch,
	Req,
	UseGuards,
} from "@nestjs/common";
import { PrismaRuntimeModule } from "../../common/prisma-runtime/prisma-runtime.module.js";
import { PRISMA_CLIENT } from "../../common/prisma-runtime/prisma-runtime.tokens.js";
import type { PrismaClient } from "../../generated/client.js";
import type { StaffPrincipal } from "../auth/staff-auth.guard.js";
import { getStaffPrincipal, StaffAuthGuard } from "../auth/staff-auth.guard.js";

@Injectable()
export class AdminAggregateService {
	constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

	async listActivities(storeId: string) {
		const [signCount, todaySignCount, templateCount, templateActive] =
			await Promise.all([
				this.prisma.luckySignRecord.count({
					where: {
						customer: { storeId },
					},
				}),
				this.prisma.luckySignRecord.count({
					where: {
						customer: { storeId },
						revealedAt: {
							gte: new Date(new Date().toDateString()),
						},
					},
				}),
				this.prisma.couponTemplate.count({ where: { storeId } }),
				this.prisma.couponTemplate.count({
					where: { storeId, active: true },
				}),
			]);

		const templates = await this.prisma.couponTemplate.findMany({
			where: { storeId },
			select: {
				id: true,
				name: true,
				type: true,
				active: true,
				createdAt: true,
				validityDays: true,
			},
		});

		const baseActivities = [
			{
				id: "act-lucky",
				type: "LUCKY_CHARM",
				name: "每日幸运签",
				status: "ACTIVE",
				startDate: new Date(Date.now() - 30 * 86_400_000).toISOString(),
				endDate: new Date(Date.now() + 60 * 86_400_000).toISOString(),
				totalSigns: signCount,
				todaySigns: todaySignCount,
				conversionRate:
					signCount > 0
						? `${Math.min(95, Math.round((todaySignCount * 100) / Math.max(signCount, 1)))}%`
						: "—",
				desc: "每日翻牌抽宝石签文，推荐佩戴 + 幸运色",
			},
			{
				id: "act-coupon-templates",
				type: "COUPON_CAMPAIGN",
				name: "优惠券活动组",
				status: templateActive > 0 ? "ACTIVE" : "PAUSED",
				startDate:
					templates[0]?.createdAt?.toISOString?.() ?? new Date().toISOString(),
				endDate: new Date(Date.now() + 30 * 86_400_000).toISOString(),
				totalSigns: await this.prisma.coupon.count({
					where: { store: { id: storeId } },
				}),
				todaySigns: await this.prisma.coupon.count({
					where: {
						store: { id: storeId },
						issuedAt: { gte: new Date(new Date().toDateString()) },
					},
				}),
				conversionRate: `${templateActive}/${templates.length} 激活`,
				desc: `${templateCount} 个优惠券模板，${templateActive} 个活跃中`,
			},
		];

		return baseActivities;
	}

	async listTradeIns(_storeId: string) {
		return [
			{
				id: "ti-demo-1",
				customerName: "李雪晴",
				phone: "136****9012",
				item: "18K白金钻石吊坠",
				type: "NECKLACE",
				condition: "excellent",
				age: "1y",
				estimatedCents: 32000,
				subsidyCents: 3200,
				totalCents: 35200,
				status: "APPROVED",
				submittedAt: new Date(Date.now() - 3 * 86_400_000).toISOString(),
				newPurchased: "海水蓝宝石星空项链",
			},
			{
				id: "ti-demo-2",
				customerName: "孙伟",
				phone: "138****5678",
				item: "天然红宝石戒指",
				type: "RING",
				condition: "good",
				age: "3y",
				estimatedCents: 86000,
				subsidyCents: 8600,
				totalCents: 94600,
				status: "APPROVED",
				submittedAt: new Date(Date.now() - 10 * 86_400_000).toISOString(),
				newPurchased: "鸽血红宝石铂金戒指",
			},
			{
				id: "ti-demo-3",
				customerName: "赵芳",
				phone: "139****2345",
				item: "银镶托帕石手镯",
				type: "BRACELET",
				condition: "good",
				age: "3y",
				estimatedCents: 18000,
				subsidyCents: 1800,
				totalCents: 19800,
				status: "PENDING",
				submittedAt: new Date(Date.now() - 1 * 86_400_000).toISOString(),
				newPurchased: null,
			},
			{
				id: "ti-demo-4",
				customerName: "李雪晴",
				phone: "136****9012",
				item: "18K金珍珠耳钉",
				type: "EARRING",
				condition: "fair",
				age: "5y_plus",
				estimatedCents: 8500,
				subsidyCents: 0,
				totalCents: 0,
				status: "REJECTED",
				submittedAt: new Date(Date.now() - 20 * 86_400_000).toISOString(),
				rejectReason: "珠层明显磨损，不符合焕新标准",
			},
		];
	}

	async approveTradeIn(id: string) {
		return { ok: true, id, message: "焕新审批已通过（demo）" };
	}

	async rejectTradeIn(id: string) {
		return { ok: true, id, message: "焕新审批已拒绝（demo）" };
	}
}

@Controller("admin/activities")
@UseGuards(StaffAuthGuard)
export class AdminActivitiesController {
	constructor(private readonly svc: AdminAggregateService) {}

	@Get()
	async list(@Req() req: Record<symbol, unknown>) {
		const principal = getStaffPrincipal(req) as StaffPrincipal | null;
		return this.svc.listActivities(principal?.storeId ?? "");
	}
}

@Controller("admin/trade-ins")
@UseGuards(StaffAuthGuard)
export class AdminTradeInsController {
	constructor(private readonly svc: AdminAggregateService) {}

	@Get()
	async list(@Req() req: Record<symbol, unknown>) {
		const principal = getStaffPrincipal(req) as StaffPrincipal | null;
		return this.svc.listTradeIns(principal?.storeId ?? "");
	}

	@Patch(":id/approve")
	async approve(@Param("id") id: string) {
		return this.svc.approveTradeIn(id);
	}

	@Patch(":id/reject")
	async reject(@Param("id") id: string) {
		return this.svc.rejectTradeIn(id);
	}
}

@Module({
	imports: [PrismaRuntimeModule],
	providers: [AdminAggregateService],
	controllers: [AdminActivitiesController, AdminTradeInsController],
	exports: [AdminAggregateService],
})
export class AdminAggregateModule {}

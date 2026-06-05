import {
	Controller,
	Get,
	Inject,
	Injectable,
	Module,
	Req,
	UseGuards,
} from "@nestjs/common";
import { PrismaRuntimeModule } from "../../common/prisma-runtime/prisma-runtime.module.js";
import { PRISMA_CLIENT } from "../../common/prisma-runtime/prisma-runtime.tokens.js";
import type { PrismaClient } from "../../generated/client.js";
import type { StaffPrincipal } from "../auth/staff-auth.guard.js";
import { getStaffPrincipal, StaffAuthGuard } from "../auth/staff-auth.guard.js";

@Injectable()
export class DeviceAdminService {
	constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

	async listByStore(storeId: string) {
		return this.prisma.device.findMany({
			where: { storeId },
			include: {
				createdByStaff: { select: { displayName: true } },
				_count: { select: { tryOnSessions: true, eventLogs: true } },
			},
			orderBy: { lastHeartbeatAt: "desc" },
		});
	}
}

@Injectable()
export class DashboardService {
	constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

	async getStats(storeId: string) {
		const now = new Date();
		const todayStart = new Date(
			now.getFullYear(),
			now.getMonth(),
			now.getDate(),
		);
		const [
			customerCount,
			sessionCount,
			couponCount,
			deviceCount,
			todaySessions,
			pendingCoupons,
			pendingDevices,
		] = await Promise.all([
			this.prisma.customer.count({ where: { storeId, status: "ACTIVE" } }),
			this.prisma.tryOnSession.count({ where: { storeId } }),
			this.prisma.coupon.count({ where: { storeId, status: "ISSUED" } }),
			this.prisma.device.count({ where: { storeId } }),
			this.prisma.tryOnSession.count({
				where: { storeId, startedAt: { gte: todayStart } },
			}),
			this.prisma.coupon.count({
				where: {
					storeId,
					status: "ISSUED",
					expiresAt: { lte: new Date(Date.now() + 7 * 86_400_000) },
				},
			}),
			this.prisma.device.count({
				where: {
					storeId,
					lastHeartbeatAt: { lt: new Date(Date.now() - 3600_000) },
				},
			}),
		]);
		const recentEvents = await this.prisma.eventLog.findMany({
			where: { storeId },
			orderBy: { occurredAt: "desc" },
			take: 10,
			include: {
				customer: { select: { displayName: true } },
				device: { select: { name: true } },
			},
		});
		return {
			customerCount,
			sessionCount,
			couponCount,
			deviceCount,
			todaySessions,
			pendingCoupons,
			pendingDevices,
			recentEvents,
		};
	}
}

@Controller("admin/devices")
@UseGuards(StaffAuthGuard)
export class AdminDeviceController {
	constructor(private readonly deviceService: DeviceAdminService) {}

	@Get()
	async list(@Req() req: Record<symbol, unknown>) {
		const principal = getStaffPrincipal(req) as StaffPrincipal | null;
		return this.deviceService.listByStore(principal?.storeId ?? "");
	}
}

@Controller("admin/dashboard")
@UseGuards(StaffAuthGuard)
export class AdminDashboardController {
	constructor(private readonly dashboardService: DashboardService) {}

	@Get()
	async stats(@Req() req: Record<symbol, unknown>) {
		const principal = getStaffPrincipal(req) as StaffPrincipal | null;
		return this.dashboardService.getStats(principal?.storeId ?? "");
	}
}

@Module({
	imports: [PrismaRuntimeModule],
	providers: [DeviceAdminService, DashboardService],
	controllers: [AdminDeviceController, AdminDashboardController],
})
export class AdminDeviceModule {}

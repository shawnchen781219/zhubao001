import { Inject, Injectable } from "@nestjs/common";
import { PRISMA_CLIENT } from "../../common/prisma-runtime/prisma-runtime.tokens.js";
import type { PrismaClient } from "../../generated/client.js";

@Injectable()
export class CouponService {
	constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

	async listByStore(
		storeId: string,
		opts?: { status?: string; page?: number; pageSize?: number },
	) {
		const page = opts?.page ?? 1;
		const pageSize = opts?.pageSize ?? 20;
		const where: Record<string, unknown> = { storeId };
		const status = opts?.status;
		if (status && status !== "all") where["status"] = status;
		const [items, total] = await Promise.all([
			this.prisma.coupon.findMany({
				where,
				include: {
					template: {
						select: {
							name: true,
							type: true,
							valueCents: true,
							percentOff: true,
							validityDays: true,
						},
					},
					customer: { select: { id: true, displayName: true } },
					sourceTryOnSession: { select: { id: true, startedAt: true } },
					issuedByStaff: { select: { displayName: true } },
				},
				orderBy: { issuedAt: "desc" },
				skip: (page - 1) * pageSize,
				take: pageSize,
			}),
			this.prisma.coupon.count({ where }),
		]);
		return { items, total, page, pageSize };
	}

	async redeem(couponId: string) {
		const coupon = await this.prisma.coupon.findUnique({
			where: { id: couponId },
		});
		if (!coupon) return { ok: false, error: "NOT_FOUND" };
		if (coupon.status !== "ISSUED" && coupon.status !== "LOCKED") {
			return { ok: false, error: "INVALID_STATUS", status: coupon.status };
		}
		if (coupon.expiresAt < new Date()) {
			return { ok: false, error: "EXPIRED" };
		}
		const updated = await this.prisma.coupon.update({
			where: { id: couponId },
			data: { status: "REDEEMED", redeemedAt: new Date() },
			include: { template: { select: { name: true } } },
		});
		return { ok: true, data: updated };
	}

	async listTemplates(storeId: string) {
		return this.prisma.couponTemplate.findMany({
			where: { storeId, active: true },
			orderBy: { createdAt: "desc" },
		});
	}
}

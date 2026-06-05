import { createHash, randomBytes } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import { PRISMA_CLIENT } from "../../common/prisma-runtime/prisma-runtime.tokens.js";
import type { PrismaClient } from "../../generated/client.js";
// biome-ignore lint/style/useImportType: NestJS DI requires runtime class reference
import { MemberService } from "../member/member.service.js";

@Injectable()
export class TryOnService {
	constructor(
		@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
		private readonly memberService: MemberService,
	) {}

	async listByStore(
		storeId: string,
		opts?: { status?: string; page?: number; pageSize?: number },
	) {
		const page = opts?.page ?? 1;
		const pageSize = opts?.pageSize ?? 20;
		const where: any = { storeId };
		const status = opts?.status;
		if (status && status !== "all") where.status = status;
		const [items, total] = await Promise.all([
			this.prisma.tryOnSession.findMany({
				where,
				include: {
					device: { select: { name: true, code: true } },
					customer: { select: { id: true, displayName: true } },
					items: {
						include: {
							product: {
								select: { name: true, sku: true, type: true, priceCents: true },
							},
						},
					},
					coupons: {
						select: {
							id: true,
							status: true,
							template: { select: { name: true } },
						},
					},
				},
				orderBy: { startedAt: "desc" },
				skip: (page - 1) * pageSize,
				take: pageSize,
			}),
			this.prisma.tryOnSession.count({ where }),
		]);
		return { items, total, page, pageSize };
	}

	async getSession(sessionId: string) {
		return this.prisma.tryOnSession.findUnique({
			where: { id: sessionId },
			include: {
				device: { select: { name: true, code: true } },
				customer: {
					select: {
						id: true,
						displayName: true,
						tags: true,
						preferences: true,
					},
				},
				items: {
					include: {
						product: {
							include: {
								gemstone: true,
								assets: { where: { kind: "IMAGE" }, take: 3 },
							},
						},
					},
				},
				coupons: {
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
					},
				},
				mediaAssets: {
					select: { id: true, type: true, authorizationStatus: true },
				},
			},
		});
	}

	async createAnonymous(
		storeId: string,
		deviceId: string,
		productIds: string[],
	) {
		const anonymousId = `anon-${randomBytes(8).toString("hex")}`;
		const session = await this.prisma.tryOnSession.create({
			data: { storeId, deviceId, anonymousId, status: "ANONYMOUS" },
		});
		for (const productId of productIds) {
			await this.prisma.tryOnItem.create({
				data: { tryOnSessionId: session.id, productId, position: "default" },
			});
		}
		return this.getSession(session.id);
	}

	async showQr(sessionId: string) {
		const qrToken = randomBytes(32).toString("hex");
		const qrTokenHash = createHash("sha256").update(qrToken).digest("hex");
		await this.prisma.tryOnSession.update({
			where: { id: sessionId },
			data: { qrTokenHash, qrShownAt: new Date(), status: "QR_SHOWN" },
		});
		return { qrToken, expiresIn: 300 };
	}

	async scanQr(qrToken: string) {
		const qrTokenHash = createHash("sha256").update(qrToken).digest("hex");
		const session = await this.prisma.tryOnSession.findUnique({
			where: { qrTokenHash },
		});
		if (!session) return null;
		if (session.status !== "QR_SHOWN") return null;
		await this.prisma.tryOnSession.update({
			where: { id: session.id },
			data: { scannedAt: new Date(), status: "SCANNED" },
		});
		return this.getSession(session.id);
	}

	async authorize(sessionId: string, customerId: string) {
		const session = await this.prisma.tryOnSession.findUnique({
			where: { id: sessionId },
		});
		await this.prisma.tryOnSession.update({
			where: { id: sessionId },
			data: { customerId, authorizedAt: new Date(), status: "AUTHORIZED" },
		});

		// 试戴授权自动加积分（仅首次）
		if (session && session.customerId !== customerId) {
			try {
				const itemCount = await this.prisma.tryOnItem.count({
					where: { tryOnSessionId: sessionId },
				});
				await this.memberService.addPoints({
					customerId,
					type: "TRY_ON",
					amount: 50,
					reason: `试戴体验（${itemCount} 件商品）`,
					source: { sessionId, itemCount },
				});
			} catch {
				// 积分失败不影响主流程
			}
		}

		return this.getSession(sessionId);
	}

	async issueCoupon(
		sessionId: string,
		templateId: string,
		customerId: string | null,
		staffId: string | null,
		storeId: string,
	) {
		const idempotencyKey = `coupon-${sessionId}-${templateId}-${Date.now()}`;
		const template = await this.prisma.couponTemplate.findUnique({
			where: { id: templateId },
		});
		if (!template) return null;
		const expiresAt = new Date(Date.now() + template.validityDays * 86_400_000);
		const coupon = await this.prisma.coupon.create({
			data: {
				storeId,
				templateId,
				customerId,
				sourceTryOnSessionId: sessionId,
				idempotencyKey,
				status: "ISSUED",
				issuedByStaffId: staffId,
				expiresAt,
			},
			include: {
				template: {
					select: {
						name: true,
						type: true,
						valueCents: true,
						percentOff: true,
					},
				},
			},
		});

		// 领券自动加积分
		if (customerId) {
			try {
				await this.memberService.addPoints({
					customerId,
					type: "COUPON_ISSUED",
					amount: 100,
					reason: `领取优惠券「${template.name}」`,
					source: { couponId: coupon.id, templateId },
				});
			} catch {
				// 积分失败不影响主流程
			}
		}

		return coupon;
	}
}

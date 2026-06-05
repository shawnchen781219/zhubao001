import { createHash } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import { PRISMA_CLIENT } from "../../common/prisma-runtime/prisma-runtime.tokens.js";
import type { PrismaClient } from "../../generated/client.js";

export interface CustomerListOpts {
	status?: string;
	search?: string;
	page?: number;
	pageSize?: number;
}

@Injectable()
export class CustomerService {
	constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

	async listByStore(storeId: string, opts?: CustomerListOpts) {
		const page = opts?.page ?? 1;
		const pageSize = opts?.pageSize ?? 20;
		const where: any = { storeId };
		const status = opts?.status;
		if (status && status !== "all") where.status = status;
		const search = opts?.search;
		if (search) {
			where.OR = [{ displayName: { contains: search, mode: "insensitive" } }];
		}
		const [items, total] = await Promise.all([
			this.prisma.customer.findMany({
				where,
				include: {
					tryOnSessions: {
						take: 3,
						orderBy: { startedAt: "desc" },
						select: { id: true, status: true, startedAt: true },
					},
					coupons: {
						take: 3,
						orderBy: { issuedAt: "desc" },
						select: {
							id: true,
							status: true,
							template: { select: { name: true } },
						},
					},
					identities: { select: { type: true, rawHint: true } },
				},
				orderBy: { updatedAt: "desc" },
				skip: (page - 1) * pageSize,
				take: pageSize,
			}),
			this.prisma.customer.count({ where }),
		]);
		return { items, total, page, pageSize };
	}

	async getDetail(customerId: string) {
		return this.prisma.customer.findUnique({
			where: { id: customerId },
			include: {
				identities: true,
				tryOnSessions: {
					orderBy: { startedAt: "desc" },
					include: {
						items: {
							include: {
								product: {
									select: { name: true, sku: true, priceCents: true },
								},
							},
						},
						device: { select: { name: true, code: true } },
					},
				},
				coupons: {
					orderBy: { issuedAt: "desc" },
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
				},
			},
		});
	}

	async create(
		storeId: string,
		data: { displayName: string; phone?: string; tags?: string[] },
	) {
		const phoneHash = data.phone
			? createHash("sha256").update(data.phone).digest("hex")
			: null;
		const customer = await this.prisma.customer.create({
			data: {
				storeId,
				displayName: data.displayName,
				phoneHash,
				status: "ACTIVE",
				tags: data.tags ?? [],
			},
		});
		if (data.phone) {
			const identityHash = createHash("sha256")
				.update(data.phone)
				.digest("hex");
			const rawHint =
				data.phone.length >= 7
					? `${data.phone.slice(0, 3)}****${data.phone.slice(-4)}`
					: data.phone;
			await this.prisma.customerIdentity.create({
				data: { customerId: customer.id, type: "PHONE", identityHash, rawHint },
			});
		}
		return customer;
	}
}

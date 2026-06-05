import { Inject, Injectable } from "@nestjs/common";
import { PRISMA_CLIENT } from "../../common/prisma-runtime/prisma-runtime.tokens.js";
import type { PrismaClient } from "../../generated/client.js";
// biome-ignore lint/style/useImportType: NestJS DI requires runtime class reference
import { MemberService } from "../member/member.service.js";

export interface JewelryBoxItemInput {
	productId?: string;
	displayName: string;
	gemType?: string;
	metalType?: string;
	priceCents?: number;
	purchaseDate?: string;
	wearCount?: number;
	story?: string;
	badges?: string[];
}

export interface JewelryBoxUpdateInput {
	wearCount?: number;
	nextCareAt?: string;
	badges?: string[];
	story?: string;
}

@Injectable()
export class JewelryBoxService {
	constructor(
		@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
		private readonly memberService: MemberService,
	) {}

	async listByCustomer(customerIdOrStoreId: string, storeIdFallback: string) {
		let customerId: string | null = customerIdOrStoreId;
		if (!customerId?.startsWith("cmp")) {
			const firstCustomer = await this.prisma.customer.findFirst({
				where: { storeId: storeIdFallback, status: "ACTIVE" },
				select: { id: true },
			});
			if (!firstCustomer)
				return {
					items: [],
					total: 0,
					stats: { totalValue: 0, totalWear: 0, careDueCount: 0 },
				};
			customerId = firstCustomer.id;
		}

		const items = await this.prisma.jewelryBoxItem.findMany({
			where: { customerId },
			include: {
				product: {
					include: {
						gemstone: true,
						assets: {
							where: { kind: "IMAGE" },
							take: 1,
							orderBy: { sortOrder: "asc" },
						},
					},
				},
				careReminders: {
					where: { status: { in: ["scheduled", "upcoming", "overdue"] } },
					orderBy: { scheduledDate: "asc" },
					take: 3,
				},
			},
			orderBy: { purchaseDate: "desc" },
		});

		const total = await this.prisma.jewelryBoxItem.count({
			where: { customerId },
		});
		const totalValue = items.reduce(
			(sum, item) => sum + (item.priceCents || 0),
			0,
		);
		const totalWear = items.reduce((sum, item) => sum + item.wearCount, 0);
		const careDueCount = items.reduce(
			(sum, item) => sum + item.careReminders.length,
			0,
		);

		return {
			items,
			total,
			stats: { totalValue, totalWear, careDueCount },
		};
	}

	async getDetail(itemId: string) {
		return this.prisma.jewelryBoxItem.findUnique({
			where: { id: itemId },
			include: {
				product: {
					include: {
						gemstone: true,
						assets: { orderBy: { sortOrder: "asc" } },
					},
				},
				careReminders: { orderBy: { scheduledDate: "desc" } },
			},
		});
	}

	async create(customerId: string, input: JewelryBoxItemInput) {
		const data: Record<string, unknown> = {
			customerId,
			displayName: input.displayName,
			wearCount: input.wearCount ?? 0,
			badges: input.badges ?? [],
		};
		if (input["productId"]) data["productId"] = input["productId"];
		if (input["gemType"]) data["gemType"] = input["gemType"];
		if (input["metalType"]) data["metalType"] = input["metalType"];
		if (input["priceCents"] !== undefined)
			data["priceCents"] = input["priceCents"];
		if (input["purchaseDate"])
			data["purchaseDate"] = new Date(input["purchaseDate"]);
		if (input["story"]) data["story"] = input["story"];
		const item = await this.prisma.jewelryBoxItem.create({
			data: data as Parameters<
				typeof this.prisma.jewelryBoxItem.create
			>[0]["data"],
		});

		// 购买自动加积分（消费额 × 0.01）
		if (input["priceCents"] && input["priceCents"] > 0) {
			try {
				const pointsFromPurchase = Math.floor(
					(input["priceCents"] as number) / 100,
				);
				if (pointsFromPurchase > 0) {
					await Promise.all([
						this.memberService.addPoints({
							customerId,
							type: "PURCHASE",
							amount: pointsFromPurchase,
							reason: `购买「${input.displayName}」`,
							source: { itemId: item.id, priceCents: input["priceCents"] },
						}),
						this.prisma.memberProfile.update({
							where: { customerId },
							data: {
								totalSpentCents: {
									increment: input["priceCents"] as number,
								},
							} as Parameters<
								typeof this.prisma.memberProfile.update
							>[0]["data"],
						}),
					]);
				}
			} catch {
				// 积分失败不影响主流程
			}
		}

		return item;
	}

	async update(itemId: string, input: JewelryBoxUpdateInput) {
		const data: Record<string, unknown> = {};
		if (input["wearCount"] !== undefined)
			data["wearCount"] = input["wearCount"];
		if (input["nextCareAt"] !== undefined)
			data["nextCareAt"] = new Date(input["nextCareAt"]);
		if (input["badges"] !== undefined) data["badges"] = input["badges"];
		if (input["story"] !== undefined) data["story"] = input["story"];
		return this.prisma.jewelryBoxItem.update({
			where: { id: itemId },
			data: data as Parameters<
				typeof this.prisma.jewelryBoxItem.update
			>[0]["data"],
		});
	}

	async remove(itemId: string) {
		return this.prisma.jewelryBoxItem.delete({ where: { id: itemId } });
	}
}

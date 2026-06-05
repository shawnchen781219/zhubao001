import {
	Inject,
	Injectable,
	BadRequestException,
	NotFoundException,
} from "@nestjs/common";
import { PRISMA_CLIENT } from "../../common/prisma-runtime/prisma-runtime.tokens.js";
import type {
	PrismaClient,
	BlindBoxPool,
} from "../../generated/client.js";
// biome-ignore lint/style/useImportType: NestJS DI requires runtime class reference
import { MemberService } from "../member/member.service.js";

export interface PoolSummary {
	id: string;
	title: string;
	description: string | null;
	coverImage: string | null;
	activeFrom: string;
	activeUntil: string;
	isActive: boolean;
	openPrice: number;
	maxOpensPerDay: number;
	itemCount: number;
	totalGiven: number;
}

export interface OpenResult {
	success: boolean;
	historyId: string | null;
	itemName: string | null;
	itemImage: string | null;
	itemRarity: string | null;
	product: Record<string, unknown> | null;
	points: {
		spent: number;
		newBalance: number;
	};
	reasoning: string[];
}

interface BlindBoxItemWithProduct {
	id: string;
	customName: string;
	image: string | null;
	description: string | null;
	probability: number;
	stock: number;
	totalGiven: number;
	rarity: string;
	product: {
		id: string;
		name: string;
		priceCents: number | null;
		tags: unknown;
		assets: Array<{ storageKey: string }>;
	} | null;
}

export interface CreatePoolInput {
	storeId: string;
	title: string;
	description?: string;
	coverImage?: string;
	activeFrom: string;
	activeUntil: string;
	openPrice?: number;
	maxOpensPerDay?: number;
}

export interface CreateItemInput {
	poolId: string;
	productId?: string;
	customName: string;
	image?: string;
	description?: string;
	probability: number;
	stock?: number;
	rarity?: "COMMON" | "RARE" | "EPIC" | "LEGENDARY";
}

@Injectable()
export class BlindBoxService {
	constructor(
		@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
		private readonly memberService: MemberService,
	) {}

	/**
	 * 获取当前活跃的盲盒奖池（按时间范围和 isActive 过滤）
	 */
	async getTodayActivePool(storeId: string): Promise<BlindBoxPool | null> {
		const now = new Date();
		return this.prisma.blindBoxPool.findFirst({
			where: {
				storeId,
				isActive: true,
				activeFrom: { lte: now },
				activeUntil: { gte: now },
			},
			orderBy: { activeFrom: "desc" },
		});
	}

	/**
	 * H5 端：查看今日盲盒（包含奖品列表，但隐藏概率细节）
	 */
	async getTodayPreview(storeId: string) {
		const pool = await this.getTodayActivePool(storeId);
		if (!pool) {
			return { hasPool: false, pool: null, items: [] };
		}

		const items = await this.prisma.blindBoxItem.findMany({
			where: {
				poolId: pool.id,
				OR: [
					{ stock: { equals: -1 } }, // 无限库存
					{ stock: { gt: 0 } }, // 有库存
				],
			},
			include: {
				product: {
					select: {
						id: true,
						name: true,
						priceCents: true,
						tags: true,
						assets: {
							where: { kind: "IMAGE" },
							take: 1,
							orderBy: { sortOrder: "asc" },
						},
					},
				},
			},
			orderBy: { createdAt: "asc" },
		});

		return {
			hasPool: true,
			pool: {
				id: pool.id,
				title: pool.title,
				description: pool.description,
				coverImage: pool.coverImage,
				activeUntil: pool.activeUntil.toISOString(),
				openPrice: pool.openPrice,
				maxOpensPerDay: pool.maxOpensPerDay,
			},
			items: items.map((item) => ({
				id: item.id,
				customName: item.customName,
				image:
					item.image ??
					item.product?.assets?.[0]?.storageKey ??
					null,
				description: item.description,
				rarity: item.rarity,
				product: item.product
					? {
							id: item.product.id,
							name: item.product.name,
							priceCents: item.product.priceCents,
							tags: item.product.tags,
						}
					: null,
			})),
		};
	}

	/**
	 * H5 端：开盲盒（核心逻辑 - 事务保证原子性）
	 */
	async openBox(
		storeId: string,
		customerId: string,
	): Promise<OpenResult> {
		const pool = await this.getTodayActivePool(storeId);
		if (!pool) {
			throw new NotFoundException("今日没有可用的盲盒活动");
		}

		// 检查每日开盒限制
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
		const opensToday = await this.prisma.blindBoxHistory.count({
			where: {
				poolId: pool.id,
				customerId,
				openedAt: { gte: today, lt: tomorrow },
			},
		});
		if (opensToday >= pool.maxOpensPerDay) {
			throw new BadRequestException(
				`今日开盒次数已达上限（${pool.maxOpensPerDay}次/天），明天再来吧`,
			);
		}

		// 验证积分余额（如需要）
		if (pool.openPrice > 0) {
			try {
				const profile = await this.prisma.memberProfile.findUnique({
					where: { customerId },
				});
				if (!profile || (profile.points ?? 0) < pool.openPrice) {
					throw new BadRequestException(
						`积分不足，需要 ${pool.openPrice} 积分`,
					);
				}
			} catch (e) {
				if (e instanceof BadRequestException) throw e;
				throw new BadRequestException("积分查询失败");
			}
		}

		// 获取可用奖品（有库存的）
		const availableItems = await this.prisma.blindBoxItem.findMany({
			where: {
				poolId: pool.id,
				OR: [
					{ stock: { equals: -1 } },
					{ stock: { gt: 0 } },
				],
			},
			include: {
				product: {
					select: {
						id: true,
						name: true,
						priceCents: true,
						tags: true,
						assets: {
							where: { kind: "IMAGE" },
							take: 1,
							orderBy: { sortOrder: "asc" },
						},
					},
				},
			},
		});

		if (availableItems.length === 0) {
			throw new BadRequestException("盲盒奖品已发完，请明天再来");
		}

		// 加权随机选择
		const selectedItem = this.weightedRandomSelect(
			availableItems as unknown as BlindBoxItemWithProduct[],
		);
		if (!selectedItem) {
			throw new BadRequestException("选择奖品失败");
		}

		// 事务：扣库存 + 扣积分 + 创建历史
		const result = await this.prisma.$transaction(async (tx) => {
			// 1. 扣库存（如果非无限库存）
			if (selectedItem.stock !== -1) {
				await tx.blindBoxItem.update({
					where: { id: selectedItem.id },
					data: {
						stock: { decrement: 1 },
						totalGiven: { increment: 1 },
					},
				});
			} else {
				await tx.blindBoxItem.update({
					where: { id: selectedItem.id },
					data: { totalGiven: { increment: 1 } },
				});
			}

			// 2. 扣积分（如需要）
			if (pool.openPrice > 0) {
				await this.memberService.spendPoints(
					customerId,
					pool.openPrice,
				`盲盒开箱·${pool.title}`,
				);
			}

			// 3. 创建开箱历史
			const history = await tx.blindBoxHistory.create({
				data: {
					poolId: pool.id,
					customerId,
					itemId: selectedItem.id,
					pointsSpent: pool.openPrice,
				},
			});

			return history;
		});

		// 获取最新积分
		const profile = await this.prisma.memberProfile.findUnique({
			where: { customerId },
		});

		return {
			success: true,
			historyId: result.id,
			itemName: selectedItem.customName,
			itemImage:
				selectedItem.image ??
				selectedItem.product?.assets?.[0]?.storageKey ??
				null,
			itemRarity: selectedItem.rarity,
			product: selectedItem.product
				? {
						id: selectedItem.product.id,
						name: selectedItem.product.name,
						priceCents: selectedItem.product.priceCents,
						tags: selectedItem.product.tags,
					}
				: null,
			points: {
				spent: pool.openPrice,
				newBalance: profile?.points ?? 0,
			},
			reasoning: this.buildOpenReasoning(
				pool,
				selectedItem,
				pool.openPrice,
			),
		};
	}

	/**
	 * 开箱历史
	 */
	async getHistory(customerId: string, limit = 30) {
		const records = await this.prisma.blindBoxHistory.findMany({
			where: { customerId },
			orderBy: { openedAt: "desc" },
			take: limit,
			include: {
				item: {
					include: {
						product: {
							select: {
								id: true,
								name: true,
								priceCents: true,
								assets: {
									where: { kind: "IMAGE" },
									take: 1,
									orderBy: { sortOrder: "asc" },
								},
							},
						},
					},
				},
				pool: {
					select: {
						id: true,
						title: true,
					},
				},
			},
		});

		return {
			records: records.map((r) => ({
				id: r.id,
				poolId: r.poolId,
				poolTitle: r.pool.title,
				itemId: r.itemId,
				itemName: r.item.customName,
				itemImage:
					r.item.image ??
					r.item.product?.assets?.[0]?.storageKey ??
					null,
				itemRarity: r.item.rarity,
				product: r.item.product
					? {
							id: r.item.product.id,
							name: r.item.product.name,
							priceCents: r.item.product.priceCents,
						}
					: null,
				pointsSpent: r.pointsSpent,
				openedAt: r.openedAt,
			})),
			totalOpens: await this.prisma.blindBoxHistory.count({
				where: { customerId },
			}),
		};
	}

	/**
	 * === Admin 端：奖池管理 ===
	 */
	async findFirstActiveCustomer(storeId: string): Promise<string | null> {
		const c = await this.prisma.customer.findFirst({
			where: { storeId, status: "ACTIVE" },
			select: { id: true },
		});
		return c?.id ?? null;
	}

	async listPools(storeId: string): Promise<PoolSummary[]> {
		const pools = await this.prisma.blindBoxPool.findMany({
			where: { storeId },
			orderBy: { createdAt: "desc" },
			include: {
				_count: { select: { items: true } },
				items: { select: { totalGiven: true } },
			},
		});

		return pools.map((p) => ({
			id: p.id,
			title: p.title,
			description: p.description,
			coverImage: p.coverImage,
			activeFrom: p.activeFrom.toISOString(),
			activeUntil: p.activeUntil.toISOString(),
			isActive: p.isActive,
			openPrice: p.openPrice,
			maxOpensPerDay: p.maxOpensPerDay,
			itemCount: p._count.items,
			totalGiven: p.items.reduce((sum, i) => sum + i.totalGiven, 0),
		}));
	}

	async getPoolDetail(poolId: string, storeId: string) {
		const pool = await this.prisma.blindBoxPool.findFirst({
			where: { id: poolId, storeId },
		});
		if (!pool) throw new NotFoundException("奖池不存在");

		const items = await this.prisma.blindBoxItem.findMany({
			where: { poolId },
			include: {
				product: {
					select: {
						id: true,
						sku: true,
						name: true,
						priceCents: true,
					},
				},
			},
			orderBy: { createdAt: "asc" },
		});

		const todayHistoryCount = await this.prisma.blindBoxHistory.count({
			where: { poolId },
		});

		const probabilitySum = items.reduce(
			(sum, i) => sum + i.probability,
			0,
		);

		return {
			pool: {
				...pool,
				activeFrom: pool.activeFrom.toISOString(),
				activeUntil: pool.activeUntil.toISOString(),
			},
			items,
			stats: {
				totalOpens: todayHistoryCount,
				probabilitySum,
				isValid: Math.abs(probabilitySum - 1.0) < 0.05,
				probWarning: Math.abs(probabilitySum - 1.0) >= 0.05
					? `概率总和 ${probabilitySum.toFixed(2)}，应接近 1.0`
					: null,
			},
		};
	}

	async createPool(input: CreatePoolInput) {
		const data: Record<string, unknown> = {
			storeId: input.storeId,
			title: input.title,
			activeFrom: new Date(input.activeFrom),
			activeUntil: new Date(input.activeUntil),
			openPrice: input.openPrice ?? 0,
			maxOpensPerDay: input.maxOpensPerDay ?? 1,
		};
		if (input.description !== undefined) data["description"] = input.description;
		if (input.coverImage !== undefined) data["coverImage"] = input.coverImage;
		return this.prisma.blindBoxPool.create({
			data: data as Parameters<typeof this.prisma.blindBoxPool.create>[0]["data"],
		});
	}

	async updatePool(poolId: string, storeId: string, input: Partial<CreatePoolInput>) {
		const existing = await this.prisma.blindBoxPool.findFirst({
			where: { id: poolId, storeId },
		});
		if (!existing) throw new NotFoundException("奖池不存在");

		const data: Record<string, unknown> = {};
		if (input.title !== undefined) data["title"] = input.title;
		if (input.description !== undefined)
			data["description"] = input.description;
		if (input.coverImage !== undefined)
			data["coverImage"] = input.coverImage;
		if (input.activeFrom !== undefined)
			data["activeFrom"] = new Date(input.activeFrom);
		if (input.activeUntil !== undefined)
			data["activeUntil"] = new Date(input.activeUntil);
		if (input.openPrice !== undefined) data["openPrice"] = input.openPrice;
		if (input.maxOpensPerDay !== undefined)
			data["maxOpensPerDay"] = input.maxOpensPerDay;
		if (input.openPrice !== undefined) data["openPrice"] = input.openPrice;
		if (("isActive" in input) && input.isActive !== undefined) {
			data["isActive"] = input.isActive;
		}

		return this.prisma.blindBoxPool.update({
			where: { id: poolId },
			data,
		});
	}

	async deletePool(poolId: string, storeId: string) {
		const existing = await this.prisma.blindBoxPool.findFirst({
			where: { id: poolId, storeId },
		});
		if (!existing) throw new NotFoundException("奖池不存在");
		await this.prisma.blindBoxPool.delete({ where: { id: poolId } });
		return { success: true };
	}

	/**
	 * === Admin 端：奖品管理 ===
	 */
	async createItem(input: CreateItemInput) {
		// 概率校验
		if (input.probability < 0 || input.probability > 1) {
			throw new BadRequestException("概率必须在 0 和 1 之间");
		}

		const pool = await this.prisma.blindBoxPool.findUnique({
			where: { id: input.poolId },
		});
		if (!pool) throw new NotFoundException("奖池不存在");

		const data: Record<string, unknown> = {
			poolId: input.poolId,
			customName: input.customName,
			probability: input.probability,
			stock: input.stock ?? -1,
			rarity: input.rarity ?? "COMMON",
		};
		if (input.productId !== undefined) data["productId"] = input.productId;
		if (input.image !== undefined) data["image"] = input.image;
		if (input.description !== undefined)
			data["description"] = input.description;

		const item = await this.prisma.blindBoxItem.create({
			data: data as Parameters<typeof this.prisma.blindBoxItem.create>[0]["data"],
		});
		return item;
	}

	async updateItem(
		itemId: string,
		input: Partial<Omit<CreateItemInput, "poolId">>,
	) {
		if (
			input.probability !== undefined &&
			(input.probability < 0 || input.probability > 1)
		) {
			throw new BadRequestException("概率必须在 0 和 1 之间");
		}

		const data: Record<string, unknown> = {};
		if (input.productId !== undefined) data["productId"] = input.productId;
		if (input.customName !== undefined)
			data["customName"] = input.customName;
		if (input.image !== undefined) data["image"] = input.image;
		if (input.description !== undefined)
			data["description"] = input.description;
		if (input.probability !== undefined)
			data["probability"] = input.probability;
		if (input.stock !== undefined) data["stock"] = input.stock;
		if (input.rarity !== undefined) data["rarity"] = input.rarity;

		return this.prisma.blindBoxItem.update({
			where: { id: itemId },
			data: data as Parameters<typeof this.prisma.blindBoxItem.update>[0]["data"],
		});
	}

	async deleteItem(itemId: string) {
		await this.prisma.blindBoxItem.delete({ where: { id: itemId } });
		return { success: true };
	}

	/**
	 * === Admin 端：开箱统计 ===
	 */
	async getStats(storeId: string) {
		const pools = await this.prisma.blindBoxPool.findMany({
			where: { storeId },
			select: { id: true },
		});
		const poolIds = pools.map((p) => p.id);

		const [totalOpens, totalRevenues, topItems] = await Promise.all([
			this.prisma.blindBoxHistory.count({
				where: { poolId: { in: poolIds } },
			}),
			this.prisma.blindBoxHistory.aggregate({
				where: { poolId: { in: poolIds } },
				_sum: { pointsSpent: true },
			}),
			this.prisma.blindBoxItem.findMany({
				where: { poolId: { in: poolIds } },
				orderBy: { totalGiven: "desc" },
				take: 5,
			}),
		]);

		return {
			totalOpens,
			totalPoints: totalRevenues._sum.pointsSpent ?? 0,
			topItems: topItems.map((i) => ({
				id: i.id,
				customName: i.customName,
				rarity: i.rarity,
				totalGiven: i.totalGiven,
			})),
		};
	}

	/**
	 * === 内部：加权随机选择 ===
	 */
	private weightedRandomSelect(
		items: BlindBoxItemWithProduct[],
	): BlindBoxItemWithProduct | null {
		if (items.length === 0) return null;

		const totalWeight = items.reduce((sum, i) => sum + i.probability, 0);
		if (totalWeight <= 0) {
			// 等概率 fallback
			const idx = Math.floor(Math.random() * items.length);
			return items[idx] ?? null;
		}

		const random = Math.random() * totalWeight;
		let cumulative = 0;
		for (const item of items) {
			cumulative += item.probability;
			if (random <= cumulative) {
				return item;
			}
		}
		return items[items.length - 1] ?? null;
	}

	private buildOpenReasoning(
		pool: BlindBoxPool,
		item: BlindBoxItemWithProduct,
		spent: number,
	): string[] {
		const reasoning: string[] = [];
		reasoning.push(`🎁 盲盒活动：${pool.title}`);
		reasoning.push(
			`   抽中奖品：${item.customName} [${item.rarity}]`,
		);
		if (item.description) {
			reasoning.push(`   ${item.description}`);
		}
		if (spent > 0) {
			reasoning.push(`💰 消耗积分：${spent}`);
		} else {
			reasoning.push(`💰 免费开盒`);
		}
		reasoning.push(
			`   每日开盒次数限制：${pool.maxOpensPerDay} 次/天`,
		);
		return reasoning;
	}
}

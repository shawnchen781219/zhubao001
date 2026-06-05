import { createHash } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { PrismaClient } from "../../node_modules/.prisma/client/client.js";

const connectionString =
	process.env.DATABASE_URL ??
	"postgresql://jewelry:jewelry@localhost:5432/jewelry_digital?schema=public";

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter } as never);

function hashSecret(raw: string): string {
	return createHash("sha256").update(raw).digest("hex");
}

function daysFromNow(days: number): Date {
	return new Date(Date.now() + days * 86_400_000);
}

function daysAgo(days: number): Date {
	return new Date(Date.now() - days * 86_400_000);
}

async function main() {
	console.log("Seeding demo data...");

	await prisma.eventLog.deleteMany();
	await prisma.coupon.deleteMany();
	await prisma.mediaAsset.deleteMany();
	await prisma.tryOnItem.deleteMany();
	await prisma.tryOnSession.deleteMany();
	await prisma.customerIdentity.deleteMany();
	await prisma.customer.deleteMany();
	await prisma.gemstone.deleteMany();
	await prisma.productAsset.deleteMany();
	await prisma.product.deleteMany();
	await prisma.couponTemplate.deleteMany();
	await prisma.device.deleteMany();
	await prisma.staffUser.deleteMany();
	await prisma.store.deleteMany();

	console.log("Old data cleared.");

	const store = await prisma.store.create({
		data: {
			code: "STORE-001",
			name: "法芮珂珠宝旗舰店",
			status: "ACTIVE",
			timezone: "Asia/Shanghai",
			address: "上海市静安区南京西路 1688 号 3F",
			phone: "021-6288-8888",
		},
	});
	console.log(`Store: ${store.name} (${store.id})`);

	const manager = await prisma.staffUser.create({
		data: {
			storeId: store.id,
			email: "manager@farico.com",
			displayName: "张明华",
			phoneHash: hashSecret("13900001111"),
			role: "MANAGER",
			status: "ACTIVE",
		},
	});

	const advisor1 = await prisma.staffUser.create({
		data: {
			storeId: store.id,
			email: "wang.li@farico.com",
			displayName: "王丽",
			phoneHash: hashSecret("13900002222"),
			role: "ADVISOR",
			status: "ACTIVE",
		},
	});

	const advisor2 = await prisma.staffUser.create({
		data: {
			storeId: store.id,
			email: "chen.jie@farico.com",
			displayName: "陈洁",
			phoneHash: hashSecret("13900003333"),
			role: "ADVISOR",
			status: "ACTIVE",
		},
	});
	console.log(
		`Staff: ${manager.displayName}, ${advisor1.displayName}, ${advisor2.displayName}`,
	);

	const device = await prisma.device.create({
		data: {
			storeId: store.id,
			createdByStaffId: manager.id,
			code: "MIRROR-A01",
			name: "试戴镜 A01 (入口)",
			type: "MIRROR_TERMINAL",
			status: "ACTIVE",
			secretHash: hashSecret("demo-device-secret-2026"),
			lastHeartbeatAt: daysAgo(0),
			metadata: { firmware: "1.0.3", location: "3F 入口右侧" },
		},
	});

	const device2 = await prisma.device.create({
		data: {
			storeId: store.id,
			createdByStaffId: manager.id,
			code: "MIRROR-B02",
			name: "试戴镜 B02 (钻石区)",
			type: "MIRROR_TERMINAL",
			status: "ACTIVE",
			secretHash: hashSecret("demo-device-b-secret-2026"),
			lastHeartbeatAt: daysAgo(0),
			metadata: { firmware: "1.0.3", location: "3F 钻石专区" },
		},
	});
	console.log(`Devices: ${device.name}, ${device2.name}`);

	const products = await Promise.all([
		prisma.product.create({
			data: {
				storeId: store.id,
				sku: "NECK-001",
				name: "海水蓝宝石星空项链",
				type: "NECKLACE",
				status: "ACTIVE",
				description:
					"采用斯里兰卡天然海水蓝宝石，18K 白金镶嵌，独特的星空切工设计，在光线下呈现深邃的蓝色光芒。",
				priceCents: 3880000,
				tags: ["高端", "送礼首选", "星空系列"],
			},
		}),
		prisma.product.create({
			data: {
				storeId: store.id,
				sku: "RING-001",
				name: "经典六爪钻戒·永恒",
				type: "RING",
				status: "ACTIVE",
				description:
					"50 分天然钻石，D 色 VVS1，经典六爪镶嵌，铂金 PT950 戒托。",
				priceCents: 2280000,
				tags: ["婚戒", "经典款", "钻石系列"],
			},
		}),
		prisma.product.create({
			data: {
				storeId: store.id,
				sku: "BRACE-001",
				name: "翡翠竹节手镯",
				type: "BRACELET",
				status: "ACTIVE",
				description: "缅甸天然翡翠 A 货，冰种飘花，竹节造型，寓意节节高升。",
				priceCents: 1580000,
				tags: ["翡翠", "国风", "竹节系列"],
			},
		}),
		prisma.product.create({
			data: {
				storeId: store.id,
				sku: "EARR-001",
				name: "南洋金珠水滴耳环",
				type: "EARRING",
				status: "ACTIVE",
				description: "12mm 南洋金珠，18K 黄金耳钩，水滴造型优雅大方。",
				priceCents: 960000,
				tags: ["珍珠", "优雅", "金珠系列"],
			},
		}),
		prisma.product.create({
			data: {
				storeId: store.id,
				sku: "GEM-001",
				name: "帕帕拉恰蓝宝石裸石",
				type: "GEMSTONE",
				status: "ACTIVE",
				description:
					"3.2 克拉天然帕帕拉恰蓝宝石，斯里兰卡产，莲花粉橙色，GRS 证书。",
				priceCents: 6800000,
				tags: ["裸石", "收藏级", "稀有色"],
			},
		}),
		prisma.product.create({
			data: {
				storeId: store.id,
				sku: "NECK-002",
				name: "培育钻石满天星项链",
				type: "NECKLACE",
				status: "ACTIVE",
				description: "共 30 颗培育钻石，总重 2.5 克拉，18K 白金满天星设计。",
				priceCents: 320000,
				tags: ["培育钻石", "轻奢", "日常款"],
			},
		}),
	]);
	console.log(`Products: ${products.length} items created`);

	await prisma.gemstone.create({
		data: {
			storeId: store.id,
			productId: products[0]?.id,
			code: "GEM-A001",
			type: "NATURAL",
			name: "海水蓝宝石",
			origin: "斯里兰卡",
			certificateNo: "GRS-2025-LK-089721",
			storySummary:
				"这颗海水蓝宝石来自斯里兰卡的古老矿区，历经数亿年地质运动形成。其独特的丝绒蓝色源于铁和钛元素的微妙平衡。",
			formationProcess: {
				process: "天然地质高温高压形成",
				age: "约 4.5 亿年",
				mohs: 9,
				refractiveIndex: "1.76-1.78",
			},
			inclusions: { type: "丝绒状包裹体", visibility: "肉眼不可见" },
		},
	});

	await prisma.gemstone.create({
		data: {
			storeId: store.id,
			productId: products[1]?.id,
			code: "GEM-A002",
			type: "NATURAL",
			name: "天然钻石",
			origin: "博茨瓦纳",
			certificateNo: "GIA-2025-6382917460",
			storySummary:
				"50 分 D 色 VVS1 天然钻石，完美切工，火彩与亮度均达到顶级水平。",
			formationProcess: {
				process: "地幔深处高温高压碳结晶",
				depth: "约 150-200 公里",
				age: "约 10-30 亿年",
				mohs: 10,
			},
			inclusions: { type: "针状体", visibility: "仅 10x 放大可见" },
		},
	});

	await prisma.gemstone.create({
		data: {
			storeId: store.id,
			productId: products[4]?.id,
			code: "GEM-A005",
			type: "NATURAL",
			name: "帕帕拉恰蓝宝石",
			origin: "斯里兰卡",
			certificateNo: "GRS-2025-LK-120537",
			storySummary:
				"帕帕拉恰是最稀有的蓝宝石品种之一，融合了粉色和橙色的微妙过渡，被称为'莲花刚玉'。",
			formationProcess: {
				process: "天然地质高温高压形成，含铬与铁着色",
				age: "约 5 亿年",
				mohs: 9,
			},
			inclusions: { type: "丝绒包裹体", visibility: "极微量" },
		},
	});

	await prisma.gemstone.create({
		data: {
			storeId: store.id,
			productId: products[5]?.id,
			code: "GEM-A006",
			type: "LAB_DIAMOND",
			name: "培育钻石",
			certificateNo: "IGI-2025-LG-5381927",
			storySummary:
				"采用 CVD 化学气相沉积技术培育，物理、化学、光学性质与天然钻石完全一致。",
			formationProcess: {
				process: "CVD 化学气相沉积",
				duration: "2-4 周",
				mohs: 10,
			},
			inclusions: { type: "培育特征包裹体", visibility: "仅专业检测可见" },
		},
	});
	console.log("Gemstones created");

	const templates = await Promise.all([
		prisma.couponTemplate.create({
			data: {
				storeId: store.id,
				code: "FREE-CLEAN-001",
				name: "到店免费清洗保养",
				type: "FREE_CLEANING",
				validityDays: 30,
				maxIssueCount: 500,
				active: true,
				metadata: {
					description: "凭此券到任意门店享受免费珠宝清洗保养服务一次",
				},
			},
		}),
		prisma.couponTemplate.create({
			data: {
				storeId: store.id,
				code: "OFF-200-001",
				name: "到店立减 200 元",
				type: "AMOUNT_OFF",
				valueCents: 20000,
				validityDays: 14,
				maxIssueCount: 200,
				active: true,
				metadata: {
					description: "任意商品消费满 2000 元立减 200 元",
					minPurchaseCents: 200000,
				},
			},
		}),
		prisma.couponTemplate.create({
			data: {
				storeId: store.id,
				code: "BLIND-BOX-001",
				name: "宝石盲盒体验券",
				type: "GEMSTONE_BLIND_BOX",
				validityDays: 7,
				maxIssueCount: 100,
				active: true,
				metadata: {
					description: "到店开启一个精美宝石盲盒，有机会获得限定款饰品",
				},
			},
		}),
	]);
	console.log(`Coupon templates: ${templates.length} created`);

	const customer1 = await prisma.customer.create({
		data: {
			storeId: store.id,
			displayName: "李雪晴",
			phoneHash: hashSecret("13812345678"),
			status: "ACTIVE",
			tags: ["高意向", "钻石爱好者", "已预约周六"],
			preferences: { style: "经典优雅", budgetCents: 3000000 },
		},
	});
	await prisma.customerIdentity.create({
		data: {
			customerId: customer1.id,
			type: "PHONE",
			identityHash: hashSecret("13812345678"),
			rawHint: "138****5678",
			verifiedAt: daysAgo(30),
		},
	});

	const customer2 = await prisma.customer.create({
		data: {
			storeId: store.id,
			displayName: "赵芳",
			phoneHash: hashSecret("13698765432"),
			status: "ACTIVE",
			tags: ["新客户"],
			preferences: { style: "时尚轻奢" },
		},
	});
	await prisma.customerIdentity.create({
		data: {
			customerId: customer2.id,
			type: "WECHAT_OPENID",
			identityHash: hashSecret("oXXXX_mock_openid_zhaofang"),
			rawHint: "wx_zhao",
		},
	});

	const customer3 = await prisma.customer.create({
		data: {
			storeId: store.id,
			displayName: "孙伟",
			phoneHash: hashSecret("13511112222"),
			status: "ACTIVE",
			tags: ["回头客", "翡翠收藏"],
			preferences: { style: "国风收藏", budgetCents: 5000000 },
		},
	});
	await prisma.customerIdentity.create({
		data: {
			customerId: customer3.id,
			type: "PHONE",
			identityHash: hashSecret("13511112222"),
			rawHint: "135****2222",
			verifiedAt: daysAgo(60),
		},
	});
	console.log(
		`Customers: ${customer1.displayName}, ${customer2.displayName}, ${customer3.displayName}`,
	);

	const session1 = await prisma.tryOnSession.create({
		data: {
			storeId: store.id,
			deviceId: device.id,
			customerId: customer1.id,
			anonymousId: "anon-s1-001",
			qrTokenHash: hashSecret("qr-token-s1"),
			status: "COMPLETED",
			startedAt: daysAgo(2),
			qrShownAt: daysAgo(2),
			scannedAt: daysAgo(2),
			authorizedAt: daysAgo(2),
			endedAt: daysAgo(2),
			metadata: { notes: "客户试戴了海水蓝宝石项链和钻戒，对星空项链兴趣很高" },
		},
	});
	await prisma.tryOnItem.create({
		data: {
			tryOnSessionId: session1.id,
			productId: products[0]?.id,
			durationMs: 45000,
			position: "necklace-front",
			selectedAt: daysAgo(2),
		},
	});
	await prisma.tryOnItem.create({
		data: {
			tryOnSessionId: session1.id,
			productId: products[1]?.id,
			durationMs: 30000,
			position: "ring-left-hand",
			selectedAt: daysAgo(2),
		},
	});

	const session2 = await prisma.tryOnSession.create({
		data: {
			storeId: store.id,
			deviceId: device.id,
			anonymousId: "anon-s2-002",
			status: "ANONYMOUS",
			startedAt: daysAgo(0),
			metadata: { notes: "匿名试戴翡翠手镯" },
		},
	});
	await prisma.tryOnItem.create({
		data: {
			tryOnSessionId: session2.id,
			productId: products[2]?.id,
			durationMs: 20000,
			position: "bracelet-right",
			selectedAt: daysAgo(0),
		},
	});

	const session3 = await prisma.tryOnSession.create({
		data: {
			storeId: store.id,
			deviceId: device2.id,
			customerId: customer3.id,
			anonymousId: "anon-s3-003",
			qrTokenHash: hashSecret("qr-token-s3"),
			status: "AUTHORIZED",
			startedAt: daysAgo(1),
			qrShownAt: daysAgo(1),
			scannedAt: daysAgo(1),
			authorizedAt: daysAgo(1),
			metadata: { notes: "孙伟先生对翡翠竹节手镯非常满意，已扫码授权" },
		},
	});
	await prisma.tryOnItem.create({
		data: {
			tryOnSessionId: session3.id,
			productId: products[2]?.id,
			durationMs: 60000,
			position: "bracelet-right",
			selectedAt: daysAgo(1),
		},
	});
	console.log(`Try-on sessions: 3 created`);

	await prisma.coupon.create({
		data: {
			storeId: store.id,
			templateId: templates[0]?.id,
			customerId: customer1.id,
			sourceTryOnSessionId: session1.id,
			idempotencyKey: `coupon-s1-t0-${daysAgo(2).getTime()}`,
			status: "ISSUED",
			issuedByStaffId: advisor1.id,
			issuedAt: daysAgo(2),
			expiresAt: daysFromNow(28),
		},
	});

	await prisma.coupon.create({
		data: {
			storeId: store.id,
			templateId: templates[1]?.id,
			customerId: customer1.id,
			sourceTryOnSessionId: session1.id,
			idempotencyKey: `coupon-s1-t1-${daysAgo(2).getTime()}`,
			status: "ISSUED",
			issuedByStaffId: advisor1.id,
			issuedAt: daysAgo(2),
			expiresAt: daysFromNow(12),
		},
	});

	await prisma.coupon.create({
		data: {
			storeId: store.id,
			templateId: templates[2]?.id,
			customerId: customer3.id,
			sourceTryOnSessionId: session3.id,
			idempotencyKey: `coupon-s3-t2-${daysAgo(1).getTime()}`,
			status: "ISSUED",
			issuedByStaffId: advisor2.id,
			issuedAt: daysAgo(1),
			expiresAt: daysFromNow(6),
		},
	});

	await prisma.coupon.create({
		data: {
			storeId: store.id,
			templateId: templates[0]?.id,
			customerId: customer2.id,
			idempotencyKey: `coupon-c2-t0-walkin`,
			status: "REDEEMED",
			issuedByStaffId: manager.id,
			issuedAt: daysAgo(7),
			redeemedAt: daysAgo(3),
			expiresAt: daysFromNow(23),
		},
	});
	console.log("Coupons created");

	await prisma.eventLog.create({
		data: {
			storeId: store.id,
			eventType: "TRY_ON_COMPLETED",
			occurredAt: daysAgo(2),
			deviceId: device.id,
			customerId: customer1.id,
			tryOnSessionId: session1.id,
			payload: { summary: "李雪晴试戴星空项链和钻戒，对项链兴趣高" },
		},
	});

	await prisma.eventLog.create({
		data: {
			storeId: store.id,
			eventType: "TRY_ON_AUTHORIZED",
			occurredAt: daysAgo(1),
			deviceId: device2.id,
			customerId: customer3.id,
			tryOnSessionId: session3.id,
			payload: { summary: "孙伟授权试戴翡翠手镯" },
		},
	});

	await prisma.eventLog.create({
		data: {
			storeId: store.id,
			eventType: "CUSTOMER_CREATED",
			occurredAt: daysAgo(30),
			createdByStaffId: advisor1.id,
			customerId: customer1.id,
			payload: { method: "staff_manual" },
		},
	});

	await prisma.eventLog.create({
		data: {
			storeId: store.id,
			eventType: "COUPON_REDEEMED",
			occurredAt: daysAgo(3),
			customerId: customer2.id,
			createdByStaffId: manager.id,
			payload: { templateCode: "FREE-CLEAN-001", method: "in_store" },
		},
	});
	console.log("Event logs created");

	console.log("\n=== Seed complete ===");
	console.log(`Store ID:       ${store.id}`);
	console.log(`Manager:        ${manager.displayName} (${manager.email})`);
	console.log(
		`Advisors:       ${advisor1.displayName}, ${advisor2.displayName}`,
	);
	console.log(`Devices:        ${device.code}, ${device2.code}`);
	console.log(`Products:       ${products.length} items`);
	console.log(`Customers:      3 customers`);
	console.log(`Sessions:       3 try-on sessions`);
	console.log(`Coupons:        4 issued`);
	console.log(`Event logs:     4 entries`);
}

main()
	.catch((error) => {
		console.error("Seed failed:", error);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
		await pool.end();
	});

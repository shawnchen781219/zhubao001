// ===== 法芮珂珠宝 H5 · Phase 2+3 体验版 =====
const API_BASE = "/api";
let token = "";
let _currentPage = "home";
let storeId = "store-fallback-001";
let products = [];
let tryOnSession = null;
let couponTemplates = [];
let selectedProductId = null;
const favorites = new Set();
const compareIds = new Set();
let couponClaimed = false;
let claimedCoupon = null;
let selectedSlot = null;
let selectedConsult = null;
let luckyRevealed = false;
let _tradeInResult = null;

// ===== UNSPLASH HELPER =====
const UNSPLASH = (id, w = 600, h = 450) =>
	`https://images.unsplash.com/${id}?w=${w}&h=${h}&fit=crop&auto=format&q=80`;

// ===== PRODUCT DATA =====
const FALLBACK_PRODUCTS = [
	{
		id: "prod-necklace-001",
		sku: "NECK-001",
		name: "海水蓝宝石星空项链",
		type: "NECKLACE",
		description:
			"斯里兰卡天然海水蓝宝石，18K 白金镶嵌，星空切工，在光线下呈现深邃的蓝色光芒。",
		priceCents: 3880000,
		tags: ["高端", "送礼首选", "星空系列"],
		image: UNSPLASH("photo-1599643478518-a784e5dc4c8f"),
		gemstone: {
			name: "斯里兰卡海水蓝宝石",
			type: "NATURAL",
			origin: "斯里兰卡",
			certificate_no: "GIA-SK-2024-88421",
			gemstone_type: "蓝宝石",
			carat_weight: "4.85",
			clarity: "VS1",
			color_grade: "Royal Blue",
			cut_grade: "Excellent",
			storySummary:
				"这颗海水蓝宝石诞生于斯里兰卡著名矿区，经历数亿年地质演变，独特晶体结构赋予深邃蓝色和柔和丝绢光泽。",
		},
	},
	{
		id: "prod-ring-001",
		sku: "RING-001",
		name: "经典六爪钻戒 · 永恒",
		type: "RING",
		description:
			"50分天然钻石，D色 VVS1，经典六爪镶嵌，铂金PT950戒托，展现钻石最纯粹火彩。",
		priceCents: 2280000,
		tags: ["婚戒", "经典款", "钻石系列"],
		image: UNSPLASH("photo-1605100804763-247f67b3557e"),
		gemstone: {
			name: "天然钻石 0.50ct",
			type: "NATURAL",
			origin: "南非",
			certificate_no: "GIA-6482937501",
			gemstone_type: "天然钻石",
			carat_weight: "0.50",
			clarity: "VVS1",
			color_grade: "D",
			cut_grade: "Excellent (3EX)",
			storySummary:
				"D色级完全无色透明，VVS1净度几乎没有可见内含物，是钻石中最纯净的等级之一。",
		},
	},
	{
		id: "prod-earring-001",
		sku: "EARR-001",
		name: "南洋金珠水滴耳环",
		type: "EARRING",
		description:
			"12mm南洋金珠，浓郁金黄色光泽，18K黄金水滴造型耳钩，优雅大方。",
		priceCents: 960000,
		tags: ["珍珠", "优雅", "金珠系列"],
		image: UNSPLASH("photo-1535632066927-ab7c9ab60908"),
		gemstone: {
			name: "南洋金珠 12mm",
			type: "NATURAL",
			origin: "澳大利亚",
			certificate_no: "PEARL-AU-2024-11233",
			gemstone_type: "南洋金珠",
			carat_weight: null,
			clarity: "无瑕",
			color_grade: "浓金",
			cut_grade: "正圆",
			storySummary:
				"产自澳大利亚北部海域白蝶贝，养殖周期2-3年，浓郁金色光泽象征富贵与优雅。",
		},
	},
	{
		id: "prod-bracelet-001",
		sku: "BRACE-001",
		name: "翡翠竹节手镯",
		type: "BRACELET",
		description:
			"缅甸天然翡翠A货，冰种飘花，竹节造型寓意节节高升，镯身通透绿意盎然。",
		priceCents: 1580000,
		tags: ["翡翠", "国风", "收藏级"],
		image: UNSPLASH("photo-1611591437281-460bfbe1220a"),
		gemstone: {
			name: "缅甸冰种翡翠",
			type: "NATURAL",
			origin: "缅甸",
			certificate_no: "NGTC-JD-2024-66721",
			gemstone_type: "翡翠（A货）",
			carat_weight: null,
			clarity: "冰种飘花",
			color_grade: "帝王绿",
			cut_grade: null,
			storySummary:
				"缅甸雾露河流域产出，以独特冰种透明度和飘花纹理闻名，经国检中心严格检测。",
		},
	},
	{
		id: "prod-gem-001",
		sku: "GEM-001",
		name: "帕帕拉恰蓝宝石裸石",
		type: "GEMSTONE",
		description:
			"3.2克拉帕帕拉恰蓝宝石，斯里兰卡产出，独一无二的莲花粉橙色，全球拍卖市场最受追捧彩色宝石。",
		priceCents: 6800000,
		tags: ["裸石", "收藏级", "稀有色"],
		image: UNSPLASH("photo-1551733028-6dd52074ce0b"),
		gemstone: {
			name: "帕帕拉恰蓝宝石 3.2ct",
			type: "NATURAL",
			origin: "斯里兰卡",
			certificate_no: "GRS-2024-028914",
			gemstone_type: "帕帕拉恰蓝宝石",
			carat_weight: "3.20",
			clarity: "VS2",
			color_grade: "Padparadscha (莲花橙)",
			cut_grade: "Very Good",
			storySummary:
				"世界最稀有彩色宝石之一，每开采10000颗蓝宝石仅1颗可被鉴定为帕帕拉恰。",
		},
	},
	{
		id: "prod-necklace-002",
		sku: "NECK-002",
		name: "培育钻石满天星项链",
		type: "NECKLACE",
		description:
			"30颗高品质培育钻石，总重2.5克拉，18K白金满天星镶嵌，环保培育与天然钻石光学特性完全相同。",
		priceCents: 320000,
		tags: ["培育钻石", "轻奢", "日常款"],
		image: UNSPLASH("photo-1515562141589-678a37b38934"),
		gemstone: {
			name: "培育钻石满天星",
			type: "LAB_DIAMOND",
			origin: "实验室培育 (CVD)",
			certificate_no: "IGI-LG-590177428",
			gemstone_type: "培育钻石",
			carat_weight: "2.50 (总)",
			clarity: "VS-VVS",
			color_grade: "D-F",
			cut_grade: "Very Good-Excellent",
			storySummary:
				"CVD化学气相沉积技术生长，与天然钻石物理化学生光学特性完全相同，可持续珠宝未来之选。",
		},
	},
	{
		id: "prod-ring-002",
		sku: "RING-002",
		name: "鸽血红宝石铂金戒指",
		type: "RING",
		description:
			"2.1克拉缅甸鸽血红宝石，铂金950镶嵌，环绕30颗碎钻，高贵典雅气场非凡。",
		priceCents: 8600000,
		tags: ["收藏级", "红宝石", "高端"],
		image: UNSPLASH("photo-1602751584552-8ba73aad10e1"),
		gemstone: {
			name: "缅甸鸽血红宝石",
			type: "NATURAL",
			origin: "缅甸抹谷",
			certificate_no: "GRS-2024-019827",
			gemstone_type: "红宝石",
			carat_weight: "2.10",
			clarity: "VS1",
			color_grade: "Pigeon Blood",
			cut_grade: "Excellent",
			storySummary:
				"鸽血红是红宝石中最珍贵色彩等级，仅产缅甸抹谷，产量稀少，拍卖市场最受追捧。",
		},
	},
	{
		id: "prod-earring-002",
		sku: "EARR-002",
		name: "祖母绿水滴耳坠",
		type: "EARRING",
		description:
			"哥伦比亚祖母绿，梨形切割，18K白金镶嵌配钻0.8ct，绿意盎然，高端晚宴点睛之作。",
		priceCents: 4200000,
		tags: ["祖母绿", "宴会款", "高端"],
		image: UNSPLASH("photo-1588444837495-c6cfeb53f32d"),
		gemstone: {
			name: "哥伦比亚祖母绿",
			type: "NATURAL",
			origin: "哥伦比亚穆佐矿",
			certificate_no: "SSEF-2024-104581",
			gemstone_type: "祖母绿",
			carat_weight: "1.85 (每颗)",
			clarity: "Minor Oil (微油)",
			color_grade: "Vivid Green",
			cut_grade: "Very Good",
			storySummary:
				"哥伦比亚穆佐矿区是世界最高品质祖母绿产地，含微量铬元素展现鲜艳绿色和独特内光。",
		},
	},
];

// ===== JEWELRY BOX DATA =====
const JEWELRY_BOX = [
	{
		id: "jb-01",
		name: "海水蓝宝石星空项链",
		type: "NECKLACE",
		image: UNSPLASH("photo-1599643478518-a784e5dc4c8f"),
		purchaseDate: "2025-08-15",
		priceCents: 3880000,
		lastCare: "2026-03-10",
		nextCare: "2026-06-10",
		careStatus: "due",
		gemType: "蓝宝石",
		metalType: "18K白金",
		story: "斯里兰卡天然海水蓝宝石，星空切工设计",
		badges: ["首购", "高价值"],
		wearCount: 42,
	},
	{
		id: "jb-02",
		name: "经典六爪钻戒 · 永恒",
		type: "RING",
		image: UNSPLASH("photo-1605100804763-247f67b3557e"),
		purchaseDate: "2024-12-25",
		priceCents: 2280000,
		lastCare: "2026-05-20",
		nextCare: "2026-08-20",
		careStatus: "ok",
		gemType: "钻石",
		metalType: "PT950铂金",
		story: "结婚纪念日礼物，一生挚爱",
		badges: ["纪念日", "婚戒"],
		wearCount: 156,
	},
	{
		id: "jb-03",
		name: "南洋金珠水滴耳环",
		type: "EARRING",
		image: UNSPLASH("photo-1535632066927-ab7c9ab60908"),
		purchaseDate: "2025-03-08",
		priceCents: 960000,
		lastCare: "2026-04-15",
		nextCare: "2026-07-15",
		careStatus: "ok",
		gemType: "南洋金珠",
		metalType: "18K黄金",
		story: "三八节自我奖励",
		badges: ["珍珠"],
		wearCount: 28,
	},
	{
		id: "jb-04",
		name: "翡翠竹节手镯",
		type: "BRACELET",
		image: UNSPLASH("photo-1611591437281-460bfbe1220a"),
		purchaseDate: "2025-06-01",
		priceCents: 1580000,
		lastCare: "2026-01-05",
		nextCare: "2026-06-05",
		careStatus: "overdue",
		gemType: "翡翠",
		metalType: "无镶嵌",
		story: "收藏级冰种飘花翡翠",
		badges: ["收藏级", "国风"],
		wearCount: 65,
	},
	{
		id: "jb-05",
		name: "培育钻石满天星项链",
		type: "NECKLACE",
		image: UNSPLASH("photo-1515562141589-678a37b38934"),
		purchaseDate: "2026-02-14",
		priceCents: 320000,
		lastCare: "2026-05-01",
		nextCare: "2026-08-01",
		careStatus: "ok",
		gemType: "培育钻石",
		metalType: "18K白金",
		story: "情人节礼物，环保时尚",
		badges: ["新人款", "日常"],
		wearCount: 18,
	},
];

// ===== MEMBER DATA =====
const MEMBER_DATA = {
	level: "金卡会员",
	levelIcon: "👑",
	levelColor: "#C9A24E",
	totalSpent: 9020000,
	points: 9020,
	nextLevel: "铂金会员",
	nextLevelPoints: 20000,
	growthExp: 12800,
	daysSinceJoin: 538,
	certificates: 3,
	badges: [
		{
			icon: "💎",
			name: "宝石鉴赏家",
			desc: "收藏3件以上宝石类珠宝",
			earned: true,
		},
		{ icon: "🌟", name: "VIP老客", desc: "连续12个月有消费记录", earned: true },
		{ icon: "💝", name: "礼物达人", desc: "送礼记录超过5次", earned: true },
		{ icon: "🔄", name: "以旧焕新", desc: "完成1次焕新评估", earned: true },
		{ icon: "✨", name: "闪耀之夜", desc: "参加门店VIP活动", earned: false },
		{ icon: "🏆", name: "年度珍藏家", desc: "年度消费Top 10", earned: false },
	],
	benefits: [
		{
			icon: "🎁",
			name: "生日礼遇",
			desc: "生日当月双倍积分 + 免费清洗",
			active: true,
		},
		{
			icon: "💆",
			name: "免费保养",
			desc: "每季度1次免费深度保养",
			active: true,
		},
		{ icon: "🎫", name: "专属折扣", desc: "正价商品享 9.5 折", active: true },
		{ icon: "🌹", name: "VIP活动", desc: "优先受邀品牌私享活动", active: true },
		{
			icon: "📦",
			name: "免费寄送",
			desc: "全国包邮 + 保价运输",
			active: false,
		},
	],
	history: [
		{ date: "2026-05-20", event: "钻戒保养", points: "+50" },
		{ date: "2026-03-10", event: "项链深度清洗", points: "+50" },
		{ date: "2026-02-14", event: "购买培育钻石项链", points: "+3200" },
		{ date: "2025-12-25", event: "VIP圣诞活动", points: "+500" },
		{ date: "2025-08-15", event: "购买星空项链", points: "+5000" },
	],
};

// ===== LUCKY CHARM DATA =====
const FORTUNES = [
	{
		gem: "蓝宝石",
		color: "#1a3a8a",
		sign: "今日宜：勇敢尝试新风格",
		message:
			"蓝宝石象征智慧与忠诚，今天的你适合展现内心深处的坚定信念。佩戴深蓝色珠宝将为你带来平静与力量。",
		recommend: "海蓝宝石项链或耳饰",
		luckyColor: "宝蓝色",
	},
	{
		gem: "红宝石",
		color: "#8a1a1a",
		sign: "今日宜：表达心意",
		message:
			"红宝石代表热情与爱情，今天是个适合向重要的人表达感情的日子。红色珠宝将为你增添魅力与自信。",
		recommend: "红宝石戒指或胸针",
		luckyColor: "中国红",
	},
	{
		gem: "翡翠",
		color: "#1a5a3a",
		sign: "今日宜：沉淀与思考",
		message:
			"翡翠寓意平安与富贵，今天适合放慢脚步、享受宁静。绿色珠宝能让你感受到自然的生命力。",
		recommend: "翡翠手镯或平安扣",
		luckyColor: "翠绿",
	},
	{
		gem: "珍珠",
		color: "#8a7a5a",
		sign: "今日宜：社交与聚会",
		message:
			"珍珠象征优雅与纯洁，今天适合参加重要的社交场合。珍珠首饰将为你增添从容与高贵。",
		recommend: "珍珠耳坠或吊坠项链",
		luckyColor: "珍珠白",
	},
	{
		gem: "钻石",
		color: "#4a4a6a",
		sign: "今日宜：犒赏自己",
		message:
			"钻石代表永恒与坚韧，今天是个适合自我奖励的日子。钻石饰品能让你感受到自己值得被珍视。",
		recommend: "钻石手链或耳钉",
		luckyColor: "璀璨银",
	},
];

// ===== MAINTENANCE CALENDAR DATA =====
const MAINTENANCE_ITEMS = [
	{
		name: "翡翠竹节手镯",
		date: "2026-06-05",
		type: "深度清洗",
		status: "upcoming",
		urgent: true,
		daysLeft: 1,
		tips: "翡翠忌高温和化学腐蚀，推荐用软毛刷蘸取中性清洗剂轻轻刷洗",
	},
	{
		name: "海水蓝宝石项链",
		date: "2026-06-10",
		type: "免费保养",
		status: "upcoming",
		urgent: false,
		daysLeft: 6,
		tips: "蓝宝石硬度高但仍需避免磕碰，建议检查镶嵌爪位是否牢固",
	},
	{
		name: "南洋金珠耳环",
		date: "2026-07-15",
		type: "光泽护理",
		status: "scheduled",
		urgent: false,
		daysLeft: 41,
		tips: "珍珠最怕汗水和香水侵蚀，佩戴后请用棉布擦拭再收纳入首饰盒",
	},
];

// ===== REFERRAL DATA =====
const REFERRAL_DATA = {
	cardName: "闺蜜同行 · 双倍璀璨礼遇",
	validUntil: "2026-07-31",
	benefits: [
		{ icon: "🎁", text: "双方各获 ¥500 到店礼券" },
		{ icon: "💎", text: "同行试戴可解锁限量款预览" },
		{ icon: "✨", text: "双人购买享额外 9 折" },
	],
	shared: false,
	shareCode: "FRC-2026-BFF-0604",
};

// ===== API HELPERS =====
async function api(path, options = {}) {
	const headers = {
		"Content-Type": "application/json",
		...(token && { Authorization: `Bearer ${token}` }),
		...options.headers,
	};
	const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
	if (!response.ok) throw new Error(`HTTP ${response.status}`);
	return response.json();
}

function showToast(msg, d = 2500) {
	const t = document.getElementById("toast");
	t.textContent = msg;
	t.classList.add("show");
	setTimeout(() => t.classList.remove("show"), d);
}

function formatPrice(cents) {
	return !cents && cents !== 0
		? "-"
		: `¥${(cents / 100).toLocaleString("zh-CN")}`;
}
function formatDate(d) {
	if (!d) return "-";
	const dt = new Date(d);
	return `${dt.getMonth() + 1}月${dt.getDate()}日`;
}
function getImg(p, w = 600, h = 450) {
	if (p.image) return p.image;
	const m = {
		NECKLACE: UNSPLASH("photo-1599643478518-a784e5dc4c8f", w, h),
		RING: UNSPLASH("photo-1605100804763-247f67b3557e", w, h),
		EARRING: UNSPLASH("photo-1535632066927-ab7c9ab60908", w, h),
		BRACELET: UNSPLASH("photo-1611591437281-460bfbe1220a", w, h),
		GEMSTONE: UNSPLASH("photo-1551733028-6dd52074ce0b", w, h),
	};
	return m[p.type] || m.NECKLACE;
}
function typeLabel(t) {
	return (
		{
			NECKLACE: "项链",
			RING: "戒指",
			EARRING: "耳饰",
			BRACELET: "手镯",
			GEMSTONE: "裸石",
		}[t] || t
	);
}

// ===== NAVIGATION =====
function goTo(page) {
	_currentPage = page;
	document
		.querySelectorAll(".page")
		.forEach((p) => p.classList.toggle("active", p.id === `page-${page}`));
	document
		.querySelectorAll(".nav-btn")
		.forEach((b) => b.classList.toggle("active", b.dataset.page === page));
	window.scrollTo({ top: 0, behavior: "smooth" });
	const renders = {
		home: renderHome,
		recommend: renderRecommend,
		jewelrybox: renderJewelryBox,
		member: renderMember,
		discover: renderDiscover,
		profile: renderProfile,
		luck: renderLuck,
		calendar: renderCalendar,
		tradein: renderTradeIn,
		referral: renderReferral,
		story: renderStory,
		passport: renderPassport,
		coupon: renderCoupon,
		blindbox: renderBlindBox,
		notifications: renderNotifications,
		levelUps: renderLevelUps,
	};
	if (renders[page]) renders[page]();
}

// ===== PAGE: HOME =====
function renderHome() {
	const p = tryOnSession?.items?.[0]?.product || products[0];
	const ht = document.getElementById("hero-title");
	const hd = document.getElementById("hero-desc");
	ht.textContent = p?.name || "为您甄选的珠宝";
	hd.textContent = p?.description?.slice(0, 50) || "";
	if (p?.image) {
		const hero = document.getElementById("hero");
		hero.style.setProperty("--hero-img", `url('${p.image}')`);
		hero.classList.add("has-hero-image");
	}
	setTimeout(
		() =>
			document
				.querySelectorAll(".reveal-up")
				.forEach((el) => el.classList.add("revealed")),
		100,
	);
	const tc = document.getElementById("tryon-cards");
	if (tryOnSession?.items?.length > 0) {
		tc.innerHTML = tryOnSession.items
			.map((item) => {
				const prod = item.product;
				const dur = item.durationMs ? Math.round(item.durationMs / 1000) : "-";
				return `<div class="tryon-card" onclick="goTo('passport')">
        <div class="tryon-card-visual">${getImg(prod) ? `<img class="tryon-card-img" src="${getImg(prod)}" alt="" loading="lazy"/>` : ""}<div class="tryon-card-gradient"></div><div class="tryon-card-overlay-name">${prod?.name || ""}</div></div>
        <div class="tryon-card-info"><div class="tryon-card-name">${prod?.name || ""}</div>
        <div class="tryon-card-meta"><span>⏱️ ${dur}秒</span><span>📍 ${item.position || "-"}</span></div>
        <div class="tryon-card-price">${formatPrice(prod?.priceCents)}</div>
        <div class="tryon-card-actions"><button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();selectedProductId='${prod?.id}';goTo('passport')" type="button">查看护照</button><button class="btn btn-gold btn-sm" onclick="event.stopPropagation();goTo('coupon')" type="button">领取权益</button></div></div></div>`;
			})
			.join("");
	} else {
		tc.innerHTML = `<div class="tryon-card" onclick="goTo('discover')"><div class="tryon-card-visual">${getImg(products[0]) ? `<img class="tryon-card-img" src="${getImg(products[0])}" alt="" loading="lazy"/>` : ""}<div class="tryon-card-gradient"></div><div class="tryon-card-overlay-name">${products[0]?.name || ""}</div></div><div class="tryon-card-info"><div class="tryon-card-name">${products[0]?.name || "暂无"}</div><div class="tryon-card-price">${formatPrice(products[0]?.priceCents)}</div></div></div>`;
	}
	const ac = document.getElementById("analysis-card");
	ac.innerHTML = `<div class="analysis-row"><div class="analysis-icon style">✦</div><div class="analysis-content"><div class="analysis-label">风格匹配</div><div class="analysis-value">${p?.description || ""}</div></div></div>
    <div class="analysis-row"><div class="analysis-icon gem">◆</div><div class="analysis-content"><div class="analysis-label">标签特征</div><div class="analysis-value">${(p?.tags || ["优雅"]).join(" · ")}</div></div></div>
    <div class="analysis-row"><div class="analysis-icon scene">❖</div><div class="analysis-content"><div class="analysis-label">适合场景</div><div class="analysis-value">日常通勤 · 宴会 · 约会</div></div></div>
    <div class="analysis-row"><div class="analysis-icon tip">★</div><div class="analysis-content"><div class="analysis-label">门店建议</div><div class="analysis-value">建议到实体店试戴实物，感受真实光泽与佩戴舒适度</div></div></div>`;
	createParticles();
}
function createParticles() {
	const c = document.getElementById("hero-particles");
	c.innerHTML = "";
	for (let i = 0; i < 12; i++) {
		const p = document.createElement("div");
		p.className = "particle";
		p.style.left = `${Math.random() * 100}%`;
		p.style.top = `${Math.random() * 100}%`;
		p.style.animationDelay = `${Math.random() * 4}s`;
		c.appendChild(p);
	}
}

// ===== PAGE: JEWELRY BOX =====
let _jbData = null;
function getItemImage(item) {
  const product = item.product || {};
  const fbMatch = FALLBACK_PRODUCTS.find((p) => p.name === product.name);
  if (fbMatch?.image) return fbMatch.image;
  if (product.id) return getImg(product);
  const typeImgs = { NECKLACE: UNSPLASH("photo-1599643478518-a784e5dc4c8f"), RING: UNSPLASH("photo-1605100804763-247f67b3557e"), EARRING: UNSPLASH("photo-1535632066927-ab7c9ab60908"), BRACELET: UNSPLASH("photo-1611591437281-460bfbe1220a"), GEMSTONE: UNSPLASH("photo-1551733028-6dd52074ce0b") };
  return typeImgs[product.type] || UNSPLASH("photo-1599643478518-a784e5dc4c8f");
}
function careStatusOf(nextCareAt) {
  if (!nextCareAt) return "ok";
  const d = new Date(nextCareAt); const now = new Date();
  if (d < now) return "overdue";
  const diffDays = (d - now) / 86400000;
  if (diffDays <= 7) return "upcoming";
  return "ok";
}
async function renderJewelryBox() {
  if (!_jbData) {
    try { _jbData = await api("/jewelry-box"); }
    catch (e) {
      console.warn("jewelry-box API failed, using fallback", e);
      _jbData = { items: JEWELRY_BOX, total: JEWELRY_BOX.length, stats: { totalValue: JEWELRY_BOX.reduce((s, j) => s + (j.priceCents || 0), 0), totalWear: JEWELRY_BOX.reduce((s, j) => s + j.wearCount, 0), careDueCount: JEWELRY_BOX.filter((j) => j.careStatus !== "ok").length } };
    }
  }
  const items = (_jbData.items || []).map((i) => ({ ...i, image: getItemImage(i), careStatus: careStatusOf(i.nextCareAt), badges: Array.isArray(i.badges) ? i.badges : [] }));
  const stats = _jbData.stats || {};
  document.getElementById("jb-stats").innerHTML = `
    <div class="jb-stat"><div class="jb-stat-val">${stats.total || items.length}</div><div class="jb-stat-lbl">珍藏件数</div></div>
    <div class="jb-stat"><div class="jb-stat-val">${formatPrice(stats.totalValue || 0)}</div><div class="jb-stat-lbl">总价值</div></div>
    <div class="jb-stat"><div class="jb-stat-val">${stats.totalWear || items.reduce((s, j) => s + (j.wearCount || 0), 0)}</div><div class="jb-stat-lbl">总佩戴次数</div></div>`;
  const upcoming = items.filter((j) => j.careStatus !== "ok");
  if (upcoming.length > 0) {
    document.getElementById("jb-care-alerts").style.display = "block";
    document.getElementById("jb-care-list").innerHTML = upcoming.map((j) => `
      <div class="jb-care-item ${j.careStatus === "overdue" ? "urgent" : ""}">
        <div class="jb-care-img"><img src="${j.image}" alt="" loading="lazy"/></div>
        <div class="jb-care-info">
          <div class="jb-care-name">${j.displayName || j.name}</div>
          <div class="jb-care-date">${j.careStatus === "overdue" ? "⚠️ 已过期" : "⏰ 即将到期"}: ${formatDate(j.nextCareAt)}</div>
          <div class="jb-care-type">${j.gemType || "-"}</div>
        </div>
        <button class="btn btn-gold btn-sm" onclick="showToast('已预约 ${j.displayName || j.name} 保养 ✓')" type="button">预约</button>
      </div>`).join("");
  } else {
    document.getElementById("jb-care-alerts").style.display = "none";
  }
  document.getElementById("jb-grid").innerHTML = items.map((j) => `
    <div class="jb-card" onclick="showJewelryBoxDetail('${j.id}')">
      <div class="jb-card-img"><img src="${j.image}" alt="${j.displayName || j.name}" loading="lazy"/></div>
      <div class="jb-card-body">
        <div class="jb-card-name">${j.displayName || j.name}</div>
        <div class="jb-card-type">${typeLabel(j.product?.type) || "-"} · ${j.gemType || "-"}</div>
        <div class="jb-card-badges">${(j.badges || []).map((b) => `<span class="jb-badge">${b}</span>`).join("")}</div>
        <div class="jb-card-meta">购入 ${formatDate(j.purchaseDate)} · 佩戴 ${j.wearCount || 0} 次</div>
      </div>
    </div>`).join("");
}
function showJewelryBoxDetail(id) {
  const items = (_jbData?.items || JEWELRY_BOX).map((i) => ({ ...i, image: getItemImage(i), badges: Array.isArray(i.badges) ? i.badges : [] }));
  const j = items.find((x) => x.id === id);
  if (!j) return;
  const product = j.product || {};
  document.getElementById("modal-body").innerHTML = `
    <div class="modal-hero-img" style="background-image:url('${j.image}')"></div>
    <div class="modal-product-name">${j.displayName || j.name}</div>
    <div class="modal-product-type">${typeLabel(product.type) || "-"} · ${j.gemType || "-"} · ${j.metalType || "-"}</div>
    <div class="modal-product-price">${formatPrice(j.priceCents)}</div>
    <div class="modal-product-desc">${j.story || product.description || ""}</div>
    <div class="modal-tags">${(j.badges || []).map((b) => `<span class="modal-tag">${b}</span>`).join("")}</div>
    <div class="modal-gem-section"><div class="modal-gem-title">保养信息</div>
      <div class="spec-row"><span class="spec-label">上次保养</span><span class="spec-value">${formatDate(j.lastCareAt || j.lastCare)}</span></div>
      <div class="spec-row"><span class="spec-label">下次保养</span><span class="spec-value">${formatDate(j.nextCareAt || j.nextCare)}</span></div>
      <div class="spec-row"><span class="spec-label">佩戴次数</span><span class="spec-value">${j.wearCount || 0} 次</span></div>
    </div>
    <div class="modal-actions"><button class="btn btn-gold btn-lg btn-full" onclick="showToast('已预约 ${j.displayName || j.name} 保养 ✓');closeModal()" type="button">预约免费保养</button></div>`;
  document.getElementById("modal-overlay").classList.add("active");
}

// ===== PAGE: MEMBER =====
async function renderMember() {
	let m;
	try {
		m = await api("/member/my");
		if (!m || !m.ok) throw new Error(m?.error || "Invalid response");
	} catch (e) {
		console.warn("Member API failed, using fallback", e);
		renderMemberFallback();
		return;
	}

	// 更新页面头问候语
	const greet = document.getElementById("mem-greet");
	if (greet) greet.textContent = m.name ? `欢迎回来，${m.name}` : "欢迎回来";

	// 异步更新通知角标
	refreshNotificationBadge();

	const pct = m.nextLevel
		? Math.round((m.points / m.nextLevel.requiredPoints) * 100)
		: 100;
	const nextLabel = m.nextLevel
		? `距${m.nextLevel.name}还需 ${(m.nextLevel.requiredPoints - m.points).toLocaleString()} 积分`
		: "已达最高等级 🎉";

	const tierIcons = {
		DIAMOND: "💎",
		PLATINUM: "💍",
		GOLD: "👑",
		SILVER: "🥈",
		NEW: "🌱",
	};
	const tierIcon = tierIcons[m.level] || "🌟";

	const benefitsMap = {
		DIAMOND: [
			{ icon: "🎁", name: "生日礼遇", desc: "生日当月三倍积分 + 免费清洗", active: true },
			{ icon: "💆", name: "免费保养", desc: "全年免费深度保养", active: true },
			{ icon: "🎫", name: "专属折扣", desc: "正价商品享 9 折", active: true },
			{ icon: "🌹", name: "VIP活动", desc: "优先受邀品牌私享活动", active: true },
			{ icon: "📦", name: "免费寄送", desc: "全国包邮 + 保价运输", active: true },
		],
		PLATINUM: [
			{ icon: "🎁", name: "生日礼遇", desc: "生日当月双倍积分 + 免费清洗", active: true },
			{ icon: "💆", name: "免费保养", desc: "每季度1次免费深度保养", active: true },
			{ icon: "🎫", name: "专属折扣", desc: "正价商品享 9.5 折", active: true },
			{ icon: "🌹", name: "VIP活动", desc: "优先受邀品牌私享活动", active: true },
			{ icon: "📦", name: "免费寄送", desc: "全国包邮 + 保价运输", active: false },
		],
		GOLD: [
			{ icon: "🎁", name: "生日礼遇", desc: "生日当月双倍积分 + 免费清洗", active: true },
			{ icon: "💆", name: "免费保养", desc: "每年2次免费保养", active: true },
			{ icon: "🎫", name: "专属折扣", desc: "正价商品享 9.5 折", active: true },
			{ icon: "🌹", name: "VIP活动", desc: "优先受邀品牌私享活动", active: true },
			{ icon: "📦", name: "免费寄送", desc: "全国包邮 + 保价运输", active: false },
		],
		SILVER: [
			{ icon: "🎁", name: "生日礼遇", desc: "生日当月双倍积分", active: true },
			{ icon: "💆", name: "免费保养", desc: "每年1次免费保养", active: true },
			{ icon: "🎫", name: "专属折扣", desc: "正价商品享 9.8 折", active: true },
			{ icon: "🌹", name: "VIP活动", desc: "受邀参与门店活动", active: false },
			{ icon: "📦", name: "免费寄送", desc: "全国包邮 + 保价运输", active: false },
		],
		NEW: [
			{ icon: "🎁", name: "新人礼包", desc: "首单立减 ¥200", active: true },
			{ icon: "💆", name: "免费保养", desc: "首年1次免费清洗", active: true },
			{ icon: "🎫", name: "专属折扣", desc: "升级后解锁更多优惠", active: false },
			{ icon: "🌹", name: "VIP活动", desc: "升级后受邀参与", active: false },
			{ icon: "📦", name: "免费寄送", desc: "全国包邮 + 保价运输", active: false },
		],
	};
	const benefits = benefitsMap[m.level] || benefitsMap.NEW;

	const badgeThresholds = [
		{ icon: "💎", name: "宝石鉴赏家", desc: "收藏3件以上宝石类珠宝", earned: m.jewelryBoxCount >= 3 },
		{ icon: "🌟", name: "VIP老客", desc: "连续12个月有活跃记录", earned: m.daysSinceJoin >= 365 },
		{ icon: "🔮", name: "每日幸运", desc: "连续签到7天", earned: m.maxStreakDays >= 7 },
		{ icon: "👗", name: "穿搭达人", desc: "完成10次以上试戴", earned: m.totalTryOns >= 10 },
		{ icon: "💝", name: "礼物达人", desc: "珠宝盒有5件以上珍藏", earned: m.jewelryBoxCount >= 5 },
		{ icon: "🔥", name: "连续达人", desc: "连续签到30天", earned: m.maxStreakDays >= 30 },
	];

	document.getElementById("mem-hero").innerHTML = `
    <div class="mem-level-icon">${tierIcon}</div>
    <div class="mem-level-name" style="color:${m.levelColor}">${m.levelName}</div>
    <div class="mem-points">${m.points.toLocaleString()} <span class="mem-points-unit">积分</span></div>
    <div class="mem-bar-wrap"><div class="mem-bar" style="width:${pct}%"></div></div>
    <div class="mem-next">${nextLabel}</div>
    <div class="mem-stats">
      <div class="mem-stat"><div class="mem-stat-val">${formatPrice(m.totalSpentCents)}</div><div class="mem-stat-lbl">累计消费</div></div>
      <div class="mem-stat"><div class="mem-stat-val">${m.daysSinceJoin}</div><div class="mem-stat-lbl">会员天数</div></div>
      <div class="mem-stat"><div class="mem-stat-val">${m.jewelryBoxCount || 0}</div><div class="mem-stat-lbl">珍藏珠宝</div></div>
    </div>`;

	document.getElementById("mem-benefits").innerHTML = benefits
		.map(
			(b) => `
    <div class="mem-benefit ${b.active ? "" : "inactive"}">
      <div class="mem-benefit-icon">${b.icon}</div>
      <div class="mem-benefit-info">
        <div class="mem-benefit-name">${b.name}${b.active ? "" : ' <span class="mem-benefit-lock">待解锁</span>'}</div>
        <div class="mem-benefit-desc">${b.desc}</div>
      </div>
    </div>`,
		)
		.join("");

	document.getElementById("mem-badges").innerHTML = badgeThresholds
		.map(
			(b) => `
    <div class="mem-badge-card ${b.earned ? "" : "locked"}">
      <div class="mem-badge-icon">${b.icon}</div>
      <div class="mem-badge-name">${b.name}</div>
      <div class="mem-badge-desc">${b.earned ? b.desc : "未解锁"}</div>
    </div>`,
		)
		.join("");

	// 渲染等级晋升历史
	renderMemberLevelHistory();

	const historyBox = document.getElementById("mem-history");
	historyBox.innerHTML = '<div class="mem-history-loading">加载中…</div>';
	try {
		const history = await api("/member/my/history?limit=15");
		const records = Array.isArray(history) ? history : [];
		if (!records.length) {
			historyBox.innerHTML = '<div class="empty-msg">暂无积分记录</div>';
			return;
		}
		const typeLabels = {
			PURCHASE: "消费",
			TRY_ON: "试戴",
			COUPON_ISSUED: "领券",
			LUCKY_SIGN: "签到",
			GRANTED: "赠送",
			SPENT: "抵扣",
			BIRTHDAY_BONUS: "生日奖励",
			EXPIRED: "过期",
		};
		historyBox.innerHTML = records
			.map(
				(h) => `
    <div class="mem-hist-row">
      <div class="mem-hist-event">${typeLabels[h.type] || h.type}${h.reason ? ` · ${h.reason}` : ""}</div>
      <div class="mem-hist-date">${formatDate(h.createdAt)}</div>
      <div class="mem-hist-pts" style="color:${h.amount > 0 ? "#4ade80" : "#f87171"}">${h.amount > 0 ? "+" : ""}${h.amount}</div>
    </div>`,
			)
			.join("");
	} catch (e) {
		historyBox.innerHTML = '<div class="empty-msg">加载失败</div>';
	}
}

// 渲染会员页内的"等级晋升历史"卡片
async function renderMemberLevelHistory() {
	const box = document.getElementById("mem-level-history");
	if (!box) return;
	box.innerHTML = '<div class="mem-history-loading">加载中…</div>';
	try {
		const resp = await api("/member/my/level-history?limit=5");
		const items = Array.isArray(resp) ? resp : resp?.items || [];
		if (!items.length) {
			box.innerHTML = '<div class="empty-msg">暂无等级变更记录</div>';
			return;
		}
		const tierIcons = { DIAMOND: "💎", PLATINUM: "💍", GOLD: "👑", SILVER: "🥈", NEW: "🌱" };
		box.innerHTML = items.map((log) => {
			const directionIcon = log.direction === "UPGRADE" ? "⬆" : log.direction === "DOWNGRADE" ? "⬇" : "★";
			const directionClass = log.direction === "UPGRADE" ? "level-up" : log.direction === "DOWNGRADE" ? "level-down" : "level-init";
			const directionLabel = log.direction === "UPGRADE" ? "升级" : log.direction === "DOWNGRADE" ? "降级" : "加入";
			return `
      <div class="level-history-row ${directionClass}">
        <div class="level-history-icon">${tierIcons[log.toLevel] || "⭐"}</div>
        <div class="level-history-body">
          <div class="level-history-title">${directionIcon} ${directionLabel}至 ${log.toLevelName}</div>
          <div class="level-history-meta">
            ${log.fromLevelName ? `原等级：${log.fromLevelName}` : "首次加入"} · ${log.toPoints.toLocaleString()} 积分 · ${formatDate(log.createdAt)}
          </div>
          ${log.note ? `<div class="level-history-note">${log.note}</div>` : ""}
        </div>
      </div>`;
		}).join("") + `
      <button class="btn btn-ghost btn-full" onclick="goTo('levelUps')" type="button" style="margin-top:10px;">查看完整晋升轨迹 →</button>`;
	} catch (e) {
		box.innerHTML = '<div class="empty-msg">加载失败</div>';
	}
}

// ===== 通知中心 =====
let _notifItems = [];

async function refreshNotificationBadge() {
	const badge = document.getElementById("mem-notif-badge");
	if (!badge) return;
	try {
		const resp = await api("/notifications/unread-count");
		const count = typeof resp === "number" ? resp : resp?.count ?? 0;
		if (count > 0) {
			badge.textContent = count > 99 ? "99+" : String(count);
			badge.style.display = "flex";
		} else {
			badge.style.display = "none";
		}
	} catch (e) {
		badge.style.display = "none";
	}
}

async function renderNotifications() {
	const list = document.getElementById("notif-list");
	if (!list) return;
	list.innerHTML = '<div class="mem-history-loading">加载中…</div>';
	try {
		const resp = await api("/notifications?limit=30");
		const items = resp?.items || [];
		_notifItems = items;
		const unread = resp?.unread ?? 0;
		// 更新角标
		const badge = document.getElementById("mem-notif-badge");
		if (badge) {
			if (unread > 0) {
				badge.textContent = unread > 99 ? "99+" : String(unread);
				badge.style.display = "flex";
			} else {
				badge.style.display = "none";
			}
		}
		if (!items.length) {
			list.innerHTML = `
        <div class="notif-empty">
          <div class="notif-empty-icon">🔔</div>
          <div class="notif-empty-text">暂无通知</div>
          <div class="notif-empty-subtext">参与活动后会收到提醒</div>
        </div>`;
			return;
		}
		list.innerHTML = items.map((n) => {
			const unreadDot = n.readAt ? "" : '<span class="notif-unread-dot"></span>';
			return `
        <div class="notif-card ${n.readAt ? "" : "unread"}" onclick="handleNotificationClick('${n.id}')">
          <div class="notif-icon">${n.iconEmoji || "📬"}</div>
          <div class="notif-body">
            <div class="notif-title">${unreadDot}${n.title}</div>
            <div class="notif-preview">${n.body}</div>
            <div class="notif-time">${formatDate(n.createdAt)}</div>
          </div>
        </div>`;
		}).join("");
	} catch (e) {
		list.innerHTML = '<div class="empty-msg">加载失败</div>';
	}
}

async function handleNotificationClick(id) {
	try {
		await api(`/notifications/${id}/read`, { method: "PATCH" });
	} catch (e) {
		// ignore
	}
	refreshNotificationBadge();
	const n = _notifItems.find((i) => i.id === id);
	if (!n) return;
	// 升级通知 → 跳到等级晋升页
	if (n.type === "MEMBER_LEVEL_UPGRADED" || n.type === "MEMBER_LEVEL_DOWNGRADED") {
		// 弹出升级祝贺
		showUpgradePopup(n);
		// 刷新 member 页数据（如果有新等级）
		renderMember();
		return;
	}
	// 其他通知：跳 actionUrl 或 toast
	if (n.actionUrl) {
		const page = n.actionUrl.replace(/^\//, "");
		goTo(page);
		return;
	}
	showToast(n.title);
	// 重新渲染通知列表（标记已读状态变化）
	renderNotifications();
}

async function markAllNotificationsRead() {
	try {
		await api("/notifications/read-all", { method: "POST" });
		showToast("✓ 已全部标记为已读");
		refreshNotificationBadge();
		renderNotifications();
	} catch (e) {
		showToast("操作失败");
	}
}

function showUpgradePopup(n) {
	const payload = n.payload || {};
	const levelName = payload.levelName || n.title;
	const benefits = Array.isArray(payload.benefits) ? payload.benefits : [];
	const levelIcons = { DIAMOND: "💎", PLATINUM: "💍", GOLD: "👑", SILVER: "🥈", NEW: "🌱" };
	const icon = levelIcons[payload.level] || "⭐";
	const isUpgrade = n.type === "MEMBER_LEVEL_UPGRADED";
	const modalBody = document.getElementById("modal-body");
	modalBody.innerHTML = `
    <div class="upgrade-popup ${isUpgrade ? "up" : "down"}">
      <div class="upgrade-pop-icon">${icon}</div>
      <div class="upgrade-pop-kicker">${isUpgrade ? "恭喜 · 等级晋升" : "等级变更"}</div>
      <div class="upgrade-pop-title">${levelName}</div>
      ${benefits.length ? `
      <div class="upgrade-pop-benefits">
        <div class="upgrade-pop-benefits-title">新解锁 ${benefits.length} 项权益</div>
        ${benefits.map((b) => `<div class="upgrade-pop-benefit">✓ ${b}</div>`).join("")}
      </div>` : ""}
      <button class="btn btn-gold btn-lg btn-full" onclick="closeModal(); goTo('member');" type="button" style="margin-top:20px;">查看会员中心</button>
      <button class="btn btn-ghost btn-full" onclick="closeModal();" type="button" style="margin-top:10px;">稍后再看</button>
    </div>`;
	document.getElementById("modal-overlay").classList.add("active");
}

// ===== 等级晋升时间线 =====
async function renderLevelUps() {
	const box = document.getElementById("level-up-timeline");
	if (!box) return;
	box.innerHTML = '<div class="mem-history-loading">加载中…</div>';
	try {
		const resp = await api("/member/my/level-history?limit=50");
		const items = Array.isArray(resp) ? resp : resp?.items || [];
		if (!items.length) {
			box.innerHTML = '<div class="empty-msg">暂无等级变更记录</div>';
			return;
		}
		const tierIcons = { DIAMOND: "💎", PLATINUM: "💍", GOLD: "👑", SILVER: "🥈", NEW: "🌱" };
		box.innerHTML = items.map((log, idx) => {
			const directionIcon = log.direction === "UPGRADE" ? "⬆⬆" : log.direction === "DOWNGRADE" ? "⬇" : "★";
			const directionClass = log.direction === "UPGRADE" ? "level-up" : log.direction === "DOWNGRADE" ? "level-down" : "level-init";
			const directionLabel = log.direction === "UPGRADE" ? "升级" : log.direction === "DOWNGRADE" ? "降级" : "加入法芮珂";
			const benefits = Array.isArray(log.earnedBenefits) ? log.earnedBenefits : [];
			return `
      <div class="tl-item ${directionClass}">
        <div class="tl-dot-wrap">
          <div class="tl-dot">${idx === 0 ? "now" : idx}</div>
          ${idx < items.length - 1 ? '<div class="tl-line"></div>' : ""}
        </div>
        <div class="tl-card">
          <div class="tl-icon">${tierIcons[log.toLevel] || "⭐"}</div>
          <div class="tl-main">
            <div class="tl-title">${directionIcon} ${directionLabel}至 <span style="color:${log.toLevelColor || '#C9A24E'}">${log.toLevelName}</span></div>
            <div class="tl-meta">${formatDate(log.createdAt)} · 积分 ${log.toPoints.toLocaleString()}</div>
            ${log.fromLevelName ? `<div class="tl-from">从 ${log.fromLevelName} 起</div>` : ""}
            ${benefits.length ? `<div class="tl-benefits">${benefits.slice(0,3).map(b => `<span class="tl-benefit">✓ ${b}</span>`).join("")}</div>` : ""}
            ${log.note ? `<div class="tl-note">${log.note}</div>` : ""}
          </div>
        </div>
      </div>`;
		}).join("");
	} catch (e) {
		box.innerHTML = '<div class="empty-msg">加载失败</div>';
	}
}

function renderMemberFallback() {
	const m = MEMBER_DATA;
	const pct = Math.round((m.points / m.nextLevelPoints) * 100);
	document.getElementById("mem-hero").innerHTML = `
    <div class="mem-level-icon">${m.levelIcon}</div>
    <div class="mem-level-name" style="color:${m.levelColor}">${m.level}</div>
    <div class="mem-points">${m.points.toLocaleString()} <span class="mem-points-unit">积分</span></div>
    <div class="mem-bar-wrap"><div class="mem-bar" style="width:${pct}%"></div></div>
    <div class="mem-next">距${m.nextLevel}还需 ${(m.nextLevelPoints - m.points).toLocaleString()} 积分</div>
    <div class="mem-stats">
      <div class="mem-stat"><div class="mem-stat-val">${formatPrice(m.totalSpent)}</div><div class="mem-stat-lbl">累计消费</div></div>
      <div class="mem-stat"><div class="mem-stat-val">${m.daysSinceJoin}</div><div class="mem-stat-lbl">会员天数</div></div>
      <div class="mem-stat"><div class="mem-stat-val">${m.certificates}</div><div class="mem-stat-lbl">珍藏证书</div></div>
    </div>`;
	document.getElementById("mem-benefits").innerHTML = m.benefits
		.map(
			(b) => `
    <div class="mem-benefit ${b.active ? "" : "inactive"}">
      <div class="mem-benefit-icon">${b.icon}</div>
      <div class="mem-benefit-info">
        <div class="mem-benefit-name">${b.name}${b.active ? "" : ' <span class="mem-benefit-lock">待解锁</span>'}</div>
        <div class="mem-benefit-desc">${b.desc}</div>
      </div>
    </div>`,
		)
		.join("");
	document.getElementById("mem-badges").innerHTML = m.badges
		.map(
			(b) => `
    <div class="mem-badge-card ${b.earned ? "" : "locked"}">
      <div class="mem-badge-icon">${b.icon}</div>
      <div class="mem-badge-name">${b.name}</div>
      <div class="mem-badge-desc">${b.earned ? b.desc : "未解锁"}</div>
    </div>`,
		)
		.join("");
	document.getElementById("mem-history").innerHTML = m.history
		.map(
			(h) => `
    <div class="mem-hist-row">
      <div class="mem-hist-event">${h.event}</div>
      <div class="mem-hist-date">${h.date}</div>
      <div class="mem-hist-pts">${h.points}</div>
    </div>`,
		)
		.join("");
}

// ===== PAGE: DISCOVER =====
function renderDiscover() {
	const features = [
		{
			id: "luck",
			icon: "🔮",
			name: "每日幸运签",
			desc: "每天一颗宝石签文，发现今日专属幸运",
			color: "#6a3a9a",
		},
		{
			id: "calendar",
			icon: "📅",
			name: "保养日历",
			desc: "珠宝保养到期提醒，一键预约",
			color: "#3a6a5a",
		},
		{
			id: "tradein",
			icon: "🔄",
			name: "以旧焕新",
			desc: "旧珠宝估值，换购新品享补贴",
			color: "#5a6a3a",
		},
		{
			id: "referral",
			icon: "💝",
			name: "闺蜜同行礼",
			desc: "分享给好友，双方享专属礼遇",
			color: "#9a3a5a",
		},
		{
			id: "coupon",
			icon: "🎫",
			name: "到店权益",
			desc: "领取免费保养、宝石盲盒券",
			color: "#8b6914",
		},
		{
			id: "story",
			icon: "📖",
			name: "珠宝故事",
			desc: "每颗宝石的独特旅程",
			color: "#3a5a9a",
		},
		{
			id: "passport",
			icon: "🏆",
			name: "珍藏家证书",
			desc: "查看你的数字宝石护照",
			color: "#6a5a3a",
		},
		{
			id: "blindbox",
			icon: "🎁",
			name: "宝石盲盒",
			desc: "开启惊喜，发现限定款饰品",
			color: "#9a5a3a",
		},
	];
	document.getElementById("discover-grid").innerHTML = features
		.map(
			(f) => `
    <div class="disc-card" onclick="goTo('${f.id}')" style="--disc-color:${f.color}">
      <div class="disc-icon">${f.icon}</div>
      <div class="disc-name">${f.name}</div>
      <div class="disc-desc">${f.desc}</div>
    </div>`,
		)
		.join("");
}

// ===== PAGE: RECOMMEND =====
function renderRecommend(typeFilter = "all") {
	const productList = document.getElementById("product-list");
	const chips = document.querySelectorAll("#product-chips .chip");
	chips.forEach((c) =>
		c.classList.toggle("active", c.dataset.type === typeFilter),
	);
	let filtered = products;
	if (typeFilter !== "all")
		filtered = products.filter((p) => p.type === typeFilter);
	if (!filtered.length) {
		productList.innerHTML = '<div class="empty-msg">暂无该类型的珠宝</div>';
		return;
	}
	productList.innerHTML = filtered
		.map((p) => {
			const isFav = favorites.has(p.id);
			const isCmp = compareIds.has(p.id);
			return `<div class="product-card" onclick="showRecDetail('${p.id}')">
      <div class="product-thumb"><img class="product-thumb-img" src="${getImg(p)}" alt="${p.name}" loading="lazy"/></div>
      <div class="product-body">
        <div class="product-name-text">${p.name}</div>
        <div class="product-type-tag">${typeLabel(p.type)}</div>
        <div class="product-desc-text">${(p.description || "").slice(0, 40)}...</div>
        <div class="product-price-text">${formatPrice(p.priceCents)}</div>
        <div class="product-actions-row">
          <button class="btn btn-ghost btn-sm ${isFav ? "active" : ""}" onclick="event.stopPropagation();toggleFav('${p.id}')" type="button">${isFav ? "♥ 已收藏" : "♡ 收藏"}</button>
          <button class="btn btn-ghost btn-sm ${isCmp ? "active" : ""}" onclick="event.stopPropagation();toggleCmp('${p.id}')" type="button">${isCmp ? "✓ 对比中" : "⊕ 对比"}</button>
        </div>
      </div>
    </div>`;
		})
		.join("");
	// update compare table
	const cs = document.getElementById("compare-section");
	if (compareIds.size < 2) {
		cs.style.display = "none";
		return;
	}
	cs.style.display = "block";
	const cmp = products.filter((p) => compareIds.has(p.id));
	document.getElementById("compare-table").innerHTML =
		`<thead><tr><th>对比项</th>${cmp.map((p) => `<th>${p.name}</th>`).join("")}</tr></thead>
    <tbody><tr><th>价格</th>${cmp.map((p) => `<td>${formatPrice(p.priceCents)}</td>`).join("")}</tr>
    <tr><th>类型</th>${cmp.map((p) => `<td>${typeLabel(p.type)}</td>`).join("")}</tr>
    <tr><th>产地</th>${cmp.map((p) => `<td>${p.gemstone?.origin || "-"}</td>`).join("")}</tr>
    <tr><th>克拉数</th>${cmp.map((p) => `<td>${p.gemstone?.carat_weight || "-"}</td>`).join("")}</tr>
    <tr><th>颜色</th>${cmp.map((p) => `<td>${p.gemstone?.color_grade || "-"}</td>`).join("")}</tr></tbody>`;
}
function showRecDetail(id) {
	const p = products.find((x) => x.id === id);
	if (!p) return;
	selectedProductId = id;
	document.getElementById("modal-body").innerHTML = `
    <div class="modal-hero-img" style="background-image:url('${getImg(p)}')"></div>
    <div class="modal-product-name">${p.name}</div>
    <div class="modal-product-type">${typeLabel(p.type)}</div>
    <div class="modal-product-price">${formatPrice(p.priceCents)}</div>
    <div class="modal-product-desc">${p.description || ""}</div>
    ${p.tags?.length ? `<div class="modal-tags">${p.tags.map((t) => `<span class="modal-tag">${t}</span>`).join("")}</div>` : ""}
    <div class="modal-actions">
      <button class="btn btn-gold btn-lg btn-full" onclick="closeModal();selectedProductId='${p.id}';goTo('passport')" type="button">查看宝石护照</button>
    </div>`;
	document.getElementById("modal-overlay").classList.add("active");
}
function toggleFav(id) {
	if (favorites.has(id)) {
		favorites.delete(id);
		showToast("已取消收藏");
	} else {
		favorites.add(id);
		showToast("已添加到收藏 ♥");
	}
	renderRecommend(
		document.querySelector("#product-chips .chip.active")?.dataset.type ||
			"all",
	);
}
function toggleCmp(id) {
	if (compareIds.has(id)) {
		compareIds.delete(id);
		showToast("已取消对比");
	} else if (compareIds.size >= 3) {
		showToast("最多对比3件");
		return;
	} else {
		compareIds.add(id);
		showToast("已添加到对比");
	}
	renderRecommend(
		document.querySelector("#product-chips .chip.active")?.dataset.type ||
			"all",
	);
}

// ===== PAGE: BLIND BOX =====
function renderBlindBox() {
	const opened = sessionStorage.getItem("blindbox_opened");
	const box = document.getElementById("blindbox-area");
	if (opened) {
		const p = products[Math.floor(Math.random() * products.length)];
		box.innerHTML = `<div class="blindbox-result">
      <div class="blindbox-icon">🎉</div>
      <div class="blindbox-title">恭喜获得</div>
      <div class="blindbox-img"><img src="${getImg(p)}" alt="${p.name}" loading="lazy"/></div>
      <div class="blindbox-name">${p.name}</div>
      <div class="blindbox-desc">${p.description?.slice(0, 50) || ""}</div>
      <div class="blindbox-value">${formatPrice(p.priceCents)}</div>
      <button class="btn btn-gold btn-lg btn-full" onclick="selectedProductId='${p.id}';goTo('passport')" type="button" style="margin-top:20px">查看详情</button>
      <p class="tradein-note">* 盲盒体验仅供展示，不代表真实库存或购买</p>
    </div>`;
	} else {
		box.innerHTML = `<div class="blindbox-unopened" onclick="openBlindBox()">
      <div class="blindbox-box">🎁</div>
      <div class="blindbox-hint">点击开启<br/>发现限定款</div>
    </div>`;
	}
}
function openBlindBox() {
	sessionStorage.setItem("blindbox_opened", "1");
	renderBlindBox();
}

// ===== PAGE: LUCKY CHARM =====
function renderLuck() {
	luckyRevealed = false;
	const card = document.getElementById("luck-card-inner");
	card.innerHTML = `<div class="luck-front"><div class="luck-front-icon">🔮</div><div class="luck-front-text">点击翻开<br/>今日宝石签</div></div>`;
	card.classList.remove("flipped");
	document.getElementById("luck-result").innerHTML = "";
}
async function flipLuckCard() {
	if (luckyRevealed) return;
	luckyRevealed = true;
	let f;
	try {
		const sig = await api("/lucky-sign/reveal", { method: "POST" });
		f = sig.fortune;
		if (sig.streakDays > 1) showToast(`🔥 连续签到 ${sig.streakDays} 天`);
		// 签到可能触发等级升级，更新通知角标
		refreshNotificationBadge();
	} catch (e) {
		console.warn("lucky-sign API failed, using local fortune", e);
		f = FORTUNES[Math.floor(Math.random() * FORTUNES.length)];
	}
	const card = document.getElementById("luck-card-inner");
	card.innerHTML = `<div class="luck-front"><div class="luck-front-icon">🔮</div><div class="luck-front-text">已翻开</div></div>
    <div class="luck-back" style="background:linear-gradient(135deg, ${f.color} 0%, #0a0a14 100%)">
      <div class="luck-back-gem">${f.gem}</div>
      <div class="luck-back-sign">${f.sign}</div>
    </div>`;
	card.classList.add("flipped");
	setTimeout(() => {
		document.getElementById("luck-result").innerHTML = `
      <div class="luck-message"><div class="luck-msg-label">今日签文</div><div class="luck-msg-text">${f.message}</div></div>
      <div class="luck-extras">
        <div class="luck-extra"><span class="luck-extra-label">推荐佩戴</span><span>${f.recommend}</span></div>
        <div class="luck-extra"><span class="luck-extra-label">幸运色</span><span>${f.luckyColor}</span></div>
      </div>
      <div style="text-align:center;padding:20px"><button class="btn btn-gold" onclick="goTo('recommend')" type="button">去挑选幸运珠宝</button></div>`;
	}, 600);
}

// ===== PAGE: MAINTENANCE CALENDAR =====
let _calData = null;
async function renderCalendar() {
	if (!_calData) {
		try { _calData = await api("/care/reminders"); }
		catch (e) {
			console.warn("care/reminders API failed, using fallback", e);
			_calData = { reminders: MAINTENANCE_ITEMS.map((m) => ({ jewelryBoxItem: { displayName: m.name }, type: m.type, scheduledDate: m.date, notes: m.tips, status: m.urgent ? "overdue" : (m.daysLeft <= 7 ? "upcoming" : "scheduled") })) };
		}
	}
	const careLabelMap = { DEEP_CLEANING: "深度清洗", POLISHING: "表面抛光", GLOSS_CARE: "光泽护理", ANNUAL_CARE: "年度保养", ROUTINE_CLEANING: "常规清洗", CERTIFICATION: "鉴定证书" };
	const reminders = (_calData.reminders || []).map((r) => {
		const d = new Date(r.scheduledDate); const now = new Date();
		const daysLeft = Math.ceil((d - now) / 86400000);
		return { ...r, daysLeft, urgent: daysLeft <= 0 || r.status === "overdue" };
	});
	if (!reminders.length) {
		document.getElementById("cal-list").innerHTML = '<div class="empty-msg">暂无保养提醒</div>';
		return;
	}
	document.getElementById("cal-list").innerHTML = reminders.map((m) => {
		const itemName = m.jewelryBoxItem?.displayName || m.customerName || "珠宝";
		const typeLabel = careLabelMap[m.type] || m.type;
		return `
    <div class="cal-item ${m.urgent ? "cal-urgent" : ""}">
      <div class="cal-left">
        <div class="cal-days">${Math.abs(m.daysLeft)}</div>
        <div class="cal-days-lbl">${m.daysLeft <= 0 ? "已到期" : "天后"}</div>
      </div>
      <div class="cal-center">
        <div class="cal-name">${itemName}</div>
        <div class="cal-type">${typeLabel}</div>
        <div class="cal-date">${formatDate(m.scheduledDate)}</div>
        ${m.notes ? `<div class="cal-tips">${m.notes}</div>` : ""}
      </div>
      <div class="cal-right">${m.status === "completed" ? '<button class="btn btn-ghost btn-sm" disabled type="button">✓ 已完成</button>' : `<button class="btn btn-gold btn-sm" onclick="bookCare('${r.id || m.id}','${itemName}')" type="button">预约</button>`}</div>
    </div>`;
	}).join("");
}
async function bookCare(id, itemName) {
	try {
		await api(`/care/reminders/${id}/complete`, { method: "PATCH" });
		showToast(`✓ 已标记 ${itemName} 保养完成`);
		_calData = null; renderCalendar();
	} catch (e) {
		console.warn("complete API failed", e);
		showToast(`已预约 ${itemName} 保养 ✓`);
	}
}

// ===== PAGE: TRADE-IN (5 步细致评估向导) =====
let _tradeInRef = null; // reference 数据（类别/金属/宝石等下拉）
let _tradeInData = {};  // 用户填写的数据
let _tradeInStep = 1;   // 当前步骤 1-5

const TRADEIN_STEP_LABELS = ["基本信息", "贵金属", "宝石", "品相", "评估报告"];

async function renderTradeIn() {
	_tradeInData = {};
	_tradeInStep = 1;
	const box = document.getElementById("tradein-wizard");
	box.innerHTML = '<div class="tradein-loading">加载评估配置…</div>';

	if (!_tradeInRef) {
		try {
			const resp = await api("/trade-in/reference");
			_tradeInRef = resp?.data || resp;
		} catch (e) {
			console.warn("TradeIn reference failed, using built-in", e);
			_tradeInRef = fallbackTradeInRef();
		}
	}
	tradeInRenderStep();
}

function fallbackTradeInRef() {
	return {
		categories: [
			{ value: "RING", label: "戒指" },
			{ value: "NECKLACE", label: "项链" },
			{ value: "EARRING", label: "耳环" },
			{ value: "BRACELET", label: "手镯/手链" },
			{ value: "PENDANT", label: "吊坠" },
			{ value: "BROOCH", label: "胸针" },
			{ value: "WATCH", label: "手表" },
			{ value: "OTHER", label: "其他" },
		],
		metalTypes: [
			{ value: "GOLD_24K", label: "24K黄金 (足金)" },
			{ value: "GOLD_18K", label: "18K黄金 (Au750)" },
			{ value: "GOLD_14K", label: "14K黄金" },
			{ value: "PLATINUM_PT950", label: "铂金PT950" },
			{ value: "PLATINUM_PT900", label: "铂金PT900" },
			{ value: "SILVER_925", label: "银925" },
		],
		gemCategories: [
			{ value: "DIAMOND", label: "钻石" },
			{ value: "RUBY", label: "红宝石" },
			{ value: "SAPPHIRE", label: "蓝宝石" },
			{ value: "EMERALD", label: "祖母绿" },
			{ value: "JADE", label: "翡翠/玉石" },
			{ value: "PEARL", label: "珍珠" },
			{ value: "TOURMALINE", label: "碧玺" },
		],
		clarityGrades: [
			{ value: "FL", label: "FL (无瑕)" },
			{ value: "IF", label: "IF (内无瑕)" },
			{ value: "VVS1", label: "VVS1" },
			{ value: "VVS2", label: "VVS2" },
			{ value: "VS1", label: "VS1" },
			{ value: "VS2", label: "VS2" },
			{ value: "SI1", label: "SI1" },
			{ value: "SI2", label: "SI2" },
		],
		colorGrades: [
			{ value: "D", label: "D (无色)" },
			{ value: "E", label: "E (无色)" },
			{ value: "F", label: "F (无色)" },
			{ value: "G", label: "G (近无色)" },
			{ value: "H", label: "H (近无色)" },
			{ value: "I", label: "I (近无色)" },
			{ value: "J", label: "J (微黄)" },
		],
		cutGrades: [
			{ value: "EXCELLENT", label: "极好 (Excellent)" },
			{ value: "VERY_GOOD", label: "很好 (Very Good)" },
			{ value: "GOOD", label: "好 (Good)" },
			{ value: "FAIR", label: "一般 (Fair)" },
		],
		conditionGrades: [
			{ value: "MINT", label: "全新未使用" },
			{ value: "EXCELLENT", label: "极好" },
			{ value: "GOOD", label: "良好" },
			{ value: "FAIR", label: "一般" },
			{ value: "POOR", label: "较差" },
		],
	};
}

function tradeInRenderStep() {
	const box = document.getElementById("tradein-wizard");
	const steps = TRADEIN_STEP_LABELS;
	const total = steps.length;
	const cur = _tradeInStep;
	const progressPct = Math.round((cur / total) * 100);

	const progressHtml = `
		<div class="tradein-progress">
			<div class="tradein-progress-bar" style="width:${progressPct}%"></div>
			<div class="tradein-progress-text">步骤 ${cur}/${total} · ${steps[cur - 1]}</div>
			<div class="tradein-progress-steps">${steps
				.map((s, i) => `<span class="tradein-progress-dot ${i + 1 < cur ? "done" : ""} ${i + 1 === cur ? "active" : ""}">${i + 1}</span>`)
				.join("")}</div>
		</div>`;

	let bodyHtml = "";
	if (cur === 1) bodyHtml = tradeInStep1Html();
	else if (cur === 2) bodyHtml = tradeInStep2Html();
	else if (cur === 3) bodyHtml = tradeInStep3Html();
	else if (cur === 4) bodyHtml = tradeInStep4Html();
	else if (cur === 5) bodyHtml = '<div class="tradein-loading">正在生成评估报告…</div>';

	box.innerHTML = progressHtml + `<div class="tradein-step-body">${bodyHtml}</div>`
		+ (cur === 5 ? "" : tradeInNavHtml());

	// 第5步自动触发评估
	if (cur === 5) submitTradeInAssessment();
}

function tradeInNavHtml() {
	const cur = _tradeInStep;
	return `<div class="tradein-nav">
		${cur > 1 ? '<button class="btn btn-ghost" onclick="tradeInBack()" type="button">← 上一步</button>' : '<span></span>'}
		${cur < 4 ? '<button class="btn btn-gold" onclick="tradeInNext()" type="button">下一步 →</button>' : '<button class="btn btn-gold btn-lg" onclick="tradeInNext()" type="button">✨ 生成估价报告</button>'}
	</div>`;
}

function tradeInStep1Html() {
	const cats = _tradeInRef.categories || [];
	const d = _tradeInData;
	const catOptions = cats.map((c) => `<option value="${c.value}" ${d.category === c.value ? "selected" : ""}>${c.label}</option>`).join("");
	return `
		<div class="tradein-step-title">📦 基本信息</div>
		<div class="tradein-field"><label class="tradein-label">物品名称 *</label>
			<input type="text" class="tradein-input" id="ti-itemName" placeholder="例：18K黄金钻石戒指" value="${escapeHtml(d.itemName || "")}"></div>
		<div class="tradein-field"><label class="tradein-label">类别 *</label>
			<select class="tradein-select" id="ti-category"><option value="">- 请选择 -</option>${catOptions}</select></div>
		<div class="tradein-field"><label class="tradein-label">品牌（选填）</label>
			<input type="text" class="tradein-input" id="ti-brandName" placeholder="Cartier / Tiffany / 周大福…" value="${escapeHtml(d.brandName || "")}"></div>
		<div class="tradein-field"><label class="tradein-label">购买年份（选填）</label>
			<input type="number" class="tradein-input" id="ti-purchaseYear" placeholder="2022" min="1950" max="2026" value="${d.purchaseYear || ""}"></div>
		<div class="tradein-field"><label class="tradein-label">原购价（元，选填）</label>
			<input type="number" class="tradein-input" id="ti-purchasePrice" placeholder="原价金额" min="0" value="${d.purchasePrice ? d.purchasePrice / 100 : ""}"></div>`;
}

function tradeInStep2Html() {
	const metals = _tradeInRef.metalTypes || [];
	const d = _tradeInData;
	const metalOptions = metals.map((m) => `<option value="${m.value}" ${d.metalType === m.value ? "selected" : ""}>${m.label}</option>`).join("");
	return `
		<div class="tradein-step-title">🏅 贵金属信息</div>
		<div class="tradein-field"><label class="tradein-label">金属材质</label>
			<select class="tradein-select" id="ti-metalType"><option value="">- 选填 -</option>${metalOptions}</select></div>
		<div class="tradein-field"><label class="tradein-label">金属克重 (g)</label>
			<input type="number" class="tradein-input" id="ti-metalWeightGrams" placeholder="例：5.0" step="0.01" min="0" value="${d.metalWeightGrams || ""}"></div>
		<div class="tradein-field"><label class="tradein-label">成色百分比 (0-100%)</label>
			<input type="number" class="tradein-input" id="ti-metalPurity" placeholder="75 → 75%" step="1" min="0" max="100" value="${d.metalPurity !== undefined && d.metalPurity !== null ? Math.round(d.metalPurity * 100) : ""}"></div>
		<div class="tradein-hint">💡 18K金=75%，14K金=58.5%，925银=92.5%</div>`;
}

function tradeInStep3Html() {
	const gems = _tradeInRef.gemCategories || [];
	const clarities = _tradeInRef.clarityGrades || [];
	const colors = _tradeInRef.colorGrades || [];
	const cuts = _tradeInRef.cutGrades || [];
	const d = _tradeInData;
	const gemOptions = gems.map((g) => `<option value="${g.value}" ${d.gemCategory === g.value ? "selected" : ""}>${g.label}</option>`).join("");
	const clarityOptions = clarities.map((c) => `<option value="${c.value}" ${d.gemClarity === c.value ? "selected" : ""}>${c.label}</option>`).join("");
	const colorOptions = colors.map((c) => `<option value="${c.value}" ${d.gemColor === c.value ? "selected" : ""}>${c.label}</option>`).join("");
	const cutOptions = cuts.map((c) => `<option value="${c.value}" ${d.gemCut === c.value ? "selected" : ""}>${c.label}</option>`).join("");
	return `
		<div class="tradein-step-title">💎 宝石信息（无宝石可跳过）</div>
		<div class="tradein-field"><label class="tradein-label">宝石类型</label>
			<select class="tradein-select" id="ti-gemCategory"><option value="">- 无宝石/选填 -</option>${gemOptions}</select></div>
		<div class="tradein-field"><label class="tradein-label">克拉数 (ct)</label>
			<input type="number" class="tradein-input" id="ti-gemCarat" placeholder="例：1.00" step="0.01" min="0" value="${d.gemCarat || ""}"></div>
		<div class="tradein-row2">
			<div class="tradein-field"><label class="tradein-label">颜色等级</label>
				<select class="tradein-select" id="ti-gemColor"><option value="">- 选填 -</option>${colorOptions}</select></div>
			<div class="tradein-field"><label class="tradein-label">净度等级</label>
				<select class="tradein-select" id="ti-gemClarity"><option value="">- 选填 -</option>${clarityOptions}</select></div>
		</div>
		<div class="tradein-field"><label class="tradein-label">切工</label>
			<select class="tradein-select" id="ti-gemCut"><option value="">- 选填 -</option>${cutOptions}</select></div>
		<div class="tradein-field"><label class="tradein-label">证书号（选填）</label>
			<input type="text" class="tradein-input" id="ti-gemCertificate" placeholder="GIA: 6357892104" value="${escapeHtml(d.gemCertificate || "")}"></div>`;
}

function tradeInStep4Html() {
	const conditions = _tradeInRef.conditionGrades || [];
	const d = _tradeInData;
	const condOptions = conditions.map((c) => `<option value="${c.value}" ${d.conditionGrade === c.value ? "selected" : ""}>${c.label}</option>`).join("");
	return `
		<div class="tradein-step-title">🔍 品相与凭证</div>
		<div class="tradein-field"><label class="tradein-label">品相等级 *</label>
			<select class="tradein-select" id="ti-conditionGrade"><option value="">- 请选择 -</option>${condOptions}</select></div>
		<div class="tradein-field"><label class="tradein-label">品相说明（选填）</label>
			<textarea class="tradein-input tradein-textarea" id="ti-conditionNotes" placeholder="磨损、划痕、变色等具体描述…">${escapeHtml(d.conditionNotes || "")}</textarea></div>
		<div class="tradein-checks">
			<label class="tradein-check"><input type="checkbox" id="ti-hasReceipt" ${d.hasReceipt ? "checked" : ""}> 有购货凭证</label>
			<label class="tradein-check"><input type="checkbox" id="ti-hasCertificate" ${d.hasCertificate ? "checked" : ""}> 有鉴定证书</label>
			<label class="tradein-check"><input type="checkbox" id="ti-hasBox" ${d.hasBox ? "checked" : ""}> 有原装盒</label>
		</div>
		<div class="tradein-hint">📎 凭证完整可获 5% 信任加成</div>`;
}

function tradeInSaveCurrent() {
	const cur = _tradeInStep;
	const v = (id) => {
		const el = document.getElementById(id);
		return el ? el.value : "";
	};
	const c = (id) => {
		const el = document.getElementById(id);
		return el ? el.checked : false;
	};
	if (cur === 1) {
		_tradeInData.itemName = v("ti-itemName").trim();
		_tradeInData.category = v("ti-category");
		_tradeInData.brandName = v("ti-brandName").trim() || undefined;
		const y = Number.parseInt(v("ti-purchaseYear"), 10);
		_tradeInData.purchaseYear = Number.isFinite(y) && y > 0 ? y : undefined;
		const pp = Number.parseFloat(v("ti-purchasePrice"));
		_tradeInData.purchasePrice = Number.isFinite(pp) && pp > 0 ? Math.round(pp * 100) : undefined;
	} else if (cur === 2) {
		_tradeInData.metalType = v("ti-metalType") || undefined;
		const wg = Number.parseFloat(v("ti-metalWeightGrams"));
		_tradeInData.metalWeightGrams = Number.isFinite(wg) && wg > 0 ? wg : undefined;
		const pu = Number.parseFloat(v("ti-metalPurity"));
		_tradeInData.metalPurity = Number.isFinite(pu) && pu >= 0 && pu <= 100 ? pu / 100 : undefined;
	} else if (cur === 3) {
		_tradeInData.gemCategory = v("ti-gemCategory") || undefined;
		const ct = Number.parseFloat(v("ti-gemCarat"));
		_tradeInData.gemCarat = Number.isFinite(ct) && ct > 0 ? ct : undefined;
		_tradeInData.gemColor = v("ti-gemColor") || undefined;
		_tradeInData.gemClarity = v("ti-gemClarity") || undefined;
		_tradeInData.gemCut = v("ti-gemCut") || undefined;
		_tradeInData.gemCertificate = v("ti-gemCertificate").trim() || undefined;
	} else if (cur === 4) {
		_tradeInData.conditionGrade = v("ti-conditionGrade");
		_tradeInData.conditionNotes = v("ti-conditionNotes").trim() || undefined;
		_tradeInData.hasReceipt = c("ti-hasReceipt");
		_tradeInData.hasCertificate = c("ti-hasCertificate");
		_tradeInData.hasBox = c("ti-hasBox");
	}
}

function tradeInValidate() {
	const d = _tradeInData;
	if (_tradeInStep === 1) {
		if (!d.itemName) return "请输入物品名称";
		if (!d.category) return "请选择珠宝类别";
	} else if (_tradeInStep === 4) {
		if (!d.conditionGrade) return "请选择品相等级";
	}
	return null;
}

function tradeInNext() {
	tradeInSaveCurrent();
	const err = tradeInValidate();
	if (err) {
		showToast("⚠️ " + err);
		return;
	}
	_tradeInStep++;
	tradeInRenderStep();
}

function tradeInBack() {
	tradeInSaveCurrent();
	_tradeInStep--;
	tradeInRenderStep();
}

function tradeInResultHtml(result) {
	const reasons = (() => {
		try {
			const arr = typeof result.reasoning === "string" ? JSON.parse(result.reasoning) : result.reasoning || [];
			return Array.isArray(arr) ? arr : [];
		} catch {
			return [];
		}
	})();
	const catLabel = (_tradeInRef.categories || []).find((c) => c.value === result.category)?.label || result.category;
	return `
		<div class="tradein-result-card">
			<div class="tradein-result-icon">📊</div>
			<div class="tradein-result-title">${escapeHtml(result.itemName)}</div>
			<div class="tradein-result-meta">${catLabel} · ${(_tradeInRef.conditionGrades || []).find((c) => c.value === result.conditionGrade)?.label || result.conditionGrade}</div>
			<div class="tradein-result-value">${formatPrice(result.finalEstimate)}</div>
			<div class="tradein-result-desc">最终估价（参考价）</div>
			<div class="tradein-split">
				<div class="tradein-split-item"><span>贵金属价值</span><span>${formatPrice(result.metalValue)}</span></div>
				<div class="tradein-split-item"><span>宝石价值</span><span>${formatPrice(result.gemValue)}</span></div>
				<div class="tradein-split-item"><span>品相折扣</span><span style="color:var(--text-dim)">-${formatPrice(Math.abs(result.conditionDiscount))}</span></div>
				<div class="tradein-split-item"><span>年限折旧</span><span style="color:var(--text-dim)">-${formatPrice(Math.abs(result.ageDiscount))}</span></div>
				<div class="tradein-split-item"><span>换新补贴 (10%)</span><span class="tradein-subsidy">+${formatPrice(result.subsidyAmount)}</span></div>
				<div class="tradein-split-item tradein-total"><span>总抵扣额</span><span>${formatPrice(result.totalCredit)}</span></div>
			</div>
			${reasons.length ? `
			<details class="tradein-reasoning">
				<summary>📝 完整评估报告（${reasons.length}条）</summary>
				<ol class="tradein-reasoning-list">${reasons.map((r) => `<li>${escapeHtml(String(r))}</li>`).join("")}</ol>
			</details>` : ""}
			<div class="tradein-result-actions">
				<button class="btn btn-gold btn-lg btn-full" onclick="goTo('recommend');showToast('已为您筛选可换购的珠宝')" type="button">去挑选新品</button>
				<button class="btn btn-ghost btn-full" onclick="tradeInRestart()" type="button" style="margin-top:10px">重新评估</button>
			</div>
			<p class="tradein-note">* 以上为系统细致评估参考价，实际价值需到店由专业鉴定师核实</p>
		</div>`;
}

async function submitTradeInAssessment() {
	const box = document.getElementById("tradein-wizard");
	try {
		const resp = await api("/trade-in/assess", {
			method: "POST",
			body: JSON.stringify(_tradeInData),
		});
		const result = resp?.data;
		if (!result) throw new Error("无评估结果");
		// 替换进度条 + body
		box.innerHTML = `
			<div class="tradein-progress">
				<div class="tradein-progress-bar" style="width:100%"></div>
				<div class="tradein-progress-text">评估完成 ✓</div>
				<div class="tradein-progress-steps">${TRADEIN_STEP_LABELS
					.map(() => '<span class="tradein-progress-dot done">✓</span>')
					.join("")}</div>
			</div>
			<div class="tradein-step-body">${tradeInResultHtml(result)}</div>`;
	} catch (e) {
		console.error("Assess failed:", e);
		box.innerHTML = `
			<div class="tradein-error">
				<div class="tradein-error-icon">⚠️</div>
				<div class="tradein-error-msg">评估失败：${escapeHtml(e.message || "请稍后重试")}</div>
				<button class="btn btn-gold" onclick="tradeInRetry()" type="button">重试</button>
				<button class="btn btn-ghost" onclick="tradeInRestart()" type="button" style="margin-top:10px">重新开始</button>
			</div>`;
	}
}

function tradeInRetry() {
	_tradeInStep = 5;
	tradeInRenderStep();
}
function tradeInRestart() {
	_tradeInData = {};
	_tradeInStep = 1;
	tradeInRenderStep();
}

function escapeHtml(s) {
	return String(s ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}
function evaluateTradeIn() {
	const type = document.getElementById("tradein-type").value;
	const condition = document.getElementById("tradein-condition").value;
	const age = document.getElementById("tradein-age").value;
	const baseValue =
		{
			NECKLACE: 32000,
			RING: 58000,
			EARRING: 18000,
			BRACELET: 25000,
			GEMSTONE: 45000,
		}[type] || 20000;
	const condFactor =
		{ excellent: 0.85, good: 0.65, fair: 0.45 }[condition] || 0.5;
	const ageFactor = { "1y": 0.9, "3y": 0.75, "5y_plus": 0.6 }[age] || 0.7;
	const estimated = Math.round(baseValue * condFactor * ageFactor);
	const subsidy = Math.round(estimated * 0.1);
	document.getElementById("tradein-form").style.display = "none";
	document.getElementById("tradein-result").innerHTML = `
    <div class="tradein-result-card">
      <div class="tradein-result-icon">🔄</div>
      <div class="tradein-result-title">估价完成</div>
      <div class="tradein-result-value">${formatPrice(estimated)}</div>
      <div class="tradein-result-desc">预估回收价值（参考价）</div>
      <div class="tradein-split">
        <div class="tradein-split-item"><span>焕新补贴</span><span class="tradein-subsidy">+${formatPrice(subsidy)}</span></div>
        <div class="tradein-split-item"><span>换购总价值</span><span>${formatPrice(estimated + subsidy)}</span></div>
      </div>
      <button class="btn btn-gold btn-lg btn-full" onclick="goTo('recommend');showToast('已为您筛选可换购的珠宝')" type="button" style="margin-top:24px">去挑选新品</button>
      <p class="tradein-note">* 以上为参考估价，实际价值需到店由专业鉴定师评估</p>
    </div>`;
}

// ===== PAGE: REFERRAL =====
async function renderReferral() {
	const box = document.getElementById("ref-content");
	box.innerHTML = '<div class="ref-loading">加载中…</div>';

	let card;
	try {
		card = await api("/referral/my");
		if (!card || card.error) throw new Error(card?.error || "Invalid response");
	} catch (e) {
		console.warn("Referral API failed, using fallback", e);
		card = REFERRAL_DATA;
		card.benefits = card.benefits.map((b) => ({ ...b, label: b.text || b.label, key: b.key || b.text }));
	}

	const benefits = (card.benefits || []).map((b) => ({
		icon: b.icon || "🎁",
		label: b.label || b.text || "",
	}));

	box.innerHTML = `
    <div class="ref-card">
      <div class="ref-card-header">
        <div class="ref-card-title">${card.cardName}</div>
        <div class="ref-card-valid">有效期至 ${formatDate(card.validUntil)}</div>
      </div>
      <div class="ref-benefits">${benefits.map((b) => `<div class="ref-benefit"><span class="ref-benefit-icon">${b.icon}</span><span>${b.label}</span></div>`).join("")}</div>
      <div class="ref-code-area">
        <div class="ref-code-label">您的专属邀请码</div>
        <div class="ref-code">${card.shareCode}</div>
      </div>
      <div class="ref-stats-row">
        <div class="ref-stat"><div class="ref-stat-val">${card.shareCount || 0}</div><div class="ref-stat-lbl">已分享</div></div>
        <div class="ref-stat"><div class="ref-stat-val">${card.redeemCount || 0}</div><div class="ref-stat-lbl">好友核销</div></div>
        <div class="ref-stat"><div class="ref-stat-val">${(card.redeemCount || 0) * 100}</div><div class="ref-stat-lbl">获得积分</div></div>
      </div>
      <button class="btn btn-gold btn-lg btn-full" onclick="shareReferral('${card.id}', '${card.shareCode}')" type="button">分享给好友</button>
      <div class="ref-share-options">
        <button class="ref-share-btn" onclick="copyShareLink('${card.shareCode}')" type="button">📋 复制链接</button>
        <button class="ref-share-btn" onclick="showToast('已生成邀请海报 ✓')" type="button">🖼️ 生成海报</button>
      </div>
    </div>`;
}

async function shareReferral(cardId, shareCode) {
	try {
		const result = await api("/referral/share", {
			method: "POST",
			body: JSON.stringify({ cardId }),
		});
		if (result.shareUrl) {
			if (navigator.clipboard) {
				await navigator.clipboard.writeText(result.shareUrl);
			}
			showToast("✓ 邀请链接已复制！分享给好友即可参与");
		} else {
			showToast("邀请函已生成 ✓");
		}
		renderReferral();
	} catch (e) {
		showToast("分享失败: " + (e.message || "未知错误"));
	}
}

function copyShareLink(shareCode) {
	const url = `${window.location.origin}/?ref=${shareCode}`;
	if (navigator.clipboard) {
		navigator.clipboard.writeText(url).then(() => {
			showToast("✓ 链接已复制到剪贴板");
		});
	} else {
		const inp = document.createElement("input");
		inp.value = url;
		document.body.appendChild(inp);
		inp.select();
		document.execCommand("copy");
		document.body.removeChild(inp);
		showToast("✓ 链接已复制到剪贴板");
	}
}

async function showReferralLanding(shareCode) {
	goTo("home");
	let card = null;
	try {
		card = await api(`/referral/card/${shareCode}`);
	} catch (e) {
		showToast("邀请链接已失效");
		return;
	}
	const benefits = (card.benefits || []).map((b) => ({ icon: b.icon || "🎁", label: b.label || "" }));
	const modal = document.getElementById("modal-body");
	modal.innerHTML = `
    <div class="ref-landing">
      <div class="ref-landing-badge">💌 好友邀请</div>
      <div class="ref-landing-title">${card.cardName}</div>
      <div class="ref-landing-from">来自 <strong>${card.sharedByName || "好友"}</strong> 的邀请</div>
      <div class="ref-benefits" style="margin:20px 0;">
        ${benefits.map((b) => `<div class="ref-benefit"><span class="ref-benefit-icon">${b.icon}</span><span>${b.label}</span></div>`).join("")}
      </div>
      <div class="ref-landing-valid" style="font-size:11px;color:var(--text-muted);margin-bottom:16px;">有效期至 ${formatDate(card.validUntil)}</div>
      <input class="ref-landing-name" id="ref-visitor-name" placeholder="您的姓名（选填）" type="text" />
      <input class="ref-landing-phone" id="ref-visitor-phone" placeholder="手机号（选填，用于领奖）" type="tel" />
      <button class="btn btn-gold btn-lg btn-full" onclick="redeemReferral('${shareCode}')" type="button" style="margin-top:12px;">立即领取</button>
      <button class="btn btn-ghost btn-sm" onclick="closeModal(); renderHome();" type="button" style="margin-top:10px;width:100%;">先逛逛</button>
    </div>`;
	document.getElementById("modal-overlay").classList.add("active");
}

async function redeemReferral(shareCode) {
	const name = document.getElementById("ref-visitor-name")?.value || "";
	const phone = document.getElementById("ref-visitor-phone")?.value || "";
	try {
		const result = await api(`/referral/redeem/${shareCode}`, {
			method: "POST",
			body: JSON.stringify({ visitorName: name, visitorPhone: phone }),
		});
		if (result.success) {
			showToast("🎉 " + result.message);
			closeModal();
			renderHome();
		}
	} catch (e) {
		showToast("核销失败: " + (e.message || "请重试"));
	}
}

// ===== PAGE: JEWELRY STORY =====
function renderStory() {
	const stories = products.slice(0, 4).map((p, i) => ({
		...p,
		chapter: [
			"第一章：矿区深处",
			"第二章：工匠之手",
			"第三章：鉴定之旅",
			"第四章：与你相遇",
		][i],
	}));
	document.getElementById("story-list").innerHTML = stories
		.map(
			(s) => `
    <div class="story-card" onclick="showStoryDetail('${s.id}')">
      <div class="story-card-img"><img src="${getImg(s)}" alt="" loading="lazy"/></div>
      <div class="story-card-body">
        <div class="story-chapter">${s.chapter}</div>
        <div class="story-name">${s.name}</div>
        <div class="story-origin">${s.gemstone?.origin || ""}</div>
      </div>
    </div>`,
		)
		.join("");
}
function showStoryDetail(id) {
	const p = products.find((x) => x.id === id);
	if (!p) return;
	document.getElementById("modal-body").innerHTML = `
    <div class="modal-hero-img" style="background-image:url('${getImg(p)}')"></div>
    <div class="modal-product-name">${p.name}</div>
    <div class="story-detail-chapter">— 宝石旅程 —</div>
    <div class="modal-product-desc">${p.gemstone?.storySummary || p.description}</div>
    <div class="spec-row"><span class="spec-label">产地</span><span class="spec-value">${p.gemstone?.origin || "-"}</span></div>
    <div class="spec-row"><span class="spec-label">类型</span><span class="spec-value">${p.gemstone?.gemstone_type || "-"}</span></div>
    <div class="spec-row"><span class="spec-label">证书</span><span class="spec-value">${p.gemstone?.certificate_no || "-"}</span></div>`;
	document.getElementById("modal-overlay").classList.add("active");
}

// ===== PAGE: PASSPORT =====
function renderPassport() {
	const p = selectedProductId
		? products.find((x) => x.id === selectedProductId)
		: products[0];
	if (!p) return;
	const g = p.gemstone || {};
	document.getElementById("passport-gem-name").textContent = g.name || p.name;
	document.getElementById("passport-story").textContent =
		g.storySummary || p.description || "";
	document.getElementById("passport-specs").innerHTML = [
		{ l: "证书编号", v: g.certificate_no || "待认证" },
		{ l: "宝石类型", v: g.gemstone_type || p.type },
		{ l: "产地", v: g.origin || "未知" },
		{ l: "克拉数", v: g.carat_weight ? `${g.carat_weight} ct` : "-" },
		{ l: "净度", v: g.clarity || "-" },
		{ l: "颜色等级", v: g.color_grade || "-" },
		{ l: "切工", v: g.cut_grade || "-" },
		{ l: "价格", v: formatPrice(p.priceCents) },
	]
		.map(
			(s) =>
				`<div class="spec-row"><span class="spec-label">${s.l}</span><span class="spec-value">${s.v}</span></div>`,
		)
		.join("");
	const oc = document.getElementById("origin-card");
	if (p.image) {
		oc.style.backgroundImage = `linear-gradient(180deg,rgba(20,20,42,0.5) 0%,rgba(20,20,42,0.95) 75%),url('${p.image}')`;
		oc.style.backgroundSize = "cover";
		oc.style.backgroundPosition = "center";
	}
	oc.innerHTML = `<div class="origin-name">${g.name || p.name}</div><div class="origin-detail">${g.storySummary || ""}</div><div class="origin-detail">产地：${g.origin || "未知"} · 类型：${g.gemstone_type || p.type}</div>`;
}

// ===== PAGE: COUPON =====
function renderCoupon() {
	const u = document.getElementById("coupon-unclaimed"),
		c = document.getElementById("coupon-claimed");
	const ap = document.getElementById("appointment-section"),
		cs = document.getElementById("consult-section");
	if (couponClaimed && claimedCoupon) {
		u.style.display = "none";
		c.style.display = "block";
		ap.style.display = "block";
		cs.style.display = "block";
		const t =
			couponTemplates.find((x) => x.id === claimedCoupon.templateId) ||
			couponTemplates[0];
		document.getElementById("ticket-name").textContent = t?.name || "";
		document.getElementById("ticket-type").textContent = t?.type || "";
		document.getElementById("ticket-code").textContent =
			claimedCoupon.code || claimedCoupon.id.slice(0, 8).toUpperCase();
		document.getElementById("ticket-expires").textContent =
			claimedCoupon.expiresAt ? formatDate(claimedCoupon.expiresAt) : "-";
		renderSlotCards();
		renderConsultOptions();
	} else {
		u.style.display = "block";
		c.style.display = "none";
		ap.style.display = "none";
		cs.style.display = "none";
		document.getElementById("coupon-templates-desc").textContent =
			couponTemplates.length > 0
				? `为您准备了${couponTemplates.length}种专属权益：${couponTemplates.map((t) => t.name).join("、")}`
				: "暂无可用优惠券";
	}
}
function renderSlotCards() {
	document.getElementById("slot-cards").innerHTML = [
		{ l: "今天", t: "18:30" },
		{ l: "明天", t: "14:00" },
		{ l: "周末", t: "下午" },
	]
		.map(
			(s) =>
				`<div class="slot-card ${selectedSlot === s.t ? "selected" : ""}" onclick="selectSlot('${s.l} ${s.t}')"><div class="slot-day">${s.l}</div><div class="slot-time">${s.t}</div></div>`,
		)
		.join("");
}
function renderConsultOptions() {
	document.getElementById("consult-options").innerHTML = [
		{ i: "💰", t: "想了解价格详情" },
		{ i: "✨", t: "想看实物火彩效果" },
		{ i: "🔄", t: "想比较同系列款式" },
		{ i: "📝", t: "想了解保养知识" },
	]
		.map(
			(o) =>
				`<div class="consult-option ${selectedConsult === o.t ? "selected" : ""}" onclick="selectConsult('${o.t}')"><div class="consult-option-icon">${o.i}</div><div class="consult-option-text">${o.t}</div></div>`,
		)
		.join("");
}
function selectSlot(s) {
	selectedSlot = s;
	renderSlotCards();
	const f = document.getElementById("slot-feedback");
	f.classList.add("show");
	f.textContent = `已记录预约：${s}到店`;
	showToast("预约已记录");
}
function selectConsult(o) {
	selectedConsult = o;
	renderConsultOptions();
	const f = document.getElementById("consult-feedback");
	f.classList.add("show");
	f.textContent = `已记录意向：${o}`;
	showToast("意向已记录");
}
async function claimCoupon() {
	if (!couponTemplates.length) return showToast("暂无可用优惠券");
	const t = couponTemplates[0];
	let result;
	try {
		result = await api(`/try-on/sessions/demo/coupons`, {
			method: "POST",
			body: JSON.stringify({ templateId: t.id, storeId }),
		});
	} catch {
		result = {
			id: `coupon-${Date.now()}`,
			templateId: t.id,
			status: "ISSUED",
			code: `FRC-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
			expiresAt: new Date(Date.now() + t.validityDays * 86400000).toISOString(),
		};
	}
	couponClaimed = true;
	claimedCoupon = result;
	showToast("🎉 权益领取成功！");
	renderCoupon();
	// 领券可能触发等级升级
	refreshNotificationBadge();
}

// ===== PAGE: PROFILE =====
async function renderProfile() {
	const nameEl = document.getElementById("profile-name");
	const idEl = document.getElementById("profile-id");
	const statsEl = document.getElementById("profile-stats");
	// 默认值（API 失败时）
	nameEl.textContent = "尊贵客人";
	idEl.textContent = `ID: ${(tryOnSession?.id || "guest").slice(0, 12).toUpperCase()}`;
	statsEl.innerHTML = `
    <div class="profile-stat"><div class="profile-stat-value">${tryOnSession?.items?.length || products.length}</div><div class="profile-stat-label">试戴</div></div>
    <div class="profile-stat"><div class="profile-stat-value">${favorites.size}</div><div class="profile-stat-label">收藏</div></div>
    <div class="profile-stat"><div class="profile-stat-value">${couponClaimed ? 1 : 0}</div><div class="profile-stat-label">到店券</div></div>`;

	// 尝试拉真实数据
	let me;
	try {
		me = await api("/member/my");
	} catch (e) {
		console.warn("Profile API failed, using fallback", e);
		return;
	}
	if (!me || !me.ok) {
		// 接口返回 NO_MEMBER 时，给个引导入口
		nameEl.textContent = "尊贵客人";
		idEl.textContent = "尚未绑定会员档案";
		return;
	}

	// 真实姓名（没有时保留「尊贵客人」）
	nameEl.textContent = me.name || "尊贵客人";
	idEl.innerHTML = me.phone
		? `手机号：${escapeHtml(me.phone)}`
		: `ID: ${me.customerId.slice(0, 12).toUpperCase()}`;

	// 等级徽章 + 编辑按钮
	const header = nameEl.parentElement;
	let badge = header.querySelector(".profile-level-badge");
	if (!badge) {
		badge = document.createElement("div");
		badge.className = "profile-level-badge";
		header.appendChild(badge);
	}
	badge.innerHTML = `<span class="plb-icon">${me.levelIcon || "🌱"}</span><span class="plb-name">${escapeHtml(me.levelName || "新会员")}</span>`;
	badge.style.borderColor = me.levelColor || "#C9A24E";
	badge.style.color = me.levelColor || "#C9A24E";

	// 编辑按钮
	let editBtn = header.querySelector(".profile-edit-btn");
	if (!editBtn) {
		editBtn = document.createElement("button");
		editBtn.className = "profile-edit-btn";
		editBtn.type = "button";
		editBtn.innerHTML = "✏️ 改名";
		editBtn.addEventListener("click", editProfileName);
		header.appendChild(editBtn);
	}

	// 统计
	statsEl.innerHTML = `
    <div class="profile-stat"><div class="profile-stat-value">${me.totalTryOns || 0}</div><div class="profile-stat-label">试戴</div></div>
    <div class="profile-stat"><div class="profile-stat-value">${me.jewelryBoxCount || 0}</div><div class="profile-stat-label">珍藏</div></div>
    <div class="profile-stat"><div class="profile-stat-value">${me.transactionCount || 0}</div><div class="profile-stat-label">积分记录</div></div>`;
}

async function editProfileName() {
	let me = null;
	try {
		me = await api("/member/my");
	} catch {
		showToast("无法加载资料");
		return;
	}
	if (!me || !me.ok) {
		showToast("尚未绑定会员档案");
		return;
	}
	const current = me.name || "";
	const overlay = document.getElementById("modal-overlay");
	const sheet = document.getElementById("product-modal");
	const body = document.getElementById("modal-body");
	body.innerHTML = `
    <div class="edit-name-wrap">
      <h3 class="edit-name-title">修改姓名</h3>
      <p class="edit-name-sub">用于在「我的」页和会员中心展示</p>
      <input
        id="edit-name-input"
        class="edit-name-input"
        type="text"
        maxlength="20"
        placeholder="请输入您的姓名"
        value="${escapeHtml(current)}"
        autofocus
      />
      <div class="edit-name-hint">1-20 个字，支持中英文 / 数字 / 空格</div>
      <div class="edit-name-actions">
        <button class="btn btn-ghost btn-lg" id="edit-name-cancel-btn" type="button">取消</button>
        <button class="btn btn-gold btn-lg" id="edit-name-save-btn" type="button">保存</button>
      </div>
    </div>
  `;
	overlay.classList.add("active");

	const input = document.getElementById("edit-name-input");
	const cancel = document.getElementById("edit-name-cancel-btn");
	const save = document.getElementById("edit-name-save-btn");
	const closeSheet = () => overlay.classList.remove("active");
	cancel.addEventListener("click", closeSheet);

	const doSave = async () => {
		const value = (input.value || "").trim();
		if (!value) {
			showToast("姓名不能为空");
			return;
		}
		if (value.length > 20) {
			showToast("姓名最长 20 个字");
			return;
		}
		if (/^[<>/\\@#!$%^&*=+]+$/.test(value)) {
			showToast("姓名包含非法字符");
			return;
		}
		try {
			save.disabled = true;
			save.textContent = "保存中…";
			const resp = await api("/member/me/display-name", {
				method: "PATCH",
				body: JSON.stringify({ displayName: value }),
			});
			if (resp && resp.ok) {
				showToast("✓ 已更新为「" + value + "」");
				closeSheet();
				renderProfile();
				refreshNotificationBadge();
			} else {
				showToast(resp?.message || "保存失败");
			}
		} catch (e) {
			showToast("保存失败");
			console.error(e);
		} finally {
			save.disabled = false;
			save.textContent = "保存";
		}
	};
	save.addEventListener("click", doSave);
	input.addEventListener("keydown", (e) => {
		if (e.key === "Enter") doSave();
	});
	// 自动聚焦并全选
	setTimeout(() => {
		input.focus();
		input.select();
	}, 100);
}

// ===== BLIND BOX (reuses luck page briefly) =====
// handled within discover grid click

// ===== MODAL =====
function closeModal() {
	document.getElementById("modal-overlay").classList.remove("active");
}

// ===== INIT =====
async function init() {
	try {
		await new Promise((r) => setTimeout(r, 800));
		try {
			const a = await api("/auth/staff/demo-token");
			if (a.ok && a.data) {
				token = a.data.token;
				storeId = a.data.staffId || storeId;
			}
		} catch {
			token = "fb";
		}
		try {
			const [pr, tr, ct] = await Promise.all([
				api("/admin/catalog"),
				api("/admin/try-on-sessions"),
				api("/admin/coupons/templates"),
			]);
			products = pr.items || pr || [];
			tryOnSession = (tr.items || tr || [])[0] || null;
			couponTemplates = ct || [];
			if (!products.length) throw new Error("empty");
		} catch {
			products = FALLBACK_PRODUCTS;
			tryOnSession = {
				id: "s1",
				items: [
					{
						id: "t1",
						productId: "prod-necklace-001",
						durationMs: 18000,
						position: "颈部",
						product: null,
					},
					{
						id: "t2",
						productId: "prod-ring-001",
						durationMs: 12000,
						position: "右手",
						product: null,
					},
				],
			};
			couponTemplates = [
				{
					id: "tpl1",
					name: "到店免费清洗保养",
					type: "FREE_CLEANING",
					code: "FREE-001",
					validityDays: 30,
				},
				{
					id: "tpl2",
					name: "宝石盲盒体验券",
					type: "GEMSTONE_BLIND_BOX",
					code: "BOX-001",
					validityDays: 7,
				},
			];
		}
		if (tryOnSession?.items)
			tryOnSession.items.forEach((it) => {
				if (!it.product)
					it.product = products.find((p) => p.id === it.productId) || null;
			});
	} catch (_e) {
		products = FALLBACK_PRODUCTS;
		tryOnSession = null;
		couponTemplates = [];
	}
	document.getElementById("splash").classList.add("hidden");
	setupListeners();
	// 首次进入即刷新通知角标，之后每 30s 轮询一次
	refreshNotificationBadge();
	setInterval(() => {
		try { refreshNotificationBadge(); } catch (_) { /* ignore */ }
	}, 30_000);
	const refCode = new URLSearchParams(window.location.search).get("ref");
	if (refCode) {
		showReferralLanding(refCode);
	} else {
		renderHome();
	}
}
function setupListeners() {
	document.querySelectorAll(".nav-btn").forEach((b) =>
		b.addEventListener("click", (e) => {
			e.preventDefault();
			goTo(b.dataset.page);
		}),
	);
	document.querySelectorAll(".chip").forEach((c) =>
		c.addEventListener("click", () => {
			document
				.querySelectorAll(".chip")
				.forEach((x) => x.classList.remove("active"));
			c.classList.add("active");
			renderRecommend(c.dataset.type);
		}),
	);
	document.getElementById("modal-overlay").addEventListener("click", (e) => {
		if (e.target.id === "modal-overlay") closeModal();
	});
}

// ===== GLOBALS =====
window.goTo = goTo;
window.closeModal = closeModal;
window.showToast = showToast;
window.showJewelryBoxDetail = showJewelryBoxDetail;
window.flipLuckCard = flipLuckCard;
window.bookCare = bookCare;
window.tradeInNext = tradeInNext;
window.tradeInBack = tradeInBack;
window.tradeInRetry = tradeInRetry;
window.tradeInRestart = tradeInRestart;
window.shareReferral = shareReferral;
window.copyShareLink = copyShareLink;
window.showReferralLanding = showReferralLanding;
window.redeemReferral = redeemReferral;
window.showStoryDetail = showStoryDetail;
window.claimCoupon = claimCoupon;
window.selectSlot = selectSlot;
window.selectConsult = selectConsult;
window.toggleFav = toggleFav;
window.toggleCmp = toggleCmp;
window.showRecDetail = showRecDetail;
window.openBlindBox = openBlindBox;
window.handleNotificationClick = handleNotificationClick;
window.markAllNotificationsRead = markAllNotificationsRead;
window.refreshNotificationBadge = refreshNotificationBadge;
window.renderProfile = renderProfile;
window.editProfileName = editProfileName;
window.selectedProductId = selectedProductId;

document.addEventListener("DOMContentLoaded", init);

export interface Fortune {
	id: string;
	gem: string;
	color: string;
	sign: string;
	message: string;
	recommend: string;
	luckyColor: string;
}

export const FORTUNES: Fortune[] = [
	{
		id: "sapphire",
		gem: "蓝宝石",
		color: "#1a3a8a",
		sign: "今日宜：勇敢尝试新风格",
		message:
			"蓝宝石象征智慧与忠诚，今天的你适合展现内心深处的坚定信念。佩戴深蓝色珠宝将为你带来平静与力量。",
		recommend: "海蓝宝石项链或耳饰",
		luckyColor: "宝蓝色",
	},
	{
		id: "ruby",
		gem: "红宝石",
		color: "#8a1a1a",
		sign: "今日宜：表达心意",
		message:
			"红宝石代表热情与爱情，今天是个适合向重要的人表达感情的日子。红色珠宝将为你增添魅力与自信。",
		recommend: "红宝石戒指或胸针",
		luckyColor: "中国红",
	},
	{
		id: "jade",
		gem: "翡翠",
		color: "#1a5a3a",
		sign: "今日宜：沉淀与思考",
		message:
			"翡翠寓意平安与富贵，今天适合放慢脚步、享受宁静。绿色珠宝能让你感受到自然的生命力。",
		recommend: "翡翠手镯或平安扣",
		luckyColor: "翠绿",
	},
	{
		id: "pearl",
		gem: "珍珠",
		color: "#8a7a5a",
		sign: "今日宜：社交与聚会",
		message:
			"珍珠象征优雅与纯洁，今天适合参加重要的社交场合。珍珠首饰将为你增添从容与高贵。",
		recommend: "珍珠耳坠或吊坠项链",
		luckyColor: "珍珠白",
	},
	{
		id: "diamond",
		gem: "钻石",
		color: "#4a4a6a",
		sign: "今日宜：犒赏自己",
		message:
			"钻石代表永恒与坚韧，今天是个适合自我奖励的日子。钻石饰品能让你感受到自己值得被珍视。",
		recommend: "钻石手链或耳钉",
		luckyColor: "璀璨银",
	},
	{
		id: "emerald",
		gem: "祖母绿",
		color: "#0a4a3a",
		sign: "今日宜：开启新篇章",
		message:
			"祖母绿代表希望与重生，今天适合开启新计划或学习新事物。绿色珠宝能唤醒你内在的活力。",
		recommend: "祖母绿戒指或耳饰",
		luckyColor: "森林绿",
	},
	{
		id: "padparadscha",
		gem: "帕帕拉恰",
		color: "#8a4a3a",
		sign: "今日宜：追寻稀有美好",
		message:
			"帕帕拉恰蓝宝石是世间稀有之物，今天的你适合探索那些独特而少见的体验，发现平凡中的不凡。",
		recommend: "帕帕拉恰蓝宝石吊坠",
		luckyColor: "莲花橙",
	},
	{
		id: "gold-pearl",
		gem: "金珠",
		color: "#8a6a3a",
		sign: "今日宜：展现高贵",
		message:
			"南洋金珠历经岁月打磨，象征着富贵与沉淀。今天是你展现内在价值的最佳时机。",
		recommend: "金珠耳坠或吊坠",
		luckyColor: "黄金色",
	},
];

export function pickFortuneByDay(day: string): Fortune {
	let hash = 0;
	for (let i = 0; i < day.length; i++) {
		hash = (hash * 31 + day.charCodeAt(i)) >>> 0;
	}
	const index = hash % FORTUNES.length;
	const fortune = FORTUNES[index];
	if (!fortune) throw new Error("Fortune list is empty");
	return fortune;
}

export function getTodayDay(): string {
	const now = new Date();
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

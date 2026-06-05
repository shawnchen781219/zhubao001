import { Injectable } from "@nestjs/common";

export interface PriceBreakdown {
	basePrice: number;
	metalValue: number;
	gemValue: number;
	conditionDiscount: number;
	ageDiscount: number;
	finalEstimate: number;
	subsidyAmount: number;
	totalCredit: number;
	reasoning: string[];
}

export interface TradeInInput {
	itemName: string;
	category: string;
	brandName?: string;
	purchaseYear?: number;
	purchasePrice?: number;
	metalType?: string;
	metalWeightGrams?: number;
	metalPurity?: number;
	gemCategory?: string;
	gemCarat?: number;
	gemColor?: string;
	gemClarity?: string;
	gemCut?: string;
	gemCertificate?: string;
	conditionGrade: string;
	conditionNotes?: string;
	hasReceipt?: boolean;
	hasCertificate?: boolean;
	hasBox?: boolean;
}

@Injectable()
export class TradeInPricingService {
	// 贵金属基准价 (元/克) - 2026年6月市场价
	// purity 字段表示该类型对应的标准纯度（用于识别"显式成色类型"）
	private readonly metalPrices: Record<string, number> = {
		GOLD_24K: 780, // 24K足金 (100%)
		GOLD_18K: 585, // 18K金 (75%)
		GOLD_14K: 456, // 14K金 (58.5%)
		GOLD_9K: 292, // 9K金 (37.5%)
		PLATINUM_PT950: 335, // 铂金Pt950 (95%)
		PLATINUM_PT900: 318, // 铂金Pt900 (90%)
		SILVER_999: 8.5, // 足银999
		SILVER_925: 7.8, // 银925
		PALLADIUM: 235, // 钯金
	};

	// 显式成色类型：基准价已包含该类纯度，不应再乘以 metalPurity
	private readonly explicitKaratTypes: Set<string> = new Set([
		"GOLD_24K",
		"GOLD_18K",
		"GOLD_14K",
		"GOLD_9K",
		"PLATINUM_PT950",
		"PLATINUM_PT900",
		"SILVER_999",
		"SILVER_925",
		"PALLADIUM",
	]);

	// 宝石基准价 (元/克拉) - 中等品质
	private readonly gemstoneBasePrices: Record<string, number> = {
		DIAMOND: 15000,
		RUBY: 28000,
		SAPPHIRE: 18000,
		EMERALD: 22000,
		JADE: 3500,
		PEARL: 800,
		AMETHYST: 450,
		TOPAZ: 380,
		AQUAMARINE: 1200,
		OPAL: 950,
		TOURMALINE: 1800,
		GARNET: 680,
	};

	// 品质系数 - 宝石4C中的净度和颜色
	private readonly clarityCoefficients: Record<string, number> = {
		FL: 1.5,
		IF: 1.4,
		VVS1: 1.3,
		VVS2: 1.2,
		VS1: 1.1,
		VS2: 1.0,
		SI1: 0.85,
		SI2: 0.75,
		I1: 0.6,
		I2: 0.45,
		I3: 0.35,
	};

	private readonly colorCoefficients: Record<string, number> = {
		D: 1.8,
		E: 1.6,
		F: 1.5,
		G: 1.3,
		H: 1.15,
		I: 1.0,
		J: 0.9,
		K: 0.8,
		L: 0.7,
		M: 0.6,
		N: 0.5,
	};

	// 切工系数
	private readonly cutCoefficients: Record<string, number> = {
		EXCELLENT: 1.15,
		VERY_GOOD: 1.05,
		GOOD: 1.0,
		FAIR: 0.9,
		POOR: 0.75,
	};

	// 品相折扣系数
	private readonly conditionCoefficients: Record<string, number> = {
		MINT: 0.95, // 全新未使用
		EXCELLENT: 0.85, // 极好，几乎无痕迹
		GOOD: 0.72, // 良好，轻微磨损
		FAIR: 0.58, // 一般，明显磨损
		POOR: 0.42, // 较差，严重磨损或损坏
	};

	// 年限折旧率 (每年)
	private readonly annualDepreciationRate = 0.05;

	// 换新补贴比例
	private readonly subsidyRate = 0.1;

	calculatePrice(input: TradeInInput): PriceBreakdown {
		const reasoning: string[] = [];
		let basePrice = 0;
		let metalValue = 0;
		let gemValue = 0;

		// 1. 贵金属价值计算
		if (
			input.metalType &&
			input.metalWeightGrams &&
			input.metalWeightGrams > 0
		) {
			const metalPricePerGram = this.metalPrices[input.metalType] || 0;
			metalValue = metalPricePerGram * input.metalWeightGrams;

			// 成色修正：仅当类型不是显式成色类型时才应用
			// 显式类型（如 GOLD_18K）的基准价已包含对应纯度，不再重复打折
			if (
				!this.explicitKaratTypes.has(input.metalType) &&
				input.metalPurity &&
				input.metalPurity > 0 &&
				input.metalPurity <= 1
			) {
				metalValue *= input.metalPurity;
				reasoning.push(
					`贵金属 (${input.metalType}): ${input.metalWeightGrams}g × ${metalPricePerGram}元/g × 成色${(input.metalPurity * 100).toFixed(1)}% = ${metalValue.toFixed(0)}元`,
				);
			} else {
				reasoning.push(
					`贵金属 (${input.metalType}): ${input.metalWeightGrams}g × ${metalPricePerGram}元/g = ${metalValue.toFixed(0)}元`,
				);
			}
		} else if (input.metalType) {
			reasoning.push(`仅有贵金属框架 (${input.metalType})，无具体克重数据`);
		}

		// 2. 宝石价值计算
		if (input.gemCategory && input.gemCarat && input.gemCarat > 0) {
			const gemBasePrice = this.gemstoneBasePrices[input.gemCategory] || 0;
			gemValue = gemBasePrice * input.gemCarat;

			reasoning.push(
				`宝石 (${input.gemCategory}): 基准${gemBasePrice}元/ct × ${input.gemCarat}ct = ${gemValue.toFixed(0)}元`,
			);

			// 净度系数
			if (input.gemClarity && this.clarityCoefficients[input.gemClarity]) {
				const clarityCoef = this.clarityCoefficients[input.gemClarity]!;
				gemValue *= clarityCoef;
				reasoning.push(
					`  净度 ${input.gemClarity} (系数×${clarityCoef}) → ${gemValue.toFixed(0)}元`,
				);
			}

			// 颜色系数
			if (input.gemColor && this.colorCoefficients[input.gemColor]) {
				const colorCoef = this.colorCoefficients[input.gemColor]!;
				gemValue *= colorCoef;
				reasoning.push(
					`  颜色 ${input.gemColor} (系数×${colorCoef}) → ${gemValue.toFixed(0)}元`,
				);
			}

			// 切工系数
			if (input.gemCut && this.cutCoefficients[input.gemCut]) {
				const cutCoef = this.cutCoefficients[input.gemCut]!;
				gemValue *= cutCoef;
				reasoning.push(
					`  切工 ${input.gemCut} (系数×${cutCoef}) → ${gemValue.toFixed(0)}元`,
				);
			}
		} else if (input.gemCategory) {
			reasoning.push(`仅有宝石类别 (${input.gemCategory})，无克拉数据`);
		}

		// 3. 基准价 = 贵金属 + 宝石
		basePrice = metalValue + gemValue;

		// 4. 品相折扣
		let conditionDiscount = 0;
		if (
			input.conditionGrade &&
			this.conditionCoefficients[input.conditionGrade]
		) {
			const conditionCoef = this.conditionCoefficients[input.conditionGrade]!;
			const depreciatedValue = basePrice * conditionCoef;
			conditionDiscount = basePrice - depreciatedValue;
			basePrice = depreciatedValue;

			const conditionLabels: Record<string, string> = {
				MINT: "全新未使用",
				EXCELLENT: "极好状态",
				GOOD: "良好状态",
				FAIR: "一般状态",
				POOR: "较差状态",
			};
			const conditionLabel = conditionLabels[input.conditionGrade] || "未知";
			reasoning.push(
				`品相 ${input.conditionGrade} (${conditionLabel}): 保留${(conditionCoef * 100).toFixed(0)}%，折扣 -${conditionDiscount.toFixed(0)}元`,
			);
		}

		// 5. 年限折旧
		let ageDiscount = 0;
		if (input.purchaseYear) {
			const currentYear = new Date().getFullYear();
			const ageInYears = currentYear - input.purchaseYear;
			if (ageInYears > 0 && ageInYears <= 50) {
				const depreciationFactor =
					(1 - this.annualDepreciationRate) ** ageInYears;
				const depreciatedValue = basePrice * depreciationFactor;
				ageDiscount = basePrice - depreciatedValue;
				basePrice = depreciatedValue;
				reasoning.push(
					`使用年限 ${ageInYears}年: 年折旧率${(this.annualDepreciationRate * 100).toFixed(0)}%，折后折扣 -${ageDiscount.toFixed(0)}元`,
				);
			}
		}

		// 6. 凭证加成 (5%加成)
		if (input.hasReceipt && input.hasCertificate) {
			const bonus = basePrice * 0.05;
			basePrice += bonus;
			reasoning.push(`含购货凭证+鉴定证书: 信任加成 +${bonus.toFixed(0)}元`);
		} else if (input.hasReceipt || input.hasCertificate) {
			const bonus = basePrice * 0.02;
			basePrice += bonus;
			reasoning.push(`含部分凭证: 信任加成 +${bonus.toFixed(0)}元`);
		}

		// 7. 最终估价
		const finalEstimate = Math.round(basePrice);

		// 8. 换新补贴
		const subsidyAmount = Math.round(finalEstimate * this.subsidyRate);

		// 9. 总抵扣额
		const totalCredit = finalEstimate + subsidyAmount;

		// 10. 构建最终理由
		reasoning.unshift(`以旧换新评估: ${input.itemName} (${input.category})`);
		reasoning.push("");
		reasoning.push(`最终估价: ${finalEstimate}元`);
		reasoning.push(
			`换新补贴 (${(this.subsidyRate * 100).toFixed(0)}%): ${subsidyAmount}元`,
		);
		reasoning.push(`总抵扣额: ${totalCredit}元`);

		return {
			basePrice: Math.round(metalValue + gemValue),
			metalValue: Math.round(metalValue),
			gemValue: Math.round(gemValue),
			conditionDiscount: Math.round(conditionDiscount),
			ageDiscount: Math.round(ageDiscount),
			finalEstimate,
			subsidyAmount,
			totalCredit,
			reasoning,
		};
	}
}

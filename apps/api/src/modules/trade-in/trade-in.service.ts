import { Inject, Injectable } from "@nestjs/common";
import { PRISMA_CLIENT } from "../../common/prisma-runtime/prisma-runtime.tokens.js";
import type { PrismaClient } from "../../generated/client.js";
import type { TradeInInput } from "./trade-in.pricing.service.js";
// biome-ignore lint/style/useImportType: NestJS DI requires runtime class reference
import { TradeInPricingService } from "./trade-in.pricing.service.js";

@Injectable()
export class TradeInService {
	constructor(
		@Inject(PRISMA_CLIENT)
		private prisma: PrismaClient,
		private pricingService: TradeInPricingService,
	) {}

	async createAssessment(customerId: string, input: TradeInInput) {
		const pricing = this.pricingService.calculatePrice(input);

		const assessment = await this.prisma.tradeInAssessment.create({
			data: {
				customerId,
				itemName: input.itemName,
				category: input.category as any,
				brandName: input.brandName || null,
				purchaseYear: input.purchaseYear || null,
				purchasePrice: input.purchasePrice || null,
				metalType: input.metalType || null,
				metalWeightGrams: input.metalWeightGrams || null,
				metalPurity: input.metalPurity || null,
				gemCategory: input.gemCategory || null,
				gemCarat: input.gemCarat || null,
				gemColor: input.gemColor || null,
				gemClarity: input.gemClarity || null,
				gemCut: input.gemCut || null,
				gemCertificate: input.gemCertificate || null,
				conditionGrade: input.conditionGrade as any,
				conditionNotes: input.conditionNotes || null,
				hasReceipt: input.hasReceipt || false,
				hasCertificate: input.hasCertificate || false,
				hasBox: input.hasBox || false,
				basePrice: pricing.basePrice,
				metalValue: pricing.metalValue,
				gemValue: pricing.gemValue,
				conditionDiscount: pricing.conditionDiscount,
				ageDiscount: pricing.ageDiscount,
				finalEstimate: pricing.finalEstimate,
				subsidyAmount: pricing.subsidyAmount,
				totalCredit: pricing.totalCredit,
				reasoning: JSON.stringify(pricing.reasoning),
				marketReference: {},
				status: "SUBMITTED",
			},
		});

		return assessment;
	}

	async getAssessment(assessmentId: string) {
		const assessment = await this.prisma.tradeInAssessment.findUnique({
			where: { id: assessmentId },
			include: {
				customer: {
					select: {
						id: true,
						displayName: true,
					},
				},
			},
		});

		if (!assessment) {
			return null;
		}

		return {
			...assessment,
			reasoning: JSON.parse(assessment.reasoning),
		};
	}

	async listAssessments(customerId?: string, status?: string) {
		const where: Record<string, any> = {};
		if (customerId) where["customerId"] = customerId;
		if (status) where["status"] = status;

		const assessments = await this.prisma.tradeInAssessment.findMany({
			where,
			include: {
				customer: {
					select: {
						id: true,
						displayName: true,
					},
				},
			},
			orderBy: { createdAt: "desc" },
			take: 50,
		});

		return assessments.map((a) => ({
			...a,
			reasoning: JSON.parse(a.reasoning),
		}));
	}

	async updateStatus(
		assessmentId: string,
		status: string,
		reviewedBy: string,
		reviewNote?: string,
	) {
		const assessment = await this.prisma.tradeInAssessment.update({
			where: { id: assessmentId },
			data: {
				status: status as any,
				reviewedBy,
				reviewNote: reviewNote || null,
				reviewedAt: new Date(),
			},
			include: {
				customer: {
					select: {
						id: true,
						displayName: true,
					},
				},
			},
		});

		return {
			...assessment,
			reasoning: JSON.parse(assessment.reasoning),
		};
	}

	async deleteAssessment(assessmentId: string) {
		await this.prisma.tradeInAssessment.delete({
			where: { id: assessmentId },
		});
		return { success: true };
	}

	async findFirstActiveCustomer(storeId: string): Promise<string | null> {
		const c = await this.prisma.customer.findFirst({
			where: { storeId, status: "ACTIVE" },
			select: { id: true },
		});
		return c?.id ?? null;
	}

	getReferenceData() {
		return {
			metalTypes: [
				{ value: "GOLD_24K", label: "24K黄金 (足金)" },
				{ value: "GOLD_18K", label: "18K黄金 (Au750)" },
				{ value: "GOLD_14K", label: "14K黄金" },
				{ value: "GOLD_9K", label: "9K黄金" },
				{ value: "PLATINUM_PT950", label: "铂金PT950" },
				{ value: "PLATINUM_PT900", label: "铂金PT900" },
				{ value: "SILVER_999", label: "足银999" },
				{ value: "SILVER_925", label: "银925" },
				{ value: "PALLADIUM", label: "钯金" },
			],
			gemCategories: [
				{ value: "DIAMOND", label: "钻石" },
				{ value: "RUBY", label: "红宝石" },
				{ value: "SAPPHIRE", label: "蓝宝石" },
				{ value: "EMERALD", label: "祖母绿" },
				{ value: "JADE", label: "翡翠/玉石" },
				{ value: "PEARL", label: "珍珠" },
				{ value: "AMETHYST", label: "紫水晶" },
				{ value: "TOPAZ", label: "托帕石" },
				{ value: "AQUAMARINE", label: "海蓝宝石" },
				{ value: "OPAL", label: "欧泊" },
				{ value: "TOURMALINE", label: "碧玺" },
				{ value: "GARNET", label: "石榴石" },
			],
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
			conditionGrades: [
				{
					value: "MINT",
					label: "全新未使用",
					description: "从未佩戴，保留完整包装",
				},
				{
					value: "EXCELLENT",
					label: "极好",
					description: "几乎无磨损痕迹，保养良好",
				},
				{
					value: "GOOD",
					label: "良好",
					description: "有轻微磨损，整体状态良好",
				},
				{ value: "FAIR", label: "一般", description: "有明显磨损或轻微损坏" },
				{ value: "POOR", label: "较差", description: "严重磨损或损坏，需修复" },
			],
			clarityGrades: [
				{ value: "FL", label: "FL (无瑕)" },
				{ value: "IF", label: "IF (内无瑕)" },
				{ value: "VVS1", label: "VVS1 (极微瑕)" },
				{ value: "VVS2", label: "VVS2 (极微瑕)" },
				{ value: "VS1", label: "VS1 (微瑕)" },
				{ value: "VS2", label: "VS2 (微瑕)" },
				{ value: "SI1", label: "SI1 (小瑕)" },
				{ value: "SI2", label: "SI2 (小瑕)" },
				{ value: "I1", label: "I1 (瑕疵)" },
				{ value: "I2", label: "I2 (瑕疵)" },
				{ value: "I3", label: "I3 (瑕疵)" },
			],
			colorGrades: [
				{ value: "D", label: "D (无色)" },
				{ value: "E", label: "E (无色)" },
				{ value: "F", label: "F (无色)" },
				{ value: "G", label: "G (近无色)" },
				{ value: "H", label: "H (近无色)" },
				{ value: "I", label: "I (近无色)" },
				{ value: "J", label: "J (微黄)" },
				{ value: "K", label: "K (微黄)" },
				{ value: "L", label: "L (淡黄)" },
				{ value: "M", label: "M (淡黄)" },
				{ value: "N", label: "N (淡黄)" },
			],
			cutGrades: [
				{ value: "EXCELLENT", label: "极好 (Excellent)" },
				{ value: "VERY_GOOD", label: "很好 (Very Good)" },
				{ value: "GOOD", label: "好 (Good)" },
				{ value: "FAIR", label: "一般 (Fair)" },
				{ value: "POOR", label: "差 (Poor)" },
			],
		};
	}
}

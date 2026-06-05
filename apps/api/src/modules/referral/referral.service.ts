import {
	BadRequestException,
	Inject,
	Injectable,
	NotFoundException,
} from "@nestjs/common";
import { PRISMA_CLIENT } from "../../common/prisma-runtime/prisma-runtime.tokens.js";
import type { PrismaClient } from "../../generated/client.js";
import { PointsTransactionType } from "../../generated/enums.js";
// biome-ignore lint/style/useImportType: NestJS DI requires runtime class reference
import { MemberService } from "../member/member.service.js";
import type {
	CreateReferralCardInput,
	ReferralCardBenefit,
	ReferralShareResult,
	ReferralStats,
} from "./referral.types.js";

@Injectable()
export class ReferralService {
	constructor(
		@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
		private readonly memberService: MemberService,
	) {}

	async listByCustomer(customerId: string) {
		const cards = await this.prisma.referralCard.findMany({
			where: { customerId, status: "active" },
			orderBy: { createdAt: "desc" },
			include: {
				_count: {
					select: { events: true },
				},
			},
		});

		return cards.map((card) => ({
			id: card.id,
			cardName: card.cardName,
			shareCode: card.shareCode,
			benefits: card.benefits as unknown as ReferralCardBenefit[],
			validFrom: card.validFrom,
			validUntil: card.validUntil,
			status: card.status,
			shareCount: card.shareCount,
			redeemCount: card.redeemCount,
			eventCount: card._count.events,
			createdAt: card.createdAt,
		}));
	}

	async createForCustomer(
		customerId: string,
		storeId: string,
		input: CreateReferralCardInput,
	) {
		const customer = await this.prisma.customer.findUnique({
			where: { id: customerId },
		});
		if (!customer) {
			throw new NotFoundException("Customer not found");
		}

		const shareCode = this.generateShareCode();

		const card = await this.prisma.referralCard.create({
			data: {
				customerId,
				storeId,
				cardName: input.cardName,
				shareCode,
				benefits: JSON.parse(JSON.stringify(input.benefits)),
				validUntil: new Date(input.validUntil),
			},
		});

		return card;
	}

	async getOrCreateDefault(customerId: string, storeId: string) {
		let cards = await this.listByCustomer(customerId);

		if (cards.length === 0) {
			const defaultInput: CreateReferralCardInput = {
				cardName: "闺蜜同行 · 双倍璀璨礼遇",
				benefits: [
					{
						key: "coupon",
						label: "双方各获 ¥500 到店礼券",
						icon: "🎁",
						valueCents: 50000,
					},
					{ key: "preview", label: "同行试戴解锁限量款预览", icon: "💎" },
					{ key: "discount", label: "双人购买享额外 9 折", icon: "✨" },
				],
				validUntil:
					new Date(Date.now() + 90 * 86_400_000).toISOString().split("T")[0] ??
					"",
			};
			await this.createForCustomer(customerId, storeId, defaultInput);
			cards = await this.listByCustomer(customerId);
		}

		return cards[0];
	}

	async shareCard(
		cardId: string,
		visitorIp?: string,
		userAgent?: string,
	): Promise<ReferralShareResult> {
		const card = await this.prisma.referralCard.findUnique({
			where: { id: cardId },
		});
		if (!card) {
			throw new NotFoundException("Referral card not found");
		}

		if (card.validUntil < new Date()) {
			throw new BadRequestException("Referral card has expired");
		}

		await this.prisma.referralCard.update({
			where: { id: cardId },
			data: { shareCount: { increment: 1 } },
		});

		await this.prisma.referralEvent.create({
			data: {
				referralCardId: cardId,
				eventType: "SHARE",
				ip: visitorIp || null,
				userAgent: userAgent || null,
			},
		});

		const baseUrl = process.env["API_BASE_URL"] || "http://47.98.109.227:5175";

		return {
			referralCardId: card.id,
			shareCode: card.shareCode,
			cardName: card.cardName,
			benefits: card.benefits as unknown as ReferralCardBenefit[],
			validUntil: card.validUntil.toISOString(),
			shareUrl: `${baseUrl}/?ref=${card.shareCode}`,
		};
	}

	async getCardByShareCode(
		shareCode: string,
		visitorIp?: string,
		userAgent?: string,
	) {
		const card = await this.prisma.referralCard.findUnique({
			where: { shareCode },
			include: {
				customer: {
					select: { displayName: true },
				},
			},
		});

		if (!card) {
			throw new NotFoundException("Invalid share code");
		}

		if (card.validUntil < new Date()) {
			throw new BadRequestException("This referral has expired");
		}

		await this.prisma.referralEvent.create({
			data: {
				referralCardId: card.id,
				eventType: "VISIT",
				ip: visitorIp || null,
				userAgent: userAgent || null,
			},
		});

		return {
			id: card.id,
			cardName: card.cardName,
			benefits: card.benefits,
			sharedByName: card.customer.displayName,
			validUntil: card.validUntil,
		};
	}

	async redeemCard(
		shareCode: string,
		visitorName?: string,
		visitorPhone?: string,
		visitorIp?: string,
		userAgent?: string,
	) {
		const card = await this.prisma.referralCard.findUnique({
			where: { shareCode },
		});

		if (!card) {
			throw new NotFoundException("Invalid share code");
		}

		if (card.validUntil < new Date()) {
			throw new BadRequestException("This referral has expired");
		}

		if (card.redeemCount >= 10) {
			throw new BadRequestException(
				" This referral card has reached its redemption limit",
			);
		}

		await this.prisma.$transaction(async (tx) => {
			await tx.referralCard.update({
				where: { id: card.id },
				data: { redeemCount: { increment: 1 } },
			});

			await tx.referralEvent.create({
				data: {
					referralCardId: card.id,
					eventType: "REDEEM",
					visitorName: visitorName || null,
					visitorPhone: visitorPhone || null,
					ip: visitorIp || null,
					userAgent: userAgent || null,
				},
			});

			try {
				await this.memberService.addPoints({
					customerId: card.customerId,
					amount: 100,
					type: PointsTransactionType.REFERRAL,
					reason: "好友核销你的邀请卡",
				});
			} catch {
				// Points service may fail silently
			}
		});

		return {
			success: true,
			message: "核销成功！邀请人已获得 100 积分奖励",
		};
	}

	async getStats(storeId: string): Promise<ReferralStats> {
		const cards = await this.prisma.referralCard.findMany({
			where: { storeId },
			orderBy: { createdAt: "desc" },
			take: 10,
		});

		const totalShares = cards.reduce((sum, c) => sum + c.shareCount, 0);
		const totalRedemptions = cards.reduce((sum, c) => sum + c.redeemCount, 0);

		const visits = await this.prisma.referralEvent.count({
			where: {
				referralCard: { storeId },
				eventType: "VISIT",
			},
		});

		const recentEvents = await this.prisma.referralEvent.findMany({
			where: { referralCard: { storeId } },
			orderBy: { createdAt: "desc" },
			take: 20,
			include: {
				referralCard: {
					select: { cardName: true },
				},
			},
		});

		return {
			totalCards: cards.length,
			totalShares,
			totalVisits: visits,
			totalRedemptions,
			conversionRate: visits > 0 ? (totalRedemptions / visits) * 100 : 0,
			topCards: cards.map((c) => ({
				cardId: c.id,
				cardName: c.cardName,
				shareCount: c.shareCount,
				redeemCount: c.redeemCount,
				createdAt: c.createdAt.toISOString(),
			})),
			recentEvents: recentEvents.map((e) => ({
				id: e.id,
				eventType: e.eventType,
				visitorName: e.visitorName ?? null,
				createdAt: e.createdAt.toISOString(),
				cardName: e.referralCard.cardName,
			})),
		};
	}

	async findFirstActiveCustomer(storeId: string): Promise<string | null> {
		const c = await this.prisma.customer.findFirst({
			where: { storeId, status: "ACTIVE" },
			select: { id: true },
		});
		return c?.id ?? null;
	}

	private generateShareCode(): string {
		const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
		const year = new Date().getFullYear();
		let random = "";
		for (let i = 0; i < 6; i++) {
			random += chars.charAt(Math.floor(Math.random() * chars.length));
		}
		return `FRC-${year}-${random}`;
	}
}

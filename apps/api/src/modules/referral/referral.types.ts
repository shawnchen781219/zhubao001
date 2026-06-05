export enum ReferralEventType {
	SHARE = "SHARE",
	VISIT = "VISIT",
	REGISTER = "REGISTER",
	REDEEM = "REDEEM",
	FIRST_PURCHASE = "FIRST_PURCHASE",
}

export interface ReferralCardBenefit {
	key: string;
	label: string;
	icon: string;
	valueCents?: number;
	points?: number;
}

export interface CreateReferralCardInput {
	cardName: string;
	benefits: ReferralCardBenefit[];
	validUntil: string;
}

export interface ReferralShareResult {
	referralCardId: string;
	shareCode: string;
	cardName: string;
	benefits: ReferralCardBenefit[];
	validUntil: string;
	shareUrl: string;
}

export interface ReferralRedeemInput {
	shareCode: string;
	visitorName?: string;
	visitorPhone?: string;
}

export interface ReferralStats {
	totalCards: number;
	totalShares: number;
	totalVisits: number;
	totalRedemptions: number;
	conversionRate: number;
	topCards: Array<{
		cardId: string;
		cardName: string;
		shareCount: number;
		redeemCount: number;
		createdAt: string;
	}>;
	recentEvents: Array<{
		id: string;
		eventType: string;
		visitorName: string | null;
		createdAt: string;
		cardName: string;
	}>;
}

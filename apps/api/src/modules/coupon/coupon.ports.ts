export type CouponStatus =
	| "ISSUED"
	| "LOCKED"
	| "REDEEMED"
	| "EXPIRED"
	| "VOIDED";

export interface CouponDto {
	id: string;
	templateId: string;
	customerId?: string | null;
	sourceTryOnSessionId?: string | null;
	status: CouponStatus;
	issuedAt: string;
	expiresAt: string;
}

export interface ClaimCouponInput {
	storeId: string;
	customerId: string;
	templateCode: string;
	sourceTryOnSessionId?: string;
	idempotencyKey: string;
	traceId: string;
}

export interface RedeemCouponInput {
	couponId: string;
	staffUserId: string;
	idempotencyKey: string;
	redemptionNote?: string;
	traceId: string;
}

export interface CouponPort {
	claimCoupon(input: ClaimCouponInput): Promise<CouponDto>;
	redeemCoupon(input: RedeemCouponInput): Promise<CouponDto>;
}

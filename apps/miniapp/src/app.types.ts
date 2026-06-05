import type {
	ApiErrorResponse,
	CouponSummary,
	TryOnSessionId,
	TryOnSessionSummary,
} from "@jewelry/shared";

export interface MiniappPageContext {
	traceId: string;
	customerId?: string;
	sourceTryOnSessionId?: string;
}

export type MiniappPageKey = "scan-entry" | "coupon-wallet" | "try-on-media";

export type MiniappScanLandingState =
	| { name: "idle"; traceId: string }
	| { name: "scanning"; traceId: string }
	| { name: "session-found"; traceId: string; session: TryOnSessionSummary }
	| { name: "invalid-code"; traceId: string; error: ApiErrorResponse };

export type MiniappCouponClaimState =
	| { name: "idle"; traceId: string; sessionId?: TryOnSessionId }
	| { name: "claiming"; traceId: string; sessionId?: TryOnSessionId }
	| { name: "claimed"; traceId: string; coupon: CouponSummary }
	| { name: "failed"; traceId: string; error: ApiErrorResponse };

export type MiniappMediaAuthorizationState =
	| { name: "not-requested"; traceId: string; sessionId: TryOnSessionId }
	| { name: "requesting"; traceId: string; sessionId: TryOnSessionId }
	| {
			name: "authorized";
			traceId: string;
			sessionId: TryOnSessionId;
			authorizedAt: string;
	  }
	| {
			name: "denied";
			traceId: string;
			sessionId: TryOnSessionId;
			error?: ApiErrorResponse;
	  };

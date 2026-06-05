export interface IdempotencyKeySource {
	headerName: "X-Idempotency-Key";
	key: string;
	requestId: string;
	routeId: string;
	principalId?: string;
}

export interface IdempotencyRecord<TResult = unknown> {
	key: string;
	requestHash: string;
	result: TResult;
	createdAt: string;
}

export type IdempotencyDecision<TResult = unknown> =
	| { kind: "PROCEED" }
	| { kind: "REPLAY"; result: TResult }
	| { kind: "CONFLICT"; errorCode: "IDEMPOTENCY_CONFLICT" };

export interface IdempotencyPort {
	decide<TResult>(
		source: IdempotencyKeySource,
		requestHash: string,
	): Promise<IdempotencyDecision<TResult>>;
	remember<TResult>(
		source: IdempotencyKeySource,
		requestHash: string,
		result: TResult,
	): Promise<void>;
}

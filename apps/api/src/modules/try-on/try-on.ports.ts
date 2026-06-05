export type TryOnSessionStatus =
	| "ANONYMOUS"
	| "QR_SHOWN"
	| "SCANNED"
	| "AUTHORIZED"
	| "COMPLETED"
	| "EXPIRED";

export interface TryOnSessionDto {
	id: string;
	storeId: string;
	deviceId: string;
	customerId?: string | null;
	anonymousId: string;
	status: TryOnSessionStatus;
	startedAt: string;
	scannedAt?: string | null;
	authorizedAt?: string | null;
}

export interface CreateTryOnSessionInput {
	storeId: string;
	deviceId: string;
	anonymousId: string;
	startedAt: string;
	idempotencyKey: string;
	traceId: string;
}

export interface RecordTryOnItemInput {
	sessionId: string;
	productId: string;
	selectedAt: string;
	durationMs?: number;
	position?: string;
	renderConfig?: Record<string, unknown>;
	idempotencyKey: string;
	traceId: string;
}

export interface TryOnPort {
	createAnonymousSession(
		input: CreateTryOnSessionInput,
	): Promise<TryOnSessionDto>;
	recordSelectedItem(
		input: RecordTryOnItemInput,
	): Promise<{ tryOnItemId: string }>;
	markQrShown(
		sessionId: string,
		idempotencyKey: string,
		traceId: string,
	): Promise<{ qrPayload: string; expiresAt: string }>;
	markScanned(
		sessionId: string,
		customerId: string,
		idempotencyKey: string,
		traceId: string,
	): Promise<TryOnSessionDto>;
	bindAuthorizedCustomer(
		sessionId: string,
		customerId: string,
		traceId: string,
	): Promise<TryOnSessionDto>;
}

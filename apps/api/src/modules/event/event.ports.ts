import type { DomainEventType } from "@jewelry/shared";

export interface EventLogInput {
	storeId: string;
	eventType: DomainEventType;
	occurredAt: string;
	traceId: string;
	deviceId?: string;
	customerId?: string;
	anonymousId?: string;
	tryOnSessionId?: string;
	payload?: Record<string, unknown>;
}

export interface EventPort {
	recordEvent(input: EventLogInput): Promise<void>;
}

/** Injection token for EventPort */
export const EVENT_PORT = Symbol("EVENT_PORT");

/**
 * Forbidden payload keys aligned with event-payload-hygiene.ts validation.
 * Kept here as a module-boundary constant so callers and tests can reference
 * the same deny-list without depending on the pure-function internals.
 */
export const FORBIDDEN_EVENT_PAYLOAD_KEYS = [
	"secret",
	"signature",
	"privateKey",
	"apiKey",
	"token",
	"password",
	"credential",
	"phone",
	"mobile",
	"phoneNumber",
	"openid",
	"openId",
	"unionid",
	"unionId",
	"rawMedia",
	"rawImage",
	"rawVideo",
	"biometric",
	"faceVector",
] as const;

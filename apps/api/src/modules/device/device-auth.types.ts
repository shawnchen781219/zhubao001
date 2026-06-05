/**
 * Device authentication types for Phase 1 trusted device access.
 *
 * This file contains only pure types and constants; no NestJS decorators,
 * no database access, no external service calls.
 */

export interface DeviceSignatureInput {
	/** Device identifier */
	deviceId: string;
	/** Request timestamp in Unix milliseconds */
	timestamp: number;
	/** Cryptographic nonce */
	nonce: string;
	/** HTTP method, uppercase */
	method: string;
	/** Request path */
	path: string;
	/** Hash of the request body, or empty string for body-less requests */
	bodyHash: string;
	/** Client-provided HMAC-SHA256 signature */
	signature: string;
	/**
	 * HMAC key material used for signature verification.
	 * In tests this is a raw test secret; in production it must come from
	 * a secure credential store (never from a plain password hash).
	 * See ADR-005 for the credential storage boundary.
	 */
	secret: string;
}

export interface DeviceSignaturePayload {
	deviceId: string;
	timestamp: number;
	nonce: string;
	method: string;
	path: string;
	bodyHash: string;
}

export interface DeviceSignatureVerificationResult {
	ok: true;
	payload: DeviceSignaturePayload;
}

export interface DeviceSignatureVerificationFailure {
	ok: false;
	code:
		| "DEVICE_SIGNATURE_MISSING"
		| "DEVICE_SIGNATURE_INVALID"
		| "DEVICE_CLOCK_SKEW";
	message: string;
}

export type DeviceSignatureVerification =
	| DeviceSignatureVerificationResult
	| DeviceSignatureVerificationFailure;

/** Allowed clock skew in milliseconds. Default: 5 minutes. */
export const DEFAULT_CLOCK_SKEW_MS = 5 * 60 * 1000;

/**
 * Signature payload canonical format:
 *   deviceId\nmethod\npath\ntimestamp\nnonce\nbodyHash
 *
 * This format is stable and must not change without a corresponding
 * ADR and client update.
 */
export function buildSignaturePayload(
	input: Omit<DeviceSignatureInput, "signature" | "secret">,
): string {
	const parts = [
		input.deviceId,
		input.method.toUpperCase(),
		input.path,
		String(input.timestamp),
		input.nonce,
		input.bodyHash,
	];
	return parts.join("\n");
}

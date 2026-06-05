/**
 * Device authentication header names.
 *
 * Centralized constants to avoid string drift across client, terminal and API.
 */
export const DEVICE_AUTH_HEADERS = {
	/** Device identifier */
	DEVICE_ID: "X-Device-Id",
	/** HMAC-SHA256 signature of the canonical payload */
	DEVICE_SIGNATURE: "X-Device-Signature",
	/** Request timestamp in Unix milliseconds */
	DEVICE_TIMESTAMP: "X-Device-Timestamp",
	/** Cryptographic nonce */
	DEVICE_NONCE: "X-Device-Nonce",
	/** Hash of the request body, or empty string for body-less requests */
	BODY_HASH: "X-Body-Hash",
} as const;

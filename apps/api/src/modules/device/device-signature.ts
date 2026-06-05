/**
 * Device signature verification and request timestamp validation.
 *
 * Pure functions only. No NestJS decorators, no database access,
 * no external service calls.
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import type {
	DeviceSignatureInput,
	DeviceSignatureVerification,
} from "./device-auth.types.js";
import {
	buildSignaturePayload,
	DEFAULT_CLOCK_SKEW_MS,
} from "./device-auth.types.js";

export { buildSignaturePayload, DEFAULT_CLOCK_SKEW_MS };

function computeHmacSha256(payload: string, secret: string): string {
	return createHmac("sha256", secret).update(payload, "utf8").digest("hex");
}

function timingSafeCompare(a: string, b: string): boolean {
	const bufA = Buffer.from(a, "utf8");
	const bufB = Buffer.from(b, "utf8");
	if (bufA.length !== bufB.length) {
		// Prevent leaking length through timing by still performing a comparison.
		// Use the shorter length to avoid out-of-bounds, then return false.
		const minLen = Math.min(bufA.length, bufB.length);
		if (minLen > 0) {
			timingSafeEqual(bufA.subarray(0, minLen), bufB.subarray(0, minLen));
		}
		return false;
	}
	return timingSafeEqual(bufA, bufB);
}

/**
 * Verify that the request timestamp is within the allowed clock skew.
 *
 * @param timestamp Request timestamp in Unix milliseconds.
 * @param now Reference timestamp in Unix milliseconds (default: Date.now()).
 * @param skewMs Allowed skew in milliseconds (default: 5 minutes).
 */
export function verifyRequestTimestamp(
	timestamp: number,
	now = Date.now(),
	skewMs = DEFAULT_CLOCK_SKEW_MS,
): { ok: true } | { ok: false; code: "DEVICE_CLOCK_SKEW"; message: string } {
	const diff = Math.abs(now - timestamp);
	if (diff > skewMs) {
		return {
			ok: false,
			code: "DEVICE_CLOCK_SKEW",
			message: `Request timestamp is outside allowed clock skew of ${skewMs}ms.`,
		};
	}
	return { ok: true };
}

/**
 * Verify a device request signature.
 *
 * Steps:
 * 1. Validate required fields are present.
 * 2. Verify request timestamp is within allowed clock skew.
 * 3. Rebuild the canonical payload.
 * 4. Compute HMAC-SHA256 using the stored secret.
 * 5. Compare signatures using timing-safe comparison.
 *
 * @param input Device signature input from the request.
 * @param now Reference timestamp for clock-skew check (default: Date.now()).
 * @param skewMs Allowed clock skew (default: 5 minutes).
 */
export function verifyDeviceSignature(
	input: DeviceSignatureInput,
	now = Date.now(),
	skewMs = DEFAULT_CLOCK_SKEW_MS,
): DeviceSignatureVerification {
	// 1. Missing required fields
	if (!input.deviceId || !input.signature) {
		return {
			ok: false,
			code: "DEVICE_SIGNATURE_MISSING",
			message: "Missing required device authentication fields.",
		};
	}

	// 2. Clock skew check
	const tsResult = verifyRequestTimestamp(input.timestamp, now, skewMs);
	if (!tsResult.ok) {
		return tsResult;
	}

	// 3. Rebuild canonical payload
	const payload = buildSignaturePayload({
		deviceId: input.deviceId,
		timestamp: input.timestamp,
		nonce: input.nonce,
		method: input.method,
		path: input.path,
		bodyHash: input.bodyHash,
	});

	// 4. Compute expected signature
	const expectedSignature = computeHmacSha256(payload, input.secret);

	// 5. Timing-safe comparison
	if (!timingSafeCompare(input.signature, expectedSignature)) {
		return {
			ok: false,
			code: "DEVICE_SIGNATURE_INVALID",
			message: "Device signature verification failed.",
		};
	}

	return {
		ok: true,
		payload: {
			deviceId: input.deviceId,
			timestamp: input.timestamp,
			nonce: input.nonce,
			method: input.method,
			path: input.path,
			bodyHash: input.bodyHash,
		},
	};
}

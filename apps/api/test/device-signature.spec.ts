/**
 * Device signature verification white-box tests.
 *
 * Pure unit tests for device-signature.ts functions.
 * No NestJS testing module, no database, no external services.
 */

import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { DeviceSignatureInput } from "../src/modules/device/device-auth.types.js";
import {
	buildSignaturePayload,
	DEFAULT_CLOCK_SKEW_MS,
	verifyDeviceSignature,
	verifyRequestTimestamp,
} from "../src/modules/device/device-signature.js";

function makeSignature(
	input: Omit<DeviceSignatureInput, "signature" | "secret">,
	secret: string,
): string {
	const payload = buildSignaturePayload(input);
	return createHmac("sha256", secret).update(payload, "utf8").digest("hex");
}

describe("verifyRequestTimestamp", () => {
	it("passes when timestamp is within default skew", () => {
		const now = 1_000_000_000_000;
		const result = verifyRequestTimestamp(now, now);
		expect(result.ok).toBe(true);
	});

	it("passes at the edge of allowed skew", () => {
		const now = 1_000_000_000_000;
		const result = verifyRequestTimestamp(now - DEFAULT_CLOCK_SKEW_MS, now);
		expect(result.ok).toBe(true);
	});

	it("fails when timestamp is outside allowed skew", () => {
		const now = 1_000_000_000_000;
		const result = verifyRequestTimestamp(now - DEFAULT_CLOCK_SKEW_MS - 1, now);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("DEVICE_CLOCK_SKEW");
			expect(result.message).toContain("clock skew");
		}
	});

	it("fails for future timestamps outside skew", () => {
		const now = 1_000_000_000_000;
		const result = verifyRequestTimestamp(now + DEFAULT_CLOCK_SKEW_MS + 1, now);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("DEVICE_CLOCK_SKEW");
		}
	});
});

describe("verifyDeviceSignature", () => {
	const secret = "test-secret-for-unit-tests-only";
	const fixedNow = 1_000_000_000_000;

	function makeValidInputAt(
		overrides?: Partial<DeviceSignatureInput>,
	): DeviceSignatureInput {
		const base = {
			deviceId: "dev_test_001",
			timestamp: fixedNow,
			nonce: "nonce_abc123",
			method: "POST",
			path: "/devices/heartbeat",
			bodyHash:
				"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
			secret,
			...overrides,
		};
		// Compute signature from canonical fields; honor explicit override if provided
		const computed = makeSignature(
			{
				deviceId: base.deviceId,
				timestamp: base.timestamp,
				nonce: base.nonce,
				method: base.method,
				path: base.path,
				bodyHash: base.bodyHash,
			},
			secret,
		);
		return { ...base, signature: overrides?.signature ?? computed };
	}

	it("passes with a correctly computed signature", () => {
		const input = makeValidInputAt();
		const result = verifyDeviceSignature(input, fixedNow);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.payload.deviceId).toBe(input.deviceId);
			expect(result.payload.timestamp).toBe(input.timestamp);
		}
	});

	it("returns DEVICE_SIGNATURE_INVALID for wrong signature", () => {
		const input = makeValidInputAt({ signature: "wrongsignature" });
		const result = verifyDeviceSignature(input, fixedNow);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("DEVICE_SIGNATURE_INVALID");
		}
	});

	it("returns DEVICE_SIGNATURE_MISSING when deviceId is empty", () => {
		const input = makeValidInputAt({ deviceId: "" });
		const result = verifyDeviceSignature(input, fixedNow);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("DEVICE_SIGNATURE_MISSING");
		}
	});

	it("returns DEVICE_SIGNATURE_MISSING when signature is empty", () => {
		const input = makeValidInputAt({ signature: "" });
		const result = verifyDeviceSignature(input, fixedNow);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("DEVICE_SIGNATURE_MISSING");
		}
	});

	it("returns DEVICE_CLOCK_SKEW when timestamp is too old", () => {
		const oldTs = fixedNow - DEFAULT_CLOCK_SKEW_MS - 1000;
		const input = makeValidInputAt({ timestamp: oldTs });
		// Recompute signature with the old timestamp so signature itself is valid
		const signature = makeSignature(
			{
				deviceId: input.deviceId,
				timestamp: oldTs,
				nonce: input.nonce,
				method: input.method,
				path: input.path,
				bodyHash: input.bodyHash,
			},
			secret,
		);
		const result = verifyDeviceSignature({ ...input, signature }, fixedNow);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("DEVICE_CLOCK_SKEW");
		}
	});

	it("fails when method changes", () => {
		const input = makeValidInputAt();
		const modified = { ...input, method: "GET" };
		const result = verifyDeviceSignature(modified, fixedNow);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("DEVICE_SIGNATURE_INVALID");
		}
	});

	it("fails when path changes", () => {
		const input = makeValidInputAt();
		const modified = { ...input, path: "/try-on/sessions" };
		const result = verifyDeviceSignature(modified, fixedNow);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("DEVICE_SIGNATURE_INVALID");
		}
	});

	it("fails when bodyHash changes", () => {
		const input = makeValidInputAt();
		const modified = {
			...input,
			bodyHash:
				"0000000000000000000000000000000000000000000000000000000000000000",
		};
		const result = verifyDeviceSignature(modified, fixedNow);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("DEVICE_SIGNATURE_INVALID");
		}
	});

	it("handles different-length signatures without throwing", () => {
		const input = makeValidInputAt({ signature: "short" });
		expect(() => verifyDeviceSignature(input, fixedNow)).not.toThrow();
		const result = verifyDeviceSignature(input, fixedNow);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("DEVICE_SIGNATURE_INVALID");
		}
	});

	it("handles empty signature string without throwing", () => {
		const input = makeValidInputAt({ signature: "" });
		expect(() => verifyDeviceSignature(input, fixedNow)).not.toThrow();
		const result = verifyDeviceSignature(input, fixedNow);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("DEVICE_SIGNATURE_MISSING");
		}
	});

	it("fails when nonce changes", () => {
		const input = makeValidInputAt();
		const modified = { ...input, nonce: "tampered_nonce" };
		const result = verifyDeviceSignature(modified, fixedNow);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("DEVICE_SIGNATURE_INVALID");
		}
	});

	it("fails when deviceId changes", () => {
		const input = makeValidInputAt();
		const modified = { ...input, deviceId: "dev_tampered_002" };
		const result = verifyDeviceSignature(modified, fixedNow);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("DEVICE_SIGNATURE_INVALID");
		}
	});
});

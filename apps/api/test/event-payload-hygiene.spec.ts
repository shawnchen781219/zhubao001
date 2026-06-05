/**
 * Event payload hygiene white-box tests.
 *
 * Pure unit tests for event-payload-hygiene.ts functions.
 * No NestJS testing module, no database, no external services.
 */

import { describe, expect, it } from "vitest";
import {
	type EventPayloadValidationResult,
	validateEventPayload,
} from "../src/modules/event/event-payload-hygiene.js";

function assertFail(result: EventPayloadValidationResult): asserts result is {
	ok: false;
	code: string;
	message: string;
	path: string;
} {
	expect(result.ok).toBe(false);
}

describe("validateEventPayload", () => {
	it("allows safe summary payload", () => {
		const result = validateEventPayload({
			traceId: "t-001",
			storeId: "s-001",
			deviceId: "d-001",
			tryOnSessionId: "tos-001",
			anonymousId: "anon-001",
			eventType: "DEVICE_HEARTBEAT",
			status: "ACTIVE",
			appVersion: "1.0.0",
			localTime: "2026-05-30T07:00:00Z",
			healthSummary: "ok",
		});
		expect(result.ok).toBe(true);
	});

	it("allows hash fields", () => {
		const result = validateEventPayload({
			phoneHash: "abc123",
			identityHash: "def456",
			lastSeenIpHash: "ghi789",
		});
		expect(result.ok).toBe(true);
	});

	it("rejects top-level secret key", () => {
		const result = validateEventPayload({ secret: "leaked" });
		assertFail(result);
		expect(result.code).toBe("VALIDATION_FAILED");
		expect(result.message).toContain("forbidden key");
		expect(result.message).not.toContain("leaked");
		expect(result.path).toBe("secret");
	});

	it("rejects top-level signature key", () => {
		const result = validateEventPayload({ signature: "sig-leaked" });
		assertFail(result);
		expect(result.code).toBe("VALIDATION_FAILED");
		expect(result.message).toContain("forbidden key");
		expect(result.message).not.toContain("sig-leaked");
	});

	it("rejects nested apiKey (case-insensitive)", () => {
		const result = validateEventPayload({
			system: { ApiKey: "nested-ak" },
		});
		assertFail(result);
		expect(result.code).toBe("VALIDATION_FAILED");
		expect(result.message).toContain("forbidden key");
		expect(result.message).not.toContain("nested-ak");
		expect(result.path).toBe("system.ApiKey");
	});

	it("rejects nested privateKey (case-insensitive)", () => {
		const result = validateEventPayload({
			config: { PRIVATEKEY: "nested-pk" },
		});
		assertFail(result);
		expect(result.code).toBe("VALIDATION_FAILED");
		expect(result.message).toContain("forbidden key");
		expect(result.message).not.toContain("nested-pk");
	});

	it("rejects phone key", () => {
		const result = validateEventPayload({ phone: "13800138000" });
		assertFail(result);
		expect(result.message).toContain("forbidden key");
	});

	it("rejects mobile key", () => {
		const result = validateEventPayload({ mobile: "13800138000" });
		assertFail(result);
		expect(result.message).toContain("forbidden key");
	});

	it("rejects phoneNumber key", () => {
		const result = validateEventPayload({ phoneNumber: "13800138000" });
		assertFail(result);
		expect(result.message).toContain("forbidden key");
	});

	it("rejects raw phone number value", () => {
		const result = validateEventPayload({ contact: "13800138000" });
		assertFail(result);
		expect(result.code).toBe("VALIDATION_FAILED");
		expect(result.message).toContain("raw phone number");
		expect(result.message).not.toContain("13800138000");
	});

	it("rejects openid key", () => {
		const result = validateEventPayload({ openid: "o-leaked" });
		assertFail(result);
		expect(result.message).toContain("forbidden key");
	});

	it("rejects openId key (mixed case)", () => {
		const result = validateEventPayload({ openId: "o-leaked" });
		assertFail(result);
		expect(result.message).toContain("forbidden key");
	});

	it("rejects unionid key", () => {
		const result = validateEventPayload({ unionid: "u-leaked" });
		assertFail(result);
		expect(result.message).toContain("forbidden key");
	});

	it("rejects unionId key (mixed case)", () => {
		const result = validateEventPayload({ unionId: "u-leaked" });
		assertFail(result);
		expect(result.message).toContain("forbidden key");
	});

	it("rejects rawMedia key", () => {
		const result = validateEventPayload({ rawMedia: "blob" });
		assertFail(result);
		expect(result.message).toContain("forbidden key");
	});

	it("rejects biometric key", () => {
		const result = validateEventPayload({ biometric: "face" });
		assertFail(result);
		expect(result.message).toContain("forbidden key");
	});

	it("rejects faceVector key", () => {
		const result = validateEventPayload({ faceVector: "vec" });
		assertFail(result);
		expect(result.message).toContain("forbidden key");
	});

	it("rejects raw image data URI", () => {
		const result = validateEventPayload({
			image: "data:image/png;base64,iVBORw0KGgo=",
		});
		assertFail(result);
		expect(result.code).toBe("VALIDATION_FAILED");
		expect(result.message).toContain("raw media data URI");
		expect(result.message).not.toContain("iVBORw0KGgo=");
	});

	it("rejects raw video data URI", () => {
		const result = validateEventPayload({
			clip: "data:video/mp4;base64,AAAA",
		});
		assertFail(result);
		expect(result.message).toContain("raw media data URI");
	});

	it("rejects application/octet-stream data URI", () => {
		const result = validateEventPayload({
			blob: "data:application/octet-stream;base64,BBBB",
		});
		assertFail(result);
		expect(result.message).toContain("raw media data URI");
	});

	it("rejects long base64-like string", () => {
		const base64Like = `${"a".repeat(120)}==`;
		const result = validateEventPayload({ payload: base64Like });
		assertFail(result);
		expect(result.code).toBe("VALIDATION_FAILED");
		expect(result.message).toContain("base64-like");
		expect(result.message).not.toContain(base64Like);
	});

	it("rejects nested raw media in object", () => {
		const result = validateEventPayload({
			capture: { image: "data:image/png;base64,iVBORw0KGgo=" },
		});
		assertFail(result);
		expect(result.message).toContain("raw media data URI");
		expect(result.path).toBe("capture.image");
	});

	it("rejects nested base64-like in array", () => {
		const base64Like = `${"a".repeat(120)}==`;
		const result = validateEventPayload({
			items: [{ blob: base64Like }],
		});
		assertFail(result);
		expect(result.message).toContain("base64-like");
		expect(result.path).toBe("items[0].blob");
	});

	it("rejects nested sensitive key deep in object", () => {
		const result = validateEventPayload({
			a: { b: { c: { d: { secret: "deep" } } } },
		});
		assertFail(result);
		expect(result.message).toContain("forbidden key");
		expect(result.path).toBe("a.b.c.d.secret");
	});

	it("rejects phone-like value inside array", () => {
		const result = validateEventPayload({
			contacts: ["13800138000"],
		});
		assertFail(result);
		expect(result.message).toContain("raw phone number");
		expect(result.path).toBe("contacts[0]");
	});

	it("allows phoneHash even if value looks like phone", () => {
		const result = validateEventPayload({
			phoneHash: "13800138000",
		});
		expect(result.ok).toBe(true);
	});

	it("allows short non-base64 strings", () => {
		const result = validateEventPayload({ note: "hello world" });
		expect(result.ok).toBe(true);
	});

	it("returns depth failure when nesting exceeds maxDepth", () => {
		const result = validateEventPayload(
			{ a: { b: { c: { d: { e: { f: "deep" } } } } } },
			5,
		);
		assertFail(result);
		expect(result.code).toBe("VALIDATION_FAILED");
		expect(result.message).toContain("maximum allowed nesting depth");
		expect(result.path).toBe("a.b.c.d.e.f");
	});

	it("does not leak sensitive values in failure messages", () => {
		const result = validateEventPayload({
			secret: "super-secret-value-123",
		});
		assertFail(result);
		const json = JSON.stringify(result);
		expect(json).not.toContain("super-secret-value-123");
	});
});

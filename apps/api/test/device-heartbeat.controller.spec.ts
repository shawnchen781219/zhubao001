import "reflect-metadata";
import { createHmac } from "node:crypto";
import { DomainEventType } from "@jewelry/shared";
import { HttpException, Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ApiExceptionFilter } from "../src/common/filters/api-exception.filter.js";
import { createRequestTraceMiddleware } from "../src/common/tracing/request-trace.middleware.js";
import { TraceResponseInterceptor } from "../src/common/tracing/trace-response.interceptor.js";
import { DeviceController } from "../src/modules/device/device.controller.js";
import {
	DEVICE_PORT,
	type DevicePort,
	type DeviceStatus,
} from "../src/modules/device/device.ports.js";
import { DeviceService } from "../src/modules/device/device.service.js";
import { DEVICE_AUTH_HEADERS } from "../src/modules/device/device-auth.constants.js";
import { DeviceAuthGuard } from "../src/modules/device/device-auth.guard.js";
import {
	DEVICE_AUTH_PORT,
	type DeviceAuthPort,
} from "../src/modules/device/device-auth.port.js";
import { buildSignaturePayload } from "../src/modules/device/device-auth.types.js";
import {
	EVENT_PORT,
	type EventLogInput,
	type EventPort,
} from "../src/modules/event/event.ports.js";
import { EventService } from "../src/modules/event/event.service.js";

const TEST_SECRET = "***";

class StubDeviceAuthPort implements DeviceAuthPort {
	scenario: "valid" | "notFound" | "notActive" = "valid";

	async findSecretByDeviceId(
		_deviceId: string,
	): Promise<{ verificationSecret: string; status: string } | null> {
		if (this.scenario === "notFound") return null;
		if (this.scenario === "notActive")
			return { verificationSecret: TEST_SECRET, status: "SUSPENDED" };
		return { verificationSecret: TEST_SECRET, status: "ACTIVE" };
	}
}

class StubDevicePort implements DevicePort {
	lastInput?: {
		deviceId: string;
		requestId: string;
		appVersion?: string;
		localTime?: string;
		health?: Record<string, unknown>;
	};
	heartbeatStoreId = "store_hb_001";

	async registerDevice(): Promise<{
		deviceId: string;
		deviceSecretOnce: string;
		status: DeviceStatus;
	}> {
		throw new Error("not implemented in stub");
	}

	async acceptHeartbeat(
		input: Parameters<DevicePort["acceptHeartbeat"]>[0],
	): Promise<{ serverTime: string; status: DeviceStatus; storeId: string }> {
		this.lastInput = input;
		return {
			serverTime: new Date().toISOString(),
			status: "ACTIVE",
			storeId: this.heartbeatStoreId,
		};
	}

	async assertActiveDevice(): Promise<void> {
		throw new Error("not implemented in stub");
	}
}

class StubEventPort implements EventPort {
	recorded: EventLogInput[] = [];

	async recordEvent(input: EventLogInput): Promise<void> {
		this.recorded.push(input);
	}
}

function makeSignature(
	input: Parameters<typeof buildSignaturePayload>[0],
): string {
	const payload = buildSignaturePayload(input);
	return createHmac("sha256", TEST_SECRET)
		.update(payload, "utf8")
		.digest("hex");
}

function makeValidHeaders(
	overrides?: Partial<Record<string, string>>,
): Record<string, string> {
	const now = Date.now();
	const deviceId = "dev_hb_001";
	const nonce = "nonce_hb_abc";
	const method = "POST";
	const path = "/devices/heartbeat";
	const bodyHash = "";
	const signature = makeSignature({
		deviceId,
		timestamp: now,
		nonce,
		method,
		path,
		bodyHash,
	});
	return {
		[DEVICE_AUTH_HEADERS.DEVICE_ID]: deviceId,
		[DEVICE_AUTH_HEADERS.DEVICE_SIGNATURE]: signature,
		[DEVICE_AUTH_HEADERS.DEVICE_TIMESTAMP]: String(now),
		[DEVICE_AUTH_HEADERS.DEVICE_NONCE]: nonce,
		[DEVICE_AUTH_HEADERS.BODY_HASH]: bodyHash,
		...overrides,
	};
}

async function createTestApp(scenario: "valid" | "notFound" | "notActive") {
	const authPort = new StubDeviceAuthPort();
	authPort.scenario = scenario;
	const devicePort = new StubDevicePort();
	const eventPort = new StubEventPort();

	@Module({
		controllers: [DeviceController],
		providers: [
			DeviceService,
			DeviceAuthGuard,
			EventService,
			{
				provide: DEVICE_AUTH_PORT,
				useValue: authPort,
			},
			{
				provide: DEVICE_PORT,
				useValue: devicePort,
			},
			{
				provide: EVENT_PORT,
				useValue: eventPort,
			},
		],
	})
	class TestModule {}

	const app = await NestFactory.create(TestModule, new FastifyAdapter(), {
		logger: false,
	});
	app.use(createRequestTraceMiddleware());
	app.useGlobalFilters(new ApiExceptionFilter());
	app.useGlobalInterceptors(new TraceResponseInterceptor());
	await app.listen(0, "127.0.0.1");
	const address = app.getHttpServer().address();
	const listenPort =
		typeof address === "string" ? 0 : (address as { port: number }).port;
	const baseUrl = `http://127.0.0.1:${listenPort}`;
	return { app, baseUrl, devicePort, eventPort };
}

describe("DeviceHeartbeatController", () => {
	let app: Awaited<ReturnType<typeof NestFactory.create>>;
	let baseUrl: string;
	let devicePort: StubDevicePort;
	let eventPort: StubEventPort;

	beforeAll(async () => {
		const created = await createTestApp("valid");
		app = created.app;
		baseUrl = created.baseUrl;
		devicePort = created.devicePort;
		eventPort = created.eventPort;
	});

	afterAll(async () => {
		await app.close();
	});

	beforeEach(() => {
		devicePort.lastInput = undefined;
		devicePort.heartbeatStoreId = "store_hb_001";
		eventPort.recorded = [];
	});

	it("returns serverTime and status for correct device signature", async () => {
		const headers = makeValidHeaders();
		const res = await fetch(`${baseUrl}/devices/heartbeat`, {
			method: "POST",
			headers: { ...headers, "Content-Type": "application/json" },
			body: JSON.stringify({ appVersion: "1.0.0" }),
		});
		expect(res.status).toBe(200);
		const body = (await res.json()) as {
			serverTime: string;
			status: string;
			traceId: string;
		};
		expect(typeof body.serverTime).toBe("string");
		expect(body.status).toBe("ACTIVE");
		expect(typeof body.traceId).toBe("string");
	});

	it("uses deviceId from Guard principal, not from body", async () => {
		const headers = makeValidHeaders();
		const res = await fetch(`${baseUrl}/devices/heartbeat`, {
			method: "POST",
			headers: { ...headers, "Content-Type": "application/json" },
			body: JSON.stringify({ deviceId: "tampered-device-id" }),
		});
		expect(res.status).toBe(200);
		expect(devicePort.lastInput?.deviceId).toBe("dev_hb_001");
	});

	it("returns DEVICE_SIGNATURE_MISSING when deviceId is missing", async () => {
		const headers = makeValidHeaders();
		delete headers[DEVICE_AUTH_HEADERS.DEVICE_ID];
		const res = await fetch(`${baseUrl}/devices/heartbeat`, {
			method: "POST",
			headers: { ...headers, "Content-Type": "application/json" },
			body: JSON.stringify({}),
		});
		expect(res.status).toBe(401);
		const body = (await res.json()) as { code: string; message: string };
		expect(body.code).toBe("DEVICE_SIGNATURE_MISSING");
	});

	it("returns DEVICE_SIGNATURE_INVALID for wrong signature", async () => {
		const headers = makeValidHeaders({
			[DEVICE_AUTH_HEADERS.DEVICE_SIGNATURE]: "wrongsignature",
		});
		const res = await fetch(`${baseUrl}/devices/heartbeat`, {
			method: "POST",
			headers: { ...headers, "Content-Type": "application/json" },
			body: JSON.stringify({}),
		});
		expect(res.status).toBe(401);
		const body = (await res.json()) as { code: string; message: string };
		expect(body.code).toBe("DEVICE_SIGNATURE_INVALID");
	});

	it("returns VALIDATION_FAILED when health contains secret key", async () => {
		const headers = makeValidHeaders();
		const res = await fetch(`${baseUrl}/devices/heartbeat`, {
			method: "POST",
			headers: { ...headers, "Content-Type": "application/json" },
			body: JSON.stringify({
				health: { secret: "leaked" },
			}),
		});
		expect(res.status).toBe(400);
		const body = (await res.json()) as { code: string; message: string };
		expect(body.code).toBe("VALIDATION_FAILED");
		expect(body.message).toContain("forbidden key");
		expect(body.message).not.toContain("leaked");
		expect(eventPort.recorded.length).toBe(0);
	});

	it("returns VALIDATION_FAILED when health contains signature key", async () => {
		const headers = makeValidHeaders();
		const res = await fetch(`${baseUrl}/devices/heartbeat`, {
			method: "POST",
			headers: { ...headers, "Content-Type": "application/json" },
			body: JSON.stringify({
				health: { signature: "fake-sig" },
			}),
		});
		expect(res.status).toBe(400);
		const body = (await res.json()) as { code: string; message: string };
		expect(body.code).toBe("VALIDATION_FAILED");
		expect(body.message).toContain("forbidden key");
		expect(body.message).not.toContain("fake-sig");
	});

	it("returns VALIDATION_FAILED when health contains base64-like data", async () => {
		const headers = makeValidHeaders();
		const base64Like = `${"a".repeat(120)}==`;
		const res = await fetch(`${baseUrl}/devices/heartbeat`, {
			method: "POST",
			headers: { ...headers, "Content-Type": "application/json" },
			body: JSON.stringify({
				health: { imageBlob: base64Like },
			}),
		});
		expect(res.status).toBe(400);
		const body = (await res.json()) as { code: string; message: string };
		expect(body.code).toBe("VALIDATION_FAILED");
		expect(body.message).toContain("base64-like");
		expect(body.message).not.toContain(base64Like);
	});

	it("returns VALIDATION_FAILED when health contains raw media data URI", async () => {
		const headers = makeValidHeaders();
		const res = await fetch(`${baseUrl}/devices/heartbeat`, {
			method: "POST",
			headers: { ...headers, "Content-Type": "application/json" },
			body: JSON.stringify({
				health: { capture: "data:image/png;base64,iVBORw0KGgo=" },
			}),
		});
		expect(res.status).toBe(400);
		const body = (await res.json()) as { code: string; message: string };
		expect(body.code).toBe("VALIDATION_FAILED");
		expect(body.message).toContain("raw media");
		expect(body.message).not.toContain("iVBORw0KGgo=");
	});

	it("does not leak sensitive values in error response", async () => {
		const headers = makeValidHeaders();
		const res = await fetch(`${baseUrl}/devices/heartbeat`, {
			method: "POST",
			headers: { ...headers, "Content-Type": "application/json" },
			body: JSON.stringify({
				health: { secret: "super-secret-value-123" },
			}),
		});
		const text = await res.text();
		expect(text).not.toContain("super-secret-value-123");
	});

	it("accepts heartbeat with X-Request-Id and returns traceId", async () => {
		const customId = "req_test_hb_001";
		const headers = makeValidHeaders();
		const res = await fetch(`${baseUrl}/devices/heartbeat`, {
			method: "POST",
			headers: {
				...headers,
				"Content-Type": "application/json",
				"X-Request-Id": customId,
			},
			body: JSON.stringify({ appVersion: "2.0.0" }),
		});
		expect(res.status).toBe(200);
		const body = (await res.json()) as { traceId: string };
		expect(body.traceId).toBe(customId);
	});

	it("returns VALIDATION_FAILED for privateKey in health", async () => {
		const headers = makeValidHeaders();
		const res = await fetch(`${baseUrl}/devices/heartbeat`, {
			method: "POST",
			headers: { ...headers, "Content-Type": "application/json" },
			body: JSON.stringify({ health: { privateKey: "pk-leaked" } }),
		});
		expect(res.status).toBe(400);
		const body = (await res.json()) as { code: string; message: string };
		expect(body.code).toBe("VALIDATION_FAILED");
		expect(body.message).toContain("forbidden key");
		expect(body.message).not.toContain("pk-leaked");
	});

	it("returns VALIDATION_FAILED for apiKey in health", async () => {
		const headers = makeValidHeaders();
		const res = await fetch(`${baseUrl}/devices/heartbeat`, {
			method: "POST",
			headers: { ...headers, "Content-Type": "application/json" },
			body: JSON.stringify({ health: { apiKey: "ak-leaked" } }),
		});
		expect(res.status).toBe(400);
		const body = (await res.json()) as { code: string; message: string };
		expect(body.code).toBe("VALIDATION_FAILED");
		expect(body.message).toContain("forbidden key");
		expect(body.message).not.toContain("ak-leaked");
	});

	it("returns VALIDATION_FAILED for token in health", async () => {
		const headers = makeValidHeaders();
		const res = await fetch(`${baseUrl}/devices/heartbeat`, {
			method: "POST",
			headers: { ...headers, "Content-Type": "application/json" },
			body: JSON.stringify({ health: { token: "tk-leaked" } }),
		});
		expect(res.status).toBe(400);
		const body = (await res.json()) as { code: string; message: string };
		expect(body.code).toBe("VALIDATION_FAILED");
		expect(body.message).toContain("forbidden key");
		expect(body.message).not.toContain("tk-leaked");
	});

	it("returns VALIDATION_FAILED for password in health", async () => {
		const headers = makeValidHeaders();
		const res = await fetch(`${baseUrl}/devices/heartbeat`, {
			method: "POST",
			headers: { ...headers, "Content-Type": "application/json" },
			body: JSON.stringify({ health: { password: "pw-leaked" } }),
		});
		expect(res.status).toBe(400);
		const body = (await res.json()) as { code: string; message: string };
		expect(body.code).toBe("VALIDATION_FAILED");
		expect(body.message).toContain("forbidden key");
		expect(body.message).not.toContain("pw-leaked");
	});

	it("returns VALIDATION_FAILED for credential in health", async () => {
		const headers = makeValidHeaders();
		const res = await fetch(`${baseUrl}/devices/heartbeat`, {
			method: "POST",
			headers: { ...headers, "Content-Type": "application/json" },
			body: JSON.stringify({ health: { credential: "cred-leaked" } }),
		});
		expect(res.status).toBe(400);
		const body = (await res.json()) as { code: string; message: string };
		expect(body.code).toBe("VALIDATION_FAILED");
		expect(body.message).toContain("forbidden key");
		expect(body.message).not.toContain("cred-leaked");
	});

	it("returns VALIDATION_FAILED for mixed-case sensitive keys (ApiKey, PRIVATEKEY)", async () => {
		const headers = makeValidHeaders();
		const res1 = await fetch(`${baseUrl}/devices/heartbeat`, {
			method: "POST",
			headers: { ...headers, "Content-Type": "application/json" },
			body: JSON.stringify({ health: { ApiKey: "mixed-ak" } }),
		});
		expect(res1.status).toBe(400);
		const body1 = (await res1.json()) as { code: string; message: string };
		expect(body1.code).toBe("VALIDATION_FAILED");
		expect(body1.message).toContain("forbidden key");
		expect(body1.message).not.toContain("mixed-ak");

		const res2 = await fetch(`${baseUrl}/devices/heartbeat`, {
			method: "POST",
			headers: { ...headers, "Content-Type": "application/json" },
			body: JSON.stringify({ health: { PRIVATEKEY: "mixed-pk" } }),
		});
		expect(res2.status).toBe(400);
		const body2 = (await res2.json()) as { code: string; message: string };
		expect(body2.code).toBe("VALIDATION_FAILED");
		expect(body2.message).toContain("forbidden key");
		expect(body2.message).not.toContain("mixed-pk");
	});

	it("returns VALIDATION_FAILED for nested sensitive key in health", async () => {
		const headers = makeValidHeaders();
		const res = await fetch(`${baseUrl}/devices/heartbeat`, {
			method: "POST",
			headers: { ...headers, "Content-Type": "application/json" },
			body: JSON.stringify({
				health: { system: { apiKey: "nested-secret" } },
			}),
		});
		expect(res.status).toBe(400);
		const body = (await res.json()) as { code: string; message: string };
		expect(body.code).toBe("VALIDATION_FAILED");
		expect(body.message).toContain("forbidden key");
		expect(body.message).not.toContain("nested-secret");
	});

	it("returns VALIDATION_FAILED for nested raw media in health", async () => {
		const headers = makeValidHeaders();
		const res = await fetch(`${baseUrl}/devices/heartbeat`, {
			method: "POST",
			headers: { ...headers, "Content-Type": "application/json" },
			body: JSON.stringify({
				health: { capture: { image: "data:image/png;base64,iVBORw0KGgo=" } },
			}),
		});
		expect(res.status).toBe(400);
		const body = (await res.json()) as { code: string; message: string };
		expect(body.code).toBe("VALIDATION_FAILED");
		expect(body.message).toContain("raw media");
		expect(body.message).not.toContain("iVBORw0KGgo=");
	});

	it("returns VALIDATION_FAILED for nested base64-like data in health", async () => {
		const headers = makeValidHeaders();
		const base64Like = `${"a".repeat(120)}==`;
		const res = await fetch(`${baseUrl}/devices/heartbeat`, {
			method: "POST",
			headers: { ...headers, "Content-Type": "application/json" },
			body: JSON.stringify({
				health: { payload: { blob: base64Like } },
			}),
		});
		expect(res.status).toBe(400);
		const body = (await res.json()) as { code: string; message: string };
		expect(body.code).toBe("VALIDATION_FAILED");
		expect(body.message).toContain("base64-like");
		expect(body.message).not.toContain(base64Like);
	});

	it("returns AUTH_FORBIDDEN when devicePrincipal is missing (direct controller call)", async () => {
		const deviceService = new DeviceService(
			new StubDevicePort(),
			new EventService(
				new StubEventPort() as unknown as Parameters<
					(typeof EventService)["constructor"]
				>[0],
			),
		);
		const controller = new DeviceController(deviceService);
		try {
			await controller.heartbeat(
				{ devicePrincipal: undefined } as unknown as Parameters<
					typeof controller.heartbeat
				>[0],
				{ health: {} } as unknown as Parameters<typeof controller.heartbeat>[1],
			);
			expect.fail("Expected HttpException to be thrown");
		} catch (err) {
			expect(err).toBeInstanceOf(HttpException);
			const response = (err as HttpException).getResponse() as {
				code: string;
				message: string;
			};
			expect(response.code).toBe("AUTH_FORBIDDEN");
			expect(response.message).toContain(
				"Device principal missing after Guard",
			);
		}
	});

	it("records DEVICE_HEARTBEAT event after successful heartbeat", async () => {
		const headers = makeValidHeaders();
		const res = await fetch(`${baseUrl}/devices/heartbeat`, {
			method: "POST",
			headers: { ...headers, "Content-Type": "application/json" },
			body: JSON.stringify({
				appVersion: "1.0.0",
				localTime: "2026-05-30T07:00:00Z",
			}),
		});
		expect(res.status).toBe(200);
		expect(eventPort.recorded.length).toBe(1);
		const event = eventPort.recorded[0];
		expect(event.eventType).toBe(DomainEventType.DeviceHeartbeat);
		expect(event.deviceId).toBe("dev_hb_001");
		expect(typeof event.traceId).toBe("string");
		expect(event.storeId).toBe("store_hb_001");
		expect(typeof event.occurredAt).toBe("string");
	});

	it("event payload contains safe summary, not full health", async () => {
		const headers = makeValidHeaders();
		const res = await fetch(`${baseUrl}/devices/heartbeat`, {
			method: "POST",
			headers: { ...headers, "Content-Type": "application/json" },
			body: JSON.stringify({
				appVersion: "2.0.0",
				health: { cpu: "12%", memory: "45%" },
			}),
		});
		expect(res.status).toBe(200);
		expect(eventPort.recorded.length).toBe(1);
		const event = eventPort.recorded[0];
		expect(event.payload).toBeDefined();
		expect(event.payload?.appVersion).toBe("2.0.0");
		expect(event.payload?.healthSummary).toEqual({
			healthKeys: ["cpu", "memory"],
			healthKeyCount: 2,
		});
		expect(event.payload?.cpu).toBeUndefined();
		expect(event.payload?.memory).toBeUndefined();
	});

	it("event traceId comes from request trace, not body", async () => {
		const customTraceId = "trace_hb_042";
		const headers = makeValidHeaders();
		const res = await fetch(`${baseUrl}/devices/heartbeat`, {
			method: "POST",
			headers: {
				...headers,
				"Content-Type": "application/json",
				"X-Request-Id": customTraceId,
			},
			body: JSON.stringify({ appVersion: "1.0.0" }),
		});
		expect(res.status).toBe(200);
		expect(eventPort.recorded.length).toBe(1);
		expect(eventPort.recorded[0].traceId).toBe(customTraceId);
	});

	it("body deviceId tampering does not affect event deviceId", async () => {
		const headers = makeValidHeaders();
		const res = await fetch(`${baseUrl}/devices/heartbeat`, {
			method: "POST",
			headers: { ...headers, "Content-Type": "application/json" },
			body: JSON.stringify({ deviceId: "tampered-device-id" }),
		});
		expect(res.status).toBe(200);
		expect(eventPort.recorded.length).toBe(1);
		expect(eventPort.recorded[0].deviceId).toBe("dev_hb_001");
	});

	it("does not record event when health validation fails", async () => {
		const headers = makeValidHeaders();
		const res = await fetch(`${baseUrl}/devices/heartbeat`, {
			method: "POST",
			headers: { ...headers, "Content-Type": "application/json" },
			body: JSON.stringify({ health: { secret: "should-block" } }),
		});
		expect(res.status).toBe(400);
		expect(eventPort.recorded.length).toBe(0);
	});

	it("returns VALIDATION_FAILED when appVersion contains base64-like data and does not call DevicePort or EventPort", async () => {
		const headers = makeValidHeaders();
		const base64Like = `${"a".repeat(120)}==`;
		const res = await fetch(`${baseUrl}/devices/heartbeat`, {
			method: "POST",
			headers: { ...headers, "Content-Type": "application/json" },
			body: JSON.stringify({ appVersion: base64Like }),
		});
		expect(res.status).toBe(400);
		const body = (await res.json()) as { code: string; message: string };
		expect(body.code).toBe("VALIDATION_FAILED");
		expect(body.message).toContain("base64-like");
		expect(body.message).not.toContain(base64Like);
		expect(devicePort.lastInput).toBeUndefined();
		expect(eventPort.recorded.length).toBe(0);
	});

	it("returns VALIDATION_FAILED when localTime contains phone-like value and does not call DevicePort or EventPort", async () => {
		const headers = makeValidHeaders();
		const res = await fetch(`${baseUrl}/devices/heartbeat`, {
			method: "POST",
			headers: { ...headers, "Content-Type": "application/json" },
			body: JSON.stringify({ localTime: "13800138000" }),
		});
		expect(res.status).toBe(400);
		const body = (await res.json()) as { code: string; message: string };
		expect(body.code).toBe("VALIDATION_FAILED");
		expect(body.message).toContain("raw phone number");
		expect(body.message).not.toContain("13800138000");
		expect(devicePort.lastInput).toBeUndefined();
		expect(eventPort.recorded.length).toBe(0);
	});

	it("heartbeat response body does not contain storeId", async () => {
		const headers = makeValidHeaders();
		const res = await fetch(`${baseUrl}/devices/heartbeat`, {
			method: "POST",
			headers: { ...headers, "Content-Type": "application/json" },
			body: JSON.stringify({ appVersion: "1.0.0" }),
		});
		expect(res.status).toBe(200);
		const body = (await res.json()) as Record<string, unknown>;
		expect(body).not.toHaveProperty("storeId");
	});

	it("returns VALIDATION_FAILED when DevicePort returns empty storeId and does not call EventPort", async () => {
		devicePort.heartbeatStoreId = "";
		const headers = makeValidHeaders();
		const res = await fetch(`${baseUrl}/devices/heartbeat`, {
			method: "POST",
			headers: { ...headers, "Content-Type": "application/json" },
			body: JSON.stringify({ appVersion: "1.0.0" }),
		});
		expect(res.status).toBe(400);
		const body = (await res.json()) as { code: string; message: string };
		expect(body.code).toBe("VALIDATION_FAILED");
		expect(body.message).toContain("storeId");
		expect(eventPort.recorded.length).toBe(0);
	});

	it("records event again after empty storeId scenario is reset", async () => {
		// heartbeatStoreId was reset to default "store_hb_001" by beforeEach
		const headers = makeValidHeaders();
		const res = await fetch(`${baseUrl}/devices/heartbeat`, {
			method: "POST",
			headers: { ...headers, "Content-Type": "application/json" },
			body: JSON.stringify({ appVersion: "1.0.0" }),
		});
		expect(res.status).toBe(200);
		expect(eventPort.recorded.length).toBe(1);
		expect(eventPort.recorded[0].storeId).toBe("store_hb_001");
	});
});

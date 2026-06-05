import "reflect-metadata";
import { createHmac } from "node:crypto";
import {
	Controller,
	Get,
	Module,
	type Request as NestRequest,
	Req,
	UseGuards,
} from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ApiExceptionFilter } from "../src/common/filters/api-exception.filter.js";
import { createRequestTraceMiddleware } from "../src/common/tracing/request-trace.middleware.js";
import { TraceResponseInterceptor } from "../src/common/tracing/trace-response.interceptor.js";
import { DEVICE_AUTH_HEADERS } from "../src/modules/device/device-auth.constants.js";
import {
	DeviceAuthGuard,
	type DevicePrincipal,
} from "../src/modules/device/device-auth.guard.js";
import {
	DEVICE_AUTH_PORT,
	type DeviceAuthPort,
} from "../src/modules/device/device-auth.port.js";
import { buildSignaturePayload } from "../src/modules/device/device-auth.types.js";

const TEST_SECRET = "test-secret-for-guard-tests";

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

@Controller("test-device-auth")
@UseGuards(DeviceAuthGuard)
class TestDeviceAuthController {
	@Get()
	getProtected(
		@Req() req: NestRequest & { devicePrincipal?: DevicePrincipal },
	) {
		return { ok: true, devicePrincipal: req.devicePrincipal };
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
	const deviceId = "dev_guard_001";
	const nonce = "nonce_guard_abc";
	const method = "GET";
	const path = "/test-device-auth";
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
	const port = new StubDeviceAuthPort();
	port.scenario = scenario;

	@Module({
		controllers: [TestDeviceAuthController],
		providers: [
			DeviceAuthGuard,
			{
				provide: DEVICE_AUTH_PORT,
				useValue: port,
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
	return { app, baseUrl };
}

describe("DeviceAuthGuard", () => {
	let app: Awaited<ReturnType<typeof NestFactory.create>>;
	let baseUrl: string;

	beforeAll(async () => {
		const created = await createTestApp("valid");
		app = created.app;
		baseUrl = created.baseUrl;
	});

	afterAll(async () => {
		await app.close();
	});

	it("returns DEVICE_SIGNATURE_MISSING when deviceId is missing", async () => {
		const headers = makeValidHeaders();
		delete headers[DEVICE_AUTH_HEADERS.DEVICE_ID];
		const res = await fetch(`${baseUrl}/test-device-auth`, { headers });
		expect(res.status).toBe(401);
		const body = (await res.json()) as { code: string; message: string };
		expect(body.code).toBe("DEVICE_SIGNATURE_MISSING");
		expect(typeof body.message).toBe("string");
	});

	it("returns DEVICE_SIGNATURE_MISSING when signature is missing", async () => {
		const headers = makeValidHeaders();
		delete headers[DEVICE_AUTH_HEADERS.DEVICE_SIGNATURE];
		const res = await fetch(`${baseUrl}/test-device-auth`, { headers });
		expect(res.status).toBe(401);
		const body = (await res.json()) as { code: string; message: string };
		expect(body.code).toBe("DEVICE_SIGNATURE_MISSING");
	});

	it("returns DEVICE_CLOCK_SKEW for invalid timestamp", async () => {
		const headers = makeValidHeaders({
			[DEVICE_AUTH_HEADERS.DEVICE_TIMESTAMP]: "not-a-number",
		});
		const res = await fetch(`${baseUrl}/test-device-auth`, { headers });
		expect(res.status).toBe(401);
		const body = (await res.json()) as { code: string; message: string };
		expect(body.code).toBe("DEVICE_CLOCK_SKEW");
	});

	it("returns DEVICE_CLOCK_SKEW when timestamp is too old", async () => {
		const oldTs = Date.now() - 6 * 60 * 1000;
		const deviceId = "dev_guard_001";
		const nonce = "nonce_guard_abc";
		const method = "GET";
		const path = "/test-device-auth";
		const bodyHash = "";
		const signature = makeSignature({
			deviceId,
			timestamp: oldTs,
			nonce,
			method,
			path,
			bodyHash,
		});
		const headers: Record<string, string> = {
			[DEVICE_AUTH_HEADERS.DEVICE_ID]: deviceId,
			[DEVICE_AUTH_HEADERS.DEVICE_SIGNATURE]: signature,
			[DEVICE_AUTH_HEADERS.DEVICE_TIMESTAMP]: String(oldTs),
			[DEVICE_AUTH_HEADERS.DEVICE_NONCE]: nonce,
			[DEVICE_AUTH_HEADERS.BODY_HASH]: bodyHash,
		};
		const res = await fetch(`${baseUrl}/test-device-auth`, { headers });
		expect(res.status).toBe(401);
		const body = (await res.json()) as { code: string; message: string };
		expect(body.code).toBe("DEVICE_CLOCK_SKEW");
	});

	it("returns DEVICE_SIGNATURE_INVALID for wrong signature", async () => {
		const headers = makeValidHeaders({
			[DEVICE_AUTH_HEADERS.DEVICE_SIGNATURE]: "wrongsignature",
		});
		const res = await fetch(`${baseUrl}/test-device-auth`, { headers });
		expect(res.status).toBe(401);
		const body = (await res.json()) as { code: string; message: string };
		expect(body.code).toBe("DEVICE_SIGNATURE_INVALID");
	});

	it("returns DEVICE_NOT_FOUND stub when device does not exist", async () => {
		const { app: notFoundApp, baseUrl: url } = await createTestApp("notFound");
		const headers = makeValidHeaders();
		const res = await fetch(`${url}/test-device-auth`, { headers });
		expect(res.status).toBe(401);
		const body = (await res.json()) as { code: string; message: string };
		expect(body.code).toBe("DEVICE_NOT_FOUND");
		await notFoundApp.close();
	});

	it("returns DEVICE_NOT_ACTIVE stub when device is not active", async () => {
		const { app: notActiveApp, baseUrl: url } =
			await createTestApp("notActive");
		const headers = makeValidHeaders();
		const res = await fetch(`${url}/test-device-auth`, { headers });
		expect(res.status).toBe(401);
		const body = (await res.json()) as { code: string; message: string };
		expect(body.code).toBe("DEVICE_NOT_ACTIVE");
		await notActiveApp.close();
	});

	it("allows request with correct signature and attaches devicePrincipal", async () => {
		const headers = makeValidHeaders();
		const res = await fetch(`${baseUrl}/test-device-auth`, { headers });
		expect(res.status).toBe(200);
		const body = (await res.json()) as {
			ok: boolean;
			devicePrincipal?: { deviceId: string };
		};
		expect(body.ok).toBe(true);
		expect(body.devicePrincipal).toBeDefined();
		expect(body.devicePrincipal?.deviceId).toBe("dev_guard_001");
	});

	it("attached devicePrincipal does not contain secret, signature, or nonce", async () => {
		const headers = makeValidHeaders();
		const res = await fetch(`${baseUrl}/test-device-auth`, { headers });
		expect(res.status).toBe(200);
		const body = (await res.json()) as {
			ok: boolean;
			devicePrincipal?: Record<string, unknown>;
		};
		expect(body.ok).toBe(true);
		expect(body.devicePrincipal).toBeDefined();
		const principalKeys = Object.keys(body.devicePrincipal ?? {});
		expect(principalKeys).not.toContain("secret");
		expect(principalKeys).not.toContain("signature");
		expect(principalKeys).not.toContain("nonce");
		expect(body.devicePrincipal?.deviceId).toBe("dev_guard_001");
	});

	it("error response does not contain signature or secret", async () => {
		const headers = makeValidHeaders({
			[DEVICE_AUTH_HEADERS.DEVICE_SIGNATURE]: "wrongsignature",
		});
		const res = await fetch(`${baseUrl}/test-device-auth`, { headers });
		const text = await res.text();
		expect(text).not.toContain("wrongsignature");
		expect(text).not.toContain(TEST_SECRET);
	});
});

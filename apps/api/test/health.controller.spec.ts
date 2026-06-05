import "reflect-metadata";
import { Module, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { RuntimeConfigModule } from "../src/common/config/runtime-config.module.js";
import { ApiExceptionFilter } from "../src/common/filters/api-exception.filter.js";
import { createRequestTraceMiddleware } from "../src/common/tracing/request-trace.middleware.js";
import { TraceResponseInterceptor } from "../src/common/tracing/trace-response.interceptor.js";
import { HealthModule } from "../src/modules/health/health.module.js";

@Module({
	imports: [RuntimeConfigModule, HealthModule],
})
class HealthTestModule {}

describe("HealthController", () => {
	let app: Awaited<ReturnType<typeof NestFactory.create>>;
	let baseUrl: string;

	beforeAll(async () => {
		app = await NestFactory.create(HealthTestModule, new FastifyAdapter(), {
			logger: false,
		});
		app.use(createRequestTraceMiddleware());
		app.useGlobalPipes(
			new ValidationPipe({
				transform: true,
				whitelist: true,
				forbidNonWhitelisted: true,
			}),
		);
		app.useGlobalFilters(new ApiExceptionFilter());
		app.useGlobalInterceptors(new TraceResponseInterceptor());
		await app.listen(0, "127.0.0.1");
		const address = app.getHttpServer().address();
		const port =
			typeof address === "string" ? 0 : (address as { port: number }).port;
		baseUrl = `http://127.0.0.1:${port}`;
	});

	afterAll(async () => {
		await app.close();
	});

	it("GET /healthz returns ok with required fields", async () => {
		const res = await fetch(`${baseUrl}/healthz`);
		expect(res.status).toBe(200);
		const body = (await res.json()) as {
			status: string;
			service: string;
			timestamp: string;
			traceId: string;
		};
		expect(body.status).toBe("ok");
		expect(body.service).toBe("jewelry-api");
		expect(typeof body.timestamp).toBe("string");
		expect(typeof body.traceId).toBe("string");
		expect(body.traceId).toMatch(/^req_/);
	});

	it("GET /readyz returns dependencies", async () => {
		const res = await fetch(`${baseUrl}/readyz`);
		expect(res.status).toBe(200);
		const body = (await res.json()) as {
			status: string;
			service: string;
			timestamp: string;
			traceId: string;
			dependencies: Record<string, { status: string; provider?: string }>;
		};
		expect(body.status).toBe("ok");
		expect(body.service).toBe("jewelry-api");
		expect(typeof body.timestamp).toBe("string");
		expect(typeof body.traceId).toBe("string");
		expect(body.dependencies).toBeDefined();
	});

	it("GET /healthz with X-Request-Id preserves traceId", async () => {
		const customId = "req_test_022_healthz";
		const res = await fetch(`${baseUrl}/healthz`, {
			headers: { "X-Request-Id": customId },
		});
		const body = (await res.json()) as { traceId: string };
		expect(body.traceId).toBe(customId);
	});

	it("GET /readyz with X-Request-Id preserves traceId", async () => {
		const customId = "req_test_022_readyz";
		const res = await fetch(`${baseUrl}/readyz`, {
			headers: { "X-Request-Id": customId },
		});
		const body = (await res.json()) as { traceId: string };
		expect(body.traceId).toBe(customId);
	});

	it("GET /not-found returns RESOURCE_NOT_FOUND without stack", async () => {
		const res = await fetch(`${baseUrl}/not-found`);
		expect(res.status).toBe(404);
		const body = (await res.json()) as {
			code: string;
			message: string;
			traceId: string;
			stack?: string;
			details?: unknown;
		};
		expect(body.code).toBe("RESOURCE_NOT_FOUND");
		expect(typeof body.message).toBe("string");
		expect(typeof body.traceId).toBe("string");
		expect(body.traceId).toMatch(/^req_/);
		expect(body.stack).toBeUndefined();
		expect(body.details).toBeUndefined();
	});
});

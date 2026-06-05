import "reflect-metadata";
import { DomainEventType } from "@jewelry/shared";
import { HttpException, Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ApiExceptionFilter } from "../src/common/filters/api-exception.filter.js";
import { createRequestTraceMiddleware } from "../src/common/tracing/request-trace.middleware.js";
import { TraceResponseInterceptor } from "../src/common/tracing/trace-response.interceptor.js";
import {
	EVENT_PORT,
	type EventLogInput,
	type EventPort,
} from "../src/modules/event/event.ports.js";
import { EventService } from "../src/modules/event/event.service.js";

class StubEventPort implements EventPort {
	recorded: EventLogInput[] = [];

	async recordEvent(input: EventLogInput): Promise<void> {
		this.recorded.push(input);
	}
}

function createService() {
	const port = new StubEventPort();
	const service = new EventService(port);
	return { service, port };
}

describe("EventService", () => {
	describe("recordEvent", () => {
		it("calls EventPort.recordEvent for safe payload", async () => {
			const { service, port } = createService();
			const input: EventLogInput = {
				storeId: "store_001",
				eventType: DomainEventType.TryOnStarted,
				occurredAt: new Date().toISOString(),
				traceId: "trace-safe-001",
				payload: { productId: "prod_001", durationSeconds: 30 },
			};
			await service.recordEvent(input);
			expect(port.recorded).toHaveLength(1);
			expect(port.recorded[0].eventType).toBe(DomainEventType.TryOnStarted);
			expect(port.recorded[0].payload).toEqual({
				productId: "prod_001",
				durationSeconds: 30,
			});
		});

		it("calls EventPort.recordEvent when payload is undefined", async () => {
			const { service, port } = createService();
			const input: EventLogInput = {
				storeId: "store_001",
				eventType: DomainEventType.TryOnStarted,
				occurredAt: new Date().toISOString(),
				traceId: "trace-no-payload-001",
			};
			await service.recordEvent(input);
			expect(port.recorded).toHaveLength(1);
			expect(port.recorded[0].payload).toBeUndefined();
		});

		it("throws VALIDATION_FAILED for sensitive key payload and does not call EventPort", async () => {
			const { service, port } = createService();
			const input: EventLogInput = {
				storeId: "store_001",
				eventType: DomainEventType.TryOnStarted,
				occurredAt: new Date().toISOString(),
				traceId: "trace-secret-001",
				payload: { secret: "should-not-be-here" },
			};
			try {
				await service.recordEvent(input);
				expect.fail("Expected HttpException to be thrown");
			} catch (err) {
				expect(err).toBeInstanceOf(HttpException);
				const response = (err as HttpException).getResponse() as {
					code: string;
					message: string;
				};
				expect(response.code).toBe("VALIDATION_FAILED");
				expect(response.message).toContain("forbidden key");
			}
			expect(port.recorded).toHaveLength(0);
		});

		it("throws VALIDATION_FAILED for raw phone value and does not call EventPort", async () => {
			const { service, port } = createService();
			const input: EventLogInput = {
				storeId: "store_001",
				eventType: DomainEventType.CustomerCreated,
				occurredAt: new Date().toISOString(),
				traceId: "trace-phone-001",
				payload: { contact: "13800138000" },
			};
			try {
				await service.recordEvent(input);
				expect.fail("Expected HttpException to be thrown");
			} catch (err) {
				expect(err).toBeInstanceOf(HttpException);
				const response = (err as HttpException).getResponse() as {
					code: string;
					message: string;
				};
				expect(response.code).toBe("VALIDATION_FAILED");
				expect(response.message).toContain("raw phone number");
			}
			expect(port.recorded).toHaveLength(0);
		});

		it("throws VALIDATION_FAILED for raw OpenID key and does not call EventPort", async () => {
			const { service, port } = createService();
			const input: EventLogInput = {
				storeId: "store_001",
				eventType: DomainEventType.CustomerAuthorized,
				occurredAt: new Date().toISOString(),
				traceId: "trace-openid-001",
				payload: { openid: "oXxxxxx" },
			};
			try {
				await service.recordEvent(input);
				expect.fail("Expected HttpException to be thrown");
			} catch (err) {
				expect(err).toBeInstanceOf(HttpException);
				const response = (err as HttpException).getResponse() as {
					code: string;
					message: string;
				};
				expect(response.code).toBe("VALIDATION_FAILED");
				expect(response.message).toContain("forbidden key");
			}
			expect(port.recorded).toHaveLength(0);
		});

		it("throws VALIDATION_FAILED for raw media data URI and does not call EventPort", async () => {
			const { service, port } = createService();
			const input: EventLogInput = {
				storeId: "store_001",
				eventType: DomainEventType.MediaAuthorized,
				occurredAt: new Date().toISOString(),
				traceId: "trace-media-001",
				payload: { preview: "data:image/png;base64,iVBORw0KGgo=" },
			};
			try {
				await service.recordEvent(input);
				expect.fail("Expected HttpException to be thrown");
			} catch (err) {
				expect(err).toBeInstanceOf(HttpException);
				const response = (err as HttpException).getResponse() as {
					code: string;
					message: string;
				};
				expect(response.code).toBe("VALIDATION_FAILED");
				expect(response.message).toContain("raw media");
			}
			expect(port.recorded).toHaveLength(0);
		});

		it("throws VALIDATION_FAILED for base64-like data and does not call EventPort", async () => {
			const { service, port } = createService();
			const base64Like = `${"a".repeat(120)}==`;
			const input: EventLogInput = {
				storeId: "store_001",
				eventType: DomainEventType.TryOnCompleted,
				occurredAt: new Date().toISOString(),
				traceId: "trace-b64-001",
				payload: { blob: base64Like },
			};
			try {
				await service.recordEvent(input);
				expect.fail("Expected HttpException to be thrown");
			} catch (err) {
				expect(err).toBeInstanceOf(HttpException);
				const response = (err as HttpException).getResponse() as {
					code: string;
					message: string;
				};
				expect(response.code).toBe("VALIDATION_FAILED");
				expect(response.message).toContain("base64-like");
			}
			expect(port.recorded).toHaveLength(0);
		});

		it("error response does not contain original sensitive value", async () => {
			const { service } = createService();
			const input: EventLogInput = {
				storeId: "store_001",
				eventType: DomainEventType.TryOnStarted,
				occurredAt: new Date().toISOString(),
				traceId: "trace-leak-001",
				payload: { secret: "super-secret-value-123" },
			};
			try {
				await service.recordEvent(input);
				expect.fail("Expected HttpException to be thrown");
			} catch (err) {
				expect(err).toBeInstanceOf(HttpException);
				const response = (err as HttpException).getResponse() as {
					code: string;
					message: string;
				};
				expect(response.code).toBe("VALIDATION_FAILED");
				expect(response.message).not.toContain("super-secret-value-123");
			}
		});

		it("allows safe payload with hash fields", async () => {
			const { service, port } = createService();
			const input: EventLogInput = {
				storeId: "store_001",
				eventType: DomainEventType.CustomerCreated,
				occurredAt: new Date().toISOString(),
				traceId: "trace-hash-001",
				payload: { phoneHash: "abc123", identityHash: "def456" },
			};
			await service.recordEvent(input);
			expect(port.recorded).toHaveLength(1);
			expect(port.recorded[0].payload).toEqual({
				phoneHash: "abc123",
				identityHash: "def456",
			});
		});

		it("throws VALIDATION_FAILED for nested sensitive key", async () => {
			const { service, port } = createService();
			const input: EventLogInput = {
				storeId: "store_001",
				eventType: DomainEventType.TryOnStarted,
				occurredAt: new Date().toISOString(),
				traceId: "trace-nested-001",
				payload: { system: { apiKey: "nested-secret" } },
			};
			try {
				await service.recordEvent(input);
				expect.fail("Expected HttpException to be thrown");
			} catch (err) {
				expect(err).toBeInstanceOf(HttpException);
				const response = (err as HttpException).getResponse() as {
					code: string;
					message: string;
				};
				expect(response.code).toBe("VALIDATION_FAILED");
				expect(response.message).toContain("forbidden key");
			}
			expect(port.recorded).toHaveLength(0);
		});
	});

	describe("assertPayloadSafe", () => {
		it("does not throw for safe payload", () => {
			const { service } = createService();
			expect(() =>
				service.assertPayloadSafe(
					{ productId: "prod_001" },
					"trace-assert-safe-001",
				),
			).not.toThrow();
		});

		it("throws VALIDATION_FAILED for dangerous payload", () => {
			const { service } = createService();
			try {
				service.assertPayloadSafe(
					{ token: "leaked-token" },
					"trace-assert-danger-001",
				);
				expect.fail("Expected HttpException to be thrown");
			} catch (err) {
				expect(err).toBeInstanceOf(HttpException);
				const response = (err as HttpException).getResponse() as {
					code: string;
					message: string;
					traceId: string;
				};
				expect(response.code).toBe("VALIDATION_FAILED");
				expect(response.message).toContain("forbidden key");
				expect(response.traceId).toBe("trace-assert-danger-001");
				expect(response.message).not.toContain("leaked-token");
			}
		});
	});

	describe("EVENT_PORT injection", () => {
		let app: Awaited<ReturnType<typeof NestFactory.create>>;
		let service: EventService;

		beforeAll(async () => {
			const stubPort: EventPort = {
				async recordEvent(): Promise<void> {},
			};

			@Module({
				providers: [
					EventService,
					{
						provide: EVENT_PORT,
						useValue: stubPort,
					},
				],
			})
			class TestModule {}

			app = await NestFactory.create(TestModule, new FastifyAdapter(), {
				logger: false,
			});
			app.use(createRequestTraceMiddleware());
			app.useGlobalFilters(new ApiExceptionFilter());
			app.useGlobalInterceptors(new TraceResponseInterceptor());
			await app.listen(0, "127.0.0.1");

			service = app.get(EventService);
		});

		afterAll(async () => {
			await app.close();
		});

		it("resolves EventService with injected EVENT_PORT stub", async () => {
			expect(service).toBeInstanceOf(EventService);
			await expect(
				service.recordEvent({
					storeId: "store_001",
					eventType: DomainEventType.TryOnStarted,
					occurredAt: new Date().toISOString(),
					traceId: "trace-inject-001",
					payload: { safe: true },
				}),
			).resolves.not.toThrow();
		});
	});
});

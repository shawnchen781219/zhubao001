import { DomainEventType } from "@jewelry/shared";
import { HttpException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import type { EventLogInput } from "../src/modules/event/event.ports.js";
import {
	type EventLogCreateData,
	type EventLogDelegate,
	PrismaEventPort,
} from "../src/modules/event/event.prisma-adapter.js";
import { EventService } from "../src/modules/event/event.service.js";

function createFakeDelegate(): {
	delegate: EventLogDelegate;
	calls: { data: EventLogCreateData }[];
} {
	const calls: { data: EventLogCreateData }[] = [];
	const delegate: EventLogDelegate = {
		eventLog: {
			async create(args: { data: EventLogCreateData }): Promise<unknown> {
				calls.push(args);
				return { id: "evt_fake_001" };
			},
		},
	};
	return { delegate, calls };
}

function createCombinedService() {
	const { delegate, calls } = createFakeDelegate();
	const prismaPort = new PrismaEventPort(delegate);
	const service = new EventService(prismaPort);
	return { service, delegate, calls };
}

describe("EventService + PrismaEventPort integration", () => {
	describe("safe payload reaches fake delegate", () => {
		it("safe device heartbeat is mapped to Prisma-shaped data and written to delegate", async () => {
			const { service, calls } = createCombinedService();
			const fixedIso = "2026-05-30T12:00:00.000Z";
			const input: EventLogInput = {
				storeId: "store_001",
				eventType: DomainEventType.DeviceHeartbeat,
				occurredAt: fixedIso,
				traceId: "trace-hb-001",
				deviceId: "dev_001",
				payload: { status: "ok", temperature: 42 },
			};

			await service.recordEvent(input);

			expect(calls).toHaveLength(1);
			const data = calls[0].data;
			expect(data.storeId).toBe("store_001");
			expect(data.eventType).toBe(DomainEventType.DeviceHeartbeat);
			expect(data.occurredAt).toBeInstanceOf(Date);
			expect(data.occurredAt.toISOString()).toBe(fixedIso);
			expect(data.deviceId).toBe("dev_001");
			expect(data.payload).toEqual({ status: "ok", temperature: 42 });
			expect(data).not.toHaveProperty("traceId");
		});

		it("safe event without payload is written to delegate", async () => {
			const { service, calls } = createCombinedService();
			const input: EventLogInput = {
				storeId: "store_002",
				eventType: DomainEventType.TryOnStarted,
				occurredAt: "2026-05-30T12:00:00.000Z",
				traceId: "trace-min-001",
				customerId: "cust_001",
			};

			await service.recordEvent(input);

			expect(calls).toHaveLength(1);
			const data = calls[0].data;
			expect(data.customerId).toBe("cust_001");
			expect(data).not.toHaveProperty("payload");
			expect(data).not.toHaveProperty("traceId");
		});
	});

	describe("dangerous payload is rejected by EventService before reaching delegate", () => {
		it("forbidden key 'secret' causes VALIDATION_FAILED and delegate is not called", async () => {
			const { service, calls } = createCombinedService();
			const input: EventLogInput = {
				storeId: "store_001",
				eventType: DomainEventType.TryOnStarted,
				occurredAt: "2026-05-30T12:00:00.000Z",
				traceId: "trace-secret-001",
				payload: { secret: "leaked" },
			};

			try {
				await service.recordEvent(input);
				expect.fail("Expected HttpException");
			} catch (err) {
				expect(err).toBeInstanceOf(HttpException);
				const response = (err as HttpException).getResponse() as {
					code: string;
					message: string;
				};
				expect(response.code).toBe("VALIDATION_FAILED");
				expect(response.message).toContain("forbidden key");
			}
			expect(calls).toHaveLength(0);
		});

		it("raw phone number causes VALIDATION_FAILED and delegate is not called", async () => {
			const { service, calls } = createCombinedService();
			const input: EventLogInput = {
				storeId: "store_001",
				eventType: DomainEventType.CustomerCreated,
				occurredAt: "2026-05-30T12:00:00.000Z",
				traceId: "trace-phone-001",
				payload: { contact: "13800138000" },
			};

			try {
				await service.recordEvent(input);
				expect.fail("Expected HttpException");
			} catch (err) {
				expect(err).toBeInstanceOf(HttpException);
				const response = (err as HttpException).getResponse() as {
					code: string;
					message: string;
				};
				expect(response.code).toBe("VALIDATION_FAILED");
				expect(response.message).toContain("raw phone number");
			}
			expect(calls).toHaveLength(0);
		});

		it("raw media data URI causes VALIDATION_FAILED and delegate is not called", async () => {
			const { service, calls } = createCombinedService();
			const input: EventLogInput = {
				storeId: "store_001",
				eventType: DomainEventType.MediaAuthorized,
				occurredAt: "2026-05-30T12:00:00.000Z",
				traceId: "trace-media-001",
				payload: { preview: "data:image/png;base64,iVBORw0KGgo=" },
			};

			try {
				await service.recordEvent(input);
				expect.fail("Expected HttpException");
			} catch (err) {
				expect(err).toBeInstanceOf(HttpException);
				const response = (err as HttpException).getResponse() as {
					code: string;
					message: string;
				};
				expect(response.code).toBe("VALIDATION_FAILED");
				expect(response.message).toContain("raw media");
			}
			expect(calls).toHaveLength(0);
		});

		it("error response does not leak original dangerous value", async () => {
			const { service, calls } = createCombinedService();
			const input: EventLogInput = {
				storeId: "store_001",
				eventType: DomainEventType.TryOnStarted,
				occurredAt: "2026-05-30T12:00:00.000Z",
				traceId: "trace-leak-001",
				payload: { secret: "super-secret-value-123" },
			};

			try {
				await service.recordEvent(input);
				expect.fail("Expected HttpException");
			} catch (err) {
				expect(err).toBeInstanceOf(HttpException);
				const response = (err as HttpException).getResponse() as {
					code: string;
					message: string;
				};
				expect(response.code).toBe("VALIDATION_FAILED");
				expect(response.message).not.toContain("super-secret-value-123");
			}
			expect(calls).toHaveLength(0);
		});
	});

	describe("payload traceId policy", () => {
		it("traceId inside payload is NOT rejected by EventService hygiene; adapter maps it faithfully", async () => {
			// Current policy: EventService does NOT treat "traceId" as a sensitive key.
			// Therefore it passes through to PrismaEventPort, which maps it into data.payload.
			const { service, calls } = createCombinedService();
			const input: EventLogInput = {
				storeId: "store_001",
				eventType: DomainEventType.TryOnStarted,
				occurredAt: "2026-05-30T12:00:00.000Z",
				traceId: "trace-service-001",
				payload: { traceId: "payload-trace-id", action: "scan" },
			};

			await service.recordEvent(input);

			expect(calls).toHaveLength(1);
			const data = calls[0].data;
			expect(data.payload).toEqual({
				traceId: "payload-trace-id",
				action: "scan",
			});
			// input.traceId is NOT written into Prisma data (adapter responsibility)
			expect(data).not.toHaveProperty("traceId");
		});
	});

	describe("PrismaEventPort validation still works under EventService", () => {
		it("empty storeId is rejected by PrismaEventPort before delegate, not by EventService hygiene", async () => {
			const { service, calls } = createCombinedService();
			const input: EventLogInput = {
				storeId: "",
				eventType: DomainEventType.DeviceHeartbeat,
				occurredAt: "2026-05-30T12:00:00.000Z",
				traceId: "trace-empty-store-001",
				payload: { safe: true },
			};

			// EventService hygiene allows this payload (safe key)
			// PrismaEventPort rejects empty storeId
			try {
				await service.recordEvent(input);
				expect.fail("Expected HttpException");
			} catch (err) {
				expect(err).toBeInstanceOf(HttpException);
				const response = (err as HttpException).getResponse() as {
					code: string;
					message: string;
				};
				expect(response.code).toBe("VALIDATION_FAILED");
				expect(response.message).toContain("storeId");
			}
			expect(calls).toHaveLength(0);
		});

		it("invalid occurredAt is rejected by PrismaEventPort before delegate", async () => {
			const { service, calls } = createCombinedService();
			const input: EventLogInput = {
				storeId: "store_001",
				eventType: DomainEventType.DeviceHeartbeat,
				occurredAt: "not-a-date",
				traceId: "trace-bad-date-001",
				payload: { safe: true },
			};

			try {
				await service.recordEvent(input);
				expect.fail("Expected HttpException");
			} catch (err) {
				expect(err).toBeInstanceOf(HttpException);
				const response = (err as HttpException).getResponse() as {
					code: string;
					message: string;
				};
				expect(response.code).toBe("VALIDATION_FAILED");
				expect(response.message).toContain("occurredAt");
			}
			expect(calls).toHaveLength(0);
		});
	});
});

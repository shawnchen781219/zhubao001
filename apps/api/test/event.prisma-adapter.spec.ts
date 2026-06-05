import { DomainEventType } from "@jewelry/shared";
import { HttpException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import type {
	EventLogInput,
	EventPort,
} from "../src/modules/event/event.ports.js";
import {
	type EventLogCreateData,
	type EventLogDelegate,
	PrismaEventPort,
} from "../src/modules/event/event.prisma-adapter.js";

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

describe("PrismaEventPort", () => {
	describe("type contract", () => {
		it("implements EventPort", () => {
			const { delegate } = createFakeDelegate();
			const port: EventPort = new PrismaEventPort(delegate);
			expect(port).toBeDefined();
			expect(typeof port.recordEvent).toBe("function");
		});
	});

	describe("safe event mapping", () => {
		it("maps device heartbeat input to eventLog.create data correctly", async () => {
			const { delegate, calls } = createFakeDelegate();
			const port = new PrismaEventPort(delegate);
			const fixedIso = "2026-05-30T12:00:00.000Z";
			const input: EventLogInput = {
				storeId: "store_001",
				eventType: DomainEventType.DeviceHeartbeat,
				occurredAt: fixedIso,
				traceId: "trace-hb-001",
				deviceId: "dev_001",
				payload: { status: "ok" },
			};

			await port.recordEvent(input);

			expect(calls).toHaveLength(1);
			const data = calls[0].data;
			expect(data.storeId).toBe("store_001");
			expect(data.eventType).toBe(DomainEventType.DeviceHeartbeat);
			expect(data.occurredAt).toBeInstanceOf(Date);
			expect(data.occurredAt.toISOString()).toBe(fixedIso);
			expect(data.deviceId).toBe("dev_001");
			expect(data.payload).toEqual({ status: "ok" });
		});

		it("does not include traceId in Prisma data", async () => {
			const { delegate, calls } = createFakeDelegate();
			const port = new PrismaEventPort(delegate);
			const input: EventLogInput = {
				storeId: "store_001",
				eventType: DomainEventType.DeviceHeartbeat,
				occurredAt: "2026-05-30T12:00:00.000Z",
				traceId: "trace-secret-001",
				deviceId: "dev_001",
			};

			await port.recordEvent(input);

			expect(calls).toHaveLength(1);
			const data = calls[0].data;
			expect(data).not.toHaveProperty("traceId");
		});

		it("does NOT clean traceId inside input.payload; that is EventService's hygiene responsibility", async () => {
			const { delegate, calls } = createFakeDelegate();
			const port = new PrismaEventPort(delegate);
			const input: EventLogInput = {
				storeId: "store_001",
				eventType: DomainEventType.TryOnStarted,
				occurredAt: "2026-05-30T12:00:00.000Z",
				traceId: "trace-adapter-001",
				payload: { traceId: "payload-trace-id", action: "scan" },
			};

			await port.recordEvent(input);

			expect(calls).toHaveLength(1);
			const data = calls[0].data;
			expect(data.payload).toEqual({
				traceId: "payload-trace-id",
				action: "scan",
			});
		});
	});

	describe("optional fields omitted", () => {
		it("does not write optional fields when undefined", async () => {
			const { delegate, calls } = createFakeDelegate();
			const port = new PrismaEventPort(delegate);
			const input: EventLogInput = {
				storeId: "store_002",
				eventType: DomainEventType.TryOnStarted,
				occurredAt: "2026-05-30T12:00:00.000Z",
				traceId: "trace-min-001",
			};

			await port.recordEvent(input);

			expect(calls).toHaveLength(1);
			const data = calls[0].data;
			expect(data).not.toHaveProperty("deviceId");
			expect(data).not.toHaveProperty("customerId");
			expect(data).not.toHaveProperty("anonymousId");
			expect(data).not.toHaveProperty("tryOnSessionId");
			expect(data).not.toHaveProperty("payload");
		});
	});

	describe("validation failures", () => {
		it("rejects empty storeId and does not call delegate", async () => {
			const { delegate, calls } = createFakeDelegate();
			const port = new PrismaEventPort(delegate);
			const input: EventLogInput = {
				storeId: "",
				eventType: DomainEventType.DeviceHeartbeat,
				occurredAt: "2026-05-30T12:00:00.000Z",
				traceId: "trace-empty-store-001",
			};

			try {
				await port.recordEvent(input);
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

		it("rejects whitespace-only storeId and does not call delegate", async () => {
			const { delegate, calls } = createFakeDelegate();
			const port = new PrismaEventPort(delegate);
			const input: EventLogInput = {
				storeId: "   ",
				eventType: DomainEventType.DeviceHeartbeat,
				occurredAt: "2026-05-30T12:00:00.000Z",
				traceId: "trace-ws-store-001",
			};

			try {
				await port.recordEvent(input);
				expect.fail("Expected HttpException");
			} catch (err) {
				expect(err).toBeInstanceOf(HttpException);
				const response = (err as HttpException).getResponse() as {
					code: string;
					message: string;
				};
				expect(response.code).toBe("VALIDATION_FAILED");
			}
			expect(calls).toHaveLength(0);
		});

		it("rejects invalid occurredAt and does not call delegate", async () => {
			const { delegate, calls } = createFakeDelegate();
			const port = new PrismaEventPort(delegate);
			const input: EventLogInput = {
				storeId: "store_003",
				eventType: DomainEventType.DeviceHeartbeat,
				occurredAt: "not-a-date",
				traceId: "trace-bad-date-001",
			};

			try {
				await port.recordEvent(input);
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

		it("rejects numeric string as occurredAt and does not call delegate", async () => {
			const { delegate, calls } = createFakeDelegate();
			const port = new PrismaEventPort(delegate);
			const input: EventLogInput = {
				storeId: "store_003",
				eventType: DomainEventType.DeviceHeartbeat,
				occurredAt: "1234567890",
				traceId: "trace-num-date-001",
			};

			try {
				await port.recordEvent(input);
				expect.fail("Expected HttpException");
			} catch (err) {
				expect(err).toBeInstanceOf(HttpException);
				const response = (err as HttpException).getResponse() as {
					code: string;
					message: string;
				};
				expect(response.code).toBe("VALIDATION_FAILED");
			}
			expect(calls).toHaveLength(0);
		});
	});
});

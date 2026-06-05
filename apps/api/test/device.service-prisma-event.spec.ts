import { DomainEventType } from "@jewelry/shared";
import { HttpException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { API_ERROR_CODES } from "../src/common/errors/error-codes.js";
import type {
	DeviceHeartbeatInput,
	DeviceHeartbeatResult,
	DevicePort,
	DeviceStatus,
} from "../src/modules/device/device.ports.js";
import { DeviceService } from "../src/modules/device/device.service.js";
import type {
	EventLogCreateData,
	EventLogDelegate,
} from "../src/modules/event/event.prisma-adapter.js";
import { PrismaEventPort } from "../src/modules/event/event.prisma-adapter.js";
import { EventService } from "../src/modules/event/event.service.js";

/* ------------------------------------------------------------------ */
/* Fakes                                                               */
/* ------------------------------------------------------------------ */

function createFakeDevicePort(): {
	port: DevicePort;
	calls: DeviceHeartbeatInput[];
	scenario: { storeId: string; status: DeviceStatus };
} {
	const calls: DeviceHeartbeatInput[] = [];
	const scenario = {
		storeId: "store_comb_001",
		status: "ACTIVE" as DeviceStatus,
	};

	const port: DevicePort = {
		async registerDevice(): Promise<{
			deviceId: string;
			deviceSecretOnce: string;
			status: DeviceStatus;
		}> {
			throw new Error("not implemented");
		},
		async acceptHeartbeat(
			input: DeviceHeartbeatInput,
		): Promise<DeviceHeartbeatResult> {
			calls.push(input);
			return {
				serverTime: new Date().toISOString(),
				status: scenario.status,
				storeId: scenario.storeId,
			};
		},
		async assertActiveDevice(): Promise<void> {
			throw new Error("not implemented");
		},
	};

	return { port, calls, scenario };
}

function createFakeEventLogDelegate(): {
	delegate: EventLogDelegate;
	calls: { data: EventLogCreateData }[];
} {
	const calls: { data: EventLogCreateData }[] = [];
	const delegate: EventLogDelegate = {
		eventLog: {
			async create(args: { data: EventLogCreateData }): Promise<unknown> {
				calls.push(args);
				return { id: "evt_comb_001" };
			},
		},
	};
	return { delegate, calls };
}

function createCombinedService() {
	const {
		port: devicePort,
		calls: deviceCalls,
		scenario,
	} = createFakeDevicePort();
	const { delegate: eventDelegate, calls: eventCalls } =
		createFakeEventLogDelegate();
	const prismaPort = new PrismaEventPort(eventDelegate);
	const eventService = new EventService(prismaPort);
	const deviceService = new DeviceService(devicePort, eventService);
	return {
		deviceService,
		eventService,
		devicePort,
		deviceCalls,
		eventDelegate,
		eventCalls,
		scenario,
	};
}

/* ------------------------------------------------------------------ */
/* Tests                                                               */
/* ------------------------------------------------------------------ */

describe("DeviceService + EventService + PrismaEventPort integration", () => {
	describe("successful heartbeat writes safe summary to EventLog delegate", () => {
		it("calls DevicePort once and writes Prisma-shaped DEVICE_HEARTBEAT data", async () => {
			const { deviceService, deviceCalls, eventCalls, scenario } =
				createCombinedService();

			const deviceId = "dev_comb_001";
			const requestId = "req_comb_001";
			const body = {
				appVersion: "1.2.3",
				localTime: "2026-05-30T12:00:00+08:00",
				health: { cpu: 42, memory: 128 },
			};

			const result = await deviceService.acceptHeartbeat({
				deviceId,
				requestId,
				body,
			});

			// DevicePort called once with expected inputs
			expect(deviceCalls).toHaveLength(1);
			expect(deviceCalls[0].deviceId).toBe(deviceId);
			expect(deviceCalls[0].requestId).toBe(requestId);
			expect(deviceCalls[0].appVersion).toBe(body.appVersion);
			expect(deviceCalls[0].localTime).toBe(body.localTime);
			expect(deviceCalls[0].health).toEqual(body.health);

			// API return value
			expect(typeof result.serverTime).toBe("string");
			expect(result.status).toBe(scenario.status);

			// EventLog delegate called once
			expect(eventCalls).toHaveLength(1);
			const data = eventCalls[0].data;

			// Prisma-shaped assertions
			expect(data.storeId).toBe(scenario.storeId);
			expect(data.eventType).toBe(DomainEventType.DeviceHeartbeat);
			expect(data.occurredAt).toBeInstanceOf(Date);
			expect(data.deviceId).toBe(deviceId);
			expect(data).not.toHaveProperty("traceId");
			expect(data).not.toHaveProperty("customerId");
			expect(data).not.toHaveProperty("anonymousId");
			expect(data).not.toHaveProperty("tryOnSessionId");

			// Payload contains safe summary only
			expect(data.payload).toBeDefined();
			const payload = data.payload as Record<string, unknown>;
			expect(payload.appVersion).toBe(body.appVersion);
			expect(payload.localTime).toBe(body.localTime);
			expect(payload.status).toBe(scenario.status);
			expect(payload.healthSummary).toEqual({
				healthKeys: ["cpu", "memory"],
				healthKeyCount: 2,
			});

			// Must NOT contain full raw health
			expect(payload).not.toHaveProperty("health");
			expect(payload).not.toHaveProperty("cpu");
			expect(payload).not.toHaveProperty("memory");
		});

		it("heartbeat without optional fields writes minimal safe payload", async () => {
			const { deviceService, deviceCalls, eventCalls } =
				createCombinedService();

			const deviceId = "dev_comb_002";
			const requestId = "req_comb_002";

			const result = await deviceService.acceptHeartbeat({
				deviceId,
				requestId,
				body: {},
			});

			expect(deviceCalls).toHaveLength(1);
			expect(result.status).toBe("ACTIVE");
			expect(eventCalls).toHaveLength(1);

			const data = eventCalls[0].data;
			expect(data.eventType).toBe(DomainEventType.DeviceHeartbeat);
			expect(data.deviceId).toBe(deviceId);
			expect(data.payload).toBeDefined();
			const payload = data.payload as Record<string, unknown>;
			expect(payload).toHaveProperty("status");
			expect(payload).not.toHaveProperty("healthSummary");
			expect(payload).not.toHaveProperty("appVersion");
			expect(payload).not.toHaveProperty("localTime");
		});
	});

	describe("dangerous client input is intercepted before DevicePort and EventLog delegate", () => {
		it("base64-like appVersion returns VALIDATION_FAILED and does not call DevicePort or delegate", async () => {
			const { deviceService, deviceCalls, eventCalls } =
				createCombinedService();
			const base64Like = `${"a".repeat(120)}==`;

			try {
				await deviceService.acceptHeartbeat({
					deviceId: "dev_comb_003",
					requestId: "req_comb_003",
					body: { appVersion: base64Like },
				});
				expect.fail("Expected HttpException");
			} catch (err) {
				expect(err).toBeInstanceOf(HttpException);
				const response = (err as HttpException).getResponse() as {
					code: string;
					message: string;
				};
				expect(response.code).toBe(API_ERROR_CODES.validationFailed);
				expect(response.message).toContain("base64-like");
				expect(response.message).not.toContain(base64Like);
			}
			expect(deviceCalls).toHaveLength(0);
			expect(eventCalls).toHaveLength(0);
		});

		it("raw phone number in localTime returns VALIDATION_FAILED and does not call DevicePort or delegate", async () => {
			const { deviceService, deviceCalls, eventCalls } =
				createCombinedService();

			try {
				await deviceService.acceptHeartbeat({
					deviceId: "dev_comb_004",
					requestId: "req_comb_004",
					body: { localTime: "13800138000" },
				});
				expect.fail("Expected HttpException");
			} catch (err) {
				expect(err).toBeInstanceOf(HttpException);
				const response = (err as HttpException).getResponse() as {
					code: string;
					message: string;
				};
				expect(response.code).toBe(API_ERROR_CODES.validationFailed);
				expect(response.message).toContain("raw phone number");
				expect(response.message).not.toContain("13800138000");
			}
			expect(deviceCalls).toHaveLength(0);
			expect(eventCalls).toHaveLength(0);
		});

		it("forbidden key in health returns VALIDATION_FAILED and does not call DevicePort or delegate", async () => {
			const { deviceService, deviceCalls, eventCalls } =
				createCombinedService();

			try {
				await deviceService.acceptHeartbeat({
					deviceId: "dev_comb_005",
					requestId: "req_comb_005",
					body: { health: { secret: "leaked-secret" } },
				});
				expect.fail("Expected HttpException");
			} catch (err) {
				expect(err).toBeInstanceOf(HttpException);
				const response = (err as HttpException).getResponse() as {
					code: string;
					message: string;
				};
				expect(response.code).toBe(API_ERROR_CODES.validationFailed);
				expect(response.message).toContain("forbidden key");
				expect(response.message).not.toContain("leaked-secret");
			}
			expect(deviceCalls).toHaveLength(0);
			expect(eventCalls).toHaveLength(0);
		});

		it("raw media data URI in health returns VALIDATION_FAILED and does not call DevicePort or delegate", async () => {
			const { deviceService, deviceCalls, eventCalls } =
				createCombinedService();

			try {
				await deviceService.acceptHeartbeat({
					deviceId: "dev_comb_006",
					requestId: "req_comb_006",
					body: {
						health: { capture: "data:image/png;base64,iVBORw0KGgo=" },
					},
				});
				expect.fail("Expected HttpException");
			} catch (err) {
				expect(err).toBeInstanceOf(HttpException);
				const response = (err as HttpException).getResponse() as {
					code: string;
					message: string;
				};
				expect(response.code).toBe(API_ERROR_CODES.validationFailed);
				expect(response.message).toContain("raw media");
				expect(response.message).not.toContain("iVBORw0KGgo=");
			}
			expect(deviceCalls).toHaveLength(0);
			expect(eventCalls).toHaveLength(0);
		});
	});

	describe("DevicePort empty storeId prevents EventLog write", () => {
		it("returns VALIDATION_FAILED and does not call EventLog delegate when storeId is empty", async () => {
			const { deviceService, deviceCalls, eventCalls, scenario } =
				createCombinedService();
			scenario.storeId = "";

			try {
				await deviceService.acceptHeartbeat({
					deviceId: "dev_comb_007",
					requestId: "req_comb_007",
					body: { appVersion: "1.0.0" },
				});
				expect.fail("Expected HttpException");
			} catch (err) {
				expect(err).toBeInstanceOf(HttpException);
				const response = (err as HttpException).getResponse() as {
					code: string;
					message: string;
				};
				expect(response.code).toBe(API_ERROR_CODES.validationFailed);
				expect(response.message).toContain("storeId");
			}

			// DevicePort IS called (validation happens after DevicePort call)
			expect(deviceCalls).toHaveLength(1);
			// EventLog delegate is NOT called
			expect(eventCalls).toHaveLength(0);
		});
	});
});

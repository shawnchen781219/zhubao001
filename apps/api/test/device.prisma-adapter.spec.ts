import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { HttpException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { API_ERROR_CODES } from "../src/common/errors/error-codes.js";
import type {
	DeviceStatus,
	RegisterDeviceInput,
} from "../src/modules/device/device.ports.js";
import {
	type DeviceDelegate,
	PrismaDevicePort,
} from "../src/modules/device/device.prisma-adapter.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SPEC_SOURCE_PATH = join(__dirname, "device.prisma-adapter.spec.ts");
const ADAPTER_SOURCE_PATH = join(
	__dirname,
	"..",
	"src",
	"modules",
	"device",
	"device.prisma-adapter.ts",
);

interface FindUniqueCall {
	where: { id: string };
	select: { id: true; storeId: true; status: true };
}

interface UpdateCall {
	where: { id: string };
	data: { lastHeartbeatAt: Date };
	select: { storeId: true; status: true; lastHeartbeatAt: true };
}

function createFakeDelegate(
	record: {
		id: string;
		storeId: string;
		status: DeviceStatus;
	} | null,
): {
	delegate: DeviceDelegate;
	findUniqueCalls: FindUniqueCall[];
	updateCalls: UpdateCall[];
} {
	const findUniqueCalls: FindUniqueCall[] = [];
	const updateCalls: UpdateCall[] = [];
	const delegate: DeviceDelegate = {
		device: {
			async findUnique(args: FindUniqueCall) {
				findUniqueCalls.push(args);
				return record;
			},
			async update(args: UpdateCall) {
				updateCalls.push(args);
				return {
					storeId: record?.storeId ?? "store_missing",
					status: record?.status ?? "ACTIVE",
					lastHeartbeatAt: args.data.lastHeartbeatAt,
				};
			},
		},
	};
	return { delegate, findUniqueCalls, updateCalls };
}

function createPort(
	record: {
		id: string;
		storeId: string;
		status: DeviceStatus;
	} | null,
) {
	const fake = createFakeDelegate(record);
	return { port: new PrismaDevicePort(fake.delegate), ...fake };
}

function expectHttpException(
	err: unknown,
	expected: { code: string; status: number; traceId: string },
): void {
	expect(err).toBeInstanceOf(HttpException);
	const exception = err as HttpException;
	expect(exception.getStatus()).toBe(expected.status);
	expect(exception.getResponse()).toMatchObject({
		code: expected.code,
		traceId: expected.traceId,
	});
}

function readSource(filePath: string): string {
	return readFileSync(filePath, "utf-8");
}

describe("PrismaDevicePort", () => {
	describe("acceptHeartbeat", () => {
		it("updates only lastHeartbeatAt for an ACTIVE device and returns heartbeat result", async () => {
			const { port, findUniqueCalls, updateCalls } = createPort({
				id: "device_001",
				storeId: "store_001",
				status: "ACTIVE",
			});

			const result = await port.acceptHeartbeat({
				deviceId: "  device_001  ",
				requestId: "trace-heartbeat-001",
				appVersion: "1.2.3",
				localTime: "2026-06-01T13:42:00+08:00",
				health: { cpu: 42 },
			});

			expect(findUniqueCalls).toEqual([
				{
					where: { id: "device_001" },
					select: { id: true, storeId: true, status: true },
				},
			]);
			expect(updateCalls).toHaveLength(1);
			const update = updateCalls[0];
			expect(update.where).toEqual({ id: "device_001" });
			expect(update.select).toEqual({
				storeId: true,
				status: true,
				lastHeartbeatAt: true,
			});
			expect(update.data.lastHeartbeatAt).toBeInstanceOf(Date);
			expect(Object.keys(update.data)).toEqual(["lastHeartbeatAt"]);
			expect(update.data).not.toHaveProperty("health");
			expect(update.data).not.toHaveProperty("appVersion");
			expect(update.data).not.toHaveProperty("localTime");
			expect(update.data).not.toHaveProperty("requestId");

			expect(result).toEqual({
				serverTime: update.data.lastHeartbeatAt.toISOString(),
				status: "ACTIVE",
				storeId: "store_001",
			});
		});

		it("rejects blank deviceId before delegate lookup", async () => {
			const { port, findUniqueCalls, updateCalls } = createPort({
				id: "device_unused",
				storeId: "store_unused",
				status: "ACTIVE",
			});

			try {
				await port.acceptHeartbeat({
					deviceId: "   ",
					requestId: "trace-blank-heartbeat",
				});
				expect.fail("Expected HttpException");
			} catch (err) {
				expectHttpException(err, {
					code: API_ERROR_CODES.validationFailed,
					status: 400,
					traceId: "trace-blank-heartbeat",
				});
			}
			expect(findUniqueCalls).toHaveLength(0);
			expect(updateCalls).toHaveLength(0);
		});

		it("rejects missing device without update", async () => {
			const { port, findUniqueCalls, updateCalls } = createPort(null);

			try {
				await port.acceptHeartbeat({
					deviceId: "device_missing",
					requestId: "trace-missing-heartbeat",
				});
				expect.fail("Expected HttpException");
			} catch (err) {
				expectHttpException(err, {
					code: API_ERROR_CODES.deviceNotFound,
					status: 404,
					traceId: "trace-missing-heartbeat",
				});
			}
			expect(findUniqueCalls).toHaveLength(1);
			expect(updateCalls).toHaveLength(0);
		});

		it("rejects non-ACTIVE device without update", async () => {
			const { port, findUniqueCalls, updateCalls } = createPort({
				id: "device_suspended",
				storeId: "store_001",
				status: "SUSPENDED",
			});

			try {
				await port.acceptHeartbeat({
					deviceId: "device_suspended",
					requestId: "trace-suspended-heartbeat",
				});
				expect.fail("Expected HttpException");
			} catch (err) {
				expectHttpException(err, {
					code: API_ERROR_CODES.deviceNotActive,
					status: 403,
					traceId: "trace-suspended-heartbeat",
				});
			}
			expect(findUniqueCalls).toHaveLength(1);
			expect(updateCalls).toHaveLength(0);
		});
	});

	describe("assertActiveDevice", () => {
		it("resolves for ACTIVE device without heartbeat update", async () => {
			const { port, findUniqueCalls, updateCalls } = createPort({
				id: "device_active",
				storeId: "store_001",
				status: "ACTIVE",
			});

			await expect(
				port.assertActiveDevice(" device_active ", "trace-active-assert"),
			).resolves.toBeUndefined();
			expect(findUniqueCalls).toEqual([
				{
					where: { id: "device_active" },
					select: { id: true, storeId: true, status: true },
				},
			]);
			expect(updateCalls).toHaveLength(0);
		});

		it("rejects blank deviceId", async () => {
			const { port, findUniqueCalls, updateCalls } = createPort({
				id: "device_unused",
				storeId: "store_unused",
				status: "ACTIVE",
			});

			try {
				await port.assertActiveDevice(" ", "trace-blank-assert");
				expect.fail("Expected HttpException");
			} catch (err) {
				expectHttpException(err, {
					code: API_ERROR_CODES.validationFailed,
					status: 400,
					traceId: "trace-blank-assert",
				});
			}
			expect(findUniqueCalls).toHaveLength(0);
			expect(updateCalls).toHaveLength(0);
		});

		it("rejects missing device", async () => {
			const { port, findUniqueCalls, updateCalls } = createPort(null);

			try {
				await port.assertActiveDevice("device_missing", "trace-missing-assert");
				expect.fail("Expected HttpException");
			} catch (err) {
				expectHttpException(err, {
					code: API_ERROR_CODES.deviceNotFound,
					status: 404,
					traceId: "trace-missing-assert",
				});
			}
			expect(findUniqueCalls).toHaveLength(1);
			expect(updateCalls).toHaveLength(0);
		});

		it("rejects non-ACTIVE device", async () => {
			const { port, findUniqueCalls, updateCalls } = createPort({
				id: "device_retired",
				storeId: "store_001",
				status: "RETIRED",
			});

			try {
				await port.assertActiveDevice("device_retired", "trace-retired-assert");
				expect.fail("Expected HttpException");
			} catch (err) {
				expectHttpException(err, {
					code: API_ERROR_CODES.deviceNotActive,
					status: 403,
					traceId: "trace-retired-assert",
				});
			}
			expect(findUniqueCalls).toHaveLength(1);
			expect(updateCalls).toHaveLength(0);
		});
	});

	it("registerDevice remains explicitly unavailable", async () => {
		const { port, findUniqueCalls, updateCalls } = createPort({
			id: "device_unused",
			storeId: "store_unused",
			status: "ACTIVE",
		});
		const input: RegisterDeviceInput = {
			storeCode: "store_001",
			deviceCode: "mirror_001",
			deviceType: "MIRROR_TERMINAL",
			displayName: "Mirror 001",
			idempotencyKey: "idem_001",
			traceId: "trace-register-unavailable",
		};

		try {
			await port.registerDevice(input);
			expect.fail("Expected HttpException");
		} catch (err) {
			expectHttpException(err, {
				code: API_ERROR_CODES.serviceUnavailable,
				status: 503,
				traceId: "trace-register-unavailable",
			});
			expect((err as HttpException).getResponse()).toMatchObject({
				message: "Device registration persistence is not implemented yet.",
			});
		}
		expect(findUniqueCalls).toHaveLength(0);
		expect(updateCalls).toHaveLength(0);
	});

	it("does not import or instantiate Prisma runtime in adapter or spec", () => {
		const combinedSource = [
			readSource(ADAPTER_SOURCE_PATH),
			readSource(SPEC_SOURCE_PATH),
		].join("\n");
		const prismaClientPackage = ["@prisma", "client"].join("/");
		const realClientPattern = new RegExp(
			["new", "\\s+", "PrismaClient", "\\s*", "\\("].join(""),
		);
		const connectCallPattern = new RegExp(
			["\\$", "connect", "\\s*", "\\("].join(""),
		);
		const nestContextPattern = new RegExp(
			["create", "Application", "Context"].join(""),
		);

		expect(combinedSource).not.toContain(
			["from ", '"', prismaClientPackage, '"'].join(""),
		);
		expect(combinedSource).not.toContain(
			["from ", "'", prismaClientPackage, "'"].join(""),
		);
		expect(combinedSource).not.toMatch(realClientPattern);
		expect(combinedSource).not.toMatch(connectCallPattern);
		expect(combinedSource).not.toMatch(nestContextPattern);
	});
});

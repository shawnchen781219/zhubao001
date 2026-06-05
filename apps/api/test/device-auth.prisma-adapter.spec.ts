import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
	type DeviceAuthDelegate,
	PrismaDeviceAuthPort,
} from "../src/modules/device/device-auth.prisma-adapter.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SPEC_SOURCE_PATH = join(__dirname, "device-auth.prisma-adapter.spec.ts");
const ADAPTER_SOURCE_PATH = join(
	__dirname,
	"..",
	"src",
	"modules",
	"device",
	"device-auth.prisma-adapter.ts",
);

interface FindUniqueCall {
	where: { id: string };
	select: { secretHash: true; status: true };
}

function createFakeDelegate(
	record: { secretHash: string; status: string } | null,
): {
	delegate: DeviceAuthDelegate;
	calls: FindUniqueCall[];
} {
	const calls: FindUniqueCall[] = [];
	const delegate: DeviceAuthDelegate = {
		device: {
			async findUnique(args: FindUniqueCall) {
				calls.push(args);
				return record;
			},
		},
	};
	return { delegate, calls };
}

function readSource(filePath: string): string {
	return readFileSync(filePath, "utf-8");
}

describe("PrismaDeviceAuthPort", () => {
	it("queries device by trimmed id with exact secret/status select and maps the result", async () => {
		const { delegate, calls } = createFakeDelegate({
			secretHash: "secret_hash_001",
			status: "ACTIVE",
		});
		const port = new PrismaDeviceAuthPort(delegate);

		const result = await port.findSecretByDeviceId("  device_001  ");

		expect(calls).toEqual([
			{
				where: { id: "device_001" },
				select: { secretHash: true, status: true },
			},
		]);
		expect(result).toEqual({
			verificationSecret: "secret_hash_001",
			status: "ACTIVE",
		});
	});

	it("returns null when delegate does not find the device", async () => {
		const { delegate, calls } = createFakeDelegate(null);
		const port = new PrismaDeviceAuthPort(delegate);

		const result = await port.findSecretByDeviceId("device_missing");

		expect(calls).toHaveLength(1);
		expect(result).toBeNull();
	});

	it("returns null for blank deviceId without calling delegate", async () => {
		const { delegate, calls } = createFakeDelegate({
			secretHash: "should_not_be_used",
			status: "ACTIVE",
		});
		const port = new PrismaDeviceAuthPort(delegate);

		await expect(port.findSecretByDeviceId("   ")).resolves.toBeNull();
		await expect(port.findSecretByDeviceId("")).resolves.toBeNull();
		expect(calls).toHaveLength(0);
	});

	it("passes ACTIVE and SUSPENDED status through without rewriting", async () => {
		for (const status of ["ACTIVE", "SUSPENDED"]) {
			const { delegate } = createFakeDelegate({
				secretHash: `secret_for_${status}`,
				status,
			});
			const port = new PrismaDeviceAuthPort(delegate);

			const result = await port.findSecretByDeviceId(`device_${status}`);

			expect(result).toEqual({
				verificationSecret: `secret_for_${status}`,
				status,
			});
		}
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

		expect(combinedSource).not.toContain(
			["from ", '"', prismaClientPackage, '"'].join(""),
		);
		expect(combinedSource).not.toContain(
			["from ", "'", prismaClientPackage, "'"].join(""),
		);
		expect(combinedSource).not.toMatch(realClientPattern);
		expect(combinedSource).not.toMatch(connectCallPattern);
	});
});

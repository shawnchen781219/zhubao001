import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { DomainEventType } from "@jewelry/shared";
import { describe, expect, it } from "vitest";

function extractPrismaEventTypes(schemaPath: string): string[] {
	const content = readFileSync(schemaPath, "utf-8");
	const match = content.match(/enum EventType \{([^}]+)\}/);
	if (!match) {
		throw new Error("Could not find enum EventType in schema.prisma");
	}
	return match[1]
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.length > 0 && !line.startsWith("//"));
}

const schemaPath = resolve(
	import.meta.dirname,
	"../../../prisma/schema.prisma",
);

describe("EventType contract alignment", () => {
	it("Prisma EventType enum covers all DomainEventType values", () => {
		const prismaEventTypes = extractPrismaEventTypes(schemaPath);
		const sharedValues = Object.values(DomainEventType);

		for (const sharedValue of sharedValues) {
			expect(prismaEventTypes).toContain(sharedValue);
		}
	});

	it("DomainEventType.DeviceHeartbeat is defined and matches heartbeat use case", () => {
		expect(DomainEventType.DeviceHeartbeat).toBe("DEVICE_HEARTBEAT");
	});

	it("DomainEventType has at least the 21 expected Phase 1 event types", () => {
		const values = Object.values(DomainEventType);
		expect(values.length).toBeGreaterThanOrEqual(21);
	});

	it("Prisma EventType enum and DomainEventType have exactly the same set of values", () => {
		const prismaEventTypes = extractPrismaEventTypes(schemaPath);
		const sharedValues = Object.values(DomainEventType);

		const prismaSet = new Set(prismaEventTypes);
		const sharedSet = new Set(sharedValues);

		expect(prismaSet.size).toBe(sharedSet.size);
		for (const prismaValue of prismaEventTypes) {
			expect(sharedSet.has(prismaValue)).toBe(true);
		}
		for (const sharedValue of sharedValues) {
			expect(prismaSet.has(sharedValue)).toBe(true);
		}
	});
});

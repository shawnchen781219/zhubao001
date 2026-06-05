import "reflect-metadata";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DomainEventType } from "@jewelry/shared";
import { HttpException, Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { describe, expect, it } from "vitest";
import { PRISMA_CLIENT } from "../src/common/prisma-runtime/prisma-runtime.tokens.js";
import {
	EVENT_PORT,
	type EventLogInput,
} from "../src/modules/event/event.ports.js";
import {
	type EventLogCreateData,
	type EventLogDelegate,
	PrismaEventPort,
} from "../src/modules/event/event.prisma-adapter.js";
import { EventService } from "../src/modules/event/event.service.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SPEC_SOURCE_PATH = join(__dirname, "event.prisma-di-contract.spec.ts");

interface CapturedCreateCall {
	data: EventLogCreateData;
}

const createCalls: CapturedCreateCall[] = [];

const fakePrismaClient: EventLogDelegate = {
	eventLog: {
		async create(args: CapturedCreateCall): Promise<unknown> {
			createCalls.push(args);
			return { id: "evt_di_contract_001" };
		},
	},
};

@Module({
	providers: [
		EventService,
		{ provide: PRISMA_CLIENT, useValue: fakePrismaClient },
		{
			provide: EVENT_PORT,
			useFactory: (client: EventLogDelegate): PrismaEventPort =>
				new PrismaEventPort(client),
			inject: [PRISMA_CLIENT],
		},
	],
})
class EventPrismaDiContractTestModule {}

async function createTestingContext() {
	createCalls.length = 0;
	return NestFactory.createApplicationContext(EventPrismaDiContractTestModule, {
		logger: false,
	});
}

function readSpecSource(): string {
	return readFileSync(SPEC_SOURCE_PATH, "utf-8");
}

describe("Event Prisma DI contract", () => {
	it("resolves EventService through EVENT_PORT -> PrismaEventPort -> fake PRISMA_CLIENT wiring", async () => {
		const moduleRef = await createTestingContext();
		try {
			const service = moduleRef.get(EventService);
			expect(service).toBeInstanceOf(EventService);

			const fixedIso = "2026-05-31T08:57:00.000Z";
			const input: EventLogInput = {
				storeId: "store_di_001",
				eventType: DomainEventType.TryOnCompleted,
				occurredAt: fixedIso,
				traceId: "trace-di-contract-001",
				deviceId: "device_di_001",
				customerId: "customer_di_001",
				anonymousId: "anon_di_001",
				tryOnSessionId: "tryon_di_001",
				payload: {
					action: "try_on_completed",
					result: "ok",
				},
			};

			await service.recordEvent(input);

			expect(createCalls).toHaveLength(1);
			const data = createCalls[0].data;
			expect(data.storeId).toBe("store_di_001");
			expect(data.eventType).toBe(DomainEventType.TryOnCompleted);
			expect(data.occurredAt).toBeInstanceOf(Date);
			expect(data.occurredAt.toISOString()).toBe(fixedIso);
			expect(data.deviceId).toBe("device_di_001");
			expect(data.customerId).toBe("customer_di_001");
			expect(data.anonymousId).toBe("anon_di_001");
			expect(data.tryOnSessionId).toBe("tryon_di_001");
			expect(data.payload).toEqual({
				action: "try_on_completed",
				result: "ok",
			});
			expect(data).not.toHaveProperty("traceId");
		} finally {
			await moduleRef.close();
		}
	});

	it("rejects dangerous payload before fake delegate side effects", async () => {
		const moduleRef = await createTestingContext();
		try {
			const service = moduleRef.get(EventService);
			const input: EventLogInput = {
				storeId: "store_di_002",
				eventType: DomainEventType.TryOnStarted,
				occurredAt: "2026-05-31T08:58:00.000Z",
				traceId: "trace-di-contract-danger-001",
				payload: { secret: "should-not-reach-delegate" },
			};

			await expect(service.recordEvent(input)).rejects.toBeInstanceOf(
				HttpException,
			);
			expect(createCalls).toHaveLength(0);
		} finally {
			await moduleRef.close();
		}
	});

	it("rejects blank storeId in PrismaEventPort before fake delegate side effects", async () => {
		const moduleRef = await createTestingContext();
		try {
			const service = moduleRef.get(EventService);
			const input: EventLogInput = {
				storeId: "",
				eventType: DomainEventType.DeviceHeartbeat,
				occurredAt: "2026-05-31T08:59:00.000Z",
				traceId: "trace-di-contract-store-001",
				payload: { status: "safe" },
			};

			await expect(service.recordEvent(input)).rejects.toBeInstanceOf(
				HttpException,
			);
			expect(createCalls).toHaveLength(0);
		} finally {
			await moduleRef.close();
		}
	});

	it("keeps the runtime factory boundary out of this contract spec", () => {
		const source = readSpecSource();
		const runtimeModuleName = ["Prisma", "Runtime", "Module"].join("");
		const prismaClientPackage = ["@prisma", "client"].join("/");
		const realClientPattern = new RegExp(
			["new", "\\s+", "PrismaClient", "\\s*", "\\("].join(""),
		);
		const connectCallPattern = new RegExp(
			["\\$", "connect", "\\s*", "\\("].join(""),
		);
		expect(source).not.toContain(runtimeModuleName);
		expect(source).not.toContain(prismaClientPackage);
		expect(source).not.toMatch(realClientPattern);
		expect(source).not.toMatch(connectCallPattern);
	});
});

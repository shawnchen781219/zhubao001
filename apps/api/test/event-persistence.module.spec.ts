import "reflect-metadata";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { MODULE_METADATA } from "@nestjs/common/constants";
import { describe, expect, it, vi } from "vitest";
import { PRISMA_CLIENT } from "../src/common/prisma-runtime/prisma-runtime.tokens.js";
import { EVENT_PORT } from "../src/modules/event/event.ports.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SPEC_SOURCE_PATH = join(__dirname, "event-persistence.module.spec.ts");
const prismaClientPackage = ["@prisma", "client"].join("/");

vi.doMock(prismaClientPackage, () => ({
	PrismaClient: class PrismaClient {},
	Prisma: {},
}));

const { PrismaRuntimeModule } = await import(
	"../src/common/prisma-runtime/prisma-runtime.module.js"
);
const { EventPersistenceModule } = await import(
	"../src/modules/event/event-persistence.module.js"
);

interface FactoryProviderMetadata {
	provide: unknown;
	useFactory: (...args: never[]) => unknown;
	inject?: unknown[];
}

function getModuleImports(): unknown[] {
	return (
		Reflect.getMetadata(MODULE_METADATA.IMPORTS, EventPersistenceModule) ?? []
	);
}

function getModuleProviders(): unknown[] {
	return (
		Reflect.getMetadata(MODULE_METADATA.PROVIDERS, EventPersistenceModule) ?? []
	);
}

function getModuleExports(): unknown[] {
	return (
		Reflect.getMetadata(MODULE_METADATA.EXPORTS, EventPersistenceModule) ?? []
	);
}

function isFactoryProvider(
	provider: unknown,
): provider is FactoryProviderMetadata {
	return (
		typeof provider === "object" &&
		provider !== null &&
		"provide" in provider &&
		"useFactory" in provider &&
		typeof (provider as { useFactory?: unknown }).useFactory === "function"
	);
}

function findEventPortProviders(): FactoryProviderMetadata[] {
	return getModuleProviders().filter(
		(provider): provider is FactoryProviderMetadata =>
			isFactoryProvider(provider) && provider.provide === EVENT_PORT,
	);
}

function readSpecSource(): string {
	return readFileSync(SPEC_SOURCE_PATH, "utf-8");
}

describe("EventPersistenceModule metadata", () => {
	it("imports only PrismaRuntimeModule", () => {
		expect(getModuleImports()).toEqual([PrismaRuntimeModule]);
	});

	it("provides exactly one EVENT_PORT factory provider", () => {
		const providers = getModuleProviders();
		const eventPortProviders = findEventPortProviders();
		expect(providers).toHaveLength(1);
		expect(eventPortProviders).toHaveLength(1);
		expect(eventPortProviders[0]?.provide).toBe(EVENT_PORT);
		expect(eventPortProviders[0]?.useFactory).toBeTypeOf("function");
	});

	it("injects exactly PRISMA_CLIENT into the EVENT_PORT factory", () => {
		const [provider] = findEventPortProviders();
		expect(provider?.inject).toEqual([PRISMA_CLIENT]);
	});

	it("exports only EVENT_PORT", () => {
		expect(getModuleExports()).toEqual([EVENT_PORT]);
	});

	it("does not create Nest context or run real Prisma runtime work in this spec", () => {
		const source = readSpecSource();
		const realClientPattern = new RegExp(
			["new", "\\s+", "PrismaClient", "\\s*", "\\("].join(""),
		);
		const connectCallPattern = new RegExp(
			["\\$", "connect", "\\s*", "\\("].join(""),
		);
		expect(source).not.toContain(["Nest", "Factory"].join(""));
		expect(source).not.toContain(["create", "Application", "Context"].join(""));
		expect(source).not.toContain(
			["from ", '"', prismaClientPackage, '"'].join(""),
		);
		expect(source).not.toContain(
			["from ", "'", prismaClientPackage, "'"].join(""),
		);
		expect(source).not.toMatch(realClientPattern);
		expect(source).not.toMatch(connectCallPattern);
	});
});

import "reflect-metadata";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { MODULE_METADATA } from "@nestjs/common/constants";
import { describe, expect, it, vi } from "vitest";
import { PRISMA_CLIENT } from "../src/common/prisma-runtime/prisma-runtime.tokens.js";
import { DEVICE_PORT } from "../src/modules/device/device.ports.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SPEC_SOURCE_PATH = join(__dirname, "device-persistence.module.spec.ts");
const MODULE_SOURCE_PATH = join(
	__dirname,
	"..",
	"src",
	"modules",
	"device",
	"device-persistence.module.ts",
);
const prismaClientPackage = ["@prisma", "client"].join("/");

vi.doMock(prismaClientPackage, () => ({
	PrismaClient: class PrismaClient {},
	Prisma: {},
}));

const { PrismaRuntimeModule } = await import(
	"../src/common/prisma-runtime/prisma-runtime.module.js"
);
const { DevicePersistenceModule } = await import(
	"../src/modules/device/device-persistence.module.js"
);

interface FactoryProviderMetadata {
	provide: unknown;
	useFactory: (...args: never[]) => unknown;
	inject?: unknown[];
}

function getModuleImports(): unknown[] {
	return (
		Reflect.getMetadata(MODULE_METADATA.IMPORTS, DevicePersistenceModule) ?? []
	);
}

function getModuleProviders(): unknown[] {
	return (
		Reflect.getMetadata(MODULE_METADATA.PROVIDERS, DevicePersistenceModule) ??
		[]
	);
}

function getModuleExports(): unknown[] {
	return (
		Reflect.getMetadata(MODULE_METADATA.EXPORTS, DevicePersistenceModule) ?? []
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

function findDevicePortProviders(): FactoryProviderMetadata[] {
	return getModuleProviders().filter(
		(provider): provider is FactoryProviderMetadata =>
			isFactoryProvider(provider) && provider.provide === DEVICE_PORT,
	);
}

function readSources(): string {
	return [SPEC_SOURCE_PATH, MODULE_SOURCE_PATH]
		.map((filePath) => readFileSync(filePath, "utf-8"))
		.join("\n");
}

describe("DevicePersistenceModule metadata", () => {
	it("imports only PrismaRuntimeModule", () => {
		expect(getModuleImports()).toEqual([PrismaRuntimeModule]);
	});

	it("provides exactly one DEVICE_PORT factory provider", () => {
		const providers = getModuleProviders();
		const devicePortProviders = findDevicePortProviders();
		expect(providers).toHaveLength(1);
		expect(devicePortProviders).toHaveLength(1);
		expect(devicePortProviders[0]?.provide).toBe(DEVICE_PORT);
		expect(devicePortProviders[0]?.useFactory).toBeTypeOf("function");
	});

	it("injects exactly PRISMA_CLIENT into the DEVICE_PORT factory", () => {
		const [provider] = findDevicePortProviders();
		expect(provider?.inject).toEqual([PRISMA_CLIENT]);
	});

	it("exports only DEVICE_PORT", () => {
		expect(getModuleExports()).toEqual([DEVICE_PORT]);
	});

	it("factory source constructs PrismaDevicePort without executing factory", () => {
		const moduleSource = readFileSync(MODULE_SOURCE_PATH, "utf-8");
		expect(moduleSource).toContain("new PrismaDevicePort");
	});

	it("does not create Nest context or run real Prisma runtime work in module or spec", () => {
		const source = readSources();
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

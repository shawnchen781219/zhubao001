import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { MODULE_METADATA } from "@nestjs/common/constants";
import { describe, expect, it, vi } from "vitest";
import {
	PrismaClientHolder,
	PrismaRuntimeModule,
} from "../src/common/prisma-runtime/prisma-runtime.module.js";
import { PRISMA_CLIENT } from "../src/common/prisma-runtime/prisma-runtime.tokens.js";

vi.mock("@prisma/client", () => ({
	PrismaClient: class PrismaClient {},
	Prisma: {},
}));

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODULE_SOURCE_PATH = join(
	__dirname,
	"..",
	"src",
	"common",
	"prisma-runtime",
	"prisma-runtime.module.ts",
);

function getModuleSource(): string {
	return readFileSync(MODULE_SOURCE_PATH, "utf-8");
}

function nonCommentLines(source: string): string[] {
	return source.split("\n").filter((line) => {
		const trimmed = line.trim();
		return trimmed.length > 0 && !trimmed.startsWith("//");
	});
}

interface FactoryProviderMetadata {
	provide: unknown;
	useFactory: (...args: never[]) => unknown;
}

function getModuleProviders(): unknown[] {
	return (
		Reflect.getMetadata(MODULE_METADATA.PROVIDERS, PrismaRuntimeModule) ?? []
	);
}

function getModuleExports(): unknown[] {
	return (
		Reflect.getMetadata(MODULE_METADATA.EXPORTS, PrismaRuntimeModule) ?? []
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

function findPrismaClientProviders(): FactoryProviderMetadata[] {
	return getModuleProviders().filter(
		(provider): provider is FactoryProviderMetadata =>
			isFactoryProvider(provider) && provider.provide === PRISMA_CLIENT,
	);
}

describe("PrismaRuntimeModule", () => {
	describe("lifecycle", () => {
		it("holder calls $disconnect on module destroy", async () => {
			let disconnectCalled = false;
			const fakeClient = {
				$disconnect: async () => {
					disconnectCalled = true;
				},
				$connect: async () => {
					throw new Error("$connect should not be called");
				},
			} as never;

			const holder = new PrismaClientHolder(fakeClient);
			await holder.onModuleDestroy();
			expect(disconnectCalled).toBe(true);
		});

		it("holder does not call $connect", async () => {
			let connectCalled = false;
			const fakeClient = {
				$disconnect: async () => {},
				$connect: async () => {
					connectCalled = true;
				},
			} as never;

			const holder = new PrismaClientHolder(fakeClient);
			await holder.onModuleDestroy();
			expect(connectCalled).toBe(false);
		});
	});

	describe("module metadata constraints", () => {
		it("PRISMA_CLIENT provider exists in module providers", () => {
			const prismaClientProviders = findPrismaClientProviders();
			expect(prismaClientProviders).toHaveLength(1);
		});

		it("exports array contains PRISMA_CLIENT and does not contain PrismaClientHolder", () => {
			const moduleExports = getModuleExports();
			expect(moduleExports).toContain(PRISMA_CLIENT);
			expect(moduleExports).not.toContain(PrismaClientHolder);
		});

		it("PRISMA_CLIENT provider uses factory and is the only producer of the token", () => {
			const [provider] = findPrismaClientProviders();
			expect(provider).toBeDefined();
			expect(provider?.provide).toBe(PRISMA_CLIENT);
			expect(provider?.useFactory).toBeTypeOf("function");
		});

		it("PrismaClientHolder remains a private provider", () => {
			const moduleProviders = getModuleProviders();
			const moduleExports = getModuleExports();
			expect(
				moduleProviders.some(
					(provider) =>
						typeof provider === "object" &&
						provider !== null &&
						"provide" in provider &&
						(provider as { provide?: unknown }).provide === PrismaClientHolder,
				),
			).toBe(true);
			expect(moduleExports).not.toContain(PrismaClientHolder);
		});
	});

	describe("source boundary constraints", () => {
		it("module source does not contain $connect( outside comments", () => {
			const source = getModuleSource();
			for (const line of nonCommentLines(source)) {
				if (line.includes("$connect(")) {
					throw new Error(`Unexpected $connect( in non-comment line: ${line}`);
				}
			}
		});

		it("factory does not execute query or connect in module source", () => {
			const source = getModuleSource();
			const code = nonCommentLines(source).join("\n");
			expect(code).not.toMatch(/\$connect\s*\(/);
			expect(code).not.toMatch(/\.findMany\s*\(/);
			expect(code).not.toMatch(/\.findUnique\s*\(/);
			expect(code).not.toMatch(/\.create\s*\(/);
			expect(code).not.toMatch(/\.update\s*\(/);
			expect(code).not.toMatch(/\.delete\s*\(/);
			expect(code).not.toMatch(/\.upsert\s*\(/);
		});

		it("PRISMA_CLIENT factory source does not contain connect or query calls", () => {
			const [provider] = findPrismaClientProviders();
			const factorySource = nonCommentLines(
				provider?.useFactory.toString() ?? "",
			).join("\n");
			expect(factorySource).not.toMatch(/\$connect\s*\(/);
			expect(factorySource).not.toMatch(/\.findMany\s*\(/);
			expect(factorySource).not.toMatch(/\.findUnique\s*\(/);
			expect(factorySource).not.toMatch(/\.create\s*\(/);
			expect(factorySource).not.toMatch(/\.update\s*\(/);
			expect(factorySource).not.toMatch(/\.delete\s*\(/);
			expect(factorySource).not.toMatch(/\.upsert\s*\(/);
		});
	});
});

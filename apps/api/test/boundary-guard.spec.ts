import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { MODULE_METADATA } from "@nestjs/common/constants";
import { describe, expect, it, vi } from "vitest";
import { AppModule } from "../src/app.module.js";
import { PrismaRuntimeModule } from "../src/common/prisma-runtime/prisma-runtime.module.js";
import { DeviceModule } from "../src/modules/device/device.module.js";
import { DEVICE_PORT } from "../src/modules/device/device.ports.js";
import { DEVICE_AUTH_PORT } from "../src/modules/device/device-auth.port.js";
import { EventModule } from "../src/modules/event/event.module.js";
import { EVENT_PORT } from "../src/modules/event/event.ports.js";
import { PrismaEventPort } from "../src/modules/event/event.prisma-adapter.js";

vi.mock("@prisma/client", () => ({
	PrismaClient: class PrismaClient {},
	Prisma: {},
}));

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SRC_DIR = join(__dirname, "..", "src");

function collectTsFiles(dir: string): string[] {
	const entries = readdirSync(dir);
	const files: string[] = [];
	for (const entry of entries) {
		const fullPath = join(dir, entry);
		const stat = statSync(fullPath);
		if (stat.isDirectory()) {
			files.push(...collectTsFiles(fullPath));
		} else if (extname(entry) === ".ts") {
			files.push(fullPath);
		}
	}
	return files;
}

function readSource(filePath: string): string {
	return readFileSync(filePath, "utf-8");
}

function isExcluded(filePath: string): boolean {
	const name = basename(filePath);
	return (
		name.endsWith(".spec.ts") ||
		name.endsWith(".ports.ts") ||
		name.endsWith(".types.ts") ||
		name === "README.md" ||
		filePath.includes("/generated/")
	);
}

function getModuleImports(moduleClass: unknown): unknown[] {
	return Reflect.getMetadata(MODULE_METADATA.IMPORTS, moduleClass) ?? [];
}

function getModuleProviders(moduleClass: unknown): unknown[] {
	return Reflect.getMetadata(MODULE_METADATA.PROVIDERS, moduleClass) ?? [];
}

function objectField(value: unknown, key: string): unknown {
	if (typeof value !== "object" || value === null || !(key in value)) {
		return undefined;
	}
	return (value as Record<string, unknown>)[key];
}

function valueName(value: unknown): string {
	if (typeof value === "function") {
		return value.name;
	}
	if (typeof value === "symbol") {
		return value.description ?? value.toString();
	}
	if (typeof value === "string") {
		return value;
	}
	if (typeof value === "object" && value !== null) {
		const name = objectField(value, "name");
		if (typeof name === "string") {
			return name;
		}
		const constructorName = value.constructor?.name;
		return constructorName && constructorName !== "Object"
			? constructorName
			: "";
	}
	return "";
}

function moduleImportTarget(moduleImport: unknown): unknown {
	return objectField(moduleImport, "module") ?? moduleImport;
}

function moduleImportName(moduleImport: unknown): string {
	return valueName(moduleImportTarget(moduleImport));
}

function moduleImportMatches(
	moduleImport: unknown,
	moduleClass: unknown,
): boolean {
	return moduleImportTarget(moduleImport) === moduleClass;
}

function providerToken(provider: unknown): unknown {
	if (
		typeof provider === "object" &&
		provider !== null &&
		"provide" in provider
	) {
		return (provider as { provide?: unknown }).provide;
	}
	return provider;
}

function providerNames(provider: unknown): string[] {
	const names = [
		providerToken(provider),
		objectField(provider, "useClass"),
		objectField(provider, "useExisting"),
		objectField(provider, "useFactory"),
		objectField(provider, "useValue"),
	].map(valueName);
	return names.filter((name) => name.length > 0);
}

function providerMatchesName(
	provider: unknown,
	pattern: RegExp | string,
): boolean {
	for (const name of providerNames(provider)) {
		if (typeof pattern === "string" ? name === pattern : pattern.test(name)) {
			return true;
		}
	}
	return false;
}

function providerMatchesToken(provider: unknown, token: unknown): boolean {
	return providerToken(provider) === token;
}

describe("Source boundary guard", () => {
	const allFiles = collectTsFiles(SRC_DIR);
	const sourceFiles = allFiles.filter((f) => !isExcluded(f));

	describe("metadata helper coverage", () => {
		class FakeDeviceModule {}
		class PrismaModule {}
		class PrismaDevicePort {}
		class DevicePrismaAdapter {}
		class DevicePrismaValue {}
		function useDevicePrismaFactory() {
			return {};
		}

		it("recognizes class and dynamic module imports", () => {
			expect(moduleImportMatches(FakeDeviceModule, FakeDeviceModule)).toBe(
				true,
			);
			expect(
				moduleImportMatches({ module: FakeDeviceModule }, FakeDeviceModule),
			).toBe(true);
			expect(moduleImportName({ module: PrismaModule })).toBe("PrismaModule");
		});

		it("recognizes provider token and implementation-side names", () => {
			const providers = [
				PrismaDevicePort,
				{ provide: "safe-token", useClass: PrismaDevicePort },
				{ provide: "safe-existing-token", useExisting: DevicePrismaAdapter },
				{ provide: "safe-factory-token", useFactory: useDevicePrismaFactory },
				{ provide: "safe-value-token", useValue: new DevicePrismaValue() },
			];

			for (const provider of providers) {
				expect(providerMatchesName(provider, /PrismaDevice|DevicePrisma/)).toBe(
					true,
				);
			}
		});
	});

	it("must not instantiate PrismaClient in source files except prisma-runtime boundary (type imports allowed)", () => {
		const instantiationPattern = /new\s+PrismaClient\s*\(/m;
		const allowedBoundary =
			/common\/prisma-runtime\/prisma-runtime\.module\.ts$/;
		const violations: string[] = [];
		for (const file of sourceFiles) {
			if (allowedBoundary.test(file)) continue;
			const content = readSource(file);
			if (instantiationPattern.test(content)) {
				violations.push(file);
			}
		}
		expect(violations).toEqual([]);
	});

	it("type-only @prisma/client imports are allowed in service files", () => {
		const importPattern =
			/^\s*import\s+[^t][^y].*?from\s+['"]@prisma\/client['"]/m;
		const allowedBoundary =
			/common\/prisma-runtime\/prisma-runtime\.module\.ts$/;
		const violations: string[] = [];
		for (const file of sourceFiles) {
			if (allowedBoundary.test(file)) continue;
			const content = readSource(file);
			if (importPattern.test(content)) {
				violations.push(file);
			}
		}
		expect(violations).toEqual([]);
	});

	it("must not instantiate Redis client in source files", () => {
		const redisPattern = /new\s+Redis\s*\(|createClient\s*\(.*redis/i;
		const violations: string[] = [];
		for (const file of sourceFiles) {
			const content = readSource(file);
			if (redisPattern.test(content)) {
				violations.push(file);
			}
		}
		expect(violations).toEqual([]);
	});

	it("must not import or instantiate object storage SDKs in source files", () => {
		const sdkPattern =
			/import\s+.*?Minio|new\s+MinioClient|from\s+['"]@aws-sdk\/client-s3['"]|from\s+['"]ali-oss['"]|from\s+['"]cos-nodejs-sdk-v5['"]/i;
		const violations: string[] = [];
		for (const file of sourceFiles) {
			const content = readSource(file);
			if (sdkPattern.test(content)) {
				violations.push(file);
			}
		}
		expect(violations).toEqual([]);
	});

	it("must not import or instantiate AI SDKs in source files", () => {
		const aiPattern =
			/from\s+['"]openai['"]|from\s+['"]@anthropic\/ai['"]|from\s+['"]@moonshot\/ai['"]|from\s+['"]@qwen\/ai['"]|new\s+OpenAI\s*\(/i;
		const violations: string[] = [];
		for (const file of sourceFiles) {
			const content = readSource(file);
			if (aiPattern.test(content)) {
				violations.push(file);
			}
		}
		expect(violations).toEqual([]);
	});

	it("must not import or instantiate WeChat SDKs in source files", () => {
		const wxPattern =
			/from\s+['"]wechat['"]|from\s+['"]wechat-sdk['"]|from\s+['"]@wechat\/sdk['"]|new\s+Wechat\s*\(/i;
		const violations: string[] = [];
		for (const file of sourceFiles) {
			const content = readSource(file);
			if (wxPattern.test(content)) {
				violations.push(file);
			}
		}
		expect(violations).toEqual([]);
	});

	it("business route controllers are now active (demo phase)", () => {
		const routePattern =
			/@Controller\s*\(\s*['"](?:\/)?(?:admin\/try-on-sessions|admin\/customers|admin\/coupons|admin\/devices|admin\/dashboard|admin\/catalog|try-on|catalog)['"]/;
		const activeRouteFiles: string[] = [];
		for (const file of sourceFiles) {
			const content = readSource(file);
			if (routePattern.test(content)) {
				activeRouteFiles.push(file);
			}
		}
		expect(activeRouteFiles.length).toBeGreaterThan(0);
	});

	it("must not register PrismaEventPort or EVENT_PORT provider in EventModule", () => {
		const providers = getModuleProviders(EventModule);
		expect(
			providers.some((provider) => providerMatchesToken(provider, EVENT_PORT)),
		).toBe(false);
		expect(
			providers.some(
				(provider) =>
					providerToken(provider) === PrismaEventPort ||
					providerMatchesName(provider, "PrismaEventPort"),
			),
		).toBe(false);
	});

	it("AppModule may now import active business modules (demo phase)", () => {
		const imports = getModuleImports(AppModule);
		const importedNames = imports.map(moduleImportName);
		expect(importedNames).toContain("DeviceModule");
		expect(importedNames).toContain("StaffAuthModule");
	});

	it("must not import PrismaRuntimeModule or PrismaModule into AppModule", () => {
		const imports = getModuleImports(AppModule);
		expect(
			imports.some((moduleImport) =>
				moduleImportMatches(moduleImport, PrismaRuntimeModule),
			),
		).toBe(false);
		expect(imports.map(moduleImportName)).not.toContain("PrismaModule");
	});

	it("must not contain $connect( in any source file", () => {
		// Exclude lines that start with // (comments) to avoid matching explanatory comments
		const connectPattern = /^(?!\s*\/\/).*?\$connect\s*\(/m;
		const violations: string[] = [];
		for (const file of sourceFiles) {
			const content = readSource(file);
			if (connectPattern.test(content)) {
				violations.push(file);
			}
		}
		expect(violations).toEqual([]);
	});

	it("must not register DEVICE_PORT or PrismaDevice* / DevicePrisma* provider in DeviceModule", () => {
		const providers = getModuleProviders(DeviceModule);
		expect(
			providers.some((provider) => providerMatchesToken(provider, DEVICE_PORT)),
		).toBe(false);
		expect(providers.flatMap(providerNames).join("\n")).not.toMatch(
			/PrismaDevice|DevicePrisma/,
		);
	});

	it("must not register DEVICE_AUTH_PORT provider in DeviceModule", () => {
		const providers = getModuleProviders(DeviceModule);
		expect(
			providers.some((provider) =>
				providerMatchesToken(provider, DEVICE_AUTH_PORT),
			),
		).toBe(false);
	});

	it("must only register EVENT_PORT or PrismaEventPort in event-persistence module files", () => {
		const allowedModulePath = /modules\/event\/event-persistence\.module\.ts$/;
		const moduleFiles = sourceFiles.filter((file) =>
			file.endsWith(".module.ts"),
		);
		const registrationPattern =
			/provide:\s*EVENT_PORT|new\s+PrismaEventPort\s*\(/;
		const violations = moduleFiles.filter((file) => {
			if (allowedModulePath.test(file)) {
				return false;
			}
			return registrationPattern.test(readSource(file));
		});
		expect(violations).toEqual([]);
	});

	it("must only register DEVICE_AUTH_PORT or PrismaDeviceAuthPort in device-auth-persistence module files", () => {
		const allowedModulePath =
			/modules\/device\/device-auth-persistence\.module\.ts$/;
		const moduleFiles = sourceFiles.filter((file) =>
			file.endsWith(".module.ts"),
		);
		const registrationPattern =
			/provide:\s*DEVICE_AUTH_PORT|new\s+PrismaDeviceAuthPort\s*\(/;
		const violations = moduleFiles.filter((file) => {
			if (allowedModulePath.test(file)) {
				return false;
			}
			return registrationPattern.test(readSource(file));
		});
		expect(violations).toEqual([]);
	});

	it("must only register DEVICE_PORT or PrismaDevicePort in device-persistence module files", () => {
		const allowedModulePath =
			/modules\/device\/device-persistence\.module\.ts$/;
		const moduleFiles = sourceFiles.filter((file) =>
			file.endsWith(".module.ts"),
		);
		const registrationPattern =
			/provide:\s*DEVICE_PORT|new\s+PrismaDevicePort\s*\(/;
		const violations = moduleFiles.filter((file) => {
			if (allowedModulePath.test(file)) {
				return false;
			}
			return registrationPattern.test(readSource(file));
		});
		expect(violations).toEqual([]);
	});

	it("new PrismaClient( must appear exactly once and only in prisma-runtime boundary", () => {
		const pattern = /new\s+PrismaClient\s*\(/g;
		let totalCount = 0;
		let foundFile = "";
		for (const file of sourceFiles) {
			const content = readSource(file);
			const matches = content.match(pattern);
			if (matches) {
				totalCount += matches.length;
				foundFile = file;
			}
		}
		expect(totalCount).toBe(1);
		expect(foundFile).toMatch(
			/common\/prisma-runtime\/prisma-runtime\.module\.ts$/,
		);
	});

	it("prisma-runtime module source must not contain $connect( outside comments", () => {
		const boundaryPath = join(
			SRC_DIR,
			"common",
			"prisma-runtime",
			"prisma-runtime.module.ts",
		);
		const content = readSource(boundaryPath);
		const lines = content.split("\n");
		for (const line of lines) {
			const trimmed = line.trim();
			if (trimmed.startsWith("//")) continue;
			if (trimmed.includes("$connect(")) {
				throw new Error(`Unexpected $connect( in non-comment line: ${trimmed}`);
			}
		}
	});
});

import { Injectable } from "@nestjs/common";

declare const process:
	| {
			env?: Record<string, string | undefined>;
	  }
	| undefined;

const DEFAULT_APP_PORT = 3000;

function readEnv(key: string): string | undefined {
	const value = process?.env?.[key];
	return value && value.trim().length > 0 ? value : undefined;
}

function readPort(): number {
	const rawPort = readEnv("APP_PORT");
	if (!rawPort) {
		return DEFAULT_APP_PORT;
	}

	const port = Number.parseInt(rawPort, 10);
	return Number.isInteger(port) && port > 0 && port <= 65_535
		? port
		: DEFAULT_APP_PORT;
}

@Injectable()
export class RuntimeConfigService {
	readonly nodeEnv = readEnv("NODE_ENV") ?? "development";
	readonly appPort = readPort();
	readonly databaseConfigured = Boolean(readEnv("DATABASE_URL"));
	readonly redisConfigured = Boolean(readEnv("REDIS_URL"));
	readonly storageProvider = readEnv("STORAGE_PROVIDER") ?? "local";
	readonly aiGatewayProvider = readEnv("AI_GATEWAY_PROVIDER") ?? "mock";

	getDependencyReadiness(): Record<
		"database" | "redis" | "storage" | "aiGateway",
		{ status: "not_checked" | "not_configured"; provider?: string }
	> {
		return {
			database: {
				status: this.databaseConfigured ? "not_checked" : "not_configured",
			},
			redis: {
				status: this.redisConfigured ? "not_checked" : "not_configured",
			},
			storage: {
				status: this.storageProvider ? "not_checked" : "not_configured",
				provider: this.storageProvider,
			},
			aiGateway: {
				status: this.aiGatewayProvider ? "not_checked" : "not_configured",
				provider: this.aiGatewayProvider,
			},
		};
	}
}

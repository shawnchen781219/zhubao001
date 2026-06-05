import { DomainEventType } from "@jewelry/shared";
import { HttpException, Inject, Injectable } from "@nestjs/common";
import { API_ERROR_CODES } from "../../common/errors/error-codes.js";
import type { EventLogInput } from "../event/event.ports.js";
// biome-ignore lint/style/useImportType: NestJS DI requires runtime class reference for reflect-metadata paramtypes
import { EventService } from "../event/event.service.js";
import type { DeviceHeartbeatBodyDto } from "./device.dto.js";
import {
	DEVICE_PORT,
	type DeviceHeartbeatInput,
	type DevicePort,
	type DeviceStatus,
} from "./device.ports.js";

/** Recursive deny-list of keys that must not appear in health payload. Keys are lowercase for case-insensitive matching. */
const HEALTH_SENSITIVE_KEYS = new Set([
	"secret",
	"signature",
	"privatekey",
	"apikey",
	"token",
	"password",
	"credential",
]);

function isBase64Like(value: unknown): boolean {
	if (typeof value !== "string") return false;
	// Heuristic: long string with only base64 characters
	if (value.length < 100) return false;
	return /^[A-Za-z0-9+/]+={0,2}$/.test(value);
}

function containsRawMedia(value: unknown): boolean {
	if (typeof value !== "string") return false;
	const lower = value.toLowerCase();
	return (
		lower.startsWith("data:image/") ||
		lower.startsWith("data:video/") ||
		lower.startsWith("data:application/octet-stream")
	);
}

const MAX_HEALTH_DEPTH = 5;

function validateHealthPayload(
	health: unknown,
	path = "",
	depth = 0,
): { ok: true } | { ok: false; message: string } {
	if (health === undefined || health === null) {
		return { ok: true };
	}

	if (depth > MAX_HEALTH_DEPTH) {
		return {
			ok: false,
			message: `Health payload exceeds max nesting depth (${MAX_HEALTH_DEPTH}).`,
		};
	}

	if (Array.isArray(health)) {
		for (let i = 0; i < health.length; i++) {
			const item = health[i];
			if (typeof item === "string" && isBase64Like(item)) {
				return {
					ok: false,
					message: `Health payload contains base64-like data under key: ${path || "root"}[${i}].`,
				};
			}
			if (typeof item === "string" && containsRawMedia(item)) {
				return {
					ok: false,
					message: `Health payload contains raw media under key: ${path || "root"}[${i}].`,
				};
			}
			if (typeof item === "object" && item !== null) {
				const result = validateHealthPayload(
					item,
					`${path || "root"}[${i}]`,
					depth + 1,
				);
				if (!result.ok) return result;
			}
		}
		return { ok: true };
	}

	if (typeof health === "object" && health !== null) {
		for (const key of Object.keys(health)) {
			const lowerKey = key.toLowerCase();
			if (HEALTH_SENSITIVE_KEYS.has(lowerKey)) {
				return {
					ok: false,
					message: `Health payload contains forbidden key: ${path ? `${path}.` : ""}${key}.`,
				};
			}
			const value = (health as Record<string, unknown>)[key];
			if (typeof value === "string" && isBase64Like(value)) {
				return {
					ok: false,
					message: `Health payload contains base64-like data under key: ${path ? `${path}.` : ""}${key}.`,
				};
			}
			if (typeof value === "string" && containsRawMedia(value)) {
				return {
					ok: false,
					message: `Health payload contains raw media under key: ${path ? `${path}.` : ""}${key}.`,
				};
			}
			if (typeof value === "object" && value !== null) {
				const result = validateHealthPayload(
					value,
					`${path ? `${path}.` : ""}${key}`,
					depth + 1,
				);
				if (!result.ok) return result;
			}
		}
		return { ok: true };
	}

	return { ok: true };
}

function buildHealthSummary(
	health?: Record<string, unknown>,
): { healthKeys: string[]; healthKeyCount: number } | undefined {
	if (!health) return undefined;
	return {
		healthKeys: Object.keys(health),
		healthKeyCount: Object.keys(health).length,
	};
}

@Injectable()
export class DeviceService {
	constructor(
		@Inject(DEVICE_PORT)
		private readonly devicePort: DevicePort,
		private readonly eventService: EventService,
	) {}

	async acceptHeartbeat(params: {
		deviceId: string;
		requestId: string;
		body: DeviceHeartbeatBodyDto;
	}): Promise<{ serverTime: string; status: DeviceStatus }> {
		const { deviceId, requestId, body } = params;

		const validation = validateHealthPayload(body.health);
		if (!validation.ok) {
			throw new HttpException(
				{
					code: API_ERROR_CODES.validationFailed,
					message: validation.message,
				},
				400,
			);
		}

		// Pre-validate client inputs that will enter event payload
		const clientPayload: Record<string, unknown> = {};
		if (body.appVersion !== undefined) {
			Object.assign(clientPayload, { appVersion: body.appVersion });
		}
		if (body.localTime !== undefined) {
			Object.assign(clientPayload, { localTime: body.localTime });
		}
		if (Object.keys(clientPayload).length > 0) {
			this.eventService.assertPayloadSafe(clientPayload, requestId);
		}

		const input: DeviceHeartbeatInput = {
			deviceId,
			requestId,
		};
		if (body.appVersion !== undefined) {
			input.appVersion = body.appVersion;
		}
		if (body.localTime !== undefined) {
			input.localTime = body.localTime;
		}
		if (body.health !== undefined) {
			input.health = body.health;
		}

		const result = await this.devicePort.acceptHeartbeat(input);

		if (!result.storeId || result.storeId.trim().length === 0) {
			throw new HttpException(
				{
					code: API_ERROR_CODES.validationFailed,
					message: "Device storeId is missing or invalid.",
				},
				400,
			);
		}

		const eventPayload: Record<string, unknown> = {};
		if (body.appVersion !== undefined) {
			Object.assign(eventPayload, { appVersion: body.appVersion });
		}
		if (body.localTime !== undefined) {
			Object.assign(eventPayload, { localTime: body.localTime });
		}
		const healthSummary = buildHealthSummary(body.health);
		if (healthSummary !== undefined) {
			Object.assign(eventPayload, { healthSummary });
		}
		if (result.status !== undefined) {
			Object.assign(eventPayload, { status: result.status });
		}

		const eventInput: EventLogInput = {
			storeId: result.storeId,
			eventType: DomainEventType.DeviceHeartbeat,
			occurredAt: new Date().toISOString(),
			traceId: requestId,
			deviceId,
			payload: eventPayload,
		};

		await this.eventService.recordEvent(eventInput);

		return { serverTime: result.serverTime, status: result.status };
	}
}

import type { DomainEventType } from "@jewelry/shared";
import { HttpException } from "@nestjs/common";
import { API_ERROR_CODES } from "../../common/errors/error-codes.js";
import type { EventLogInput, EventPort } from "./event.ports.js";

/**
 * Minimal Prisma-shaped delegate for EventLog writes.
 *
 * Does NOT bring in PrismaClient or @prisma/client.
 * In tests, a fake delegate is provided; in future integration,
 * a real PrismaClient delegate replaces it.
 */
export interface EventLogDelegate {
	eventLog: {
		create(args: { data: EventLogCreateData }): Promise<unknown>;
	};
}

/**
 * Data shape passed to Prisma `eventLog.create({ data })`.
 *
 * Aligned with `prisma/schema.prisma` `EventLog` model fields.
 * `eventType` uses `DomainEventType`, whose values already
 * match Prisma `EventType` enum values (guaranteed by event-type-contract.spec.ts).
 */
export interface EventLogCreateData {
	storeId: string;
	eventType: DomainEventType;
	occurredAt: Date;
	deviceId?: string;
	customerId?: string;
	anonymousId?: string;
	tryOnSessionId?: string;
	payload?: Record<string, unknown>;
}

export class PrismaEventPort implements EventPort {
	constructor(private readonly delegate: EventLogDelegate) {}

	async recordEvent(input: EventLogInput): Promise<void> {
		if (!input.storeId || input.storeId.trim().length === 0) {
			throw new HttpException(
				{
					code: API_ERROR_CODES.validationFailed,
					message: "storeId is required and cannot be blank",
					traceId: input.traceId,
				},
				400,
			);
		}

		const occurredAtDate = this.parseIsoDate(input.occurredAt);
		if (!occurredAtDate) {
			throw new HttpException(
				{
					code: API_ERROR_CODES.validationFailed,
					message: "occurredAt must be a valid ISO-8601 date string",
					traceId: input.traceId,
				},
				400,
			);
		}

		const data: EventLogCreateData = {
			storeId: input.storeId,
			eventType: input.eventType,
			occurredAt: occurredAtDate,
		};

		if (input.deviceId !== undefined) {
			data.deviceId = input.deviceId;
		}
		if (input.customerId !== undefined) {
			data.customerId = input.customerId;
		}
		if (input.anonymousId !== undefined) {
			data.anonymousId = input.anonymousId;
		}
		if (input.tryOnSessionId !== undefined) {
			data.tryOnSessionId = input.tryOnSessionId;
		}
		if (input.payload !== undefined) {
			data.payload = input.payload;
		}

		await this.delegate.eventLog.create({ data });
	}

	private parseIsoDate(value: string): Date | null {
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) {
			return null;
		}
		// Reject strings that are not ISO-8601-like (e.g. pure numbers, random text)
		const isoPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
		if (!isoPattern.test(value)) {
			return null;
		}
		return date;
	}
}

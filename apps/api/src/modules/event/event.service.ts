import { HttpException, Inject, Injectable } from "@nestjs/common";
import { API_ERROR_CODES } from "../../common/errors/error-codes.js";
import {
	EVENT_PORT,
	type EventLogInput,
	type EventPort,
} from "./event.ports.js";
import { validateEventPayload } from "./event-payload-hygiene.js";

@Injectable()
export class EventService {
	constructor(@Inject(EVENT_PORT) private readonly eventPort: EventPort) {}

	async recordEvent(input: EventLogInput): Promise<void> {
		if (input.payload) {
			const result = validateEventPayload(input.payload);
			if (!result.ok) {
				throw new HttpException(
					{
						code: API_ERROR_CODES.validationFailed,
						message: result.message,
						traceId: input.traceId,
					},
					400,
				);
			}
		}
		await this.eventPort.recordEvent(input);
	}

	assertPayloadSafe(payload: Record<string, unknown>, traceId: string): void {
		const result = validateEventPayload(payload);
		if (!result.ok) {
			throw new HttpException(
				{
					code: API_ERROR_CODES.validationFailed,
					message: result.message,
					traceId,
				},
				400,
			);
		}
	}
}

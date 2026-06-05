import {
	type CallHandler,
	type ExecutionContext,
	Injectable,
	type NestInterceptor,
} from "@nestjs/common";
import { map, type Observable } from "rxjs";
import { getTraceIdFromRequest } from "./request-trace.middleware.js";

function canAttachTraceId(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

@Injectable()
export class TraceResponseInterceptor implements NestInterceptor {
	intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		const request = context.switchToHttp().getRequest<unknown>();
		const traceId = getTraceIdFromRequest(request);

		return next.handle().pipe(
			map((body: unknown) => {
				if (!canAttachTraceId(body) || "traceId" in body) {
					return body;
				}

				return {
					...body,
					traceId,
				};
			}),
		);
	}
}

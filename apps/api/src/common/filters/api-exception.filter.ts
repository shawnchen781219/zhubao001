import {
	type ArgumentsHost,
	BadRequestException,
	Catch,
	type ExceptionFilter,
	HttpException,
	HttpStatus,
	NotFoundException,
} from "@nestjs/common";
import { API_ERROR_CODES, type ApiErrorCode } from "../errors/error-codes.js";
import { getTraceIdFromRequest } from "../tracing/request-trace.middleware.js";

interface ErrorResponseBody {
	code: ApiErrorCode;
	message: string;
	traceId: string;
	details?: Record<string, unknown>;
}

function resolveCode(exception: unknown, status: number): ApiErrorCode {
	// Prefer custom code carried inside HttpException response
	if (exception instanceof HttpException) {
		const response = exception.getResponse();
		if (
			typeof response === "object" &&
			response !== null &&
			"code" in response
		) {
			const code = (response as { code: string }).code;
			if (Object.values(API_ERROR_CODES).includes(code as ApiErrorCode)) {
				return code as ApiErrorCode;
			}
		}
	}
	if (exception instanceof BadRequestException) {
		return API_ERROR_CODES.validationFailed;
	}
	if (
		exception instanceof NotFoundException ||
		status === HttpStatus.NOT_FOUND
	) {
		return API_ERROR_CODES.resourceNotFound;
	}
	if (status === HttpStatus.SERVICE_UNAVAILABLE) {
		return API_ERROR_CODES.serviceUnavailable;
	}
	return status >= 500
		? API_ERROR_CODES.internalError
		: API_ERROR_CODES.validationFailed;
}

function resolveMessage(exception: unknown, status: number): string {
	if (status >= 500) {
		return "Unexpected server error.";
	}
	if (exception instanceof HttpException) {
		const response = exception.getResponse();
		if (
			typeof response === "object" &&
			response !== null &&
			"message" in response
		) {
			const message = (response as { message?: unknown }).message;
			return Array.isArray(message)
				? "Request validation failed."
				: String(message ?? exception.message);
		}
		return exception.message;
	}
	return "Unexpected server error.";
}

function resolveDetails(
	exception: unknown,
): Record<string, unknown> | undefined {
	if (!(exception instanceof BadRequestException)) {
		return undefined;
	}

	const response = exception.getResponse();
	if (
		typeof response !== "object" ||
		response === null ||
		!("message" in response)
	) {
		return undefined;
	}

	const message = (response as { message?: unknown }).message;
	return Array.isArray(message) ? { issues: message } : undefined;
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
	catch(exception: unknown, host: ArgumentsHost): void {
		const context = host.switchToHttp();
		const response = context.getResponse<{
			status: (statusCode: number) => {
				send: (body: ErrorResponseBody) => void;
			};
		}>();
		const request = context.getRequest<unknown>();
		const status =
			exception instanceof HttpException
				? exception.getStatus()
				: HttpStatus.INTERNAL_SERVER_ERROR;
		if (!(exception instanceof HttpException)) {
			// biome-ignore lint/suspicious/noConsole: debug logging for unexpected errors
			console.error("Unhandled exception:", exception);
		}
		const details = resolveDetails(exception);
		const body: ErrorResponseBody = {
			code: resolveCode(exception, status),
			message: resolveMessage(exception, status),
			traceId: getTraceIdFromRequest(request),
			...(details ? { details } : {}),
		};

		response.status(status).send(body);
	}
}

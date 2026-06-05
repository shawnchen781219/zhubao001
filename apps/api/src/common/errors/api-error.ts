export type ApiErrorCodeValue = string;

export interface ApiErrorResponse {
	code: ApiErrorCodeValue;
	message: string;
	traceId: string;
	details?: Record<string, unknown>;
}

export class ApiContractError extends Error {
	public readonly code: ApiErrorCodeValue;
	public readonly traceId: string;
	public readonly details?: Record<string, unknown>;

	constructor(error: ApiErrorResponse) {
		super(error.message);
		this.name = "ApiContractError";
		this.code = error.code;
		this.traceId = error.traceId;
		this.details = error.details ?? {};
	}

	toResponse(): ApiErrorResponse {
		return {
			code: this.code,
			message: this.message,
			traceId: this.traceId,
			...(this.details ? { details: this.details } : {}),
		};
	}
}

export function createApiError(error: ApiErrorResponse): ApiContractError {
	return new ApiContractError(error);
}

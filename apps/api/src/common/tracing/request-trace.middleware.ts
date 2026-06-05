const TRACE_REQUEST_KEY = Symbol.for("jewelry-api.traceRequest");

interface TraceRequest {
	headers?: Record<string, string | string[] | undefined>;
	raw?: TraceRequest;
	[TRACE_REQUEST_KEY]?: {
		requestId: string;
		traceId: string;
	};
}

interface TraceReply {
	setHeader?: (name: string, value: string) => void;
	header?: (name: string, value: string) => void;
}

type NextFunction = () => void;

function randomId(): string {
	return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}

function firstHeaderValue(
	value: string | string[] | undefined,
): string | undefined {
	if (Array.isArray(value)) {
		return value[0];
	}
	return value;
}

export function getTraceIdFromRequest(request: unknown): string {
	const traceRequest = request as TraceRequest;
	return (
		traceRequest[TRACE_REQUEST_KEY]?.traceId ??
		traceRequest.raw?.[TRACE_REQUEST_KEY]?.traceId ??
		randomId()
	);
}

export function createRequestTraceMiddleware() {
	return (
		request: TraceRequest,
		reply: TraceReply,
		next: NextFunction,
	): void => {
		const requestId = firstHeaderValue(
			request.headers?.["x-request-id"] ?? request.headers?.["X-Request-Id"],
		)?.trim();
		const traceId = requestId && requestId.length > 0 ? requestId : randomId();

		request[TRACE_REQUEST_KEY] = {
			requestId: traceId,
			traceId,
		};
		reply.setHeader?.("X-Request-Id", traceId);
		reply.header?.("X-Request-Id", traceId);

		next();
	};
}

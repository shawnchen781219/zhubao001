export interface TraceContext {
	traceId: string;
	requestId: string;
	storeId?: string | undefined;
	principalId?: string | undefined;
}

export function createTraceContext(input: {
	traceId?: string;
	requestId: string;
	storeId?: string;
	principalId?: string;
}): TraceContext {
	return {
		traceId: input.traceId ?? input.requestId,
		requestId: input.requestId,
		storeId: input.storeId,
		principalId: input.principalId,
	};
}

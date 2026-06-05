export interface OfflineSyncEvent {
	id: string;
	routeId: string;
	idempotencyKey: string;
	payloadHash: string;
	createdAt: string;
	retryCount: number;
}

export interface OfflineSyncPort {
	enqueue(event: OfflineSyncEvent): Promise<void>;
	listPending(): Promise<OfflineSyncEvent[]>;
	markDelivered(eventId: string): Promise<void>;
}

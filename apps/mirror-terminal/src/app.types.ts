import type {
	ApiErrorResponse,
	DeviceSummary,
	TryOnSessionId,
	TryOnSessionSummary,
} from "@jewelry/shared";

export interface MirrorRuntimeContext {
	traceId: string;
	deviceId?: string;
	storeId?: string;
	offline: boolean;
}

export type MirrorSubsystem =
	| "main-process"
	| "renderer"
	| "device"
	| "ar-adapter"
	| "sync";

export type MirrorDeviceConnectionState =
	| { name: "unregistered"; traceId: string }
	| { name: "bootstrapping"; traceId: string }
	| { name: "online"; traceId: string; device: DeviceSummary }
	| { name: "offline"; traceId: string; device?: DeviceSummary; since: string }
	| { name: "blocked"; traceId: string; error: ApiErrorResponse };

export type MirrorTryOnSessionState =
	| { name: "idle"; traceId: string }
	| { name: "creating"; traceId: string }
	| { name: "active"; traceId: string; session: TryOnSessionSummary }
	| {
			name: "completed";
			traceId: string;
			sessionId: TryOnSessionId;
			completedAt: string;
	  }
	| { name: "failed"; traceId: string; error: ApiErrorResponse };

export type MirrorOfflineSyncState =
	| { name: "clean"; pendingEventCount: 0; lastSyncedAt?: string }
	| { name: "queued"; pendingEventCount: number; lastSyncedAt?: string }
	| { name: "syncing"; pendingEventCount: number; startedAt: string }
	| { name: "failed"; pendingEventCount: number; error: ApiErrorResponse };

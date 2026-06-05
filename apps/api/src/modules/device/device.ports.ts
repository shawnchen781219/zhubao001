export type DeviceType =
	| "MIRROR_TERMINAL"
	| "CUSTOM_PAD"
	| "ADMIN_TERMINAL"
	| "DISPLAY_SCREEN";
export type DeviceStatus =
	| "PENDING_ACTIVATION"
	| "ACTIVE"
	| "SUSPENDED"
	| "RETIRED";

export interface RegisterDeviceInput {
	storeCode: string;
	deviceCode: string;
	deviceType: DeviceType;
	displayName: string;
	idempotencyKey: string;
	traceId: string;
}

export interface RegisteredDevice {
	deviceId: string;
	deviceSecretOnce: string;
	status: DeviceStatus;
}

export interface DeviceHeartbeatInput {
	deviceId: string;
	requestId: string;
	appVersion?: string;
	localTime?: string;
	health?: Record<string, unknown>;
}

export interface DeviceHeartbeatResult {
	serverTime: string;
	status: DeviceStatus;
	storeId: string;
}

export interface DevicePort {
	registerDevice(input: RegisterDeviceInput): Promise<RegisteredDevice>;
	acceptHeartbeat(input: DeviceHeartbeatInput): Promise<DeviceHeartbeatResult>;
	assertActiveDevice(deviceId: string, traceId: string): Promise<void>;
}

/** Injection token for DevicePort */
export const DEVICE_PORT = Symbol("DEVICE_PORT");

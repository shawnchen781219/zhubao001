import { HttpException } from "@nestjs/common";
import { API_ERROR_CODES } from "../../common/errors/error-codes.js";
import type {
	DeviceHeartbeatInput,
	DeviceHeartbeatResult,
	DevicePort,
	DeviceStatus,
	RegisterDeviceInput,
	RegisteredDevice,
} from "./device.ports.js";

interface DeviceLookupRecord {
	id: string;
	storeId: string;
	status: DeviceStatus;
}

interface DeviceHeartbeatUpdateRecord {
	storeId: string;
	status: DeviceStatus;
	lastHeartbeatAt: Date;
}

export interface DeviceDelegate {
	device: {
		findUnique(args: {
			where: { id: string };
			select: { id: true; storeId: true; status: true };
		}): Promise<DeviceLookupRecord | null>;
		update(args: {
			where: { id: string };
			data: { lastHeartbeatAt: Date };
			select: { storeId: true; status: true; lastHeartbeatAt: true };
		}): Promise<DeviceHeartbeatUpdateRecord>;
	};
}

export class PrismaDevicePort implements DevicePort {
	constructor(private readonly delegate: DeviceDelegate) {}

	async registerDevice(input: RegisterDeviceInput): Promise<RegisteredDevice> {
		throw new HttpException(
			{
				code: API_ERROR_CODES.serviceUnavailable,
				message: "Device registration persistence is not implemented yet.",
				traceId: input.traceId,
			},
			503,
		);
	}

	async acceptHeartbeat(
		input: DeviceHeartbeatInput,
	): Promise<DeviceHeartbeatResult> {
		const deviceId = this.normalizeDeviceId(input.deviceId, input.requestId);
		const device = await this.findDevice(deviceId, input.requestId);
		this.assertDeviceActive(device.status, input.requestId);

		const heartbeatAt = new Date();
		const updated = await this.delegate.device.update({
			where: { id: device.id },
			data: { lastHeartbeatAt: heartbeatAt },
			select: { storeId: true, status: true, lastHeartbeatAt: true },
		});

		return {
			serverTime: heartbeatAt.toISOString(),
			status: updated.status,
			storeId: updated.storeId,
		};
	}

	async assertActiveDevice(deviceId: string, traceId: string): Promise<void> {
		const normalizedDeviceId = this.normalizeDeviceId(deviceId, traceId);
		const device = await this.findDevice(normalizedDeviceId, traceId);
		this.assertDeviceActive(device.status, traceId);
	}

	private normalizeDeviceId(deviceId: string, traceId: string): string {
		const normalizedDeviceId = deviceId.trim();
		if (normalizedDeviceId.length === 0) {
			throw new HttpException(
				{
					code: API_ERROR_CODES.validationFailed,
					message: "deviceId is required and cannot be blank.",
					traceId,
				},
				400,
			);
		}
		return normalizedDeviceId;
	}

	private async findDevice(
		deviceId: string,
		traceId: string,
	): Promise<DeviceLookupRecord> {
		const device = await this.delegate.device.findUnique({
			where: { id: deviceId },
			select: { id: true, storeId: true, status: true },
		});
		if (!device) {
			throw new HttpException(
				{
					code: API_ERROR_CODES.deviceNotFound,
					message: "Device not found.",
					traceId,
				},
				404,
			);
		}
		return device;
	}

	private assertDeviceActive(status: DeviceStatus, traceId: string): void {
		if (status !== "ACTIVE") {
			throw new HttpException(
				{
					code: API_ERROR_CODES.deviceNotActive,
					message: "Device is not active.",
					traceId,
				},
				403,
			);
		}
	}
}

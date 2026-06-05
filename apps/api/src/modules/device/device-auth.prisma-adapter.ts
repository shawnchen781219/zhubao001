import type { DeviceAuthPort } from "./device-auth.port.js";

export interface DeviceAuthDelegate {
	device: {
		findUnique(args: {
			where: { id: string };
			select: { secretHash: true; status: true };
		}): Promise<{ secretHash: string; status: string } | null>;
	};
}

export class PrismaDeviceAuthPort implements DeviceAuthPort {
	constructor(private readonly delegate: DeviceAuthDelegate) {}

	async findSecretByDeviceId(
		deviceId: string,
	): Promise<{ verificationSecret: string; status: string } | null> {
		const normalizedDeviceId = deviceId.trim();
		if (normalizedDeviceId.length === 0) {
			return null;
		}

		const device = await this.delegate.device.findUnique({
			where: { id: normalizedDeviceId },
			select: { secretHash: true, status: true },
		});
		if (!device) {
			return null;
		}

		return {
			verificationSecret: device.secretHash,
			status: device.status,
		};
	}
}

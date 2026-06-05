/**
 * Device authentication port.
 *
 * Abstraction for looking up device verification secrets and status.
 * Concrete implementation will connect to Prisma / database in a later phase.
 *
 * IMPORTANT: The returned `verificationSecret` is the server-side key material
 * used for HMAC-SHA256 request signature verification. It is NOT a general
 * password hash. See ADR-005 for the credential storage boundary.
 */
export interface DeviceAuthPort {
	/**
	 * Look up a device's verification secret and status by deviceId.
	 * @returns null if device not found.
	 */
	findSecretByDeviceId(
		deviceId: string,
	): Promise<{ verificationSecret: string; status: string } | null>;
}

/** Injection token for DeviceAuthPort */
export const DEVICE_AUTH_PORT = Symbol.for("jewelry-api.device-auth-port");

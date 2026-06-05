import {
	type CanActivate,
	type ExecutionContext,
	HttpException,
	Inject,
	Injectable,
} from "@nestjs/common";
import { API_ERROR_CODES } from "../../common/errors/error-codes.js";
import { DEVICE_AUTH_HEADERS } from "./device-auth.constants.js";
import { DEVICE_AUTH_PORT, type DeviceAuthPort } from "./device-auth.port.js";
import {
	verifyDeviceSignature,
	verifyRequestTimestamp,
} from "./device-signature.js";

export interface DevicePrincipal {
	deviceId: string;
}

declare module "@nestjs/common" {
	interface Request {
		devicePrincipal?: DevicePrincipal;
	}
}

@Injectable()
export class DeviceAuthGuard implements CanActivate {
	constructor(
		@Inject(DEVICE_AUTH_PORT)
		private readonly deviceAuthPort: DeviceAuthPort,
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest();

		const deviceId = this.getHeader(request, DEVICE_AUTH_HEADERS.DEVICE_ID);
		const signature = this.getHeader(
			request,
			DEVICE_AUTH_HEADERS.DEVICE_SIGNATURE,
		);
		const timestampStr = this.getHeader(
			request,
			DEVICE_AUTH_HEADERS.DEVICE_TIMESTAMP,
		);
		const nonce = this.getHeader(request, DEVICE_AUTH_HEADERS.DEVICE_NONCE);
		const bodyHash =
			this.getHeader(request, DEVICE_AUTH_HEADERS.BODY_HASH) ?? "";

		// Missing required fields
		if (!deviceId || !signature) {
			throw new HttpException(
				{
					code: API_ERROR_CODES.deviceSignatureMissing,
					message: "Missing required device authentication fields.",
				},
				401,
			);
		}

		// Parse and validate timestamp
		const timestamp = Number(timestampStr);
		if (!Number.isFinite(timestamp) || timestamp <= 0) {
			throw new HttpException(
				{
					code: API_ERROR_CODES.deviceClockSkew,
					message: "Invalid or missing device timestamp.",
				},
				401,
			);
		}

		// Clock skew check
		const tsResult = verifyRequestTimestamp(timestamp);
		if (!tsResult.ok) {
			throw new HttpException(
				{
					code: API_ERROR_CODES.deviceClockSkew,
					message: tsResult.message,
				},
				401,
			);
		}

		// Lookup device verification secret via port (stub for now)
		const deviceRecord =
			await this.deviceAuthPort.findSecretByDeviceId(deviceId);
		if (!deviceRecord) {
			throw new HttpException(
				{
					code: API_ERROR_CODES.deviceNotFound,
					message: "Device not found.",
				},
				401,
			);
		}

		if (deviceRecord.status !== "ACTIVE") {
			throw new HttpException(
				{
					code: API_ERROR_CODES.deviceNotActive,
					message: "Device is not active.",
				},
				401,
			);
		}

		// Build input and verify signature
		const method = (request.method as string) ?? "GET";
		const path = (request.url as string) ?? "/";

		const result = verifyDeviceSignature({
			deviceId,
			timestamp,
			nonce: nonce ?? "",
			method,
			path,
			bodyHash,
			signature,
			secret: deviceRecord.verificationSecret,
		});

		if (!result.ok) {
			throw new HttpException(
				{
					code: API_ERROR_CODES.deviceSignatureInvalid,
					message: result.message,
				},
				401,
			);
		}

		// Attach device principal to request (without secret)
		request.devicePrincipal = { deviceId } as DevicePrincipal;

		return true;
	}

	private getHeader(request: unknown, name: string): string | undefined {
		const req = request as {
			headers?: Record<string, unknown>;
			raw?: { headers?: Record<string, unknown> };
		};
		const rawValue =
			req.headers?.[name.toLowerCase()] ??
			req.headers?.[name] ??
			req.raw?.headers?.[name.toLowerCase()] ??
			req.raw?.headers?.[name];
		if (Array.isArray(rawValue)) {
			return rawValue[0];
		}
		return typeof rawValue === "string" ? rawValue : undefined;
	}
}

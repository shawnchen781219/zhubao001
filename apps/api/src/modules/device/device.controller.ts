import {
	Body,
	Controller,
	HttpCode,
	HttpException,
	type Request as NestRequest,
	Post,
	Req,
	UseGuards,
} from "@nestjs/common";
import { API_ERROR_CODES } from "../../common/errors/error-codes.js";
import { getTraceIdFromRequest } from "../../common/tracing/request-trace.middleware.js";
import type { DeviceHeartbeatBodyDto } from "./device.dto.js";
// biome-ignore lint/style/useImportType: NestJS DI requires runtime class reference for reflect-metadata paramtypes
import { DeviceService } from "./device.service.js";
import { DeviceAuthGuard, type DevicePrincipal } from "./device-auth.guard.js";

@Controller("devices")
@UseGuards(DeviceAuthGuard)
export class DeviceController {
	constructor(private readonly deviceService: DeviceService) {}

	@Post("heartbeat")
	@HttpCode(200)
	async heartbeat(
		@Req() req: NestRequest & { devicePrincipal?: DevicePrincipal },
		@Body() body: DeviceHeartbeatBodyDto,
	): Promise<{ serverTime: string; status: string; traceId: string }> {
		const deviceId = req.devicePrincipal?.deviceId;
		if (!deviceId) {
			// This should not happen because Guard ensures principal exists,
			// but we keep the check for type safety and security boundary.
			throw new HttpException(
				{
					code: API_ERROR_CODES.authForbidden,
					message: "Device principal missing after Guard.",
				},
				403,
			);
		}

		const traceId = getTraceIdFromRequest(req);

		const result = await this.deviceService.acceptHeartbeat({
			deviceId,
			requestId: traceId,
			body,
		});

		return {
			serverTime: result.serverTime,
			status: result.status,
			traceId,
		};
	}
}

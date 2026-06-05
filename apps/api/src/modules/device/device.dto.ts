/**
 * Device heartbeat request DTO.
 *
 * Pure interface — no class-validator decorators to avoid introducing new
 * validation dependencies. Validation is performed manually in DeviceService.
 */
export interface DeviceHeartbeatBodyDto {
	appVersion?: string;
	localTime?: string;
	health?: Record<string, unknown>;
}

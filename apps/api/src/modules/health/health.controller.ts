import { Controller, Get } from "@nestjs/common";
// biome-ignore lint/style/useImportType: NestJS decorator metadata needs this runtime value for DI.
import { HealthService } from "./health.service.js";

@Controller()
export class HealthController {
	constructor(private readonly healthService: HealthService) {}

	@Get("healthz")
	getHealth() {
		return this.healthService.getHealth();
	}

	@Get("readyz")
	getReadiness() {
		return this.healthService.getReadiness();
	}
}

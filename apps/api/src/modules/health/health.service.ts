import { Injectable } from "@nestjs/common";
// biome-ignore lint/style/useImportType: NestJS decorator metadata needs this runtime value for DI.
import { RuntimeConfigService } from "../../common/config/runtime-config.service.js";

@Injectable()
export class HealthService {
	constructor(private readonly config: RuntimeConfigService) {}

	getHealth() {
		return {
			status: "ok",
			service: "jewelry-api",
			timestamp: new Date().toISOString(),
		};
	}

	getReadiness() {
		return {
			status: "ok",
			service: "jewelry-api",
			timestamp: new Date().toISOString(),
			dependencies: this.config.getDependencyReadiness(),
		};
	}
}

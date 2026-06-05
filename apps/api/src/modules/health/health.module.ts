import { Module } from "@nestjs/common";
import { RuntimeConfigModule } from "../../common/config/runtime-config.module.js";
import { HealthController } from "./health.controller.js";
import { HealthService } from "./health.service.js";

@Module({
	imports: [RuntimeConfigModule],
	controllers: [HealthController],
	providers: [HealthService],
})
export class HealthModule {}

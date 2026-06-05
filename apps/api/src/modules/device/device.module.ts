import { Module } from "@nestjs/common";
import { EventModule } from "../event/event.module.js";
import { EventPersistenceModule } from "../event/event-persistence.module.js";
import { DeviceController } from "./device.controller.js";
import { DeviceService } from "./device.service.js";
import { DeviceAuthGuard } from "./device-auth.guard.js";
import { DeviceAuthPersistenceModule } from "./device-auth-persistence.module.js";
import { DevicePersistenceModule } from "./device-persistence.module.js";

@Module({
	imports: [
		EventModule,
		EventPersistenceModule,
		DevicePersistenceModule,
		DeviceAuthPersistenceModule,
	],
	controllers: [DeviceController],
	providers: [DeviceService, DeviceAuthGuard],
})
export class DeviceModule {}

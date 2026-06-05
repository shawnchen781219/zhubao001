import { Module } from "@nestjs/common";
import { PrismaRuntimeModule } from "../../common/prisma-runtime/prisma-runtime.module.js";
import { PRISMA_CLIENT } from "../../common/prisma-runtime/prisma-runtime.tokens.js";
import { DEVICE_PORT } from "./device.ports.js";
import {
	type DeviceDelegate,
	PrismaDevicePort,
} from "./device.prisma-adapter.js";

@Module({
	imports: [PrismaRuntimeModule],
	providers: [
		{
			provide: DEVICE_PORT,
			useFactory: (client: DeviceDelegate): PrismaDevicePort =>
				new PrismaDevicePort(client),
			inject: [PRISMA_CLIENT],
		},
	],
	exports: [DEVICE_PORT],
})
export class DevicePersistenceModule {}

import { Module } from "@nestjs/common";
import { PrismaRuntimeModule } from "../../common/prisma-runtime/prisma-runtime.module.js";
import { PRISMA_CLIENT } from "../../common/prisma-runtime/prisma-runtime.tokens.js";
import { DEVICE_AUTH_PORT } from "./device-auth.port.js";
import {
	type DeviceAuthDelegate,
	PrismaDeviceAuthPort,
} from "./device-auth.prisma-adapter.js";

@Module({
	imports: [PrismaRuntimeModule],
	providers: [
		{
			provide: DEVICE_AUTH_PORT,
			useFactory: (client: DeviceAuthDelegate): PrismaDeviceAuthPort =>
				new PrismaDeviceAuthPort(client),
			inject: [PRISMA_CLIENT],
		},
	],
	exports: [DEVICE_AUTH_PORT],
})
export class DeviceAuthPersistenceModule {}

import { Module } from "@nestjs/common";
import { PrismaRuntimeModule } from "../../common/prisma-runtime/prisma-runtime.module.js";
import { PRISMA_CLIENT } from "../../common/prisma-runtime/prisma-runtime.tokens.js";
import { EVENT_PORT } from "./event.ports.js";
import {
	type EventLogDelegate,
	PrismaEventPort,
} from "./event.prisma-adapter.js";

@Module({
	imports: [PrismaRuntimeModule],
	providers: [
		{
			provide: EVENT_PORT,
			useFactory: (client: EventLogDelegate): PrismaEventPort =>
				new PrismaEventPort(client),
			inject: [PRISMA_CLIENT],
		},
	],
	exports: [EVENT_PORT],
})
export class EventPersistenceModule {}

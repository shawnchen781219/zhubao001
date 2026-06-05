import { Module } from "@nestjs/common";
import { EventService } from "./event.service.js";
import { EventPersistenceModule } from "./event-persistence.module.js";

@Module({
	imports: [EventPersistenceModule],
	providers: [EventService],
	exports: [EventService],
})
export class EventModule {}

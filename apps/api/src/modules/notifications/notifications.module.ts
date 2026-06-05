import { Module } from "@nestjs/common";
import { PrismaRuntimeModule } from "../../common/prisma-runtime/prisma-runtime.module.js";
import { MemberModule } from "../member/member.module.js";
import { NotificationController } from "./notifications.controller.js";
import { NotificationService } from "./notifications.service.js";

@Module({
	imports: [PrismaRuntimeModule, MemberModule],
	controllers: [NotificationController],
	providers: [NotificationService],
	exports: [NotificationService],
})
export class NotificationModule {}

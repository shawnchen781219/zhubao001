import { Module } from "@nestjs/common";
import { PrismaRuntimeModule } from "../../common/prisma-runtime/prisma-runtime.module.js";
import { MemberModule } from "../member/member.module.js";
import { BlindBoxController } from "./blind-box.controller.js";
import { BlindBoxService } from "./blind-box.service.js";

@Module({
	imports: [PrismaRuntimeModule, MemberModule],
	controllers: [BlindBoxController],
	providers: [BlindBoxService],
	exports: [BlindBoxService],
})
export class BlindBoxModule {}

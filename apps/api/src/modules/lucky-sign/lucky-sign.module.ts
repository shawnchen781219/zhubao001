import { Module } from "@nestjs/common";
import { PrismaRuntimeModule } from "../../common/prisma-runtime/prisma-runtime.module.js";
import { MemberModule } from "../member/member.module.js";
import { LuckySignController } from "./lucky-sign.controller.js";
import { LuckySignService } from "./lucky-sign.service.js";

@Module({
	imports: [PrismaRuntimeModule, MemberModule],
	providers: [LuckySignService],
	controllers: [LuckySignController],
	exports: [LuckySignService],
})
export class LuckySignModule {}

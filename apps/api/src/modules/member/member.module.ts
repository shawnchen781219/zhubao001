import { Module } from "@nestjs/common";
import { PrismaRuntimeModule } from "../../common/prisma-runtime/prisma-runtime.module.js";
import { H5MemberController } from "./h5-member.controller.js";
import { AdminMemberController } from "./member.controller.js";
import { MemberService } from "./member.service.js";

@Module({
	imports: [PrismaRuntimeModule],
	providers: [MemberService],
	controllers: [AdminMemberController, H5MemberController],
	exports: [MemberService],
})
export class MemberModule {}

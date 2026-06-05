import { Module } from "@nestjs/common";
import { PrismaRuntimeModule } from "../../common/prisma-runtime/prisma-runtime.module.js";
import { MemberModule } from "../member/member.module.js";
import {
	AdminTryOnController,
	TryOnPublicController,
} from "./try-on.controllers.js";
import { TryOnService } from "./try-on.service.js";

@Module({
	imports: [PrismaRuntimeModule, MemberModule],
	providers: [TryOnService],
	controllers: [AdminTryOnController, TryOnPublicController],
	exports: [TryOnService],
})
export class TryOnModule {}

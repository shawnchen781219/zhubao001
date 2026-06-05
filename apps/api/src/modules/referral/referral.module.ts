import { Module } from "@nestjs/common";
import { PrismaRuntimeModule } from "../../common/prisma-runtime/prisma-runtime.module.js";
import { MemberModule } from "../member/member.module.js";
import { ReferralController } from "./referral.controller.js";
import { ReferralService } from "./referral.service.js";

@Module({
	imports: [PrismaRuntimeModule, MemberModule],
	controllers: [ReferralController],
	providers: [ReferralService],
	exports: [ReferralService],
})
export class ReferralModule {}

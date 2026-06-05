import { Module } from "@nestjs/common";
import { PrismaRuntimeModule } from "../../common/prisma-runtime/prisma-runtime.module.js";
import { MemberModule } from "../member/member.module.js";
import { JewelryBoxController } from "./jewelry-box.controller.js";
import { JewelryBoxService } from "./jewelry-box.service.js";

@Module({
	imports: [PrismaRuntimeModule, MemberModule],
	providers: [JewelryBoxService],
	controllers: [JewelryBoxController],
	exports: [JewelryBoxService],
})
export class JewelryBoxModule {}

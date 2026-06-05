import { Module } from "@nestjs/common";
import { PrismaRuntimeModule } from "../../common/prisma-runtime/prisma-runtime.module.js";
import { CareController } from "./care.controller.js";
import { CareService } from "./care.service.js";

@Module({
	imports: [PrismaRuntimeModule],
	providers: [CareService],
	controllers: [CareController],
	exports: [CareService],
})
export class CareModule {}

import { Module } from "@nestjs/common";
import { PrismaRuntimeModule } from "../../common/prisma-runtime/prisma-runtime.module.js";
import { StaffAuthController } from "./staff-auth.controller.js";
import { StaffAuthService } from "./staff-auth.service.js";

@Module({
	imports: [PrismaRuntimeModule],
	providers: [StaffAuthService],
	controllers: [StaffAuthController],
	exports: [StaffAuthService],
})
export class StaffAuthModule {}

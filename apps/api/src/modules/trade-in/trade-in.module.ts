import { Module } from "@nestjs/common";
import { PrismaRuntimeModule } from "../../common/prisma-runtime/prisma-runtime.module.js";
import { TradeInController } from "./trade-in.controller.js";
import { TradeInPricingService } from "./trade-in.pricing.service.js";
import { TradeInService } from "./trade-in.service.js";

@Module({
	imports: [PrismaRuntimeModule],
	controllers: [TradeInController],
	providers: [TradeInService, TradeInPricingService],
	exports: [TradeInService],
})
export class TradeInModule {}

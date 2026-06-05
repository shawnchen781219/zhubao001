import { Module } from "@nestjs/common";
import { PrismaRuntimeModule } from "../../common/prisma-runtime/prisma-runtime.module.js";
import { AdminCouponController } from "./coupon.controller.js";
import { CouponService } from "./coupon.service.js";

@Module({
	imports: [PrismaRuntimeModule],
	providers: [CouponService],
	controllers: [AdminCouponController],
	exports: [CouponService],
})
export class CouponModule {}

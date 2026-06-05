import { Module } from "@nestjs/common";
import { PrismaRuntimeModule } from "../../common/prisma-runtime/prisma-runtime.module.js";
import { AdminCustomerController } from "./admin-customer.controller.js";
import { CustomerService } from "./customer.service.js";

@Module({
	imports: [PrismaRuntimeModule],
	providers: [CustomerService],
	controllers: [AdminCustomerController],
	exports: [CustomerService],
})
export class CustomerModule {}

import { Module } from "@nestjs/common";
import { RuntimeConfigModule } from "./common/config/runtime-config.module.js";
import { AdminDeviceModule } from "./modules/admin/admin.module.js";
import { AdminAggregateModule } from "./modules/admin/admin-aggregate.module.js";
import { StaffAuthModule } from "./modules/auth/staff-auth.module.js";
import { CareModule } from "./modules/care/care.module.js";
import { CatalogModule } from "./modules/catalog/catalog.controllers.js";
import { CouponModule } from "./modules/coupon/coupon.module.js";
import { CustomerModule } from "./modules/customer/customer.module.js";
import { DeviceModule } from "./modules/device/device.module.js";
import { HealthModule } from "./modules/health/health.module.js";
import { JewelryBoxModule } from "./modules/jewelry-box/jewelry-box.module.js";
import { LuckySignModule } from "./modules/lucky-sign/lucky-sign.module.js";
import { MemberModule } from "./modules/member/member.module.js";
import { ReferralModule } from "./modules/referral/referral.module.js";
import { TradeInModule } from "./modules/trade-in/trade-in.module.js";
import { TryOnModule } from "./modules/try-on/try-on.module.js";

export interface ApiModuleBoundary {
	name: string;
	ownsWrites: string[];
	reads: string[];
}

export const API_MODULE_BOUNDARIES: ApiModuleBoundary[] = [
	{
		name: "AuthModule",
		ownsWrites: ["CustomerIdentity"],
		reads: ["StaffUser", "Customer", "Device"],
	},
	{
		name: "DeviceModule",
		ownsWrites: ["Device"],
		reads: ["Store", "StaffUser"],
	},
	{
		name: "CatalogModule",
		ownsWrites: ["Product", "ProductAsset", "Gemstone"],
		reads: ["Store", "Product", "ProductAsset", "Gemstone"],
	},
	{
		name: "TryOnModule",
		ownsWrites: ["TryOnSession", "TryOnItem"],
		reads: ["Device", "Product", "Customer"],
	},
	{
		name: "MediaModule",
		ownsWrites: ["MediaAsset"],
		reads: ["TryOnSession", "TryOnItem", "Customer", "Store"],
	},
	{
		name: "CouponModule",
		ownsWrites: ["CouponTemplate", "Coupon"],
		reads: ["Customer", "TryOnSession", "Store", "StaffUser"],
	},
	{
		name: "CustomerModule",
		ownsWrites: ["Customer"],
		reads: ["CustomerIdentity", "TryOnSession", "Coupon", "EventLog"],
	},
	{ name: "EventModule", ownsWrites: ["EventLog"], reads: [] },
	{
		name: "AdminModule",
		ownsWrites: [],
		reads: ["Customer", "TryOnSession", "Coupon", "Device", "EventLog"],
	},
	{
		name: "JewelryBoxModule",
		ownsWrites: ["JewelryBoxItem"],
		reads: ["Customer", "Product", "Gemstone", "ProductAsset"],
	},
	{
		name: "CareModule",
		ownsWrites: ["CareReminder"],
		reads: ["Customer", "JewelryBoxItem"],
	},
	{
		name: "LuckySignModule",
		ownsWrites: ["LuckySignRecord"],
		reads: ["Customer"],
	},
	{
		name: "MemberModule",
		ownsWrites: ["MemberProfile", "PointsTransaction", "MemberLevelRule"],
		reads: ["Customer", "JewelryBoxItem"],
	},
	{
		name: "ReferralModule",
		ownsWrites: ["ReferralCard", "ReferralEvent"],
		reads: ["Customer", "Store"],
	},
];

@Module({
	imports: [
		RuntimeConfigModule,
		HealthModule,
		StaffAuthModule,
		DeviceModule,
		CustomerModule,
		TryOnModule,
		CouponModule,
		CatalogModule,
		AdminDeviceModule,
		AdminAggregateModule,
		JewelryBoxModule,
		CareModule,
		LuckySignModule,
		MemberModule,
		ReferralModule,
		TradeInModule,
	],
})
export class AppModule {}

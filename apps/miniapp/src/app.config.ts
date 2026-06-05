export interface MiniappRouteConfig {
	path: string;
	purpose: string;
	requiresCustomerAuth: boolean;
}

export const MINIAPP_ROUTES: MiniappRouteConfig[] = [
	{
		path: "pages/scan-entry/index",
		purpose: "Mirror QR scan landing and customer authorization entry.",
		requiresCustomerAuth: false,
	},
	{
		path: "pages/coupon-wallet/index",
		purpose: "First-visit coupon wallet and claim result placeholder.",
		requiresCustomerAuth: true,
	},
	{
		path: "pages/try-on-media/index",
		purpose: "Authorized try-on photo/video viewing placeholder.",
		requiresCustomerAuth: true,
	},
];

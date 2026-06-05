export interface AdminRouteDefinition {
	path: string;
	page: "customers" | "try-on-sessions" | "coupons" | "devices";
	requiredPermission: string;
}

export const ADMIN_ROUTES: AdminRouteDefinition[] = [
	{
		path: "/customers",
		page: "customers",
		requiredPermission: "customer:read",
	},
	{
		path: "/try-on-sessions",
		page: "try-on-sessions",
		requiredPermission: "try-on:read",
	},
	{ path: "/coupons", page: "coupons", requiredPermission: "coupon:read" },
	{ path: "/devices", page: "devices", requiredPermission: "device:read" },
];

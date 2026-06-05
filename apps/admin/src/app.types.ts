import type {
	ApiErrorResponse,
	CouponSummary,
	CustomerSummary,
	DeviceSummary,
	PageMeta,
	TryOnSessionSummary,
} from "@jewelry/shared";

export interface AdminRouteContext {
	traceId: string;
	staffUserId: string;
	storeId: string;
}

export type AdminPageKey =
	| "customers"
	| "try-on-sessions"
	| "coupons"
	| "devices";

export type AdminListResource = AdminPageKey;

export type AdminListItemSummary =
	| CustomerSummary
	| TryOnSessionSummary
	| CouponSummary
	| DeviceSummary;

export type AdminListLoadingState =
	| { name: "idle"; resource: AdminListResource }
	| { name: "loading"; resource: AdminListResource; page: number }
	| {
			name: "loaded";
			resource: AdminListResource;
			meta: PageMeta;
			items: AdminListItemSummary[];
	  }
	| { name: "failed"; resource: AdminListResource; error: ApiErrorResponse };

export interface AdminFilterState {
	resource: AdminListResource;
	keyword?: string;
	storeId: string;
	status?: string;
	page: number;
	pageSize: number;
}

export type AdminStoreIsolationNoticeState =
	| { name: "hidden"; storeId: string }
	| { name: "visible"; storeId: string; message: string }
	| { name: "blocked"; storeId: string; error: ApiErrorResponse };

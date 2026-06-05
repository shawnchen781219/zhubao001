import type { ApiErrorResponse, CustomerId, StoreId } from "@jewelry/shared";

export interface H5PageContext {
	traceId: string;
	storeId?: string;
	customerId?: string;
}

export type H5PageKey = "gemstone-passport" | "share-card";

export interface GemstonePassportViewModel {
	passportId: string;
	storeId: StoreId;
	title: string;
	certificateNo?: string;
	primaryImageUrl?: string;
	updatedAt: string;
}

export type H5GemstonePassportLoadingState =
	| { name: "idle"; traceId: string; passportId?: string }
	| { name: "loading"; traceId: string; passportId: string }
	| { name: "loaded"; traceId: string; passport: GemstonePassportViewModel }
	| { name: "failed"; traceId: string; error: ApiErrorResponse };

export type H5ShareCardState =
	| { name: "draft"; traceId: string; customerId?: CustomerId }
	| { name: "rendering"; traceId: string; customerId?: CustomerId }
	| { name: "ready"; traceId: string; imageUrl: string; shareUrl: string }
	| { name: "failed"; traceId: string; error: ApiErrorResponse };

export type GemstonePassportLoadingState = H5GemstonePassportLoadingState;

export type ShareCardState = H5ShareCardState;

export type MediaType = "PHOTO" | "VIDEO" | "POSTER" | "THUMBNAIL";
export type MediaAuthorizationScope = "UPLOAD_PRIVATE" | "SHARE_CARD";

export interface AuthorizeMediaInput {
	sessionId: string;
	customerId: string;
	mediaType: MediaType;
	localMediaKey: string;
	authorizationScope: MediaAuthorizationScope;
	idempotencyKey: string;
	traceId: string;
}

export interface MediaAssetDto {
	id: string;
	type: MediaType;
	storageKey: string;
	authorizationStatus: string;
	expiresAt?: string | null;
}

export interface MediaPort {
	authorizeMedia(input: AuthorizeMediaInput): Promise<MediaAssetDto>;
	expireMedia(mediaAssetId: string, traceId: string): Promise<void>;
	deleteMedia(mediaAssetId: string, traceId: string): Promise<void>;
}

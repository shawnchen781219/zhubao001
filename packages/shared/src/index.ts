export type StoreId = string;
export type CustomerId = string;
export type DeviceId = string;
export type TryOnSessionId = string;
export type CouponId = string;

export const AUTH_HEADERS = {
	deviceId: "X-Device-Id",
	deviceSignature: "X-Device-Signature",
	requestId: "X-Request-Id",
	idempotencyKey: "X-Idempotency-Key",
} as const;

export enum RequirementPriority {
	P0 = "P0",
	P1 = "P1",
	P2 = "P2",
}

export enum CustomerIdentityType {
	WechatOpenId = "WECHAT_OPENID",
	WechatUnionId = "WECHAT_UNIONID",
	Phone = "PHONE",
	StaffCreated = "STAFF_CREATED",
}

export enum DeviceType {
	MirrorTerminal = "MIRROR_TERMINAL",
	CustomPad = "CUSTOM_PAD",
	AdminTerminal = "ADMIN_TERMINAL",
	DisplayScreen = "DISPLAY_SCREEN",
}

export enum TryOnSessionStatus {
	Anonymous = "ANONYMOUS",
	QrShown = "QR_SHOWN",
	Scanned = "SCANNED",
	Authorized = "AUTHORIZED",
	Completed = "COMPLETED",
	Expired = "EXPIRED",
}

export enum ApiErrorCode {
	AuthMissingToken = "AUTH_MISSING_TOKEN",
	AuthInvalidToken = "AUTH_INVALID_TOKEN",
	AuthForbidden = "AUTH_FORBIDDEN",
	AuthStoreScopeViolation = "AUTH_STORE_SCOPE_VIOLATION",
	AuthIdentityConflict = "AUTH_IDENTITY_CONFLICT",
	DeviceBootstrapInvalid = "DEVICE_BOOTSTRAP_INVALID",
	DeviceSignatureMissing = "DEVICE_SIGNATURE_MISSING",
	DeviceSignatureInvalid = "DEVICE_SIGNATURE_INVALID",
	DeviceNotFound = "DEVICE_NOT_FOUND",
	DeviceNotActive = "DEVICE_NOT_ACTIVE",
	DeviceClockSkew = "DEVICE_CLOCK_SKEW",
	TryOnSessionNotFound = "TRY_ON_SESSION_NOT_FOUND",
	TryOnSessionExpired = "TRY_ON_SESSION_EXPIRED",
	TryOnSessionAlreadyBound = "TRY_ON_SESSION_ALREADY_BOUND",
	TryOnInvalidStatus = "TRY_ON_INVALID_STATUS",
	TryOnProductNotFound = "TRY_ON_PRODUCT_NOT_FOUND",
	MediaAuthRequired = "MEDIA_AUTH_REQUIRED",
	MediaSessionNotAuthorized = "MEDIA_SESSION_NOT_AUTHORIZED",
	MediaInvalidScope = "MEDIA_INVALID_SCOPE",
	MediaExpired = "MEDIA_EXPIRED",
	MediaStorageKeyInvalid = "MEDIA_STORAGE_KEY_INVALID",
	CouponTemplateNotFound = "COUPON_TEMPLATE_NOT_FOUND",
	CouponAlreadyClaimed = "COUPON_ALREADY_CLAIMED",
	CouponNotFound = "COUPON_NOT_FOUND",
	CouponExpired = "COUPON_EXPIRED",
	CouponAlreadyRedeemed = "COUPON_ALREADY_REDEEMED",
	CouponInvalidStatus = "COUPON_INVALID_STATUS",
	IdempotencyKeyMissing = "IDEMPOTENCY_KEY_MISSING",
	IdempotencyReplay = "IDEMPOTENCY_REPLAY",
	IdempotencyConflict = "IDEMPOTENCY_CONFLICT",
	ValidationFailed = "VALIDATION_FAILED",
	ResourceNotFound = "RESOURCE_NOT_FOUND",
	RateLimited = "RATE_LIMITED",
	InternalError = "INTERNAL_ERROR",
	ServiceUnavailable = "SERVICE_UNAVAILABLE",
}

export enum DomainEventType {
	DeviceRegistered = "DEVICE_REGISTERED",
	DeviceHeartbeat = "DEVICE_HEARTBEAT",
	DeviceSuspended = "DEVICE_SUSPENDED",
	CatalogSynced = "CATALOG_SYNCED",
	TryOnStarted = "TRY_ON_STARTED",
	TryOnItemSelected = "TRY_ON_ITEM_SELECTED",
	TryOnQrShown = "TRY_ON_QR_SHOWN",
	TryOnQrScanned = "TRY_ON_QR_SCANNED",
	TryOnAuthorized = "TRY_ON_AUTHORIZED",
	TryOnCompleted = "TRY_ON_COMPLETED",
	CustomerAuthorized = "CUSTOMER_AUTHORIZED",
	CustomerCreated = "CUSTOMER_CREATED",
	CustomerMerged = "CUSTOMER_MERGED",
	CustomerProfileUpdated = "CUSTOMER_PROFILE_UPDATED",
	MediaAuthorized = "MEDIA_AUTHORIZED",
	MediaExpired = "MEDIA_EXPIRED",
	MediaDeleted = "MEDIA_DELETED",
	CouponIssued = "COUPON_ISSUED",
	CouponRedeemed = "COUPON_REDEEMED",
	CouponExpired = "COUPON_EXPIRED",
	CouponVoided = "COUPON_VOIDED",
	StaffFollowUpCreated = "STAFF_FOLLOW_UP_CREATED",
}

export const ApiRoute = {
	DevicesRegister: "/devices/register",
	DevicesHeartbeat: "/devices/heartbeat",
	DevicesCatalogSync: "/devices/catalog-sync",
	TryOnSessions: "/try-on/sessions",
	TryOnSessionItems: "/try-on/sessions/{sessionId}/items",
	TryOnSessionQrShown: "/try-on/sessions/{sessionId}/qr-shown",
	TryOnSessionScan: "/try-on/sessions/{sessionId}/scan",
	TryOnSessionAuthorizeMedia: "/try-on/sessions/{sessionId}/authorize-media",
	CouponsClaim: "/coupons/claim",
	CouponRedeem: "/coupons/{couponId}/redeem",
	AdminCustomers: "/admin/customers",
	AdminTryOnSessions: "/admin/try-on-sessions",
	AdminCoupons: "/admin/coupons",
	AdminDevices: "/admin/devices",
} as const;

export type ApiRoute = (typeof ApiRoute)[keyof typeof ApiRoute];

export enum ApiAuthMode {
	DeviceSignature = "DEVICE_SIGNATURE",
	DeviceBootstrap = "DEVICE_BOOTSTRAP",
	CustomerBearer = "CUSTOMER_BEARER",
	StaffBearer = "STAFF_BEARER",
}

export const SIDE_EFFECT_ROUTES = [
	ApiRoute.DevicesRegister,
	ApiRoute.TryOnSessions,
	ApiRoute.TryOnSessionItems,
	ApiRoute.TryOnSessionQrShown,
	ApiRoute.TryOnSessionScan,
	ApiRoute.TryOnSessionAuthorizeMedia,
	ApiRoute.CouponsClaim,
	ApiRoute.CouponRedeem,
] as const;

export type SideEffectRoute = (typeof SIDE_EFFECT_ROUTES)[number];

export interface ApiErrorResponse {
	code: ApiErrorCode;
	message: string;
	traceId: string;
	details?: Record<string, unknown>;
}

export interface PageMeta {
	page: number;
	pageSize: number;
	total: number;
	hasNextPage: boolean;
}

export interface TryOnSessionSummary {
	id: TryOnSessionId;
	storeId: StoreId;
	deviceId?: DeviceId;
	customerId?: CustomerId;
	status: TryOnSessionStatus;
	itemCount: number;
	startedAt: string;
	updatedAt: string;
}

export interface CouponSummary {
	id: CouponId;
	storeId: StoreId;
	customerId?: CustomerId;
	templateName: string;
	status: "CLAIMED" | "REDEEMED" | "EXPIRED" | "VOIDED";
	claimedAt?: string;
	redeemedAt?: string;
	expiresAt?: string;
}

export interface DeviceSummary {
	id: DeviceId;
	storeId: StoreId;
	name: string;
	type: DeviceType;
	active: boolean;
	lastHeartbeatAt?: string;
	catalogVersion?: string;
}

export interface CustomerSummary {
	id: CustomerId;
	storeId: StoreId;
	displayName?: string;
	phoneMasked?: string;
	identityTypes: CustomerIdentityType[];
	lastSeenAt?: string;
	createdAt: string;
}

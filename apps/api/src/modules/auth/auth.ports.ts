export type PrincipalKind = "CUSTOMER" | "STAFF" | "DEVICE";

export interface AuthenticatedPrincipal {
	kind: PrincipalKind;
	principalId: string;
	storeId: string;
	traceId: string;
}

export interface CustomerIdentityBindingInput {
	customerId: string;
	identityType: "WECHAT_OPENID" | "WECHAT_UNIONID" | "PHONE" | "STAFF_CREATED";
	identityHash: string;
	verifiedAt: string;
}

export interface AuthPort {
	validateCustomerBearerToken(
		token: string,
		traceId: string,
	): Promise<AuthenticatedPrincipal>;
	validateStaffBearerToken(
		token: string,
		traceId: string,
	): Promise<AuthenticatedPrincipal>;
	validateDeviceSignature(
		input: DeviceSignatureInput,
	): Promise<AuthenticatedPrincipal>;
	bindCustomerIdentity(input: CustomerIdentityBindingInput): Promise<void>;
}

export interface DeviceSignatureInput {
	deviceId: string;
	requestId: string;
	signature: string;
	payloadHash: string;
}

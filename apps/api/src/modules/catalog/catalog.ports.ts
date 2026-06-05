export interface CatalogAssetDto {
	kind: "IMAGE" | "VIDEO" | "MODEL_3D" | "CERTIFICATE" | "DESIGN_DRAFT";
	storageKey: string;
	checksumHash?: string;
}

export interface ProductCatalogItemDto {
	productId: string;
	sku: string;
	name: string;
	type: string;
	assets: CatalogAssetDto[];
}

export interface CatalogSyncInput {
	storeId: string;
	deviceId: string;
	since?: string;
	traceId: string;
}

export interface CatalogPort {
	getCatalogDelta(input: CatalogSyncInput): Promise<ProductCatalogItemDto[]>;
	assertTryOnProductActive(
		storeId: string,
		productId: string,
		traceId: string,
	): Promise<void>;
}

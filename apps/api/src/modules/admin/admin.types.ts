export interface AdminListInput {
	storeId: string;
	staffUserId: string;
	page: number;
	pageSize: number;
	traceId: string;
}

export interface PagedResult<TItem> {
	items: TItem[];
	page: { page: number; pageSize: number; total: number };
}

export interface AdminPort {
	listCustomers(input: AdminListInput): Promise<PagedResult<unknown>>;
	listTryOnSessions(input: AdminListInput): Promise<PagedResult<unknown>>;
	listCoupons(input: AdminListInput): Promise<PagedResult<unknown>>;
	listDevices(input: AdminListInput): Promise<PagedResult<unknown>>;
}

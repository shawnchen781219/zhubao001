export interface CustomerSummaryDto {
	id: string;
	storeId: string;
	displayName?: string | null;
	status: string;
	createdAt: string;
}

export interface CreateSparseCustomerInput {
	storeId: string;
	displayName?: string;
	traceId: string;
}

export interface ListCustomersInput {
	storeId: string;
	page: number;
	pageSize: number;
	traceId: string;
}

export interface CustomerPort {
	createSparseCustomer(
		input: CreateSparseCustomerInput,
	): Promise<CustomerSummaryDto>;
	getCustomerProfile(
		storeId: string,
		customerId: string,
		traceId: string,
	): Promise<CustomerSummaryDto>;
	listCustomersForAdmin(
		input: ListCustomersInput,
	): Promise<{ items: CustomerSummaryDto[]; total: number }>;
}

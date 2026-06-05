import {
	Controller,
	Get,
	Inject,
	Injectable,
	Module,
	Param,
	Query,
	Req,
	UseGuards,
} from "@nestjs/common";
import { PrismaRuntimeModule } from "../../common/prisma-runtime/prisma-runtime.module.js";
import { PRISMA_CLIENT } from "../../common/prisma-runtime/prisma-runtime.tokens.js";
import type { PrismaClient } from "../../generated/client.js";
import type { StaffPrincipal } from "../auth/staff-auth.guard.js";
import { getStaffPrincipal, StaffAuthGuard } from "../auth/staff-auth.guard.js";

@Injectable()
export class CatalogService {
	constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

	async listProducts(
		storeId: string,
		opts?: { type?: string; page?: number; pageSize?: number },
	) {
		const page = opts?.page ?? 1;
		const pageSize = opts?.pageSize ?? 20;
		const where: Record<string, unknown> = { storeId, status: "ACTIVE" };
		const type = opts?.type;
		if (type && type !== "all") where["type"] = type;
		const [items, total] = await Promise.all([
			this.prisma.product.findMany({
				where,
				include: {
					gemstone: true,
					assets: {
						where: { kind: "IMAGE" },
						take: 3,
						orderBy: { sortOrder: "asc" },
					},
				},
				orderBy: { createdAt: "desc" },
				skip: (page - 1) * pageSize,
				take: pageSize,
			}),
			this.prisma.product.count({ where }),
		]);
		return { items, total, page, pageSize };
	}

	async getProduct(productId: string) {
		return this.prisma.product.findUnique({
			where: { id: productId },
			include: {
				gemstone: true,
				assets: { orderBy: { sortOrder: "asc" } },
				tryOnItems: {
					take: 5,
					include: {
						tryOnSession: {
							select: { id: true, status: true, startedAt: true },
						},
					},
				},
			},
		});
	}
}

@Controller("admin/catalog")
@UseGuards(StaffAuthGuard)
export class AdminCatalogController {
	constructor(private readonly catalogService: CatalogService) {}

	@Get()
	async list(
		@Req() req: Record<symbol, unknown>,
		@Query("type") type: string | undefined,
		@Query("page") page: string | undefined,
		@Query("pageSize") pageSize: string | undefined,
	) {
		const principal = getStaffPrincipal(req) as StaffPrincipal | null;
		const listOpts: { type?: string; page?: number; pageSize?: number } = {};
		if (type) listOpts.type = type;
		if (page) listOpts.page = Number.parseInt(page, 10);
		if (pageSize) listOpts.pageSize = Number.parseInt(pageSize, 10);
		return this.catalogService.listProducts(principal?.storeId ?? "", listOpts);
	}

	@Get(":id")
	async getProduct(@Param("id") id: string) {
		return this.catalogService.getProduct(id);
	}
}

@Controller("catalog")
export class CatalogPublicController {
	constructor(private readonly catalogService: CatalogService) {}

	@Get("products/:id")
	async getProduct(@Param("id") id: string) {
		return this.catalogService.getProduct(id);
	}
}

@Module({
	imports: [PrismaRuntimeModule],
	providers: [CatalogService],
	controllers: [AdminCatalogController, CatalogPublicController],
	exports: [CatalogService],
})
export class CatalogModule {}

import { Module, type OnModuleDestroy } from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { PrismaClient } from "../../generated/client.js";
import { PRISMA_CLIENT } from "./prisma-runtime.tokens.js";

export class PrismaClientHolder implements OnModuleDestroy {
	constructor(
		private readonly client: PrismaClient,
		private readonly pool: pg.Pool,
	) {}

	async onModuleDestroy(): Promise<void> {
		await this.client.$disconnect();
		if (this.pool) {
			await this.pool.end();
		}
	}
}

@Module({
	providers: [
		{
			provide: PRISMA_CLIENT,
			useFactory: (): PrismaClient => {
				const connectionString =
					process.env["DATABASE_URL"] ??
					"postgresql://jewelry:***@localhost:5432/jewelry_digital?schema=public";
				const pool = new pg.Pool({ connectionString });
				const adapter = new PrismaPg(pool);
				return new PrismaClient({ adapter } as never);
			},
		},
		{
			provide: PrismaClientHolder,
			useFactory: (client: PrismaClient): PrismaClientHolder =>
				new PrismaClientHolder(client, null as unknown as pg.Pool),
			inject: [PRISMA_CLIENT],
		},
	],
	exports: [PRISMA_CLIENT],
})
export class PrismaRuntimeModule {}

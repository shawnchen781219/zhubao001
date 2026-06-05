import { defineConfig } from "prisma/config";

const fallbackDatabaseUrl =
	"postgresql://jewelry:jewelry@localhost:5432/jewelry_digital?schema=public";

export default defineConfig({
	schema: "prisma/schema.prisma",
	datasource: {
		url: process.env.DATABASE_URL ?? fallbackDatabaseUrl,
	},
});

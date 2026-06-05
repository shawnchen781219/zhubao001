import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { AppModule } from "./app.module.js";
import { RuntimeConfigService } from "./common/config/runtime-config.service.js";
import { ApiExceptionFilter } from "./common/filters/api-exception.filter.js";
import { createRequestTraceMiddleware } from "./common/tracing/request-trace.middleware.js";
import { TraceResponseInterceptor } from "./common/tracing/trace-response.interceptor.js";

async function bootstrap(): Promise<void> {
	const app = await NestFactory.create(AppModule, new FastifyAdapter(), {
		bufferLogs: true,
	});

	app.enableCors({
		origin: [
			"http://127.0.0.1:4201",
			"http://127.0.0.1:4202",
			"http://localhost:4201",
			"http://localhost:4202",
			"http://127.0.0.1:4301",
			"http://127.0.0.1:4302",
			"http://47.98.109.227:5173",
			"http://47.98.109.227:5174",
			"http://47.98.109.227:5175",
			"http://47.98.109.227:5176",
			"http://47.98.109.227:5177",
			"http://47.98.109.227:5178",
		],
		methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
		credentials: true,
		allowedHeaders: [
			"Content-Type",
			"Authorization",
			"X-Request-Id",
			"X-Device-Id",
			"X-Device-Signature",
			"X-Device-Timestamp",
			"X-Device-Nonce",
			"X-Body-Hash",
			"X-Idempotency-Key",
		],
	});

	app.use(createRequestTraceMiddleware());
	app.useGlobalPipes(
		new ValidationPipe({
			transform: true,
			whitelist: true,
			forbidNonWhitelisted: true,
		}),
	);
	app.useGlobalFilters(new ApiExceptionFilter());
	app.useGlobalInterceptors(new TraceResponseInterceptor());

	const config = app.get(RuntimeConfigService);
	await app.listen(config.appPort, "0.0.0.0");
}

void bootstrap();

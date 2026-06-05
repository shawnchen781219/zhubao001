# ADR-004: Prisma 7 Config

## Status

Accepted.

## Context

Prisma `7.8.0` no longer accepts `url = env("DATABASE_URL")` inside the Prisma schema datasource block. The second-batch installation kept Prisma 7, and validation failed until the connection URL was moved into Prisma config.

## Decision

Keep Prisma `7.8.0` and migrate configuration to Prisma 7 style:

- `prisma/schema.prisma` keeps the datasource provider only.
- `prisma.config.ts` uses `defineConfig` from `prisma/config`.
- The config points at `prisma/schema.prisma`.
- The datasource URL is read from `process.env.DATABASE_URL`.
- A local development fallback URL matches `.env.example` and contains no real secret.
- The generator uses Prisma 7's `prisma-client` provider with an explicit output path under `apps/api/node_modules/.prisma/client`.

## Rationale

Keeping Prisma 7 avoids downgrading immediately after the dependency baseline was accepted, and lets the project adapt to the current Prisma configuration model before backend implementation begins.

Moving the connection URL out of the schema follows Prisma 7 validation requirements and separates schema shape from runtime/development connection configuration.

Using the Prisma 7 `prisma-client` generator avoids the legacy `prisma-client-js` resolver path that tries to locate `@prisma/client` from the schema directory. In this workspace, the schema lives at the repository root while `@prisma/client` is intentionally installed only in `apps/api`, so an explicit API-local generated output keeps Prisma artifacts scoped to the API package.

## Non-Goals

This stage does not run migrations and does not connect to a real database. The goal is schema/config validation and client generation readiness only.

This stage also does not add Prisma Client usage, repositories, services, NestJS modules, controllers, or database access logic.

## Follow-Up

When database work begins, Thread01 should decide the environment loading strategy for real deployments and whether to replace the local fallback with a stricter production guard.

Thread01 should also decide the long-term import path for Prisma Client usage when repository/service code is introduced, because the Prisma 7 generator now emits the client to an explicit package-local output directory instead of relying on implicit `@prisma/client` generation.

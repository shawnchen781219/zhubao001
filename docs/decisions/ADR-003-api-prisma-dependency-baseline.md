# ADR-003: API + Prisma Dependency Baseline

## Status

Accepted for second-batch manifest preparation. Installation is deferred until a later instruction.

## Context

The project has completed the root tooling batch. The next dependency batch prepares the backend API runtime and Prisma baseline while preserving the existing modular-monolith boundaries.

This ADR records dependency decisions only. It does not authorize NestJS controllers, Nest bootstrap code, Prisma Client calls, database access, DTO validation implementation, or business flows.

## Decision

`apps/api/package.json` declares the following second-batch dependencies:

- `@nestjs/common@11.1.24`
- `@nestjs/core@11.1.24`
- `@nestjs/platform-fastify@11.1.24`
- `fastify@5.8.5`
- `@prisma/client@7.8.0`
- `zod@4.4.3`
- `reflect-metadata@0.2.2`
- `rxjs@7.8.2`
- `class-validator@0.15.1`
- `class-transformer@0.5.1`

`apps/api/package.json` declares the following second-batch devDependencies:

- `prisma@7.8.0`
- `vitest@4.1.7`

`@jewelry/shared` remains a workspace dependency.

## Rationale

NestJS packages are pinned to the same version and major (`11.1.24`) to avoid framework peer drift.

Fastify is included as the intended HTTP adapter runtime for the API, but adapter compatibility must be validated during the second-batch install and typecheck step.

Prisma CLI and Client are pinned to the same version (`7.8.0`) to avoid generated-client mismatch.

`reflect-metadata` and `rxjs` are included because they are part of the NestJS peer/runtime ecosystem. `class-validator` and `class-transformer` are included only as validation peer preparation; this ADR does not introduce real DTO validation logic.

`zod` remains the lightweight configuration/schema validation candidate for API boundaries. `vitest` is the API test runner candidate.

## Boundaries

- API dependencies stay in `apps/api`.
- `packages/shared` must not depend on NestJS, Prisma, Fastify, RxJS, reflection metadata, or validation libraries.
- Frontend and terminal apps must not import API source or API-only dependencies.
- Prisma Client imports are allowed only in backend/data-script locations after explicit implementation instructions.
- No controller, module bootstrap, service implementation, database access, API client, UI, camera, AR, AI, queue, or object storage implementation is introduced by this dependency baseline.

## Follow-up Validation

After Thread01 authorizes second-batch installation, run the validation plan in `docs/operations/api-prisma-install-plan.md`, including package JSON validation, lockfile checks, `corepack pnpm typecheck`, `corepack pnpm lint`, Prisma schema validation/generate candidates, API dependency boundary scan, and shared purity scan.

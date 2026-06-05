# Dependency Boundaries

## Root dependency management

The root workspace owns shared development tooling such as pnpm, turbo, TypeScript, formatter, lint tooling, OpenAPI validators, and workspace-level test orchestration.

Root devDependencies should be used for tools that operate across packages or enforce repository policy. Package-level devDependencies are allowed only when a tool is truly local to one app or required by that framework's package layout.

## Package dependency ownership

Each app or package may declare its own runtime dependencies when the dependency is needed at runtime by that app/package.

Allowed dependency direction:

```text
apps/* -> packages/shared
apps/api -> packages/shared
apps/api -> backend-only infrastructure libraries
apps/miniapp -> packages/shared + miniapp runtime libraries
apps/admin -> packages/shared + admin runtime libraries
apps/h5 -> packages/shared + H5 runtime libraries
apps/mirror-terminal -> packages/shared + Electron/renderer/AR adapter runtime libraries
```

Forbidden dependency direction:

```text
apps/miniapp -> apps/api
apps/admin -> apps/api
apps/h5 -> apps/admin
apps/mirror-terminal -> apps/miniapp
any app -> another app
packages/shared -> apps/*
packages/shared -> apps/api
```

Apps communicate through HTTP/API contracts, events, or shared constants and DTO summaries. They must not import each other's source files.

## Shared package purity

`packages/shared` is the cross-app language layer. It may contain:

- Stable constants.
- Enums.
- Lightweight DTO summaries.
- Branded id types and pure TypeScript utility types.

`packages/shared` must not depend on:

- NestJS.
- React.
- Taro.
- Electron.
- Prisma.
- PostgreSQL or Redis clients.
- Object storage SDKs.
- Queue SDKs.
- AR, AI, camera, or rendering SDKs.

If shared starts needing framework behavior, the design should be revisited instead of adding the dependency.

## Prisma boundary

Prisma Client may be used only by the API backend or by later explicit data scripts approved for database operations.

Frontend apps, mirror terminal UI/runtime code, and `packages/shared` must not import Prisma Client or generated Prisma types directly. Cross-app shapes should be represented as stable DTO summaries in `packages/shared` and kept aligned with OpenAPI.

## Adapter boundaries

AR, AI, object storage, and message queue capabilities must enter through adapter or port boundaries.

- AR and camera dependencies belong behind the mirror terminal `ar-adapter` boundary.
- AI provider SDKs belong behind an AI gateway/adapter boundary when that module is introduced.
- Object storage SDKs belong behind the media/object-storage adapter boundary.
- Queue libraries belong behind event/task queue ports, not inside business modules directly.

Business modules should depend on ports and DTOs, not vendor SDKs.

## Validation expectations

After dependencies are installed, run boundary checks that verify:

- No app imports another app.
- `packages/shared` has no framework, database, queue, storage, AR, or AI SDK imports.
- Prisma Client imports are limited to backend/data-script locations.
- API route constants come from `@jewelry/shared` where used by apps.
- OpenAPI remains the source of truth for HTTP request/response details.

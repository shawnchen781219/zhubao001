# API + Prisma Install Plan

**Instruction:** 指令016  
**Scope:** second batch manifest preparation only. No install was run in this instruction.

## Version sources

The baseline versions below come from `docs/operations/dependency-version-check.md` and the additional read-only npm queries allowed by 指令016.

| Package | Version | Source | Scope | Notes |
| --- | --- | --- | --- | --- |
| `@jewelry/shared` | `workspace:*` | workspace contract | api dependency | API may depend on shared constants and light DTOs. |
| `@nestjs/common` | `11.1.24` | 指令011 npm query | api dependency | Must stay same major as Nest core/platform package. |
| `@nestjs/core` | `11.1.24` | 指令011 npm query | api dependency | Requires Node 20+ per earlier query. |
| `@nestjs/platform-fastify` | `11.1.24` | 指令011 npm query | api dependency | Adapter package for Fastify runtime. |
| `fastify` | `5.8.5` | 指令011 npm query | api dependency | Compatibility must be validated after install. |
| `@prisma/client` | `7.8.0` | 指令011 npm query | api dependency | Must match Prisma CLI version. |
| `prisma` | `7.8.0` | 指令011 npm query | api devDependency | CLI only; do not import from frontend or shared. |
| `zod` | `4.4.3` | 指令011 npm query | api dependency | Configuration/schema validation candidate. |
| `vitest` | `4.1.7` | 指令011 npm query | api devDependency | Backend/unit test candidate. |
| `reflect-metadata` | `0.2.2` | 指令016 `npm view reflect-metadata version` | api dependency | Required by NestJS metadata ecosystem. Engines query returned no value. |
| `rxjs` | `7.8.2` | 指令016 `npm view rxjs version` | api dependency | Required by NestJS peer range `^7.1.0`. Engines query returned no value. |
| `class-validator` | `0.15.1` | 指令016 `npm view class-validator version` | api dependency | Added as Nest validation peer preparation only; no DTO validation implementation in this instruction. |
| `class-transformer` | `0.5.1` | 指令016 `npm view class-transformer version` | api dependency | Added as Nest validation peer preparation only; no DTO transformation implementation in this instruction. |

## Rules

### NestJS same-major rule

`@nestjs/common`, `@nestjs/core`, and `@nestjs/platform-fastify` must remain on the same major version. The current candidate pins all three to `11.1.24`.

### Prisma CLI/Client same-version rule

`prisma` and `@prisma/client` must remain on the same version. The current candidate pins both to `7.8.0`.

### Fastify adapter compatibility risk

`@nestjs/platform-fastify@11.1.24` and `fastify@5.8.5` were selected from npm query results, but the actual adapter/runtime compatibility must be validated after installation. If the second-batch install or typecheck exposes peer conflicts, do not mix Nest majors; adjust as a reviewed dependency baseline change.

### Boundary rule

These dependencies belong only in `apps/api`. Do not add them to `packages/shared` or frontend/terminal apps. Prisma Client imports remain limited to backend/data-script locations after explicit implementation instructions.

## Second-batch install validation plan

Run only after Thread01 authorizes the second-batch install.

1. Install from repo root:
   ```sh
   corepack pnpm install
   ```
2. Confirm lockfile/install artifacts:
   ```sh
   find . -name pnpm-lock.yaml -o -name package-lock.json -o -name yarn.lock
   ```
   Expected: one root `pnpm-lock.yaml`, no nested package manager lockfiles.
3. Validate package manifests:
   ```sh
   python3 -m json.tool package.json
   python3 -m json.tool apps/api/package.json
   python3 -m json.tool apps/miniapp/package.json
   python3 -m json.tool apps/admin/package.json
   python3 -m json.tool apps/mirror-terminal/package.json
   python3 -m json.tool apps/h5/package.json
   python3 -m json.tool packages/shared/package.json
   ```
4. Run workspace checks:
   ```sh
   corepack pnpm typecheck
   corepack pnpm lint
   ```
5. Prisma validation candidates, after install only:
   ```sh
   corepack pnpm --filter @jewelry/api prisma validate --schema ../../prisma/schema.prisma
   corepack pnpm --filter @jewelry/api prisma generate --schema ../../prisma/schema.prisma
   ```
   If relative schema path resolution differs under pnpm filtering, rerun from repo root with an explicit schema path after Thread01 approval.
6. API dependency boundary scan:
   ```sh
   rg -n "@nestjs|@prisma/client|from ['\"]prisma|fastify|reflect-metadata|rxjs|class-validator|class-transformer" apps/miniapp apps/admin apps/h5 apps/mirror-terminal packages/shared/src
   ```
   Expected: no matches outside `apps/api` for API-only runtime dependencies.
7. Shared purity scan:
   ```sh
   rg -n "@nestjs|react|@taro|electron|prisma|@prisma|fastify|rxjs|reflect-metadata|class-validator|class-transformer" packages/shared/src packages/shared/package.json
   ```
   Expected: no framework/database/runtime dependency imports in shared.
8. Business implementation guard:
   ```sh
   rg -n "@Controller|@Injectable|NestFactory|PrismaClient|fetch\(|axios|XMLHttpRequest|getUserMedia|new BrowserWindow|createRoot" apps packages/shared/src
   ```
   Expected: no real controller/bootstrap/database/UI/client implementation unless later instructions explicitly add them.

## Current instruction guard

指令016 updated manifests and documents only. It did not run `pnpm install`, `npm install`, `npx`, `prisma`, `nest`, `vite`, `taro`, `electron`, or any framework CLI.

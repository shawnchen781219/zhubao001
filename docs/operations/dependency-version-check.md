# Dependency Version Check

**Check time:** 2026-05-30 02:17 CST  
**Instruction:** 指令011  
**Scope:** read-only `npm view` checks only. No dependency installation, no manifest changes, no lockfile generation.

## Query method

Allowed query commands used in this check:

- `npm view <package> version`
- `npm view <package> peerDependencies`
- `npm view <package> engines`

Blank peerDependencies or engines output means npm returned no value for that field during this check.

## Candidate version table

| package name | latest/version result | peerDependencies summary | engines summary | Recommended scope | Risk notes |
| --- | --- | --- | --- | --- | --- |
| `typescript` | `6.0.3` | none returned | `node >=14.17` | root | TypeScript 6 is a major version; first install batch should run project references before adding framework stacks. |
| `turbo` | `2.9.16` | none returned | none returned | root | Keep as root workspace tool only; do not rely on package scripts until installed. |
| `@biomejs/biome` | `2.4.16` | none returned | `node >=14.21.3` | root | Recommended single formatter/linter candidate to reduce ESLint/Prettier config surface in early phase. |
| `prettier` | `3.8.3` | none returned | `node >=14` | root | Good formatter-only option if ESLint remains separate. |
| `eslint` | `10.4.0` | none returned | `node ^20.19.0 || ^22.13.0 || >=24` | root | Latest ESLint raises Node baseline; if selected, align Node version before install. |
| `@nestjs/core` | `11.1.24` | `@nestjs/common ^11`, optional microservices/platform-express/websockets `^11`, `reflect-metadata`, `rxjs ^7.1` | `node >=20` | api | NestJS 11 requires Node 20+ and matching Nest package majors. |
| `@nestjs/common` | `11.1.24` | `class-transformer >=0.4.1`, `class-validator >=0.13.2`, `reflect-metadata`, `rxjs ^7.1` | none returned | api | Must stay same major as `@nestjs/core`; validation packages are peers, not automatic business implementation. |
| `@nestjs/platform-fastify` | `11.1.24` | `@nestjs/common ^11`, `@nestjs/core ^11`, optional `@fastify/static/view` ranges | none returned | api | Use with Fastify adapter only after confirming Fastify major compatibility. |
| `fastify` | `5.8.5` | none returned | none returned | api | Pair with NestJS platform-fastify compatibility testing; Fastify 5 is a major runtime choice. |
| `prisma` | `7.8.0` | none returned | `node ^20.19 || ^22.12 || >=24.0` | api / data scripts | Prisma 7 requires newer Node than generic Node 20.0; install only after Node baseline is explicit. |
| `@prisma/client` | `7.8.0` | `prisma *`, `typescript >=5.4.0` | `node ^20.19 || ^22.12 || >=24.0` | api / data scripts | Client and CLI versions should match exactly. Do not import from frontend or shared. |
| `zod` | `4.4.3` | none returned | none returned | api / shared only if pure schemas are later approved | Safe config validation candidate; avoid putting business flow validation into shared prematurely. |
| `vitest` | `4.1.7` | optional Vite `^6 || ^7 || ^8`, jsdom/happy-dom/browser coverage packages | `node ^20.0.0 || ^22.0.0 || >=24.0.0` | root / api / packages | Good early test runner candidate; browser mode should wait until real UI exists. |
| `@tarojs/cli` | `4.2.0` | none returned | `node >=18` | miniapp | Taro stack should be installed in its own batch to isolate platform build issues. |
| `@tarojs/taro` | `4.2.0` | Taro internal packages plus React types/build tools, includes `@types/react ^18` | `node >=18` | miniapp | Taro 4.2 ecosystem points at React 18; avoid React 19 in miniapp batch. |
| `@tarojs/plugin-framework-react` | `4.2.0` | `react ^18`, Vite `^4`, Webpack `^5`, Taro internals `4.2.0` | `node >=18` | miniapp | Hard compatibility warning: React latest is 19.2.6, but Taro plugin asks for React 18. Pin React 18 for miniapp unless official docs say otherwise. |
| `@tarojs/plugin-platform-weapp` | `4.2.0` | `@tarojs/service 4.2.0`, `@tarojs/shared 4.2.0` | `node >=18` | miniapp | Keep all Taro packages on same version. |
| `react` | `19.2.6` | none returned | none returned | admin / h5 / mirror renderer; miniapp only if Taro permits | React latest conflicts with Taro 4.2 React `^18` peer. Consider React 18 for miniapp and React 19 only for Vite apps after review, or standardize lower. |
| `react-dom` | `19.2.6` | `react ^19.2.6` | none returned | admin / h5 / mirror renderer | Must match React version exactly enough for peer range. |
| `vite` | `8.0.14` | none returned | `node ^20.19.0 || >=22.12.0` | admin / h5 / mirror renderer | Latest Vite requires Node 20.19+ or 22.12+. This should drive the workspace Node baseline. |
| `@vitejs/plugin-react` | `6.0.2` | Vite `^8.0.0`, optional React compiler/Babel plugin | `node ^20.19.0 || >=22.12.0` | admin / h5 / mirror renderer | Plugin v6 follows Vite 8; do not mix with older Vite without explicit compatibility check. |
| `react-router` | `7.16.0` | `react >=18`, `react-dom >=18` | `node >=20.0.0` | admin / h5 | Valid candidate for admin/H5 routing; check data-router needs before install. |
| `antd` | `6.4.3` | `react >=18.0.0`, `react-dom >=18.0.0` | none returned | admin | Good admin UI candidate; verify design density and bundle impact before H5 use. |
| `electron` | `42.3.0` | none returned | `node >=22.12.0` | mirror-terminal | High Node baseline and large binary/runtime footprint; install in final batch only. |
| `three` | `0.184.0` | none returned | none returned | mirror-terminal AR adapter | Keep behind `ar-adapter`; do not leak Three.js types into shared. |
| `ioredis` | `5.11.0` | none returned | `node >=12.22.0` | infra | Mature Redis client with broader Node support; candidate if BullMQ integration or operational familiarity favors it. |
| `redis` | `6.0.0` | none returned | `node >=20.0.0` | infra | Modern official Redis client; aligns with Node 20+ baseline and BullMQ peer shape. |
| `bullmq` | `5.77.6` | `redis >=5.0.0` | none returned | infra / api queue adapter | Queue candidate should remain behind adapter/port boundary; confirm Redis client choice with BullMQ docs. |
| `@aws-sdk/client-s3` | `3.1056.0` | none returned | `node >=20.0.0` | infra object storage adapter | S3-compatible candidate for OSS/COS-like abstraction; keep behind object-storage adapter. |

## Compatibility observations

1. **Node baseline should probably be at least Node 20.19 before broad installation.** Vite 8, Prisma 7, and ESLint 10 all require Node ranges that start at 20.19 or higher. Electron latest raises its own runtime requirement to Node 22.12.
2. **Miniapp should not blindly use React latest.** Taro 4.2 plugin peerDependencies say `react ^18`, while npm latest React is `19.2.6`. The miniapp batch should either pin React 18 or wait for official Taro documentation confirming React 19 support.
3. **NestJS packages must move as a matched major set.** `@nestjs/core`, `@nestjs/common`, and `@nestjs/platform-fastify` are all `11.1.24`; mixing Nest majors would be a bad install candidate.
4. **Prisma CLI and Client should match exactly.** Both latest values are `7.8.0`; install them together in the API batch only.
5. **Electron should stay isolated.** Electron latest has a high Node requirement and large binary footprint, so mirror-terminal should remain the last install batch.
6. **Prefer Biome as the early root formatting/lint candidate.** It can cover initial formatting/linting with fewer moving parts than Prettier plus ESLint. ESLint can still be introduced later if framework-specific linting is needed.
7. **Prefer `redis` as the first Redis client candidate if Node baseline is raised to 20+.** BullMQ latest reports a `redis >=5.0.0` peer. `ioredis` remains a fallback candidate if compatibility or operational preference requires it.
8. **Use `@aws-sdk/client-s3` as the first S3-compatible object storage candidate.** It is suitable for adapter-based OSS/COS abstraction, but must not enter business modules directly.

## Recommended phased installation strategy

1. **Batch 1: root tooling only.** Install TypeScript, Turbo, and one formatting/lint strategy first. Recommendation: TypeScript + Turbo + Biome. Then run project references before adding any framework dependency.
2. **Batch 2: API + Prisma foundation.** Install NestJS matched major packages, Fastify adapter, Prisma CLI/client, zod, and Vitest. Validate Prisma schema, backend typecheck, and module boundary scans.
3. **Batch 3: miniapp.** Install Taro stack and React compatible with Taro. Recommendation: keep Taro packages aligned at `4.2.0` and avoid React 19 unless Taro docs explicitly allow it.
4. **Batch 4: admin/H5.** Install Vite, Vite React plugin, React/React DOM, react-router, and Ant Design for admin. Confirm whether H5 should use Ant Design or lighter custom UI before shipping H5 bundle.
5. **Batch 5: mirror-terminal.** Install Electron, Vite/React renderer dependencies, and Three.js only after root/api/web checks are stable. Keep AR dependencies behind the adapter boundary.
6. **Infrastructure add-on after API compiles.** Install Redis client, BullMQ, and S3-compatible SDK only when the API ports/adapters are ready to receive them.

This order keeps the riskiest runtime and binary dependencies out of the first validation loop and allows the project-reference baseline to fail fast.

## Commands intentionally not run

- No `pnpm install`.
- No `npm install`.
- No `npx`.
- No `prisma`, `taro`, `vite`, or `electron` CLI execution.
- No lockfile or `node_modules` creation.

## Thread01 Decision Summary After Check

Thread01 reviewed this version check and accepted the following installation preparation decisions:

1. Workspace Node baseline is fixed at `>=22.12.0`, with `.nvmrc` and `.node-version` pinned to `22.12.0`.
2. First install batch is root tooling only: TypeScript `6.0.3`, Turbo `2.9.16`, and Biome `2.4.16`.
3. `pnpm@11.5.0` latest was checked during 指令012 and requires Node `>=22.13`, so it is not compatible with the selected `22.12.0` baseline. The root manifest therefore uses `pnpm@10.34.1`, verified with engines `node >=18.12`.
4. Prettier + ESLint, NestJS, Prisma, Taro, React, Vite, Electron, Redis, BullMQ, and object storage SDKs remain deferred to later batches.
5. Miniapp remains on the React 18 path unless Taro official compatibility later permits React 19.

This section records Thread01's裁决 and does not alter the original npm query table above.


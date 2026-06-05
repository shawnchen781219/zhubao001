# API + Prisma Install Validation

**Instruction:** 指令017  
**Validation time:** 2026-05-30 03:24 CST  
**Scope:** second batch API + Prisma dependency installation and boundary validation.

## Install command and result

Command executed from repo root:

```sh
corepack pnpm install
```

Result: passed.

pnpm installed the second-batch API + Prisma dependency set and updated the root `pnpm-lock.yaml`. Install output warned that build scripts were ignored for `@nestjs/core@11.1.24`, `@prisma/engines@7.8.0`, and `prisma@7.8.0`; no `pnpm approve-builds` command was run in this instruction.

`corepack pnpm --filter @jewelry/api list --depth 0` confirmed direct API dependencies:

- `@jewelry/shared@link:../../packages/shared`
- `@nestjs/common@11.1.24`
- `@nestjs/core@11.1.24`
- `@nestjs/platform-fastify@11.1.24`
- `@prisma/client@7.8.0`
- `class-transformer@0.5.1`
- `class-validator@0.15.1`
- `fastify@5.8.5`
- `reflect-metadata@0.2.2`
- `rxjs@7.8.2`
- `zod@4.4.3`
- `prisma@7.8.0` as devDependency
- `vitest@4.1.7` as devDependency

## Lockfile checks

| Check | Result |
| --- | --- |
| Root `pnpm-lock.yaml` | Exists and updated |
| Nested `pnpm-lock.yaml` | None found outside pruned install/cache directories |
| `package-lock.json` | None found |
| `yarn.lock` | None found |

Lockfile includes the expected second-batch API + Prisma dependencies.

Important note: the lockfile also contains `vite` through `vitest`, and `react`/`react-dom`/`@types/react` through Prisma Studio-related transitive packages. These are not direct manifest dependencies and were introduced transitively by allowed second-batch packages. Thread01 should decide whether this is acceptable or whether the dependency baseline should avoid candidates that pull web UI transitive packages.

No Taro, Electron, Redis, BullMQ, object storage SDK, or Three.js dependency was found in the manifest scan.

## JSON validation

All required manifests passed `python3 -m json.tool`:

- `package.json`
- `apps/api/package.json`
- `apps/miniapp/package.json`
- `apps/admin/package.json`
- `apps/mirror-terminal/package.json`
- `apps/h5/package.json`
- `packages/shared/package.json`

## Typecheck result

Command required by 指令017:

```sh
pnpm typecheck
```

Result: failed because global `pnpm` is still not available in this shell:

```text
zsh:1: command not found: pnpm
```

Equivalent Corepack command also tested:

```sh
corepack pnpm typecheck
```

Result: failed before TypeScript compilation:

```text
Unable to find package manager binary: cannot find binary path
ELIFECYCLE Command failed with exit code 1.
```

Turbo discovered the six workspace packages but could not resolve a package manager binary in the current invocation mode.

## Lint result

Command required by 指令017:

```sh
pnpm lint
```

Result: failed because global `pnpm` is still not available in this shell:

```text
zsh:1: command not found: pnpm
```

Equivalent Corepack command also tested:

```sh
corepack pnpm lint
```

Result: failed. Biome ran successfully, but reported formatting diagnostics, including generated `.turbo/cache/*` JSON files and existing project files. Summary:

```text
Checked 66 files. No fixes applied.
Found 34 errors.
Found 7 warnings.
Found 78 infos.
```

No formatting fixes were applied because 指令017 did not authorize formatting source/config/manifests.

## Prisma validate/generate

Preferred commands from 指令017 were attempted first:

```sh
corepack pnpm --filter @jewelry/api prisma validate --schema ../../prisma/schema.prisma
corepack pnpm --filter @jewelry/api prisma generate --schema ../../prisma/schema.prisma
```

Both failed because pnpm interpreted `prisma` as a package script and no such script exists:

```text
ERR_PNPM_RECURSIVE_RUN_NO_SCRIPT None of the selected packages has a "prisma" script
```

Equivalent package-binary commands were then run:

```sh
corepack pnpm --filter @jewelry/api exec prisma validate --schema ../../prisma/schema.prisma
corepack pnpm --filter @jewelry/api exec prisma generate --schema ../../prisma/schema.prisma
```

Initial attempts failed with DNS/network access to `binaries.prisma.sh`; the same commands were retried with escalated network permission. After retry, Prisma CLI ran and loaded the schema, but both validate and generate failed with Prisma schema validation error `P1012`:

```text
The datasource property `url` is no longer supported in schema files. Move connection URLs for Migrate to `prisma.config.ts` and pass either `adapter` for a direct database connection or `accelerateUrl` for Accelerate to the `PrismaClient` constructor.
```

Error location:

```text
prisma/schema.prisma:7
url = env("DATABASE_URL")
```

Prisma CLI version: `7.8.0`.

No Prisma schema changes were made because 指令017 explicitly prohibited modifying `prisma/schema.prisma`.

## Boundary scans

API-only dependency scan outside `apps/api`:

```sh
rg -n "@nestjs|@prisma/client|from ['\"]prisma|fastify|reflect-metadata|rxjs|class-validator|class-transformer" apps/miniapp apps/admin apps/h5 apps/mirror-terminal packages/shared/src
```

Result: no matches.

Shared purity scan:

```sh
rg -n "@nestjs|react|@taro|electron|prisma|@prisma|fastify|rxjs|reflect-metadata|class-validator|class-transformer" packages/shared/src packages/shared/package.json
```

Result: no matches.

Business implementation guard:

```sh
rg -n "@Controller|@Injectable|NestFactory|PrismaClient|fetch\(|axios|XMLHttpRequest|getUserMedia|new BrowserWindow|createRoot" apps packages/shared/src
```

Result: no matches.

## Failure summary

1. `pnpm typecheck` and `pnpm lint` fail because global `pnpm` is not available.
2. `corepack pnpm typecheck` fails because Turbo cannot find the package manager binary path.
3. `corepack pnpm lint` fails on Biome formatting diagnostics; this includes generated `.turbo/cache` files and existing source/config/manifests.
4. Prisma validate/generate fail under Prisma 7 because the current schema still uses datasource `url = env("DATABASE_URL")`, which Prisma 7 no longer accepts in schema files.
5. Lockfile includes React/Vite transitive packages through allowed Prisma/Vitest dependencies; no direct app/package manifest added those dependencies.

## Recommendations

1. Thread01 should decide whether to update Prisma schema/config for Prisma 7 by introducing `prisma.config.ts` and the new connection configuration style, or pin Prisma to a version compatible with the current schema format.
2. Thread01/Hermes should decide how to expose `pnpm@10.34.1` as a binary path compatible with Turbo, or adjust workspace scripts to use an invocation Turbo can resolve.
3. Thread01 should decide whether Biome should ignore `.turbo/` and other generated artifacts, and whether a dedicated formatting instruction should normalize existing files.
4. Thread01 should explicitly accept or reject React/Vite transitive dependencies in the lockfile caused by Prisma/Vitest before proceeding to further dependency batches.

## 指令018复验

**Validation time:** 2026-05-30 03:44 CST  
**Scope:** Prisma 7 schema/config migration and generated-client readiness.

### Config changes

- `prisma/schema.prisma` datasource now keeps only `provider = "postgresql"`; the datasource URL was removed from the schema.
- `prisma.config.ts` was added with `defineConfig`, points to `prisma/schema.prisma`, and reads `process.env.DATABASE_URL` with a local `.env.example`-matching fallback.
- `prisma/schema.prisma` generator now uses Prisma 7's `prisma-client` provider with explicit output `../apps/api/node_modules/.prisma/client`.
- `.env.example` documents that Prisma 7 reads `DATABASE_URL` through `prisma.config.ts`.
- ADR-004 records the decision to stay on Prisma `7.8.0`, use Prisma 7 config, and keep generated artifacts inside the API package's `node_modules`.

### Prisma validate/generate

Commands executed from repo root:

```sh
corepack pnpm --filter @jewelry/api exec prisma validate --config ../../prisma.config.ts
corepack pnpm --filter @jewelry/api exec prisma generate --config ../../prisma.config.ts
```

Result: both passed.

Generate output:

```text
Generated Prisma Client (7.8.0) to ./node_modules/.prisma/client
```

The generated client is under `apps/api/node_modules/.prisma/client`; no business source files, controllers, services, repositories, PrismaClient usage, migrations, or database connection code were added.

### Additional checks

`pnpm typecheck` passed after the Prisma 7 config migration.

`pnpm lint` initially reported formatting only for `prisma.config.ts`; after formatting that file with Biome, `pnpm lint` passed.

Boundary scans found no NestJS controllers/services/bootstrap code, no PrismaClient usage, no frontend runtime calls, and no API dependencies outside the API package.

---

## 指令018 复验

**复验时间：** 2026-05-30 03:41 Asia/Shanghai  
**复验人：** Hermes（环境管理员 / 执行记录回填）

### Schema / Config 修改点

1. `prisma/schema.prisma` 已移除 datasource 中的 `url = env("DATABASE_URL")`，保留 `provider = "postgresql"`。
2. 项目根目录新增 `prisma.config.ts`，使用 Prisma 7 的 `defineConfig` API：
   - `schema: 'prisma/schema.prisma'`
   - `datasource.url` 从 `process.env.DATABASE_URL` 读取
   - 提供本地开发 fallback URL（与 `.env.example` 一致，不含真实密钥）
3. 新增 `docs/decisions/ADR-004-prisma-7-config.md`，记录保持 Prisma 7 而不降级的决策。

### 校验命令与结果

**JSON 合法性校验**

```sh
python3 -m json.tool package.json
python3 -m json.tool apps/api/package.json
```

Result: passed.

**Typecheck**

```sh
pnpm typecheck
```

Result: passed. 6/6 packages successful, all cached.

**Lint**

```sh
pnpm lint
```

Result: passed. `Checked 41 files in 37ms. No fixes applied.`

**Prisma validate**

```sh
corepack pnpm --filter @jewelry/api exec prisma validate --config ../../prisma.config.ts
```

Result: passed.

```text
Loaded Prisma config from ../../prisma.config.ts.
Prisma schema loaded from ../../prisma/schema.prisma.
The schema at ../../prisma/schema.prisma is valid 🚀
```

**Prisma generate**

```sh
corepack pnpm --filter @jewelry/api exec prisma generate --config ../../prisma.config.ts
```

Result: failed.

```text
Loaded Prisma config from ../../prisma.config.ts.
Prisma schema loaded from ../../prisma/schema.prisma.
Error: Could not resolve @prisma/client.
Please try to install it with pnpm i @prisma/client and rerun pnpm dlx "prisma generate" 🙏.
```

Root cause: `@prisma/client` is correctly declared in `apps/api/package.json` at `7.8.0` and installed under `apps/api/node_modules/@prisma/client`, but the Prisma CLI cannot resolve it inside the pnpm monorepo structure during generate. `node -e "require.resolve('@prisma/client/package.json')"` succeeds from `apps/`, so the package itself is resolvable by Node; the Prisma CLI's internal resolution appears incompatible with pnpm's strict dependency layout.

**Fix applied by Hermes:**

Created `.npmrc` with:

```ini
public-hoist-pattern[]=@prisma/client
public-hoist-pattern[]=prisma
```

Ran `pnpm install` again. After hoisting, `@prisma/client` is available at root `node_modules/@prisma/client`.

Re-ran generate:

```sh
corepack pnpm --filter @jewelry/api exec prisma generate --config ../../prisma.config.ts
```

Result: passed.

```text
✔ Generated Prisma Client (7.8.0) to ./node_modules/.prisma/client in 72ms
```

No source directory was polluted by generate artifacts.

**Boundary scans**

- `PrismaClient` not found in `apps/` or `packages/shared/src/` source.
- No Controller, Nest bootstrap, Service implementation, database access, API client, UI, camera, AR, AI, queue, or object storage implementation found.

### 未关闭问题

1. ~~Prisma generate remains blocked by pnpm monorepo resolution.~~ **Fixed** via `.npmrc` hoisting.
2. React/Vite transitive dependencies in lockfile were already accepted by Thread01 in the 指令017 review conclusion.
3. Temporary debug script `test-prisma-client.js` was created during troubleshooting; it should be removed or added to `.gitignore` in a later instruction.

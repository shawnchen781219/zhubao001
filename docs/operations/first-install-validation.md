# First Install Validation

**Instruction:** 指令013  
**Validation time:** 2026-05-30 02:40 CST  
**Install scope:** root tooling only: TypeScript, Turbo, Biome.

## Runtime checks

| Check | Result |
| --- | --- |
| `node --version` | `v24.14.1` |
| Required Node baseline | `>=22.12.0` |
| Node status | Passed |
| `pnpm --version` | Failed: `zsh:1: command not found: pnpm` |

## Installation command

Allowed command attempted from repo root:

```sh
pnpm install
```

Result:

```text
zsh:1: command not found: pnpm
```

Installation did not run because `pnpm` is not available in the current shell environment. No substitute install command was used.

## Lockfile and install artifact checks

| Check | Result |
| --- | --- |
| Root `pnpm-lock.yaml` | Not generated because install could not run |
| Nested `pnpm-lock.yaml` | None found |
| `package-lock.json` | None found |
| `yarn.lock` | None found |
| `node_modules` | None found |

Command used:

```sh
find /Users/shawnchen78/Documents/珠宝店数字化/jewelry-digital-system -maxdepth 4 \( -name node_modules -o -name pnpm-lock.yaml -o -name package-lock.json -o -name yarn.lock \) -print
```

The command returned no paths.

## JSON validation results

All required package manifests passed `python3 -m json.tool` validation:

- `package.json`
- `apps/api/package.json`
- `apps/miniapp/package.json`
- `apps/admin/package.json`
- `apps/mirror-terminal/package.json`
- `apps/h5/package.json`
- `packages/shared/package.json`

## Typecheck result

Command attempted from repo root:

```sh
pnpm typecheck
```

Result:

```text
zsh:1: command not found: pnpm
```

Typecheck did not run because `pnpm` is unavailable.

## Lint result

Command attempted from repo root:

```sh
pnpm lint
```

Result:

```text
zsh:1: command not found: pnpm
```

Lint did not run because `pnpm` is unavailable.

## Dependency boundary checks

Root `package.json` was scanned for non-first-batch dependency names. No NestJS, Prisma, Taro, React, Vite, Electron, Redis, BullMQ, object storage SDK, Three.js, or Fastify dependency was found.

Source was scanned for real implementation traces. No Controller, API client network request, PrismaClient, camera access, Electron BrowserWindow, React createRoot, framework imports, database access, AR, AI, queue, or object storage implementation trace was found.

## Issues and recommendations

1. Blocking issue: `pnpm` command is not installed or not available on PATH in the current shell.
2. Because `pnpm install` could not execute, no `pnpm-lock.yaml` was generated and the first install validation remains incomplete.
3. Do not use `npm install`, `npx`, framework CLIs, or manual package manager workarounds under 指令013; Thread01 should decide how to make `pnpm@10.34.1` available, for example via an approved package-manager bootstrap step.
4. After `pnpm` is available, rerun 指令013 or a follow-up install instruction from the repository root and repeat lockfile, JSON, typecheck, and lint validation.

## 指令014 Corepack Retry

**Validation time:** 2026-05-30 02:47 CST

### Runtime and Corepack checks

| Check | Result |
| --- | --- |
| `node --version` | `v24.14.1` |
| `corepack --version` | `0.34.6` |
| `corepack enable` | Failed |
| `corepack prepare pnpm@10.34.1 --activate` | Completed without terminal error |
| `pnpm --version` after prepare | Failed: `zsh:1: command not found: pnpm` |

`corepack enable` failed with:

```text
Internal Error: EACCES: permission denied, symlink '../lib/node_modules/corepack/dist/pnpm.js' -> '/usr/local/bin/pnpm'
```

Because `pnpm --version` did not output `10.34.1`, 指令014 required stopping before install. `pnpm install` was not executed in this retry.

### Lockfile and install artifact checks

The artifact scan returned no paths:

- No `node_modules`.
- No root or nested `pnpm-lock.yaml`.
- No `package-lock.json`.
- No `yarn.lock`.

### JSON/typecheck/lint status

- Root `package.json` remains valid JSON.
- `pnpm typecheck` and `pnpm lint` were not rerun in this retry because pnpm activation failed before installation.

### Recommendation

Thread01 should decide whether to authorize a privileged Corepack enable step that can create `/usr/local/bin/pnpm`, or an alternative approved way to expose `pnpm@10.34.1` on PATH without changing project manifests or installing non-first-batch dependencies.

## 指令015 Corepack pnpm Install Retry

**Validation time:** 2026-05-30 02:58 CST

### Runtime and package manager checks

| Check | Result |
| --- | --- |
| `node --version` | `v24.14.1` |
| `corepack --version` | `0.34.6` |
| `corepack prepare pnpm@10.34.1 --activate` | Passed |
| `corepack pnpm --version` | `10.34.1` |

This retry used `corepack pnpm` directly because 指令014 showed `corepack enable` could not create the global `/usr/local/bin/pnpm` symlink. No global symlink, `npm install`, `npx`, sudo, or global install command was used.

### Installation result

Command executed from repo root:

```sh
corepack pnpm install
```

Result: passed.

Installed first-batch root devDependencies only:

- `@biomejs/biome@2.4.16`
- `turbo@2.9.16`
- `typescript@6.0.3`

`corepack pnpm list --depth 0` confirmed exactly those three root devDependencies.

### Lockfile and install artifact checks

| Check | Result |
| --- | --- |
| Root `pnpm-lock.yaml` | Exists |
| Nested `pnpm-lock.yaml` | None found |
| `package-lock.json` | None found |
| `yarn.lock` | None found |
| `node_modules` | Exists as pnpm install artifact |

`find ... -name pnpm-lock.yaml -o -name package-lock.json -o -name yarn.lock` returned only the root `pnpm-lock.yaml`.

### JSON validation results

All required package manifests passed `python3 -m json.tool` validation:

- `package.json`
- `apps/api/package.json`
- `apps/miniapp/package.json`
- `apps/admin/package.json`
- `apps/mirror-terminal/package.json`
- `apps/h5/package.json`
- `packages/shared/package.json`

### Typecheck result

Command executed:

```sh
corepack pnpm typecheck
```

Result: failed.

Failure summary:

```text
Unable to find package manager binary: cannot find binary path
ELIFECYCLE Command failed with exit code 1.
```

Turbo started and found the six workspace packages, but failed before running package typechecks because it could not resolve a package manager binary path in this `corepack pnpm` invocation mode.

### Lint result

Command executed:

```sh
corepack pnpm lint
```

Result: failed.

Failure summary:

- Biome ran successfully as a tool.
- Biome reported formatting diagnostics across existing package JSON, tsconfig, and TypeScript skeleton files.
- The first diagnostics included `apps/admin/package.json`, `apps/admin/src/app.types.ts`, `apps/admin/src/routes.ts`, `apps/api/package.json`, `apps/api/src/common/idempotency/idempotency.port.ts`, root `package.json`, `tsconfig.base.json`, `tsconfig.json`, and `turbo.json`.
- Biome reported `Found 40 errors. No fixes applied.`

No automatic formatting was applied because 指令015 did not authorize modifying package manifests, tsconfig, turbo config, or source files for formatting.

### Dependency and implementation guard checks

- Root `package.json` and `pnpm-lock.yaml` were scanned for disallowed non-first-batch dependency names. No NestJS, Prisma, Taro, React, Vite, Electron, Redis, BullMQ, object storage SDK, Three.js, or Fastify dependency was found.
- Source was scanned for implementation traces. No Controller, API client network request, PrismaClient, camera access, Electron BrowserWindow, React createRoot, framework imports, database access, AR, AI, queue, or object storage implementation trace was found.
- Root `package.json` timestamp remained unchanged from 指令012; install generated `pnpm-lock.yaml` and `node_modules` only.

### Issues and recommendations

1. `corepack pnpm install` succeeded and produced the expected first-batch install artifacts.
2. `corepack pnpm typecheck` is blocked by Turbo package-manager binary discovery under direct Corepack invocation. Thread01 should decide whether to expose `pnpm@10.34.1` on PATH, adjust the package-manager invocation strategy, or provide a Turbo-compatible environment before treating typecheck as valid.
3. `corepack pnpm lint` exposes a repository-wide Biome formatting baseline mismatch. Thread01 should decide whether to authorize a dedicated formatting instruction, likely `corepack pnpm biome format --write .`, because 指令015 prohibited modifying manifests/config/source beyond validation docs and install artifacts.


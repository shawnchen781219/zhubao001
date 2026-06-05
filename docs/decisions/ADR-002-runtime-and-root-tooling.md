# ADR-002: Runtime and Root Tooling Baseline

## Status

Accepted.

## Decision

The workspace runtime baseline is Node `>=22.12.0`.

Runtime version files are pinned to the concrete baseline:

- `.nvmrc`: `22.12.0`
- `.node-version`: `22.12.0`

The first dependency installation batch is limited to root tooling:

- `typescript@6.0.3`
- `turbo@2.9.16`
- `@biomejs/biome@2.4.16`
- `pnpm@10.34.1` as the package manager metadata

`pnpm@11.5.0` was checked as the latest pnpm candidate, but it requires Node `>=22.13`. Because Thread01 selected Node `22.12.0`, the root manifest uses `pnpm@10.34.1`, whose engines are `node >=18.12`.

## Rationale

Node `>=22.12.0` aligns the project with the later framework candidates already checked in 指令011:

- Vite 8 accepts Node `>=22.12.0`.
- Prisma 7 accepts Node `^22.12`.
- Electron latest requires Node `>=22.12.0`.

TypeScript and Turbo are required before framework installation because the repo already uses project references and workspace scripts.

Biome is selected for the first batch because it can cover initial formatting and lint-style checks without introducing the two-stack complexity of Prettier plus ESLint. ESLint may still be added later if specific framework ecosystems require it.

## Deferred Dependencies

The following are intentionally deferred from the first batch:

- Prettier + ESLint: postponed to avoid duplicate formatting/lint policy before framework code exists.
- NestJS and Fastify: postponed until API installation batch.
- Prisma: postponed until API and database validation batch.
- Taro and React for miniapp: postponed because Taro 4.2 currently peers React `^18`, while React latest is 19.
- Vite and React for admin/H5: postponed until the web app batch.
- Electron and Three.js: postponed until mirror-terminal batch due to binary size and runtime complexity.
- Redis, BullMQ, and object storage SDKs: postponed until adapter boundaries are ready.

## First Install Validation Commands

After Thread01 explicitly authorizes dependency installation, the first root-tooling installation should be followed by:

```sh
python3 -m json.tool package.json
python3 -m json.tool apps/api/package.json
python3 -m json.tool apps/miniapp/package.json
python3 -m json.tool apps/admin/package.json
python3 -m json.tool apps/mirror-terminal/package.json
python3 -m json.tool apps/h5/package.json
python3 -m json.tool packages/shared/package.json
find . -maxdepth 3 \( -name package-lock.json -o -name yarn.lock \) -print
pnpm typecheck
pnpm lint
```

Expected installation artifact for the first authorized install: one root `pnpm-lock.yaml` and no nested lockfiles.

Do not run framework CLIs such as Prisma, Taro, Vite, or Electron during the first root-tooling-only install validation.

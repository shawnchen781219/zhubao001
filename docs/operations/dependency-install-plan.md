# Dependency Install Plan

## Purpose

This document is the review checklist for the first dependency installation pass. It does not pin or invent latest versions. Any dependency version shown in later install commands must be verified immediately before installation.

Current project status: offline skeleton only. Do not run dependency CLIs until Thread01 explicitly approves the install step.

## Version verification rule

Do not write assumed latest versions into package files or commands.

Use this placeholder in planning tables when a version is needed: `待 npm view / 官方文档核验`.

Verification responsibility:

- Thread01 confirms the dependency set and installation window.
- Thread02 runs version checks only after approval.
- For npm packages, use `npm view <package> version` and, when needed, `npm view <package> peerDependencies`.
- For framework stacks, cross-check official documentation before accepting peer ranges.
- Record the checked date, package name, selected version, and reason in the execution file for the installation instruction.

## Root tool dependencies

| Category | Candidate packages | Version | Notes |
| --- | --- | --- | --- |
| Package manager | pnpm | 待 npm view / 官方文档核验 | Use one workspace lockfile at repo root. Confirm `packageManager` value before install. |
| Task runner | turbo | 待 npm view / 官方文档核验 | Root scripts may call turbo only after install. |
| TypeScript | typescript | 待 npm view / 官方文档核验 | Used by project references and package typecheck scripts. |
| Formatting | prettier or biome | 待 npm view / 官方文档核验 | Choose one formatter before enabling real `format`. |
| Linting | eslint or biome | 待 npm view / 官方文档核验 | Avoid mixed lint stacks unless required by framework tooling. |
| Static checks | yaml parser / OpenAPI validator | 待 npm view / 官方文档核验 | Must validate `docs/api/phase-1-openapi.yaml` after install. |

## Backend dependency categories

| Category | Candidate packages | Version | Notes |
| --- | --- | --- | --- |
| NestJS core | `@nestjs/core`, `@nestjs/common`, `@nestjs/platform-fastify` | 待 npm view / 官方文档核验 | Use Fastify adapter as the default backend HTTP runtime. |
| Fastify | `fastify` and related plugins | 待 npm view / 官方文档核验 | Confirm NestJS peer compatibility. |
| Prisma | `prisma`, `@prisma/client` | 待 npm view / 官方文档核验 | Prisma Client belongs to api or explicit data scripts only. |
| Config validation | zod or joi | 待 npm view / 官方文档核验 | Prefer one schema library for environment validation. |
| Testing | vitest or jest, supertest or inject-based Fastify tests | 待 npm view / 官方文档核验 | Pick one test runner for backend and shared package first. |
| API docs validation | OpenAPI validator CLI/library | 待 npm view / 官方文档核验 | Must run in CI after install. |

## Miniapp dependency categories

| Category | Candidate packages | Version | Notes |
| --- | --- | --- | --- |
| Taro | `@tarojs/cli`, `@tarojs/taro`, platform packages | 待 npm view / 官方文档核验 | Confirm WeChat miniapp target and React compatibility. |
| React | `react`, `react-dom` if required by tooling | 待 npm view / 官方文档核验 | Match Taro supported peer range. |
| TypeScript build tooling | Taro TS presets/plugins | 待 npm view / 官方文档核验 | Keep app code importing shared contracts, not backend internals. |
| Test tooling | framework-compatible unit test stack | 待 npm view / 官方文档核验 | Enable only after pages are implemented. |

## Admin and H5 dependency categories

| Category | Candidate packages | Version | Notes |
| --- | --- | --- | --- |
| Vite | `vite`, framework plugin | 待 npm view / 官方文档核验 | Admin and H5 may share Vite conventions without importing each other. |
| React | `react`, `react-dom`, `@vitejs/plugin-react` | 待 npm view / 官方文档核验 | Confirm one React version across admin, h5, and Electron renderer where practical. |
| Routing | `react-router` or TanStack Router | 待 npm view / 官方文档核验 | Choose based on admin nested routing and H5 share pages. |
| UI component candidates | Ant Design, Arco Design, Radix UI, shadcn-style components | 待 npm view / 官方文档核验 | Admin should prioritize dense operational tables/forms; H5 can use lighter custom UI. |
| State/data utilities | TanStack Query, Zustand or equivalent | 待 npm view / 官方文档核验 | Introduce only when real API client work starts. |
| Test tooling | Vitest, Testing Library, Playwright later | 待 npm view / 官方文档核验 | Playwright should wait until runnable UI exists. |

## Mirror terminal dependency categories

| Category | Candidate packages | Version | Notes |
| --- | --- | --- | --- |
| Electron | `electron`, packager/builder candidate | 待 npm view / 官方文档核验 | Keep main-process and renderer boundaries explicit. |
| Vite | Vite Electron integration candidate | 待 npm view / 官方文档核验 | Select a maintained Electron + Vite template or wire manually after review. |
| React | `react`, `react-dom`, Vite React plugin | 待 npm view / 官方文档核验 | Renderer UI only. Main process must not import React. |
| 3D rendering | Three.js or Babylon.js | 待 npm view / 官方文档核验 | Access through `ar-adapter` boundary. |
| AR adapter candidates | MediaPipe, commercial AR SDK, custom adapter | 待 npm view / 官方文档核验 | No direct camera/AR implementation outside adapter. |
| Local persistence | SQLite or file-backed queue candidate | 待 npm view / 官方文档核验 | Used only for offline event queue after explicit design approval. |

## Data and infrastructure dependency categories

| Category | Candidate packages | Version | Notes |
| --- | --- | --- | --- |
| PostgreSQL client | Prisma Client, pg only if needed | 待 npm view / 官方文档核验 | Prefer Prisma for business access; direct pg only for explicit infrastructure scripts. |
| Redis client | ioredis or node-redis | 待 npm view / 官方文档核验 | Used for cache, locks, sessions, and lightweight queues. |
| Object storage adapter | Aliyun OSS SDK, Tencent COS SDK, S3-compatible client | 待 npm view / 官方文档核验 | Must sit behind media/object-storage adapter boundary. |
| Queue candidate | BullMQ, Redis queue, later RabbitMQ/Kafka clients | 待 npm view / 官方文档核验 |一期 prefer Redis-backed queue unless scale requires more. |
| Observability | pino, OpenTelemetry packages | 待 npm view / 官方文档核验 | Add after runtime framework selection is confirmed. |

## Current package script review

The current package scripts are placeholders for the future installed toolchain. Before dependencies are installed, do not treat these scripts as runnable verification commands.

- Root currently contains future `dev`, `build`, `lint`, `typecheck`, and `format` scripts that expect turbo/tooling.
- Packages currently contain `typecheck` commands that expect TypeScript and placeholder `lint`/`test` echo scripts.
- Do not add real framework scripts such as Taro, Vite, Electron, Prisma, or NestJS start commands until the matching dependencies are installed and verified.

## Installation sequence proposal

1. Confirm dependency set and versions using `npm view` plus official documentation.
2. Update package manifests in one reviewed change.
3. Run `pnpm install` from repo root only.
4. Confirm exactly one root lockfile is generated: `pnpm-lock.yaml`.
5. Confirm no nested package lockfiles are generated.
6. Run the minimum validation pipeline below.
7. Record results in the matching execution entry.

## Minimum post-install validation pipeline

Run only after Thread01 approves dependency installation.

1. Package JSON validity:
   - `python3 -m json.tool package.json`
   - Repeat for every `apps/*/package.json` and `packages/*/package.json`.
2. Lockfile generation:
   - Confirm `pnpm-lock.yaml` exists at repo root.
   - Confirm no nested `package-lock.json`, `yarn.lock`, or duplicate `pnpm-lock.yaml` exists.
3. Type checking:
   - Prefer `pnpm typecheck` once turbo is installed.
   - Also keep `tsc --build --noEmit` available for project-reference validation.
4. Prisma validation:
   - Run schema validation after Prisma is installed.
   - Run Prisma generate and confirm generated client is not committed unless project policy says so.
5. OpenAPI validation:
   - Run a static OpenAPI 3.1 validator against `docs/api/phase-1-openapi.yaml`.
6. App dependency boundary scan:
   - Ensure apps do not import from other apps.
   - Ensure frontend/terminal apps import shared contracts from `@jewelry/shared`, not backend source.
7. Shared package purity scan:
   - Ensure `packages/shared` does not import NestJS, React, Taro, Electron, Prisma, DB clients, object storage SDKs, queue SDKs, or framework runtime code.
   - Ensure shared contains constants, enums, light DTOs, and pure utility types only.
8. Business implementation guard:
   - Confirm dependency installation did not introduce real Controller, API client, UI, database access, camera, AR, AI, queue, or object storage business flow implementation.

## Not allowed in this preparation step

- Do not run `pnpm install`, `npm install`, `npx`, `prisma`, `taro`, `vite`, or `electron`.
- Do not create `node_modules` or lockfiles.
- Do not modify the requirements document, architecture design document, OpenAPI file, or Prisma schema.
- Do not add real business implementation.

# TypeScript Workspace Boundaries

## Purpose

This document defines the offline TypeScript package boundaries for the Phase 1 monorepo. It prepares the repo for later dependency installation, typechecking, linting, and white-box tests without installing dependencies now.

## Packages

- Root workspace: owns Turborepo orchestration and shared compiler defaults.
- `@jewelry/shared`: source-only shared package for cross-app constants, enums, and lightweight DTO placeholders.
- `@jewelry/api`: backend API skeleton. It may depend on `@jewelry/shared` and later NestJS/Prisma dependencies after explicit approval.

## Dependency Rules

- `packages/shared` may not depend on `apps/api` or any app package.
- `apps/api` may depend on `@jewelry/shared`.
- Apps must not directly depend on one another. If two apps need the same type or constant, move the minimal shared surface into `@jewelry/shared`.
- `@jewelry/shared` must stay lightweight: cross-end constants, enums, tiny DTO placeholders, and stable API vocabulary only.
- Business workflows, database access, HTTP controllers, device signing, and storage logic belong in app modules, not in `@jewelry/shared`.

## Compiler Defaults

`tsconfig.base.json` enables strict TypeScript settings:

- `strict`
- `noUncheckedIndexedAccess`
- `exactOptionalPropertyTypes`
- `noImplicitOverride`
- `noPropertyAccessFromIndexSignature`
- `useUnknownInCatchVariables`

The root path alias maps `@jewelry/shared` to `packages/shared/src/index.ts` for source-first development before a build pipeline exists.

## Current Offline Status

No dependencies have been installed. Package scripts define future `typecheck`, `lint`, and `test` entry points, but lint/test are placeholder echo commands until tools are approved and installed.

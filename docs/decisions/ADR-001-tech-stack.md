# ADR-001: Phase 1 Technology Stack

**Date:** 2026-05-30  
**Status:** Accepted by thread 01  
**Scope:** Phase 1 engineering skeleton

## Decision

Phase 1 uses a TypeScript-first monorepo:

- Code root: `jewelry-digital-system/`
- Package manager: pnpm workspace
- Build orchestration: Turborepo
- Backend: NestJS + Fastify adapter + TypeScript
- ORM: Prisma + PostgreSQL
- Cache and queue foundation: Redis, with BullMQ reserved for async jobs
- Miniapp: Taro + React + TypeScript, with WeChat Mini Program as the first release target
- Admin: React + Vite + TypeScript, with Ant Design reserved
- Mirror terminal: Electron + React + Vite + TypeScript
- Shared package: `packages/shared` for base types, enums, DTOs, and API contract placeholders

## Context

The system needs to cover WeChat, H5, admin, Electron mirror terminal, backend services, PostgreSQL, Redis, object storage, and AI Gateway. Phase 1 should validate the acquisition and conversion loop before implementing broad P1/P2 capabilities.

## Rationale

- pnpm workspace and Turborepo keep the multi-app codebase coherent while avoiding early microservice overhead.
- NestJS supports modular monolith boundaries that map well to customer, product, try-on, custom design, marketing, order, device, and AI domains.
- Prisma accelerates schema iteration for the first validation phase.
- Taro leaves room for H5 reuse while keeping WeChat Mini Program as the main first target.
- Electron keeps camera and rendering logic local, matching the low-latency mirror requirement.
- Shared TypeScript definitions reduce interface drift across apps.

## Consequences

- Dependency installation is deferred until a later instruction.
- Business models and feature implementations are intentionally excluded from this ADR.
- The mirror terminal must keep an AR adapter boundary so a commercial SDK can be introduced later without reshaping the app.

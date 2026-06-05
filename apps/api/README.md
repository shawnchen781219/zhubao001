# API Service

NestJS + Fastify modular monolith backend boundary for the jewelry digital system.

## Current Status

This app is not runnable yet. Instruction 006 creates an offline TypeScript source skeleton only. Dependencies have not been installed, no NestJS decorators are used, no HTTP controllers exist, and no database writes are implemented.

## Source Structure

- `src/main.ts`: runtime status placeholder; no bootstrap yet.
- `src/app.module.ts`: module boundary manifest; not a NestJS module yet.
- `src/common/errors`: unified error response and error code placeholders.
- `src/common/idempotency`: idempotency key and replay/conflict contract.
- `src/common/tracing`: `traceId` and `requestId` context placeholder.
- `src/modules/auth`: customer, staff, and device auth boundary.
- `src/modules/device`: device registration, heartbeat, and active-device checks.
- `src/modules/catalog`: product/asset/gemstone catalog sync boundary.
- `src/modules/try-on`: anonymous try-on session and QR scan boundary.
- `src/modules/media`: authorized media boundary; no raw biometric persistence.
- `src/modules/coupon`: coupon claim, redemption, and idempotency boundary.
- `src/modules/customer`: sparse profile, merge, and admin customer read boundary.
- `src/modules/event`: append-only event audit and payload redaction boundary.
- `src/modules/admin`: store-scoped admin list boundary.
- `docs/white-box-test-plan.md`: Phase 1 backend white-box test checklist.

## Guardrails

- Do not add NestJS decorators until dependencies are installed and the project is ready to compile.
- Do not import Prisma client or write database access in this skeleton phase.
- Do not store raw phone numbers, raw WeChat IDs, device secrets, or raw biometric media in event payloads.
- All side-effect endpoints must honor the idempotency contract before mutation.

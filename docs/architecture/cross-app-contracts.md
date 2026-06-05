# Cross-App Contracts

## Source of truth

`docs/api/phase-1-openapi.yaml` is the source of truth for Phase 1 HTTP API paths, request and response shapes, auth requirements, and error semantics.

The `@jewelry/shared` package stores only stable constants, enums, and lightweight DTO summaries that are safe to reference across apps. It must not become a copy of the OpenAPI document and must not contain business flow orchestration.

## Route usage

Frontend and terminal apps must import API route constants from `@jewelry/shared` instead of hardcoding route strings. Routes with side effects must be checked against `SIDE_EFFECT_ROUTES` and sent with `X-Idempotency-Key` once a real API client is introduced.

## App boundaries

Apps must not directly depend on other apps. Shared language belongs in `packages/shared`; implementation details stay inside the owning app or backend module.

## Error shape

API errors use `ApiErrorResponse` from `@jewelry/shared` as the lightweight cross-app error shape. Detailed validation payloads may live in `details`, but apps should continue to treat the OpenAPI schema as canonical when implementing real clients.

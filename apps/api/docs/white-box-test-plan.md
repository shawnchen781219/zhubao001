# API Phase 1 White-Box Test Plan

## Scope

This plan covers the offline backend skeleton for the Phase 1 loop: trusted device, anonymous try-on, QR scan, customer authorization, media authorization, coupon issuance, coupon redemption, admin follow-up lists, and event audit hygiene.

## Device Trust

- Missing `X-Device-Id` or `X-Device-Signature` returns `DEVICE_SIGNATURE_MISSING`.
- Invalid device signature returns `DEVICE_SIGNATURE_INVALID`.
- Unknown device returns `DEVICE_NOT_FOUND`.
- Suspended or retired device returns `DEVICE_NOT_ACTIVE`.
- Accepted heartbeat records a `DEVICE_HEARTBEAT` event with redacted payload.
- **Automated (指令023 / 指令024):** Device signature verification with HMAC-SHA256 and timing-safe comparison covers:
  - Correct signature passes verification.
  - Wrong signature returns `DEVICE_SIGNATURE_INVALID`.
  - Missing `deviceId` or `signature` returns `DEVICE_SIGNATURE_MISSING`.
  - Request timestamp outside 5-minute skew returns `DEVICE_CLOCK_SKEW`.
  - Altered `method`, `path`, `bodyHash`, `nonce`, or `deviceId` in payload invalidates signature.
  - Timing-safe comparison handles different-length signature inputs without throwing.
- **Automated (指令025 / 指令026):** Device authentication Guard/Port infrastructure covers:
  - Missing `X-Device-Id` or `X-Device-Signature` returns `DEVICE_SIGNATURE_MISSING` through Guard.
  - Invalid or missing timestamp returns `DEVICE_CLOCK_SKEW` through Guard.
  - Wrong signature returns `DEVICE_SIGNATURE_INVALID` through Guard.
  - Device not found stub returns `DEVICE_NOT_FOUND` through Guard.
  - Device not active stub returns `DEVICE_NOT_ACTIVE` through Guard.
  - Correct signature allows request and attaches `devicePrincipal` with `{ deviceId }` — 测试真实断言响应体中可见该 principal。
  - Attached `devicePrincipal` does not contain `secret`, `signature`, or `nonce` — 白盒测试已覆盖敏感字段排除。
  - Error responses do not leak signature or secret material.
- **Automated (指令027):** Device credential semantic tightening:
  - `DeviceAuthPort` returns `verificationSecret` (not `secret`) to avoid confusion with `Device.secretHash`.
  - Guard uses `verificationSecret` as HMAC key material; never uses a plain password hash for signing.
  - Real device credential persistence must comply with ADR-005 before Prisma adapter implementation.
- **Automated (指令028 / 指令029):** Device heartbeat controller slice:
  - `POST /devices/heartbeat` is protected by `DeviceAuthGuard` and returns `{ serverTime, status, traceId }`.
  - `DeviceService.acceptHeartbeat` passes `deviceId` from Guard principal to `DevicePort`; body `deviceId` is ignored.
  - Missing or invalid device signature still returns `DEVICE_SIGNATURE_MISSING` or `DEVICE_SIGNATURE_INVALID` via Guard.
  - `health` payload containing forbidden keys (`secret`, `signature`, `privateKey`, `apiKey`, `token`, `password`, `credential`) returns `VALIDATION_FAILED` without leaking the sensitive value.
  - `health` payload containing base64-like data returns `VALIDATION_FAILED` without leaking the data.
  - `health` payload containing raw media data URI returns `VALIDATION_FAILED` without leaking the media content.
  - **指令029 修复后新增：** health deny-list 大小写不敏感（`ApiKey`, `PRIVATEKEY` 均命中）。
  - **指令029 修复后新增：** health 递归扫描覆盖嵌套 object/array（最多 5 层），防止 `{ system: { apiKey: "..." } }` 漏检。
  - **指令029 修复后新增：** principal 缺失兜底不再抛普通 `Error`，改为受控 `HttpException` (`AUTH_FORBIDDEN`) 并走 `ApiExceptionFilter`。
  - `DeviceModule` is not imported into `AppModule`; no runtime default authentication stub is provided.

## Try-On Session

- A trusted active device can create an anonymous try-on session with `anonymousId` and no `customerId`.
- Repeating create-session with the same idempotency key and same payload returns the original session result.
- Reusing the same idempotency key with a different payload returns `IDEMPOTENCY_CONFLICT`.
- QR shown transition records `TRY_ON_QR_SHOWN` and returns stable QR payload on replay.
- Scan binds the session to the authenticated customer after BearerAuth validation.
- Attempting to bind an already-bound session to a different customer returns `TRY_ON_SESSION_ALREADY_BOUND`.
- Expired sessions reject scan or authorization with `TRY_ON_SESSION_EXPIRED`.

## Media Authorization

- Media authorization without customer BearerAuth returns `AUTH_MISSING_TOKEN` or `AUTH_INVALID_TOKEN`.
- Customer can authorize only media linked to a session they own.
- API rejects payloads that contain raw biometric frames, raw media blobs, or public object URLs.
- Authorized media stores private storage keys only and records `MEDIA_AUTHORIZED`.
- Expired temporary media cannot be authorized and returns `MEDIA_EXPIRED`.

## Coupon

- First claim with a valid template and authorized customer issues a coupon and records `COUPON_ISSUED`.
- Duplicate claim with same idempotency key and same payload returns the same coupon result.
- Same idempotency key with different payload returns `IDEMPOTENCY_CONFLICT`.
- Duplicate claim outside idempotency policy returns `COUPON_ALREADY_CLAIMED` when the rule says one coupon per session/customer.
- Redeeming an issued coupon records `COUPON_REDEEMED`.
- Redeeming an already redeemed coupon returns `COUPON_ALREADY_REDEEMED` or a replayed idempotent result.
- Redeeming an expired coupon returns `COUPON_EXPIRED`.

## Admin Store Isolation

- `GET /admin/customers` returns only customers for the staff principal's store.
- `GET /admin/try-on-sessions` returns only sessions for the staff principal's store.
- `GET /admin/coupons` returns only coupons for the staff principal's store.
- `GET /admin/devices` returns only devices for the staff principal's store.
- Cross-store access attempts return `AUTH_STORE_SCOPE_VIOLATION`.

## EventLog Hygiene

- Event payload redaction rejects or strips plain phone numbers.
- Event payload redaction rejects or strips raw OpenID and UnionID values.
- Event payload redaction rejects or strips device secrets and signature material.
- Event payload redaction rejects raw media, biometric frames, and base64 image/video bodies.
- Every event stores `traceId`, `storeId`, and event type.
- **Automated (指令031):** EventService boundary encapsulation covers:
  - `recordEvent` calls `EventPort.recordEvent` for safe payload.
  - `recordEvent` throws `VALIDATION_FAILED` for sensitive key payload and does not call `EventPort`.
  - `recordEvent` throws `VALIDATION_FAILED` for raw phone value, raw OpenID key, raw media data URI, base64-like data.
  - `recordEvent` error response does not contain original sensitive value.
  - `recordEvent` allows safe payload with hash fields (`phoneHash`, `identityHash`).
  - `recordEvent` throws `VALIDATION_FAILED` for nested sensitive key.
  - `assertPayloadSafe` does not throw for safe payload.
  - `assertPayloadSafe` throws `VALIDATION_FAILED` for dangerous payload, with traceId preserved and sensitive value redacted.
  - `EVENT_PORT` stub is injectable via NestJS module provider.
  - `EventModule` is not imported into `AppModule`; no real database adapter is provided.
- **Automated (指令033):** Device heartbeat client field pre-validation covers:
  - `appVersion` containing base64-like data triggers `VALIDATION_FAILED` before `DevicePort.acceptHeartbeat` and `EventPort.recordEvent` are called.
  - `localTime` containing raw phone number triggers `VALIDATION_FAILED` before `DevicePort.acceptHeartbeat` and `EventPort.recordEvent` are called.
  - Error responses do not leak the original dangerous value.
  - `DevicePort.acceptHeartbeat` is not called when client field validation fails.
  - `EventPort.recordEvent` is not called when client field validation fails.
- **Automated (指令034):** Device heartbeat storeId tightening covers:
  - `DevicePort.acceptHeartbeat` returns `storeId`; `DEVICE_HEARTBEAT` event uses that `storeId` instead of hard-coded placeholder.
  - Heartbeat API response body does not expose `storeId`.
  - Empty `storeId` from `DevicePort` triggers `VALIDATION_FAILED`, and `EventPort.recordEvent` is not called.
- **Automated (指令035 / 指令036):** Event type contract alignment covers:
  - Prisma `EventType` enum covers all shared `DomainEventType` values.
  - Prisma `EventType` enum does not contain extra values outside shared `DomainEventType` (set equality).
  - `EventLogInput.eventType` uses `DomainEventType` type, not bare `string`.
  - `DeviceService` uses `DomainEventType.DeviceHeartbeat` instead of string literal.
  - Anti-drift test reads `prisma/schema.prisma` and asserts shared/prisma event type set equality.
- **Automated (指令037):** EventLog Prisma adapter mapping covers:
  - `PrismaEventPort` implements `EventPort` type contract.
  - Safe event maps `storeId`, `eventType`, `occurredAt` (as `Date`), `deviceId`, `payload` to Prisma `eventLog.create` data.
  - `traceId` is NOT written to Prisma `data`.
  - Optional fields (`customerId`, `anonymousId`, `tryOnSessionId`, `payload`) are omitted from `data` when `undefined`.
  - Empty or whitespace-only `storeId` throws `VALIDATION_FAILED` and does not call delegate.
  - Invalid/non-ISO `occurredAt` throws `VALIDATION_FAILED` and does not call delegate.
  - Numeric string `occurredAt` (e.g. `"1234567890"`) is rejected as invalid.
- **Automated (指令038):** EventLog adapter type tightening and heartbeat test isolation:
  - `EventLogCreateData.eventType` uses `DomainEventType` type instead of bare `string`.
  - Fake delegate in tests receives `DomainEventType.DeviceHeartbeat` as `data.eventType`.
  - `StubDevicePort` uses `heartbeatStoreId` scenario field instead of permanent method override.
  - Empty `storeId` heartbeat test sets `heartbeatStoreId = ""` and resets via `beforeEach`.
  - After empty `storeId` scenario, next normal heartbeat still records event with default `storeId`.
- **Automated (指令039):** EventLog adapter boundary guard tightening:
  - `event.prisma-adapter.ts` comment correctly states `eventType` uses `DomainEventType`, not bare `string`.
  - Adapter passes `traceId` inside `input.payload` through to Prisma `data.payload` without cleaning; payload hygiene is `EventService`'s responsibility.
  - `EventModule` does not register `PrismaEventPort` or provide `EVENT_PORT` provider.
  - `AppModule` does not import `DeviceModule` or `EventModule`.
  - Boundary guard regex for `PrismaClient` and `@prisma/client` import matches real syntax only, not comments.
- **Automated (指令032):** Device heartbeat event composition covers:
  - Successful heartbeat calls `EventService.recordEvent` once with eventType `DEVICE_HEARTBEAT`.
  - Event `deviceId` comes from Guard principal, not from request body.
  - Event `traceId` comes from request trace (`X-Request-Id` or generated traceId).
  - Event payload contains only safe summary (`appVersion`, `localTime`, `status`, `healthSummary`), not full `health`.
  - `healthSummary` contains only health key names and count, not health values.
  - Body `deviceId` tampering does not affect event `deviceId`.
  - Health payload with sensitive fields fails at DeviceService pre-validation, and `EventPort` is not called.
  - `DeviceModule` imports `EventModule`, but neither is imported into `AppModule`.
- **Automated (指令030):** Event payload hygiene pure function covers:
  - Safe summary payload passes (`traceId`, `storeId`, `deviceId`, `eventType`, `healthSummary`, etc.).
  - Hash fields pass (`phoneHash`, `identityHash`, `lastSeenIpHash`).
  - Top-level and nested sensitive keys are rejected case-insensitively (`secret`, `signature`, `privateKey`, `apiKey`, `token`, `password`, `credential`, `phone`, `mobile`, `phoneNumber`, `openid`, `openId`, `unionid`, `unionId`, `rawMedia`, `rawImage`, `rawVideo`, `biometric`, `faceVector`).
  - Raw phone number values are rejected; `phoneHash` is allowed even if the value looks like a phone number.
  - Raw media data URIs (`data:image/`, `data:video/`, `data:application/octet-stream`) are rejected.
  - Long base64-like strings are rejected.
  - Nested sensitive keys, nested raw media, and nested base64-like data inside objects and arrays are rejected.
  - Error responses do not contain original sensitive values.
  - Payloads exceeding 5 nesting levels return `VALIDATION_FAILED` with depth exceeded message.
- **Automated (指令040):** EventService + PrismaEventPort integration covers:
  - Safe payload reaches fake delegate as correctly mapped Prisma-shaped `eventLog.create` data (`storeId`, `eventType`, `occurredAt` as `Date`, `deviceId`, `payload`).
  - Dangerous payload (`secret`, raw phone, raw media data URI) is rejected by `EventService` with `VALIDATION_FAILED`; fake delegate is not called.
  - Error response does not leak original dangerous value.
  - `traceId` inside `input.payload` is NOT rejected by EventService hygiene; adapter maps it faithfully into `data.payload`.
  - `input.traceId` is NOT written into Prisma `data`.
  - PrismaEventPort's own validation (empty `storeId`, invalid `occurredAt`) still works under EventService and prevents delegate call.
- **Automated (指令041):** DeviceService + EventService + PrismaEventPort heartbeat integration covers:
  - Successful heartbeat calls `DevicePort.acceptHeartbeat` once with correct `deviceId`, `requestId`, `appVersion`, `localTime`, `health`.
  - `DEVICE_HEARTBEAT` event is written to fake delegate with `storeId` from `DevicePort` result, `deviceId` from service input, `occurredAt` as `Date`.
  - Event payload contains safe summary (`appVersion`, `localTime`, `status`, `healthSummary`), not full raw `health`.
  - `healthSummary` contains only key names and count, not values.
  - `input.traceId` is NOT written into Prisma `data`.
  - Dangerous `appVersion` (base64-like) triggers `VALIDATION_FAILED` before `DevicePort` and EventLog delegate are called; error does not leak original value.
  - Dangerous `localTime` (raw phone number) triggers `VALIDATION_FAILED` before `DevicePort` and EventLog delegate are called; error does not leak original value.
  - Dangerous `health` (forbidden key or raw media data URI) triggers `VALIDATION_FAILED` before `DevicePort` and EventLog delegate are called; error does not leak original value.
  - Empty `storeId` from `DevicePort` triggers `VALIDATION_FAILED` after `DevicePort` call but EventLog delegate is not called.
- **Automated (指令042):** Prisma runtime activation gate and collaboration record safety covers:
  - ADR-006 exists and defines clear module/provider import gates before real Prisma runtime activation.
  - `boundary-guard.spec.ts` asserts `DeviceModule` does not register `DEVICE_PORT`, `DEVICE_AUTH_PORT`, or any `PrismaDevice*` / `DevicePrisma*` provider.
  - `boundary-guard.spec.ts` asserts `EventModule` does not register `EVENT_PORT` or `PrismaEventPort` provider.
  - `boundary-guard.spec.ts` asserts `AppModule` does not import `DeviceModule`, `EventModule`, or `PrismaModule`.
  - `boundary-guard.spec.ts` asserts `apps/api/src` files do not import or instantiate `PrismaClient` or `@prisma/client`.
  - `boundary-guard.spec.ts` asserts no business route controllers for `/try-on`, `/coupons`, `/admin` exist.
  - `docs/operations/collaboration-record-safety.md` exists and prescribes backup-before-append workflow for execution file, status board, and instruction file.

## Idempotency Contract

- All side-effect endpoints require `X-Idempotency-Key` unless the endpoint document explicitly defines another replay-safe policy.
- Same key plus same payload returns the original result.
- Same key plus different payload returns `IDEMPOTENCY_CONFLICT`.
- Idempotency records are scoped by route, principal, and key.

- **Automated (指令044 / 指令045):** Prisma runtime boundary skeleton covers:
  - `PrismaClient` import and `new PrismaClient()` are allowed only in `apps/api/src/common/prisma-runtime/prisma-runtime.module.ts`.
  - `new PrismaClient(` appears exactly once in the entire source tree, and only in the prisma-runtime boundary.
  - `PRISMA_CLIENT` token is exposed by `PrismaRuntimeModule` provider/export metadata.
  - `providers` metadata contains exactly one `PRISMA_CLIENT` provider using `useFactory`.
  - `exports` metadata contains only `PRISMA_CLIENT`; `PrismaClientHolder` is not exported.
  - Factory body does not contain `$connect(`, query methods (`.findMany(`, `.findUnique(`, `.create(`, `.update(`, `.delete(`, `.upsert(`), or any database operation.
  - `PrismaClientHolder` implements `OnModuleDestroy` and calls `$disconnect()`.
  - `$connect()` is not called by the module (PrismaClient lazy-connects on first query).
  - `PrismaClientHolder.onModuleDestroy()` calls `$disconnect()` on teardown.
  - `AppModule` does not import `PrismaRuntimeModule`.
  - `DeviceModule` does not import `PrismaRuntimeModule`.
  - `EventModule` does not import `PrismaRuntimeModule`.
  - `boundary-guard.spec.ts` enforces that `PrismaClient` and `@prisma/client` can only be imported from `prisma-runtime.module.ts`.
  - `boundary-guard.spec.ts` enforces that no source file contains `$connect(` outside comments.
  - `boundary-guard.spec.ts` enforces that `DeviceModule` does not register `DEVICE_PORT`, `DEVICE_AUTH_PORT`, or any Prisma device adapter.
  - `boundary-guard.spec.ts` enforces that `EventModule` does not register `EVENT_PORT` or `PrismaEventPort`.
  - `boundary-guard.spec.ts` enforces that `AppModule` does not import `DeviceModule`, `EventModule`, or `PrismaRuntimeModule`.
  - `new PrismaClient({} as never)` is a temporary offline skeleton placeholder for Prisma 7.8 adapter; it must not be interpreted as "real database runtime is ready for activation".

# Backend Module Boundaries

## Purpose

Phase 1 backend remains a modular monolith. These module boundaries define read/write ownership before any NestJS controllers or services are implemented.

## ConfigModule

- Owns model writes: none.
- Reads: environment configuration and runtime feature flags.
- Provides: typed configuration access for database, Redis, storage, AI gateway placeholders, WeChat placeholders, and device signature settings.
- Publishes events: none.
- Must not: read business tables directly or make authorization decisions.

## AuthModule

- Owns model writes: `CustomerIdentity` only when binding or verifying customer identity; may read `StaffUser`, `Customer`, and `Device` for authentication.
- Provides: customer BearerAuth validation, staff BearerAuth validation, device signature validation, identity hash utilities, current principal context.
- Publishes events: `CUSTOMER_AUTHORIZED` when a customer identity is newly bound.
- Must not: issue coupons, mutate try-on sessions except through TryOnModule service methods, or expose raw WeChat IDs/phone numbers to downstream modules.

## DeviceModule

- Owns model writes: `Device` and device heartbeat `EventLog` entries through EventModule.
- Reads: `Store`, `StaffUser` when provisioning is staff-initiated.
- Provides: device registration, credential rotation boundary, heartbeat acceptance, status checks, trusted device lookup.
- Publishes events: `DEVICE_REGISTERED`, `DEVICE_HEARTBEAT`, `DEVICE_SUSPENDED`.
- Must not: write products, coupons, customers, or try-on item selections directly.

## CatalogModule

- Owns model writes: `Product`, `ProductAsset`, `Gemstone` in later admin/catalog instructions.
- Reads: `Store`, `Product`, `ProductAsset`, `Gemstone`.
- Provides: device catalog sync, product lookup for try-on validation, gemstone story lookup for H5.
- Publishes events: `CATALOG_SYNCED` if sync telemetry is needed.
- Must not: create try-on sessions, issue coupons, or store customer media.

## TryOnModule

- Owns model writes: `TryOnSession`, `TryOnItem`.
- Reads: `Device`, `Product`, `Customer` after authorization.
- Provides: create anonymous sessions, record selected products, mark QR shown, mark scan, bind customer to session after AuthModule validates the principal.
- Publishes events: `TRY_ON_STARTED`, `TRY_ON_ITEM_SELECTED`, `TRY_ON_QR_SHOWN`, `TRY_ON_QR_SCANNED`, `TRY_ON_AUTHORIZED`, `TRY_ON_COMPLETED`.
- Must not: persist raw camera streams, issue coupons directly, or bypass DeviceModule trust checks.

## MediaModule

- Owns model writes: `MediaAsset`.
- Reads: `TryOnSession`, `TryOnItem`, `Customer`, `Store`.
- Provides: authorize media, create private storage records, generate future upload policy boundaries, expire or delete media records.
- Publishes events: `MEDIA_AUTHORIZED`, `MEDIA_EXPIRED`, `MEDIA_DELETED`.
- Must not: accept raw unauthorized biometric streams, expose public object URLs, or modify customer identity.

## CouponModule

- Owns model writes: `CouponTemplate`, `Coupon`.
- Reads: `Customer`, `TryOnSession`, `Store`, `StaffUser` for redemption.
- Provides: coupon claim, idempotent issuance, redemption, status transitions, duplicate scan protection.
- Publishes events: `COUPON_ISSUED`, `COUPON_REDEEMED`, `COUPON_EXPIRED`, `COUPON_VOIDED`.
- Must not: create customers, mutate try-on selected items, or treat client-supplied coupon amounts as trusted.

## CustomerModule

- Owns model writes: `Customer`, customer tags/preferences, and merge pointers after AuthModule provides verified identity context.
- Reads: `CustomerIdentity`, `TryOnSession`, `Coupon`, `EventLog` for profile and admin views.
- Provides: customer profile lookup, sparse profile creation, merge orchestration, admin list read model.
- Publishes events: `CUSTOMER_CREATED`, `CUSTOMER_MERGED`, `CUSTOMER_PROFILE_UPDATED`.
- Must not: directly inspect raw credentials, issue coupons, or write device state.

## EventModule

- Owns model writes: `EventLog`.
- Reads: none required beyond validating references supplied by caller modules.
- Provides: append-only event recording, trace ID correlation, event payload redaction policy.
- Publishes events: none; it records events from other modules.
- Must not: mutate domain state in response to writes or store raw secrets, phone numbers, raw WeChat IDs, or biometric payloads.

## AdminModule

- Owns model writes: none in this instruction.
- Reads: `Customer`, `TryOnSession`, `Coupon`, `Device`, `EventLog`, and related store-scoped summaries.
- Provides: `GET /admin/customers`, `GET /admin/try-on-sessions`, `GET /admin/coupons`, `GET /admin/devices` read endpoints.
- Publishes events: `STAFF_FOLLOW_UP_CREATED` only when a later instruction adds follow-up mutation.
- Must not: bypass StaffBearerAuth, return cross-store data, or write operational state through list endpoints.

## Cross-Module Rules

- All store-scoped reads must filter by the authenticated store context.
- All side-effect APIs must pass an idempotency key to the owning module before writing.
- Only owning modules write their models; other modules call service methods instead of sharing repositories casually.
- Event payloads must be redacted before persistence.
- Try-on, media, coupon, and customer flows must work with anonymous sessions until customer authorization is explicit.

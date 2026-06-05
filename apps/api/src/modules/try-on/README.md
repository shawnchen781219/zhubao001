# TryOnModule

## Responsibility

TryOnModule is the Phase 1 boundary for this domain in the modular monolith.

## Model Access

TryOnSession and TryOnItem writes; Device, Product, and Customer reads.

## Public Methods

- `createAnonymousSession`
- `recordSelectedItem`
- `markQrShown`
- `markScanned`
- `bindAuthorizedCustomer`

## Published Events

- `TRY_ON_STARTED`
- `TRY_ON_ITEM_SELECTED`
- `TRY_ON_QR_SHOWN`
- `TRY_ON_QR_SCANNED`
- `TRY_ON_AUTHORIZED`
- `TRY_ON_COMPLETED`

## Must Not

Must not persist raw camera streams, issue coupons directly, or bypass DeviceModule trust checks.

## Current Status

Offline TypeScript boundary only. No NestJS decorators, database access, HTTP controller, or external service call is implemented here.

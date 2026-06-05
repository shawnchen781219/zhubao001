# AdminModule

## Responsibility

AdminModule is the Phase 1 boundary for this domain in the modular monolith.

## Model Access

No model writes in this phase; reads Customer, TryOnSession, Coupon, Device, EventLog summaries.

## Public Methods

- `listCustomers`
- `listTryOnSessions`
- `listCoupons`
- `listDevices`

## Published Events

- `STAFF_FOLLOW_UP_CREATED in a later mutation instruction`

## Must Not

Must not bypass StaffBearerAuth, return cross-store data, or write operational state through list endpoints.

## Current Status

Offline TypeScript boundary only. No NestJS decorators, database access, HTTP controller, or external service call is implemented here.

# AuthModule

## Responsibility

AuthModule is the Phase 1 boundary for this domain in the modular monolith.

## Model Access

CustomerIdentity writes; StaffUser, Customer, and Device reads for authentication.

## Public Methods

- `validateCustomerBearerToken`
- `validateStaffBearerToken`
- `validateDeviceSignature`
- `bindCustomerIdentity`

## Published Events

- `CUSTOMER_AUTHORIZED`

## Must Not

Must not issue coupons, mutate try-on state directly, or expose raw WeChat IDs and phone numbers.

## Current Status

Offline TypeScript boundary only. No NestJS decorators, database access, HTTP controller, or external service call is implemented here.

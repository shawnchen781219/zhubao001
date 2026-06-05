# CustomerModule

## Responsibility

CustomerModule is the Phase 1 boundary for this domain in the modular monolith.

## Model Access

Customer writes after verified identity context; CustomerIdentity, TryOnSession, Coupon, and EventLog reads.

## Public Methods

- `createSparseCustomer`
- `getCustomerProfile`
- `mergeCustomers`
- `listCustomersForAdmin`

## Published Events

- `CUSTOMER_CREATED`
- `CUSTOMER_MERGED`
- `CUSTOMER_PROFILE_UPDATED`

## Must Not

Must not inspect raw credentials, issue coupons, or write device state.

## Current Status

Offline TypeScript boundary only. No NestJS decorators, database access, HTTP controller, or external service call is implemented here.

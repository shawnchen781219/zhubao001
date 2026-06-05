# CouponModule

## Responsibility

CouponModule is the Phase 1 boundary for this domain in the modular monolith.

## Model Access

CouponTemplate and Coupon writes; Customer, TryOnSession, Store, and StaffUser reads.

## Public Methods

- `claimCoupon`
- `redeemCoupon`
- `expireCoupon`
- `voidCoupon`

## Published Events

- `COUPON_ISSUED`
- `COUPON_REDEEMED`
- `COUPON_EXPIRED`
- `COUPON_VOIDED`

## Must Not

Must not create customers, mutate try-on selected items, or trust client-supplied coupon amounts.

## Current Status

Offline TypeScript boundary only. No NestJS decorators, database access, HTTP controller, or external service call is implemented here.

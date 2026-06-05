# @jewelry/admin

Admin offline skeleton for customers, try-on sessions, coupons, and devices.

## Current Status

First local static test entry is available. It uses plain HTML/CSS/JS and local Mock fixture data only. No framework bootstrap, network request, camera access, AR SDK, or Electron process logic is implemented.

## Local Test Entry

General human testing guide:

- `/Users/shawnchen78/Documents/珠宝店数字化/测试入口.md`

```bash
pnpm --filter @jewelry/admin dev
```

Default URL:

- `http://127.0.0.1:4201`

Optional custom port:

```bash
PORT=4301 pnpm --filter @jewelry/admin dev
```

## Smoke Check

```bash
pnpm --filter @jewelry/admin smoke
```

The smoke check verifies that the static entry files exist and contain the required Admin console markers, Mock data markers, fixture content, and responsive style markers.

## Test Checklist

For the complete first-round checklist and feedback format, see `/Users/shawnchen78/Documents/珠宝店数字化/测试入口.md`.

- Open `http://127.0.0.1:4201`.
- Confirm the page clearly marks the current data as `Mock 数据` / local fixture data.
- Use the navigation buttons: 概览、客户、设备、试戴记录、优惠券.
- Confirm overview metrics render: 今日试戴、活跃设备、待处理客户、券核销.
- Confirm recent try-on records show mock customers/items and guide actions.
- Confirm device status cards show heartbeat age and catalog version.
- Confirm coupon cards show local test coupon status and expiry.

## Mock Boundary

- All customers, devices, try-on records, and coupons are local fixture data.
- No real customer private data, phone number, address, order number, database query, or external service is used.
- Phone/customer examples are display-only and intentionally anonymized or masked.

## Known Incomplete Items

- No staff authentication flow.
- No API integration or real pagination/filtering.
- No production design system or framework runtime.
- No real coupon redemption, device heartbeat, or try-on persistence.

## Future Framework

React + Vite + TypeScript with Ant Design reserved.

Framework dependencies are intentionally not declared or installed in this instruction.

## Shared Boundary

This app may depend on `@jewelry/shared` for cross-app constants, enums, and lightweight DTO placeholders. It must not depend directly on other apps.

## Source Structure

See `src/` for page/module boundary placeholders and `docs/white-box-test-plan.md` for Phase 1 validation expectations.

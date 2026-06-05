# @jewelry/h5

H5 offline skeleton for gemstone passport and share card pages.

## Current Status

First local static test entry is available. It uses plain HTML/CSS/JS and local Mock fixture data only. No framework bootstrap, network request, camera access, AR SDK, or Electron process logic is implemented.

This H5 page currently carries the early miniapp user-path validation: scan result, gemstone passport, and coupon/store guidance are tested here before miniapp implementation is activated.

## Local Test Entry

General human testing guide:

- `/Users/shawnchen78/Documents/珠宝店数字化/测试入口.md`

```bash
pnpm --filter @jewelry/h5 dev
```

Default URL:

- `http://127.0.0.1:4202`

Optional custom port:

```bash
PORT=4302 pnpm --filter @jewelry/h5 dev
```

## Smoke Check

```bash
pnpm --filter @jewelry/h5 smoke
```

The smoke check verifies that the static entry files exist and contain the required H5 markers, Mock data markers, fixture content, and responsive style markers.

## Test Checklist

For the complete first-round checklist and feedback format, see `/Users/shawnchen78/Documents/珠宝店数字化/测试入口.md`.

- Open `http://127.0.0.1:4202` on desktop or a narrow/mobile viewport.
- Confirm the page clearly marks the current data as `Mock 数据`.
- Confirm the first screen shows a scan/try-on result rather than an empty explanation page.
- Tap 扫码结果、宝石护照、到店券 and confirm the detail panel updates.
- Tap 领取测试券 and confirm the button changes to 测试券已领取.
- Confirm coupon/store guidance is visible without using real identity or order data.

## Mock Boundary

- All scan result, gemstone passport, recommendation, and coupon content is local fixture data.
- No real customer identity, phone number, address, order number, object storage key, database query, or external service is used.
- This page does not perform a real coupon claim or media authorization request.

## Known Incomplete Items

- No miniapp runtime or WeChat SDK integration.
- No real scan token parsing, customer authorization, coupon claim, or media authorization.
- No API integration or production design system.
- Share card rendering remains a future H5 path.

## Future Framework

React/Vite or Taro H5 reuse, to be decided when dependencies are approved.

Framework dependencies are intentionally not declared or installed in this instruction.

## Shared Boundary

This app may depend on `@jewelry/shared` for cross-app constants, enums, and lightweight DTO placeholders. It must not depend directly on other apps.

## Source Structure

See `src/` for page/module boundary placeholders and `docs/white-box-test-plan.md` for Phase 1 validation expectations.

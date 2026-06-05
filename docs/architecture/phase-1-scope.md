# Phase 1 Scope

## Goal

Phase 1 validates the smallest operational loop:

1. Mirror terminal creates a try-on session.
2. Customer scans through WeChat.
3. Customer identity and authorization are recorded.
4. A first-visit coupon is issued idempotently.
5. Staff or admin can see the try-on lead and follow up.

## Included Foundation

- Monorepo and shared TypeScript foundation
- Backend modular monolith skeleton
- PostgreSQL and Redis service placeholders
- WeChat/Taro app boundary
- Admin app boundary
- Electron mirror terminal boundary
- Shared types and API contract location
- Documentation structure and ADR process

## Explicitly Deferred

- Full AR try-on implementation
- Commercial AR SDK integration
- Complete business database schema
- Real payment integration
- Real WeChat subscription/service-message delivery
- Real AI provider integration
- Full customer profile scoring
- P1/P2 features such as dual try-on mode, social reward automation, advanced referral campaigns, heavy customization, and analytics optimization

## Implementation Rule

Every new feature must support the Phase 1 loop or be explicitly approved by thread 01. When uncertain, prefer a narrow placeholder with a clear adapter boundary over a partial business implementation.

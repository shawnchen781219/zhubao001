# Phase 1 Data Model

## Scope

This model supports the Phase 1 loop: mirror try-on, QR scan, customer authorization, first-visit coupon issuance, and admin follow-up. It intentionally stops before full order, payment, AI conversation, jewelry box, and advanced customization modeling.

## Entities

- `Store`: the tenant boundary for all store-owned operational data. Staff, devices, products, try-on sessions, media, coupons, and events all trace back to a store.
- `StaffUser`: store employee or advisor account. It records role, status, and store membership for follow-up and audit attribution.
- `Customer`: unified customer profile inside a store. It can start sparse and become richer after identity authorization, tagging, or later CRM updates.
- `CustomerIdentity`: identity merge table. It stores identity type plus hashed identity value and enforces `@@unique([type, identityHash])`, so the same WeChat OpenID, UnionID, phone, or staff-created identity cannot create duplicate customer bindings.
- `Device`: trusted store hardware. It records device type, status, `secretHash`, last heartbeat, and store association so the backend can reject unknown or suspended terminals.
- `Product`: store SKU that can appear in try-on flows. It is isolated by `storeId` and `sku`.
- `ProductAsset`: product media such as images, videos, 3D models, certificates, and design drafts.
- `Gemstone`:原石档案 for natural and lab-grown gemstones. It can link to a product while keeping origin, certificate, formation, inclusion, and story fields separate.
- `TryOnSession`: the traceable mirror session. It starts with `anonymousId`, store, device, and status, then may receive `customerId`, scan time, authorization time, and completion state.
- `TryOnItem`: selected product details inside a try-on session, including duration and render config.
- `MediaAsset`: authorized media record. It stores object-storage keys and authorization state, but not raw unauthorized biometric streams.
- `CouponTemplate`: reusable coupon definition for free cleaning, gemstone blind box, amount off, or percent off campaigns.
- `Coupon`: issued coupon instance. It has a required unique `idempotencyKey` to prevent duplicate issue on repeated scans or retries.
- `EventLog`: append-only behavior audit record for try-on, scan, authorization, media, coupon, staff follow-up, and device heartbeat events.

## Key Relationships

- `Store` is the root tenant boundary for Phase 1 operational records.
- `Customer` has many `CustomerIdentity` records, allowing one profile to be bound to WeChat OpenID, UnionID, phone, and staff-created identities.
- `Device` belongs to one store and creates many `TryOnSession` records.
- `TryOnSession` belongs to a store and device, begins anonymously, and can later bind to one customer.
- `TryOnItem` links a try-on session to selected products.
- `MediaAsset` can link to a try-on session, try-on item, and customer after authorization.
- `Coupon` links a coupon template, optional customer, optional source try-on session, and store.
- `EventLog` can reference store, device, customer, anonymous ID, and try-on session so auditors can reconstruct the path without requiring every event to have a customer.

## Privacy And Security Constraints

- Raw camera streams and unapproved biometric material are not modeled for persistence. The schema only stores `MediaAsset` records after an app-controlled authorization state is known.
- `MediaAsset.storageKey` is a private object-storage key, not a public URL. Sharing should be mediated by the API with expiring URLs or signed policies.
- WeChat IDs, phone numbers, device secrets, and IPs must be hashed before storage when represented by `identityHash`, `phoneHash`, `secretHash`, or `lastSeenIpHash`.
- `CustomerIdentity` uniqueness is based on identity type plus hash to support deterministic customer merge and avoid duplicate profiles.
- Store-scoped entities carry `storeId` so white-box tests can verify multi-store isolation.
- `Coupon.idempotencyKey` is globally unique so scan retries, duplicate QR callbacks, or client resubmits do not issue duplicate coupons.
- `EventLog.payload` is JSON for structured audit context, but it must not contain raw phone numbers, raw WeChat identifiers, unredacted secrets, or biometric media.

## Deferred Models

The following entities are intentionally not modeled in Phase 1 schema yet:

- `Order` and `Payment`: needed when deposit/payment flows begin.
- `DesignPlan` and `DesignRule`: needed when parameterized custom design moves beyond documentation and placeholder flows.
- `AIConversation` and `AIMessage`: needed when the AI jewelry assistant stores conversations or recommendations.
- `JewelryBoxItem`: needed when post-purchase jewelry management becomes part of the validated loop.
- `ReferralCampaign` and `Reward`: needed for automated social referral and reward settlement.
- `Notification` and `MessageDelivery`: needed for production-grade WeChat and enterprise WeChat delivery tracking.

## White-Box Test Checklist

- Creating two `CustomerIdentity` rows with the same `type` and `identityHash` must fail.
- A `TryOnSession` must be valid with only `anonymousId`, `storeId`, and `deviceId`; `customerId` remains nullable until authorization.
- A suspended or retired `Device` can be detected by status before accepting terminal writes.
- A `MediaAsset` can represent local-only temporary media and later authorized private uploads through `authorizationStatus` transitions.
- Issuing a coupon with the same `idempotencyKey` twice must fail at the database level.
- `EventLog` must accept anonymous events and customer-bound events while always retaining `storeId` and `eventType`.

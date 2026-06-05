# Phase 1 Error Codes

## Response Shape

All API errors must use the same response shape:

```json
{
  "code": "TRY_ON_SESSION_NOT_FOUND",
  "message": "Try-on session was not found.",
  "traceId": "req_...",
  "details": {}
}
```

`details` is optional and must not contain raw secrets, raw phone numbers, raw WeChat identifiers, or biometric media.

## Authentication And Authorization

| Code | HTTP | Meaning |
|------|------|---------|
| `AUTH_MISSING_TOKEN` | 401 | Customer or staff bearer token is missing. |
| `AUTH_INVALID_TOKEN` | 401 | Bearer token is malformed, expired, or rejected. |
| `AUTH_FORBIDDEN` | 403 | Principal is authenticated but lacks permission. |
| `AUTH_STORE_SCOPE_VIOLATION` | 403 | Principal tried to access another store's data. |
| `AUTH_IDENTITY_CONFLICT` | 409 | Verified identity is already bound in a way that requires merge handling. |

## Device

| Code | HTTP | Meaning |
|------|------|---------|
| `DEVICE_BOOTSTRAP_INVALID` | 401 | Device registration bootstrap token is invalid. |
| `DEVICE_SIGNATURE_MISSING` | 401 | `X-Device-Id` or `X-Device-Signature` is missing. |
| `DEVICE_SIGNATURE_INVALID` | 401 | Device signature verification failed. |
| `DEVICE_NOT_FOUND` | 404 | Device ID is unknown. |
| `DEVICE_NOT_ACTIVE` | 403 | Device is pending, suspended, or retired. |
| `DEVICE_CLOCK_SKEW` | 400 | Device request timestamp is outside allowed skew. |

## Try-On Session

| Code | HTTP | Meaning |
|------|------|---------|
| `TRY_ON_SESSION_NOT_FOUND` | 404 | Try-on session does not exist in the authenticated store. |
| `TRY_ON_SESSION_EXPIRED` | 409 | Try-on session is too old for scan or authorization. |
| `TRY_ON_SESSION_ALREADY_BOUND` | 409 | Session is already bound to another customer. |
| `TRY_ON_INVALID_STATUS` | 409 | Requested transition is invalid for the current session status. |
| `TRY_ON_PRODUCT_NOT_FOUND` | 404 | Selected product is missing or inactive. |

## Media Authorization

| Code | HTTP | Meaning |
|------|------|---------|
| `MEDIA_AUTH_REQUIRED` | 403 | Customer authorization is required before private upload or sharing. |
| `MEDIA_SESSION_NOT_AUTHORIZED` | 403 | Customer does not own or cannot authorize the session media. |
| `MEDIA_INVALID_SCOPE` | 400 | Authorization scope is unsupported. |
| `MEDIA_EXPIRED` | 410 | Media authorization or temporary key has expired. |
| `MEDIA_STORAGE_KEY_INVALID` | 400 | Storage key does not match an allowed local/private key pattern. |

## Coupon

| Code | HTTP | Meaning |
|------|------|---------|
| `COUPON_TEMPLATE_NOT_FOUND` | 404 | Coupon template code is unknown or inactive. |
| `COUPON_ALREADY_CLAIMED` | 409 | Customer or session already claimed this coupon. |
| `COUPON_NOT_FOUND` | 404 | Coupon does not exist in the authenticated store. |
| `COUPON_EXPIRED` | 409 | Coupon is expired. |
| `COUPON_ALREADY_REDEEMED` | 409 | Coupon has already been redeemed. |
| `COUPON_INVALID_STATUS` | 409 | Coupon cannot transition to the requested status. |

## Idempotency

| Code | HTTP | Meaning |
|------|------|---------|
| `IDEMPOTENCY_KEY_MISSING` | 400 | A side-effect endpoint was called without `X-Idempotency-Key`. |
| `IDEMPOTENCY_REPLAY` | 200 | Same key and same payload replayed; existing result may be returned. |
| `IDEMPOTENCY_CONFLICT` | 409 | Same idempotency key was reused with a different payload or incompatible operation. |

## System

| Code | HTTP | Meaning |
|------|------|---------|
| `VALIDATION_FAILED` | 400 | Request body, query, or path validation failed. |
| `RESOURCE_NOT_FOUND` | 404 | Generic not found fallback. |
| `RATE_LIMITED` | 429 | Request rate exceeds policy. |
| `INTERNAL_ERROR` | 500 | Unexpected server error. |
| `SERVICE_UNAVAILABLE` | 503 | Dependency such as database, Redis, storage, or AI gateway is unavailable. |

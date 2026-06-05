# MediaModule

## Responsibility

MediaModule is the Phase 1 boundary for this domain in the modular monolith.

## Model Access

MediaAsset writes; TryOnSession, TryOnItem, Customer, and Store reads.

## Public Methods

- `authorizeMedia`
- `createPrivateStorageRecord`
- `expireMedia`
- `deleteMedia`

## Published Events

- `MEDIA_AUTHORIZED`
- `MEDIA_EXPIRED`
- `MEDIA_DELETED`

## Must Not

Must not accept raw unauthorized biometric streams, expose public object URLs, or modify customer identity.

## Current Status

Offline TypeScript boundary only. No NestJS decorators, database access, HTTP controller, or external service call is implemented here.

# CatalogModule

## Responsibility

CatalogModule is the Phase 1 boundary for this domain in the modular monolith.

## Model Access

Product, ProductAsset, and Gemstone writes in later catalog instructions; reads them for Phase 1 sync.

## Public Methods

- `getCatalogDelta`
- `assertTryOnProductActive`
- `getGemstoneStory`

## Published Events

- `CATALOG_SYNCED`

## Must Not

Must not create try-on sessions, issue coupons, or store customer media.

## Current Status

Offline TypeScript boundary only. No NestJS decorators, database access, HTTP controller, or external service call is implemented here.

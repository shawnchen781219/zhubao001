# EventModule

## Responsibility

EventModule is the Phase 1 service boundary for this domain in the modular monolith.

## Model Access

EventLog writes only.

## Public Methods

- `EventService.recordEvent`
- `EventService.assertPayloadSafe`

## Published Events

- None; records events from caller modules only.

## Must Not

Must not mutate domain state or store raw secrets, phone numbers, raw WeChat IDs, or biometric payloads.

## Current Status

`EventModule` declares and exports `EventService` only. It does not register a concrete `EventPort` adapter and is not a persistence activation point.

## Adapter Status

- `PrismaEventPort` adapter file exists (`event.prisma-adapter.ts`) and implements `EventPort`.
- It maps `EventLogInput` to Prisma `eventLog.create` data shape with field-level validation (`storeId`, `occurredAt`).
- It does NOT import or instantiate `PrismaClient`; it receives a minimal delegate interface.
- The adapter is NOT registered in `EventModule` or `AppModule`; no real database client is wired at runtime.

## Persistence Wiring Status

- `EventPersistenceModule` exists as a dormant production wiring module.
- It imports `PrismaRuntimeModule` and wires `PRISMA_CLIENT` to `EVENT_PORT -> PrismaEventPort`.
- It is NOT imported by `AppModule`, `DeviceModule`, or `EventModule`.
- Real database persistence is still disabled until a later explicit activation instruction imports this module into the application graph.

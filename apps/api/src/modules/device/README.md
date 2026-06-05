# DeviceModule

## Responsibility

DeviceModule is the Phase 1 boundary for this domain in the modular monolith.

## Model Access

Device writes; Store and StaffUser reads for provisioning; EventLog writes through EventModule.

## Public Methods

- `registerDevice`
- `acceptHeartbeat`
- `assertActiveDevice`
- `rotateDeviceCredential`

## Authentication Boundary

`DeviceAuthGuard` depends on `DeviceAuthPort` to look up the server-side
verification secret and current device status before it verifies request
signatures.

`PrismaDeviceAuthPort` exists as an unregistered persistence adapter. It maps a
minimal Prisma-shaped `device.findUnique` delegate result into the
`DeviceAuthPort` contract, but it is not registered in `DeviceModule` or
`AppModule`.

`DeviceAuthPersistenceModule` exists as a dormant wiring module. It imports
`PrismaRuntimeModule`, injects `PRISMA_CLIENT`, and exports `DEVICE_AUTH_PORT`
backed by `PrismaDeviceAuthPort`.

Production device authentication persistence is still disabled.
`DeviceAuthPersistenceModule` must not be imported by `AppModule`,
`DeviceModule`, or any runtime business module unless a later explicit
activation instruction says so.

`PrismaDevicePort` exists as an unregistered heartbeat persistence adapter. It
supports heartbeat timestamp updates and active-device assertions through a
minimal Prisma-shaped delegate, but `DEVICE_PORT` is still not registered in
`DeviceModule` or `AppModule`.

`DevicePersistenceModule` exists as a dormant wiring module. It imports
`PrismaRuntimeModule`, injects `PRISMA_CLIENT`, and exports `DEVICE_PORT` backed
by `PrismaDevicePort`.

`DevicePersistenceModule` must not be imported by `AppModule`, `DeviceModule`,
or any runtime business module unless a later explicit activation instruction
says so.

Device registration persistence remains explicitly unimplemented.

## Published Events

- `DEVICE_REGISTERED`
- `DEVICE_HEARTBEAT`
- `DEVICE_SUSPENDED`

## Must Not

Must not write products, coupons, customers, or try-on item selections directly.

## Current Status

Offline boundary only. NestJS module/controller declarations exist for tests and
future activation, but no concrete device persistence adapter is registered in
the application graph.

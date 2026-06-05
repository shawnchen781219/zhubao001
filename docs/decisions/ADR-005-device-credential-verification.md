# ADR-005: Device Credential Verification Boundary

## Status

Accepted

## Context

The `Device` model in `prisma/schema.prisma` currently defines a field named `secretHash`:

```prisma
model Device {
  // ...
  secretHash String
  // ...
}
```

Meanwhile, `DeviceAuthGuard` performs HMAC-SHA256 request signature verification. HMAC verification requires the server to possess the **same key material** that the client used to compute the signature, so the server can recompute the expected signature and compare.

A plain cryptographic hash (such as a bcrypt or Argon2 hash of a device secret) is intentionally **one-way**: it cannot be reversed to recover the original key material. If a future Prisma adapter were to return `secretHash` directly to `DeviceAuthGuard` and use it as the HMAC key, the verification would fail silently or produce incomprehensible errors. More dangerously, the naming collision could mislead implementers into believing that a password hash is an acceptable HMAC key.

## Decision

1. **HMAC verification requires verification key material, not a general hash.**
   - The server must store or derive a value that can be used as the HMAC-SHA256 key.
   - This value is conceptually distinct from a `secretHash` used for password-style verification.

2. **Phase 1 interim naming: `verificationSecret`.**
   - `DeviceAuthPort.findSecretByDeviceId` returns `{ verificationSecret: string; status: string }`.
   - The field name `verificationSecret` signals that this is the server-side key material for signature verification, not a general password hash.
   - Test stubs may continue to use raw test secrets, but production implementations must not treat `secretHash` as an HMAC key.

3. **Prisma `Device.secretHash` is not directly wired to `DeviceAuthGuard`.**
   - Before a Prisma adapter is implemented, an architecture decision must be made on how to store the actual verification key material:
     - Encrypt the signing key at rest and decrypt it in the adapter.
     - Use a KMS or hardware security module.
     - Add a separate Prisma field (e.g., `verificationKey` or `encryptedSigningKey`) with explicit encryption at rest.
   - Until that decision is made and a corresponding instruction is issued, `DeviceAuthGuard` remains connected to the `DeviceAuthPort` abstraction only.

## Consequences

- **Positive:** Prevents silent failures and semantic confusion between password hashes and HMAC keys.
- **Positive:** Forces an explicit security review before device credentials are persisted in the database.
- **Negative:** Requires a follow-up decision and migration before `DeviceAuthGuard` can use a real Prisma repository.

## Non-Goals

- This ADR does **not** modify `prisma/schema.prisma`.
- This ADR does **not** run `prisma migrate`.
- This ADR does **not** connect to a real database.
- This ADR does **not** implement a repository, PrismaClient call, Redis/object-storage/AI/WeChat SDK call, or business Controller.
- This ADR does **not** introduce encryption/KMS SDKs or external services.

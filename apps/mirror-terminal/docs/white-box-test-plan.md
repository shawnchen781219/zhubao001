# Mirror Terminal White-Box Test Plan

- Device boundary refuses to act without registered device ID and signature material.
- Renderer can represent product switching without real camera access.
- AR adapter is replaceable and does not leak SDK-specific types into renderer contracts.
- No code accesses real camera APIs in the offline skeleton.
- Sync queue preserves idempotency keys across offline replay.
- Sync queue can represent recovery upload without duplicate side effects.
- QR display boundary can represent session ID, device ID, store ID, and expiry without real UI.

# Sync Boundary

Offline event queue and recovery upload boundary.

Responsibilities:

- Queue try-on session, selected item, QR shown, scan, and media authorization events while offline.
- Replay queued events after connectivity recovery.
- Preserve idempotency keys for every replayed side effect.

Current status: no local database, no filesystem queue, no network request.

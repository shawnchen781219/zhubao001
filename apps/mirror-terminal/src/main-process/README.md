# Main Process Boundary

Offline Electron main-process boundary.

Responsibilities:

- Own future window lifecycle and device bootstrap wiring.
- Coordinate local filesystem/cache boundaries after Electron dependencies are installed.

Current status: no Electron process code, no native API call, no side effect.

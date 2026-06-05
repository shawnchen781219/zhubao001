# Try-On Media Page

Offline page boundary for viewing authorized try-on photos or videos.

Responsibilities:

- Request customer authorization before media upload or private viewing.
- Present future private media assets from `POST /try-on/sessions/{sessionId}/authorize-media`.
- Avoid exposing raw local camera frames or public object URLs.

Current status: no Taro page implementation, no UI, no network request.

# Miniapp White-Box Test Plan

- Scan entry accepts only signed/structured QR payloads and rejects missing session IDs.
- Scan entry can represent anonymous-to-authorized customer transition.
- Coupon wallet handles duplicate claim replay without showing multiple coupons.
- Coupon wallet displays expired/redeemed status distinctly when API later supplies it.
- Try-on media requires customer auth before authorization.
- Try-on media never handles raw biometric frames or public object URLs.
- Every future side-effect call carries `X-Idempotency-Key` and trace context.

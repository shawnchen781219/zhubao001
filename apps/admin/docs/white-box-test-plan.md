# Admin White-Box Test Plan

- All list pages require staff auth context.
- All list pages are store-scoped and reject cross-store data leakage.
- Customers page can represent sparse authorized customers.
- Try-on sessions page can represent anonymous and customer-bound sessions.
- Coupons page can represent duplicate claim, redeemed, expired, and voided states.
- Devices page can represent heartbeat age and suspended device state.
- No page performs real network requests in the offline skeleton.

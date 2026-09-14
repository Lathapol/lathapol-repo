# lab3 issue3 : authenticated requester workflow

Depends on reviewed PR #40 (merged into lab3-staging). Login and mandatory password change now replace the development selector. Reload checks the server session; logout and expired sessions return to login. API requests include the cookie and CSRF token, and no longer send requester IDs as identity. Staff/admin see their role without requester navigation; their operational screens follow in issues 4–6.

Requester creation, listing, detail, filters, pagination, attachment download and soft removal remain available. All eight status filters and the missing category filter are wired. Create Ticket now uploads selected files after creating the ticket; failures clearly identify the files and let the user open the existing ticket instead of creating a duplicate. Concurrent upload counting is serialized, foreign uploads are rejected before file storage, malformed IDs/filters return 400, and ticket-number collisions retry. Staff/admin can read ticket details and attachments, but requester mutations remain role restricted.

## Verification — 2026-09-14

- Backend: 10 suites, 45 tests passed; TypeScript build passed.
- Client: 4 files, 13 tests passed; TypeScript and Vite production builds passed.
- Browser: 2 Playwright flows passed, desktop 1440×1000 and mobile 390×844, using isolated `toktickit_lab3_test`.
- Flow: login → first password change → create with attachment → detail/download/remove → search → reload → logout → reload. Mobile page overflow assertion passed. Login and requester-list screenshots inspected.
- Negative API coverage includes foreign detail/upload, spoofed identity, invalid filters and six simultaneous uploads yielding exactly five accepted files.

Run ordinary server/client tests as in issue-02.md. For browser tests, use the test database in ignored `server/.env`, start the server with `PORT=4103` and `APP_ORIGIN=http://localhost:5183`, and start Vite with `VITE_API_URL=http://localhost:4103` on port 5183. From the repository root run `npx playwright test --config playwright.lab3.config.ts` (Microsoft Edge installed). Browser tests create disposable local accounts and ticket fixtures; their credentials are test-only.

Evidence: `artifacts/lab-03/issue3-{desktop,mobile}-{login,tickets}.png`.

Peer review of issue 3 is pending. Public comments, apparent-resolution and staff/admin operational screens remain in subsequent issues. No full Lab 3 completion is claimed.

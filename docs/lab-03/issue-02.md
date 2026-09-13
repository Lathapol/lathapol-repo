# Issue 2: authentication foundation

Backend foundation for #29. The login UI and full requester integration follow in #30; this staging backend now requires a session, so the old selector UI cannot call protected APIs yet.

## Local setup

From `server`, install dependencies with `npm ci`. Set `DATABASE_URL` in ignored `.env` to your local PostgreSQL database. Back it up before applying `npx prisma migrate deploy`, then run `npx prisma generate`.

Set `LAB3_INITIAL_PASSWORD` locally to a private 12–128 character initial password and run `npm run seed`. Remove the variable afterward. This initializes only missing password hashes; it does not replace existing passwords, roles or account settings. Local staff email is `staff@example.com`, admin is `admin@example.com`; requester emails remain from Lab 2. Everyone initialized must change their initial password before using tickets. No initial password is committed.

Seed includes four active/one inactive requesters, three active/one inactive staff, one admin and 24 varied demonstration tickets numbered `TKT-2000-000001` through `TKT-2000-000024`, with public/internal example entries. Existing matching rows remain untouched.

Run `npm run build` and `npm start` from `server`. `APP_ORIGIN` defaults to `http://localhost:5173`; set the actual browser origin when different. `UPLOAD_DIRECTORY` defaults to `server/uploads` when launched from `server`. Production cookies require HTTPS.

## Validation

Tests require a separate database named `toktickit_lab3_test`; the setup guard refuses other database names. Restore a Lab 2 backup there or apply migrations and seed it, then point the local test environment at that database. Run `npm test -- --runInBand`. Legacy tests use authenticated session fixtures; auth tests exercise real login and password change.

Verified the additive migration on a restored Lab 2 database: all original columns and values preserved for 5 requesters, 54 tickets and 9 attachment records. IT priority backfill matches requested priority. Two seed runs produced identical user, ticket and entry rows, including password hashes. The development database was read only for comparison.

Auth coverage includes invalid login, hashed session tokens, mandatory initial-password restriction, CSRF/origin checks, password rotation, revocation of other sessions, logout, expiration, deactivation, current role checks, rate limiting, malformed JSON and concurrent password change. Attachment regression exposed a missing uploads directory; upload/download now share a created directory. Jest only discovers source tests, avoiding duplicate compiled tests after a build.

Remaining work: frontend login/password UI, broader requester validation and attachment concurrency in #30; staff/admin routes in subsequent issues. Peer review of this implementation is pending.

Final local result: 9 suites / 33 tests passed; TypeScript build passed (2026-09-13).

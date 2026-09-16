# Lab 3 integrated verification

Tested application commit: `23ee5d2e60824cf735bc333dbcf1068d356c6895` on `codex/lab3-verification`, 2026-09-15. Subsequent evidence/documentation commits do not change the tested application. These are feature-branch results, not final-main results.

## Results

PASS: 13 server suites / 160 tests; 7 client files / 26 tests; 15 browser scenarios; server TypeScript, client TypeScript and Vite builds. Migration preservation and repeated seed PASS. Full outputs are linked below.

## Reproduce

Use Node.js and local PostgreSQL. Install root, server and client dependencies. Point ignored server/.env at the isolated `toktickit_lab3_test` database with migrated/seeded Lab 2 fixtures; the Jest guard refuses other database names. Never run tests against development data. Start the API from server with PORT=4103 and APP_ORIGIN=http://localhost:5183. Start Vite from client on port 5183 with VITE_API_URL=http://localhost:4103. Install Microsoft Edge for the configured Playwright channel.

From the repository root run `node scripts/verify-lab3.cjs`. It runs these commands sequentially and stops on failure:

| Directory | Command |
|---|---|
| server | `node node_modules/jest/bin/jest.js --runInBand --testTimeout=15000` |
| server | `node node_modules/typescript/bin/tsc` |
| client | `node node_modules/vitest/vitest.mjs run` |
| client | `node node_modules/typescript/bin/tsc -b` |
| client | `node node_modules/vite/bin/vite.js build` |
| root | `node node_modules/@playwright/test/cli.js test --config playwright.lab3.config.ts` |

[Machine-readable report](../../artifacts/lab-03/verification/report.json) records the exact tested commit, commands and exit statuses. Its sibling .log files contain actual outputs and totals. The 15-second Jest deadline accommodates scrypt tests on this machine without weakening assertions.

## Executed coverage

| Area / acceptance criteria | Actual test files |
|---|---|
| Password hashing/policy (AC01–02) | server/tests/lab-03/security.test.ts |
| Login, change gate, sessions, origin/CSRF, expiry, throttling (AC01–03) | server/tests/lab-03/auth.api.test.ts |
| Spoofed requester IDs, foreign reads/uploads, concurrent attachment limit (AC04–05) | server/tests/lab-03/requester.api.test.ts |
| Lab 1/2 regression, create/list/search/filter/pagination/attachments (AC04–05) | server/tests/lab-01/*.test.ts; server/tests/lab-02/*.test.ts |
| Queue permissions, combined filters, stable sorting, pagination (AC06) | server/tests/staff-queue.test.ts |
| Ownership, every transition pair, confirmation, concurrent claims/updates, signal (AC07–08,10) | server/tests/workflow.test.ts |
| Public/private roles, boundaries, author/time, append-only methods (AC09) | server/tests/workflow.test.ts |
| Account CRUD scope, safe DTO, normalized duplicates, resets, self/last-admin races (AC11) | server/tests/users.test.ts |
| Initial password/session UI and requester components (AC02,05,13) | client/tests/lab-03/Auth.test.tsx; client/tests/lab-02/*.test.tsx |
| Queue feedback and filtering (AC06,13) | client/tests/lab-03/TicketQueue.test.tsx |
| Workflow confirmation/conflicts, privacy, safe text and signal (AC07,09–10,13) | client/tests/lab-03/TicketActivity.test.tsx |
| Account drafts, validation/errors, confirmations and password clearing (AC11,13) | client/tests/lab-03/Users.test.tsx |
| Real login/change/create/upload/download/remove/filter/reload/logout; keyboard Open (AC01–05,14–15) | e2e/lab-03/requester.spec.ts |
| Staff/admin queue and read-only attachment controls (AC06,14–15) | e2e/lab-03/queue.spec.ts |
| Staff claim/status/public/private posts, requester reply/signal, reopen, admin read-only (AC07–10,14–15) | e2e/lab-03/workflow.spec.ts |
| Admin create/edit/deactivate/reactivate/reset, mandatory new password (AC11,14–15) | e2e/lab-03/users.spec.ts |

## Migration and repeated seed (AC12)

Run `node scripts/verify-migration.cjs <Lab2-backup.dump> <PostgreSQL-bin-directory>`. It creates a new local evidence database, restores the supplied backup, compares every original column before/after the additive migration, checks IT priority backfill, seeds twice and compares complete rows. It never migrates the configured source database. A generated initial password stays only in the child process environment.

[Migration report](../../artifacts/lab-03/issue7-migration.json): all original rows/columns preserved for 5 users, 54 tickets, 9 attachment records, 4 categories and 7 related systems. The before/after digests match; zero priority mismatches. After seeding: 10 users, 78 tickets, 9 attachments, 48 entries. Both seed digests match, including stored password hashes. Attachment metadata and stored filenames are covered; physical-file download is exercised separately by requester E2E. The disposable evidence database is retained locally.

## Responsive and accessibility evidence (AC13–14)

Playwright now runs all five scenarios at desktop 1440x1000, tablet 820x1180 and mobile 390x844. Screenshots use `artifacts/lab-03/issue7-<viewport>-...png`:

- login, password-change, create-ticket, tickets: requester workflow;
- IT_STAFF / ADMINISTRATOR: queue;
- staff / requester / admin: ticket detail and public/private sections;
- users / edit: account list and editor.

The visual review covers readable text/status badges, editable versus read-only controls, explicit private-note labeling, responsive cards, form wrapping and page overflow. Keyboard review identified mouse-only requester rows and sort headers; these now contain native buttons. Attachment upload/removal inputs now have accessible names. Focus outlines and an active administrator navigation state are explicit. Queue and requester Open actions are exercised with keyboard focus/Enter. Negative API/component tests cover validation, permission, conflict and failure feedback; screenshots document successful screens and password-reset feedback.

Peer approval and final-main verification remain required before release. The student's personal reflection is not generated as evidence.

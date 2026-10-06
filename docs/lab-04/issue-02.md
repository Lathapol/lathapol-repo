# lab4 issue2 : Actions Taken foundation

Depends on #49 (contract, PR #56). Adds the ActionTaken table with an additive migration, an idempotent seed, and the list/create/edit APIs. UI is Issue 3, the resolution gate is Issue 4.

## What changed

- `ActionTaken` model and migration `20260924000000_lab4_actions_taken`: additive SQL only, plus indexes `(ticketId, createdAt, id)`, `(performedById, createdAt)`, unique `(ticketId, requestKey)`, `Ticket(updatedAt)` and `Ticket(ownerId, currentStatus)`. Rollback is `DROP TABLE "ActionTaken"` plus the two Ticket indexes (recorded in the migration file).
- `GET /api/tickets/:id/actions` (owning Requester, Staff, Admin), `POST /api/tickets/:id/actions` and `PATCH /api/actions/:id` (Staff, Admin). Performer and date are set by the server; unknown fields such as `performedById` or `createdAt` are rejected with 400.
- `requestKey` (UUID) makes repeats and concurrent double-submits create one row; the ticket row lock serializes them. Stale action `version` returns 409 `ACTION_CONFLICT`; CLOSED/CANCELLED tickets return 409 `TICKET_TERMINAL`; requesters get 403 on writes and 404 on foreign tickets.
- Creating or editing an action refreshes `Ticket.updatedAt` (ticket `version` unchanged) so recent-activity dashboards reflect the work.
- Seed: Lab 3 fixture tickets now have zero, one and three actions (three different performers on one ticket, one follow-up example) and a requester with no tickets, all upserted on fixed keys so reruns change nothing.

## Verification — 2026-09-24

- Backend: 16 suites, 179 tests passed against isolated `toktickit_lab4_test` (16 new tests in `server/tests/lab-04/`); TypeScript build passed. The two Lab 3 auth/test database guards now name the Lab 4 test database.
- Migration evidence `artifacts/lab-04/issue2-migration.json`: 26 users, 164 tickets, 38 attachments, 4 categories, 7 related systems, 48 entries and 1 session copied from the Lab 3 test database. Before/after digests are identical, migration created 0 actions for legacy tickets, two seed runs give identical digests (24 actions: 152 tickets zero, 6 one, 6 many), and a rollback on a fresh copy restores the exact Lab 3 digest.

Reproduce: create `toktickit_lab4_test` from the Lab 3 test database, run `npx prisma migrate deploy`, then from `server` run `node node_modules/jest/bin/jest.js --runInBand --testTimeout=15000` with `DATABASE_URL` pointing at it. Run `node scripts/verify-lab4-migration.cjs` from the repository root for the migration report.

Peer review of issue 2 is pending. No full Lab 4 completion is claimed.

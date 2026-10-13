# lab4 issue4 : Ticket workflow and resolution gate

Depends on #50 (Actions Taken API, PR #57) and #51 (Actions Taken UI, PR #58). Finalizes the ticket status workflow.

## What changed

- **Resolution gate (BR-10):** moving a ticket to RESOLVED needs at least one Action Taken on that ticket, from any staff member. The check runs in the same transaction as the status update, under the ticket row lock, so a direct API call or a concurrent request cannot bypass it. Without an action the API returns 409 `ACTION_REQUIRED` and changes nothing. The gate applies only to RESOLVED; other moves, edits and cancellation work without actions.
- **Final transition matrix:** unchanged destinations from Lab 3 (specification 5.2), still enforced by the backend for IT Staff only; requesters and administrators get 403. CLOSED and CANCELLED have no exits; RESOLVED, CLOSED and CANCELLED still need confirmation; stale versions return 409 `TICKET_CONFLICT`. Error codes are now carried per conflict instead of always `TICKET_CONFLICT`.
- **Requester signal:** "This appears resolved" stays advisory. It never changes the status and does not skip the gate.
- **UI:** the status control lists only permitted next statuses (none beyond "Keep" for closed/cancelled). Choosing Resolved on a ticket with no actions shows "Log an action first" and disables Save; the server error is still shown if it rejects. `ActionsTaken` reports its count to the workflow card. A successful save reloads the ticket, so the summary status badge and workflow card show the new status.
- **Lab 3 tests updated for the new rule:** the Lab 3 server workflow fixture and client `TicketActivity` mock now give the ticket one action, and the Lab 3 workflow browser test logs an action before resolving. The Lab 3 e2e database guards accept the Lab 4 test database and `DATABASE_URL`.

## Verification — 2026-09-27

- Backend: 17 suites, 251 tests passed against isolated `toktickit_lab4_test`; every from/to status pair is tested in `server/tests/lab-04/ticket-workflow.api.test.ts`, plus the gate, roles, unconfirmed/stale updates, terminal statuses, advisory signal and concurrent resolve. TypeScript build passed.
- Client: 9 files, 47 tests passed (12 new in `client/tests/lab-04/TicketWorkflow.test.tsx`); `tsc -b` and Vite build passed.
- Browser: `e2e/lab-04/ticket-resolution.spec.ts` passed at 1440x1000, 820x1180 and 390x844; Lab 4 actions spec still passes; the full Lab 3 browser suite passes (15 scenarios) after the gate change. Screenshots inspected: `artifacts/lab-04/screenshots/ticket-workflow/{desktop,tablet,mobile}-{gate-blocked,resolved}.png`.

Run the browser tests as in issue-03.md, then `npx playwright test --config playwright.lab4.config.ts` and `--config playwright.lab3.config.ts`.

Peer review: approved by Kittakorn-P and merged as PR #59 (see reviewer.md). Dashboards (issue 5) and final hardening (issue 6) are not part of this change.

# Lab 4 test plan and traceability

Written alongside the specification and before implementation. Final status is filled in as each issue merges; "Planned" means not yet run. Tests use the isolated `toktickit_lab4_test` database (the Jest guard refuses other names).

| Test ID | Type | AC | What it tests | Expected | Automated test file | Final |
|---|---|---|---|---|---|---|
| UNIT-01 | Unit | AC-02 | Action validation (lengths, follow-up rule, unknown keys) | Rejects invalid, trims valid | server/tests/lab-04/actions-validation.test.ts | Planned |
| UNIT-02 | Unit | AC-08,09 | Transition matrix + gate helper | Every from/to pair per §5.2 | server/tests/lab-04/ticket-workflow.api.test.ts | Planned |
| API-01 | API | AC-01 | Create Action | 201, correct ticket, performer, server date | server/tests/lab-04/actions-taken.api.test.ts | Planned |
| API-02 | API | AC-02 | Invalid bodies | 400 safe errors | server/tests/lab-04/actions-taken.api.test.ts | Planned |
| API-03 | API | AC-03 | Edit + stale version | 200 then 409, no change | server/tests/lab-04/actions-taken.api.test.ts | Planned |
| API-04 | API | AC-04 | Non-owner staff logs action | performer = that staff | server/tests/lab-04/actions-taken.api.test.ts | Planned |
| API-05 | API | AC-05 | Requester write denied, foreign read 404 | 403 / 404 | server/tests/lab-04/actions-taken.api.test.ts | Planned |
| API-06 | API | AC-06 | Terminal Ticket rejects actions | 409 TICKET_TERMINAL | server/tests/lab-04/actions-taken.api.test.ts | Planned |
| API-07 | API | AC-07 | Duplicate requestKey, concurrent | One row | server/tests/lab-04/actions-taken.api.test.ts | Planned |
| API-08 | API | AC-08 | Resolve without / with action | 409 ACTION_REQUIRED / 200 | server/tests/lab-04/ticket-workflow.api.test.ts | Planned |
| API-09 | API | AC-09 | All transitions, roles, unconfirmed, stale, advisory signal | Per matrix | server/tests/lab-04/ticket-workflow.api.test.ts | Planned |
| API-10 | API | AC-10 | Requester dashboard isolation | Only own data | server/tests/lab-04/requester-dashboard.api.test.ts | Planned |
| API-11 | API | AC-11 | Staff/Admin dashboard vs direct DB counts; role denials | Equal; 403/401 | server/tests/lab-04/staff-dashboard.api.test.ts | Planned |
| API-12 | API | AC-12 | Count equals drill-down totalCount | Equal | server/tests/lab-04/staff-dashboard.api.test.ts; server/tests/lab-04/requester-dashboard.api.test.ts | Planned |
| API-13 | API | AC-13 | Empty dataset | zeros/empty lists | server/tests/lab-04/requester-dashboard.api.test.ts | Planned |
| MIG-01 | Migration | AC-16 | Lab 3 backup preserved, seed twice identical, rollback | Digests match | scripts/verify-lab4-migration.cjs; server/tests/lab-04/seed.api.test.ts | Planned |
| COMP-01 | UI component | AC-14 | Actions list, create/edit mode, read-only for Requester, validation, draft kept | Pass | client/tests/lab-04/ActionsTaken.test.tsx | Planned |
| COMP-02 | UI component | AC-08,14 | Status controls show allowed transitions, gate hint, confirm dialog | Pass | client/tests/lab-04/TicketWorkflow.test.tsx | Planned |
| COMP-03 | UI component | AC-15 | Staff dashboard states + links | Pass | client/tests/lab-04/StaffDashboard.test.tsx | Planned |
| COMP-04 | UI component | AC-10,15 | Requester dashboard states + links | Pass | client/tests/lab-04/RequesterDashboard.test.tsx | Planned |
| E2E-01 | E2E | AC-01,03,04,14 | Staff creates/edits actions on a ticket, multiple performers | Pass | e2e/lab-04/actions-taken-flow.spec.ts | Planned |
| E2E-02 | E2E | AC-08,09 | Resolution gate and close flow | Pass | e2e/lab-04/ticket-resolution.spec.ts | Planned |
| E2E-03 | E2E | AC-11,12,15 | Dashboards + drill-down, all roles | Pass | e2e/lab-04/dashboards.spec.ts | Planned |
| RESP-01 | UI style/responsive | AC-17 | Screens at 1440/820/390: no overflow/clipping, focus visible | Pass | e2e/lab-04/dashboards.spec.ts; e2e/lab-04/actions-taken-flow.spec.ts | Planned |
| A11Y-01 | Accessibility | AC-17 | Labels, aria-current, dialog focus, keyboard-only flow | Pass | e2e/lab-04/actions-taken-flow.spec.ts | Planned |
| PERF-01 | Performance smoke | AC-11 | Staff dashboard on seeded data responds under 1 s | Pass | server/tests/lab-04/staff-dashboard.api.test.ts | Planned |
| REG-01 | Regression | AC-18 | Labs 1–3 server, client and E2E suites | All pass | server/tests/lab-01..03; client/tests/lab-01..03; e2e/lab-02..03 | Planned |

Traceability rule: each of AC-01..AC-18 appears in at least one row above (AC-01..18 covered by rows API-01..13, MIG-01, COMP-01..04, E2E-01..03, RESP-01, A11Y-01, REG-01).

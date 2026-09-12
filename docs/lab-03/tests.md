# Lab 3 test plan and traceability

Prepared before implementation. Initial status for every row: NOT RUN. Planned paths below become actual paths when implemented; do not mark Pass without recorded execution. Existing Lab 2 tests must evolve from the removed selector to real login; their business scenarios remain.

| Test ID | Type | AC | Coverage / expected result | Planned file |
|---|---|---|---|---|
| UNIT-01 | Unit/security | 01,02 | Salted password verification, wrong passwords, boundaries and transition policy | server/tests/lab-03/security.test.ts |
| API-01 | API/integration | 01,02,03 | Valid/wrong/inactive login, limited initial session, confirmation/reuse, logout/expiry/reset, safe DTO, CSRF/origin, throttling | server/tests/lab-03/auth.api.test.ts |
| API-02 | Authorization | 03,04,09,11 | Direct forbidden endpoints, requester spoofing, cross-owner ticket/attachment, private note exclusion, role/activation changes | server/tests/lab-03/authorization.api.test.ts |
| API-03 | API | 06 | Search, combined filters, priority sort, pagination boundaries, invalid query | server/tests/lab-03/staff-queue.api.test.ts |
| API-04 | API | 07,08,10 | Claim conflict, assignee validity, stale writes, every transition, confirmation, requester signal | server/tests/lab-03/staff-ticket-detail.api.test.ts |
| API-05 | API/security | 09 | Public/private role access, blank/length boundaries, author/time, append-only methods | server/tests/lab-03/comments-notes.api.test.ts |
| API-06 | API/concurrency | 11 | User list/search/filter/create/edit/reset, case duplicate, invalid role, self/last-admin protections including races | server/tests/lab-03/users-admin.api.test.ts |
| REG-01 | Regression/API | 04,05 | Lab 2 create/read/list/query and attachment lifecycle now authenticated | server/tests/lab-02/*.test.ts |
| MIG-01 | Migration/regression | 12 | Apply migration to existing Lab 2 fixture, unchanged IDs/ownership/files and priority backfill, repeat seed | server/tests/lab-03/migration.test.ts |
| UI-01 | Component | 02,13 | Login validation/busy/failure, initial password validation and success, role shell | client/tests/lab-03/Login.test.tsx; ChangePassword.test.tsx |
| UI-02 | Component | 06,13 | Queue search/filter/page requests, empty/no-results/failure | client/tests/lab-03/StaffTicketQueue.test.tsx |
| UI-03 | Component | 07,09,10,13 | Detail operational controls/confirm/conflict, private composer vs public, requester signal | client/tests/lab-03/StaffTicketDetail.test.tsx |
| UI-04 | Component | 11,13 | User list/create/edit/reset/errors, password clearing and safety controls | client/tests/lab-03/UserManagement.test.tsx |
| E2E-01 | End-to-end | 01,02,03,13,15 | Actual login/first-change/logout and blocked reuse | e2e/lab-03/authentication.spec.ts |
| E2E-02 | End-to-end/regression | 04,05,07,08,09,10,15 | Requester creates with attachment; staff claims/comments/notes/resolves; requester privacy and signal | e2e/lab-03/staff-ticket-flow.spec.ts |
| E2E-03 | End-to-end | 11,15 | Admin creates/edits/resets account; login requires new password | e2e/lab-03/user-administration.spec.ts |
| VIS-01 | UI style/responsive | 14 | 3 viewport screenshots, no page overflow, native focus/labels, visual checklist | e2e/lab-03/responsive-screenshots.spec.ts |

Use an isolated local PostgreSQL database for tests, never reset the existing development database. API tests use real Prisma/Express and uniquely named fixture users; client tests stub API responses for UI edge cases. TDD: write policy/security expectations first, observe failures before implementation, record actual results. Integration and E2E use no auth bypass.

Final evidence must include commands, date, branch/commit, totals and output paths. Feature-branch results are not final-main results. Peer approvals and personal reflection must be provided by the real participants.

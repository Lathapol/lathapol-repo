# Lab 2 Test Plan and Results

## 1. Test Strategy
Tests are planned before implementation per Test-Driven Development. Coverage spans
unit, API/integration, UI component, responsive/visual, and end-to-end levels. Every
Acceptance Criterion in specification.md maps to at least one automated test. Tests
are written to fail first against the planned behavior, then implementation makes
them pass.

## 2. Planned Tests

| Test ID | Type | Requirement/AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| UNIT-01 | Unit | BR-01 | Ticket Number generator produces a unique, correctly formatted number | Matches expected format (e.g. TKT-YYYY-NNNNNN) | server/src/ticketNumber.ts (covered via create-ticket.api.test.ts) | Pass |
| API-01 | API | AC-01 | POST /api/tickets with valid data | 201, Ticket saved, ticketNumber returned | server/tests/lab-02/create-ticket.api.test.ts | Pass |
| API-02 | API | AC-04 | POST /api/tickets with empty summary | 400, validation error, no Ticket created | server/tests/lab-02/create-ticket.api.test.ts | Pass |
| API-03 | API | AC-05 | POST /api/tickets with empty description | 400, validation error, no Ticket created | server/tests/lab-02/create-ticket.api.test.ts | Pass |
| API-04 | API | AC-03 | GET /api/tickets/:id with mismatched requesterId | 403/404, no Ticket data returned | server/tests/lab-02/attachments.api.test.ts | Pass |
| API-05 | API | AC-12 | GET /api/tickets?search= matches Summary | Only matching Tickets returned | server/tests/lab-02/my-tickets.api.test.ts | Pass |
| API-06 | API | AC-13 | GET /api/tickets with pagination | Correct page slice and meta returned | server/tests/lab-02/my-tickets.api.test.ts | Pass |
| API-07 | API | AC-14 | GET /api/tickets for two different requesterIds | Each Requester only sees their own Tickets | server/tests/lab-02/my-tickets.api.test.ts | Pass |
| API-08 | API | AC-06 | POST attachment more than 5MB | 400, upload rejected | server/tests/lab-02/attachments.api.test.ts | Pass |
| API-09 | API | AC-07 | POST attachment with unsupported type | 400, upload rejected | server/tests/lab-02/attachments.api.test.ts | Pass |
| API-10 | API | AC-08 | POST 6th attachment on a Ticket with 5 active | 400, upload rejected | server/tests/lab-02/attachments.api.test.ts | Pass |
| API-11 | API | AC-17 | PATCH attachment remove with reason | 200, isRemoved true, removedReason stored | server/tests/lab-02/attachments.api.test.ts | Pass |
| API-12 | API | AC-16 | GET attachment download (active) | 200, file bytes returned | server/tests/lab-02/attachments.api.test.ts | Pass |
| API-13 | API | AC-17 | GET download on a removed attachment | 410 Gone, file not returned | server/tests/lab-02/attachments.api.test.ts | Pass |
| API-14 | API | AC-18 | GET attachment metadata owned by another Requester | 403/404, no data returned | server/tests/lab-02/attachments.api.test.ts | Pass |
| UI-01 | UI | AC-04, AC-05 | Submit Create Ticket with empty required fields | Field-level messages shown, API not called | client/tests/lab-02/CreateTicket.test.tsx | Pass |
| UI-02 | UI | AC-01 | Submit valid Create Ticket form | Success state shows returned Ticket Number | client/tests/lab-02/CreateTicket.test.tsx | Pass |
| UI-03 | UI | AC-09 | Simulate API failure on submit | Safe error shown, field values preserved | client/tests/lab-02/CreateTicket.test.tsx | Pass |
| UI-05 | UI | AC-10 | Requester with zero Tickets opens My Tickets | Empty-state message shown | client/tests/lab-02/MyTickets.test.tsx | Pass |
| UI-06 | UI | AC-11 | Filters applied matching no Tickets | No-results message shown | client/tests/lab-02/MyTickets.test.tsx | Pass |
| UI-08 | UI | AC-15 | Open Ticket Detail | All header fields render as read-only | client/tests/lab-02/RequesterTicketDetail.test.tsx | Pass |
| UI-09 | UI | AC-17 | Removed attachment shown without Download control | Attachment shown as removed, download disabled | client/tests/lab-02/RequesterTicketDetail.test.tsx | Pass |
| UI-10 | UI | AC-19 | Ticket cannot be loaded | Safe error state shown | client/tests/lab-02/RequesterTicketDetail.test.tsx | Pass |
| E2E-01 | E2E | AC-01, AC-14 | Full flow: select Requester, create Ticket, find it in My Tickets | Confirmation shows official number, Ticket found in list | e2e/lab-02/requester-ticket-flow.spec.ts | Pass |
| E2E-02 | E2E | AC-14 | Switch Requester | My Tickets reloads for new Requester | e2e/lab-02/requester-ticket-flow.spec.ts | Pass |
| RESP-01 | Responsive | AC-20 | Create Ticket, My Tickets, Ticket Detail at desktop/tablet/mobile | No clipping, correct layout at each breakpoint | e2e/lab-02/responsive-screenshots.spec.ts (screenshots in artifacts/lab-02/screenshots/) | Pass |

## 3. Acceptance-Criterion Traceability

| AC | Covered By |
|---|---|
| AC-01 | API-01, UI-02, E2E-01 |
| AC-03 | API-04 |
| AC-04 | API-02, UI-01 |
| AC-05 | API-03, UI-01 |
| AC-06 | API-08 |
| AC-07 | API-09 |
| AC-08 | API-10 |
| AC-09 | UI-03 |
| AC-10 | UI-05 |
| AC-11 | UI-06 |
| AC-12 | API-05 |
| AC-13 | API-06 |
| AC-14 | API-07, E2E-01, E2E-02 |
| AC-15 | UI-08 |
| AC-16 | API-12 |
| AC-17 | API-11, API-13, UI-09 |
| AC-18 | API-14 |
| AC-19 | UI-10 |
| AC-20 | RESP-01 |

## 4. Responsive and Visual Checklist
See docs/lab-02/ui-spec.md Section 16. Screenshot evidence captured at desktop
(1280x800), tablet (850x1000), and mobile (375x800) for Create Ticket, My Tickets,
and Ticket Detail, saved under artifacts/lab-02/screenshots/.

## 5. Test Commands

Server:
cd server
npm test

Client:
cd client
npm test

End-to-End (requires both dev servers running):
npx playwright test

## 6. Final Results

All planned tests pass on the final main branch.

Server (Jest + Supertest):
Test Suites: 7 passed, 7 total
Tests:       21 passed, 21 total

Client (Vitest):
Test Files  3 passed (3)
     Tests  11 passed (11)

End-to-End (Playwright):
5 passed

## 7. Known Limitations or Deferred Tests
An early version of the Ticket Number generator had a race condition under
concurrent test execution (count-based sequencing). This was fixed by deriving
the next number from the last-issued ticket number for the year, with a
retry-on-conflict loop guarding against duplicate-key errors. No tests were
deferred; all planned scenarios have passing automated coverage.

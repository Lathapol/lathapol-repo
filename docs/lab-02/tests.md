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
| UNIT-01 | Unit | BR-01 | Ticket Number generator produces a unique, correctly formatted number | Matches expected format (e.g. TKT-YYYY-NNNNNN) | server/tests/lab-02/ticketNumber.unit.test.ts | Pending |
| API-01 | API | AC-01 | POST /api/tickets with valid data | 201, Ticket saved, ticketNumber returned | server/tests/lab-02/create-ticket.api.test.ts | Pending |
| API-02 | API | AC-04 | POST /api/tickets with empty summary | 400, validation error, no Ticket created | server/tests/lab-02/create-ticket.api.test.ts | Pending |
| API-03 | API | AC-05 | POST /api/tickets with empty description | 400, validation error, no Ticket created | server/tests/lab-02/create-ticket.api.test.ts | Pending |
| API-04 | API | AC-03 | GET /api/tickets/:id with mismatched requesterId | 403/404, no Ticket data returned | server/tests/lab-02/ticket-detail.api.test.ts | Pending |
| API-05 | API | AC-12 | GET /api/tickets?search= matches Summary | Only matching Tickets returned | server/tests/lab-02/my-tickets.api.test.ts | Pending |
| API-06 | API | AC-13 | GET /api/tickets with pagination | Correct page slice and meta returned | server/tests/lab-02/my-tickets.api.test.ts | Pending |
| API-07 | API | AC-14 | GET /api/tickets for two different requesterIds | Each Requester only sees their own Tickets | server/tests/lab-02/my-tickets.api.test.ts | Pending |
| API-08 | API | AC-06 | POST attachment > 5MB | 400, upload rejected | server/tests/lab-02/attachments.api.test.ts | Pending |
| API-09 | API | AC-07 | POST attachment with unsupported type | 400, upload rejected | server/tests/lab-02/attachments.api.test.ts | Pending |
| API-10 | API | AC-08 | POST 6th attachment on a Ticket with 5 active | 400, upload rejected | server/tests/lab-02/attachments.api.test.ts | Pending |
| API-11 | API | AC-17 | PATCH attachment remove with reason | 200, isRemoved true, removedReason stored | server/tests/lab-02/attachments.api.test.ts | Pending |
| API-12 | API | AC-16 | GET attachment download (active) | 200, file bytes returned | server/tests/lab-02/attachments.api.test.ts | Pending |
| API-13 | API | AC-17 | GET download on a removed attachment | 410 Gone, file not returned | server/tests/lab-02/attachments.api.test.ts | Pending |
| API-14 | API | AC-18 | GET attachment metadata owned by another Requester | 403/404, no data returned | server/tests/lab-02/attachments.api.test.ts | Pending |
| UI-01 | UI | AC-04, AC-05 | Submit Create Ticket with empty required fields | Field-level messages shown, API not called | client/src/.../CreateTicket.test.tsx | Pending |
| UI-02 | UI | AC-01 | Submit valid Create Ticket form | Success state shows returned Ticket Number | client/src/.../CreateTicket.test.tsx | Pending |
| UI-03 | UI | AC-09 | Simulate API failure on submit | Safe error shown, field values preserved | client/src/.../CreateTicket.test.tsx | Pending |
| UI-04 | UI | AC-06, AC-07 | Select invalid file (size/type) | Inline attachment error shown, not uploaded | client/src/.../CreateTicket.test.tsx | Pending |
| UI-05 | UI | AC-10 | Requester with zero Tickets opens My Tickets | Empty-state message shown | client/src/.../MyTickets.test.tsx | Pending |
| UI-06 | UI | AC-11 | Filters applied matching no Tickets | No-results message shown | client/src/.../MyTickets.test.tsx | Pending |
| UI-07 | UI | AC-14 | Switch Development Requester | Ticket list reloads to new Requester's data | client/src/.../MyTickets.test.tsx | Pending |
| UI-08 | UI | AC-15 | Open Ticket Detail | All header fields render as read-only | client/src/.../RequesterTicketDetail.test.tsx | Pending |
| UI-09 | UI | AC-17 | Soft-remove an attachment with reason | Attachment shown as removed, download disabled | client/src/.../AttachmentSection.test.tsx | Pending |
| UI-10 | UI | AC-19 | No active Requesters exist | Empty state shown, Continue blocked | client/src/.../RequesterSelection.test.tsx | Pending |
| RESP-01 | Responsive | AC-20 | Create Ticket at mobile viewport | Fields stack vertically, no horizontal scroll | Playwright screenshot: artifacts/lab-02/screenshots/create-ticket/mobile.png | Pending |
| RESP-02 | Responsive | AC-20 | My Tickets at mobile viewport | Card layout replaces table, no clipping | Playwright screenshot: artifacts/lab-02/screenshots/my-tickets/mobile.png | Pending |
| RESP-03 | Responsive | AC-20 | Ticket Detail at tablet viewport | Two-column layout, no overlap | Playwright screenshot: artifacts/lab-02/screenshots/ticket-detail/tablet.png | Pending |
| E2E-01 | E2E | AC-01, AC-14 | Full flow: select Requester → create Ticket → find it in My Tickets | Ticket appears with correct data and official number | e2e/lab-02/requester-ticket-flow.spec.ts | Pending |
| E2E-02 | E2E | AC-03, AC-18 | Requester A creates a Ticket; Requester B attempts direct access | Access denied, no data leaked | e2e/lab-02/requester-ticket-flow.spec.ts | Pending |

## 3. Acceptance-Criterion Traceability

| AC | Covered By |
|---|---|
| AC-01 | API-01, UI-02, E2E-01 |
| AC-02 | (Requester Selection redirect — to add: UI test) |
| AC-03 | API-04, E2E-02 |
| AC-04 | API-02, UI-01 |
| AC-05 | API-03, UI-01 |
| AC-06 | API-08, UI-04 |
| AC-07 | API-09, UI-04 |
| AC-08 | API-10 |
| AC-09 | UI-03 |
| AC-10 | UI-05 |
| AC-11 | UI-06 |
| AC-12 | API-05 |
| AC-13 | API-06 |
| AC-14 | API-07, UI-07, E2E-01 |
| AC-15 | UI-08 |
| AC-16 | API-12 |
| AC-17 | API-11, API-13, UI-09 |
| AC-18 | API-14, E2E-02 |
| AC-19 | UI-10 |
| AC-20 | RESP-01, RESP-02, RESP-03 |

## 4. Responsive and Visual Checklist
See docs/lab-02/ui-spec.md Section 16 for the full checklist. To be completed 
during implementation with screenshot evidence at desktop/tablet/mobile for 
Create Ticket, My Tickets, and Ticket Detail.

## 5. Test Commands

**Server (API + unit):**
```bash
cd server
npm test
```

**Client (UI):**
```bash
cd client
npm test
```

**E2E (Playwright):**
```bash
npx playwright test e2e/lab-02
```

## 6. Final Results
To be filled in once implementation is complete — paste final passing test output here.

## 7. Known Limitations or Deferred Tests
To be filled in if any planned test is deferred, with justification.
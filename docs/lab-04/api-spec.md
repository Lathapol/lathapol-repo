# Lab 4 REST API (additions to Lab 3)

All Lab 3 conventions apply: base `/api`, cookie session, `X-CSRF-Token` on writes, errors `{error:{code,message}}`, `Cache-Control: no-store`. Lab 3 endpoints are unchanged except where noted.

**Action DTO:** `{id, ticketId, description, result, followUpRequired, followUpNote|null, attachmentNotes|null, version, createdAt, updatedAt, performedBy:{id,name}}`.

| Method / endpoint | Input | Success | Permission |
|---|---|---|---|
| GET /tickets/:id/actions | - | 200 Action[] oldest first | Owning Requester, Staff, Admin |
| POST /tickets/:id/actions | `{requestKey, description, result, followUpRequired, followUpNote?, attachmentNotes?}` | 201 Action; 200 original if `requestKey` repeated | Staff, Admin |
| PATCH /actions/:id | `{version, description?, result?, followUpRequired?, followUpNote?, attachmentNotes?}` (≥1 field) | 200 Action, version+1 | Staff, Admin |
| GET /dashboard/requester | - | 200 requester dashboard | Requester |
| GET /dashboard/staff | - | 200 staff dashboard (Admin adds `users`) | Staff, Admin |
| PATCH /staff/tickets/:id | as Lab 3 | as Lab 3; RESOLVED gated | Staff |
| GET /tickets, GET /staff/tickets | as Lab 3 + `group`, `recent` | as Lab 3 | as Lab 3 |

## Validation and errors
- IDs are positive integers, else 400 `INVALID_ID`. Body must be a JSON object with only allowed keys (unknown → 400 `INVALID_ACTION`).
- `requestKey` UUID string (create only). description/result trimmed 1–2000; attachmentNotes ≤500; followUpNote 1–1000, required iff `followUpRequired` is true (otherwise stored null).
- 403 for Requester writes or wrong-role dashboard; 404 for missing or foreign Ticket/Action, so a Requester never learns a foreign ticket exists.
- 409 `TICKET_TERMINAL` (Ticket CLOSED/CANCELLED), 409 `ACTION_CONFLICT` (stale `version` on PATCH), 409 `ACTION_REQUIRED` (RESOLVED without Actions), plus Lab 3 `TICKET_CONFLICT`.
- Create and edit run in a transaction that locks the Ticket row (`FOR UPDATE`) so concurrent status changes and actions serialize; create also touches `Ticket.updatedAt`.
- A repeated `requestKey` is caught by the unique `(ticketId, requestKey)` index; a losing concurrent insert re-reads and returns the winner (200).

## GET /dashboard/requester → 200
```
{ generatedAt, openCount, waitingCount, recentlyResolvedCount,
  recentlyUpdated:[TicketRow], recentlyResolved:[TicketRow] }
```
TicketRow = `{id, ticketNumber, summary, currentStatus, updatedAt}`. Caller's Tickets only; identity from the session.

## GET /dashboard/staff → 200
```
{ generatedAt, unassignedCount, mineCount,
  byStatus:{NEW:n, ...all 8 keys}, byItPriority:{LOW,MEDIUM,HIGH},
  urgent:[StaffRow], recentlyUpdated:[StaffRow],
  myActions:{ recentCount, recent:[{id,ticketId,ticketNumber,summary,createdAt}] },
  users?:{ REQUESTER, IT_STAFF, ADMINISTRATOR, inactive } }
```
StaffRow = TicketRow + `{itPriority, owner:{id,name}|null}`. `users` only for Administrator. Definitions and windows: specification §5.3. All numbers are read in one `RepeatableRead` transaction so the snapshot is consistent.

## Drill-down parameters
- `group=open` → NEW, OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER, REOPENED.
- `group=resolved` → RESOLVED, CLOSED. With `recent=7d` adds `updatedAt ≥ now − 7 days`.
- Both endpoints (`GET /tickets`, `GET /staff/tickets`) accept them, ANDed with existing filters. Invalid `group`/`recent` → 400 `INVALID_QUERY`. `status` and `group` together intersect.
- Requester "Recently resolved" drill-down: `/tickets?group=resolved&recent=7d`; its count equals `totalCount` (BR-17).

## Stale updates
Ticket updates use the Lab 3 `version`. Action updates use `Action.version`. A stale write returns 409 and the stored value is unchanged; the UI tells the user to reload and keeps their draft.

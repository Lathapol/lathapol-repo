# Sprint 4 engineering contract

Status: written before implementation, from the Lab 4 handout and the merged Lab 3 `main`. Implementation, peer review and final-main test results are recorded elsewhere (`reviewer.md`, `tests.md`); the existence of this file does not imply completion.

## 1. Sprint goal
Complete the service-desk workflow: IT Staff record Actions Taken under each Ticket, a Ticket cannot be Resolved without documented work, and Requesters, IT Staff and Administrators get concise backend-calculated dashboards. All Lab 1–3 behavior keeps working under the Zen Green design.

## 2. Stakeholder request (interpretation)
The desk needs a reliable log of the work done on a Ticket. The Ticket Owner still coordinates, but any IT Staff member may log work. Requesters may say "it looks fixed" but only Staff formally resolve. Each role gets a small dashboard whose numbers link to the detailed lists.

## 3. Scope
**Included:** Actions Taken (list/create/edit), resolution gate and final transition matrix, Requester/Staff/Admin dashboards, stale-update handling, seed/migration, final hardening (duplicate-submit protection, draft preservation, console/link cleanup, README).

**Excluded (handout 4.2):** SLA clocks/escalation, on-call, email/SMS/LINE/push, inventory/parts/cost, timesheets/billing, multi-level approval/e-signature, BI/report builders/exports, multi-tenant/cloud operations, and any feature not listed here. Also excluded by decision: deleting Actions Taken, and an "assignee" field on an action (see D-03).

## 4. Functional requirements
- FR-01 IT Staff and Administrators create an Action Taken under an existing, non-terminal Ticket.
- FR-02 IT Staff and Administrators edit an existing Action Taken.
- FR-03 Ticket Detail lists Actions Taken oldest-first with date/time, description, result, performed-by, follow-up flag/note and attachment notes.
- FR-04 Requesters see all Actions Taken on their own Tickets, read-only; other Requesters' Tickets are 404.
- FR-05 A Ticket moves to RESOLVED only if it has at least one Action Taken.
- FR-06 Status controls show only transitions allowed by the matrix; the backend is the authority.
- FR-07 Requester dashboard: own-ticket metrics and recent lists with drill-down.
- FR-08 Staff dashboard: queue metrics, urgent and recent tickets, current-user actions, drill-down. Administrator gets the Staff dashboard plus user-account counts.
- FR-09 Dashboard navigation per role with active-page indication and loading/empty/forbidden/failure states.
- FR-10 Repeated clicks/retries do not create duplicate Actions Taken; failed forms keep their entered data.
- FR-11 Lab 1–3 features (auth, create/list/detail/attachments, queue, ownership, comments/notes, user management) remain unchanged and tested.

## 5. Business rules
- BR-01 An Action Taken belongs to exactly one Ticket; a Ticket has many.
- BR-02 The Ticket Owner coordinates, but any active IT Staff/Administrator may create or edit an Action on any Ticket, regardless of who owns it.
- BR-03 **Performed by** is set by the server to the authenticated creator; clients cannot supply or change it. Editing by another Staff member does not change it.
- BR-04 **Action date/time** is server-generated at creation (`createdAt`), never client-supplied, never edited. Actions list oldest-first, ties by id.
- BR-05 Description: trimmed, 1–2000 chars. Result: trimmed, 1–2000 chars. Attachment Notes: optional, trimmed, ≤500 chars (free text naming which file/image to look for; no upload).
- BR-06 `followUpRequired` is boolean (default false). When true, `followUpNote` is required, trimmed, 1–1000 chars. When false, the note is stored as null (a supplied note is discarded).
- BR-07 Actions can be created/edited only while the Ticket is NEW, OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER, RESOLVED or REOPENED. CLOSED and CANCELLED Tickets are read-only for Actions (409).
- BR-08 Actions are never deleted (audit trail). Edits increment the action `version`; an update with a stale version returns 409.
- BR-09 Only IT Staff and Administrator write Actions. Requesters never write; all writes are enforced by the backend, not hidden controls.
- BR-10 **Resolution gate:** changing a Ticket to RESOLVED requires ≥1 Action Taken on that Ticket, else 409 `ACTION_REQUIRED`. Checked in the same transaction as the status update, so a client bypassing the UI is still blocked. Legacy Tickets already RESOLVED/CLOSED are not changed by migration; they simply show zero actions.
- BR-11 Requester "appears resolved" remains advisory; it never changes `currentStatus` (Lab 3 BR-05 preserved).
- BR-12 Status transitions use the matrix in §5.2. Terminal states CLOSED/CANCELLED have no exits. Confirmation is required for RESOLVED, CLOSED, CANCELLED. Only IT Staff change status (Admin read-only, as in Lab 3).
- BR-13 Ticket updates and Action updates carry a version; stale writes return 409 and never overwrite. Creating an Action also touches the Ticket `updatedAt` (Ticket version unchanged) so "recently updated" reflects work.
- BR-14 Duplicate-create protection: `POST` requires a client-generated `requestKey` (UUID, unique per Ticket). A repeat with the same key returns the original Action with 200 instead of creating a second one.
- BR-15 **Dashboards** are calculated by the backend from current database rows for the authenticated user, never from client input. "Open" group = NEW, OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER, REOPENED. "Recent" = `updatedAt` ≥ now − 7×24 h computed by the server; lists show the 5 newest, ordered `updatedAt` desc then id desc. Date boundaries are UTC instants; display uses the browser locale (Asia/Bangkok in the lab).
- BR-16 Requester dashboard sees only `requesterId = current user`. Staff dashboard covers all Tickets. Requesters get 403 on the staff dashboard; Staff/Admin get 403 on the requester dashboard.
- BR-17 Every dashboard count has a drill-down target whose list uses the same filter, so the count equals the list `totalCount`. Zero results return `0` and empty lists, never an error.
- BR-18 Errors are safe and structured `{error:{code,message}}` (400 validation, 401, 403, 404 missing/foreign, 409 conflict/gate/terminal, 500 generic). No stack traces, SQL, paths or notes.
- BR-19 Lab 3 rules BR-01..BR-16 (auth, CSRF, privacy of Internal Notes, attachments, ownership) still apply unchanged.

### 5.1 Authorization matrix (adds to Lab 3)
| Operation | Requester | IT Staff | Administrator |
|---|---|---|---|
| List Actions on a Ticket | Own Tickets | All | All |
| Create / edit Action | Denied (403) | Allowed | Allowed |
| Requester dashboard | Own | Denied | Denied |
| Staff dashboard | Denied | Allowed | Allowed (+ user counts) |
| Ticket status change | Denied | Allowed | Denied (Lab 3) |

### 5.2 Final status transition matrix
Destinations unchanged from Lab 3, with the gate added. Authorized role: IT Staff only.
| From | Allowed destinations | Extra condition |
|---|---|---|
| NEW | OPEN, CANCELLED | |
| OPEN | IN_PROGRESS, WAITING_FOR_REQUESTER, RESOLVED, CANCELLED | RESOLVED needs ≥1 Action |
| IN_PROGRESS | WAITING_FOR_REQUESTER, RESOLVED, CANCELLED | RESOLVED needs ≥1 Action |
| WAITING_FOR_REQUESTER | IN_PROGRESS, RESOLVED, CANCELLED | RESOLVED needs ≥1 Action |
| RESOLVED | CLOSED, REOPENED | |
| REOPENED | OPEN, IN_PROGRESS, CANCELLED | |
| CLOSED / CANCELLED | none | terminal |

### 5.3 Dashboard metrics
| Card | Definition (server query) | Empty | Drill-down |
|---|---|---|---|
| R: Open tickets | own, status in Open group | 0 | `/tickets?group=open` |
| R: Waiting for you | own, WAITING_FOR_REQUESTER | 0 | `/tickets?status=WAITING_FOR_REQUESTER` |
| R: Recently updated | own, updatedAt ≥ now−7d, top 5 | "No recent updates" | each row → Ticket Detail |
| R: Recently resolved | own, RESOLVED or CLOSED, updatedAt ≥ now−7d, top 5 | "Nothing resolved recently" | each row → Ticket Detail; count → `/tickets?group=resolved&recent=7d` |
| S: Unassigned | ownerId null, Open group | 0 | queue `owner=unassigned&group=open` |
| S: My tickets | ownerId = me, Open group | 0 | queue `owner=mine&group=open` |
| S: By status | count per each of the 8 statuses | 0 each | queue `status=X` |
| S: By IT priority | count per LOW/MEDIUM/HIGH, Open group | 0 each | queue `priority=X&group=open` |
| S: Urgent | itPriority HIGH, Open group, top 5, oldest `updatedAt` first | "No urgent tickets" | row → Detail |
| S: Recently updated | any owner, updatedAt ≥ now−7d, top 5 | "No recent updates" | row → Detail |
| S: My recent actions | Actions where performer = me, last 7d: count + 5 newest | 0 / "No actions logged" | row → Ticket Detail |
| A: User accounts | active count per role, inactive count | 0 | `/users` |

## 6. UI specification summary
See `ui-spec.md`. Ticket Detail (staff) gains an Actions Taken panel (list, create form, edit form). Requester Detail gains the same list read-only. A Dashboard page per role becomes the role home; navigation shows the active page. All screens reuse Zen Green tokens, badges and feedback components.

## 7. Data changes
New model `ActionTaken` (table `ActionTaken`): `id` PK, `ticketId` FK→Ticket, `performedById` FK→User, `description`, `result`, `followUpRequired` bool default false, `followUpNote` null, `attachmentNotes` null, `requestKey` text, `version` int default 0, `createdAt`, `updatedAt`. Indexes: `(ticketId, createdAt, id)` for the list and resolution gate, `(performedById, createdAt)` for "my recent actions", unique `(ticketId, requestKey)` for BR-14. Add `Ticket(updatedAt)` for recent lists and `Ticket(ownerId, currentStatus)` for owned counts.

**Migration:** additive SQL only (CREATE TABLE + CREATE INDEX). No existing table or row changes.
**Backfill:** none needed. Legacy Tickets have zero Actions: detail shows "No actions recorded", dashboards count them normally, and Tickets already RESOLVED are unaffected (the gate applies only to new transitions).
**Recovery:** reversible with `DROP TABLE "ActionTaken"`. Test by migrating a restored Lab 3 backup, comparing row counts/digests of all Lab 3 tables before and after, then dropping the table and re-comparing.
**Seed (idempotent):** insert only if absent, keyed by fixed ticket numbers and requestKeys. Tickets cover all 8 statuses, LOW/MEDIUM/HIGH, owned and unassigned, with 0, 1 and 3+ Actions (multiple performers on one Ticket), a follow-up example, and one Requester with zero tickets to demonstrate zero dashboard metrics. Re-running changes nothing.

## 8. API contract
See `api-spec.md`.

## 9. Acceptance criteria
| ID | Observable outcome |
|---|---|
| AC-01 | Permitted Staff + valid data creates an Action under the right Ticket with the authenticated performer and server timestamp. |
| AC-02 | Validation: empty/over-length description or result, follow-up true without note, bad JSON/unknown fields all return 400 with safe messages. |
| AC-03 | Staff can edit an Action; performer and date do not change; a stale version returns 409 and changes nothing. |
| AC-04 | A Staff member who is not the Ticket Owner can log an Action (BR-02); performer is that member. |
| AC-05 | Requester cannot create/edit (403); Requester reads Actions only on own Ticket (foreign → 404). |
| AC-06 | Actions on CLOSED/CANCELLED Tickets are rejected 409; on other states accepted. |
| AC-07 | Repeating a create with the same requestKey yields one row, including concurrent repeats. |
| AC-08 | Status → RESOLVED with zero Actions returns 409 `ACTION_REQUIRED` even via direct API; with ≥1 Action it succeeds. |
| AC-09 | Every matrix transition works for Staff only; invalid, terminal, unconfirmed and stale updates fail; Requester appears-resolved does not change status. |
| AC-10 | Requester dashboard returns only the caller's metrics/lists; another Requester's Tickets never appear. |
| AC-11 | Staff dashboard metrics equal direct database counts; Admin also gets user counts; Requester/unauthenticated denied. |
| AC-12 | Each dashboard count equals the `totalCount` of its drill-down list. |
| AC-13 | Empty datasets return zeros/empty lists and the UI shows empty states. |
| AC-14 | Ticket Detail shows Actions list, create mode, edit mode and a read-only view for Requesters; the summary status refreshes after a status change. |
| AC-15 | Dashboard UIs show loading, error+retry, forbidden, empty and populated states and are role-navigated. |
| AC-16 | Migration preserves all Lab 3 data; seed is repeatable; legacy Tickets show zero actions. |
| AC-17 | Desktop/tablet/mobile layouts have visible focus, labels, no clipping or horizontal overflow. |
| AC-18 | Full Lab 1–3 regression (server, client, E2E) passes on final `main`. |

## 10. Definition of Done
- [ ] AC-01..AC-18 each map to a passing automated test (see `tests.md`).
- [ ] Additive migration applied to a restored Lab 3 backup with before/after evidence; seed run twice with identical results.
- [ ] Server, client and Playwright suites pass on `main`; TypeScript and Vite builds pass.
- [ ] No console errors, broken links, placeholder text or unfinished controls in any role's screens.
- [ ] Desktop/tablet/mobile screenshots for Staff dashboard, Requester dashboard and Actions Taken, inspected against the ui-spec checklist.
- [ ] Dashboard sample metrics verified against direct database queries.
- [ ] README (setup, migrate, seed, test, demo) current; `reviewer.md` and `ai-use.md` truthful.
- [ ] Feature PRs reviewed into `lab4-staging`, then `main`; all Issues Done.

## 11. Assumptions and decisions
- D-01 Resolution gate = at least one Action Taken (simple, testable, backend-enforced); it does not require follow-ups to be cleared.
- D-02 **DB decision:** a separate `ActionTaken` table (not JSON on Ticket) so many-per-ticket, per-row audit, indexes and joins for dashboards work.
- D-03 **DB decision:** no delete and no client timestamp; `createdAt` doubles as "Action date/time" so records cannot be backdated. `requestKey` with a unique index gives idempotency at the database level, not just in code. No assignee column: the handout lists "Performed by (auto)"; assignment stays on Ticket owner, and inactive-owner rejection remains the Lab 3 rule.
- D-04 Optimistic concurrency via integer `version`, matching Lab 3.
- D-05 Requesters see all Actions on their own Tickets (handout 8.3 resolves the "where approved" wording in 4.3). Actions hold no private data, unlike Internal Notes.
- D-06 "Recent" is 7 days rolling, top 5 rows, to keep dashboards concise.
- D-07 `group=open` and `group=resolved` are small additive list filters so dashboard counts and drill-downs match.

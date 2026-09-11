# Sprint 3 engineering contract

Status: implementation baseline prepared from Lab_3_sheet.pdf and the existing Lab 2 repository. Student/peer review and final-main evidence remain required. This document precedes implementation; completion is not implied by its existence.

## 1. Sprint goal
Replace the development identity selector with secure accounts while preserving existing tickets and attachments. Give IT Staff a shared operational queue and give Administrators a small, safe user-management screen.

## 2. Stakeholder request
Requesters should use their own signed-in identity, communicate with support, and report apparent resolution. Staff should assign and progress tickets and keep internal discussion private. Administrators should manage accounts without becoming unrestricted ticket operators.

## 3. Scope
Included: login/logout/current user, mandatory password change, three single roles, migration, requester regression, queue, staff detail, ownership, IT priority, workflow, append-only comments/notes, minimal account administration, responsive Zen Green UI and tests.

Excluded: registration, email delivery/reset links, MFA/SSO, Actions Taken, SLA/escalation/notifications, analytics, departments, multiple roles, deletion/bulk/import/export, account history and cloud deployment.

## 4. Functional requirements
- FR-01 Authenticate active accounts and enforce initial-password replacement before normal APIs/screens.
- FR-02 Return a safe current user, invalidate logout sessions, enforce roles and ownership at the server.
- FR-03 Preserve Lab 2 create/list/detail/search/filter/sort/pagination and attachment upload/download/soft-remove using authenticated requester identity.
- FR-04 Offer a shared staff queue with search, combined status/IT-priority/owner filters, sorting, pagination and detail navigation.
- FR-05 Staff can claim unassigned tickets, assign/reassign eligible owners, change IT priority and perform permitted transitions.
- FR-06 Owners and staff can post Public Comments; staff can post Internal Notes. Readers follow the matrix below.
- FR-07 Requesters can indicate apparent resolution without changing formal ticket status.
- FR-08 Administrators can list/search/create/edit accounts, assign one role, activate/deactivate, and set an initial password.
- FR-09 Preserve data with a versioned migration and repeatable local seed.
- FR-10 All screens provide busy, validation, success, empty/no-results and safe failure feedback with responsive accessible controls.

## 5. Business rules
- BR-01 Only active users with correct credentials authenticate; unknown, inactive and incorrect credentials receive the same safe message.
- BR-02 A password-change-required session can access only current-user, change-password and logout endpoints.
- BR-03 Ignore client requesterId on all requester APIs. Derive author, requester and timestamps server-side. Cross-owner reads/writes return 404.
- BR-04 Public Comments are readable by the owning Requester, IT Staff and Administrator. Internal Notes are readable only by IT Staff and Administrator and are never included in requester detail responses.
- BR-05 Apparent resolution records a timestamp independently of status. Requesters cannot formally resolve/close; available only on nonterminal tickets, idempotent, cleared on reopening.
- BR-06 Normalize emails by trimming and lowercasing; enforce uniqueness in the database, including mixed-case duplicates. Names: 1-100 trimmed characters; email: valid basic structure and at most 254 characters.
- BR-07 Passwords are 12-128 characters, are not trimmed, must differ from the initial/current password, and must match confirmation. Store a random-salt scrypt hash (N=32768,r=8,p=3), never plaintext. Local-lab initial passwords are distributed manually, not emailed.
- BR-08 Store only SHA-256 digests of random 32-byte opaque session tokens in PostgreSQL. HttpOnly SameSite=Lax path=/ cookie, Secure in production, absolute 8-hour expiry. Login rotates the current session; password change/reset invalidates all sessions. User activation and role are checked on every request.
- BR-09 Require same-origin/allowlisted Origin on browser writes and a session-bound X-CSRF-Token for authenticated writes. Login accepts JSON only. Password failures are limited to 10 attempts per email per 15 minutes plus 100 per source IP; return 429 with Retry-After. This is a single-process lab limit.
- BR-10 Users have exactly one role: REQUESTER, IT_STAFF, ADMINISTRATOR. Deactivate instead of deleting. Deny self-deactivation and any demotion/deactivation of the last active administrator; serialize concurrent admin edits.
- BR-11 A ticket has zero or one owner, eligible only if active IT_STAFF or ADMINISTRATOR. Staff alone performs assignment/priority/status mutations. Administrator ownership is allowed by the handout but does not grant mutation rights. Existing ownership is retained when an account becomes inactive or changes role; reassign explicitly.
- BR-12 Requested Priority remains unchanged after creation. IT Priority is initially copied, then independently LOW/MEDIUM/HIGH. Existing tickets are backfilled from their requested priority.
- BR-13 Staff mutations require the current integer ticket version; stale writes/claims return 409. Staff must confirm terminal transitions. Status changes do not silently assign an owner.
- BR-14 Comments/notes are append-only, trimmed plain text, 1-4000 characters. React escapes rendering; no HTML interpretation. Author and time are server-generated. Comments remain available on terminal tickets.
- BR-15 Preserve Lab 2 summary 5-150, description 10-2000, active related system, category and priority validation. Attachment types JPG/PNG/WEBP/PDF, 5 MiB each, five active files, soft removal. Only owning Requesters upload/remove; staff/admin can read/download. Authorize before storing uploads and serialize the five-file limit.
- BR-16 APIs return safe structured errors: 400 validation, 401 unauthenticated, 403 role/password/CSRF restriction, 404 missing/foreign-owned, 409 conflict, 410 removed attachment, 429 throttled, 500 unexpected. Never send password hashes, tokens, disk paths, stack traces or note data to unauthorized users.

### Authorization matrix
All permissions require an active account and completed password change unless noted.

| Operation | Requester | IT Staff | Administrator |
|---|---|---|---|
| Current user / password / logout | Own, including initial session | Own | Own |
| Categories / related systems | Read | Read | Read |
| Create ticket / own ticket list | Own | Denied | Denied |
| Ticket detail / attachments download | Own only | All | All, read-only |
| Upload / soft-remove attachments | Own only | Denied | Denied |
| Shared queue / eligible owners | Denied | Read | Read |
| Claim / assign / priority / status | Denied | Allowed | Denied |
| Public Comments | Own: read/create | All: read/create | All: read |
| Internal Notes | Denied | All: read/create | All: read |
| Apparent resolution | Own nonterminal | Denied | Denied |
| User management | Denied | Denied | Allowed |

### Status transition matrix
Only IT Staff can use this matrix; all other transitions are rejected with 409. CLOSED and CANCELLED are terminal. No Actions Taken prerequisite in Lab 3.

| From | Allowed destinations |
|---|---|
| NEW | OPEN, CANCELLED |
| OPEN | IN_PROGRESS, WAITING_FOR_REQUESTER, RESOLVED, CANCELLED |
| IN_PROGRESS | WAITING_FOR_REQUESTER, RESOLVED, CANCELLED |
| WAITING_FOR_REQUESTER | IN_PROGRESS, RESOLVED, CANCELLED |
| RESOLVED | CLOSED, REOPENED |
| REOPENED | OPEN, IN_PROGRESS, CANCELLED |
| CLOSED / CANCELLED | None |

Confirmation is mandatory for RESOLVED, CLOSED and CANCELLED. Reopening clears requester apparent resolution. Initial status remains NEW.

## 6. UI specification summary
See ui-spec.md. Reuse Lab 2 tokens and attachment/create components. Login and password change precede a role-specific shell. Staff sees Queue; Admin sees Users plus read-only Queue; Requester sees My Tickets/Create Ticket. Public and private conversation sections have separate labeled composers.

## 7. Data changes
Map Prisma User to the existing PostgreSQL RequesterUser table using @@map, preserving IDs and ticket foreign keys. Add role, nullable passwordHash, mustChangePassword and updatedAt. Null hashes cannot authenticate; a local migration password initializer sets hashes only where missing. Check case-folded duplicate email conflicts before normalizing; stop safely rather than merging people.

Add Session(tokenHash PK, userId FK, csrfToken, expiresAt, createdAt), Ticket.ownerId FK/index, itPriority, version, requesterResolvedAt and the seven additional statuses. Add TicketEntry(ticketId, authorId, kind PUBLIC/INTERNAL, body, createdAt), indexed by ticket/kind/time. Keep Category, RelatedSystem and Attachment records and stored files unchanged. Migration uses additive SQL, no table/data reset. Capture before/after counts and existing ownership/attachment values; apply and test first on an isolated test database.

Seed only absent local fixtures: four active/one inactive Requesters, three active/one inactive Staff, one active Admin, 24 varied tickets with public/internal examples. Seed reruns do not overwrite changed passwords, roles, statuses or existing tickets. Legacy requester password initialization requires an explicit local password environment variable and never overwrites existing hashes.

## 8. API contract
See api-spec.md for endpoint shapes, session handling, validation and errors. Production hosting is excluded; Vite proxies /api to Express for same-origin cookie behavior locally.

## 9. Acceptance criteria
| ID | Observable outcome |
|---|---|
| AC-01 | Active valid login returns safe user/session; invalid/inactive rejected; attempts throttled. |
| AC-02 | Initial session cannot reach normal APIs; valid different confirmed password unlocks app and invalidates old sessions. |
| AC-03 | Logout/expiry/deactivation prevent reuse; cross-origin or missing-CSRF writes rejected. |
| AC-04 | Spoofed requesterId cannot expose/change another user's tickets/attachments or set ownership on creation. |
| AC-05 | Existing create/list/search/filter/sort/pagination and attachment constraints still work under login. |
| AC-06 | Staff queue combines filters, sorts deterministically, paginates and rejects invalid queries. |
| AC-07 | Eligible assignment/claim/priority work; inactive/requester assignees and stale versions fail. |
| AC-08 | Every matrix transition works only for Staff; invalid/terminal/unconfirmed transitions fail. |
| AC-09 | Public comments and notes preserve author/time and append-only privacy with content boundaries. |
| AC-10 | Apparent resolution changes only the requester's signal; formal resolution stays Staff-only. |
| AC-11 | Admin list/search/create/edit/role/activation/reset work; duplicates, invalid roles, self-deactivation and last-admin loss fail. |
| AC-12 | Migration preserves old IDs, ownership, attachments and priorities; seeds are repeatable. |
| AC-13 | Role shell and five major screens expose only permitted actions and cover busy/validation/success/failure. |
| AC-14 | Desktop/tablet/mobile layouts have keyboard focus, labels, readable badges and no page overflow. |
| AC-15 | End-to-end requester, staff and administrator flows pass using the real server/database. |

## 10. Definition of Done
- [ ] AC-01 through AC-15 pass with traceable test files and actual outputs.
- [ ] Migration preservation and repeat seed evidence exist; Lab 2 regression passes.
- [ ] Backend and frontend builds and required test suites pass.
- [ ] Desktop/tablet/mobile screenshots visually reviewed; direct authorization evidence captured.
- [ ] README, specs, test plan, reviewer record and truthful AI-use record current.
- [ ] Feature PRs reviewed into lab3-staging, then main; tests rerun on final main; issues Done.
- [ ] Student supplies real peer-review identity/approvals and personal reflection.
- [ ] One concise PDF has Answer Part 1 through Answer Part 9, actual links and evidence.

## 11. Assumptions and decisions
Server-managed cookies avoid browser token persistence; scrypt uses Node's built-in crypto to avoid a new hashing dependency. Admin can read queue/detail/notes to satisfy visibility rules but cannot mutate tickets. Owner eligibility includes Admin to follow section 4.5. The textual exclusions override example mockups showing email reset and service actions. Status policy and 12-character passwords are explicit project choices. No fabricated PR approvals, test results or historical prompts count as completion evidence.

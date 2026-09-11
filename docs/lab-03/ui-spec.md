# Lab 3 UI specification

Reuse Lab 2 Zen Green: primary #006B3C, secondary #0B7A46, pale #EAF6EF, page #F5F7F6, text #1F2A24, read-only #EDF1EE, error #B3261E. White editable fields, labeled buttons, 16px base type, 8px spacing unit, 16px form gaps, 32px sections. Shared Badge, Feedback and form controls across new screens; keep CreateTicket and AttachmentPicker.

| Screen / mode | Structure and behavior |
|---|---|
| Login | Centered card; labeled email/password, validation, busy disabled submit; identical safe message for wrong/inactive/unknown credentials. |
| Change password | Blocking card, current/new/confirm, rules shown, inline mismatch/length feedback. Successful change replaces the session then enters role home. Logout remains available. |
| Shell | Brand, current name and text role, role navigation, logout. Requester: My Tickets/Create; Staff: Queue; Admin: Users/Read-only Queue. No development selector. Reload verifies /auth/me. |
| Requester list/create/detail | Existing Lab 2 behavior with authenticated identity. All eight status filters. Detail adds Public Comments and apparent-resolution action for nonterminal tickets. No note section or formal status control. |
| Queue / view | Heading, result count, search, status, IT priority and owner filters, sort/order. Desktop table: ticket/summary, requester, owner, priority, status, updated and Open. Mobile/tablet cards avoid a wide grid. Pagination Previous/Next and page metadata. |
| Staff detail / view-edit | Read-only ticket header/description/category/system/requested priority. Separate operational card for owner, IT priority and allowed next status; Claim and Save, current version carried with updates. Confirm terminal changes explicitly. Stale conflict tells user to reload. |
| Conversation / append | Public Comments and Internal Notes are separate labeled panels and composers, with visibility helper text. No editing/deletion. Author/time and escaped prewrapped text. Private note composer never reuses a public draft. Admin sees read-only panels. |
| Users / list-create-edit | Name/email search and optional role filter. List name/email/role/status/Edit. Create/edit form name,email,one role,active; initial password only on create. Separate reset form on edit. Confirm deactivation/reset; API errors preserve draft. Self-deactivation disabled with reason; last-admin loss rejected safely. |

Feedback: each async read has loading, safe failure and Retry; list distinguishes zero records from filtered no-results. Writes disable while saving; errors role=alert, successes role=status. Field rules appear near labels and use aria-describedby/aria-invalid when invalid. Existing values/drafts persist after failures. Button text distinguishes Claim, Save changes, Post comment and Add internal note. Reset and logout clear credentials/session state; expired or revoked sessions return to login. No success is shown until backend success.

Responsive: >=992px desktop tables and multi-column detail; 768-991px cards/two-column forms; <768px stacked fields/nav, wrapping buttons and long filenames/email/body. Container max-width 1200px, no page overflow. Buttons min 44px on mobile. Focus-visible ring and keyboard reachable native controls; text badges never communicate via color alone. Only allowed fields are editable.

Visual evidence to collect at 1440x1000, 820x1180 and 390x844: login, mandatory change password, queue, staff detail, users; preserve requester regression coverage. Checklist: colors, spacing, active role navigation, correct fields/read-only state, private label, contrast, focus, inline validation, wrapping, clipping/overlap/overflow, busy and safe failure. Mark checks only after actual inspection.

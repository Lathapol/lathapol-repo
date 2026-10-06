# Lab 4 UI specification

Reuses Lab 2/3 Zen Green tokens (primary #006B3C, secondary #0B7A46, pale #EAF6EF, page #F5F7F6, text #1F2A24, read-only #EDF1EE, error #B3261E), shared Badge, Feedback, forms, cards and tables. 16px base type, 8px unit, 44px min touch target on mobile, visible focus ring, text (not color-only) status cues.

| Screen / mode | Structure and behavior |
|---|---|
| Shell | Adds **Dashboard** first in nav for every role (Requester: Dashboard, My Tickets, Create; Staff: Dashboard, Queue; Admin: Dashboard, Queue, Users). Active page has `aria-current="page"` and a distinct style. Role home after login = Dashboard. Obsolete or duplicate controls from earlier labs are removed. |
| Staff dashboard | Heading + "as of" time. Metric cards: Unassigned, My tickets (each a link with label, large value, "View" text). "By status" and "By IT priority" lists, each row a link with count. Lists: Urgent, Recently updated, My recent actions (rows link to Ticket Detail). Admin: extra "User accounts" card. Desktop 3 columns, tablet 2, mobile 1. |
| Requester dashboard | Cards: Open tickets, Waiting for you (text badge "Needs your attention" when >0), Recently resolved; lists Recently updated and Recently resolved. Links to My Tickets with filters. Does not replicate the full list. |
| Dashboard states | Loading text `role=status`; failure `role=alert` with Retry; 403 shows a plain "not available for your role" message with a home link; zero data shows "0" cards and per-list empty text. |
| Actions Taken panel (staff detail) | Table on ≥992px, stacked cards below. Columns: Date/time, Performed by, Description, Result, Follow-up (Yes/No + note), Attachment notes. "Add action" opens **create mode** (description, result, follow-up checkbox, follow-up note enabled and required when checked, attachment notes). Each row has "Edit" → **edit mode** (same form, Save/Cancel). Performed-by and date are read-only. |
| Actions Taken (requester detail) | Same list, read-only, no buttons. |
| Actions form feedback | Inline errors beside fields (`aria-invalid`, `aria-describedby`); Save disabled while busy; double-click cannot duplicate (requestKey); failure keeps entered text; conflict message "This action changed, reload"; terminal Tickets hide Add/Edit and show "Ticket is closed". Success uses `role=status` and refreshes the list and ticket summary. |
| Ticket workflow | Status select lists only allowed next statuses; RESOLVED with zero Actions shows the hint "Log an action first" and, if bypassed, the API error `ACTION_REQUIRED`. Confirmation dialog (focus trapped, Esc closes, focus returns) for RESOLVED/CLOSED/CANCELLED. After success the summary status badge and version refresh. |

Responsive: ≥992px multi-column; 768–991px two columns/cards; <768px stacked, wrapped buttons and long text, no horizontal page scroll. Container max 1200px.

Visual evidence at 1440x1000, 820x1180 and 390x844 in `artifacts/lab-04/screenshots/{staff-dashboard,requester-dashboard,actions-taken}/`.

## Visual and accessibility checklist (tick only after actual inspection)
- [ ] Zen Green tokens and spacing consistent across all new screens
- [ ] Active nav indicated; role nav correct
- [ ] Metric cards: label, value, keyboard-operable drill-down link
- [ ] Editable fields white, read-only fields grey; performed-by/date read-only
- [ ] Validation placed beside fields and announced
- [ ] Keyboard focus visible on all controls; dialog focus trapped and restored
- [ ] Status/priority/private-vs-shared cues are text, not color only
- [ ] No clipping, overlap or horizontal overflow at 390/820/1440 widths
- [ ] No console errors, placeholder text or unfinished controls

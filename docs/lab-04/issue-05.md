# lab4 issue5 : Role dashboards

Depends on #50 (Actions Taken API, PR #57) and #52 (workflow/resolution gate, PR #59). Adds the Requester and Staff/Admin dashboards.

## What changed

- **API:** `GET /api/dashboard/requester` (Requester only) and `GET /api/dashboard/staff` (Staff/Admin, Administrator also gets `users` counts). Both computed by the backend in one `RepeatableRead` transaction from live rows, never client input. Definitions match specification.md §5.3: open group = NEW/OPEN/IN_PROGRESS/WAITING_FOR_REQUESTER/REOPENED, "recent" = last 7 days, lists cap at 5.
- **Drill-down parity:** `GET /tickets` and `GET /staff/tickets` gained `group=open|resolved` and `recent=7d` filters (intersecting with `status`/`priority`/etc.), so every dashboard count equals its drill-down list's `totalCount` (BR-17).
- **UI:** new `RequesterDashboard` and `StaffDashboard` pages, both the new role home. Cards for the counts, breakdown lists for status/IT priority, row lists for urgent/recently updated/recently resolved/my recent actions, each row and card clickable. `MyTickets` and `TicketQueue` accept an `initialFilter` and show a dismissible "Showing … from the dashboard" banner when arriving via drill-down.
- **Navigation:** every role's shell now shows **Dashboard** first, with `aria-current="page"` on the active link; it's the landing page after login for all three roles.
- Existing Lab 1–3 e2e specs and the Lab 3 `Auth.test.tsx` fixture updated for the new Dashboard landing page (they now navigate to My Tickets/Ticket Queue/Users explicitly before doing their own checks).

## Verification — 2026-09-27

- Backend: 19 suites, 261 tests passed against `toktickit_lab4_test`, including dashboard metrics checked against direct database counts, role denials, own-data isolation, empty states, and count-equals-drill-down-list assertions (AC-10..13). A performance-smoke test confirms the staff dashboard responds under 1s on seeded data.
- Client: 11 files, 58 tests passed (14 new in `StaffDashboard.test.tsx`/`RequesterDashboard.test.tsx`), covering loading/error/forbidden/empty states and every card/row's drill-down target. `tsc -b` and Vite build passed.
- Browser: `e2e/lab-04/dashboards.spec.ts` passed at 1440x1000, 820x1180 and 390x844 — a metric card drills into the filtered list, the filter banner clears, and a list row opens the ticket directly. The full Lab 4 suite (9 scenarios) and the full Lab 3 suite (15 scenarios) both still pass with the new Dashboard-first navigation. Screenshots inspected: `artifacts/lab-04/screenshots/{staff-dashboard,requester-dashboard}/{desktop,tablet,mobile}.png`.

Peer review of issue 5 is pending. Final hardening, full regression and the remaining responsive/accessibility/regression rows in tests.md are issue 6.

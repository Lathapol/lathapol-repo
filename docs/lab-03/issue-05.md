# lab3 issue5 : IT Staff workflow and communication

Staff can claim unassigned tickets, assign/reassign active staff/admin owners, set IT priority independently and follow the approved transition matrix. Ticket locks and expected versions prevent stale writes and double claims. Resolving, closing and cancelling require explicit confirmation. Reopening clears apparent resolution.

Public Comments and Internal Notes are separate append-only sections with server author/time and plain-text rendering. Requesters see and post only public comments on their own tickets; administrators can read both sections without ticket mutation rights. Requesters can report apparent resolution independently of formal status. Attachments retain the earlier role/ownership rules.

## Verification — 2026-09-15

- Server: 12 suites / 145 tests passed; TypeScript build passed.
- Client: 6 files / 21 tests passed; TypeScript and Vite builds passed.
- Browser: 2 workflow flows passed (desktop/mobile), plus 6 queue/requester regression flows passed. Initial workflow selectors timed out; switched the selects to accessible combobox-role selectors and both reruns passed.
- API tests cover every allowed and forbidden transition, confirmation, concurrent claims and updates, stale versions, eligible owners, content boundaries, author spoofing, note privacy, append-only routes, CSRF, ownership and apparent resolution.
- Browser flow: staff claim/priority/status/public/private posts, requester public reply and apparent resolution, staff resolve/reopen, administrator read-only view. Desktop 1440x1000, tablet 820x1180 and phone 390x844 screenshots inspected; staff layout overflow assertions passed.
- Evidence: artifacts/lab-03/issue5-*.png. Use isolated toktickit_lab3_test and the service/test commands from issue-03.md.

Dependency PR #42 was approved and merged while this issue was in progress. Issue 5 peer review is pending. User management and final integration/submission remain in issues 6–8.

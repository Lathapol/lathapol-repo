# lab3 issue4 : IT Staff Ticket Queue

Adds the shared staff/admin queue and eligible-owner API. Search, category, status, IT priority and owner filters combine; sorting has an ID tie-break. Pagination validates inputs and clamps to the last page, with count and rows read from one repeatable-read snapshot. Requesters are denied access.

The responsive queue uses a desktop table and cards below 992px, labeled controls, keyboard-operated Open buttons, loading/error/retry, empty and no-results states. Staff/admin can open read-only ticket details and download attachments. Workflow mutations follow in issue 5.

## Verification — 2026-09-15

- Server: 11 suites / 62 tests passed; TypeScript build passed.
- Client: 5 files / 16 tests passed; TypeScript and Vite production builds passed.
- Browser: 4 queue flows passed (staff and administrator at desktop/mobile), plus 2 requester regression flows passed.
- Queue checks cover login, keyboard Open, hidden attachment mutations, pagination, no-results, reset and logout. Screenshots inspected at 1440x1000, 820x1180 and 390x844; overflow assertions passed.
- Initial queue browser fixtures used uppercase email while login normalizes email. Corrected the fixture emails to lowercase and reran all four queue flows successfully.
- Evidence: artifacts/lab-03/issue4-*.png. Uses isolated toktickit_lab3_test only. Run browser tests with the service configuration in issue-03.md and `npx playwright test --config playwright.lab3.config.ts`.

Issue 3 dependency PR #41 is approved and merged. Issue 4 peer review is pending.

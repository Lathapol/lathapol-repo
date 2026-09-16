# lab3 issue6 : Administrator User Management

Administrators can search accounts by name/email, filter one role, create/edit accounts, activate/deactivate and manually set an initial password. Emails are normalized and unique; passwords are hashed and never returned. Reset ends existing sessions and requires a password change at next login. Role changes and deactivation also invalidate the target user's sessions.

Account writes take a shared transaction advisory lock and recheck the acting administrator's live session before changing data. The API rejects self-deactivation and loss of the last active administrator, including concurrent demotions. Assignment history is retained. No deletion, bulk tools or email delivery was added.

The administrator home now opens Users, with read-only Ticket Queue navigation. Desktop tables switch to cards below 992px. Create/edit drafts survive failures; deactivation/reset require confirmation; successful resets clear the password input. Self-deactivation is disabled with a reason.

## Verification — 2026-09-15

- Server: 13 suites / 160 tests passed; TypeScript build passed.
- Client: 7 files / 26 tests passed; TypeScript and Vite production builds passed.
- Browser: all 10 flows passed in one run, desktop/mobile, including the new account-management flow and prior requester/queue/workflow regressions.
- Screenshots inspected at 1440x1000, 820x1180 and 390x844. User list/editor overflow assertions passed. Evidence: artifacts/lab-03/issue6-*.png.
- Initial API tests exposed Prisma's inability to decode PostgreSQL's void advisory-lock result. Selecting an integer from the lock function fixed it; all 15 administrator API tests passed on rerun.
- The password-throttling regression exceeded its old five-second deadline on this machine. The final server run uses `npx jest --runInBand --testTimeout=15000`; assertions and password hashing parameters are unchanged.
- Tests run only against toktickit_lab3_test. The last-admin test temporarily deactivates other isolated test administrators and restores them in finally; no development database was changed.

PR #43 was approved and merged during implementation. Issue 6 peer review is pending. Integrated evidence and final release/submission remain in issues 7–8.

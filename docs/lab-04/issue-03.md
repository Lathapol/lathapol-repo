# lab4 issue3 : Actions Taken UI

Depends on #50 (Actions Taken API, merged in PR #57). Adds the Actions Taken area to Ticket Detail for IT Staff, Administrators and Requesters.

## What changed

- New `ActionsTaken` component, placed between the workflow card and Public Comments on Ticket Detail. It uses the Lab 4 API through `fetchActions`, `createAction` and `updateAction` in `client/src/api.ts`.
- List: date/time, performed by, description, result, follow-up (Yes with note / No) and attachment notes. A table on wide screens that stacks into labeled cards below 992px. Empty state, loading state and a safe load failure with "Reload actions".
- Create mode ("Add action") and edit mode (row "Edit"): description, result, follow-up checkbox, follow-up note (enabled and required only when follow-up is checked) and attachment notes. In edit mode performed by and the recorded date are shown read-only.
- Inline validation beside the fields with `aria-invalid`/`aria-describedby`, using the same limits as the server. The save button is disabled while saving. A failed save keeps the typed text and the same `requestKey`, so a retry cannot create a duplicate. A stale edit (409) shows the conflict message and a "Reload actions" button and keeps the draft.
- Requesters see the same list read-only. Closed and cancelled tickets hide Add/Edit for staff and explain why.
- Zen Green styles in `App.css`; buttons are at least 44px high on mobile.

## Verification — 2026-09-24

- Client: 8 files, 35 tests passed (9 new in `client/tests/lab-04/ActionsTaken.test.tsx`; the Lab 3 `TicketActivity` test mock now also provides `fetchActions`). `tsc -b` and the Vite production build passed.
- Browser: `e2e/lab-04/actions-taken-flow.spec.ts` passed on desktop 1440x1000, tablet 820x1180 and mobile 390x844 against isolated `toktickit_lab4_test`. Flow: staff empty state, keyboard "Add action", validation, follow-up note rule, add, second staff member adds a different action and edits the first (performer stays the original author), requester read-only view, closed ticket read-only. The page-overflow assertion passed at all three widths. Screenshots inspected: `artifacts/lab-04/screenshots/actions-taken/{desktop,tablet,mobile}-{staff,requester}.png`.

Run browser tests: start the API with `PORT=4103` and `APP_ORIGIN=http://localhost:5183`, Vite with `VITE_API_URL=http://localhost:4103` on port 5183, both with `DATABASE_URL` pointing at `toktickit_lab4_test`, then from the repository root `npx playwright test --config playwright.lab4.config.ts`.

Peer review of issue 3 is pending. The status-control gate (issue 4), dashboards (issue 5) and final hardening (issue 6) are not part of this change.

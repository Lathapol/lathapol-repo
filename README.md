# TokTickIT

A full-stack IT service desk ticketing application, built incrementally across CPE 334 labs.

## Tech Stack
- Frontend: React + TypeScript + Vite + Bootstrap
- Backend: Node.js + Express + TypeScript
- ORM: Prisma (v7, with PrismaPg driver adapter)
- Database: PostgreSQL
- File uploads: Multer
- Testing: Jest + Supertest (backend), Vitest + Testing Library (frontend), Playwright (E2E)

## Prerequisites
- Node.js (v24+)
- PostgreSQL installed and running locally

## Setup

### 1. Clone the repo
```bash
git clone https://github.com/Lathapol/lathapol-repo.git
cd lathapol-repo
```

### 2. Set up the database
Create a PostgreSQL database named `toktickit`.

### 3. Backend setup
```bash
cd server
npm install
cp .env.example .env
# edit .env with your DATABASE_URL
npx prisma generate
# Back up existing data before applying migrations.
npx prisma migrate deploy
# Set LAB3_INITIAL_PASSWORD privately in your shell (12-128 characters).
npm run seed
npm run dev
```
Server runs on http://localhost:4000

### 4. Frontend setup
```bash
cd client
npm install
npm run dev
```
Frontend runs on http://localhost:5173

## Features

### Lab 1 — Full-Stack Foundation
- Health check endpoint and system status UI
- Category list from PostgreSQL

### Lab 2 — Requester Ticketing MVP
- Original development selector (replaced by authenticated accounts in Lab 3)
- Create Ticket with validation and attachment upload
- My Tickets: search, filter, sort, pagination
- Ticket Detail: read-only ticket info, attachment download and soft-removal

## Running Tests

### Backend (Jest + Supertest)
```bash
cd server
npm test -- --runInBand --testTimeout=15000
```

### Frontend (Vitest)
```bash
cd client
npm test
```

### End-to-End (Playwright)
Make sure both the backend and frontend dev servers are running, then from the repo root:
```bash
npx playwright test --config playwright.lab3.config.ts
```

## Project Structure

```text
client/src/          React screens and authenticated API client
client/tests/        Component tests for Labs 1-4
server/src/          Express, auth, requester/staff/admin APIs
server/prisma/       Additive migrations and repeatable seed
server/tests/        Unit, API, authorization and regression tests
e2e/lab-03/          Lab 3 browser scenarios at three viewports
e2e/lab-04/          Lab 4 browser scenarios (actions, resolution, dashboards, accessibility)
docs/lab-03/         Lab 3 specifications, test traceability, reviews, AI-use record
docs/lab-04/         Lab 4 contract, test plan, reviewer and AI-use records
artifacts/lab-03/    Lab 3 screenshots and verification outputs
artifacts/lab-04/    Lab 4 screenshots, migration report and verification outputs
scripts/            Reproducible integrated/migration checks
```



## Lab 3 — Authenticated support workflow

Lab 3 adds cookie sessions and required initial-password replacement, the requester workflow, staff ticket queue/assignment/status/comments/private notes, requester apparent resolution, and administrator account management. Administrators can read tickets but cannot perform staff mutations.

See [local account setup](docs/lab-03/issue-02.md), [API contract](docs/lab-03/api-spec.md), and [integrated verification instructions/results](docs/lab-03/tests.md). Tests now run against the separate `toktickit_lab4_test` database (a superset of the Lab 3 test data), see the Lab 4 section below. `node scripts/verify-lab3.cjs` runs backend/client tests, builds and the desktop/tablet/mobile browser suite against the local test services. This feature branch still requires peer review and final-main verification.


## Lab 4 - Actions Taken, dashboards and final regression

Lab 4 lets IT Staff and Administrators record **Actions Taken** on a ticket (any staff member, not only the owner; the performer and time are set by the server), enforces the **resolution gate** (a ticket cannot become Resolved without at least one action), and adds a **Dashboard** as the landing page for every role (Requester, IT Staff, Administrator). Dashboard numbers are computed by the backend and every card links to the matching filtered list. Requesters see the actions on their own tickets read-only.

Specification, API and UI contracts, the test plan and its traceability are in [docs/lab-04/](docs/lab-04/) (`specification.md`, `api-spec.md`, `ui-spec.md`, `tests.md`).

### Database, migration and seed
```bash
cd server
npx prisma migrate deploy      # additive migration 20260924000000_lab4_actions_taken; Lab 3 data is untouched
# Set LAB3_INITIAL_PASSWORD privately in your shell (12-128 characters), then:
npm run seed                    # idempotent: safe to run repeatedly
```
The seed adds fixture tickets with zero, one and several actions (different performers) and a requester with no tickets, so both non-zero and zero dashboard numbers can be shown. To roll the migration back: `DROP TABLE "ActionTaken"; DROP INDEX "Ticket_updatedAt_idx"; DROP INDEX "Ticket_ownerId_currentStatus_idx";`

### Test database
Tests must run against a separate database named `toktickit_lab4_test` (the Jest guard refuses anything else). Create it as a copy of an existing migrated test database (or run `prisma migrate deploy` and `npm run seed` on an empty one) and point `DATABASE_URL` at it in your shell.

### Running every Lab 4 check
Start the isolated services, then run the integrated verification (backend + client tests, type checks, build, migration check, Lab 4 and Lab 3 browser suites):
```bash
# terminal 1 (server/)      PORT=4103 APP_ORIGIN=http://localhost:5183 npx ts-node src/index.ts
# terminal 2 (client/)      VITE_API_URL=http://localhost:4103 npx vite --port 5183 --strictPort
# terminal 3 (repo root)    node scripts/verify-lab4.cjs
```
Each step's exact command, exit code and log is written to `artifacts/lab-04/verification/`. Browser tests alone: `npx playwright test --config playwright.lab4.config.ts` (Microsoft Edge required).

### Demonstration path
1. Sign in as IT Staff: the **IT Staff Dashboard** shows unassigned/mine counts, status and priority breakdowns, urgent tickets and your recent actions; click a card to open the filtered Ticket Queue.
2. Open a ticket, add an action (follow-up note becomes required when follow-up is ticked), then try **Resolved** on a ticket with no actions to see the gate, and resolve one that has an action.
3. Sign in as the Requester: the **My Dashboard** page and the read-only Actions Taken list on your ticket. Administrators also see user-account counts.

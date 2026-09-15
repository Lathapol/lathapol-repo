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
client/tests/        Component regression and Lab 3 tests
server/src/          Express, auth, requester/staff/admin APIs
server/prisma/       Additive migrations and repeatable seed
server/tests/        Unit, API, authorization and regression tests
e2e/lab-03/          Browser scenarios at three viewports
docs/lab-03/         Specifications, test traceability, reviews, AI-use record
artifacts/lab-03/    Versioned screenshots and verification outputs
scripts/            Reproducible integrated/migration checks
```



## Lab 3 — Authenticated support workflow

Lab 3 adds cookie sessions and required initial-password replacement, the requester workflow, staff ticket queue/assignment/status/comments/private notes, requester apparent resolution, and administrator account management. Administrators can read tickets but cannot perform staff mutations.

See [local account setup](docs/lab-03/issue-02.md), [API contract](docs/lab-03/api-spec.md), and [integrated verification instructions/results](docs/lab-03/tests.md). Use a separate `toktickit_lab3_test` database for tests. `node scripts/verify-lab3.cjs` runs backend/client tests, builds and the desktop/tablet/mobile browser suite against the local test services. This feature branch still requires peer review and final-main verification.

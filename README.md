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
cd toktickit
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
npx prisma migrate dev
npx prisma db seed
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
- Development Requester Selection (temporary testing identity, not real auth)
- Create Ticket with validation and attachment upload
- My Tickets: search, filter, sort, pagination
- Ticket Detail: read-only ticket info, attachment download and soft-removal

## Running Tests

### Backend (Jest + Supertest)
```bash
cd server
npm test
```

### Frontend (Vitest)
```bash
cd client
npm test
```

### End-to-End (Playwright)
Make sure both the backend and frontend dev servers are running, then from the repo root:
```bash
npx playwright test
```

## Project Structure

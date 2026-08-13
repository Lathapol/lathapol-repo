# TokTickIT — Lab 1: Full-Stack Hello World Starter

A tiny full-stack vertical slice proving React → Express → Prisma → PostgreSQL 
all work together, built for CPE 334 Lab 1.

## Tech Stack
- Frontend: React + TypeScript + Vite + Bootstrap
- Backend: Node.js + Express + TypeScript
- ORM: Prisma
- Database: PostgreSQL

## Prerequisites
- Node.js (v24+)
- PostgreSQL installed and running locally

## Setup

### 1. Clone the repo
​```bash
git clone https://github.com/Lathapol/lathapol-repo.git
cd toktickit
​```

### 2. Set up the database
Create a PostgreSQL database named `toktickit`.

### 3. Backend setup
​```bash
cd server
npm install
cp .env.example .env
# edit .env with your DATABASE_URL
npx prisma migrate dev
npx prisma db seed
npm run dev
​```
Server runs on http://localhost:4000

### 4. Frontend setup
​```bash
cd client
npm install
npm run dev
​```
Frontend runs on http://localhost:5173

## Running Tests

### Backend (Supertest)
​```bash
cd server
npm test
​```

### Frontend (Vitest)
​```bash
cd client
npm test
​```
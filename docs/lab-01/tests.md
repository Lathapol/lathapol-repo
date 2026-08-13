# Lab 1 — Test Plan and Evidence

All test files live under server/tests/lab-01/ and client/tests/lab-01/.

| # | Tool | Test | Result |
|---|------|------|--------|
| 1 | Supertest | GET /api/health returns 200, status=ok | Passed |
| 2 | Supertest | GET /api/categories returns 4 seeded categories in id order | Passed |
| 3 | Vitest | TokTickIT heading renders | Passed |
| 4 | Vitest | Success state shows Online + category list | Passed |
| 5 | Vitest | Error state shows Offline + message | Passed |

## Terminal Output

### Server (Supertest) — `npm test` in `server/`
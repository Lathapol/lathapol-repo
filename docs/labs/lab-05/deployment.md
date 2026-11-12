# Lab 5 deployment

## Application and persistent state

TokTickIT uses React/Vite, Express, Prisma 7 with the PostgreSQL driver adapter, and PostgreSQL. The planned GCP stack is Cloud Run, Cloud SQL, Artifact Registry and Secret Manager, with releases through GitHub Actions. Project `vertical-set-514506-g8` is named CPE334 Cache Me if you can. Project number is `389973748230`. The region and resource names will be recorded during the deployment issue.

Sessions, accounts, tickets, workflow history, actions and new attachment bytes are stored in PostgreSQL. Multer buffers each accepted upload in memory, subject to the existing 5 MiB limit. Attachment metadata and bytes commit in the same transaction. Ticket locking retains the five-active-attachment limit. Authorization and soft-removal checks apply to both database and legacy disk downloads.

The additive migration adds nullable `Attachment.content`. Old rows continue to use `UPLOAD_DIRECTORY` until imported. Before moving an existing installation, back up its database and upload folder, apply migrations, and run `npx ts-node prisma/import-attachments.ts` from `server/` on the machine that has those files. The import can be rerun, preserves disk files and metadata, skips already imported rows, and exits unsuccessfully if files are missing. Recover missing files and rerun before deploying. Back up both data sources together to avoid losing pre-Lab-5 attachments.

## Environment variables

| Variable | Purpose | Secret | Value source |
| --- | --- | --- | --- |
| DATABASE_URL | PostgreSQL connection for API, migrations, import and seed | Yes | Local environment or Cloud Run Secret Manager binding |
| APP_ORIGIN | Exact permitted browser origin, including scheme and optional port | No | `http://localhost:5173` locally, public HTTPS UI origin on GCP |
| PORT | HTTP listener, default 4000 | No | Local shell or Cloud Run injected port |
| NODE_ENV | Set production to enable Secure session cookies | No | Runtime environment |
| UPLOAD_DIRECTORY | Legacy attachment import/download directory, defaults to uploads relative to server working directory | No | Local shell during migration of old files |
| LAB3_INITIAL_PASSWORD | Initial demo-account passwords, 12–128 characters, required only when provisioning usable demo accounts | Yes | Private seed-job environment from Secret Manager |
| VITE_API_URL | Public API base URL embedded into the UI at build time | No | Client build environment, localhost API for development or empty for same-origin hosting |

Server placeholders are in `server/.env.example`. Client placeholders are in `client/.env.example`. Real `.env` files are ignored. Vite variables are public and must never hold secrets. Changing VITE_API_URL requires rebuilding the UI. Every production start requires DATABASE_URL and APP_ORIGIN. Keep APP_ORIGIN aligned with the UI URL so origin checks accept legitimate mutations. Production requires HTTPS for cookie authentication.

## Build, migrate, seed and test

Use Node.js 24 and a PostgreSQL server. From the repository root run `npm ci --prefix server` and `npm ci --prefix client`. From `server/`, run `npx prisma generate`, `npx prisma migrate deploy`, and `npm run build`. Supply DATABASE_URL privately before migrations and runtime. Run `npm run seed` with LAB3_INITIAL_PASSWORD set privately when creating demo accounts. Existing passwords and account settings are preserved by the seed. Share demo credentials with the partner team privately.

Run `npm run build` from `client/`. Start the API with `npm start` in `server/`. During development run `npm run dev` in `client/`.

## Docker operation

From the repository root run `docker compose up --build -d --wait`. Open `http://localhost:4000`. The runtime serves both the built UI and API, and the browser uses relative API URLs. Compose starts PostgreSQL, waits for its health check, runs migrations successfully, and then starts the application. `GET /api/ready` checks database connectivity. Database data lives in a named volume. `docker compose down` retains that volume.

Set LAB3_INITIAL_PASSWORD privately in your shell and run `docker compose run --rm -e LAB3_INITIAL_PASSWORD migrate node dist/prisma/seed.js` once to create demo accounts. The seed preserves existing account passwords. Sign in as `jennifer.anderson@example.com`, `staff@example.com`, or `admin@example.com` using the supplied initial password, then complete the required password change. Keep these values out of Git and screenshots.

The Compose database password is a disposable local-only fixture, and the database has no host port. The app binds only to the host loopback address. Compose sets NODE_ENV=development for local HTTP cookies and APP_ORIGIN=http://localhost:4000. For Cloud Run use the image's NODE_ENV=production, the public HTTPS APP_ORIGIN and a Secret Manager database connection.

The Dockerfile uses Node.js 24 and the lockfiles through npm ci. The final runtime runs as the node user with production server dependencies and compiled Prisma client, API and UI. The migration target retains Prisma CLI, migration SQL and compiled seed/import scripts. Build it with `docker build --target migration -t toktickit-migrate .`. Build the runtime with `docker build -t toktickit .`. `.dockerignore` excludes environment files, local uploads, generated clients, build results and node_modules so the container generates its own Linux-compatible Prisma output.

For backend tests use a separate database whose name is exactly `toktickit_lab4_test`. Set DATABASE_URL to that isolated database, apply the migrations, seed fixtures, and run `npm test -- --runInBand --testTimeout=15000` from `server/`. Run `npm test` in `client/` for frontend tests. Existing browser verification instructions are in README.md and docs/lab-04/tests.md.

`GET /api/health` is the public process liveness check. `GET /api/ready` is public and returns 200 only when a PostgreSQL query succeeds, or 503 without connection details when unavailable. Shutdown on SIGTERM/SIGINT closes HTTP connections and then disconnects Prisma.

## Planned release and remaining evidence

Each code issue enters the lab staging branch through a teammate-reviewed PR. The CI issue will add build and automated tests as required checks. A release PR merges staging into main. The deployment issue will add the pipeline that builds the main commit, runs additive migrations in a separate job, deploys the exact image digest and runs a read-only smoke check. Image tags will record the full commit SHA. Record the deploy run, commit, image digest and Cloud Run revision together so the running version can be traced.

GCP region, registry/service/database names, workflow commands and live URL remain pending their implementation issues. Restart/redeploy persistence evidence is collected in issue #76 after deployment. A rollback restores an earlier application image while retaining the database, so migrations must remain additive.

The verified budget has a THB250 amount for 12–22 November 2026 and alerts at 10%, 20%, 50% and 90%. Review the period before it expires. Trial credit and budget screenshots are supplied separately as issue #69 evidence. Keep runtime secrets in Secret Manager and use Workload Identity Federation for the planned pipeline.

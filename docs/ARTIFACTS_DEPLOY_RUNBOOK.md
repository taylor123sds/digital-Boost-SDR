# Deploy Runbook (Deterministic)

## What ships in the container

- Dockerfile copies `src/`, `public/`, `prompts/` into image (baked source).
- Compose mounts only data/logs/creds (no source mount).

## Migrations

- Migrations runner exists: `src/db/migrate.js`.
- Startup validates tables but does not run migrations.

## DB path

- Compose sets `DATABASE_PATH=/app/data/orbion.db`.
- Local default is `./orbion.db` via `src/config/index.js`.

## Proposed deterministic flow

1) Build image tagged by commit SHA.
2) Push image to registry.
3) Deploy compose pointing to that tag.
4) Run migrations as a step (or on boot) against `DATABASE_PATH`.
5) Health check verifies `/api/health` and schema version table `_migrations`.

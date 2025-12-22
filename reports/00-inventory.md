# Inventory

## Repo layout (top-level)
- Root has `apps/`, `src/`, `public/`, `docs/`, `scripts/`, `test/`, `data/`, `uploads/`, and multiple Docker compose files (`docker-compose*.yml`) and `Dockerfile`. Evidence: `reports/ARTIFACTS_TREE.md:12-67` and `reports/ARTIFACTS_TREE.md:56-176`.
- The repo already contains many prior audit artifacts (e.g., `ARTIFACTS_*`, `ARCHITECTURE_*`, `LOCAL_VS_SERVER_ANALYSIS.md`). Evidence: `reports/ARTIFACTS_TREE.md:14-38` and `reports/ARTIFACTS_TREE.md:88-134`.

## Codebase stacks and modules
- Primary backend tree is `src/` with many submodules (API, automation, db, domain, intelligence, etc.). Evidence: `reports/ARTIFACTS_TREE.md:180-254`.
- Parallel stacks exist in `src/scalable/`, `src/platform/`, and `src/v2/`. Evidence: `reports/ARTIFACTS_TREE.md:220-251`.
- Frontend apps are `apps/web-vite/` and `apps/web/` (Next). Evidence: `reports/ARTIFACTS_TREE.md:13` and `reports/ARTIFACTS_TREE.md:258-266`.

## Entrypoints and scripts
- Default start script runs `start-orbion.js`, which spawns `src/server.js`. Evidence: `package.json:7` and `start-orbion.js:154-158`.
- Direct server start is `node src/server.js` via `start:web` / `legacy`. Evidence: `package.json:11` and `package.json:18`.
- Worker entrypoint exists as `src/worker.js` via `start:worker`, but is marked deprecated in its header. Evidence: `package.json:12` and `src/worker.js:1-21`.

## Frontend stacks
- Vite app uses React Router and Vite toolchain. Evidence: `apps/web-vite/package.json:6-35`.
- Next app is explicitly marked deprecated in its package.json. Evidence: `apps/web/package.json:5-6`.

## File counts (JS/TS)
- Repo JS/TS totals from scan: 514 `.js`, 8 `.ts`, 44 `.tsx`, 0 `.jsx` (total 566). Evidence: `reports/ARTIFACTS_INVENTORY_SCAN.md:1-6`.

## Key libraries (backend)
- Backend uses Express, better-sqlite3, node-cron, winston, axios, googleapis, jsonwebtoken. Evidence: `package.json:42-71` and `package.json:50-58`.

## Notes on local vs VPS
- This inventory reflects the local workspace only. Any VPS behavior requires separate verification (no VPS access here).

## Deploy artifacts (local code evidence only)
- Dockerfile builds Vite frontend and copies build to `public/app/`, then runs `node src/server.js`. Evidence: `Dockerfile:9-65` and `Dockerfile:92-93`.
- docker-compose defines separate `leadly` (ROLE=api) and `leadly-worker` (ROLE=worker) services using `orbion-leadly:${GIT_COMMIT:-local}`. Evidence: `docker-compose.yml:114-147` and `docker-compose.yml:185-214`.
- docker-compose mounts `./data` into `/app/data` and sets `DATABASE_PATH=/app/data/orbion.db`. Evidence: `docker-compose.yml:130-133` and `docker-compose.yml:156` (also `docker-compose.yml:203-224`).

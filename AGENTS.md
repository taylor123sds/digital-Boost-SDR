# Repository Guidelines

## Project Structure & Module Organization
- Core code lives in `src/`: APIs in `src/api`, orchestration in `src/server.js`, agents in `src/agents`, automation jobs in `src/automation`, domain logic in `src/domain`, data access in `src/repositories` and `src/db`, and AI helpers in `src/intelligence` and `src/tools`. Shared utilities sit in `src/utils`; `src/v2` holds experiments.
- Static assets are in `public/`; audio and uploads are in `audio/` and `uploads/`. Local SQLite databases stay in the repo root (`orbion.db*`).
- Integration and regression scripts live in `test/` (e.g., `test/test_v2_modules.js`, `test-*.js`) using a lightweight Node runner.

## Build, Test, and Development Commands
- `npm start` / `npm run start:3000` / `npm run start:3001` — start the orchestrator via `start-orbion.js`; use `start:force` if a stale pid lingers.
- `npm run migrate` / `npm run migrate:status` — run or inspect SQLite migrations in `src/db/migrate.js` before booting services.
- `npm run lint` / `npm run lint:fix` and `npm run lint:v2` — lint the main and v2 trees via `eslint.config.js`.
- `npm run format` / `npm run format:check` — enforce Prettier on `src/**/*.js`.
- `npm test` — execute `test/test_v2_modules.js`; `npm run test:sheets` and `npm run test:sync` cover Google Sheets sync flows.
- `npm run backup`, `backup:list`, `backup:restore` — manage local SQLite backups via `scripts/backup_database.js`.

## Coding Style & Naming Conventions
- Use ES modules, 2-space indentation, and trailing commas where Prettier applies. Favor explicit exports and domain-focused filenames (`LeadService.js`, `AbandonmentDetectionJob.js`).
- Keep configuration isolated in `src/config` and avoid cross-layer imports that bypass domain boundaries. Log through `utils/logger.enhanced.js` instead of `console`.

## Testing Guidelines
- Place scenario scripts in `test/` with the `test-*.js` prefix; keep helper assertions inline for readability.
- Run `DEBUG=1 npm test` to print full stacks when diagnosing failures. Prefer deterministic fixtures (local SQLite, stubbed Sheets data) over network-dependent calls.
- Cover new agents and automation jobs with at least one positive and one failure-path check in the Node test harness before opening a PR.

## Commit & Pull Request Guidelines
- Follow the existing Conventional Commit pattern (`feat:`, `fix:`, `chore:`, `docs:`). Keep subjects in English and under ~72 characters.
- For PRs, include: purpose + scope summary, manual test notes with commands executed, migration or data impacts, and any config/env variables touched. Attach screenshots or logs when changing user-facing flows or long-running jobs.
- Avoid committing secrets (`.env`, `google_credentials.json`, tokens); use the sample files for local setup instead.

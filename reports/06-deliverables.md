# Deliverables (executive summary, action plan, validation)

## Executive summary (evidence-backed)

### P0 (highest risk)
- **Duplicate MESSAGE_PROCESS processors**: worker starts `startWebhookJobProcessor()` (AsyncJobsService processor) and also starts `asyncJobsService.startProcessor()` for `JobType.MESSAGE_PROCESS`. Evidence: `src/api/routes/webhook.routes.js:909-945` and `src/server.js:370-418`.
- **Deploy drift risk if migrations aren’t executed**: production boot only validates schema and exits on drift; migrations must be run in deploy. Evidence: `src/server.js:176-208` and `src/db/migrate.js:447-479`.

### P1 (user-visible / contract breaks)
- **FE↔BE contract mismatches** (404 risk): multiple frontend endpoints have no backend route match. Evidence: `reports/ARTIFACTS_FRONT_BACK_CONTRACT.md:15-48`.
- **Method mismatch**: Vite fetches `/api/whatsapp/send` as GET, while backend expects POST. Evidence: `reports/ARTIFACTS_FRONT_BACK_CONTRACT.md:33` and `reports/ARTIFACTS_ROUTE_SCAN.md:307`.
- **Automation Engine runs in API process** (jobs not fully isolated): startServer initializes AutomationEngine in API runtime. Evidence: `src/config/server.startup.js:33-52` and `src/server.js:284-321`.

### P2 (architecture/maintainability)
- **Parallel stacks coexist** (`src/`, `src/scalable/`, `src/platform/`, `src/v2/`) with only `src/` wired by `server.js`. Evidence: `reports/ARTIFACTS_TREE.md:180-251` and `src/server.js:26-88`.
- **EarlyDeduplicator exists but is not wired in canonical inbound route** (currently relies on DB idempotency). Evidence: `src/utils/EarlyDeduplicator.js:1-176` and `src/api/routes/webhooks-inbound.routes.js:15-119`.

## Action plan (minimize regressions)
1) **Resolve duplicate MESSAGE_PROCESS processors**: choose one processor entrypoint (either `startWebhookJobProcessor` or the `asyncJobsService.startProcessor` block in `server.js`), remove the other, and confirm only one worker path is active. Evidence: `src/api/routes/webhook.routes.js:909-945` and `src/server.js:370-418`.
2) **Fix FE↔BE mismatches**: either add backend routes for missing FE endpoints, or update FE to use the existing backend routes. Use `reports/ARTIFACTS_FRONT_BACK_CONTRACT.md` as the checklist. Evidence: `reports/ARTIFACTS_FRONT_BACK_CONTRACT.md:15-48`.
3) **Finish API/worker separation**: move AutomationEngine start to worker-only if the goal is strict isolation. Evidence: `src/config/server.startup.js:33-52`.
4) **Enforce deploy-migrate discipline**: ensure migrations are run before production boot or in deploy step; production boot fails on drift. Evidence: `src/server.js:176-208` and `src/db/migrate.js:447-479`.

## Validation checklist
- **Backend**: `npm run lint` and `npm test` (per `package.json:25-35`). Evidence: `package.json:25-35`.
- **Routes**: spot-check FE endpoints with `curl` against `/api/*` paths listed in `reports/ARTIFACTS_FRONT_BACK_CONTRACT.md`.
- **Webhook pipeline**: POST a sample payload to `/api/webhooks/inbound/:webhookPublicId` and ensure `async_jobs` gets a MESSAGE_PROCESS job. Evidence: `src/api/routes/webhooks-inbound.routes.js:29-119` and `src/services/AsyncJobsService.js:66-111`.
- **Job processors**: verify only one MESSAGE_PROCESS processor is running in worker logs. Evidence: `src/api/routes/webhook.routes.js:909-945` and `src/server.js:370-418`.
- **Migrations**: run `node src/db/migrate.js` and ensure `_migrations` is populated; production boot should pass `validateSchemaOrFail`. Evidence: `src/db/migrate.js:160-219` and `src/db/migrate.js:447-479`.

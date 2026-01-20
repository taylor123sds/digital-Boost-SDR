# All Findings Checklist (P0/P1/P2/P3)

This checklist consolidates findings from all generated artifacts.
Each item includes: severity, impact, evidence, and suggested action.

## P0 (Critical)

- [ ] **Webhook public inbound drops Evolution messages**
  - Impact: inbound messages never reach processing when Evolution points to `/api/webhooks/inbound/:webhookPublicId`.
  - Evidence: `src/api/routes/webhooks-inbound.routes.js:154` (no forward to pipeline).
  - Action: route `MESSAGES_UPSERT` to main pipeline (`/api/webhook/evolution` handler).

- [ ] **Webhook active path uses in-memory queue/locks (no persistence)**
  - Impact: restarts drop messages; no durable retries.
  - Evidence: `src/api/routes/webhook.routes.js:50`; staging exists but not wired (`src/services/InboundEventsService.js:51`, `src/services/AsyncJobsService.js:73`).
  - Action: cut over to `inbound_events` + `async_jobs` in the active webhook path.

- [ ] **Deploy drift (baked image, no source mount)**
  - Impact: production can run stale code.
  - Evidence: `Dockerfile:23`, `docker-compose.yml:114`.
  - Action: build/tag per commit and redeploy (or mount source in non-prod).

- [ ] **Migrations not executed on startup**
  - Impact: schema drift causes runtime failures.
  - Evidence: `src/server.js:131`, `src/db/migrate.js` not invoked.
  - Action: run migrations at boot; fail hard on error.

- [ ] **Tenant filter missing in webhook transaction path**
  - Impact: cross-tenant data leakage or wrong updates.
  - Evidence: `src/handlers/WebhookTransactionManager.js:65`.
  - Action: resolve tenant from integration; enforce tenant filter on reads/writes.

## P1 (High)

- [ ] **Frontend (web-vite) Evolution connect uses invalid agentId**
  - Impact: connection fails or binds to non-existent agent.
  - Evidence: `apps/web-vite/src/pages/Integrations.tsx:187` uses `/api/agents/default/...`.
  - Action: pass real agentId from UI and align with backend route `/api/agents/:agentId/...`.

- [ ] **Frontend (web-vite) uses legacy Evolution QR/status endpoints**
  - Impact: QR/status polling fails.
  - Evidence: `apps/web-vite/src/pages/AgentDetail.tsx:299`, `apps/web-vite/src/pages/AgentDetail.tsx:319`.
  - Action: update UI to `/api/agents/:agentId/channels/evolution/*`.

- [ ] **Frontend (web-vite) checks `/api/whatsapp/status` (missing route)**
  - Impact: integration status always appears disconnected.
  - Evidence: `apps/web-vite/src/pages/Integrations.tsx:136`.
  - Action: switch to `/api/agents/:agentId/channels/evolution/status`.

- [ ] **Frontend (apps/web) expects endpoints not present in backend**
  - Impact: Next app shows empty data/errors.
  - Evidence: `apps/web/src/lib/api.ts:45`, `apps/web/src/lib/api.ts:74`.
  - Action: align Next app API paths with backend or add API shims.

- [ ] **OAuth token encryption fallback is weak**
  - Impact: tokens could be decrypted if default key used.
  - Evidence: `src/services/IntegrationOAuthService.js:12`.
  - Action: require `INTEGRATION_ENCRYPTION_KEY` and remove default fallback.

## P2 (Medium)

- [ ] **Dual outbound paths to Evolution (tools vs adapter)**
  - Impact: inconsistent retry/metrics and subtle behavior differences.
  - Evidence: `src/tools/whatsapp.js:157`, `src/infrastructure/adapters/WhatsAppAdapter.js:40`.
  - Action: consolidate on a single send path.

- [ ] **Multiple runtime stacks (legacy/platform/scalable)**
  - Impact: unclear active routes and schema; harder maintenance.
  - Evidence: `src/api/routes/*`, `src/platform/api/routes/*`, `src/scalable/*`.
  - Action: document active stack and deprecate inactive ones.

- [ ] **Duplicate/overriding routes**
  - Impact: handler order can change behavior across environments.
  - Evidence: `ARTIFACTS_BACKEND_API_MAP.md` (duplicate method+path list).
  - Action: remove duplicates or merge handlers.

- [ ] **Observability fragmented (console vs logger)**
  - Impact: incomplete telemetry; hard incident debugging.
  - Evidence: `ARTIFACTS_OBSERVABILITY_MAP.md`.
  - Action: standardize on logger with correlation ids.

- [ ] **Jobs started in both server and worker**
  - Impact: duplicate job execution.
  - Evidence: `ARTIFACTS_JOBS_SCHEDULE.md`.
  - Action: run background jobs only in worker process.

- [ ] **CRM inbound webhooks not implemented**
  - Impact: CRM events ignored.
  - Evidence: `src/api/routes/webhooks-inbound.routes.js:173`.
  - Action: implement provider-specific webhook handlers.

- [ ] **Google Calendar token storage is file-based**
  - Impact: unclear tenant isolation; operational fragility.
  - Evidence: `src/api/routes/google/calendar.routes.js:45`.
  - Action: move token storage to DB keyed by tenant.

## P3 (Lower)

- [ ] **Environment defaults can create wrong webhook URLs**
  - Impact: webhook points to localhost in prod if `PUBLIC_BASE_URL` not set.
  - Evidence: `src/services/IntegrationService.js:400`.
  - Action: require `PUBLIC_BASE_URL` in production.

- [ ] **Contract drift between front and backend**
  - Impact: silent UI failures.
  - Evidence: `ARTIFACTS_FRONT_BACK_CONTRACT.md`.
  - Action: create a shared API contract or typed client.

- [ ] **Hot tables may need more tenant+date indexes**
  - Impact: SQLite slowdowns at scale.
  - Evidence: `ARTIFACTS_HOT_TABLES_INDEXES.md`.
  - Action: add composite indexes on hot read paths.


# Risks and Blockers (P0/P1/P2)

## P0

- **Evolution inbound via webhook public ID drops messages.**
  Evidence: `src/api/routes/webhooks-inbound.routes.js:154` logs `MESSAGES_UPSERT` and returns without forwarding to the main pipeline.
  Impact: inbound messages never reach processing when Evolution points to `/api/webhooks/inbound/:webhookPublicId`.
  Suggested fix: forward `MESSAGES_UPSERT` to the same handler used by `/api/webhook/evolution`.

- **Webhook processing still uses in-memory queue/locks (no persistence).**
  Evidence: `src/api/routes/webhook.routes.js:50` uses `MessageQueue` and `ContactLockManager`; staging/async jobs exist but are not wired (`src/services/InboundEventsService.js:51`, `src/services/AsyncJobsService.js:73`).
  Impact: restarts drop in-flight messages and retries are not durable.
  Suggested fix: cut over to `inbound_events` + `async_jobs` for the active webhook path.

- **Deploy drift risk: source baked into image, not mounted.**
  Evidence: `Dockerfile:23` copies `src/` into image; `docker-compose.yml:114` does not mount source.
  Impact: VPS runs stale code if image not rebuilt/tagged per commit.
  Suggested fix: build/tag per commit and redeploy, or mount source in non-prod.

- **Migrations are not run at startup.**
  Evidence: `src/server.js:131` only validates tables and warns; `src/db/migrate.js` not invoked.
  Impact: schema drift between environments leads to runtime failures.
  Suggested fix: run `runMigrations()` at boot and fail hard on error.

- **Webhook SQL touches multi-tenant data without tenant filter.**
  Evidence: `src/handlers/WebhookTransactionManager.js:65` queries `leads` by phone without tenant filter.
  Impact: cross-tenant data leakage or updates to wrong tenant.
  Suggested fix: resolve tenant from integration and enforce tenant filter on reads/writes.

## P1

- **Frontend (web-vite) Evolution connect endpoints do not match backend API.**
  Evidence: frontend uses `/api/agents/default/channels/evolution/connect` in `apps/web-vite/src/pages/Integrations.tsx:187`, but backend expects `/api/agents/:agentId/channels/evolution/connect` in `src/api/routes/channels.routes.js:23`.
  Impact: dashboard connect flow may fail or connect a non-existent agent.
  Suggested fix: pass real `agentId` from UI and align endpoints.

- **Frontend (web-vite) uses legacy Evolution status/QR endpoints not present in backend.**
  Evidence: `/api/agents/evolution/qrcode` and `/api/agents/evolution/status/:instance` in `apps/web-vite/src/pages/AgentDetail.tsx:299` and `apps/web-vite/src/pages/AgentDetail.tsx:319`; backend routes are under `/api/agents/:agentId/channels/evolution/*`.
  Impact: QR/status polling likely fails.
  Suggested fix: update UI to call channel routes.

- **Frontend (web-vite) checks `/api/whatsapp/status` which is not defined.**
  Evidence: `apps/web-vite/src/pages/Integrations.tsx:136`.
  Impact: integration status may always appear disconnected.
  Suggested fix: switch to `/api/agents/:agentId/channels/evolution/status`.

- **Frontend (apps/web) API expectations do not match backend routes.**
  Evidence: `/api/dashboard/stats` and `/api/leads` in `apps/web/src/lib/api.ts:45` and `apps/web/src/lib/api.ts:74` are not defined in `src/api/routes/*`.
  Impact: Next app will show empty states or errors unless API shim exists.
  Suggested fix: align Next app endpoints with existing backend routes (e.g., `/api/funil/*`, `/api/command-center/*`).

- **OAuth token encryption uses JWT_SECRET fallback / default key.**
  Evidence: `src/services/IntegrationOAuthService.js:12` uses `JWT_SECRET` substring or hardcoded default.
  Impact: tokens can be decrypted if default key is unchanged.
  Suggested fix: require `INTEGRATION_ENCRYPTION_KEY` in env.

## P2

- **Dual outbound paths to Evolution (adapter vs tools).**
  Evidence: `src/tools/whatsapp.js:157` sends via fetch; `src/infrastructure/adapters/WhatsAppAdapter.js:40` sends via axios.
  Impact: inconsistent behavior, retry logic, and metrics.
  Suggested fix: consolidate on one send path.

- **Multiple runtime stacks (legacy vs scalable/platform).**
  Evidence: parallel routes under `src/api/routes/*`, `src/platform/api/routes/*`, and `src/scalable/*`.
  Impact: ambiguity about which runtime is active and which schema is canonical.
  Suggested fix: document and deprecate the inactive stack.


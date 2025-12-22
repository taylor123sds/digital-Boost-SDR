# Webhook pipeline (inbound → staging → queue → worker → processing)

## Entry points
- Legacy endpoint `/api/webhook/evolution` is hard-cutover and returns 410 Gone. Evidence: `src/api/routes/webhook.routes.js:6-106`.
- Canonical entrypoint is `POST /api/webhooks/inbound/:webhookPublicId`. Evidence: `src/api/routes/webhooks-inbound.routes.js:23-29`.

## Validation
- Canonical inbound route validates secrets/tokens/signatures via IntegrationService.validateWebhook. Evidence: `src/api/routes/webhooks-inbound.routes.js:38-46` and `src/services/IntegrationService.js:591-725`.

## Staging and idempotency
- Canonical inbound route stages payloads in `inbound_events` and checks duplicates. Evidence: `src/api/routes/webhooks-inbound.routes.js:85-97`.
- Staging uses `INSERT ... ON CONFLICT(provider, provider_event_id)` in InboundEventsService for idempotency. Evidence: `src/services/InboundEventsService.js:63-72`.
- `inbound_events` table has a unique index on `(provider, provider_event_id)` for idempotency. Evidence: `src/db/migrations/031_inbound_events.sql:41-44`.

## Queueing
- Canonical inbound enqueues MESSAGE_PROCESS jobs into `async_jobs`, with tenantId/contactId/priority. Evidence: `src/api/routes/webhooks-inbound.routes.js:99-119`.
- `async_jobs` table schema and indexes support priority, retries, contact locking. Evidence: `src/db/migrations/032_async_jobs.sql:22-77`.

## Processing
- Worker job processor is defined in `startWebhookJobProcessor()` and processes MESSAGE_PROCESS jobs using `processWebhook`. Evidence: `src/api/routes/webhook.routes.js:901-946`.
- `processWebhook` calls `webhookHandler.handleWebhook()` and centralizes response sending. Evidence: `src/api/routes/webhook.routes.js:141-168`.
- The canonical job handler `processMessageJob()` wraps `webhookHandler.handleWebhook()` for async jobs. Evidence: `src/handlers/webhook_handler.js:633-659`.
- `webhookHandler.isMessageEvent()` accepts `messages.upsert` (including `MESSAGES_UPSERT` format) and `messages.update` with payload. Evidence: `src/handlers/webhook_handler.js:433-459`.

## MESSAGES_UPSERT coverage
- Canonical inbound route normalizes event names and treats `messages.*` as high priority. Evidence: `src/api/routes/webhooks-inbound.routes.js:73-101`.
- Message handler explicitly accepts `messages.upsert` after normalization. Evidence: `src/handlers/webhook_handler.js:433-440`.

## Deduplication layers (what exists vs wired)
- DB-level idempotency is wired via `inbound_events` unique constraint and staging on conflict. Evidence: `src/db/migrations/031_inbound_events.sql:41-44` and `src/services/InboundEventsService.js:63-72`.
- EarlyDeduplicator exists in code, but canonical inbound route does not import or invoke it. Evidence: `src/utils/EarlyDeduplicator.js:1-176` and inbound route imports only IntegrationService/InboundEvents/AsyncJobs. Evidence: `src/api/routes/webhooks-inbound.routes.js:15-20`.
- `webhook_handler` comments assume dedup happened earlier, but no explicit EarlyDeduplicator call is wired in the canonical inbound route. Evidence: `src/handlers/webhook_handler.js:100-102` and `src/api/routes/webhooks-inbound.routes.js:15-119`.

## Retry/timeout handling
- Inbound events are marked processing/processed/error to support retries and backoff. Evidence: `src/services/InboundEventsService.js:121-233`.
- AsyncJobsService retries failed jobs and recovers timeouts. Evidence: `src/services/AsyncJobsService.js:486-505`.

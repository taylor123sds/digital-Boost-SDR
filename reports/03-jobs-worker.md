# Jobs and worker processing

## Jobs started by ROLE=worker (server.js)
- Cadence Engine initialization (schedules cron jobs in CadenceEngine). Evidence: `src/server.js:329-334` and `src/automation/CadenceEngine.js:90-148`.
- Prospecting Engine auto-start (also sets up a minute-based scheduler inside the engine). Evidence: `src/server.js:336-352` and `src/automation/ProspectingEngine.js:192-205`.
- Abandonment Detection job (setInterval every hour). Evidence: `src/server.js:354-357` and `src/services/AbandonmentDetectionJob.js:62-80`.
- DataSyncService (cron schedules nightly/6h/hourly retry). Evidence: `src/server.js:359-363` and `src/services/DataSyncService.js:47-80`.
- OAuth refresh job (setInterval). Evidence: `src/server.js:365-368` and `src/services/IntegrationOAuthRefreshJob.js:60-73`.
- Webhook job processor (AsyncJobsService startProcessor in webhook.routes). Evidence: `src/server.js:370-373` and `src/api/routes/webhook.routes.js:909-946`.
- Prospect Sync job (cron every 30 minutes). Evidence: `src/server.js:375-381` and `src/services/ProspectSyncJob.js:64-96`.
- AutoOptimizer (background loop inside the service). Evidence: `src/server.js:383-387` and `src/intelligence/AutoOptimizer.js:71-187`.
- AsyncJobsService processor for MESSAGE_PROCESS (canonical pipeline). Evidence: `src/server.js:389-418` and `src/services/AsyncJobsService.js:468-520`.

## Jobs started by ROLE=api (server.startup)
- Automation Engine is started inside `startServer`, which runs when API starts. Evidence: `src/config/server.startup.js:33-52`.
- Automation Engine schedules cron jobs for `trigger.type === 'schedule'`. Evidence: `src/automation/engine.js:114-146`.

## Queue/worker responsibilities
- Jobs are enqueued into `async_jobs` via `AsyncJobsService.enqueue()` (e.g., webhook inbound). Evidence: `src/services/AsyncJobsService.js:66-111` and `src/api/routes/webhooks-inbound.routes.js:102-119`.
- Jobs are dequeued and processed in `AsyncJobsService.startProcessor()`. Evidence: `src/services/AsyncJobsService.js:468-520`.

## Duplication risks (code wiring)
- Two processors for `JobType.MESSAGE_PROCESS` are started in the worker block: `startWebhookJobProcessor()` and an explicit `asyncJobsService.startProcessor()` call in server.js. Evidence: `src/api/routes/webhook.routes.js:909-945` and `src/server.js:370-418`.
- Automation Engine is started inside the API process (not worker-only). Evidence: `src/config/server.startup.js:33-52` and `src/server.js:284-321`.

## Retries, locking, and DLQ
- AsyncJobsService retries failures via `fail()` (backoff) and reschedules via `getJobsForRetry()` / `resetForRetry()` inside `startProcessor()`. Evidence: `src/services/AsyncJobsService.js:204-233` and `src/services/AsyncJobsService.js:486-505`.
- Contact-level locking is enforced by the `UPDATE ... WHERE contact_id NOT IN (processing...)` clause. Evidence: `src/services/AsyncJobsService.js:136-157`.
- No explicit dead-letter queue exists; failed jobs remain in `async_jobs` with `status='failed'` and `retry_count` logic. Evidence: `src/services/AsyncJobsService.js:204-227`.

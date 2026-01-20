# Integrations Map

## Evolution (WhatsApp)

**Entry points**
- One-click connect: `POST /api/agents/:agentId/channels/evolution/connect` in `src/api/routes/channels.routes.js:23`.
- Status: `GET /api/agents/:agentId/channels/evolution/status` in `src/api/routes/channels.routes.js:73`.
- QR code: `GET /api/agents/:agentId/channels/evolution/qrcode` in `src/api/routes/channels.routes.js:127`.
- Inbound webhooks (core): `POST /api/webhook/evolution` in `src/api/routes/webhook.routes.js:50`.
- Inbound webhooks (multi-tenant public ID): `POST /api/webhooks/inbound/:webhookPublicId` in `src/api/routes/webhooks-inbound.routes.js:20`.

**Authentication**
- Evolution API key via `apikey` header in `src/infrastructure/adapters/WhatsAppAdapter.js:25`.
- Webhook secret via `X-Webhook-Secret` in `src/api/routes/webhooks-inbound.routes.js:25` and validation in `src/services/IntegrationService.js:548`.

**Tables used**
- `integrations`, `integration_bindings`, `inbound_events`, `async_jobs`, `whatsapp_messages` (see migrations in `src/db/migrations/025_multi_tenancy.sql`, `src/db/migrations/031_inbound_events.sql`, `src/db/migrations/032_async_jobs.sql`).

**Flow (setup → use → status)**
- Setup: `IntegrationService.connectEvolutionForAgent()` creates integration and binding, then calls provider and sets webhook URL. `src/services/IntegrationService.js:291`.
- Use: inbound webhooks flow through `src/api/routes/webhook.routes.js:50` → `src/handlers/webhook_handler.js:56` → `src/middleware/MessagePipeline.js`.
- Status: `IntegrationService.getConnectionStatus()` queries Evolution state. `src/services/IntegrationService.js:445`.

**Gaps / notes**
- Public inbound route does not forward Evolution `MESSAGES_UPSERT` to the main pipeline. `src/api/routes/webhooks-inbound.routes.js:154`.
- Outbound sends are implemented in both `src/tools/whatsapp.js` (fetch) and `src/infrastructure/adapters/WhatsAppAdapter.js` (axios); dual paths can diverge.

---

## Google OAuth / Calendar

**Entry points**
- Auth URL: `GET /api/google/auth-url` in `src/api/routes/google/calendar.routes.js:27`.
- OAuth redirect: `GET /auth/google` in `src/api/routes/google/calendar.routes.js:81`.
- OAuth callback: `GET /oauth2callback` in `src/api/routes/google/calendar.routes.js:96`.
- Calendar CRUD: `/api/events` in `src/api/routes/google/calendar.routes.js:127`.

**Authentication**
- OAuth token stored in local file `google_token.json` (path from env). `src/api/routes/google/calendar.routes.js:45`.

**Tables used**
- None directly in routes; token file on disk.

**Flow**
- UI redirects to `/auth/google` → Google OAuth → `/oauth2callback` → token stored. `src/tools/calendar_enhanced.js` is the handler (imported lazily in `src/api/routes/google/calendar.routes.js:11`).

**Gaps / notes**
- Token storage is file-based, not per-tenant; multi-tenant isolation is unclear.

---

## Google Sheets

**Entry points**
- Sheets endpoints: `src/api/routes/google/sheets.routes.js` (e.g., `/api/leads`).
- Background sync jobs: `src/services/ProspectSyncJob.js` initialized in `src/server.js:248`.

**Authentication**
- Service account credentials file `google_credentials.json` mounted in Docker. `docker-compose.yml:128`.

**Tables used**
- `leads`, `prospects`, `pipeline` (via sync jobs).

**Gaps / notes**
- Sync depends on job schedule; no global health endpoint for sync status.

---

## CRMs (Kommo/HubSpot/Pipedrive)

**Entry points**
- OAuth start: `GET /api/integrations/crm/:provider/oauth/start` in `src/api/routes/crm-integration.routes.js:26`.
- OAuth callback: `GET /api/integrations/oauth/callback/:provider` in `src/api/routes/crm-integration.routes.js:119`.
- Inbound webhooks (multi-tenant): `POST /api/webhooks/inbound/:webhookPublicId` in `src/api/routes/webhooks-inbound.routes.js:20`.

**Authentication**
- OAuth state stored in DB (`oauth_states`), tokens encrypted in `integrations.config_json`.
  Evidence: `src/services/IntegrationOAuthService.js:45` and `src/services/IntegrationOAuthService.js:127`.

**Tables used**
- `integrations`, `oauth_states`, `integration_bindings` (see `src/db/migrations/030_crm_integration.sql`).

**Flow**
- OAuth state generation → provider auth → callback → token stored. `src/services/IntegrationOAuthService.js:45`.

**Gaps / notes**
- CRM webhook processing is TODO. `src/api/routes/webhooks-inbound.routes.js:173`.

---

## OpenAI

**Entry points**
- Client created via DI container in `src/config/di-container.js:247`.
- Used in agents/pipeline via `src/core/openai_client.js` and adapters.

**Authentication**
- API key from env `OPENAI_API_KEY`. `src/config/index.js:138`.

**Tables used**
- Indirect: `agents`, `messages`, `conversations` (via pipeline/handlers).

**Gaps / notes**
- No per-tenant rate limit enforced at OpenAI client level; enforcement is at middleware/services.


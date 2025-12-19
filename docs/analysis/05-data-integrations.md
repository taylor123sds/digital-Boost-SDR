# ETAPA 5 — Dados e Integracoes

## 1) Tabelas e migrations (SQLite)

- Migrations estao em `src/db/migrations/` e incluem tabelas de CRM (accounts, contacts, leads, opportunities), mensagens, usuarios, teams, integracoes e jobs. Evidencia: `src/db/migrations/001_create_accounts.sql` ate `src/db/migrations/038_add_users_preferences_column.sql`.
- Staging e jobs persistentes existem: `inbound_events` (idempotencia e retry) e `async_jobs`. Evidencia: `src/db/migrations/031_inbound_events.sql` e `src/db/migrations/032_async_jobs.sql`.
- Multi-tenancy foi adicionada por migration dedicada. Evidencia: `src/db/migrations/025_multi_tenancy.sql`.

## 2) Integracao Evolution (WhatsApp)

- One-click connect (dashboard) usa `IntegrationService.connectEvolutionForAgent`, que cria integration, binding, instancia Evolution e configura webhook publico. Evidencia: `src/services/IntegrationService.js:291-415`.
- Evolution Provider faz create/connect/get status e configura eventos (inclui `MESSAGES_UPSERT`). Evidencia: `src/providers/EvolutionProvider.js:70-132` e `src/providers/EvolutionProvider.js:158-205`.
- Endpoints de dashboard para Evolution estao em `src/api/routes/channels.routes.js`. Evidencia: `src/api/routes/channels.routes.js:23-181`.

Status funcional (codigo):
- Existe fluxo completo backend para conectar Evolution e obter QR code.
- A funcao de webhook multi-tenant valida secret via header `X-Webhook-Secret`. Evidencia: `src/services/IntegrationService.js:586-654`.
- Risco atual: `MESSAGES_UPSERT` no webhook multi-tenant nao encaminha para o pipeline principal. Evidencia: `src/api/routes/webhooks-inbound.routes.js:154-162`.

## 3) Integracoes CRM (Kommo, HubSpot, Pipedrive)

- OAuth start/callback e disconnect estao em `src/api/routes/crm-integration.routes.js`. Evidencia: `src/api/routes/crm-integration.routes.js:22-222`.
- Kommo possui provider real; HubSpot/Pipedrive estao com TODO no token exchange. Evidencia: `src/api/routes/crm-integration.routes.js:175-181`.

## 4) Google OAuth / Calendar

- Rotas de Google auth e calendar existem em `src/api/routes/google/calendar.routes.js` (montadas no router principal). Evidencia: `src/api/routes/index.js:20-22` e `src/api/routes/index.js:71-72`.

## 5) OpenAI

- Cliente OpenAI e resolvido via DI no boot. Evidencia: `src/server.js:150-152`.
- Uso detalhado esta em `src/intelligence/` e `src/agents/` (nao expandido aqui).

## 6) Integracoes no frontend (estado atual)

- Vite Integrations page chama `/api/integrations` (ok), mas consulta `/api/whatsapp/status` que nao existe no backend. Evidencia: `apps/web-vite/src/pages/Integrations.tsx:120-141`.
- Evolution connect no frontend depende de `agentId` valido. Endpoint correto existe no backend, mas o front usa `default` como id. Evidencia: `apps/web-vite/src/pages/Integrations.tsx:183-209` e `src/api/routes/channels.routes.js:23-57`.
- AgentDetail usa endpoints inexistentes (`/api/agents/evolution/qrcode`). Evidencia: `apps/web-vite/src/pages/AgentDetail.tsx:294-333`.

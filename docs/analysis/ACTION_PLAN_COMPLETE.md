# Action Plan Completo — Todas as Correcoes Mapeadas

Baseado nos artefatos e resumos em `docs/analysis/`, incluindo:
- `docs/analysis/ARTIFACTS_RISKS_AND_BLOCKERS.md`
- `docs/analysis/ARTIFACTS_FE_BE_CONTRACT_DIFF.md`
- `docs/analysis/ARTIFACTS_DB_SCHEMA_AND_QUERIES.md`
- `docs/analysis/ARTIFACTS_MULTITENANT_AUDIT_REAL.md`

## P0 — Quebra/risco alto

1) Webhook multi-tenant: `MESSAGES_UPSERT` nao entra no pipeline
- Corrigir `webhooks-inbound.routes.js` para encaminhar eventos processaveis ao pipeline canonico (staging + async_jobs).
- Evidencia: `src/api/routes/webhooks-inbound.routes.js:154-162`.

2) Cutover de webhook (legacy vs multi-tenant)
- Definir um unico endpoint Evolution ativo e desativar o outro para evitar mensagens fora do pipeline.
- Evidencia: `src/api/routes/index.js:61-103`.

3) Frontend Evolution com endpoints inexistentes
- Corrigir chamadas no Vite: AgentDetail usa endpoints sem `:agentId`.
- Evidencia: `apps/web-vite/src/pages/AgentDetail.tsx:294-333` vs `src/api/routes/agents.routes.js:586-623`.

4) `agentId` default no front quebra conexao
- Integrations usa `default` como id; deve usar um agent real.
- Evidencia: `apps/web-vite/src/pages/Integrations.tsx:183-209`.

5) Ponto de entrada externo sem pipeline persistente
- Garantir que webhook externo sempre grava `inbound_events` e cria `async_jobs`.
- Evidencia: `src/db/migrations/031_inbound_events.sql`, `src/services/AsyncJobsService.js:73-174`.

## P1 — Estabilidade e consistencia

6) Duplicidade de rota `/api/agents/my`
- Remover duplicata para evitar override silencioso.
- Evidencia: `src/api/routes/agents.routes.js:181-202` e `src/api/routes/agents.routes.js:344-365`.

7) Jobs duplicados (server vs worker)
- Isolar jobs no worker ou criar flag para desativar no server.
- Evidencia: `src/server.js:207-288`, `src/worker.js:138-195`.

8) CRM OAuth incompleto (HubSpot/Pipedrive)
- Implementar token exchange, storage e revoke.
- Evidencia: `src/api/routes/crm-integration.routes.js:175-181`.

9) Contrato FE ↔ BE inconsistente
- Ajustar endpoints faltantes e duplicados (rotas que o frontend chama e o backend nao expõe).
- Evidencia: `docs/analysis/ARTIFACTS_FE_BE_CONTRACT_DIFF.md`.

10) Multi-tenancy com queries sem filtro
- Revisar queries listadas e adicionar filtro por `tenant_id`/`team_id` onde aplicavel.
- Evidencia: `docs/analysis/ARTIFACTS_MULTITENANT_AUDIT_REAL.md`.

## P2 — Qualidade e manutencao

11) Locks em memoria coexistem com fila persistente
- Remover EarlyDeduplicator/ContactLockManager quando async_jobs estiver estavel.
- Evidencia: `src/api/routes/webhook.routes.js:134-196`.

12) Duas apps frontend com bases diferentes
- Definir app oficial e ajustar build/serving (Vite `/app` vs Next `/`).
- Evidencia: `apps/web-vite/src/App.tsx:80-111`, `apps/web/src/lib/api.ts:1-49`.

13) Observabilidade parcial
- Incluir correlation id (request/job/event) nas rotas e jobs criticos.
- Evidencia: `docs/analysis/ARTIFACTS_OBSERVABILITY_MAP.md`.

14) Indices faltantes em tabelas quentes
- Adicionar indices em tabelas de mensagens/conversas/leads conforme mapa de hot tables.
- Evidencia: `docs/analysis/ARTIFACTS_HOT_TABLES_INDEXES.md`.

15) Segredos em plaintext
- Avaliar criptografia de `secrets_json` e `webhook_secret`.
- Evidencia: `docs/analysis/ARTIFACTS_SECURITY_OPS.md`.

## Validacao

- Webhook inbound gera `inbound_events` e `async_jobs` em todos os eventos relevantes.
- Dashboard conecta Evolution via endpoints corrigidos, com QR code e status.
- Jobs nao rodam em duplicidade (server vs worker).
- FE chama apenas endpoints existentes.
- Queries multi-tenant passam por filtro correto.


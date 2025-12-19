# Master Fix List — Tudo para Ajustar no Projeto

Este arquivo consolida tudo que precisa ser ajustado (P0/P1/P2), com referencias aos artefatos completos.

## P0 — Critico (quebra/risco alto)

1) Webhook multi-tenant nao encaminha `MESSAGES_UPSERT` para o pipeline principal.
- Evidencia: `src/api/routes/webhooks-inbound.routes.js:154-162`.

2) Cutover do webhook (legacy vs multi-tenant) indefinido.
- Evidencia: `src/api/routes/index.js:61-103`.

3) Endpoints de Evolution no frontend nao batem com backend (AgentDetail).
- Evidencia: `apps/web-vite/src/pages/AgentDetail.tsx:294-333` vs `src/api/routes/agents.routes.js:586-623`.

4) Evolution connect usa `agentId=default` no frontend (pode nao existir).
- Evidencia: `apps/web-vite/src/pages/Integrations.tsx:183-209`.

5) Pipeline persistente precisa ser garantido para todos webhooks externos.
- Evidencia: `src/db/migrations/031_inbound_events.sql`, `src/services/AsyncJobsService.js:73-174`.

## P1 — Estabilidade/consistencia

6) Rota duplicada `/api/agents/my` no backend.
- Evidencia: `src/api/routes/agents.routes.js:181-202` e `src/api/routes/agents.routes.js:344-365`.

7) Jobs iniciados em duplicidade (server + worker).
- Evidencia: `src/server.js:207-288`, `src/worker.js:138-195`.

8) CRM OAuth incompleto (HubSpot/Pipedrive sem token exchange).
- Evidencia: `src/api/routes/crm-integration.routes.js:175-181`.

9) Contrato FE ↔ BE com gaps (chamadas inexistentes/duplicadas).
- Evidencia: `docs/analysis/ARTIFACTS_FE_BE_CONTRACT_DIFF.md`.

10) Queries multi-tenant sem filtro adequado.
- Evidencia: `docs/analysis/ARTIFACTS_MULTITENANT_AUDIT_REAL.md`.

## P2 — Qualidade/manutencao

11) Locks em memoria coexistem com fila persistente no webhook legacy.
- Evidencia: `src/api/routes/webhook.routes.js:134-196`.

12) Duas apps frontend (Vite `/app` vs Next `/`) sem decisao de deploy oficial.
- Evidencia: `apps/web-vite/src/App.tsx:80-111`, `apps/web/src/lib/api.ts:1-49`.

13) Observabilidade parcial (falta correlation id para requests/jobs/events).
- Evidencia: `docs/analysis/ARTIFACTS_OBSERVABILITY_MAP.md`.

14) Indices faltantes em tabelas quentes.
- Evidencia: `docs/analysis/ARTIFACTS_HOT_TABLES_INDEXES.md`.

15) Segredos em plaintext (secrets_json/webhook_secret).
- Evidencia: `docs/analysis/ARTIFACTS_SECURITY_OPS.md`.

## Referencias completas

- `docs/analysis/EXEC_SUMMARY_EXPANDED.md`
- `docs/analysis/ACTION_PLAN_COMPLETE.md`
- `docs/analysis/ARTIFACTS_RISKS_AND_BLOCKERS.md`
- `docs/analysis/ARTIFACTS_FE_BE_CONTRACT_DIFF.md`
- `docs/analysis/ARTIFACTS_DB_SCHEMA_AND_QUERIES.md`
- `docs/analysis/ARTIFACTS_MULTITENANT_AUDIT_REAL.md`

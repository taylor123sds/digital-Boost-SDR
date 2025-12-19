# Resumo Executivo Expandido — Todos os Pontos Criticos

Este resumo consolida os P0/P1/P2 com referencias aos artefatos completos em `docs/analysis/ARTIFACTS_*.md`.

## P0 — Quebra em producao / risco alto

- Webhook multi-tenant nao encaminha `MESSAGES_UPSERT` para o pipeline principal (drop silencioso). Evidencia: `src/api/routes/webhooks-inbound.routes.js:154-162`.
  - Detalhe em: `docs/analysis/02-webhook-pipeline.md`, `docs/analysis/ARTIFACTS_EVOLUTION_INBOUND_CALLGRAPH.md`.
- Endpoints de Evolution no frontend nao batem com o backend (ex.: `/api/agents/evolution/qrcode`). Evidencia: `apps/web-vite/src/pages/AgentDetail.tsx:294-333` vs `src/api/routes/agents.routes.js:586-623`.
  - Detalhe em: `docs/analysis/04-frontends.md`, `docs/analysis/ARTIFACTS_FE_BE_CONTRACT_DIFF.md`.
- Integracao Evolution via dashboard depende de `agentId` valido, mas o front usa `default`. Evidencia: `apps/web-vite/src/pages/Integrations.tsx:183-209`.
  - Detalhe em: `docs/analysis/05-data-integrations.md`, `docs/analysis/ARTIFACTS_INTEGRATIONS_MAP.md`.
- Dois fluxos de webhook ativos (legacy + multi-tenant) elevam risco de mensagens fora do pipeline canonico. Evidencia: `src/api/routes/index.js:61-103`.
  - Detalhe em: `docs/analysis/02-webhook-pipeline.md`, `docs/analysis/ARTIFACTS_STAGING_CUTOVER.md`.

## P1 — Degradacao / instabilidade

- Rotas duplicadas para `/api/agents/my` com potencial override por ordem de registro. Evidencia: `src/api/routes/agents.routes.js:181-202` e `src/api/routes/agents.routes.js:344-365`.
  - Detalhe em: `docs/analysis/01-backend-routes.md`.
- Server e worker iniciam o mesmo conjunto de jobs, risco de execucao duplicada. Evidencia: `src/server.js:207-288` e `src/worker.js:138-195`.
  - Detalhe em: `docs/analysis/03-jobs-worker.md`, `docs/analysis/ARTIFACTS_JOBS_SCHEDULE.md`.
- CRM OAuth incompleto (HubSpot/Pipedrive). Evidencia: `src/api/routes/crm-integration.routes.js:175-181`.
  - Detalhe em: `docs/analysis/05-data-integrations.md`, `docs/analysis/ARTIFACTS_INTEGRATIONS_MAP.md`.

## P2 — Qualidade / evolucao

- Locks em memoria ainda coexistem com fila persistente no webhook legacy. Evidencia: `src/api/routes/webhook.routes.js:134-196`.
  - Detalhe em: `docs/analysis/02-webhook-pipeline.md`, `docs/analysis/ARTIFACTS_STAGING_CUTOVER.md`.
- Duas apps frontend coexistem com base distinta (`/app` vs `/`), risco de confusao de deploy. Evidencia: `apps/web-vite/src/App.tsx:80-111` e `apps/web/src/lib/api.ts:1-49`.
  - Detalhe em: `docs/analysis/04-frontends.md`, `docs/analysis/ARTIFACTS_FRONTEND_COMMUNICATION_MAP.md`.

## Complemento: mapas completos e auditorias

- Grafo de imports, ciclos e centralidade: `docs/analysis/ARTIFACTS_IMPORT_GRAPH.md`.
- Mapa de rotas completo (404 rotas): `docs/analysis/ARTIFACTS_BACKEND_API_MAP.md`.
- Mapas de dados e queries por tabela: `docs/analysis/ARTIFACTS_DB_SCHEMA_AND_QUERIES.md`.
- Auditoria multi-tenant com evidencias: `docs/analysis/ARTIFACTS_MULTITENANT_AUDIT_REAL.md`.
- Chamadas HTTP externas (Evolution/Google/CRM/OpenAI): `docs/analysis/ARTIFACTS_EXTERNAL_CALLS.md`.
- Contrato FE vs BE (gaps): `docs/analysis/ARTIFACTS_FE_BE_CONTRACT_DIFF.md`.


# Action Plan — Correcoes Prioritarias

Objetivo: fechar os pontos criticos levantados nos MDs (ETAPA + ARTIFACTS + EXEC_SUMMARY).

## P0 — Corrigir agora (quebra/risco alto)

1) Webhook multi-tenant: garantir que `MESSAGES_UPSERT` entra no pipeline
- O que fazer: criar um handler canônico para Evolution e chamar o mesmo fluxo do webhook legacy (staging -> async_jobs -> process). Remover log-only.
- Arquivos: `src/api/routes/webhooks-inbound.routes.js`, `src/api/routes/webhook.routes.js`, `src/services/InboundEventsService.js`, `src/services/AsyncJobsService.js`.
- Evidencias: `src/api/routes/webhooks-inbound.routes.js:154-162`.
- Resultado esperado: eventos `MESSAGES_UPSERT` geram `inbound_events` + `async_jobs`.

2) Padronizar endpoint Evolution no frontend
- O que fazer: alinhar UI ao endpoint ativo (channels routes) e remover chamadas inexistentes.
- Arquivos: `apps/web-vite/src/pages/AgentDetail.tsx`, `apps/web-vite/src/pages/Integrations.tsx`.
- Evidencias: `apps/web-vite/src/pages/AgentDetail.tsx:294-333` vs `src/api/routes/channels.routes.js:23-181`.
- Resultado esperado: conexao via dashboard funciona com `agentId` real.

3) Definir endpoint canônico de webhook (cutover)
- O que fazer: decidir se Evolution aponta para `/api/webhooks/inbound/:webhookPublicId` ou `/api/webhook/evolution`. Desativar o outro caminho.
- Arquivos: `src/api/routes/index.js`, `src/api/routes/webhook.routes.js`, `src/api/routes/webhooks-inbound.routes.js`.
- Evidencias: `src/api/routes/index.js:61-103`.
- Resultado esperado: nenhum webhook fora do pipeline principal.

4) Corrigir `agentId` default no front
- O que fazer: usar `agentId` real do usuario (contexto/selecionado) em `/api/agents/:agentId/channels/evolution/connect`.
- Arquivos: `apps/web-vite/src/pages/Integrations.tsx`.
- Evidencias: `apps/web-vite/src/pages/Integrations.tsx:183-209`.
- Resultado esperado: conexao com agent correto, sem 404.

## P1 — Estabilidade e consistencia

5) Remover duplicidade de rota `/api/agents/my`
- O que fazer: manter apenas uma definicao e garantir ordem correta.
- Arquivo: `src/api/routes/agents.routes.js`.
- Evidencias: `src/api/routes/agents.routes.js:181-202` e `src/api/routes/agents.routes.js:344-365`.

6) Separar execucao de jobs (server vs worker)
- O que fazer: rodar jobs somente no worker (ou criar flag `RUN_JOBS=false` no server).
- Arquivos: `src/server.js`, `src/worker.js`.
- Evidencias: `src/server.js:207-288`, `src/worker.js:138-195`.

7) Completar CRM OAuth (HubSpot/Pipedrive)
- O que fazer: implementar exchange de tokens e storage/revoke.
- Arquivos: `src/api/routes/crm-integration.routes.js`, providers CRM.
- Evidencias: `src/api/routes/crm-integration.routes.js:175-181`.

## P2 — Qualidade e manutencao

8) Remover locks em memoria quando async_jobs estiver estavel
- O que fazer: eliminar EarlyDeduplicator/ContactLockManager e depender de async_jobs + constraints.
- Arquivos: `src/api/routes/webhook.routes.js`, `src/services/AsyncJobsService.js`.
- Evidencias: `src/api/routes/webhook.routes.js:134-196`.

9) Definir app frontend principal (Vite vs Next)
- O que fazer: escolher qual app sera servida em producao, ajustar build/paths.
- Arquivos: `apps/web-vite/`, `apps/web/`, `src/config/express.config.js`.
- Evidencias: `apps/web-vite/src/App.tsx:80-111`, `apps/web/src/lib/api.ts:1-49`.

## Validacao (checklist)

- Enviar `MESSAGES_UPSERT` real e confirmar `inbound_events` + `async_jobs`.
- Conectar Evolution via dashboard com `agentId` real e obter QR code.
- Validar que apenas um endpoint de webhook esta ativo.
- Rodar server sem duplicar jobs (ver logs de inicializacao).
- Conferir CRM OAuth (Kommo/HubSpot/Pipedrive) em ambiente de teste.


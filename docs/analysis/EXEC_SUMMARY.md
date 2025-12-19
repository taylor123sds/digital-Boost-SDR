# Resumo Executivo — Pontos Criticos (P0/P1/P2)

## P0 — Quebra em producao / risco alto

- Webhook multi-tenant nao encaminha `MESSAGES_UPSERT` para o pipeline principal (drop silencioso). Evidencia: `src/api/routes/webhooks-inbound.routes.js:154-162`.
- Endpoints de Evolution no frontend nao batem com o backend (ex.: `/api/agents/evolution/qrcode`), bloqueando conexao em parte das telas. Evidencia: `apps/web-vite/src/pages/AgentDetail.tsx:294-333` vs `src/api/routes/agents.routes.js:586-623`.
- Integracao Evolution via dashboard depende de `agentId` valido, mas o front usa `default` (nao garantido), causando falha de conexao. Evidencia: `apps/web-vite/src/pages/Integrations.tsx:183-209` e `src/api/routes/channels.routes.js:23-57`.
- Dois fluxos de webhook ativos (legacy + multi-tenant) aumentam risco de mensagens irem para o caminho errado e nao serem processadas. Evidencia: `src/api/routes/index.js:61-103`.

## P1 — Degradacao / instabilidade

- Rotas duplicadas para `/api/agents/my` podem causar override silencioso por ordem de registro. Evidencia: `src/api/routes/agents.routes.js:181-202` e `src/api/routes/agents.routes.js:344-365`.
- Server e worker iniciam os mesmos jobs (cadence, prospecting, sync), com risco de execucao duplicada. Evidencia: `src/server.js:207-288` e `src/worker.js:138-195`.
- Integracoes CRM (HubSpot/Pipedrive) estao com TODO no token exchange, fluxo incompleto. Evidencia: `src/api/routes/crm-integration.routes.js:175-181`.

## P2 — Qualidade / evolucao

- Locks em memoria ainda coexistem com fila persistente no webhook legacy, aumentando complexidade e debug. Evidencia: `src/api/routes/webhook.routes.js:134-196`.
- Duas apps frontend (Vite + Next) coexistem com bases diferentes (`/app` vs `/`), o que pode causar confusao operacional se ambas forem publicadas. Evidencia: `apps/web-vite/src/App.tsx:80-111` e `apps/web/src/lib/api.ts:1-49`.


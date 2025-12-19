# ETAPA 1 — Backend (Express)

## 1) Boot e montagem de rotas

- Boot e middlewares estao em `src/server.js` com `configureExpress(app)` e `app.use('/', routes)`; DI container e injetado em `app.set('container', container)` para middlewares/handlers acessarem o container. Evidencia: `src/server.js:231-257`.
- Todas as rotas Express sao agregadas por `src/api/routes/index.js` e montadas em ordem explicita (webhook, auth, agents, channels, webhooks-inbound, crm, etc.). Evidencia: `src/api/routes/index.js:60-105`.
- SPA fallback para `/app/*` e servido pelo backend (Vite app) apos rotas e antes do 404. Evidencia: `src/config/express.config.js:124-138`.

## 2) Mapa completo de rotas

- A tabela completa (404 rotas detectadas) esta em `docs/analysis/01-backend-routes.md` (copia do inventario automatico).
- Duplicidade relevante detectada: `/api/agents/my` e definido duas vezes no mesmo arquivo. Evidencia: `src/api/routes/agents.routes.js:181-202` e `src/api/routes/agents.routes.js:344-365`.

## 3) Rotas criticas (auth / integrations / webhook)

- Webhook Evolution legado: `POST /api/webhook/evolution` com staging + fila persistente, mas ainda mantendo locks em memoria e fallback para processamento imediato. Evidencia: `src/api/routes/webhook.routes.js:58-196`.
- Webhook multi-tenant: `POST /api/webhooks/inbound/:webhookPublicId` com validacao de secret. Evidencia: `src/api/routes/webhooks-inbound.routes.js:20-89` e `src/services/IntegrationService.js:586-654`.
- Evolution via dashboard (one-click): endpoints em `src/api/routes/channels.routes.js` para conectar, status, qrcode e disconnect. Evidencia: `src/api/routes/channels.routes.js:17-223`.
- Evolution legacy via agents: endpoints em `src/api/routes/agents.routes.js` usam `getEvolutionManager()` (scalable module). Evidencia: `src/api/routes/agents.routes.js:475-725`.

## 4) Riscos imediatos no mapa de rotas

- Dois pontos de entrada para webhooks (legacy + multi-tenant) coexistem. Isso exige cutover claro para evitar fluxo dividido. Evidencia: `src/api/routes/index.js:61-103`.
- O handler multi-tenant nao encaminha `MESSAGES_UPSERT` para o pipeline principal (so log). Evidencia: `src/api/routes/webhooks-inbound.routes.js:154-162`.
- Ha rotas de Evolution em dois modulos diferentes (channels vs agents), o que tende a gerar comportamentos divergentes se o frontend usar o endpoint errado. Evidencia: `src/api/routes/channels.routes.js:17-223` e `src/api/routes/agents.routes.js:475-725`.

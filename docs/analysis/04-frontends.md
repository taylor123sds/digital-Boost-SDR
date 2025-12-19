# ETAPA 4 — Frontend(s)

## 1) Apps encontradas

- `apps/web-vite/` (React Router + Vite). Base router `/app`. Evidencia: `apps/web-vite/src/App.tsx:80-111`.
- `apps/web/` (Next.js App Router). Base `/`. Evidencia: `apps/web/src/lib/api.ts:1-2` e estrutura em `apps/web/src/app/*`.

## 2) Como chamam o backend (API client)

- Vite: base default `/api` (ou `VITE_API_URL`). Auth via token no localStorage e redireciona para `/app/login` quando 401. Evidencia: `apps/web-vite/src/lib/api.ts:1-47`.
- Next: base default `/api` (ou `NEXT_PUBLIC_API_URL`). Auth via token no localStorage e redireciona para `/login` quando 401. Evidencia: `apps/web/src/lib/api.ts:1-49`.

## 3) Rotas principais (Vite)

- Mapa de paginas (dashboard, inbox, agents, integrations, etc.) em `apps/web-vite/src/App.tsx`. Evidencia: `apps/web-vite/src/App.tsx:91-110`.
- SPA fallback servido pelo backend somente para `/app/*`. Evidencia: `src/config/express.config.js:124-129`.

## 4) Fluxo de integracoes no frontend (Evolution)

- Pagina Integrations chama `/api/integrations` e tenta `/api/whatsapp/status` (nao existe no backend). Evidencia: `apps/web-vite/src/pages/Integrations.tsx:120-141`.
- Conectar Evolution via dashboard usa `POST /api/agents/default/channels/evolution/connect`. Isso depende de existir um agentId valido ("default" nao e garantido). Evidencia: `apps/web-vite/src/pages/Integrations.tsx:183-209` e `src/api/routes/channels.routes.js:23-57`.
- AgentDetail usa endpoints que nao existem no backend atual: `POST /api/agents/evolution/qrcode` e `GET /api/agents/evolution/status/:instanceName` (faltam `:agentId`). Evidencia: `apps/web-vite/src/pages/AgentDetail.tsx:294-333` e comparacao com `src/api/routes/agents.routes.js:476-623`.

## 5) Implicacoes

- O dashboard pode conectar Evolution somente se usar um agentId valido e o endpoint correto. Hoje ha mismatch de endpoints em pelo menos uma tela (AgentDetail).

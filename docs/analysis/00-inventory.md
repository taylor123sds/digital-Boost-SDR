# ETAPA 0 — Inventario

## 1) Estrutura do repo (pastas principais)

- `src/` — backend Node/Express, dominio, serviços, handlers, DB, automations, inteligência.
- `apps/web-vite/` — frontend React Router (Vite) com base `/app`.
- `apps/web/` — frontend Next.js (App Router) com base `/`.
- `public/` — assets estáticos e build servido pelo backend.
- `prompts/` — prompts e templates.
- `src/db/migrations/` e `src/platform/database/migrations/` — migrations SQLite.
- `scripts/`, `test/` — scripts e testes.

## 2) Entrypoints e boot

- Server HTTP: `src/server.js` (boot completo + middlewares + rotas + jobs).
  - Migration runner no boot: `src/server.js:129`.
  - DI container: `src/server.js:143`, `src/config/di-container.js:44`.
  - Express + middlewares: `src/server.js:231`, `src/config/express.config.js:81`.
- Worker: `src/worker.js` (jobs em background). `src/worker.js:118`.
- Start script: `start-orbion.js` (entrypoint de processo externo).
- PM2 config: `ecosystem.config.cjs`.

## 3) Mapa de modulos (pastas → responsabilidade)

- `src/api/routes/` — rotas Express.
- `src/api/controllers/` — controladores auxiliares.
- `src/middleware/` — auth, tenant, validação, rate limit.
- `src/services/` — regras de negocio e integrações (OAuth, jobs, entitlement).
- `src/repositories/` — acesso a dados (SQLite).
- `src/db/` — conexão, transações, migrations runner.
- `src/handlers/` — pipeline de mensagens e webhook.
- `src/tools/` — utilitarios de integração (WhatsApp, calendar, etc.).
- `src/automation/` — engines e cadências.
- `src/intelligence/` — IA, orquestracao, prompts.
- `src/platform/` e `src/scalable/` — camadas paralelas (runtime/experimentos).


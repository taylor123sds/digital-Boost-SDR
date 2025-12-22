# Unified Audit Report (Full)


---

# reports/00-inventory.md

# Inventory

## Repo layout (top-level)
- Root has `apps/`, `src/`, `public/`, `docs/`, `scripts/`, `test/`, `data/`, `uploads/`, and multiple Docker compose files (`docker-compose*.yml`) and `Dockerfile`. Evidence: `reports/ARTIFACTS_TREE.md:12-67` and `reports/ARTIFACTS_TREE.md:56-176`.
- The repo already contains many prior audit artifacts (e.g., `ARTIFACTS_*`, `ARCHITECTURE_*`, `LOCAL_VS_SERVER_ANALYSIS.md`). Evidence: `reports/ARTIFACTS_TREE.md:14-38` and `reports/ARTIFACTS_TREE.md:88-134`.

## Codebase stacks and modules
- Primary backend tree is `src/` with many submodules (API, automation, db, domain, intelligence, etc.). Evidence: `reports/ARTIFACTS_TREE.md:180-254`.
- Parallel stacks exist in `src/scalable/`, `src/platform/`, and `src/v2/`. Evidence: `reports/ARTIFACTS_TREE.md:220-251`.
- Frontend apps are `apps/web-vite/` and `apps/web/` (Next). Evidence: `reports/ARTIFACTS_TREE.md:13` and `reports/ARTIFACTS_TREE.md:258-266`.

## Entrypoints and scripts
- Default start script runs `start-orbion.js`, which spawns `src/server.js`. Evidence: `package.json:7` and `start-orbion.js:154-158`.
- Direct server start is `node src/server.js` via `start:web` / `legacy`. Evidence: `package.json:11` and `package.json:18`.
- Worker entrypoint exists as `src/worker.js` via `start:worker`, but is marked deprecated in its header. Evidence: `package.json:12` and `src/worker.js:1-21`.

## Frontend stacks
- Vite app uses React Router and Vite toolchain. Evidence: `apps/web-vite/package.json:6-35`.
- Next app is explicitly marked deprecated in its package.json. Evidence: `apps/web/package.json:5-6`.

## File counts (JS/TS)
- Repo JS/TS totals from scan: 514 `.js`, 8 `.ts`, 44 `.tsx`, 0 `.jsx` (total 566). Evidence: `reports/ARTIFACTS_INVENTORY_SCAN.md:1-6`.

## Key libraries (backend)
- Backend uses Express, better-sqlite3, node-cron, winston, axios, googleapis, jsonwebtoken. Evidence: `package.json:42-71` and `package.json:50-58`.

## Notes on local vs VPS
- This inventory reflects the local workspace only. Any VPS behavior requires separate verification (no VPS access here).

## Deploy artifacts (local code evidence only)
- Dockerfile builds Vite frontend and copies build to `public/app/`, then runs `node src/server.js`. Evidence: `Dockerfile:9-65` and `Dockerfile:92-93`.
- docker-compose defines separate `leadly` (ROLE=api) and `leadly-worker` (ROLE=worker) services using `orbion-leadly:${GIT_COMMIT:-local}`. Evidence: `docker-compose.yml:114-147` and `docker-compose.yml:185-214`.
- docker-compose mounts `./data` into `/app/data` and sets `DATABASE_PATH=/app/data/orbion.db`. Evidence: `docker-compose.yml:130-133` and `docker-compose.yml:156` (also `docker-compose.yml:203-224`).

---

# reports/01-backend-express.md

# Backend bootstrap (Express, DI, middleware, runtime wiring)

## Entrypoint and role control
- `src/server.js` is the active orchestrator with ROLE-based process control (`ROLE=api|worker|full`). Evidence: `src/server.js:56-65`.
- Express server only starts when `shouldStartAPI` is true; worker jobs only start when `shouldStartWorker` is true. Evidence: `src/server.js:284-329`.
- `src/worker.js` exists but is deprecated in its header; scripts still reference it. Evidence: `src/worker.js:1-21` and `package.json:12-19`.

## DI container and service locator
- The DI container is created in `src/server.js` and injected into Express via `app.set('container', container)`. Evidence: `src/server.js:220-224` and `src/server.js:292-295`.
- The ServiceLocator is initialized and attached to the app with `app.set('serviceLocator', serviceLocator)` before routes are mounted. Evidence: `src/server.js:297-302`.

## Express middleware order (as wired in runtime)
- `configureExpress(app)` is called before any routes are mounted. Evidence: `src/server.js:304-308`.
- Middleware order inside `configureExpress` is: Helmet → CORS → JSON/body parsing → rate limiter on `/api` → logging middleware → global error middleware → static file serving. Evidence: `src/config/express.config.js:81-121`.
- SPA fallback for `/app/*` is mounted after routes and before the 404 handler. Evidence: `src/server.js:310-314` and `src/config/express.config.js:124-155`.
- 404 handler is mounted last via `configure404Handler(app)` which uses `app.use('*', ...)`. Evidence: `src/server.js:313-314` and `src/config/express.config.js:150-156`.

## Route mounting
- All API route modules are aggregated in `src/api/routes/index.js` and mounted at `/` via `app.use('/', routes)`. Evidence: `src/server.js:307-309` and `src/api/routes/index.js:56-105`.

## Runtime wiring vs code presence
- Automation engine is initialized during HTTP server startup (inside `startServer`), which is called only when `shouldStartAPI` is true. Evidence: `src/config/server.startup.js:22-52` and `src/server.js:318-321`.
- Background jobs (cadence engine, prospecting engine, abandonment detection, data sync, OAuth refresh, webhook job processor, prospect sync, auto-optimizer, async jobs processor) are only started when `shouldStartWorker` is true. Evidence: `src/server.js:329-420`.

## Potential 404 causes already wired/not wired
- SPA fallback is explicitly wired for `/app/*`, so direct navigation to `/app/...` should serve `public/app/index.html` if assets exist. Evidence: `src/config/express.config.js:129-145`.
- All routes are mounted on root (`/`) with the module aggregator; if an endpoint is missing, it is a code/route declaration issue or not mounted in `src/api/routes/index.js`. Evidence: `src/server.js:307-309` and `src/api/routes/index.js:60-105`.

---

# reports/01-backend-routes.md

# Backend routes

## Duplicates by method+path
# Route duplicates by method+path

## GET /api/version
- src/api/routes/health.routes.js:193
- src/api/routes/version.routes.js:146

## GET /api/leads
- src/api/routes/google/sheets.routes.js:16
- src/api/routes/whatsapp.routes.js:273

## POST /api/leads/update-stage
- src/api/routes/whatsapp.routes.js:306
- src/api/routes/funil.routes.js:240

## Route table (from router.* declarations)

# Route scan (rg router.* declarations)

| File | Line | Method | Path | Raw line |
| --- | ---: | --- | --- | --- |
| src/api/routes/webhook.routes.js | 76 | POST | /api/webhook/evolution | router.post('/api/webhook/evolution', (req, res) => { |
| src/api/routes/webhook.routes.js | 827 | GET | /api/webhook/health | router.get('/api/webhook/health', (req, res) => { |
| src/api/routes/webhook.routes.js | 874 | GET | /api/webhook/coordinator/stats | router.get('/api/webhook/coordinator/stats', (req, res) => { |
| src/api/routes/webhook.routes.js | 886 | POST | /api/webhook/coordinator/emergency-cleanup | router.post('/api/webhook/coordinator/emergency-cleanup', (req, res) => { |
| src/api/routes/admin.routes.js | 25 | GET | /api/health | router.get('/api/health', async (req, res) => { |
| src/api/routes/admin.routes.js | 66 | GET | /api/stats | router.get('/api/stats', async (req, res) => { |
| src/api/routes/admin.routes.js | 97 | POST | /api/admin/clear-cache | router.post('/api/admin/clear-cache', async (req, res) => { |
| src/api/routes/admin.routes.js | 125 | GET | /api/admin/handlers-health | router.get('/api/admin/handlers-health', async (req, res) => { |
| src/api/routes/admin.routes.js | 158 | GET | /api/admin/system-health | router.get('/api/admin/system-health', async (req, res) => { |
| src/api/routes/admin.routes.js | 174 | GET | /api/admin/error-stats | router.get('/api/admin/error-stats', async (req, res) => { |
| src/api/routes/admin.routes.js | 187 | POST | /api/admin/clear-old-errors | router.post('/api/admin/clear-old-errors', async (req, res) => { |
| src/api/routes/admin.routes.js | 212 | GET | /api/admin/coordinator/stats | router.get('/api/admin/coordinator/stats', async (req, res) => { |
| src/api/routes/admin.routes.js | 225 | POST | /api/admin/coordinator/emergency-cleanup | router.post('/api/admin/coordinator/emergency-cleanup', async (req, res) => { |
| src/api/routes/admin.routes.js | 251 | GET | /api/admin/audio/stats | router.get('/api/admin/audio/stats', async (req, res) => { |
| src/api/routes/admin.routes.js | 268 | GET | /api/admin/audio/status/:messageId | router.get('/api/admin/audio/status/:messageId', async (req, res) => { |
| src/api/routes/admin.routes.js | 288 | GET | /api/admin/context/stats | router.get('/api/admin/context/stats', async (req, res) => { |
| src/api/routes/crm-integration.routes.js | 54 | GET | /api/integrations/crm/:provider/oauth/start | router.get('/api/integrations/crm/:provider/oauth/start', |
| src/api/routes/crm-integration.routes.js | 147 | GET | /api/integrations/oauth/callback/:provider | router.get('/api/integrations/oauth/callback/:provider', async (req, res) => { |
| src/api/routes/crm-integration.routes.js | 256 | POST | /api/integrations/:integrationId/disconnect | router.post('/api/integrations/:integrationId/disconnect', |
| src/api/routes/crm-integration.routes.js | 298 | POST | /api/integrations/:integrationId/sync | router.post('/api/integrations/:integrationId/sync', |
| src/api/routes/crm-integration.routes.js | 343 | GET | /api/integrations/:integrationId/pipelines | router.get('/api/integrations/:integrationId/pipelines', |
| src/api/routes/crm-integration.routes.js | 418 | POST | /api/integrations/:integrationId/leads | router.post('/api/integrations/:integrationId/leads', |
| src/api/routes/crm-integration.routes.js | 494 | GET | /api/integrations/:integrationId/test | router.get('/api/integrations/:integrationId/test', |
| src/api/routes/learning.routes.js | 27 | GET | /api/learning/report | router.get('/api/learning/report', async (req, res) => { |
| src/api/routes/learning.routes.js | 49 | GET | /api/learning/patterns | router.get('/api/learning/patterns', async (req, res) => { |
| src/api/routes/learning.routes.js | 72 | GET | /api/learning/score/:contactId | router.get('/api/learning/score/:contactId', async (req, res) => { |
| src/api/routes/learning.routes.js | 101 | GET | /api/learning/intelligence/dashboard | router.get('/api/learning/intelligence/dashboard', async (req, res) => { |
| src/api/routes/learning.routes.js | 211 | GET | /api/learning/adaptations | router.get('/api/learning/adaptations', async (req, res) => { |
| src/api/routes/learning.routes.js | 258 | GET | /api/learning/abandonment-patterns | router.get('/api/learning/abandonment-patterns', async (req, res) => { |
| src/api/routes/learning.routes.js | 292 | POST | /api/learning/patterns/refresh | router.post('/api/learning/patterns/refresh', async (req, res) => { |
| src/api/routes/learning.routes.js | 317 | GET | /api/learning/experiments | router.get('/api/learning/experiments', async (req, res) => { |
| src/api/routes/agents.routes.js | 176 | GET | /api/agents | router.get('/api/agents', async (req, res) => { |
| src/api/routes/agents.routes.js | 199 | GET | /api/agents/my | router.get('/api/agents/my', authenticate, tenantContext, (req, res) => { |
| src/api/routes/agents.routes.js | 210 | GET | /api/agents/:agentId | router.get('/api/agents/:agentId', validateAgentId, async (req, res) => { |
| src/api/routes/agents.routes.js | 240 | POST | /api/agents | router.post('/api/agents', requireManager, async (req, res) => { |
| src/api/routes/agents.routes.js | 275 | PUT | /api/agents/:agentId | router.put('/api/agents/:agentId', requireManager, validateAgentId, async (req, res) => { |
| src/api/routes/agents.routes.js | 299 | DELETE | /api/agents/:agentId | router.delete('/api/agents/:agentId', requireManager, validateAgentId, async (req, res) => { |
| src/api/routes/agents.routes.js | 320 | GET | /api/admin/agents | router.get('/api/admin/agents', async (req, res) => { |
| src/api/routes/agents.routes.js | 351 | GET | /api/agents/:agentId/permissions | router.get('/api/agents/:agentId/permissions', authenticate, tenantContext, validateAgentId, async (req, res) => { |
| src/api/routes/agents.routes.js | 393 | POST | /api/agents/:agentId/duplicate | router.post('/api/agents/:agentId/duplicate', authenticate, tenantContext, requireManager, validateAgentId, sanitizeInput, async (req, res) => { |
| src/api/routes/agents.routes.js | 459 | GET | /api/agents/:agentId/evolution/status | router.get('/api/agents/:agentId/evolution/status', authenticate, validateAgentId, async (req, res) => { |
| src/api/routes/agents.routes.js | 506 | POST | /api/agents/:agentId/evolution/create | router.post('/api/agents/:agentId/evolution/create', authenticate, tenantContext, requireManager, validateAgentId, async (req, res) => { |
| src/api/routes/agents.routes.js | 570 | GET | /api/agents/:agentId/evolution/qrcode | router.get('/api/agents/:agentId/evolution/qrcode', authenticate, validateAgentId, async (req, res) => { |
| src/api/routes/agents.routes.js | 616 | POST | /api/agents/:agentId/evolution/disconnect | router.post('/api/agents/:agentId/evolution/disconnect', authenticate, requireManager, validateAgentId, async (req, res) => { |
| src/api/routes/agents.routes.js | 651 | DELETE | /api/agents/:agentId/evolution | router.delete('/api/agents/:agentId/evolution', authenticate, requireManager, validateAgentId, async (req, res) => { |
| src/api/routes/agents.routes.js | 686 | GET | /api/evolution/instances | router.get('/api/evolution/instances', authenticate, async (req, res) => { |
| src/api/routes/clientes.routes.js | 18 | GET | /api/clientes | router.get('/api/clientes', async (req, res) => { |
| src/api/routes/clientes.routes.js | 78 | POST | /api/clientes/from-opportunity | router.post('/api/clientes/from-opportunity', async (req, res) => { |
| src/api/routes/clientes.routes.js | 135 | GET | /api/clientes/:id | router.get('/api/clientes/:id', async (req, res) => { |
| src/api/routes/clientes.routes.js | 179 | PUT | /api/clientes/:id/status | router.put('/api/clientes/:id/status', async (req, res) => { |
| src/api/routes/clientes.routes.js | 220 | POST | /api/clientes/:id/greeting | router.post('/api/clientes/:id/greeting', async (req, res) => { |
| src/api/routes/clientes.routes.js | 302 | POST | /api/clientes/:id/followup | router.post('/api/clientes/:id/followup', async (req, res) => { |
| src/api/routes/metrics.routes.js | 32 | GET | /api/metrics | router.get('/api/metrics', (req, res) => { |
| src/api/routes/metrics.routes.js | 51 | GET | /api/metrics/summary | router.get('/api/metrics/summary', (req, res) => { |
| src/api/routes/metrics.routes.js | 70 | POST | /api/metrics/reset | router.post('/api/metrics/reset', (req, res) => { |
| src/api/routes/crm/opportunities.routes.js | 16 | GET | /api/crm/opportunities | router.get('/api/crm/opportunities', async (req, res) => { |
| src/api/routes/crm/opportunities.routes.js | 73 | GET | /api/crm/opportunities/pipeline | router.get('/api/crm/opportunities/pipeline', async (req, res) => { |
| src/api/routes/crm/opportunities.routes.js | 93 | GET | /api/crm/opportunities/:id | router.get('/api/crm/opportunities/:id', async (req, res) => { |
| src/api/routes/crm/opportunities.routes.js | 129 | POST | /api/crm/opportunities | router.post('/api/crm/opportunities', async (req, res) => { |
| src/api/routes/crm/opportunities.routes.js | 161 | PUT | /api/crm/opportunities/:id | router.put('/api/crm/opportunities/:id', async (req, res) => { |
| src/api/routes/crm/opportunities.routes.js | 195 | DELETE | /api/crm/opportunities/:id | router.delete('/api/crm/opportunities/:id', async (req, res) => { |
| src/api/routes/crm/opportunities.routes.js | 225 | PUT | /api/crm/opportunities/:id/stage | router.put('/api/crm/opportunities/:id/stage', async (req, res) => { |
| src/api/routes/crm/opportunities.routes.js | 266 | POST | /api/crm/opportunities/:id/win | router.post('/api/crm/opportunities/:id/win', async (req, res) => { |
| src/api/routes/crm/opportunities.routes.js | 297 | POST | /api/crm/opportunities/:id/lose | router.post('/api/crm/opportunities/:id/lose', async (req, res) => { |
| src/api/routes/crm/opportunities.routes.js | 336 | POST | /api/crm/opportunities/:id/products | router.post('/api/crm/opportunities/:id/products', async (req, res) => { |
| src/api/routes/crm/opportunities.routes.js | 381 | DELETE | /api/crm/opportunities/:id/products/:productId | router.delete('/api/crm/opportunities/:id/products/:productId', async (req, res) => { |
| src/api/routes/webhooks-inbound.routes.js | 29 | POST | /api/webhooks/inbound/:webhookPublicId | router.post('/api/webhooks/inbound/:webhookPublicId', async (req, res) => { |
| src/api/routes/ai-insights.routes.js | 34 | GET | /api/ai-insights/sentiment | router.get('/api/ai-insights/sentiment', optionalAuth, (req, res) => { |
| src/api/routes/ai-insights.routes.js | 116 | GET | /api/ai-insights/objections | router.get('/api/ai-insights/objections', optionalAuth, (req, res) => { |
| src/api/routes/ai-insights.routes.js | 195 | GET | /api/ai-insights/best-practices | router.get('/api/ai-insights/best-practices', optionalAuth, (req, res) => { |
| src/api/routes/ai-insights.routes.js | 297 | GET | /api/ai-insights/agent-performance | router.get('/api/ai-insights/agent-performance', optionalAuth, (req, res) => { |
| src/api/routes/ai-insights.routes.js | 408 | GET | /api/ai-insights/recommendations | router.get('/api/ai-insights/recommendations', optionalAuth, (req, res) => { |
| src/api/routes/lead-scoring.routes.js | 19 | GET | /api/scoring/rules | router.get('/api/scoring/rules', (req, res) => { |
| src/api/routes/lead-scoring.routes.js | 44 | GET | /api/scoring/rules/:id | router.get('/api/scoring/rules/:id', (req, res) => { |
| src/api/routes/lead-scoring.routes.js | 69 | POST | /api/scoring/rules | router.post('/api/scoring/rules', (req, res) => { |
| src/api/routes/lead-scoring.routes.js | 107 | PUT | /api/scoring/rules/:id | router.put('/api/scoring/rules/:id', (req, res) => { |
| src/api/routes/lead-scoring.routes.js | 142 | DELETE | /api/scoring/rules/:id | router.delete('/api/scoring/rules/:id', (req, res) => { |
| src/api/routes/lead-scoring.routes.js | 167 | PUT | /api/scoring/rules/:id/toggle | router.put('/api/scoring/rules/:id/toggle', (req, res) => { |
| src/api/routes/lead-scoring.routes.js | 192 | POST | /api/scoring/calculate/:leadId | router.post('/api/scoring/calculate/:leadId', (req, res) => { |
| src/api/routes/lead-scoring.routes.js | 219 | POST | /api/scoring/calculate-all | router.post('/api/scoring/calculate-all', (req, res) => { |
| src/api/routes/lead-scoring.routes.js | 259 | GET | /api/scoring/leaderboard | router.get('/api/scoring/leaderboard', (req, res) => { |
| src/api/routes/lead-scoring.routes.js | 283 | GET | /api/scoring/lead/:leadId | router.get('/api/scoring/lead/:leadId', (req, res) => { |
| src/api/routes/lead-scoring.routes.js | 318 | GET | /api/scoring/lead/:leadId/history | router.get('/api/scoring/lead/:leadId/history', (req, res) => { |
| src/api/routes/lead-scoring.routes.js | 340 | GET | /api/scoring/stats | router.get('/api/scoring/stats', (req, res) => { |
| src/api/routes/channels.routes.js | 23 | POST | /api/agents/:agentId/channels/evolution/connect | router.post('/api/agents/:agentId/channels/evolution/connect', |
| src/api/routes/channels.routes.js | 73 | GET | /api/agents/:agentId/channels/evolution/status | router.get('/api/agents/:agentId/channels/evolution/status', |
| src/api/routes/channels.routes.js | 127 | GET | /api/agents/:agentId/channels/evolution/qrcode | router.get('/api/agents/:agentId/channels/evolution/qrcode', |
| src/api/routes/channels.routes.js | 188 | POST | /api/agents/:agentId/channels/evolution/disconnect | router.post('/api/agents/:agentId/channels/evolution/disconnect', |
| src/api/routes/channels.routes.js | 230 | GET | /api/integrations | router.get('/api/integrations', |
| src/api/routes/channels.routes.js | 270 | GET | /api/integrations/:integrationId | router.get('/api/integrations/:integrationId', |
| src/api/routes/channels.routes.js | 307 | GET | /api/integrations/:integrationId/status | router.get('/api/integrations/:integrationId/status', |
| src/api/routes/cadence.routes.js | 36 | GET | /api/cadences | router.get('/api/cadences', (req, res) => { |
| src/api/routes/cadence.routes.js | 64 | GET | /api/cadences/stats | router.get('/api/cadences/stats', (req, res) => { |
| src/api/routes/cadence.routes.js | 166 | GET | /api/cadences/pipeline-view | router.get('/api/cadences/pipeline-view', (req, res) => { |
| src/api/routes/cadence.routes.js | 220 | GET | /api/cadences/:id | router.get('/api/cadences/:id', (req, res) => { |
| src/api/routes/cadence.routes.js | 253 | GET | /api/cadences/:id/steps | router.get('/api/cadences/:id/steps', (req, res) => { |
| src/api/routes/cadence.routes.js | 289 | POST | /api/cadences/:id/enroll | router.post('/api/cadences/:id/enroll', (req, res) => { |
| src/api/routes/cadence.routes.js | 364 | GET | /api/cadences/enrollments/active | router.get('/api/cadences/enrollments/active', (req, res) => { |
| src/api/routes/cadence.routes.js | 416 | PUT | /api/cadences/enrollments/:id/pause | router.put('/api/cadences/enrollments/:id/pause', (req, res) => { |
| src/api/routes/cadence.routes.js | 454 | PUT | /api/cadences/enrollments/:id/resume | router.put('/api/cadences/enrollments/:id/resume', (req, res) => { |
| src/api/routes/cadence.routes.js | 490 | PUT | /api/cadences/enrollments/:id/respond | router.put('/api/cadences/enrollments/:id/respond', (req, res) => { |
| src/api/routes/cadence.routes.js | 554 | GET | /api/cadences/actions/pending | router.get('/api/cadences/actions/pending', (req, res) => { |
| src/api/routes/cadence.routes.js | 634 | POST | /api/cadences/actions/execute | router.post('/api/cadences/actions/execute', (req, res) => { |
| src/api/routes/cadence.routes.js | 730 | POST | /api/cadences/advance-day | router.post('/api/cadences/advance-day', (req, res) => { |
| src/api/routes/prospecting.routes.js | 49 | POST | /api/prospecting/start | router.post('/api/prospecting/start', optionalAuth, async (req, res) => { |
| src/api/routes/prospecting.routes.js | 85 | POST | /api/prospecting/stop | router.post('/api/prospecting/stop', optionalAuth, (req, res) => { |
| src/api/routes/prospecting.routes.js | 110 | POST | /api/prospecting/pause | router.post('/api/prospecting/pause', optionalAuth, (req, res) => { |
| src/api/routes/prospecting.routes.js | 134 | POST | /api/prospecting/resume | router.post('/api/prospecting/resume', optionalAuth, (req, res) => { |
| src/api/routes/prospecting.routes.js | 162 | GET | /api/prospecting/status | router.get('/api/prospecting/status', optionalAuth, (req, res) => { |
| src/api/routes/prospecting.routes.js | 183 | GET | /api/prospecting/metrics | router.get('/api/prospecting/metrics', optionalAuth, (req, res) => { |
| src/api/routes/prospecting.routes.js | 204 | GET | /api/prospecting/history | router.get('/api/prospecting/history', optionalAuth, (req, res) => { |
| src/api/routes/prospecting.routes.js | 241 | POST | /api/prospecting/config | router.post('/api/prospecting/config', optionalAuth, (req, res) => { |
| src/api/routes/prospecting.routes.js | 285 | POST | /api/prospecting/template | router.post('/api/prospecting/template', optionalAuth, (req, res) => { |
| src/api/routes/prospecting.routes.js | 327 | POST | /api/prospecting/manual | router.post('/api/prospecting/manual', optionalAuth, async (req, res) => { |
| src/api/routes/prospecting.routes.js | 368 | POST | /api/prospecting/test | router.post('/api/prospecting/test', optionalAuth, async (req, res) => { |
| src/api/routes/prospecting.routes.js | 405 | POST | /api/prospecting/reset | router.post('/api/prospecting/reset', optionalAuth, (req, res) => { |
| src/api/routes/prospecting.routes.js | 430 | GET | /api/prospecting/sync/status | router.get('/api/prospecting/sync/status', optionalAuth, (req, res) => { |
| src/api/routes/prospecting.routes.js | 451 | POST | /api/prospecting/sync/now | router.post('/api/prospecting/sync/now', optionalAuth, async (req, res) => { |
| src/api/routes/prospecting.routes.js | 476 | GET | /api/prospecting/prospects/stats | router.get('/api/prospecting/prospects/stats', optionalAuth, (req, res) => { |
| src/api/routes/calibration.routes.js | 19 | POST | /api/calibration/test | router.post('/api/calibration/test', async (req, res) => { |
| src/api/routes/calibration.routes.js | 79 | GET | /api/calibration/status | router.get('/api/calibration/status', async (req, res) => { |
| src/api/routes/activities.routes.js | 17 | GET | /api/activities | router.get('/api/activities', optionalAuth, (req, res) => { |
| src/api/routes/activities.routes.js | 58 | GET | /api/activities/timeline | router.get('/api/activities/timeline', optionalAuth, (req, res) => { |
| src/api/routes/activities.routes.js | 85 | GET | /api/activities/overdue | router.get('/api/activities/overdue', optionalAuth, (req, res) => { |
| src/api/routes/activities.routes.js | 105 | GET | /api/activities/today | router.get('/api/activities/today', optionalAuth, (req, res) => { |
| src/api/routes/activities.routes.js | 125 | GET | /api/activities/upcoming | router.get('/api/activities/upcoming', optionalAuth, (req, res) => { |
| src/api/routes/activities.routes.js | 150 | GET | /api/activities/stats | router.get('/api/activities/stats', optionalAuth, (req, res) => { |
| src/api/routes/activities.routes.js | 175 | GET | /api/activities/:id | router.get('/api/activities/:id', (req, res) => { |
| src/api/routes/activities.routes.js | 200 | POST | /api/activities | router.post('/api/activities', optionalAuth, (req, res) => { |
| src/api/routes/activities.routes.js | 246 | PUT | /api/activities/:id | router.put('/api/activities/:id', (req, res) => { |
| src/api/routes/activities.routes.js | 274 | PUT | /api/activities/:id/complete | router.put('/api/activities/:id/complete', (req, res) => { |
| src/api/routes/activities.routes.js | 300 | PUT | /api/activities/:id/reschedule | router.put('/api/activities/:id/reschedule', (req, res) => { |
| src/api/routes/activities.routes.js | 334 | DELETE | /api/activities/:id | router.delete('/api/activities/:id', (req, res) => { |
| src/api/routes/crm/dashboard.routes.js | 18 | GET | /crm | router.get('/crm', (req, res) => { |
| src/api/routes/crm/dashboard.routes.js | 26 | GET | /crm/ | router.get('/crm/', (req, res) => { |
| src/api/routes/crm/dashboard.routes.js | 34 | GET | /crm/leads | router.get('/crm/leads', (req, res) => { |
| src/api/routes/crm/dashboard.routes.js | 42 | GET | /crm/pipeline | router.get('/crm/pipeline', (req, res) => { |
| src/api/routes/crm/dashboard.routes.js | 50 | GET | /crm/accounts | router.get('/crm/accounts', (req, res) => { |
| src/api/routes/crm/dashboard.routes.js | 58 | GET | /crm/contacts | router.get('/crm/contacts', (req, res) => { |
| src/api/routes/auth.routes.js | 109 | POST | /api/auth/register | router.post('/api/auth/register', registrationRateLimit, sanitizeRegistrationInput, async (req, res) => { |
| src/api/routes/auth.routes.js | 247 | POST | /api/auth/create-user | router.post('/api/auth/create-user', authenticate, async (req, res) => { |
| src/api/routes/auth.routes.js | 300 | POST | /api/auth/login | router.post('/api/auth/login', async (req, res) => { |
| src/api/routes/auth.routes.js | 337 | POST | /api/auth/logout | router.post('/api/auth/logout', authenticate, (req, res) => { |
| src/api/routes/auth.routes.js | 359 | POST | /api/auth/refresh | router.post('/api/auth/refresh', async (req, res) => { |
| src/api/routes/auth.routes.js | 389 | GET | /api/auth/me | router.get('/api/auth/me', authenticate, (req, res) => { |
| src/api/routes/auth.routes.js | 450 | PUT | /api/auth/password | router.put('/api/auth/password', authenticate, async (req, res) => { |
| src/api/routes/auth.routes.js | 487 | GET | /api/auth/sessions | router.get('/api/auth/sessions', authenticate, (req, res) => { |
| src/api/routes/auth.routes.js | 508 | DELETE | /api/auth/sessions | router.delete('/api/auth/sessions', authenticate, (req, res) => { |
| src/api/routes/auth.routes.js | 529 | GET | /api/auth/entitlements | router.get('/api/auth/entitlements', authenticate, (req, res) => { |
| src/api/routes/auth.routes.js | 583 | POST | /api/auth/verify | router.post('/api/auth/verify', (req, res) => { |
| src/api/routes/automation.routes.js | 21 | GET | /api/automations | router.get('/api/automations', async (req, res) => { |
| src/api/routes/automation.routes.js | 56 | GET | /api/automations/:id | router.get('/api/automations/:id', async (req, res) => { |
| src/api/routes/automation.routes.js | 84 | POST | /api/automations | router.post('/api/automations', async (req, res) => { |
| src/api/routes/automation.routes.js | 123 | PUT | /api/automations/:id | router.put('/api/automations/:id', async (req, res) => { |
| src/api/routes/automation.routes.js | 152 | DELETE | /api/automations/:id | router.delete('/api/automations/:id', async (req, res) => { |
| src/api/routes/automation.routes.js | 171 | POST | /api/automations/:id/toggle | router.post('/api/automations/:id/toggle', async (req, res) => { |
| src/api/routes/automation.routes.js | 192 | POST | /api/automations/:id/run | router.post('/api/automations/:id/run', async (req, res) => { |
| src/api/routes/automation.routes.js | 213 | GET | /api/automations/:id/executions | router.get('/api/automations/:id/executions', async (req, res) => { |
| src/api/routes/automation.routes.js | 242 | GET | /api/automations/executions/recent | router.get('/api/automations/executions/recent', async (req, res) => { |
| src/api/routes/automation.routes.js | 276 | GET | /api/automations/engine/stats | router.get('/api/automations/engine/stats', async (req, res) => { |
| src/api/routes/automation.routes.js | 295 | POST | /api/automations/engine/initialize | router.post('/api/automations/engine/initialize', async (req, res) => { |
| src/api/routes/automation.routes.js | 324 | GET | /api/automations/templates | router.get('/api/automations/templates', async (req, res) => { |
| src/api/routes/automation.routes.js | 510 | POST | /api/automations/templates/:templateId/install | router.post('/api/automations/templates/:templateId/install', async (req, res) => { |
| src/api/routes/team.routes.js | 25 | GET | /api/team/users | router.get('/api/team/users', (req, res) => { |
| src/api/routes/team.routes.js | 69 | GET | /api/team/users/:id | router.get('/api/team/users/:id', (req, res) => { |
| src/api/routes/team.routes.js | 98 | POST | /api/team/users | router.post('/api/team/users', async (req, res) => { |
| src/api/routes/team.routes.js | 157 | PUT | /api/team/users/:id | router.put('/api/team/users/:id', async (req, res) => { |
| src/api/routes/team.routes.js | 194 | DELETE | /api/team/users/:id | router.delete('/api/team/users/:id', (req, res) => { |
| src/api/routes/team.routes.js | 219 | GET | /api/team/users/:id/performance | router.get('/api/team/users/:id/performance', (req, res) => { |
| src/api/routes/team.routes.js | 239 | GET | /api/team/leaderboard | router.get('/api/team/leaderboard', (req, res) => { |
| src/api/routes/team.routes.js | 267 | GET | /api/teams | router.get('/api/teams', (req, res) => { |
| src/api/routes/team.routes.js | 289 | GET | /api/team/teams | router.get('/api/team/teams', (req, res) => { |
| src/api/routes/team.routes.js | 314 | GET | /api/team/teams/:id | router.get('/api/team/teams/:id', (req, res) => { |
| src/api/routes/team.routes.js | 339 | POST | /api/team/teams | router.post('/api/team/teams', (req, res) => { |
| src/api/routes/team.routes.js | 374 | PUT | /api/team/teams/:id | router.put('/api/team/teams/:id', (req, res) => { |
| src/api/routes/team.routes.js | 402 | DELETE | /api/team/teams/:id | router.delete('/api/team/teams/:id', (req, res) => { |
| src/api/routes/team.routes.js | 427 | POST | /api/team/teams/:id/members | router.post('/api/team/teams/:id/members', (req, res) => { |
| src/api/routes/team.routes.js | 454 | DELETE | /api/team/teams/:id/members/:userId | router.delete('/api/team/teams/:id/members/:userId', (req, res) => { |
| src/api/routes/team.routes.js | 479 | GET | /api/team/teams/:id/performance | router.get('/api/team/teams/:id/performance', (req, res) => { |
| src/api/routes/forecasting.routes.js | 36 | GET | /api/forecasting/pipeline-weighted | router.get('/api/forecasting/pipeline-weighted', (req, res) => { |
| src/api/routes/forecasting.routes.js | 102 | GET | /api/forecasting/scenarios | router.get('/api/forecasting/scenarios', (req, res) => { |
| src/api/routes/forecasting.routes.js | 174 | GET | /api/forecasting/velocity | router.get('/api/forecasting/velocity', (req, res) => { |
| src/api/routes/forecasting.routes.js | 257 | GET | /api/forecasting/win-rate | router.get('/api/forecasting/win-rate', (req, res) => { |
| src/api/routes/forecasting.routes.js | 352 | GET | /api/forecasting/trends | router.get('/api/forecasting/trends', (req, res) => { |
| src/api/routes/forecasting.routes.js | 422 | GET | /api/forecasting/monthly | router.get('/api/forecasting/monthly', (req, res) => { |
| src/api/routes/ports.routes.js | 16 | GET | /api/ports/status | router.get('/api/ports/status', async (req, res) => { |
| src/api/routes/ports.routes.js | 36 | GET | /api/ports/available | router.get('/api/ports/available', async (req, res) => { |
| src/api/routes/ports.routes.js | 58 | POST | /api/ports/release/:port | router.post('/api/ports/release/:port', async (req, res) => { |
| src/api/routes/command-center.routes.js | 34 | GET | /api/command-center/overview | router.get('/api/command-center/overview', optionalAuth, (req, res) => { |
| src/api/routes/command-center.routes.js | 162 | GET | /api/command-center/tasks/urgent | router.get('/api/command-center/tasks/urgent', optionalAuth, (req, res) => { |
| src/api/routes/command-center.routes.js | 221 | GET | /api/command-center/hot-leads | router.get('/api/command-center/hot-leads', optionalAuth, (req, res) => { |
| src/api/routes/command-center.routes.js | 279 | GET | /api/command-center/activity-feed | router.get('/api/command-center/activity-feed', optionalAuth, (req, res) => { |
| src/api/routes/command-center.routes.js | 372 | GET | /api/command-center/pipeline-summary | router.get('/api/command-center/pipeline-summary', optionalAuth, (req, res) => { |
| src/api/routes/command-center.routes.js | 428 | GET | /api/command-center/performance | router.get('/api/command-center/performance', optionalAuth, (req, res) => { |
| src/api/routes/health.routes.js | 44 | GET | /health | router.get('/health', async (req, res) => { |
| src/api/routes/health.routes.js | 87 | GET | /health/detailed | router.get('/health/detailed', async (req, res) => { |
| src/api/routes/health.routes.js | 129 | GET | /health/ready | router.get('/health/ready', async (req, res) => { |
| src/api/routes/health.routes.js | 178 | GET | /health/live | router.get('/health/live', async (req, res) => { |
| src/api/routes/health.routes.js | 193 | GET | /api/version | router.get('/api/version', async (req, res) => { |
| src/api/routes/crm/accounts.routes.js | 16 | GET | /api/crm/accounts | router.get('/api/crm/accounts', async (req, res) => { |
| src/api/routes/crm/accounts.routes.js | 73 | GET | /api/crm/accounts/stats | router.get('/api/crm/accounts/stats', async (req, res) => { |
| src/api/routes/crm/accounts.routes.js | 93 | GET | /api/crm/accounts/:id | router.get('/api/crm/accounts/:id', async (req, res) => { |
| src/api/routes/crm/accounts.routes.js | 129 | POST | /api/crm/accounts | router.post('/api/crm/accounts', async (req, res) => { |
| src/api/routes/crm/accounts.routes.js | 161 | PUT | /api/crm/accounts/:id | router.put('/api/crm/accounts/:id', async (req, res) => { |
| src/api/routes/crm/accounts.routes.js | 196 | DELETE | /api/crm/accounts/:id | router.delete('/api/crm/accounts/:id', async (req, res) => { |
| src/api/routes/website.routes.js | 58 | POST | /api/website/contact | router.post('/api/website/contact', async (req, res) => { |
| src/api/routes/website.routes.js | 111 | POST | /api/website/newsletter | router.post('/api/website/newsletter', async (req, res) => { |
| src/api/routes/website.routes.js | 167 | GET | /api/website/health | router.get('/api/website/health', (req, res) => { |
| src/api/routes/reports.routes.js | 27 | GET | /api/reports/summary | router.get('/api/reports/summary', (req, res) => { |
| src/api/routes/reports.routes.js | 113 | GET | /api/reports/templates | router.get('/api/reports/templates', (req, res) => { |
| src/api/routes/reports.routes.js | 174 | POST | /api/reports/generate | router.post('/api/reports/generate', (req, res) => { |
| src/api/routes/reports.routes.js | 237 | GET | /api/reports/export/:format | router.get('/api/reports/export/:format', (req, res) => { |
| src/api/routes/pipeline.routes.js | 24 | GET | /api/pipeline | router.get('/api/pipeline', async (req, res) => { |
| src/api/routes/pipeline.routes.js | 143 | GET | /api/pipeline/stats | router.get('/api/pipeline/stats', async (req, res) => { |
| src/api/routes/pipeline.routes.js | 180 | POST | /api/pipeline | router.post('/api/pipeline', async (req, res) => { |
| src/api/routes/pipeline.routes.js | 237 | PUT | /api/pipeline/:id/stage | router.put('/api/pipeline/:id/stage', async (req, res) => { |
| src/api/routes/pipeline.routes.js | 339 | PUT | /api/pipeline/:id | router.put('/api/pipeline/:id', async (req, res) => { |
| src/api/routes/pipeline.routes.js | 407 | GET | /api/pipeline/:id | router.get('/api/pipeline/:id', async (req, res) => { |
| src/api/routes/google/sheets.routes.js | 16 | GET | /api/leads | router.get('/api/leads', async (req, res) => { |
| src/api/routes/google/sheets.routes.js | 52 | GET | /api/dashboard/leads | router.get('/api/dashboard/leads', async (req, res) => { |
| src/api/routes/crm/contacts.routes.js | 16 | GET | /api/crm/contacts | router.get('/api/crm/contacts', async (req, res) => { |
| src/api/routes/crm/contacts.routes.js | 73 | GET | /api/crm/contacts/stats | router.get('/api/crm/contacts/stats', async (req, res) => { |
| src/api/routes/crm/contacts.routes.js | 93 | GET | /api/crm/contacts/:id | router.get('/api/crm/contacts/:id', async (req, res) => { |
| src/api/routes/crm/contacts.routes.js | 129 | POST | /api/crm/contacts | router.post('/api/crm/contacts', async (req, res) => { |
| src/api/routes/crm/contacts.routes.js | 161 | PUT | /api/crm/contacts/:id | router.put('/api/crm/contacts/:id', async (req, res) => { |
| src/api/routes/crm/contacts.routes.js | 195 | DELETE | /api/crm/contacts/:id | router.delete('/api/crm/contacts/:id', async (req, res) => { |
| src/api/routes/crm/contacts.routes.js | 225 | POST | /api/crm/contacts/:id/consent | router.post('/api/crm/contacts/:id/consent', async (req, res) => { |
| src/api/routes/crm/contacts.routes.js | 266 | PUT | /api/crm/contacts/:id/score | router.put('/api/crm/contacts/:id/score', async (req, res) => { |
| src/api/routes/meetings.routes.js | 25 | POST | /api/meetings/transcriptions/fetch-by-event | router.post('/api/meetings/transcriptions/fetch-by-event', async (req, res) => { |
| src/api/routes/meetings.routes.js | 79 | POST | /api/meetings/transcriptions/fetch-by-type | router.post('/api/meetings/transcriptions/fetch-by-type', async (req, res) => { |
| src/api/routes/meetings.routes.js | 149 | POST | /api/meetings/transcriptions/fetch-recent | router.post('/api/meetings/transcriptions/fetch-recent', async (req, res) => { |
| src/api/routes/meetings.routes.js | 209 | GET | /api/meetings/transcriptions/:id | router.get('/api/meetings/transcriptions/:id', async (req, res) => { |
| src/api/routes/meetings.routes.js | 237 | GET | /api/meetings/transcriptions | router.get('/api/meetings/transcriptions', async (req, res) => { |
| src/api/routes/meetings.routes.js | 270 | POST | /api/meetings/analyze/:transcriptionId | router.post('/api/meetings/analyze/:transcriptionId', async (req, res) => { |
| src/api/routes/meetings.routes.js | 292 | POST | /api/meetings/analyze/quick | router.post('/api/meetings/analyze/quick', async (req, res) => { |
| src/api/routes/meetings.routes.js | 319 | GET | /api/meetings/analysis/:id | router.get('/api/meetings/analysis/:id', async (req, res) => { |
| src/api/routes/meetings.routes.js | 353 | GET | /api/meetings/analysis/by-meeting/:meetingId | router.get('/api/meetings/analysis/by-meeting/:meetingId', async (req, res) => { |
| src/api/routes/meetings.routes.js | 390 | GET | /api/meetings/scores/excellent | router.get('/api/meetings/scores/excellent', async (req, res) => { |
| src/api/routes/meetings.routes.js | 412 | GET | /api/meetings/scores/bant-qualified | router.get('/api/meetings/scores/bant-qualified', async (req, res) => { |
| src/api/routes/meetings.routes.js | 434 | GET | /api/meetings/scores/stats | router.get('/api/meetings/scores/stats', async (req, res) => { |
| src/api/routes/meetings.routes.js | 461 | GET | /api/meetings/insights/high-priority | router.get('/api/meetings/insights/high-priority', async (req, res) => { |
| src/api/routes/meetings.routes.js | 483 | PATCH | /api/meetings/insights/:id/status | router.patch('/api/meetings/insights/:id/status', async (req, res) => { |
| src/api/routes/meetings.routes.js | 520 | GET | /api/meetings/insights/stats | router.get('/api/meetings/insights/stats', async (req, res) => { |
| src/api/routes/meetings.routes.js | 549 | GET | /api/meetings/auth/google/url | router.get('/api/meetings/auth/google/url', async (req, res) => { |
| src/api/routes/meetings.routes.js | 571 | POST | /api/meetings/auth/google/callback | router.post('/api/meetings/auth/google/callback', async (req, res) => { |
| src/api/routes/dashboard.routes.js | 118 | GET | / | router.get('/', (req, res) => { |
| src/api/routes/dashboard.routes.js | 126 | POST | /api/tts/elevenlabs | router.post('/api/tts/elevenlabs', async (req, res) => { |
| src/api/routes/dashboard.routes.js | 153 | POST | /api/chat | router.post('/api/chat', async (req, res) => { |
| src/api/routes/dashboard.routes.js | 209 | POST | /api/dashboard/voice-navigate | router.post('/api/dashboard/voice-navigate', async (req, res) => { |
| src/api/routes/dashboard.routes.js | 257 | POST | /api/dashboard/execute-navigation | router.post('/api/dashboard/execute-navigation', async (req, res) => { |
| src/api/routes/dashboard.routes.js | 288 | GET | /api/dashboard/voice-commands | router.get('/api/dashboard/voice-commands', async (req, res) => { |
| src/api/routes/email-optin.routes.js | 37 | GET | /api/email-optin/status | router.get('/api/email-optin/status', (req, res) => { |
| src/api/routes/email-optin.routes.js | 53 | GET | /api/email-optin/stats | router.get('/api/email-optin/stats', (req, res) => { |
| src/api/routes/email-optin.routes.js | 70 | POST | /api/email-optin/start | router.post('/api/email-optin/start', async (req, res) => { |
| src/api/routes/email-optin.routes.js | 92 | POST | /api/email-optin/stop | router.post('/api/email-optin/stop', (req, res) => { |
| src/api/routes/email-optin.routes.js | 111 | POST | /api/email-optin/pause | router.post('/api/email-optin/pause', (req, res) => { |
| src/api/routes/email-optin.routes.js | 129 | POST | /api/email-optin/resume | router.post('/api/email-optin/resume', (req, res) => { |
| src/api/routes/email-optin.routes.js | 149 | POST | /api/email-optin/import | router.post('/api/email-optin/import', async (req, res) => { |
| src/api/routes/email-optin.routes.js | 180 | POST | /api/email-optin/send-single | router.post('/api/email-optin/send-single', async (req, res) => { |
| src/api/routes/email-optin.routes.js | 238 | GET | /api/email-optin/pending | router.get('/api/email-optin/pending', (req, res) => { |
| src/api/routes/email-optin.routes.js | 271 | GET | /api/email-optin/sent | router.get('/api/email-optin/sent', (req, res) => { |
| src/api/routes/email-optin.routes.js | 298 | GET | /api/email-optin/eligible | router.get('/api/email-optin/eligible', (req, res) => { |
| src/api/routes/email-optin.routes.js | 331 | POST | /api/email-optin/config | router.post('/api/email-optin/config', (req, res) => { |
| src/api/routes/email-optin.routes.js | 351 | POST | /api/email-optin/mark-eligible | router.post('/api/email-optin/mark-eligible', (req, res) => { |
| src/api/routes/crm/leads.routes.js | 16 | GET | /api/crm/leads | router.get('/api/crm/leads', async (req, res) => { |
| src/api/routes/crm/leads.routes.js | 73 | GET | /api/crm/leads/stats | router.get('/api/crm/leads/stats', async (req, res) => { |
| src/api/routes/crm/leads.routes.js | 93 | GET | /api/crm/leads/:id | router.get('/api/crm/leads/:id', async (req, res) => { |
| src/api/routes/crm/leads.routes.js | 129 | POST | /api/crm/leads | router.post('/api/crm/leads', async (req, res) => { |
| src/api/routes/crm/leads.routes.js | 161 | PUT | /api/crm/leads/:id | router.put('/api/crm/leads/:id', async (req, res) => { |
| src/api/routes/crm/leads.routes.js | 195 | DELETE | /api/crm/leads/:id | router.delete('/api/crm/leads/:id', async (req, res) => { |
| src/api/routes/crm/leads.routes.js | 225 | PUT | /api/crm/leads/:id/status | router.put('/api/crm/leads/:id/status', async (req, res) => { |
| src/api/routes/crm/leads.routes.js | 266 | PUT | /api/crm/leads/:id/bant | router.put('/api/crm/leads/:id/bant', async (req, res) => { |
| src/api/routes/crm/leads.routes.js | 303 | POST | /api/crm/leads/:id/convert | router.post('/api/crm/leads/:id/convert', async (req, res) => { |
| src/api/routes/version.routes.js | 146 | GET | /api/version | router.get('/api/version', async (req, res) => { |
| src/api/routes/version.routes.js | 179 | GET | /api/version/short | router.get('/api/version/short', (req, res) => { |
| src/api/routes/version.routes.js | 189 | GET | /health/version | router.get('/health/version', async (req, res) => { |
| src/api/routes/analytics.routes.js | 38 | GET | /api/analytics/whatsapp-stats | router.get('/api/analytics/whatsapp-stats', async (req, res) => { |
| src/api/routes/analytics.routes.js | 100 | GET | /api/analytics/agent-metrics | router.get('/api/analytics/agent-metrics', async (req, res) => { |
| src/api/routes/analytics.routes.js | 128 | GET | /api/analytics/overview | router.get('/api/analytics/overview', async (req, res) => { |
| src/api/routes/analytics.routes.js | 214 | GET | /api/analytics/top-contacts | router.get('/api/analytics/top-contacts', async (req, res) => { |
| src/api/routes/analytics.routes.js | 262 | GET | /api/analytics/hourly | router.get('/api/analytics/hourly', async (req, res) => { |
| src/api/routes/analytics.routes.js | 322 | GET | /api/analytics/p2/stats | router.get('/api/analytics/p2/stats', async (req, res) => { |
| src/api/routes/analytics.routes.js | 370 | GET | /api/analytics/p2/abandonment-patterns | router.get('/api/analytics/p2/abandonment-patterns', async (req, res) => { |
| src/api/routes/analytics.routes.js | 400 | GET | /api/analytics/p2/experiments | router.get('/api/analytics/p2/experiments', async (req, res) => { |
| src/api/routes/analytics.routes.js | 421 | GET | /api/analytics/p2/sentiment-summary | router.get('/api/analytics/p2/sentiment-summary', async (req, res) => { |
| src/api/routes/analytics.routes.js | 458 | GET | /api/analytics/p2/insights-report | router.get('/api/analytics/p2/insights-report', async (req, res) => { |
| src/api/routes/analytics.routes.js | 478 | POST | /api/analytics/p2/create-experiment | router.post('/api/analytics/p2/create-experiment', async (req, res) => { |
| src/api/routes/analytics.routes.js | 516 | GET | /api/analytics/learning/outcomes | router.get('/api/analytics/learning/outcomes', async (req, res) => { |
| src/api/routes/analytics.routes.js | 563 | GET | /api/analytics/learning/abandonment-job | router.get('/api/analytics/learning/abandonment-job', async (req, res) => { |
| src/api/routes/analytics.routes.js | 602 | POST | /api/analytics/learning/detect-abandonments | router.post('/api/analytics/learning/detect-abandonments', async (req, res) => { |
| src/api/routes/analytics.routes.js | 626 | GET | /api/analytics/learning/abandonment-hotspots | router.get('/api/analytics/learning/abandonment-hotspots', async (req, res) => { |
| src/api/routes/analytics.routes.js | 710 | GET | /api/analytics/learning/full-report | router.get('/api/analytics/learning/full-report', async (req, res) => { |
| src/api/routes/analytics.routes.js | 773 | GET | /api/analytics/learning/activity | router.get('/api/analytics/learning/activity', async (req, res) => { |
| src/api/routes/analytics.routes.js | 834 | GET | /api/analytics/optimizer/status | router.get('/api/analytics/optimizer/status', async (req, res) => { |
| src/api/routes/analytics.routes.js | 855 | POST | /api/analytics/optimizer/run-cycle | router.post('/api/analytics/optimizer/run-cycle', async (req, res) => { |
| src/api/routes/analytics.routes.js | 878 | GET | /api/analytics/optimizer/stage-health | router.get('/api/analytics/optimizer/stage-health', async (req, res) => { |
| src/api/routes/analytics.routes.js | 917 | GET | /api/analytics/optimizer/optimizations | router.get('/api/analytics/optimizer/optimizations', async (req, res) => { |
| src/api/routes/analytics.routes.js | 955 | POST | /api/analytics/optimizer/start | router.post('/api/analytics/optimizer/start', async (req, res) => { |
| src/api/routes/analytics.routes.js | 977 | POST | /api/analytics/optimizer/stop | router.post('/api/analytics/optimizer/stop', async (req, res) => { |
| src/api/routes/analytics.routes.js | 999 | POST | /api/analytics/optimizer/detect-risk | router.post('/api/analytics/optimizer/detect-risk', async (req, res) => { |
| src/api/routes/analytics.routes.js | 1034 | GET | /api/analytics/maturity-level | router.get('/api/analytics/maturity-level', async (req, res) => { |
| src/api/routes/debug.routes.js | 15 | GET | /api/debug/sheets | router.get('/api/debug/sheets', async (req, res) => { |
| src/api/routes/whatsapp.routes.js | 20 | POST | /api/whatsapp/send | router.post('/api/whatsapp/send', async (req, res) => { |
| src/api/routes/whatsapp.routes.js | 100 | POST | /api/campaign/run | router.post('/api/campaign/run', async (req, res) => { |
| src/api/routes/whatsapp.routes.js | 173 | GET | /api/whatsapp/campaign-status | router.get('/api/whatsapp/campaign-status', async (req, res) => { |
| src/api/routes/whatsapp.routes.js | 205 | POST | /api/whatsapp/intelligent-campaign | router.post('/api/whatsapp/intelligent-campaign', async (req, res) => { |
| src/api/routes/whatsapp.routes.js | 273 | GET | /api/leads | router.get('/api/leads', async (req, res) => { |
| src/api/routes/whatsapp.routes.js | 306 | POST | /api/leads/update-stage | router.post('/api/leads/update-stage', async (req, res) => { |
| src/api/routes/notifications.routes.js | 17 | GET | /api/notifications | router.get('/api/notifications', optionalAuth, (req, res) => { |
| src/api/routes/notifications.routes.js | 43 | GET | /api/notifications/unread-count | router.get('/api/notifications/unread-count', optionalAuth, (req, res) => { |
| src/api/routes/notifications.routes.js | 67 | GET | /api/notifications/:id | router.get('/api/notifications/:id', (req, res) => { |
| src/api/routes/notifications.routes.js | 92 | POST | /api/notifications | router.post('/api/notifications', (req, res) => { |
| src/api/routes/notifications.routes.js | 129 | POST | /api/notifications/broadcast | router.post('/api/notifications/broadcast', (req, res) => { |
| src/api/routes/notifications.routes.js | 175 | PUT | /api/notifications/:id/read | router.put('/api/notifications/:id/read', (req, res) => { |
| src/api/routes/notifications.routes.js | 200 | PUT | /api/notifications/read-all | router.put('/api/notifications/read-all', optionalAuth, (req, res) => { |
| src/api/routes/notifications.routes.js | 221 | DELETE | /api/notifications/:id | router.delete('/api/notifications/:id', (req, res) => { |
| src/api/routes/notifications.routes.js | 246 | DELETE | /api/notifications/old | router.delete('/api/notifications/old', (req, res) => { |
| src/api/routes/notifications.routes.js | 267 | GET | /api/notifications/preferences | router.get('/api/notifications/preferences', optionalAuth, (req, res) => { |
| src/api/routes/notifications.routes.js | 286 | PUT | /api/notifications/preferences | router.put('/api/notifications/preferences', optionalAuth, (req, res) => { |
| src/api/routes/funil.routes.js | 31 | GET | /api/funil/bant | router.get('/api/funil/bant', async (req, res) => { |
| src/api/routes/funil.routes.js | 172 | GET | /api/funil/stats | router.get('/api/funil/stats', async (req, res) => { |
| src/api/routes/funil.routes.js | 209 | GET | /api/funil/bant/:contactId | router.get('/api/funil/bant/:contactId', async (req, res) => { |
| src/api/routes/funil.routes.js | 240 | POST | /api/leads/update-stage | router.post('/api/leads/update-stage', async (req, res) => { |
| src/api/routes/funil.routes.js | 334 | POST | /api/funil/cleanup-prospecting | router.post('/api/funil/cleanup-prospecting', async (req, res) => { |
| src/api/routes/funil.routes.js | 399 | POST | /api/funil/sheets-sync/enable | router.post('/api/funil/sheets-sync/enable', async (req, res) => { |
| src/api/routes/funil.routes.js | 418 | POST | /api/funil/sheets-sync/disable | router.post('/api/funil/sheets-sync/disable', async (req, res) => { |
| src/api/routes/funil.routes.js | 437 | POST | /api/funil/sync-to-sheets | router.post('/api/funil/sync-to-sheets', async (req, res) => { |
| src/api/routes/funil.routes.js | 570 | GET | /api/funil/pipeline-unificado | router.get('/api/funil/pipeline-unificado', async (req, res) => { |
| src/api/routes/funil.routes.js | 670 | POST | /api/leads/ingest | router.post('/api/leads/ingest', async (req, res) => { |
| src/api/routes/funil.routes.js | 898 | GET | /api/leads/ingest/stats | router.get('/api/leads/ingest/stats', async (req, res) => { |
| src/api/routes/google/calendar.routes.js | 27 | GET | /api/google/auth-url | router.get('/api/google/auth-url', async (req, res) => { |
| src/api/routes/google/calendar.routes.js | 42 | GET | /api/google/auth-status | router.get('/api/google/auth-status', async (req, res) => { |
| src/api/routes/google/calendar.routes.js | 81 | GET | /auth/google | router.get('/auth/google', async (req, res) => { |
| src/api/routes/google/calendar.routes.js | 96 | GET | /oauth2callback | router.get('/oauth2callback', async (req, res) => { |
| src/api/routes/google/calendar.routes.js | 112 | GET | /api/calendar/status | router.get('/api/calendar/status', async (req, res) => { |
| src/api/routes/google/calendar.routes.js | 127 | GET | /api/events | router.get('/api/events', async (req, res) => { |
| src/api/routes/google/calendar.routes.js | 157 | POST | /api/events | router.post('/api/events', async (req, res) => { |
| src/api/routes/google/calendar.routes.js | 225 | PUT | /api/events/:eventId | router.put('/api/events/:eventId', async (req, res) => { |
| src/api/routes/google/calendar.routes.js | 248 | DELETE | /api/events/:eventId | router.delete('/api/events/:eventId', async (req, res) => { |
| src/api/routes/google/calendar.routes.js | 271 | GET | /api/calendar/free-slots | router.get('/api/calendar/free-slots', async (req, res) => { |
| src/api/routes/google/calendar.routes.js | 300 | POST | /api/calendar/suggest-times | router.post('/api/calendar/suggest-times', async (req, res) => { |
---

# reports/02-webhook-pipeline.md

# Webhook pipeline (inbound → staging → queue → worker → processing)

## Entry points
- Legacy endpoint `/api/webhook/evolution` is hard-cutover and returns 410 Gone. Evidence: `src/api/routes/webhook.routes.js:6-106`.
- Canonical entrypoint is `POST /api/webhooks/inbound/:webhookPublicId`. Evidence: `src/api/routes/webhooks-inbound.routes.js:23-29`.

## Validation
- Canonical inbound route validates secrets/tokens/signatures via IntegrationService.validateWebhook. Evidence: `src/api/routes/webhooks-inbound.routes.js:38-46` and `src/services/IntegrationService.js:591-725`.

## Staging and idempotency
- Canonical inbound route stages payloads in `inbound_events` and checks duplicates. Evidence: `src/api/routes/webhooks-inbound.routes.js:85-97`.
- Staging uses `INSERT ... ON CONFLICT(provider, provider_event_id)` in InboundEventsService for idempotency. Evidence: `src/services/InboundEventsService.js:63-72`.
- `inbound_events` table has a unique index on `(provider, provider_event_id)` for idempotency. Evidence: `src/db/migrations/031_inbound_events.sql:41-44`.

## Queueing
- Canonical inbound enqueues MESSAGE_PROCESS jobs into `async_jobs`, with tenantId/contactId/priority. Evidence: `src/api/routes/webhooks-inbound.routes.js:99-119`.
- `async_jobs` table schema and indexes support priority, retries, contact locking. Evidence: `src/db/migrations/032_async_jobs.sql:22-77`.

## Processing
- Worker job processor is defined in `startWebhookJobProcessor()` and processes MESSAGE_PROCESS jobs using `processWebhook`. Evidence: `src/api/routes/webhook.routes.js:901-946`.
- `processWebhook` calls `webhookHandler.handleWebhook()` and centralizes response sending. Evidence: `src/api/routes/webhook.routes.js:141-168`.
- The canonical job handler `processMessageJob()` wraps `webhookHandler.handleWebhook()` for async jobs. Evidence: `src/handlers/webhook_handler.js:633-659`.
- `webhookHandler.isMessageEvent()` accepts `messages.upsert` (including `MESSAGES_UPSERT` format) and `messages.update` with payload. Evidence: `src/handlers/webhook_handler.js:433-459`.

## MESSAGES_UPSERT coverage
- Canonical inbound route normalizes event names and treats `messages.*` as high priority. Evidence: `src/api/routes/webhooks-inbound.routes.js:73-101`.
- Message handler explicitly accepts `messages.upsert` after normalization. Evidence: `src/handlers/webhook_handler.js:433-440`.

## Deduplication layers (what exists vs wired)
- DB-level idempotency is wired via `inbound_events` unique constraint and staging on conflict. Evidence: `src/db/migrations/031_inbound_events.sql:41-44` and `src/services/InboundEventsService.js:63-72`.
- EarlyDeduplicator exists in code, but canonical inbound route does not import or invoke it. Evidence: `src/utils/EarlyDeduplicator.js:1-176` and inbound route imports only IntegrationService/InboundEvents/AsyncJobs. Evidence: `src/api/routes/webhooks-inbound.routes.js:15-20`.
- `webhook_handler` comments assume dedup happened earlier, but no explicit EarlyDeduplicator call is wired in the canonical inbound route. Evidence: `src/handlers/webhook_handler.js:100-102` and `src/api/routes/webhooks-inbound.routes.js:15-119`.

## Retry/timeout handling
- Inbound events are marked processing/processed/error to support retries and backoff. Evidence: `src/services/InboundEventsService.js:121-233`.
- AsyncJobsService retries failed jobs and recovers timeouts. Evidence: `src/services/AsyncJobsService.js:486-505`.

---

# reports/03-jobs-worker.md

# Jobs and worker processing

## Jobs started by ROLE=worker (server.js)
- Cadence Engine initialization (schedules cron jobs in CadenceEngine). Evidence: `src/server.js:329-334` and `src/automation/CadenceEngine.js:90-148`.
- Prospecting Engine auto-start (also sets up a minute-based scheduler inside the engine). Evidence: `src/server.js:336-352` and `src/automation/ProspectingEngine.js:192-205`.
- Abandonment Detection job (setInterval every hour). Evidence: `src/server.js:354-357` and `src/services/AbandonmentDetectionJob.js:62-80`.
- DataSyncService (cron schedules nightly/6h/hourly retry). Evidence: `src/server.js:359-363` and `src/services/DataSyncService.js:47-80`.
- OAuth refresh job (setInterval). Evidence: `src/server.js:365-368` and `src/services/IntegrationOAuthRefreshJob.js:60-73`.
- Webhook job processor (AsyncJobsService startProcessor in webhook.routes). Evidence: `src/server.js:370-373` and `src/api/routes/webhook.routes.js:909-946`.
- Prospect Sync job (cron every 30 minutes). Evidence: `src/server.js:375-381` and `src/services/ProspectSyncJob.js:64-96`.
- AutoOptimizer (background loop inside the service). Evidence: `src/server.js:383-387` and `src/intelligence/AutoOptimizer.js:71-187`.
- AsyncJobsService processor for MESSAGE_PROCESS (canonical pipeline). Evidence: `src/server.js:389-418` and `src/services/AsyncJobsService.js:468-520`.

## Jobs started by ROLE=api (server.startup)
- Automation Engine is started inside `startServer`, which runs when API starts. Evidence: `src/config/server.startup.js:33-52`.
- Automation Engine schedules cron jobs for `trigger.type === 'schedule'`. Evidence: `src/automation/engine.js:114-146`.

## Queue/worker responsibilities
- Jobs are enqueued into `async_jobs` via `AsyncJobsService.enqueue()` (e.g., webhook inbound). Evidence: `src/services/AsyncJobsService.js:66-111` and `src/api/routes/webhooks-inbound.routes.js:102-119`.
- Jobs are dequeued and processed in `AsyncJobsService.startProcessor()`. Evidence: `src/services/AsyncJobsService.js:468-520`.

## Duplication risks (code wiring)
- Two processors for `JobType.MESSAGE_PROCESS` are started in the worker block: `startWebhookJobProcessor()` and an explicit `asyncJobsService.startProcessor()` call in server.js. Evidence: `src/api/routes/webhook.routes.js:909-945` and `src/server.js:370-418`.
- Automation Engine is started inside the API process (not worker-only). Evidence: `src/config/server.startup.js:33-52` and `src/server.js:284-321`.

## Retries, locking, and DLQ
- AsyncJobsService retries failures via `fail()` (backoff) and reschedules via `getJobsForRetry()` / `resetForRetry()` inside `startProcessor()`. Evidence: `src/services/AsyncJobsService.js:204-233` and `src/services/AsyncJobsService.js:486-505`.
- Contact-level locking is enforced by the `UPDATE ... WHERE contact_id NOT IN (processing...)` clause. Evidence: `src/services/AsyncJobsService.js:136-157`.
- No explicit dead-letter queue exists; failed jobs remain in `async_jobs` with `status='failed'` and `retry_count` logic. Evidence: `src/services/AsyncJobsService.js:204-227`.

---

# reports/04-frontends.md

# Frontends (routes, auth flow, baseURL, FE↔BE contract)

## Vite app (apps/web-vite)
- Router base is `/app` via `<BrowserRouter basename="/app">`. Evidence: `apps/web-vite/src/App.tsx:82-111`.
- API base URL defaults to `/api` (absolute) via `VITE_API_URL || '/api'`. Evidence: `apps/web-vite/src/lib/api.ts:1`.
- Login flow uses `api.login()` and then redirects to `/app/dashboard`. Evidence: `apps/web-vite/src/pages/Login.tsx:21-25`.
- `api.login()` calls `/auth/login` under the `/api` base. Evidence: `apps/web-vite/src/lib/api.ts:118-130`.
- Token refresh is POST `/auth/refresh` under the same base and redirects to `/app/login` on 401. Evidence: `apps/web-vite/src/lib/api.ts:42-48` and `apps/web-vite/src/lib/api.ts:97-107`.

## Next app (apps/web)
- Next app is marked deprecated in its package.json. Evidence: `apps/web/package.json:5-6`.
- API base URL defaults to `/api` via `NEXT_PUBLIC_API_URL || '/api'`. Evidence: `apps/web/src/lib/api.ts:1`.
- Login calls `/auth/login` under the base and redirects to `/login` on 401. Evidence: `apps/web/src/lib/api.ts:55-60` and `apps/web/src/lib/api.ts:42-46`.

## FE↔BE contract (high-signal mismatches)
From `reports/ARTIFACTS_FRONT_BACK_CONTRACT.md`:
- Vite uses `/api/campaigns` (GET/POST) but no backend route matched. Evidence: `reports/ARTIFACTS_FRONT_BACK_CONTRACT.md:15-17`.
- Vite uses `/api/funil` (GET) with no backend route matched (only `/api/funil/bant*` and `/api/funil/stats` are present). Evidence: `reports/ARTIFACTS_FRONT_BACK_CONTRACT.md:22`.
- Vite uses `/api/prospecting/stats` and `/api/prospecting/leads` (GET) with no backend route matched. Evidence: `reports/ARTIFACTS_FRONT_BACK_CONTRACT.md:25-26`.
- Vite calls `fetch('/api/whatsapp/send')` as GET (Inbox) but backend exposes POST `/api/whatsapp/send`. Evidence: `reports/ARTIFACTS_FRONT_BACK_CONTRACT.md:33` and backend route `reports/ARTIFACTS_ROUTE_SCAN.md:307`.
- Next app uses `/api/dashboard/stats`, `/api/leads*`, `/api/campaigns*`, `/api/analytics?period=` which are not matched in backend routes. Evidence: `reports/ARTIFACTS_FRONT_BACK_CONTRACT.md:36-48`.

## 404 login scenario check (frontend side)
- Vite and Next both use absolute `/api` base URLs (not relative `api/...`), so FE code does not create `/app/api/...` paths by default. Evidence: `apps/web-vite/src/lib/api.ts:1` and `apps/web/src/lib/api.ts:1`.
- If a 404 occurs on login, it is more consistent with backend mismatch/drift or missing route wiring (see `/api/auth/login` in backend). Evidence for backend route: `reports/ARTIFACTS_ROUTE_SCAN.md:146` and `src/api/routes/auth.routes.js:300`.

---

# reports/05-data-integrations.md

# Data integrations (Evolution, Google OAuth, CRMs)

## Evolution (WhatsApp via Evolution API)
- One-click connect endpoints live in `channels.routes.js` under `/api/agents/:agentId/channels/evolution/*`. Evidence: `src/api/routes/channels.routes.js:17-188`.
- Connection flow uses `IntegrationService.connectEvolutionForAgent()` to create/bind integrations and `EvolutionProvider` to create/connect instances. Evidence: `src/api/routes/channels.routes.js:31-33` and `src/services/IntegrationService.js:301-425`.
- EvolutionProvider config uses `EVOLUTION_BASE_URL`, `EVOLUTION_API_KEY`, and builds webhook URL to `/api/webhooks/inbound/:webhookPublicId`. Evidence: `src/providers/EvolutionProvider.js:27-36` and `src/providers/EvolutionProvider.js:74-76`.
- Evolution webhook events include `MESSAGES_UPSERT`/`MESSAGES_UPDATE` and lifecycle events in the provider payload. Evidence: `src/providers/EvolutionProvider.js:86-95`.
- Additional Evolution endpoints (legacy) exist in `agents.routes.js` (`/api/agents/:agentId/evolution/*`) and use `getEvolutionManager` from `src/scalable/agents`. Evidence: `src/api/routes/agents.routes.js:456-686`.

## CRM OAuth (Kommo, HubSpot, Pipedrive)
- OAuth start and callback endpoints are `/api/integrations/crm/:provider/oauth/start` and `/api/integrations/oauth/callback/:provider`. Evidence: `src/api/routes/crm-integration.routes.js:50-169`.
- Kommo is implemented; HubSpot and Pipedrive OAuth flows are TODO and return `not_implemented`. Evidence: `src/api/routes/crm-integration.routes.js:97-111` and `src/api/routes/crm-integration.routes.js:203-210`.
- Tokens are encrypted and stored in `integrations.config_json` fields `oauth_tokens_encrypted`, `oauth_token_expires_at`, and `oauth_scopes`. Evidence: `src/services/IntegrationOAuthService.js:174-195`.
- Encryption requires `INTEGRATION_ENCRYPTION_KEY` (no fallback). Evidence: `src/services/IntegrationOAuthService.js:16-21`.
- On-demand refresh uses `refreshTokensIfNeeded()` and `getValidTokens()`, currently implemented for Kommo via `KommoCRMProvider.refreshAccessToken()`. Evidence: `src/services/IntegrationOAuthService.js:262-335` and `src/providers/crm/KommoCRMProvider.js:82-121`.
- Periodic refresh job scans integrations with stored tokens and refreshes them. Evidence: `src/services/IntegrationOAuthRefreshJob.js:31-45`.

## Google OAuth / Calendar
- Google OAuth endpoints exist at `/api/google/auth-url`, `/auth/google`, and `/oauth2callback` plus calendar/event APIs. Evidence: `src/api/routes/google/calendar.routes.js:23-158`.
- OAuth tokens for Calendar are stored on disk at `GOOGLE_TOKEN_PATH` (default `./google_token.json`). Evidence: `src/api/routes/google/calendar.routes.js:45-60`.
- Meeting transcription service supports Service Account or OAuth2 via env vars (`GOOGLE_SERVICE_ACCOUNT_KEY` or `GOOGLE_CLIENT_ID/SECRET` + `GOOGLE_REFRESH_TOKEN`). Evidence: `src/services/meetings/MeetingTranscriptionService.js:41-73`.

## Known integration risks (code evidence only)
- HubSpot/Pipedrive flows are declared but not implemented, returning `not_implemented`. Evidence: `src/api/routes/crm-integration.routes.js:203-210`.
- Evolution management appears in both `channels.routes.js` (canonical) and `agents.routes.js` (legacy/scalable), implying two integration surfaces. Evidence: `src/api/routes/channels.routes.js:17-188` and `src/api/routes/agents.routes.js:456-686`.

---

# reports/06-deliverables.md

# Deliverables (executive summary, action plan, validation)

## Executive summary (evidence-backed)

### P0 (highest risk)
- **Duplicate MESSAGE_PROCESS processors**: worker starts `startWebhookJobProcessor()` (AsyncJobsService processor) and also starts `asyncJobsService.startProcessor()` for `JobType.MESSAGE_PROCESS`. Evidence: `src/api/routes/webhook.routes.js:909-945` and `src/server.js:370-418`.
- **Deploy drift risk if migrations aren’t executed**: production boot only validates schema and exits on drift; migrations must be run in deploy. Evidence: `src/server.js:176-208` and `src/db/migrate.js:447-479`.

### P1 (user-visible / contract breaks)
- **FE↔BE contract mismatches** (404 risk): multiple frontend endpoints have no backend route match. Evidence: `reports/ARTIFACTS_FRONT_BACK_CONTRACT.md:15-48`.
- **Method mismatch**: Vite fetches `/api/whatsapp/send` as GET, while backend expects POST. Evidence: `reports/ARTIFACTS_FRONT_BACK_CONTRACT.md:33` and `reports/ARTIFACTS_ROUTE_SCAN.md:307`.
- **Automation Engine runs in API process** (jobs not fully isolated): startServer initializes AutomationEngine in API runtime. Evidence: `src/config/server.startup.js:33-52` and `src/server.js:284-321`.

### P2 (architecture/maintainability)
- **Parallel stacks coexist** (`src/`, `src/scalable/`, `src/platform/`, `src/v2/`) with only `src/` wired by `server.js`. Evidence: `reports/ARTIFACTS_TREE.md:180-251` and `src/server.js:26-88`.
- **EarlyDeduplicator exists but is not wired in canonical inbound route** (currently relies on DB idempotency). Evidence: `src/utils/EarlyDeduplicator.js:1-176` and `src/api/routes/webhooks-inbound.routes.js:15-119`.

## Action plan (minimize regressions)
1) **Resolve duplicate MESSAGE_PROCESS processors**: choose one processor entrypoint (either `startWebhookJobProcessor` or the `asyncJobsService.startProcessor` block in `server.js`), remove the other, and confirm only one worker path is active. Evidence: `src/api/routes/webhook.routes.js:909-945` and `src/server.js:370-418`.
2) **Fix FE↔BE mismatches**: either add backend routes for missing FE endpoints, or update FE to use the existing backend routes. Use `reports/ARTIFACTS_FRONT_BACK_CONTRACT.md` as the checklist. Evidence: `reports/ARTIFACTS_FRONT_BACK_CONTRACT.md:15-48`.
3) **Finish API/worker separation**: move AutomationEngine start to worker-only if the goal is strict isolation. Evidence: `src/config/server.startup.js:33-52`.
4) **Enforce deploy-migrate discipline**: ensure migrations are run before production boot or in deploy step; production boot fails on drift. Evidence: `src/server.js:176-208` and `src/db/migrate.js:447-479`.

## Validation checklist
- **Backend**: `npm run lint` and `npm test` (per `package.json:25-35`). Evidence: `package.json:25-35`.
- **Routes**: spot-check FE endpoints with `curl` against `/api/*` paths listed in `reports/ARTIFACTS_FRONT_BACK_CONTRACT.md`.
- **Webhook pipeline**: POST a sample payload to `/api/webhooks/inbound/:webhookPublicId` and ensure `async_jobs` gets a MESSAGE_PROCESS job. Evidence: `src/api/routes/webhooks-inbound.routes.js:29-119` and `src/services/AsyncJobsService.js:66-111`.
- **Job processors**: verify only one MESSAGE_PROCESS processor is running in worker logs. Evidence: `src/api/routes/webhook.routes.js:909-945` and `src/server.js:370-418`.
- **Migrations**: run `node src/db/migrate.js` and ensure `_migrations` is populated; production boot should pass `validateSchemaOrFail`. Evidence: `src/db/migrate.js:160-219` and `src/db/migrate.js:447-479`.

---

# reports/ARTIFACTS_IMPORT_GRAPH.md

# Import graph (heuristic, relative imports only)

## Top files by total degree
- src/db/index.js (in: 58, out: 0, total: 58)
- src/api/routes/index.js (in: 1, out: 41, total: 42)
- src/utils/logger-wrapper.js (in: 34, out: 1, total: 35)
- src/utils/errors/index.js (in: 29, out: 0, total: 29)
- src/config/di-container.js (in: 3, out: 25, total: 28)
- src/db/connection.js (in: 23, out: 3, total: 26)
- src/utils/tenantCompat.js (in: 26, out: 0, total: 26)
- src/memory.js (in: 21, out: 2, total: 23)
- src/services/ServiceLocator.js (in: 1, out: 21, total: 22)
- src/api/routes/webhook.routes.js (in: 2, out: 19, total: 21)
- src/server.js (in: 1, out: 19, total: 20)
- src/tools/whatsapp.js (in: 15, out: 5, total: 20)
- src/automation/ProspectingEngine.js (in: 4, out: 14, total: 18)
- src/intelligence/IntelligenceOrchestrator.js (in: 4, out: 14, total: 18)
- src/middleware/auth.middleware.js (in: 15, out: 2, total: 17)
- src/handlers/webhook_handler.js (in: 5, out: 11, total: 16)
- apps/web-vite/src/App.tsx (in: 1, out: 15, total: 16)
- src/utils/logger.enhanced.js (in: 14, out: 1, total: 15)
- apps/web-vite/src/lib/utils (in: 15, out: 0, total: 15)
- src/automation/CadenceEngine.js (in: 6, out: 8, total: 14)
- apps/web-vite/src/components/ui/Button (in: 14, out: 0, total: 14)
- src/agents/agent_hub.js (in: 1, out: 12, total: 13)
- src/repositories/lead.repository.js (in: 10, out: 3, total: 13)
- apps/web-vite/src/components/ui/Card (in: 13, out: 0, total: 13)
- src/utils/phone_normalizer.js (in: 12, out: 0, total: 12)
- apps/web-vite/src/components/layout/TopBar (in: 12, out: 0, total: 12)
- src/agents/sdr_agent.js (in: 1, out: 10, total: 11)
- src/api/routes/analytics.routes.js (in: 1, out: 10, total: 11)
- src/security/SimpleBotDetector.js (in: 7, out: 4, total: 11)
- src/services/EntitlementService.js (in: 8, out: 3, total: 11)

## Detected cycles (heuristic)
- Cycle 1: src/security/SimpleBotDetector.js -> src/automation/CadenceEngine.js -> src/security/SimpleBotDetector.js -> src/security/SimpleBotDetector.js
- Cycle 2: src/api/routes/health.routes.js -> src/server.js -> src/api/routes/index.js -> src/api/routes/health.routes.js -> src/api/routes/health.routes.js
- Cycle 3: src/config/retry.config.js -> src/utils/retry.js -> src/config/retry.config.js -> src/config/retry.config.js
- Cycle 4: src/config/retry.config.js -> src/config/retry.config.js -> src/config/retry.config.js
- Cycle 5: src/v2/infrastructure/database/DatabaseConnection.js -> src/v2/infrastructure/database/DatabaseConnection.js -> src/v2/infrastructure/database/DatabaseConnection.js
---

# reports/ARTIFACTS_DB_SCHEMA_AND_QUERIES.md

# DB schema (from migrations)

## Tables created (by migration)
- src/db/migrations/001_create_accounts.sql:5 => accounts
- src/db/migrations/002_create_contacts.sql:5 => contacts
- src/db/migrations/003_create_leads.sql:5 => leads
- src/db/migrations/003_prospect_leads.js:23 => prospect_leads
- src/db/migrations/003_prospect_leads.js:92 => prospect_history
- src/db/migrations/004_create_opportunities.sql:5 => opportunities
- src/db/migrations/004_pattern_applier.js:101 => pattern_usage_log
- src/db/migrations/004_pattern_applier.js:119 => real_time_adaptations
- src/db/migrations/005_create_activities.sql:5 => activities
- src/db/migrations/005_delivery_tracking.sql:5 => cadence_actions_log
- src/db/migrations/006_create_messages.sql:6 => crm_messages
- src/db/migrations/007_add_last_response_at.sql:5 => cadence_enrollments
- src/db/migrations/007_create_meetings.sql:5 => meetings
- src/db/migrations/008_create_products.sql:5 => products
- src/db/migrations/008_create_products.sql:75 => opportunity_products
- src/db/migrations/009_create_custom_fields.sql:5 => custom_field_definitions
- src/db/migrations/010_create_workflows.sql:6 => workflows
- src/db/migrations/010_create_workflows.sql:44 => workflow_actions
- src/db/migrations/010_create_workflows.sql:82 => workflow_executions
- src/db/migrations/011_create_meeting_analysis_tables.sql:10 => meeting_transcriptions
- src/db/migrations/011_create_meeting_analysis_tables.sql:64 => meeting_analysis
- src/db/migrations/011_create_meeting_analysis_tables.sql:122 => meeting_scores
- src/db/migrations/011_create_meeting_analysis_tables.sql:188 => meeting_insights
- src/db/migrations/012_create_automations.sql:6 => automations
- src/db/migrations/012_create_automations.sql:39 => automation_executions
- src/db/migrations/013_create_users.sql:5 => users
- src/db/migrations/014_create_teams.sql:5 => teams
- src/db/migrations/014_create_teams.sql:20 => user_teams
- src/db/migrations/015_create_notifications.sql:5 => notifications
- src/db/migrations/015_create_notifications.sql:28 => notification_preferences
- src/db/migrations/016_create_scoring_rules.sql:6 => scoring_rules
- src/db/migrations/016_create_scoring_rules.sql:29 => lead_scores
- src/db/migrations/016_create_scoring_rules.sql:47 => score_history
- src/db/migrations/017_extend_activities.sql:17 => activities
- src/db/migrations/018_create_sessions.sql:5 => sessions
- src/db/migrations/018_create_sessions.sql:22 => auth_audit_log
- src/db/migrations/018_create_sessions.sql:40 => password_reset_tokens
- src/db/migrations/019_create_pipeline_stages.sql:5 => pipelines
- src/db/migrations/019_create_pipeline_stages.sql:17 => pipeline_stages
- src/db/migrations/019_create_pipeline_stages.sql:48 => loss_reasons
- src/db/migrations/019_create_pipeline_stages.sql:59 => pipeline_history
- src/db/migrations/020_extend_leads_cadence.sql:66 => cadences
- src/db/migrations/020_extend_leads_cadence.sql:92 => cadence_steps
- src/db/migrations/020_extend_leads_cadence.sql:129 => cadence_enrollments
- src/db/migrations/020_extend_leads_cadence.sql:171 => cadence_actions_log
- src/db/migrations/021_insert_cadence_steps.sql:325 => response_templates
- src/db/migrations/025_multi_tenancy.sql:44 => agents
- src/db/migrations/025_multi_tenancy.sql:72 => agent_versions
- src/db/migrations/025_multi_tenancy.sql:93 => integrations
- src/db/migrations/025_multi_tenancy.sql:121 => integration_bindings
- src/db/migrations/025_multi_tenancy_simple.sql:30 => integrations
- src/db/migrations/028_trial_billing.sql:42 => user_trial_grants
- src/db/migrations/028_trial_billing.sql:61 => subscription_plans
- src/db/migrations/028_trial_billing.sql:92 => billing_events
- src/db/migrations/028_trial_billing.sql:119 => usage_metrics
- src/db/migrations/030_crm_integration.sql:12 => oauth_states
- src/db/migrations/030_crm_integration.sql:36 => crm_sync_cursors
- src/db/migrations/030_crm_integration.sql:60 => crm_mappings
- src/db/migrations/030_crm_integration.sql:87 => crm_sync_jobs
- src/db/migrations/030_crm_integration.sql:118 => crm_field_mappings
- src/db/migrations/031_inbound_events.sql:21 => inbound_events
- src/db/migrations/032_async_jobs.sql:22 => async_jobs
- src/db/migrations/035_conversation_contexts.sql:14 => conversation_contexts
- src/db/migrations/036_agent_versions_immutability.sql:22 => agent_versions
- src/db/migrations/043_fix_missing_critical_tables.sql:12 => sessions
- src/db/migrations/043_fix_missing_critical_tables.sql:38 => auth_audit_log
- src/db/migrations/043_fix_missing_critical_tables.sql:63 => password_reset_tokens
- src/db/migrations/043_fix_missing_critical_tables.sql:80 => agents
- src/db/migrations/043_fix_missing_critical_tables.sql:108 => agent_versions
- src/db/migrations/043_fix_missing_critical_tables.sql:129 => integrations
- src/db/migrations/043_fix_missing_critical_tables.sql:157 => integration_bindings

## tenant_id references in migrations
- src/db/migrations/025_multi_tenancy.sql:4 => -- Adds tenant_id column to main tables for data isolation
- src/db/migrations/025_multi_tenancy.sql:9 => -- STEP 1: Add tenant_id to existing tables
- src/db/migrations/025_multi_tenancy.sql:12 => -- Add tenant_id to leads table
- src/db/migrations/025_multi_tenancy.sql:13 => ALTER TABLE leads ADD COLUMN tenant_id TEXT DEFAULT 'default';
- src/db/migrations/025_multi_tenancy.sql:14 => CREATE INDEX IF NOT EXISTS idx_leads_tenant_id ON leads(tenant_id);
- src/db/migrations/025_multi_tenancy.sql:16 => -- Add tenant_id to accounts table
- src/db/migrations/025_multi_tenancy.sql:17 => ALTER TABLE accounts ADD COLUMN tenant_id TEXT DEFAULT 'default';
- src/db/migrations/025_multi_tenancy.sql:18 => CREATE INDEX IF NOT EXISTS idx_accounts_tenant_id ON accounts(tenant_id);
- src/db/migrations/025_multi_tenancy.sql:20 => -- Add tenant_id to contacts table
- src/db/migrations/025_multi_tenancy.sql:21 => ALTER TABLE contacts ADD COLUMN tenant_id TEXT DEFAULT 'default';
- src/db/migrations/025_multi_tenancy.sql:22 => CREATE INDEX IF NOT EXISTS idx_contacts_tenant_id ON contacts(tenant_id);
- src/db/migrations/025_multi_tenancy.sql:24 => -- Add tenant_id to opportunities table
- src/db/migrations/025_multi_tenancy.sql:25 => ALTER TABLE opportunities ADD COLUMN tenant_id TEXT DEFAULT 'default';
- src/db/migrations/025_multi_tenancy.sql:26 => CREATE INDEX IF NOT EXISTS idx_opportunities_tenant_id ON opportunities(tenant_id);
- src/db/migrations/025_multi_tenancy.sql:28 => -- Add tenant_id to activities table
- src/db/migrations/025_multi_tenancy.sql:29 => ALTER TABLE activities ADD COLUMN tenant_id TEXT DEFAULT 'default';
- src/db/migrations/025_multi_tenancy.sql:30 => CREATE INDEX IF NOT EXISTS idx_activities_tenant_id ON activities(tenant_id);
- src/db/migrations/025_multi_tenancy.sql:32 => -- Add tenant_id to whatsapp_messages table
- src/db/migrations/025_multi_tenancy.sql:33 => ALTER TABLE whatsapp_messages ADD COLUMN tenant_id TEXT DEFAULT 'default';
- src/db/migrations/025_multi_tenancy.sql:34 => CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_tenant_id ON whatsapp_messages(tenant_id);
- src/db/migrations/025_multi_tenancy.sql:36 => -- Add tenant_id to pipelines table
- src/db/migrations/025_multi_tenancy.sql:37 => ALTER TABLE pipelines ADD COLUMN tenant_id TEXT DEFAULT 'default';
- src/db/migrations/025_multi_tenancy.sql:38 => CREATE INDEX IF NOT EXISTS idx_pipelines_tenant_id ON pipelines(tenant_id);
- src/db/migrations/025_multi_tenancy.sql:46 => tenant_id TEXT NOT NULL DEFAULT 'default',
- src/db/migrations/025_multi_tenancy.sql:61 => UNIQUE(tenant_id, slug)
- src/db/migrations/025_multi_tenancy.sql:64 => CREATE INDEX IF NOT EXISTS idx_agents_tenant_id ON agents(tenant_id);
- src/db/migrations/025_multi_tenancy.sql:74 => tenant_id TEXT NOT NULL,
- src/db/migrations/025_multi_tenancy.sql:87 => CREATE INDEX IF NOT EXISTS idx_agent_versions_tenant_id ON agent_versions(tenant_id);
- src/db/migrations/025_multi_tenancy.sql:95 => tenant_id TEXT NOT NULL,
- src/db/migrations/025_multi_tenancy.sql:110 => UNIQUE(tenant_id, provider, instance_name)
- src/db/migrations/025_multi_tenancy.sql:113 => CREATE INDEX IF NOT EXISTS idx_integrations_tenant_id ON integrations(tenant_id);
- src/db/migrations/025_multi_tenancy.sql:123 => tenant_id TEXT NOT NULL,
- src/db/migrations/025_multi_tenancy.sql:134 => CREATE INDEX IF NOT EXISTS idx_integration_bindings_tenant_id ON integration_bindings(tenant_id);
- src/db/migrations/025_multi_tenancy.sql:143 => UPDATE leads SET tenant_id = 'default' WHERE tenant_id IS NULL;
- src/db/migrations/025_multi_tenancy.sql:146 => UPDATE accounts SET tenant_id = 'default' WHERE tenant_id IS NULL;
- src/db/migrations/025_multi_tenancy.sql:149 => UPDATE contacts SET tenant_id = 'default' WHERE tenant_id IS NULL;
- src/db/migrations/025_multi_tenancy.sql:152 => UPDATE opportunities SET tenant_id = 'default' WHERE tenant_id IS NULL;
- src/db/migrations/025_multi_tenancy.sql:155 => UPDATE activities SET tenant_id = 'default' WHERE tenant_id IS NULL;
- src/db/migrations/025_multi_tenancy.sql:158 => UPDATE whatsapp_messages SET tenant_id = 'default' WHERE tenant_id IS NULL;
- src/db/migrations/025_multi_tenancy.sql:161 => UPDATE pipelines SET tenant_id = 'default' WHERE tenant_id IS NULL;
- src/db/migrations/025_multi_tenancy.sql:167 => INSERT OR IGNORE INTO integrations (id, tenant_id, provider, instance_name, status, is_active)
- src/db/migrations/025_multi_tenancy.sql:174 => INSERT OR IGNORE INTO agents (id, tenant_id, name, slug, type, status, description, created_by_user_id)
- src/db/migrations/025_multi_tenancy.sql:187 => INSERT OR IGNORE INTO integration_bindings (id, tenant_id, agent_id, integration_id, is_primary)
- src/db/migrations/025_multi_tenancy_simple.sql:4 => -- Only adds tenant_id to tables that don't have it
- src/db/migrations/025_multi_tenancy_simple.sql:5 => -- Does NOT modify existing agents table (already has tenant_id)
- src/db/migrations/025_multi_tenancy_simple.sql:9 => -- STEP 1: Add tenant_id to whatsapp_messages if missing
- src/db/migrations/025_multi_tenancy_simple.sql:14 => ALTER TABLE whatsapp_messages ADD COLUMN tenant_id TEXT DEFAULT 'default';
- src/db/migrations/025_multi_tenancy_simple.sql:15 => CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_tenant_id ON whatsapp_messages(tenant_id);
- src/db/migrations/025_multi_tenancy_simple.sql:19 => -- Only update tables that have tenant_id column
- src/db/migrations/025_multi_tenancy_simple.sql:22 => UPDATE whatsapp_messages SET tenant_id = 'default' WHERE tenant_id IS NULL;
- src/db/migrations/025_multi_tenancy_simple.sql:23 => UPDATE agents SET tenant_id = 'default' WHERE tenant_id IS NULL;
- src/db/migrations/025_multi_tenancy_simple.sql:24 => -- Note: leads table is single-tenant by design, no tenant_id column
- src/db/migrations/025_multi_tenancy_simple.sql:32 => tenant_id TEXT NOT NULL DEFAULT 'default',
- src/db/migrations/025_multi_tenancy_simple.sql:47 => UNIQUE(tenant_id, provider, instance_name)
- src/db/migrations/025_multi_tenancy_simple.sql:50 => CREATE INDEX IF NOT EXISTS idx_integrations_tenant_id ON integrations(tenant_id);
- src/db/migrations/025_multi_tenancy_simple.sql:58 => INSERT OR IGNORE INTO integrations (id, tenant_id, provider, instance_name, status, is_active)
- src/db/migrations/030_crm_integration.sql:14 => tenant_id TEXT NOT NULL,
- src/db/migrations/030_crm_integration.sql:24 => FOREIGN KEY (tenant_id) REFERENCES teams(id) ON DELETE CASCADE,
- src/db/migrations/030_crm_integration.sql:29 => CREATE INDEX IF NOT EXISTS idx_oauth_states_tenant ON oauth_states(tenant_id);
- src/db/migrations/030_crm_integration.sql:38 => tenant_id TEXT NOT NULL,
- src/db/migrations/030_crm_integration.sql:50 => FOREIGN KEY (tenant_id) REFERENCES teams(id) ON DELETE CASCADE,
- src/db/migrations/030_crm_integration.sql:62 => tenant_id TEXT NOT NULL,
- src/db/migrations/030_crm_integration.sql:74 => FOREIGN KEY (tenant_id) REFERENCES teams(id) ON DELETE CASCADE,
- src/db/migrations/030_crm_integration.sql:89 => tenant_id TEXT NOT NULL,
- src/db/migrations/030_crm_integration.sql:106 => FOREIGN KEY (tenant_id) REFERENCES teams(id) ON DELETE CASCADE,
- src/db/migrations/030_crm_integration.sql:120 => tenant_id TEXT NOT NULL,
- src/db/migrations/030_crm_integration.sql:132 => FOREIGN KEY (tenant_id) REFERENCES teams(id) ON DELETE CASCADE,
- src/db/migrations/030_crm_integration.sql:160 => JOIN teams t ON i.tenant_id = t.id
- src/db/migrations/031_inbound_events.sql:23 => tenant_id TEXT DEFAULT 'default',                 -- Multi-tenant support
- src/db/migrations/031_inbound_events.sql:52 => ON inbound_events(tenant_id, created_at DESC);
- src/db/migrations/032_async_jobs.sql:24 => tenant_id TEXT DEFAULT 'default',                 -- Multi-tenant support
- src/db/migrations/032_async_jobs.sql:68 => ON async_jobs(tenant_id, created_at DESC);
- src/db/migrations/035_conversation_contexts.sql:18 => tenant_id TEXT DEFAULT 'default',                 -- Multi-tenant support
- src/db/migrations/035_conversation_contexts.sql:44 => ON conversation_contexts(tenant_id, created_at DESC);
- src/db/migrations/037_webhook_public_id_column.sql:98 => i.tenant_id,
- src/db/migrations/039_add_tenant_id_aliases.js:3 => * @description Add tenant_id aliases for legacy team_id columns
- src/db/migrations/039_add_tenant_id_aliases.js:55 => // users: tenant_id alias
- src/db/migrations/039_add_tenant_id_aliases.js:56 => addColumnIfMissing(db, 'users', 'tenant_id', 'TEXT');
- src/db/migrations/039_add_tenant_id_aliases.js:57 => backfillColumn(db, 'users', 'tenant_id', 'team_id');
- src/db/migrations/039_add_tenant_id_aliases.js:58 => ensureIndex(db, 'idx_users_tenant', 'users', 'tenant_id');
- src/db/migrations/039_add_tenant_id_aliases.js:60 => // user_teams: tenant_id alias
- src/db/migrations/039_add_tenant_id_aliases.js:61 => addColumnIfMissing(db, 'user_teams', 'tenant_id', 'TEXT');
- src/db/migrations/039_add_tenant_id_aliases.js:62 => backfillColumn(db, 'user_teams', 'tenant_id', 'team_id');
- src/db/migrations/039_add_tenant_id_aliases.js:63 => ensureIndex(db, 'idx_user_teams_tenant', 'user_teams', 'tenant_id');
- src/db/migrations/039_add_tenant_id_aliases.js:65 => // billing_events: tenant_id alias
- src/db/migrations/039_add_tenant_id_aliases.js:66 => addColumnIfMissing(db, 'billing_events', 'tenant_id', 'TEXT');
- src/db/migrations/039_add_tenant_id_aliases.js:67 => backfillColumn(db, 'billing_events', 'tenant_id', 'team_id');
- src/db/migrations/039_add_tenant_id_aliases.js:68 => ensureIndex(db, 'idx_billing_events_tenant', 'billing_events', 'tenant_id');
- src/db/migrations/039_add_tenant_id_aliases.js:70 => // usage_metrics: tenant_id alias
- src/db/migrations/039_add_tenant_id_aliases.js:71 => addColumnIfMissing(db, 'usage_metrics', 'tenant_id', 'TEXT');
- src/db/migrations/039_add_tenant_id_aliases.js:72 => backfillColumn(db, 'usage_metrics', 'tenant_id', 'team_id');
- src/db/migrations/039_add_tenant_id_aliases.js:73 => ensureIndex(db, 'idx_usage_metrics_tenant', 'usage_metrics', 'tenant_id');
- src/db/migrations/039_add_tenant_id_aliases.js:74 => ensureUniqueIndex(db, 'uq_usage_metrics_tenant_period', 'usage_metrics', ['tenant_id', 'metric_type', 'period_start']);
- src/db/migrations/039_add_tenant_id_aliases.js:76 => // user_trial_grants: tenant_id alias
- src/db/migrations/039_add_tenant_id_aliases.js:77 => addColumnIfMissing(db, 'user_trial_grants', 'tenant_id', 'TEXT');
- src/db/migrations/039_add_tenant_id_aliases.js:78 => backfillColumn(db, 'user_trial_grants', 'tenant_id', 'first_team_id');
- src/db/migrations/039_add_tenant_id_aliases.js:79 => ensureIndex(db, 'idx_user_trial_grants_tenant', 'user_trial_grants', 'tenant_id');
- src/db/migrations/039_tenant_id_canonical.sql:4 => -- P0-5: Establishes tenant_id as the canonical column name
- src/db/migrations/039_tenant_id_canonical.sql:9 => -- - All other tables use tenant_id for tenant isolation
- src/db/migrations/039_tenant_id_canonical.sql:11 => -- This migration ensures the users table has a tenant_id column
- src/db/migrations/039_tenant_id_canonical.sql:15 => -- Add tenant_id to users table (mirrors team_id)
- src/db/migrations/039_tenant_id_canonical.sql:17 => ALTER TABLE users ADD COLUMN tenant_id TEXT DEFAULT NULL;
- src/db/migrations/039_tenant_id_canonical.sql:19 => -- Backfill tenant_id from team_id
- src/db/migrations/039_tenant_id_canonical.sql:20 => UPDATE users SET tenant_id = team_id WHERE tenant_id IS NULL AND team_id IS NOT NULL;
- src/db/migrations/039_tenant_id_canonical.sql:22 => -- Create index for tenant_id
- src/db/migrations/039_tenant_id_canonical.sql:23 => CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
- src/db/migrations/039_tenant_id_canonical.sql:25 => -- Trigger to keep tenant_id in sync with team_id
- src/db/migrations/039_tenant_id_canonical.sql:28 => WHEN NEW.tenant_id IS NULL AND NEW.team_id IS NOT NULL
- src/db/migrations/039_tenant_id_canonical.sql:30 => UPDATE users SET tenant_id = NEW.team_id WHERE id = NEW.id;
- src/db/migrations/039_tenant_id_canonical.sql:37 => UPDATE users SET tenant_id = NEW.team_id WHERE id = NEW.id;
- src/db/migrations/039_tenant_id_canonical.sql:41 => -- Add tenant_id to teams table (self-referencing)
- src/db/migrations/039_tenant_id_canonical.sql:42 => -- teams.tenant_id = teams.id (a team is its own tenant)
- src/db/migrations/039_tenant_id_canonical.sql:45 => ALTER TABLE teams ADD COLUMN tenant_id TEXT DEFAULT NULL;
- src/db/migrations/039_tenant_id_canonical.sql:47 => -- Backfill: team's tenant_id is itself
- src/db/migrations/039_tenant_id_canonical.sql:48 => UPDATE teams SET tenant_id = id WHERE tenant_id IS NULL;
- src/db/migrations/039_tenant_id_canonical.sql:50 => -- Trigger to auto-set tenant_id on insert
- src/db/migrations/039_tenant_id_canonical.sql:53 => WHEN NEW.tenant_id IS NULL
- src/db/migrations/039_tenant_id_canonical.sql:55 => UPDATE teams SET tenant_id = NEW.id WHERE id = NEW.id;
- src/db/migrations/039_tenant_id_canonical.sql:67 => -- DONE: tenant_id is now canonical across all tables
- src/db/migrations/040_add_tenant_id_learning_tables.js:3 => * @description Add tenant_id to learning/analytics tables if missing.
- src/db/migrations/040_add_tenant_id_learning_tables.js:49 => addColumnIfMissing(db, 'meetings', 'tenant_id', `TEXT DEFAULT '${DEFAULT_TENANT_ID}'`);
- src/db/migrations/040_add_tenant_id_learning_tables.js:50 => ensureIndex(db, 'idx_meetings_tenant', 'meetings', 'tenant_id');
- src/db/migrations/040_add_tenant_id_learning_tables.js:51 => backfillDefault(db, 'meetings', 'tenant_id', DEFAULT_TENANT_ID);
- src/db/migrations/040_add_tenant_id_learning_tables.js:54 => addColumnIfMissing(db, 'conversation_outcomes', 'tenant_id', `TEXT DEFAULT '${DEFAULT_TENANT_ID}'`);
- src/db/migrations/040_add_tenant_id_learning_tables.js:55 => ensureIndex(db, 'idx_conversation_outcomes_tenant', 'conversation_outcomes', 'tenant_id');
- src/db/migrations/040_add_tenant_id_learning_tables.js:56 => backfillDefault(db, 'conversation_outcomes', 'tenant_id', DEFAULT_TENANT_ID);
- src/db/migrations/040_add_tenant_id_learning_tables.js:58 => addColumnIfMissing(db, 'abandonment_patterns', 'tenant_id', `TEXT DEFAULT '${DEFAULT_TENANT_ID}'`);
- src/db/migrations/040_add_tenant_id_learning_tables.js:59 => ensureIndex(db, 'idx_abandonment_patterns_tenant', 'abandonment_patterns', 'tenant_id');
- src/db/migrations/040_add_tenant_id_learning_tables.js:60 => backfillDefault(db, 'abandonment_patterns', 'tenant_id', DEFAULT_TENANT_ID);
- src/db/migrations/040_add_tenant_id_learning_tables.js:63 => addColumnIfMissing(db, 'sentiment_momentum', 'tenant_id', `TEXT DEFAULT '${DEFAULT_TENANT_ID}'`);
- src/db/migrations/040_add_tenant_id_learning_tables.js:64 => ensureIndex(db, 'idx_sentiment_momentum_tenant', 'sentiment_momentum', 'tenant_id');
- src/db/migrations/040_add_tenant_id_learning_tables.js:65 => backfillDefault(db, 'sentiment_momentum', 'tenant_id', DEFAULT_TENANT_ID);
- src/db/migrations/040_add_tenant_id_learning_tables.js:67 => addColumnIfMissing(db, 'ab_experiments', 'tenant_id', `TEXT DEFAULT '${DEFAULT_TENANT_ID}'`);
- src/db/migrations/040_add_tenant_id_learning_tables.js:68 => ensureIndex(db, 'idx_ab_experiments_tenant', 'ab_experiments', 'tenant_id');
- src/db/migrations/040_add_tenant_id_learning_tables.js:69 => backfillDefault(db, 'ab_experiments', 'tenant_id', DEFAULT_TENANT_ID);
- src/db/migrations/040_add_tenant_id_learning_tables.js:72 => addColumnIfMissing(db, 'message_sentiment', 'tenant_id', `TEXT DEFAULT '${DEFAULT_TENANT_ID}'`);
- src/db/migrations/040_add_tenant_id_learning_tables.js:73 => ensureIndex(db, 'idx_message_sentiment_tenant', 'message_sentiment', 'tenant_id');
- src/db/migrations/040_add_tenant_id_learning_tables.js:74 => backfillDefault(db, 'message_sentiment', 'tenant_id', DEFAULT_TENANT_ID);
- src/db/migrations/040_add_tenant_id_learning_tables.js:77 => addColumnIfMissing(db, 'conversation_activity', 'tenant_id', `TEXT DEFAULT '${DEFAULT_TENANT_ID}'`);
- src/db/migrations/040_add_tenant_id_learning_tables.js:78 => ensureIndex(db, 'idx_conversation_activity_tenant', 'conversation_activity', 'tenant_id');
- src/db/migrations/040_add_tenant_id_learning_tables.js:79 => backfillDefault(db, 'conversation_activity', 'tenant_id', DEFAULT_TENANT_ID);
- src/db/migrations/040_add_tenant_to_cadence.js:3 => * @description Add tenant_id to cadence and pipeline tables
- src/db/migrations/040_add_tenant_to_cadence.js:59 => addColumnIfMissing(db, 'cadences', 'tenant_id', "TEXT DEFAULT 'default'");
- src/db/migrations/040_add_tenant_to_cadence.js:60 => backfillDefault(db, 'cadences', 'tenant_id');
- src/db/migrations/040_add_tenant_to_cadence.js:61 => ensureIndex(db, 'idx_cadences_tenant', 'cadences', 'tenant_id');
- src/db/migrations/040_add_tenant_to_cadence.js:64 => addColumnIfMissing(db, 'cadence_steps', 'tenant_id', "TEXT DEFAULT 'default'");
- src/db/migrations/040_add_tenant_to_cadence.js:68 => 'tenant_id',
- src/db/migrations/040_add_tenant_to_cadence.js:69 => "(SELECT tenant_id FROM cadences WHERE cadences.id = cadence_steps.cadence_id)"
- src/db/migrations/040_add_tenant_to_cadence.js:71 => ensureIndex(db, 'idx_cadence_steps_tenant', 'cadence_steps', 'tenant_id');
- src/db/migrations/040_add_tenant_to_cadence.js:74 => addColumnIfMissing(db, 'cadence_enrollments', 'tenant_id', "TEXT DEFAULT 'default'");
- src/db/migrations/040_add_tenant_to_cadence.js:78 => 'tenant_id',
- src/db/migrations/040_add_tenant_to_cadence.js:79 => "(SELECT tenant_id FROM leads WHERE leads.id = cadence_enrollments.lead_id)"
- src/db/migrations/040_add_tenant_to_cadence.js:81 => ensureIndex(db, 'idx_cadence_enrollments_tenant', 'cadence_enrollments', 'tenant_id');
- src/db/migrations/040_add_tenant_to_cadence.js:84 => addColumnIfMissing(db, 'cadence_actions_log', 'tenant_id', "TEXT DEFAULT 'default'");
- src/db/migrations/040_add_tenant_to_cadence.js:88 => 'tenant_id',
- src/db/migrations/040_add_tenant_to_cadence.js:89 => "(SELECT tenant_id FROM cadence_enrollments WHERE cadence_enrollments.id = cadence_actions_log.enrollment_id)"
- src/db/migrations/040_add_tenant_to_cadence.js:91 => ensureIndex(db, 'idx_cadence_actions_tenant', 'cadence_actions_log', 'tenant_id');
- src/db/migrations/040_add_tenant_to_cadence.js:94 => addColumnIfMissing(db, 'pipeline_stages', 'tenant_id', "TEXT DEFAULT 'default'");
- src/db/migrations/040_add_tenant_to_cadence.js:95 => backfillDefault(db, 'pipeline_stages', 'tenant_id');
- src/db/migrations/040_add_tenant_to_cadence.js:96 => ensureIndex(db, 'idx_pipeline_stages_tenant', 'pipeline_stages', 'tenant_id');
- src/db/migrations/042_add_hot_table_indexes.js:41 => ensureCompositeIndex(db, 'idx_leads_tenant_created', 'leads', ['tenant_id', 'created_at DESC']);
- src/db/migrations/042_add_hot_table_indexes.js:42 => ensureCompositeIndex(db, 'idx_leads_tenant_phone', 'leads', ['tenant_id', 'telefone']);
- src/db/migrations/042_add_hot_table_indexes.js:43 => ensureCompositeIndex(db, 'idx_leads_tenant_whatsapp', 'leads', ['tenant_id', 'whatsapp']);
- src/db/migrations/042_add_hot_table_indexes.js:46 => ensureCompositeIndex(db, 'idx_whatsapp_messages_tenant_created', 'whatsapp_messages', ['tenant_id', 'created_at DESC']);
- src/db/migrations/042_add_hot_table_indexes.js:47 => ensureCompositeIndex(db, 'idx_whatsapp_messages_tenant_phone', 'whatsapp_messages', ['tenant_id', 'phone_number']);
- src/db/migrations/043_fix_missing_critical_tables.sql:82 => tenant_id TEXT NOT NULL DEFAULT 'default',
- src/db/migrations/043_fix_missing_critical_tables.sql:97 => UNIQUE(tenant_id, slug)
- src/db/migrations/043_fix_missing_critical_tables.sql:100 => CREATE INDEX IF NOT EXISTS idx_agents_tenant_id ON agents(tenant_id);
- src/db/migrations/043_fix_missing_critical_tables.sql:110 => tenant_id TEXT NOT NULL,
- src/db/migrations/043_fix_missing_critical_tables.sql:123 => CREATE INDEX IF NOT EXISTS idx_agent_versions_tenant_id ON agent_versions(tenant_id);
- src/db/migrations/043_fix_missing_critical_tables.sql:131 => tenant_id TEXT NOT NULL,
- src/db/migrations/043_fix_missing_critical_tables.sql:146 => UNIQUE(tenant_id, provider, instance_name)
- src/db/migrations/043_fix_missing_critical_tables.sql:149 => CREATE INDEX IF NOT EXISTS idx_integrations_tenant_id ON integrations(tenant_id);
- src/db/migrations/043_fix_missing_critical_tables.sql:159 => tenant_id TEXT NOT NULL,
- src/db/migrations/043_fix_missing_critical_tables.sql:170 => CREATE INDEX IF NOT EXISTS idx_integration_bindings_tenant_id ON integration_bindings(tenant_id);

## Queries with tenant-guard ignore
- src/api/routes/ai-insights.routes.js:44 => /* tenant-guard: ignore */
- src/api/routes/ai-insights.routes.js:50 => FROM whatsapp_messages /* tenant-guard: ignore */
- src/api/routes/ai-insights.routes.js:135 => /* tenant-guard: ignore */
- src/api/routes/ai-insights.routes.js:137 => FROM whatsapp_messages /* tenant-guard: ignore */
- src/api/routes/ai-insights.routes.js:207 => /* tenant-guard: ignore */
- src/api/routes/ai-insights.routes.js:211 => FROM leads l /* tenant-guard: ignore */
- src/api/routes/ai-insights.routes.js:308 => /* tenant-guard: ignore */
- src/api/routes/ai-insights.routes.js:314 => FROM whatsapp_messages /* tenant-guard: ignore */
- src/api/routes/ai-insights.routes.js:322 => /* tenant-guard: ignore */
- src/api/routes/ai-insights.routes.js:331 => FROM whatsapp_messages /* tenant-guard: ignore */
- src/api/routes/ai-insights.routes.js:341 => /* tenant-guard: ignore */
- src/api/routes/ai-insights.routes.js:345 => FROM whatsapp_messages /* tenant-guard: ignore */
- src/api/routes/ai-insights.routes.js:356 => /* tenant-guard: ignore */
- src/api/routes/ai-insights.routes.js:358 => FROM meetings /* tenant-guard: ignore */
- src/api/routes/ai-insights.routes.js:366 => /* tenant-guard: ignore */
- src/api/routes/ai-insights.routes.js:370 => FROM leads /* tenant-guard: ignore */
- src/api/routes/ai-insights.routes.js:421 => /* tenant-guard: ignore */
- src/api/routes/ai-insights.routes.js:422 => SELECT COUNT(*) as count FROM activities /* tenant-guard: ignore */
- src/api/routes/ai-insights.routes.js:441 => /* tenant-guard: ignore */
- src/api/routes/ai-insights.routes.js:443 => FROM leads l /* tenant-guard: ignore */
- src/api/routes/ai-insights.routes.js:464 => /* tenant-guard: ignore */
- src/api/routes/ai-insights.routes.js:466 => FROM opportunities /* tenant-guard: ignore */
- src/api/routes/ai-insights.routes.js:485 => /* tenant-guard: ignore */
- src/api/routes/ai-insights.routes.js:486 => SELECT COUNT(*) as count FROM meetings /* tenant-guard: ignore */
- src/api/routes/ai-insights.routes.js:504 => /* tenant-guard: ignore */
- src/api/routes/ai-insights.routes.js:508 => FROM leads /* tenant-guard: ignore */
- src/api/routes/analytics.routes.js:47 => /* tenant-guard: ignore */
- src/api/routes/analytics.routes.js:49 => FROM whatsapp_messages /* tenant-guard: ignore */
- src/api/routes/analytics.routes.js:53 => /* tenant-guard: ignore */
- src/api/routes/analytics.routes.js:55 => FROM whatsapp_messages /* tenant-guard: ignore */
- src/api/routes/analytics.routes.js:61 => /* tenant-guard: ignore */
- src/api/routes/analytics.routes.js:63 => FROM whatsapp_messages /* tenant-guard: ignore */
- src/api/routes/analytics.routes.js:137 => /* tenant-guard: ignore */
- src/api/routes/analytics.routes.js:139 => FROM whatsapp_messages /* tenant-guard: ignore */
- src/api/routes/analytics.routes.js:145 => /* tenant-guard: ignore */
- src/api/routes/analytics.routes.js:147 => FROM whatsapp_messages /* tenant-guard: ignore */
- src/api/routes/analytics.routes.js:151 => /* tenant-guard: ignore */
- src/api/routes/analytics.routes.js:153 => FROM whatsapp_messages /* tenant-guard: ignore */
- src/api/routes/analytics.routes.js:159 => /* tenant-guard: ignore */
- src/api/routes/analytics.routes.js:161 => FROM whatsapp_messages /* tenant-guard: ignore */
- src/api/routes/analytics.routes.js:223 => /* tenant-guard: ignore */
- src/api/routes/analytics.routes.js:228 => FROM whatsapp_messages /* tenant-guard: ignore */
- src/api/routes/analytics.routes.js:270 => /* tenant-guard: ignore */
- src/api/routes/analytics.routes.js:274 => FROM whatsapp_messages /* tenant-guard: ignore */
- src/api/routes/command-center.routes.js:50 => /* tenant-guard: ignore */
- src/api/routes/command-center.routes.js:56 => FROM leads /* tenant-guard: ignore */
- src/api/routes/command-center.routes.js:63 => /* tenant-guard: ignore */
- src/api/routes/command-center.routes.js:71 => FROM opportunities /* tenant-guard: ignore */
- src/api/routes/command-center.routes.js:87 => /* tenant-guard: ignore */
- src/api/routes/command-center.routes.js:93 => FROM activities /* tenant-guard: ignore */
- src/api/routes/command-center.routes.js:100 => /* tenant-guard: ignore */
- src/api/routes/command-center.routes.js:102 => FROM meetings /* tenant-guard: ignore */
- src/api/routes/command-center.routes.js:110 => /* tenant-guard: ignore */
- src/api/routes/command-center.routes.js:115 => FROM whatsapp_messages /* tenant-guard: ignore */
- src/api/routes/command-center.routes.js:170 => /* tenant-guard: ignore */
- src/api/routes/command-center.routes.js:177 => FROM activities a /* tenant-guard: ignore */
- src/api/routes/command-center.routes.js:230 => /* tenant-guard: ignore */
- src/api/routes/command-center.routes.js:239 => FROM whatsapp_messages /* tenant-guard: ignore */
- src/api/routes/command-center.routes.js:242 => FROM leads l /* tenant-guard: ignore */
- src/api/routes/command-center.routes.js:293 => /* tenant-guard: ignore */
- src/api/routes/command-center.routes.js:303 => FROM activities a /* tenant-guard: ignore */
- src/api/routes/command-center.routes.js:314 => /* tenant-guard: ignore */
- src/api/routes/command-center.routes.js:324 => FROM leads /* tenant-guard: ignore */
- src/api/routes/command-center.routes.js:334 => /* tenant-guard: ignore */
- src/api/routes/command-center.routes.js:344 => FROM opportunities /* tenant-guard: ignore */
- src/api/routes/command-center.routes.js:379 => /* tenant-guard: ignore */
- src/api/routes/command-center.routes.js:386 => FROM opportunities /* tenant-guard: ignore */
- src/api/routes/command-center.routes.js:439 => /* tenant-guard: ignore */
- src/api/routes/command-center.routes.js:443 => FROM leads /* tenant-guard: ignore */
- src/api/routes/command-center.routes.js:452 => /* tenant-guard: ignore */
- src/api/routes/command-center.routes.js:457 => FROM whatsapp_messages /* tenant-guard: ignore */
- src/api/routes/command-center.routes.js:466 => /* tenant-guard: ignore */
- src/api/routes/command-center.routes.js:471 => FROM activities /* tenant-guard: ignore */
- src/api/routes/email-optin.routes.js:306 => /* tenant-guard: ignore */
- src/api/routes/email-optin.routes.js:308 => FROM leads l /* tenant-guard: ignore */
- src/api/routes/email-optin.routes.js:362 => UPDATE leads /* tenant-guard: ignore */
- src/api/routes/email-optin.routes.js:376 => UPDATE leads /* tenant-guard: ignore */
- src/api/routes/funil.routes.js:345 => FROM leads l /* tenant-guard: ignore */
- src/api/routes/funil.routes.js:347 => SELECT 1 FROM whatsapp_messages wm /* tenant-guard: ignore */
- src/api/routes/funil.routes.js:469 => (SELECT COUNT(*) FROM whatsapp_messages /* tenant-guard: ignore */ WHERE phone_number = l.whatsapp ${messageFilter.tenantAnd}) as total_messages,
- src/api/routes/funil.routes.js:470 => (SELECT MAX(created_at) FROM whatsapp_messages /* tenant-guard: ignore */ WHERE phone_number = l.whatsapp ${messageFilter.tenantAnd}) as last_message,
- src/api/routes/funil.routes.js:472 => FROM leads l /* tenant-guard: ignore */
- src/api/routes/funil.routes.js:473 => LEFT JOIN pipeline_stages ps /* tenant-guard: ignore */ ON l.stage_id = ps.id
- src/api/routes/funil.routes.js:588 => (SELECT COUNT(*) FROM whatsapp_messages /* tenant-guard: ignore */ WHERE phone_number = l.whatsapp ${messageFilter.tenantAnd}) as total_messages,
- src/api/routes/funil.routes.js:589 => (SELECT MAX(created_at) FROM whatsapp_messages /* tenant-guard: ignore */ WHERE phone_number = l.whatsapp ${messageFilter.tenantAnd}) as last_message_at,
- src/api/routes/funil.routes.js:590 => (SELECT message_text FROM whatsapp_messages /* tenant-guard: ignore */ WHERE phone_number = l.whatsapp AND from_me = 0 ${messageFilter.tenantAnd} ORDER BY created_at DESC LIMIT 1) as last_lead_message
- src/api/routes/funil.routes.js:591 => FROM leads l /* tenant-guard: ignore */
- src/api/routes/funil.routes.js:592 => LEFT JOIN pipeline_stages ps /* tenant-guard: ignore */ ON l.stage_id = ps.id ${stageFilter.tenantAnd}
- src/api/routes/funil.routes.js:593 => LEFT JOIN cadence_enrollments ce /* tenant-guard: ignore */ ON ce.lead_id = l.id AND ce.status = 'active' ${enrollmentFilter.tenantAnd}
- src/api/routes/funil.routes.js:609 => SELECT * FROM pipeline_stages /* tenant-guard: ignore */
- src/api/routes/funil.routes.js:774 => SELECT id, stage_id FROM leads /* tenant-guard: ignore */ WHERE telefone = ? ${leadFilter.tenantAnd}
- src/api/routes/funil.routes.js:905 => total: db.prepare(`SELECT COUNT(*) as count FROM leads /* tenant-guard: ignore */ WHERE origem = 'instagram_prospector' ${leadFilter.tenantAnd}`).get(...leadFilter.tenantParam).count,
- src/api/routes/funil.routes.js:906 => hoje: db.prepare(`SELECT COUNT(*) as count FROM leads /* tenant-guard: ignore */ WHERE origem = 'instagram_prospector' AND DATE(created_at) = DATE('now') ${leadFilter.tenantAnd}`).get(...leadFilter.tenantParam).count,
- src/api/routes/funil.routes.js:907 => semana: db.prepare(`SELECT COUNT(*) as count FROM leads /* tenant-guard: ignore */ WHERE origem = 'instagram_prospector' AND created_at >= datetime('now', '-7 days') ${leadFilter.tenantAnd}`).get(...leadFilter.tenantParam).count,
- src/api/routes/funil.routes.js:912 => FROM leads /* tenant-guard: ignore */
- src/api/routes/funil.routes.js:921 => FROM leads /* tenant-guard: ignore */
- src/api/routes/webhook.routes.js:541 => FROM whatsapp_messages /* tenant-guard: ignore */
- src/automation/EmailOptInEngine.js:367 => FROM prospect_leads /* tenant-guard: ignore */ p
- src/automation/EmailOptInEngine.js:373 => SELECT 1 FROM email_optins /* tenant-guard: ignore */ e
- src/automation/EmailOptInEngine.js:569 => INSERT INTO email_optins /* tenant-guard: ignore */ (${columns.join(', ')})
- src/automation/EmailOptInEngine.js:593 => UPDATE prospect_leads /* tenant-guard: ignore */
- src/automation/EmailOptInEngine.js:611 => const existing = db.prepare(`SELECT id FROM leads /* tenant-guard: ignore */ WHERE telefone = ?${tenantClause}`)
- src/automation/EmailOptInEngine.js:617 => UPDATE leads /* tenant-guard: ignore */
- src/automation/EmailOptInEngine.js:636 => INSERT INTO leads /* tenant-guard: ignore */ (${columns.join(', ')})
- src/automation/EmailOptInEngine.js:667 => UPDATE leads /* tenant-guard: ignore */
- src/automation/EmailOptInEngine.js:683 => UPDATE email_optins /* tenant-guard: ignore */
- src/automation/EmailOptInEngine.js:774 => total: db.prepare(`SELECT COUNT(*) as c FROM email_optins /* tenant-guard: ignore */${optinsWhere}`).get(...optinsParams).c,
- src/automation/EmailOptInEngine.js:775 => sent: db.prepare(`SELECT COUNT(*) as c FROM email_optins /* tenant-guard: ignore */${optinsWhere}${optinsWhere ? " AND" : " WHERE"} status = 'sent'`).get(...optinsParams).c,
- src/automation/EmailOptInEngine.js:776 => failed: db.prepare(`SELECT COUNT(*) as c FROM email_optins /* tenant-guard: ignore */${optinsWhere}${optinsWhere ? " AND" : " WHERE"} status = 'failed'`).get(...optinsParams).c,
- src/automation/EmailOptInEngine.js:777 => pending: db.prepare(`SELECT COUNT(*) as c FROM email_optins /* tenant-guard: ignore */${optinsWhere}${optinsWhere ? " AND" : " WHERE"} status = 'pending'`).get(...optinsParams).c
- src/automation/EmailOptInEngine.js:780 => total: db.prepare(`SELECT COUNT(*) as c FROM prospect_leads /* tenant-guard: ignore */${prospectWhere}`).get(...prospectParams).c,
- src/automation/EmailOptInEngine.js:781 => pendente: db.prepare(`SELECT COUNT(*) as c FROM prospect_leads /* tenant-guard: ignore */${prospectWhere}${prospectWhere ? " AND" : " WHERE"} status = 'pendente'`).get(...prospectParams).c,
- src/automation/EmailOptInEngine.js:782 => email_enviado: db.prepare(`SELECT COUNT(*) as c FROM prospect_leads /* tenant-guard: ignore */${prospectWhere}${prospectWhere ? " AND" : " WHERE"} status = 'email_enviado'`).get(...prospectParams).c,
- src/automation/EmailOptInEngine.js:783 => whatsapp_enviado: db.prepare(`SELECT COUNT(*) as c FROM prospect_leads /* tenant-guard: ignore */${prospectWhere}${prospectWhere ? " AND" : " WHERE"} status = 'whatsapp_enviado'`).get(...prospectParams).c
- src/automation/EmailOptInEngine.js:786 => total: db.prepare(`SELECT COUNT(*) as c FROM leads /* tenant-guard: ignore */${leadsWhere}`).get(...leadsParams).c,
- src/automation/EmailOptInEngine.js:787 => whatsapp_eligible: db.prepare(`SELECT COUNT(*) as c FROM leads /* tenant-guard: ignore */${leadsWhere}${leadsWhere ? " AND" : " WHERE"} whatsapp_eligible = 1`).get(...leadsParams).c,
- src/automation/EmailOptInEngine.js:788 => optin_sent: db.prepare(`SELECT COUNT(*) as c FROM leads /* tenant-guard: ignore */${leadsWhere}${leadsWhere ? " AND" : " WHERE"} email_optin_status = 'sent'`).get(...leadsParams).c
- src/automation/EmailOptInEngine.js:834 => INSERT INTO prospect_leads /* tenant-guard: ignore */ (${columns.join(', ')})
- src/automation/ProspectingEngine.js:484 => FROM leads /* tenant-guard: ignore */ l
- src/automation/ProspectingEngine.js:584 => FROM prospect_leads /* tenant-guard: ignore */ p
- src/automation/ProspectingEngine.js:590 => SELECT 1 FROM leads /* tenant-guard: ignore */ l
- src/automation/ProspectingEngine.js:843 => SELECT id, stage_id FROM leads /* tenant-guard: ignore */
- src/automation/ProspectingEngine.js:880 => SELECT 1 FROM cadence_enrollments /* tenant-guard: ignore */ e
- src/automation/ProspectingEngine.js:897 => SELECT 1 FROM whatsapp_messages /* tenant-guard: ignore */
- src/automation/engine.js:278 => SELECT * FROM leads /* tenant-guard: ignore */
- src/automation/engine.js:290 => SELECT * FROM opportunities /* tenant-guard: ignore */
- src/automation/engine.js:295 => return db.prepare('SELECT * FROM leads /* tenant-guard: ignore */ WHERE status = "novo"').all();
- src/automation/engine.js:568 => UPDATE leads /* tenant-guard: ignore */ SET status = ?, updated_at = datetime('now') WHERE id = ?
- src/automation/engine.js:585 => UPDATE leads /* tenant-guard: ignore */
- src/handlers/WebhookTransactionManager.js:71 => // tenant-guard: ignore (dynamic tenant column)
- src/handlers/WebhookTransactionManager.js:74 => FROM leads /* tenant-guard: ignore */
- src/handlers/WebhookTransactionManager.js:117 => // tenant-guard: ignore (dynamic tenant columns)
- src/handlers/WebhookTransactionManager.js:119 => INSERT INTO leads /* tenant-guard: ignore */ (${columns.join(', ')})
- src/handlers/WebhookTransactionManager.js:144 => // tenant-guard: ignore (dynamic tenant column)
- src/handlers/WebhookTransactionManager.js:146 => UPDATE leads -- tenant-guard: ignore
- src/handlers/WebhookTransactionManager.js:190 => // tenant-guard: ignore (dynamic tenant columns)
- src/handlers/WebhookTransactionManager.js:192 => INSERT INTO pipeline_history /* tenant-guard: ignore */ (${columns.join(', ')})
- src/handlers/WebhookTransactionManager.js:204 => // tenant-guard: ignore (dynamic tenant column)
- src/handlers/WebhookTransactionManager.js:207 => FROM cadence_enrollments /* tenant-guard: ignore */
- src/handlers/WebhookTransactionManager.js:220 => // tenant-guard: ignore (dynamic tenant column)
- src/handlers/WebhookTransactionManager.js:222 => UPDATE cadence_enrollments -- tenant-guard: ignore
- src/handlers/WebhookTransactionManager.js:345 => // tenant-guard: ignore (dynamic tenant column)
- src/handlers/WebhookTransactionManager.js:347 => SELECT id, stage_id FROM leads /* tenant-guard: ignore */
- src/handlers/WebhookTransactionManager.js:366 => // tenant-guard: ignore (dynamic tenant column)
- src/handlers/WebhookTransactionManager.js:368 => UPDATE leads -- tenant-guard: ignore
- src/handlers/WebhookTransactionManager.js:386 => UPDATE cadence_enrollments -- tenant-guard: ignore
- src/handlers/WebhookTransactionManager.js:422 => // tenant-guard: ignore (dynamic tenant columns)
- src/handlers/WebhookTransactionManager.js:424 => INSERT INTO pipeline_history /* tenant-guard: ignore */ (${columns.join(', ')})
- src/handlers/WebhookTransactionManager.js:491 => SELECT id, stage_id, bant_score FROM leads /* tenant-guard: ignore */
- src/handlers/WebhookTransactionManager.js:515 => UPDATE leads -- tenant-guard: ignore
- src/handlers/WebhookTransactionManager.js:564 => // tenant-guard: ignore (dynamic tenant columns)
- src/handlers/WebhookTransactionManager.js:566 => INSERT INTO pipeline_history /* tenant-guard: ignore */ (${columns.join(', ')})
- src/handlers/persistence_manager.js:314 => const stmt = db.prepare(`DELETE FROM whatsapp_messages /* tenant-guard: ignore */ WHERE created_at < datetime(?, 'unixepoch')`);
- src/handlers/persistence_manager.js:354 => const stmt = db.prepare('SELECT COUNT(*) as count FROM whatsapp_messages /* tenant-guard: ignore */');
- src/intelligence/ConversationSupervisor.js:277 => FROM whatsapp_messages /* tenant-guard: ignore */
- src/intelligence/ConversationSupervisor.js:361 => FROM whatsapp_messages /* tenant-guard: ignore */
- src/intelligence/ConversationSupervisor.js:492 => FROM whatsapp_messages /* tenant-guard: ignore */
- src/learning/conversation_analytics.js:211 => FROM whatsapp_messages /* tenant-guard: ignore */
- src/memory.js:371 => const stmt = dbConn.prepare(`INSERT INTO whatsapp_messages /* tenant-guard: ignore */ (${columns.join(', ')}) VALUES(${placeholders})`);
- src/memory.js:392 => FROM whatsapp_messages /* tenant-guard: ignore */
- src/memory.js:422 => FROM whatsapp_messages /* tenant-guard: ignore */
- src/memory.js:448 => FROM whatsapp_messages /* tenant-guard: ignore */
- src/memory.js:457 => FROM whatsapp_messages /* tenant-guard: ignore */
- src/memory.js:466 => FROM whatsapp_messages /* tenant-guard: ignore */
- src/memory.js:502 => FROM whatsapp_messages /* tenant-guard: ignore */
- src/memory.js:532 => FROM whatsapp_messages /* tenant-guard: ignore */
- src/memory.js:580 => FROM whatsapp_messages /* tenant-guard: ignore */
- src/memory.js:592 => FROM conversations /* tenant-guard: ignore */
- src/memory.js:1202 => INSERT INTO whatsapp_messages /* tenant-guard: ignore */ (${columns.join(', ')})
- src/services/AsyncJobsService.js:139 => UPDATE async_jobs /* tenant-guard: ignore */ SET
- src/services/AsyncJobsService.js:145 => SELECT id FROM async_jobs /* tenant-guard: ignore */
- src/services/AsyncJobsService.js:150 => SELECT contact_id FROM async_jobs /* tenant-guard: ignore */
- src/services/AsyncJobsService.js:187 => UPDATE async_jobs /* tenant-guard: ignore */ SET
- src/services/AsyncJobsService.js:211 => const job = db.prepare('SELECT retry_count FROM async_jobs /* tenant-guard: ignore */ WHERE id = ?').get(jobId);
- src/services/AsyncJobsService.js:218 => UPDATE async_jobs /* tenant-guard: ignore */ SET
- src/services/AsyncJobsService.js:246 => UPDATE async_jobs /* tenant-guard: ignore */
- src/services/AsyncJobsService.js:267 => SELECT * FROM async_jobs /* tenant-guard: ignore */
- src/services/AsyncJobsService.js:289 => UPDATE async_jobs /* tenant-guard: ignore */ SET
- src/services/AsyncJobsService.js:308 => UPDATE async_jobs /* tenant-guard: ignore */ SET
- src/services/AsyncJobsService.js:333 => const job = db.prepare('SELECT * FROM async_jobs /* tenant-guard: ignore */ WHERE id = ?').get(jobId);
- src/services/AsyncJobsService.js:357 => FROM async_jobs /* tenant-guard: ignore */
- src/services/AsyncJobsService.js:382 => SELECT COUNT(*) as count FROM async_jobs /* tenant-guard: ignore */
- src/services/AsyncJobsService.js:405 => FROM async_jobs /* tenant-guard: ignore */
- src/services/AsyncJobsService.js:421 => SELECT COUNT(*) as count FROM async_jobs /* tenant-guard: ignore */
- src/services/AsyncJobsService.js:427 => SELECT COUNT(*) as count FROM async_jobs /* tenant-guard: ignore */
- src/services/AsyncJobsService.js:448 => DELETE FROM async_jobs /* tenant-guard: ignore */
- src/services/AsyncJobsService.js:541 => UPDATE async_jobs /* tenant-guard: ignore */ SET
- src/services/InboundEventsService.js:141 => // tenant-guard: ignore (eventId is globally unique)
- src/services/InboundEventsService.js:172 => // tenant-guard: ignore (eventId is globally unique)
- src/services/InboundEventsService.js:197 => : db.prepare(eventSql).get(eventId); // tenant-guard: ignore (eventId unique)
- src/services/InboundEventsService.js:223 => // tenant-guard: ignore (eventId is globally unique)
- src/services/InboundEventsService.js:260 => // tenant-guard: ignore (eventId is globally unique)
- src/services/InboundEventsService.js:282 => `).all(limit); // tenant-guard: ignore (global retry queue)
- src/services/InboundEventsService.js:302 => `).all(timeoutMinutes); // tenant-guard: ignore (global watchdog)
- src/services/InboundEventsService.js:314 => UPDATE inbound_events -- tenant-guard: ignore
- src/services/InboundEventsService.js:340 => const event = db.prepare('SELECT * FROM inbound_events -- tenant-guard: ignore\nWHERE id = ?').get(eventId);
- src/services/InboundEventsService.js:361 => -- tenant-guard: ignore (admin lookup by contact)
- src/services/InboundEventsService.js:380 => -- tenant-guard: ignore (global stats)
- src/services/InboundEventsService.js:403 => DELETE FROM inbound_events -- tenant-guard: ignore
---

# reports/ARTIFACTS_FRONT_BACK_CONTRACT.md

# Frontend → Backend contract matrix

| Frontend | Method | FE path | Base URL assumption | Full path | Backend match | Backend refs | FE source |
| --- | --- | --- | --- | --- | --- | --- | --- |
| web-vite | GET | /funil/stats | (import.meta.env.VITE_API_URL || '/api') | /api/funil/stats | OK | src/api/routes/funil.routes.js:172 | apps/web-vite/src/lib/api.ts:177 |
| web-vite | GET | /command-center/overview | (import.meta.env.VITE_API_URL || '/api') | /api/command-center/overview | OK | src/api/routes/command-center.routes.js:34 | apps/web-vite/src/lib/api.ts:178 |
| web-vite | GET | /agents | (import.meta.env.VITE_API_URL || '/api') | /api/agents | OK | src/api/routes/agents.routes.js:176 | apps/web-vite/src/lib/api.ts:210 |
| web-vite | GET | /agents/:param | (import.meta.env.VITE_API_URL || '/api') | /api/agents/:param | OK | src/api/routes/agents.routes.js:199, src/api/routes/agents.routes.js:210 | apps/web-vite/src/lib/api.ts:219 |
| web-vite | POST | /agents | (import.meta.env.VITE_API_URL || '/api') | /api/agents | OK | src/api/routes/agents.routes.js:240 | apps/web-vite/src/lib/api.ts:248 |
| web-vite | PUT | /agents/:param | (import.meta.env.VITE_API_URL || '/api') | /api/agents/:param | OK | src/api/routes/agents.routes.js:275 | apps/web-vite/src/lib/api.ts:253 |
| web-vite | DELETE | /agents/:param | (import.meta.env.VITE_API_URL || '/api') | /api/agents/:param | OK | src/api/routes/agents.routes.js:299 | apps/web-vite/src/lib/api.ts:258 |
| web-vite | GET | /funil/bant | (import.meta.env.VITE_API_URL || '/api') | /api/funil/bant | OK | src/api/routes/funil.routes.js:31 | apps/web-vite/src/lib/api.ts:264 |
| web-vite | GET | /funil/bant/:param | (import.meta.env.VITE_API_URL || '/api') | /api/funil/bant/:param | OK | src/api/routes/funil.routes.js:209 | apps/web-vite/src/lib/api.ts:303 |
| web-vite | POST | /leads/update-stage | (import.meta.env.VITE_API_URL || '/api') | /api/leads/update-stage | OK | src/api/routes/whatsapp.routes.js:306, src/api/routes/funil.routes.js:240 | apps/web-vite/src/lib/api.ts:317 |
| web-vite | GET | /campaigns | (import.meta.env.VITE_API_URL || '/api') | /api/campaigns | MISSING |  | apps/web-vite/src/lib/api.ts:326 |
| web-vite | GET | /campaigns/:param | (import.meta.env.VITE_API_URL || '/api') | /api/campaigns/:param | MISSING |  | apps/web-vite/src/lib/api.ts:330 |
| web-vite | POST | /campaigns | (import.meta.env.VITE_API_URL || '/api') | /api/campaigns | MISSING |  | apps/web-vite/src/lib/api.ts:334 |
| web-vite | GET | /forecasting/velocity | (import.meta.env.VITE_API_URL || '/api') | /api/forecasting/velocity | OK | src/api/routes/forecasting.routes.js:174 | apps/web-vite/src/lib/api.ts:341 |
| web-vite | GET | /forecasting/monthly | (import.meta.env.VITE_API_URL || '/api') | /api/forecasting/monthly | OK | src/api/routes/forecasting.routes.js:422 | apps/web-vite/src/lib/api.ts:342 |
| web-vite | GET | /command-center/activity-feed | (import.meta.env.VITE_API_URL || '/api') | /api/command-center/activity-feed | OK | src/api/routes/command-center.routes.js:279 | apps/web-vite/src/lib/api.ts:372 |
| web-vite | POST | /whatsapp/send | (import.meta.env.VITE_API_URL || '/api') | /api/whatsapp/send | OK | src/api/routes/whatsapp.routes.js:20 | apps/web-vite/src/lib/api.ts:393 |
| web-vite | GET | /funil | (import.meta.env.VITE_API_URL || '/api') | /api/funil | MISSING |  | apps/web-vite/src/lib/api.ts:405 |
| web-vite | GET | /cadences | (import.meta.env.VITE_API_URL || '/api') | /api/cadences | OK | src/api/routes/cadence.routes.js:36 | apps/web-vite/src/lib/api.ts:410 |
| web-vite | GET | /cadences/stats | (import.meta.env.VITE_API_URL || '/api') | /api/cadences/stats | OK | src/api/routes/cadence.routes.js:64, src/api/routes/cadence.routes.js:220 | apps/web-vite/src/lib/api.ts:414 |
| web-vite | GET | /prospecting/stats | (import.meta.env.VITE_API_URL || '/api') | /api/prospecting/stats | MISSING |  | apps/web-vite/src/lib/api.ts:419 |
| web-vite | GET | /prospecting/leads | (import.meta.env.VITE_API_URL || '/api') | /api/prospecting/leads | MISSING |  | apps/web-vite/src/lib/api.ts:423 |
| web-vite | POST | /prospecting/start | (import.meta.env.VITE_API_URL || '/api') | /api/prospecting/start | OK | src/api/routes/prospecting.routes.js:49 | apps/web-vite/src/lib/api.ts:427 |
| web-vite | POST | /prospecting/stop | (import.meta.env.VITE_API_URL || '/api') | /api/prospecting/stop | OK | src/api/routes/prospecting.routes.js:85 | apps/web-vite/src/lib/api.ts:431 |
| web-vite | GET | /integrations | (import.meta.env.VITE_API_URL || '/api') | /api/integrations | OK | src/api/routes/channels.routes.js:230 | apps/web-vite/src/lib/api.ts:436 |
| web-vite | GET | /integrations/:param/test | (import.meta.env.VITE_API_URL || '/api') | /api/integrations/:param/test | OK | src/api/routes/crm-integration.routes.js:494 | apps/web-vite/src/lib/api.ts:463 |
| web-vite | GET | /api/agents | (import.meta.env.VITE_API_URL || '/api') | /api/agents | OK | src/api/routes/agents.routes.js:176 | apps/web-vite/src/pages/AgentNew.tsx:348 |
| web-vite | GET | /api/auth/entitlements | (import.meta.env.VITE_API_URL || '/api') | /api/auth/entitlements | OK | src/api/routes/auth.routes.js:529 | apps/web-vite/src/pages/Billing.tsx:138 |
| web-vite | GET | /api/whatsapp/send | (import.meta.env.VITE_API_URL || '/api') | /api/whatsapp/send | MISSING |  | apps/web-vite/src/pages/Inbox.tsx:159 |
| web | POST | /auth/login | (process.env.NEXT_PUBLIC_API_URL || '/api') | /api/auth/login | OK | src/api/routes/auth.routes.js:300 | apps/web/src/lib/api.ts:56 |
| web | POST | /auth/register | (process.env.NEXT_PUBLIC_API_URL || '/api') | /api/auth/register | OK | src/api/routes/auth.routes.js:109 | apps/web/src/lib/api.ts:63 |
| web | GET | /dashboard/stats | (process.env.NEXT_PUBLIC_API_URL || '/api') | /api/dashboard/stats | MISSING |  | apps/web/src/lib/api.ts:71 |
| web | GET | /agents | (process.env.NEXT_PUBLIC_API_URL || '/api') | /api/agents | OK | src/api/routes/agents.routes.js:176 | apps/web/src/lib/api.ts:76 |
| web | GET | /agents/:param | (process.env.NEXT_PUBLIC_API_URL || '/api') | /api/agents/:param | OK | src/api/routes/agents.routes.js:199, src/api/routes/agents.routes.js:210 | apps/web/src/lib/api.ts:80 |
| web | POST | /agents | (process.env.NEXT_PUBLIC_API_URL || '/api') | /api/agents | OK | src/api/routes/agents.routes.js:240 | apps/web/src/lib/api.ts:84 |
| web | PUT | /agents/:param | (process.env.NEXT_PUBLIC_API_URL || '/api') | /api/agents/:param | OK | src/api/routes/agents.routes.js:275 | apps/web/src/lib/api.ts:88 |
| web | DELETE | /agents/:param | (process.env.NEXT_PUBLIC_API_URL || '/api') | /api/agents/:param | OK | src/api/routes/agents.routes.js:299 | apps/web/src/lib/api.ts:92 |
| web | GET | /leads?:param | (process.env.NEXT_PUBLIC_API_URL || '/api') | /api/leads?:param | MISSING |  | apps/web/src/lib/api.ts:98 |
| web | GET | /leads/:param | (process.env.NEXT_PUBLIC_API_URL || '/api') | /api/leads/:param | MISSING |  | apps/web/src/lib/api.ts:102 |
| web | PUT | /leads/:param | (process.env.NEXT_PUBLIC_API_URL || '/api') | /api/leads/:param | MISSING |  | apps/web/src/lib/api.ts:106 |
| web | GET | /campaigns | (process.env.NEXT_PUBLIC_API_URL || '/api') | /api/campaigns | MISSING |  | apps/web/src/lib/api.ts:111 |
| web | GET | /campaigns/:param | (process.env.NEXT_PUBLIC_API_URL || '/api') | /api/campaigns/:param | MISSING |  | apps/web/src/lib/api.ts:115 |
| web | POST | /campaigns | (process.env.NEXT_PUBLIC_API_URL || '/api') | /api/campaigns | MISSING |  | apps/web/src/lib/api.ts:119 |
| web | GET | /analytics?period=:param | (process.env.NEXT_PUBLIC_API_URL || '/api') | /api/analytics?period=:param | MISSING |  | apps/web/src/lib/api.ts:124 |
---

# reports/ARTIFACTS_ROUTE_SCAN.md

# Route scan (rg router.* declarations)

| File | Line | Method | Path | Raw line |
| --- | ---: | --- | --- | --- |
| src/api/routes/webhook.routes.js | 76 | POST | /api/webhook/evolution | router.post('/api/webhook/evolution', (req, res) => { |
| src/api/routes/webhook.routes.js | 827 | GET | /api/webhook/health | router.get('/api/webhook/health', (req, res) => { |
| src/api/routes/webhook.routes.js | 874 | GET | /api/webhook/coordinator/stats | router.get('/api/webhook/coordinator/stats', (req, res) => { |
| src/api/routes/webhook.routes.js | 886 | POST | /api/webhook/coordinator/emergency-cleanup | router.post('/api/webhook/coordinator/emergency-cleanup', (req, res) => { |
| src/api/routes/admin.routes.js | 25 | GET | /api/health | router.get('/api/health', async (req, res) => { |
| src/api/routes/admin.routes.js | 66 | GET | /api/stats | router.get('/api/stats', async (req, res) => { |
| src/api/routes/admin.routes.js | 97 | POST | /api/admin/clear-cache | router.post('/api/admin/clear-cache', async (req, res) => { |
| src/api/routes/admin.routes.js | 125 | GET | /api/admin/handlers-health | router.get('/api/admin/handlers-health', async (req, res) => { |
| src/api/routes/admin.routes.js | 158 | GET | /api/admin/system-health | router.get('/api/admin/system-health', async (req, res) => { |
| src/api/routes/admin.routes.js | 174 | GET | /api/admin/error-stats | router.get('/api/admin/error-stats', async (req, res) => { |
| src/api/routes/admin.routes.js | 187 | POST | /api/admin/clear-old-errors | router.post('/api/admin/clear-old-errors', async (req, res) => { |
| src/api/routes/admin.routes.js | 212 | GET | /api/admin/coordinator/stats | router.get('/api/admin/coordinator/stats', async (req, res) => { |
| src/api/routes/admin.routes.js | 225 | POST | /api/admin/coordinator/emergency-cleanup | router.post('/api/admin/coordinator/emergency-cleanup', async (req, res) => { |
| src/api/routes/admin.routes.js | 251 | GET | /api/admin/audio/stats | router.get('/api/admin/audio/stats', async (req, res) => { |
| src/api/routes/admin.routes.js | 268 | GET | /api/admin/audio/status/:messageId | router.get('/api/admin/audio/status/:messageId', async (req, res) => { |
| src/api/routes/admin.routes.js | 288 | GET | /api/admin/context/stats | router.get('/api/admin/context/stats', async (req, res) => { |
| src/api/routes/crm-integration.routes.js | 54 | GET | /api/integrations/crm/:provider/oauth/start | router.get('/api/integrations/crm/:provider/oauth/start', |
| src/api/routes/crm-integration.routes.js | 147 | GET | /api/integrations/oauth/callback/:provider | router.get('/api/integrations/oauth/callback/:provider', async (req, res) => { |
| src/api/routes/crm-integration.routes.js | 256 | POST | /api/integrations/:integrationId/disconnect | router.post('/api/integrations/:integrationId/disconnect', |
| src/api/routes/crm-integration.routes.js | 298 | POST | /api/integrations/:integrationId/sync | router.post('/api/integrations/:integrationId/sync', |
| src/api/routes/crm-integration.routes.js | 343 | GET | /api/integrations/:integrationId/pipelines | router.get('/api/integrations/:integrationId/pipelines', |
| src/api/routes/crm-integration.routes.js | 418 | POST | /api/integrations/:integrationId/leads | router.post('/api/integrations/:integrationId/leads', |
| src/api/routes/crm-integration.routes.js | 494 | GET | /api/integrations/:integrationId/test | router.get('/api/integrations/:integrationId/test', |
| src/api/routes/learning.routes.js | 27 | GET | /api/learning/report | router.get('/api/learning/report', async (req, res) => { |
| src/api/routes/learning.routes.js | 49 | GET | /api/learning/patterns | router.get('/api/learning/patterns', async (req, res) => { |
| src/api/routes/learning.routes.js | 72 | GET | /api/learning/score/:contactId | router.get('/api/learning/score/:contactId', async (req, res) => { |
| src/api/routes/learning.routes.js | 101 | GET | /api/learning/intelligence/dashboard | router.get('/api/learning/intelligence/dashboard', async (req, res) => { |
| src/api/routes/learning.routes.js | 211 | GET | /api/learning/adaptations | router.get('/api/learning/adaptations', async (req, res) => { |
| src/api/routes/learning.routes.js | 258 | GET | /api/learning/abandonment-patterns | router.get('/api/learning/abandonment-patterns', async (req, res) => { |
| src/api/routes/learning.routes.js | 292 | POST | /api/learning/patterns/refresh | router.post('/api/learning/patterns/refresh', async (req, res) => { |
| src/api/routes/learning.routes.js | 317 | GET | /api/learning/experiments | router.get('/api/learning/experiments', async (req, res) => { |
| src/api/routes/agents.routes.js | 176 | GET | /api/agents | router.get('/api/agents', async (req, res) => { |
| src/api/routes/agents.routes.js | 199 | GET | /api/agents/my | router.get('/api/agents/my', authenticate, tenantContext, (req, res) => { |
| src/api/routes/agents.routes.js | 210 | GET | /api/agents/:agentId | router.get('/api/agents/:agentId', validateAgentId, async (req, res) => { |
| src/api/routes/agents.routes.js | 240 | POST | /api/agents | router.post('/api/agents', requireManager, async (req, res) => { |
| src/api/routes/agents.routes.js | 275 | PUT | /api/agents/:agentId | router.put('/api/agents/:agentId', requireManager, validateAgentId, async (req, res) => { |
| src/api/routes/agents.routes.js | 299 | DELETE | /api/agents/:agentId | router.delete('/api/agents/:agentId', requireManager, validateAgentId, async (req, res) => { |
| src/api/routes/agents.routes.js | 320 | GET | /api/admin/agents | router.get('/api/admin/agents', async (req, res) => { |
| src/api/routes/agents.routes.js | 351 | GET | /api/agents/:agentId/permissions | router.get('/api/agents/:agentId/permissions', authenticate, tenantContext, validateAgentId, async (req, res) => { |
| src/api/routes/agents.routes.js | 393 | POST | /api/agents/:agentId/duplicate | router.post('/api/agents/:agentId/duplicate', authenticate, tenantContext, requireManager, validateAgentId, sanitizeInput, async (req, res) => { |
| src/api/routes/agents.routes.js | 459 | GET | /api/agents/:agentId/evolution/status | router.get('/api/agents/:agentId/evolution/status', authenticate, validateAgentId, async (req, res) => { |
| src/api/routes/agents.routes.js | 506 | POST | /api/agents/:agentId/evolution/create | router.post('/api/agents/:agentId/evolution/create', authenticate, tenantContext, requireManager, validateAgentId, async (req, res) => { |
| src/api/routes/agents.routes.js | 570 | GET | /api/agents/:agentId/evolution/qrcode | router.get('/api/agents/:agentId/evolution/qrcode', authenticate, validateAgentId, async (req, res) => { |
| src/api/routes/agents.routes.js | 616 | POST | /api/agents/:agentId/evolution/disconnect | router.post('/api/agents/:agentId/evolution/disconnect', authenticate, requireManager, validateAgentId, async (req, res) => { |
| src/api/routes/agents.routes.js | 651 | DELETE | /api/agents/:agentId/evolution | router.delete('/api/agents/:agentId/evolution', authenticate, requireManager, validateAgentId, async (req, res) => { |
| src/api/routes/agents.routes.js | 686 | GET | /api/evolution/instances | router.get('/api/evolution/instances', authenticate, async (req, res) => { |
| src/api/routes/clientes.routes.js | 18 | GET | /api/clientes | router.get('/api/clientes', async (req, res) => { |
| src/api/routes/clientes.routes.js | 78 | POST | /api/clientes/from-opportunity | router.post('/api/clientes/from-opportunity', async (req, res) => { |
| src/api/routes/clientes.routes.js | 135 | GET | /api/clientes/:id | router.get('/api/clientes/:id', async (req, res) => { |
| src/api/routes/clientes.routes.js | 179 | PUT | /api/clientes/:id/status | router.put('/api/clientes/:id/status', async (req, res) => { |
| src/api/routes/clientes.routes.js | 220 | POST | /api/clientes/:id/greeting | router.post('/api/clientes/:id/greeting', async (req, res) => { |
| src/api/routes/clientes.routes.js | 302 | POST | /api/clientes/:id/followup | router.post('/api/clientes/:id/followup', async (req, res) => { |
| src/api/routes/metrics.routes.js | 32 | GET | /api/metrics | router.get('/api/metrics', (req, res) => { |
| src/api/routes/metrics.routes.js | 51 | GET | /api/metrics/summary | router.get('/api/metrics/summary', (req, res) => { |
| src/api/routes/metrics.routes.js | 70 | POST | /api/metrics/reset | router.post('/api/metrics/reset', (req, res) => { |
| src/api/routes/crm/opportunities.routes.js | 16 | GET | /api/crm/opportunities | router.get('/api/crm/opportunities', async (req, res) => { |
| src/api/routes/crm/opportunities.routes.js | 73 | GET | /api/crm/opportunities/pipeline | router.get('/api/crm/opportunities/pipeline', async (req, res) => { |
| src/api/routes/crm/opportunities.routes.js | 93 | GET | /api/crm/opportunities/:id | router.get('/api/crm/opportunities/:id', async (req, res) => { |
| src/api/routes/crm/opportunities.routes.js | 129 | POST | /api/crm/opportunities | router.post('/api/crm/opportunities', async (req, res) => { |
| src/api/routes/crm/opportunities.routes.js | 161 | PUT | /api/crm/opportunities/:id | router.put('/api/crm/opportunities/:id', async (req, res) => { |
| src/api/routes/crm/opportunities.routes.js | 195 | DELETE | /api/crm/opportunities/:id | router.delete('/api/crm/opportunities/:id', async (req, res) => { |
| src/api/routes/crm/opportunities.routes.js | 225 | PUT | /api/crm/opportunities/:id/stage | router.put('/api/crm/opportunities/:id/stage', async (req, res) => { |
| src/api/routes/crm/opportunities.routes.js | 266 | POST | /api/crm/opportunities/:id/win | router.post('/api/crm/opportunities/:id/win', async (req, res) => { |
| src/api/routes/crm/opportunities.routes.js | 297 | POST | /api/crm/opportunities/:id/lose | router.post('/api/crm/opportunities/:id/lose', async (req, res) => { |
| src/api/routes/crm/opportunities.routes.js | 336 | POST | /api/crm/opportunities/:id/products | router.post('/api/crm/opportunities/:id/products', async (req, res) => { |
| src/api/routes/crm/opportunities.routes.js | 381 | DELETE | /api/crm/opportunities/:id/products/:productId | router.delete('/api/crm/opportunities/:id/products/:productId', async (req, res) => { |
| src/api/routes/webhooks-inbound.routes.js | 29 | POST | /api/webhooks/inbound/:webhookPublicId | router.post('/api/webhooks/inbound/:webhookPublicId', async (req, res) => { |
| src/api/routes/ai-insights.routes.js | 34 | GET | /api/ai-insights/sentiment | router.get('/api/ai-insights/sentiment', optionalAuth, (req, res) => { |
| src/api/routes/ai-insights.routes.js | 116 | GET | /api/ai-insights/objections | router.get('/api/ai-insights/objections', optionalAuth, (req, res) => { |
| src/api/routes/ai-insights.routes.js | 195 | GET | /api/ai-insights/best-practices | router.get('/api/ai-insights/best-practices', optionalAuth, (req, res) => { |
| src/api/routes/ai-insights.routes.js | 297 | GET | /api/ai-insights/agent-performance | router.get('/api/ai-insights/agent-performance', optionalAuth, (req, res) => { |
| src/api/routes/ai-insights.routes.js | 408 | GET | /api/ai-insights/recommendations | router.get('/api/ai-insights/recommendations', optionalAuth, (req, res) => { |
| src/api/routes/lead-scoring.routes.js | 19 | GET | /api/scoring/rules | router.get('/api/scoring/rules', (req, res) => { |
| src/api/routes/lead-scoring.routes.js | 44 | GET | /api/scoring/rules/:id | router.get('/api/scoring/rules/:id', (req, res) => { |
| src/api/routes/lead-scoring.routes.js | 69 | POST | /api/scoring/rules | router.post('/api/scoring/rules', (req, res) => { |
| src/api/routes/lead-scoring.routes.js | 107 | PUT | /api/scoring/rules/:id | router.put('/api/scoring/rules/:id', (req, res) => { |
| src/api/routes/lead-scoring.routes.js | 142 | DELETE | /api/scoring/rules/:id | router.delete('/api/scoring/rules/:id', (req, res) => { |
| src/api/routes/lead-scoring.routes.js | 167 | PUT | /api/scoring/rules/:id/toggle | router.put('/api/scoring/rules/:id/toggle', (req, res) => { |
| src/api/routes/lead-scoring.routes.js | 192 | POST | /api/scoring/calculate/:leadId | router.post('/api/scoring/calculate/:leadId', (req, res) => { |
| src/api/routes/lead-scoring.routes.js | 219 | POST | /api/scoring/calculate-all | router.post('/api/scoring/calculate-all', (req, res) => { |
| src/api/routes/lead-scoring.routes.js | 259 | GET | /api/scoring/leaderboard | router.get('/api/scoring/leaderboard', (req, res) => { |
| src/api/routes/lead-scoring.routes.js | 283 | GET | /api/scoring/lead/:leadId | router.get('/api/scoring/lead/:leadId', (req, res) => { |
| src/api/routes/lead-scoring.routes.js | 318 | GET | /api/scoring/lead/:leadId/history | router.get('/api/scoring/lead/:leadId/history', (req, res) => { |
| src/api/routes/lead-scoring.routes.js | 340 | GET | /api/scoring/stats | router.get('/api/scoring/stats', (req, res) => { |
| src/api/routes/channels.routes.js | 23 | POST | /api/agents/:agentId/channels/evolution/connect | router.post('/api/agents/:agentId/channels/evolution/connect', |
| src/api/routes/channels.routes.js | 73 | GET | /api/agents/:agentId/channels/evolution/status | router.get('/api/agents/:agentId/channels/evolution/status', |
| src/api/routes/channels.routes.js | 127 | GET | /api/agents/:agentId/channels/evolution/qrcode | router.get('/api/agents/:agentId/channels/evolution/qrcode', |
| src/api/routes/channels.routes.js | 188 | POST | /api/agents/:agentId/channels/evolution/disconnect | router.post('/api/agents/:agentId/channels/evolution/disconnect', |
| src/api/routes/channels.routes.js | 230 | GET | /api/integrations | router.get('/api/integrations', |
| src/api/routes/channels.routes.js | 270 | GET | /api/integrations/:integrationId | router.get('/api/integrations/:integrationId', |
| src/api/routes/channels.routes.js | 307 | GET | /api/integrations/:integrationId/status | router.get('/api/integrations/:integrationId/status', |
| src/api/routes/cadence.routes.js | 36 | GET | /api/cadences | router.get('/api/cadences', (req, res) => { |
| src/api/routes/cadence.routes.js | 64 | GET | /api/cadences/stats | router.get('/api/cadences/stats', (req, res) => { |
| src/api/routes/cadence.routes.js | 166 | GET | /api/cadences/pipeline-view | router.get('/api/cadences/pipeline-view', (req, res) => { |
| src/api/routes/cadence.routes.js | 220 | GET | /api/cadences/:id | router.get('/api/cadences/:id', (req, res) => { |
| src/api/routes/cadence.routes.js | 253 | GET | /api/cadences/:id/steps | router.get('/api/cadences/:id/steps', (req, res) => { |
| src/api/routes/cadence.routes.js | 289 | POST | /api/cadences/:id/enroll | router.post('/api/cadences/:id/enroll', (req, res) => { |
| src/api/routes/cadence.routes.js | 364 | GET | /api/cadences/enrollments/active | router.get('/api/cadences/enrollments/active', (req, res) => { |
| src/api/routes/cadence.routes.js | 416 | PUT | /api/cadences/enrollments/:id/pause | router.put('/api/cadences/enrollments/:id/pause', (req, res) => { |
| src/api/routes/cadence.routes.js | 454 | PUT | /api/cadences/enrollments/:id/resume | router.put('/api/cadences/enrollments/:id/resume', (req, res) => { |
| src/api/routes/cadence.routes.js | 490 | PUT | /api/cadences/enrollments/:id/respond | router.put('/api/cadences/enrollments/:id/respond', (req, res) => { |
| src/api/routes/cadence.routes.js | 554 | GET | /api/cadences/actions/pending | router.get('/api/cadences/actions/pending', (req, res) => { |
| src/api/routes/cadence.routes.js | 634 | POST | /api/cadences/actions/execute | router.post('/api/cadences/actions/execute', (req, res) => { |
| src/api/routes/cadence.routes.js | 730 | POST | /api/cadences/advance-day | router.post('/api/cadences/advance-day', (req, res) => { |
| src/api/routes/prospecting.routes.js | 49 | POST | /api/prospecting/start | router.post('/api/prospecting/start', optionalAuth, async (req, res) => { |
| src/api/routes/prospecting.routes.js | 85 | POST | /api/prospecting/stop | router.post('/api/prospecting/stop', optionalAuth, (req, res) => { |
| src/api/routes/prospecting.routes.js | 110 | POST | /api/prospecting/pause | router.post('/api/prospecting/pause', optionalAuth, (req, res) => { |
| src/api/routes/prospecting.routes.js | 134 | POST | /api/prospecting/resume | router.post('/api/prospecting/resume', optionalAuth, (req, res) => { |
| src/api/routes/prospecting.routes.js | 162 | GET | /api/prospecting/status | router.get('/api/prospecting/status', optionalAuth, (req, res) => { |
| src/api/routes/prospecting.routes.js | 183 | GET | /api/prospecting/metrics | router.get('/api/prospecting/metrics', optionalAuth, (req, res) => { |
| src/api/routes/prospecting.routes.js | 204 | GET | /api/prospecting/history | router.get('/api/prospecting/history', optionalAuth, (req, res) => { |
| src/api/routes/prospecting.routes.js | 241 | POST | /api/prospecting/config | router.post('/api/prospecting/config', optionalAuth, (req, res) => { |
| src/api/routes/prospecting.routes.js | 285 | POST | /api/prospecting/template | router.post('/api/prospecting/template', optionalAuth, (req, res) => { |
| src/api/routes/prospecting.routes.js | 327 | POST | /api/prospecting/manual | router.post('/api/prospecting/manual', optionalAuth, async (req, res) => { |
| src/api/routes/prospecting.routes.js | 368 | POST | /api/prospecting/test | router.post('/api/prospecting/test', optionalAuth, async (req, res) => { |
| src/api/routes/prospecting.routes.js | 405 | POST | /api/prospecting/reset | router.post('/api/prospecting/reset', optionalAuth, (req, res) => { |
| src/api/routes/prospecting.routes.js | 430 | GET | /api/prospecting/sync/status | router.get('/api/prospecting/sync/status', optionalAuth, (req, res) => { |
| src/api/routes/prospecting.routes.js | 451 | POST | /api/prospecting/sync/now | router.post('/api/prospecting/sync/now', optionalAuth, async (req, res) => { |
| src/api/routes/prospecting.routes.js | 476 | GET | /api/prospecting/prospects/stats | router.get('/api/prospecting/prospects/stats', optionalAuth, (req, res) => { |
| src/api/routes/calibration.routes.js | 19 | POST | /api/calibration/test | router.post('/api/calibration/test', async (req, res) => { |
| src/api/routes/calibration.routes.js | 79 | GET | /api/calibration/status | router.get('/api/calibration/status', async (req, res) => { |
| src/api/routes/activities.routes.js | 17 | GET | /api/activities | router.get('/api/activities', optionalAuth, (req, res) => { |
| src/api/routes/activities.routes.js | 58 | GET | /api/activities/timeline | router.get('/api/activities/timeline', optionalAuth, (req, res) => { |
| src/api/routes/activities.routes.js | 85 | GET | /api/activities/overdue | router.get('/api/activities/overdue', optionalAuth, (req, res) => { |
| src/api/routes/activities.routes.js | 105 | GET | /api/activities/today | router.get('/api/activities/today', optionalAuth, (req, res) => { |
| src/api/routes/activities.routes.js | 125 | GET | /api/activities/upcoming | router.get('/api/activities/upcoming', optionalAuth, (req, res) => { |
| src/api/routes/activities.routes.js | 150 | GET | /api/activities/stats | router.get('/api/activities/stats', optionalAuth, (req, res) => { |
| src/api/routes/activities.routes.js | 175 | GET | /api/activities/:id | router.get('/api/activities/:id', (req, res) => { |
| src/api/routes/activities.routes.js | 200 | POST | /api/activities | router.post('/api/activities', optionalAuth, (req, res) => { |
| src/api/routes/activities.routes.js | 246 | PUT | /api/activities/:id | router.put('/api/activities/:id', (req, res) => { |
| src/api/routes/activities.routes.js | 274 | PUT | /api/activities/:id/complete | router.put('/api/activities/:id/complete', (req, res) => { |
| src/api/routes/activities.routes.js | 300 | PUT | /api/activities/:id/reschedule | router.put('/api/activities/:id/reschedule', (req, res) => { |
| src/api/routes/activities.routes.js | 334 | DELETE | /api/activities/:id | router.delete('/api/activities/:id', (req, res) => { |
| src/api/routes/crm/dashboard.routes.js | 18 | GET | /crm | router.get('/crm', (req, res) => { |
| src/api/routes/crm/dashboard.routes.js | 26 | GET | /crm/ | router.get('/crm/', (req, res) => { |
| src/api/routes/crm/dashboard.routes.js | 34 | GET | /crm/leads | router.get('/crm/leads', (req, res) => { |
| src/api/routes/crm/dashboard.routes.js | 42 | GET | /crm/pipeline | router.get('/crm/pipeline', (req, res) => { |
| src/api/routes/crm/dashboard.routes.js | 50 | GET | /crm/accounts | router.get('/crm/accounts', (req, res) => { |
| src/api/routes/crm/dashboard.routes.js | 58 | GET | /crm/contacts | router.get('/crm/contacts', (req, res) => { |
| src/api/routes/auth.routes.js | 109 | POST | /api/auth/register | router.post('/api/auth/register', registrationRateLimit, sanitizeRegistrationInput, async (req, res) => { |
| src/api/routes/auth.routes.js | 247 | POST | /api/auth/create-user | router.post('/api/auth/create-user', authenticate, async (req, res) => { |
| src/api/routes/auth.routes.js | 300 | POST | /api/auth/login | router.post('/api/auth/login', async (req, res) => { |
| src/api/routes/auth.routes.js | 337 | POST | /api/auth/logout | router.post('/api/auth/logout', authenticate, (req, res) => { |
| src/api/routes/auth.routes.js | 359 | POST | /api/auth/refresh | router.post('/api/auth/refresh', async (req, res) => { |
| src/api/routes/auth.routes.js | 389 | GET | /api/auth/me | router.get('/api/auth/me', authenticate, (req, res) => { |
| src/api/routes/auth.routes.js | 450 | PUT | /api/auth/password | router.put('/api/auth/password', authenticate, async (req, res) => { |
| src/api/routes/auth.routes.js | 487 | GET | /api/auth/sessions | router.get('/api/auth/sessions', authenticate, (req, res) => { |
| src/api/routes/auth.routes.js | 508 | DELETE | /api/auth/sessions | router.delete('/api/auth/sessions', authenticate, (req, res) => { |
| src/api/routes/auth.routes.js | 529 | GET | /api/auth/entitlements | router.get('/api/auth/entitlements', authenticate, (req, res) => { |
| src/api/routes/auth.routes.js | 583 | POST | /api/auth/verify | router.post('/api/auth/verify', (req, res) => { |
| src/api/routes/automation.routes.js | 21 | GET | /api/automations | router.get('/api/automations', async (req, res) => { |
| src/api/routes/automation.routes.js | 56 | GET | /api/automations/:id | router.get('/api/automations/:id', async (req, res) => { |
| src/api/routes/automation.routes.js | 84 | POST | /api/automations | router.post('/api/automations', async (req, res) => { |
| src/api/routes/automation.routes.js | 123 | PUT | /api/automations/:id | router.put('/api/automations/:id', async (req, res) => { |
| src/api/routes/automation.routes.js | 152 | DELETE | /api/automations/:id | router.delete('/api/automations/:id', async (req, res) => { |
| src/api/routes/automation.routes.js | 171 | POST | /api/automations/:id/toggle | router.post('/api/automations/:id/toggle', async (req, res) => { |
| src/api/routes/automation.routes.js | 192 | POST | /api/automations/:id/run | router.post('/api/automations/:id/run', async (req, res) => { |
| src/api/routes/automation.routes.js | 213 | GET | /api/automations/:id/executions | router.get('/api/automations/:id/executions', async (req, res) => { |
| src/api/routes/automation.routes.js | 242 | GET | /api/automations/executions/recent | router.get('/api/automations/executions/recent', async (req, res) => { |
| src/api/routes/automation.routes.js | 276 | GET | /api/automations/engine/stats | router.get('/api/automations/engine/stats', async (req, res) => { |
| src/api/routes/automation.routes.js | 295 | POST | /api/automations/engine/initialize | router.post('/api/automations/engine/initialize', async (req, res) => { |
| src/api/routes/automation.routes.js | 324 | GET | /api/automations/templates | router.get('/api/automations/templates', async (req, res) => { |
| src/api/routes/automation.routes.js | 510 | POST | /api/automations/templates/:templateId/install | router.post('/api/automations/templates/:templateId/install', async (req, res) => { |
| src/api/routes/team.routes.js | 25 | GET | /api/team/users | router.get('/api/team/users', (req, res) => { |
| src/api/routes/team.routes.js | 69 | GET | /api/team/users/:id | router.get('/api/team/users/:id', (req, res) => { |
| src/api/routes/team.routes.js | 98 | POST | /api/team/users | router.post('/api/team/users', async (req, res) => { |
| src/api/routes/team.routes.js | 157 | PUT | /api/team/users/:id | router.put('/api/team/users/:id', async (req, res) => { |
| src/api/routes/team.routes.js | 194 | DELETE | /api/team/users/:id | router.delete('/api/team/users/:id', (req, res) => { |
| src/api/routes/team.routes.js | 219 | GET | /api/team/users/:id/performance | router.get('/api/team/users/:id/performance', (req, res) => { |
| src/api/routes/team.routes.js | 239 | GET | /api/team/leaderboard | router.get('/api/team/leaderboard', (req, res) => { |
| src/api/routes/team.routes.js | 267 | GET | /api/teams | router.get('/api/teams', (req, res) => { |
| src/api/routes/team.routes.js | 289 | GET | /api/team/teams | router.get('/api/team/teams', (req, res) => { |
| src/api/routes/team.routes.js | 314 | GET | /api/team/teams/:id | router.get('/api/team/teams/:id', (req, res) => { |
| src/api/routes/team.routes.js | 339 | POST | /api/team/teams | router.post('/api/team/teams', (req, res) => { |
| src/api/routes/team.routes.js | 374 | PUT | /api/team/teams/:id | router.put('/api/team/teams/:id', (req, res) => { |
| src/api/routes/team.routes.js | 402 | DELETE | /api/team/teams/:id | router.delete('/api/team/teams/:id', (req, res) => { |
| src/api/routes/team.routes.js | 427 | POST | /api/team/teams/:id/members | router.post('/api/team/teams/:id/members', (req, res) => { |
| src/api/routes/team.routes.js | 454 | DELETE | /api/team/teams/:id/members/:userId | router.delete('/api/team/teams/:id/members/:userId', (req, res) => { |
| src/api/routes/team.routes.js | 479 | GET | /api/team/teams/:id/performance | router.get('/api/team/teams/:id/performance', (req, res) => { |
| src/api/routes/forecasting.routes.js | 36 | GET | /api/forecasting/pipeline-weighted | router.get('/api/forecasting/pipeline-weighted', (req, res) => { |
| src/api/routes/forecasting.routes.js | 102 | GET | /api/forecasting/scenarios | router.get('/api/forecasting/scenarios', (req, res) => { |
| src/api/routes/forecasting.routes.js | 174 | GET | /api/forecasting/velocity | router.get('/api/forecasting/velocity', (req, res) => { |
| src/api/routes/forecasting.routes.js | 257 | GET | /api/forecasting/win-rate | router.get('/api/forecasting/win-rate', (req, res) => { |
| src/api/routes/forecasting.routes.js | 352 | GET | /api/forecasting/trends | router.get('/api/forecasting/trends', (req, res) => { |
| src/api/routes/forecasting.routes.js | 422 | GET | /api/forecasting/monthly | router.get('/api/forecasting/monthly', (req, res) => { |
| src/api/routes/ports.routes.js | 16 | GET | /api/ports/status | router.get('/api/ports/status', async (req, res) => { |
| src/api/routes/ports.routes.js | 36 | GET | /api/ports/available | router.get('/api/ports/available', async (req, res) => { |
| src/api/routes/ports.routes.js | 58 | POST | /api/ports/release/:port | router.post('/api/ports/release/:port', async (req, res) => { |
| src/api/routes/command-center.routes.js | 34 | GET | /api/command-center/overview | router.get('/api/command-center/overview', optionalAuth, (req, res) => { |
| src/api/routes/command-center.routes.js | 162 | GET | /api/command-center/tasks/urgent | router.get('/api/command-center/tasks/urgent', optionalAuth, (req, res) => { |
| src/api/routes/command-center.routes.js | 221 | GET | /api/command-center/hot-leads | router.get('/api/command-center/hot-leads', optionalAuth, (req, res) => { |
| src/api/routes/command-center.routes.js | 279 | GET | /api/command-center/activity-feed | router.get('/api/command-center/activity-feed', optionalAuth, (req, res) => { |
| src/api/routes/command-center.routes.js | 372 | GET | /api/command-center/pipeline-summary | router.get('/api/command-center/pipeline-summary', optionalAuth, (req, res) => { |
| src/api/routes/command-center.routes.js | 428 | GET | /api/command-center/performance | router.get('/api/command-center/performance', optionalAuth, (req, res) => { |
| src/api/routes/health.routes.js | 44 | GET | /health | router.get('/health', async (req, res) => { |
| src/api/routes/health.routes.js | 87 | GET | /health/detailed | router.get('/health/detailed', async (req, res) => { |
| src/api/routes/health.routes.js | 129 | GET | /health/ready | router.get('/health/ready', async (req, res) => { |
| src/api/routes/health.routes.js | 178 | GET | /health/live | router.get('/health/live', async (req, res) => { |
| src/api/routes/health.routes.js | 193 | GET | /api/version | router.get('/api/version', async (req, res) => { |
| src/api/routes/crm/accounts.routes.js | 16 | GET | /api/crm/accounts | router.get('/api/crm/accounts', async (req, res) => { |
| src/api/routes/crm/accounts.routes.js | 73 | GET | /api/crm/accounts/stats | router.get('/api/crm/accounts/stats', async (req, res) => { |
| src/api/routes/crm/accounts.routes.js | 93 | GET | /api/crm/accounts/:id | router.get('/api/crm/accounts/:id', async (req, res) => { |
| src/api/routes/crm/accounts.routes.js | 129 | POST | /api/crm/accounts | router.post('/api/crm/accounts', async (req, res) => { |
| src/api/routes/crm/accounts.routes.js | 161 | PUT | /api/crm/accounts/:id | router.put('/api/crm/accounts/:id', async (req, res) => { |
| src/api/routes/crm/accounts.routes.js | 196 | DELETE | /api/crm/accounts/:id | router.delete('/api/crm/accounts/:id', async (req, res) => { |
| src/api/routes/website.routes.js | 58 | POST | /api/website/contact | router.post('/api/website/contact', async (req, res) => { |
| src/api/routes/website.routes.js | 111 | POST | /api/website/newsletter | router.post('/api/website/newsletter', async (req, res) => { |
| src/api/routes/website.routes.js | 167 | GET | /api/website/health | router.get('/api/website/health', (req, res) => { |
| src/api/routes/reports.routes.js | 27 | GET | /api/reports/summary | router.get('/api/reports/summary', (req, res) => { |
| src/api/routes/reports.routes.js | 113 | GET | /api/reports/templates | router.get('/api/reports/templates', (req, res) => { |
| src/api/routes/reports.routes.js | 174 | POST | /api/reports/generate | router.post('/api/reports/generate', (req, res) => { |
| src/api/routes/reports.routes.js | 237 | GET | /api/reports/export/:format | router.get('/api/reports/export/:format', (req, res) => { |
| src/api/routes/pipeline.routes.js | 24 | GET | /api/pipeline | router.get('/api/pipeline', async (req, res) => { |
| src/api/routes/pipeline.routes.js | 143 | GET | /api/pipeline/stats | router.get('/api/pipeline/stats', async (req, res) => { |
| src/api/routes/pipeline.routes.js | 180 | POST | /api/pipeline | router.post('/api/pipeline', async (req, res) => { |
| src/api/routes/pipeline.routes.js | 237 | PUT | /api/pipeline/:id/stage | router.put('/api/pipeline/:id/stage', async (req, res) => { |
| src/api/routes/pipeline.routes.js | 339 | PUT | /api/pipeline/:id | router.put('/api/pipeline/:id', async (req, res) => { |
| src/api/routes/pipeline.routes.js | 407 | GET | /api/pipeline/:id | router.get('/api/pipeline/:id', async (req, res) => { |
| src/api/routes/google/sheets.routes.js | 16 | GET | /api/leads | router.get('/api/leads', async (req, res) => { |
| src/api/routes/google/sheets.routes.js | 52 | GET | /api/dashboard/leads | router.get('/api/dashboard/leads', async (req, res) => { |
| src/api/routes/crm/contacts.routes.js | 16 | GET | /api/crm/contacts | router.get('/api/crm/contacts', async (req, res) => { |
| src/api/routes/crm/contacts.routes.js | 73 | GET | /api/crm/contacts/stats | router.get('/api/crm/contacts/stats', async (req, res) => { |
| src/api/routes/crm/contacts.routes.js | 93 | GET | /api/crm/contacts/:id | router.get('/api/crm/contacts/:id', async (req, res) => { |
| src/api/routes/crm/contacts.routes.js | 129 | POST | /api/crm/contacts | router.post('/api/crm/contacts', async (req, res) => { |
| src/api/routes/crm/contacts.routes.js | 161 | PUT | /api/crm/contacts/:id | router.put('/api/crm/contacts/:id', async (req, res) => { |
| src/api/routes/crm/contacts.routes.js | 195 | DELETE | /api/crm/contacts/:id | router.delete('/api/crm/contacts/:id', async (req, res) => { |
| src/api/routes/crm/contacts.routes.js | 225 | POST | /api/crm/contacts/:id/consent | router.post('/api/crm/contacts/:id/consent', async (req, res) => { |
| src/api/routes/crm/contacts.routes.js | 266 | PUT | /api/crm/contacts/:id/score | router.put('/api/crm/contacts/:id/score', async (req, res) => { |
| src/api/routes/meetings.routes.js | 25 | POST | /api/meetings/transcriptions/fetch-by-event | router.post('/api/meetings/transcriptions/fetch-by-event', async (req, res) => { |
| src/api/routes/meetings.routes.js | 79 | POST | /api/meetings/transcriptions/fetch-by-type | router.post('/api/meetings/transcriptions/fetch-by-type', async (req, res) => { |
| src/api/routes/meetings.routes.js | 149 | POST | /api/meetings/transcriptions/fetch-recent | router.post('/api/meetings/transcriptions/fetch-recent', async (req, res) => { |
| src/api/routes/meetings.routes.js | 209 | GET | /api/meetings/transcriptions/:id | router.get('/api/meetings/transcriptions/:id', async (req, res) => { |
| src/api/routes/meetings.routes.js | 237 | GET | /api/meetings/transcriptions | router.get('/api/meetings/transcriptions', async (req, res) => { |
| src/api/routes/meetings.routes.js | 270 | POST | /api/meetings/analyze/:transcriptionId | router.post('/api/meetings/analyze/:transcriptionId', async (req, res) => { |
| src/api/routes/meetings.routes.js | 292 | POST | /api/meetings/analyze/quick | router.post('/api/meetings/analyze/quick', async (req, res) => { |
| src/api/routes/meetings.routes.js | 319 | GET | /api/meetings/analysis/:id | router.get('/api/meetings/analysis/:id', async (req, res) => { |
| src/api/routes/meetings.routes.js | 353 | GET | /api/meetings/analysis/by-meeting/:meetingId | router.get('/api/meetings/analysis/by-meeting/:meetingId', async (req, res) => { |
| src/api/routes/meetings.routes.js | 390 | GET | /api/meetings/scores/excellent | router.get('/api/meetings/scores/excellent', async (req, res) => { |
| src/api/routes/meetings.routes.js | 412 | GET | /api/meetings/scores/bant-qualified | router.get('/api/meetings/scores/bant-qualified', async (req, res) => { |
| src/api/routes/meetings.routes.js | 434 | GET | /api/meetings/scores/stats | router.get('/api/meetings/scores/stats', async (req, res) => { |
| src/api/routes/meetings.routes.js | 461 | GET | /api/meetings/insights/high-priority | router.get('/api/meetings/insights/high-priority', async (req, res) => { |
| src/api/routes/meetings.routes.js | 483 | PATCH | /api/meetings/insights/:id/status | router.patch('/api/meetings/insights/:id/status', async (req, res) => { |
| src/api/routes/meetings.routes.js | 520 | GET | /api/meetings/insights/stats | router.get('/api/meetings/insights/stats', async (req, res) => { |
| src/api/routes/meetings.routes.js | 549 | GET | /api/meetings/auth/google/url | router.get('/api/meetings/auth/google/url', async (req, res) => { |
| src/api/routes/meetings.routes.js | 571 | POST | /api/meetings/auth/google/callback | router.post('/api/meetings/auth/google/callback', async (req, res) => { |
| src/api/routes/dashboard.routes.js | 118 | GET | / | router.get('/', (req, res) => { |
| src/api/routes/dashboard.routes.js | 126 | POST | /api/tts/elevenlabs | router.post('/api/tts/elevenlabs', async (req, res) => { |
| src/api/routes/dashboard.routes.js | 153 | POST | /api/chat | router.post('/api/chat', async (req, res) => { |
| src/api/routes/dashboard.routes.js | 209 | POST | /api/dashboard/voice-navigate | router.post('/api/dashboard/voice-navigate', async (req, res) => { |
| src/api/routes/dashboard.routes.js | 257 | POST | /api/dashboard/execute-navigation | router.post('/api/dashboard/execute-navigation', async (req, res) => { |
| src/api/routes/dashboard.routes.js | 288 | GET | /api/dashboard/voice-commands | router.get('/api/dashboard/voice-commands', async (req, res) => { |
| src/api/routes/email-optin.routes.js | 37 | GET | /api/email-optin/status | router.get('/api/email-optin/status', (req, res) => { |
| src/api/routes/email-optin.routes.js | 53 | GET | /api/email-optin/stats | router.get('/api/email-optin/stats', (req, res) => { |
| src/api/routes/email-optin.routes.js | 70 | POST | /api/email-optin/start | router.post('/api/email-optin/start', async (req, res) => { |
| src/api/routes/email-optin.routes.js | 92 | POST | /api/email-optin/stop | router.post('/api/email-optin/stop', (req, res) => { |
| src/api/routes/email-optin.routes.js | 111 | POST | /api/email-optin/pause | router.post('/api/email-optin/pause', (req, res) => { |
| src/api/routes/email-optin.routes.js | 129 | POST | /api/email-optin/resume | router.post('/api/email-optin/resume', (req, res) => { |
| src/api/routes/email-optin.routes.js | 149 | POST | /api/email-optin/import | router.post('/api/email-optin/import', async (req, res) => { |
| src/api/routes/email-optin.routes.js | 180 | POST | /api/email-optin/send-single | router.post('/api/email-optin/send-single', async (req, res) => { |
| src/api/routes/email-optin.routes.js | 238 | GET | /api/email-optin/pending | router.get('/api/email-optin/pending', (req, res) => { |
| src/api/routes/email-optin.routes.js | 271 | GET | /api/email-optin/sent | router.get('/api/email-optin/sent', (req, res) => { |
| src/api/routes/email-optin.routes.js | 298 | GET | /api/email-optin/eligible | router.get('/api/email-optin/eligible', (req, res) => { |
| src/api/routes/email-optin.routes.js | 331 | POST | /api/email-optin/config | router.post('/api/email-optin/config', (req, res) => { |
| src/api/routes/email-optin.routes.js | 351 | POST | /api/email-optin/mark-eligible | router.post('/api/email-optin/mark-eligible', (req, res) => { |
| src/api/routes/crm/leads.routes.js | 16 | GET | /api/crm/leads | router.get('/api/crm/leads', async (req, res) => { |
| src/api/routes/crm/leads.routes.js | 73 | GET | /api/crm/leads/stats | router.get('/api/crm/leads/stats', async (req, res) => { |
| src/api/routes/crm/leads.routes.js | 93 | GET | /api/crm/leads/:id | router.get('/api/crm/leads/:id', async (req, res) => { |
| src/api/routes/crm/leads.routes.js | 129 | POST | /api/crm/leads | router.post('/api/crm/leads', async (req, res) => { |
| src/api/routes/crm/leads.routes.js | 161 | PUT | /api/crm/leads/:id | router.put('/api/crm/leads/:id', async (req, res) => { |
| src/api/routes/crm/leads.routes.js | 195 | DELETE | /api/crm/leads/:id | router.delete('/api/crm/leads/:id', async (req, res) => { |
| src/api/routes/crm/leads.routes.js | 225 | PUT | /api/crm/leads/:id/status | router.put('/api/crm/leads/:id/status', async (req, res) => { |
| src/api/routes/crm/leads.routes.js | 266 | PUT | /api/crm/leads/:id/bant | router.put('/api/crm/leads/:id/bant', async (req, res) => { |
| src/api/routes/crm/leads.routes.js | 303 | POST | /api/crm/leads/:id/convert | router.post('/api/crm/leads/:id/convert', async (req, res) => { |
| src/api/routes/version.routes.js | 146 | GET | /api/version | router.get('/api/version', async (req, res) => { |
| src/api/routes/version.routes.js | 179 | GET | /api/version/short | router.get('/api/version/short', (req, res) => { |
| src/api/routes/version.routes.js | 189 | GET | /health/version | router.get('/health/version', async (req, res) => { |
| src/api/routes/analytics.routes.js | 38 | GET | /api/analytics/whatsapp-stats | router.get('/api/analytics/whatsapp-stats', async (req, res) => { |
| src/api/routes/analytics.routes.js | 100 | GET | /api/analytics/agent-metrics | router.get('/api/analytics/agent-metrics', async (req, res) => { |
| src/api/routes/analytics.routes.js | 128 | GET | /api/analytics/overview | router.get('/api/analytics/overview', async (req, res) => { |
| src/api/routes/analytics.routes.js | 214 | GET | /api/analytics/top-contacts | router.get('/api/analytics/top-contacts', async (req, res) => { |
| src/api/routes/analytics.routes.js | 262 | GET | /api/analytics/hourly | router.get('/api/analytics/hourly', async (req, res) => { |
| src/api/routes/analytics.routes.js | 322 | GET | /api/analytics/p2/stats | router.get('/api/analytics/p2/stats', async (req, res) => { |
| src/api/routes/analytics.routes.js | 370 | GET | /api/analytics/p2/abandonment-patterns | router.get('/api/analytics/p2/abandonment-patterns', async (req, res) => { |
| src/api/routes/analytics.routes.js | 400 | GET | /api/analytics/p2/experiments | router.get('/api/analytics/p2/experiments', async (req, res) => { |
| src/api/routes/analytics.routes.js | 421 | GET | /api/analytics/p2/sentiment-summary | router.get('/api/analytics/p2/sentiment-summary', async (req, res) => { |
| src/api/routes/analytics.routes.js | 458 | GET | /api/analytics/p2/insights-report | router.get('/api/analytics/p2/insights-report', async (req, res) => { |
| src/api/routes/analytics.routes.js | 478 | POST | /api/analytics/p2/create-experiment | router.post('/api/analytics/p2/create-experiment', async (req, res) => { |
| src/api/routes/analytics.routes.js | 516 | GET | /api/analytics/learning/outcomes | router.get('/api/analytics/learning/outcomes', async (req, res) => { |
| src/api/routes/analytics.routes.js | 563 | GET | /api/analytics/learning/abandonment-job | router.get('/api/analytics/learning/abandonment-job', async (req, res) => { |
| src/api/routes/analytics.routes.js | 602 | POST | /api/analytics/learning/detect-abandonments | router.post('/api/analytics/learning/detect-abandonments', async (req, res) => { |
| src/api/routes/analytics.routes.js | 626 | GET | /api/analytics/learning/abandonment-hotspots | router.get('/api/analytics/learning/abandonment-hotspots', async (req, res) => { |
| src/api/routes/analytics.routes.js | 710 | GET | /api/analytics/learning/full-report | router.get('/api/analytics/learning/full-report', async (req, res) => { |
| src/api/routes/analytics.routes.js | 773 | GET | /api/analytics/learning/activity | router.get('/api/analytics/learning/activity', async (req, res) => { |
| src/api/routes/analytics.routes.js | 834 | GET | /api/analytics/optimizer/status | router.get('/api/analytics/optimizer/status', async (req, res) => { |
| src/api/routes/analytics.routes.js | 855 | POST | /api/analytics/optimizer/run-cycle | router.post('/api/analytics/optimizer/run-cycle', async (req, res) => { |
| src/api/routes/analytics.routes.js | 878 | GET | /api/analytics/optimizer/stage-health | router.get('/api/analytics/optimizer/stage-health', async (req, res) => { |
| src/api/routes/analytics.routes.js | 917 | GET | /api/analytics/optimizer/optimizations | router.get('/api/analytics/optimizer/optimizations', async (req, res) => { |
| src/api/routes/analytics.routes.js | 955 | POST | /api/analytics/optimizer/start | router.post('/api/analytics/optimizer/start', async (req, res) => { |
| src/api/routes/analytics.routes.js | 977 | POST | /api/analytics/optimizer/stop | router.post('/api/analytics/optimizer/stop', async (req, res) => { |
| src/api/routes/analytics.routes.js | 999 | POST | /api/analytics/optimizer/detect-risk | router.post('/api/analytics/optimizer/detect-risk', async (req, res) => { |
| src/api/routes/analytics.routes.js | 1034 | GET | /api/analytics/maturity-level | router.get('/api/analytics/maturity-level', async (req, res) => { |
| src/api/routes/debug.routes.js | 15 | GET | /api/debug/sheets | router.get('/api/debug/sheets', async (req, res) => { |
| src/api/routes/whatsapp.routes.js | 20 | POST | /api/whatsapp/send | router.post('/api/whatsapp/send', async (req, res) => { |
| src/api/routes/whatsapp.routes.js | 100 | POST | /api/campaign/run | router.post('/api/campaign/run', async (req, res) => { |
| src/api/routes/whatsapp.routes.js | 173 | GET | /api/whatsapp/campaign-status | router.get('/api/whatsapp/campaign-status', async (req, res) => { |
| src/api/routes/whatsapp.routes.js | 205 | POST | /api/whatsapp/intelligent-campaign | router.post('/api/whatsapp/intelligent-campaign', async (req, res) => { |
| src/api/routes/whatsapp.routes.js | 273 | GET | /api/leads | router.get('/api/leads', async (req, res) => { |
| src/api/routes/whatsapp.routes.js | 306 | POST | /api/leads/update-stage | router.post('/api/leads/update-stage', async (req, res) => { |
| src/api/routes/notifications.routes.js | 17 | GET | /api/notifications | router.get('/api/notifications', optionalAuth, (req, res) => { |
| src/api/routes/notifications.routes.js | 43 | GET | /api/notifications/unread-count | router.get('/api/notifications/unread-count', optionalAuth, (req, res) => { |
| src/api/routes/notifications.routes.js | 67 | GET | /api/notifications/:id | router.get('/api/notifications/:id', (req, res) => { |
| src/api/routes/notifications.routes.js | 92 | POST | /api/notifications | router.post('/api/notifications', (req, res) => { |
| src/api/routes/notifications.routes.js | 129 | POST | /api/notifications/broadcast | router.post('/api/notifications/broadcast', (req, res) => { |
| src/api/routes/notifications.routes.js | 175 | PUT | /api/notifications/:id/read | router.put('/api/notifications/:id/read', (req, res) => { |
| src/api/routes/notifications.routes.js | 200 | PUT | /api/notifications/read-all | router.put('/api/notifications/read-all', optionalAuth, (req, res) => { |
| src/api/routes/notifications.routes.js | 221 | DELETE | /api/notifications/:id | router.delete('/api/notifications/:id', (req, res) => { |
| src/api/routes/notifications.routes.js | 246 | DELETE | /api/notifications/old | router.delete('/api/notifications/old', (req, res) => { |
| src/api/routes/notifications.routes.js | 267 | GET | /api/notifications/preferences | router.get('/api/notifications/preferences', optionalAuth, (req, res) => { |
| src/api/routes/notifications.routes.js | 286 | PUT | /api/notifications/preferences | router.put('/api/notifications/preferences', optionalAuth, (req, res) => { |
| src/api/routes/funil.routes.js | 31 | GET | /api/funil/bant | router.get('/api/funil/bant', async (req, res) => { |
| src/api/routes/funil.routes.js | 172 | GET | /api/funil/stats | router.get('/api/funil/stats', async (req, res) => { |
| src/api/routes/funil.routes.js | 209 | GET | /api/funil/bant/:contactId | router.get('/api/funil/bant/:contactId', async (req, res) => { |
| src/api/routes/funil.routes.js | 240 | POST | /api/leads/update-stage | router.post('/api/leads/update-stage', async (req, res) => { |
| src/api/routes/funil.routes.js | 334 | POST | /api/funil/cleanup-prospecting | router.post('/api/funil/cleanup-prospecting', async (req, res) => { |
| src/api/routes/funil.routes.js | 399 | POST | /api/funil/sheets-sync/enable | router.post('/api/funil/sheets-sync/enable', async (req, res) => { |
| src/api/routes/funil.routes.js | 418 | POST | /api/funil/sheets-sync/disable | router.post('/api/funil/sheets-sync/disable', async (req, res) => { |
| src/api/routes/funil.routes.js | 437 | POST | /api/funil/sync-to-sheets | router.post('/api/funil/sync-to-sheets', async (req, res) => { |
| src/api/routes/funil.routes.js | 570 | GET | /api/funil/pipeline-unificado | router.get('/api/funil/pipeline-unificado', async (req, res) => { |
| src/api/routes/funil.routes.js | 670 | POST | /api/leads/ingest | router.post('/api/leads/ingest', async (req, res) => { |
| src/api/routes/funil.routes.js | 898 | GET | /api/leads/ingest/stats | router.get('/api/leads/ingest/stats', async (req, res) => { |
| src/api/routes/google/calendar.routes.js | 27 | GET | /api/google/auth-url | router.get('/api/google/auth-url', async (req, res) => { |
| src/api/routes/google/calendar.routes.js | 42 | GET | /api/google/auth-status | router.get('/api/google/auth-status', async (req, res) => { |
| src/api/routes/google/calendar.routes.js | 81 | GET | /auth/google | router.get('/auth/google', async (req, res) => { |
| src/api/routes/google/calendar.routes.js | 96 | GET | /oauth2callback | router.get('/oauth2callback', async (req, res) => { |
| src/api/routes/google/calendar.routes.js | 112 | GET | /api/calendar/status | router.get('/api/calendar/status', async (req, res) => { |
| src/api/routes/google/calendar.routes.js | 127 | GET | /api/events | router.get('/api/events', async (req, res) => { |
| src/api/routes/google/calendar.routes.js | 157 | POST | /api/events | router.post('/api/events', async (req, res) => { |
| src/api/routes/google/calendar.routes.js | 225 | PUT | /api/events/:eventId | router.put('/api/events/:eventId', async (req, res) => { |
| src/api/routes/google/calendar.routes.js | 248 | DELETE | /api/events/:eventId | router.delete('/api/events/:eventId', async (req, res) => { |
| src/api/routes/google/calendar.routes.js | 271 | GET | /api/calendar/free-slots | router.get('/api/calendar/free-slots', async (req, res) => { |
| src/api/routes/google/calendar.routes.js | 300 | POST | /api/calendar/suggest-times | router.post('/api/calendar/suggest-times', async (req, res) => { |
---

# reports/ARTIFACTS_ROUTE_DUPES.md

# Route duplicates by method+path

## GET /api/version
- src/api/routes/health.routes.js:193
- src/api/routes/version.routes.js:146

## GET /api/leads
- src/api/routes/google/sheets.routes.js:16
- src/api/routes/whatsapp.routes.js:273

## POST /api/leads/update-stage
- src/api/routes/whatsapp.routes.js:306
- src/api/routes/funil.routes.js:240

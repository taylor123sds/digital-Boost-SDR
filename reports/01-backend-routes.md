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
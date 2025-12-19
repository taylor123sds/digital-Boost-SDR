# External Calls Map

| FILE | LINE | SNIPPET | URLS |
|---|---:|---|---|
| src/agents/atendimento_agent.js | 27 | import OpenAI from 'openai'; | - |
| src/agents/atendimento_agent.js | 29 | const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY }); | - |
| src/agents/atendimento_agent.js | 518 | const completion = await openai.chat.completions.create({ | - |
| src/agents/atendimento_agent.js | 558 | const completion = await openai.chat.completions.create({ | - |
| src/agents/atendimento_agent.js | 606 | const completion = await openai.chat.completions.create({ | - |
| src/agents/sdr_agent.js | 4 | //  FIX: Use singleton OpenAI client for connection reuse | - |
| src/agents/sdr_agent.js | 5 | import openaiClient from '../core/openai_client.js'; | - |
| src/agents/sdr_agent.js | 499 | //  FIX: Use singleton OpenAI client instead of creating new instance | - |
| src/agents/sdr_agent.js | 500 | const openai = openaiClient.getClient(); | - |
| src/agents/sdr_agent.js | 552 | const completion = await openai.chat.completions.create({ | - |
| src/agents/sdr_agent.js | 577 | //  FIX: Use singleton OpenAI client instead of creating new instance | - |
| src/agents/sdr_agent.js | 578 | const openai = openaiClient.getClient(); | - |
| src/agents/sdr_agent.js | 580 | const completion = await openai.chat.completions.create({ | - |
| src/agents/sdr_agent.js | 632 | //  FIX: Use singleton OpenAI client instead of creating new instance | - |
| src/agents/sdr_agent.js | 633 | const openai = openaiClient.getClient(); | - |
| src/agents/sdr_agent.js | 673 | const completion = await openai.chat.completions.create({ | - |
| src/api/controllers/WebhookController.js | 341 | const result = db.prepare('SELECT value FROM memory WHERE key = ?').get(`opt_out_${phoneNumber}`); | - |
| src/api/routes/activities.routes.js | 17 | router.get('/api/activities', optionalAuth, (req, res) => { | - |
| src/api/routes/activities.routes.js | 58 | router.get('/api/activities/timeline', optionalAuth, (req, res) => { | - |
| src/api/routes/activities.routes.js | 85 | router.get('/api/activities/overdue', optionalAuth, (req, res) => { | - |
| src/api/routes/activities.routes.js | 105 | router.get('/api/activities/today', optionalAuth, (req, res) => { | - |
| src/api/routes/activities.routes.js | 125 | router.get('/api/activities/upcoming', optionalAuth, (req, res) => { | - |
| src/api/routes/activities.routes.js | 150 | router.get('/api/activities/stats', optionalAuth, (req, res) => { | - |
| src/api/routes/activities.routes.js | 175 | router.get('/api/activities/:id', (req, res) => { | - |
| src/api/routes/activities.routes.js | 200 | router.post('/api/activities', optionalAuth, (req, res) => { | - |
| src/api/routes/activities.routes.js | 246 | router.put('/api/activities/:id', (req, res) => { | - |
| src/api/routes/activities.routes.js | 274 | router.put('/api/activities/:id/complete', (req, res) => { | - |
| src/api/routes/activities.routes.js | 300 | router.put('/api/activities/:id/reschedule', (req, res) => { | - |
| src/api/routes/activities.routes.js | 334 | router.delete('/api/activities/:id', (req, res) => { | - |
| src/api/routes/activities.routes.js | 336 | const success = activityModel.delete(req.params.id); | - |
| src/api/routes/admin.routes.js | 25 | router.get('/api/health', async (req, res) => { | - |
| src/api/routes/admin.routes.js | 66 | router.get('/api/stats', async (req, res) => { | - |
| src/api/routes/admin.routes.js | 97 | router.post('/api/admin/clear-cache', async (req, res) => { | - |
| src/api/routes/admin.routes.js | 125 | router.get('/api/admin/handlers-health', async (req, res) => { | - |
| src/api/routes/admin.routes.js | 158 | router.get('/api/admin/system-health', async (req, res) => { | - |
| src/api/routes/admin.routes.js | 174 | router.get('/api/admin/error-stats', async (req, res) => { | - |
| src/api/routes/admin.routes.js | 187 | router.post('/api/admin/clear-old-errors', async (req, res) => { | - |
| src/api/routes/admin.routes.js | 212 | router.get('/api/admin/coordinator/stats', async (req, res) => { | - |
| src/api/routes/admin.routes.js | 225 | router.post('/api/admin/coordinator/emergency-cleanup', async (req, res) => { | - |
| src/api/routes/admin.routes.js | 251 | router.get('/api/admin/audio/stats', async (req, res) => { | - |
| src/api/routes/admin.routes.js | 268 | router.get('/api/admin/audio/status/:messageId', async (req, res) => { | - |
| src/api/routes/admin.routes.js | 288 | router.get('/api/admin/context/stats', async (req, res) => { | - |
| src/api/routes/agents.routes.js | 92 | const limit = rateLimitStore.get(key); | - |
| src/api/routes/agents.routes.js | 121 | rateLimitStore.delete(key); | - |
| src/api/routes/agents.routes.js | 161 | router.get('/api/agents', async (req, res) => { | - |
| src/api/routes/agents.routes.js | 185 | router.get('/api/agents/my', authenticate, tenantContext, async (req, res) => { | - |
| src/api/routes/agents.routes.js | 207 | router.get('/api/agents/:agentId', validateAgentId, async (req, res) => { | - |
| src/api/routes/agents.routes.js | 237 | router.post('/api/agents', requireManager, async (req, res) => { | - |
| src/api/routes/agents.routes.js | 272 | router.put('/api/agents/:agentId', requireManager, validateAgentId, async (req, res) => { | - |
| src/api/routes/agents.routes.js | 296 | router.delete('/api/agents/:agentId', requireManager, validateAgentId, async (req, res) => { | - |
| src/api/routes/agents.routes.js | 301 | repository.delete(agentId, req.tenantId); | - |
| src/api/routes/agents.routes.js | 317 | router.get('/api/admin/agents', async (req, res) => { | - |
| src/api/routes/agents.routes.js | 348 | router.get('/api/agents/my', authenticate, tenantContext, async (req, res) => { | - |
| src/api/routes/agents.routes.js | 371 | router.get('/api/agents/:agentId/permissions', authenticate, tenantContext, validateAgentId, async (req, res) => { | - |
| src/api/routes/agents.routes.js | 413 | router.post('/api/agents/:agentId/duplicate', authenticate, tenantContext, requireManager, validateAgentId, sanitizeInput, async (req, res) => { | - |
| src/api/routes/agents.routes.js | 479 | router.get('/api/agents/:agentId/evolution/status', authenticate, validateAgentId, async (req, res) => { | - |
| src/api/routes/agents.routes.js | 526 | router.post('/api/agents/:agentId/evolution/create', authenticate, tenantContext, requireManager, validateAgentId, async (req, res) => { | - |
| src/api/routes/agents.routes.js | 590 | router.get('/api/agents/:agentId/evolution/qrcode', authenticate, validateAgentId, async (req, res) => { | - |
| src/api/routes/agents.routes.js | 636 | router.post('/api/agents/:agentId/evolution/disconnect', authenticate, requireManager, validateAgentId, async (req, res) => { | - |
| src/api/routes/agents.routes.js | 671 | router.delete('/api/agents/:agentId/evolution', authenticate, requireManager, validateAgentId, async (req, res) => { | - |
| src/api/routes/agents.routes.js | 706 | router.get('/api/evolution/instances', authenticate, async (req, res) => { | - |
| src/api/routes/ai-insights.routes.js | 22 | router.get('/api/ai-insights/sentiment', optionalAuth, (req, res) => { | - |
| src/api/routes/ai-insights.routes.js | 28 | // In production, this would use OpenAI or similar | - |
| src/api/routes/ai-insights.routes.js | 100 | router.get('/api/ai-insights/objections', optionalAuth, (req, res) => { | - |
| src/api/routes/ai-insights.routes.js | 175 | router.get('/api/ai-insights/best-practices', optionalAuth, (req, res) => { | - |
| src/api/routes/ai-insights.routes.js | 270 | router.get('/api/ai-insights/agent-performance', optionalAuth, (req, res) => { | - |
| src/api/routes/ai-insights.routes.js | 285 | const messages = messagesStmt.get(parseInt(days)); | - |
| src/api/routes/ai-insights.routes.js | 302 | const responseRate = responseRateStmt.get(parseInt(days)); | - |
| src/api/routes/ai-insights.routes.js | 323 | const meetings = meetingsStmt.get(parseInt(days)); | - |
| src/api/routes/ai-insights.routes.js | 333 | const bant = bantStmt.get(parseInt(days)); | - |
| src/api/routes/ai-insights.routes.js | 367 | router.get('/api/ai-insights/recommendations', optionalAuth, (req, res) => { | - |
| src/api/routes/ai-insights.routes.js | 378 | const overdue = overdueStmt.get(); | - |
| src/api/routes/ai-insights.routes.js | 399 | const hotLeads = hotLeadsStmt.get(); | - |
| src/api/routes/ai-insights.routes.js | 418 | const stalled = stalledStmt.get(); | - |
| src/api/routes/ai-insights.routes.js | 435 | const meetingsToday = meetingsTodayStmt.get(); | - |
| src/api/routes/ai-insights.routes.js | 455 | const conversion = conversionStmt.get(); | - |
| src/api/routes/analytics.routes.js | 26 | router.get('/api/analytics/whatsapp-stats', async (req, res) => { | - |
| src/api/routes/analytics.routes.js | 32 | const sent = dbInstance.prepare('SELECT COUNT(*) as count FROM whatsapp_messages WHERE from_me = 1').get(); | - |
| src/api/routes/analytics.routes.js | 33 | const received = dbInstance.prepare('SELECT COUNT(*) as count FROM whatsapp_messages WHERE from_me = 0').get(); | - |
| src/api/routes/analytics.routes.js | 36 | const contacts = dbInstance.prepare('SELECT COUNT(DISTINCT phone_number) as count FROM whatsapp_messages').get(); | - |
| src/api/routes/analytics.routes.js | 71 | router.get('/api/analytics/agent-metrics', async (req, res) => { | - |
| src/api/routes/analytics.routes.js | 99 | router.get('/api/analytics/overview', async (req, res) => { | - |
| src/api/routes/analytics.routes.js | 105 | const totalConversations = dbInstance.prepare('SELECT COUNT(DISTINCT phone_number) as count FROM whatsapp_messages').get(); | - |
| src/api/routes/analytics.routes.js | 108 | const sent = dbInstance.prepare('SELECT COUNT(*) as count FROM whatsapp_messages WHERE from_me = 1').get(); | - |
| src/api/routes/analytics.routes.js | 109 | const received = dbInstance.prepare('SELECT COUNT(*) as count FROM whatsapp_messages WHERE from_me = 0').get(); | - |
| src/api/routes/analytics.routes.js | 167 | router.get('/api/analytics/top-contacts', async (req, res) => { | - |
| src/api/routes/analytics.routes.js | 211 | router.get('/api/analytics/hourly', async (req, res) => { | - |
| src/api/routes/analytics.routes.js | 268 | router.get('/api/analytics/p2/stats', async (req, res) => { | - |
| src/api/routes/analytics.routes.js | 275 | `).get().count; | - |
| src/api/routes/analytics.routes.js | 280 | `).get().count; | - |
| src/api/routes/analytics.routes.js | 289 | `).get().count; | - |
| src/api/routes/analytics.routes.js | 310 | router.get('/api/analytics/p2/abandonment-patterns', async (req, res) => { | - |
| src/api/routes/analytics.routes.js | 338 | router.get('/api/analytics/p2/experiments', async (req, res) => { | - |
| src/api/routes/analytics.routes.js | 359 | router.get('/api/analytics/p2/sentiment-summary', async (req, res) => { | - |
| src/api/routes/analytics.routes.js | 393 | router.get('/api/analytics/p2/insights-report', async (req, res) => { | - |
| src/api/routes/analytics.routes.js | 413 | router.post('/api/analytics/p2/create-experiment', async (req, res) => { | - |
| src/api/routes/analytics.routes.js | 451 | router.get('/api/analytics/learning/outcomes', async (req, res) => { | - |
| src/api/routes/analytics.routes.js | 496 | router.get('/api/analytics/learning/abandonment-job', async (req, res) => { | - |
| src/api/routes/analytics.routes.js | 510 | `).get(); | - |
| src/api/routes/analytics.routes.js | 532 | router.post('/api/analytics/learning/detect-abandonments', async (req, res) => { | - |
| src/api/routes/analytics.routes.js | 556 | router.get('/api/analytics/learning/abandonment-hotspots', async (req, res) => { | - |
| src/api/routes/analytics.routes.js | 632 | router.get('/api/analytics/learning/full-report', async (req, res) => { | - |
| src/api/routes/analytics.routes.js | 661 | activeExperiments: dbConn.prepare(`SELECT COUNT(*) as count FROM ab_experiments WHERE status = 'running'`).get()?.count \|\| 0 | - |
| src/api/routes/analytics.routes.js | 689 | router.get('/api/analytics/learning/activity', async (req, res) => { | - |
| src/api/routes/analytics.routes.js | 744 | router.get('/api/analytics/optimizer/status', async (req, res) => { | - |
| src/api/routes/analytics.routes.js | 765 | router.post('/api/analytics/optimizer/run-cycle', async (req, res) => { | - |
| src/api/routes/analytics.routes.js | 788 | router.get('/api/analytics/optimizer/stage-health', async (req, res) => { | - |
| src/api/routes/analytics.routes.js | 827 | router.get('/api/analytics/optimizer/optimizations', async (req, res) => { | - |
| src/api/routes/analytics.routes.js | 865 | router.post('/api/analytics/optimizer/start', async (req, res) => { | - |
| src/api/routes/analytics.routes.js | 887 | router.post('/api/analytics/optimizer/stop', async (req, res) => { | - |
| src/api/routes/analytics.routes.js | 909 | router.post('/api/analytics/optimizer/detect-risk', async (req, res) => { | - |
| src/api/routes/analytics.routes.js | 944 | router.get('/api/analytics/maturity-level', async (req, res) => { | - |
| src/api/routes/auth.routes.js | 33 | const limit = registrationRateLimitStore.get(ip); | - |
| src/api/routes/auth.routes.js | 61 | registrationRateLimitStore.delete(key); | - |
| src/api/routes/auth.routes.js | 109 | router.post('/api/auth/register', registrationRateLimit, sanitizeRegistrationInput, async (req, res) => { | - |
| src/api/routes/auth.routes.js | 243 | router.post('/api/auth/create-user', authenticate, async (req, res) => { | - |
| src/api/routes/auth.routes.js | 295 | router.post('/api/auth/login', async (req, res) => { | - |
| src/api/routes/auth.routes.js | 332 | router.post('/api/auth/logout', authenticate, (req, res) => { | - |
| src/api/routes/auth.routes.js | 354 | router.post('/api/auth/refresh', async (req, res) => { | - |
| src/api/routes/auth.routes.js | 384 | router.get('/api/auth/me', authenticate, (req, res) => { | - |
| src/api/routes/auth.routes.js | 444 | router.put('/api/auth/password', authenticate, async (req, res) => { | - |
| src/api/routes/auth.routes.js | 481 | router.get('/api/auth/sessions', authenticate, (req, res) => { | - |
| src/api/routes/auth.routes.js | 502 | router.delete('/api/auth/sessions', authenticate, (req, res) => { | - |
| src/api/routes/auth.routes.js | 523 | router.get('/api/auth/entitlements', authenticate, (req, res) => { | - |
| src/api/routes/auth.routes.js | 577 | router.post('/api/auth/verify', (req, res) => { | - |
| src/api/routes/automation.routes.js | 21 | router.get('/api/automations', async (req, res) => { | - |
| src/api/routes/automation.routes.js | 56 | router.get('/api/automations/:id', async (req, res) => { | - |
| src/api/routes/automation.routes.js | 59 | const automation = db.prepare('SELECT * FROM automations WHERE id = ?').get(req.params.id); | - |
| src/api/routes/automation.routes.js | 84 | router.post('/api/automations', async (req, res) => { | - |
| src/api/routes/automation.routes.js | 123 | router.put('/api/automations/:id', async (req, res) => { | - |
| src/api/routes/automation.routes.js | 152 | router.delete('/api/automations/:id', async (req, res) => { | - |
| src/api/routes/automation.routes.js | 171 | router.post('/api/automations/:id/toggle', async (req, res) => { | - |
| src/api/routes/automation.routes.js | 192 | router.post('/api/automations/:id/run', async (req, res) => { | - |
| src/api/routes/automation.routes.js | 213 | router.get('/api/automations/:id/executions', async (req, res) => { | - |
| src/api/routes/automation.routes.js | 242 | router.get('/api/automations/executions/recent', async (req, res) => { | - |
| src/api/routes/automation.routes.js | 276 | router.get('/api/automations/engine/stats', async (req, res) => { | - |
| src/api/routes/automation.routes.js | 295 | router.post('/api/automations/engine/initialize', async (req, res) => { | - |
| src/api/routes/automation.routes.js | 324 | router.get('/api/automations/templates', async (req, res) => { | - |
| src/api/routes/automation.routes.js | 510 | router.post('/api/automations/templates/:templateId/install', async (req, res) => { | - |
| src/api/routes/cadence.routes.js | 29 | router.get('/api/cadences', (req, res) => { | - |
| src/api/routes/cadence.routes.js | 54 | router.get('/api/cadences/stats', (req, res) => { | - |
| src/api/routes/cadence.routes.js | 57 | const totalEnrollments = db.prepare('SELECT COUNT(*) as count FROM cadence_enrollments').get().count; | - |
| src/api/routes/cadence.routes.js | 58 | const activeEnrollments = db.prepare("SELECT COUNT(*) as count FROM cadence_enrollments WHERE status = 'active'").get().count; | - |
| src/api/routes/cadence.routes.js | 59 | const respondedEnrollments = db.prepare("SELECT COUNT(*) as count FROM cadence_enrollments WHERE status = 'responded'").get().count; | - |
| src/api/routes/cadence.routes.js | 60 | const completedEnrollments = db.prepare("SELECT COUNT(*) as count FROM cadence_enrollments WHERE status = 'completed'").get().count; | - |
| src/api/routes/cadence.routes.js | 61 | const convertedEnrollments = db.prepare("SELECT COUNT(*) as count FROM cadence_enrollments WHERE status = 'converted'").get().count; | - |
| src/api/routes/cadence.routes.js | 71 | `).get().avg_day \|\| 0; | - |
| src/api/routes/cadence.routes.js | 132 | router.get('/api/cadences/pipeline-view', (req, res) => { | - |
| src/api/routes/cadence.routes.js | 181 | router.get('/api/cadences/:id', (req, res) => { | - |
| src/api/routes/cadence.routes.js | 186 | const cadence = db.prepare('SELECT * FROM cadences WHERE id = ?').get(id); | - |
| src/api/routes/cadence.routes.js | 210 | router.get('/api/cadences/:id/steps', (req, res) => { | - |
| src/api/routes/cadence.routes.js | 245 | router.post('/api/cadences/:id/enroll', (req, res) => { | - |
| src/api/routes/cadence.routes.js | 259 | `).get(cadenceId, lead_id); | - |
| src/api/routes/cadence.routes.js | 315 | router.get('/api/cadences/enrollments/active', (req, res) => { | - |
| src/api/routes/cadence.routes.js | 361 | router.put('/api/cadences/enrollments/:id/pause', (req, res) => { | - |
| src/api/routes/cadence.routes.js | 374 | const enrollment = db.prepare('SELECT lead_id FROM cadence_enrollments WHERE id = ?').get(id); | - |
| src/api/routes/cadence.routes.js | 395 | router.put('/api/cadences/enrollments/:id/resume', (req, res) => { | - |
| src/api/routes/cadence.routes.js | 406 | const enrollment = db.prepare('SELECT lead_id FROM cadence_enrollments WHERE id = ?').get(id); | - |
| src/api/routes/cadence.routes.js | 427 | router.put('/api/cadences/enrollments/:id/respond', (req, res) => { | - |
| src/api/routes/cadence.routes.js | 433 | const enrollment = db.prepare('SELECT * FROM cadence_enrollments WHERE id = ?').get(id); | - |
| src/api/routes/cadence.routes.js | 487 | router.get('/api/cadences/actions/pending', (req, res) => { | - |
| src/api/routes/cadence.routes.js | 523 | `).get(enrollment.enrollment_id, step.id, enrollment.current_day); | - |
| src/api/routes/cadence.routes.js | 562 | router.post('/api/cadences/actions/execute', (req, res) => { | - |
| src/api/routes/cadence.routes.js | 574 | const enrollment = db.prepare('SELECT * FROM cadence_enrollments WHERE id = ?').get(enrollment_id); | - |
| src/api/routes/cadence.routes.js | 575 | const step = db.prepare('SELECT * FROM cadence_steps WHERE id = ?').get(step_id); | - |
| src/api/routes/cadence.routes.js | 627 | router.post('/api/cadences/advance-day', (req, res) => { | - |
| src/api/routes/channels.routes.js | 23 | router.post('/api/agents/:agentId/channels/evolution/connect', | - |
| src/api/routes/channels.routes.js | 73 | router.get('/api/agents/:agentId/channels/evolution/status', | - |
| src/api/routes/channels.routes.js | 127 | router.get('/api/agents/:agentId/channels/evolution/qrcode', | - |
| src/api/routes/channels.routes.js | 188 | router.post('/api/agents/:agentId/channels/evolution/disconnect', | - |
| src/api/routes/channels.routes.js | 230 | router.get('/api/integrations', | - |
| src/api/routes/channels.routes.js | 270 | router.get('/api/integrations/:integrationId', | - |
| src/api/routes/channels.routes.js | 307 | router.get('/api/integrations/:integrationId/status', | - |
| src/api/routes/clientes.routes.js | 18 | router.get('/api/clientes', async (req, res) => { | - |
| src/api/routes/clientes.routes.js | 78 | router.post('/api/clientes/from-opportunity', async (req, res) => { | - |
| src/api/routes/clientes.routes.js | 135 | router.get('/api/clientes/:id', async (req, res) => { | - |
| src/api/routes/clientes.routes.js | 179 | router.put('/api/clientes/:id/status', async (req, res) => { | - |
| src/api/routes/clientes.routes.js | 220 | router.post('/api/clientes/:id/greeting', async (req, res) => { | - |
| src/api/routes/clientes.routes.js | 302 | router.post('/api/clientes/:id/followup', async (req, res) => { | - |
| src/api/routes/command-center.routes.js | 22 | router.get('/api/command-center/overview', optionalAuth, (req, res) => { | - |
| src/api/routes/command-center.routes.js | 40 | const leads = leadsStmt.get(); | - |
| src/api/routes/command-center.routes.js | 53 | const pipeline = pipelineStmt.get(); | - |
| src/api/routes/command-center.routes.js | 73 | const activities = activitiesStmt.get(); | - |
| src/api/routes/command-center.routes.js | 81 | const meetingsToday = meetingsStmt.get(); | - |
| src/api/routes/command-center.routes.js | 92 | const messages = messagesStmt.get(); | - |
| src/api/routes/command-center.routes.js | 136 | router.get('/api/command-center/tasks/urgent', optionalAuth, (req, res) => { | - |
| src/api/routes/command-center.routes.js | 191 | router.get('/api/command-center/hot-leads', optionalAuth, (req, res) => { | - |
| src/api/routes/command-center.routes.js | 235 | router.get('/api/command-center/activity-feed', optionalAuth, (req, res) => { | - |
| src/api/routes/command-center.routes.js | 318 | router.get('/api/command-center/pipeline-summary', optionalAuth, (req, res) => { | - |
| src/api/routes/command-center.routes.js | 369 | router.get('/api/command-center/performance', optionalAuth, (req, res) => { | - |
| src/api/routes/crm/accounts.routes.js | 16 | router.get('/api/crm/accounts', async (req, res) => { | - |
| src/api/routes/crm/accounts.routes.js | 73 | router.get('/api/crm/accounts/stats', async (req, res) => { | - |
| src/api/routes/crm/accounts.routes.js | 93 | router.get('/api/crm/accounts/:id', async (req, res) => { | - |
| src/api/routes/crm/accounts.routes.js | 129 | router.post('/api/crm/accounts', async (req, res) => { | - |
| src/api/routes/crm/accounts.routes.js | 161 | router.put('/api/crm/accounts/:id', async (req, res) => { | - |
| src/api/routes/crm/accounts.routes.js | 196 | router.delete('/api/crm/accounts/:id', async (req, res) => { | - |
| src/api/routes/crm/accounts.routes.js | 200 | const deleted = accountModel.delete(id); | - |
| src/api/routes/crm/contacts.routes.js | 16 | router.get('/api/crm/contacts', async (req, res) => { | - |
| src/api/routes/crm/contacts.routes.js | 73 | router.get('/api/crm/contacts/stats', async (req, res) => { | - |
| src/api/routes/crm/contacts.routes.js | 93 | router.get('/api/crm/contacts/:id', async (req, res) => { | - |
| src/api/routes/crm/contacts.routes.js | 129 | router.post('/api/crm/contacts', async (req, res) => { | - |
| src/api/routes/crm/contacts.routes.js | 161 | router.put('/api/crm/contacts/:id', async (req, res) => { | - |
| src/api/routes/crm/contacts.routes.js | 195 | router.delete('/api/crm/contacts/:id', async (req, res) => { | - |
| src/api/routes/crm/contacts.routes.js | 199 | const deleted = contactModel.delete(id); | - |
| src/api/routes/crm/contacts.routes.js | 225 | router.post('/api/crm/contacts/:id/consent', async (req, res) => { | - |
| src/api/routes/crm/contacts.routes.js | 266 | router.put('/api/crm/contacts/:id/score', async (req, res) => { | - |
| src/api/routes/crm/leads.routes.js | 16 | router.get('/api/crm/leads', async (req, res) => { | - |
| src/api/routes/crm/leads.routes.js | 73 | router.get('/api/crm/leads/stats', async (req, res) => { | - |
| src/api/routes/crm/leads.routes.js | 93 | router.get('/api/crm/leads/:id', async (req, res) => { | - |
| src/api/routes/crm/leads.routes.js | 129 | router.post('/api/crm/leads', async (req, res) => { | - |
| src/api/routes/crm/leads.routes.js | 161 | router.put('/api/crm/leads/:id', async (req, res) => { | - |
| src/api/routes/crm/leads.routes.js | 195 | router.delete('/api/crm/leads/:id', async (req, res) => { | - |
| src/api/routes/crm/leads.routes.js | 199 | const deleted = leadModel.delete(id); | - |
| src/api/routes/crm/leads.routes.js | 225 | router.put('/api/crm/leads/:id/status', async (req, res) => { | - |
| src/api/routes/crm/leads.routes.js | 266 | router.put('/api/crm/leads/:id/bant', async (req, res) => { | - |
| src/api/routes/crm/leads.routes.js | 303 | router.post('/api/crm/leads/:id/convert', async (req, res) => { | - |
| src/api/routes/crm/opportunities.routes.js | 16 | router.get('/api/crm/opportunities', async (req, res) => { | - |
| src/api/routes/crm/opportunities.routes.js | 73 | router.get('/api/crm/opportunities/pipeline', async (req, res) => { | - |
| src/api/routes/crm/opportunities.routes.js | 93 | router.get('/api/crm/opportunities/:id', async (req, res) => { | - |
| src/api/routes/crm/opportunities.routes.js | 129 | router.post('/api/crm/opportunities', async (req, res) => { | - |
| src/api/routes/crm/opportunities.routes.js | 161 | router.put('/api/crm/opportunities/:id', async (req, res) => { | - |
| src/api/routes/crm/opportunities.routes.js | 195 | router.delete('/api/crm/opportunities/:id', async (req, res) => { | - |
| src/api/routes/crm/opportunities.routes.js | 199 | const deleted = opportunityModel.delete(id); | - |
| src/api/routes/crm/opportunities.routes.js | 225 | router.put('/api/crm/opportunities/:id/stage', async (req, res) => { | - |
| src/api/routes/crm/opportunities.routes.js | 266 | router.post('/api/crm/opportunities/:id/win', async (req, res) => { | - |
| src/api/routes/crm/opportunities.routes.js | 297 | router.post('/api/crm/opportunities/:id/lose', async (req, res) => { | - |
| src/api/routes/crm/opportunities.routes.js | 336 | router.post('/api/crm/opportunities/:id/products', async (req, res) => { | - |
| src/api/routes/crm/opportunities.routes.js | 381 | router.delete('/api/crm/opportunities/:id/products/:productId', async (req, res) => { | - |
| src/api/routes/crm-integration.routes.js | 26 | router.get('/api/integrations/crm/:provider/oauth/start', | - |
| src/api/routes/crm-integration.routes.js | 119 | router.get('/api/integrations/oauth/callback/:provider', async (req, res) => { | - |
| src/api/routes/crm-integration.routes.js | 228 | router.post('/api/integrations/:integrationId/disconnect', | - |
| src/api/routes/crm-integration.routes.js | 270 | router.post('/api/integrations/:integrationId/sync', | - |
| src/api/routes/crm-integration.routes.js | 315 | router.get('/api/integrations/:integrationId/pipelines', | - |
| src/api/routes/crm-integration.routes.js | 381 | router.post('/api/integrations/:integrationId/leads', | - |
| src/api/routes/crm-integration.routes.js | 448 | router.get('/api/integrations/:integrationId/test', | - |
| src/api/routes/dashboard.routes.js | 64 | const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice_id}`, { | https://api.elevenlabs.io/v1/text-to-speech/${voice_id}`, |
| src/api/routes/dashboard.routes.js | 118 | router.get('/', (req, res) => { | - |
| src/api/routes/dashboard.routes.js | 126 | router.post('/api/tts/elevenlabs', async (req, res) => { | - |
| src/api/routes/dashboard.routes.js | 153 | router.post('/api/chat', async (req, res) => { | - |
| src/api/routes/dashboard.routes.js | 209 | router.post('/api/dashboard/voice-navigate', async (req, res) => { | - |
| src/api/routes/dashboard.routes.js | 257 | router.post('/api/dashboard/execute-navigation', async (req, res) => { | - |
| src/api/routes/dashboard.routes.js | 288 | router.get('/api/dashboard/voice-commands', async (req, res) => { | - |
| src/api/routes/email-optin.routes.js | 25 | router.get('/api/email-optin/status', (req, res) => { | - |
| src/api/routes/email-optin.routes.js | 41 | router.get('/api/email-optin/stats', (req, res) => { | - |
| src/api/routes/email-optin.routes.js | 58 | router.post('/api/email-optin/start', async (req, res) => { | - |
| src/api/routes/email-optin.routes.js | 79 | router.post('/api/email-optin/stop', (req, res) => { | - |
| src/api/routes/email-optin.routes.js | 98 | router.post('/api/email-optin/pause', (req, res) => { | - |
| src/api/routes/email-optin.routes.js | 116 | router.post('/api/email-optin/resume', (req, res) => { | - |
| src/api/routes/email-optin.routes.js | 136 | router.post('/api/email-optin/import', async (req, res) => { | - |
| src/api/routes/email-optin.routes.js | 166 | router.post('/api/email-optin/send-single', async (req, res) => { | - |
| src/api/routes/email-optin.routes.js | 218 | router.get('/api/email-optin/pending', (req, res) => { | - |
| src/api/routes/email-optin.routes.js | 251 | router.get('/api/email-optin/sent', (req, res) => { | - |
| src/api/routes/email-optin.routes.js | 278 | router.get('/api/email-optin/eligible', (req, res) => { | - |
| src/api/routes/email-optin.routes.js | 307 | router.post('/api/email-optin/config', (req, res) => { | - |
| src/api/routes/email-optin.routes.js | 327 | router.post('/api/email-optin/mark-eligible', (req, res) => { | - |
| src/api/routes/forecasting.routes.js | 31 | router.get('/api/forecasting/pipeline-weighted', optionalAuth, (req, res) => { | - |
| src/api/routes/forecasting.routes.js | 95 | router.get('/api/forecasting/scenarios', optionalAuth, (req, res) => { | - |
| src/api/routes/forecasting.routes.js | 164 | router.get('/api/forecasting/velocity', optionalAuth, (req, res) => { | - |
| src/api/routes/forecasting.routes.js | 177 | const winRateData = winRateStmt.get(); | - |
| src/api/routes/forecasting.routes.js | 189 | const avgDeal = avgDealStmt.get()?.avg_deal \|\| 0; | - |
| src/api/routes/forecasting.routes.js | 199 | const avgCycle = cycleStmt.get()?.avg_cycle \|\| 30; | - |
| src/api/routes/forecasting.routes.js | 205 | const openOpps = openOppsStmt.get()?.count \|\| 0; | - |
| src/api/routes/forecasting.routes.js | 240 | router.get('/api/forecasting/win-rate', optionalAuth, (req, res) => { | - |
| src/api/routes/forecasting.routes.js | 251 | const overall = overallStmt.get(); | - |
| src/api/routes/forecasting.routes.js | 330 | router.get('/api/forecasting/trends', optionalAuth, (req, res) => { | - |
| src/api/routes/forecasting.routes.js | 396 | router.get('/api/forecasting/monthly', optionalAuth, (req, res) => { | - |
| src/api/routes/funil.routes.js | 19 | router.get('/api/funil/bant', async (req, res) => { | - |
| src/api/routes/funil.routes.js | 154 | router.get('/api/funil/stats', async (req, res) => { | - |
| src/api/routes/funil.routes.js | 190 | router.get('/api/funil/bant/:contactId', async (req, res) => { | - |
| src/api/routes/funil.routes.js | 221 | router.post('/api/leads/update-stage', async (req, res) => { | - |
| src/api/routes/funil.routes.js | 315 | router.post('/api/funil/cleanup-prospecting', async (req, res) => { | - |
| src/api/routes/funil.routes.js | 375 | router.post('/api/funil/sheets-sync/enable', async (req, res) => { | - |
| src/api/routes/funil.routes.js | 394 | router.post('/api/funil/sheets-sync/disable', async (req, res) => { | - |
| src/api/routes/funil.routes.js | 413 | router.post('/api/funil/sync-to-sheets', async (req, res) => { | - |
| src/api/routes/funil.routes.js | 535 | router.get('/api/funil/pipeline-unificado', async (req, res) => { | - |
| src/api/routes/funil.routes.js | 617 | router.post('/api/leads/ingest', async (req, res) => { | - |
| src/api/routes/funil.routes.js | 720 | `).get(phone); | - |
| src/api/routes/funil.routes.js | 736 | `).get(phone); | - |
| src/api/routes/funil.routes.js | 843 | router.get('/api/leads/ingest/stats', async (req, res) => { | - |
| src/api/routes/funil.routes.js | 848 | total: db.prepare(`SELECT COUNT(*) as count FROM leads WHERE origem = 'instagram_prospector'`).get().count, | - |
| src/api/routes/funil.routes.js | 849 | hoje: db.prepare(`SELECT COUNT(*) as count FROM leads WHERE origem = 'instagram_prospector' AND DATE(created_at) = DATE('now')`).get().count, | - |
| src/api/routes/funil.routes.js | 850 | semana: db.prepare(`SELECT COUNT(*) as count FROM leads WHERE origem = 'instagram_prospector' AND created_at >= datetime('now', '-7 days')`).get().count, | - |
| src/api/routes/google/calendar.routes.js | 27 | router.get('/api/google/auth-url', async (req, res) => { | - |
| src/api/routes/google/calendar.routes.js | 42 | router.get('/api/google/auth-status', async (req, res) => { | - |
| src/api/routes/google/calendar.routes.js | 81 | router.get('/auth/google', async (req, res) => { | - |
| src/api/routes/google/calendar.routes.js | 96 | router.get('/oauth2callback', async (req, res) => { | - |
| src/api/routes/google/calendar.routes.js | 112 | router.get('/api/calendar/status', async (req, res) => { | - |
| src/api/routes/google/calendar.routes.js | 127 | router.get('/api/events', async (req, res) => { | - |
| src/api/routes/google/calendar.routes.js | 157 | router.post('/api/events', async (req, res) => { | - |
| src/api/routes/google/calendar.routes.js | 225 | router.put('/api/events/:eventId', async (req, res) => { | - |
| src/api/routes/google/calendar.routes.js | 248 | router.delete('/api/events/:eventId', async (req, res) => { | - |
| src/api/routes/google/calendar.routes.js | 271 | router.get('/api/calendar/free-slots', async (req, res) => { | - |
| src/api/routes/google/calendar.routes.js | 300 | router.post('/api/calendar/suggest-times', async (req, res) => { | - |
| src/api/routes/health.routes.js | 34 | router.get('/health', async (req, res) => { | - |
| src/api/routes/health.routes.js | 67 | router.get('/health/detailed', async (req, res) => { | - |
| src/api/routes/health.routes.js | 96 | router.get('/health/ready', async (req, res) => { | - |
| src/api/routes/health.routes.js | 102 | const criticalServices = ['database', 'openai']; | - |
| src/api/routes/health.routes.js | 136 | router.get('/health/live', async (req, res) => { | - |
| src/api/routes/health.routes.js | 151 | router.get('/api/version', async (req, res) => { | - |
| src/api/routes/lead-scoring.routes.js | 19 | router.get('/api/scoring/rules', (req, res) => { | - |
| src/api/routes/lead-scoring.routes.js | 44 | router.get('/api/scoring/rules/:id', (req, res) => { | - |
| src/api/routes/lead-scoring.routes.js | 69 | router.post('/api/scoring/rules', (req, res) => { | - |
| src/api/routes/lead-scoring.routes.js | 107 | router.put('/api/scoring/rules/:id', (req, res) => { | - |
| src/api/routes/lead-scoring.routes.js | 142 | router.delete('/api/scoring/rules/:id', (req, res) => { | - |
| src/api/routes/lead-scoring.routes.js | 144 | const success = scoringModel.delete(req.params.id); | - |
| src/api/routes/lead-scoring.routes.js | 167 | router.put('/api/scoring/rules/:id/toggle', (req, res) => { | - |
| src/api/routes/lead-scoring.routes.js | 192 | router.post('/api/scoring/calculate/:leadId', (req, res) => { | - |
| src/api/routes/lead-scoring.routes.js | 219 | router.post('/api/scoring/calculate-all', (req, res) => { | - |
| src/api/routes/lead-scoring.routes.js | 259 | router.get('/api/scoring/leaderboard', (req, res) => { | - |
| src/api/routes/lead-scoring.routes.js | 283 | router.get('/api/scoring/lead/:leadId', (req, res) => { | - |
| src/api/routes/lead-scoring.routes.js | 318 | router.get('/api/scoring/lead/:leadId/history', (req, res) => { | - |
| src/api/routes/lead-scoring.routes.js | 340 | router.get('/api/scoring/stats', (req, res) => { | - |
| src/api/routes/learning.routes.js | 27 | router.get('/api/learning/report', async (req, res) => { | - |
| src/api/routes/learning.routes.js | 49 | router.get('/api/learning/patterns', async (req, res) => { | - |
| src/api/routes/learning.routes.js | 72 | router.get('/api/learning/score/:contactId', async (req, res) => { | - |
| src/api/routes/learning.routes.js | 101 | router.get('/api/learning/intelligence/dashboard', async (req, res) => { | - |
| src/api/routes/learning.routes.js | 142 | abandonmentPatterns: db.prepare('SELECT COUNT(*) as count FROM abandonment_patterns WHERE is_active = 1').get()?.count \|\| 0, | - |
| src/api/routes/learning.routes.js | 143 | successPatterns: db.prepare('SELECT COUNT(*) as count FROM successful_patterns WHERE is_active = 1').get()?.count \|\| 0, | - |
| src/api/routes/learning.routes.js | 144 | feedbackInsights: db.prepare('SELECT COUNT(*) as count FROM feedback_insights WHERE is_active = 1').get()?.count \|\| 0, | - |
| src/api/routes/learning.routes.js | 145 | conversationOutcomes: db.prepare('SELECT COUNT(*) as count FROM conversation_outcomes').get()?.count \|\| 0, | - |
| src/api/routes/learning.routes.js | 146 | realTimeAdaptations: db.prepare('SELECT COUNT(*) as count FROM real_time_adaptations').get()?.count \|\| 0, | - |
| src/api/routes/learning.routes.js | 147 | patternUsages: db.prepare('SELECT COUNT(*) as count FROM pattern_usage_log').get()?.count \|\| 0 | - |
| src/api/routes/learning.routes.js | 155 | `).get()?.count \|\| 0, | - |
| src/api/routes/learning.routes.js | 159 | `).get()?.count \|\| 0, | - |
| src/api/routes/learning.routes.js | 163 | `).get()?.count \|\| 0, | - |
| src/api/routes/learning.routes.js | 167 | `).get()?.count \|\| 0 | - |
| src/api/routes/learning.routes.js | 211 | router.get('/api/learning/adaptations', async (req, res) => { | - |
| src/api/routes/learning.routes.js | 258 | router.get('/api/learning/abandonment-patterns', async (req, res) => { | - |
| src/api/routes/learning.routes.js | 292 | router.post('/api/learning/patterns/refresh', async (req, res) => { | - |
| src/api/routes/learning.routes.js | 317 | router.get('/api/learning/experiments', async (req, res) => { | - |
| src/api/routes/meetings.routes.js | 25 | router.post('/api/meetings/transcriptions/fetch-by-event', async (req, res) => { | - |
| src/api/routes/meetings.routes.js | 79 | router.post('/api/meetings/transcriptions/fetch-by-type', async (req, res) => { | - |
| src/api/routes/meetings.routes.js | 149 | router.post('/api/meetings/transcriptions/fetch-recent', async (req, res) => { | - |
| src/api/routes/meetings.routes.js | 209 | router.get('/api/meetings/transcriptions/:id', async (req, res) => { | - |
| src/api/routes/meetings.routes.js | 237 | router.get('/api/meetings/transcriptions', async (req, res) => { | - |
| src/api/routes/meetings.routes.js | 270 | router.post('/api/meetings/analyze/:transcriptionId', async (req, res) => { | - |
| src/api/routes/meetings.routes.js | 292 | router.post('/api/meetings/analyze/quick', async (req, res) => { | - |
| src/api/routes/meetings.routes.js | 319 | router.get('/api/meetings/analysis/:id', async (req, res) => { | - |
| src/api/routes/meetings.routes.js | 353 | router.get('/api/meetings/analysis/by-meeting/:meetingId', async (req, res) => { | - |
| src/api/routes/meetings.routes.js | 390 | router.get('/api/meetings/scores/excellent', async (req, res) => { | - |
| src/api/routes/meetings.routes.js | 412 | router.get('/api/meetings/scores/bant-qualified', async (req, res) => { | - |
| src/api/routes/meetings.routes.js | 434 | router.get('/api/meetings/scores/stats', async (req, res) => { | - |
| src/api/routes/meetings.routes.js | 461 | router.get('/api/meetings/insights/high-priority', async (req, res) => { | - |
| src/api/routes/meetings.routes.js | 520 | router.get('/api/meetings/insights/stats', async (req, res) => { | - |
| src/api/routes/meetings.routes.js | 549 | router.get('/api/meetings/auth/google/url', async (req, res) => { | - |
| src/api/routes/meetings.routes.js | 571 | router.post('/api/meetings/auth/google/callback', async (req, res) => { | - |
| src/api/routes/metrics.routes.js | 32 | router.get('/api/metrics', (req, res) => { | - |
| src/api/routes/metrics.routes.js | 51 | router.get('/api/metrics/summary', (req, res) => { | - |
| src/api/routes/metrics.routes.js | 70 | router.post('/api/metrics/reset', (req, res) => { | - |
| src/api/routes/notifications.routes.js | 17 | router.get('/api/notifications', optionalAuth, (req, res) => { | - |
| src/api/routes/notifications.routes.js | 43 | router.get('/api/notifications/unread-count', optionalAuth, (req, res) => { | - |
| src/api/routes/notifications.routes.js | 67 | router.get('/api/notifications/:id', (req, res) => { | - |
| src/api/routes/notifications.routes.js | 92 | router.post('/api/notifications', (req, res) => { | - |
| src/api/routes/notifications.routes.js | 129 | router.post('/api/notifications/broadcast', (req, res) => { | - |
| src/api/routes/notifications.routes.js | 175 | router.put('/api/notifications/:id/read', (req, res) => { | - |
| src/api/routes/notifications.routes.js | 200 | router.put('/api/notifications/read-all', optionalAuth, (req, res) => { | - |
| src/api/routes/notifications.routes.js | 221 | router.delete('/api/notifications/:id', (req, res) => { | - |
| src/api/routes/notifications.routes.js | 223 | const success = notificationModel.delete(req.params.id); | - |
| src/api/routes/notifications.routes.js | 246 | router.delete('/api/notifications/old', (req, res) => { | - |
| src/api/routes/notifications.routes.js | 267 | router.get('/api/notifications/preferences', optionalAuth, (req, res) => { | - |
| src/api/routes/notifications.routes.js | 286 | router.put('/api/notifications/preferences', optionalAuth, (req, res) => { | - |
| src/api/routes/pipeline.routes.js | 18 | router.get('/api/pipeline', async (req, res) => { | - |
| src/api/routes/pipeline.routes.js | 135 | router.get('/api/pipeline/stats', async (req, res) => { | - |
| src/api/routes/pipeline.routes.js | 171 | router.post('/api/pipeline', async (req, res) => { | - |
| src/api/routes/pipeline.routes.js | 226 | router.put('/api/pipeline/:id/stage', async (req, res) => { | - |
| src/api/routes/pipeline.routes.js | 327 | router.put('/api/pipeline/:id', async (req, res) => { | - |
| src/api/routes/pipeline.routes.js | 386 | router.get('/api/pipeline/:id', async (req, res) => { | - |
| src/api/routes/prospecting.routes.js | 48 | router.post('/api/prospecting/start', optionalAuth, async (req, res) => { | - |
| src/api/routes/prospecting.routes.js | 83 | router.post('/api/prospecting/stop', optionalAuth, (req, res) => { | - |
| src/api/routes/prospecting.routes.js | 108 | router.post('/api/prospecting/pause', optionalAuth, (req, res) => { | - |
| src/api/routes/prospecting.routes.js | 132 | router.post('/api/prospecting/resume', optionalAuth, (req, res) => { | - |
| src/api/routes/prospecting.routes.js | 160 | router.get('/api/prospecting/status', optionalAuth, (req, res) => { | - |
| src/api/routes/prospecting.routes.js | 181 | router.get('/api/prospecting/metrics', optionalAuth, (req, res) => { | - |
| src/api/routes/prospecting.routes.js | 202 | router.get('/api/prospecting/history', optionalAuth, (req, res) => { | - |
| src/api/routes/prospecting.routes.js | 239 | router.post('/api/prospecting/config', optionalAuth, (req, res) => { | - |
| src/api/routes/prospecting.routes.js | 283 | router.post('/api/prospecting/template', optionalAuth, (req, res) => { | - |
| src/api/routes/prospecting.routes.js | 325 | router.post('/api/prospecting/manual', optionalAuth, async (req, res) => { | - |
| src/api/routes/prospecting.routes.js | 366 | router.post('/api/prospecting/test', optionalAuth, async (req, res) => { | - |
| src/api/routes/prospecting.routes.js | 403 | router.post('/api/prospecting/reset', optionalAuth, (req, res) => { | - |
| src/api/routes/prospecting.routes.js | 428 | router.get('/api/prospecting/sync/status', optionalAuth, (req, res) => { | - |
| src/api/routes/prospecting.routes.js | 449 | router.post('/api/prospecting/sync/now', optionalAuth, async (req, res) => { | - |
| src/api/routes/prospecting.routes.js | 474 | router.get('/api/prospecting/prospects/stats', optionalAuth, (req, res) => { | - |
| src/api/routes/reports.routes.js | 22 | router.get('/api/reports/summary', optionalAuth, (req, res) => { | - |
| src/api/routes/reports.routes.js | 34 | const leads = leadsStmt.get(); | - |
| src/api/routes/reports.routes.js | 50 | const opps = oppsStmt.get(); | - |
| src/api/routes/reports.routes.js | 65 | const acts = actStmt.get(); | - |
| src/api/routes/reports.routes.js | 104 | router.get('/api/reports/templates', (req, res) => { | - |
| src/api/routes/reports.routes.js | 165 | router.post('/api/reports/generate', optionalAuth, (req, res) => { | - |
| src/api/routes/reports.routes.js | 227 | router.get('/api/reports/export/:format', optionalAuth, (req, res) => { | - |
| src/api/routes/reports.routes.js | 287 | const summary = summaryStmt.get(...dateFilter.params); | - |
| src/api/routes/reports.routes.js | 363 | const leads = leadsStmt.get(...dateFilter.params); | - |
| src/api/routes/reports.routes.js | 470 | const summary = summaryStmt.get(...dateFilter.params); | - |
| src/api/routes/team.routes.js | 25 | router.get('/api/team/users', (req, res) => { | - |
| src/api/routes/team.routes.js | 69 | router.get('/api/team/users/:id', (req, res) => { | - |
| src/api/routes/team.routes.js | 97 | router.post('/api/team/users', async (req, res) => { | - |
| src/api/routes/team.routes.js | 152 | router.put('/api/team/users/:id', async (req, res) => { | - |
| src/api/routes/team.routes.js | 189 | router.delete('/api/team/users/:id', (req, res) => { | - |
| src/api/routes/team.routes.js | 214 | router.get('/api/team/users/:id/performance', (req, res) => { | - |
| src/api/routes/team.routes.js | 234 | router.get('/api/team/leaderboard', (req, res) => { | - |
| src/api/routes/team.routes.js | 262 | router.get('/api/teams', (req, res) => { | - |
| src/api/routes/team.routes.js | 284 | router.get('/api/team/teams', (req, res) => { | - |
| src/api/routes/team.routes.js | 309 | router.get('/api/team/teams/:id', (req, res) => { | - |
| src/api/routes/team.routes.js | 334 | router.post('/api/team/teams', (req, res) => { | - |
| src/api/routes/team.routes.js | 369 | router.put('/api/team/teams/:id', (req, res) => { | - |
| src/api/routes/team.routes.js | 397 | router.delete('/api/team/teams/:id', (req, res) => { | - |
| src/api/routes/team.routes.js | 399 | const success = teamModel.delete(req.params.id); | - |
| src/api/routes/team.routes.js | 422 | router.post('/api/team/teams/:id/members', (req, res) => { | - |
| src/api/routes/team.routes.js | 449 | router.delete('/api/team/teams/:id/members/:userId', (req, res) => { | - |
| src/api/routes/team.routes.js | 474 | router.get('/api/team/teams/:id/performance', (req, res) => { | - |
| src/api/routes/version.routes.js | 97 | `).get(); | - |
| src/api/routes/version.routes.js | 113 | `).get(); | - |
| src/api/routes/version.routes.js | 146 | router.get('/api/version', async (req, res) => { | - |
| src/api/routes/version.routes.js | 151 | const container = req.app.get('container'); | - |
| src/api/routes/version.routes.js | 179 | router.get('/api/version/short', (req, res) => { | - |
| src/api/routes/version.routes.js | 189 | router.get('/health/version', async (req, res) => { | - |
| src/api/routes/webhook.routes.js | 58 | router.post('/api/webhook/evolution', rateLimitWebhook, validateWebhookRequest, async (req, res) => { | - |
| src/api/routes/webhook.routes.js | 551 | `).get(contactId, contactId); | - |
| src/api/routes/webhook.routes.js | 873 | router.get('/api/webhook/health', (req, res) => { | - |
| src/api/routes/webhook.routes.js | 932 | router.get('/api/webhook/coordinator/stats', (req, res) => { | - |
| src/api/routes/webhook.routes.js | 939 | router.post('/api/webhook/coordinator/emergency-cleanup', (req, res) => { | - |
| src/api/routes/webhooks-inbound.routes.js | 20 | router.post('/api/webhooks/inbound/:webhookPublicId', async (req, res) => { | - |
| src/api/routes/webhooks-inbound.routes.js | 121 | const intRecord = db.prepare('SELECT tenant_id FROM integrations WHERE id = ?').get(integration.id); | - |
| src/api/routes/webhooks-inbound.routes.js | 146 | const intRecord = db.prepare('SELECT tenant_id FROM integrations WHERE id = ?').get(integration.id); | - |
| src/api/routes/website.routes.js | 58 | router.post('/api/website/contact', async (req, res) => { | - |
| src/api/routes/website.routes.js | 111 | router.post('/api/website/newsletter', async (req, res) => { | - |
| src/api/routes/website.routes.js | 167 | router.get('/api/website/health', (req, res) => { | - |
| src/api/routes/whatsapp.routes.js | 19 | router.post('/api/whatsapp/send', async (req, res) => { | - |
| src/api/routes/whatsapp.routes.js | 39 | () => fetch(`${EVOLUTION_BASE_URL}/message/sendText/${EVOLUTION_INSTANCE}`, { | - |
| src/api/routes/whatsapp.routes.js | 99 | router.post('/api/campaign/run', async (req, res) => { | - |
| src/api/routes/whatsapp.routes.js | 171 | router.get('/api/whatsapp/campaign-status', async (req, res) => { | - |
| src/api/routes/whatsapp.routes.js | 202 | router.post('/api/whatsapp/intelligent-campaign', async (req, res) => { | - |
| src/api/routes/whatsapp.routes.js | 269 | router.get('/api/leads', async (req, res) => { | - |
| src/api/routes/whatsapp.routes.js | 300 | router.post('/api/leads/update-stage', async (req, res) => { | - |
| src/automation/CadenceEngine.js | 166 | const lead = db.prepare(`SELECT telefone FROM leads WHERE id = ?`).get(leadId); | - |
| src/automation/CadenceEngine.js | 175 | `).get()?.id; | - |
| src/automation/CadenceEngine.js | 185 | `).get(targetCadenceId, leadId); | - |
| src/automation/CadenceEngine.js | 236 | `).get(targetCadenceId); | - |
| src/automation/CadenceEngine.js | 267 | `).get(enrollmentId); | - |
| src/automation/CadenceEngine.js | 288 | `).get(enrollmentId, step.id, enrollment.current_day); | - |
| src/automation/CadenceEngine.js | 299 | `).get(enrollmentId); | - |
| src/automation/CadenceEngine.js | 618 | `).get(enrollment.lead_id); | - |
| src/automation/CadenceEngine.js | 734 | `).get(leadId); | - |
| src/automation/CadenceEngine.js | 775 | `).get(leadId); | - |
| src/automation/CadenceEngine.js | 832 | `).get(`%${phone}%`); | - |
| src/automation/CadenceEngine.js | 888 | `).get(`%${telefone.replace(/\D/g, '')}%`); | - |
| src/automation/EmailOptInEngine.js | 570 | const existing = db.prepare('SELECT id FROM leads WHERE telefone = ?').get(telefone); | - |
| src/automation/EmailOptInEngine.js | 709 | total: db.prepare('SELECT COUNT(*) as c FROM email_optins').get().c, | - |
| src/automation/EmailOptInEngine.js | 710 | sent: db.prepare("SELECT COUNT(*) as c FROM email_optins WHERE status = 'sent'").get().c, | - |
| src/automation/EmailOptInEngine.js | 711 | failed: db.prepare("SELECT COUNT(*) as c FROM email_optins WHERE status = 'failed'").get().c, | - |
| src/automation/EmailOptInEngine.js | 712 | pending: db.prepare("SELECT COUNT(*) as c FROM email_optins WHERE status = 'pending'").get().c | - |
| src/automation/EmailOptInEngine.js | 715 | total: db.prepare('SELECT COUNT(*) as c FROM prospect_leads').get().c, | - |
| src/automation/EmailOptInEngine.js | 716 | pendente: db.prepare("SELECT COUNT(*) as c FROM prospect_leads WHERE status = 'pendente'").get().c, | - |
| src/automation/EmailOptInEngine.js | 717 | email_enviado: db.prepare("SELECT COUNT(*) as c FROM prospect_leads WHERE status = 'email_enviado'").get().c, | - |
| src/automation/EmailOptInEngine.js | 718 | whatsapp_enviado: db.prepare("SELECT COUNT(*) as c FROM prospect_leads WHERE status = 'whatsapp_enviado'").get().c | - |
| src/automation/EmailOptInEngine.js | 721 | total: db.prepare('SELECT COUNT(*) as c FROM leads').get().c, | - |
| src/automation/EmailOptInEngine.js | 722 | whatsapp_eligible: db.prepare('SELECT COUNT(*) as c FROM leads WHERE whatsapp_eligible = 1').get().c, | - |
| src/automation/EmailOptInEngine.js | 723 | optin_sent: db.prepare("SELECT COUNT(*) as c FROM leads WHERE email_optin_status = 'sent'").get().c | - |
| src/automation/ProspectingEngine.js | 792 | `).get(phone); | - |
| src/automation/ProspectingEngine.js | 811 | `).get(phone); | - |
| src/automation/ProspectingEngine.js | 832 | `).get(phone); | - |
| src/automation/ProspectingEngine.js | 849 | `).get(phone); | - |
| src/automation/ProspectingEngine.js | 865 | `).get(phone); | - |
| src/automation/ProspectingEngine.js | 1166 | `).get(phone); | - |
| src/automation/ProspectingEngine.js | 1260 | `).get(phone); | - |
| src/automation/followup/installer.js | 31 | ).get(name); | - |
| src/config/AgentConfigLoader.js | 203 | const cached = this.cache.get(cacheKey); | - |
| src/config/AgentConfigLoader.js | 243 | `).get(agentId, tenantId); | - |
| src/config/AgentConfigLoader.js | 253 | `).get(tenantId); | - |
| src/config/AgentConfigLoader.js | 330 | this.cache.delete(key); | - |
| src/config/di-container.js | 119 | const dependency = this.dependencies.get(name); | - |
| src/config/di-container.js | 133 | this.resolving.delete(name); | - |
| src/config/di-container.js | 151 | this.resolving.delete(name); | - |
| src/config/di-container.js | 170 | this.dependencies.delete(name); | - |
| src/config/di-container.js | 199 | const dep = this.dependencies.get(name); | - |
| src/config/di-container.js | 244 | // Register OpenAI client (singleton) | - |
| src/config/di-container.js | 245 | container.registerSingleton('openaiClient', async (c) => { | - |
| src/config/di-container.js | 246 | const { default: OpenAI } = await import('openai'); | - |
| src/config/di-container.js | 248 | const logger = createLogger({ module: 'OpenAI' }); | - |
| src/config/di-container.js | 250 | logger.info('Initializing OpenAI client'); | - |
| src/config/di-container.js | 252 | const client = new OpenAI({ | - |
| src/config/di-container.js | 253 | apiKey: config.openai.apiKey | - |
| src/config/di-container.js | 256 | logger.info('OpenAI client initialized'); | - |
| src/config/di-container.js | 375 | // Register OpenAI Adapter (singleton) | - |
| src/config/di-container.js | 376 | container.registerSingleton('openaiAdapter', async (c) => { | - |
| src/config/di-container.js | 377 | const { OpenAIAdapter } = await import('../infrastructure/adapters/OpenAIAdapter.js'); | - |
| src/config/di-container.js | 378 | const openaiClient = await c.resolve('openaiClient'); | - |
| src/config/di-container.js | 381 | const logger = createLogger({ module: 'OpenAIAdapter' }); | - |
| src/config/di-container.js | 383 | return new OpenAIAdapter(openaiClient, config, logger); | - |
| src/config/di-container.js | 479 | const openaiAdapter = await c.resolve('openaiAdapter'); | - |
| src/config/di-container.js | 492 | logger.warn('AgentHub not available, will use OpenAI fallback', { error: error.message }); | - |
| src/config/di-container.js | 495 | return new ProcessIncomingMessageUseCase(conversationService, leadService, openaiAdapter, eventBus, cacheManager, logger, agentHub); | - |
| src/config/express.config.js | 126 | app.get('/app/*', (req, res) => { | - |
| src/config/index.js | 23 | OPENAI_API_KEY: 'OpenAI API key is required for AI functionality', | - |
| src/config/index.js | 29 | OPENAI_CHAT_MODEL: 'gpt-4o-mini', | - |
| src/config/index.js | 30 | OPENAI_EMB_MODEL: 'text-embedding-3-small', | - |
| src/config/index.js | 138 | // OpenAI | - |
| src/config/index.js | 139 | openai: { | - |
| src/config/index.js | 140 | apiKey: get('OPENAI_API_KEY'), | - |
| src/config/index.js | 141 | chatModel: get('OPENAI_CHAT_MODEL', 'gpt-4o-mini'), | - |
| src/config/index.js | 142 | embeddingModel: get('OPENAI_EMB_MODEL', 'text-embedding-3-small'), | - |
| src/config/index.js | 143 | maxTokens: getInt('OPENAI_MAX_TOKENS', 4096), | - |
| src/config/index.js | 144 | temperature: parseFloat(get('OPENAI_TEMPERATURE', '0.7')) | - |
| src/config/index.js | 213 | openai: { | - |
| src/config/index.js | 214 | ...this.openai, | - |
| src/config/index.js | 215 | apiKey: mask(this.openai.apiKey) | - |
| src/core/ConsultativeEngine.js | 11 | import OpenAI from 'openai'; | - |
| src/core/ConsultativeEngine.js | 22 | const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY }); | - |
| src/core/ConsultativeEngine.js | 455 | const completion = await openai.chat.completions.create({ | - |
| src/core/ConsultativeEngine.js | 1046 | const completion = await openai.chat.completions.create({ | - |
| src/core/ConsultativeEngine.js | 1271 | const completion = await openai.chat.completions.create({ | - |
| src/core/DynamicConsultativeEngine.js | 38 | import OpenAI from 'openai'; | - |
| src/core/DynamicConsultativeEngine.js | 50 | const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY }); | - |
| src/core/DynamicConsultativeEngine.js | 1630 | const completion = await openai.chat.completions.create({ | - |
| src/core/DynamicConsultativeEngine.js | 1870 | const completion = await openai.chat.completions.create({ | - |
| src/core/DynamicConsultativeEngine.js | 2138 | const completion = await openai.chat.completions.create({ | - |
| src/core/IntentRouter.js | 20 | //  FIX: Use singleton OpenAI client instead of creating new instance | - |
| src/core/IntentRouter.js | 21 | import openaiClient from './openai_client.js'; | - |
| src/core/IntentRouter.js | 25 | const openai = openaiClient.getClient(); | - |
| src/core/IntentRouter.js | 41 | classificationCache.delete(key); | - |
| src/core/IntentRouter.js | 53 | classificationCache.delete(entries[i][0]); | - |
| src/core/IntentRouter.js | 446 | const completion = await openai.chat.completions.create({ | - |
| src/core/IntentRouter.js | 559 | const cached = classificationCache.get(key); | - |
| src/core/IntentRouter.js | 562 | classificationCache.delete(key); | - |
| src/db/connection.js | 169 | const result = this.db.prepare('SELECT 1 as health').get(); | - |
| src/db/migrate.js | 184 | const lastMigration = db.prepare('SELECT filename FROM _migrations ORDER BY id DESC LIMIT 1').get(); | - |
| src/fixes/enhanced_history_manager.js | 394 | // Se tem agente com OpenAI | - |
| src/fixes/enhanced_history_manager.js | 395 | if (agentInstance?.openai) { | - |
| src/fixes/enhanced_history_manager.js | 397 | const completion = await agentInstance.openai.chat.completions.create({ | - |
| src/handlers/UnifiedMessageCoordinator.js | 51 | PROCESSING_TIMEOUT: options.processingTimeout \|\| 30000, // 30s for OpenAI (3 sequential GPT calls) | - |
| src/handlers/UnifiedMessageCoordinator.js | 213 | const sentInfo = this.sentResponses.get(responseHash); | - |
| src/handlers/UnifiedMessageCoordinator.js | 356 | const record = this.messageHashes.get(messageHash); | - |
| src/handlers/UnifiedMessageCoordinator.js | 370 | count: (this.messageHashes.get(messageHash)?.count \|\| 0) + 1 | - |
| src/handlers/UnifiedMessageCoordinator.js | 375 | const record = this.sentResponses.get(responseHash); | - |
| src/handlers/UnifiedMessageCoordinator.js | 404 | return this.contacts.get(contactId); | - |
| src/handlers/UnifiedMessageCoordinator.js | 480 | const contactState = this.contacts.get(contactId); | - |
| src/handlers/UnifiedMessageCoordinator.js | 583 | this.messageHashes.delete(hash); | - |
| src/handlers/UnifiedMessageCoordinator.js | 591 | this.sentResponses.delete(hash); | - |
| src/handlers/UnifiedMessageCoordinator.js | 601 | this.contacts.delete(contactId); | - |
| src/handlers/UnifiedMessageCoordinator.js | 664 | cache.delete(entries[i][0]); | - |
| src/handlers/UnifiedMessageCoordinator.js | 681 | cache.delete(entries[i][0]); | - |
| src/handlers/audio_processor.js | 43 | const cached = this.completedTranscriptions.get(messageId); | - |
| src/handlers/audio_processor.js | 76 | this.processingQueue.delete(messageId); | - |
| src/handlers/audio_processor.js | 322 | const processingPromise = this.processingQueue.get(messageId); | - |
| src/handlers/audio_processor.js | 365 | this.completedTranscriptions.delete(key); | - |
| src/handlers/audio_processor.js | 378 | this.completedTranscriptions.delete(entries[i][0]); | - |
| src/handlers/audio_processor.js | 390 | return { status: 'completed', text: this.completedTranscriptions.get(messageId).text }; | - |
| src/handlers/persistence_manager.js | 70 | this.pendingSaves.delete(conversationId); | - |
| src/handlers/persistence_manager.js | 353 | //  FIX: Usar API correta do better-sqlite3 (prepare().get()) | - |
| src/handlers/persistence_manager.js | 355 | const result = stmt.get(); | - |
| src/infrastructure/adapters/GoogleSheetsAdapter.js | 88 | const response = await this.sheets.spreadsheets.values.get({ | - |
| src/infrastructure/adapters/GoogleSheetsAdapter.js | 374 | const response = await this.sheets.spreadsheets.get({ | - |
| src/infrastructure/adapters/OpenAIAdapter.js | 2 | * @file infrastructure/adapters/OpenAIAdapter.js | - |
| src/infrastructure/adapters/OpenAIAdapter.js | 3 | * @description OpenAI service adapter | - |
| src/infrastructure/adapters/OpenAIAdapter.js | 10 | * OpenAI Adapter | - |
| src/infrastructure/adapters/OpenAIAdapter.js | 11 | * Wraps OpenAI client with domain-friendly interface | - |
| src/infrastructure/adapters/OpenAIAdapter.js | 13 | export class OpenAIAdapter { | - |
| src/infrastructure/adapters/OpenAIAdapter.js | 15 | * @param {Object} openaiClient - OpenAI client instance | - |
| src/infrastructure/adapters/OpenAIAdapter.js | 19 | constructor(openaiClient, config, logger) { | - |
| src/infrastructure/adapters/OpenAIAdapter.js | 20 | this.client = openaiClient; | - |
| src/infrastructure/adapters/OpenAIAdapter.js | 37 | model: options.model \|\| this.config.openai.chatModel | - |
| src/infrastructure/adapters/OpenAIAdapter.js | 41 | model: options.model \|\| this.config.openai.chatModel, | - |
| src/infrastructure/adapters/OpenAIAdapter.js | 73 | 'OpenAI', | - |
| src/infrastructure/adapters/OpenAIAdapter.js | 93 | model: options.model \|\| this.config.openai.chatModel | - |
| src/infrastructure/adapters/OpenAIAdapter.js | 97 | model: options.model \|\| this.config.openai.chatModel, | - |
| src/infrastructure/adapters/OpenAIAdapter.js | 134 | 'OpenAI', | - |
| src/infrastructure/adapters/OpenAIAdapter.js | 153 | model: options.model \|\| this.config.openai.embeddingModel | - |
| src/infrastructure/adapters/OpenAIAdapter.js | 157 | model: options.model \|\| this.config.openai.embeddingModel, | - |
| src/infrastructure/adapters/OpenAIAdapter.js | 180 | 'OpenAI', | - |
| src/infrastructure/adapters/OpenAIAdapter.js | 199 | model: options.model \|\| this.config.openai.embeddingModel | - |
| src/infrastructure/adapters/OpenAIAdapter.js | 203 | model: options.model \|\| this.config.openai.embeddingModel, | - |
| src/infrastructure/adapters/OpenAIAdapter.js | 227 | 'OpenAI', | - |
| src/infrastructure/adapters/OpenAIAdapter.js | 275 | 'OpenAI', | - |
| src/infrastructure/adapters/OpenAIAdapter.js | 324 | 'OpenAI', | - |
| src/infrastructure/adapters/OpenAIAdapter.js | 345 | model: options.model \|\| this.config.openai.chatModel | - |
| src/infrastructure/adapters/OpenAIAdapter.js | 349 | model: options.model \|\| this.config.openai.chatModel, | - |
| src/infrastructure/adapters/OpenAIAdapter.js | 383 | 'OpenAI', | - |
| src/infrastructure/adapters/OpenAIAdapter.js | 429 | 'OpenAI', | - |
| src/infrastructure/adapters/OpenAIAdapter.js | 451 | export default OpenAIAdapter; | - |
| src/infrastructure/adapters/WhatsAppAdapter.js | 24 | this.client = axios.create({ | - |
| src/infrastructure/adapters/WhatsAppAdapter.js | 49 | const response = await this.client.post( | - |
| src/infrastructure/adapters/WhatsAppAdapter.js | 106 | const response = await this.client.post( | - |
| src/infrastructure/adapters/WhatsAppAdapter.js | 160 | const response = await this.client.post(endpoint, { | - |
| src/infrastructure/adapters/WhatsAppAdapter.js | 211 | const response = await this.client.post( | - |
| src/infrastructure/adapters/WhatsAppAdapter.js | 245 | const response = await this.client.post( | - |
| src/infrastructure/adapters/WhatsAppAdapter.js | 280 | const response = await this.client.get( | - |
| src/infrastructure/adapters/WhatsAppAdapter.js | 327 | const response = await this.client.get( | - |
| src/infrastructure/adapters/WhatsAppAdapter.js | 361 | const response = await this.client.get( | - |
| src/infrastructure/adapters/WhatsAppAdapter.js | 398 | const response = await this.client.get( | - |
| src/infrastructure/adapters/WhatsAppAdapter.js | 443 | const response = await this.client.post( | - |
| src/infrastructure/cache/CacheManager.js | 51 | const expiresAt = this.ttls.get(key); | - |
| src/infrastructure/cache/CacheManager.js | 53 | this.delete(key); | - |
| src/infrastructure/cache/CacheManager.js | 62 | return this.cache.get(key); | - |
| src/infrastructure/cache/CacheManager.js | 83 | this.ttls.delete(key); | - |
| src/infrastructure/cache/CacheManager.js | 98 | this.cache.delete(key); | - |
| src/infrastructure/cache/CacheManager.js | 99 | this.ttls.delete(key); | - |
| src/infrastructure/cache/CacheManager.js | 120 | const expiresAt = this.ttls.get(key); | - |
| src/infrastructure/cache/CacheManager.js | 122 | this.delete(key); | - |
| src/infrastructure/cache/CacheManager.js | 148 | const cached = this.get(key); | - |
| src/infrastructure/cache/CacheManager.js | 187 | keys.forEach(key => this.delete(key)); | - |
| src/infrastructure/cache/CacheManager.js | 200 | const value = this.get(key); | - |
| src/infrastructure/cache/CacheManager.js | 271 | this.delete(firstKey); | - |
| src/infrastructure/cache/CacheManager.js | 288 | this.delete(key); | - |
| src/infrastructure/events/EventBus.js | 41 | this.handlers.get(eventName).add(handler); | - |
| src/infrastructure/events/EventBus.js | 45 | handlerCount: this.handlers.get(eventName).size | - |
| src/infrastructure/events/EventBus.js | 50 | const handlers = this.handlers.get(eventName); | - |
| src/infrastructure/events/EventBus.js | 52 | handlers.delete(handler); | - |
| src/infrastructure/events/EventBus.js | 54 | this.handlers.delete(eventName); | - |
| src/infrastructure/events/EventBus.js | 109 | handlerCount: this.handlers.get(event.name)?.size \|\| 0 | - |
| src/infrastructure/events/EventBus.js | 117 | const handlers = this.handlers.get(event.name); | - |
| src/infrastructure/events/EventBus.js | 224 | this.handlers.delete(eventName); | - |
| src/infrastructure/events/EventBus.js | 234 | return this.handlers.get(eventName)?.size \|\| 0; | - |
| src/infrastructure/redis/RedisClient.js | 106 | return await this.client.get(key); | - |
| src/intelligence/ArchetypeEngine.js | 45 | const item = this.cache.get(key); | - |
| src/intelligence/ArchetypeEngine.js | 50 | this.cache.delete(key); | - |
| src/intelligence/ArchetypeEngine.js | 55 | this.cache.delete(key); | - |
| src/intelligence/ArchetypeEngine.js | 62 | this.cache.delete(key); | - |
| src/intelligence/ArchetypeEngine.js | 68 | this.cache.delete(oldestKey); | - |
| src/intelligence/ArchetypeEngine.js | 75 | this.cache.delete(key); | - |
| src/intelligence/ArchetypeEngine.js | 298 | const cached = archetypeCache.get(contactId); | - |
| src/intelligence/ArchetypeEngine.js | 409 | const cached = archetypeCache.get(contactId); | - |
| src/intelligence/ArchetypeEngine.js | 430 | archetypeCache.delete(contactId); | - |
| src/intelligence/ArchetypeEngine.js | 446 | const cached = archetypeCache.get(contactId); | - |
| src/intelligence/ArchetypeEngine.js | 452 | archetypeCache.delete(contactId); | - |
| src/intelligence/ArchetypeEngine.js | 466 | const cached = archetypeCache.get(contactId); | - |
| src/intelligence/ArchetypeEngine.js | 543 | const history = archetypeHistory.get(contactId); | - |
| src/intelligence/ArchetypeEngine.js | 566 | return archetypeHistory.get(contactId) \|\| []; | - |
| src/intelligence/ArchetypeEngine.js | 641 | archetypeCache.delete(contactId); | - |
| src/intelligence/ArchetypeEngine.js | 652 | archetypeHistory.delete(contactId); | - |
| src/intelligence/AutoOptimizer.js | 196 | `).get(stage, stage); | - |
| src/intelligence/AutoOptimizer.js | 271 | `).get(stage); | - |
| src/intelligence/AutoOptimizer.js | 401 | `).get(description); | - |
| src/intelligence/AutoOptimizer.js | 432 | `).get(currentStage); | - |
| src/intelligence/AutoOptimizer.js | 475 | `).get(stage); | - |
| src/intelligence/AutoOptimizer.js | 511 | `).get(stage); | - |
| src/intelligence/AutoOptimizer.js | 600 | `).get(); | - |
| src/intelligence/AutoOptimizer.js | 604 | `).get(); | - |
| src/intelligence/ContextWindowManager.js | 18 | import OpenAI from 'openai'; | - |
| src/intelligence/ContextWindowManager.js | 20 | const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY }); | - |
| src/intelligence/ContextWindowManager.js | 176 | return this.summaryCache.get(cacheKey); | - |
| src/intelligence/ContextWindowManager.js | 189 | const completion = await openai.chat.completions.create({ | - |
| src/intelligence/ContextWindowManager.js | 222 | this.summaryCache.delete(firstKey); | - |
| src/intelligence/ContextWindowManager.js | 266 | this.summaryCache.delete(key); | - |
| src/intelligence/ContextualIntelligence.js | 17 | import OpenAI from 'openai'; | - |
| src/intelligence/ContextualIntelligence.js | 19 | const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY }); | - |
| src/intelligence/ContextualIntelligence.js | 36 | const cached = this.cache.get(cacheKey); | - |
| src/intelligence/ContextualIntelligence.js | 220 | const completion = await openai.chat.completions.create({ | - |
| src/intelligence/ContextualIntelligence.js | 336 | this.cache.delete(key); | - |
| src/intelligence/ConversationOutcomeTracker.js | 347 | `).get(contactId); | - |
| src/intelligence/ConversationOutcomeTracker.js | 378 | const cached = outcomeCache.get(key); | - |
| src/intelligence/ConversationOutcomeTracker.js | 398 | outcomeCache.delete(key); | - |
| src/intelligence/ConversationRecovery.js | 18 | import OpenAI from 'openai'; | - |
| src/intelligence/ConversationRecovery.js | 21 | const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY }); | - |
| src/intelligence/ConversationRecovery.js | 367 | const current = this.recoveryAttempts.get(contactId) \|\| 0; | - |
| src/intelligence/ConversationRecovery.js | 372 | this.recoveryAttempts.delete(contactId); | - |
| src/intelligence/ConversationRecovery.js | 377 | return this.recoveryAttempts.get(contactId) \|\| 0; | - |
| src/intelligence/ConversationRecovery.js | 384 | this.recoveryAttempts.delete(contactId); | - |
| src/intelligence/ConversationSupervisor.js | 17 | import openaiClient from '../core/openai_client.js'; | - |
| src/intelligence/ConversationSupervisor.js | 26 | ANALYSIS_MODEL: process.env.OPENAI_CHAT_MODEL \|\| 'gpt-4o-mini', | - |
| src/intelligence/ConversationSupervisor.js | 125 | //  FIX: Usar cliente OpenAI compartilhado (singleton com cache) | - |
| src/intelligence/ConversationSupervisor.js | 127 | this.openai = openaiClient.getClient(); | - |
| src/intelligence/ConversationSupervisor.js | 204 | const response = await this.openai.chat.completions.create({ | - |
| src/intelligence/ConversationSupervisor.js | 292 | const response = await this.openai.chat.completions.create({ | - |
| src/intelligence/ConversationSupervisor.js | 577 | const analyses = db.prepare(`SELECT COUNT(*) as count FROM conversation_analysis`).get(); | - |
| src/intelligence/ConversationSupervisor.js | 578 | const errors = db.prepare(`SELECT COUNT(*) as count FROM conversation_errors`).get(); | - |
| src/intelligence/GracefulDegradation.js | 6 | * Quando serviços de IA falham (OpenAI down, timeout), o sistema continua | - |
| src/intelligence/GracefulDegradation.js | 146 | return this.circuits.get(serviceName); | - |
| src/intelligence/IntelligenceOrchestrator.js | 31 | import OpenAI from 'openai'; | - |
| src/intelligence/IntelligenceOrchestrator.js | 33 | const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY }); | - |
| src/intelligence/IntelligenceOrchestrator.js | 459 | const completion = await openai.chat.completions.create({ | - |
| src/intelligence/IntelligenceOrchestrator.js | 460 | model: process.env.OPENAI_CHAT_MODEL \|\| 'gpt-4o-mini', | - |
| src/intelligence/LeadScoringIntegration.js | 34 | const cached = this.cache.get(cacheKey); | - |
| src/intelligence/LeadScoringIntegration.js | 390 | this.cache.delete(`score_${contactId}`); | - |
| src/intelligence/MessageUnderstanding.js | 14 | import OpenAI from 'openai'; | - |
| src/intelligence/MessageUnderstanding.js | 17 | const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY }); | - |
| src/intelligence/MessageUnderstanding.js | 40 | const item = this.cache.get(key); | - |
| src/intelligence/MessageUnderstanding.js | 45 | this.cache.delete(key); | - |
| src/intelligence/MessageUnderstanding.js | 50 | this.cache.delete(key); | - |
| src/intelligence/MessageUnderstanding.js | 58 | this.cache.delete(key); | - |
| src/intelligence/MessageUnderstanding.js | 64 | this.cache.delete(oldestKey); | - |
| src/intelligence/MessageUnderstanding.js | 94 | const entry = this.contexts.get(contactId); | - |
| src/intelligence/MessageUnderstanding.js | 99 | this.contexts.delete(contactId); | - |
| src/intelligence/MessageUnderstanding.js | 104 | this.contexts.delete(contactId); | - |
| src/intelligence/MessageUnderstanding.js | 110 | let entry = this.contexts.get(contactId); | - |
| src/intelligence/MessageUnderstanding.js | 116 | this.contexts.delete(oldestKey); | - |
| src/intelligence/MessageUnderstanding.js | 123 | this.contexts.delete(contactId); | - |
| src/intelligence/MessageUnderstanding.js | 143 | this.contexts.delete(contactId); | - |
| src/intelligence/MessageUnderstanding.js | 152 | this.contexts.delete(contactId); | - |
| src/intelligence/MessageUnderstanding.js | 264 | const cached = understandingCache.get(cacheKey); | - |
| src/intelligence/MessageUnderstanding.js | 317 | const completion = await openai.chat.completions.create({ | - |
| src/intelligence/MessageUnderstanding.js | 387 | return conversationContextLRU.get(contactId); | - |
| src/intelligence/MessageUnderstanding.js | 401 | conversationContextLRU.delete(contactId); | - |
| src/intelligence/PatternApplier.js | 37 | const entry = this.cache.get(key); | - |
| src/intelligence/PatternApplier.js | 40 | this.cache.delete(key); | - |
| src/intelligence/PatternApplier.js | 49 | this.cache.delete(firstKey); | - |
| src/intelligence/PatternApplier.js | 65 | this.cache.delete(key); | - |
| src/intelligence/PatternApplier.js | 253 | const cached = this.cache.get(cacheKey); | - |
| src/intelligence/PromptAdaptationSystem.js | 260 | `).get(stage); | - |
| src/intelligence/PromptAdaptationSystem.js | 278 | `).get(variationId); | - |
| src/intelligence/PromptAdaptationSystem.js | 304 | `).get(stage, MIN_SAMPLES_FOR_ADAPTATION); | - |
| src/intelligence/PromptAdaptationSystem.js | 320 | `).get(variationId, variationId); | - |
| src/intelligence/PromptAdaptationSystem.js | 389 | `).get(variationId); | - |
| src/intelligence/RealTimeAdapter.js | 125 | this.conversationStates.delete(contactId); | - |
| src/intelligence/RealTimeAdapter.js | 139 | this.conversationStates.delete(contactId); | - |
| src/intelligence/RealTimeAdapter.js | 179 | const state = this.conversationStates.get(contactId); | - |
| src/intelligence/RealTimeAdapter.js | 258 | let state = this.conversationStates.get(contactId); | - |
| src/intelligence/RealTimeAdapter.js | 444 | const state = this.conversationStates.get(contactId); | - |
| src/intelligence/RealTimeAdapter.js | 500 | this.conversationStates.delete(contactId); | - |
| src/intelligence/SentimentAnalyzer.js | 20 | import OpenAI from 'openai'; | - |
| src/intelligence/SentimentAnalyzer.js | 22 | const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY }); | - |
| src/intelligence/SentimentAnalyzer.js | 213 | const completion = await openai.chat.completions.create({ | - |
| src/intelligence/SentimentAnalyzer.js | 450 | `).get(contactId); | - |
| src/intelligence/UnifiedFAQSystem.js | 15 | import openai from '../core/openai_client.js'; | - |
| src/intelligence/UnifiedFAQSystem.js | 51 | const response = await openai.chat.completions.create({ | - |
| src/intelligence/UnifiedFAQSystem.js | 124 | const response = await openai.chat.completions.create({ | - |
| src/intelligence/UnifiedIntentPipeline.js | 18 | import openaiClient from '../core/openai_client.js'; | - |
| src/intelligence/UnifiedIntentPipeline.js | 20 | const openai = openaiClient.getClient(); | - |
| src/intelligence/UnifiedIntentPipeline.js | 380 | const completion = await openai.chat.completions.create({ | - |
| src/intelligence/UnifiedIntentPipeline.js | 450 | const cached = classificationCache.get(key); | - |
| src/intelligence/UnifiedIntentPipeline.js | 453 | classificationCache.delete(key); | - |
| src/intelligence/UnifiedIntentPipeline.js | 465 | classificationCache.delete(entries[i][0]); | - |
| src/intelligence/UnifiedIntentPipeline.js | 476 | classificationCache.delete(key); | - |
| src/learning/conversation_analytics.js | 294 | const totalSignals = db.prepare('SELECT COUNT(*) as count FROM success_signals').get(); | - |
| src/learning/conversation_analytics.js | 298 | `).get(); | - |
| src/learning/conversation_analytics.js | 302 | `).get(); | - |
| src/memory.js | 291 | const row = stmt.get(key); | - |
| src/memory.js | 658 | const row = stmt.get(id); | - |
| src/memory.js | 845 | const row = stmt.get(cleanNumber, now); | - |
| src/memory.js | 1285 | const current = selectStmt.get(key); | - |
| src/messaging/MediaSender.js | 8 | * 1. Enviar áudios (TTS via ElevenLabs ou OpenAI) | - |
| src/messaging/MediaSender.js | 17 | * - Fallback para OpenAI TTS se ElevenLabs falhar | - |
| src/messaging/MediaSender.js | 59 | this.openaiClient = null; | - |
| src/messaging/MediaSender.js | 79 | // OpenAI (fallback TTS) | - |
| src/messaging/MediaSender.js | 80 | if (process.env.OPENAI_API_KEY) { | - |
| src/messaging/MediaSender.js | 82 | const OpenAI = (await import('openai')).default; | - |
| src/messaging/MediaSender.js | 83 | this.openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY }); | - |
| src/messaging/MediaSender.js | 84 | console.log(' [MediaSender] OpenAI Client inicializado (TTS fallback)'); | - |
| src/messaging/MediaSender.js | 86 | console.warn(' [MediaSender] OpenAI não disponível:', error.message); | - |
| src/messaging/MediaSender.js | 105 | provider = 'elevenlabs', // elevenlabs \| openai | - |
| src/messaging/MediaSender.js | 115 | const cached = audioCache.get(cacheKey); | - |
| src/messaging/MediaSender.js | 127 | } else if (this.openaiClient) { | - |
| src/messaging/MediaSender.js | 128 | audioBuffer = await this._generateOpenAITTS(text); | - |
| src/messaging/MediaSender.js | 174 | async _generateOpenAITTS(text) { | - |
| src/messaging/MediaSender.js | 175 | const response = await this.openaiClient.audio.speech.create({ | - |
| src/messaging/MediaSender.js | 189 | const response = await fetch(`${EVOLUTION_BASE_URL}/message/sendWhatsAppAudio/${EVOLUTION_INSTANCE}`, { | - |
| src/messaging/MediaSender.js | 204 | const altResponse = await fetch(`${EVOLUTION_BASE_URL}/message/sendMedia/${EVOLUTION_INSTANCE}`, { | - |
| src/messaging/MediaSender.js | 271 | const response = await fetch(`${EVOLUTION_BASE_URL}/message/sendMedia/${EVOLUTION_INSTANCE}`, { | - |
| src/messaging/MediaSender.js | 326 | const response = await fetch(documentSource); | - |
| src/messaging/MediaSender.js | 339 | const response = await fetch(`${EVOLUTION_BASE_URL}/message/sendMedia/${EVOLUTION_INSTANCE}`, { | - |
| src/messaging/MediaSender.js | 396 | const response = await fetch(`${EVOLUTION_BASE_URL}/message/sendMedia/${EVOLUTION_INSTANCE}`, { | - |
| src/middleware/ContactRateLimiter.js | 8 | * - Controlar custos de OpenAI | - |
| src/middleware/ContactRateLimiter.js | 61 | let bucket = this.buckets.get(contactId); | - |
| src/middleware/ContactRateLimiter.js | 118 | const bucket = this.buckets.get(contactId); | - |
| src/middleware/ContactRateLimiter.js | 130 | const bucket = this.buckets.get(contactId); | - |
| src/middleware/ContactRateLimiter.js | 140 | this.buckets.delete(contactId); | - |
| src/middleware/ContactRateLimiter.js | 152 | this.buckets.delete(contactId); | - |
| src/middleware/error-handler.js | 82 | userAgent: req.get('user-agent'), | - |
| src/middleware/rate-limiter.js | 44 | const userRequests = this.requests.get(identifier); | - |
| src/middleware/rate-limiter.js | 78 | this.requests.delete(identifier); | - |
| src/middleware/tenant.middleware.js | 62 | const team = db.prepare('SELECT id FROM teams WHERE id = ?').get(req.tenantId); | - |
| src/middleware/tenant.middleware.js | 66 | const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.tenantId); | - |
| src/middleware/tenant.middleware.js | 193 | return db.prepare(query).get(...allParams).count; | - |
| src/models/Account.js | 72 | const total = db.prepare('SELECT COUNT(*) as count FROM accounts').get().count; | - |
| src/models/BaseModel.js | 105 | return stmt.get(id); | - |
| src/models/BaseModel.js | 196 | const result = stmt.get(...params); | - |
| src/models/Lead.js | 87 | opportunity = db.prepare('SELECT * FROM opportunities WHERE id = ?').get(lead.opportunity_id); | - |
| src/models/Lead.js | 90 | account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(lead.account_id); | - |
| src/models/Lead.js | 93 | contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(lead.contact_id); | - |
| src/models/Lead.js | 176 | const total = db.prepare('SELECT COUNT(*) as count FROM leads').get().count; | - |
| src/models/Lead.js | 177 | const converted = db.prepare('SELECT COUNT(*) as count FROM leads WHERE converted = 1').get().count; | - |
| src/models/Lead.js | 193 | `).get(); | - |
| src/models/MeetingAnalysis.js | 110 | const row = stmt.get(id); | - |
| src/models/MeetingAnalysis.js | 119 | const row = stmt.get(transcriptionId); | - |
| src/models/MeetingAnalysis.js | 128 | const row = stmt.get(meetingId); | - |
| src/models/MeetingAnalysis.js | 271 | return stmt.get(); | - |
| src/models/MeetingInsight.js | 78 | const row = stmt.get(id); | - |
| src/models/MeetingInsight.js | 277 | return stmt.get(); | - |
| src/models/MeetingInsight.js | 329 | return stmt.get(); | - |
| src/models/MeetingScore.js | 158 | const row = stmt.get(id); | - |
| src/models/MeetingScore.js | 167 | const row = stmt.get(analysisId); | - |
| src/models/MeetingScore.js | 176 | const row = stmt.get(meetingId); | - |
| src/models/MeetingScore.js | 336 | return stmt.get(); | - |
| src/models/Notification.js | 49 | const result = stmt.get(userId); | - |
| src/models/Notification.js | 203 | let prefs = stmt.get(userId); | - |
| src/models/Notification.js | 212 | prefs = stmt.get(userId); | - |
| src/models/Opportunity.js | 73 | const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(opportunity.account_id); | - |
| src/models/Opportunity.js | 78 | contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(opportunity.contact_id); | - |
| src/models/Opportunity.js | 202 | `).get(opportunityId); | - |
| src/models/Opportunity.js | 246 | `).get(); | - |
| src/models/Opportunity.js | 254 | `).get(); | - |
| src/models/Opportunity.js | 262 | `).get(); | - |
| src/models/Opportunity.js | 276 | `).get(); | - |
| src/models/ScoringRule.js | 58 | return stmt.get(leadId); | - |
| src/models/ScoringRule.js | 311 | const averages = categoriesStmt.get(); | - |
| src/models/ScoringRule.js | 316 | const rulesCount = rulesStmt.get(); | - |
| src/models/User.js | 20 | return stmt.get(email); | - |
| src/models/User.js | 34 | return stmt.get(refreshToken); | - |
| src/models/User.js | 209 | const leads = leadsStmt.get(...params); | - |
| src/models/User.js | 210 | const opportunities = oppsStmt.get(...params); | - |
| src/models/User.js | 211 | const activities = activitiesStmt.get(...params); | - |
| src/platform/AgentFactory.js | 165 | return this.registry.get(agentId); | - |
| src/platform/AgentFactory.js | 172 | return this.registry.delete(agentId); | - |
| src/platform/AgentFactory.js | 213 | return this.templates.get(templateId); | - |
| src/platform/api/RuntimeAdapter.js | 3 | * Ponte entre a Platform (configuracao) e o Runtime existente (webhooks, WhatsApp, OpenAI) | - |
| src/platform/api/RuntimeAdapter.js | 8 | * - Infraestrutura existente (OpenAI, WhatsApp, etc.) | - |
| src/platform/api/RuntimeAdapter.js | 17 | this.openaiClient = options.openaiClient; // Injeta cliente OpenAI existente | - |
| src/platform/api/RuntimeAdapter.js | 33 | return this.activeAgents.get(agentId); | - |
| src/platform/api/RuntimeAdapter.js | 48 | return this.stateMachines.get(conversationId); | - |
| src/platform/api/RuntimeAdapter.js | 94 | // 4. Monta contexto para OpenAI | - |
| src/platform/api/RuntimeAdapter.js | 98 | // 5. Chama OpenAI (usando cliente injetado) | - |
| src/platform/api/RuntimeAdapter.js | 100 | if (this.openaiClient) { | - |
| src/platform/api/RuntimeAdapter.js | 101 | response = await this.callOpenAI(systemPrompt, messages); | - |
| src/platform/api/RuntimeAdapter.js | 207 | * Constroi array de mensagens para OpenAI | - |
| src/platform/api/RuntimeAdapter.js | 230 | * Chama OpenAI usando cliente existente | - |
| src/platform/api/RuntimeAdapter.js | 232 | async callOpenAI(systemPrompt, messages) { | - |
| src/platform/api/RuntimeAdapter.js | 233 | if (!this.openaiClient) { | - |
| src/platform/api/RuntimeAdapter.js | 234 | throw new Error('OpenAI client nao configurado'); | - |
| src/platform/api/RuntimeAdapter.js | 238 | const response = await this.openaiClient.chat.completions.create({ | - |
| src/platform/api/RuntimeAdapter.js | 239 | model: process.env.OPENAI_CHAT_MODEL \|\| 'gpt-4o-mini', | - |
| src/platform/api/RuntimeAdapter.js | 250 | console.error('[RuntimeAdapter] Erro OpenAI:', error.message); | - |
| src/platform/api/RuntimeAdapter.js | 256 | * Resposta baseada no estado (fallback sem OpenAI) | - |
| src/platform/api/RuntimeAdapter.js | 305 | this.activeAgents.delete(agentId); | - |
| src/platform/api/RuntimeAdapter.js | 312 | this.stateMachines.delete(conversationId); | - |
| src/platform/api/routes/agents.routes.js | 15 | router.get('/', async (req, res) => { | - |
| src/platform/api/routes/agents.routes.js | 40 | router.get('/:id', async (req, res) => { | - |
| src/platform/api/routes/agents.routes.js | 73 | router.post('/', async (req, res) => { | - |
| src/platform/api/routes/agents.routes.js | 106 | router.put('/:id', async (req, res) => { | - |
| src/platform/api/routes/agents.routes.js | 138 | router.delete('/:id', async (req, res) => { | - |
| src/platform/api/routes/agents.routes.js | 165 | router.post('/preview', async (req, res) => { | - |
| src/platform/api/routes/agents.routes.js | 184 | router.get('/:id/prompt', async (req, res) => { | - |
| src/platform/api/routes/agents.routes.js | 219 | router.get('/:id/state', async (req, res) => { | - |
| src/platform/api/routes/agents.routes.js | 252 | router.post('/from-template', async (req, res) => { | - |
| src/platform/api/routes/agents.routes.js | 285 | router.get('/templates/list', async (req, res) => { | - |
| src/platform/api/routes/runtime.routes.js | 16 | router.post('/process', async (req, res) => { | - |
| src/platform/api/routes/runtime.routes.js | 61 | router.post('/chat', async (req, res) => { | - |
| src/platform/api/routes/runtime.routes.js | 99 | router.post('/simulate', async (req, res) => { | - |
| src/platform/api/routes/runtime.routes.js | 159 | router.get('/states', async (req, res) => { | - |
| src/platform/api/routes/runtime.routes.js | 187 | router.post('/qualify', async (req, res) => { | - |
| src/platform/api/routes/runtime.routes.js | 221 | router.post('/extract', async (req, res) => { | - |
| src/platform/api/routes/runtime.routes.js | 249 | router.get('/questions/:stage', async (req, res) => { | - |
| src/platform/api/routes/runtime.routes.js | 286 | router.post('/webhook', async (req, res) => { | - |
| src/platform/database/index.js | 126 | return this.db.prepare(sql).get(...params); | - |
| src/platform/database/repositories/AgentRepository.js | 146 | `).get(tenantId); | - |
| src/platform/database/repositories/ConversationRepository.js | 157 | `).get(agentId); | - |
| src/platform/tools/ToolRegistry.js | 42 | this.toolsByCategory.get(category).push(name); | - |
| src/platform/tools/ToolRegistry.js | 51 | return this.tools.get(name); | - |
| src/platform/tools/ToolRegistry.js | 58 | const tool = this.tools.get(name); | - |
| src/platform/tools/ToolRegistry.js | 94 | const names = this.toolsByCategory.get(category) \|\| []; | - |
| src/platform/tools/ToolRegistry.js | 95 | return names.map(name => this.tools.get(name)); | - |
| src/platform/tools/ToolRegistry.js | 108 | * Retorna schema OpenAI para ferramentas | - |
| src/platform/tools/ToolRegistry.js | 110 | getOpenAITools(toolNames = null) { | - |
| src/platform/tools/ToolRegistry.js | 112 | ? toolNames.map(name => this.tools.get(name)).filter(Boolean) | - |
| src/platform/tools/ToolRegistry.js | 129 | const permissions = this.tenantPermissions.get(tenantId); | - |
| src/platform/tools/ToolRegistry.js | 132 | const tool = this.tools.get(toolName); | - |
| src/platform/tools/ToolRegistry.js | 154 | const tool = this.tools.get(name); | - |
| src/platform/tools/ToolRegistry.js | 156 | this.tools.delete(name); | - |
| src/platform/tools/ToolRegistry.js | 157 | const categoryTools = this.toolsByCategory.get(tool.category); | - |
| src/providers/EvolutionProvider.js | 27 | this.client = axios.create({ | - |
| src/providers/EvolutionProvider.js | 116 | const response = await this.client.post('/instance/create', payload); | - |
| src/providers/EvolutionProvider.js | 162 | const response = await this.client.get(`/instance/connect/${instanceName}`); | - |
| src/providers/EvolutionProvider.js | 197 | const response = await this.client.get(`/instance/connectionState/${instanceName}`); | - |
| src/providers/EvolutionProvider.js | 256 | const response = await this.client.get(`/instance/fetchInstances`, { | - |
| src/providers/EvolutionProvider.js | 299 | const response = await this.client.delete(`/instance/logout/${instanceName}`); | - |
| src/providers/EvolutionProvider.js | 326 | const response = await this.client.delete(`/instance/delete/${instanceName}`); | - |
| src/providers/EvolutionProvider.js | 371 | const response = await this.client.put(`/webhook/set/${instanceName}`, payload); | - |
| src/providers/EvolutionProvider.js | 398 | const response = await this.client.post(`/message/sendText/${instanceName}`, { | - |
| src/providers/EvolutionProvider.js | 429 | const response = await this.client.put(`/instance/restart/${instanceName}`); | - |
| src/providers/EvolutionProvider.js | 453 | const response = await this.client.get('/instance/fetchInstances'); | - |
| src/providers/crm/KommoCRMProvider.js | 60 | const response = await axios.post(`${baseUrl}/oauth2/access_token`, { | - |
| src/providers/crm/KommoCRMProvider.js | 101 | const response = await axios.post(`${baseUrl}/oauth2/access_token`, { | - |
| src/providers/crm/KommoCRMProvider.js | 134 | async apiRequest(accessToken, method, endpoint, data, accountDomain) { | - |
| src/providers/crm/KommoCRMProvider.js | 172 | const response = await this.apiRequest( | - |
| src/providers/crm/KommoCRMProvider.js | 186 | const response = await this.apiRequest( | - |
| src/providers/crm/KommoCRMProvider.js | 208 | const response = await this.apiRequest( | - |
| src/providers/crm/KommoCRMProvider.js | 223 | const response = await this.apiRequest( | - |
| src/providers/crm/KommoCRMProvider.js | 251 | const response = await this.apiRequest( | - |
| src/providers/crm/KommoCRMProvider.js | 265 | const response = await this.apiRequest( | - |
| src/providers/crm/KommoCRMProvider.js | 287 | const response = await this.apiRequest( | - |
| src/providers/crm/KommoCRMProvider.js | 306 | const response = await this.apiRequest( | - |
| src/providers/crm/KommoCRMProvider.js | 329 | const response = await this.apiRequest( | - |
| src/providers/crm/KommoCRMProvider.js | 360 | const response = await this.apiRequest( | - |
| src/providers/crm/KommoCRMProvider.js | 386 | const response = await this.apiRequest( | - |
| src/providers/crm/KommoCRMProvider.js | 412 | const response = await this.apiRequest( | - |
| src/providers/crm/KommoCRMProvider.js | 438 | const response = await this.apiRequest( | - |
| src/providers/crm/KommoCRMProvider.js | 496 | const response = await this.apiRequest( | - |
| src/repositories/agent.repository.js | 53 | `).get(agentId); | - |
| src/repositories/agent.repository.js | 71 | `).get(agentId, tenantId); | - |
| src/repositories/agent.repository.js | 89 | `).get(slug, tenantId); | - |
| src/repositories/agent.repository.js | 305 | `).get(tenantId); | - |
| src/repositories/base-tenant.repository.js | 110 | const result = this.db.prepare(sql).get(id, tenantId); | - |
| src/repositories/base-tenant.repository.js | 228 | const result = this.db.prepare(sql).get(...values); | - |
| src/repositories/base-tenant.repository.js | 349 | return this.delete(id); | - |
| src/repositories/base-tenant.repository.js | 417 | const result = this.db.prepare(sql).get(tenantId); | - |
| src/repositories/base-tenant.repository.js | 454 | const result = this.db.prepare(sql).get(...values); | - |
| src/repositories/base-tenant.repository.js | 480 | const result = this.db.prepare(sql).get(id, tenantId); | - |
| src/repositories/base.repository.js | 43 | const result = this.db.prepare(sql).get(id); | - |
| src/repositories/base.repository.js | 137 | const result = this.db.prepare(sql).get(...values); | - |
| src/repositories/base.repository.js | 299 | const result = this.db.prepare(sql).get(); | - |
| src/repositories/base.repository.js | 325 | const result = this.db.prepare(sql).get(...values); | - |
| src/repositories/base.repository.js | 343 | const result = this.db.prepare(sql).get(id); | - |
| src/repositories/conversation.repository.js | 198 | const stats = this.db.prepare(sql).get(phoneNumber); | - |
| src/repositories/lead.repository.js | 206 | return db.prepare('SELECT * FROM leads WHERE id = ?').get(id); | - |
| src/repositories/lead.repository.js | 220 | `).get(normalized, normalized); | - |
| src/repositories/lead.repository.js | 388 | total = db.prepare(`SELECT COUNT(*) as count FROM leads WHERE pipeline_id = ?`).get(pipelineId)?.count \|\| 0; | - |
| src/repositories/lead.repository.js | 390 | total = db.prepare(`SELECT COUNT(*) as count FROM leads`).get()?.count \|\| 0; | - |
| src/repositories/lead.repository.js | 421 | responded = db.prepare(`SELECT COUNT(*) as count FROM leads WHERE pipeline_id = ? AND first_response_at IS NOT NULL`).get(pipelineId)?.count \|\| 0; | - |
| src/repositories/lead.repository.js | 423 | responded = db.prepare(`SELECT COUNT(*) as count FROM leads WHERE first_response_at IS NOT NULL`).get()?.count \|\| 0; | - |
| src/repositories/lead.repository.js | 431 | avgBantScore = db.prepare(`SELECT AVG(bant_score) as avg FROM leads WHERE pipeline_id = ? AND bant_score > 0`).get(pipelineId)?.avg \|\| 0; | - |
| src/repositories/lead.repository.js | 433 | avgBantScore = db.prepare(`SELECT AVG(bant_score) as avg FROM leads WHERE bant_score > 0`).get()?.avg \|\| 0; | - |
| src/repositories/lead.repository.js | 437 | const won = db.prepare(`SELECT COUNT(*) as count FROM leads WHERE stage_id = 'stage_ganhou'`).get()?.count \|\| 0; | - |
| src/repositories/lead.repository.js | 438 | const lost = db.prepare(`SELECT COUNT(*) as count FROM leads WHERE stage_id = 'stage_perdeu'`).get()?.count \|\| 0; | - |
| src/repositories/memory.repository.js | 44 | const value = this.get(key); | - |
| src/repositories/memory.repository.js | 275 | const sizeStats = this.db.prepare(sql).get(); | - |
| src/scalable/admin/AdminApiRoutes.js | 50 | router.get('/dashboard', async (req, res) => { | - |
| src/scalable/admin/AdminApiRoutes.js | 99 | router.get('/tenants', async (req, res) => { | - |
| src/scalable/admin/AdminApiRoutes.js | 131 | router.get('/tenants/:id', async (req, res) => { | - |
| src/scalable/admin/AdminApiRoutes.js | 160 | router.post('/tenants', async (req, res) => { | - |
| src/scalable/admin/AdminApiRoutes.js | 198 | router.post('/tenants/:id/suspend', async (req, res) => { | - |
| src/scalable/admin/AdminApiRoutes.js | 220 | router.post('/tenants/:id/activate', async (req, res) => { | - |
| src/scalable/admin/AdminApiRoutes.js | 242 | router.post('/tenants/:id/upgrade', async (req, res) => { | - |
| src/scalable/admin/AdminApiRoutes.js | 270 | router.get('/metrics/overview', async (req, res) => { | - |
| src/scalable/admin/AdminApiRoutes.js | 291 | router.get('/metrics/messages', async (req, res) => { | - |
| src/scalable/admin/AdminApiRoutes.js | 332 | router.post('/operations/reset-daily-usage', async (req, res) => { | - |
| src/scalable/admin/AdminApiRoutes.js | 351 | router.post('/operations/broadcast', async (req, res) => { | - |
| src/scalable/admin/AdminApiRoutes.js | 379 | router.get('/health', async (req, res) => { | - |
| src/scalable/agents/AgentApiRoutes.js | 31 | router.get('/', async (req, res) => { | - |
| src/scalable/agents/AgentApiRoutes.js | 59 | router.get('/stats', async (req, res) => { | - |
| src/scalable/agents/AgentApiRoutes.js | 72 | router.get('/types', (req, res) => { | - |
| src/scalable/agents/AgentApiRoutes.js | 94 | router.get('/statuses', (req, res) => { | - |
| src/scalable/agents/AgentApiRoutes.js | 116 | router.get('/templates', (req, res) => { | - |
| src/scalable/agents/AgentApiRoutes.js | 133 | router.get('/templates/fields', (req, res) => { | - |
| src/scalable/agents/AgentApiRoutes.js | 148 | router.get('/templates/:templateId', (req, res) => { | - |
| src/scalable/agents/AgentApiRoutes.js | 173 | router.post('/templates/:templateId/preview', (req, res) => { | - |
| src/scalable/agents/AgentApiRoutes.js | 210 | router.post('/templates/:templateId/create', async (req, res) => { | - |
| src/scalable/agents/AgentApiRoutes.js | 255 | router.post('/templates/:templateId/validate', (req, res) => { | - |
| src/scalable/agents/AgentApiRoutes.js | 327 | router.get('/:id', async (req, res) => { | - |
| src/scalable/agents/AgentApiRoutes.js | 348 | router.post('/', async (req, res) => { | - |
| src/scalable/agents/AgentApiRoutes.js | 366 | router.post('/from-template', async (req, res) => { | - |
| src/scalable/agents/AgentApiRoutes.js | 397 | router.put('/:id', async (req, res) => { | - |
| src/scalable/agents/AgentApiRoutes.js | 433 | router.delete('/:id', async (req, res) => { | - |
| src/scalable/agents/AgentApiRoutes.js | 435 | const deleted = await agentService.delete(req.params.id); | - |
| src/scalable/agents/AgentApiRoutes.js | 459 | router.post('/:id/activate', async (req, res) => { | - |
| src/scalable/agents/AgentApiRoutes.js | 475 | router.post('/:id/pause', async (req, res) => { | - |
| src/scalable/agents/AgentApiRoutes.js | 491 | router.post('/:id/disable', async (req, res) => { | - |
| src/scalable/agents/AgentApiRoutes.js | 507 | router.post('/:id/test', async (req, res) => { | - |
| src/scalable/agents/AgentApiRoutes.js | 523 | router.post('/:id/duplicate', async (req, res) => { | - |
| src/scalable/agents/AgentApiRoutes.js | 541 | router.put('/:id/system-prompt', async (req, res) => { | - |
| src/scalable/agents/AgentApiRoutes.js | 565 | router.put('/:id/prompts', async (req, res) => { | - |
| src/scalable/agents/AgentApiRoutes.js | 581 | router.put('/:id/message-templates', async (req, res) => { | - |
| src/scalable/agents/AgentApiRoutes.js | 597 | router.put('/:id/behavior', async (req, res) => { | - |
| src/scalable/agents/AgentApiRoutes.js | 613 | router.put('/:id/ai-config', async (req, res) => { | - |
| src/scalable/agents/AgentApiRoutes.js | 629 | router.put('/:id/integrations', async (req, res) => { | - |
| src/scalable/agents/AgentApiRoutes.js | 647 | router.get('/:id/metrics', async (req, res) => { | - |
| src/scalable/agents/AgentApiRoutes.js | 670 | router.post('/:id/metrics', async (req, res) => { | - |
| src/scalable/agents/AgentApiRoutes.js | 686 | router.post('/:id/metrics/increment', async (req, res) => { | - |
| src/scalable/agents/AgentApiRoutes.js | 715 | router.get('/tenant/:tenantId', async (req, res) => { | - |
| src/scalable/agents/AgentApiRoutes.js | 739 | router.get('/tenant/:tenantId/stats', async (req, res) => { | - |
| src/scalable/agents/AgentConfigRoutes.js | 34 | router.get('/agents/:agentId/config', async (req, res) => { | - |
| src/scalable/agents/AgentConfigRoutes.js | 68 | router.post('/agents/:agentId/config', async (req, res) => { | - |
| src/scalable/agents/AgentConfigRoutes.js | 151 | router.get('/agents/:agentId/config/versions', async (req, res) => { | - |
| src/scalable/agents/AgentConfigRoutes.js | 177 | router.post('/agents/:agentId/config/restore', async (req, res) => { | - |
| src/scalable/agents/AgentConfigRoutes.js | 217 | router.get('/config/sectors', (req, res) => { | - |
| src/scalable/agents/AgentConfigRoutes.js | 247 | router.get('/config/cta-types', (req, res) => { | - |
| src/scalable/agents/AgentConfigRoutes.js | 273 | router.post('/config/generate', async (req, res) => { | - |
| src/scalable/agents/AgentConfigRoutes.js | 326 | router.get('/config/schema', (req, res) => { | - |
| src/scalable/agents/AgentConfigRoutes.js | 424 | router.get('/config/sector-defaults/:sector', (req, res) => { | - |
| src/scalable/agents/AgentConfigService.js | 120 | return configCache.get(agentId); | - |
| src/scalable/agents/AgentConfigService.js | 130 | const row = stmt.get(agentId); | - |
| src/scalable/agents/AgentConfigService.js | 156 | const row = stmt.get(tenantId, agentType); | - |
| src/scalable/agents/AgentConfigService.js | 183 | const row = stmt.get(agentId); | - |
| src/scalable/agents/AgentConfigService.js | 220 | const row = stmt.get(agentId, version); | - |
| src/scalable/agents/AgentConfigService.js | 239 | configCache.delete(agentId); | - |
| src/scalable/agents/AgentConfigService.js | 497 | const row = stmt.get(agentId); | - |
| src/scalable/agents/AgentConfigService.js | 523 | configCache.delete(agentId); | - |
| src/scalable/agents/AgentService.js | 95 | const cached = await this.cache.get(`${this.cachePrefix}${id}`); | - |
| src/scalable/agents/AgentService.js | 604 | await this.cache.delete(`${this.cachePrefix}${agentId}`); | - |
| src/scalable/agents/AgentService.js | 606 | await this.cache.delete(`${this.cachePrefix}tenant:${tenantId}`); | - |
| src/scalable/agents/ConfigurableConsultativeEngine.js | 21 | import OpenAI from 'openai'; | - |
| src/scalable/agents/ConfigurableConsultativeEngine.js | 75 | // OpenAI client | - |
| src/scalable/agents/ConfigurableConsultativeEngine.js | 76 | this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY }); | - |
| src/scalable/agents/ConfigurableConsultativeEngine.js | 302 | const completion = await this.openai.chat.completions.create({ | - |
| src/scalable/agents/ConfigurableConsultativeEngine.js | 425 | const completion = await this.openai.chat.completions.create({ | - |
| src/scalable/agents/ConfigurableConsultativeEngine.js | 852 | const completion = await this.openai.chat.completions.create({ | - |
| src/scalable/agents/EvolutionInstanceManager.js | 100 | async request(method, endpoint, body = null) { | - |
| src/scalable/agents/EvolutionInstanceManager.js | 112 | const response = await fetch(url, options); | - |
| src/scalable/agents/EvolutionInstanceManager.js | 133 | return await this.request('GET', '/instance/fetchInstances'); | - |
| src/scalable/agents/EvolutionInstanceManager.js | 153 | const result = await this.request('POST', '/instance/create', payload); | - |
| src/scalable/agents/EvolutionInstanceManager.js | 177 | return await this.request('GET', `/instance/connectionState/${instanceName}`); | - |
| src/scalable/agents/EvolutionInstanceManager.js | 184 | return await this.request('GET', `/instance/connect/${instanceName}`); | - |
| src/scalable/agents/EvolutionInstanceManager.js | 191 | return await this.request('DELETE', `/instance/logout/${instanceName}`); | - |
| src/scalable/agents/EvolutionInstanceManager.js | 198 | const result = await this.request('DELETE', `/instance/delete/${instanceName}`); | - |
| src/scalable/agents/EvolutionInstanceManager.js | 263 | return stmt.get(agentId); | - |
| src/scalable/agents/EvolutionInstanceManager.js | 276 | return stmt.get(defaultName, agentType); | - |
| src/scalable/agents/EvolutionInstanceManager.js | 369 | return await this.request('POST', `/message/sendText/${instanceName}`, { | - |
| src/scalable/agents/SupportEngine.js | 18 | import OpenAI from 'openai'; | - |
| src/scalable/agents/SupportEngine.js | 78 | // OpenAI client | - |
| src/scalable/agents/SupportEngine.js | 79 | this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY }); | - |
| src/scalable/agents/SupportEngine.js | 205 | const completion = await this.openai.chat.completions.create({ | - |
| src/scalable/agents/SupportEngine.js | 362 | const completion = await this.openai.chat.completions.create({ | - |
| src/scalable/agents/SupportEngine.js | 459 | const completion = await this.openai.chat.completions.create({ | - |
| src/scalable/cache/MemoryCacheProvider.js | 37 | const entry = this.cache.get(key); | - |
| src/scalable/cache/MemoryCacheProvider.js | 69 | clearTimeout(this.timers.get(key)); | - |
| src/scalable/cache/MemoryCacheProvider.js | 99 | const entry = this.cache.get(key); | - |
| src/scalable/cache/MemoryCacheProvider.js | 131 | const current = await this.get(key); | - |
| src/scalable/cache/MemoryCacheProvider.js | 135 | const entry = this.cache.get(key); | - |
| src/scalable/cache/MemoryCacheProvider.js | 148 | const entry = this.cache.get(key); | - |
| src/scalable/cache/MemoryCacheProvider.js | 155 | clearTimeout(this.timers.get(key)); | - |
| src/scalable/cache/MemoryCacheProvider.js | 171 | const value = await this.get(key); | - |
| src/scalable/cache/MemoryCacheProvider.js | 213 | const value = await this.get(testKey); | - |
| src/scalable/cache/MemoryCacheProvider.js | 214 | await this.delete(testKey); | - |
| src/scalable/cache/MemoryCacheProvider.js | 253 | clearTimeout(this.timers.get(key)); | - |
| src/scalable/cache/MemoryCacheProvider.js | 254 | this.timers.delete(key); | - |
| src/scalable/cache/MemoryCacheProvider.js | 257 | const deleted = this.cache.delete(key); | - |
| src/scalable/cache/RedisCacheProvider.js | 120 | const value = await this.client.get(key); | - |
| src/scalable/config/FeatureFlags.js | 141 | const flag = this.flags.get(name); | - |
| src/scalable/config/FeatureFlags.js | 163 | const flag = this.flags.get(name); | - |
| src/scalable/config/FeatureFlags.js | 179 | const flag = this.flags.get(name); | - |
| src/scalable/config/FeatureFlags.js | 202 | const flag = this.flags.get(name); | - |
| src/scalable/config/FeatureFlags.js | 225 | const flag = this.flags.get(name); | - |
| src/scalable/config/FeatureFlags.js | 246 | const flag = this.flags.get(name); | - |
| src/scalable/config/FeatureFlags.js | 256 | await this.cache.delete(`${this.cachePrefix}${name}`); | - |
| src/scalable/database/SQLiteDatabaseProvider.js | 128 | const result = stmt.get(...params); | - |
| src/scalable/index.js | 332 | router.get('/health', async (req, res) => { | - |
| src/scalable/index.js | 338 | router.get('/stats', async (req, res) => { | - |
| src/scalable/queue/BullMQProvider.js | 220 | this._eventHandlers.get(event).push(handler); | - |
| src/scalable/queue/BullMQProvider.js | 228 | const handlers = this._eventHandlers.get(event) \|\| []; | - |
| src/scalable/queue/MemoryQueueProvider.js | 152 | return this._jobs.get(id); | - |
| src/scalable/queue/MemoryQueueProvider.js | 248 | this._active.delete(job.id); | - |
| src/scalable/queue/MemoryQueueProvider.js | 254 | this._jobs.delete(removed.id); | - |
| src/scalable/queue/MemoryQueueProvider.js | 264 | this._active.delete(job.id); | - |
| src/scalable/queue/MemoryQueueProvider.js | 283 | this._active.delete(job.id); | - |
| src/scalable/queue/MemoryQueueProvider.js | 289 | this._jobs.delete(removed.id); | - |
| src/scalable/queue/MemoryQueueProvider.js | 366 | return this._jobs.get(String(id)) \|\| null; | - |
| src/scalable/queue/MemoryQueueProvider.js | 457 | this._jobs.delete(job.id); | - |
| src/scalable/queue/MemoryQueueProvider.js | 494 | const job = this._jobs.get(id); | - |
| src/scalable/queue/MemoryQueueProvider.js | 497 | this._jobs.delete(id); | - |
| src/scalable/queue/MemoryQueueProvider.js | 499 | this._active.delete(id); | - |
| src/scalable/tenant/TenantService.js | 80 | const cached = await this.cache.get(`${this.cachePrefix}${id}`); | - |
| src/scalable/tenant/TenantService.js | 111 | const cached = await this.cache.get(`${this.cachePrefix}slug:${slug}`); | - |
| src/scalable/tenant/TenantService.js | 381 | const sensitiveKeys = ['openaiApiKey', 'evolutionApiKey']; | - |
| src/scalable/tenant/TenantService.js | 400 | const sensitiveKeys = ['openaiApiKey', 'evolutionApiKey']; | - |
| src/scalable/tenant/TenantService.js | 422 | await this.cache.delete(`${this.cachePrefix}${tenantId}`); | - |
| src/security/OptOutInterceptor.js | 167 | const inRegistry = checkRegistry.get(phone); | - |
| src/security/OptOutInterceptor.js | 178 | const leadOptOut = checkLead.get(`%${phone}%`, `%${phone}%`); | - |
| src/security/SimpleBotDetector.js | 193 | this.responseTimes.delete(contactId); | - |
| src/security/SimpleBotDetector.js | 205 | this.verificationPending.delete(contactId); | - |
| src/security/SimpleBotDetector.js | 211 | this.verificationPending.delete(contactId); | - |
| src/security/SimpleBotDetector.js | 324 | const times = this.responseTimes.get(phone); | - |
| src/security/SimpleBotDetector.js | 391 | const times = this.responseTimes.get(phone) \|\| { | - |
| src/security/SimpleBotDetector.js | 408 | const verificationTime = this.verificationPending.get(phone); | - |
| src/security/SimpleBotDetector.js | 430 | this.verificationPending.delete(phone); | - |
| src/security/SimpleBotDetector.js | 433 | this.responseTimes.delete(phone); | - |
| src/security/SimpleBotDetector.js | 563 | this.verificationPending.delete(phone); | - |
| src/security/SimpleBotDetector.js | 564 | this.responseTimes.delete(phone); | - |
| src/security/SimpleBotDetector.js | 595 | `).get(phone); | - |
| src/security/SimpleBotDetector.js | 612 | this.verificationPending.delete(phone); | - |
| src/security/SimpleBotDetector.js | 613 | this.responseTimes.delete(phone); | - |
| src/security/SimpleBotDetector.js | 653 | `).get(); | - |
| src/security/SimpleBotDetector.js | 667 | this.responseTimes.delete(phone); | - |
| src/security/SimpleBotDetector.js | 668 | this.verificationPending.delete(phone); | - |
| src/server.js | 151 | const openaiClient = await container.resolve('openaiClient'); | - |
| src/server.js | 166 | ).get(tableName); | - |
| src/server.js | 191 | ).get(); | - |
| src/server.js | 203 | ).get()?.count \|\| 0; | - |
| src/server.js | 236 | // This allows middlewares and routes to access container via req.app.get('container') | - |
| src/services/AsyncJobsService.js | 157 | `).get(...params); | - |
| src/services/AsyncJobsService.js | 211 | const job = db.prepare('SELECT retry_count FROM async_jobs WHERE id = ?').get(jobId); | - |
| src/services/AsyncJobsService.js | 333 | const job = db.prepare('SELECT * FROM async_jobs WHERE id = ?').get(jobId); | - |
| src/services/AsyncJobsService.js | 384 | `).get(contactId); | - |
| src/services/AsyncJobsService.js | 423 | `).get(); | - |
| src/services/AsyncJobsService.js | 429 | `).get(); | - |
| src/services/AuthService.js | 322 | `).get(decoded.userId, refreshToken); | - |
| src/services/AuthService.js | 454 | return !!stmt.get(token); | - |
| src/services/CadenceIntegrationService.js | 157 | `).get(phone, `%${phone.slice(-8)}%`); | - |
| src/services/CadenceIntegrationService.js | 333 | `).get(phone); | - |
| src/services/CadenceIntegrationService.js | 342 | `).get(`%${lastDigits}`); | - |
| src/services/CadenceIntegrationService.js | 391 | `).get(normalizedPhone, `%${normalizedPhone.slice(-8)}%`); | - |
| src/services/ConversationContextService.js | 15 | import OpenAI from 'openai'; | - |
| src/services/ConversationContextService.js | 18 | const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY }); | - |
| src/services/ConversationContextService.js | 183 | `).get(phone, cadenceDay); | - |
| src/services/ConversationContextService.js | 191 | `).get(phone); | - |
| src/services/ConversationContextService.js | 239 | const response = await openai.chat.completions.create({ | - |
| src/services/ConversationContextService.js | 358 | const response = await openai.chat.completions.create({ | - |
| src/services/DeliveryTrackingService.js | 109 | const pending = this.pendingDeliveries.get(messageId); | - |
| src/services/DeliveryTrackingService.js | 149 | this.pendingDeliveries.delete(messageId); | - |
| src/services/DeliveryTrackingService.js | 210 | `).get(since); | - |
| src/services/DeliveryTrackingService.js | 249 | `).get(actionId); | - |
| src/services/DeliveryTrackingService.js | 281 | this.pendingDeliveries.delete(messageId); | - |
| src/services/EntitlementService.js | 50 | `).get(tenantId); | - |
| src/services/EntitlementService.js | 217 | `).get(tenantId); | - |
| src/services/EntitlementService.js | 258 | `).get(tenantId); | - |
| src/services/EntitlementService.js | 427 | `).get(ipAddress, windowDays); | - |
| src/services/EntitlementService.js | 458 | `).get(userId, email, normalizedEmail); | - |
| src/services/HealthCheckService.js | 8 | * - OpenAI API | - |
| src/services/HealthCheckService.js | 43 | this.openaiAdapter = dependencies.openaiAdapter; | - |
| src/services/HealthCheckService.js | 65 | // Check OpenAI | - |
| src/services/HealthCheckService.js | 66 | const openaiCheck = await this.checkOpenAI(); | - |
| src/services/HealthCheckService.js | 67 | checks.push(openaiCheck); | - |
| src/services/HealthCheckService.js | 68 | if (openaiCheck.status === HealthStatus.UNHEALTHY) { | - |
| src/services/HealthCheckService.js | 133 | const result = this.db.prepare('SELECT 1 as test').get(); | - |
| src/services/HealthCheckService.js | 142 | messageCount = this.db.prepare('SELECT COUNT(*) as count FROM whatsapp_messages').get(); | - |
| src/services/HealthCheckService.js | 149 | stateCount = this.db.prepare('SELECT COUNT(*) as count FROM enhanced_conversation_states').get(); | - |
| src/services/HealthCheckService.js | 180 | * Check OpenAI API connectivity | - |
| src/services/HealthCheckService.js | 182 | * @returns {Promise<Object>} OpenAI check result | - |
| src/services/HealthCheckService.js | 184 | async checkOpenAI() { | - |
| src/services/HealthCheckService.js | 186 | name: 'openai', | - |
| src/services/HealthCheckService.js | 195 | await this.openaiAdapter.client.models.list(); | - |
| src/services/HealthCheckService.js | 202 | model: this.openaiAdapter.config.openai.chatModel | - |
| src/services/HealthCheckService.js | 389 | this.db.prepare('SELECT 1').get(); | - |
| src/services/HealthCheckService.js | 404 | const openaiAdapter = await container.resolve('openaiAdapter'); | - |
| src/services/HealthCheckService.js | 412 | openaiAdapter, | - |
| src/services/InboundEventsService.js | 83 | `).get(provider, providerEventId); | - |
| src/services/InboundEventsService.js | 164 | const event = db.prepare('SELECT retry_count FROM inbound_events WHERE id = ?').get(eventId); | - |
| src/services/InboundEventsService.js | 276 | const event = db.prepare('SELECT * FROM inbound_events WHERE id = ?').get(eventId); | - |
| src/services/IntegrationOAuthService.js | 86 | `).get(state); | - |
| src/services/IntegrationOAuthService.js | 177 | const integration = db.prepare('SELECT config_json FROM integrations WHERE id = ?').get(integrationId); | - |
| src/services/IntegrationOAuthService.js | 205 | const integration = db.prepare('SELECT config_json FROM integrations WHERE id = ?').get(integrationId); | - |
| src/services/IntegrationOAuthService.js | 280 | const integration = db.prepare('SELECT config_json, tenant_id FROM integrations WHERE id = ?').get(integrationId); | - |
| src/services/IntegrationOAuthService.js | 306 | const integration = db.prepare('SELECT config_json FROM integrations WHERE id = ?').get(integrationId); | - |
| src/services/IntegrationService.js | 61 | `).get(tenantId, integrationId); | - |
| src/services/IntegrationService.js | 75 | `).get(tenantId, instanceName); | - |
| src/services/IntegrationService.js | 91 | `).get(webhookPublicId); | - |
| src/services/IntegrationService.js | 279 | `).get(tenantId, agentId); | - |
| src/services/IntegrationService.js | 312 | `).get(tenantId, agentId); | - |
| src/services/IntegrationService.js | 364 | db.prepare('SELECT config_json FROM integrations WHERE id = ?').get(integration.id)?.config_json \|\| '{}' | - |
| src/services/PromptCacheService.js | 80 | const cached = this.cache.get(cacheKey); | - |
| src/services/PromptCacheService.js | 117 | const row = db.prepare(query).get(...params); | - |
| src/services/PromptCacheService.js | 215 | keysToDelete.forEach(key => this.cache.delete(key)); | - |
| src/services/PromptCacheService.js | 228 | this.cache.delete(cacheKey); | - |
| src/services/PromptCacheService.js | 231 | this.cache.delete(this.getCacheKey(agentId, null)); | - |
| src/services/PromptCacheService.js | 294 | `).get(agentId); | - |
| src/services/PromptCacheService.js | 353 | this.cache.delete(key); | - |
| src/services/ProspectImportService.js | 157 | const existingLead = checkExistingLead.get(phoneNormalized, phoneNormalized); | - |
| src/services/ProspectImportService.js | 164 | const existingProspect = checkExistingProspect.get(phoneNormalized); | - |
| src/services/ProspectImportService.js | 256 | const prospect = db.prepare('SELECT * FROM prospect_leads WHERE id = ?').get(prospectId); | - |
| src/services/ProspectImportService.js | 409 | `).get(); | - |
| src/services/ProspectImportService.js | 413 | `).get(); | - |
| src/services/RateLimitService.js | 16 | openai_tokens_per_day: 100000, | - |
| src/services/RateLimitService.js | 71 | return this.limitsCache.get(key) \|\| DEFAULT_LIMITS[limitType] \|\| 100; | - |
| src/services/RateLimitService.js | 125 | const row = stmt.get(tenantId, limitType); | - |
| src/services/ServiceLocator.js | 142 | // OpenAI Client | - |
| src/services/ServiceLocator.js | 143 | this.registerFactory('openai', async () => { | - |
| src/services/ServiceLocator.js | 144 | const { openai } = await import('../core/openai_client.js'); | - |
| src/services/ServiceLocator.js | 145 | return openai; | - |
| src/services/ServiceLocator.js | 203 | return this._services.get(name); | - |
| src/services/ServiceLocator.js | 213 | const factory = this._factories.get(name); | - |
| src/services/ServiceLocator.js | 236 | return this._services.get(name); | - |
| src/services/ServiceLocator.js | 274 | await this.get(name); | - |
| src/services/ServiceLocator.js | 347 | return getServiceLocator().get(name); | - |
| src/services/meetings/MeetingAnalysisService.js | 14 | import openaiClient from '../../core/openai_client.js'; | - |
| src/services/meetings/MeetingAnalysisService.js | 180 | const response = await openaiClient.chat.completions.create({ | - |
| src/services/meetings/MeetingAnalysisService.js | 259 | const response = await openaiClient.chat.completions.create({ | - |
| src/services/meetings/MeetingAnalysisService.js | 335 | const response = await openaiClient.chat.completions.create({ | - |
| src/services/meetings/MeetingAnalysisService.js | 401 | const response = await openaiClient.chat.completions.create({ | - |
| src/services/meetings/MeetingAnalysisService.js | 446 | if (existingScore) MeetingScore.delete(existingScore.id); | - |
| src/services/meetings/MeetingAnalysisService.js | 447 | MeetingAnalysis.delete(existingAnalysis.id); | - |
| src/tools/archetypes.js | 2 | import OpenAI from 'openai'; | - |
| src/tools/archetypes.js | 7 | const openai = new OpenAI({ | - |
| src/tools/archetypes.js | 8 | apiKey: process.env.OPENAI_API_KEY | - |
| src/tools/archetypes.js | 356 | const response = await openai.chat.completions.create({ | - |
| src/tools/archetypes.js | 582 | const response = await openai.chat.completions.create({ | - |
| src/tools/archetypes.js | 648 | const response = await openai.chat.completions.create({ | - |
| src/tools/archetypes.js | 724 | const response = await openai.chat.completions.create({ | - |
| src/tools/bant_stages_v2.js | 4 | import OpenAI from 'openai'; | - |
| src/tools/bant_stages_v2.js | 10 | const openaiClient = new OpenAI({ | - |
| src/tools/bant_stages_v2.js | 11 | apiKey: process.env.OPENAI_API_KEY | - |
| src/tools/bant_stages_v2.js | 1159 | reject(new Error(`OpenAI API timeout after ${timeoutMs/1000}s`)); | - |
| src/tools/bant_stages_v2.js | 1163 | const completionPromise = openaiClient.chat.completions.create({ | - |
| src/tools/calendar_enhanced.js | 61 | const response = await fetch(url, { | - |
| src/tools/calendar_enhanced.js | 79 | const retryResponse = await fetch(url, { | - |
| src/tools/calendar_enhanced.js | 264 | const getResponse = await fetch(getUrl, { | - |
| src/tools/calendar_enhanced.js | 360 | const updateResponse = await fetch(updateUrl, { | - |
| src/tools/calendar_enhanced.js | 378 | const retryResponse = await fetch(updateUrl, { | - |
| src/tools/calendar_enhanced.js | 778 | const response = await fetch(tokenUrl, { | - |
| src/tools/calendar_enhanced.js | 882 | const response = await fetch(url.toString(), { | - |
| src/tools/calendar_enhanced.js | 899 | const retryResponse = await fetch(url.toString(), { | - |
| src/tools/calendar_enhanced.js | 1001 | const response = await fetch(tokenUrl, { | - |
| src/tools/context_manager.js | 143 | topics.set(topic, (topics.get(topic) \|\| 0) + 1); | - |
| src/tools/conversation_manager.js | 2 | import OpenAI from 'openai'; | - |
| src/tools/conversation_manager.js | 41 | const openai = new OpenAI({ | - |
| src/tools/conversation_manager.js | 42 | apiKey: process.env.OPENAI_API_KEY | - |
| src/tools/conversation_manager.js | 96 | const response = await openai.chat.completions.create({ | - |
| src/tools/conversation_manager.js | 273 | const response = await openai.chat.completions.create({ | - |
| src/tools/document_analyzer.js | 10 | import OpenAI from 'openai'; | - |
| src/tools/document_analyzer.js | 48 | // Inicializar OpenAI | - |
| src/tools/document_analyzer.js | 49 | const openai = new OpenAI({ | - |
| src/tools/document_analyzer.js | 50 | apiKey: process.env.OPENAI_API_KEY | - |
| src/tools/document_analyzer.js | 190 | // Usar OpenAI Vision para OCR | - |
| src/tools/document_analyzer.js | 194 | const response = await openai.chat.completions.create({ | - |
| src/tools/document_analyzer.js | 272 | // Analisar com OpenAI Vision | - |
| src/tools/document_analyzer.js | 276 | const response = await openai.chat.completions.create({ | - |
| src/tools/document_analyzer.js | 330 | const transcription = await openai.audio.transcriptions.create({ | - |
| src/tools/document_analyzer.js | 385 | const transcription = await openai.audio.transcriptions.create({ | - |
| src/tools/document_analyzer.js | 450 | * Gerar resumo usando OpenAI | - |
| src/tools/document_analyzer.js | 461 | const response = await openai.chat.completions.create({ | - |
| src/tools/document_analyzer.js | 462 | model: process.env.OPENAI_CHAT_MODEL \|\| "gpt-4o-mini", | - |
| src/tools/document_analyzer.js | 489 | const response = await openai.chat.completions.create({ | - |
| src/tools/document_analyzer.js | 490 | model: process.env.OPENAI_CHAT_MODEL \|\| "gpt-4o-mini", | - |
| src/tools/document_analyzer.js | 520 | const response = await openai.chat.completions.create({ | - |
| src/tools/document_analyzer.js | 521 | model: process.env.OPENAI_CHAT_MODEL \|\| "gpt-4o-mini", | - |
| src/tools/exit_detector.js | 7 | import OpenAI from 'openai'; | - |
| src/tools/exit_detector.js | 12 | const openai = new OpenAI({ | - |
| src/tools/exit_detector.js | 13 | apiKey: process.env.OPENAI_API_KEY | - |
| src/tools/exit_detector.js | 177 | const response = await openai.chat.completions.create({ | - |
| src/tools/google_sheets.js | 32 | await pendingOperations.get(normalizedPhone); | - |
| src/tools/google_sheets.js | 45 | pendingOperations.delete(normalizedPhone); | - |
| src/tools/google_sheets.js | 168 | sheets.spreadsheets.values.get({ | - |
| src/tools/google_sheets.js | 488 | const response = await sheets.spreadsheets.get({ | - |
| src/tools/google_sheets.js | 915 | const sheetInfo = await sheets.spreadsheets.get({ | - |
| src/tools/google_sheets.js | 967 | const formatRequest = await sheets.spreadsheets.get({ spreadsheetId: sheetId }); | - |
| src/tools/intelligent_opt_out.js | 333 | const result = stmt.get(`%${cleanNumber}%`); | - |
| src/tools/lead_scoring_system.js | 640 | `).get(contactId); | - |
| src/tools/whatsapp.js | 6 | import OpenAI from 'openai'; | - |
| src/tools/whatsapp.js | 12 | const openai = new OpenAI({ | - |
| src/tools/whatsapp.js | 13 | apiKey: process.env.OPENAI_API_KEY | - |
| src/tools/whatsapp.js | 27 | if (!process.env.OPENAI_API_KEY \|\| process.env.OPENAI_API_KEY === 'your-openai-key-here') { | - |
| src/tools/whatsapp.js | 28 | console.error(' [WHATSAPP-SECURITY] OPENAI_API_KEY não configurada ou usando valor padrão!'); | - |
| src/tools/whatsapp.js | 29 | console.error(' [WHATSAPP-SECURITY] Configure OPENAI_API_KEY no arquivo .env antes de prosseguir'); | - |
| src/tools/whatsapp.js | 30 | throw new Error('OPENAI_API_KEY must be configured in .env file'); | - |
| src/tools/whatsapp.js | 235 | const response = await fetch(`${EVOLUTION_BASE_URL}/message/sendText/${EVOLUTION_INSTANCE}`, { | - |
| src/tools/whatsapp.js | 390 | const mediaResponse = await fetch(`${EVOLUTION_BASE_URL}/message/download/${EVOLUTION_INSTANCE}`, { | - |
| src/tools/whatsapp.js | 410 | const fileResponse = await fetch(mediaData.media_url, { | - |
| src/tools/whatsapp.js | 439 | const response2 = await fetch(`${EVOLUTION_BASE_URL}/media/${EVOLUTION_INSTANCE}`, { | - |
| src/tools/whatsapp.js | 471 | const response3 = await fetch(`${EVOLUTION_BASE_URL}/${EVOLUTION_INSTANCE}/message`, { | - |
| src/tools/whatsapp.js | 557 | const contactsResponse = await fetch(`${EVOLUTION_BASE_URL}/chat/findContacts/${EVOLUTION_INSTANCE}`, { | - |
| src/tools/whatsapp.js | 575 | const profileResponse = await fetch(`${EVOLUTION_BASE_URL}/chat/fetchProfile/${EVOLUTION_INSTANCE}`, { | - |
| src/tools/whatsapp.js | 690 | const response = await fetch(`${EVOLUTION_BASE_URL}/instance/connectionState/${EVOLUTION_INSTANCE}`, { | - |
| src/tools/whatsapp.js | 716 | * Processa áudio WhatsApp usando Whisper (OpenAI) | - |
| src/tools/whatsapp.js | 722 | if (!process.env.OPENAI_API_KEY) { | - |
| src/tools/whatsapp.js | 723 | throw new Error('OPENAI_API_KEY não configurada no .env'); | - |
| src/tools/whatsapp.js | 745 | const transcription = await openai.audio.transcriptions.create({ | - |
| src/tools/whatsapp.js | 816 | const response = await fetch(`${EVOLUTION_BASE_URL}/settings/set/${EVOLUTION_INSTANCE}`, { | - |
| src/tools/whatsapp.js | 877 | const response = await fetch(`${EVOLUTION_BASE_URL}/message/sendMedia/${EVOLUTION_INSTANCE}`, { | - |
| src/tools/whatsapp.js | 908 | * Gera áudio usando Text-to-Speech da OpenAI | - |
| src/tools/whatsapp.js | 914 | if (!process.env.OPENAI_API_KEY) { | - |
| src/tools/whatsapp.js | 915 | throw new Error('OPENAI_API_KEY não configurada no .env'); | - |
| src/tools/whatsapp.js | 921 | const response = await openai.audio.speech.create({ | - |
| src/tools/whatsapp.js | 1021 | const response = await openai.chat.completions.create({ | - |
| src/tools/whatsapp.js | 1108 | const response = await openai.chat.completions.create({ | - |
| src/tools/whatsapp.js | 1424 | const response = await fetch(`${EVOLUTION_BASE_URL}/message/sendText/${EVOLUTION_INSTANCE}`, { | - |
| src/tools/whatsapp.js | 1482 | const mediaResponse = await fetch(`${EVOLUTION_BASE_URL}/chat/findMessages/${EVOLUTION_INSTANCE}`, { | - |
| src/tools/whatsapp.js | 1529 | const downloadResponse = await fetch(`${EVOLUTION_BASE_URL}/chat/getBase64FromMediaMessage/${EVOLUTION_INSTANCE}`, { | - |
| src/utils/CircuitBreaker.js | 260 | return this.breakers.get(name); | - |
| src/utils/CircuitBreaker.js | 327 | openai: { | - |
| src/utils/CircuitBreaker.js | 328 | name: 'openai', | - |
| src/utils/CircuitBreaker.js | 355 | * @param {string} serviceName - Service name (openai, evolution, sheets, database) | - |
| src/utils/CircuitBreaker.js | 363 | return circuitBreakerRegistry.get(config.name, config); | - |
| src/utils/ContactLockManager.js | 103 | const existingLock = this.locks.get(contactId); | - |
| src/utils/ContactLockManager.js | 123 | `).get(contactId, now); | - |
| src/utils/ContactLockManager.js | 160 | const lock = this.locks.get(contactId); | - |
| src/utils/ContactLockManager.js | 163 | this.locks.delete(contactId); | - |
| src/utils/ContactLockManager.js | 187 | this.locks.delete(contactId); | - |
| src/utils/ContactLockManager.js | 212 | let queue = this.queues.get(contactId); | - |
| src/utils/ContactLockManager.js | 243 | const queue = this.queues.get(contactId); | - |
| src/utils/ContactLockManager.js | 252 | this.queues.delete(contactId); | - |
| src/utils/ContactLockManager.js | 269 | const lock = this.locks.get(contactId); | - |
| src/utils/ContactLockManager.js | 291 | const queue = this.queues.get(contactId); | - |
| src/utils/EarlyDeduplicator.js | 352 | this.messageIds.delete(id); | - |
| src/utils/EarlyDeduplicator.js | 360 | this.contentHashes.delete(hash); | - |
| src/utils/EarlyDeduplicator.js | 381 | this.messageIds.delete(entries[i][0]); | - |
| src/utils/EarlyDeduplicator.js | 394 | this.contentHashes.delete(entries[i][0]); | - |
| src/utils/blacklist.js | 29 | this.blocked.delete(contactId); | - |
| src/utils/blacklist.js | 49 | return this.blocked.get(contactId); | - |
| src/utils/blacklist.js | 59 | this.blocked.delete(contactId); | - |
| src/utils/contact_lock.js | 44 | const existingLock = activeLocks.get(normalizedId); | - |
| src/utils/contact_lock.js | 50 | activeLocks.delete(normalizedId); | - |
| src/utils/contact_lock.js | 91 | const queue = waitQueues.get(normalizedId); | - |
| src/utils/contact_lock.js | 113 | const existingLock = activeLocks.get(normalizedId); | - |
| src/utils/contact_lock.js | 141 | const existingLock = activeLocks.get(normalizedId); | - |
| src/utils/contact_lock.js | 155 | activeLocks.delete(normalizedId); | - |
| src/utils/contact_lock.js | 160 | const queue = waitQueues.get(normalizedId); | - |
| src/utils/contact_lock.js | 199 | const lock = activeLocks.get(normalizedId); | - |
| src/utils/contact_lock.js | 209 | activeLocks.delete(normalizedId); | - |
| src/utils/contact_lock.js | 248 | activeLocks.delete(id); | - |
| src/utils/contact_lock.js | 256 | waitQueues.delete(id); | - |
| src/utils/first_contact_lock.js | 42 | const sent = sentFirstMessages.get(normalizedPhone); | - |
| src/utils/first_contact_lock.js | 54 | const existingLock = activeLocks.get(normalizedPhone); | - |
| src/utils/first_contact_lock.js | 66 | activeLocks.delete(normalizedPhone); | - |
| src/utils/first_contact_lock.js | 95 | activeLocks.delete(normalizedPhone); | - |
| src/utils/first_contact_lock.js | 109 | const sent = sentFirstMessages.get(normalizedPhone); | - |
| src/utils/first_contact_lock.js | 117 | sentFirstMessages.delete(normalizedPhone); | - |
| src/utils/first_contact_lock.js | 136 | activeLocks.delete(normalizedPhone); | - |
| src/utils/first_contact_lock.js | 151 | activeLocks.delete(phone); | - |
| src/utils/first_contact_lock.js | 159 | sentFirstMessages.delete(phone); | - |
| src/utils/first_message_cache.js | 29 | if (this.sentMessages.get(contactId) === now) { | - |
| src/utils/first_message_cache.js | 30 | this.sentMessages.delete(contactId); | - |
| src/utils/first_message_cache.js | 45 | const sentAt = this.sentMessages.get(contactId); | - |
| src/utils/first_message_cache.js | 59 | this.sentMessages.delete(contactId); | - |
| src/utils/health-check.js | 68 | const result = db.prepare('SELECT 1 as test').get(); | - |
| src/utils/health-check.js | 74 | `).get(); | - |
| src/utils/health-check.js | 81 | `).get(); | - |
| src/utils/health-check.js | 116 | const response = await axios.get( | - |
| src/utils/health-check.js | 143 | * Check: OpenAI API | - |
| src/utils/health-check.js | 145 | async checkOpenAI() { | - |
| src/utils/health-check.js | 147 | const apiKey = process.env.OPENAI_API_KEY; | - |
| src/utils/health-check.js | 162 | model: process.env.OPENAI_CHAT_MODEL \|\| 'gpt-4o-mini', | - |
| src/utils/health-check.js | 287 | openai: () => this.checkOpenAI(), | - |
| src/utils/human_verification_store.js | 51 | ).get(normalized); | - |
| src/utils/human_verification_store.js | 86 | `).get(normalized); | - |
| src/utils/human_verification_store.js | 124 | ).get(normalized); | - |
| src/utils/human_verification_store.js | 161 | `).get(normalized); | - |
| src/utils/human_verification_store.js | 244 | `).get(normalized); | - |
| src/utils/inputSanitizer.js | 266 | const requests = this.rateLimitCache.get(contactId); | - |
| src/utils/inputSanitizer.js | 310 | this.rateLimitCache.delete(contactId); | - |
| src/utils/logger.enhanced.js | 169 | * Log OpenAI API calls | - |
| src/utils/logger.enhanced.js | 171 | openai(action, meta = {}) { | - |
| src/utils/logger.enhanced.js | 172 | this.info(`OpenAI: ${action}`, { service: 'OpenAI', ...meta }); | - |
| src/utils/logger.enhanced.js | 192 | apiRequest(method, path, meta = {}) { | - |
| src/utils/logger.enhanced.js | 276 | logger.apiRequest(req.method, req.path, { | - |
| src/utils/logger.enhanced.js | 278 | userAgent: req.get('user-agent') | - |
| src/utils/messageDeduplication.js | 76 | const existing = stmt.get(messageId); | - |
| src/utils/messageDeduplication.js | 183 | const { count } = countStmt.get(); | - |
| src/utils/messageDeduplication.js | 224 | `).get(); | - |
| src/utils/message_context_analyzer.js | 200 | const lastAnalysis = this.lastAnalysis.get(contactId); | - |
| src/utils/message_context_analyzer.js | 300 | this.lastAnalysis.delete(contactId); | - |
| src/utils/message_context_analyzer.js | 306 | this.lastAnalysis.delete(oldestKey); | - |
| src/utils/message_context_analyzer.js | 323 | this.lastAnalysis.delete(contactId); | - |
| src/utils/metrics.js | 28 | const current = this.metrics.counters.get(key) \|\| 0; | - |
| src/utils/metrics.js | 70 | const data = this.metrics.histograms.get(key) \|\| { | - |
| src/utils/metrics.js | 198 | counter: this.metrics.counters.get(key), | - |
| src/utils/metrics.js | 199 | gauge: this.metrics.gauges.get(key), | - |
| src/utils/metrics.js | 201 | ? this._calculateHistogramStats(this.metrics.histograms.get(key)) | - |
| src/utils/metrics.js | 223 | this.metrics.counters.delete(key); | - |
| src/utils/metrics.js | 224 | this.metrics.gauges.delete(key); | - |
| src/utils/metrics.js | 225 | this.metrics.histograms.delete(key); | - |
| src/utils/metrics.js | 273 | // OpenAI | - |
| src/utils/metrics.js | 274 | openaiRequest: (model) => | - |
| src/utils/metrics.js | 275 | metrics.increment('orbion_openai_requests_total', 1, { model }), | - |
| src/utils/metrics.js | 277 | openaiLatency: (duration, model) => | - |
| src/utils/metrics.js | 278 | metrics.histogram('orbion_openai_latency_ms', duration, { model }), | - |
| src/utils/rate_limiter.js | 44 | let bucket = this.messageBuckets.get(normalized); | - |
| src/utils/rate_limiter.js | 113 | let bucket = this.messageBuckets.get(normalized); | - |
| src/utils/rate_limiter.js | 138 | let bucket = this.messageBuckets.get(normalized) \|\| []; | - |
| src/utils/rate_limiter.js | 163 | this.messageBuckets.delete(normalized); | - |
| src/utils/rate_limiter.js | 205 | this.messageBuckets.delete(contactId); | - |
| src/utils/sheetsManager.js | 369 | await fetch(telegramUrl, { | - |
| src/utils/sheetsManager.js | 550 | const spreadsheet = await sheets.spreadsheets.get({ | - |
| src/utils/sheetsManager.js | 710 | const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID }); | - |
| src/utils/stateManager.js | 115 | const row = stmt.get(cleanNumber); | - |
| src/utils/stateManager.js | 154 | `).get(); | - |
| src/v2/infrastructure/database/BaseRepository.js | 56 | const row = stmt.get(id); | - |
| src/v2/infrastructure/database/BaseRepository.js | 136 | return stmt.get(...values) \|\| null; | - |
| src/v2/infrastructure/database/BaseRepository.js | 252 | const result = stmt.get(...values); | - |
| src/v2/infrastructure/database/BaseRepository.js | 269 | return stmt.get(id) !== undefined; | - |
| src/v2/infrastructure/database/BaseRepository.js | 306 | return stmt.get(...params) \|\| null; | - |
| src/v2/infrastructure/database/DatabaseConnection.js | 246 | const count = this.db.prepare(`SELECT COUNT(*) as count FROM ${name}`).get(); | - |
| src/v2/infrastructure/database/DatabaseConnection.js | 279 | this.db.prepare('SELECT 1').get(); | - |
| src/v2/shared/utils/errors.js | 157 | * @param {string} service - Nome do serviço (WhatsApp, OpenAI, etc) | - |
| src/v2/shared/utils/errors.js | 185 | * Erro do OpenAI | - |
| src/v2/shared/utils/errors.js | 187 | export class OpenAIError extends IntegrationError { | - |
| src/v2/shared/utils/errors.js | 193 | super('OpenAI', message, originalError); | - |
| src/v2/shared/utils/errors.js | 194 | this.code = ERROR_CODES.OPENAI_ERROR; | - |
| src/v2/shared/utils/errors.js | 318 | case ERROR_CODES.OPENAI_ERROR: | - |
| src/v2/shared/utils/errors.js | 319 | return new OpenAIError(message); | - |
| src/v2/shared/utils/errors.js | 343 | OpenAIError, | - |

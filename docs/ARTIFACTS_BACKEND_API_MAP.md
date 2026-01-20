# Backend API Map (Express)

Total routes parsed: 404

| METHOD | PATH | FILE | HANDLER | MIDDLEWARES | VALIDATIONS | TENANT | DI/CONTAINER | DB DIRECT | DUPLICATE |
|---|---|---|---|---|---|---|---|---|---|
| GET | '/api/activities' | src/api/routes/activities.routes.js | inline | optionalAuth | - |  |  | yes |  |
| GET | '/api/activities/timeline' | src/api/routes/activities.routes.js | inline | optionalAuth | - |  |  | yes |  |
| GET | '/api/activities/overdue' | src/api/routes/activities.routes.js | inline | optionalAuth | - |  |  | yes |  |
| GET | '/api/activities/today' | src/api/routes/activities.routes.js | inline | optionalAuth | - |  |  | yes |  |
| GET | '/api/activities/upcoming' | src/api/routes/activities.routes.js | inline | optionalAuth | - |  |  | yes |  |
| GET | '/api/activities/stats' | src/api/routes/activities.routes.js | inline | optionalAuth | - |  |  | yes |  |
| GET | '/api/activities/:id' | src/api/routes/activities.routes.js | inline | - | - |  |  | yes |  |
| POST | '/api/activities' | src/api/routes/activities.routes.js | inline | optionalAuth | - |  |  | yes |  |
| PUT | '/api/activities/:id' | src/api/routes/activities.routes.js | inline | - | - |  |  | yes |  |
| PUT | '/api/activities/:id/complete' | src/api/routes/activities.routes.js | inline | - | - |  |  | yes |  |
| PUT | '/api/activities/:id/reschedule' | src/api/routes/activities.routes.js | inline | - | - |  |  | yes |  |
| DELETE | '/api/activities/:id' | src/api/routes/activities.routes.js | inline | - | - |  |  | yes |  |
| GET | '/api/health' | src/api/routes/admin.routes.js | inline | - | - |  |  |  |  |
| GET | '/api/stats' | src/api/routes/admin.routes.js | inline | - | - |  |  |  |  |
| POST | '/api/admin/clear-cache' | src/api/routes/admin.routes.js | inline | - | - |  |  |  |  |
| GET | '/api/admin/handlers-health' | src/api/routes/admin.routes.js | inline | - | - |  |  |  |  |
| GET | '/api/admin/system-health' | src/api/routes/admin.routes.js | inline | - | - |  |  |  |  |
| GET | '/api/admin/error-stats' | src/api/routes/admin.routes.js | inline | - | - |  |  |  |  |
| POST | '/api/admin/clear-old-errors' | src/api/routes/admin.routes.js | inline | - | - |  |  |  |  |
| GET | '/api/admin/coordinator/stats' | src/api/routes/admin.routes.js | inline | - | - |  |  |  |  |
| POST | '/api/admin/coordinator/emergency-cleanup' | src/api/routes/admin.routes.js | inline | - | - |  |  |  |  |
| GET | '/api/admin/audio/stats' | src/api/routes/admin.routes.js | inline | - | - |  |  |  |  |
| GET | '/api/admin/audio/status/:messageId' | src/api/routes/admin.routes.js | inline | - | - |  |  |  |  |
| GET | '/api/admin/context/stats' | src/api/routes/admin.routes.js | inline | - | - |  |  |  |  |
| GET | '/api/agents' | src/api/routes/agents.routes.js | inline | - | - | yes |  | yes |  |
| GET | '/api/agents/my' | src/api/routes/agents.routes.js | inline | authenticate, tenantContext | - | yes |  | yes | yes |
| GET | '/api/agents/:agentId' | src/api/routes/agents.routes.js | inline | validateAgentId | validateAgentId | yes |  | yes |  |
| POST | '/api/agents' | src/api/routes/agents.routes.js | inline | requireManager | - | yes |  | yes |  |
| PUT | '/api/agents/:agentId' | src/api/routes/agents.routes.js | inline | requireManager, validateAgentId | validateAgentId | yes |  | yes |  |
| DELETE | '/api/agents/:agentId' | src/api/routes/agents.routes.js | inline | requireManager, validateAgentId | validateAgentId | yes |  | yes |  |
| GET | '/api/admin/agents' | src/api/routes/agents.routes.js | inline | - | - | yes |  | yes |  |
| GET | '/api/agents/my' | src/api/routes/agents.routes.js | inline | authenticate, tenantContext | - | yes |  | yes | yes |
| GET | '/api/agents/:agentId/permissions' | src/api/routes/agents.routes.js | inline | authenticate, tenantContext, validateAgentId | validateAgentId | yes |  | yes |  |
| POST | '/api/agents/:agentId/duplicate' | src/api/routes/agents.routes.js | inline | authenticate, tenantContext, requireManager, validateAgentId, sanitizeInput | validateAgentId, sanitizeInput | yes |  | yes |  |
| GET | '/api/agents/:agentId/evolution/status' | src/api/routes/agents.routes.js | inline | authenticate, validateAgentId | validateAgentId | yes |  | yes |  |
| POST | '/api/agents/:agentId/evolution/create' | src/api/routes/agents.routes.js | inline | authenticate, tenantContext, requireManager, validateAgentId | validateAgentId | yes |  | yes |  |
| GET | '/api/agents/:agentId/evolution/qrcode' | src/api/routes/agents.routes.js | inline | authenticate, validateAgentId | validateAgentId | yes |  | yes |  |
| POST | '/api/agents/:agentId/evolution/disconnect' | src/api/routes/agents.routes.js | inline | authenticate, requireManager, validateAgentId | validateAgentId | yes |  | yes |  |
| DELETE | '/api/agents/:agentId/evolution' | src/api/routes/agents.routes.js | inline | authenticate, requireManager, validateAgentId | validateAgentId | yes |  | yes |  |
| GET | '/api/evolution/instances' | src/api/routes/agents.routes.js | inline | authenticate | - | yes |  | yes |  |
| GET | '/api/ai-insights/sentiment' | src/api/routes/ai-insights.routes.js | inline | optionalAuth | - |  |  | yes |  |
| GET | '/api/ai-insights/objections' | src/api/routes/ai-insights.routes.js | inline | optionalAuth | - |  |  | yes |  |
| GET | '/api/ai-insights/best-practices' | src/api/routes/ai-insights.routes.js | inline | optionalAuth | - |  |  | yes |  |
| GET | '/api/ai-insights/agent-performance' | src/api/routes/ai-insights.routes.js | inline | optionalAuth | - |  |  | yes |  |
| GET | '/api/ai-insights/recommendations' | src/api/routes/ai-insights.routes.js | inline | optionalAuth | - |  |  | yes |  |
| GET | '/api/analytics/whatsapp-stats' | src/api/routes/analytics.routes.js | inline | - | - |  |  | yes |  |
| GET | '/api/analytics/agent-metrics' | src/api/routes/analytics.routes.js | inline | - | - |  |  | yes |  |
| GET | '/api/analytics/overview' | src/api/routes/analytics.routes.js | inline | - | - |  |  | yes |  |
| GET | '/api/analytics/top-contacts' | src/api/routes/analytics.routes.js | inline | - | - |  |  | yes |  |
| GET | '/api/analytics/hourly' | src/api/routes/analytics.routes.js | inline | - | - |  |  | yes |  |
| GET | '/api/analytics/p2/stats' | src/api/routes/analytics.routes.js | inline | - | - |  |  | yes |  |
| GET | '/api/analytics/p2/abandonment-patterns' | src/api/routes/analytics.routes.js | inline | - | - |  |  | yes |  |
| GET | '/api/analytics/p2/experiments' | src/api/routes/analytics.routes.js | inline | - | - |  |  | yes |  |
| GET | '/api/analytics/p2/sentiment-summary' | src/api/routes/analytics.routes.js | inline | - | - |  |  | yes |  |
| GET | '/api/analytics/p2/insights-report' | src/api/routes/analytics.routes.js | inline | - | - |  |  | yes |  |
| POST | '/api/analytics/p2/create-experiment' | src/api/routes/analytics.routes.js | inline | - | - |  |  | yes |  |
| GET | '/api/analytics/learning/outcomes' | src/api/routes/analytics.routes.js | inline | - | - |  |  | yes |  |
| GET | '/api/analytics/learning/abandonment-job' | src/api/routes/analytics.routes.js | inline | - | - |  |  | yes |  |
| POST | '/api/analytics/learning/detect-abandonments' | src/api/routes/analytics.routes.js | inline | - | - |  |  | yes |  |
| GET | '/api/analytics/learning/abandonment-hotspots' | src/api/routes/analytics.routes.js | inline | - | - |  |  | yes |  |
| GET | '/api/analytics/learning/full-report' | src/api/routes/analytics.routes.js | inline | - | - |  |  | yes |  |
| GET | '/api/analytics/learning/activity' | src/api/routes/analytics.routes.js | inline | - | - |  |  | yes |  |
| GET | '/api/analytics/optimizer/status' | src/api/routes/analytics.routes.js | inline | - | - |  |  | yes |  |
| POST | '/api/analytics/optimizer/run-cycle' | src/api/routes/analytics.routes.js | inline | - | - |  |  | yes |  |
| GET | '/api/analytics/optimizer/stage-health' | src/api/routes/analytics.routes.js | inline | - | - |  |  | yes |  |
| GET | '/api/analytics/optimizer/optimizations' | src/api/routes/analytics.routes.js | inline | - | - |  |  | yes |  |
| POST | '/api/analytics/optimizer/start' | src/api/routes/analytics.routes.js | inline | - | - |  |  | yes |  |
| POST | '/api/analytics/optimizer/stop' | src/api/routes/analytics.routes.js | inline | - | - |  |  | yes |  |
| POST | '/api/analytics/optimizer/detect-risk' | src/api/routes/analytics.routes.js | inline | - | - |  |  | yes |  |
| GET | '/api/analytics/maturity-level' | src/api/routes/analytics.routes.js | inline | - | - |  |  | yes |  |
| POST | '/api/auth/create-user' | src/api/routes/auth.routes.js | inline | authenticate | - | yes |  | yes |  |
| POST | '/api/auth/login' | src/api/routes/auth.routes.js | inline | - | - | yes |  | yes |  |
| POST | '/api/auth/logout' | src/api/routes/auth.routes.js | inline | authenticate | - | yes |  | yes |  |
| POST | '/api/auth/refresh' | src/api/routes/auth.routes.js | inline | - | - | yes |  | yes |  |
| GET | '/api/auth/me' | src/api/routes/auth.routes.js | inline | authenticate | - | yes |  | yes |  |
| PUT | '/api/auth/password' | src/api/routes/auth.routes.js | inline | authenticate | - | yes |  | yes |  |
| GET | '/api/auth/sessions' | src/api/routes/auth.routes.js | inline | authenticate | - | yes |  | yes |  |
| DELETE | '/api/auth/sessions' | src/api/routes/auth.routes.js | inline | authenticate | - | yes |  | yes |  |
| GET | '/api/auth/entitlements' | src/api/routes/auth.routes.js | inline | authenticate | - | yes |  | yes |  |
| POST | '/api/auth/verify' | src/api/routes/auth.routes.js | inline | - | - | yes |  | yes |  |
| GET | '/api/automations' | src/api/routes/automation.routes.js | inline | - | - |  |  | yes |  |
| GET | '/api/automations/:id' | src/api/routes/automation.routes.js | inline | - | - |  |  | yes |  |
| POST | '/api/automations' | src/api/routes/automation.routes.js | inline | - | - |  |  | yes |  |
| PUT | '/api/automations/:id' | src/api/routes/automation.routes.js | inline | - | - |  |  | yes |  |
| DELETE | '/api/automations/:id' | src/api/routes/automation.routes.js | inline | - | - |  |  | yes |  |
| POST | '/api/automations/:id/toggle' | src/api/routes/automation.routes.js | inline | - | - |  |  | yes |  |
| POST | '/api/automations/:id/run' | src/api/routes/automation.routes.js | inline | - | - |  |  | yes |  |
| GET | '/api/automations/:id/executions' | src/api/routes/automation.routes.js | inline | - | - |  |  | yes |  |
| GET | '/api/automations/executions/recent' | src/api/routes/automation.routes.js | inline | - | - |  |  | yes |  |
| GET | '/api/automations/engine/stats' | src/api/routes/automation.routes.js | inline | - | - |  |  | yes |  |
| POST | '/api/automations/engine/initialize' | src/api/routes/automation.routes.js | inline | - | - |  |  | yes |  |
| GET | '/api/automations/templates' | src/api/routes/automation.routes.js | inline | - | - |  |  | yes |  |
| POST | '/api/automations/templates/:templateId/install' | src/api/routes/automation.routes.js | inline | - | - |  |  | yes |  |
| GET | '/api/cadences' | src/api/routes/cadence.routes.js | inline | - | - |  |  | yes |  |
| GET | '/api/cadences/stats' | src/api/routes/cadence.routes.js | inline | - | - |  |  | yes |  |
| GET | '/api/cadences/pipeline-view' | src/api/routes/cadence.routes.js | inline | - | - |  |  | yes |  |
| GET | '/api/cadences/:id' | src/api/routes/cadence.routes.js | inline | - | - |  |  | yes |  |
| GET | '/api/cadences/:id/steps' | src/api/routes/cadence.routes.js | inline | - | - |  |  | yes |  |
| POST | '/api/cadences/:id/enroll' | src/api/routes/cadence.routes.js | inline | - | - |  |  | yes |  |
| GET | '/api/cadences/enrollments/active' | src/api/routes/cadence.routes.js | inline | - | - |  |  | yes |  |
| PUT | '/api/cadences/enrollments/:id/pause' | src/api/routes/cadence.routes.js | inline | - | - |  |  | yes |  |
| PUT | '/api/cadences/enrollments/:id/resume' | src/api/routes/cadence.routes.js | inline | - | - |  |  | yes |  |
| PUT | '/api/cadences/enrollments/:id/respond' | src/api/routes/cadence.routes.js | inline | - | - |  |  | yes |  |
| GET | '/api/cadences/actions/pending' | src/api/routes/cadence.routes.js | inline | - | - |  |  | yes |  |
| POST | '/api/cadences/actions/execute' | src/api/routes/cadence.routes.js | inline | - | - |  |  | yes |  |
| POST | '/api/cadences/advance-day' | src/api/routes/cadence.routes.js | inline | - | - |  |  | yes |  |
| POST | '/api/calibration/test' | src/api/routes/calibration.routes.js | inline | - | - |  |  |  |  |
| GET | '/api/calibration/status' | src/api/routes/calibration.routes.js | inline | - | - |  |  |  |  |
| POST | '/api/agents/:agentId/channels/evolution/connect' | src/api/routes/channels.routes.js | inline | authenticate, tenantContext | - | yes |  |  |  |
| GET | '/api/agents/:agentId/channels/evolution/status' | src/api/routes/channels.routes.js | inline | authenticate, tenantContext | - | yes |  |  |  |
| GET | '/api/agents/:agentId/channels/evolution/qrcode' | src/api/routes/channels.routes.js | inline | authenticate, tenantContext | - | yes |  |  |  |
| POST | '/api/agents/:agentId/channels/evolution/disconnect' | src/api/routes/channels.routes.js | inline | authenticate, tenantContext | - | yes |  |  |  |
| GET | '/api/integrations' | src/api/routes/channels.routes.js | inline | authenticate, tenantContext | - | yes |  |  |  |
| GET | '/api/integrations/:integrationId' | src/api/routes/channels.routes.js | inline | authenticate, tenantContext | - | yes |  |  |  |
| GET | '/api/integrations/:integrationId/status' | src/api/routes/channels.routes.js | inline | authenticate, tenantContext | - | yes |  |  |  |
| GET | '/api/clientes' | src/api/routes/clientes.routes.js | inline | - | - |  |  | yes |  |
| POST | '/api/clientes/from-opportunity' | src/api/routes/clientes.routes.js | inline | - | - |  |  | yes |  |
| GET | '/api/clientes/:id' | src/api/routes/clientes.routes.js | inline | - | - |  |  | yes |  |
| PUT | '/api/clientes/:id/status' | src/api/routes/clientes.routes.js | inline | - | - |  |  | yes |  |
| POST | '/api/clientes/:id/greeting' | src/api/routes/clientes.routes.js | inline | - | - |  |  | yes |  |
| POST | '/api/clientes/:id/followup' | src/api/routes/clientes.routes.js | inline | - | - |  |  | yes |  |
| GET | '/api/command-center/overview' | src/api/routes/command-center.routes.js | inline | optionalAuth | - |  |  | yes |  |
| GET | '/api/command-center/tasks/urgent' | src/api/routes/command-center.routes.js | inline | optionalAuth | - |  |  | yes |  |
| GET | '/api/command-center/hot-leads' | src/api/routes/command-center.routes.js | inline | optionalAuth | - |  |  | yes |  |
| GET | '/api/command-center/activity-feed' | src/api/routes/command-center.routes.js | inline | optionalAuth | - |  |  | yes |  |
| GET | '/api/command-center/pipeline-summary' | src/api/routes/command-center.routes.js | inline | optionalAuth | - |  |  | yes |  |
| GET | '/api/command-center/performance' | src/api/routes/command-center.routes.js | inline | optionalAuth | - |  |  | yes |  |
| GET | '/api/crm/accounts' | src/api/routes/crm/accounts.routes.js | inline | - | - |  |  |  |  |
| GET | '/api/crm/accounts/stats' | src/api/routes/crm/accounts.routes.js | inline | - | - |  |  |  |  |
| GET | '/api/crm/accounts/:id' | src/api/routes/crm/accounts.routes.js | inline | - | - |  |  |  |  |
| POST | '/api/crm/accounts' | src/api/routes/crm/accounts.routes.js | inline | - | - |  |  |  |  |
| PUT | '/api/crm/accounts/:id' | src/api/routes/crm/accounts.routes.js | inline | - | - |  |  |  |  |
| DELETE | '/api/crm/accounts/:id' | src/api/routes/crm/accounts.routes.js | inline | - | - |  |  |  |  |
| GET | '/api/crm/contacts' | src/api/routes/crm/contacts.routes.js | inline | - | - |  |  |  |  |
| GET | '/api/crm/contacts/stats' | src/api/routes/crm/contacts.routes.js | inline | - | - |  |  |  |  |
| GET | '/api/crm/contacts/:id' | src/api/routes/crm/contacts.routes.js | inline | - | - |  |  |  |  |
| POST | '/api/crm/contacts' | src/api/routes/crm/contacts.routes.js | inline | - | - |  |  |  |  |
| PUT | '/api/crm/contacts/:id' | src/api/routes/crm/contacts.routes.js | inline | - | - |  |  |  |  |
| DELETE | '/api/crm/contacts/:id' | src/api/routes/crm/contacts.routes.js | inline | - | - |  |  |  |  |
| POST | '/api/crm/contacts/:id/consent' | src/api/routes/crm/contacts.routes.js | inline | - | - |  |  |  |  |
| PUT | '/api/crm/contacts/:id/score' | src/api/routes/crm/contacts.routes.js | inline | - | - |  |  |  |  |
| GET | '/crm' | src/api/routes/crm/dashboard.routes.js | inline | - | - |  |  |  |  |
| GET | '/crm/' | src/api/routes/crm/dashboard.routes.js | inline | - | - |  |  |  |  |
| GET | '/crm/leads' | src/api/routes/crm/dashboard.routes.js | inline | - | - |  |  |  |  |
| GET | '/crm/pipeline' | src/api/routes/crm/dashboard.routes.js | inline | - | - |  |  |  |  |
| GET | '/crm/accounts' | src/api/routes/crm/dashboard.routes.js | inline | - | - |  |  |  |  |
| GET | '/crm/contacts' | src/api/routes/crm/dashboard.routes.js | inline | - | - |  |  |  |  |
| GET | '/api/crm/leads' | src/api/routes/crm/leads.routes.js | inline | - | - |  |  |  |  |
| GET | '/api/crm/leads/stats' | src/api/routes/crm/leads.routes.js | inline | - | - |  |  |  |  |
| GET | '/api/crm/leads/:id' | src/api/routes/crm/leads.routes.js | inline | - | - |  |  |  |  |
| POST | '/api/crm/leads' | src/api/routes/crm/leads.routes.js | inline | - | - |  |  |  |  |
| PUT | '/api/crm/leads/:id' | src/api/routes/crm/leads.routes.js | inline | - | - |  |  |  |  |
| DELETE | '/api/crm/leads/:id' | src/api/routes/crm/leads.routes.js | inline | - | - |  |  |  |  |
| PUT | '/api/crm/leads/:id/status' | src/api/routes/crm/leads.routes.js | inline | - | - |  |  |  |  |
| PUT | '/api/crm/leads/:id/bant' | src/api/routes/crm/leads.routes.js | inline | - | - |  |  |  |  |
| POST | '/api/crm/leads/:id/convert' | src/api/routes/crm/leads.routes.js | inline | - | - |  |  |  |  |
| GET | '/api/crm/opportunities' | src/api/routes/crm/opportunities.routes.js | inline | - | - |  |  |  |  |
| GET | '/api/crm/opportunities/pipeline' | src/api/routes/crm/opportunities.routes.js | inline | - | - |  |  |  |  |
| GET | '/api/crm/opportunities/:id' | src/api/routes/crm/opportunities.routes.js | inline | - | - |  |  |  |  |
| POST | '/api/crm/opportunities' | src/api/routes/crm/opportunities.routes.js | inline | - | - |  |  |  |  |
| PUT | '/api/crm/opportunities/:id' | src/api/routes/crm/opportunities.routes.js | inline | - | - |  |  |  |  |
| DELETE | '/api/crm/opportunities/:id' | src/api/routes/crm/opportunities.routes.js | inline | - | - |  |  |  |  |
| PUT | '/api/crm/opportunities/:id/stage' | src/api/routes/crm/opportunities.routes.js | inline | - | - |  |  |  |  |
| POST | '/api/crm/opportunities/:id/win' | src/api/routes/crm/opportunities.routes.js | inline | - | - |  |  |  |  |
| POST | '/api/crm/opportunities/:id/lose' | src/api/routes/crm/opportunities.routes.js | inline | - | - |  |  |  |  |
| POST | '/api/crm/opportunities/:id/products' | src/api/routes/crm/opportunities.routes.js | inline | - | - |  |  |  |  |
| DELETE | '/api/crm/opportunities/:id/products/:productId' | src/api/routes/crm/opportunities.routes.js | inline | - | - |  |  |  |  |
| GET | '/api/integrations/crm/:provider/oauth/start' | src/api/routes/crm-integration.routes.js | inline | authenticate, tenantContext | - | yes |  | yes |  |
| GET | '/api/integrations/oauth/callback/:provider' | src/api/routes/crm-integration.routes.js | inline | - | - | yes |  | yes |  |
| POST | '/api/integrations/:integrationId/disconnect' | src/api/routes/crm-integration.routes.js | inline | authenticate, tenantContext | - | yes |  | yes |  |
| POST | '/api/integrations/:integrationId/sync' | src/api/routes/crm-integration.routes.js | inline | authenticate, tenantContext | - | yes |  | yes |  |
| GET | '/api/integrations/:integrationId/pipelines' | src/api/routes/crm-integration.routes.js | inline | authenticate, tenantContext | - | yes |  | yes |  |
| POST | '/api/integrations/:integrationId/leads' | src/api/routes/crm-integration.routes.js | inline | authenticate, tenantContext | - | yes |  | yes |  |
| GET | '/api/integrations/:integrationId/test' | src/api/routes/crm-integration.routes.js | inline | authenticate, tenantContext | - | yes |  | yes |  |
| GET | '/' | src/api/routes/dashboard.routes.js | inline | - | - |  |  |  | yes |
| POST | '/api/tts/elevenlabs' | src/api/routes/dashboard.routes.js | inline | - | - |  |  |  |  |
| POST | '/api/chat' | src/api/routes/dashboard.routes.js | inline | - | - |  |  |  |  |
| POST | '/api/dashboard/voice-navigate' | src/api/routes/dashboard.routes.js | inline | - | - |  |  |  |  |
| POST | '/api/dashboard/execute-navigation' | src/api/routes/dashboard.routes.js | inline | - | - |  |  |  |  |
| GET | '/api/dashboard/voice-commands' | src/api/routes/dashboard.routes.js | inline | - | - |  |  |  |  |
| GET | '/api/debug/sheets' | src/api/routes/debug.routes.js | inline | - | - |  |  |  |  |
| GET | '/api/email-optin/status' | src/api/routes/email-optin.routes.js | inline | - | - |  |  | yes |  |
| GET | '/api/email-optin/stats' | src/api/routes/email-optin.routes.js | inline | - | - |  |  | yes |  |
| POST | '/api/email-optin/start' | src/api/routes/email-optin.routes.js | inline | - | - |  |  | yes |  |
| POST | '/api/email-optin/stop' | src/api/routes/email-optin.routes.js | inline | - | - |  |  | yes |  |
| POST | '/api/email-optin/pause' | src/api/routes/email-optin.routes.js | inline | - | - |  |  | yes |  |
| POST | '/api/email-optin/resume' | src/api/routes/email-optin.routes.js | inline | - | - |  |  | yes |  |
| POST | '/api/email-optin/import' | src/api/routes/email-optin.routes.js | inline | - | - |  |  | yes |  |
| POST | '/api/email-optin/send-single' | src/api/routes/email-optin.routes.js | inline | - | - |  |  | yes |  |
| GET | '/api/email-optin/pending' | src/api/routes/email-optin.routes.js | inline | - | - |  |  | yes |  |
| GET | '/api/email-optin/sent' | src/api/routes/email-optin.routes.js | inline | - | - |  |  | yes |  |
| GET | '/api/email-optin/eligible' | src/api/routes/email-optin.routes.js | inline | - | - |  |  | yes |  |
| POST | '/api/email-optin/config' | src/api/routes/email-optin.routes.js | inline | - | - |  |  | yes |  |
| POST | '/api/email-optin/mark-eligible' | src/api/routes/email-optin.routes.js | inline | - | - |  |  | yes |  |
| GET | '/api/forecasting/pipeline-weighted' | src/api/routes/forecasting.routes.js | inline | optionalAuth | - |  |  | yes |  |
| GET | '/api/forecasting/scenarios' | src/api/routes/forecasting.routes.js | inline | optionalAuth | - |  |  | yes |  |
| GET | '/api/forecasting/velocity' | src/api/routes/forecasting.routes.js | inline | optionalAuth | - |  |  | yes |  |
| GET | '/api/forecasting/win-rate' | src/api/routes/forecasting.routes.js | inline | optionalAuth | - |  |  | yes |  |
| GET | '/api/forecasting/trends' | src/api/routes/forecasting.routes.js | inline | optionalAuth | - |  |  | yes |  |
| GET | '/api/forecasting/monthly' | src/api/routes/forecasting.routes.js | inline | optionalAuth | - |  |  | yes |  |
| GET | '/api/funil/bant' | src/api/routes/funil.routes.js | inline | - | - |  |  | yes |  |
| GET | '/api/funil/stats' | src/api/routes/funil.routes.js | inline | - | - |  |  | yes |  |
| GET | '/api/funil/bant/:contactId' | src/api/routes/funil.routes.js | inline | - | - |  |  | yes |  |
| POST | '/api/leads/update-stage' | src/api/routes/funil.routes.js | inline | - | - |  |  | yes | yes |
| POST | '/api/funil/cleanup-prospecting' | src/api/routes/funil.routes.js | inline | - | - |  |  | yes |  |
| POST | '/api/funil/sheets-sync/enable' | src/api/routes/funil.routes.js | inline | - | - |  |  | yes |  |
| POST | '/api/funil/sheets-sync/disable' | src/api/routes/funil.routes.js | inline | - | - |  |  | yes |  |
| POST | '/api/funil/sync-to-sheets' | src/api/routes/funil.routes.js | inline | - | - |  |  | yes |  |
| GET | '/api/funil/pipeline-unificado' | src/api/routes/funil.routes.js | inline | - | - |  |  | yes |  |
| POST | '/api/leads/ingest' | src/api/routes/funil.routes.js | inline | - | - |  |  | yes |  |
| GET | '/api/leads/ingest/stats' | src/api/routes/funil.routes.js | inline | - | - |  |  | yes |  |
| GET | '/api/google/auth-url' | src/api/routes/google/calendar.routes.js | inline | - | - |  |  |  |  |
| GET | '/api/google/auth-status' | src/api/routes/google/calendar.routes.js | inline | - | - |  |  |  |  |
| GET | '/auth/google' | src/api/routes/google/calendar.routes.js | inline | - | - |  |  |  |  |
| GET | '/oauth2callback' | src/api/routes/google/calendar.routes.js | inline | - | - |  |  |  |  |
| GET | '/api/calendar/status' | src/api/routes/google/calendar.routes.js | inline | - | - |  |  |  |  |
| GET | '/api/events' | src/api/routes/google/calendar.routes.js | inline | - | - |  |  |  |  |
| POST | '/api/events' | src/api/routes/google/calendar.routes.js | inline | - | - |  |  |  |  |
| PUT | '/api/events/:eventId' | src/api/routes/google/calendar.routes.js | inline | - | - |  |  |  |  |
| DELETE | '/api/events/:eventId' | src/api/routes/google/calendar.routes.js | inline | - | - |  |  |  |  |
| GET | '/api/calendar/free-slots' | src/api/routes/google/calendar.routes.js | inline | - | - |  |  |  |  |
| POST | '/api/calendar/suggest-times' | src/api/routes/google/calendar.routes.js | inline | - | - |  |  |  |  |
| GET | '/api/leads' | src/api/routes/google/sheets.routes.js | inline | - | - |  |  |  | yes |
| GET | '/api/dashboard/leads' | src/api/routes/google/sheets.routes.js | inline | - | - |  |  |  |  |
| GET | '/health' | src/api/routes/health.routes.js | inline | - | - |  | yes |  | yes |
| GET | '/health/detailed' | src/api/routes/health.routes.js | inline | - | - |  | yes |  |  |
| GET | '/health/ready' | src/api/routes/health.routes.js | inline | - | - |  | yes |  |  |
| GET | '/health/live' | src/api/routes/health.routes.js | inline | - | - |  | yes |  |  |
| GET | '/api/version' | src/api/routes/health.routes.js | inline | - | - |  | yes |  | yes |
| GET | '/api/scoring/rules' | src/api/routes/lead-scoring.routes.js | inline | - | - |  |  | yes |  |
| GET | '/api/scoring/rules/:id' | src/api/routes/lead-scoring.routes.js | inline | - | - |  |  | yes |  |
| POST | '/api/scoring/rules' | src/api/routes/lead-scoring.routes.js | inline | - | - |  |  | yes |  |
| PUT | '/api/scoring/rules/:id' | src/api/routes/lead-scoring.routes.js | inline | - | - |  |  | yes |  |
| DELETE | '/api/scoring/rules/:id' | src/api/routes/lead-scoring.routes.js | inline | - | - |  |  | yes |  |
| PUT | '/api/scoring/rules/:id/toggle' | src/api/routes/lead-scoring.routes.js | inline | - | - |  |  | yes |  |
| POST | '/api/scoring/calculate/:leadId' | src/api/routes/lead-scoring.routes.js | inline | - | - |  |  | yes |  |
| POST | '/api/scoring/calculate-all' | src/api/routes/lead-scoring.routes.js | inline | - | - |  |  | yes |  |
| GET | '/api/scoring/leaderboard' | src/api/routes/lead-scoring.routes.js | inline | - | - |  |  | yes |  |
| GET | '/api/scoring/lead/:leadId' | src/api/routes/lead-scoring.routes.js | inline | - | - |  |  | yes |  |
| GET | '/api/scoring/lead/:leadId/history' | src/api/routes/lead-scoring.routes.js | inline | - | - |  |  | yes |  |
| GET | '/api/scoring/stats' | src/api/routes/lead-scoring.routes.js | inline | - | - |  |  | yes |  |
| GET | '/api/learning/report' | src/api/routes/learning.routes.js | inline | - | - |  |  | yes |  |
| GET | '/api/learning/patterns' | src/api/routes/learning.routes.js | inline | - | - |  |  | yes |  |
| GET | '/api/learning/score/:contactId' | src/api/routes/learning.routes.js | inline | - | - |  |  | yes |  |
| GET | '/api/learning/intelligence/dashboard' | src/api/routes/learning.routes.js | inline | - | - |  |  | yes |  |
| GET | '/api/learning/adaptations' | src/api/routes/learning.routes.js | inline | - | - |  |  | yes |  |
| GET | '/api/learning/abandonment-patterns' | src/api/routes/learning.routes.js | inline | - | - |  |  | yes |  |
| POST | '/api/learning/patterns/refresh' | src/api/routes/learning.routes.js | inline | - | - |  |  | yes |  |
| GET | '/api/learning/experiments' | src/api/routes/learning.routes.js | inline | - | - |  |  | yes |  |
| POST | '/api/meetings/transcriptions/fetch-by-event' | src/api/routes/meetings.routes.js | inline | - | - |  |  |  |  |
| POST | '/api/meetings/transcriptions/fetch-by-type' | src/api/routes/meetings.routes.js | inline | - | - |  |  |  |  |
| POST | '/api/meetings/transcriptions/fetch-recent' | src/api/routes/meetings.routes.js | inline | - | - |  |  |  |  |
| GET | '/api/meetings/transcriptions/:id' | src/api/routes/meetings.routes.js | inline | - | - |  |  |  |  |
| GET | '/api/meetings/transcriptions' | src/api/routes/meetings.routes.js | inline | - | - |  |  |  |  |
| POST | '/api/meetings/analyze/:transcriptionId' | src/api/routes/meetings.routes.js | inline | - | - |  |  |  |  |
| POST | '/api/meetings/analyze/quick' | src/api/routes/meetings.routes.js | inline | - | - |  |  |  |  |
| GET | '/api/meetings/analysis/:id' | src/api/routes/meetings.routes.js | inline | - | - |  |  |  |  |
| GET | '/api/meetings/analysis/by-meeting/:meetingId' | src/api/routes/meetings.routes.js | inline | - | - |  |  |  |  |
| GET | '/api/meetings/scores/excellent' | src/api/routes/meetings.routes.js | inline | - | - |  |  |  |  |
| GET | '/api/meetings/scores/bant-qualified' | src/api/routes/meetings.routes.js | inline | - | - |  |  |  |  |
| GET | '/api/meetings/scores/stats' | src/api/routes/meetings.routes.js | inline | - | - |  |  |  |  |
| GET | '/api/meetings/insights/high-priority' | src/api/routes/meetings.routes.js | inline | - | - |  |  |  |  |
| PATCH | '/api/meetings/insights/:id/status' | src/api/routes/meetings.routes.js | inline | - | - |  |  |  |  |
| GET | '/api/meetings/insights/stats' | src/api/routes/meetings.routes.js | inline | - | - |  |  |  |  |
| GET | '/api/meetings/auth/google/url' | src/api/routes/meetings.routes.js | inline | - | - |  |  |  |  |
| POST | '/api/meetings/auth/google/callback' | src/api/routes/meetings.routes.js | inline | - | - |  |  |  |  |
| GET | '/api/metrics' | src/api/routes/metrics.routes.js | inline | - | - |  |  |  |  |
| GET | '/api/metrics/summary' | src/api/routes/metrics.routes.js | inline | - | - |  |  |  |  |
| POST | '/api/metrics/reset' | src/api/routes/metrics.routes.js | inline | - | - |  |  |  |  |
| GET | '/api/notifications' | src/api/routes/notifications.routes.js | inline | optionalAuth | - |  |  | yes |  |
| GET | '/api/notifications/unread-count' | src/api/routes/notifications.routes.js | inline | optionalAuth | - |  |  | yes |  |
| GET | '/api/notifications/:id' | src/api/routes/notifications.routes.js | inline | - | - |  |  | yes |  |
| POST | '/api/notifications' | src/api/routes/notifications.routes.js | inline | - | - |  |  | yes |  |
| POST | '/api/notifications/broadcast' | src/api/routes/notifications.routes.js | inline | - | - |  |  | yes |  |
| PUT | '/api/notifications/:id/read' | src/api/routes/notifications.routes.js | inline | - | - |  |  | yes |  |
| PUT | '/api/notifications/read-all' | src/api/routes/notifications.routes.js | inline | optionalAuth | - |  |  | yes |  |
| DELETE | '/api/notifications/:id' | src/api/routes/notifications.routes.js | inline | - | - |  |  | yes |  |
| DELETE | '/api/notifications/old' | src/api/routes/notifications.routes.js | inline | - | - |  |  | yes |  |
| GET | '/api/notifications/preferences' | src/api/routes/notifications.routes.js | inline | optionalAuth | - |  |  | yes |  |
| PUT | '/api/notifications/preferences' | src/api/routes/notifications.routes.js | inline | optionalAuth | - |  |  | yes |  |
| GET | '/api/pipeline' | src/api/routes/pipeline.routes.js | inline | - | - |  |  | yes |  |
| GET | '/api/pipeline/stats' | src/api/routes/pipeline.routes.js | inline | - | - |  |  | yes |  |
| POST | '/api/pipeline' | src/api/routes/pipeline.routes.js | inline | - | - |  |  | yes |  |
| PUT | '/api/pipeline/:id/stage' | src/api/routes/pipeline.routes.js | inline | - | - |  |  | yes |  |
| PUT | '/api/pipeline/:id' | src/api/routes/pipeline.routes.js | inline | - | - |  |  | yes |  |
| GET | '/api/pipeline/:id' | src/api/routes/pipeline.routes.js | inline | - | - |  |  | yes |  |
| GET | '/api/ports/status' | src/api/routes/ports.routes.js | inline | - | - |  |  |  |  |
| GET | '/api/ports/available' | src/api/routes/ports.routes.js | inline | - | - |  |  |  |  |
| POST | '/api/ports/release/:port' | src/api/routes/ports.routes.js | inline | - | - |  |  |  |  |
| POST | '/api/prospecting/start' | src/api/routes/prospecting.routes.js | inline | optionalAuth | - |  |  |  |  |
| POST | '/api/prospecting/stop' | src/api/routes/prospecting.routes.js | inline | optionalAuth | - |  |  |  |  |
| POST | '/api/prospecting/pause' | src/api/routes/prospecting.routes.js | inline | optionalAuth | - |  |  |  |  |
| POST | '/api/prospecting/resume' | src/api/routes/prospecting.routes.js | inline | optionalAuth | - |  |  |  |  |
| GET | '/api/prospecting/status' | src/api/routes/prospecting.routes.js | inline | optionalAuth | - |  |  |  |  |
| GET | '/api/prospecting/metrics' | src/api/routes/prospecting.routes.js | inline | optionalAuth | - |  |  |  |  |
| GET | '/api/prospecting/history' | src/api/routes/prospecting.routes.js | inline | optionalAuth | - |  |  |  |  |
| POST | '/api/prospecting/config' | src/api/routes/prospecting.routes.js | inline | optionalAuth | - |  |  |  |  |
| POST | '/api/prospecting/template' | src/api/routes/prospecting.routes.js | inline | optionalAuth | - |  |  |  |  |
| POST | '/api/prospecting/manual' | src/api/routes/prospecting.routes.js | inline | optionalAuth | - |  |  |  |  |
| POST | '/api/prospecting/test' | src/api/routes/prospecting.routes.js | inline | optionalAuth | - |  |  |  |  |
| POST | '/api/prospecting/reset' | src/api/routes/prospecting.routes.js | inline | optionalAuth | - |  |  |  |  |
| GET | '/api/prospecting/sync/status' | src/api/routes/prospecting.routes.js | inline | optionalAuth | - |  |  |  |  |
| POST | '/api/prospecting/sync/now' | src/api/routes/prospecting.routes.js | inline | optionalAuth | - |  |  |  |  |
| GET | '/api/prospecting/prospects/stats' | src/api/routes/prospecting.routes.js | inline | optionalAuth | - |  |  |  |  |
| GET | '/api/reports/summary' | src/api/routes/reports.routes.js | inline | optionalAuth | - |  |  | yes |  |
| GET | '/api/reports/templates' | src/api/routes/reports.routes.js | inline | - | - |  |  | yes |  |
| POST | '/api/reports/generate' | src/api/routes/reports.routes.js | inline | optionalAuth | - |  |  | yes |  |
| GET | '/api/reports/export/:format' | src/api/routes/reports.routes.js | inline | optionalAuth | - |  |  | yes |  |
| GET | '/api/team/users' | src/api/routes/team.routes.js | inline | - | - |  |  | yes |  |
| GET | '/api/team/users/:id' | src/api/routes/team.routes.js | inline | - | - |  |  | yes |  |
| POST | '/api/team/users' | src/api/routes/team.routes.js | inline | - | - |  |  | yes |  |
| PUT | '/api/team/users/:id' | src/api/routes/team.routes.js | inline | - | - |  |  | yes |  |
| DELETE | '/api/team/users/:id' | src/api/routes/team.routes.js | inline | - | - |  |  | yes |  |
| GET | '/api/team/users/:id/performance' | src/api/routes/team.routes.js | inline | - | - |  |  | yes |  |
| GET | '/api/team/leaderboard' | src/api/routes/team.routes.js | inline | - | - |  |  | yes |  |
| GET | '/api/teams' | src/api/routes/team.routes.js | inline | - | - |  |  | yes |  |
| GET | '/api/team/teams' | src/api/routes/team.routes.js | inline | - | - |  |  | yes |  |
| GET | '/api/team/teams/:id' | src/api/routes/team.routes.js | inline | - | - |  |  | yes |  |
| POST | '/api/team/teams' | src/api/routes/team.routes.js | inline | - | - |  |  | yes |  |
| PUT | '/api/team/teams/:id' | src/api/routes/team.routes.js | inline | - | - |  |  | yes |  |
| DELETE | '/api/team/teams/:id' | src/api/routes/team.routes.js | inline | - | - |  |  | yes |  |
| POST | '/api/team/teams/:id/members' | src/api/routes/team.routes.js | inline | - | - |  |  | yes |  |
| DELETE | '/api/team/teams/:id/members/:userId' | src/api/routes/team.routes.js | inline | - | - |  |  | yes |  |
| GET | '/api/team/teams/:id/performance' | src/api/routes/team.routes.js | inline | - | - |  |  | yes |  |
| GET | '/api/version' | src/api/routes/version.routes.js | inline | - | - |  | yes | yes | yes |
| GET | '/api/version/short' | src/api/routes/version.routes.js | inline | - | - |  | yes | yes |  |
| GET | '/health/version' | src/api/routes/version.routes.js | inline | - | - |  | yes | yes |  |
| POST | '/api/webhook/evolution' | src/api/routes/webhook.routes.js | inline | rateLimitWebhook, validateWebhookRequest | validateWebhookRequest |  |  | yes |  |
| GET | '/api/webhook/health' | src/api/routes/webhook.routes.js | inline | - | - |  |  | yes |  |
| GET | '/api/webhook/coordinator/stats' | src/api/routes/webhook.routes.js | inline | - | - |  |  | yes |  |
| POST | '/api/webhook/coordinator/emergency-cleanup' | src/api/routes/webhook.routes.js | inline | - | - |  |  | yes |  |
| POST | '/api/webhooks/inbound/:webhookPublicId' | src/api/routes/webhooks-inbound.routes.js | inline | - | - |  |  | yes |  |
| POST | '/api/website/contact' | src/api/routes/website.routes.js | inline | - | - |  |  |  |  |
| POST | '/api/website/newsletter' | src/api/routes/website.routes.js | inline | - | - |  |  |  |  |
| GET | '/api/website/health' | src/api/routes/website.routes.js | inline | - | - |  |  |  |  |
| POST | '/api/whatsapp/send' | src/api/routes/whatsapp.routes.js | inline | - | - |  |  |  |  |
| POST | '/api/campaign/run' | src/api/routes/whatsapp.routes.js | inline | - | - |  |  |  |  |
| GET | '/api/whatsapp/campaign-status' | src/api/routes/whatsapp.routes.js | inline | - | - |  |  |  |  |
| POST | '/api/whatsapp/intelligent-campaign' | src/api/routes/whatsapp.routes.js | inline | - | - |  |  |  |  |
| GET | '/api/leads' | src/api/routes/whatsapp.routes.js | inline | - | - |  |  |  | yes |
| POST | '/api/leads/update-stage' | src/api/routes/whatsapp.routes.js | inline | - | - |  |  |  | yes |
| GET | '/' | src/platform/api/routes/agents.routes.js | inline | - | - |  |  |  | yes |
| GET | '/:id' | src/platform/api/routes/agents.routes.js | inline | - | - |  |  |  | yes |
| POST | '/' | src/platform/api/routes/agents.routes.js | inline | - | - |  |  |  | yes |
| PUT | '/:id' | src/platform/api/routes/agents.routes.js | inline | - | - |  |  |  | yes |
| DELETE | '/:id' | src/platform/api/routes/agents.routes.js | inline | - | - |  |  |  | yes |
| POST | '/preview' | src/platform/api/routes/agents.routes.js | inline | - | - |  |  |  |  |
| GET | '/:id/prompt' | src/platform/api/routes/agents.routes.js | inline | - | - |  |  |  |  |
| GET | '/:id/state' | src/platform/api/routes/agents.routes.js | inline | - | - |  |  |  |  |
| POST | '/from-template' | src/platform/api/routes/agents.routes.js | inline | - | - |  |  |  | yes |
| GET | '/templates/list' | src/platform/api/routes/agents.routes.js | inline | - | - |  |  |  |  |
| POST | '/process' | src/platform/api/routes/runtime.routes.js | inline | - | - |  |  |  |  |
| POST | '/chat' | src/platform/api/routes/runtime.routes.js | inline | - | - |  |  |  |  |
| POST | '/simulate' | src/platform/api/routes/runtime.routes.js | inline | - | - |  |  |  |  |
| GET | '/states' | src/platform/api/routes/runtime.routes.js | inline | - | - |  |  |  |  |
| POST | '/qualify' | src/platform/api/routes/runtime.routes.js | inline | - | - |  |  |  |  |
| POST | '/extract' | src/platform/api/routes/runtime.routes.js | inline | - | - |  |  |  |  |
| GET | '/questions/:stage' | src/platform/api/routes/runtime.routes.js | inline | - | - |  |  |  |  |
| POST | '/webhook' | src/platform/api/routes/runtime.routes.js | inline | - | - |  |  |  |  |
| GET | '/' | src/scalable/agents/AgentApiRoutes.js | inline | - | - |  |  |  | yes |
| GET | '/stats' | src/scalable/agents/AgentApiRoutes.js | inline | - | - |  |  |  |  |
| GET | '/types' | src/scalable/agents/AgentApiRoutes.js | inline | - | - |  |  |  |  |
| GET | '/statuses' | src/scalable/agents/AgentApiRoutes.js | inline | - | - |  |  |  |  |
| GET | '/templates' | src/scalable/agents/AgentApiRoutes.js | inline | - | - |  |  |  |  |
| GET | '/templates/fields' | src/scalable/agents/AgentApiRoutes.js | inline | - | - |  |  |  |  |
| GET | '/templates/:templateId' | src/scalable/agents/AgentApiRoutes.js | inline | - | - |  |  |  |  |
| POST | '/templates/:templateId/preview' | src/scalable/agents/AgentApiRoutes.js | inline | - | - |  |  |  |  |
| POST | '/templates/:templateId/create' | src/scalable/agents/AgentApiRoutes.js | inline | - | - |  |  |  |  |
| POST | '/templates/:templateId/validate' | src/scalable/agents/AgentApiRoutes.js | inline | - | - |  |  |  |  |
| GET | '/:id' | src/scalable/agents/AgentApiRoutes.js | inline | - | - |  |  |  | yes |
| POST | '/' | src/scalable/agents/AgentApiRoutes.js | inline | - | - |  |  |  | yes |
| POST | '/from-template' | src/scalable/agents/AgentApiRoutes.js | inline | - | - |  |  |  | yes |
| PUT | '/:id' | src/scalable/agents/AgentApiRoutes.js | inline | - | - |  |  |  | yes |
| PATCH | '/:id' | src/scalable/agents/AgentApiRoutes.js | inline | - | - |  |  |  |  |
| DELETE | '/:id' | src/scalable/agents/AgentApiRoutes.js | inline | - | - |  |  |  | yes |
| POST | '/:id/activate' | src/scalable/agents/AgentApiRoutes.js | inline | - | - |  |  |  |  |
| POST | '/:id/pause' | src/scalable/agents/AgentApiRoutes.js | inline | - | - |  |  |  |  |
| POST | '/:id/disable' | src/scalable/agents/AgentApiRoutes.js | inline | - | - |  |  |  |  |
| POST | '/:id/test' | src/scalable/agents/AgentApiRoutes.js | inline | - | - |  |  |  |  |
| POST | '/:id/duplicate' | src/scalable/agents/AgentApiRoutes.js | inline | - | - |  |  |  |  |
| PUT | '/:id/system-prompt' | src/scalable/agents/AgentApiRoutes.js | inline | - | - |  |  |  |  |
| PUT | '/:id/prompts' | src/scalable/agents/AgentApiRoutes.js | inline | - | - |  |  |  |  |
| PUT | '/:id/message-templates' | src/scalable/agents/AgentApiRoutes.js | inline | - | - |  |  |  |  |
| PUT | '/:id/behavior' | src/scalable/agents/AgentApiRoutes.js | inline | - | - |  |  |  |  |
| PUT | '/:id/ai-config' | src/scalable/agents/AgentApiRoutes.js | inline | - | - |  |  |  |  |
| PUT | '/:id/integrations' | src/scalable/agents/AgentApiRoutes.js | inline | - | - |  |  |  |  |
| GET | '/:id/metrics' | src/scalable/agents/AgentApiRoutes.js | inline | - | - |  |  |  |  |
| POST | '/:id/metrics' | src/scalable/agents/AgentApiRoutes.js | inline | - | - |  |  |  |  |
| POST | '/:id/metrics/increment' | src/scalable/agents/AgentApiRoutes.js | inline | - | - |  |  |  |  |
| GET | '/tenant/:tenantId' | src/scalable/agents/AgentApiRoutes.js | inline | - | - |  |  |  |  |
| GET | '/tenant/:tenantId/stats' | src/scalable/agents/AgentApiRoutes.js | inline | - | - |  |  |  |  |
| GET | '/dashboard' | src/scalable/admin/AdminApiRoutes.js | inline | - | - |  |  | yes |  |
| GET | '/tenants' | src/scalable/admin/AdminApiRoutes.js | inline | - | - |  |  | yes |  |
| GET | '/tenants/:id' | src/scalable/admin/AdminApiRoutes.js | inline | - | - |  |  | yes |  |
| POST | '/tenants' | src/scalable/admin/AdminApiRoutes.js | inline | - | - |  |  | yes |  |
| PATCH | '/tenants/:id' | src/scalable/admin/AdminApiRoutes.js | inline | - | - |  |  | yes |  |
| POST | '/tenants/:id/suspend' | src/scalable/admin/AdminApiRoutes.js | inline | - | - |  |  | yes |  |
| POST | '/tenants/:id/activate' | src/scalable/admin/AdminApiRoutes.js | inline | - | - |  |  | yes |  |
| POST | '/tenants/:id/upgrade' | src/scalable/admin/AdminApiRoutes.js | inline | - | - |  |  | yes |  |
| GET | '/metrics/overview' | src/scalable/admin/AdminApiRoutes.js | inline | - | - |  |  | yes |  |
| GET | '/metrics/messages' | src/scalable/admin/AdminApiRoutes.js | inline | - | - |  |  | yes |  |
| POST | '/operations/reset-daily-usage' | src/scalable/admin/AdminApiRoutes.js | inline | - | - |  |  | yes |  |
| POST | '/operations/broadcast' | src/scalable/admin/AdminApiRoutes.js | inline | - | - |  |  | yes |  |
| GET | '/health' | src/scalable/admin/AdminApiRoutes.js | inline | - | - |  |  | yes | yes |

## Duplicate Route Keys (method+path)

- GET '/api/agents/my' (count=2)
- GET '/' (count=3)
- POST '/api/leads/update-stage' (count=2)
- GET '/api/leads' (count=2)
- GET '/health' (count=2)
- GET '/api/version' (count=2)
- GET '/:id' (count=2)
- POST '/' (count=2)
- PUT '/:id' (count=2)
- DELETE '/:id' (count=2)
- POST '/from-template' (count=2)

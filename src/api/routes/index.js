/**
 * @file index.js
 * @description Agregador de todas as rotas do sistema ORBION
 * Monta todas as rotas modulares em um único router
 */

import express from 'express';

// Import all route modules
import webhookRoutes from './webhook.routes.js';
import healthRoutes from './health.routes.js'; // Wave 7
import metricsRoutes from './metrics.routes.js'; // Wave 7
import adminRoutes from './admin.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import whatsappRoutes from './whatsapp.routes.js';
import learningRoutes from './learning.routes.js';
import calibrationRoutes from './calibration.routes.js';
import debugRoutes from './debug.routes.js';
import portsRoutes from './ports.routes.js';
import calendarRoutes from './google/calendar.routes.js';
import sheetsRoutes from './google/sheets.routes.js';
import analyticsRoutes from './analytics.routes.js';
import funilRoutes from './funil.routes.js';
import pipelineRoutes from './pipeline.routes.js';
import clientesRoutes from './clientes.routes.js';
import meetingsRoutes from './meetings.routes.js';
import automationRoutes from './automation.routes.js';

// CRM Routes
import crmDashboardRoutes from './crm/dashboard.routes.js';
import accountsRoutes from './crm/accounts.routes.js';
import contactsRoutes from './crm/contacts.routes.js';
import leadsRoutes from './crm/leads.routes.js';
import opportunitiesRoutes from './crm/opportunities.routes.js';

// New CRM Module Routes
import authRoutes from './auth.routes.js';
import commandCenterRoutes from './command-center.routes.js';
import leadScoringRoutes from './lead-scoring.routes.js';
import activitiesRoutes from './activities.routes.js';
import teamRoutes from './team.routes.js';
import forecastingRoutes from './forecasting.routes.js';
import reportsRoutes from './reports.routes.js';
import aiInsightsRoutes from './ai-insights.routes.js';
import notificationsRoutes from './notifications.routes.js';
import cadenceRoutes from './cadence.routes.js';
import prospectingRoutes from './prospecting.routes.js';
import websiteRoutes from './website.routes.js';
import emailOptInRoutes from './email-optin.routes.js';
import agentsRoutes from './agents.routes.js';
import channelsRoutes from './channels.routes.js';
import conversationsRoutes from './conversations.routes.js';
import auditRoutes from './audit.routes.js';
import billingRoutes from './billing.routes.js';
import settingsRoutes from './settings.routes.js';
import webhooksInboundRoutes from './webhooks-inbound.routes.js';
import crmIntegrationRoutes from './crm-integration.routes.js';
import versionRoutes from './version.routes.js';

const router = express.Router();

console.log(' Montando rotas modulares...');

// Mount all routes
router.use(webhookRoutes);          // POST /api/webhook/evolution
router.use(healthRoutes);            // /health, /health/detailed, /health/ready, /health/live (Wave 7)
router.use(metricsRoutes);           // /api/metrics, /api/metrics/summary (Wave 7)
router.use(adminRoutes);             // /api/health, /api/stats, /api/admin/*
router.use(dashboardRoutes);         // /, /api/chat, /api/tts/elevenlabs, /api/dashboard/*
router.use(whatsappRoutes);          // /api/whatsapp/*, /api/campaign/*
router.use(learningRoutes);          // /api/learning/*
router.use(calibrationRoutes);       // /api/calibration/*
router.use(debugRoutes);             // /api/debug/*
router.use(portsRoutes);             // /api/ports/*
router.use(calendarRoutes);          // /auth/google, /oauth2callback, /api/calendar/*, /api/events*
router.use(sheetsRoutes);            // /api/leads, /api/dashboard/leads
router.use(analyticsRoutes);         // /api/analytics/*
router.use(funilRoutes);             // /api/funil/bant*
router.use(pipelineRoutes);          // /api/pipeline*
router.use(clientesRoutes);          // /api/clientes*
router.use(meetingsRoutes);          // /api/meetings/* (Meeting Analysis)
router.use(automationRoutes);        // /api/automations/* (Automation Engine)

// CRM Routes
router.use(crmDashboardRoutes);      // /crm, /crm/
router.use(accountsRoutes);          // /api/crm/accounts*
router.use(contactsRoutes);          // /api/crm/contacts*
router.use(leadsRoutes);             // /api/crm/leads*
router.use(opportunitiesRoutes);     // /api/crm/opportunities*

// New CRM Module Routes
router.use(authRoutes);              // /api/auth/* (login, register, refresh, etc.)
router.use(commandCenterRoutes);     // /api/command-center/*
router.use(leadScoringRoutes);       // /api/scoring/*
router.use(activitiesRoutes);        // /api/activities/*
router.use(teamRoutes);              // /api/team/*
router.use(forecastingRoutes);       // /api/forecasting/*
router.use(reportsRoutes);           // /api/reports/*
router.use(aiInsightsRoutes);        // /api/ai-insights/*
router.use(notificationsRoutes);     // /api/notifications/*
router.use(cadenceRoutes);           // /api/cadences/* (Outbound Cadence Engine)
router.use(prospectingRoutes);       // /api/prospecting/* (Auto Prospecting Engine)
router.use(websiteRoutes);           // /api/website/* (Landing Page Forms)
router.use(emailOptInRoutes);        // /api/email-optin/* (Email Opt-In before WhatsApp)
router.use(agentsRoutes);            // /api/admin/agents/*, /api/agents/*, /api/config/* (Multi-Agent + Config)
router.use(channelsRoutes);          // /api/agents/:agentId/channels/*, /api/integrations/* (Evolution One-Click)
router.use(conversationsRoutes);     // /api/conversations, /api/conversations/:phone/messages
router.use(auditRoutes);             // /api/audit-logs
router.use(billingRoutes);           // /api/billing/plans
router.use(settingsRoutes);          // /api/settings
router.use(webhooksInboundRoutes);   // /api/webhooks/inbound/:publicId (Multi-tenant webhook receiver)
router.use(crmIntegrationRoutes);    // /api/integrations/crm/:provider/* (Kommo, HubSpot, Pipedrive OAuth)
router.use(versionRoutes);           // /api/version, /api/version/short, /health/version (P0-1)

console.log(' Todas as rotas montadas com sucesso');
console.log(' Rotas ativas:');
console.log('   - Webhook (1 rota)');
console.log('   - Health (4 rotas)');
console.log('   - Metrics (3 rotas)');
console.log('   - Admin (15 rotas)');
console.log('   - Dashboard (6 rotas)');
console.log('   - WhatsApp (4 rotas)');
console.log('   - Learning (3 rotas)');
console.log('   - Calibration (2 rotas)');
console.log('   - Debug (1 rota)');
console.log('   - Ports (3 rotas)');
console.log('   - Calendar/Google Auth (10 rotas)');
console.log('   - Google Sheets (2 rotas)');
console.log('   - Analytics (5 rotas)');
console.log('   - Funil BANT (2 rotas)');
console.log('   - Pipeline (5 rotas)');
console.log('   - Clientes (6 rotas)');
console.log('   - CRM Dashboard (2 rotas)');
console.log('   - CRM Accounts (6 rotas)');
console.log('   - CRM Contacts (8 rotas)');
console.log('   - CRM Leads (8 rotas)');
console.log('   - CRM Opportunities (10 rotas)');
console.log('   - Meeting Analysis (17 rotas)');
console.log('   - Automation Engine (12 rotas)');
console.log('   - Auth (8 rotas)');
console.log('   - Command Center (6 rotas)');
console.log('   - Lead Scoring (10 rotas)');
console.log('   - Activities (11 rotas)');
console.log('   - Team Management (13 rotas)');
console.log('   - Forecasting (6 rotas)');
console.log('   - Reports Builder (3 rotas)');
console.log('   - AI Insights (5 rotas)');
console.log('   - Notifications (11 rotas)');
console.log('   - Cadence Engine (15 rotas)');
console.log('   - Email Opt-In (14 rotas)');
console.log('   - Agent Management (30 rotas) - CRUD agentes');
console.log('   - Agent Config (18 rotas) - SPIN, BANT, Objecoes');
console.log('   - Channels/Integrations (6 rotas) - Evolution One-Click');
console.log('   - CRM Integration OAuth (8 rotas) - Kommo, HubSpot, Pipedrive');
console.log('   Total: 299 rotas montadas');

export default router;

#!/usr/bin/env node
import { execSync } from 'child_process';
import fs from 'fs';

const openapi = JSON.parse(fs.readFileSync('openapi.json', 'utf-8'));
openapi.paths ||= {};

const rgOutput = execSync(
  "rg -n \"router\\.(get|post|put|delete|patch)\\\\('/api/\" src/api/routes -g\"*.js\"",
  { encoding: 'utf-8' }
);

const tagForPath = (path) => {
  const seg = path.split('/')[1] || '';
  const map = {
    auth: 'Auth',
    agents: 'Agents',
    admin: 'Admin',
    analytics: 'Analytics',
    'ai-insights': 'AI',
    activities: 'Activities',
    automations: 'Automation',
    automation: 'Automation',
    cadence: 'Cadence',
    cadences: 'Cadence',
    calibration: 'Calibration',
    'command-center': 'CommandCenter',
    crm: 'CRM',
    dashboard: 'Dashboard',
    debug: 'Debug',
    'email-optin': 'EmailOptIn',
    forecasting: 'Forecasting',
    funil: 'Funil',
    health: 'System',
    integrations: 'Integrations',
    learning: 'Learning',
    meetings: 'Meetings',
    metrics: 'Metrics',
    notifications: 'Notifications',
    pipeline: 'Pipeline',
    pipelines: 'Pipeline',
    ports: 'Ports',
    prospecting: 'Prospecting',
    reports: 'Reports',
    scoring: 'Scoring',
    team: 'Team',
    teams: 'Team',
    tts: 'Voice',
    version: 'System',
    webhook: 'Webhooks',
    webhooks: 'Webhooks',
    website: 'Website',
    whatsapp: 'WhatsApp',
    google: 'Google',
    calendar: 'Calendar',
    events: 'Calendar'
  };

  return map[seg] || 'Misc';
};

const lines = rgOutput.split('\n').filter(Boolean);
for (const line of lines) {
  const match = line.match(/router\.(get|post|put|delete|patch)\('\/api\/([^']+)'/);
  if (!match) continue;

  const method = match[1];
  const rawPath = '/' + match[2];
  const path = rawPath.replace(/:([A-Za-z0-9_]+)/g, '{$1}');

  openapi.paths[path] ||= {};
  if (!openapi.paths[path][method]) {
    openapi.paths[path][method] = {
      summary: `${method.toUpperCase()} ${path}`,
      tags: [tagForPath(path)]
    };
  }
}

fs.writeFileSync('openapi.json', JSON.stringify(openapi, null, 2));
console.log('openapi.json updated');

-- ============================================
-- LEADLY AGENT PLATFORM - DATABASE SCHEMA
-- Migration 001: Initial Multi-tenant Schema
-- ============================================

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- ============================================
-- 1. TENANTS (Multi-tenancy)
-- ============================================
CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  plan TEXT DEFAULT 'starter', -- starter, growth, enterprise
  status TEXT DEFAULT 'active', -- active, suspended, cancelled
  settings TEXT, -- JSON: limits, features, branding
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_status ON tenants(status);

-- ============================================
-- 2. USERS
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'operator', -- admin, manager, operator, viewer
  avatar_url TEXT,
  permissions TEXT, -- JSON array of permissions
  last_login DATETIME,
  status TEXT DEFAULT 'active', -- active, inactive, pending
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id, email)
);

CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ============================================
-- 3. AGENTS
-- ============================================
CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'sdr', -- sdr, support, scheduler, custom
  vertical TEXT DEFAULT 'servicos', -- servicos, varejo, saas, educacao, saude
  status TEXT DEFAULT 'draft', -- draft, active, paused, archived
  current_version_id TEXT, -- Reference to published version
  config TEXT NOT NULL, -- JSON: Full AgentConfig
  metrics TEXT, -- JSON: Aggregated metrics
  created_by TEXT REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_agents_tenant ON agents(tenant_id);
CREATE INDEX idx_agents_type ON agents(type);
CREATE INDEX idx_agents_status ON agents(status);

-- ============================================
-- 4. AGENT VERSIONS (Immutable)
-- ============================================
CREATE TABLE IF NOT EXISTS agent_versions (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  version TEXT NOT NULL, -- semver: 1.0.0, 1.0.1, etc
  config_snapshot TEXT NOT NULL, -- JSON: Complete config at time of publish
  compiled_prompt TEXT NOT NULL, -- Compiled prompt output
  build_report TEXT, -- JSON: Build report from compiler
  status TEXT DEFAULT 'draft', -- draft, published, deprecated
  published_at DATETIME,
  published_by TEXT REFERENCES users(id),
  changelog TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(agent_id, version)
);

CREATE INDEX idx_versions_agent ON agent_versions(agent_id);
CREATE INDEX idx_versions_status ON agent_versions(status);

-- ============================================
-- 5. CONVERSATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL REFERENCES agents(id),
  agent_version_id TEXT REFERENCES agent_versions(id),
  contact_id TEXT NOT NULL, -- External contact identifier
  channel TEXT DEFAULT 'whatsapp', -- whatsapp, webchat, telegram, email
  status TEXT DEFAULT 'active', -- active, waiting_human, closed, archived
  state_machine_data TEXT, -- JSON: Serialized state machine
  qualification_data TEXT, -- JSON: SPIN + BANT data
  lead_score INTEGER DEFAULT 0,
  lead_status TEXT, -- SQL, MQL, nurturing, disqualified
  assigned_to TEXT REFERENCES users(id),
  metadata TEXT, -- JSON: Channel-specific data
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_message_at DATETIME,
  closed_at DATETIME,
  close_reason TEXT
);

CREATE INDEX idx_conversations_tenant ON conversations(tenant_id);
CREATE INDEX idx_conversations_agent ON conversations(agent_id);
CREATE INDEX idx_conversations_contact ON conversations(contact_id);
CREATE INDEX idx_conversations_status ON conversations(status);
CREATE INDEX idx_conversations_lead_status ON conversations(lead_status);

-- ============================================
-- 6. MESSAGES
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- user, assistant, system, tool
  content TEXT NOT NULL,
  metadata TEXT, -- JSON: Attachments, reactions, etc
  tool_calls TEXT, -- JSON: Tool calls made (for assistant messages)
  token_count INTEGER DEFAULT 0,
  latency_ms INTEGER, -- Response time
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_role ON messages(role);
CREATE INDEX idx_messages_created ON messages(created_at);

-- ============================================
-- 7. TOOL CALLS (Audit Trail)
-- ============================================
CREATE TABLE IF NOT EXISTS tool_calls (
  id TEXT PRIMARY KEY,
  message_id TEXT REFERENCES messages(id) ON DELETE CASCADE,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  input TEXT, -- JSON: Tool input parameters
  output TEXT, -- JSON: Tool output
  status TEXT DEFAULT 'success', -- success, error, timeout
  error_message TEXT,
  execution_time_ms INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tool_calls_conversation ON tool_calls(conversation_id);
CREATE INDEX idx_tool_calls_tool ON tool_calls(tool_name);
CREATE INDEX idx_tool_calls_status ON tool_calls(status);

-- ============================================
-- 8. CONTACTS
-- ============================================
CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL, -- Phone, email, etc
  channel TEXT DEFAULT 'whatsapp',
  name TEXT,
  email TEXT,
  phone TEXT,
  company TEXT,
  profile_data TEXT, -- JSON: Additional profile info
  tags TEXT, -- JSON array of tags
  score INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active', -- active, blocked, opted_out
  first_contact_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_contact_at DATETIME,
  total_conversations INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id, external_id, channel)
);

CREATE INDEX idx_contacts_tenant ON contacts(tenant_id);
CREATE INDEX idx_contacts_external ON contacts(external_id);
CREATE INDEX idx_contacts_phone ON contacts(phone);
CREATE INDEX idx_contacts_status ON contacts(status);

-- ============================================
-- 9. KNOWLEDGE BASE
-- ============================================
CREATE TABLE IF NOT EXISTS knowledge_docs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id TEXT REFERENCES agents(id) ON DELETE SET NULL, -- NULL = shared
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  doc_type TEXT DEFAULT 'faq', -- faq, policy, product, procedure
  category TEXT,
  keywords TEXT, -- JSON array
  embedding TEXT, -- JSON: Vector embedding
  is_active INTEGER DEFAULT 1,
  priority INTEGER DEFAULT 0, -- Higher = more important
  created_by TEXT REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_knowledge_tenant ON knowledge_docs(tenant_id);
CREATE INDEX idx_knowledge_agent ON knowledge_docs(agent_id);
CREATE INDEX idx_knowledge_type ON knowledge_docs(doc_type);
CREATE INDEX idx_knowledge_active ON knowledge_docs(is_active);

-- ============================================
-- 10. INTEGRATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS integrations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- whatsapp, calendar, crm, erp, webhook
  provider TEXT, -- evolution, google, hubspot, etc
  name TEXT NOT NULL,
  config TEXT NOT NULL, -- JSON: Encrypted credentials and settings
  status TEXT DEFAULT 'pending', -- pending, active, error, disabled
  last_sync_at DATETIME,
  error_message TEXT,
  metadata TEXT, -- JSON: Provider-specific data
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_integrations_tenant ON integrations(tenant_id);
CREATE INDEX idx_integrations_type ON integrations(type);
CREATE INDEX idx_integrations_status ON integrations(status);

-- ============================================
-- 11. SCHEDULED MEETINGS
-- ============================================
CREATE TABLE IF NOT EXISTS scheduled_meetings (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  conversation_id TEXT REFERENCES conversations(id),
  contact_id TEXT NOT NULL REFERENCES contacts(id),
  agent_id TEXT REFERENCES agents(id),
  assigned_to TEXT REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  scheduled_at DATETIME NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  timezone TEXT DEFAULT 'America/Sao_Paulo',
  status TEXT DEFAULT 'scheduled', -- scheduled, confirmed, completed, cancelled, no_show
  meeting_type TEXT DEFAULT 'discovery', -- discovery, demo, follow_up
  meeting_link TEXT, -- Google Meet, Zoom, etc
  calendar_event_id TEXT, -- External calendar ID
  reminder_sent INTEGER DEFAULT 0,
  notes TEXT,
  outcome TEXT, -- JSON: Meeting outcome data
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_meetings_tenant ON scheduled_meetings(tenant_id);
CREATE INDEX idx_meetings_contact ON scheduled_meetings(contact_id);
CREATE INDEX idx_meetings_scheduled ON scheduled_meetings(scheduled_at);
CREATE INDEX idx_meetings_status ON scheduled_meetings(status);

-- ============================================
-- 12. HANDOFF SESSIONS
-- ============================================
CREATE TABLE IF NOT EXISTS handoff_sessions (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  from_agent_id TEXT REFERENCES agents(id),
  to_user_id TEXT REFERENCES users(id),
  reason TEXT NOT NULL, -- escalation_requested, complex_issue, sales_opportunity, etc
  context_summary TEXT, -- AI-generated summary
  priority TEXT DEFAULT 'normal', -- low, normal, high, urgent
  status TEXT DEFAULT 'pending', -- pending, accepted, in_progress, resolved, returned
  accepted_at DATETIME,
  resolved_at DATETIME,
  resolution_notes TEXT,
  satisfaction_rating INTEGER, -- 1-5
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_handoff_conversation ON handoff_sessions(conversation_id);
CREATE INDEX idx_handoff_user ON handoff_sessions(to_user_id);
CREATE INDEX idx_handoff_status ON handoff_sessions(status);
CREATE INDEX idx_handoff_priority ON handoff_sessions(priority);

-- ============================================
-- 13. RESPONSE TEMPLATES
-- ============================================
CREATE TABLE IF NOT EXISTS response_templates (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id TEXT REFERENCES agents(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  category TEXT, -- greeting, objection, faq, closing, etc
  content TEXT NOT NULL,
  variables TEXT, -- JSON: [{name, description, default}]
  is_active INTEGER DEFAULT 1,
  usage_count INTEGER DEFAULT 0,
  created_by TEXT REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_templates_tenant ON response_templates(tenant_id);
CREATE INDEX idx_templates_category ON response_templates(category);

-- ============================================
-- 14. AUDIT LOG
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id),
  action TEXT NOT NULL, -- create, update, delete, login, etc
  entity_type TEXT NOT NULL, -- agent, conversation, user, etc
  entity_id TEXT,
  old_value TEXT, -- JSON: Before
  new_value TEXT, -- JSON: After
  ip_address TEXT,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_tenant ON audit_logs(tenant_id);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);

-- ============================================
-- 15. METRICS (Time-series aggregations)
-- ============================================
CREATE TABLE IF NOT EXISTS agent_metrics (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  period TEXT NOT NULL, -- hourly, daily, weekly, monthly
  period_start DATETIME NOT NULL,
  total_conversations INTEGER DEFAULT 0,
  total_messages INTEGER DEFAULT 0,
  avg_response_time_ms INTEGER,
  avg_messages_per_conversation REAL,
  qualification_rate REAL, -- % of SQLs
  handoff_rate REAL, -- % escalated to human
  meetings_scheduled INTEGER DEFAULT 0,
  meetings_completed INTEGER DEFAULT 0,
  satisfaction_avg REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(agent_id, period, period_start)
);

CREATE INDEX idx_metrics_tenant ON agent_metrics(tenant_id);
CREATE INDEX idx_metrics_agent ON agent_metrics(agent_id);
CREATE INDEX idx_metrics_period ON agent_metrics(period, period_start);

-- ============================================
-- 16. WEBHOOKS
-- ============================================
CREATE TABLE IF NOT EXISTS webhooks (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  events TEXT NOT NULL, -- JSON array: ["conversation.started", "lead.qualified", etc]
  secret TEXT, -- For signature verification
  is_active INTEGER DEFAULT 1,
  retry_count INTEGER DEFAULT 3,
  last_triggered_at DATETIME,
  last_status INTEGER, -- HTTP status code
  failure_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_webhooks_tenant ON webhooks(tenant_id);
CREATE INDEX idx_webhooks_active ON webhooks(is_active);

-- ============================================
-- 17. WEBHOOK DELIVERIES
-- ============================================
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id TEXT PRIMARY KEY,
  webhook_id TEXT NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  payload TEXT NOT NULL, -- JSON
  response_status INTEGER,
  response_body TEXT,
  attempt INTEGER DEFAULT 1,
  delivered_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_deliveries_webhook ON webhook_deliveries(webhook_id);
CREATE INDEX idx_deliveries_created ON webhook_deliveries(created_at);

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at
CREATE TRIGGER IF NOT EXISTS trg_tenants_updated
AFTER UPDATE ON tenants
BEGIN
  UPDATE tenants SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_users_updated
AFTER UPDATE ON users
BEGIN
  UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_agents_updated
AFTER UPDATE ON agents
BEGIN
  UPDATE agents SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_contacts_updated
AFTER UPDATE ON contacts
BEGIN
  UPDATE contacts SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- ============================================
-- SEED DATA
-- ============================================

-- Default tenant for development
INSERT OR IGNORE INTO tenants (id, name, slug, plan, status, settings) VALUES (
  'tenant_default',
  'LEADLY Demo',
  'leadly-demo',
  'enterprise',
  'active',
  '{"max_agents": 10, "max_users": 50, "max_conversations_month": 10000, "features": ["sdr", "support", "scheduler", "analytics", "integrations"]}'
);

-- Default admin user
INSERT OR IGNORE INTO users (id, tenant_id, email, password_hash, name, role, permissions) VALUES (
  'user_admin',
  'tenant_default',
  'admin@leadly.ai',
  '$2b$10$placeholder_hash_replace_in_app', -- Replace with bcrypt hash
  'Admin LEADLY',
  'admin',
  '["*"]'
);

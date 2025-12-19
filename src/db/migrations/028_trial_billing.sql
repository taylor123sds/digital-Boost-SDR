-- ============================================================================
-- Migration 028: Trial & Billing System
-- ============================================================================
-- Adds billing/subscription tracking to teams
-- Implements anti-abuse: trial only once per user
-- ============================================================================

-- ============================================================================
-- STEP 1: Add billing columns to teams
-- ============================================================================

-- Billing status: trial | trial_expired | paid | suspended
ALTER TABLE teams ADD COLUMN billing_status TEXT DEFAULT 'trial'
  CHECK(billing_status IN ('trial', 'trial_expired', 'paid', 'suspended'));

-- Trial tracking
ALTER TABLE teams ADD COLUMN trial_started_at TEXT DEFAULT (datetime('now'));
ALTER TABLE teams ADD COLUMN trial_ends_at TEXT;

-- Paid subscription tracking
ALTER TABLE teams ADD COLUMN paid_until TEXT;
ALTER TABLE teams ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE teams ADD COLUMN stripe_subscription_id TEXT;

-- Plan limits
ALTER TABLE teams ADD COLUMN max_agents INTEGER DEFAULT 1;
ALTER TABLE teams ADD COLUMN max_messages_per_month INTEGER DEFAULT 1000;
ALTER TABLE teams ADD COLUMN messages_used_this_month INTEGER DEFAULT 0;
ALTER TABLE teams ADD COLUMN billing_cycle_start TEXT;

-- Set trial_ends_at for existing teams (7 days from now)
UPDATE teams
SET trial_ends_at = datetime('now', '+7 days'),
    trial_started_at = datetime('now')
WHERE trial_ends_at IS NULL;

-- ============================================================================
-- STEP 2: Create user_trial_grants table (anti-abuse)
-- ============================================================================
-- Ensures each user can only consume one trial, regardless of team

CREATE TABLE IF NOT EXISTS user_trial_grants (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  trial_consumed_at TEXT NOT NULL DEFAULT (datetime('now')),
  first_team_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_trial_grants_user ON user_trial_grants(user_id);
CREATE INDEX IF NOT EXISTS idx_user_trial_grants_email ON user_trial_grants(email);

-- ============================================================================
-- STEP 3: Create subscription_plans table
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  price_monthly REAL DEFAULT 0,
  price_yearly REAL DEFAULT 0,
  currency TEXT DEFAULT 'BRL',
  max_agents INTEGER DEFAULT 1,
  max_messages_per_month INTEGER DEFAULT 1000,
  max_integrations INTEGER DEFAULT 1,
  features_json TEXT DEFAULT '{}',
  is_active INTEGER DEFAULT 1,
  stripe_price_id_monthly TEXT,
  stripe_price_id_yearly TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Insert default plans
INSERT OR IGNORE INTO subscription_plans (id, name, slug, description, price_monthly, max_agents, max_messages_per_month, max_integrations, features_json)
VALUES
  ('plan_trial', 'Trial', 'trial', 'Teste gratuito por 7 dias', 0, 1, 500, 1, '{"whatsapp": true, "crm_sync": false, "analytics_basic": true}'),
  ('plan_starter', 'Starter', 'starter', 'Para pequenas equipes', 197, 1, 2000, 2, '{"whatsapp": true, "crm_sync": true, "analytics_basic": true}'),
  ('plan_pro', 'Professional', 'pro', 'Para equipes em crescimento', 497, 3, 10000, 5, '{"whatsapp": true, "crm_sync": true, "analytics_advanced": true, "priority_support": true}'),
  ('plan_enterprise', 'Enterprise', 'enterprise', 'Para grandes operacoes', 997, 10, 50000, 999, '{"whatsapp": true, "crm_sync": true, "analytics_advanced": true, "priority_support": true, "custom_integrations": true, "dedicated_support": true}');

-- ============================================================================
-- STEP 4: Create billing_events table (audit trail)
-- ============================================================================

CREATE TABLE IF NOT EXISTS billing_events (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  team_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK(event_type IN (
    'trial_started', 'trial_extended', 'trial_expired',
    'subscription_created', 'subscription_updated', 'subscription_cancelled',
    'payment_succeeded', 'payment_failed',
    'plan_upgraded', 'plan_downgraded',
    'usage_limit_warning', 'usage_limit_reached'
  )),
  description TEXT,
  metadata_json TEXT DEFAULT '{}',
  amount REAL,
  currency TEXT DEFAULT 'BRL',
  stripe_event_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_billing_events_team ON billing_events(team_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_type ON billing_events(event_type);
CREATE INDEX IF NOT EXISTS idx_billing_events_created ON billing_events(created_at);

-- ============================================================================
-- STEP 5: Create usage_metrics table
-- ============================================================================

CREATE TABLE IF NOT EXISTS usage_metrics (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  team_id TEXT NOT NULL,
  metric_type TEXT NOT NULL CHECK(metric_type IN (
    'messages_sent', 'messages_received', 'ai_calls',
    'audio_transcriptions', 'crm_syncs', 'api_calls'
  )),
  count INTEGER DEFAULT 0,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(team_id, metric_type, period_start),
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_usage_metrics_team ON usage_metrics(team_id);
CREATE INDEX IF NOT EXISTS idx_usage_metrics_period ON usage_metrics(period_start, period_end);

-- ============================================================================
-- STEP 6: Views for billing queries
-- ============================================================================

-- View: Teams with active trial
CREATE VIEW IF NOT EXISTS v_teams_active_trial AS
SELECT
  t.*,
  julianday(t.trial_ends_at) - julianday('now') as days_remaining,
  CASE
    WHEN datetime(t.trial_ends_at) > datetime('now') THEN 1
    ELSE 0
  END as is_trial_active
FROM teams t
WHERE t.billing_status = 'trial';

-- View: Teams needing trial expiration
CREATE VIEW IF NOT EXISTS v_teams_trial_expiring AS
SELECT
  t.*,
  julianday(t.trial_ends_at) - julianday('now') as days_remaining
FROM teams t
WHERE t.billing_status = 'trial'
  AND datetime(t.trial_ends_at) <= datetime('now');

-- ============================================================================
-- DONE
-- ============================================================================

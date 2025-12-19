-- ============================================================================
-- Migration 030: CRM Integration Support
-- ============================================================================
-- Tables for OAuth flows, sync cursors, and ID mappings
-- Supports Kommo, HubSpot, Pipedrive, etc.
-- ============================================================================

-- ============================================================================
-- STEP 1: OAuth States (CSRF protection for OAuth flows)
-- ============================================================================

CREATE TABLE IF NOT EXISTS oauth_states (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tenant_id TEXT NOT NULL,
  integration_id TEXT,
  provider TEXT NOT NULL,
  state TEXT NOT NULL UNIQUE,
  redirect_uri TEXT,
  scopes TEXT,
  metadata_json TEXT DEFAULT '{}',
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES teams(id) ON DELETE CASCADE,
  FOREIGN KEY (integration_id) REFERENCES integrations(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_oauth_states_state ON oauth_states(state);
CREATE INDEX IF NOT EXISTS idx_oauth_states_tenant ON oauth_states(tenant_id);
CREATE INDEX IF NOT EXISTS idx_oauth_states_expires ON oauth_states(expires_at);

-- ============================================================================
-- STEP 2: CRM Sync Cursors (for incremental sync)
-- ============================================================================

CREATE TABLE IF NOT EXISTS crm_sync_cursors (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tenant_id TEXT NOT NULL,
  integration_id TEXT NOT NULL,
  entity TEXT NOT NULL CHECK(entity IN ('lead', 'contact', 'deal', 'activity', 'pipeline', 'user')),
  cursor_value TEXT,
  cursor_type TEXT DEFAULT 'timestamp',
  last_sync_at TEXT,
  sync_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(integration_id, entity),
  FOREIGN KEY (tenant_id) REFERENCES teams(id) ON DELETE CASCADE,
  FOREIGN KEY (integration_id) REFERENCES integrations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_crm_sync_cursors_integration ON crm_sync_cursors(integration_id);

-- ============================================================================
-- STEP 3: CRM ID Mappings (local ID <-> remote ID)
-- ============================================================================

CREATE TABLE IF NOT EXISTS crm_mappings (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tenant_id TEXT NOT NULL,
  integration_id TEXT NOT NULL,
  entity TEXT NOT NULL CHECK(entity IN ('lead', 'contact', 'deal', 'activity', 'pipeline', 'user')),
  local_id TEXT NOT NULL,
  remote_id TEXT NOT NULL,
  remote_data_json TEXT DEFAULT '{}',
  sync_status TEXT DEFAULT 'synced' CHECK(sync_status IN ('synced', 'pending', 'error', 'deleted')),
  last_synced_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(integration_id, entity, local_id),
  UNIQUE(integration_id, entity, remote_id),
  FOREIGN KEY (tenant_id) REFERENCES teams(id) ON DELETE CASCADE,
  FOREIGN KEY (integration_id) REFERENCES integrations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_crm_mappings_integration ON crm_mappings(integration_id);
CREATE INDEX IF NOT EXISTS idx_crm_mappings_local ON crm_mappings(local_id);
CREATE INDEX IF NOT EXISTS idx_crm_mappings_remote ON crm_mappings(remote_id);
CREATE INDEX IF NOT EXISTS idx_crm_mappings_entity ON crm_mappings(entity);

-- ============================================================================
-- STEP 4: CRM Sync Jobs (for async processing)
-- ============================================================================

CREATE TABLE IF NOT EXISTS crm_sync_jobs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tenant_id TEXT NOT NULL,
  integration_id TEXT NOT NULL,
  job_type TEXT NOT NULL CHECK(job_type IN (
    'full_sync', 'incremental_sync', 'push_lead', 'push_contact',
    'push_deal', 'push_activity', 'pull_updates', 'webhook_process'
  )),
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  priority INTEGER DEFAULT 5,
  payload_json TEXT DEFAULT '{}',
  result_json TEXT,
  error_message TEXT,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  scheduled_at TEXT DEFAULT (datetime('now')),
  started_at TEXT,
  completed_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES teams(id) ON DELETE CASCADE,
  FOREIGN KEY (integration_id) REFERENCES integrations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_crm_sync_jobs_integration ON crm_sync_jobs(integration_id);
CREATE INDEX IF NOT EXISTS idx_crm_sync_jobs_status ON crm_sync_jobs(status);
CREATE INDEX IF NOT EXISTS idx_crm_sync_jobs_scheduled ON crm_sync_jobs(scheduled_at);

-- ============================================================================
-- STEP 5: CRM Field Mappings (custom field mapping per integration)
-- ============================================================================

CREATE TABLE IF NOT EXISTS crm_field_mappings (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tenant_id TEXT NOT NULL,
  integration_id TEXT NOT NULL,
  entity TEXT NOT NULL,
  local_field TEXT NOT NULL,
  remote_field TEXT NOT NULL,
  transform_type TEXT DEFAULT 'direct' CHECK(transform_type IN ('direct', 'format', 'lookup', 'custom')),
  transform_config_json TEXT DEFAULT '{}',
  is_required INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(integration_id, entity, local_field),
  FOREIGN KEY (tenant_id) REFERENCES teams(id) ON DELETE CASCADE,
  FOREIGN KEY (integration_id) REFERENCES integrations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_crm_field_mappings_integration ON crm_field_mappings(integration_id);

-- ============================================================================
-- STEP 6: Add CRM-specific columns to integrations
-- ============================================================================

-- oauth_tokens_encrypted stores: { access_token, refresh_token, expires_at, token_type }
-- Note: These should be encrypted with a key from environment

-- Add index for faster CRM integration lookups
CREATE INDEX IF NOT EXISTS idx_integrations_provider_status ON integrations(provider, status);

-- ============================================================================
-- STEP 7: Views for CRM monitoring
-- ============================================================================

-- View: Active CRM integrations
CREATE VIEW IF NOT EXISTS v_active_crm_integrations AS
SELECT
  i.*,
  t.name as team_name,
  (SELECT COUNT(*) FROM crm_mappings m WHERE m.integration_id = i.id) as total_mappings,
  (SELECT MAX(last_synced_at) FROM crm_sync_cursors c WHERE c.integration_id = i.id) as last_sync
FROM integrations i
JOIN teams t ON i.tenant_id = t.id
WHERE i.provider IN ('kommo', 'hubspot', 'pipedrive', 'salesforce')
  AND i.is_active = 1;

-- View: Pending sync jobs
CREATE VIEW IF NOT EXISTS v_pending_crm_jobs AS
SELECT
  j.*,
  i.provider,
  i.instance_name
FROM crm_sync_jobs j
JOIN integrations i ON j.integration_id = i.id
WHERE j.status IN ('pending', 'running')
ORDER BY j.priority DESC, j.scheduled_at ASC;

-- ============================================================================
-- DONE
-- ============================================================================

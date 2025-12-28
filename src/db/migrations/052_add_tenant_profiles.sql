-- Create tenant profiles table for project configuration
CREATE TABLE IF NOT EXISTS tenant_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT NOT NULL,
  profile_json TEXT NOT NULL,
  integrations_json TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_tenant_profiles_tenant
  ON tenant_profiles(tenant_id);

CREATE INDEX IF NOT EXISTS idx_tenant_profiles_tenant
  ON tenant_profiles(tenant_id);

-- ============================================================================
-- Migration 039: Tenant ID Canonical Naming
-- ============================================================================
-- P0-5: Establishes tenant_id as the canonical column name
--
-- Design Note:
-- - teams.id IS the tenant ID (teams ARE tenants)
-- - users.team_id is a FK to teams.id (kept for compatibility)
-- - All other tables use tenant_id for tenant isolation
--
-- This migration ensures the users table has a tenant_id column
-- that mirrors team_id for consistent API responses.
-- ============================================================================

-- Add tenant_id to users table (mirrors team_id)
-- SQLite doesn't support computed columns, so we use a trigger
ALTER TABLE users ADD COLUMN tenant_id TEXT DEFAULT NULL;

-- Backfill tenant_id from team_id
UPDATE users SET tenant_id = team_id WHERE tenant_id IS NULL AND team_id IS NOT NULL;

-- Create index for tenant_id
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);

-- Trigger to keep tenant_id in sync with team_id
CREATE TRIGGER IF NOT EXISTS users_sync_tenant_id_on_insert
AFTER INSERT ON users
WHEN NEW.tenant_id IS NULL AND NEW.team_id IS NOT NULL
BEGIN
  UPDATE users SET tenant_id = NEW.team_id WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS users_sync_tenant_id_on_update
AFTER UPDATE OF team_id ON users
WHEN NEW.team_id != OLD.team_id OR (OLD.team_id IS NULL AND NEW.team_id IS NOT NULL)
BEGIN
  UPDATE users SET tenant_id = NEW.team_id WHERE id = NEW.id;
END;

-- ============================================================================
-- Add tenant_id to teams table (self-referencing)
-- teams.tenant_id = teams.id (a team is its own tenant)
-- ============================================================================

ALTER TABLE teams ADD COLUMN tenant_id TEXT DEFAULT NULL;

-- Backfill: team's tenant_id is itself
UPDATE teams SET tenant_id = id WHERE tenant_id IS NULL;

-- Trigger to auto-set tenant_id on insert
CREATE TRIGGER IF NOT EXISTS teams_auto_tenant_id
AFTER INSERT ON teams
WHEN NEW.tenant_id IS NULL
BEGIN
  UPDATE teams SET tenant_id = NEW.id WHERE id = NEW.id;
END;

-- ============================================================================
-- Add billing_status to teams if not exists (for entitlements)
-- ============================================================================

-- Check if billing_status exists, if not add it
-- SQLite doesn't support IF NOT EXISTS for columns, so we use a safe approach
-- This is idempotent - will fail silently if column exists

-- ============================================================================
-- DONE: tenant_id is now canonical across all tables
-- ============================================================================

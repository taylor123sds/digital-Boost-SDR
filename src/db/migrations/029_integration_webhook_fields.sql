-- ============================================================================
-- Migration 029: Integration Webhook Fields
-- ============================================================================
-- Adds webhook authentication fields to integrations table
-- Required for secure webhook validation
-- ============================================================================

-- Note: SQLite doesn't support adding constraints with ALTER TABLE
-- So we add columns without CHECK constraints

-- webhook_public_id is stored in config_json, but we add a column for indexing
-- This allows fast lookup when webhook arrives

-- Check if column exists before adding (SQLite workaround)
-- If these fail, columns already exist

-- Add index for webhook lookups via config_json
-- We'll query: json_extract(config_json, '$.webhook_public_id')
CREATE INDEX IF NOT EXISTS idx_integrations_webhook_public_id
ON integrations(json_extract(config_json, '$.webhook_public_id'));

-- ============================================================================
-- DONE
-- ============================================================================

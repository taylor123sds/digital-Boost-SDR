-- ============================================================================
-- Migration 036: Anti-Abuse Enhancements
-- ============================================================================
-- Adds normalized_email for catching +alias and dot variations
-- Adds IP index for efficient trial limit checks
-- ============================================================================

-- Add normalized_email column for catching email variations
ALTER TABLE user_trial_grants ADD COLUMN normalized_email TEXT;

-- Create index on ip_address for efficient IP-based trial limit queries
CREATE INDEX IF NOT EXISTS idx_user_trial_grants_ip ON user_trial_grants(ip_address);

-- Create index on normalized_email for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_trial_grants_normalized_email ON user_trial_grants(normalized_email);

-- Create index on created_at for time-window queries (3 trials per 7 days)
CREATE INDEX IF NOT EXISTS idx_user_trial_grants_created ON user_trial_grants(created_at);

-- ============================================================================
-- DONE
-- ============================================================================

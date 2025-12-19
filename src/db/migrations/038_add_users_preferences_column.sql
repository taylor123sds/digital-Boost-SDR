-- Migration: Add missing preferences column to users table
-- This fixes the registration error: "table users has no column named preferences"

-- Add preferences column if it doesn't exist
-- SQLite doesn't support IF NOT EXISTS for ALTER TABLE, so we use a workaround
-- The migration runner should handle duplicate column errors gracefully

ALTER TABLE users ADD COLUMN preferences TEXT DEFAULT '{}';

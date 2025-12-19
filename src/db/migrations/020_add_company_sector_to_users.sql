-- Migration: Add company and sector to users table
-- Description: Support multi-tenant registration with company info
-- Created: 2025-12-16

-- Add company and sector columns to users table
ALTER TABLE users ADD COLUMN company TEXT;
ALTER TABLE users ADD COLUMN sector TEXT;

-- Create index for company lookups
CREATE INDEX IF NOT EXISTS idx_users_company ON users(company);
CREATE INDEX IF NOT EXISTS idx_users_sector ON users(sector);

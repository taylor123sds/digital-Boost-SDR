-- Migration: Create users table
-- Description: User management for SDR team
-- Created: 2025-12-01

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'sdr' CHECK (role IN ('admin', 'manager', 'sdr', 'viewer')),
    team_id TEXT,
    is_active INTEGER DEFAULT 1,
    last_login TEXT,
    refresh_token TEXT,
    preferences TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
    -- Note: team_id references teams table (created in migration 014)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_team ON users(team_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

-- Auto-update trigger
CREATE TRIGGER IF NOT EXISTS users_updated_at
AFTER UPDATE ON users
BEGIN
    UPDATE users SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- Insert default admin user (password: admin123)
INSERT OR IGNORE INTO users (id, email, name, password_hash, role, is_active)
VALUES (
    'usr_admin_default',
    'admin@orbion.ai',
    'Administrador',
    '$2a$10$rQZ8K1HxQv5vQv5vQv5vQexxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    'admin',
    1
);

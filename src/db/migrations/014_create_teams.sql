-- Migration: Create teams table
-- Description: Team management and hierarchy
-- Created: 2025-12-01

CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL,
    description TEXT,
    manager_id TEXT,
    quota_monthly REAL DEFAULT 0,
    quota_quarterly REAL DEFAULT 0,
    color TEXT DEFAULT '#18c5ff',
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Junction table for user-team relationships (many-to-many)
CREATE TABLE IF NOT EXISTS user_teams (
    user_id TEXT NOT NULL,
    team_id TEXT NOT NULL,
    role TEXT DEFAULT 'member' CHECK (role IN ('leader', 'member')),
    joined_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, team_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_teams_manager ON teams(manager_id);
CREATE INDEX IF NOT EXISTS idx_teams_active ON teams(is_active);
CREATE INDEX IF NOT EXISTS idx_user_teams_user ON user_teams(user_id);
CREATE INDEX IF NOT EXISTS idx_user_teams_team ON user_teams(team_id);

-- Auto-update trigger
CREATE TRIGGER IF NOT EXISTS teams_updated_at
AFTER UPDATE ON teams
BEGIN
    UPDATE teams SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- Insert default team
INSERT OR IGNORE INTO teams (id, name, description, quota_monthly)
VALUES (
    'team_default',
    'Sales Team',
    'Equipe principal de vendas',
    100000.00
);

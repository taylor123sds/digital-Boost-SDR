-- Migration: Create sessions table for JWT auth
-- Description: Session management and token storage
-- Created: 2025-12-01

CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    refresh_token TEXT UNIQUE,
    device_info TEXT,
    ip_address TEXT,
    user_agent TEXT,
    is_valid INTEGER DEFAULT 1,
    expires_at TEXT NOT NULL,
    refresh_expires_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    last_used_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Audit log for security events
CREATE TABLE IF NOT EXISTS auth_audit_log (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT,
    event_type TEXT NOT NULL CHECK (event_type IN (
        'login_success', 'login_failed',
        'logout', 'token_refresh',
        'password_changed', 'password_reset_requested',
        'account_locked', 'account_unlocked',
        'session_invalidated'
    )),
    ip_address TEXT,
    user_agent TEXT,
    details TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Password reset tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    used_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_refresh ON sessions(refresh_token);
CREATE INDEX IF NOT EXISTS idx_sessions_valid ON sessions(is_valid);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_auth_audit_user ON auth_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_audit_event ON auth_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_auth_audit_created ON auth_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_token ON password_reset_tokens(token);

-- View for active sessions
CREATE VIEW IF NOT EXISTS v_active_sessions AS
SELECT
    s.*,
    u.email,
    u.name as user_name,
    u.role
FROM sessions s
JOIN users u ON s.user_id = u.id
WHERE s.is_valid = 1
  AND datetime(s.expires_at) > datetime('now');

-- Cleanup trigger: invalidate expired sessions (would be better as a cron job)
-- This view helps identify sessions to clean up
CREATE VIEW IF NOT EXISTS v_expired_sessions AS
SELECT id, user_id, token
FROM sessions
WHERE datetime(expires_at) < datetime('now')
   OR is_valid = 0;

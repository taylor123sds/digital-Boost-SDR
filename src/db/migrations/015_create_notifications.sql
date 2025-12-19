-- Migration: Create notifications table
-- Description: Real-time notification system
-- Created: 2025-12-01

CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT,
    type TEXT NOT NULL CHECK (type IN (
        'lead_hot', 'lead_new', 'lead_converted',
        'task_overdue', 'task_reminder', 'task_assigned',
        'meeting_reminder', 'meeting_scheduled',
        'deal_won', 'deal_lost', 'deal_stage_changed',
        'system', 'info', 'warning', 'error'
    )),
    title TEXT NOT NULL,
    message TEXT,
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    entity_type TEXT,
    entity_id TEXT,
    action_url TEXT,
    is_read INTEGER DEFAULT 0,
    read_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Notification preferences per user
CREATE TABLE IF NOT EXISTS notification_preferences (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL UNIQUE,
    lead_hot INTEGER DEFAULT 1,
    lead_new INTEGER DEFAULT 1,
    task_overdue INTEGER DEFAULT 1,
    task_reminder INTEGER DEFAULT 1,
    meeting_reminder INTEGER DEFAULT 1,
    deal_updates INTEGER DEFAULT 1,
    email_digest INTEGER DEFAULT 0,
    email_digest_frequency TEXT DEFAULT 'daily' CHECK (email_digest_frequency IN ('never', 'daily', 'weekly')),
    sound_enabled INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_entity ON notifications(entity_type, entity_id);

-- Trigger to set read_at when marking as read
CREATE TRIGGER IF NOT EXISTS notifications_read_at
AFTER UPDATE OF is_read ON notifications
WHEN NEW.is_read = 1 AND OLD.is_read = 0
BEGIN
    UPDATE notifications SET read_at = datetime('now') WHERE id = NEW.id;
END;

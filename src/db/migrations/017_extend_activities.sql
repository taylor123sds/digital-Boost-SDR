-- Migration: Extend activities table
-- Description: Add task management features to activities
-- Created: 2025-12-01

-- Add new columns to activities table (if they don't exist)
-- SQLite doesn't support IF NOT EXISTS for ALTER TABLE, so we use a workaround

-- Check and add due_date column
SELECT CASE
    WHEN NOT EXISTS (SELECT 1 FROM pragma_table_info('activities') WHERE name = 'due_date')
    THEN 'ALTER TABLE activities ADD COLUMN due_date TEXT'
END;

-- For SQLite, we need to handle this differently
-- Creating a new activities table with all columns if it doesn't exist

CREATE TABLE IF NOT EXISTS activities (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),

    -- Relationships (polymorphic)
    lead_id TEXT,
    contact_id TEXT,
    account_id TEXT,
    opportunity_id TEXT,

    -- Activity details
    tipo TEXT NOT NULL CHECK (tipo IN ('call', 'email', 'whatsapp', 'meeting', 'task', 'note', 'follow_up')),
    titulo TEXT NOT NULL,
    descricao TEXT,

    -- Status and priority
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'overdue')),
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),

    -- Scheduling
    due_date TEXT,
    due_time TEXT,
    reminder_at TEXT,
    completed_at TEXT,

    -- Duration (for calls/meetings)
    duration_minutes INTEGER,

    -- Assignment
    owner_id TEXT,
    assigned_to TEXT,

    -- Results
    resultado TEXT,
    notas TEXT,

    -- Metadata
    metadata TEXT DEFAULT '{}',
    tags TEXT DEFAULT '[]',

    -- Timestamps
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),

    -- Foreign keys
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL,
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL,
    FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE SET NULL,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_activities_lead ON activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_activities_contact ON activities(contact_id);
CREATE INDEX IF NOT EXISTS idx_activities_account ON activities(account_id);
CREATE INDEX IF NOT EXISTS idx_activities_opportunity ON activities(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_activities_tipo ON activities(tipo);
CREATE INDEX IF NOT EXISTS idx_activities_status ON activities(status);
CREATE INDEX IF NOT EXISTS idx_activities_priority ON activities(priority);
CREATE INDEX IF NOT EXISTS idx_activities_due_date ON activities(due_date);
CREATE INDEX IF NOT EXISTS idx_activities_owner ON activities(owner_id);
CREATE INDEX IF NOT EXISTS idx_activities_assigned ON activities(assigned_to);
CREATE INDEX IF NOT EXISTS idx_activities_created ON activities(created_at);

-- Auto-update trigger
DROP TRIGGER IF EXISTS activities_updated_at;
CREATE TRIGGER activities_updated_at
AFTER UPDATE ON activities
BEGIN
    UPDATE activities SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- Trigger to set completed_at when status changes to completed
DROP TRIGGER IF EXISTS activities_completed_at;
CREATE TRIGGER activities_completed_at
AFTER UPDATE OF status ON activities
WHEN NEW.status = 'completed' AND OLD.status != 'completed'
BEGIN
    UPDATE activities SET completed_at = datetime('now') WHERE id = NEW.id;
END;

-- Trigger to mark overdue activities
-- This would typically be handled by a cron job, but we can use a view instead
CREATE VIEW IF NOT EXISTS v_overdue_activities AS
SELECT * FROM activities
WHERE status IN ('pending', 'in_progress')
  AND due_date IS NOT NULL
  AND datetime(due_date) < datetime('now');

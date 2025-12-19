-- Migration 007: Add last_response_at column to cadence_enrollments
-- Tracks the most recent response from lead during cadence

-- Ensure table exists for fresh databases (cadence_enrollments is created in 020)
CREATE TABLE IF NOT EXISTS cadence_enrollments (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    cadence_id TEXT NOT NULL,
    lead_id TEXT NOT NULL,

    -- Status
    status TEXT DEFAULT 'active', -- active, paused, completed, responded, converted, failed
    current_day INTEGER DEFAULT 0,
    current_step_id TEXT,

    -- Datas
    enrolled_at TEXT DEFAULT (datetime('now')),
    started_at TEXT,
    paused_at TEXT,
    completed_at TEXT,
    responded_at TEXT,

    -- Métricas
    messages_sent INTEGER DEFAULT 0,
    emails_sent INTEGER DEFAULT 0,
    calls_made INTEGER DEFAULT 0,

    -- Resposta
    first_response_channel TEXT,
    first_response_day INTEGER,
    response_type TEXT,

    -- Metadados
    enrolled_by TEXT, -- user_id ou 'system'
    pause_reason TEXT,
    completion_reason TEXT,
    notes TEXT,

    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),

    FOREIGN KEY (cadence_id) REFERENCES cadences(id),
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
    UNIQUE(cadence_id, lead_id)
);

-- Add last_response_at column
ALTER TABLE cadence_enrollments ADD COLUMN last_response_at TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_cadence_enrollments_last_response ON cadence_enrollments(last_response_at);

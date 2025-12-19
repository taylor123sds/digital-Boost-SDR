-- Migration 005: Add delivery tracking columns to cadence_actions_log
-- Tracks WhatsApp message delivery and read status

-- Ensure table exists for fresh databases (cadence_actions_log is created in 020)
CREATE TABLE IF NOT EXISTS cadence_actions_log (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    enrollment_id TEXT NOT NULL,
    step_id TEXT NOT NULL,
    lead_id TEXT NOT NULL,

    -- Ação
    action_type TEXT NOT NULL, -- whatsapp_sent, email_sent, call_made, task_created
    channel TEXT,
    day INTEGER,

    -- Status
    status TEXT DEFAULT 'pending', -- pending, sent, delivered, failed, skipped
    error_message TEXT,

    -- Conteúdo enviado
    content_sent TEXT,
    template_variant TEXT,

    -- Resposta (se houver)
    response_received INTEGER DEFAULT 0,
    response_at TEXT,
    response_content TEXT,

    -- Timing
    scheduled_at TEXT,
    executed_at TEXT,

    -- Delivery tracking
    delivery_status TEXT,
    delivery_updated_at TEXT,
    message_id TEXT,

    created_at TEXT DEFAULT (datetime('now')),

    FOREIGN KEY (enrollment_id) REFERENCES cadence_enrollments(id) ON DELETE CASCADE,
    FOREIGN KEY (step_id) REFERENCES cadence_steps(id),
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
);

-- Create index for message_id lookups (used by webhook processing)
CREATE INDEX IF NOT EXISTS idx_cadence_actions_message_id ON cadence_actions_log(message_id);

-- Create index for delivery status analytics
CREATE INDEX IF NOT EXISTS idx_cadence_actions_delivery_status ON cadence_actions_log(delivery_status);

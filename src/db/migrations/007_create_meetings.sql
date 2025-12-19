-- Migration: Create meetings table
-- Description: Calendar meetings and appointments (extends activities)
-- Created: 2025-11-10

CREATE TABLE IF NOT EXISTS meetings (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  activity_id TEXT UNIQUE, -- Link to activities table

  -- Relationships
  account_id TEXT,
  contact_id TEXT,
  opportunity_id TEXT,
  lead_id TEXT,

  -- Meeting Details
  titulo TEXT NOT NULL,
  descricao TEXT,
  tipo TEXT DEFAULT 'reuniao', -- reuniao, demo, apresentacao, discovery, fechamento

  -- Scheduling
  data_inicio TEXT NOT NULL,
  data_fim TEXT NOT NULL,
  duracao_minutos INTEGER,
  timezone TEXT DEFAULT 'America/Sao_Paulo',

  -- Location
  local TEXT, -- Physical location
  link_meeting TEXT, -- Google Meet, Zoom, Teams link
  tipo_local TEXT DEFAULT 'virtual', -- presencial, virtual, hibrido

  -- Status
  status TEXT DEFAULT 'agendada', -- agendada, confirmada, realizada, cancelada, remarcada, nao_compareceu
  confirmada INTEGER DEFAULT 0,
  confirmada_em TEXT,

  -- Participants
  organizador_id TEXT,
  participantes TEXT DEFAULT '[]', -- JSON array of contact/user IDs
  participantes_externos TEXT DEFAULT '[]', -- JSON array of external email addresses

  -- Google Calendar Integration
  google_event_id TEXT UNIQUE,
  google_calendar_id TEXT,
  google_meet_link TEXT,
  synced_to_google INTEGER DEFAULT 0,
  last_synced_at TEXT,

  -- Reminders
  lembrete_1 INTEGER DEFAULT 1440, -- 24 hours before (in minutes)
  lembrete_2 INTEGER DEFAULT 60, -- 1 hour before
  lembrete_enviado INTEGER DEFAULT 0,

  -- Follow-up
  ata_reuniao TEXT, -- Meeting notes/minutes
  proximos_passos TEXT,
  resultado TEXT, -- positivo, neutro, negativo, sem_resposta

  -- Timestamps
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  cancelled_at TEXT,
  completed_at TEXT,

  -- Metadata
  tags TEXT DEFAULT '[]',
  attachments TEXT DEFAULT '[]',

  FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
  FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE,
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_meetings_activity ON meetings(activity_id);
CREATE INDEX IF NOT EXISTS idx_meetings_account ON meetings(account_id);
CREATE INDEX IF NOT EXISTS idx_meetings_contact ON meetings(contact_id);
CREATE INDEX IF NOT EXISTS idx_meetings_opportunity ON meetings(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_meetings_data_inicio ON meetings(data_inicio);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON meetings(status);
CREATE INDEX IF NOT EXISTS idx_meetings_organizador ON meetings(organizador_id);
CREATE INDEX IF NOT EXISTS idx_meetings_google_event ON meetings(google_event_id);
CREATE INDEX IF NOT EXISTS idx_meetings_created ON meetings(created_at);

-- Trigger to auto-update updated_at
CREATE TRIGGER IF NOT EXISTS meetings_updated_at
AFTER UPDATE ON meetings
BEGIN
  UPDATE meetings SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- Trigger to calculate duration
CREATE TRIGGER IF NOT EXISTS meetings_calculate_duration
AFTER INSERT ON meetings
BEGIN
  UPDATE meetings
  SET duracao_minutos = CAST((julianday(data_fim) - julianday(data_inicio)) * 24 * 60 AS INTEGER)
  WHERE id = NEW.id AND duracao_minutos IS NULL;
END;

-- Trigger to set completed_at when status changes to 'realizada'
CREATE TRIGGER IF NOT EXISTS meetings_set_completed_at
AFTER UPDATE OF status ON meetings
WHEN NEW.status = 'realizada' AND OLD.status != 'realizada'
BEGIN
  UPDATE meetings SET completed_at = datetime('now') WHERE id = NEW.id;
END;

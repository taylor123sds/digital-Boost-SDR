-- Migration: Create activities table
-- Description: All interactions and tasks (calls, emails, meetings, tasks)
-- Created: 2025-11-10

CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),

  -- Activity Type
  tipo TEXT NOT NULL, -- chamada, email, whatsapp, reuniao, tarefa, nota, ligacao_perdida
  subtipo TEXT, -- agendada, realizada, cancelada, etc

  -- Relationships (polymorphic - can relate to lead, contact, account, or opportunity)
  related_to_type TEXT, -- 'lead', 'contact', 'account', 'opportunity'
  related_to_id TEXT, -- ID of the related entity

  -- Specific references for easier querying
  lead_id TEXT,
  contact_id TEXT,
  account_id TEXT,
  opportunity_id TEXT,

  -- Activity Details
  assunto TEXT NOT NULL,
  descricao TEXT,
  resultado TEXT, -- Outcome of the activity

  -- Scheduling
  data_agendada TEXT,
  data_realizada TEXT,
  duracao_minutos INTEGER,

  -- Status
  status TEXT DEFAULT 'pendente', -- pendente, em_andamento, concluida, cancelada
  prioridade TEXT DEFAULT 'media', -- baixa, media, alta, urgente

  -- Assignment
  owner_id TEXT, -- Person responsible
  participantes TEXT DEFAULT '[]', -- JSON array of participant IDs

  -- Communication specifics
  direcao TEXT, -- entrada, saida (for calls, emails, whatsapp)
  canal TEXT, -- whatsapp, email, telefone, presencial, video

  -- Follow-up
  requer_followup INTEGER DEFAULT 0,
  data_followup TEXT,

  -- Timestamps
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT,

  -- Metadata
  tags TEXT DEFAULT '[]',
  attachments TEXT DEFAULT '[]', -- JSON array of file paths/URLs

  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_activities_tipo ON activities(tipo);
CREATE INDEX IF NOT EXISTS idx_activities_status ON activities(status);
CREATE INDEX IF NOT EXISTS idx_activities_lead ON activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_activities_contact ON activities(contact_id);
CREATE INDEX IF NOT EXISTS idx_activities_account ON activities(account_id);
CREATE INDEX IF NOT EXISTS idx_activities_opportunity ON activities(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_activities_owner ON activities(owner_id);
CREATE INDEX IF NOT EXISTS idx_activities_data_agendada ON activities(data_agendada);
CREATE INDEX IF NOT EXISTS idx_activities_prioridade ON activities(prioridade);
CREATE INDEX IF NOT EXISTS idx_activities_created ON activities(created_at);
CREATE INDEX IF NOT EXISTS idx_activities_related ON activities(related_to_type, related_to_id);

-- Trigger to auto-update updated_at
CREATE TRIGGER IF NOT EXISTS activities_updated_at
AFTER UPDATE ON activities
BEGIN
  UPDATE activities SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- Trigger to set completed_at when status changes to 'concluida'
CREATE TRIGGER IF NOT EXISTS activities_set_completed_at
AFTER UPDATE OF status ON activities
WHEN NEW.status = 'concluida' AND OLD.status != 'concluida'
BEGIN
  UPDATE activities
  SET completed_at = datetime('now'),
      data_realizada = COALESCE(data_realizada, datetime('now'))
  WHERE id = NEW.id;
END;

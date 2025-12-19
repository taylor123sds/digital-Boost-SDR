-- Migration: Create messages table (CRM version)
-- Description: Centralized message log for all communication channels
-- Note: This complements the existing whatsapp_messages table
-- Created: 2025-11-10

CREATE TABLE IF NOT EXISTS crm_messages (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),

  -- Relationships
  contact_id TEXT,
  lead_id TEXT,
  account_id TEXT,
  opportunity_id TEXT,
  activity_id TEXT, -- Link to corresponding activity record

  -- Message Details
  canal TEXT NOT NULL, -- whatsapp, email, sms, chat
  direcao TEXT NOT NULL, -- entrada, saida

  -- Sender/Receiver
  from_number TEXT,
  from_email TEXT,
  from_name TEXT,
  to_number TEXT,
  to_email TEXT,
  to_name TEXT,

  -- Content
  assunto TEXT, -- For emails
  corpo TEXT NOT NULL,
  tipo_conteudo TEXT DEFAULT 'texto', -- texto, audio, imagem, video, documento, link

  -- Message Status
  status TEXT DEFAULT 'enviada', -- enviada, entregue, lida, erro, pendente
  erro_mensagem TEXT,

  -- Tracking
  lida INTEGER DEFAULT 0,
  lida_em TEXT,
  respondida INTEGER DEFAULT 0,
  respondida_em TEXT,

  -- WhatsApp specific
  whatsapp_message_id TEXT, -- ID from whatsapp_messages table if applicable
  whatsapp_status TEXT, -- pending, sent, delivered, read, failed

  -- Email specific
  email_message_id TEXT,
  email_thread_id TEXT,

  -- Campaign tracking
  campanha_id TEXT,
  is_automated INTEGER DEFAULT 0,
  template_id TEXT,

  -- Timestamps
  sent_at TEXT DEFAULT (datetime('now')),
  delivered_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),

  -- Metadata
  metadata TEXT DEFAULT '{}', -- JSON for additional data
  attachments TEXT DEFAULT '[]', -- JSON array of attachments

  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE,
  FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_crm_messages_contact ON crm_messages(contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_messages_lead ON crm_messages(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_messages_account ON crm_messages(account_id);
CREATE INDEX IF NOT EXISTS idx_crm_messages_opportunity ON crm_messages(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_crm_messages_canal ON crm_messages(canal);
CREATE INDEX IF NOT EXISTS idx_crm_messages_status ON crm_messages(status);
CREATE INDEX IF NOT EXISTS idx_crm_messages_sent ON crm_messages(sent_at);
CREATE INDEX IF NOT EXISTS idx_crm_messages_whatsapp_id ON crm_messages(whatsapp_message_id);
CREATE INDEX IF NOT EXISTS idx_crm_messages_campanha ON crm_messages(campanha_id);

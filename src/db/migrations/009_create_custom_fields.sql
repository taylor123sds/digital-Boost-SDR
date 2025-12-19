-- Migration: Create custom_fields table
-- Description: Flexible custom field definitions for extending entities
-- Created: 2025-11-10

CREATE TABLE IF NOT EXISTS custom_field_definitions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),

  -- Field Configuration
  nome TEXT NOT NULL,
  label TEXT NOT NULL,
  entidade TEXT NOT NULL, -- 'account', 'contact', 'lead', 'opportunity', 'product'
  tipo TEXT NOT NULL, -- 'texto', 'numero', 'data', 'boolean', 'select', 'multiselect', 'url', 'email', 'telefone'

  -- Field Options (for select/multiselect)
  opcoes TEXT DEFAULT '[]', -- JSON array of options

  -- Validation
  obrigatorio INTEGER DEFAULT 0,
  validacao_regex TEXT,
  valor_padrao TEXT,

  -- Display
  grupo TEXT, -- Group fields together (e.g., "Informações Comerciais")
  ordem INTEGER DEFAULT 0, -- Display order
  placeholder TEXT,
  help_text TEXT,

  -- Status
  ativo INTEGER DEFAULT 1,

  -- Timestamps
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),

  UNIQUE(entidade, nome)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_custom_field_defs_entidade ON custom_field_definitions(entidade);
CREATE INDEX IF NOT EXISTS idx_custom_field_defs_ativo ON custom_field_definitions(ativo);
CREATE INDEX IF NOT EXISTS idx_custom_field_defs_ordem ON custom_field_definitions(ordem);

-- Trigger to auto-update updated_at
CREATE TRIGGER IF NOT EXISTS custom_field_defs_updated_at
AFTER UPDATE ON custom_field_definitions
BEGIN
  UPDATE custom_field_definitions SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- Note: Actual custom field VALUES are stored in JSON columns in each entity table
-- This table only stores the field DEFINITIONS

-- Example predefined custom fields (can be inserted via migration runner)
-- For Accounts:
--   - "Numero de Colaboradores" (number)
--   - "Tecnologias Utilizadas" (multiselect)
--   - "Data Ultimo Contato" (date)
--
-- For Contacts:
--   - "Data Aniversario" (date)
--   - "Preferencia Contato" (select: email, whatsapp, telefone)
--   - "Enviar Newsletter" (boolean)
--
-- For Opportunities:
--   - "Tipo Contrato" (select: novo, renovacao, upsell)
--   - "Aprovacao Juridico" (boolean)
--   - "Data Inicio Vigencia" (date)

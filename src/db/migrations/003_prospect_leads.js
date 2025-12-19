/**
 * @file 003_prospect_leads.js
 * @description Migração para criar tabela de leads de prospecção (equivalente à Sheet1)
 *
 * Esta tabela armazena leads que ainda NÃO foram contatados.
 * Quando um lead é contatado, ele é MOVIDO para a tabela `leads` (funil ativo).
 *
 * Fluxo:
 * 1. Importação: Sheet1  prospect_leads (SQLite)
 * 2. Prospecção: prospect_leads  leads (quando mensagem é enviada)
 * 3. Resposta: leads.stage_id atualizado para 'stage_respondeu'
 */

import { getDatabase } from '../index.js';

export function up() {
  const db = getDatabase();

  console.log(' [MIGRATION] Criando tabela prospect_leads...');

  // Tabela de leads de prospecção (equivalente à Sheet1)
  db.exec(`
    CREATE TABLE IF NOT EXISTS prospect_leads (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),

      -- Dados básicos do lead
      empresa TEXT NOT NULL,
      nome TEXT,
      cnpj TEXT,
      segmento TEXT,
      porte TEXT,
      faturamento_estimado TEXT,

      -- Localização
      cidade TEXT,
      estado TEXT,
      endereco TEXT,
      bairro TEXT,
      cep TEXT,

      -- Contato
      whatsapp TEXT NOT NULL,
      telefone TEXT,
      email TEXT,
      site TEXT,

      -- Origem/Fonte
      origem TEXT DEFAULT 'google_sheets',
      fonte_lista TEXT,  -- Nome do arquivo/lista de origem
      data_importacao TEXT DEFAULT (datetime('now')),

      -- Controle de prospecção
      status TEXT DEFAULT 'pendente',  -- pendente, em_fila, processando, enviado, erro, sem_whatsapp
      prioridade INTEGER DEFAULT 0,    -- 0=normal, 1=alta, 2=urgente
      tentativas INTEGER DEFAULT 0,
      ultima_tentativa TEXT,
      erro_ultima_tentativa TEXT,

      -- Controle de duplicatas
      telefone_normalizado TEXT,  -- Telefone normalizado para busca

      -- Timestamps
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      processado_at TEXT,  -- Quando foi movido para leads

      -- Metadados extras (JSON)
      metadata TEXT DEFAULT '{}'
    );

    -- Índices para busca rápida
    CREATE INDEX IF NOT EXISTS idx_prospect_whatsapp ON prospect_leads(whatsapp);
    CREATE INDEX IF NOT EXISTS idx_prospect_telefone_norm ON prospect_leads(telefone_normalizado);
    CREATE INDEX IF NOT EXISTS idx_prospect_status ON prospect_leads(status);
    CREATE INDEX IF NOT EXISTS idx_prospect_prioridade ON prospect_leads(prioridade DESC);
    CREATE INDEX IF NOT EXISTS idx_prospect_created ON prospect_leads(created_at);
    CREATE INDEX IF NOT EXISTS idx_prospect_empresa ON prospect_leads(empresa);

    -- Índice único para evitar duplicatas por telefone normalizado
    CREATE UNIQUE INDEX IF NOT EXISTS idx_prospect_unique_phone ON prospect_leads(telefone_normalizado);

    -- Trigger para atualizar updated_at
    CREATE TRIGGER IF NOT EXISTS prospect_leads_updated_at
    AFTER UPDATE ON prospect_leads
    BEGIN
      UPDATE prospect_leads SET updated_at = datetime('now') WHERE id = NEW.id;
    END;
  `);

  // Tabela de histórico de prospecção (para auditoria)
  db.exec(`
    CREATE TABLE IF NOT EXISTS prospect_history (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      prospect_id TEXT NOT NULL,
      lead_id TEXT,  -- ID na tabela leads (após conversão)

      action TEXT NOT NULL,  -- imported, queued, sent, converted, failed, skipped
      details TEXT,          -- JSON com detalhes da ação

      created_at TEXT DEFAULT (datetime('now')),

      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_prospect_history_prospect ON prospect_history(prospect_id);
    CREATE INDEX IF NOT EXISTS idx_prospect_history_action ON prospect_history(action);
    CREATE INDEX IF NOT EXISTS idx_prospect_history_created ON prospect_history(created_at);
  `);

  console.log(' [MIGRATION] Tabelas prospect_leads e prospect_history criadas com sucesso!');

  return true;
}

export function down() {
  const db = getDatabase();

  console.log(' [MIGRATION] Removendo tabelas de prospecção...');

  db.exec(`
    DROP TABLE IF EXISTS prospect_history;
    DROP TABLE IF EXISTS prospect_leads;
  `);

  console.log(' [MIGRATION] Tabelas removidas com sucesso!');

  return true;
}

// Executar migração se chamado diretamente
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  try {
    up();
    console.log(' Migração executada com sucesso!');
  } catch (error) {
    console.error(' Erro na migração:', error);
    process.exit(1);
  }
}

export default { up, down };

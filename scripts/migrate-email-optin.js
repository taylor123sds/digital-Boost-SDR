/**
 * Migration: Add email_optins table and email_optin fields to leads
 *
 * FLUXO:
 * 1. Leads vem do instagram-automation (fonte='instagram')
 * 2. Email opt-in enviado PRIMEIRO (antes de WhatsApp)
 * 3. Apos email enviado -> WhatsApp prospecting liberado
 * 4. Depois -> Cadencia normal
 */

import Database from 'better-sqlite3';

const DB_PATH = process.env.DB_PATH || '/app/data/orbion.db';
const db = new Database(DB_PATH);

console.log('=== MIGRATION: EMAIL OPT-IN SYSTEM ===\n');

try {
  // 1. Criar tabela email_optins para rastrear emails de opt-in enviados
  console.log('1. Criando tabela email_optins...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS email_optins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER,
      telefone TEXT NOT NULL,
      email TEXT NOT NULL,
      nome TEXT,
      empresa TEXT,
      status TEXT DEFAULT 'pending',        -- pending, sent, failed, bounced, clicked
      message_id TEXT,                       -- ID do email enviado (nodemailer)
      sent_at TEXT,                          -- Data/hora do envio
      opened_at TEXT,                        -- Data/hora da abertura (se rastreavel)
      clicked_at TEXT,                       -- Data/hora do clique no CTA
      whatsapp_eligible_at TEXT,             -- Data/hora que ficou elegivel para WhatsApp
      error_message TEXT,                    -- Mensagem de erro se failed
      fonte TEXT DEFAULT 'instagram',        -- Fonte do lead (instagram, manual, etc)
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(email)
    );

    CREATE INDEX IF NOT EXISTS idx_email_optins_status ON email_optins(status);
    CREATE INDEX IF NOT EXISTS idx_email_optins_email ON email_optins(email);
    CREATE INDEX IF NOT EXISTS idx_email_optins_telefone ON email_optins(telefone);
  `);
  console.log('   OK - Tabela email_optins criada');

  // 2. Adicionar campos de opt-in na tabela leads
  console.log('\n2. Adicionando campos de opt-in na tabela leads...');

  // Verificar se colunas ja existem
  const columns = db.prepare("PRAGMA table_info(leads)").all();
  const columnNames = columns.map(c => c.name);

  const newColumns = [
    { name: 'email_optin_status', type: "TEXT DEFAULT 'not_sent'" },
    { name: 'email_optin_sent_at', type: 'TEXT' },
    { name: 'email_optin_id', type: 'INTEGER' },
    { name: 'whatsapp_eligible', type: "INTEGER DEFAULT 0" }  // 0=false, 1=true
  ];

  for (const col of newColumns) {
    if (!columnNames.includes(col.name)) {
      db.exec(`ALTER TABLE leads ADD COLUMN ${col.name} ${col.type}`);
      console.log(`   OK - Coluna ${col.name} adicionada`);
    } else {
      console.log(`   SKIP - Coluna ${col.name} ja existe`);
    }
  }

  // 3. Criar tabela prospect_leads se nao existir (para integracao com instagram-automation)
  console.log('\n3. Criando tabela prospect_leads (fonte de leads)...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS prospect_leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telefone TEXT NOT NULL,
      telefone_normalizado TEXT,
      email TEXT,
      nome TEXT,
      empresa TEXT,
      cidade TEXT,
      fonte TEXT DEFAULT 'instagram',
      status TEXT DEFAULT 'pendente',       -- pendente, email_enviado, whatsapp_enviado, convertido, sem_whatsapp, bloqueado
      prioridade INTEGER DEFAULT 0,
      erro TEXT,
      processado_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(telefone_normalizado)
    );

    CREATE INDEX IF NOT EXISTS idx_prospect_leads_status ON prospect_leads(status);
    CREATE INDEX IF NOT EXISTS idx_prospect_leads_fonte ON prospect_leads(fonte);
    CREATE INDEX IF NOT EXISTS idx_prospect_leads_telefone ON prospect_leads(telefone_normalizado);
  `);
  console.log('   OK - Tabela prospect_leads criada');

  // 4. Mostrar estado final
  console.log('\n=== ESTADO FINAL ===');

  const emailOptinsCount = db.prepare('SELECT COUNT(*) as total FROM email_optins').get();
  console.log(`email_optins: ${emailOptinsCount.total} registros`);

  const prospectLeadsCount = db.prepare('SELECT COUNT(*) as total FROM prospect_leads').get();
  console.log(`prospect_leads: ${prospectLeadsCount.total} registros`);

  const leadsCount = db.prepare('SELECT COUNT(*) as total FROM leads').get();
  console.log(`leads: ${leadsCount.total} registros`);

  const leadColumns = db.prepare("PRAGMA table_info(leads)").all();
  console.log(`\nColunas na tabela leads: ${leadColumns.map(c => c.name).join(', ')}`);

  console.log('\n=== MIGRATION COMPLETA ===');

} catch (error) {
  console.error('ERRO na migration:', error.message);
  process.exit(1);
} finally {
  db.close();
}

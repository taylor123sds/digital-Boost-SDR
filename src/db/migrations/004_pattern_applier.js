/**
 * @file 004_pattern_applier.js
 * @description Migração para suportar o PatternApplier
 *
 * Adiciona:
 * 1. Coluna prevention_instruction em abandonment_patterns
 * 2. Colunas context_stage e effectiveness_score em successful_patterns
 * 3. Colunas applies_to_stage e is_active em feedback_insights
 * 4. Tabela pattern_usage_log para tracking de uso
 */

import { getDatabase } from '../index.js';

export function up() {
  const db = getDatabase();

  console.log(' [MIGRATION] Aplicando migração 004_pattern_applier...');

  // 1. Adicionar colunas em abandonment_patterns
  try {
    db.exec(`
      ALTER TABLE abandonment_patterns ADD COLUMN prevention_instruction TEXT;
    `);
    console.log('   Coluna prevention_instruction adicionada');
  } catch (e) {
    if (!e.message.includes('duplicate column')) {
      console.log('   prevention_instruction já existe ou erro:', e.message);
    }
  }

  try {
    db.exec(`
      ALTER TABLE abandonment_patterns ADD COLUMN is_active INTEGER DEFAULT 1;
    `);
    console.log('   Coluna is_active adicionada em abandonment_patterns');
  } catch (e) {
    if (!e.message.includes('duplicate column')) {
      console.log('   is_active já existe');
    }
  }

  // 2. Adicionar colunas em successful_patterns
  try {
    db.exec(`
      ALTER TABLE successful_patterns ADD COLUMN context_stage TEXT;
    `);
    console.log('   Coluna context_stage adicionada');
  } catch (e) {
    if (!e.message.includes('duplicate column')) {
      console.log('   context_stage já existe');
    }
  }

  try {
    db.exec(`
      ALTER TABLE successful_patterns ADD COLUMN effectiveness_score REAL DEFAULT 0.5;
    `);
    console.log('   Coluna effectiveness_score adicionada');
  } catch (e) {
    if (!e.message.includes('duplicate column')) {
      console.log('   effectiveness_score já existe');
    }
  }

  try {
    db.exec(`
      ALTER TABLE successful_patterns ADD COLUMN is_active INTEGER DEFAULT 1;
    `);
    console.log('   Coluna is_active adicionada em successful_patterns');
  } catch (e) {
    if (!e.message.includes('duplicate column')) {
      console.log('   is_active já existe');
    }
  }

  // 3. Adicionar colunas em feedback_insights
  try {
    db.exec(`
      ALTER TABLE feedback_insights ADD COLUMN applies_to_stage TEXT;
    `);
    console.log('   Coluna applies_to_stage adicionada');
  } catch (e) {
    if (!e.message.includes('duplicate column')) {
      console.log('   applies_to_stage já existe');
    }
  }

  try {
    db.exec(`
      ALTER TABLE feedback_insights ADD COLUMN is_active INTEGER DEFAULT 1;
    `);
    console.log('   Coluna is_active adicionada em feedback_insights');
  } catch (e) {
    if (!e.message.includes('duplicate column')) {
      console.log('   is_active já existe');
    }
  }

  // 4. Criar tabela pattern_usage_log
  db.exec(`
    CREATE TABLE IF NOT EXISTS pattern_usage_log (
      id TEXT PRIMARY KEY,
      pattern_type TEXT NOT NULL,  -- 'success', 'prevention', 'insight'
      pattern_name TEXT NOT NULL,
      contact_id TEXT,
      was_effective INTEGER DEFAULT 0,
      used_at TEXT DEFAULT (datetime('now')),
      context TEXT  -- JSON com contexto adicional
    );

    CREATE INDEX IF NOT EXISTS idx_pattern_usage_type ON pattern_usage_log(pattern_type);
    CREATE INDEX IF NOT EXISTS idx_pattern_usage_name ON pattern_usage_log(pattern_name);
    CREATE INDEX IF NOT EXISTS idx_pattern_usage_date ON pattern_usage_log(used_at);
  `);
  console.log('   Tabela pattern_usage_log criada');

  // 5. Criar tabela real_time_adaptations para adaptação durante conversa
  db.exec(`
    CREATE TABLE IF NOT EXISTS real_time_adaptations (
      id TEXT PRIMARY KEY,
      contact_id TEXT NOT NULL,
      trigger_type TEXT NOT NULL,  -- 'sentiment_drop', 'risk_pattern', 'stagnation', 'objection'
      trigger_details TEXT,        -- JSON com detalhes do trigger
      adaptation_applied TEXT,     -- Descrição da adaptação
      original_approach TEXT,
      adapted_approach TEXT,
      was_successful INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      resolved_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_rta_contact ON real_time_adaptations(contact_id);
    CREATE INDEX IF NOT EXISTS idx_rta_trigger ON real_time_adaptations(trigger_type);
    CREATE INDEX IF NOT EXISTS idx_rta_success ON real_time_adaptations(was_successful);
  `);
  console.log('   Tabela real_time_adaptations criada');

  // 6. Atualizar effectiveness_score baseado em usage_count e success_rate existentes
  try {
    db.exec(`
      UPDATE successful_patterns
      SET effectiveness_score = (success_rate * 0.7) + (MIN(usage_count, 100) / 100.0 * 0.3)
      WHERE effectiveness_score = 0.5 OR effectiveness_score IS NULL;
    `);
    console.log('   effectiveness_score calculado para padrões existentes');
  } catch (e) {
    console.log('   Erro ao calcular effectiveness_score:', e.message);
  }

  console.log(' [MIGRATION] Migração 004_pattern_applier concluída!');

  return true;
}

export function down() {
  const db = getDatabase();

  console.log(' [MIGRATION] Revertendo migração 004_pattern_applier...');

  // SQLite não suporta DROP COLUMN facilmente, então apenas removemos as tabelas novas
  db.exec(`
    DROP TABLE IF EXISTS pattern_usage_log;
    DROP TABLE IF EXISTS real_time_adaptations;
  `);

  console.log(' [MIGRATION] Migração revertida');

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

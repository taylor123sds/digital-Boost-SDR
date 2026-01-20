#!/usr/bin/env node

/**
 * Reset Database Script
 * Limpa todas as mensagens, leads, cards e conversas do banco de dados
 * Útil para começar testes do zero
 *
 * Uso: node reset-database.js
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const DB_PATH = './orbion.db';
const BACKUP_DIR = './backups';

// Cores para output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function createBackup() {
  try {
    // Criar diretório de backups se não existir
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    // Nome do backup com timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const backupPath = path.join(BACKUP_DIR, `orbion.db.backup-${timestamp}`);

    // Copiar banco de dados
    fs.copyFileSync(DB_PATH, backupPath);

    log(`✅ Backup criado: ${backupPath}`, 'green');
    return backupPath;
  } catch (error) {
    log(`❌ Erro ao criar backup: ${error.message}`, 'red');
    throw error;
  }
}

function resetDatabase() {
  try {
    const db = new Database(DB_PATH);

    log('\n🔄 Iniciando reset do banco de dados...', 'blue');

    // Desabilitar foreign keys
    db.pragma('foreign_keys = OFF');

    // Tabelas para limpar
    const tables = [
      // Mensagens e conversas
      'whatsapp_messages',
      'crm_messages',
      'message_sentiment',
      'conversation_analysis',
      'enhanced_conversation_states',
      'memory',

      // Leads e contatos
      'leads',
      'lead_states',
      'contacts',

      // Atividades e eventos
      'activities',
      'events',
      'meetings',
      'meeting_analysis',
      'meeting_insights',
      'meeting_scores',
      'meeting_transcriptions',

      // CRM
      'opportunities',
      'opportunity_products',
      'tasks',

      // Automações
      'automation_executions',
      'workflow_executions',
      'workflow_actions',

      // Analytics
      'agent_metrics',
      'conversation_outcomes',
      'sentiment_momentum',
      'success_signals',
      'abandonment_patterns',
      'success_patterns',
      'successful_patterns',
      'feedback_insights',

      // Testes
      'ab_experiments',
      'prompt_performance',
      'prompt_variations',

      // Verificações
      'human_verifications',
      'bot_blocks',
      'bot_blocked',

      // Documentos
      'document_analyses'
    ];

    let deletedTotal = 0;

    for (const table of tables) {
      try {
        // Verificar se tabela existe
        const tableExists = db.prepare(
          `SELECT name FROM sqlite_master WHERE type='table' AND name=?`
        ).get(table);

        if (tableExists) {
          // Contar registros antes
          const countBefore = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();

          // Deletar
          db.prepare(`DELETE FROM ${table}`).run();

          if (countBefore.count > 0) {
            log(`  ✓ ${table}: ${countBefore.count} registros deletados`, 'yellow');
            deletedTotal += countBefore.count;
          }
        }
      } catch (error) {
        log(`  ⚠️  Aviso ao limpar ${table}: ${error.message}`, 'yellow');
      }
    }

    // Reabilitar foreign keys
    db.pragma('foreign_keys = ON');

    // Vacuum para compactar
    log('\n🗜️  Compactando banco de dados...', 'blue');
    db.pragma('vacuum');

    db.close();

    log(`\n✅ Reset concluído com sucesso!`, 'green');
    log(`   Total de registros deletados: ${deletedTotal}`, 'green');

    // Verificar resultado
    verifyReset();

  } catch (error) {
    log(`\n❌ Erro ao resetar banco: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

function verifyReset() {
  try {
    const db = new Database(DB_PATH);

    log('\n🔍 Verificando reset...', 'blue');

    const checks = [
      'whatsapp_messages',
      'leads',
      'contacts',
      'events',
      'memory',
      'lead_states'
    ];

    let allEmpty = true;

    for (const table of checks) {
      const count = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();

      if (count.count === 0) {
        log(`  ✓ ${table}: vazia ✅`, 'green');
      } else {
        log(`  ✗ ${table}: ${count.count} registros ⚠️`, 'red');
        allEmpty = false;
      }
    }

    db.close();

    if (allEmpty) {
      log('\n🎉 Banco de dados resetado com sucesso!', 'magenta');
      log('   Pronto para começar conversas do zero.', 'magenta');
    } else {
      log('\n⚠️  Algumas tabelas ainda contêm dados', 'yellow');
    }

  } catch (error) {
    log(`❌ Erro ao verificar: ${error.message}`, 'red');
  }
}

// Main
(async () => {
  try {
    log('═══════════════════════════════════════════════', 'blue');
    log('    🗑️  RESET DATABASE - ORBION/LEADLY', 'blue');
    log('═══════════════════════════════════════════════', 'blue');

    // Verificar se banco existe
    if (!fs.existsSync(DB_PATH)) {
      log(`\n❌ Banco de dados não encontrado: ${DB_PATH}`, 'red');
      process.exit(1);
    }

    // Criar backup antes de resetar
    log('\n📦 Criando backup de segurança...', 'blue');
    await createBackup();

    // Resetar
    resetDatabase();

    log('\n═══════════════════════════════════════════════\n', 'blue');

  } catch (error) {
    log(`\n❌ Erro fatal: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
})();

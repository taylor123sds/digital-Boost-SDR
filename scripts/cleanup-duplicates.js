/**
 * Script para limpar leads duplicados e adicionar índice UNIQUE
 */

import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'orbion.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

console.log('=== LIMPEZA DE LEADS DUPLICADOS ===\n');

// 1. Encontrar duplicados
const duplicates = db.prepare(`
  SELECT telefone, COUNT(*) as count
  FROM leads
  WHERE telefone IS NOT NULL
  GROUP BY telefone
  HAVING COUNT(*) > 1
`).all();

console.log(`Duplicados encontrados: ${duplicates.length}`);

let totalDeleted = 0;

for (const dup of duplicates) {
  // Pegar IDs de todos os duplicados, ordenados por created_at DESC
  const leads = db.prepare(`
    SELECT id, nome, created_at FROM leads
    WHERE telefone = ?
    ORDER BY created_at DESC
  `).all(dup.telefone);

  // Manter o primeiro (mais recente), deletar os outros
  const toKeep = leads[0];
  const toDelete = leads.slice(1);

  if (toDelete.length > 0) {
    console.log(`  Telefone ${dup.telefone}: mantendo ${toKeep.id}, deletando ${toDelete.length} duplicados`);

    for (const lead of toDelete) {
      db.prepare('DELETE FROM leads WHERE id = ?').run(lead.id);
      totalDeleted++;
    }
  }
}

console.log(`\nTotal deletado: ${totalDeleted} leads duplicados`);

// 2. Verificar resultado
const total = db.prepare('SELECT COUNT(*) as total FROM leads').get();
const unique = db.prepare('SELECT COUNT(DISTINCT telefone) as unique_phones FROM leads WHERE telefone IS NOT NULL').get();
console.log(`\nApós limpeza:`);
console.log(`  Total de leads: ${total.total}`);
console.log(`  Telefones únicos: ${unique.unique_phones}`);

// 3. Criar índice UNIQUE (se não existir)
try {
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_telefone_unique ON leads(telefone) WHERE telefone IS NOT NULL');
  console.log('\nÍndice UNIQUE criado com sucesso');
} catch (e) {
  console.log('\nErro ao criar índice:', e.message);
}

db.close();
console.log('\n=== LIMPEZA CONCLUÍDA ===');

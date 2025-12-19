/**
 * Fix script to mark D1 as sent for all active enrollments
 * This prevents duplicate "primeiro contato" messages
 */

import Database from 'better-sqlite3';

const db = new Database('/app/data/orbion.db');

console.log('=== FIX D1 PENDENTES ===\n');

// 1. Contar ações D1 pendentes
const pendingD1 = db.prepare("SELECT COUNT(*) as total FROM cadence_actions_log WHERE day = 1 AND status = 'pending'").get();
console.log('Ações D1 pendentes:', pendingD1.total);

if (pendingD1.total === 0) {
  console.log('Nada a corrigir!');
  process.exit(0);
}

// 2. Marcar todas D1 pendentes como 'sent'
const result = db.prepare("UPDATE cadence_actions_log SET status = 'sent', executed_at = datetime('now'), content_sent = 'D1 marcado como enviado - fix duplicação' WHERE day = 1 AND status = 'pending'").run();
console.log('Ações atualizadas:', result.changes);

// 3. Verificar resultado
const remaining = db.prepare("SELECT COUNT(*) as total FROM cadence_actions_log WHERE day = 1 AND status = 'pending'").get();
console.log('Ações D1 pendentes restantes:', remaining.total);

// 4. Mostrar status final
const finalStats = db.prepare("SELECT day, status, COUNT(*) as total FROM cadence_actions_log GROUP BY day, status ORDER BY day, status").all();
console.log('\nEstado final:');
finalStats.forEach(s => console.log('  Dia', s.day, '-', s.status + ':', s.total));

db.close();
console.log('\n=== FIX COMPLETO ===');

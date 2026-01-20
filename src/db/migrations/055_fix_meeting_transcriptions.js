/**
 * Migration 055: Fix missing texto_completo column for meeting_transcriptions
 * Ensures trigger mt_calculate_palavras has its referenced column.
 */

import { getDatabase } from '../index.js';

function columnExists(db, table, column) {
  const info = db.prepare(`PRAGMA table_info(${table})`).all();
  return info.some(col => col.name === column);
}

export async function up() {
  const db = getDatabase();

  console.log('Migration 055: Fixing meeting_transcriptions schema...');

  if (!columnExists(db, 'meeting_transcriptions', 'texto_completo')) {
    db.exec('ALTER TABLE meeting_transcriptions ADD COLUMN texto_completo TEXT');
    console.log('  Added column meeting_transcriptions.texto_completo');
  } else {
    console.log('  Column meeting_transcriptions.texto_completo already exists, skipping');
  }

  console.log('Migration 055: Complete');
}

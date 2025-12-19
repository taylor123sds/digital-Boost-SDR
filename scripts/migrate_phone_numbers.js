#!/usr/bin/env node
// scripts/migrate_phone_numbers.js
//  Script de migração para normalizar números de telefone no banco de dados
// Converte estados antigos com formato 13 dígitos para 12 dígitos

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = path.join(__dirname, '..', 'orbion.db');
const db = new Database(DB_PATH);

/**
 * Normaliza número de telefone (mesmo código do phone_normalizer.js)
 */
function normalizePhone(phone) {
  if (!phone || typeof phone !== 'string') return '';

  let cleaned = phone
    .replace('@s.whatsapp.net', '')
    .replace('@c.us', '')
    .replace('@g.us', '')
    .trim()
    .replace(/\D/g, '');

  if (cleaned.startsWith('55') && cleaned.length === 13) {
    cleaned = cleaned.substring(0, 4) + cleaned.substring(5);
  }

  return cleaned;
}

console.log(' Iniciando migração de números de telefone...\n');

// 1. Migrar tabela memory (enhanced_state_*)
console.log(' 1. Migrando chaves enhanced_state_* na tabela memory...');

const enhancedStates = db.prepare(`
  SELECT id, key, value
  FROM memory
  WHERE key LIKE 'enhanced_state_%'
`).all();

console.log(`   Encontrados ${enhancedStates.length} estados para analisar`);

let migratedStates = 0;
let skippedStates = 0;

for (const state of enhancedStates) {
  // Extrair número da chave: enhanced_state_5584996250203
  const phoneMatch = state.key.match(/enhanced_state_(\d+)/);

  if (!phoneMatch) {
    console.log(`    Chave inválida: ${state.key}`);
    continue;
  }

  const originalPhone = phoneMatch[1];
  const normalizedPhone = normalizePhone(originalPhone);

  if (originalPhone === normalizedPhone) {
    skippedStates++;
    continue; // Já normalizado
  }

  const newKey = `enhanced_state_${normalizedPhone}`;

  try {
    // Atualizar chave
    db.prepare(`UPDATE memory SET key = ? WHERE id = ?`).run(newKey, state.id);

    // Atualizar contactId dentro do JSON se existir
    try {
      const valueObj = JSON.parse(state.value);
      if (valueObj.contactId) {
        valueObj.contactId = normalizedPhone;
        db.prepare(`UPDATE memory SET value = ? WHERE id = ?`)
          .run(JSON.stringify(valueObj), state.id);
      }
    } catch (e) {
      // Ignorar se não for JSON válido
    }

    console.log(`    ${originalPhone}  ${normalizedPhone}`);
    migratedStates++;
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      console.log(`    ${originalPhone}: Estado normalizado já existe, removendo duplicata`);
      db.prepare(`DELETE FROM memory WHERE id = ?`).run(state.id);
    } else {
      console.error(`    Erro migrando ${originalPhone}:`, err.message);
    }
  }
}

console.log(`    Migrados: ${migratedStates}, Já normalizados: ${skippedStates}\n`);

// 2. Migrar tabela whatsapp_messages
console.log(' 2. Migrando tabela whatsapp_messages...');

const messages = db.prepare(`
  SELECT DISTINCT phone_number
  FROM whatsapp_messages
  WHERE length(phone_number) = 13 AND phone_number LIKE '55%'
`).all();

console.log(`   Encontrados ${messages.length} números únicos para normalizar`);

let migratedMessages = 0;

for (const { phone_number } of messages) {
  const normalized = normalizePhone(phone_number);

  if (phone_number === normalized) continue;

  try {
    db.prepare(`UPDATE whatsapp_messages SET phone_number = ? WHERE phone_number = ?`)
      .run(normalized, phone_number);
    console.log(`    ${phone_number}  ${normalized}`);
    migratedMessages++;
  } catch (err) {
    console.error(`    Erro migrando ${phone_number}:`, err.message);
  }
}

console.log(`    Migrados: ${migratedMessages} números únicos\n`);

// 3. Migrar tabela enhanced_conversation_states
console.log(' 3. Migrando tabela enhanced_conversation_states...');

const convStates = db.prepare(`
  SELECT id, phone_number
  FROM enhanced_conversation_states
  WHERE length(phone_number) = 13 AND phone_number LIKE '55%'
`).all();

console.log(`   Encontrados ${convStates.length} registros para normalizar`);

let migratedConvStates = 0;

for (const { id, phone_number } of convStates) {
  const normalized = normalizePhone(phone_number);

  if (phone_number === normalized) continue;

  try {
    db.prepare(`UPDATE enhanced_conversation_states SET phone_number = ? WHERE id = ?`)
      .run(normalized, id);
    console.log(`    ${phone_number}  ${normalized}`);
    migratedConvStates++;
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      console.log(`    ${phone_number}: Estado normalizado já existe, removendo duplicata`);
      db.prepare(`DELETE FROM enhanced_conversation_states WHERE id = ?`).run(id);
    } else {
      console.error(`    Erro migrando ${phone_number}:`, err.message);
    }
  }
}

console.log(`    Migrados: ${migratedConvStates} estados\n`);

// 4. Verificar outras tabelas
console.log(' 4. Verificando outras tabelas...');

const tables = ['enhanced_metrics', 'bot_blocks', 'human_verifications'];

for (const table of tables) {
  try {
    const count = db.prepare(`
      SELECT COUNT(*) as count
      FROM ${table}
      WHERE length(phone_number) = 13 AND phone_number LIKE '55%'
    `).get();

    if (count.count > 0) {
      console.log(`    ${table}: ${count.count} registros precisam migração`);

      const records = db.prepare(`SELECT id, phone_number FROM ${table} WHERE length(phone_number) = 13`).all();

      for (const { id, phone_number } of records) {
        const normalized = normalizePhone(phone_number);
        if (phone_number !== normalized) {
          try {
            db.prepare(`UPDATE ${table} SET phone_number = ? WHERE id = ?`).run(normalized, id);
            console.log(`       ${phone_number}  ${normalized}`);
          } catch (err) {
            console.error(`       Erro:`, err.message);
          }
        }
      }
    } else {
      console.log(`    ${table}: Nenhum registro para migrar`);
    }
  } catch (err) {
    console.log(`    ${table}: Tabela não existe ou erro - ${err.message}`);
  }
}

// 5. Relatório final
console.log('\n RESUMO DA MIGRAÇÃO:');
console.log('='*60);
console.log(` Enhanced states: ${migratedStates} migrados`);
console.log(` WhatsApp messages: ${migratedMessages} números únicos migrados`);
console.log(` Conversation states: ${migratedConvStates} migrados`);
console.log('='*60);

console.log('\n Migração concluída com sucesso!\n');

db.close();

/**
 * Script para resetar todos os dados do sistema ORBION
 * - Limpa todas as abas do Google Sheets (exceto cabeçalhos)
 * - Limpa tabela lead_states do SQLite
 * - Limpa histórico de mensagens
 */

import 'dotenv/config';
import Database from 'better-sqlite3';
import fs from 'fs';
import { google } from 'googleapis';

const SPREADSHEET_ID = process.env.GOOGLE_LEADS_SHEET_ID || process.env.SPREADSHEET_ID;
const CREDENTIALS_PATH = process.env.GOOGLE_CREDENTIALS_FILE || "./secrets/google_credentials.json";
const TOKEN_PATH = process.env.GOOGLE_TOKEN_PATH || "./secrets/google_token.json";

// Mesma função de autenticação usada pelo google_sheets.js
function newOAuthClient() {
  const raw = fs.readFileSync(CREDENTIALS_PATH, "utf-8");
  const json = JSON.parse(raw);
  const cfg = json.web || json.installed || json;
  const { client_id, client_secret } = cfg;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3001/oauth2callback";
  return new google.auth.OAuth2(client_id, client_secret, redirectUri);
}

async function getAuthClient() {
  const oAuth2Client = newOAuthClient();

  if (!fs.existsSync(TOKEN_PATH)) {
    throw new Error(`Token não encontrado. Execute o servidor primeiro para autenticar.`);
  }

  const token = JSON.parse(fs.readFileSync(TOKEN_PATH, "utf-8"));
  oAuth2Client.setCredentials(token);
  return oAuth2Client;
}

async function clearGoogleSheets() {
  console.log('\n📊 Limpando Google Sheets...');

  const auth = await getAuthClient();
  const sheets = google.sheets({ version: 'v4', auth });

  // Abas a serem limpadas (mantém apenas linha de cabeçalho)
  const sheetsToClear = [
    { name: 'Funil BANT', range: 'Funil BANT!A2:Z1000' },
    { name: 'Pipeline', range: 'Pipeline!A2:Z1000' },
    { name: 'Clientes', range: 'Clientes!A2:Z1000' },
    { name: 'Controle de Leads', range: 'Controle de Leads!A2:Z1000' }
  ];

  for (const sheet of sheetsToClear) {
    try {
      await sheets.spreadsheets.values.clear({
        spreadsheetId: SPREADSHEET_ID,
        range: sheet.range
      });
      console.log(`  ✅ ${sheet.name} limpa`);
    } catch (error) {
      console.error(`  ❌ Erro ao limpar ${sheet.name}:`, error.message);
    }
  }
}

async function clearSQLiteDatabase() {
  console.log('\n🗄️  Limpando banco SQLite...');

  const db = new Database('./orbion.db');

  try {
    // Limpar lead_states (conversas ativas)
    const leadStates = db.prepare('DELETE FROM lead_states').run();
    console.log(`  ✅ ${leadStates.changes} estados de leads removidos`);

    // Limpar whatsapp_messages (histórico de mensagens)
    const messages = db.prepare('DELETE FROM whatsapp_messages').run();
    console.log(`  ✅ ${messages.changes} mensagens removidas`);

    // Limpar memory (dados de memória/cache)
    const memory = db.prepare('DELETE FROM memory').run();
    console.log(`  ✅ ${memory.changes} registros de memória removidos`);

    // Resetar sequence numbers se existir tabela
    try {
      db.prepare('DELETE FROM sqlite_sequence').run();
      console.log(`  ✅ Sequence numbers resetados`);
    } catch (err) {
      // Tabela sqlite_sequence pode não existir
    }

  } catch (error) {
    console.error('  ❌ Erro ao limpar SQLite:', error.message);
  } finally {
    db.close();
  }
}

async function main() {
  console.log('🔄 RESETANDO TODOS OS DADOS DO SISTEMA ORBION\n');
  console.log('⚠️  ATENÇÃO: Esta ação é IRREVERSÍVEL!\n');

  try {
    // 1. Limpar SQLite primeiro (mais rápido)
    await clearSQLiteDatabase();

    // 2. Limpar Google Sheets
    await clearGoogleSheets();

    console.log('\n✅ RESET COMPLETO!');
    console.log('📝 Todas as conversas foram reiniciadas');
    console.log('📝 Dados limpos do SQLite e Google Sheets');
    console.log('📝 Próximo passo: Reinicie o servidor com "PORT=3001 node src/server.js"\n');

  } catch (error) {
    console.error('\n❌ Erro durante reset:', error.message);
    process.exit(1);
  }
}

main();

// Script para comparar dados SQLite vs Google Sheets
import Database from 'better-sqlite3';
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const DB_PATH = './orbion.db';
const CREDENTIALS_PATH = './google_credentials.json';
const TOKEN_PATH = './google_token.json';

// Normalizar telefone (mesmo padrão do sistema)
function normalizePhone(phone) {
  if (!phone) return null;
  let cleaned = String(phone).replace(/\D/g, '');
  if (cleaned.startsWith('55') && cleaned.length === 13) {
    cleaned = cleaned.substring(0, 4) + cleaned.substring(5);
  }
  return cleaned;
}

async function getGoogleSheetsData() {
  if (!fs.existsSync(CREDENTIALS_PATH) || !fs.existsSync(TOKEN_PATH)) {
    console.log('❌ Google Sheets não configurado');
    return null;
  }

  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
  const token = JSON.parse(fs.readFileSync(TOKEN_PATH));

  const cfg = credentials.web || credentials.installed || credentials;
  const oauth2Client = new google.auth.OAuth2(
    cfg.client_id,
    cfg.client_secret,
    'http://localhost:3001/oauth2callback'
  );
  oauth2Client.setCredentials(token);

  const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
  const spreadsheetId = process.env.GOOGLE_FUNIL_SHEET_ID || process.env.GOOGLE_LEADS_SHEET_ID || process.env.GOOGLE_SHEET_ID;

  if (!spreadsheetId) {
    console.log('❌ ORBION_SPREADSHEET_ID não configurado no .env');
    return null;
  }

  console.log('📗 Acessando planilha:', spreadsheetId);

  try {
    // Primeiro, listar todas as abas da planilha
    const sheetInfo = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetNames = sheetInfo.data.sheets.map(s => s.properties.title);
    console.log('   Abas disponíveis:', sheetNames.join(', '));

    // Tentar Sheet1 primeiro, depois Funil
    let range = 'Sheet1!A:Z';
    if (!sheetNames.includes('Sheet1') && sheetNames.includes('Funil')) {
      range = 'Funil!A:Z';
    }
    console.log('   Usando aba:', range);

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range
    });
    return response.data.values || [];
  } catch (error) {
    console.log('❌ Erro ao acessar planilha:', error.message);
    return null;
  }
}

function getSQLiteData() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  const leads = db.prepare('SELECT * FROM leads ORDER BY created_at DESC').all();
  db.close();
  return leads;
}

async function compare() {
  console.log('\n📊 COMPARAÇÃO SQLITE vs GOOGLE SHEETS\n');
  console.log('='.repeat(60));

  // 1. Dados do SQLite
  const sqliteLeads = getSQLiteData();
  console.log('\n📁 SQLite: ' + sqliteLeads.length + ' leads\n');

  console.log('Primeiros 5 leads do SQLite:');
  sqliteLeads.slice(0, 5).forEach(lead => {
    console.log('  - ' + lead.telefone + ' | ' + lead.nome + ' | ' + lead.stage_id);
  });

  // 2. Dados do Google Sheets
  const sheetsData = await getGoogleSheetsData();

  if (!sheetsData) {
    console.log('\n⚠️ Não foi possível acessar Google Sheets para comparação');
    return;
  }

  const headers = sheetsData[0] || [];
  const rows = sheetsData.slice(1);

  console.log('\n📗 Google Sheets: ' + rows.length + ' linhas');
  console.log('   Headers: ' + headers.join(', '));

  // Encontrar coluna de telefone
  const phoneColIndex = headers.findIndex(h =>
    /telefone|phone|whatsapp|celular/i.test(h)
  );
  const nameColIndex = headers.findIndex(h =>
    /nome|name|empresa|company/i.test(h)
  );

  if (phoneColIndex === -1) {
    console.log('\n❌ Coluna de telefone não encontrada na planilha');
    console.log('   Headers disponíveis:', headers);
    return;
  }

  console.log('\n   Coluna telefone: índice ' + phoneColIndex + ' (' + headers[phoneColIndex] + ')');
  console.log('   Coluna nome: índice ' + nameColIndex + ' (' + (headers[nameColIndex] || 'N/A') + ')');

  // Criar mapas para comparação
  const sqlitePhones = new Map();
  sqliteLeads.forEach(lead => {
    const phone = normalizePhone(lead.telefone);
    if (phone) sqlitePhones.set(phone, lead);
  });

  const sheetsPhones = new Map();
  rows.forEach(row => {
    const phone = normalizePhone(row[phoneColIndex]);
    if (phone) sheetsPhones.set(phone, row);
  });

  // 3. Comparação
  console.log('\n' + '='.repeat(60));
  console.log('📈 ANÁLISE DE DISCREPÂNCIAS\n');

  // Leads no SQLite mas não na planilha
  const onlySQLite = [];
  sqlitePhones.forEach((lead, phone) => {
    if (!sheetsPhones.has(phone)) {
      onlySQLite.push({ phone, nome: lead.nome });
    }
  });

  // Leads na planilha mas não no SQLite
  const onlySheets = [];
  sheetsPhones.forEach((row, phone) => {
    if (!sqlitePhones.has(phone)) {
      onlySheets.push({ phone, nome: row[nameColIndex] || 'N/A' });
    }
  });

  // Leads em ambos
  const inBoth = [];
  sqlitePhones.forEach((lead, phone) => {
    if (sheetsPhones.has(phone)) {
      inBoth.push(phone);
    }
  });

  console.log('✅ Em ambos: ' + inBoth.length + ' leads');
  console.log('📁 Apenas SQLite: ' + onlySQLite.length + ' leads');
  console.log('📗 Apenas Sheets: ' + onlySheets.length + ' leads');

  if (onlySQLite.length > 0) {
    console.log('\n🔹 Leads APENAS no SQLite (não sincronizados):');
    onlySQLite.slice(0, 10).forEach(l => {
      console.log('   - ' + l.phone + ' | ' + l.nome);
    });
    if (onlySQLite.length > 10) {
      console.log('   ... e mais ' + (onlySQLite.length - 10));
    }
  }

  if (onlySheets.length > 0) {
    console.log('\n🔹 Leads APENAS na Planilha (não importados para SQLite):');
    onlySheets.slice(0, 10).forEach(l => {
      console.log('   - ' + l.phone + ' | ' + l.nome);
    });
    if (onlySheets.length > 10) {
      console.log('   ... e mais ' + (onlySheets.length - 10));
    }
  }

  console.log('\n' + '='.repeat(60));
}

compare().catch(console.error);

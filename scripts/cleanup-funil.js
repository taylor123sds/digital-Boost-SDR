/**
 * Script para limpar e reorganizar a aba "funil"
 * Remove linhas com formato incorreto e mantém apenas dados válidos
 */

import { readSheet, writeSheet, getSheetInfo } from '../src/tools/google_sheets.js';
import { google } from 'googleapis';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const SHEET_ID = process.env.GOOGLE_FUNIL_SHEET_ID || process.env.GOOGLE_LEADS_SHEET_ID;

// Headers corretos para o funil
const CORRECT_HEADERS = [
  'ID', 'Nome', 'Empresa', 'WhatsApp', 'Email',
  'Pipeline Stage', 'Stage Display', 'Cadence Status', 'Cadence Day',
  'Response Type', 'First Response', 'BANT Score',
  'Origem', 'Status', 'Created At', 'Updated At'
];

async function getAuthClient() {
  const credentials = JSON.parse(fs.readFileSync(process.env.GOOGLE_CREDENTIALS_FILE || './secrets/google_credentials.json', 'utf-8'));
  const token = JSON.parse(fs.readFileSync(process.env.GOOGLE_TOKEN_PATH || './secrets/google_token.json', 'utf-8'));

  const { client_id, client_secret } = credentials.web || credentials.installed || credentials;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret);
  oAuth2Client.setCredentials(token);

  return oAuth2Client;
}

async function cleanupFunil() {
  console.log(' Iniciando limpeza da aba funil...\n');

  // 1. Ler dados atuais
  console.log(' Lendo dados atuais...');
  const data = await readSheet(SHEET_ID, 'funil!A:Z');

  if (!data || data.length === 0) {
    console.log(' Nenhum dado encontrado na aba funil');
    return;
  }

  console.log(`   Encontradas ${data.length} linhas (incluindo header)\n`);

  // 2. Separar linhas válidas das inválidas
  const validRows = [];
  const invalidRows = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const id = String(row[0] || '');
    const pipelineStage = String(row[5] || '');

    // Verificar se é formato válido (antigo com lead_ ou novo)
    const isValidFormat = id.startsWith('lead_') ||
                         pipelineStage.startsWith('stage_') ||
                         pipelineStage === 'Em Cadência' ||
                         pipelineStage === 'Respondeu / Em Interação';

    // Extrair telefone de qualquer formato
    const phone = id.replace('lead_', '').replace(/\D/g, '') ||
                 String(row[3] || '').replace(/\D/g, '') ||
                 String(row[0] || '').replace(/\D/g, '');

    if (phone && phone.length >= 10 && isValidFormat) {
      validRows.push({
        original: row,
        phone,
        index: i
      });
    } else if (phone && phone.length >= 10) {
      // Linha com telefone válido mas formato errado - tentar converter
      invalidRows.push({
        original: row,
        phone,
        index: i
      });
    }
  }

  console.log(` Linhas válidas: ${validRows.length}`);
  console.log(`  Linhas para converter: ${invalidRows.length}\n`);

  // 3. Converter linhas inválidas para formato correto
  const convertedRows = [];
  for (const invalid of invalidRows) {
    const row = invalid.original;
    const phone = invalid.phone;

    // Tentar extrair dados do formato antigo
    const converted = [
      `lead_${phone}`,                           // A: ID
      row[1] || row[0] || '',                    // B: Nome
      row[2] || '',                              // C: Empresa
      phone,                                      // D: WhatsApp
      row[4] || '',                              // E: Email
      'stage_em_cadencia',                        // F: Pipeline Stage
      'Em Cadência',                              // G: Stage Display
      'active',                                   // H: Cadence Status
      '1',                                        // I: Cadence Day
      '',                                         // J: Response Type
      '',                                         // K: First Response
      row[7] || '0',                              // L: BANT Score
      row[12] || 'migrado',                       // M: Origem
      'migrado',                                  // N: Status
      row[14] || new Date().toISOString(),        // O: Created At
      new Date().toISOString()                    // P: Updated At
    ];

    convertedRows.push(converted);
  }

  // 4. Remover duplicatas (manter mais recente)
  const phoneMap = new Map();

  // Primeiro adicionar linhas válidas
  for (const valid of validRows) {
    const existing = phoneMap.get(valid.phone);
    if (!existing) {
      phoneMap.set(valid.phone, valid.original);
    }
  }

  // Adicionar convertidas apenas se não existir
  for (const converted of convertedRows) {
    const phone = converted[3];
    if (!phoneMap.has(phone)) {
      phoneMap.set(phone, converted);
    }
  }

  console.log(` Total de leads únicos: ${phoneMap.size}\n`);

  // 5. Preparar dados finais
  const finalData = [CORRECT_HEADERS];

  for (const [phone, row] of phoneMap) {
    // Garantir que a linha tenha 16 colunas
    const normalizedRow = Array(16).fill('');

    // Copiar dados existentes
    for (let i = 0; i < Math.min(row.length, 16); i++) {
      normalizedRow[i] = row[i] || '';
    }

    // Garantir ID correto
    if (!normalizedRow[0].startsWith('lead_')) {
      normalizedRow[0] = `lead_${phone}`;
    }

    // Garantir WhatsApp
    normalizedRow[3] = phone;

    finalData.push(normalizedRow);
  }

  console.log(` Preparando para escrever ${finalData.length} linhas...\n`);

  // 6. Limpar a aba e reescrever
  const auth = await getAuthClient();
  const sheets = google.sheets({ version: 'v4', auth });

  // Obter sheetId da aba funil
  const sheetInfo = await getSheetInfo(SHEET_ID);
  const funilSheet = sheetInfo.sheets.find(s => s.title === 'funil');

  if (!funilSheet) {
    console.log(' Aba funil não encontrada');
    return;
  }

  // Limpar conteúdo (mantém a aba)
  console.log('  Limpando aba funil...');
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SHEET_ID,
    range: 'funil!A:Z'
  });

  // Escrever dados limpos
  console.log('  Escrevendo dados limpos...');
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: 'funil!A1',
    valueInputOption: 'RAW',
    resource: {
      values: finalData
    }
  });

  console.log('\n Limpeza concluída!');
  console.log(`   - Total de leads: ${finalData.length - 1}`);
  console.log(`   - Headers atualizados para formato correto`);
  console.log(`   - Duplicatas removidas`);
  console.log(`   - Linhas com formato errado convertidas`);
}

// Executar
cleanupFunil().catch(console.error);

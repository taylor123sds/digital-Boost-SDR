// utils/sheetsManager.js
//  UNIFIED GOOGLE SHEETS MANAGER - Clean implementation using canonical schema

import { readSheet, writeSheet, appendSheet, getSheetInfo } from '../tools/google_sheets.js';
import { google } from 'googleapis';
import fs from 'fs';
import { Notification } from '../models/Notification.js';

const SHEET_ID = process.env.GOOGLE_FUNIL_SHEET_ID || process.env.GOOGLE_LEADS_SHEET_ID;
const SHEET_NAME = 'funil'; // Single source of truth

//  ERROR ALERTING: Track failures for monitoring
const ALERT_THRESHOLD = 3; // Alert after 3 consecutive failures
let consecutiveFailures = 0;

/**
 *  CANONICAL SHEET STRUCTURE
 * Alinhado com headers existentes na aba "funil"
 * Headers: ID, Nome, Empresa, WhatsApp, Email, Pipeline Stage, Stage Display,
 *          Cadence Status, Cadence Day, Response Type, First Response, BANT Score,
 *          Origem, Status, Created At, Updated At
 */
const SHEET_COLUMNS = {
  A: 'id',                 // ID único (lead_PHONE ou PHONE)
  B: 'nome',               // Nome do lead/contato
  C: 'empresa',            // Nome da empresa
  D: 'whatsapp',           // Número WhatsApp
  E: 'email',              // Email do lead
  F: 'pipeline_stage',     // Estágio no pipeline (stage_prospectado, stage_em_cadencia, stage_respondeu, etc)
  G: 'stage_display',      // Nome amigável do estágio (Prospectado, Em Cadência, Respondeu, etc)
  H: 'cadence_status',     // Status da cadência (active, paused, completed)
  I: 'cadence_day',        // Dia atual na cadência (1, 2, 3...)
  J: 'response_type',      // Tipo de resposta (positive, negative, neutral)
  K: 'first_response',     // Data da primeira resposta
  L: 'bant_score',         // Score BANT (0-100)
  M: 'origem',             // Origem do lead (prospecção_automática, whatsapp, etc)
  N: 'status',             // Status geral (novo, em_andamento, convertido, perdido)
  O: 'created_at',         // Data de criação
  P: 'updated_at'          // Data de atualização
};

// Mapeamento de estágios do pipeline
const PIPELINE_STAGES = {
  prospectado: { id: 'stage_prospectado', display: 'Prospectado' },
  em_cadencia: { id: 'stage_em_cadencia', display: 'Em Cadência' },
  respondeu: { id: 'stage_respondeu', display: 'Respondeu / Em Interação' },
  qualificado: { id: 'stage_qualificado', display: 'Qualificado (BANT)' },
  agendado: { id: 'stage_agendado', display: 'Reunião Agendada' },
  negociacao: { id: 'stage_negociacao', display: 'Em Negociação' },
  convertido: { id: 'stage_convertido', display: 'Convertido / Cliente' },
  perdido: { id: 'stage_perdido', display: 'Perdido / Desqualificado' }
};

const HEADERS = Object.values(SHEET_COLUMNS);

console.log(' [SHEETS-MANAGER] Unified Sheets Manager initialized');

/**
 *  INITIALIZE SHEET
 * Creates "funil" sheet if it doesn't exist
 */
export async function initializeFunnelSheet() {
  try {
    if (!SHEET_ID) {
      throw new Error('GOOGLE_FUNIL_SHEET_ID not configured in .env');
    }

    const sheetInfo = await getSheetInfo(SHEET_ID);
    const funnelExists = sheetInfo.sheets.some(sheet => sheet.title === SHEET_NAME);

    if (funnelExists) {
      console.log(` [SHEETS-MANAGER] Sheet "${SHEET_NAME}" already exists`);
      return { success: true, action: 'EXISTS' };
    }

    // Create new sheet
    const credentials = JSON.parse(fs.readFileSync(process.env.GOOGLE_CREDENTIALS_FILE || './google_credentials.json', 'utf-8'));
    const token = JSON.parse(fs.readFileSync(process.env.GOOGLE_TOKEN_PATH || './google_token.json', 'utf-8'));

    const { client_id, client_secret } = credentials.web || credentials.installed || credentials;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret);
    oAuth2Client.setCredentials(token);

    const sheets = google.sheets({ version: 'v4', auth: oAuth2Client });

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      resource: {
        requests: [{
          addSheet: {
            properties: {
              title: SHEET_NAME,
              gridProperties: {
                rowCount: 1000,
                columnCount: 17,
                frozenRowCount: 1
              }
            }
          }
        }]
      }
    });

    // Add headers
    await writeSheet(SHEET_ID, `${SHEET_NAME}!A1:Q1`, [HEADERS]);

    console.log(` [SHEETS-MANAGER] Sheet "${SHEET_NAME}" created with canonical schema`);
    return { success: true, action: 'CREATED' };
  } catch (error) {
    console.error(` [SHEETS-MANAGER] Error initializing sheet:`, error.message);
    throw error;
  }
}

/**
 *  SYNC LEAD TO SHEETS
 * Single function to sync canonical state to Google Sheets
 * Replaces both saveBANTData() and updateFunnelLead()
 *
 * @param {Object} state - Canonical lead state from leadState.schema.js
 * @returns {Promise<Object>} Result of operation
 */
export async function syncLeadToSheets(state) {
  try {
    if (!SHEET_ID) {
      console.warn(' [SHEETS-MANAGER] GOOGLE_FUNIL_SHEET_ID not configured - skipping sync');
      return { success: false, error: 'SHEET_ID_NOT_CONFIGURED' };
    }

    //  FIX: Skip if lead is blocked OR is a bot
    if (state.metadata?.blocked) {
      console.log(` [SHEETS-MANAGER] Lead ${state.phoneNumber} is blocked - skipping sync`);
      return { success: false, error: 'LEAD_BLOCKED' };
    }

    //  FIX: Não sincronizar bots para o funil
    if (state.metadata?.isBot || state.metadata?.suspectedBot) {
      console.log(` [SHEETS-MANAGER] Lead ${state.phoneNumber} is a bot - skipping sync to funil`);
      return { success: false, error: 'LEAD_IS_BOT', isBot: true };
    }

    console.log(` [SHEETS-MANAGER] Syncing lead ${state.phoneNumber} to Google Sheets...`);

    // Ensure sheet exists
    await initializeFunnelSheet();

    //  FIX: Extrair dados do consultativeEngine.slots (SPIN Edition)
    // Fonte canônica: consultativeEngine.slots (DynamicConsultativeEngine v3.0)
    const slots = state.consultativeEngine?.slots || {};
    const spinStage = state.consultativeEngine?.spinStage || state.consultativeEngine?.spin?.currentStage || '';

    // Determinar problema principal (pegar qualquer slot de problema)
    const problemaPrincipal = slots.need_problema_sazonalidade ||
                              slots.need_problema_dependencia ||
                              slots.need_problema_visibilidade ||
                              slots.need_problema_conversao ||
                              '';

    // Verificar se BANT/SPIN está completo
    const isComplete = state.consultativeEngine?.isComplete ||
                       spinStage === 'closing' ||
                       (slots.budget_interesse && slots.authority_decisor && slots.timing_urgencia);

    // Build row matching SPIN schema
    const row = [
      state.phoneNumber,                                    // A: telefone
      state.companyProfile?.nome || '',                     // B: nome
      state.companyProfile?.empresa || '',                  // C: empresa
      state.companyProfile?.setor || 'energia_solar',       // D: setor
      state.currentAgent || 'sdr',                          // E: currentAgent
      state.messageCount || 0,                              // F: messageCount
      spinStage,                                            // G: spin_stage
      isComplete ? 'SIM' : 'NÃO',                          // H: bant_complete
      problemaPrincipal,                                    // I: problema_principal
      slots.budget_interesse || '',                         // J: interesse_budget
      slots.authority_decisor || '',                        // K: decisor
      slots.timing_urgencia || '',                          // L: urgencia
      state.scheduler?.stage || '',                         // M: scheduler_stage
      state.scheduler?.leadEmail || '',                     // N: lead_email
      state.qualification?.score || 0,                      // O: score
      state.metadata?.createdAt || new Date().toISOString(), // P: created_at
      new Date().toISOString()                              // Q: updated_at
    ];

    // Check if lead already exists
    const existingData = await readSheet(SHEET_ID, `${SHEET_NAME}!A:Q`);

    let rowIndex = -1;
    if (existingData && existingData.length > 1) {
      // Search by phone number (column A)
      rowIndex = existingData.findIndex((r, idx) =>
        idx > 0 && r[0] === state.phoneNumber
      );
    }

    if (rowIndex > 0) {
      // UPDATE existing lead
      const range = `${SHEET_NAME}!A${rowIndex + 1}:Q${rowIndex + 1}`;
      await writeSheet(SHEET_ID, range, [row]);

      console.log(` [SHEETS-MANAGER] Lead ${state.phoneNumber} UPDATED (row ${rowIndex + 1})`);

      // Reset failure counter on success
      consecutiveFailures = 0;

      return {
        success: true,
        action: 'UPDATED',
        phoneNumber: state.phoneNumber,
        row: rowIndex + 1
      };
    } else {
      // INSERT new lead
      await appendSheet(SHEET_ID, `${SHEET_NAME}!A:Q`, [row]);

      console.log(` [SHEETS-MANAGER] Lead ${state.phoneNumber} INSERTED`);

      // Reset failure counter on success
      consecutiveFailures = 0;

      return {
        success: true,
        action: 'INSERTED',
        phoneNumber: state.phoneNumber,
        row: existingData ? existingData.length + 1 : 2
      };
    }

  } catch (error) {
    consecutiveFailures++;

    console.error(` [SHEETS-MANAGER] Error syncing lead ${state.phoneNumber}:`, error.message);

    //  ALERT if threshold reached
    if (consecutiveFailures >= ALERT_THRESHOLD) {
      alertSheetsFailure(error, consecutiveFailures);
    }

    return {
      success: false,
      error: error.message,
      phoneNumber: state.phoneNumber,
      consecutiveFailures
    };
  }
}

/**
 *  GET ALL LEADS FROM SHEETS
 * Returns all leads from the canonical "funil" sheet
 */
export async function getAllLeadsFromSheets() {
  try {
    if (!SHEET_ID) {
      console.warn(' [SHEETS-MANAGER] GOOGLE_FUNIL_SHEET_ID not configured');
      return [];
    }

    await initializeFunnelSheet();

    const data = await readSheet(SHEET_ID, `${SHEET_NAME}!A:Q`);

    if (!data || data.length <= 1) {
      console.log(' [SHEETS-MANAGER] No leads found in sheet');
      return [];
    }

    const headers = data[0];
    const leads = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];

      // Skip empty rows
      if (!row[0]) continue;

      const lead = {
        phoneNumber: row[0] || '',
        nome: row[1] || '',
        empresa: row[2] || '',
        setor: row[3] || '',
        currentAgent: row[4] || 'sdr',
        messageCount: parseInt(row[5]) || 0,
        bant_stage: row[6] || '',
        bant_complete: row[7] === 'SIM',
        problema_principal: row[8] || '',
        faixa_investimento: row[9] || '',
        decisor_principal: row[10] || '',
        urgencia: row[11] || '',
        scheduler_stage: row[12] || '',
        lead_email: row[13] || '',
        score: parseInt(row[14]) || 0,
        created_at: row[15] || '',
        updated_at: row[16] || ''
      };

      leads.push(lead);
    }

    console.log(` [SHEETS-MANAGER] Loaded ${leads.length} leads from sheet`);
    return leads;

  } catch (error) {
    console.error(` [SHEETS-MANAGER] Error loading leads:`, error.message);
    return [];
  }
}

/**
 *  ALERT SHEETS FAILURE
 * Logs critical errors and sends notifications to configured channels
 */
async function alertSheetsFailure(error, failureCount) {
  const alert = {
    severity: 'CRITICAL',
    service: 'Google Sheets Sync',
    error: error.message,
    consecutiveFailures: failureCount,
    timestamp: new Date().toISOString(),
    suggestion: 'Check Google Sheets API credentials and quota'
  };

  console.error('\n ========================================');
  console.error(' CRITICAL: Google Sheets Sync Failure');
  console.error(' ========================================');
  console.error(JSON.stringify(alert, null, 2));
  console.error(' ========================================\n');

  //  Create in-app notification for admin users
  try {
    const notification = new Notification();
    const adminUserId = process.env.ADMIN_USER_ID || 'admin';

    notification.create({
      user_id: adminUserId,
      type: 'system_error',
      title: ' Falha Crítica: Google Sheets',
      message: `Sincronização falhou ${failureCount}x consecutivas. Erro: ${error.message}. Verifique credenciais e quota da API.`,
      priority: 'urgent',
      entity_type: 'system',
      entity_id: 'sheets_sync',
      action_url: '/settings/integrations'
    });

    console.log(' [SHEETS-MANAGER] In-app notification sent to admin');
  } catch (notifError) {
    console.error(' [SHEETS-MANAGER] Failed to send in-app notification:', notifError.message);
  }

  //  Send WhatsApp notification if configured
  if (process.env.ALERT_WHATSAPP_NUMBER) {
    try {
      const { sendWhatsAppText } = await import('../services/whatsappAdapterProvider.js');
      const alertMessage = ` *ALERTA CRÍTICO*\n\nGoogle Sheets Sync falhou ${failureCount}x consecutivas.\n\nErro: ${error.message}\n\nAção: Verifique credenciais e quota da API.`;

      await sendWhatsAppText(process.env.ALERT_WHATSAPP_NUMBER, alertMessage);
      console.log(' [SHEETS-MANAGER] WhatsApp alert sent');
    } catch (waError) {
      console.error(' [SHEETS-MANAGER] Failed to send WhatsApp alert:', waError.message);
    }
  }

  //  Send Telegram notification if configured
  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_ALERT_CHAT_ID) {
    try {
      const telegramUrl = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
      const telegramMessage = ` *ALERTA CRÍTICO*\n\n*Serviço:* Google Sheets Sync\n*Falhas consecutivas:* ${failureCount}\n*Erro:* ${error.message}\n\n_Verifique credenciais e quota da API_`;

      await fetch(telegramUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: process.env.TELEGRAM_ALERT_CHAT_ID,
          text: telegramMessage,
          parse_mode: 'Markdown'
        })
      });
      console.log(' [SHEETS-MANAGER] Telegram alert sent');
    } catch (tgError) {
      console.error(' [SHEETS-MANAGER] Failed to send Telegram alert:', tgError.message);
    }
  }

  //  Send email notification if configured (using SMTP)
  if (process.env.SMTP_HOST && process.env.ALERT_EMAIL) {
    try {
      // Dynamic import to avoid loading if not needed
      const nodemailer = await import('nodemailer');

      const transporter = nodemailer.default.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: process.env.ALERT_EMAIL,
        subject: ` [CRÍTICO] Google Sheets Sync - ${failureCount} falhas consecutivas`,
        html: `
          <h2> Alerta Crítico - Google Sheets Sync</h2>
          <p><strong>Serviço:</strong> Google Sheets Sync</p>
          <p><strong>Falhas consecutivas:</strong> ${failureCount}</p>
          <p><strong>Erro:</strong> ${error.message}</p>
          <p><strong>Timestamp:</strong> ${alert.timestamp}</p>
          <hr>
          <p><em>Ação recomendada: Verifique as credenciais da API do Google Sheets e a quota disponível.</em></p>
        `
      });
      console.log(' [SHEETS-MANAGER] Email alert sent');
    } catch (emailError) {
      console.error(' [SHEETS-MANAGER] Failed to send email alert:', emailError.message);
    }
  }
}

/**
 *  GET SHEETS STATISTICS
 * Returns stats about the sheet
 */
export async function getSheetsStatistics() {
  try {
    if (!SHEET_ID) {
      return { error: 'SHEET_ID_NOT_CONFIGURED' };
    }

    const leads = await getAllLeadsFromSheets();

    const stats = {
      total_leads: leads.length,
      by_agent: {
        sdr: leads.filter(l => l.currentAgent === 'sdr').length,
        specialist: leads.filter(l => l.currentAgent === 'specialist').length,
        scheduler: leads.filter(l => l.currentAgent === 'scheduler').length
      },
      by_bant_stage: {
        need: leads.filter(l => l.bant_stage === 'need').length,
        budget: leads.filter(l => l.bant_stage === 'budget').length,
        authority: leads.filter(l => l.bant_stage === 'authority').length,
        timing: leads.filter(l => l.bant_stage === 'timing').length
      },
      bant_complete: leads.filter(l => l.bant_complete).length,
      with_email: leads.filter(l => l.lead_email).length,
      avg_score: leads.length > 0
        ? Math.round(leads.reduce((sum, l) => sum + l.score, 0) / leads.length)
        : 0,
      consecutiveFailures
    };

    return stats;
  } catch (error) {
    console.error(` [SHEETS-MANAGER] Error getting statistics:`, error.message);
    return { error: error.message };
  }
}

/**
 *  MOVE LEAD FROM SHEETS1 TO FUNIL
 * When a lead receives their first message, remove them from prospecting list (Sheets1)
 * and ensure they're only in the active pipeline (funil)
 *
 * @param {string} phoneNumber - Lead phone number
 * @returns {Promise<Object>} Result of operation
 */
export async function moveLeadFromProspectingToFunil(phoneNumber) {
  try {
    if (!SHEET_ID) {
      console.warn(' [SHEETS-MANAGER] SHEET_ID not configured');
      return { success: false, error: 'SHEET_ID_NOT_CONFIGURED' };
    }

    console.log(` [SHEETS-MANAGER] Moving lead ${phoneNumber} from Sheets1 to funil...`);

    // Normalize phone number
    const normalizedPhone = phoneNumber.replace('@lid', '').replace(/\D/g, '');

    // 1. Check if lead exists in prospecting list (first sheet or Sheet1)
    // Try multiple possible sheet names
    let sheets1Data = null;
    const possibleSheetNames = ['Sheet1', 'Sheets1', 'Planilha1', 'Prospecção', 'Leads'];

    for (const sheetName of possibleSheetNames) {
      try {
        sheets1Data = await readSheet(SHEET_ID, `${sheetName}!A:Z`);
        if (sheets1Data && sheets1Data.length > 0) {
          console.log(` [SHEETS-MANAGER] Found data in sheet: ${sheetName}`);
          break;
        }
      } catch (e) {
        // Try next sheet name
        continue;
      }
    }

    // If still no data, try without sheet name (uses first sheet)
    if (!sheets1Data || sheets1Data.length === 0) {
      try {
        sheets1Data = await readSheet(SHEET_ID, 'A:Z');
        if (sheets1Data && sheets1Data.length > 0) {
          console.log(` [SHEETS-MANAGER] Found data in default sheet`);
        }
      } catch (e) {
        console.log(' [SHEETS-MANAGER] No sheets accessible');
      }
    }

    if (!sheets1Data || sheets1Data.length <= 1) {
      console.log(' [SHEETS-MANAGER] No data in Sheets1');
      return { success: true, action: 'NO_DATA_IN_SHEETS1' };
    }

    // Find the lead row in Sheets1
    let leadRowIndex = -1;
    let leadData = null;

    for (let i = 1; i < sheets1Data.length; i++) {
      const row = sheets1Data[i];
      // Check if any cell contains the phone number
      const rowPhones = row.map(cell => String(cell || '').replace(/\D/g, ''));

      if (rowPhones.some(p => p === normalizedPhone || p.endsWith(normalizedPhone) || normalizedPhone.endsWith(p))) {
        leadRowIndex = i + 1; // +1 because sheets are 1-indexed
        leadData = row;
        break;
      }
    }

    if (leadRowIndex === -1) {
      console.log(` [SHEETS-MANAGER] Lead ${phoneNumber} not found in Sheets1 (already moved or never existed)`);
      return { success: true, action: 'NOT_FOUND_IN_SHEETS1' };
    }

    console.log(` [SHEETS-MANAGER] Found lead at row ${leadRowIndex} in Sheets1`);

    // 2. Delete the row from Sheets1
    const credentials = JSON.parse(fs.readFileSync(process.env.GOOGLE_CREDENTIALS_FILE || './google_credentials.json', 'utf-8'));
    const token = JSON.parse(fs.readFileSync(process.env.GOOGLE_TOKEN_PATH || './google_token.json', 'utf-8'));

    const { client_id, client_secret } = credentials.web || credentials.installed || credentials;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret);
    oAuth2Client.setCredentials(token);

    const sheets = google.sheets({ version: 'v4', auth: oAuth2Client });

    // Get sheet ID for Sheets1
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: SHEET_ID
    });

    // Find the prospecting sheet (try multiple names)
    const possibleNames = ['Sheet1', 'Sheets1', 'Planilha1', 'Prospecção', 'Leads'];
    const sheets1Sheet = spreadsheet.data.sheets.find(s =>
      possibleNames.includes(s.properties.title)
    ) || spreadsheet.data.sheets[0]; // Fallback to first sheet

    if (!sheets1Sheet) {
      console.log(' [SHEETS-MANAGER] No sheets found');
      return { success: false, error: 'NO_SHEETS_FOUND' };
    }

    console.log(` [SHEETS-MANAGER] Using sheet: ${sheets1Sheet.properties.title}`);

    const sheetId = sheets1Sheet.properties.sheetId;

    // Delete the row
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      resource: {
        requests: [{
          deleteDimension: {
            range: {
              sheetId: sheetId,
              dimension: 'ROWS',
              startIndex: leadRowIndex - 1, // 0-indexed
              endIndex: leadRowIndex // exclusive
            }
          }
        }]
      }
    });

    console.log(` [SHEETS-MANAGER] Lead ${phoneNumber} REMOVED from Sheets1 (row ${leadRowIndex})`);

    return {
      success: true,
      action: 'REMOVED_FROM_SHEETS1',
      phoneNumber,
      row: leadRowIndex,
      leadData
    };

  } catch (error) {
    console.error(` [SHEETS-MANAGER] Error moving lead from Sheets1:`, error.message);
    return {
      success: false,
      error: error.message,
      phoneNumber
    };
  }
}

/**
 *  CHECK IF LEAD IS IN PROSPECTING LIST
 * Returns true if lead still exists in Sheets1 (hasn't been contacted yet)
 *
 * @param {string} phoneNumber - Lead phone number
 * @returns {Promise<boolean>}
 */
export async function isLeadInProspectingList(phoneNumber) {
  try {
    if (!SHEET_ID) return false;

    const normalizedPhone = phoneNumber.replace('@lid', '').replace(/\D/g, '');
    // Try different sheet names
    let sheets1Data = null;
    const possibleSheets = ['Sheet1', 'Sheets1', 'Planilha1', 'Prospecção', 'Leads'];

    for (const name of possibleSheets) {
      try {
        sheets1Data = await readSheet(SHEET_ID, `${name}!A:Z`);
        if (sheets1Data && sheets1Data.length > 0) break;
      } catch (e) {
        continue;
      }
    }

    // Fallback to first sheet
    if (!sheets1Data || sheets1Data.length === 0) {
      try {
        sheets1Data = await readSheet(SHEET_ID, 'A:Z');
      } catch (e) {
        return false;
      }
    }

    if (!sheets1Data || sheets1Data.length <= 1) return false;

    for (let i = 1; i < sheets1Data.length; i++) {
      const row = sheets1Data[i];
      const rowPhones = row.map(cell => String(cell || '').replace(/\D/g, ''));

      if (rowPhones.some(p => p === normalizedPhone || p.endsWith(normalizedPhone) || normalizedPhone.endsWith(p))) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error(` [SHEETS-MANAGER] Error checking prospecting list:`, error.message);
    return false;
  }
}

/**
 *  REMOVE BOT FROM ALL SHEETS
 * When a lead is confirmed as bot, remove from both prospecting and funil sheets
 *
 * @param {string} phoneNumber - Lead phone number
 * @returns {Promise<Object>} Result of operation
 */
export async function removeBotFromSheets(phoneNumber) {
  try {
    if (!SHEET_ID) {
      console.warn(' [SHEETS-MANAGER] SHEET_ID not configured');
      return { success: false, error: 'SHEET_ID_NOT_CONFIGURED' };
    }

    console.log(` [SHEETS-MANAGER] Removing bot ${phoneNumber} from all sheets...`);

    const normalizedPhone = phoneNumber.replace('@lid', '').replace(/\D/g, '');
    const results = { prospecting: null, funil: null };

    // 1. Remove from prospecting sheet
    try {
      results.prospecting = await moveLeadFromProspectingToFunil(phoneNumber);
    } catch (e) {
      console.error(` [SHEETS-MANAGER] Error removing from prospecting:`, e.message);
    }

    // 2. Remove from funil sheet
    try {
      const funilData = await readSheet(SHEET_ID, `${SHEET_NAME}!A:Q`);

      if (funilData && funilData.length > 1) {
        let rowIndex = -1;

        for (let i = 1; i < funilData.length; i++) {
          const rowPhone = String(funilData[i][0] || '').replace(/\D/g, '');
          if (rowPhone === normalizedPhone || rowPhone.endsWith(normalizedPhone) || normalizedPhone.endsWith(rowPhone)) {
            rowIndex = i + 1;
            break;
          }
        }

        if (rowIndex > 0) {
          // Delete from funil
          const credentials = JSON.parse(fs.readFileSync(process.env.GOOGLE_CREDENTIALS_FILE || './google_credentials.json', 'utf-8'));
          const token = JSON.parse(fs.readFileSync(process.env.GOOGLE_TOKEN_PATH || './google_token.json', 'utf-8'));

          const { client_id, client_secret } = credentials.web || credentials.installed || credentials;
          const oAuth2Client = new google.auth.OAuth2(client_id, client_secret);
          oAuth2Client.setCredentials(token);

          const sheets = google.sheets({ version: 'v4', auth: oAuth2Client });

          const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
          const funilSheet = spreadsheet.data.sheets.find(s => s.properties.title === SHEET_NAME);

          if (funilSheet) {
            await sheets.spreadsheets.batchUpdate({
              spreadsheetId: SHEET_ID,
              resource: {
                requests: [{
                  deleteDimension: {
                    range: {
                      sheetId: funilSheet.properties.sheetId,
                      dimension: 'ROWS',
                      startIndex: rowIndex - 1,
                      endIndex: rowIndex
                    }
                  }
                }]
              }
            });

            console.log(` [SHEETS-MANAGER] Bot ${phoneNumber} REMOVED from funil (row ${rowIndex})`);
            results.funil = { success: true, row: rowIndex };
          }
        } else {
          console.log(` [SHEETS-MANAGER] Bot ${phoneNumber} not found in funil`);
          results.funil = { success: true, notFound: true };
        }
      }
    } catch (e) {
      console.error(` [SHEETS-MANAGER] Error removing from funil:`, e.message);
      results.funil = { success: false, error: e.message };
    }

    return {
      success: true,
      phoneNumber,
      results
    };

  } catch (error) {
    console.error(` [SHEETS-MANAGER] Error removing bot from sheets:`, error.message);
    return {
      success: false,
      error: error.message,
      phoneNumber
    };
  }
}

export default {
  syncLeadToSheets,
  getAllLeadsFromSheets,
  getSheetsStatistics,
  initializeFunnelSheet,
  moveLeadFromProspectingToFunil,
  isLeadInProspectingList,
  removeBotFromSheets
};

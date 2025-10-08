// src/tools/google_sheets.js
// Integração Google Sheets API para ORBION
import fs from "fs";
import { google } from "googleapis";

// --------- Config (.env) ---------
const CREDENTIALS_PATH = process.env.GOOGLE_CREDENTIALS_FILE || "./google_credentials.json";
const TOKEN_PATH = process.env.GOOGLE_TOKEN_PATH || "./google_token.json";

// Scopes para Google Sheets
const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/calendar"
];

// ========= Helpers básicos =========
function assertFileExists(p) {
  if (!fs.existsSync(p)) {
    throw new Error(`Credenciais não encontradas em ${p}. Configure o arquivo de credenciais primeiro.`);
  }
}

function loadCredentials() {
  assertFileExists(CREDENTIALS_PATH);
  const raw = fs.readFileSync(CREDENTIALS_PATH, "utf-8");
  const json = JSON.parse(raw);

  const cfg = json.web || json.installed || json;
  const client_id = cfg.client_id;
  const client_secret = cfg.client_secret;

  if (!client_id || !client_secret) {
    throw new Error("Arquivo de credenciais não possui client_id/client_secret.");
  }

  return { client_id, client_secret };
}

function newOAuthClient() {
  const { client_id, client_secret } = loadCredentials();
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3001/oauth2callback";
  return new google.auth.OAuth2(client_id, client_secret, redirectUri);
}

async function loadSavedToken() {
  if (!fs.existsSync(TOKEN_PATH)) {
    return null;
  }
  try {
    const raw = await fs.promises.readFile(TOKEN_PATH, "utf-8");
    return JSON.parse(raw);
  } catch (error) {
    console.warn('⚠️ Token salvo inválido:', error.message);
    return null;
  }
}

async function getAuthorizedClient() {
  const oAuth2Client = newOAuthClient();
  const token = await loadSavedToken();

  if (!token) {
    throw new Error("Token não encontrado. Execute a autorização OAuth primeiro.");
  }

  oAuth2Client.setCredentials(token);
  return oAuth2Client;
}

// ========= API Functions =========

/**
 * Lê dados de uma planilha
 * @param {string} spreadsheetId - ID da planilha
 * @param {string} range - Range no formato "Sheet1!A1:C10"
 * @returns {Promise<Array>} Matriz com os dados
 */
export async function readSheet(spreadsheetId, range) {
  try {
    const auth = await getAuthorizedClient();
    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    return response.data.values || [];
  } catch (error) {
    console.error('❌ Erro ao ler planilha:', error.message);
    throw new Error(`Erro ao ler planilha: ${error.message}`);
  }
}

/**
 * Escreve dados em uma planilha
 * @param {string} spreadsheetId - ID da planilha
 * @param {string} range - Range no formato "Sheet1!A1"
 * @param {Array<Array>} values - Matriz com os dados a escrever
 * @returns {Promise<Object>} Resultado da operação
 */
export async function writeSheet(spreadsheetId, range, values) {
  try {
    const auth = await getAuthorizedClient();
    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      resource: { values },
    });

    console.log('✅ Dados escritos na planilha:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Erro ao escrever planilha:', error.message);
    throw new Error(`Erro ao escrever planilha: ${error.message}`);
  }
}

/**
 * Adiciona dados ao final da planilha
 * @param {string} spreadsheetId - ID da planilha
 * @param {string} range - Range base (ex: "Sheet1!A:C")
 * @param {Array<Array>} values - Dados a adicionar
 * @returns {Promise<Object>} Resultado da operação
 */
export async function appendSheet(spreadsheetId, range, values) {
  try {
    const auth = await getAuthorizedClient();
    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      resource: { values },
    });

    console.log('✅ Dados adicionados à planilha:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Erro ao adicionar dados:', error.message);
    throw new Error(`Erro ao adicionar dados: ${error.message}`);
  }
}

/**
 * Cria uma nova planilha
 * @param {string} title - Título da planilha
 * @param {Array<string>} sheetNames - Nomes das abas (opcional)
 * @returns {Promise<Object>} Dados da planilha criada
 */
export async function createSheet(title, sheetNames = ['Sheet1']) {
  try {
    const auth = await getAuthorizedClient();
    const sheets = google.sheets({ version: 'v4', auth });

    const resource = {
      properties: { title },
      sheets: sheetNames.map(name => ({
        properties: { title: name }
      }))
    };

    const response = await sheets.spreadsheets.create({ resource });

    console.log('✅ Planilha criada:', response.data.spreadsheetId);
    return response.data;
  } catch (error) {
    console.error('❌ Erro ao criar planilha:', error.message);
    throw new Error(`Erro ao criar planilha: ${error.message}`);
  }
}

/**
 * Busca planilhas no Drive (básico)
 * @param {string} query - Query de busca
 * @returns {Promise<Array>} Lista de planilhas encontradas
 */
export async function searchSheets(query = '') {
  try {
    const auth = await getAuthorizedClient();
    const drive = google.drive({ version: 'v3', auth });

    const response = await drive.files.list({
      q: `mimeType='application/vnd.google-apps.spreadsheet' and name contains '${query}' and trashed=false`,
      fields: 'files(id, name, createdTime, modifiedTime)',
      pageSize: 20
    });

    return response.data.files || [];
  } catch (error) {
    console.error('❌ Erro ao buscar planilhas:', error.message);
    throw new Error(`Erro ao buscar planilhas: ${error.message}`);
  }
}

/**
 * Função utilitária para salvar leads no Google Sheets
 * @param {string} spreadsheetId - ID da planilha de leads
 * @param {Object} leadData - Dados do lead
 */
export async function saveLead(spreadsheetId, leadData) {
  try {
    const timestamp = new Date().toLocaleString('pt-BR');
    const row = [
      timestamp,
      leadData.phone || '',
      leadData.name || '',
      leadData.company || '',
      leadData.segment || '',
      leadData.revenue || '',
      leadData.employees || '',
      leadData.source || 'WhatsApp',
      leadData.status || 'novo',
      leadData.notes || ''
    ];

    await appendSheet(spreadsheetId, 'Sheet1!A:J', [row]);
    console.log('✅ Lead salvo na planilha:', leadData.phone);

    return { success: true, timestamp };
  } catch (error) {
    console.error('❌ Erro ao salvar lead:', error.message);
    throw error;
  }
}

/**
 * Função para salvar interações de WhatsApp e conversas
 * @param {string} spreadsheetId - ID da planilha de interações
 * @param {Object} interactionData - Dados da interação
 */
export async function saveInteraction(spreadsheetId, interactionData) {
  try {
    const timestamp = new Date().toLocaleString('pt-BR');
    const row = [
      timestamp,
      interactionData.leadNome || '',
      interactionData.telefone || '',
      interactionData.tipoInteracao || '',
      interactionData.resumo || '',
      interactionData.resultado || '',
      interactionData.proximosPassos || '',
      interactionData.agente || 'ORBION AI'
    ];

    await appendSheet(spreadsheetId, 'Sheet1!A:H', [row]);
    console.log('✅ Interação salva na planilha:', interactionData.leadNome || interactionData.telefone);

    return {
      success: true,
      timestamp,
      leadNome: interactionData.leadNome
    };
  } catch (error) {
    console.error('❌ Erro ao salvar interação:', error.message);
    throw error;
  }
}

// Função para obter informações da planilha
export async function getSheetInfo(spreadsheetId) {
  try {
    const auth = await getAuthorizedClient();
    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    return {
      title: response.data.properties.title,
      sheets: response.data.sheets.map(sheet => ({
        title: sheet.properties.title,
        sheetId: sheet.properties.sheetId,
        rowCount: sheet.properties.gridProperties?.rowCount || 0,
        columnCount: sheet.properties.gridProperties?.columnCount || 0
      }))
    };
  } catch (error) {
    console.error('❌ Erro ao obter info da planilha:', error.message);
    throw new Error(`Erro ao obter info da planilha: ${error.message}`);
  }
}

/**
 * Busca leads do Google Sheets e retorna no formato compatível com o sistema
 * @param {string} spreadsheetId - ID da planilha (opcional, usa variável de ambiente)
 * @param {string} range - Range a ser lido (opcional, padrão: "A:Z")
 * @returns {Promise<Array>} Array de objetos com os dados dos leads
 */
export async function getLeadsFromGoogleSheets(spreadsheetId = null, range = "A:Z") {
  try {
    // Usa ID da planilha do .env se não fornecido
    const sheetId = spreadsheetId || process.env.GOOGLE_LEADS_SHEET_ID;

    if (!sheetId) {
      console.warn('⚠️ GOOGLE_LEADS_SHEET_ID não configurado no .env');
      return [];
    }

    console.log('📊 Carregando leads do Google Sheets...');
    const data = await readSheet(sheetId, range);

    if (!data || data.length === 0) {
      console.warn('⚠️ Nenhum dado encontrado na planilha');
      return [];
    }

    // Primeira linha como cabeçalhos
    const headers = data[0];
    const leads = [];

    // Converte dados para objetos
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const lead = {};

      headers.forEach((header, index) => {
        lead[header] = row[index] || '';
      });

      // Só adiciona se tem dados válidos (tanto minúscula quanto maiúscula)
      if (lead.Nome || lead.nome || lead.Empresa || lead.empresa || lead.Telefone || lead.telefone || lead.email) {
        leads.push(lead);
      }
    }

    console.log(`✅ ${leads.length} leads carregados do Google Sheets`);
    return leads;

  } catch (error) {
    console.error('❌ Erro ao carregar leads do Google Sheets:', error.message);
    // Retorna array vazio em caso de erro para não quebrar o sistema
    return [];
  }
}

/**
 * Converte dados do Google Sheets para formato CSV string (compatibilidade)
 * @param {string} spreadsheetId - ID da planilha
 * @param {string} range - Range a ser lido
 * @returns {Promise<string>} Dados em formato CSV
 */
export async function getLeadsAsCSV(spreadsheetId = null, range = "A:Z") {
  try {
    const sheetId = spreadsheetId || process.env.GOOGLE_LEADS_SHEET_ID;

    if (!sheetId) {
      return '';
    }

    const data = await readSheet(sheetId, range);

    if (!data || data.length === 0) {
      return '';
    }

    // Converte para CSV
    return data.map(row =>
      row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(',')
    ).join('\n');

  } catch (error) {
    console.error('❌ Erro ao converter leads para CSV:', error.message);
    return '';
  }
}


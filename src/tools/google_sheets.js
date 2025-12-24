// src/tools/google_sheets.js
// Integração Google Sheets API para ORBION
import fs from "fs";
import { google } from "googleapis";

// --------- Config (.env) ---------
const DEFAULT_CREDENTIALS_PATH = "./secrets/google_credentials.json";
const DEFAULT_TOKEN_PATH = "./secrets/google_token.json";
const LEGACY_CREDENTIALS_PATH = "./google_credentials.json";
const LEGACY_TOKEN_PATH = "./google_token.json";

let legacyCredentialsWarningShown = false;
let legacyTokenWarningShown = false;

const CREDENTIALS_PATH = process.env.GOOGLE_CREDENTIALS_FILE
  || (fs.existsSync(DEFAULT_CREDENTIALS_PATH)
    ? DEFAULT_CREDENTIALS_PATH
    : LEGACY_CREDENTIALS_PATH);

const TOKEN_PATH = process.env.GOOGLE_TOKEN_PATH
  || (fs.existsSync(DEFAULT_TOKEN_PATH)
    ? DEFAULT_TOKEN_PATH
    : LEGACY_TOKEN_PATH);

//  TIMEOUT: Timeout aumentado para operações mais estáveis (15 segundos)
const SHEETS_TIMEOUT = parseInt(process.env.SHEETS_TIMEOUT) || 15000; // 15s

// ═══════════════════════════════════════════════════════════════════════════
// LOCK POR TELEFONE - EVITA RACE CONDITION EM UPSERTS
// ═══════════════════════════════════════════════════════════════════════════

const pendingOperations = new Map(); // phone -> Promise
const PHONE_LOCK_TIMEOUT_MS = parseInt(process.env.PHONE_LOCK_TIMEOUT_MS, 10) || 30000;

/**
 * Executa operação com lock por telefone
 * Garante que operações para o mesmo telefone sejam serializadas
 * @param {string} phone - Telefone normalizado
 * @param {Function} operation - Função async a executar
 * @returns {Promise<any>} Resultado da operação
 */
async function withPhoneLock(phone, operation) {
  const normalizedPhone = phone.replace(/\D/g, '');
  const lockStart = Date.now();

  // Se já tem operação em andamento para este telefone, esperar
  while (pendingOperations.has(normalizedPhone)) {
    if (Date.now() - lockStart > PHONE_LOCK_TIMEOUT_MS) {
      throw new Error(`PHONE_LOCK_TIMEOUT: ${normalizedPhone}`);
    }
    try {
      await pendingOperations.get(normalizedPhone);
    } catch (e) {
      // Ignorar erros da operação anterior
    }
  }

  // Criar promise para esta operação
  const operationPromise = operation();
  pendingOperations.set(normalizedPhone, operationPromise);

  try {
    return await operationPromise;
  } finally {
    pendingOperations.delete(normalizedPhone);
  }
}

// Scopes para Google Sheets
const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/calendar"
];

// ========= Helpers básicos =========

// Track if credentials warning has been shown to avoid log spam
let credentialsWarningShown = false;

function assertFileExists(p) {
  if (!fs.existsSync(p)) {
    if (!credentialsWarningShown) {
      console.warn(` [GOOGLE-SHEETS] Credenciais não encontradas em ${p}`);
      console.warn(`   Configure o arquivo de credenciais para habilitar Google Sheets.`);
      console.warn(`   O sistema funcionará sem sincronização com Sheets.`);
      credentialsWarningShown = true;
    }
    throw new Error(`GOOGLE_SHEETS_DISABLED: Credenciais não encontradas em ${p}`);
  }
}

function warnLegacyPath(p, type) {
  if (p === LEGACY_CREDENTIALS_PATH && !legacyCredentialsWarningShown) {
    console.warn(` [GOOGLE-SHEETS] ${type} usando caminho legado ${p}.`);
    console.warn(`   Mova para ${DEFAULT_CREDENTIALS_PATH} ou defina GOOGLE_CREDENTIALS_FILE.`);
    legacyCredentialsWarningShown = true;
  }
  if (p === LEGACY_TOKEN_PATH && !legacyTokenWarningShown) {
    console.warn(` [GOOGLE-SHEETS] ${type} usando caminho legado ${p}.`);
    console.warn(`   Mova para ${DEFAULT_TOKEN_PATH} ou defina GOOGLE_TOKEN_PATH.`);
    legacyTokenWarningShown = true;
  }
}

/**
 * Check if Google Sheets is configured and available
 * @returns {boolean} true if Google Sheets is configured
 */
export function isGoogleSheetsConfigured() {
  warnLegacyPath(CREDENTIALS_PATH, 'Credenciais');
  warnLegacyPath(TOKEN_PATH, 'Token');
  return fs.existsSync(CREDENTIALS_PATH) && fs.existsSync(TOKEN_PATH);
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
    console.warn(' Token salvo inválido:', error.message);
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

/**
 *  Wrapper com timeout para operações do Google Sheets
 * @param {Promise} promise - Promise da operação
 * @param {number} timeoutMs - Timeout em milissegundos (padrão: SHEETS_TIMEOUT)
 * @returns {Promise} Promise com timeout
 */
async function withTimeout(promise, timeoutMs = SHEETS_TIMEOUT) {
  let timeoutId;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Google Sheets timeout após ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId);
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
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

    //  WRAPPING API CALL COM TIMEOUT
    const response = await withTimeout(
      sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      })
    );

    return response.data.values || [];
  } catch (error) {
    if (error.message.includes('timeout')) {
      console.error(` [SHEETS] Timeout ao ler planilha (>${SHEETS_TIMEOUT}ms):`, range);
    } else {
      console.error(' Erro ao ler planilha:', error.message);
    }
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

    //  WRAPPING API CALL COM TIMEOUT
    const response = await withTimeout(
      sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        resource: { values },
      })
    );

    console.log(' Dados escritos na planilha:', response.data);
    return response.data;
  } catch (error) {
    if (error.message.includes('timeout')) {
      console.error(` [SHEETS] Timeout ao escrever planilha (>${SHEETS_TIMEOUT}ms):`, range);
    } else {
      console.error(' Erro ao escrever planilha:', error.message);
    }
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

    //  WRAPPING API CALL COM TIMEOUT
    const response = await withTimeout(
      sheets.spreadsheets.values.append({
        spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        resource: { values },
      })
    );

    console.log(' Dados adicionados à planilha:', response.data);
    return response.data;
  } catch (error) {
    if (error.message.includes('timeout')) {
      console.error(` [SHEETS] Timeout ao adicionar dados (>${SHEETS_TIMEOUT}ms):`, range);
    } else {
      console.error(' Erro ao adicionar dados:', error.message);
    }
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

    console.log(' Planilha criada:', response.data.spreadsheetId);
    return response.data;
  } catch (error) {
    console.error(' Erro ao criar planilha:', error.message);
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
    console.error(' Erro ao buscar planilhas:', error.message);
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
    console.log(' Lead salvo na planilha:', leadData.phone);

    return { success: true, timestamp };
  } catch (error) {
    console.error(' Erro ao salvar lead:', error.message);
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
    console.log(' Interação salva na planilha:', interactionData.leadNome || interactionData.telefone);

    return {
      success: true,
      timestamp,
      leadNome: interactionData.leadNome
    };
  } catch (error) {
    console.error(' Erro ao salvar interação:', error.message);
    throw error;
  }
}

/**
 * Função para salvar/atualizar dados BANT progressivamente
 * Adiciona ou atualiza lead no funil com os dados coletados
 *  FIX: Usa lock por telefone para evitar race condition e duplicatas
 * @param {string} spreadsheetId - ID da planilha de funil BANT
 * @param {Object} bantData - Dados BANT coletados
 */
export async function saveBANTData(spreadsheetId, bantData) {
  const phone = bantData.contactId || bantData.phone || '';

  //  FIX: Serializa operações para o mesmo telefone
  return withPhoneLock(phone, async () => {
    try {
      const timestamp = new Date().toLocaleString('pt-BR');

    // Extrair dados dos 4 stages BANT
    const needData = bantData.stageData?.need?.campos || {};
    const budgetData = bantData.stageData?.budget?.campos || {};
    const authorityData = bantData.stageData?.authority?.campos || {};
    const timingData = bantData.stageData?.timing?.campos || {};

    // Extrair dados do perfil da empresa
    const companyProfile = bantData.companyProfile || {};

    // Construir linha com todos os campos BANT + Perfil da Empresa
    const row = [
      timestamp,                                          // A: Última atualização
      bantData.contactId || bantData.phone || '',        // B: Telefone

      //  NOVO: Perfil da Empresa (3 campos)
      companyProfile.nome || bantData.contactName || '', // C: Nome do contato
      companyProfile.empresa || '',                       // D: Nome da empresa
      companyProfile.setor || '',                         // E: Setor de atuação

      bantData.currentStage || 'need',                    // F: Stage atual
      bantData.currentAgent || 'specialist',              // G: Agente ativo

      // NEED (Necessidade) - 7 campos (adicionados receita e funcionários)
      needData.problema_principal || '',                  // H: Problema principal
      needData.intensidade_problema || '',                // I: Intensidade
      needData.consequencias || '',                       // J: Consequências
      needData.impacto_receita || '',                     // K: Impacto financeiro
      needData.tentativas_resolucao || '',                // L: Tentativas anteriores
      needData.receita_mensal || '',                      // M:  NOVO: Receita mensal
      needData.funcionarios || '',                        // N:  NOVO: Número de funcionários

      // BUDGET (Orçamento)
      budgetData.verba_disponivel || '',                  // O: Verba disponível
      budgetData.faixa_investimento || '',                // P: Faixa de investimento
      budgetData.expectativa_retorno || '',               // Q: Expectativa de ROI
      budgetData.flexibilidade_budget || '',              // R: Flexibilidade

      // AUTHORITY (Autoridade)
      authorityData.decisor_principal || '',              // S: Decisor principal
      authorityData.autonomia_decisao || '',              // T: Autonomia
      authorityData.processo_aprovacao || '',             // U: Processo de aprovação
      authorityData.criterios_decisao || '',              // V: Critérios de decisão

      // TIMING (Timing)
      timingData.urgencia || '',                          // W: Urgência
      timingData.prazo_ideal || '',                       // X: Prazo ideal
      timingData.motivo_urgencia || '',                   // Y: Motivo da urgência
      timingData.eventos_importantes || '',               // Z: Eventos importantes

      // Metadata
      bantData.qualification?.score || 0,                 // AA: Score de qualificação
      bantData.metadata?.origin || 'WhatsApp',           // AB: Origem
      bantData.messageCount || 0,                        // AC: Nº de mensagens
      bantData.isComplete ? 'COMPLETO' : 'EM_ANDAMENTO'  // AD: Status
    ];

    // Tentar encontrar lead existente para atualizar
    const existingData = await readSheet(spreadsheetId, 'FUNIL-BANT!A:AD');

    let rowIndex = -1;
    if (existingData && existingData.length > 1) {
      // Buscar por telefone (coluna B)
      const phone = bantData.contactId || bantData.phone;
      rowIndex = existingData.findIndex((row, idx) =>
        idx > 0 && row[1] === phone // Pular header (idx > 0)
      );
    }

    if (rowIndex > 0) {
      // Atualizar lead existente
      const range = `FUNIL-BANT!A${rowIndex + 1}:AD${rowIndex + 1}`;
      await writeSheet(spreadsheetId, range, [row]);
      console.log(` [SHEETS] Dados BANT ATUALIZADOS para ${bantData.contactId} (linha ${rowIndex + 1})`);
    } else {
      // Adicionar novo lead
      await appendSheet(spreadsheetId, 'FUNIL-BANT!A:AD', [row]);
      console.log(` [SHEETS] Novo lead BANT ADICIONADO: ${bantData.contactId}`);
    }

    return {
      success: true,
      timestamp,
      contactId: bantData.contactId,
      updated: rowIndex > 0,
      stage: bantData.currentStage
    };
    } catch (error) {
      console.error(' [SHEETS] Erro ao salvar dados BANT:', error.message);
      // Não propagar erro para não quebrar o fluxo do agente
      return {
        success: false,
        error: error.message,
        contactId: bantData.contactId
      };
    }
  }); // Fecha withPhoneLock
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
    console.error(' Erro ao obter info da planilha:', error.message);
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
      console.warn(' GOOGLE_LEADS_SHEET_ID não configurado no .env');
      return [];
    }

    console.log(' Carregando leads do Google Sheets...');
    const data = await readSheet(sheetId, range);

    if (!data || data.length === 0) {
      console.warn(' Nenhum dado encontrado na planilha');
      return [];
    }

    //  FIX: Cabeçalho correto com WhatsApp na coluna 8
    // Formato esperado: Data/Hora | Empresa | CNPJ | Segmento | Porte | Faturamento Est. | Cidade/Estado | WhatsApp | Telefones | Email
    const EXPECTED_HEADERS = ['Data/Hora', 'Empresa', 'CNPJ', 'Segmento', 'Porte', 'Faturamento', 'Cidade', 'WhatsApp', 'Telefone', 'Email'];

    // Detectar qual linha é o cabeçalho correto (deve ter "WhatsApp" ou "Empresa" na posição correta)
    let headerRowIndex = 0;
    let dataStartIndex = 1;

    // Verificar se linha 1 (index 0) é o cabeçalho errado e linha 2 (index 1) é o correto
    if (data.length > 1) {
      const row0 = data[0] || [];
      const row1 = data[1] || [];

      // Se a linha 1 tem "Empresa" na coluna 2 (index 1), é o cabeçalho correto
      // Se a linha 2 tem "Empresa" na coluna 2, usar linha 2 como cabeçalho
      const row0HasCorrectHeader = row0[1]?.toLowerCase?.()?.includes('empresa') || row0[7]?.toLowerCase?.()?.includes('whatsapp');
      const row1HasCorrectHeader = row1[1]?.toLowerCase?.()?.includes('empresa') || row1[7]?.toLowerCase?.()?.includes('whatsapp');

      if (!row0HasCorrectHeader && row1HasCorrectHeader) {
        console.log(' Detectado cabeçalho duplicado - usando linha 2 como cabeçalho');
        headerRowIndex = 1;
        dataStartIndex = 2;
      }
    }

    const headers = data[headerRowIndex];
    const leads = [];

    // Converte dados para objetos
    for (let i = dataStartIndex; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;

      const lead = {};

      headers.forEach((header, index) => {
        if (header) {
          // Normaliza o nome do header para facilitar acesso
          const normalizedHeader = header.trim();
          lead[normalizedHeader] = row[index] || '';
        }
      });

      // Mapear campos para nomes padronizados
      //  FIX: Coluna H (índice 7) é o WhatsApp - leitura direta e prioritária
      const extractPhone = (val) => {
        if (!val) return '';
        const digits = String(val).replace(/\D/g, '');
        return digits.length >= 10 ? digits : '';
      };

      //  PRIORIDADE: Ler telefone da coluna H (índice 7) - WhatsApp
      const columnH = row[7] || ''; // Coluna H = índice 7
      const columnI = row[8] || ''; // Coluna I = Telefones (backup)

      // Tentar extrair telefone da coluna H primeiro, depois coluna I
      let phoneFromColumnH = extractPhone(columnH);
      let phoneFromColumnI = extractPhone(columnI);

      // Usar coluna H como fonte principal
      lead.telefone = phoneFromColumnH || phoneFromColumnI || '';
      lead.whatsapp = lead.telefone;

      // Detectar email - procurar em todos os campos ou usar coluna J
      let detectedEmail = '';
      const columnJ = row[9] || ''; // Coluna J = Email
      if (columnJ && columnJ.includes('@') && columnJ.includes('.')) {
        detectedEmail = columnJ;
      } else {
        // Fallback: procurar email em qualquer campo
        for (const [key, value] of Object.entries(lead)) {
          if (!value || typeof value !== 'string') continue;
          const cleanValue = value.trim();
          if (cleanValue.includes('@') && cleanValue.includes('.')) {
            detectedEmail = cleanValue;
            break;
          }
        }
      }

      //  MAPEAMENTO DIRETO DAS COLUNAS (índices 0-9):
      // A(0): Data/Hora | B(1): Empresa | C(2): CNPJ | D(3): Segmento | E(4): Porte
      // F(5): Faturamento | G(6): Cidade/Estado | H(7): WhatsApp | I(8): Telefones | J(9): Email

      const columnA = row[0] || ''; // Data/Hora
      const columnB = row[1] || ''; // Empresa
      const columnC = row[2] || ''; // CNPJ
      const columnD = row[3] || ''; // Segmento
      const columnE = row[4] || ''; // Porte
      const columnF = row[5] || ''; // Faturamento
      const columnG = row[6] || ''; // Cidade/Estado

      // Mapeamento direto com fallback para headers dinâmicos
      lead.nome = columnB || lead['Empresa'] || lead['Nome'] || lead['empresa'] || lead['nome'] || '';
      lead.empresa = columnB || lead['Empresa'] || lead['empresa'] || '';
      lead.email = detectedEmail || lead['Email'] || lead['email'] || '';
      lead.segmento = columnD || lead['Segmento'] || lead['segmento'] || '';
      lead.cidade = columnG || lead['Cidade/Estado'] || lead['Cidade'] || lead['cidade'] || '';
      lead.cnpj = columnC || lead['CNPJ'] || lead['cnpj'] || '';
      lead.porte = columnE || lead['Porte'] || lead['porte'] || '';
      lead.faturamento = columnF || lead['Faturamento Est.'] || lead['Faturamento'] || lead['faturamento'] || '';

      // Só adiciona se tem dados válidos
      if (lead.nome || lead.empresa || lead.telefone || lead.whatsapp || lead.email) {
        leads.push(lead);
      }
    }

    console.log(` ${leads.length} leads carregados do Google Sheets`);
    return leads;

  } catch (error) {
    console.error(' Erro ao carregar leads do Google Sheets:', error.message);
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
    console.error(' Erro ao converter leads para CSV:', error.message);
    return '';
  }
}

/**
 * Registra lead que respondeu na planilha LEADS-RESPOSTA com sistema de 3 estágios
 *
 *  SISTEMA ANTI-DUPLICAÇÃO:
 * - Verifica se lead já existe na planilha (por número)
 * - Se existir: ATUALIZA o registro com novo estágio e score
 * - Se não existir: ADICIONA novo registro
 *
 * ESTÁGIOS DE CLASSIFICAÇÃO:
 * 1. SEM INTERESSE - Lead pediu para parar de enviar mensagens
 * 2. POSSIVELMENTE INTERESSADO - Continuou conversa mas não chegou na reunião
 * 3. INTERESSADO - Confirmou interesse em reunião
 *
 * @param {string} spreadsheetId - ID da planilha (usa GOOGLE_LEADS_SHEET_ID se não fornecido)
 * @param {Object} leadResponseData - Dados do lead que respondeu
 * @param {string} leadResponseData.numero - Número do telefone
 * @param {string} leadResponseData.nome - Nome do lead
 * @param {string} leadResponseData.mensagem - Mensagem enviada pelo lead
 * @param {string} leadResponseData.estagio - Estágio: 'SEM_INTERESSE', 'POSSIVELMENTE_INTERESSADO', 'INTERESSADO'
 * @param {number} leadResponseData.qualificationScore - Score BANT (0-100)
 * @returns {Promise<Object>} Resultado da operação
 */
export async function saveLeadResponse(spreadsheetId = null, leadResponseData) {
  try {
    const sheetId = spreadsheetId || process.env.GOOGLE_LEADS_SHEET_ID;

    if (!sheetId) {
      throw new Error('GOOGLE_LEADS_SHEET_ID não configurado no .env');
    }

    const timestamp = new Date().toLocaleString('pt-BR');

    // Detectar estágio automaticamente se não foi fornecido
    let estagio = leadResponseData.estagio;

    if (!estagio && leadResponseData.mensagem) {
      estagio = detectarEstagio(leadResponseData.mensagem, leadResponseData.qualificationScore);
    }

    // Converter estágio para texto amigável
    const estagioTexto = getEstagioTexto(estagio);

    //  VERIFICAR SE LEAD JÁ EXISTE
    const leadExistente = await verificarLeadExistente(sheetId, leadResponseData.numero);

    if (leadExistente) {
      //  ATUALIZAR REGISTRO EXISTENTE
      console.log(` Lead já existe na linha ${leadExistente.linha}. Atualizando...`);

      const rowAtualizada = [
        timestamp,
        leadResponseData.numero || '',
        leadResponseData.nome || leadExistente.nome,
        estagioTexto,
        leadResponseData.qualificationScore || 0
      ];

      await writeSheet(sheetId, `LEADS-RESPOSTA!A${leadExistente.linha}:E${leadExistente.linha}`, [rowAtualizada]);

      console.log(' Lead atualizado:', {
        numero: leadResponseData.numero,
        nome: leadResponseData.nome || leadExistente.nome,
        estagioAnterior: leadExistente.estagio,
        estagioNovo: estagioTexto,
        scoreAnterior: leadExistente.score,
        scoreNovo: leadResponseData.qualificationScore
      });

      return {
        success: true,
        action: 'ATUALIZADO',
        timestamp,
        numero: leadResponseData.numero,
        nome: leadResponseData.nome || leadExistente.nome,
        estagio: estagioTexto,
        estagioAnterior: leadExistente.estagio
      };

    } else {
      //  ADICIONAR NOVO REGISTRO
      console.log(' Lead novo. Adicionando...');

      const row = [
        timestamp,
        leadResponseData.numero || '',
        leadResponseData.nome || '',
        estagioTexto,
        leadResponseData.qualificationScore || 0
      ];

      await appendSheet(sheetId, 'LEADS-RESPOSTA!A:E', [row]);

      console.log(' Lead que respondeu salvo:', {
        numero: leadResponseData.numero,
        nome: leadResponseData.nome,
        estagio: estagioTexto,
        score: leadResponseData.qualificationScore
      });

      return {
        success: true,
        action: 'ADICIONADO',
        timestamp,
        numero: leadResponseData.numero,
        nome: leadResponseData.nome,
        estagio: estagioTexto
      };
    }
  } catch (error) {
    console.error(' Erro ao salvar lead que respondeu:', error.message);
    throw error;
  }
}

/**
 * Verifica se lead já existe na planilha LEADS-RESPOSTA
 * @param {string} spreadsheetId - ID da planilha
 * @param {string} numero - Número do telefone
 * @returns {Promise<Object|null>} Dados do lead existente ou null
 */
async function verificarLeadExistente(spreadsheetId, numero) {
  try {
    const data = await readSheet(spreadsheetId, 'LEADS-RESPOSTA!A:E');

    if (!data || data.length <= 1) {
      return null; // Planilha vazia ou só cabeçalho
    }

    // Percorrer linhas (pular cabeçalho na linha 1)
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const numeroNaLinha = row[1]; // Coluna B (índice 1)

      if (numeroNaLinha === numero) {
        return {
          linha: i + 1, // +1 porque índice começa em 0, mas planilha em 1
          timestamp: row[0],
          numero: row[1],
          nome: row[2],
          estagio: row[3],
          score: row[4]
        };
      }
    }

    return null; // Lead não encontrado
  } catch (error) {
    console.warn(' Erro ao verificar lead existente:', error.message);
    return null; // Em caso de erro, considera como novo
  }
}

/**
 * Detecta automaticamente o estágio do lead baseado na mensagem
 * @param {string} mensagem - Mensagem do lead
 * @param {number} score - Score de qualificação BANT (0-100)
 * @returns {string} Estágio detectado
 */
function detectarEstagio(mensagem, score = 0) {
  const mensagemLower = mensagem.toLowerCase();

  // ESTÁGIO 1: SEM INTERESSE - Pediu para parar
  const palavrasRejeicao = [
    'para', 'pare', 'parar', 'remover', 'remova', 'sair',
    'não quero', 'nao quero', 'desinteresse', 'sem interesse',
    'não tenho interesse', 'nao tenho interesse', 'deixa pra lá',
    'não me contate', 'nao me contate', 'não envie', 'nao envie',
    'bloquear', 'spam', 'incomoda', 'chato'
  ];

  for (const palavra of palavrasRejeicao) {
    if (mensagemLower.includes(palavra)) {
      return 'SEM_INTERESSE';
    }
  }

  // ESTÁGIO 3: INTERESSADO - Confirmou reunião ou interesse explícito
  const palavrasInteresse = [
    'sim', 'quero', 'aceito', 'topo', 'vamos', 'pode agendar',
    'agenda', 'marcar', 'reunião', 'reuniao', 'meeting',
    'apresentação', 'apresentacao', 'proposta', 'interessado',
    'gostei', 'me interessa', 'vamos conversar', 'bora'
  ];

  // Se score >= 80 (email coletado) + palavras de interesse
  if (score >= 80) {
    return 'INTERESSADO';
  }

  // Se detectar palavras de interesse
  for (const palavra of palavrasInteresse) {
    if (mensagemLower.includes(palavra)) {
      return 'INTERESSADO';
    }
  }

  // ESTÁGIO 2: POSSIVELMENTE INTERESSADO - Continuou conversa (padrão)
  return 'POSSIVELMENTE_INTERESSADO';
}

/**
 * Converte código do estágio para texto amigável
 * @param {string} estagio - Código do estágio
 * @returns {string} Texto descritivo
 */
function getEstagioTexto(estagio) {
  const estagios = {
    'SEM_INTERESSE': ' SEM INTERESSE',
    'POSSIVELMENTE_INTERESSADO': ' POSSIVELMENTE INTERESSADO',
    'INTERESSADO': ' INTERESSADO'
  };

  return estagios[estagio] || ' POSSIVELMENTE INTERESSADO';
}

// =====  INTEGRAÇÃO KANBAN FUNIL - FONTE ÚNICA DE VERDADE =====

/**
 * Cria aba "funil" no Google Sheets se não existir
 * Estrutura com 13 colunas para dados completos do funil BANT
 * @param {string} spreadsheetId - ID da planilha (usa GOOGLE_FUNIL_SHEET_ID se não fornecido)
 * @returns {Promise<Object>} Resultado da operação
 */
export async function createFunnelSheetIfNotExists(spreadsheetId = null) {
  try {
    const sheetId = spreadsheetId || process.env.GOOGLE_FUNIL_SHEET_ID || process.env.GOOGLE_LEADS_SHEET_ID;

    if (!sheetId) {
      throw new Error('GOOGLE_FUNIL_SHEET_ID ou GOOGLE_LEADS_SHEET_ID não configurado no .env');
    }

    const auth = await getAuthorizedClient();
    const sheets = google.sheets({ version: 'v4', auth });

    // Verificar se aba "funil" já existe
    const sheetInfo = await sheets.spreadsheets.get({
      spreadsheetId: sheetId,
    });

    const existingSheet = sheetInfo.data.sheets.find(
      sheet => sheet.properties.title === 'funil'
    );

    if (existingSheet) {
      console.log(' [SHEETS] Aba "funil" já existe');
      return { success: true, action: 'EXISTS', sheetId: existingSheet.properties.sheetId };
    }

    // Criar nova aba "funil"
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      resource: {
        requests: [{
          addSheet: {
            properties: {
              title: 'funil',
              gridProperties: {
                rowCount: 1000,
                columnCount: 13,
                frozenRowCount: 1 // Congelar linha de cabeçalho
              }
            }
          }
        }]
      }
    });

    // Adicionar cabeçalhos
    const headers = [
      'telefone',
      'nome',
      'empresa',
      'setor',
      'stage',
      'bant_stage',
      'currentAgent',
      'score',
      'problema_principal',
      'investimento_disponivel',
      'decisor_principal',
      'urgencia',
      'updated_at'
    ];

    await writeSheet(sheetId, 'funil!A1:M1', [headers]);

    // Formatar cabeçalhos (negrito, cor de fundo)
    const formatRequest = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
    const funnelSheet = formatRequest.data.sheets.find(s => s.properties.title === 'funil');

    if (funnelSheet) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        resource: {
          requests: [{
            repeatCell: {
              range: {
                sheetId: funnelSheet.properties.sheetId,
                startRowIndex: 0,
                endRowIndex: 1,
                startColumnIndex: 0,
                endColumnIndex: 13
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.2, green: 0.5, blue: 0.8 },
                  textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } }
                }
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat)'
            }
          }]
        }
      });
    }

    console.log(' [SHEETS] Aba "funil" criada com sucesso');
    return { success: true, action: 'CREATED', sheetId: funnelSheet?.properties.sheetId };

  } catch (error) {
    console.error(' [SHEETS] Erro ao criar aba funil:', error.message);
    throw new Error(`Erro ao criar aba funil: ${error.message}`);
  }
}

/**
 * Busca todos os leads da aba "funil" do Google Sheets
 * FONTE ÚNICA DE VERDADE para o Kanban
 * @param {string} spreadsheetId - ID da planilha (usa GOOGLE_FUNIL_SHEET_ID se não fornecido)
 * @returns {Promise<Array>} Array de leads no formato do Kanban
 */
export async function getFunnelLeads(spreadsheetId = null) {
  try {
    const sheetId = spreadsheetId || process.env.GOOGLE_FUNIL_SHEET_ID || process.env.GOOGLE_LEADS_SHEET_ID;

    if (!sheetId) {
      console.warn(' GOOGLE_FUNIL_SHEET_ID não configurado no .env');
      return [];
    }

    console.log(' [SHEETS] Carregando leads do funil...');

    // Tentar criar aba se não existir
    await createFunnelSheetIfNotExists(sheetId);

    // Ler dados da aba "funil"
    const data = await readSheet(sheetId, 'funil!A:M');

    if (!data || data.length === 0) {
      console.warn(' [SHEETS] Nenhum lead encontrado na aba funil');
      return [];
    }

    // Primeira linha são os cabeçalhos
    const headers = data[0];
    const leads = [];

    // Converter linhas em objetos
    for (let i = 1; i < data.length; i++) {
      const row = data[i];

      // Ignorar linhas vazias
      if (!row[0]) continue; // telefone é obrigatório

      const lead = {
        telefone: row[0] || '',
        nome: row[1] || '',
        empresa: row[2] || '',
        setor: row[3] || '',
        stage: row[4] || 'sdr',
        bant_stage: row[5] || '',
        currentAgent: row[6] || 'sdr',
        score: parseInt(row[7]) || 0,
        problema_principal: row[8] || '',
        investimento_disponivel: row[9] || '',
        decisor_principal: row[10] || '',
        urgencia: row[11] || '',
        updated_at: row[12] || ''
      };

      leads.push(lead);
    }

    console.log(` [SHEETS] ${leads.length} leads carregados da aba funil`);
    return leads;

  } catch (error) {
    console.error(' [SHEETS] Erro ao carregar leads do funil:', error.message);
    // Retorna array vazio para não quebrar o sistema
    return [];
  }
}

/**
 * Atualiza ou insere lead na aba "funil" do Google Sheets
 * Usa telefone como chave primária (unique identifier)
 * @param {string} telefone - Número do telefone (chave primária)
 * @param {Object} data - Dados do lead a atualizar/inserir
 * @param {string} spreadsheetId - ID da planilha (opcional)
 * @returns {Promise<Object>} Resultado da operação
 */
export async function updateFunnelLead(telefone, data, spreadsheetId = null) {
  try {
    const sheetId = spreadsheetId || process.env.GOOGLE_FUNIL_SHEET_ID || process.env.GOOGLE_LEADS_SHEET_ID;

    if (!sheetId) {
      throw new Error('GOOGLE_FUNIL_SHEET_ID ou GOOGLE_LEADS_SHEET_ID não configurado no .env');
    }

    if (!telefone) {
      throw new Error('Telefone é obrigatório (chave primária)');
    }

    // Normalizar telefone
    const normalizedPhone = telefone.replace('@lid', '').replace(/\D/g, '');
    const leadId = `lead_${normalizedPhone}`;

    console.log(` [SHEETS] Atualizando lead ${normalizedPhone} na aba funil...`);

    // Garantir que aba existe
    await createFunnelSheetIfNotExists(sheetId);

    // Buscar lead existente - procurar por ID ou WhatsApp
    const existingData = await readSheet(sheetId, 'funil!A:P');

    let rowIndex = -1;
    if (existingData && existingData.length > 1) {
      // Buscar por ID (coluna A) ou WhatsApp (coluna D)
      rowIndex = existingData.findIndex((row, idx) => {
        if (idx === 0) return false; // Pular header
        const rowId = String(row[0] || '').replace('lead_', '');
        const rowPhone = String(row[3] || '').replace(/\D/g, '');
        return rowId === normalizedPhone ||
               rowPhone === normalizedPhone ||
               row[0] === leadId;
      });
    }

    // Determinar estágio do pipeline
    const pipelineStage = data.pipeline_stage || data.status || 'stage_prospectado';
    const stageDisplay = {
      // Estágios principais do pipeline
      'stage_lead_novo': 'Lead Novo',
      'stage_prospectado': 'Prospectado',
      'stage_em_cadencia': 'Em Cadência',
      'stage_respondeu': 'Respondeu / Em Interação',
      'stage_qualificado': 'Qualificado (BANT)',
      'stage_triagem_agendada': 'Triagem Agendada',
      'stage_agendado': 'Reunião Agendada',
      'stage_oportunidade': 'Oportunidade',
      'stage_proposta': 'Proposta Enviada',
      'stage_negociacao': 'Em Negociação',
      'stage_ganhou': 'GANHO ',
      'stage_convertido': 'Convertido / Cliente',
      'stage_perdeu': 'PERDIDO ',
      'stage_perdido': 'Perdido / Desqualificado',
      'stage_nutricao': 'Nutrição (Sem Resposta)',
      // Fallbacks
      'prospectado': 'Prospectado',
      'novo': 'Lead Novo'
    }[pipelineStage] || 'Lead Novo';

    // Construir linha de dados - Alinhado com headers existentes no funil:
    // ID, Nome, Empresa, WhatsApp, Email, Pipeline Stage, Stage Display,
    // Cadence Status, Cadence Day, Response Type, First Response, BANT Score,
    // Origem, Status, Created At, Updated At
    const timestamp = new Date().toISOString();
    const row = [
      leadId,                                      // A: ID (lead_PHONE)
      data.nome || data.empresa || '',             // B: Nome
      data.empresa || '',                          // C: Empresa
      normalizedPhone,                             // D: WhatsApp
      data.email || '',                            // E: Email
      pipelineStage,                               // F: Pipeline Stage
      stageDisplay,                                // G: Stage Display
      data.cadence_status || 'active',             // H: Cadence Status
      data.cadence_day || '1',                     // I: Cadence Day
      data.response_type || '',                    // J: Response Type
      data.first_response || '',                   // K: First Response
      data.bant_score || data.score || 0,          // L: BANT Score
      data.origem || 'prospecção_automática',      // M: Origem
      data.status || 'novo',                       // N: Status
      data.created_at || timestamp,                // O: Created At
      timestamp                                    // P: Updated At
    ];

    if (rowIndex > 0) {
      // ATUALIZAR lead existente - MERGE com dados existentes
      const existingRow = existingData[rowIndex];

      // Mesclar dados existentes com novos (novos prevalecem apenas se fornecidos)
      const mergedRow = [
        leadId,                                                                    // A: ID
        data.nome || existingRow[1] || '',                                        // B: Nome
        data.empresa || existingRow[2] || '',                                     // C: Empresa
        normalizedPhone,                                                           // D: WhatsApp
        data.email !== undefined ? data.email : (existingRow[4] || ''),           // E: Email
        pipelineStage,                                                             // F: Pipeline Stage
        stageDisplay,                                                              // G: Stage Display
        data.cadence_status || existingRow[7] || 'active',                        // H: Cadence Status
        data.cadence_day !== undefined ? data.cadence_day : (existingRow[8] || '1'), // I: Cadence Day
        data.response_type || existingRow[9] || '',                               // J: Response Type
        data.first_response || existingRow[10] || '',                             // K: First Response
        data.bant_score !== undefined ? data.bant_score : (existingRow[11] || 0), // L: BANT Score
        data.origem || existingRow[12] || 'prospecção_automática',                // M: Origem
        data.status || existingRow[13] || 'novo',                                 // N: Status
        existingRow[14] || timestamp,                                              // O: Created At (preservar)
        timestamp                                                                  // P: Updated At
      ];

      const range = `funil!A${rowIndex + 1}:P${rowIndex + 1}`;
      await writeSheet(sheetId, range, [mergedRow]);
      console.log(` [SHEETS] Lead ${normalizedPhone} ATUALIZADO na linha ${rowIndex + 1}`);

      return {
        success: true,
        action: 'UPDATED',
        telefone: normalizedPhone,
        row: rowIndex + 1
      };
    } else {
      // INSERIR novo lead
      await appendSheet(sheetId, 'funil!A:P', [row]);
      console.log(` [SHEETS] Lead ${normalizedPhone} ADICIONADO ao funil`);

      return {
        success: true,
        action: 'INSERTED',
        telefone: normalizedPhone,
        row: existingData.length + 1
      };
    }

  } catch (error) {
    console.error(' [SHEETS] Erro ao atualizar lead no funil:', error.message);
    // Não propagar erro para não quebrar o fluxo
    return {
      success: false,
      error: error.message,
      telefone
    };
  }
}

// ============================================================================
// PIPELINE DE VENDAS (Sales Pipeline - Post-Meeting Opportunities)
// ============================================================================

/**
 * Cria a aba "pipeline" na planilha se não existir
 * Pipeline contém oportunidades de venda após qualificação BANT
 *
 * @param {string|null} spreadsheetId - ID da planilha (usa default se null)
 * @returns {Promise<{success: boolean, sheetId?: string, message?: string}>}
 */
export async function createPipelineSheetIfNotExists(spreadsheetId = null) {
  try {
    const sheetId = spreadsheetId || process.env.GOOGLE_SHEET_ID;
    if (!sheetId) {
      throw new Error('Google Sheet ID não configurado');
    }

    console.log('[SHEETS] Verificando/criando aba pipeline...');

    // Verificar se a aba já existe
    const sheetInfo = await getSheetInfo(sheetId);
    const pipelineExists = sheetInfo.sheets.some(sheet => sheet.title === 'pipeline');

    if (pipelineExists) {
      console.log('[SHEETS] Aba pipeline já existe');
      return { success: true, message: 'Aba pipeline já existe' };
    }

    // Criar nova aba "pipeline" usando batchUpdate
    const auth = await getAuthorizedClient();
    const sheets = google.sheets({ version: 'v4', auth });

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      resource: {
        requests: [{
          addSheet: {
            properties: {
              title: 'pipeline',
              gridProperties: {
                rowCount: 1000,
                columnCount: 26,
                frozenRowCount: 1
              }
            }
          }
        }]
      }
    });

    console.log('[SHEETS] Aba pipeline criada');

    // Headers da planilha Pipeline
    const headers = [
      'id',           // A - Identificador único
      'nome',         // B - Nome da oportunidade
      'empresa',      // C - Nome da empresa
      'valor',        // D - Valor da oportunidade (R$)
      'email',        // E - Email do contato
      'telefone',     // F - Telefone do contato
      'setor',        // G - Setor da empresa
      'dor',          // H - Problema/dor principal
      'pipeline_stage', // I - Estágio: discovery, proposal, negotiation, closed_won
      'probability',  // J - Probabilidade de fechamento (%)
      'close_date',   // K - Data prevista de fechamento
      'created_at',   // L - Data de criação
      'updated_at',   // M - Data de última atualização
      // Discovery
      'discovery_transcription_id', // N - ID da transcrição vinculada
      'discovery_meeting_id',       // O - ID da reunião
      // Proposal
      'proposal_valor_original',    // P - Valor original da proposta
      'proposal_desconto',          // Q - Desconto aplicado
      'proposal_valor_final',       // R - Valor final com desconto
      'proposal_servico',           // S - Serviço/produto proposto
      'proposal_data_inicio',       // T - Data de início do serviço
      // Negotiation
      'negotiation_transcription_id', // U - ID da transcrição de negociação
      'negotiation_meeting_id',       // V - ID da reunião de negociação
      'negotiation_resultado',        // W - Resultado (positivo/negativo)
      'negotiation_sentimento',       // X - Sentimento geral
      'negotiation_manual',           // Y - Se foi entrada manual (true/false)
      'negotiation_observacoes'       // Z - Observações adicionais
    ];

    await writeSheet(sheetId, 'pipeline!A1:Z1', [headers]);
    console.log('[SHEETS] Headers do pipeline configurados');

    return {
      success: true,
      sheetId,
      message: 'Aba pipeline criada com sucesso'
    };

  } catch (error) {
    console.error('[SHEETS] Erro ao criar aba pipeline:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Obtém todas as oportunidades do pipeline
 *
 * @param {string|null} spreadsheetId - ID da planilha
 * @returns {Promise<Array>} Array de oportunidades
 */
export async function getPipelineOpportunities(spreadsheetId = null) {
  try {
    const sheetId = spreadsheetId || process.env.GOOGLE_SHEET_ID;
    if (!sheetId) {
      console.warn('[SHEETS] Google Sheet ID não configurado');
      return [];
    }

    // Garantir que a aba existe
    await createPipelineSheetIfNotExists(sheetId);

    // Ler dados da aba pipeline (A:Z = 26 colunas)
    const data = await readSheet(sheetId, 'pipeline!A:Z');

    if (!data || data.length <= 1) {
      console.log('[SHEETS] Nenhuma oportunidade no pipeline');
      return [];
    }

    // Headers esperados
    const headers = data[0];

    // Mapear linhas para objetos
    const opportunities = data.slice(1).map(row => {
      const opp = {};
      headers.forEach((header, index) => {
        opp[header] = row[index] || '';
      });
      return opp;
    }).filter(opp => opp.id); // Filtrar linhas vazias

    console.log(`[SHEETS] ${opportunities.length} oportunidades no pipeline`);
    return opportunities;

  } catch (error) {
    console.error('[SHEETS] Erro ao obter oportunidades do pipeline:', error.message);
    return [];
  }
}

/**
 * Adiciona uma nova oportunidade ao pipeline
 * Geralmente chamado quando um lead é qualificado no funil BANT
 *
 * @param {Object} opportunityData - Dados da oportunidade
 * @returns {Promise<{success: boolean, id?: string, error?: string}>}
 */
export async function addPipelineOpportunity(opportunityData, spreadsheetId = null) {
  try {
    const sheetId = spreadsheetId || process.env.GOOGLE_SHEET_ID;
    if (!sheetId) {
      throw new Error('Google Sheet ID não configurado');
    }

    // Garantir que a aba existe
    await createPipelineSheetIfNotExists(sheetId);

    // Gerar ID único (timestamp + random)
    const id = opportunityData.id || `OPP-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

    const now = new Date().toISOString();

    // Preparar dados da linha
    const row = [
      id,
      opportunityData.nome || '',
      opportunityData.empresa || '',
      opportunityData.valor || 0,
      opportunityData.email || '',
      opportunityData.telefone || '',
      opportunityData.setor || '',
      opportunityData.dor || opportunityData.problema_principal || '',
      opportunityData.pipeline_stage || 'qualification',
      opportunityData.probability || 20,
      opportunityData.close_date || '',
      now,
      now
    ];

    // Obter oportunidades existentes para encontrar próxima linha
    let existingData;
    try {
      existingData = await readSheet(sheetId, 'pipeline!A:A');
    } catch (error) {
      // Se a aba acabou de ser criada, pode não ter dados ainda
      console.log('[SHEETS] Aba pipeline vazia ou recém-criada');
      existingData = null;
    }
    const nextRow = existingData ? existingData.length + 1 : 2;

    // Escrever nova linha
    await writeSheet(sheetId, `pipeline!A${nextRow}:M${nextRow}`, [row]);

    console.log(`[SHEETS] Oportunidade ${id} adicionada ao pipeline`);

    return {
      success: true,
      id,
      row: nextRow
    };

  } catch (error) {
    console.error('[SHEETS] Erro ao adicionar oportunidade ao pipeline:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Atualiza uma oportunidade no pipeline
 * Usado principalmente para drag & drop de stages
 *
 * @param {string} id - ID da oportunidade
 * @param {Object} updateData - Dados para atualizar
 * @returns {Promise<{success: boolean, row?: number, error?: string}>}
 */
export async function updatePipelineOpportunity(id, updateData, spreadsheetId = null) {
  try {
    const sheetId = spreadsheetId || process.env.GOOGLE_SHEET_ID;
    if (!sheetId) {
      throw new Error('Google Sheet ID não configurado');
    }

    // Obter todas as oportunidades
    const data = await readSheet(sheetId, 'pipeline!A:Z');

    if (!data || data.length <= 1) {
      throw new Error('Pipeline vazio');
    }

    const headers = data[0];
    const idIndex = headers.indexOf('id');

    if (idIndex === -1) {
      throw new Error('Coluna ID não encontrada');
    }

    // Encontrar linha da oportunidade
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][idIndex] === id) {
        rowIndex = i;
        break;
      }
    }

    if (rowIndex === -1) {
      throw new Error(`Oportunidade ${id} não encontrada`);
    }

    // Atualizar campos
    const row = data[rowIndex];
    const updatedRow = [...row];

    // Preencher array com valores vazios até ter 26 posições (A:Z)
    while (updatedRow.length < 26) {
      updatedRow.push('');
    }

    // Atualizar campos especificados
    Object.keys(updateData).forEach(key => {
      const colIndex = headers.indexOf(key);
      if (colIndex !== -1) {
        updatedRow[colIndex] = updateData[key];
        console.log(`[SHEETS] Campo ${key} -> coluna ${colIndex} (${String.fromCharCode(65 + colIndex)}) = ${updateData[key]}`);
      } else {
        console.warn(`[SHEETS]  Campo ${key} não encontrado nos headers!`);
      }
    });

    // Atualizar updated_at
    const updatedAtIndex = headers.indexOf('updated_at');
    if (updatedAtIndex !== -1) {
      updatedRow[updatedAtIndex] = new Date().toISOString();
    }

    console.log(`[SHEETS] Escrevendo linha ${rowIndex + 1} com ${updatedRow.length} colunas`);

    // Escrever linha atualizada (rowIndex + 1 porque Sheet é 1-indexed)
    const sheetRow = rowIndex + 1;
    await writeSheet(sheetId, `pipeline!A${sheetRow}:Z${sheetRow}`, [updatedRow]);

    console.log(`[SHEETS] Oportunidade ${id} atualizada (linha ${sheetRow})`);

    return {
      success: true,
      row: sheetRow,
      updatedFields: Object.keys(updateData)
    };

  } catch (error) {
    console.error('[SHEETS] Erro ao atualizar oportunidade:', error.message);
    return {
      success: false,
      error: error.message,
      id
    };
  }
}

// ============================================================================
// CLIENTES (VENDAS FECHADAS)
// ============================================================================

/**
 * Criar aba "clientes" se não existir
 */
export async function createClientesSheetIfNotExists(spreadsheetId = null) {
  try {
    const sheetId = spreadsheetId || process.env.GOOGLE_SHEET_ID;

    // Verificar se a aba já existe
    const sheetInfo = await getSheetInfo(sheetId);
    const clientesExists = sheetInfo.sheets.some(sheet => sheet.title === 'clientes');

    if (clientesExists) {
      return { success: true, message: 'Aba clientes já existe' };
    }

    // Criar nova aba usando batchUpdate
    const auth = await getAuthorizedClient();
    const sheets = google.sheets({ version: 'v4', auth });

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      resource: {
        requests: [{
          addSheet: {
            properties: {
              title: 'clientes',
              gridProperties: {
                rowCount: 1000,
                columnCount: 16,
                frozenRowCount: 1
              }
            }
          }
        }]
      }
    });

    // Headers da planilha
    const headers = [
      'id', 'nome', 'empresa', 'email', 'telefone', 'setor', 'dor',
      'valor_fechado', 'data_fechamento', 'metodo_pagamento', 'prazo_pagamento',
      'produto_servico', 'observacoes', 'origem_pipeline_id',
      'created_at', 'updated_at'
    ];

    await writeSheet(sheetId, 'clientes!A1:P1', [headers]);

    return { success: true, sheetId, message: 'Aba clientes criada com sucesso' };
  } catch (error) {
    console.error('[SHEETS] Erro ao criar aba clientes:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Obter todos os clientes
 */
export async function getClientes(spreadsheetId = null) {
  try {
    const sheetId = spreadsheetId || process.env.GOOGLE_SHEET_ID;

    // Garantir que a aba existe
    await createClientesSheetIfNotExists(sheetId);

    // Ler dados
    let data;
    try {
      data = await readSheet(sheetId, 'clientes!A:P');
    } catch (error) {
      console.log('[SHEETS] Aba clientes vazia ou recém-criada');
      return [];
    }

    if (!data || data.length <= 1) {
      return [];
    }

    const headers = data[0];
    const rows = data.slice(1);

    const clientes = rows.map(row => {
      const cliente = {};
      headers.forEach((header, index) => {
        cliente[header] = row[index] || '';
      });
      return cliente;
    });

    console.log(`[SHEETS] ${clientes.length} clientes encontrados`);
    return clientes;

  } catch (error) {
    console.error('[SHEETS] Erro ao obter clientes:', error.message);
    return [];
  }
}

/**
 * Adicionar novo cliente (quando venda é fechada)
 */
export async function addCliente(clienteData, spreadsheetId = null) {
  try {
    const sheetId = spreadsheetId || process.env.GOOGLE_SHEET_ID;

    // Garantir que a aba existe
    await createClientesSheetIfNotExists(sheetId);

    // Ler dados existentes para determinar próxima linha
    let existingData;
    try {
      existingData = await readSheet(sheetId, 'clientes!A:A');
    } catch (error) {
      console.log('[SHEETS] Aba clientes vazia ou recém-criada');
      existingData = null;
    }
    const nextRow = existingData ? existingData.length + 1 : 2;

    // Gerar ID se não fornecido
    if (!clienteData.id) {
      clienteData.id = `CLI-${Date.now()}`;
    }

    // Adicionar timestamps
    const now = new Date().toISOString();
    clienteData.created_at = now;
    clienteData.updated_at = now;

    // Preparar linha
    const row = [
      clienteData.id,
      clienteData.nome || '',
      clienteData.empresa || '',
      clienteData.email || '',
      clienteData.telefone || '',
      clienteData.setor || '',
      clienteData.dor || '',
      clienteData.valor_fechado || 0,
      clienteData.data_fechamento || now,
      clienteData.metodo_pagamento || '',
      clienteData.prazo_pagamento || '',
      clienteData.produto_servico || '',
      clienteData.observacoes || '',
      clienteData.origem_pipeline_id || '',
      clienteData.created_at,
      clienteData.updated_at
    ];

    // Escrever na planilha
    await writeSheet(sheetId, `clientes!A${nextRow}:P${nextRow}`, [row]);

    console.log(`[SHEETS] Cliente ${clienteData.id} adicionado (linha ${nextRow})`);

    return {
      success: true,
      id: clienteData.id,
      row: nextRow
    };

  } catch (error) {
    console.error('[SHEETS] Erro ao adicionar cliente:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Mover oportunidade fechada do pipeline para clientes
 */
export async function moveOpportunityToCliente(opportunityId, closingData, spreadsheetId = null) {
  try {
    const sheetId = spreadsheetId || process.env.GOOGLE_SHEET_ID;

    // 1. Buscar oportunidade no pipeline
    const opportunities = await getPipelineOpportunities(sheetId);
    const opportunity = opportunities.find(opp => opp.id === opportunityId);

    if (!opportunity) {
      throw new Error(`Oportunidade ${opportunityId} não encontrada no pipeline`);
    }

    // 2. Criar cliente com dados da oportunidade + dados de fechamento
    const clienteData = {
      id: `CLI-${opportunityId.replace('OPP-', '')}`,
      nome: opportunity.nome,
      empresa: opportunity.empresa,
      email: opportunity.email,
      telefone: opportunity.telefone,
      setor: opportunity.setor,
      dor: opportunity.dor,
      valor_fechado: closingData.valor_fechado || opportunity.valor,
      data_fechamento: closingData.data_fechamento || new Date().toISOString(),
      metodo_pagamento: closingData.metodo_pagamento || '',
      prazo_pagamento: closingData.prazo_pagamento || '',
      produto_servico: closingData.produto_servico || '',
      observacoes: closingData.observacoes || '',
      origem_pipeline_id: opportunityId
    };

    // 3. Adicionar à planilha clientes
    const addResult = await addCliente(clienteData, sheetId);

    if (!addResult.success) {
      throw new Error(`Erro ao criar cliente: ${addResult.error}`);
    }

    // 4. Atualizar oportunidade no pipeline para marcar como "moved_to_clients"
    await updatePipelineOpportunity(opportunityId, {
      pipeline_stage: 'closed_won',
      moved_to_clients: 'true',
      cliente_id: clienteData.id
    }, sheetId);

    console.log(`[SHEETS] Oportunidade ${opportunityId} movida para clientes como ${clienteData.id}`);

    return {
      success: true,
      clienteId: clienteData.id,
      opportunityId: opportunityId
    };

  } catch (error) {
    console.error('[SHEETS] Erro ao mover oportunidade para clientes:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// ===== FINANCEIRA FUNCTIONS =====

/**
 * Criar aba de parcelas financeiras se não existir
 * @param {string} spreadsheetId - ID da planilha (opcional)
 * @returns {Promise<Object>} Resultado da operação
 */
export async function createParcelasSheetIfNotExists(spreadsheetId = null) {
  try {
    const sheetId = spreadsheetId || process.env.GOOGLE_SHEET_ID;
    const sheetInfo = await getSheetInfo(sheetId);
    const parcelasExists = sheetInfo.sheets.some(sheet => sheet.title === 'parcelas');

    if (parcelasExists) {
      return { success: true, message: 'Aba parcelas já existe' };
    }

    const auth = await getAuthorizedClient();
    const sheets = google.sheets({ version: 'v4', auth });

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      resource: {
        requests: [{
          addSheet: {
            properties: {
              title: 'parcelas',
              gridProperties: {
                rowCount: 5000,
                columnCount: 20,
                frozenRowCount: 1
              }
            }
          }
        }]
      }
    });

    const headers = [
      'id', 'contrato_id', 'cliente_id', 'cliente_nome', 'cliente_empresa',
      'numero_parcela', 'total_parcelas', 'valor_parcela', 'data_vencimento',
      'data_pagamento', 'valor_pago', 'status', 'dias_atraso',
      'metodo_pagamento', 'observacoes', 'created_at', 'updated_at'
    ];

    await writeSheet(sheetId, 'parcelas!A1:Q1', [headers]);
    return { success: true, sheetId, message: 'Aba parcelas criada com sucesso' };
  } catch (error) {
    console.error('[SHEETS] Erro ao criar aba parcelas:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Criar aba de financeira se não existir
 * @param {string} spreadsheetId - ID da planilha (opcional)
 * @returns {Promise<Object>} Resultado da operação
 */
export async function createFinanceiraSheetIfNotExists(spreadsheetId = null) {
  try {
    const sheetId = spreadsheetId || process.env.GOOGLE_SHEET_ID;
    const sheetInfo = await getSheetInfo(sheetId);
    const financeiraExists = sheetInfo.sheets.some(sheet => sheet.title === 'financeira');

    if (financeiraExists) {
      return { success: true, message: 'Aba financeira já existe' };
    }

    const auth = await getAuthorizedClient();
    const sheets = google.sheets({ version: 'v4', auth });

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      resource: {
        requests: [{
          addSheet: {
            properties: {
              title: 'financeira',
              gridProperties: {
                rowCount: 1000,
                columnCount: 15,
                frozenRowCount: 1
              }
            }
          }
        }]
      }
    });

    const headers = [
      'id', 'cliente_id', 'cliente_nome', 'cliente_empresa', 'valor',
      'condicao_pagamento', 'metodo_pagamento', 'parcelas', 'duracao_meses',
      'status', 'observacoes', 'created_at', 'updated_at'
    ];

    await writeSheet(sheetId, 'financeira!A1:M1', [headers]);
    return { success: true, sheetId, message: 'Aba financeira criada com sucesso' };
  } catch (error) {
    console.error('[SHEETS] Erro ao criar aba financeira:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Obter todos os registros financeiros
 * @param {string} spreadsheetId - ID da planilha (opcional)
 * @returns {Promise<Array>} Lista de registros financeiros
 */
export async function getFinancialRecords(spreadsheetId = null) {
  try {
    const sheetId = spreadsheetId || process.env.GOOGLE_SHEET_ID;

    // Criar aba se não existir
    await createFinanceiraSheetIfNotExists(sheetId);

    const data = await readSheet(sheetId, 'financeira!A:M');

    if (!data || data.length === 0) {
      return [];
    }

    const headers = data[0];
    const rows = data.slice(1);

    return rows.map(row => {
      const record = {};
      headers.forEach((header, index) => {
        record[header] = row[index] || '';
      });
      return record;
    }).filter(record => record.id); // Remover linhas vazias
  } catch (error) {
    console.error('[SHEETS] Erro ao obter registros financeiros:', error.message);
    throw error;
  }
}

/**
 * Adicionar novo registro financeiro com parcelas
 * @param {Object} recordData - Dados do registro
 * @param {string} spreadsheetId - ID da planilha (opcional)
 * @returns {Promise<Object>} Resultado da operação
 */
export async function addFinancialRecord(recordData, spreadsheetId = null) {
  try {
    const sheetId = spreadsheetId || process.env.GOOGLE_SHEET_ID;

    // Criar abas se não existirem
    await createFinanceiraSheetIfNotExists(sheetId);
    await createParcelasSheetIfNotExists(sheetId);

    // Buscar cliente
    const clientes = await getClientes(sheetId);
    const cliente = clientes.find(c => c.id === recordData.cliente_id);

    if (!cliente) {
      return {
        success: false,
        error: 'Cliente não encontrado'
      };
    }

    // Gerar ID único para o contrato
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    const recordId = `FIN-${timestamp}-${randomSuffix}`;

    // Determinar método de pagamento e número de parcelas
    let metodoPagamento = 'N/A';
    let numeroParcelas = 1;

    if (recordData.condicao_pagamento === 'parcelado_cartao') {
      metodoPagamento = 'Cartão';
      numeroParcelas = parseInt(recordData.parcelas) || 1;
    } else if (recordData.condicao_pagamento === 'dividido_pix') {
      metodoPagamento = 'Pix';
      numeroParcelas = parseInt(recordData.duracao_meses) || 1;
    } else if (recordData.condicao_pagamento === 'dividido_boleto') {
      metodoPagamento = 'Boleto';
      numeroParcelas = parseInt(recordData.duracao_meses) || 1;
    } else if (recordData.condicao_pagamento === 'a_vista') {
      metodoPagamento = 'À vista';
      numeroParcelas = 1;
    }

    const valorTotal = parseFloat(recordData.valor) || 0;
    const valorParcela = (valorTotal / numeroParcelas).toFixed(2);

    const now = new Date().toISOString();
    const newRow = [
      recordId,
      cliente.id,
      cliente.nome,
      cliente.empresa || '',
      valorTotal,
      recordData.condicao_pagamento || 'a_vista',
      metodoPagamento,
      numeroParcelas,
      recordData.duracao_meses || 1,
      recordData.status || 'ativo',
      recordData.observacoes || '',
      now,
      now
    ];

    // Adicionar contrato principal
    const contratoData = await readSheet(sheetId, 'financeira!A:A');
    const nextContratoRow = contratoData.length + 1;
    await writeSheet(sheetId, `financeira!A${nextContratoRow}:M${nextContratoRow}`, [newRow]);

    // Gerar parcelas individuais com datas de vencimento
    const dataInicio = recordData.data_inicio ? new Date(recordData.data_inicio) : new Date();
    const diaVencimento = recordData.dia_vencimento || dataInicio.getDate();

    const parcelas = [];
    for (let i = 1; i <= numeroParcelas; i++) {
      // Calcular data de vencimento
      const dataVencimento = new Date(dataInicio);
      dataVencimento.setMonth(dataInicio.getMonth() + i - 1);
      dataVencimento.setDate(diaVencimento);

      // Ajustar se o dia não existe no mês (ex: 31 em fevereiro)
      while (dataVencimento.getDate() !== diaVencimento && diaVencimento > 28) {
        dataVencimento.setDate(dataVencimento.getDate() - 1);
      }

      const parcelaId = `${recordId}-P${i.toString().padStart(2, '0')}`;

      const parcelaRow = [
        parcelaId,
        recordId,
        cliente.id,
        cliente.nome,
        cliente.empresa || '',
        i,
        numeroParcelas,
        valorParcela,
        dataVencimento.toISOString().split('T')[0], // YYYY-MM-DD
        '', // data_pagamento
        '', // valor_pago
        'pendente', // status
        '', // dias_atraso
        metodoPagamento,
        `Parcela ${i}/${numeroParcelas}`,
        now,
        now
      ];

      parcelas.push(parcelaRow);
    }

    // Adicionar todas as parcelas de uma vez
    if (parcelas.length > 0) {
      const parcelasData = await readSheet(sheetId, 'parcelas!A:A');
      const nextParcelaRow = parcelasData.length + 1;
      const range = `parcelas!A${nextParcelaRow}:Q${nextParcelaRow + parcelas.length - 1}`;
      await writeSheet(sheetId, range, parcelas);
    }

    console.log(`[SHEETS] Registro financeiro ${recordId} criado com ${numeroParcelas} parcelas`);

    return {
      success: true,
      recordId: recordId,
      parcelasGeradas: numeroParcelas,
      message: `Registro financeiro criado com ${numeroParcelas} parcelas`
    };
  } catch (error) {
    console.error('[SHEETS] Erro ao adicionar registro financeiro:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Atualizar status de um registro financeiro
 * @param {string} recordId - ID do registro
 * @param {string} status - Novo status
 * @param {string} spreadsheetId - ID da planilha (opcional)
 * @returns {Promise<Object>} Resultado da operação
 */
export async function updateFinancialRecordStatus(recordId, status, spreadsheetId = null) {
  try {
    const sheetId = spreadsheetId || process.env.GOOGLE_SHEET_ID;

    const records = await getFinancialRecords(sheetId);
    const recordIndex = records.findIndex(r => r.id === recordId);

    if (recordIndex === -1) {
      return {
        success: false,
        error: 'Registro não encontrado'
      };
    }

    // Atualizar status (coluna J = índice 9)
    const row = recordIndex + 2; // +2 porque começa em 1 e tem header
    await writeSheet(sheetId, `financeira!J${row}`, [[status]]);

    // Atualizar timestamp
    const now = new Date().toISOString();
    await writeSheet(sheetId, `financeira!M${row}`, [[now]]);

    console.log(`[SHEETS] Status do registro ${recordId} atualizado para ${status}`);

    return {
      success: true,
      recordId,
      status,
      message: 'Status atualizado com sucesso'
    };
  } catch (error) {
    console.error('[SHEETS] Erro ao atualizar status do registro:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Atualizar registro financeiro completo
 * @param {string} recordId - ID do registro
 * @param {Object} updateData - Dados a atualizar (valor, duracao_meses, status, observacoes)
 * @param {string} spreadsheetId - ID da planilha (opcional)
 * @returns {Promise<Object>} Resultado da operação
 */
export async function updateFinancialRecord(recordId, updateData, spreadsheetId = null) {
  try {
    const sheetId = spreadsheetId || process.env.GOOGLE_SHEET_ID;

    const records = await getFinancialRecords(sheetId);
    const recordIndex = records.findIndex(r => r.id === recordId);

    if (recordIndex === -1) {
      return {
        success: false,
        error: 'Registro não encontrado'
      };
    }

    const row = recordIndex + 2; // +2 porque começa em 1 e tem header
    const now = new Date().toISOString();

    // Atualizar campos individualmente
    const updates = [];

    // Valor (coluna E = 5)
    if (updateData.valor !== undefined) {
      updates.push(writeSheet(sheetId, `financeira!E${row}`, [[parseFloat(updateData.valor)]]));
    }

    // Duração em meses (coluna I = 9)
    if (updateData.duracao_meses !== undefined) {
      updates.push(writeSheet(sheetId, `financeira!I${row}`, [[parseInt(updateData.duracao_meses)]]));
    }

    // Status (coluna J = 10)
    if (updateData.status !== undefined) {
      updates.push(writeSheet(sheetId, `financeira!J${row}`, [[updateData.status]]));
    }

    // Observações (coluna K = 11)
    if (updateData.observacoes !== undefined) {
      updates.push(writeSheet(sheetId, `financeira!K${row}`, [[updateData.observacoes]]));
    }

    // Atualizar timestamp (coluna M = 13)
    updates.push(writeSheet(sheetId, `financeira!M${row}`, [[now]]));

    // Executar todas as atualizações
    await Promise.all(updates);

    console.log(`[SHEETS] Registro ${recordId} atualizado com sucesso`);

    return {
      success: true,
      recordId,
      message: 'Registro atualizado com sucesso'
    };
  } catch (error) {
    console.error('[SHEETS] Erro ao atualizar registro:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Buscar todas as parcelas
 * @param {string} spreadsheetId - ID da planilha (opcional)
 * @returns {Promise<Array>} Lista de parcelas
 */
export async function getParcelas(spreadsheetId = null) {
  try {
    const sheetId = spreadsheetId || process.env.GOOGLE_SHEET_ID;

    await createParcelasSheetIfNotExists(sheetId);

    const data = await readSheet(sheetId, 'parcelas!A:Q');

    if (!data || data.length === 0) {
      return [];
    }

    const headers = data[0];
    const rows = data.slice(1);

    const parcelas = rows.map(row => {
      const parcela = {};
      headers.forEach((header, index) => {
        parcela[header] = row[index] || '';
      });
      return parcela;
    }).filter(p => p.id);

    // Calcular dias de atraso para parcelas pendentes
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    parcelas.forEach(parcela => {
      if (parcela.status === 'pendente' && parcela.data_vencimento) {
        const vencimento = new Date(parcela.data_vencimento);
        vencimento.setHours(0, 0, 0, 0);

        if (hoje > vencimento) {
          const diffTime = Math.abs(hoje - vencimento);
          parcela.dias_atraso = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          // Atualizar status baseado no atraso
          if (parcela.dias_atraso > 30) {
            parcela.status = 'inadimplente';
          } else if (parcela.dias_atraso > 0) {
            parcela.status = 'atrasado';
          }
        } else {
          parcela.dias_atraso = 0;
        }
      }
    });

    return parcelas;
  } catch (error) {
    console.error('[SHEETS] Erro ao buscar parcelas:', error.message);
    throw error;
  }
}

/**
 * Atualizar parcela individual (pagamento, status, etc)
 * @param {string} parcelaId - ID da parcela
 * @param {Object} updateData - Dados para atualizar
 * @param {string} spreadsheetId - ID da planilha (opcional)
 * @returns {Promise<Object>} Resultado da operação
 */
export async function updateParcela(parcelaId, updateData, spreadsheetId = null) {
  try {
    const sheetId = spreadsheetId || process.env.GOOGLE_SHEET_ID;

    const parcelas = await getParcelas(sheetId);
    const parcelaIndex = parcelas.findIndex(p => p.id === parcelaId);

    if (parcelaIndex === -1) {
      return {
        success: false,
        error: 'Parcela não encontrada'
      };
    }

    const row = parcelaIndex + 2; // +2 porque começa em 1 e tem header
    const now = new Date().toISOString();

    // Atualizar campos específicos
    if (updateData.data_pagamento !== undefined) {
      await writeSheet(sheetId, `parcelas!J${row}`, [[updateData.data_pagamento]]);
    }
    if (updateData.valor_pago !== undefined) {
      await writeSheet(sheetId, `parcelas!K${row}`, [[updateData.valor_pago]]);
    }
    if (updateData.status !== undefined) {
      await writeSheet(sheetId, `parcelas!L${row}`, [[updateData.status]]);
    }
    if (updateData.dias_atraso !== undefined) {
      await writeSheet(sheetId, `parcelas!M${row}`, [[updateData.dias_atraso]]);
    }

    // Atualizar timestamp
    await writeSheet(sheetId, `parcelas!Q${row}`, [[now]]);

    console.log(`[SHEETS] Parcela ${parcelaId} atualizada com sucesso`);

    return {
      success: true,
      parcelaId,
      message: 'Parcela atualizada com sucesso'
    };
  } catch (error) {
    console.error('[SHEETS] Erro ao atualizar parcela:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Verificar e atualizar status de todas as parcelas (atrasos e inadimplência)
 * @param {string} spreadsheetId - ID da planilha (opcional)
 * @returns {Promise<Object>} Resultado da operação
 */
export async function verificarVencimentos(spreadsheetId = null) {
  try {
    const sheetId = spreadsheetId || process.env.GOOGLE_SHEET_ID;

    const parcelas = await getParcelas(sheetId);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    let atualizadas = 0;
    let inadimplentes = 0;
    let atrasadas = 0;

    for (const parcela of parcelas) {
      if (parcela.status === 'pago') continue;

      const vencimento = new Date(parcela.data_vencimento);
      vencimento.setHours(0, 0, 0, 0);

      if (hoje > vencimento) {
        const diffTime = Math.abs(hoje - vencimento);
        const diasAtraso = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let novoStatus = parcela.status;
        if (diasAtraso > 30) {
          novoStatus = 'inadimplente';
          inadimplentes++;
        } else if (diasAtraso > 0) {
          novoStatus = 'atrasado';
          atrasadas++;
        }

        if (novoStatus !== parcela.status || parcela.dias_atraso != diasAtraso) {
          await updateParcela(parcela.id, {
            status: novoStatus,
            dias_atraso: diasAtraso
          }, sheetId);
          atualizadas++;
        }
      }
    }

    console.log(`[SHEETS] Verificação concluída: ${atualizadas} parcelas atualizadas, ${atrasadas} atrasadas, ${inadimplentes} inadimplentes`);

    return {
      success: true,
      atualizadas,
      atrasadas,
      inadimplentes,
      message: `Verificação concluída: ${atualizadas} parcelas atualizadas`
    };
  } catch (error) {
    console.error('[SHEETS] Erro ao verificar vencimentos:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Atualizar status de um cliente
 * @param {string} clienteId - ID do cliente
 * @param {string} status - Novo status (inadimplente, perdido, ativo, etc)
 * @param {string} spreadsheetId - ID da planilha (opcional)
 * @returns {Promise<Object>} Resultado da operação
 */
export async function updateClienteStatus(clienteId, status, spreadsheetId = null) {
  try {
    const sheetId = spreadsheetId || process.env.GOOGLE_SHEET_ID;

    console.log(`[SHEETS] Updating status for cliente ${clienteId} to ${status}...`);

    // Buscar todos os clientes
    const clientes = await getClientes(sheetId);
    const clienteIndex = clientes.findIndex(c => c.id === clienteId);

    if (clienteIndex === -1) {
      return {
        success: false,
        error: 'Cliente não encontrado'
      };
    }

    // Adicionar coluna de status se não existir
    const data = await readSheet(sheetId, 'clientes!A1:Z1');
    const headers = data[0] || [];

    let statusColumnIndex = headers.indexOf('status');
    if (statusColumnIndex === -1) {
      // Adicionar coluna status
      headers.push('status');
      statusColumnIndex = headers.length - 1;
      await writeSheet(sheetId, 'clientes!A1:Z1', [headers]);
    }

    // Atualizar status (linha = clienteIndex + 2, pois começa em 1 e tem header)
    const row = clienteIndex + 2;
    const column = String.fromCharCode(65 + statusColumnIndex); // A=65
    const range = `clientes!${column}${row}`;

    await writeSheet(sheetId, range, [[status]]);

    console.log(`[SHEETS] Status updated successfully for cliente ${clienteId}`);

    return {
      success: true,
      clienteId,
      status,
      message: 'Status atualizado com sucesso'
    };
  } catch (error) {
    console.error('[SHEETS] Error updating cliente status:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// src/memory.js — memória simples (better-sqlite3)
//  FIX CRÍTICO: Usar conexão centralizada para evitar corrupção do banco
import { getDatabase } from './db/index.js';

//  FIX: Usar getDatabase() dinamicamente ao invés de capturar no top-level
// PROBLEMA: Capturar db no top-level fazia a referência ficar "stale" após reconexão
// SOLUÇÃO: Chamar getDatabase() em cada operação para garantir conexão válida
function getDb() {
  return getDatabase();
}

//  Obter referência inicial para migrations síncronas (executam uma vez no startup)
const db = getDb();

console.log(' [DATABASE] memory.js usando conexão dinâmica via getDb() (WAL mode, busy_timeout configurados no db/connection.js)');

// Executar migrations síncronas
db.exec(`CREATE TABLE IF NOT EXISTS memory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE,
  value TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// Tentar adicionar coluna key (ignorar erro se já existe)
try {
  db.exec(`ALTER TABLE memory ADD COLUMN key TEXT UNIQUE`);
} catch (err) {
  if (!err.message.includes('duplicate column')) {
    console.error('Error adding key column:', err.message);
  }
}

// Tabela para histórico de conversas WhatsApp
db.exec(`CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone_number TEXT NOT NULL,
  message_text TEXT NOT NULL,
  from_me INTEGER DEFAULT 0,
  message_type TEXT DEFAULT 'text',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

//  MIGRATIONS: Adicionar colunas que podem estar faltando em tabelas existentes
// Isso garante compatibilidade quando a tabela foi criada com schema diferente
const whatsappMigrations = [
  { column: 'from_me', sql: 'ALTER TABLE whatsapp_messages ADD COLUMN from_me INTEGER DEFAULT 0' },
  { column: 'timestamp', sql: 'ALTER TABLE whatsapp_messages ADD COLUMN timestamp DATETIME DEFAULT CURRENT_TIMESTAMP' },
  { column: 'direction', sql: 'ALTER TABLE whatsapp_messages ADD COLUMN direction TEXT' },
  { column: 'message', sql: 'ALTER TABLE whatsapp_messages ADD COLUMN message TEXT' }
];

for (const migration of whatsappMigrations) {
  try {
    db.exec(migration.sql);
    console.log(` [MIGRATION] Coluna ${migration.column} adicionada a whatsapp_messages`);
  } catch (err) {
    // Ignorar erro se coluna já existe
    if (!err.message.includes('duplicate column')) {
      console.error(`[MIGRATION] Erro ao adicionar ${migration.column}:`, err.message);
    }
  }
}

// Tabela para eventos/reuniões agendadas
db.exec(`CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  datetime DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// Tabela para tarefas
db.exec(`CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  completed INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// Tabela para análises de documentos
db.exec(`CREATE TABLE IF NOT EXISTS document_analyses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  content TEXT,
  summary TEXT,
  key_points TEXT,
  sentiment TEXT,
  metadata TEXT,
  analyzed_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

//  ENHANCED STATE STORAGE TABLE
db.exec(`CREATE TABLE IF NOT EXISTS enhanced_conversation_states (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone_number TEXT NOT NULL UNIQUE,
  current_state TEXT NOT NULL DEFAULT 'DISCOVERY',
  sub_state TEXT,
  qualification_score INTEGER DEFAULT 0,
  sentiment_polarity TEXT DEFAULT 'neutral',
  sentiment_emotion TEXT DEFAULT 'neutral',
  sentiment_intensity REAL DEFAULT 0.5,
  engagement_level TEXT DEFAULT 'low',
  engagement_momentum TEXT DEFAULT 'stable',
  next_best_action TEXT DEFAULT 'continue_conversation',
  state_transitions TEXT DEFAULT '[]',
  metadata TEXT DEFAULT '{}',
  bant_data TEXT DEFAULT '{}',
  cache_ttl INTEGER DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  current_agent TEXT DEFAULT 'sdr',
  pain_type TEXT,
  message_count INTEGER DEFAULT 0,
  handoff_history TEXT DEFAULT '[]',
  agent_state_data TEXT DEFAULT '{}',
  bant_stage TEXT DEFAULT 'pain_discovery',
  bant_stages TEXT DEFAULT '{}',
  company_profile TEXT DEFAULT '{}'
)`);

//  AGENT METRICS TABLE - Rastreamento de performance por agente
db.exec(`CREATE TABLE IF NOT EXISTS agent_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  event_type TEXT NOT NULL,
  success INTEGER DEFAULT 0,
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

//  MIGRATION P1-2: Adicionar colunas com proteção contra loop infinito
const migrationState = {
  lastRun: 0, // Timestamp da última execução
  attempts: 0, // Contador de tentativas
  maxAttempts: 5, // Máximo de tentativas
  cooldown: 60000 // Cooldown de 60 segundos entre migrações
};

//  WHITELIST de tabelas e colunas permitidas para migrations
const ALLOWED_TABLES = ['enhanced_conversation_states', 'agent_metrics', 'memory'];
const ALLOWED_COLUMNS = {
  enhanced_conversation_states: ['current_agent', 'pain_type', 'pain_description', 'message_count', 'handoff_history', 'agent_state_data', 'bant_data', 'state', 'bant_stage'],
  agent_metrics: [],
  memory: ['key']
};

const addColumnIfNotExists = (tableName, columnName, columnDef) => {
  try {
    //  CRITICAL SECURITY FIX: Validação contra SQL injection
    if (!ALLOWED_TABLES.includes(tableName)) {
      console.error(` [DATABASE-SECURITY] Tabela não permitida: ${tableName}`);
      throw new Error(`Security: Invalid table name "${tableName}"`);
    }

    if (!ALLOWED_COLUMNS[tableName] || !ALLOWED_COLUMNS[tableName].includes(columnName)) {
      console.error(` [DATABASE-SECURITY] Coluna não permitida: ${columnName} na tabela ${tableName}`);
      throw new Error(`Security: Invalid column name "${columnName}" for table "${tableName}"`);
    }

    //  PROTEÇÃO #1: Verificar cooldown
    const now = Date.now();
    if (now - migrationState.lastRun < migrationState.cooldown) {
      console.warn(` [DATABASE] Migração em cooldown (${Math.round((migrationState.cooldown - (now - migrationState.lastRun)) / 1000)}s restantes)`);
      return;
    }

    //  PROTEÇÃO #2: Verificar tentativas
    if (migrationState.attempts >= migrationState.maxAttempts) {
      console.error(` [DATABASE] Máximo de tentativas (${migrationState.maxAttempts}) atingido. Abortando migração.`);
      return;
    }

    migrationState.attempts++;
    migrationState.lastRun = now;

    // Safe to use template literals after whitelist validation
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDef}`);
    console.log(` [DATABASE] Coluna ${columnName} adicionada (tentativa ${migrationState.attempts}/${migrationState.maxAttempts})`);
  } catch (err) {
    if (!err.message.includes('duplicate column')) {
      console.error(` [DATABASE] Erro ao adicionar ${columnName}:`, err.message);
    } else {
      // Coluna já existe, não conta como tentativa
      migrationState.attempts--;
    }
  }
};

addColumnIfNotExists('enhanced_conversation_states', 'current_agent', 'TEXT DEFAULT "sdr"');
addColumnIfNotExists('enhanced_conversation_states', 'pain_type', 'TEXT');
addColumnIfNotExists('enhanced_conversation_states', 'pain_description', 'TEXT');
addColumnIfNotExists('enhanced_conversation_states', 'message_count', 'INTEGER DEFAULT 0');
addColumnIfNotExists('enhanced_conversation_states', 'handoff_history', 'TEXT DEFAULT "[]"');
addColumnIfNotExists('enhanced_conversation_states', 'agent_state_data', 'TEXT DEFAULT "{}"');
addColumnIfNotExists('enhanced_conversation_states', 'bant_data', 'TEXT DEFAULT "{}"');
addColumnIfNotExists('enhanced_conversation_states', 'state', 'TEXT DEFAULT "{}"');
addColumnIfNotExists('enhanced_conversation_states', 'bant_stage', 'TEXT DEFAULT "pain_discovery"');

//  ENHANCED METRICS TABLE
db.exec(`CREATE TABLE IF NOT EXISTS enhanced_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone_number TEXT NOT NULL,
  processing_id TEXT NOT NULL,
  state_from TEXT,
  state_to TEXT,
  qualification_delta INTEGER DEFAULT 0,
  sentiment_change TEXT,
  engagement_change TEXT,
  processing_time_ms INTEGER DEFAULT 0,
  system_version TEXT DEFAULT '4.0.0',
  metadata TEXT DEFAULT '{}',
  logged_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

//  BOT BLOCKS TABLE - Persistência de bloqueios permanentes
db.exec(`CREATE TABLE IF NOT EXISTS bot_blocks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone_number TEXT NOT NULL UNIQUE,
  reason TEXT NOT NULL,
  bot_score REAL,
  blocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  metadata TEXT DEFAULT '{}'
)`);

//  HUMAN VERIFICATIONS TABLE - Rastreamento de verificações humanas
db.exec(`CREATE TABLE IF NOT EXISTS human_verifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone_number TEXT NOT NULL UNIQUE,
  attempts INTEGER DEFAULT 1,
  last_attempt_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  verified INTEGER DEFAULT 0,
  verified_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// Criar índices
db.exec(`CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_phone_date
        ON whatsapp_messages(phone_number, created_at)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_document_analyses_type_date
        ON document_analyses(file_type, analyzed_at)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_enhanced_states_phone
        ON enhanced_conversation_states(phone_number)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_enhanced_metrics_phone_date
        ON enhanced_metrics(phone_number, logged_at)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_bot_blocks_phone
        ON bot_blocks(phone_number)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_human_verifications_phone
        ON human_verifications(phone_number)`);

console.log(' [DATABASE] Inicializado com better-sqlite3');

export async function addMemory(value){
  try {
    const stmt = getDb().prepare(`INSERT INTO memory(value) VALUES(?)`);
    const result = stmt.run(value);
    return result.lastInsertRowid;
  } catch (err) {
    throw err;
  }
}

/**
 * Armazena um valor com chave específica na memória
 * @param {string} key - Chave única
 * @param {any} value - Valor a ser armazenado (será convertido para JSON)
 */
export async function setMemory(key, value){
  try {
    const jsonValue = JSON.stringify(value);
    const stmt = getDb().prepare(`INSERT OR REPLACE INTO memory(key, value) VALUES(?, ?)`);
    const result = stmt.run(key, jsonValue);
    return result.lastInsertRowid;
  } catch (err) {
    throw err;
  }
}

/**
 * Recupera um valor pela chave da memória
 * @param {string} key - Chave para buscar
 * @returns {Promise<any>} Valor armazenado ou null se não encontrado
 */
export async function getMemory(key){
  try {
    const stmt = getDb().prepare(`SELECT value FROM memory WHERE key = ?`);
    const row = stmt.get(key);
    if(!row) return null;
    try {
      return JSON.parse(row.value);
    } catch {
      return row.value;
    }
  } catch (err) {
    throw err;
  }
}

/**
 * Remove um valor pela chave da memória
 * @param {string} key - Chave para remover
 * @returns {Promise<boolean>} True se removido com sucesso
 */
export async function deleteMemory(key){
  try {
    const stmt = getDb().prepare(`DELETE FROM memory WHERE key = ?`);
    const result = stmt.run(key);
    return result.changes > 0;
  } catch (err) {
    throw err;
  }
}

export async function getMemories(limit=10){
  try {
    const stmt = getDb().prepare(`SELECT id, value, created_at FROM memory ORDER BY id DESC LIMIT ?`);
    return stmt.all(limit);
  } catch (err) {
    throw err;
  }
}

/**
 * Salva mensagem do WhatsApp no histórico
 * @param {string} phoneNumber - Número do telefone
 * @param {string} messageText - Texto da mensagem
 * @param {boolean} fromMe - Se a mensagem foi enviada por nós
 * @param {string} messageType - Tipo da mensagem (text, audio, etc)
 * @returns {Promise<number>} ID da mensagem salva
 */
export async function saveMessage(phoneNumber, messageText, fromMe = false, messageType = 'text') {
  try {
    // Validação robusta dos parâmetros
    if (!phoneNumber || typeof phoneNumber !== 'string') {
      throw new Error('phoneNumber é obrigatório e deve ser uma string');
    }

    if (!messageText || typeof messageText !== 'string') {
      console.warn(' saveMessage: messageText inválido:', { messageText, type: typeof messageText });
      messageText = messageText ? String(messageText) : '[Texto vazio]';
    }

    const sanitizedText = messageText.toString().trim();
    if (sanitizedText.length === 0) {
      console.warn(' saveMessage: Texto vazio, usando placeholder');
      messageText = '[Mensagem sem conteúdo]';
    } else {
      messageText = sanitizedText;
    }

    const cleanNumber = phoneNumber.replace('@s.whatsapp.net', '');
    const stmt = getDb().prepare(`INSERT INTO whatsapp_messages(phone_number, message_text, from_me, message_type) VALUES(?, ?, ?, ?)`);
    const result = stmt.run(cleanNumber, messageText, fromMe ? 1 : 0, messageType);
    return result.lastInsertRowid;
  } catch (err) {
    throw err;
  }
}

/**
 * Recupera mensagens recentes de um número
 * @param {string} phoneNumber - Número do telefone
 * @param {number} limit - Limite de mensagens
 * @returns {Promise<array>} Array com as mensagens
 */
export async function getRecentMessages(phoneNumber, limit = 30) {
  try {
    const cleanNumber = phoneNumber.replace('@s.whatsapp.net', '');
    const stmt = getDb().prepare(`SELECT message_text as text, from_me as fromMe, message_type, created_at
       FROM whatsapp_messages
       WHERE phone_number = ?
       ORDER BY created_at DESC
       LIMIT ?`);
    const rows = stmt.all(cleanNumber, limit);
    return (rows || []).reverse(); // Inverter para ordem cronológica
  } catch (err) {
    throw err;
  }
}

/**
 * Obtém estatísticas de conversas
 * @returns {Promise<object>} Estatísticas
 */
export async function getConversationStats() {
  try {
    const stmt = getDb().prepare(`
      SELECT
        COUNT(DISTINCT phone_number) as total_contacts,
        COUNT(*) as total_messages,
        SUM(CASE WHEN from_me = 1 THEN 1 ELSE 0 END) as sent_messages,
        SUM(CASE WHEN from_me = 0 THEN 1 ELSE 0 END) as received_messages,
        SUM(CASE WHEN message_type = 'audio' AND from_me = 1 THEN 1 ELSE 0 END) as audio_messages_sent,
        COUNT(DISTINCT DATE(created_at)) as days_active
      FROM whatsapp_messages
    `);
    const rows = stmt.all();
    return rows[0] || {};
  } catch (err) {
    throw err;
  }
}

/**
 * Obtém estatísticas por período (últimas 24h, 7 dias, 30 dias)
 * @returns {Promise<object>} Estatísticas por período
 */
export async function getStatsByPeriod() {
  try {
    const queries = {
      last_24h: `
        SELECT
          COUNT(DISTINCT phone_number) as contacts_24h,
          COUNT(*) as messages_24h,
          SUM(CASE WHEN from_me = 1 THEN 1 ELSE 0 END) as sent_24h,
          SUM(CASE WHEN from_me = 0 THEN 1 ELSE 0 END) as received_24h
        FROM whatsapp_messages
        WHERE created_at >= datetime('now', '-1 day')
      `,
      last_7d: `
        SELECT
          COUNT(DISTINCT phone_number) as contacts_7d,
          COUNT(*) as messages_7d,
          SUM(CASE WHEN from_me = 1 THEN 1 ELSE 0 END) as sent_7d,
          SUM(CASE WHEN from_me = 0 THEN 1 ELSE 0 END) as received_7d
        FROM whatsapp_messages
        WHERE created_at >= datetime('now', '-7 days')
      `,
      last_30d: `
        SELECT
          COUNT(DISTINCT phone_number) as contacts_30d,
          COUNT(*) as messages_30d,
          SUM(CASE WHEN from_me = 1 THEN 1 ELSE 0 END) as sent_30d,
          SUM(CASE WHEN from_me = 0 THEN 1 ELSE 0 END) as received_30d
        FROM whatsapp_messages
        WHERE created_at >= datetime('now', '-30 days')
      `
    };

    const results = {};

    for (const [period, query] of Object.entries(queries)) {
      const stmt = getDb().prepare(query);
      const rows = stmt.all();
      results[period] = rows[0] || {};
    }

    return results;
  } catch (err) {
    throw err;
  }
}

/**
 * Obtém contatos mais ativos
 * @param {number} limit - Limite de contatos
 * @returns {Promise<array>} Lista de contatos ativos
 */
export async function getTopContacts(limit = 5) {
  try {
    const stmt = getDb().prepare(`
      SELECT
        phone_number,
        COUNT(*) as total_messages,
        SUM(CASE WHEN from_me = 0 THEN 1 ELSE 0 END) as messages_from_contact,
        SUM(CASE WHEN from_me = 1 THEN 1 ELSE 0 END) as messages_to_contact,
        MAX(created_at) as last_interaction
      FROM whatsapp_messages
      GROUP BY phone_number
      ORDER BY total_messages DESC
      LIMIT ?
    `);
    const rows = stmt.all(limit);
    return rows || [];
  } catch (err) {
    throw err;
  }
}

/**
 * Obtém timeline de mensagens por hora
 * @returns {Promise<array>} Mensagens agrupadas por hora
 */
export async function getHourlyMessageStats() {
  try {
    const stmt = getDb().prepare(`
      SELECT
        strftime('%H', created_at) as hour,
        COUNT(*) as message_count,
        SUM(CASE WHEN from_me = 1 THEN 1 ELSE 0 END) as sent,
        SUM(CASE WHEN from_me = 0 THEN 1 ELSE 0 END) as received
      FROM whatsapp_messages
      WHERE created_at >= datetime('now', '-24 hours')
      GROUP BY hour
      ORDER BY hour
    `);
    const rows = stmt.all();
    return rows || [];
  } catch (err) {
    throw err;
  }
}

/**
 * Obtém estatísticas de eventos agendados
 * @returns {Promise<object>} Estatísticas de eventos
 */
export async function getEventStats() {
  try {
    const stmt = getDb().prepare(`
      SELECT
        COUNT(*) as total_events,
        SUM(CASE WHEN datetime > datetime('now') THEN 1 ELSE 0 END) as upcoming_events,
        SUM(CASE WHEN datetime <= datetime('now') THEN 1 ELSE 0 END) as past_events,
        SUM(CASE WHEN datetime >= datetime('now') AND datetime <= datetime('now', '+7 days') THEN 1 ELSE 0 END) as events_this_week
      FROM events
    `);
    const rows = stmt.all();
    return rows[0] || {};
  } catch (err) {
    throw err;
  }
}

/**
 * Obtém taxa de resposta (response rate)
 * @returns {Promise<object>} Taxa de resposta
 */
export async function getResponseRate() {
  try {
    const stmt = getDb().prepare(`
      WITH conversations AS (
        SELECT
          phone_number,
          MIN(CASE WHEN from_me = 0 THEN created_at END) as first_contact,
          MIN(CASE WHEN from_me = 1 THEN created_at END) as first_response
        FROM whatsapp_messages
        GROUP BY phone_number
      )
      SELECT
        COUNT(*) as total_conversations,
        SUM(CASE WHEN first_response IS NOT NULL THEN 1 ELSE 0 END) as responded,
        ROUND(AVG(CASE
          WHEN first_response IS NOT NULL
          THEN (julianday(first_response) - julianday(first_contact)) * 24 * 60
          ELSE NULL
        END), 2) as avg_response_time_minutes
      FROM conversations
      WHERE first_contact IS NOT NULL
    `);
    const rows = stmt.all();
    const stats = rows[0] || {};
    stats.response_rate = stats.total_conversations > 0
      ? Math.round((stats.responded / stats.total_conversations) * 100)
      : 0;
    return stats;
  } catch (err) {
    throw err;
  }
}

/**
 * Executa query SQL (helper para calendar_local.js)
 * @param {string} sql - Query SQL
 * @param {array} params - Parâmetros
 * @returns {Promise} Resultado da execução
 */
export async function run(sql, params = []) {
  try {
    const stmt = getDb().prepare(sql);
    const result = stmt.run(...params);
    return { id: result.lastInsertRowid, changes: result.changes };
  } catch (err) {
    throw err;
  }
}

/**
 * Executa query SQL e retorna todas as linhas (helper para calendar_local.js)
 * @param {string} sql - Query SQL
 * @param {array} params - Parâmetros
 * @returns {Promise<array>} Linhas retornadas
 */
export async function all(sql, params = []) {
  try {
    const stmt = getDb().prepare(sql);
    const rows = stmt.all(...params);
    return rows || [];
  } catch (err) {
    throw err;
  }
}

// ========== FUNÇÕES PARA ANÁLISE DE DOCUMENTOS ==========

/**
 * Salva resultado de análise de documento
 */
export async function saveDocumentAnalysis(analysis) {
  try {
    const stmt = getDb().prepare(`
      INSERT INTO document_analyses
      (file_name, file_type, file_size, content, summary, key_points, sentiment, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      analysis.fileName,
      analysis.fileType,
      analysis.fileSize || 0,
      analysis.content || '',
      analysis.summary || '',
      Array.isArray(analysis.keyPoints) ? analysis.keyPoints.join('\n') : (analysis.keyPoints || ''),
      analysis.sentiment || '',
      JSON.stringify(analysis.metadata || {})
    );

    return { id: result.lastInsertRowid, changes: result.changes };
  } catch (err) {
    throw err;
  }
}

/**
 * Busca histórico de análises de documentos
 */
export async function getDocumentHistory(limit = 10) {
  try {
    const stmt = getDb().prepare(`
      SELECT
        id,
        file_name,
        file_type,
        file_size,
        summary,
        analyzed_at
      FROM document_analyses
      ORDER BY analyzed_at DESC
      LIMIT ?
    `);
    const rows = stmt.all(limit);
    return rows || [];
  } catch (err) {
    throw err;
  }
}

/**
 * Busca análise específica por ID
 */
export async function getDocumentAnalysisById(id) {
  try {
    const stmt = getDb().prepare(`SELECT * FROM document_analyses WHERE id = ?`);
    const row = stmt.get(id);

    if (row && row.metadata) {
      try {
        row.metadata = JSON.parse(row.metadata);
      } catch (e) {
        console.log(' Erro ao parsear metadata:', e.message);
      }
    }
    if (row && row.key_points) {
      row.keyPoints = row.key_points.split('\n').filter(point => point.trim());
    }
    return row;
  } catch (err) {
    throw err;
  }
}

/**
 * Estatísticas de análises por tipo de arquivo
 */
export async function getDocumentAnalysisStats() {
  try {
    const stmt = getDb().prepare(`
      SELECT
        file_type,
        COUNT(*) as total,
        AVG(file_size) as avg_size,
        MAX(analyzed_at) as last_analysis
      FROM document_analyses
      GROUP BY file_type
      ORDER BY total DESC
    `);
    const rows = stmt.all();
    return rows || [];
  } catch (err) {
    throw err;
  }
}

/**
 * Buscar análises por tipo de arquivo
 */
export async function getDocumentAnalysesByType(fileType, limit = 5) {
  try {
    const stmt = getDb().prepare(`
      SELECT
        id,
        file_name,
        summary,
        analyzed_at
      FROM document_analyses
      WHERE file_type = ?
      ORDER BY analyzed_at DESC
      LIMIT ?
    `);
    const rows = stmt.all(fileType, limit);
    return rows || [];
  } catch (err) {
    throw err;
  }
}

// ==========  ENHANCED STATE STORAGE FUNCTIONS ==========

/**
 * Salva ou atualiza estado enhanced da conversa
 *  FIX CRITICAL: Agora faz MERGE de metadata ao invés de substituir
 * @param {string} phoneNumber - Número do telefone
 * @param {object} enhancedState - Estado enhanced completo
 * @returns {Promise} Resultado da operação
 */
export async function saveEnhancedState(phoneNumber, enhancedState) {
  console.log(` [SAVE-ENHANCED-STATE] INÍCIO - Phone: ${phoneNumber}`);
  console.log(` [SAVE-ENHANCED-STATE] Metadata recebido:`, JSON.stringify(enhancedState.metadata || {}, null, 2));

  try {
    if (!phoneNumber || !enhancedState) {
      throw new Error('phoneNumber e enhancedState são obrigatórios');
    }

    const cleanNumber = phoneNumber.replace('@s.whatsapp.net', '');
    const now = Date.now();
    //  FIX: Aumentado de 30 minutos para 24 horas
    // Conversas de vendas B2B podem durar horas/dias, TTL curto causava perda de contexto
    const cacheTTL = now + (24 * 60 * 60 * 1000); // 24 horas

    //  CRITICAL FIX: Buscar estado existente para fazer MERGE de metadata
    const existingState = await getEnhancedState(phoneNumber);

    //  MERGE de metadata: preserva dados anteriores e adiciona novos
    let mergedMetadata = {
      ...(existingState?.metadata || {}),  // Dados antigos
      ...(enhancedState.metadata || {})     // Dados novos sobrescrevem
    };

    //  REGRA ESPECIAL: lead_data da campanha tem PRIORIDADE sobre lead_info do SDR
    // Isso previne que dados corretos da planilha sejam sobrescritos por dados extraídos
    if (existingState?.metadata?.lead_data && enhancedState.metadata?.lead_info) {
      console.log(`    [METADATA-MERGE] Preservando lead_data da campanha, ignorando lead_info do SDR`);
      mergedMetadata.lead_data = existingState.metadata.lead_data;
      // Mantém lead_info também para compatibilidade
      mergedMetadata.lead_info = enhancedState.metadata.lead_info;
    }

    //  MERGE de conversationHistory se existir
    const existingHistory = existingState?.conversationHistory || [];
    const newHistory = enhancedState.conversationHistory || [];
    const mergedHistory = [...existingHistory, ...newHistory];

    console.log(`    [METADATA-MERGE] Campos no metadata: ${Object.keys(mergedMetadata).length} (antes: ${Object.keys(existingState?.metadata || {}).length}, novos: ${Object.keys(enhancedState.metadata || {}).length})`)

    //  CORREÇÃO CRÍTICA: Incluir currentAgent, painType, messageCount, handoffHistory, agent_state_data, bantStages, companyProfile
    const stmt = getDb().prepare(`
      INSERT OR REPLACE INTO enhanced_conversation_states (
        phone_number, current_state, sub_state, qualification_score,
        sentiment_polarity, sentiment_emotion, sentiment_intensity,
        engagement_level, engagement_momentum, next_best_action,
        state_transitions, metadata, bant_data, cache_ttl, updated_at,
        current_agent, pain_type, message_count, handoff_history, agent_state_data, bant_stage,
        bant_stages, company_profile
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      cleanNumber,
      enhancedState.currentAgent || existingState?.currentAgent || 'sdr', //  ISSUE #4: current_state agora é o agente, não BANT stage
      enhancedState.state?.subState || existingState?.state?.subState || null,
      enhancedState.qualification?.score || existingState?.qualification?.score || 0,
      enhancedState.sentiment?.polarity || existingState?.sentiment?.polarity || 'neutral',
      enhancedState.sentiment?.emotion || existingState?.sentiment?.emotion || 'neutral',
      enhancedState.sentiment?.intensity || existingState?.sentiment?.intensity || 0.5,
      enhancedState.engagement?.level || existingState?.engagement?.level || 'low',
      enhancedState.engagement?.momentum || existingState?.engagement?.momentum || 'stable',
      enhancedState.nextBestAction || existingState?.nextBestAction || 'continue_conversation',
      JSON.stringify(enhancedState.state?.transitions || existingState?.state?.transitions || []),
      JSON.stringify(mergedMetadata), //  CRITICAL: Usar metadata MESCLADO
      JSON.stringify(enhancedState.bant || { budget: null, authority: null, need: null, timing: null, email: null }),
      cacheTTL,
      //  Novos campos críticos para multi-agentes
      enhancedState.currentAgent || 'sdr',
      enhancedState.painType || null,
      enhancedState.messageCount || 0,
      JSON.stringify(enhancedState.handoffHistory || []),
      JSON.stringify({
        proposedSlots: enhancedState.proposedSlots || null,
        scheduledMeeting: enhancedState.scheduledMeeting || null,
        qualificationScore: enhancedState.qualificationScore || null,
        painDescription: enhancedState.painDescription || null,
        painDetails: enhancedState.painDetails || null,  //  FIX: Adicionar painDetails
        interestLevel: enhancedState.interestLevel || null,
        painDiscoveryMigrated: enhancedState.painDiscoveryMigrated || false,  //  FIX: Adicionar flag de migração
        stageAttempts: enhancedState.stageAttempts || null,  //  P1 FIX: Persistir contadores de tentativas
        painDiscoveryCompleted: enhancedState.painDiscoveryCompleted || false,  //  P1 FIX: Persistir flag de conclusão
        painDiscoveryMigrationCount: enhancedState.painDiscoveryMigrationCount || 0  //  P1 FIX: Persistir contador de migrações
      }),
      enhancedState.state?.current || 'pain_discovery', //  ISSUE #1: bant_stage separado
      //  NOVO: Salvar bantStages completo e companyProfile
      JSON.stringify(enhancedState.bantStages || {}),
      JSON.stringify(enhancedState.companyProfile || {})
    );

    console.log(` [SAVE-ENHANCED-STATE] SUCESSO - Dados salvos para ${phoneNumber}`);
    console.log(` [SAVE-ENHANCED-STATE] ID: ${result.lastInsertRowid}, Changes: ${result.changes}`);

    return { success: true, id: result.lastInsertRowid };
  } catch (err) {
    console.error(` [SAVE-ENHANCED-STATE] ERRO - ${phoneNumber}:`, err.message);
    console.error(` [SAVE-ENHANCED-STATE] Stack:`, err.stack);
    throw err;
  }
}

/**
 * Recupera estado enhanced da conversa
 * @param {string} phoneNumber - Número do telefone
 * @returns {Promise<object>} Estado enhanced ou null
 */
export async function getEnhancedState(phoneNumber) {
  try {
    const cleanNumber = phoneNumber.replace('@s.whatsapp.net', '');
    const now = Date.now();

    const stmt = getDb().prepare(`
      SELECT * FROM enhanced_conversation_states
      WHERE phone_number = ? AND cache_ttl > ?
    `);
    const row = stmt.get(cleanNumber, now);

    if(!row) return null;

    // Reconstroi objeto enhanced
    const parsedMetadata = JSON.parse(row.metadata || '{}');
    const parsedBant = JSON.parse(row.bant_data || '{}');
    const parsedHandoffHistory = JSON.parse(row.handoff_history || '[]');
    const parsedAgentStateData = JSON.parse(row.agent_state_data || '{}');
    const parsedBantStages = JSON.parse(row.bant_stages || '{}');  //  NOVO: BANTStagesV2 completo
    const parsedCompanyProfile = JSON.parse(row.company_profile || '{}');  //  NOVO: Perfil da empresa

    //  CORREÇÃO CRÍTICA: Recuperar currentAgent, painType, messageCount e dados específicos dos agentes
    const enhancedState = {
      contactId: cleanNumber,
      //  Campos críticos do multi-agente
      currentAgent: row.current_agent || 'sdr',
      painType: row.pain_type || null,
      messageCount: row.message_count || 0,
      handoffHistory: parsedHandoffHistory,
      bantStages: parsedBantStages,  //  NOVO: Objeto completo do BANT V2
      companyProfile: parsedCompanyProfile,  //  NOVO: Perfil estruturado

      state: {
        current: row.bant_stage || 'pain_discovery', //  ISSUE #1: Ler do bant_stage, não current_state
        subState: row.sub_state,
        transitions: JSON.parse(row.state_transitions || '[]'),
        lastUpdate: row.updated_at
      },
      qualification: {
        score: row.qualification_score,
        level: row.qualification_score > 60 ? 'high' : row.qualification_score > 30 ? 'medium' : 'low'
      },
      sentiment: {
        polarity: row.sentiment_polarity,
        emotion: row.sentiment_emotion,
        intensity: row.sentiment_intensity
      },
      engagement: {
        level: row.engagement_level,
        momentum: row.engagement_momentum,
        lastInteraction: row.updated_at
      },
      nextBestAction: row.next_best_action,
      metadata: parsedMetadata,
      bant: parsedBant,

      //  Dados específicos dos agentes (Scheduler slots, etc.)
      proposedSlots: parsedAgentStateData.proposedSlots || null,
      scheduledMeeting: parsedAgentStateData.scheduledMeeting || null,
      qualificationScore: parsedAgentStateData.qualificationScore || row.qualification_score || null,
      painDescription: parsedAgentStateData.painDescription || null,
      painDetails: parsedAgentStateData.painDetails || null,  //  FIX: Recuperar painDetails
      interestLevel: parsedAgentStateData.interestLevel || null,
      painDiscoveryMigrated: parsedAgentStateData.painDiscoveryMigrated || false,  //  FIX: Recuperar flag
      stageAttempts: parsedAgentStateData.stageAttempts || null,  //  P1 FIX: Restaurar contadores de tentativas
      painDiscoveryCompleted: parsedAgentStateData.painDiscoveryCompleted || false,  //  P1 FIX: Restaurar flag de conclusão
      painDiscoveryMigrationCount: parsedAgentStateData.painDiscoveryMigrationCount || 0,  //  P1 FIX: Restaurar contador de migrações

      cacheInfo: {
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        ttl: row.cache_ttl
      }
    };

    return enhancedState;
  } catch (err) {
    throw err;
  }
}

/**
 * Busca todos os estados enhanced (para dashboard/relatórios)
 * @param {Object} options - Opções de busca
 * @param {number} options.limit - Limite de registros (default: 100)
 * @param {boolean} options.includeExpired - Incluir estados expirados (default: false)
 * @returns {Promise<Array>} Array de estados enhanced
 */
export async function getAllEnhancedStates(options = {}) {
  try {
    const { limit = 100, includeExpired = false } = options;
    const now = Date.now();

    let query = `
      SELECT * FROM enhanced_conversation_states
    `;

    if (!includeExpired) {
      //  FIX: cache_ttl = 0 significa "nunca expira"
      // Apenas filtrar leads que têm TTL definido E já expiraram
      query += ` WHERE (cache_ttl = 0 OR cache_ttl > ${now})`;
    }

    query += ` ORDER BY updated_at DESC LIMIT ${limit}`;

    const stmt = getDb().prepare(query);
    const rows = stmt.all();

    // Mapear cada row para objeto enhanced
    const states = rows.map(row => {
      const parsedMetadata = JSON.parse(row.metadata || '{}');
      const parsedBant = JSON.parse(row.bant_data || '{}');
      const parsedHandoffHistory = JSON.parse(row.handoff_history || '[]');
      const parsedAgentStateData = JSON.parse(row.agent_state_data || '{}');
      const parsedBantStages = JSON.parse(row.bant_stages || '{}');  //  NOVO: BANTStagesV2 completo
      const parsedCompanyProfile = JSON.parse(row.company_profile || '{}');  //  NOVO: Perfil da empresa

      return {
        contactId: row.phone_number,
        currentAgent: row.current_agent || 'sdr',
        painType: row.pain_type || null,
        messageCount: row.message_count || 0,
        handoffHistory: parsedHandoffHistory,
        state: {
          current: row.bant_stage || 'pain_discovery',
          subState: row.sub_state,
          transitions: JSON.parse(row.state_transitions || '[]'),
          lastUpdate: row.updated_at
        },
        qualification: {
          score: row.qualification_score,
          level: row.qualification_score > 60 ? 'high' : row.qualification_score > 30 ? 'medium' : 'low'
        },
        sentiment: {
          polarity: row.sentiment_polarity,
          emotion: row.sentiment_emotion,
          intensity: row.sentiment_intensity
        },
        engagement: {
          level: row.engagement_level,
          momentum: row.engagement_momentum,
          lastInteraction: row.updated_at
        },
        nextBestAction: row.next_best_action,
        metadata: parsedMetadata,
        bant: parsedBant,
        bantStages: parsedBantStages,  //  CORRIGIDO: Usar objeto completo do BANT V2
        companyProfile: parsedCompanyProfile,  //  NOVO: Perfil estruturado
        proposedSlots: parsedAgentStateData.proposedSlots || null,
        scheduledMeeting: parsedAgentStateData.scheduledMeeting || null,
        lastUpdate: row.updated_at,
        cacheInfo: {
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          ttl: row.cache_ttl
        }
      };
    });

    return states;
  } catch (err) {
    console.error(' [MEMORY] Erro ao buscar todos os estados:', err);
    throw err;
  }
}

/**
 * Salva métricas enhanced
 * @param {string} processingId - ID do processamento
 * @param {string} phoneNumber - Número do telefone
 * @param {object} metrics - Métricas do processamento
 * @returns {Promise} Resultado da operação
 */
export async function logEnhancedMetrics(processingId, phoneNumber, metrics) {
  try {
    const cleanNumber = phoneNumber.replace('@s.whatsapp.net', '');

    const stmt = getDb().prepare(`
      INSERT INTO enhanced_metrics (
        phone_number, processing_id, state_from, state_to,
        qualification_delta, sentiment_change, engagement_change,
        processing_time_ms, system_version, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      cleanNumber,
      processingId,
      metrics.stateFrom || null,
      metrics.stateTo || null,
      metrics.qualificationDelta || 0,
      metrics.sentimentChange || null,
      metrics.engagementChange || null,
      metrics.processingTime || 0,
      metrics.systemVersion || '4.0.0',
      JSON.stringify(metrics.metadata || {})
    );

    return { success: true, id: result.lastInsertRowid };
  } catch (err) {
    throw err;
  }
}

/**
 * Obtém estatísticas enhanced por período
 * @param {number} days - Número de dias para análise (default: 7)
 * @returns {Promise<object>} Estatísticas enhanced
 */
export async function getEnhancedStats(days = 7) {
  try {
    const stmt = getDb().prepare(`
      SELECT
        COUNT(DISTINCT phone_number) as total_contacts,
        COUNT(*) as total_interactions,
        AVG(qualification_score) as avg_qualification,
        COUNT(CASE WHEN current_state = 'FAST_TRACK' THEN 1 END) as hot_leads,
        COUNT(CASE WHEN current_state = 'CONFIRMED' THEN 1 END) as confirmed_leads,
        COUNT(CASE WHEN sentiment_emotion = 'excited' THEN 1 END) as excited_contacts,
        COUNT(CASE WHEN engagement_level = 'high' THEN 1 END) as high_engagement,
        AVG(sentiment_intensity) as avg_sentiment_intensity
      FROM enhanced_conversation_states
      WHERE updated_at >= datetime('now', '-${days} days')
    `);
    const rows = stmt.all();
    return rows[0] || {};
  } catch (err) {
    throw err;
  }
}

/**
 * Obtém distribuição de estados de conversa
 * @returns {Promise<array>} Distribuição por estado
 */
export async function getStateDistribution() {
  try {
    const stmt = getDb().prepare(`
      SELECT
        current_state,
        COUNT(*) as count,
        AVG(qualification_score) as avg_score,
        COUNT(CASE WHEN engagement_level = 'high' THEN 1 END) as high_engagement_count
      FROM enhanced_conversation_states
      WHERE cache_ttl > ?
      GROUP BY current_state
      ORDER BY count DESC
    `);
    const rows = stmt.all(Date.now());
    return rows || [];
  } catch (err) {
    throw err;
  }
}

/**
 * Obtém leads mais promissores (hot leads)
 * @param {number} limit - Limite de results
 * @returns {Promise<array>} Lista de hot leads
 */
export async function getHotLeads(limit = 10) {
  try {
    const stmt = getDb().prepare(`
      SELECT
        phone_number,
        current_state,
        qualification_score,
        sentiment_emotion,
        engagement_level,
        next_best_action,
        updated_at
      FROM enhanced_conversation_states
      WHERE
        (current_state IN ('FAST_TRACK', 'SCHEDULING', 'CONFIRMED') OR
         qualification_score > 70 OR
         (sentiment_emotion = 'excited' AND engagement_level = 'high'))
        AND cache_ttl > ?
      ORDER BY
        CASE WHEN current_state = 'FAST_TRACK' THEN 3
             WHEN current_state = 'CONFIRMED' THEN 2
             ELSE 1 END DESC,
        qualification_score DESC,
        updated_at DESC
      LIMIT ?
    `);
    const rows = stmt.all(Date.now(), limit);
    return rows || [];
  } catch (err) {
    throw err;
  }
}

/**
 * Remove estados expirados do cache
 * @returns {Promise} Resultado da limpeza
 */
export async function cleanupExpiredStates() {
  try {
    const now = Date.now();
    const stmt = getDb().prepare(`
      DELETE FROM enhanced_conversation_states
      WHERE cache_ttl < ?
    `);
    const result = stmt.run(now);
    return { deletedRows: result.changes };
  } catch (err) {
    throw err;
  }
}

/**
 * Salva mensagem no histórico do WhatsApp
 * @param {string} phoneNumber - Número do telefone
 * @param {string} messageText - Texto da mensagem
 * @param {boolean} fromMe - Se a mensagem é do bot (true) ou do usuário (false)
 * @param {string} messageType - Tipo da mensagem (text, image, audio, etc)
 * @returns {Promise<object>} Resultado da inserção
 */
export async function saveWhatsAppMessage(phoneNumber, messageText, fromMe = false, messageType = 'text') {
  try {
    const stmt = getDb().prepare(`
      INSERT INTO whatsapp_messages (phone_number, message_text, from_me, message_type)
      VALUES (?, ?, ?, ?)
    `);

    const result = stmt.run(phoneNumber, messageText, fromMe ? 1 : 0, messageType);
    console.log(` [WHATSAPP-MSG] Salva mensagem ${fromMe ? 'enviada' : 'recebida'} para ${phoneNumber}`);

    return { success: true, id: result.lastInsertRowid };
  } catch (err) {
    console.error(` [WHATSAPP-MSG] Erro ao salvar mensagem: ${err.message}`);
    throw err;
  }
}

/**
 *  AGENT METRICS - Registra evento de agente
 * @param {string} agentName - Nome do agente ('sdr', 'specialist', 'scheduler')
 * @param {string} phoneNumber - Número do contato
 * @param {string} eventType - Tipo do evento ('processed', 'handoff', 'success', 'failed')
 * @param {boolean} success - Se o evento foi bem sucedido
 * @param {object} metadata - Metadados adicionais
 */
export function trackAgentMetric(agentName, phoneNumber, eventType, success = false, metadata = {}) {
  try {
    const stmt = getDb().prepare(`
      INSERT INTO agent_metrics (agent_name, phone_number, event_type, success, metadata)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(
      agentName,
      phoneNumber,
      eventType,
      success ? 1 : 0,
      JSON.stringify(metadata)
    );

    console.log(` [METRICS] ${agentName}: ${eventType} (success: ${success})`);
  } catch (err) {
    console.error(` [METRICS] Erro ao registrar métrica: ${err.message}`);
  }
}

/**
 *  GET AGENT METRICS - Busca métricas agregadas por agente
 * @returns {object} Métricas de cada agente
 */
export function getAgentMetrics() {
  try {
    const stats = getDb().prepare(`
      SELECT
        agent_name,
        COUNT(*) as total_events,
        SUM(CASE WHEN event_type = 'processed' THEN 1 ELSE 0 END) as messages_processed,
        SUM(CASE WHEN event_type = 'success' THEN 1 ELSE 0 END) as success_count,
        SUM(CASE WHEN event_type = 'handoff' THEN 1 ELSE 0 END) as handoffs,
        COUNT(DISTINCT phone_number) as unique_contacts
      FROM agent_metrics
      GROUP BY agent_name
    `).all();

    const result = {
      sdr: {
        processed: 0,
        success: 0,
        handoffs: 0,
        contacts: 0,
        successRate: 0
      },
      specialist: {
        processed: 0,
        success: 0,
        handoffs: 0,
        contacts: 0,
        successRate: 0
      },
      scheduler: {
        processed: 0,
        success: 0,
        handoffs: 0,
        contacts: 0,
        successRate: 0
      }
    };

    stats.forEach(stat => {
      if (result[stat.agent_name]) {
        result[stat.agent_name] = {
          processed: stat.messages_processed || 0,
          success: stat.success_count || 0,
          handoffs: stat.handoffs || 0,
          contacts: stat.unique_contacts || 0,
          successRate: stat.messages_processed > 0
            ? ((stat.success_count / stat.messages_processed) * 100).toFixed(1)
            : 0
        };
      }
    });

    return result;
  } catch (err) {
    console.error(` [METRICS] Erro ao buscar métricas: ${err.message}`);
    return {};
  }
}

/**
 *  ATOMIC INCREMENT - Incrementa um contador de forma atômica (thread-safe)
 *  FIX CRIT-002: Previne race conditions em contadores
 *
 * @param {string} key - Chave do contador
 * @param {number} amount - Quantidade a incrementar (padrão: 1)
 * @returns {Promise<number>} Novo valor do contador
 */
export async function atomicIncrement(key, amount = 1) {
  return new Promise((resolve, reject) => {
    try {
      //  FIX: Usar getDb() dinamicamente
      const currentDb = getDb();

      // Preparar statements fora da transação para reutilização
      const selectStmt = currentDb.prepare('SELECT value FROM memory WHERE key = ?');
      const updateStmt = currentDb.prepare('UPDATE memory SET value = ? WHERE key = ?');
      const insertStmt = currentDb.prepare('INSERT INTO memory (key, value) VALUES (?, ?)');

      // Usar transação para garantir atomicidade
      const transaction = currentDb.transaction(() => {
        // Obter valor atual
        const current = selectStmt.get(key);
        const currentValue = current && current.value ? parseInt(current.value) : 0;

        // Calcular novo valor
        const newValue = currentValue + amount;

        // Atualizar ou inserir
        if (current) {
          updateStmt.run(String(newValue), key);
        } else {
          insertStmt.run(key, String(newValue));
        }

        return newValue;
      });

      // Executar transação e resolver com resultado
      const result = transaction();
      resolve(result);
    } catch (error) {
      console.error(` [ATOMIC-INCREMENT] Erro ao incrementar ${key}:`, error);
      reject(error);
    }
  });
}

//  FIX: Exportar db estático para retrocompatibilidade + getDb() para conexões dinâmicas
// NOTA: Código antigo que importa { db } ainda funciona, mas recomenda-se usar getDb()
export { db, getDb };


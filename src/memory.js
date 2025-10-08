// src/memory.js — memória simples (better-sqlite3)
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = path.join(process.cwd(), "orbion.db");
if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, "");

const db = new Database(DB_PATH);

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

// 🚀 ENHANCED STATE STORAGE TABLE
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
  cache_ttl INTEGER DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// 🚀 ENHANCED METRICS TABLE
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

// Criar índices
db.exec(`CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_phone_date
        ON whatsapp_messages(phone_number, created_at)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_document_analyses_type_date
        ON document_analyses(file_type, analyzed_at)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_enhanced_states_phone
        ON enhanced_conversation_states(phone_number)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_enhanced_metrics_phone_date
        ON enhanced_metrics(phone_number, logged_at)`);

console.log('✅ [DATABASE] Inicializado com better-sqlite3');

export async function addMemory(value){
  try {
    const stmt = db.prepare(`INSERT INTO memory(value) VALUES(?)`);
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
    const stmt = db.prepare(`INSERT OR REPLACE INTO memory(key, value) VALUES(?, ?)`);
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
    const stmt = db.prepare(`SELECT value FROM memory WHERE key = ?`);
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
    const stmt = db.prepare(`DELETE FROM memory WHERE key = ?`);
    const result = stmt.run(key);
    return result.changes > 0;
  } catch (err) {
    throw err;
  }
}

export async function getMemories(limit=10){
  try {
    const stmt = db.prepare(`SELECT id, value, created_at FROM memory ORDER BY id DESC LIMIT ?`);
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
      console.warn('⚠️ saveMessage: messageText inválido:', { messageText, type: typeof messageText });
      messageText = messageText ? String(messageText) : '[Texto vazio]';
    }

    const sanitizedText = messageText.toString().trim();
    if (sanitizedText.length === 0) {
      console.warn('⚠️ saveMessage: Texto vazio, usando placeholder');
      messageText = '[Mensagem sem conteúdo]';
    } else {
      messageText = sanitizedText;
    }

    const cleanNumber = phoneNumber.replace('@s.whatsapp.net', '');
    const stmt = db.prepare(`INSERT INTO whatsapp_messages(phone_number, message_text, from_me, message_type) VALUES(?, ?, ?, ?)`);
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
export async function getRecentMessages(phoneNumber, limit = 10) {
  try {
    const cleanNumber = phoneNumber.replace('@s.whatsapp.net', '');
    const stmt = db.prepare(`SELECT message_text as text, from_me as fromMe, message_type, created_at
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
    const stmt = db.prepare(`
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
      const stmt = db.prepare(query);
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
    const stmt = db.prepare(`
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
    const stmt = db.prepare(`
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
    const stmt = db.prepare(`
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
    const stmt = db.prepare(`
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
    const stmt = db.prepare(sql);
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
    const stmt = db.prepare(sql);
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
    const stmt = db.prepare(`
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
    const stmt = db.prepare(`
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
    const stmt = db.prepare(`SELECT * FROM document_analyses WHERE id = ?`);
    const row = stmt.get(id);

    if (row && row.metadata) {
      try {
        row.metadata = JSON.parse(row.metadata);
      } catch (e) {
        console.log('⚠️ Erro ao parsear metadata:', e.message);
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
    const stmt = db.prepare(`
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
    const stmt = db.prepare(`
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

// ========== 🚀 ENHANCED STATE STORAGE FUNCTIONS ==========

/**
 * Salva ou atualiza estado enhanced da conversa
 * @param {string} phoneNumber - Número do telefone
 * @param {object} enhancedState - Estado enhanced completo
 * @returns {Promise} Resultado da operação
 */
export async function saveEnhancedState(phoneNumber, enhancedState) {
  try {
    if (!phoneNumber || !enhancedState) {
      throw new Error('phoneNumber e enhancedState são obrigatórios');
    }

    const cleanNumber = phoneNumber.replace('@s.whatsapp.net', '');
    const now = Date.now();
    const cacheTTL = now + (30 * 60 * 1000); // 30 minutos

    const stmt = db.prepare(`
      INSERT OR REPLACE INTO enhanced_conversation_states (
        phone_number, current_state, sub_state, qualification_score,
        sentiment_polarity, sentiment_emotion, sentiment_intensity,
        engagement_level, engagement_momentum, next_best_action,
        state_transitions, metadata, cache_ttl, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    const result = stmt.run(
      cleanNumber,
      enhancedState.state?.current || 'DISCOVERY',
      enhancedState.state?.subState || null,
      enhancedState.qualification?.score || 0,
      enhancedState.sentiment?.polarity || 'neutral',
      enhancedState.sentiment?.emotion || 'neutral',
      enhancedState.sentiment?.intensity || 0.5,
      enhancedState.engagement?.level || 'low',
      enhancedState.engagement?.momentum || 'stable',
      enhancedState.nextBestAction || 'continue_conversation',
      JSON.stringify(enhancedState.state?.transitions || []),
      JSON.stringify(enhancedState.metadata || {}),
      cacheTTL
    );

    return { success: true, id: result.lastInsertRowid };
  } catch (err) {
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

    const stmt = db.prepare(`
      SELECT * FROM enhanced_conversation_states
      WHERE phone_number = ? AND cache_ttl > ?
    `);
    const row = stmt.get(cleanNumber, now);

    if(!row) return null;

    // Reconstroi objeto enhanced
    const enhancedState = {
      state: {
        current: row.current_state,
        subState: row.sub_state,
        transitions: JSON.parse(row.state_transitions || '[]')
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
        momentum: row.engagement_momentum
      },
      nextBestAction: row.next_best_action,
      metadata: JSON.parse(row.metadata || '{}'),
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
 * Salva métricas enhanced
 * @param {string} processingId - ID do processamento
 * @param {string} phoneNumber - Número do telefone
 * @param {object} metrics - Métricas do processamento
 * @returns {Promise} Resultado da operação
 */
export async function logEnhancedMetrics(processingId, phoneNumber, metrics) {
  try {
    const cleanNumber = phoneNumber.replace('@s.whatsapp.net', '');

    const stmt = db.prepare(`
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
    const stmt = db.prepare(`
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
    const stmt = db.prepare(`
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
    const stmt = db.prepare(`
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
    const stmt = db.prepare(`
      DELETE FROM enhanced_conversation_states
      WHERE cache_ttl < ?
    `);
    const result = stmt.run(now);
    return { deletedRows: result.changes };
  } catch (err) {
    throw err;
  }
}

// Exportar db para uso em conversation_analytics.js
export { db };


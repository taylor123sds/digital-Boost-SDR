// learning/conversation_analytics.js
// Sistema de análise de conversas para identificar padrões de sucesso

//  FIX: Usar getDatabase() que verifica e reconecta se necessário
import { getDatabase } from '../db/index.js';

/**
 * Analisa conversas e identifica padrões de sucesso/falha
 */
export class ConversationAnalytics {
  constructor() {
    this.initDatabase();
  }

  /**
   * Inicializa tabelas para analytics
   */
  initDatabase() {
    //  FIX: Obter conexão fresh
    const db = getDatabase();
    // Tabela de conversas analisadas
    db.exec(`
      CREATE TABLE IF NOT EXISTS conversation_analysis (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        contact_id TEXT NOT NULL,
        conversation_start DATETIME,
        conversation_end DATETIME,
        message_count INTEGER,
        success_score REAL DEFAULT 0,
        conversion_type TEXT,
        key_patterns TEXT,
        agent_strategy TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de sinais de sucesso
    db.exec(`
      CREATE TABLE IF NOT EXISTS success_signals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        contact_id TEXT NOT NULL,
        signal_type TEXT NOT NULL,
        signal_value TEXT,
        confidence REAL,
        context TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de patterns que funcionam
    db.exec(`
      CREATE TABLE IF NOT EXISTS successful_patterns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pattern_type TEXT NOT NULL,
        pattern_content TEXT NOT NULL,
        usage_count INTEGER DEFAULT 1,
        success_rate REAL,
        context_tags TEXT,
        last_used DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(pattern_type, pattern_content)
      )
    `);

    console.log(' [LEARNING] Database analytics initialized');
  }

  /**
   * Detecta sinais de sucesso em uma conversa
   * @param {string} contactId
   * @param {string} userMessage
   * @param {string} botResponse
   */
  async detectSuccessSignals(contactId, userMessage, botResponse) {
    const signals = [];

    const msgLower = userMessage.toLowerCase();
    const respLower = botResponse.toLowerCase();

    // Sinais POSITIVOS (indicam progresso)
    const positiveSignals = [
      { pattern: /(sim|claro|pode ser|com certeza|gostaria|quero|me interessa)/i, type: 'POSITIVE_AGREEMENT', confidence: 0.8 },
      { pattern: /(agendar|marcar|reunião|meeting|call|conversar)/i, type: 'MEETING_INTEREST', confidence: 0.9 },
      { pattern: /(quando|como|qual.*valor|preço|investimento)/i, type: 'QUALIFICATION_QUESTION', confidence: 0.7 },
      { pattern: /(ótimo|perfeito|legal|interessante|bacana)/i, type: 'POSITIVE_FEEDBACK', confidence: 0.6 },
      { pattern: /(obrigad|valeu|ajudou|esclareceu)/i, type: 'GRATITUDE', confidence: 0.8 }
    ];

    // Sinais NEGATIVOS (indicam problemas)
    const negativeSignals = [
      { pattern: /(não|nao|nem|jamais|nunca)/i, type: 'NEGATIVE_RESPONSE', confidence: 0.7 },
      { pattern: /(chato|irritante|spam|pare|stop)/i, type: 'ANNOYANCE', confidence: 0.9 },
      { pattern: /(caro|muito caro|não tenho grana|sem dinheiro)/i, type: 'PRICE_OBJECTION', confidence: 0.8 },
      { pattern: /(não entendi|confuso|complicado)/i, type: 'CONFUSION', confidence: 0.7 },
      { pattern: /(depois|mais tarde|outra hora)/i, type: 'POSTPONEMENT', confidence: 0.5 }
    ];

    // Detectar sinais positivos
    for (const signal of positiveSignals) {
      if (signal.pattern.test(msgLower)) {
        signals.push({
          type: signal.type,
          value: 'detected',
          confidence: signal.confidence,
          context: userMessage.substring(0, 200)
        });

        await this.saveSuccessSignal(contactId, signal.type, 'detected', signal.confidence, userMessage);
      }
    }

    // Detectar sinais negativos
    for (const signal of negativeSignals) {
      if (signal.pattern.test(msgLower)) {
        signals.push({
          type: signal.type,
          value: 'detected',
          confidence: signal.confidence,
          context: userMessage.substring(0, 200)
        });

        await this.saveSuccessSignal(contactId, signal.type, 'detected', signal.confidence, userMessage);
      }
    }

    return signals;
  }

  /**
   * Salva sinal de sucesso/falha no banco
   */
  async saveSuccessSignal(contactId, signalType, signalValue, confidence, context) {
    try {
      //  FIX: Obter conexão fresh
      const db = getDatabase();
      db.prepare(`
        INSERT INTO success_signals (contact_id, signal_type, signal_value, confidence, context)
        VALUES (?, ?, ?, ?, ?)
      `).run(contactId, signalType, signalValue, confidence, context.substring(0, 500));
    } catch (error) {
      console.error(' [LEARNING] Error saving success signal:', error);
    }
  }

  /**
   * Calcula score de sucesso de uma conversa
   * @param {string} contactId
   * @returns {number} Score 0-100
   */
  async calculateConversationScore(contactId) {
    try {
      //  FIX: Obter conexão fresh
      const db = getDatabase();
      const signals = db.prepare(`
        SELECT signal_type, confidence
        FROM success_signals
        WHERE contact_id = ?
        ORDER BY created_at DESC
        LIMIT 20
      `).all(contactId);

      if (signals.length === 0) return 50; // Neutro

      let positiveScore = 0;
      let negativeScore = 0;

      for (const signal of signals) {
        const weight = signal.confidence;

        if (['POSITIVE_AGREEMENT', 'MEETING_INTEREST', 'QUALIFICATION_QUESTION', 'POSITIVE_FEEDBACK', 'GRATITUDE'].includes(signal.signal_type)) {
          positiveScore += weight;
        } else if (['NEGATIVE_RESPONSE', 'ANNOYANCE', 'PRICE_OBJECTION', 'CONFUSION', 'POSTPONEMENT'].includes(signal.signal_type)) {
          negativeScore += weight;
        }
      }

      // Normalizar para 0-100
      const totalScore = positiveScore - negativeScore;
      const normalizedScore = Math.max(0, Math.min(100, 50 + (totalScore * 10)));

      return Math.round(normalizedScore);
    } catch (error) {
      console.error(' [LEARNING] Error calculating score:', error);
      return 50;
    }
  }

  /**
   * Extrai patterns de conversas bem-sucedidas
   * @param {number} minSuccessScore - Score mínimo para considerar sucesso
   * @returns {Array} Patterns extraídos
   */
  async extractSuccessfulPatterns(minSuccessScore = 70) {
    try {
      //  FIX: Obter conexão fresh
      const db = getDatabase();
      // Buscar conversas com alto score
      const successfulConversations = db.prepare(`
        SELECT DISTINCT contact_id
        FROM success_signals
        WHERE signal_type IN ('MEETING_INTEREST', 'POSITIVE_AGREEMENT', 'QUALIFICATION_QUESTION')
        GROUP BY contact_id
        HAVING COUNT(*) >= 2
      `).all();

      const patterns = [];

      for (const conv of successfulConversations) {
        const messages = db.prepare(`
          SELECT message_text, from_me
          FROM whatsapp_messages
          WHERE phone_number = ?
          ORDER BY created_at
          LIMIT 20
        `).all(conv.contact_id);

        // Extrair padrões de respostas do bot que funcionaram
        for (let i = 0; i < messages.length - 1; i++) {
          if (messages[i].from_me === 1) { // Mensagem do bot
            const botMsg = messages[i].message_text;
            const userResponse = messages[i + 1]?.message_text || '';

            // Se usuário respondeu positivamente após mensagem do bot
            if (/sim|claro|quero|pode ser|interessante|legal/i.test(userResponse)) {
              patterns.push({
                type: 'SUCCESSFUL_PROMPT',
                content: botMsg.substring(0, 300),
                context: userResponse.substring(0, 100)
              });
            }
          }
        }
      }

      return patterns;
    } catch (error) {
      console.error(' [LEARNING] Error extracting patterns:', error);
      return [];
    }
  }

  /**
   * Salva pattern de sucesso
   */
  async saveSuccessfulPattern(patternType, patternContent, contextTags = []) {
    try {
      //  FIX: Obter conexão fresh
      const db = getDatabase();
      db.prepare(`
        INSERT INTO successful_patterns (pattern_type, pattern_content, context_tags, last_used)
        VALUES (?, ?, ?, datetime('now'))
        ON CONFLICT(pattern_type, pattern_content) DO UPDATE SET
          usage_count = usage_count + 1,
          last_used = datetime('now')
      `).run(patternType, patternContent, JSON.stringify(contextTags));

      console.log(` [LEARNING] Pattern saved: ${patternType}`);
    } catch (error) {
      console.error(' [LEARNING] Error saving pattern:', error);
    }
  }

  /**
   * Busca patterns similares de sucesso
   * @param {string} context - Contexto atual
   * @returns {Array} Patterns recomendados
   */
  async getRecommendedPatterns(context) {
    try {
      //  FIX: Obter conexão fresh
      const db = getDatabase();
      const patterns = db.prepare(`
        SELECT pattern_type, pattern_content, success_rate, usage_count
        FROM successful_patterns
        WHERE success_rate >= 0.7
        ORDER BY usage_count DESC, success_rate DESC
        LIMIT 5
      `).all();

      return patterns;
    } catch (error) {
      console.error(' [LEARNING] Error getting patterns:', error);
      return [];
    }
  }

  /**
   * Gera relatório de aprendizado
   */
  async generateLearningReport() {
    try {
      //  FIX: Obter conexão fresh
      const db = getDatabase();
      const totalSignals = db.prepare('SELECT COUNT(*) as count FROM success_signals').get();
      const positiveSignals = db.prepare(`
        SELECT COUNT(*) as count FROM success_signals
        WHERE signal_type IN ('POSITIVE_AGREEMENT', 'MEETING_INTEREST', 'QUALIFICATION_QUESTION', 'POSITIVE_FEEDBACK')
      `).get();
      const negativeSignals = db.prepare(`
        SELECT COUNT(*) as count FROM success_signals
        WHERE signal_type IN ('NEGATIVE_RESPONSE', 'ANNOYANCE', 'PRICE_OBJECTION', 'CONFUSION')
      `).get();

      const topPatterns = db.prepare(`
        SELECT pattern_type, COUNT(*) as count
        FROM successful_patterns
        GROUP BY pattern_type
        ORDER BY count DESC
        LIMIT 5
      `).all();

      return {
        totalSignals: totalSignals.count,
        positiveSignals: positiveSignals.count,
        negativeSignals: negativeSignals.count,
        positiveRate: totalSignals.count > 0 ? ((positiveSignals.count / totalSignals.count) * 100).toFixed(1) : 0,
        topPatterns
      };
    } catch (error) {
      console.error(' [LEARNING] Error generating report:', error);
      return null;
    }
  }
}

// Singleton
const conversationAnalytics = new ConversationAnalytics();
export default conversationAnalytics;

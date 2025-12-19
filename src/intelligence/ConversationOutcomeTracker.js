/**
 * @file ConversationOutcomeTracker.js
 * @description Sistema de rastreamento de outcomes de conversas
 * Conecta FeedbackLoop ao fluxo de mensagens para aprendizado real
 *
 * FIX P0: FeedbackLoop estava implementado mas recordConversationOutcome()
 * nunca era chamado. Este módulo garante que todos os outcomes sejam registrados.
 */

import { getFeedbackLoop } from './FeedbackLoop.js';
import { getPatternApplier } from './PatternApplier.js';
import { getRealTimeAdapter } from './RealTimeAdapter.js';
//  FIX: Usar getDatabase() que verifica e reconecta se necessário
import { getDatabase } from '../db/index.js';
import { DEFAULT_TENANT_ID, getTenantColumnForTable } from '../utils/tenantCompat.js';

// Singleton
let instance = null;

// Cache para evitar registros duplicados
const outcomeCache = new Map();
const OUTCOME_CACHE_TTL = 60 * 60 * 1000; // 1 hora

/**
 * ConversationOutcomeTracker
 * Rastreia e registra outcomes de conversas para aprendizado
 */
export class ConversationOutcomeTracker {
  constructor() {
    if (instance) {
      return instance;
    }
    instance = this;

    this.feedbackLoop = getFeedbackLoop();
    this.initDatabase();

    // Cleanup periódico do cache
    setInterval(() => this._cleanupCache(), 30 * 60 * 1000); // 30 min

    console.log(' [OUTCOME-TRACKER] Inicializado');
  }

  /**
   * Inicializa tabela de tracking de inatividade
   */
  initDatabase() {
    //  FIX: Obter conexão fresh
    const db = getDatabase();
    db.exec(`
      CREATE TABLE IF NOT EXISTS conversation_activity (
        tenant_id TEXT DEFAULT 'default',
        contact_id TEXT PRIMARY KEY,
        last_message_at TEXT,
        last_bot_message TEXT,
        last_user_message TEXT,
        current_stage TEXT,
        message_count INTEGER DEFAULT 0,
        bant_completion_percent INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log(' [OUTCOME-TRACKER] Database initialized');
  }

  /**
   * PRINCIPAL: Registra atividade de conversa
   * Chamado a cada mensagem para tracking de abandono
   */
  async trackActivity(contactId, context = {}) {
    try {
      const {
        userMessage = '',
        botMessage = '',
        currentStage = 'unknown',
        bantCompletionPercent = 0,
        leadState = null,
        tenantId = DEFAULT_TENANT_ID
      } = context;

      const now = new Date().toISOString();
      const messageCount = leadState?.messageCount || 1;

      //  FIX: Obter conexão fresh
      const db = getDatabase();

      // Upsert na tabela de atividade
      db.prepare(`
        INSERT INTO conversation_activity (
          tenant_id, contact_id, last_message_at, last_bot_message, last_user_message,
          current_stage, message_count, bant_completion_percent
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(contact_id) DO UPDATE SET
          tenant_id = excluded.tenant_id,
          last_message_at = excluded.last_message_at,
          last_bot_message = excluded.last_bot_message,
          last_user_message = excluded.last_user_message,
          current_stage = excluded.current_stage,
          message_count = excluded.message_count,
          bant_completion_percent = excluded.bant_completion_percent
      `).run(
        tenantId,
        contactId,
        now,
        botMessage.substring(0, 500),
        userMessage.substring(0, 500),
        currentStage,
        messageCount,
        bantCompletionPercent
      );

      return true;
    } catch (error) {
      console.error(' [OUTCOME-TRACKER] Erro ao rastrear atividade:', error.message);
      return false;
    }
  }

  /**
   * Registra conversa concluída com SUCESSO (reunião agendada)
   */
  async recordSuccess(contactId, metadata = {}) {
    // Evitar registros duplicados
    if (this._isDuplicateOutcome(contactId, 'success')) {
      console.log(` [OUTCOME-TRACKER] Sucesso já registrado para ${contactId}`);
      return false;
    }

    console.log(` [OUTCOME-TRACKER] Registrando SUCESSO para ${contactId}`);
    const tenantId = metadata.tenantId || DEFAULT_TENANT_ID;

    const result = await this.feedbackLoop.recordConversationOutcome(
      contactId,
      'success',
      {
        finalStage: metadata.finalStage || 'meeting_scheduled',
        totalMessages: metadata.messageCount || 0,
        durationSeconds: this._calculateDuration(contactId),
        abandonmentPoint: null,
        lastBotMessage: metadata.lastBotMessage,
        lastUserMessage: metadata.lastUserMessage,
        bantCompletionPercent: metadata.bantCompletionPercent || 100,
        conversionScore: metadata.conversionScore || 100,
        reason: metadata.reason || 'meeting_scheduled',
        tenantId
      }
    );

    //  FECHAR LOOP DE APRENDIZADO: Atualizar efetividade dos padrões usados
    await this._updatePatternEffectiveness(contactId, 'success');

    this._markOutcomeRecorded(contactId, 'success');
    this._cleanupActivity(contactId);

    return result;
  }

  /**
   * Registra conversa finalizada por OPT-OUT
   */
  async recordOptOut(contactId, metadata = {}) {
    if (this._isDuplicateOutcome(contactId, 'opt_out')) {
      return false;
    }

    console.log(` [OUTCOME-TRACKER] Registrando OPT-OUT para ${contactId}`);
    const tenantId = metadata.tenantId || DEFAULT_TENANT_ID;

    const activity = this._getActivity(contactId);

    const result = await this.feedbackLoop.recordConversationOutcome(
      contactId,
      'opt_out',
      {
        finalStage: activity?.current_stage || metadata.finalStage || 'unknown',
        totalMessages: activity?.message_count || metadata.messageCount || 0,
        durationSeconds: this._calculateDuration(contactId),
        abandonmentPoint: activity?.current_stage,
        lastBotMessage: activity?.last_bot_message || metadata.lastBotMessage,
        lastUserMessage: activity?.last_user_message || metadata.lastUserMessage,
        bantCompletionPercent: activity?.bant_completion_percent || 0,
        conversionScore: 0,
        reason: metadata.reason || 'user_requested',
        tenantId
      }
    );

    this._markOutcomeRecorded(contactId, 'opt_out');
    this._cleanupActivity(contactId);

    return result;
  }

  /**
   * Registra conversa ABANDONADA (inatividade)
   * Chamado por job periódico ou quando detecta inatividade
   */
  async recordAbandonment(contactId, metadata = {}) {
    if (this._isDuplicateOutcome(contactId, 'abandoned')) {
      return false;
    }

    console.log(` [OUTCOME-TRACKER] Registrando ABANDONO para ${contactId}`);
    const tenantId = metadata.tenantId || DEFAULT_TENANT_ID;

    const activity = this._getActivity(contactId);

    const result = await this.feedbackLoop.recordConversationOutcome(
      contactId,
      'abandoned',
      {
        finalStage: activity?.current_stage || metadata.finalStage || 'unknown',
        totalMessages: activity?.message_count || metadata.messageCount || 0,
        durationSeconds: this._calculateDuration(contactId),
        abandonmentPoint: activity?.current_stage,
        lastBotMessage: activity?.last_bot_message || metadata.lastBotMessage,
        lastUserMessage: activity?.last_user_message || metadata.lastUserMessage,
        bantCompletionPercent: activity?.bant_completion_percent || 0,
        conversionScore: metadata.conversionScore || 0,
        reason: metadata.reason || 'inactivity',
        tenantId
      }
    );

    this._markOutcomeRecorded(contactId, 'abandoned');
    this._cleanupActivity(contactId);

    return result;
  }

  /**
   * Registra FALHA técnica na conversa
   */
  async recordFailure(contactId, metadata = {}) {
    if (this._isDuplicateOutcome(contactId, 'failed')) {
      return false;
    }

    console.log(` [OUTCOME-TRACKER] Registrando FALHA para ${contactId}`);
    const tenantId = metadata.tenantId || DEFAULT_TENANT_ID;

    const activity = this._getActivity(contactId);

    const result = await this.feedbackLoop.recordConversationOutcome(
      contactId,
      'failed',
      {
        finalStage: activity?.current_stage || metadata.finalStage || 'unknown',
        totalMessages: activity?.message_count || metadata.messageCount || 0,
        durationSeconds: this._calculateDuration(contactId),
        abandonmentPoint: activity?.current_stage,
        lastBotMessage: activity?.last_bot_message,
        lastUserMessage: activity?.last_user_message,
        bantCompletionPercent: activity?.bant_completion_percent || 0,
        conversionScore: 0,
        reason: metadata.reason || metadata.error || 'technical_error',
        tenantId
      }
    );

    this._markOutcomeRecorded(contactId, 'failed');

    return result;
  }

  /**
   * Job para detectar conversas abandonadas
   * Deve ser chamado periodicamente (ex: a cada 1 hora)
   */
  async detectAbandonedConversations(inactivityThresholdHours = 24) {
    try {
      const thresholdMs = inactivityThresholdHours * 60 * 60 * 1000;
      const cutoffTime = new Date(Date.now() - thresholdMs).toISOString();

      //  FIX: Obter conexão fresh
      const db = getDatabase();

      // Buscar conversas inativas que não foram finalizadas
      const inactiveConversations = db.prepare(`
        SELECT ca.* FROM conversation_activity ca
        LEFT JOIN conversation_outcomes co ON ca.contact_id = co.contact_id
        WHERE ca.last_message_at < ?
        AND co.id IS NULL
        AND ca.current_stage NOT IN ('confirmed', 'meeting_scheduled')
      `).all(cutoffTime);

      console.log(` [OUTCOME-TRACKER] Encontradas ${inactiveConversations.length} conversas abandonadas`);

      let recorded = 0;
      for (const conv of inactiveConversations) {
        const result = await this.recordAbandonment(conv.contact_id, {
          finalStage: conv.current_stage,
          messageCount: conv.message_count,
          lastBotMessage: conv.last_bot_message,
          lastUserMessage: conv.last_user_message,
          bantCompletionPercent: conv.bant_completion_percent,
          reason: 'inactivity_detected',
          tenantId: conv.tenant_id || DEFAULT_TENANT_ID
        });

        if (result) recorded++;
      }

      console.log(` [OUTCOME-TRACKER] Registrados ${recorded} abandonos`);
      return { detected: inactiveConversations.length, recorded };
    } catch (error) {
      console.error(' [OUTCOME-TRACKER] Erro ao detectar abandonos:', error.message);
      return { detected: 0, recorded: 0, error: error.message };
    }
  }

  /**
   * Obtém estatísticas de outcomes
   */
  getStats(tenantId = DEFAULT_TENANT_ID) {
    try {
      //  FIX: Obter conexão fresh
      const db = getDatabase();
      const tenantColumn = getTenantColumnForTable('conversation_outcomes', db);
      const tenantWhere = tenantColumn ? `WHERE ${tenantColumn} = ?` : '';
      const tenantParam = tenantColumn ? [tenantId] : [];
      const stats = db.prepare(`
        SELECT
          outcome,
          COUNT(*) as count,
          AVG(total_messages) as avg_messages,
          AVG(bant_completion_percent) as avg_bant_completion
        FROM conversation_outcomes
        ${tenantWhere}
        GROUP BY outcome
      `).all(...tenantParam);

      const total = stats.reduce((sum, s) => sum + s.count, 0);
      const successCount = stats.find(s => s.outcome === 'success')?.count || 0;
      const successRate = total > 0 ? ((successCount / total) * 100).toFixed(2) : 0;

      return {
        byOutcome: stats.reduce((acc, s) => {
          acc[s.outcome] = {
            count: s.count,
            avgMessages: Math.round(s.avg_messages || 0),
            avgBantCompletion: Math.round(s.avg_bant_completion || 0)
          };
          return acc;
        }, {}),
        total,
        successRate: `${successRate}%`,
        cacheSize: outcomeCache.size
      };
    } catch (error) {
      console.error(' [OUTCOME-TRACKER] Erro ao obter stats:', error.message);
      return { error: error.message };
    }
  }

  // ==================== PRIVATE METHODS ====================

  _getActivity(contactId) {
    try {
      //  FIX: Obter conexão fresh
      const db = getDatabase();
      return db.prepare(`
        SELECT * FROM conversation_activity WHERE contact_id = ?
      `).get(contactId);
    } catch {
      return null;
    }
  }

  _calculateDuration(contactId) {
    try {
      const activity = this._getActivity(contactId);
      if (!activity) return 0;

      const created = new Date(activity.created_at).getTime();
      const lastMessage = new Date(activity.last_message_at).getTime();
      return Math.round((lastMessage - created) / 1000);
    } catch {
      return 0;
    }
  }

  _cleanupActivity(contactId) {
    try {
      //  FIX: Obter conexão fresh
      const db = getDatabase();
      db.prepare(`DELETE FROM conversation_activity WHERE contact_id = ?`).run(contactId);
    } catch (error) {
      console.error(' [OUTCOME-TRACKER] Erro ao limpar atividade:', error.message);
    }
  }

  _isDuplicateOutcome(contactId, outcome) {
    const key = `${contactId}:${outcome}`;
    const cached = outcomeCache.get(key);

    if (cached && Date.now() - cached < OUTCOME_CACHE_TTL) {
      return true;
    }

    return false;
  }

  _markOutcomeRecorded(contactId, outcome) {
    const key = `${contactId}:${outcome}`;
    outcomeCache.set(key, Date.now());
  }

  _cleanupCache() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, timestamp] of outcomeCache.entries()) {
      if (now - timestamp > OUTCOME_CACHE_TTL) {
        outcomeCache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(` [OUTCOME-TRACKER] Cache cleanup: ${cleaned} entries removidas`);
    }
  }

  /**
   *  FECHAR LOOP DE APRENDIZADO
   * Atualiza a efetividade dos padrões usados baseado no outcome
   */
  async _updatePatternEffectiveness(contactId, outcome) {
    try {
      const wasSuccessful = outcome === 'success';

      // 1. Atualizar PatternApplier - padrões usados nesta conversa
      const patternApplier = getPatternApplier();
      const patternsUsed = await this._getPatternsUsedInConversation(contactId);

      for (const pattern of patternsUsed) {
        await patternApplier.updatePatternEffectiveness(
          pattern.pattern_type,
          pattern.pattern_name,
          wasSuccessful
        );
      }

      // 2. Atualizar RealTimeAdapter - marcar adaptações como bem-sucedidas
      if (wasSuccessful) {
        const realTimeAdapter = getRealTimeAdapter();
        await realTimeAdapter.markAdaptationSuccess(contactId);
      }

      console.log(` [OUTCOME-TRACKER] Loop fechado para ${contactId}: ${patternsUsed.length} padrões atualizados (outcome: ${outcome})`);

    } catch (error) {
      // Não falhar silenciosamente, mas também não bloquear o fluxo
      console.warn(` [OUTCOME-TRACKER] Erro ao atualizar efetividade: ${error.message}`);
    }
  }

  /**
   * Busca padrões que foram usados na conversa deste contato
   */
  async _getPatternsUsedInConversation(contactId) {
    try {
      //  FIX: Obter conexão fresh
      const db = getDatabase();
      return db.prepare(`
        SELECT pattern_type, pattern_name
        FROM pattern_usage_log
        WHERE contact_id = ?
        ORDER BY used_at DESC
        LIMIT 20
      `).all(contactId);
    } catch {
      return [];
    }
  }
}

// Singleton getter
export function getOutcomeTracker() {
  if (!instance) {
    instance = new ConversationOutcomeTracker();
  }
  return instance;
}

export default ConversationOutcomeTracker;

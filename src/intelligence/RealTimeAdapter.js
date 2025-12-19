/**
 * @file RealTimeAdapter.js
 * @description Sistema de adaptação em tempo real durante conversas
 *
 * PROPÓSITO:
 * Detecta problemas durante a conversa e ajusta a abordagem automaticamente,
 * sem esperar o fim da conversa para aprender.
 *
 * TRIGGERS DE ADAPTAÇÃO:
 * 1. Queda de sentimento (>0.3 em 2 mensagens)
 * 2. Padrão de risco detectado
 * 3. Estagnação (mesmas respostas curtas repetidas)
 * 4. Objeção detectada
 * 5. Confusão/pedido de esclarecimento
 *
 * ESTRATÉGIAS DE RECUPERAÇÃO:
 * - Mudança de tom (formal  casual, técnico  simples)
 * - Mudança de abordagem (pitch  escuta, features  benefícios)
 * - Oferta de alternativa (reunião  material, call  WhatsApp)
 * - Reconhecimento empático
 *
 * @version 1.0.0
 */

import { getDatabase } from '../db/index.js';
import { getPatternApplier } from './PatternApplier.js';
import log from '../utils/logger-wrapper.js';

/**
 * Tipos de trigger de adaptação
 */
const AdaptationTrigger = {
  SENTIMENT_DROP: 'sentiment_drop',
  RISK_PATTERN: 'risk_pattern',
  STAGNATION: 'stagnation',
  OBJECTION: 'objection',
  CONFUSION: 'confusion',
  REPETITION: 'repetition',
  LONG_SILENCE: 'long_silence'
};

/**
 * Estratégias de adaptação
 */
const AdaptationStrategy = {
  EMPATHETIC_PIVOT: {
    name: 'empathetic_pivot',
    instruction: 'Mude para tom empático. Reconheça o sentimento do lead antes de continuar. Use frases como "Entendo sua preocupação..." ou "Faz todo sentido..."'
  },
  SIMPLIFY: {
    name: 'simplify',
    instruction: 'Simplifique sua linguagem. Evite termos técnicos. Use analogias do dia a dia. Seja mais direto e objetivo.'
  },
  LISTEN_MODE: {
    name: 'listen_mode',
    instruction: 'Entre em modo de escuta. Faça perguntas abertas. Deixe o lead falar. Não tente vender agora, apenas entenda.'
  },
  OFFER_ALTERNATIVE: {
    name: 'offer_alternative',
    instruction: 'Ofereça uma alternativa. Se reunião não funcionou, sugira material por email. Se call não serve, proponha WhatsApp mesmo.'
  },
  BREAK_PATTERN: {
    name: 'break_pattern',
    instruction: 'Quebre o padrão da conversa. Mude completamente de assunto por um momento. Use humor leve ou faça uma pergunta inesperada.'
  },
  DIRECT_VALUE: {
    name: 'direct_value',
    instruction: 'Vá direto ao valor. Pare de fazer perguntas e mostre um benefício concreto. Use números ou case real se disponível.'
  },
  SOFT_EXIT: {
    name: 'soft_exit',
    instruction: 'Prepare saída suave. Reconheça que pode não ser o momento. Deixe porta aberta para futuro sem pressão.'
  }
};

class RealTimeAdapter {
  constructor() {
    this.conversationStates = new Map(); // contactId -> state
    this.stats = {
      adaptationsTriggered: 0,
      successfulRecoveries: 0,
      triggersByType: {},
      statesCleanedUp: 0
    };

    // Thresholds de detecção
    this.thresholds = {
      sentimentDropThreshold: 0.25,      // Queda de sentimento que dispara adaptação
      stagnationMessageCount: 3,          // Msgs curtas repetidas para stagnation
      shortMessageLength: 15,             // Caracteres para considerar "curta"
      silenceMinutes: 30,                 // Minutos sem resposta
      objectionKeywords: [
        'caro', 'preço', 'não preciso', 'não tenho interesse',
        'sem tempo', 'ocupado', 'depois', 'talvez', 'não sei',
        'já tenho', 'já uso', 'concorrente'
      ],
      confusionKeywords: [
        'não entendi', 'como assim', 'o que', 'pode explicar',
        'não ficou claro', 'confuso', 'perdido', '?', 'hein'
      ]
    };

    //  FIX CRÍTICO: Limpeza automática de conversas inativas (evita memory leak)
    this.STALE_THRESHOLD_MS = 60 * 60 * 1000; // 1 hora
    this.CLEANUP_INTERVAL_MS = 30 * 60 * 1000; // 30 minutos
    this.MAX_STATES = 1000; // Limite máximo de estados em memória

    this._cleanupInterval = setInterval(() => {
      this._cleanupStaleConversations();
    }, this.CLEANUP_INTERVAL_MS);

    log.info('[REAL-TIME-ADAPTER] Iniciado com limpeza automática a cada 30min');
  }

  /**
   *  Limpa conversas inativas para evitar memory leak
   */
  _cleanupStaleConversations() {
    const now = Date.now();
    let cleaned = 0;

    for (const [contactId, state] of this.conversationStates.entries()) {
      const lastActivity = state.lastMessageAt || state.startedAt || 0;
      if (now - lastActivity > this.STALE_THRESHOLD_MS) {
        this.conversationStates.delete(contactId);
        cleaned++;
      }
    }

    // Proteção adicional: limitar tamanho máximo
    if (this.conversationStates.size > this.MAX_STATES) {
      const toRemove = this.conversationStates.size - this.MAX_STATES;
      const entries = Array.from(this.conversationStates.entries());
      // Remover os mais antigos
      entries
        .sort((a, b) => (a[1].startedAt || 0) - (b[1].startedAt || 0))
        .slice(0, toRemove)
        .forEach(([contactId]) => {
          this.conversationStates.delete(contactId);
          cleaned++;
        });
    }

    if (cleaned > 0) {
      this.stats.statesCleanedUp += cleaned;
      log.debug(`[REAL-TIME-ADAPTER] Limpou ${cleaned} estados inativos (total: ${this.conversationStates.size})`);
    }
  }

  /**
   * Para o adapter (cleanup)
   */
  stop() {
    if (this._cleanupInterval) {
      clearInterval(this._cleanupInterval);
    }
    this.conversationStates.clear();
  }

  /**
   * Analisa mensagem e contexto para determinar se adaptação é necessária
   * @param {string} contactId - ID do contato
   * @param {string} userMessage - Última mensagem do usuário
   * @param {Object} context - Contexto da conversa
   * @returns {Object|null} Adaptação recomendada ou null
   */
  async analyzeAndAdapt(contactId, userMessage, context = {}) {
    const {
      sentimentScore,
      previousSentiment,
      messageHistory = [],
      currentStage,
      messageCount
    } = context;

    // Atualizar estado da conversa
    this._updateConversationState(contactId, userMessage, context);

    const state = this.conversationStates.get(contactId);
    const triggers = [];

    // 1. Detectar queda de sentimento
    if (previousSentiment && sentimentScore) {
      const drop = previousSentiment - sentimentScore;
      if (drop >= this.thresholds.sentimentDropThreshold) {
        triggers.push({
          type: AdaptationTrigger.SENTIMENT_DROP,
          severity: drop > 0.4 ? 'high' : 'medium',
          details: { previousSentiment, currentSentiment: sentimentScore, drop }
        });
      }
    }

    // 2. Detectar padrão de risco
    const patternApplier = getPatternApplier();
    const riskPattern = await patternApplier.detectRiskPattern(userMessage, currentStage);
    if (riskPattern) {
      triggers.push({
        type: AdaptationTrigger.RISK_PATTERN,
        severity: riskPattern.severity || 'medium',
        details: riskPattern
      });
    }

    // 3. Detectar estagnação
    if (this._detectStagnation(state, userMessage)) {
      triggers.push({
        type: AdaptationTrigger.STAGNATION,
        severity: 'medium',
        details: { shortMessageCount: state.shortMessageCount }
      });
    }

    // 4. Detectar objeção
    const objection = this._detectObjection(userMessage);
    if (objection) {
      triggers.push({
        type: AdaptationTrigger.OBJECTION,
        severity: objection.severity,
        details: objection
      });
    }

    // 5. Detectar confusão
    if (this._detectConfusion(userMessage)) {
      triggers.push({
        type: AdaptationTrigger.CONFUSION,
        severity: 'low',
        details: { message: userMessage }
      });
    }

    // Se não há triggers, retornar null
    if (triggers.length === 0) {
      return null;
    }

    // Selecionar estratégia baseada nos triggers
    const adaptation = this._selectStrategy(triggers, state, context);

    // Registrar adaptação
    await this._recordAdaptation(contactId, triggers, adaptation, context);

    this.stats.adaptationsTriggered++;
    triggers.forEach(t => {
      this.stats.triggersByType[t.type] = (this.stats.triggersByType[t.type] || 0) + 1;
    });

    log.info(`[REAL-TIME-ADAPTER] Adaptação para ${contactId}: ${adaptation.strategy.name}`);

    return adaptation;
  }

  /**
   * Atualiza estado interno da conversa
   */
  _updateConversationState(contactId, message, context) {
    let state = this.conversationStates.get(contactId);

    if (!state) {
      state = {
        messageCount: 0,
        shortMessageCount: 0,
        lastMessages: [],
        lastAdaptation: null,
        sentimentHistory: [],
        startedAt: Date.now()
      };
    }

    state.messageCount++;
    state.lastMessages.push(message);
    if (state.lastMessages.length > 10) {
      state.lastMessages.shift();
    }

    // Rastrear mensagens curtas consecutivas
    if (message.length <= this.thresholds.shortMessageLength) {
      state.shortMessageCount++;
    } else {
      state.shortMessageCount = 0;
    }

    // Rastrear histórico de sentimento
    if (context.sentimentScore) {
      state.sentimentHistory.push(context.sentimentScore);
      if (state.sentimentHistory.length > 5) {
        state.sentimentHistory.shift();
      }
    }

    state.lastMessageAt = Date.now();
    this.conversationStates.set(contactId, state);

    return state;
  }

  /**
   * Detecta padrão de estagnação
   */
  _detectStagnation(state, message) {
    if (!state) return false;

    return state.shortMessageCount >= this.thresholds.stagnationMessageCount;
  }

  /**
   * Detecta objeção na mensagem
   */
  _detectObjection(message) {
    const msgLower = message.toLowerCase();

    for (const keyword of this.thresholds.objectionKeywords) {
      if (msgLower.includes(keyword)) {
        const severity = ['caro', 'preço', 'não tenho interesse', 'não preciso']
          .some(k => msgLower.includes(k)) ? 'high' : 'medium';

        return {
          keyword,
          severity,
          type: this._classifyObjection(msgLower)
        };
      }
    }

    return null;
  }

  /**
   * Classifica tipo de objeção
   */
  _classifyObjection(message) {
    if (message.includes('caro') || message.includes('preço')) return 'price';
    if (message.includes('tempo') || message.includes('ocupado')) return 'time';
    if (message.includes('já tenho') || message.includes('já uso')) return 'status_quo';
    if (message.includes('concorrente')) return 'competitor';
    if (message.includes('depois') || message.includes('talvez')) return 'stall';
    return 'general';
  }

  /**
   * Detecta confusão na mensagem
   */
  _detectConfusion(message) {
    const msgLower = message.toLowerCase();
    return this.thresholds.confusionKeywords.some(k => msgLower.includes(k));
  }

  /**
   * Seleciona estratégia de adaptação baseada nos triggers
   */
  _selectStrategy(triggers, state, context) {
    // Priorizar por severidade
    const highSeverity = triggers.filter(t => t.severity === 'high');
    const primaryTrigger = highSeverity.length > 0 ? highSeverity[0] : triggers[0];

    let strategy;
    let additionalInstructions = [];

    switch (primaryTrigger.type) {
      case AdaptationTrigger.SENTIMENT_DROP:
        strategy = AdaptationStrategy.EMPATHETIC_PIVOT;
        additionalInstructions.push('Não ignore a queda de sentimento. Aborde diretamente.');
        break;

      case AdaptationTrigger.OBJECTION:
        if (primaryTrigger.details.type === 'price') {
          strategy = AdaptationStrategy.DIRECT_VALUE;
          additionalInstructions.push('Foque em ROI e valor, não em preço.');
        } else if (primaryTrigger.details.type === 'time') {
          strategy = AdaptationStrategy.OFFER_ALTERNATIVE;
          additionalInstructions.push('Ofereça opção mais rápida ou assíncrona.');
        } else if (primaryTrigger.details.type === 'stall') {
          strategy = AdaptationStrategy.SOFT_EXIT;
        } else {
          strategy = AdaptationStrategy.LISTEN_MODE;
        }
        break;

      case AdaptationTrigger.CONFUSION:
        strategy = AdaptationStrategy.SIMPLIFY;
        additionalInstructions.push('Clarifique o ponto anterior antes de continuar.');
        break;

      case AdaptationTrigger.STAGNATION:
        strategy = AdaptationStrategy.BREAK_PATTERN;
        additionalInstructions.push('A conversa está travada. Mude a dinâmica.');
        break;

      case AdaptationTrigger.RISK_PATTERN:
        strategy = AdaptationStrategy.EMPATHETIC_PIVOT;
        if (primaryTrigger.details.preventionInstruction) {
          additionalInstructions.push(primaryTrigger.details.preventionInstruction);
        }
        break;

      default:
        strategy = AdaptationStrategy.LISTEN_MODE;
    }

    // Evitar repetir mesma estratégia
    if (state?.lastAdaptation === strategy.name) {
      // Escalar para próxima estratégia
      strategy = AdaptationStrategy.SOFT_EXIT;
      additionalInstructions.push('Estratégia anterior não funcionou. Considere encerrar gentilmente.');
    }

    return {
      strategy,
      triggers,
      additionalInstructions,
      instruction: this._buildInstruction(strategy, additionalInstructions, primaryTrigger)
    };
  }

  /**
   * Constrói instrução final para o agente
   */
  _buildInstruction(strategy, additionalInstructions, trigger) {
    let instruction = `\n\n##  ADAPTAÇÃO EM TEMPO REAL NECESSÁRIA\n\n`;
    instruction += `**Trigger detectado:** ${trigger.type} (severidade: ${trigger.severity})\n\n`;
    instruction += `**Estratégia:** ${strategy.name}\n`;
    instruction += `${strategy.instruction}\n`;

    if (additionalInstructions.length > 0) {
      instruction += `\n**Instruções adicionais:**\n`;
      additionalInstructions.forEach(i => {
        instruction += `- ${i}\n`;
      });
    }

    instruction += `\n**IMPORTANTE:** Esta adaptação é baseada em análise em tempo real. Siga as instruções acima na próxima resposta.\n`;

    return instruction;
  }

  /**
   * Registra adaptação no banco
   */
  async _recordAdaptation(contactId, triggers, adaptation, context) {
    try {
      const db = getDatabase();

      const state = this.conversationStates.get(contactId);
      if (state) {
        state.lastAdaptation = adaptation.strategy.name;
        this.conversationStates.set(contactId, state);
      }

      db.prepare(`
        INSERT INTO real_time_adaptations (
          id, contact_id, trigger_type, trigger_details,
          adaptation_applied, original_approach, adapted_approach
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        `rta_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        contactId,
        triggers.map(t => t.type).join(','),
        JSON.stringify(triggers),
        adaptation.strategy.name,
        context.currentApproach || 'standard',
        adaptation.strategy.name
      );

    } catch (error) {
      log.debug('[REAL-TIME-ADAPTER] Erro ao registrar:', error.message);
    }
  }

  /**
   * Marca adaptação como bem-sucedida (chamado quando conversa melhora)
   */
  async markAdaptationSuccess(contactId) {
    try {
      const db = getDatabase();

      const updated = db.prepare(`
        UPDATE real_time_adaptations
        SET was_successful = 1, resolved_at = datetime('now')
        WHERE contact_id = ? AND was_successful = 0
        ORDER BY created_at DESC
        LIMIT 1
      `).run(contactId);

      if (updated.changes > 0) {
        this.stats.successfulRecoveries++;
      }

      return updated.changes > 0;

    } catch (error) {
      return false;
    }
  }

  /**
   * Limpa estado de conversa (quando conversa termina)
   */
  clearConversationState(contactId) {
    this.conversationStates.delete(contactId);
  }

  /**
   * Retorna estatísticas
   */
  getStats() {
    return {
      ...this.stats,
      activeConversations: this.conversationStates.size,
      recoveryRate: this.stats.adaptationsTriggered > 0
        ? (this.stats.successfulRecoveries / this.stats.adaptationsTriggered * 100).toFixed(1) + '%'
        : 'N/A'
    };
  }
}

// Singleton
let realTimeAdapterInstance = null;

export function getRealTimeAdapter() {
  if (!realTimeAdapterInstance) {
    realTimeAdapterInstance = new RealTimeAdapter();
  }
  return realTimeAdapterInstance;
}

export { RealTimeAdapter, AdaptationTrigger, AdaptationStrategy };
export default RealTimeAdapter;

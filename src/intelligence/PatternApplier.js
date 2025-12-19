/**
 * @file PatternApplier.js
 * @description Sistema de aplicação proativa de padrões aprendidos
 *
 * PROPÓSITO:
 * Fecha o gap entre "aprender" e "aplicar". O FeedbackLoop identifica padrões,
 * mas eles não eram aplicados proativamente em novas conversas.
 *
 * FUNCIONALIDADES:
 * 1. Aplica padrões de sucesso em novas conversas
 * 2. Previne padrões de abandono conhecidos
 * 3. Adapta abordagem baseada em arquétipo similar
 * 4. Injeta instruções aprendidas no system prompt
 *
 * INTEGRAÇÃO:
 * - Chamado pelo IntelligenceOrchestrator.enhanceSystemPrompt()
 * - Usa dados de: abandonment_patterns, successful_patterns, feedback_insights
 *
 * @version 1.0.0
 */

import { getDatabase } from '../db/index.js';
import { randomUUID } from 'crypto';
import log from '../utils/logger-wrapper.js';

/**
 * Cache LRU simples para padrões aplicados
 */
class PatternCache {
  constructor(maxSize = 100, ttlMs = 300000) { // 5 min TTL
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key, value) {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs
    });
  }

  clear() {
    this.cache.clear();
  }

  invalidate(keyPattern) {
    // Invalida entradas que contenham o padrão na chave
    for (const key of this.cache.keys()) {
      if (key.includes(keyPattern)) {
        this.cache.delete(key);
      }
    }
  }
}

class PatternApplier {
  constructor() {
    this.cache = new PatternCache(100, 300000); // 5 min cache
    this.stats = {
      patternsApplied: 0,
      preventionsTriggered: 0,
      successPatternsUsed: 0,
      lastRefresh: null
    };

    // Cache de padrões carregados do banco
    this.loadedPatterns = {
      abandonment: [],
      success: [],
      insights: [],
      loadedAt: null
    };
  }

  /**
   * Carrega padrões do banco de dados
   * Refresh a cada 10 minutos ou sob demanda
   */
  async loadPatterns(forceRefresh = false) {
    const now = Date.now();
    const TEN_MINUTES = 600000;

    if (!forceRefresh && this.loadedPatterns.loadedAt &&
        (now - this.loadedPatterns.loadedAt) < TEN_MINUTES) {
      return this.loadedPatterns;
    }

    try {
      const db = getDatabase();

      // 1. Padrões de abandono (ordenados por frequência)
      //  FIX: Usar COALESCE para compatibilidade com schemas antigos
      // trigger_question é o campo original, trigger_message_pattern pode ser null
      const abandonmentPatterns = db.prepare(`
        SELECT pattern_name, trigger_stage,
               COALESCE(trigger_message_pattern, trigger_question) as trigger_message_pattern,
               frequency, suggested_fix, severity,
               COALESCE(prevention_instruction, suggested_fix) as prevention_instruction
        FROM abandonment_patterns
        WHERE COALESCE(is_active, 1) = 1
        ORDER BY frequency DESC, severity DESC
        LIMIT 20
      `).all();

      // 2. Padrões de sucesso (ordenados por taxa de sucesso)
      const successPatterns = db.prepare(`
        SELECT pattern_type, pattern_content, context_stage,
               usage_count, success_rate, effectiveness_score
        FROM successful_patterns
        WHERE is_active = 1 AND success_rate > 0.6
        ORDER BY effectiveness_score DESC, usage_count DESC
        LIMIT 20
      `).all();

      // 3. Insights de feedback (recomendações ativas)
      const feedbackInsights = db.prepare(`
        SELECT insight_type, description, recommendation,
               frequency, impact_score, applies_to_stage
        FROM feedback_insights
        WHERE is_active = 1 AND impact_score > 0.5
        ORDER BY impact_score DESC, frequency DESC
        LIMIT 15
      `).all();

      this.loadedPatterns = {
        abandonment: abandonmentPatterns,
        success: successPatterns,
        insights: feedbackInsights,
        loadedAt: now
      };

      log.info(`[PATTERN-APPLIER] Padrões carregados: ${abandonmentPatterns.length} abandono, ${successPatterns.length} sucesso, ${feedbackInsights.length} insights`);

      this.stats.lastRefresh = new Date().toISOString();

      return this.loadedPatterns;

    } catch (error) {
      log.error('[PATTERN-APPLIER] Erro ao carregar padrões:', error.message);
      return this.loadedPatterns; // Retorna cache anterior
    }
  }

  /**
   * Gera instruções de prevenção baseadas em padrões de abandono
   * @param {string} currentStage - Estágio atual da conversa
   * @param {Object} context - Contexto da conversa
   * @returns {string[]} Lista de instruções de prevenção
   */
  async getPreventionInstructions(currentStage, context = {}) {
    await this.loadPatterns();

    const instructions = [];
    const { archetype, sentimentScore, messageCount } = context;

    // Filtrar padrões relevantes para o estágio atual
    const relevantPatterns = this.loadedPatterns.abandonment.filter(p => {
      if (p.trigger_stage && p.trigger_stage !== currentStage) return false;
      return true;
    });

    for (const pattern of relevantPatterns.slice(0, 5)) {
      if (pattern.prevention_instruction) {
        instructions.push(pattern.prevention_instruction);
      } else if (pattern.suggested_fix) {
        // Converter sugestão em instrução
        instructions.push(`EVITE: ${pattern.pattern_name}. ${pattern.suggested_fix}`);
      }
    }

    // Adicionar instruções baseadas em contexto
    if (sentimentScore && sentimentScore < 0.4) {
      instructions.push('PRIORIDADE: Lead com sentimento negativo. Use tom mais empático e faça perguntas abertas.');
    }

    if (messageCount && messageCount > 8) {
      instructions.push('ATENÇÃO: Conversa longa. Seja mais direto e busque fechamento ou próximo passo claro.');
    }

    this.stats.preventionsTriggered += instructions.length;

    return instructions;
  }

  /**
   * Gera instruções de sucesso baseadas em padrões que funcionam
   * @param {string} currentStage - Estágio atual
   * @param {Object} context - Contexto da conversa
   * @returns {string[]} Lista de instruções de sucesso
   */
  async getSuccessInstructions(currentStage, context = {}) {
    await this.loadPatterns();

    const instructions = [];
    const { archetype, leadProfile } = context;

    // Filtrar padrões de sucesso relevantes
    const relevantPatterns = this.loadedPatterns.success.filter(p => {
      if (p.context_stage && p.context_stage !== currentStage) return false;
      return true;
    });

    for (const pattern of relevantPatterns.slice(0, 3)) {
      if (pattern.pattern_type === 'phrase' && pattern.pattern_content) {
        instructions.push(`USE ESTA ABORDAGEM: "${pattern.pattern_content}" (${Math.round(pattern.success_rate * 100)}% eficácia)`);
      } else if (pattern.pattern_type === 'strategy') {
        instructions.push(`ESTRATÉGIA EFICAZ: ${pattern.pattern_content}`);
      }
    }

    // Adicionar insights de feedback
    const relevantInsights = this.loadedPatterns.insights.filter(i => {
      if (i.applies_to_stage && i.applies_to_stage !== currentStage) return false;
      return true;
    });

    for (const insight of relevantInsights.slice(0, 2)) {
      if (insight.recommendation) {
        instructions.push(`INSIGHT: ${insight.recommendation}`);
      }
    }

    this.stats.successPatternsUsed += instructions.length;

    return instructions;
  }

  /**
   * Gera bloco completo de instruções aprendidas para o system prompt
   * @param {string} contactId - ID do contato
   * @param {string} currentStage - Estágio atual
   * @param {Object} context - Contexto completo
   * @returns {string} Bloco de instruções formatado
   */
  async getLearnedInstructions(contactId, currentStage, context = {}) {
    // Verificar cache
    const cacheKey = `${contactId}_${currentStage}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const preventions = await this.getPreventionInstructions(currentStage, context);
      const successes = await this.getSuccessInstructions(currentStage, context);

      if (preventions.length === 0 && successes.length === 0) {
        return '';
      }

      let instructionBlock = '\n\n## INSTRUÇÕES APRENDIDAS (Auto-Otimização)\n';

      if (preventions.length > 0) {
        instructionBlock += '\n### Prevenção de Erros Conhecidos:\n';
        preventions.forEach((p, i) => {
          instructionBlock += `${i + 1}. ${p}\n`;
        });
      }

      if (successes.length > 0) {
        instructionBlock += '\n### Padrões de Sucesso Comprovados:\n';
        successes.forEach((s, i) => {
          instructionBlock += `${i + 1}. ${s}\n`;
        });
      }

      this.stats.patternsApplied++;

      // Cachear resultado
      this.cache.set(cacheKey, instructionBlock);

      return instructionBlock;

    } catch (error) {
      log.error('[PATTERN-APPLIER] Erro ao gerar instruções:', error.message);
      return '';
    }
  }

  /**
   * Detecta se a mensagem do usuário corresponde a um padrão de risco
   * @param {string} userMessage - Mensagem do usuário
   * @param {string} currentStage - Estágio atual
   * @returns {Object|null} Padrão detectado ou null
   */
  async detectRiskPattern(userMessage, currentStage) {
    await this.loadPatterns();

    const messageLower = userMessage.toLowerCase();

    for (const pattern of this.loadedPatterns.abandonment) {
      if (!pattern.trigger_message_pattern) continue;

      try {
        const regex = new RegExp(pattern.trigger_message_pattern, 'i');
        if (regex.test(messageLower)) {
          log.warn(`[PATTERN-APPLIER] Padrão de risco detectado: ${pattern.pattern_name}`);

          return {
            patternName: pattern.pattern_name,
            severity: pattern.severity,
            suggestedFix: pattern.suggested_fix,
            preventionInstruction: pattern.prevention_instruction
          };
        }
      } catch (e) {
        // Regex inválida, ignorar
      }
    }

    return null;
  }

  /**
   * Registra uso de padrão (para métricas)
   * @param {string} patternType - 'success' ou 'prevention'
   * @param {string} patternName - Nome do padrão
   * @param {string} contactId - ID do contato
   * @param {boolean} wasEffective - Se foi efetivo
   */
  async recordPatternUsage(patternType, patternName, contactId, wasEffective) {
    try {
      const db = getDatabase();

      //  FIX: Usar UUID para IDs únicos (evita race condition)
      db.prepare(`
        INSERT INTO pattern_usage_log (
          id, pattern_type, pattern_name, contact_id,
          was_effective, used_at
        ) VALUES (?, ?, ?, ?, ?, datetime('now'))
      `).run(
        randomUUID(),
        patternType,
        patternName,
        contactId,
        wasEffective ? 1 : 0
      );

      // Atualizar contadores no padrão
      if (patternType === 'success') {
        db.prepare(`
          UPDATE successful_patterns
          SET usage_count = usage_count + 1,
              success_rate = (success_rate * usage_count + ?) / (usage_count + 1)
          WHERE pattern_content LIKE ?
        `).run(wasEffective ? 1 : 0, `%${patternName}%`);
      }

    } catch (error) {
      // Não bloquear fluxo por erro de log
      log.debug('[PATTERN-APPLIER] Erro ao registrar uso:', error.message);
    }
  }

  /**
   *  FECHAR LOOP: Atualiza efetividade de um padrão baseado no outcome
   * @param {string} patternType - 'success', 'prevention', ou 'abandonment'
   * @param {string} patternName - Nome do padrão
   * @param {boolean} wasSuccessful - Se a conversa foi bem-sucedida
   */
  async updatePatternEffectiveness(patternType, patternName, wasSuccessful) {
    try {
      const db = getDatabase();
      const scoreChange = wasSuccessful ? 0.1 : -0.05; // Sucesso aumenta mais que falha diminui

      if (patternType === 'success' || patternType === 'prevention') {
        // Atualizar successful_patterns
        db.prepare(`
          UPDATE successful_patterns
          SET effectiveness_score = MIN(1.0, MAX(0.0, COALESCE(effectiveness_score, 0.5) + ?)),
              success_rate = (COALESCE(success_rate, 0.5) * COALESCE(usage_count, 1) + ?) / (COALESCE(usage_count, 1) + 1),
              usage_count = COALESCE(usage_count, 0) + 1
          WHERE pattern_content LIKE ? OR pattern_type = ?
        `).run(scoreChange, wasSuccessful ? 1 : 0, `%${patternName}%`, patternName);
      }

      if (patternType === 'abandonment' || patternType === 'prevention') {
        // Atualizar abandonment_patterns
        // Se foi sucesso, significa que a prevenção funcionou
        db.prepare(`
          UPDATE abandonment_patterns
          SET frequency = CASE WHEN ? THEN frequency ELSE frequency + 1 END
          WHERE pattern_name LIKE ? OR trigger_stage = ?
        `).run(wasSuccessful ? 1 : 0, `%${patternName}%`, patternName);
      }

      // Invalidar cache para pegar dados atualizados
      this.cache.invalidate(patternName);

      log.debug(`[PATTERN-APPLIER] Efetividade atualizada: ${patternType}/${patternName} -> ${wasSuccessful ? 'success' : 'fail'}`);

    } catch (error) {
      log.debug('[PATTERN-APPLIER] Erro ao atualizar efetividade:', error.message);
    }
  }

  /**
   * Retorna estatísticas do sistema
   */
  getStats() {
    return {
      ...this.stats,
      loadedPatterns: {
        abandonment: this.loadedPatterns.abandonment.length,
        success: this.loadedPatterns.success.length,
        insights: this.loadedPatterns.insights.length
      },
      cacheSize: this.cache.cache.size
    };
  }

  /**
   * Força refresh dos padrões
   */
  async refresh() {
    this.cache.clear();
    await this.loadPatterns(true);
    return this.getStats();
  }
}

// Singleton
let patternApplierInstance = null;

export function getPatternApplier() {
  if (!patternApplierInstance) {
    patternApplierInstance = new PatternApplier();
  }
  return patternApplierInstance;
}

export { PatternApplier };
export default PatternApplier;

/**
 * @file MessagePipeline.js
 * @description Clean Architecture - Message Processing Pipeline
 *
 * Pipeline de processamento de mensagens com responsabilidades bem definidas:
 * 1. Security Layer (rate limit, bot detection)
 * 2. Interceptors Layer (opt-out, system commands)
 * 3. Intent Classification (FAQ, routing)
 * 4. Agent Processing
 *
 * REFATORADO (v3.0.0):
 * - REMOVIDO: sendResponse diretos no pipeline
 * - ADICIONADO: responseToSend em cada resultado
 * - O webhook.routes.js é o ÚNICO ponto de envio
 *
 * @author ORBION Team
 * @version 3.0.0
 */

import { getMemory } from '../memory.js';
import simpleBotDetector from '../security/SimpleBotDetector.js';
import { checkOptOut } from '../security/OptOutInterceptor.js';
import { classifyIntent } from '../intelligence/IntentClassifier.js';
import unifiedFAQSystem from '../intelligence/UnifiedFAQSystem.js';
import conversationSupervisor from '../intelligence/ConversationSupervisor.js';
import { getCadenceIntegrationService } from '../services/CadenceIntegrationService.js';
import log from '../utils/logger-wrapper.js';

/**
 * Pipeline principal de processamento de mensagens
 *
 * IMPORTANTE: Este pipeline NÃO envia mensagens diretamente.
 * Ele retorna { responseToSend: string } quando há mensagem a enviar.
 * O webhook.routes.js é responsável pelo envio centralizado.
 */
export class MessagePipeline {
  constructor() {
    this.stats = {
      processed: 0,
      blocked: 0,
      optedOut: 0,
      faqHandled: 0
    };

    // Padrões para detectar perguntas sem interrogação
    this._questionPatterns = [
      // Padrões de início de pergunta
      /^(quanto|qual|quais|como|onde|quando|por\s?que|quem|o\s+que)\b/i,
      // Verbos interrogativos
      /^(tem|têm|existe|posso|pode|consigo|da|dá)\b/i,
      // Solicitações de informação
      /\b(quero\s+saber|me\s+(fala|diz|explica|conta)|gostaria\s+de\s+saber)\b/i,
      // Perguntas sobre preço/valor
      /\b(quanto\s+custa|qual\s+(o\s+)?valor|preço|tabela|orçamento)\b/i,
      // Perguntas sobre funcionamento
      /\b(como\s+funciona|funciona\s+como|funcionamento)\b/i,
      // Dúvidas implícitas
      /\b(não\s+entendi|não\s+sei|tenho\s+dúvida|dúvidas?)\b/i,
      // Termina com interrogação (mantém compatibilidade)
      /\?$/
    ];
  }

  /**
   *  FIX: Detecta se uma mensagem é potencialmente uma pergunta
   * Funciona COM ou SEM interrogação
   * @param {string} text - Texto da mensagem
   * @returns {boolean} True se parecer ser uma pergunta
   */
  _isPotentialQuestion(text) {
    if (!text || typeof text !== 'string') return false;

    const cleanText = text.trim().toLowerCase();

    // Muito curta demais para ser pergunta relevante
    if (cleanText.length < 3) return false;

    // Verificar padrões
    return this._questionPatterns.some(pattern => pattern.test(cleanText));
  }

  /**
   * Processa mensagem através do pipeline completo
   *
   * @param {Object} message - Mensagem validada do webhook
   * @param {Object} context - Contexto adicional (lead state, etc)
   * @returns {Object} Resultado do processamento
   *
   * ESTRUTURA DO RETORNO:
   * {
   *   allowed: boolean,           // Se mensagem pode prosseguir
   *   shouldProcess: boolean,     // Se deve ir para agentes
   *   responseToSend?: string,    // Mensagem a enviar (se houver)
   *   reason?: string,            // Razão do bloqueio/interceptação
   *   type?: string,              // Tipo de interceptação (bot, opt_out, faq)
   *   context?: Object,           // Contexto enriquecido
   *   intent?: Object             // Classificação de intent
   * }
   */
  async process(message, context = {}) {
    this.stats.processed++;

    const { from, text, messageType, metadata } = message;

    log.start('Pipeline iniciado', { from, textPreview: text?.substring(0, 100), messageType });

    try {
      // ══════════════════════════════════════════════════════════
      // LAYER 0: LEAD CONTEXT ENRICHMENT
      // ══════════════════════════════════════════════════════════
      let enrichedContext = { ...context };

      try {
        const cadenceService = getCadenceIntegrationService();
        const leadContext = await cadenceService.getLeadContext(from);

        if (leadContext.isKnownLead) {
          enrichedContext = {
            ...enrichedContext,
            leadContext,
            isInCadence: leadContext.isInCadence,
            hasResponded: leadContext.hasResponded,
            wasProspected: leadContext.wasProspected,
            agentInstructions: leadContext.agentInstructions,
            lead: leadContext.lead,
            cadence: leadContext.cadence
          };

          log.info('Lead context enriched', {
            from,
            isInCadence: leadContext.isInCadence,
            cadenceDay: leadContext.lead?.cadenceDay
          });
        }
      } catch (contextError) {
        log.warn('Erro ao enriquecer contexto do lead', { error: contextError.message });
      }

      // ══════════════════════════════════════════════════════════
      // LAYER 1: SECURITY & VALIDATION
      // ══════════════════════════════════════════════════════════
      const securityResult = await this.securityLayer(message, enrichedContext);

      if (!securityResult.allowed) {
        this.stats.blocked++;
        log.warn('Mensagem bloqueada', { reason: securityResult.reason, from });

        // Retorna resultado COM responseToSend (se houver)
        return {
          ...securityResult,
          shouldProcess: false
        };
      }

      //  FIX: Quando humano é verificado, enviar confirmação E continuar para agentes
      // O lead disse "SIM" - envia confirmação E processa com agente
      if (securityResult.verified && securityResult.continueToAgents) {
        log.success('Humano verificado - enviando confirmação E continuando para agentes', { from });

        // Guardar a mensagem de confirmação para ser enviada
        enrichedContext.verificationConfirmation = securityResult.responseToSend;
      }

      // ══════════════════════════════════════════════════════════
      // LAYER 2: INTERCEPTORS (Early Returns)
      // ══════════════════════════════════════════════════════════
      const interceptorResult = await this.interceptorsLayer(message, enrichedContext);

      if (interceptorResult.handled) {
        if (interceptorResult.type === 'opt_out') {
          this.stats.optedOut++;
        }
        log.success('Mensagem interceptada', { type: interceptorResult.type, from });

        // Retorna resultado COM responseToSend (se houver)
        return {
          ...interceptorResult,
          allowed: true,
          shouldProcess: false
        };
      }

      // ══════════════════════════════════════════════════════════
      // LAYER 3: INTENT CLASSIFICATION
      // ══════════════════════════════════════════════════════════
      const intentResult = await this.intentLayer(message, enrichedContext);

      if (intentResult.handled) {
        if (intentResult.type === 'faq') {
          this.stats.faqHandled++;
        }
        log.success('Intent detectado', { type: intentResult.type, from });

        // Retorna resultado COM responseToSend (se houver)
        return {
          ...intentResult,
          allowed: true,
          shouldProcess: false
        };
      }

      // ══════════════════════════════════════════════════════════
      // LAYER 4: CONVERSATION SUPERVISOR (Intelligent Context Analysis)
      //  FIX: Executar APENAS em casos de edge (reduz chamadas OpenAI)
      // - Primeiras mensagens (< 3 mensagens no histórico)
      // - Mensagens curtas/suspeitas (possível bot ou rejeição)
      // - Sinais claros de problema (?, !, negação)
      // ══════════════════════════════════════════════════════════
      const shouldRunSupervisor = this._shouldRunSupervisor(text, enrichedContext);

      if (!shouldRunSupervisor) {
        log.info('Supervisor SKIPPED - conversa normal', { from });
      }

      try {
        //  Executar supervisor apenas se necessário
        const supervisorAnalysis = shouldRunSupervisor
          ? await conversationSupervisor.analyzeContext(
              from,
              text,
              {
                currentAgent: enrichedContext.currentAgent,
                leadState: enrichedContext.leadState,
                bantStages: enrichedContext.bantStages
              }
            )
          : { success: false, shouldContinueSpin: true, needsSpecialHandling: false };

        // Se precisa tratamento especial (não é conversa normal)
        if (supervisorAnalysis && supervisorAnalysis.needsSpecialHandling) {
          log.warn('Supervisor detectou situacao especial', {
            situation: supervisorAnalysis.situation_type,
            confidence: supervisorAnalysis.confidence,
            action: supervisorAnalysis.recommended_action,
            from
          });

          // Gerar resposta especial se necessário
          const specialResponse = conversationSupervisor.generateSpecialResponse(
            supervisorAnalysis.situation_type,
            enrichedContext
          );

          // Se há resposta especial para enviar
          if (specialResponse) {
            log.success('Supervisor gerando resposta especial', {
              type: supervisorAnalysis.situation_type,
              from
            });

            return {
              allowed: true,
              shouldProcess: false,
              type: 'supervisor_intervention',
              from, //  FIX: Incluir 'from' para GATE4 enviar para o contactId correto
              responseToSend: specialResponse,
              supervisorAnalysis,
              reason: supervisorAnalysis.situation_type
            };
          }

          //  FIX: Normalizar situation_type para evitar erros de null/undefined
          const situationType = (supervisorAnalysis.situation_type || 'normal_conversation').toLowerCase();

          // Se é BOT_DETECTED, não enviar nada (bloquear silenciosamente)
          if (situationType === 'bot_detected') {
            log.warn('Supervisor confirmou BOT - bloqueando', { from });
            return {
              allowed: false,
              shouldProcess: false,
              type: 'supervisor_bot_block',
              from, //  FIX: Incluir 'from' para consistência
              reason: 'bot_detected_by_supervisor',
              supervisorAnalysis
            };
          }

          // Se tem resposta sugerida do LLM, usar como alternativa
          if (supervisorAnalysis.suggested_response) {
            log.info('Usando resposta sugerida do supervisor', { from });
            return {
              allowed: true,
              shouldProcess: false,
              type: 'supervisor_suggested_response',
              from, //  FIX: Incluir 'from' para GATE4 enviar para o contactId correto
              responseToSend: supervisorAnalysis.suggested_response,
              supervisorAnalysis
            };
          }
        }

        // Adicionar análise do supervisor ao contexto para o agente usar
        enrichedContext.supervisorAnalysis = supervisorAnalysis;

      } catch (supervisorError) {
        log.warn('Erro no supervisor (continuando)', { error: supervisorError.message });
        // Continuar sem supervisor em caso de erro
      }

      // ══════════════════════════════════════════════════════════
      // LAYER 5: AGENT PROCESSING
      // ══════════════════════════════════════════════════════════
      log.info('Encaminhando para agente', {
        agent: enrichedContext.currentAgent || 'sdr',
        from,
        isInCadence: enrichedContext.isInCadence,
        cadenceDay: enrichedContext.lead?.cadenceDay,
        supervisorSituation: enrichedContext.supervisorAnalysis?.situation_type,
        hasVerificationConfirmation: !!enrichedContext.verificationConfirmation
      });

      //  FIX: Incluir mensagem de confirmação de verificação humana se existir
      // Isso será enviado ANTES da resposta do agente
      const result = {
        allowed: true,
        shouldProcess: true,
        intent: intentResult.intent,
        message,
        context: {
          ...enrichedContext,
          ...intentResult.context
        }
      };

      // Se humano foi verificado, incluir confirmação para envio
      if (enrichedContext.verificationConfirmation) {
        result.verificationConfirmation = enrichedContext.verificationConfirmation;
        result.humanVerified = true;
      }

      return result;

    } catch (error) {
      log.error('Erro no processamento do pipeline', error, { from });
      return {
        allowed: false,
        shouldProcess: false,
        error: true,
        reason: 'pipeline_error',
        errorMessage: error.message
      };
    }
  }

  /**
   * LAYER 1: Security & Validation
   * - Bot detection (tempo de resposta)
   * - Message validation
   *
   * REFATORADO: Retorna responseToSend em vez de enviar diretamente
   */
  async securityLayer(message, context) {
    log.info('Security layer iniciada');

    const { from, text } = message;
    const { currentAgent, messageCount } = context;

    //  Bot detection APENAS para novos contatos ou SDR
    if (!currentAgent || currentAgent === 'sdr') {
      log.info('Verificando bot behavior', { from, messageCount });

      const botCheck = await simpleBotDetector.check(from, text, {
        messageCount
      });

      // Bot detectado - RETORNAR mensagem de verificação (não enviar)
      if (!botCheck.allowed && botCheck.action === 'send_verification') {
        log.warn('Bot suspeito - preparando verificacao', { from, responseTime: botCheck.responseTime });

        return {
          allowed: false,
          from, //  FIX: Incluir 'from' para GATE4 enviar para o contactId correto
          reason: 'bot_verification_required',
          type: 'bot_verification',
          responseToSend: botCheck.message,
          botCheck
        };
      }

      // Bot bloqueado (sem resposta)
      if (!botCheck.allowed) {
        log.warn('Bot bloqueado', { from, reason: botCheck.reason });

        return {
          allowed: false,
          from, //  FIX: Incluir 'from' para consistência
          reason: botCheck.reason,
          type: 'bot_blocked',
          responseToSend: null, // Não enviar nada
          botCheck
        };
      }

      // Verificado como humano - RETORNAR mensagem de confirmação
      if (botCheck.verified && botCheck.message) {
        log.success('Humano verificado!', { from });

        return {
          allowed: true,
          from, //  FIX: Incluir 'from' para GATE4 enviar para o contactId correto
          verified: true,
          type: 'human_verified',
          responseToSend: botCheck.message,
          continueToAgents: true // Permitir continuar para agentes após enviar
        };
      }

      log.success('Bot check passou', { from, responseTime: botCheck.responseTime });
    }

    return {
      allowed: true
    };
  }

  /**
   * LAYER 2: Interceptors (Early Returns)
   * - Opt-out detection
   * - System commands
   *
   * REFATORADO: Retorna responseToSend em vez de enviar diretamente
   */
  async interceptorsLayer(message, context) {
    log.info('Interceptors layer iniciada');

    const { from, text } = message;

    //  Opt-out check
    const optOutResult = await checkOptOut(from, text);

    if (optOutResult.isOptOut) {
      log.success('Opt-out detectado', { reason: optOutResult.reason, from });

      return {
        handled: true,
        shouldProcess: false,
        type: 'opt_out',
        from, //  FIX: Incluir 'from' para GATE4 enviar para o contactId correto
        responseToSend: optOutResult.confirmationMessage,
        optOutResult
      };
    }

    log.info('Nenhum interceptor ativado');

    return {
      handled: false
    };
  }

  /**
   * LAYER 3: Intent Classification
   * - FAQ detection via UnifiedFAQSystem (GPT-based)
   * - Agent routing hints
   *
   * REFATORADO: Retorna responseToSend em vez de enviar diretamente
   */
  async intentLayer(message, context) {
    log.info('Intent layer iniciada');

    const { from, text } = message;
    const { currentAgent, leadState, bantStages } = context;

    //  FIX: Detectar perguntas COM OU SEM interrogação
    // Muitas perguntas em português coloquial não usam "?"
    const isPotentialQuestion = this._isPotentialQuestion(text);

    if (text && isPotentialQuestion) {
      log.info('Pergunta detectada - verificando UnifiedFAQ', {
        from,
        hasQuestionMark: text.trim().endsWith('?'),
        detectedBy: 'pattern_matching'
      });

      try {
        const faqResult = await unifiedFAQSystem.processFAQ(text, {
          currentAgent,
          leadState,
          bantStages
        });

        if (faqResult.handled) {
          log.success('FAQ processado via UnifiedFAQ', {
            category: faqResult.category,
            confidence: faqResult.confidence,
            from
          });

          return {
            handled: true,
            shouldProcess: false,
            type: 'faq',
            from, //  FIX: Incluir 'from' para GATE4 enviar para o contactId correto
            responseToSend: faqResult.response,
            faqResult
          };
        } else {
          log.info('Nao e FAQ - encaminhar para agente', { from });
        }
      } catch (error) {
        log.error('Erro ao processar FAQ via UnifiedFAQ', { error: error.message, from });
        // Se der erro, continua para agents
      }
    }

    //  Classify intent geral (para routing hints)
    const classification = await classifyIntent(text, {
      currentAgent,
      leadState: context.leadState
    });

    log.info('Intent classificado', {
      intent: classification.primaryIntent,
      confidence: classification.confidence,
      from
    });

    return {
      handled: false,
      intent: classification,
      context: {
        intentClassification: classification
      }
    };
  }

  /**
   *  FIX: Determina se deve executar o Supervisor (reduz chamadas OpenAI)
   * Executa apenas em casos de "edge" onde análise de contexto é necessária:
   * - Mensagens 2 e 3 (pode ser bot ou lead confuso)
   * - Mensagens curtas/suspeitas
   * - Sinais claros de rejeição ou redirecionamento
   *
   *  FIX v2: SKIP message 0 (first message from lead - no context yet)
   */
  _shouldRunSupervisor(text, context) {
    if (!text) return false;

    const normalizedText = text.toLowerCase().trim();
    const messageCount = context.messageCount || 0;

    //  FIX: Skip first message (messageCount 0 or 1) - no context to analyze yet
    // The SimpleBotDetector already handles bot detection for first messages
    if (messageCount <= 1) {
      return false;
    }

    // 1. Messages 2-3 - analyze for potential bot patterns or confusion
    if (messageCount <= 3) {
      return true;
    }

    // 2. Mensagens muito curtas (< 20 chars) - suspeitas de bot ou rejeição
    if (normalizedText.length < 20) {
      return true;
    }

    // 3. Sinais claros de rejeição
    const rejectionSignals = [
      'não tenho interesse',
      'não quero',
      'para de',
      'me remove',
      'sai da lista',
      'não me ligue',
      'pare de mandar',
      'já tenho',
      'não preciso',
      'estou satisfeito',
      'não é comigo',
      'errou o número'
    ];

    if (rejectionSignals.some(signal => normalizedText.includes(signal))) {
      return true;
    }

    // 4. Sinais de redirecionamento
    const redirectSignals = [
      'fala com',
      'conversa com',
      'quem cuida',
      'responsável',
      'manda email',
      'liga depois',
      'não sou eu'
    ];

    if (redirectSignals.some(signal => normalizedText.includes(signal))) {
      return true;
    }

    // 5. Mensagens MUITO genéricas que podem indicar bot OU humano confuso
    // NOTA: Esses padrões NÃO bloqueiam - apenas acionam o Supervisor para análise
    //  REMOVIDO "sim" pois é keyword de confirmação humana no SimpleBotDetector
    const ambiguousPatterns = [
      /^ok$/i,
      /^não$/i,
      /^obrigad[oa]$/i,
      /^tudo bem$/i,
      /^oi$/i,
      /^olá$/i,
      /^\d+$/  // Só números (pode ser menu de bot)
    ];

    if (ambiguousPatterns.some(pattern => pattern.test(normalizedText))) {
      return true;
    }

    // Default: não executar supervisor (conversa normal)
    return false;
  }

  /**
   * Obtém estatísticas do pipeline
   */
  getStats() {
    return {
      ...this.stats,
      blockRate: this.stats.processed > 0
        ? (this.stats.blocked / this.stats.processed * 100).toFixed(2) + '%'
        : '0%'
    };
  }
}

// Export singleton
export const messagePipeline = new MessagePipeline();
export default messagePipeline;

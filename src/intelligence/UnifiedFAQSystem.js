/**
 * @file UnifiedFAQSystem.js
 * @description Sistema Unificado de FAQ - Classifica e responde perguntas via GPT
 *
 * Unifica:
 * - FAQ_RESPONSES (keyword matching)  GPT classification
 * - ContextualRedirect (off-topic)  GPT-based redirect
 * - Retorno automático ao fluxo
 *
 * @author ORBION Team
 * @version 3.0.0
 * @date 2025-11-13
 */

import openai from '../core/openai_client.js';
import log from '../utils/logger-wrapper.js';
import { FAQ_PROMPTS } from './prompts/faq_prompts.js';

// ═══════════════════════════════════════════════════════════════
// UNIFIED FAQ SYSTEM - CLASSE PRINCIPAL
// ═══════════════════════════════════════════════════════════════

export class UnifiedFAQSystem {
  constructor() {
    this.name = 'UnifiedFAQSystem';
    this.version = '3.0.0';

    log.info('UnifiedFAQSystem inicializado', { version: this.version });
  }

  /**
   * CAMADA 1: Detecta e classifica FAQ via GPT
   * @param {string} messageText - Mensagem com "?"
   * @param {Object} context - Contexto do lead
   * @returns {Promise<Object>} - { isFAQ, category, confidence, shouldBlock }
   */
  async classifyFAQIntent(messageText, context = {}) {
    log.info('Classificando FAQ intent via GPT', {
      messagePreview: messageText.substring(0, 50),
      currentAgent: context.currentAgent
    });

    // 1. Verificar se termina com "?"
    if (!messageText.trim().endsWith('?')) {
      log.debug('Mensagem não termina com "?" - não é pergunta');
      return { isFAQ: false };
    }

    try {
      // 2. Classificar via GPT
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: FAQ_PROMPTS.classification
          },
          {
            role: 'user',
            content: messageText
          }
        ],
        temperature: 0.3, // Baixa para consistência
        max_tokens: 150,
        response_format: { type: 'json_object' }
      });

      const classification = JSON.parse(response.choices[0].message.content);

      log.info('FAQ classificado via GPT', {
        category: classification.category,
        confidence: classification.confidence,
        isBusinessRelated: classification.isBusinessRelated
      });

      return {
        isFAQ: true,
        category: classification.category,
        confidence: classification.confidence,
        shouldBlock: classification.isBusinessRelated // Bloqueia agentes se for FAQ
      };
    } catch (error) {
      log.error('Erro ao classificar FAQ intent', { error: error.message });

      // Fallback: se GPT falhar, não bloqueia pipeline
      return { isFAQ: false };
    }
  }

  /**
   * CAMADA 2: Gera resposta via GPT baseado na categoria
   * @param {string} messageText - Pergunta original
   * @param {Object} classification - Resultado da classificação
   * @param {Object} context - Contexto do lead
   * @returns {Promise<string>} - Resposta formatada
   */
  async generateFAQResponse(messageText, classification, context = {}) {
    const { category } = classification;

    log.info('Gerando resposta FAQ via GPT', {
      category,
      messagePreview: messageText.substring(0, 50)
    });

    try {
      // Selecionar prompt baseado na categoria
      let systemPrompt;

      if (category.startsWith('business.')) {
        systemPrompt = this._buildBusinessFAQPrompt(category, context);
      } else if (category.startsWith('offtopic.')) {
        systemPrompt = this._buildRedirectPrompt(category, context);
      } else if (category.startsWith('sensitive.')) {
        systemPrompt = this._buildSensitivePrompt(category, context);
      } else if (category === 'blocked') {
        // Resposta padrão para tópicos bloqueados
        return 'Desculpa, mas não posso ajudar com isso. Sou especialista em automação e vendas para PMEs. Tem alguma dúvida sobre atendimento inteligente ou crescimento comercial?';
      } else {
        // Fallback: prompt genérico
        systemPrompt = FAQ_PROMPTS.generic;
      }

      // Gerar resposta via GPT
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: messageText
          }
        ],
        temperature: 0.7,
        max_tokens: 300 // Limita tamanho (WhatsApp)
      });

      const faqResponse = response.choices[0].message.content.trim();

      log.info('Resposta FAQ gerada', {
        category,
        responseLength: faqResponse.length
      });

      return faqResponse;
    } catch (error) {
      log.error('Erro ao gerar resposta FAQ', { error: error.message });

      // Fallback: resposta genérica
      return 'Desculpa, tive um problema ao processar sua pergunta. Pode reformular?';
    }
  }

  /**
   * CAMADA 3: Adiciona instrução de retorno ao fluxo
   * @param {string} faqResponse - Resposta do FAQ
   * @param {Object} context - Contexto do lead
   * @returns {string} - Resposta + retorno ao fluxo
   */
  addFlowReturnMessage(faqResponse, context = {}) {
    const { currentAgent, leadState } = context;

    //  FIX: Usar consultativeEngine.spin.currentStage (SPIN Edition)
    const spinStage = leadState?.consultativeEngine?.spin?.currentStage ||
                      leadState?.consultativeEngine?.spinStage ||
                      context.bantStages?.currentStage; // fallback para compatibilidade

    let returnMessage = '';

    // Se estava no SPIN (Specialist), retorna ao stage específico
    if (currentAgent === 'specialist' && spinStage) {
      //  FIX: Usar nomes SPIN corretos
      const stageNames = {
        situation: 'situação',
        problem: 'desafios',
        implication: 'impacto',
        needPayoff: 'soluções',
        closing: 'próximos passos'
      };

      const stageName = stageNames[spinStage] || 'qualificação';

      //  FIX: Mensagens contextuais por stage SPIN
      const stageMessages = {
        situation: 'Voltando a entender sua operação...',
        problem: 'Voltando aos desafios que você mencionou...',
        implication: 'Retomando sobre o impacto disso...',
        needPayoff: 'Voltando às soluções...',
        closing: 'Voltando ao agendamento...'
      };

      const stageMessage = stageMessages[spinStage] || 'Voltando à nossa conversa...';
      returnMessage = `\n\n Esclarecido! ${stageMessage}`;
    }
    // Se estava no SDR (primeira conversa), volta para descoberta
    else if (currentAgent === 'sdr') {
      returnMessage = '\n\n Tudo certo! Agora me conta: como os clientes chegam até vocês hoje?';
    }
    // Se estava no Scheduler (agendamento), volta para marcar horário
    else if (currentAgent === 'scheduler') {
      returnMessage = '\n\n Combinado! Voltando ao agendamento: qual dia e horário funciona melhor pra você?';
    }
    // Caso genérico (novo lead ou sem contexto)
    else {
      returnMessage = '\n\n Respondido! Como posso te ajudar?';
    }

    log.debug('Adicionando retorno ao fluxo', {
      currentAgent,
      currentStage: spinStage,
      returnMessage: returnMessage.substring(0, 50)
    });

    return faqResponse + returnMessage;
  }

  // ═══════════════════════════════════════════════════════════════
  // BUILDERS DE PROMPTS ESPECÍFICOS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Constrói prompt para FAQs de negócio
   * @private
   */
  _buildBusinessFAQPrompt(category, context) {
    // Mapear categoria para tipo de FAQ
    const categoryMap = {
      'business.pricing': 'pricing',
      'business.services': 'services',
      'business.company': 'company',
      'business.team': 'team',
      'business.demo': 'demo',
      'business.cases': 'cases',
      'business.technical': 'technical'
    };

    const faqType = categoryMap[category] || 'generic';
    return FAQ_PROMPTS.business[faqType] || FAQ_PROMPTS.generic;
  }

  /**
   * Constrói prompt para redirects off-topic
   * @private
   */
  _buildRedirectPrompt(category, context) {
    // Mapear categoria para tipo de redirect
    const categoryMap = {
      'offtopic.weather': 'weather',
      'offtopic.sports': 'sports',
      'offtopic.traffic': 'traffic',
      'offtopic.food': 'food',
      'offtopic.personal': 'personal',
      'offtopic.animals': 'animals'
    };

    const redirectType = categoryMap[category] || 'generic';
    return FAQ_PROMPTS.redirect[redirectType] || FAQ_PROMPTS.redirect.generic;
  }

  /**
   * Constrói prompt para tópicos sensíveis
   * @private
   */
  _buildSensitivePrompt(category, context) {
    // Tópicos sensíveis sempre usam o mesmo prompt (máxima empatia)
    return FAQ_PROMPTS.sensitive;
  }

  // ═══════════════════════════════════════════════════════════════
  // MÉTODO PRINCIPAL (ORQUESTRA TUDO)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Processa pergunta completa (classifica + responde + retorna ao fluxo)
   * @param {string} messageText - Mensagem com "?"
   * @param {Object} context - Contexto do lead
   * @returns {Promise<Object>} - { handled, response, category }
   */
  async processFAQ(messageText, context = {}) {
    log.info('[UnifiedFAQ] Processando pergunta', {
      messagePreview: messageText.substring(0, 50)
    });

    // 1. Classificar
    const classification = await this.classifyFAQIntent(messageText, context);

    if (!classification.isFAQ) {
      log.debug('[UnifiedFAQ] Não é FAQ - encaminhar para agents');
      return { handled: false };
    }

    // 2. Gerar resposta
    const faqResponse = await this.generateFAQResponse(
      messageText,
      classification,
      context
    );

    // 3. Adicionar retorno ao fluxo
    const finalResponse = this.addFlowReturnMessage(faqResponse, context);

    log.info('[UnifiedFAQ] FAQ processado com sucesso', {
      category: classification.category,
      responseLength: finalResponse.length
    });

    return {
      handled: true,
      response: finalResponse,
      category: classification.category,
      confidence: classification.confidence
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════════

const unifiedFAQSystem = new UnifiedFAQSystem();

export default unifiedFAQSystem;

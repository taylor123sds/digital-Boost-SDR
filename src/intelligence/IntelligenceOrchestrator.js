// intelligence/IntelligenceOrchestrator.js
//  Orquestrador de Inteligência - Coordena Todos os Módulos de IA

/**
 * MÓDULO CENTRAL que integra:
 * - ResponseVariation (elimina frases repetitivas)
 * - ContextualIntelligence (detecta meta-referências e intenções)
 * - MessageFormatter (estrutura mensagens)
 *
 * RESPONSABILIDADES:
 * 1. Analisar contexto antes de gerar resposta
 * 2. Aplicar variações dinâmicas
 * 3. Formatar saída de forma estruturada
 * 4. Melhorar prompts enviados ao GPT
 */

import { getResponseVariation } from './ResponseVariation.js';
import { getContextualIntelligence } from './ContextualIntelligence.js';
import { getMessageFormatter } from './MessageFormatter.js';
import { getConversationRecovery } from './ConversationRecovery.js';
import { ResponseOptimizer } from '../tools/response_optimizer.js';
import { ConversationAnalytics } from '../learning/conversation_analytics.js';
import { getFeedbackLoop } from './FeedbackLoop.js';
import { getSentimentAnalyzer } from './SentimentAnalyzer.js';
import { getContextWindowManager } from './ContextWindowManager.js';
import { getPromptAdaptationSystem } from './PromptAdaptationSystem.js';
import { getArchetypeEngine } from './ArchetypeEngine.js';
import { getPatternApplier } from './PatternApplier.js';
import { getRealTimeAdapter } from './RealTimeAdapter.js';
import leadScoringSystem from '../tools/lead_scoring_system.js';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

//  Constantes de configuração
const CRITICAL_CONVERSATION_SCORE_THRESHOLD = 30;
const SENTIMENT_INTERVENTION_PRIORITY_HIGH = 'high';

export class IntelligenceOrchestrator {
  constructor() {
    this.responseVariation = getResponseVariation();
    this.contextIntelligence = getContextualIntelligence();
    this.formatter = getMessageFormatter();
    this.recovery = getConversationRecovery();
    this.optimizer = new ResponseOptimizer();
    this.analytics = new ConversationAnalytics();
    this.feedbackLoop = getFeedbackLoop();
    this.sentimentAnalyzer = getSentimentAnalyzer();
    this.contextWindowManager = getContextWindowManager(); //  P2: Context Window
    this.promptAdaptation = getPromptAdaptationSystem(); //  P2: Prompt Adaptation
    this.archetypeEngine = getArchetypeEngine(); //  Arquétipos de comunicação
    this.leadScoring = leadScoringSystem; //  Lead Scoring MQL/SQL
    this.patternApplier = getPatternApplier(); //  Aplicação de padrões aprendidos
    this.realTimeAdapter = getRealTimeAdapter(); //  Adaptação em tempo real
  }

  /**
   * MÉTODO PRINCIPAL: Processar mensagem com inteligência completa
   *
   * ORDEM DE PRIORIDADE DAS INTERVENÇÕES:
   * 1. Sentiment (HIGH priority) - Intervenção imediata se sentimento muito negativo
   * 2. Recovery Analysis - Resposta inadequada (monosílaba, vaga, confusa)
   * 3. Context Intervention - Meta-referências, pedido de humano
   *
   * Se nenhuma intervenção necessária, retorna análise para fluxo normal
   */
  async processMessage(userMessage, context) {
    //  Validação de parâmetros
    if (!userMessage || typeof userMessage !== 'string') {
      console.error(' [Intelligence] userMessage inválido:', userMessage);
      return {
        skipNormalFlow: false,
        contextAnalysis: {},
        error: 'invalid_user_message'
      };
    }

    if (!context || !context.contactId) {
      console.error(' [Intelligence] context.contactId obrigatório');
      return {
        skipNormalFlow: false,
        contextAnalysis: {},
        error: 'missing_contact_id'
      };
    }

    const {
      contactId,
      conversationHistory = [],
      leadProfile = {},
      currentStage = null,
      lastQuestion = null
    } = context;

    console.log(`\n [Intelligence] Processando mensagem de ${contactId}`);

    //  Container para ajustes de contexto (sem mutação)
    const contextAdjustments = {};

    try {
      // PASSO 1: ANÁLISE DE SENTIMENTO EM TEMPO REAL
      const sentimentAnalysis = await this.sentimentAnalyzer.analyzeSentiment(contactId, userMessage);
      console.log(` [Intelligence] Sentimento: ${sentimentAnalysis.label} (${sentimentAnalysis.score.toFixed(2)}) | Momentum: ${sentimentAnalysis.momentum.momentum}`);

      // Se sentimento negativo com momentum declining, sugerir estratégia
      if (sentimentAnalysis.needsIntervention) {
        const strategy = this.sentimentAnalyzer.suggestStrategy(sentimentAnalysis);
        console.log(` [Intelligence] Intervenção necessária: ${strategy.strategy}`);

        // PRIORIDADE 1: Intervenção imediata se prioridade alta
        if (strategy.priority === SENTIMENT_INTERVENTION_PRIORITY_HIGH) {
          return {
            message: this._generateInterventionMessage(sentimentAnalysis, strategy),
            action: 'sentiment_intervention',
            metadata: { sentimentAnalysis, strategy },
            skipNormalFlow: true
          };
        }

        // Prioridade média: ajustar tom no contexto (sem mutação)
        contextAdjustments.sentimentStrategy = strategy;
      }

      // PASSO 2: VERIFICAR RISCO DE ABANDONO
      const abandonmentRisk = await this.feedbackLoop.detectAbandonmentRisk(
        contactId,
        currentStage,
        userMessage
      );

      if (abandonmentRisk.atRisk && abandonmentRisk.riskLevel === 'high') {
        console.log(` [Intelligence] Alto risco de abandono detectado`);
        contextAdjustments.abandonmentRisk = abandonmentRisk;
      }

      // PASSO 3: ANÁLISE DE QUALIDADE DA RESPOSTA
      const recoveryAnalysis = await this.recovery.analyzeResponse(userMessage, {
        contactId,
        currentStage,
        lastQuestion,
        conversationHistory
      });

      // PRIORIDADE 2: Recovery de respostas inadequadas
      if (recoveryAnalysis.needsRecovery) {
        console.log(` [Intelligence] Resposta inadequada - aplicando recuperação`);
        return {
          message: recoveryAnalysis.recoveryMessage,
          action: 'recovery',
          metadata: {
            issueType: recoveryAnalysis.issueType,
            recoveryAction: recoveryAnalysis.recoveryAction
          },
          skipNormalFlow: true
        };
      }

      // PASSO 4: ANÁLISE DE CONTEXTO
      const contextAnalysis = await this.contextIntelligence.analyzeContext(
        userMessage,
        conversationHistory
      );

      console.log(` [Intelligence] Análise contextual:`, {
        isMetaReference: contextAnalysis.isMetaReference,
        wantsHuman: contextAnalysis.wantsHuman,
        hasFrustration: contextAnalysis.hasFrustration,
        responseStrategy: contextAnalysis.responseStrategy
      });

      // PASSO 5: VERIFICAR SE PRECISA INTERVENÇÃO ESPECIAL
      const intervention = this.contextIntelligence.generateContextualResponse(
        contextAnalysis,
        leadProfile.nome_pessoa
      );

      // PRIORIDADE 3: Intervenções contextuais (meta-referência, pedido de humano)
      if (intervention.shouldIntercept) {
        console.log(` [Intelligence] Intervenção necessária: ${intervention.action}`);
        return {
          message: intervention.response,
          action: intervention.action,
          metadata: intervention.metadata,
          skipNormalFlow: true
        };
      }

      // PASSO 6: ANALISAR CONVERSA COM LEARNING SYSTEM
      const conversationScore = await this.analytics.calculateConversationScore(contactId);
      console.log(` [Intelligence] Conversation Score: ${conversationScore}/100`);

      // Se score muito baixo, sugerir mudança de estratégia
      if (conversationScore < CRITICAL_CONVERSATION_SCORE_THRESHOLD && !contextAnalysis.responseStrategy) {
        console.log(` [Intelligence] Baixo score detectado - sugerindo recovery`);
        contextAnalysis.responseStrategy = 'empathetic';
      }

      // PASSO 7: CONTINUAR FLUXO NORMAL (com ajustes de tom)
      return {
        contextAnalysis,
        contextAdjustments, //  Ajustes sem mutação
        intervention: null,
        skipNormalFlow: false,
        suggestedTone: contextAnalysis.responseStrategy || 'normal',
        conversationScore
      };

    } catch (error) {
      console.error(' [Intelligence] Erro ao processar mensagem:', error.message);
      console.error('Stack:', error.stack);

      //  Retornar análise vazia em caso de erro (graceful degradation)
      return {
        skipNormalFlow: false,
        contextAnalysis: {},
        error: error.message
      };
    }
  }

  /**
   *  P0 NOVO: Registrar interação para aprendizado
   * Deve ser chamado APÓS enviar resposta ao usuário
   */
  async recordInteraction(contactId, userMessage, botResponse) {
    try {
      // Detectar sinais de sucesso/falha na conversa
      const signals = await this.analytics.detectSuccessSignals(
        contactId,
        userMessage,
        botResponse
      );

      if (signals.length > 0) {
        console.log(` [Intelligence] Sinais detectados: ${signals.map(s => s.type).join(', ')}`);
      }

      return signals;
    } catch (error) {
      console.error(` [Intelligence] Erro ao registrar interação:`, error.message);
      return [];
    }
  }

  /**
   *  P2 NOVO: Otimizar histórico de conversa
   * Reduz tokens e melhora contexto
   */
  async optimizeConversationHistory(contactId, conversationHistory, metadata = {}) {
    try {
      return await this.contextWindowManager.optimizeHistory(
        contactId,
        conversationHistory,
        metadata
      );
    } catch (error) {
      console.error(` [Intelligence] Erro ao otimizar histórico:`, error.message);
      return {
        optimized: conversationHistory,
        error: error.message
      };
    }
  }

  /**
   *  P2 NOVO: Obter melhor prompt para stage
   * Usa aprendizado para otimizar prompts
   */
  async getBestPromptForStage(stage, context = {}) {
    try {
      return await this.promptAdaptation.getBestPrompt(stage, context);
    } catch (error) {
      console.error(` [Intelligence] Erro ao buscar melhor prompt:`, error.message);
      return {
        prompt: null,
        error: error.message
      };
    }
  }

  /**
   *  P2 NOVO: Registrar resultado do prompt usado
   * Chamado quando conversa finaliza
   */
  async recordPromptOutcome(variationId, contactId, outcome, metadata = {}) {
    try {
      if (!variationId) return;
      await this.promptAdaptation.recordPromptOutcome(variationId, contactId, outcome, metadata);
    } catch (error) {
      console.error(` [Intelligence] Erro ao registrar prompt outcome:`, error.message);
    }
  }

  /**
   * MELHORAR PROMPT DO SISTEMA
   * Injeta instruções dinâmicas baseadas no contexto
   * MELHORIA 2: Agora inclui instruções de tom do arquétipo
   * MELHORIA 3: Agora inclui padrões aprendidos e adaptação em tempo real
   */
  async enhanceSystemPrompt(basePrompt, contextAnalysis, leadProfile, archetypeData = null, realTimeContext = {}) {
    const enhancements = [];

    // ═══════════════════════════════════════════════════════════════
    // MELHORIA 3: PADRÕES APRENDIDOS (PatternApplier)
    // ═══════════════════════════════════════════════════════════════
    try {
      const learnedInstructions = await this.patternApplier.getLearnedInstructions(
        realTimeContext.contactId || contextAnalysis.contactId,
        contextAnalysis.currentStage,
        {
          archetype: archetypeData?.archetype,
          sentimentScore: realTimeContext.sentimentScore,
          messageCount: realTimeContext.messageCount
        }
      );

      if (learnedInstructions) {
        enhancements.push(learnedInstructions);
      }
    } catch (error) {
      console.debug(`[Intelligence] Erro ao buscar padrões aprendidos: ${error.message}`);
    }

    // ═══════════════════════════════════════════════════════════════
    // MELHORIA 3: ADAPTAÇÃO EM TEMPO REAL (RealTimeAdapter)
    // ═══════════════════════════════════════════════════════════════
    if (realTimeContext.adaptationInstruction) {
      enhancements.push(realTimeContext.adaptationInstruction);
    }

    // ═══════════════════════════════════════════════════════════════
    // MELHORIA 2: INSTRUÇÕES DE TOM DO ARQUÉTIPO
    // ═══════════════════════════════════════════════════════════════
    if (archetypeData && archetypeData.archetype) {
      const toneInstructions = this.archetypeEngine.getToneInstructions(archetypeData.archetype);
      if (toneInstructions) {
        enhancements.push(toneInstructions);
      }

      // Adicionar abordagem de vendas específica do arquétipo
      const salesApproach = this.archetypeEngine.getSalesApproach(
        archetypeData.archetype,
        contextAnalysis.currentStage || 'discovery'
      );

      if (salesApproach) {
        enhancements.push(`
ABORDAGEM DE VENDAS (${archetypeData.archetype}):
- Estratégia: ${salesApproach.approach}
- Valores do lead: ${salesApproach.values?.join(', ') || 'N/A'}
- Características: ${salesApproach.traits?.join(', ') || 'N/A'}`);
      }
    }

    // Tom baseado no contexto
    if (contextAnalysis.responseStrategy === 'empathetic') {
      enhancements.push(`
IMPORTANTE: O lead está frustrado ou preocupado. Use tom empático e validador:
- Reconheça a emoção antes de propor solução
- Use frases como "Entendo bem", "Faz total sentido"
- Seja mais humano e menos técnico`);
    }

    if (contextAnalysis.responseStrategy === 'clarifying') {
      enhancements.push(`
IMPORTANTE: O lead está confuso. Seja mais claro e didático:
- Explique de forma simples e direta
- Use exemplos concretos
- Confirme se ficou claro ao final`);
    }

    // Personalização com nome
    if (leadProfile.nome_pessoa) {
      enhancements.push(`
INFORMAÇÃO DO LEAD:
- Nome: ${leadProfile.nome_pessoa}
- Use o nome ocasionalmente para personalizar (não exagere)`);
    }

    // Instruções anti-repetição
    enhancements.push(`
VARIAÇÃO DE RESPOSTAS:
- NUNCA use "Entendi", "Legal", "Entendo" no início das respostas
- Varie as transições: "Me conta uma coisa:", "Deixa eu te perguntar:", "Tô curioso:"
- Se for reconhecer algo, use: "Certo", "Beleza", "Show", "Perfeito", ou vá direto ao ponto`);

    // Instruções de estrutura
    enhancements.push(`
ESTRUTURA DA MENSAGEM:
- Máximo 3-4 sentenças (exceto quando houver lista)
- Use bullets (•) para listar múltiplos pontos
- Separe blocos com linha em branco
- Seja direto e conversacional`);

    // Combinar tudo
    return `${basePrompt}

===== AJUSTES CONTEXTUAIS =====
${enhancements.join('\n\n')}
=============================`;
  }

  /**
   * GERAR RESPOSTA COM GPT MELHORADO
   * Usa prompt aprimorado e pós-processa resposta
   * MELHORIA 2: Agora detecta e usa arquétipo automaticamente
   * MELHORIA 3: Agora usa adaptação em tempo real e padrões aprendidos
   */
  async generateEnhancedResponse(basePrompt, userMessage, context) {
    const { contactId, leadProfile = {}, contextAnalysis, sentimentScore, messageCount } = context;

    // MELHORIA 2: Detectar arquétipo com re-avaliação automática
    let archetypeData = null;
    try {
      archetypeData = await this.archetypeEngine.detectWithAutoReeval(contactId, {
        message: userMessage,
        leadProfile,
        currentStage: contextAnalysis.currentStage
      });
      console.log(` [Intelligence] Arquétipo para resposta: ${archetypeData.archetype} (${Math.round(archetypeData.confidence * 100)}%)`);
    } catch (error) {
      console.error(` [Intelligence] Erro ao detectar arquétipo:`, error.message);
    }

    // MELHORIA 3: Verificar se adaptação em tempo real é necessária
    let realTimeContext = {
      contactId,
      sentimentScore,
      messageCount,
      adaptationInstruction: null
    };

    try {
      const adaptation = await this.realTimeAdapter.analyzeAndAdapt(contactId, userMessage, {
        sentimentScore,
        previousSentiment: context.previousSentiment,
        currentStage: contextAnalysis.currentStage,
        messageCount
      });

      if (adaptation) {
        console.log(` [Intelligence] Adaptação em tempo real: ${adaptation.strategy.name}`);
        realTimeContext.adaptationInstruction = adaptation.instruction;
      }
    } catch (error) {
      console.debug(`[Intelligence] Erro na adaptação em tempo real: ${error.message}`);
    }

    // 1. Melhorar prompt do sistema (agora com arquétipo + padrões + adaptação)
    const enhancedPrompt = await this.enhanceSystemPrompt(
      basePrompt,
      contextAnalysis,
      leadProfile,
      archetypeData,
      realTimeContext // MELHORIA 3: Contexto de tempo real
    );

    // 2. Gerar resposta com GPT
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: enhancedPrompt },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.8, // Mais criativo para evitar repetição
      max_tokens: 300
    });

    let response = completion.choices[0].message.content.trim();

    // 3. Pós-processar resposta
    response = this._postProcessResponse(response, contactId, contextAnalysis);

    // 4. Formatar estrutura
    response = this.formatter.format(response, {
      structureType: 'auto',
      emphasize: []
    });

    // 5.  P0 NOVO: Otimizar resposta antes de enviar
    const optimizationResult = this.optimizer.optimize(response, {
      platform: 'whatsapp',
      preserveCTA: true
    });

    if (optimizationResult.wasOptimized) {
      console.log(` [Intelligence] Resposta otimizada: ${optimizationResult.originalLength}  ${optimizationResult.finalLength} chars (-${optimizationResult.reductionPercent}%)`);
    }

    return optimizationResult.optimized;
  }

  /**
   *  P1 NOVO: GERAR MENSAGEM DE INTERVENÇÃO
   * Cria mensagem empática quando sentimento deteriora
   */
  _generateInterventionMessage(sentimentAnalysis, strategy) {
    const { emotion, score } = sentimentAnalysis;
    const { strategy: strategyType, tone, action } = strategy;

    // Mensagens de intervenção baseadas na estratégia
    const interventions = {
      urgent_recovery: [
        "Percebo que algo não está claro. Deixa eu te ajudar de outra forma?",
        "Vejo que pode estar confuso. Vamos tentar de um jeito mais simples?",
        "Me fala: o que tá te deixando inseguro? Quero te ajudar da melhor forma."
      ],
      prevent_deterioration: [
        "Me conta, tá tudo claro até aqui?",
        "Antes de continuar: ficou alguma dúvida?",
        "Deixa eu confirmar: faz sentido pra você o que falamos?"
      ],
      clarify: [
        "Vou explicar melhor: [resumo do que foi dito]",
        "Deixa eu simplificar isso pra você.",
        "Talvez eu não tenha sido claro. Olha só:"
      ]
    };

    const messages = interventions[strategyType] || interventions.prevent_deterioration;
    const randomIndex = Math.floor(Math.random() * messages.length);

    return messages[randomIndex];
  }

  /**
   * PÓS-PROCESSAR RESPOSTA
   * Remove frases indesejadas e aplica variações
   */
  _postProcessResponse(response, contactId, contextAnalysis) {
    // Remover frases repetitivas comuns do início
    const unwantedPrefixes = [
      /^Entendi[,!.]?\s*/i,
      /^Legal[,!.]?\s*/i,
      /^Entendo[,!.]?\s*/i,
      /^Certo[,!.]?\s*/i,
      /^Perfeito[,!.]?\s*/i,
      /^Beleza[,!.]?\s*/i
    ];

    for (const pattern of unwantedPrefixes) {
      if (pattern.test(response)) {
        // Se começar com frase genérica, remover ou substituir por variação
        const needsAck = contextAnalysis.shouldAcknowledge;

        if (needsAck) {
          const ack = this.responseVariation.getAcknowledgment(
            contactId,
            {
              hasPain: contextAnalysis.hasFrustration,
              hasProgress: false
            }
          );

          response = response.replace(pattern, ack ? `${ack} ` : '');
        } else {
          response = response.replace(pattern, '');
        }

        break;
      }
    }

    return response.trim();
  }

  /**
   * CONSTRUIR MENSAGEM DE BANT COM VARIAÇÃO
   * Usado pelos agentes para gerar perguntas do BANT
   */
  buildBantMessage(contactId, stage, questions, leadProfile = {}) {
    const name = leadProfile.nome_pessoa;

    // Obter transição variada
    const transition = this.responseVariation.getTransition(contactId, 'question');

    // Obter reconhecimento (se for após uma resposta)
    const ack = stage !== 'need'
      ? this.responseVariation.getAcknowledgment(contactId, {})
      : null;

    // Construir mensagem estruturada
    const parts = [];

    if (ack) parts.push(ack);

    if (transition) {
      parts.push(transition);
    } else {
      parts.push('Me conta:');
    }

    // Adicionar perguntas
    if (Array.isArray(questions)) {
      parts.push('');
      questions.forEach(q => parts.push(`• ${q}`));
    } else {
      parts.push(questions);
    }

    return parts.join('\n');
  }

  /**
   * EXTRAIR NOME DA MENSAGEM
   * Detecta quando usuário diz seu nome
   */
  extractName(message) {
    // Padrões comuns
    const patterns = [
      /(?:me chamo|meu nome é|sou o|sou a|pode me chamar de)\s+([A-ZÀ-Ú][a-zà-ú]+)/i,
      /^([A-ZÀ-Ú][a-zà-ú]+)(?:,|\s|$)/,  // Nome no início
      /nome:?\s*([A-ZÀ-Ú][a-zà-ú]+)/i
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return null;
  }

  /**
   * VALIDAR QUALIDADE DA RESPOSTA
   * Verifica se resposta gerada está boa
   */
  validateResponse(response) {
    const issues = [];

    // Verificar se tem frases repetitivas
    const repetitivePatterns = [
      /\b(entendi|legal|entendo|certo|perfeito|beleza)\b/gi
    ];

    let repetitionCount = 0;
    for (const pattern of repetitivePatterns) {
      const matches = response.match(pattern);
      if (matches) {
        repetitionCount += matches.length;
      }
    }

    if (repetitionCount > 2) {
      issues.push('Muitas frases repetitivas detectadas');
    }

    // Verificar comprimento
    if (response.length > 800) {
      issues.push('Resposta muito longa');
    }

    // Verificar estrutura
    const validation = this.formatter.validate(response);
    if (!validation.isValid) {
      issues.push(...validation.issues);
    }

    return {
      isValid: issues.length === 0,
      issues,
      warnings: validation.warnings || []
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  ARQUÉTIPOS DE COMUNICAÇÃO - Integração
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Detecta arquétipo do lead e retorna dados
   * @param {string} contactId - ID do contato
   * @param {Object} context - Contexto (message, leadProfile, stage)
   * @returns {Promise<Object>} Análise do arquétipo
   */
  async detectArchetype(contactId, context = {}) {
    return await this.archetypeEngine.detectArchetype(contactId, context);
  }

  /**
   * Adapta mensagem ao arquétipo do lead
   * @param {string} contactId - ID do contato
   * @param {string} message - Mensagem original
   * @param {Object} context - Contexto adicional
   * @returns {Promise<Object>} { message, adapted, archetype }
   */
  async adaptMessageToArchetype(contactId, message, context = {}) {
    return await this.archetypeEngine.adaptMessage(contactId, message, context);
  }

  /**
   * Obtém instruções de tom baseadas no arquétipo
   * @param {string} contactId - ID do contato
   * @returns {Promise<string>} Instruções para o GPT
   */
  async getArchetypeToneInstructions(contactId) {
    const analysis = await this.archetypeEngine.detectArchetype(contactId, {});
    return this.archetypeEngine.getToneInstructions(analysis.archetype);
  }

  /**
   * Gera variações de pergunta adaptadas ao arquétipo
   * @param {string} contactId - ID do contato
   * @param {string} baseQuestion - Pergunta base
   * @returns {Promise<Array<string>>} Variações
   */
  async getArchetypeQuestionVariations(contactId, baseQuestion) {
    const analysis = await this.archetypeEngine.detectArchetype(contactId, {});
    return this.archetypeEngine.generateQuestionVariations(analysis.archetype, baseQuestion);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  LEAD SCORING - Integração MQL/SQL
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Calcula e atualiza score do lead
   * @param {string} contactId - ID do contato
   * @param {Object} context - Contexto (messages, profile, bantScore)
   * @returns {Promise<Object>} Score completo com classificação
   */
  async calculateLeadScore(contactId, context = {}) {
    return await this.leadScoring.calculateLeadScore(contactId, context);
  }

  /**
   * Obtém score atual do lead
   * @param {string} contactId - ID do contato
   * @returns {Promise<Object|null>} Score ou null
   */
  async getLeadScore(contactId) {
    return await this.leadScoring.getLeadScore(contactId);
  }

  /**
   * Registra atividade do lead (afeta scoring)
   * @param {string} contactId - ID do contato
   * @param {string} activityType - Tipo (message, demo_request, pricing_question)
   * @param {string} activityValue - Detalhes
   * @param {number} points - Pontos a adicionar
   */
  async recordLeadActivity(contactId, activityType, activityValue, points = 0) {
    return await this.leadScoring.recordActivity(contactId, activityType, activityValue, points);
  }

  /**
   * Obtém leads de alta prioridade (SQL + MQL)
   * @returns {Promise<Array>} Lista de leads prioritários
   */
  async getHighPriorityLeads() {
    return await this.leadScoring.getHighPriorityLeads();
  }

  /**
   * Classifica lead por score
   * @param {number} totalScore - Score total (0-100)
   * @returns {string} Classificação (SQL, MQL, PQL, IQL, COLD)
   */
  classifyLead(totalScore) {
    return this.leadScoring.classifyLeadByScore(totalScore);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  PROCESSAMENTO COMPLETO - Arquétipo + Score + Mensagem
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Processa mensagem com inteligência completa (arquétipo + score + variação)
   * Versão aprimorada do processMessage
   * @param {string} contactId - ID do contato
   * @param {string} userMessage - Mensagem do usuário
   * @param {Object} context - Contexto completo
   * @returns {Promise<Object>} Análise completa
   */
  async processWithFullIntelligence(contactId, userMessage, context = {}) {
    const results = {
      archetype: null,
      leadScore: null,
      messageAnalysis: null,
      adaptedResponse: null
    };

    try {
      // 1. Detectar arquétipo (paralelo)
      const archetypePromise = this.detectArchetype(contactId, {
        message: userMessage,
        leadProfile: context.leadProfile,
        currentStage: context.currentStage,
        sector: context.leadProfile?.setor
      });

      // 2. Processar mensagem normal (paralelo)
      const messagePromise = this.processMessage(userMessage, {
        contactId,
        conversationHistory: context.conversationHistory,
        leadProfile: context.leadProfile,
        currentStage: context.currentStage
      });

      // Aguardar ambos
      const [archetypeResult, messageResult] = await Promise.all([
        archetypePromise,
        messagePromise
      ]);

      results.archetype = archetypeResult;
      results.messageAnalysis = messageResult;

      // 3. Calcular lead score (se tem dados suficientes)
      if (context.conversationHistory?.length >= 2) {
        results.leadScore = await this.calculateLeadScore(contactId, {
          messageCount: context.conversationHistory.length,
          recentMessages: context.conversationHistory.slice(-5),
          industry: context.leadProfile?.setor,
          location: context.leadProfile?.localizacao,
          bantScore: context.bantScore,
          lastMessage: userMessage
        });
      }

      // 4. Se tiver mensagem de resposta, adaptar ao arquétipo
      if (messageResult.message && archetypeResult.confidence > 0.6) {
        results.adaptedResponse = await this.adaptMessageToArchetype(
          contactId,
          messageResult.message,
          context
        );
      }

      console.log(` [Intelligence] Full processing para ${contactId}:`, {
        archetype: archetypeResult.archetype,
        confidence: archetypeResult.confidence,
        leadScore: results.leadScore?.scores?.total,
        classification: results.leadScore?.classification
      });

      return results;

    } catch (error) {
      console.error(' [Intelligence] Erro no processamento completo:', error.message);
      return results;
    }
  }
}

// Singleton
let instance = null;

export function getIntelligenceOrchestrator() {
  if (!instance) {
    instance = new IntelligenceOrchestrator();
  }
  return instance;
}

export default IntelligenceOrchestrator;

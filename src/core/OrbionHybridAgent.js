// OrbionHybridAgent.js - IMPLEMENTAÇÃO COMPLETA E PRONTA PARA USO
// Sistema Híbrido Inteligente que combina Templates + LLM

import crypto from 'crypto';
import OpenAI from 'openai';
import { getMemory, setMemory } from '../memory.js';
import { salesFlowEnforcer } from './SalesFlowEnforcer.js';

/**
 * ORBION - Agente Híbrido Inteligente
 * Combina templates estruturados com IA generativa
 */
class OrbionHybridAgent {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    this.config = {
      botName: 'ORBION',
      company: 'Digital Boost',
      maxResponseTime: 5000,
      useCache: true,
      defaultStrategy: 'HYBRID'
    };

    this.salesPhases = [
      'FIRST_CONTACT',
      'DISCOVERY', 
      'QUALIFICATION',
      'SOLUTION_FIT',
      'SCHEDULING',
      'OBJECTION_HANDLING',
      'COMPLETED'
    ];

    console.log('🚀 ORBION Hybrid Agent v3.0 inicializado');
  }

  /**
   * PONTO DE ENTRADA ÚNICO - Processar mensagem
   */
  async processMessage(from, text, profile = {}) {
    const startTime = Date.now();
    const processingId = this.generateId();

    try {
      console.log(`\n📨 [${processingId}] Nova mensagem de ${from}`);

      // 1. Construir contexto completo
      const context = await this.buildContext(from, text, profile);
      
      // 2. Decidir estratégia (Template, LLM ou Híbrido)
      const strategy = await this.decideStrategy(context);
      console.log(`🎯 Estratégia escolhida: ${strategy.type} (confiança: ${strategy.confidence})`);
      
      // 3. Gerar resposta baseada na estratégia
      const response = await this.generateResponse(strategy, context);
      
      // 4. Atualizar estado da conversa
      await this.updateConversationState(context, response);
      
      // 5. Retornar resultado estruturado
      return {
        success: true,
        response: response.message,
        processingId,
        processingTime: Date.now() - startTime,
        strategy: strategy.type,
        confidence: strategy.confidence,
        currentPhase: context.state.phase,
        metadata: {
          isFirstContact: context.state.isFirstContact,
          messageCount: context.state.messageCount,
          segment: context.analysis.segment,
          sentiment: context.analysis.sentiment
        }
      };

    } catch (error) {
      console.error(`❌ [${processingId}] Erro:`, error);
      return this.handleError(error, from, processingId);
    }
  }

  /**
   * Construir contexto completo da conversa
   */
  async buildContext(from, text, profile) {
    // Recuperar estado da conversa
    const state = await this.getConversationState(from);

    // Analisar mensagem atual
    const analysis = await this.analyzeMessage(text, profile, state);

    // Histórico recente
    const history = await this.getRecentHistory(from);

    // 🎯 **NOVO**: Criar contexto inicial
    let context = {
      from,
      text,
      profile,
      state,
      analysis,
      history,
      timestamp: Date.now()
    };

    // 🎯 **ENFORCEMENT OBRIGATÓRIO**: Aplicar Sales Flow Enforcer
    console.log(`🎯 [FLOW ENFORCEMENT] Analisando mensagem de ${from} na fase ${state.phase}`);

    // Analisar mensagem para triggers automáticos
    await salesFlowEnforcer.analyzeMessageForTriggers(from, text, context);

    // Aplicar enforcement do fluxo de vendas
    context = await salesFlowEnforcer.enforceFlowProgression(from, text, context);

    console.log(`✅ [FLOW ENFORCEMENT] Contexto atualizado - Fase: ${context.state.phase}, Enforcement: ${context.enforcement?.action || 'NONE'}`);

    return context;
  }

  /**
   * Sistema de Decisão Inteligente
   * Decide quando usar Template, LLM ou Híbrido
   */
  async decideStrategy(context) {
    const scores = {
      STRUCTURED_FLOW: 0,   // ✅ NOVO: Prioridade máxima
      ARCHETYPE: 0,         // ✅ MODIFICADO: Era TEMPLATE
      HYBRID: 0,            // ✅ Mantido para casos complexos
      LLM: 0               // ✅ Reduzido drasticamente
    };

    // ============= STRUCTURED FLOW (PRIORIDADE MÁXIMA) =============

    // 🎯 CONTEXTOS COMERCIAIS - SEMPRE structured flow
    if (this.isCommercialContext(context)) {
      scores.STRUCTURED_FLOW += 100; // Prioridade máxima
    }

    // 🎯 PRIMEIRO CONTATO - Usar structured flow
    if (context.state.isFirstContact) {
      scores.STRUCTURED_FLOW += 90;
    }

    // 🎯 PERGUNTAS DE VENDAS - Structured flow
    if (this.isSalesQuestion(context.text)) {
      scores.STRUCTURED_FLOW += 85;
    }

    // 🎯 FASES DO FUNIL - Usar structured flow
    if (this.isInSalesFunnel(context.state.phase)) {
      scores.STRUCTURED_FLOW += 80;
    }

    // 🎯 DETECÇÃO DE INTENÇÕES COMERCIAIS
    if (this.hasCommercialIntent(context.text)) {
      scores.STRUCTURED_FLOW += 75;
    }

    // ============= ARQUÉTIPOS (PERSONALIZAÇÃO) =============

    // 🎭 SEGMENTO IDENTIFICADO - Usar arquétipo para personalizar
    if (context.analysis.segment) {
      scores.ARCHETYPE += 60;
    }

    // 🎭 PERFIL PROFISSIONAL DETECTADO
    if (this.isProfessionalProfile(context.profile)) {
      scores.ARCHETYPE += 55;
    }

    // 🎭 MENSAGENS PADRONIZADAS (opt-out, confirmações)
    if (this.isOptOut(context.text)) {
      scores.ARCHETYPE += 100; // Resposta padrão
    }

    if (this.isSchedulingConfirmation(context.text)) {
      scores.ARCHETYPE += 90;
    }

    // ============= HÍBRIDO (CASOS COMPLEXOS) =============

    // 🔀 OBJEÇÕES - Usar híbrido (structured + arquétipo)
    if (this.hasObjection(context.text)) {
      scores.HYBRID += 70; // Era LLM +50
    }

    // 🔀 CONTEXTO MÉDIO DA CONVERSA
    if (context.state.messageCount > 2 && context.state.messageCount < 8) {
      scores.HYBRID += 50;
    }

    // 🔀 PERGUNTAS COMPLEXAS MAS COMERCIAIS
    if (this.hasComplexQuestion(context.text) && this.isCommercialContext(context)) {
      scores.HYBRID += 60; // Era LLM +60
    }

    // 🔀 SENTIMENT NEGATIVO MAS RECUPERÁVEL
    if (context.analysis.sentiment < -0.3 && context.analysis.sentiment > -0.7) {
      scores.HYBRID += 45; // Era LLM +40
    }

    // ============= LLM (APENAS CASOS EXTREMOS) =============

    // ⚠️ SENTIMENT MUITO NEGATIVO - Precisa empatia
    if (context.analysis.sentiment < -0.7) {
      scores.LLM += 40;
    }

    // ⚠️ CONTEXTO COMPLETAMENTE DESCONHECIDO
    if (this.isCompletelyUnknown(context.text) && !this.isCommercialContext(context)) {
      scores.LLM += 30;
    }

    // ⚠️ NECESSIDADE DE EMPATIA EXTREMA
    if (this.needsExtremateEmpathy(context)) {
      scores.LLM += 35;
    }

    // ============= REGRAS DE ANULAÇÃO =============

    // 🚫 NUNCA LLM PURA EM CONTEXTO COMERCIAL
    if (this.isCommercialContext(context) || this.hasCommercialIntent(context.text)) {
      scores.LLM = 0;
    }

    // 🚫 NUNCA LLM PARA PERGUNTAS DE VENDAS
    if (this.isSalesQuestion(context.text)) {
      scores.LLM = 0;
    }

    // ============= DECISÃO FINAL =============

    const winner = Object.entries(scores).reduce((a, b) =>
      scores[a[0]] > scores[b[0]] ? a : b
    );

    const confidence = Math.max(scores[winner[0]] / 100, 0.7); // Mínimo 70%

    console.log('🎯 SCORING CALIBRADO:', {
      STRUCTURED_FLOW: scores.STRUCTURED_FLOW,
      ARCHETYPE: scores.ARCHETYPE,
      HYBRID: scores.HYBRID,
      LLM: scores.LLM,
      winner: winner[0],
      confidence: confidence
    });

    return {
      type: winner[0],
      confidence: confidence,
      scores: scores,
      reasoning: this.explainCalibratedDecision(winner[0], context, scores)
    };
  }

  /**
   * Gerar resposta baseada na estratégia escolhida
   */
  async generateResponse(strategy, context) {
    console.log(`🎯 Estratégia calibrada: ${strategy.type} (${Math.round(strategy.confidence * 100)}%)`);

    switch(strategy.type) {
      case 'STRUCTURED_FLOW':
        return await this.generateStructuredFlowResponse(context);

      case 'ARCHETYPE':
        return await this.generateSanitizedArchetypeResponse(context);

      case 'HYBRID':
        return await this.generateCalibratedHybridResponse(context);

      case 'LLM':
        return await this.generateGuidedLLMResponse(context);

      default:
        // Fallback SEMPRE usa structured flow
        console.log('⚠️ Fallback: usando structured flow');
        return await this.generateStructuredFlowResponse(context);
    }
  }

  /**
   * RESPOSTA COM TEMPLATE ESTRUTURADO
   */
  async generateTemplateResponse(context) {
    const templates = this.getTemplates();
    const phase = context.state.phase;
    const intent = context.analysis.intent;
    
    // Selecionar template apropriado
    let template = templates[phase]?.[intent] || templates[phase]?.default || templates.default;
    
    // Substituir variáveis
    template = this.replaceVariables(template, context);
    
    return {
      message: template,
      type: 'TEMPLATE',
      phase
    };
  }

  /**
   * RESPOSTA COM LLM (GPT-4)
   */
  async generateLLMResponse(context) {
    // 🎯 **CRITICAL**: Aplicar prompt forçado do Sales Flow Enforcer
    const baseSystemPrompt = `
    Você é ORBION, especialista em vendas consultivas da Digital Boost.

    CONTEXTO:
    - Cliente: ${context.profile.name || 'Cliente'}
    - Empresa: ${context.profile.company || 'Não informada'}
    - Fase atual: ${context.state.phase}
    - Mensagens trocadas: ${context.state.messageCount}
    - Sentimento detectado: ${context.analysis.sentiment}

    PERSONALIDADE:
    - Consultivo e profissional
    - Empático mas objetivo
    - Focado em entender a necessidade antes de vender
    - Usa linguagem simples e clara

    OBJETIVOS POR FASE:
    ${this.getPhaseObjective(context.state.phase)}

    INSTRUÇÕES:
    1. Responda de forma natural e contextualizada
    2. Seja breve (máximo 3-4 linhas)
    3. Faça apenas UMA pergunta por vez
    4. Demonstre que entendeu a necessidade do cliente
    5. Guie naturalmente para o agendamento quando apropriado
    `;

    const baseUserPrompt = `
    Mensagem do cliente: "${context.text}"

    ${context.analysis.hasObjection ? 'ATENÇÃO: Cliente tem objeção, trate com cuidado.' : ''}
    ${context.analysis.sentiment < -0.3 ? 'ATENÇÃO: Cliente parece frustrado ou insatisfeito.' : ''}

    Responda de forma apropriada, considerando o contexto e objetivos.
    `;

    // 🎯 **ENFORCEMENT OBRIGATÓRIO**: Usar prompt forçado se necessário
    const finalPrompt = salesFlowEnforcer.generateEnforcedPrompt(context, baseUserPrompt);

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: baseSystemPrompt },
          { role: 'user', content: finalPrompt }
        ],
        temperature: 0.7,
        max_tokens: 200
      });

      return {
        message: response.choices[0].message.content,
        type: 'LLM',
        phase: context.state.phase
      };
    } catch (error) {
      console.error('Erro ao chamar LLM:', error);
      // Fallback para template
      return this.generateTemplateResponse(context);
    }
  }

  /**
   * RESPOSTA HÍBRIDA (Template + LLM)
   * Combina estrutura do template com personalização da LLM
   */
  async generateHybridResponse(context) {
    // 1. Buscar template base
    const templateResponse = await this.generateTemplateResponse(context);
    
    // 2. Enriquecer com LLM
    const enrichPrompt = `
    Como ORBION, você deve personalizar esta mensagem template mantendo sua estrutura e objetivo:
    
    TEMPLATE BASE:
    "${templateResponse.message}"
    
    CONTEXTO DO CLIENTE:
    - Nome: ${context.profile.name}
    - Última mensagem: "${context.text}"
    - Sentimento: ${context.analysis.sentiment}
    - Segmento: ${context.analysis.segment}
    
    INSTRUÇÕES:
    1. Mantenha a essência e objetivo do template
    2. Adicione personalização baseada na mensagem do cliente
    3. Torne mais natural e contextualizada
    4. Mantenha o tamanho similar (máximo 20% maior)
    5. Se o cliente fez uma pergunta, responda antes de seguir o fluxo
    
    Gere a versão personalizada:
    `;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'user', content: enrichPrompt }
        ],
        temperature: 0.6,
        max_tokens: 250
      });

      return {
        message: response.choices[0].message.content,
        type: 'HYBRID',
        phase: context.state.phase,
        baseTemplate: templateResponse.message
      };
    } catch (error) {
      console.error('Erro no modo híbrido, usando template:', error);
      return templateResponse;
    }
  }

  /**
   * RESPOSTA DO STRUCTURED FLOW
   */
  async generateStructuredFlowResponse(context) {
    try {
      // Importar dinamicamente o sistema de fluxo estruturado
      const { processMessageUltraFast } = await import('./tools/structured_flow_integration.js');

      console.log('📊 Processando com Structured Flow System...');

      const result = await processMessageUltraFast(
        context.from,
        context.text,
        context.profile
      );

      if (result.structured_flow?.message_sent) {
        return {
          message: result.structured_flow.message_sent,
          type: 'STRUCTURED_FLOW',
          phase: result.structured_flow.current_phase,
          progress: result.structured_flow.flow_progress?.percentage,
          metadata: {
            segmentDetected: result.analysis?.segment_detected,
            leadEnriched: result.analysis?.lead_enriched,
            nextAction: result.system_metadata?.next_action
          },
          success: true
        };
      }

      throw new Error('Structured flow não retornou mensagem válida');

    } catch (error) {
      console.error('❌ Erro no structured flow:', error);
      // Fallback para template antigo
      return await this.generateTemplateResponse(context);
    }
  }

  /**
   * RESPOSTA COM ARQUÉTIPOS SANITIZADOS (SEM EMOÇÃO)
   */
  async generateSanitizedArchetypeResponse(context) {
    try {
      // Usar template existente mas sanitizado
      const templateResponse = await this.generateTemplateResponse(context);

      // Aplicar filtro anti-emocional
      const sanitizedMessage = this.sanitizeEmotionalLanguage(templateResponse.message);

      return {
        message: sanitizedMessage,
        type: 'ARCHETYPE',
        phase: templateResponse.phase,
        success: true
      };

    } catch (error) {
      console.error('❌ Erro nos arquétipos:', error);
      return {
        message: "Obrigado pelo contato! Como posso ajudar você com soluções de automação para seu negócio?",
        type: 'FALLBACK',
        success: true
      };
    }
  }

  /**
   * RESPOSTA HÍBRIDA CALIBRADA
   */
  async generateCalibratedHybridResponse(context) {
    try {
      console.log('🔀 Processando com Hybrid Calibrado...');

      // 1. Tentar structured flow primeiro
      const structuredResult = await this.generateStructuredFlowResponse(context);

      if (structuredResult.success) {
        return structuredResult; // Structured flow funcionou, usar ele
      }

      // 2. Fallback para arquétipo sanitizado
      return await this.generateSanitizedArchetypeResponse(context);

    } catch (error) {
      console.error('❌ Erro no híbrido:', error);
      return await this.generateSanitizedArchetypeResponse(context);
    }
  }

  /**
   * LLM GUIADA (APENAS CASOS EXTREMOS)
   */
  async generateGuidedLLMResponse(context) {
    const systemPrompt = `
Você é ORBION, assistente comercial profissional da Digital Boost.

REGRAS OBRIGATÓRIAS:
1. Use linguagem profissional e objetiva
2. NUNCA use palavras emocionais: paixão, amo, sinto, coração, carinho
3. Foque em resultados concretos e dados
4. Mantenha tom consultivo mas direto
5. Sempre guie para soluções comerciais

CONTEXTO:
- Cliente: ${context.profile.name || 'Cliente'}
- Segmento: ${context.analysis.segment || 'indefinido'}
- Fase: ${context.state.phase || 'inicial'}

OBJETIVO: Responder de forma profissional e orientada a vendas.
`;

    const userPrompt = `
Mensagem: "${context.text}"

${context.analysis.sentiment < -0.5 ? 'ATENÇÃO: Cliente demonstra frustração.' : ''}
${context.analysis.hasObjection ? 'ATENÇÃO: Cliente tem objeção a tratar.' : ''}

Responda profissionalmente, sem emotividade, focando em soluções.
`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3, // Baixa criatividade
        max_tokens: 150   // Respostas concisas
      });

      let message = response.choices[0].message.content;

      // Sanitizar resposta
      message = this.sanitizeEmotionalLanguage(message);

      return {
        message: message,
        type: 'GUIDED_LLM',
        phase: context.state.phase,
        success: true
      };

    } catch (error) {
      console.error('❌ Erro LLM guiada:', error);
      // Fallback para structured flow
      return await this.generateStructuredFlowResponse(context);
    }
  }

  /**
   * Analisar mensagem do cliente
   */
  async analyzeMessage(text, profile, state) {
    const analysis = {
      intent: this.detectIntent(text),
      sentiment: this.analyzeSentiment(text),
      hasQuestion: this.hasQuestion(text),
      hasObjection: this.hasObjection(text),
      wantsToSchedule: this.wantsToSchedule(text),
      segment: this.detectSegment(profile, text),
      topics: this.extractTopics(text)
    };

    return analysis;
  }

  /**
   * Detectar intenção da mensagem
   */
  detectIntent(text) {
    const lower = text.toLowerCase();
    
    if (this.isGreeting(lower)) return 'GREETING';
    if (this.isOptOut(lower)) return 'OPT_OUT';
    if (this.wantsToSchedule(lower)) return 'SCHEDULE';
    if (this.hasObjection(lower)) return 'OBJECTION';
    if (this.hasQuestion(lower)) return 'QUESTION';
    if (this.isPositiveResponse(lower)) return 'POSITIVE';
    if (this.isNegativeResponse(lower)) return 'NEGATIVE';
    
    return 'NEUTRAL';
  }

  /**
   * Analisar sentimento (simplificado)
   */
  analyzeSentiment(text) {
    const lower = text.toLowerCase();
    let score = 0;

    // Palavras positivas
    const positive = ['sim', 'ótimo', 'legal', 'interessante', 'quero', 'gostaria', 'bacana', 'top'];
    positive.forEach(word => {
      if (lower.includes(word)) score += 0.3;
    });

    // Palavras negativas  
    const negative = ['não', 'ruim', 'péssimo', 'caro', 'difícil', 'problema', 'nunca', 'jamais'];
    negative.forEach(word => {
      if (lower.includes(word)) score -= 0.3;
    });

    return Math.max(-1, Math.min(1, score));
  }

  /**
   * Templates organizados por fase e intenção
   */
  getTemplates() {
    return {
      FIRST_CONTACT: {
        default: "Olá {{nome}}! 👋 Sou ORBION, especialista em vendas da Digital Boost. Vi que você tem interesse em melhorar seus resultados comerciais. Posso fazer uma pergunta rápida: qual seu maior desafio no atendimento ao cliente hoje?",
        
        GREETING: "Oi {{nome}}! 😊 Sou ORBION da Digital Boost. Ajudo empresas a venderem mais através do WhatsApp. Qual é o seu principal desafio com vendas hoje?",
        
        QUESTION: "Ótima pergunta, {{nome}}! Antes de responder, me conta: você já usa WhatsApp para vendas na sua empresa?"
      },

      DISCOVERY: {
        default: "Entendi, {{nome}}. E me conta: quantos atendimentos vocês fazem por dia em média? E quanto tempo leva cada um?",
        
        POSITIVE: "Que legal! E como vocês lidam com os clientes quando a equipe não está disponível? Perdem muitas vendas por demora na resposta?",
        
        NEGATIVE: "Entendo perfeitamente. Muitos clientes nossos começaram assim. Qual seria o cenário ideal de atendimento para você?"
      },

      QUALIFICATION: {
        default: "{{nome}}, baseado no que você me contou, vejo que podemos ajudar. Vocês têm meta de crescimento para os próximos meses?",
        
        high_intent: "Perfeito! Você é a pessoa que decide sobre melhorias no atendimento ou precisamos envolver mais alguém?",
        
        low_intent: "Compreendo. E se você pudesse resolver apenas UM problema do seu atendimento hoje, qual seria?"
      },

      SOLUTION_FIT: {
        default: "Excelente, {{nome}}! Nossos clientes do segmento {{segmento}} conseguem aumentar vendas em 40% automatizando o WhatsApp. Você teria 15 minutos essa semana para eu te mostrar como funciona na prática?",
        
        OBJECTION: "Entendo sua preocupação, {{nome}}. Por isso oferecemos garantia de 30 dias. Se não trouxer resultado, devolvemos 100%. Que tal testarmos?",
        
        high_interest: "Maravilha! Posso te mostrar casos reais de sucesso aqui de Natal. Quando seria melhor para você: amanhã ou quinta?"
      },

      SCHEDULING: {
        default: "Perfeito! Temos horários amanhã às 10h ou 15h, ou quinta às 14h ou 16h. Qual fica melhor para você?",
        
        POSITIVE: "Excelente escolha! Vou te enviar o link da reunião e um lembrete no dia. Pode confirmar seu melhor e-mail?",
        
        reschedule: "Sem problemas! Que tal na próxima semana? Segunda ou terça, qual prefere?"
      },

      OBJECTION_HANDLING: {
        price: "Entendo sua preocupação com investimento. Mas pense: quantas vendas você perde por mês por demora no atendimento? Nossos clientes recuperam o investimento na primeira semana.",
        
        time: "Justamente por não ter tempo que você precisa disso! Automatizar o atendimento libera 20 horas semanais da sua equipe. Vale a pena 15 minutos para recuperar 20 horas?",
        
        trust: "Compreendo perfeitamente. Por isso trabalhamos com garantia e você pode cancelar quando quiser. Que tal começarmos com um teste gratuito de 7 dias?"
      },

      default: "Olá! Como posso ajudar você a vender mais hoje? 😊"
    };
  }

  /**
   * Substituir variáveis no template
   */
  replaceVariables(template, context) {
    const vars = {
      '{{nome}}': context.profile.name || 'amigo(a)',
      '{{empresa}}': context.profile.company || 'sua empresa',
      '{{segmento}}': context.analysis.segment || 'seu segmento',
      '{{cidade}}': 'Natal',
      '{{dia}}': this.getWeekday(),
      '{{periodo}}': this.getPeriod()
    };

    let result = template;
    for (const [key, value] of Object.entries(vars)) {
      result = result.replace(new RegExp(key, 'g'), value);
    }

    return result;
  }

  /**
   * Estado da conversa
   */
  async getConversationState(from) {
    const stateKey = `conversation_state_${from}`;
    const saved = await getMemory(stateKey);
    
    if (saved) {
      return saved;
    }

    // Estado inicial
    return {
      contactId: from,
      phase: 'FIRST_CONTACT',
      isFirstContact: true,
      messageCount: 0,
      startedAt: Date.now(),
      lastMessageAt: null,
      qualificationScore: 0,
      segment: null,
      hasScheduled: false,
      hasOptedOut: false,
      metadata: {}
    };
  }

  /**
   * Atualizar estado da conversa
   */
  async updateConversationState(context, response) {
    const newState = {
      ...context.state,
      phase: this.determineNextPhase(context, response),
      isFirstContact: false,
      messageCount: context.state.messageCount + 1,
      lastMessageAt: Date.now(),
      segment: context.analysis.segment || context.state.segment
    };

    // Atualizar qualificação
    if (context.analysis.intent === 'POSITIVE') {
      newState.qualificationScore = Math.min(100, newState.qualificationScore + 20);
    }

    // Marcar agendamento
    if (response.phase === 'SCHEDULING' && context.analysis.intent === 'POSITIVE') {
      newState.hasScheduled = true;
    }

    const stateKey = `conversation_state_${context.from}`;
    await setMemory(stateKey, newState);

    return newState;
  }

  /**
   * Determinar próxima fase baseada no contexto
   */
  determineNextPhase(context, response) {
    const currentPhase = context.state.phase;
    const intent = context.analysis.intent;

    // Regras de transição
    const transitions = {
      'FIRST_CONTACT': {
        'POSITIVE': 'DISCOVERY',
        'QUESTION': 'DISCOVERY',
        'NEGATIVE': 'OBJECTION_HANDLING',
        'NEUTRAL': 'DISCOVERY'
      },
      'DISCOVERY': {
        'POSITIVE': 'QUALIFICATION',
        'NEGATIVE': 'OBJECTION_HANDLING',
        'NEUTRAL': 'QUALIFICATION'
      },
      'QUALIFICATION': {
        'POSITIVE': 'SOLUTION_FIT',
        'NEGATIVE': 'OBJECTION_HANDLING',
        'SCHEDULE': 'SCHEDULING'
      },
      'SOLUTION_FIT': {
        'POSITIVE': 'SCHEDULING',
        'NEGATIVE': 'OBJECTION_HANDLING',
        'SCHEDULE': 'SCHEDULING'
      },
      'SCHEDULING': {
        'POSITIVE': 'COMPLETED',
        'NEGATIVE': 'SOLUTION_FIT'
      },
      'OBJECTION_HANDLING': {
        'POSITIVE': 'QUALIFICATION',
        'NEGATIVE': 'COMPLETED'
      }
    };

    return transitions[currentPhase]?.[intent] || currentPhase;
  }

  /**
   * Helpers para detecção de padrões
   */
  isGreeting(text) {
    const greetings = ['oi', 'olá', 'ola', 'bom dia', 'boa tarde', 'boa noite', 'hey', 'opa'];
    return greetings.some(g => text.toLowerCase().startsWith(g));
  }

  isOptOut(text) {
    const optouts = ['sair', 'parar', 'stop', 'cancelar', 'remover', 'não tenho interesse'];
    return optouts.some(o => text.toLowerCase().includes(o));
  }

  hasQuestion(text) {
    return text.includes('?') || 
           text.toLowerCase().includes('como') ||
           text.toLowerCase().includes('quanto') ||
           text.toLowerCase().includes('quando') ||
           text.toLowerCase().includes('qual');
  }

  hasObjection(text) {
    const objections = ['caro', 'não preciso', 'não quero', 'já tenho', 'sem tempo', 'sem dinheiro'];
    return objections.some(o => text.toLowerCase().includes(o));
  }

  hasPartialObjection(text) {
    const partials = ['talvez', 'não sei', 'vou pensar', 'depois', 'quem sabe'];
    return partials.some(p => text.toLowerCase().includes(p));
  }

  wantsToSchedule(text) {
    const scheduling = ['agendar', 'reunião', 'marcar', 'conversar', 'demonstração', 'apresentação'];
    return scheduling.some(s => text.toLowerCase().includes(s));
  }

  isPositiveResponse(text) {
    const positive = ['sim', 'claro', 'pode', 'quero', 'vamos', 'beleza', 'fechado', 'aceito', 'ok', 'certo', 'perfeito', 'ótimo', 'legal', 'interessante', 'gostaria', 'concordo', 'tudo bem', 'show', 'bacana', 'adoraria', 'seria bom', 'me interessa'];
    return positive.some(p => text.toLowerCase().includes(p));
  }

  isNegativeResponse(text) {
    const negative = ['não', 'nao', 'nunca', 'jamais', 'negativo', 'nope'];
    return negative.some(n => text.toLowerCase().includes(n));
  }

  hasComplexQuestion(text) {
    const complex = ['como funciona', 'pode explicar', 'qual a diferença', 'por que', 'comparado'];
    return complex.some(c => text.toLowerCase().includes(c));
  }

  hasSpecificContext(text) {
    // Detecta quando o cliente menciona algo específico do negócio
    const specific = ['minha empresa', 'meu negócio', 'nosso caso', 'específico', 'particular'];
    return specific.some(s => text.toLowerCase().includes(s));
  }

  needsEmpathy(context) {
    return context.analysis.sentiment < -0.3 ||
           context.text.toLowerCase().includes('frustrado') ||
           context.text.toLowerCase().includes('problema') ||
           context.text.toLowerCase().includes('difícil');
  }

  isSchedulingConfirmation(text) {
    return text.toLowerCase().includes('confirmo') ||
           text.toLowerCase().includes('pode ser') ||
           text.toLowerCase().includes('horário');
  }

  /**
   * Detectar segmento do cliente
   */
  detectSegment(profile, text) {
    const combined = `${profile?.name || ''} ${profile?.status || ''} ${text}`.toLowerCase();
    
    const segments = {
      'dentista': ['dentista', 'odonto', 'consultório', 'dental'],
      'nutricionista': ['nutri', 'nutrição', 'dieta', 'alimentação'],
      'personal': ['personal', 'treino', 'academia', 'fitness'],
      'advogado': ['advogado', 'advocacia', 'jurídico', 'escritório'],
      'restaurante': ['restaurante', 'comida', 'delivery', 'pedidos'],
      'loja': ['loja', 'vendo', 'produtos', 'varejo'],
      'clinica': ['clínica', 'saúde', 'médico', 'consulta']
    };

    for (const [segment, keywords] of Object.entries(segments)) {
      if (keywords.some(k => combined.includes(k))) {
        return segment;
      }
    }

    return 'geral';
  }

  /**
   * Extrair tópicos da mensagem
   */
  extractTopics(text) {
    const topics = [];
    const lower = text.toLowerCase();

    if (lower.includes('whatsapp')) topics.push('whatsapp');
    if (lower.includes('atendimento')) topics.push('atendimento');
    if (lower.includes('vendas') || lower.includes('vender')) topics.push('vendas');
    if (lower.includes('cliente')) topics.push('cliente');
    if (lower.includes('automatizar') || lower.includes('automação')) topics.push('automacao');

    return topics;
  }

  /**
   * Obter objetivo da fase atual
   */
  getPhaseObjective(phase) {
    const objectives = {
      'FIRST_CONTACT': 'Apresentar-se e identificar dor principal',
      'DISCOVERY': 'Entender processo atual e identificar problemas',
      'QUALIFICATION': 'Qualificar orçamento e decisão',
      'SOLUTION_FIT': 'Demonstrar valor e criar urgência',
      'SCHEDULING': 'Agendar reunião ou demonstração',
      'OBJECTION_HANDLING': 'Resolver objeções e recuperar interesse',
      'COMPLETED': 'Confirmar próximos passos'
    };

    return objectives[phase] || objectives['FIRST_CONTACT'];
  }

  /**
   * Histórico recente de mensagens
   */
  async getRecentHistory(from, limit = 5) {
    const historyKey = `message_history_${from}`;
    const history = await getMemory(historyKey) || [];
    return history.slice(-limit);
  }

  /**
   * Explicar decisão da estratégia
   */
  explainDecision(strategy, context) {
    const explanations = {
      'TEMPLATE': `Usando template porque: fase estruturada (${context.state.phase}), resposta previsível`,
      'LLM': `Usando LLM porque: necessita compreensão profunda, contexto específico do cliente`,
      'HYBRID': `Usando híbrido porque: combina estrutura com personalização, fase ${context.state.phase}`
    };

    return explanations[strategy] || 'Estratégia padrão';
  }

  /**
   * Tratar erros
   */
  handleError(error, from, processingId) {
    const errorResponse = {
      success: false,
      response: "Ops! Tive um problema técnico. Pode repetir sua mensagem?",
      error: error.message,
      processingId,
      fallback: true
    };

    // Log do erro
    console.error(`[${processingId}] Erro detalhado:`, {
      from,
      error: error.message,
      stack: error.stack
    });

    return errorResponse;
  }

  /**
   * Helpers de data/hora
   */
  getWeekday() {
    const days = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
    return days[new Date().getDay()];
  }

  getPeriod() {
    const hour = new Date().getHours();
    if (hour < 12) return 'manhã';
    if (hour < 18) return 'tarde';
    return 'noite';
  }

  /**
   * Gerar ID único
   */
  generateId() {
    return `msg_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
  }

  /**
   * MÉTODOS DE DETECÇÃO CALIBRADOS
   */
  isCommercialContext(context) {
    const commercialKeywords = [
      'preço', 'valor', 'custo', 'orçamento', 'investimento',
      'demonstração', 'demo', 'reunião', 'apresentação',
      'proposta', 'contrato', 'vendas', 'negócio', 'serviço',
      'solução', 'automação', 'sistema', 'plataforma'
    ];

    const text = context.text.toLowerCase();
    const profile = (context.profile?.status || '').toLowerCase();

    return commercialKeywords.some(keyword =>
      text.includes(keyword) || profile.includes(keyword)
    );
  }

  isSalesQuestion(text) {
    const salesQuestions = [
      'quanto custa', 'qual o preço', 'valor do', 'como funciona',
      'quero saber mais', 'me interessei', 'demonstração',
      'reunião', 'conversar', 'apresentar', 'proposta'
    ];

    const textLower = text.toLowerCase();
    return salesQuestions.some(q => textLower.includes(q));
  }

  hasCommercialIntent(text) {
    const intentKeywords = [
      'interessado', 'quero', 'preciso', 'gostaria',
      'como posso', 'ajuda', 'solução', 'resolver',
      'melhorar', 'automatizar', 'otimizar'
    ];

    const textLower = text.toLowerCase();
    return intentKeywords.some(keyword => textLower.includes(keyword));
  }

  isInSalesFunnel(phase) {
    const salesPhases = [
      'identification', 'business_discovery', 'solution_presentation',
      'scheduling', 'FIRST_CONTACT', 'DISCOVERY', 'QUALIFICATION',
      'SOLUTION_FIT', 'SCHEDULING'
    ];

    return salesPhases.includes(phase);
  }

  isProfessionalProfile(profile) {
    const professionalIndicators = [
      'dr.', 'dra.', 'doutor', 'doutora', 'médico', 'dentista',
      'advogado', 'engenheiro', 'nutricionista', 'personal',
      'consultor', 'empresário', 'diretor', 'gerente',
      'especialista', 'profissional'
    ];

    const profileText = (profile?.name + ' ' + profile?.status).toLowerCase();
    return professionalIndicators.some(indicator =>
      profileText.includes(indicator)
    );
  }

  isOptOut(text) {
    const optOutKeywords = ['parar', 'pare', 'stop', 'sair', 'remover'];
    const textLower = text.toLowerCase();
    return optOutKeywords.some(keyword => textLower.includes(keyword));
  }

  isSchedulingConfirmation(text) {
    const confirmationKeywords = ['confirmo', 'ok para', 'aceito', 'pode ser'];
    const textLower = text.toLowerCase();
    return confirmationKeywords.some(keyword => textLower.includes(keyword));
  }

  needsExtremateEmpathy(context) {
    const extremeEmotionalKeywords = [
      'desespero', 'frustrado', 'decepcionado', 'impossível',
      'desistir', 'não aguento', 'péssimo', 'terrível'
    ];

    const textLower = context.text.toLowerCase();
    return extremeEmotionalKeywords.some(keyword =>
      textLower.includes(keyword)
    );
  }

  isCompletelyUnknown(text) {
    return text.length < 5 || /^[^\w\s]+$/.test(text);
  }

  /**
   * SANITIZAÇÃO ANTI-EMOCIONAL
   */
  sanitizeEmotionalLanguage(message) {
    const emotionalReplacements = {
      'paixão': 'dedicação',
      'amo': 'valorizo',
      'sinto': 'observo',
      'coração': 'foco',
      'carinho': 'atenção',
      'querido': 'estimado',
      'amado': 'valorizado',
      'sinta': 'observe',
      'emociona': 'motiva',
      'apaixonado': 'dedicado'
    };

    let sanitized = message;
    Object.entries(emotionalReplacements).forEach(([emotional, professional]) => {
      const regex = new RegExp(emotional, 'gi');
      sanitized = sanitized.replace(regex, professional);
    });

    return sanitized;
  }

  explainCalibratedDecision(strategy, context, scores) {
    const explanations = {
      'STRUCTURED_FLOW': `Structured Flow: contexto comercial (${this.isCommercialContext(context)}), primeiro contato (${context.state.isFirstContact})`,
      'ARCHETYPE': `Arquétipo: segmento identificado (${context.analysis.segment}), perfil profissional`,
      'HYBRID': `Híbrido: objeção detectada ou caso complexo`,
      'LLM': `LLM guiada: caso extremo, sentiment ${context.analysis.sentiment}`
    };

    return explanations[strategy] || `Estratégia ${strategy}`;
  }
}

// ============================
// EXPORTAÇÃO E INICIALIZAÇÃO
// ============================

// Instância única (Singleton)
const orbionAgent = new OrbionHybridAgent();

// Função principal exportada
export async function processMessage(from, text, profile) {
  return orbionAgent.processMessage(from, text, profile);
}

// Exportar classe para testes
export { OrbionHybridAgent };

// Exportação default
export default orbionAgent;

console.log('✅ ORBION Hybrid Agent carregado e pronto!');
console.log('📊 Estratégias disponíveis: TEMPLATE | LLM | HYBRID');
console.log('🎯 Modo padrão: HYBRID (melhor dos dois mundos)');

// tools/urgency_detector.js
// 🚨 MELHORIA #3: Detector de Urgência e Timing Perfeito

/**
 * 🚨 DETECTOR DE URGÊNCIA - MELHORIA #3
 *
 * Identifica sinais de urgência e timing perfeito para fechamento:
 * 🔥 Lead está pronto para comprar AGORA
 * ⚡ Janela de oportunidade aberta
 * 💰 Momento crítico para conversão
 */

class UrgencyDetector {
  constructor() {
    // 🔥 SINAIS DE URGÊNCIA ALTA
    this.urgencySignals = {
      // Urgência temporal explícita
      immediate: {
        keywords: [
          'agora', 'já', 'hoje', 'imediato', 'urgente',
          'rápido', 'quanto antes', 'logo', 'preciso resolver',
          'está acontecendo', 'nesse momento', 'neste momento'
        ],
        weight: 100,
        action: 'fechar_imediatamente'
      },

      // Urgência de curto prazo
      shortTerm: {
        keywords: [
          'amanhã', 'essa semana', 'próximos dias', 'segunda-feira',
          'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira',
          'fim de semana', 'até', 'antes de', 'prazo'
        ],
        weight: 80,
        action: 'agendar_urgente'
      },

      // Dor/problema crítico
      criticalPain: {
        keywords: [
          'perdendo', 'perdi', 'prejuízo', 'crise', 'crítico',
          'não aguenta', 'insustentável', 'caos', 'desespero',
          'parando', 'travado', 'não funciona', 'quebrou'
        ],
        weight: 90,
        action: 'resolver_emergencia'
      },

      // Orçamento/decisão pronta
      readyToBuy: {
        keywords: [
          'quanto custa', 'qual o preço', 'valor', 'investimento',
          'orçamento aprovado', 'posso pagar', 'fechar',
          'contratar', 'começar', 'quando começa', 'pode ser'
        ],
        weight: 95,
        action: 'apresentar_proposta'
      },

      // Competição/alternativas
      competitive: {
        keywords: [
          'outra empresa', 'concorrente', 'alternativa', 'comparando',
          'outras opções', 'decidindo entre', 'proposta de',
          'melhor que', 'diferencial', 'por que vocês'
        ],
        weight: 85,
        action: 'diferenciar_urgente'
      },

      // Evento/deadline externo
      externalDeadline: {
        keywords: [
          'lançamento', 'evento', 'campanha', 'inauguração',
          'temporada', 'prazo final', 'vencimento', 'data limite',
          'precisa estar pronto', 'antes do'
        ],
        weight: 75,
        action: 'alinhar_deadline'
      }
    };

    // ⚡ SINAIS DE MOMENTUM POSITIVO
    this.momentumSignals = {
      // Engajamento crescente
      highEngagement: [
        'interessante', 'gostei', 'faz sentido', 'legal',
        'perfeito', 'exatamente', 'é isso mesmo', 'concordo'
      ],

      // Perguntas de aprofundamento
      deepening: [
        'como funciona', 'pode explicar', 'quero entender',
        'me fale mais', 'detalhe', 'exemplo', 'caso'
      ],

      // Sinais de fechamento
      closing: [
        'próximo passo', 'como fazemos', 'o que preciso',
        'vamos', 'bora', 'pode ser', 'aceito', 'topei'
      ]
    };

    // 🚫 SINAIS DE BLOQUEIO (urgência negativa)
    this.blockingSignals = {
      delay: [
        'depois', 'mais tarde', 'mês que vem', 'ano que vem',
        'ainda não', 'não agora', 'futuramente', 'quando puder'
      ],
      uncertainty: [
        'não sei', 'talvez', 'vou pensar', 'preciso decidir',
        'vou avaliar', 'não tenho certeza'
      ]
    };

    console.log('🚨 [URGENCY-DETECTOR] Sistema de detecção de urgência inicializado');
  }

  /**
   * 🚨 ANÁLISE COMPLETA DE URGÊNCIA
   * @param {string} message - Mensagem do lead
   * @param {Object} context - Contexto da conversa
   * @returns {Object} Análise de urgência com score e ações
   */
  detectUrgency(message, context = {}) {
    const startTime = Date.now();

    const lowerMessage = message.toLowerCase();

    // Detectar cada tipo de urgência
    const urgencyMatches = this.analyzeUrgencySignals(lowerMessage);
    const momentumCheck = this.analyzeMomentum(lowerMessage);
    const blockingCheck = this.analyzeBlockingSignals(lowerMessage);
    const contextualUrgency = this.analyzeContextualUrgency(context);

    // Calcular score final de urgência (0-100)
    const urgencyScore = this.calculateUrgencyScore({
      urgencyMatches,
      momentumCheck,
      blockingCheck,
      contextualUrgency
    });

    // Classificar nível de urgência
    const urgencyLevel = this.classifyUrgencyLevel(urgencyScore);

    // Determinar ação recomendada
    const recommendedAction = this.determineRecommendedAction(
      urgencyMatches,
      urgencyLevel,
      context
    );

    // Gerar instruções específicas
    const instructions = this.generateUrgencyInstructions(
      urgencyLevel,
      recommendedAction,
      urgencyMatches
    );

    const result = {
      hasUrgency: urgencyScore >= 60,
      urgencyScore,
      urgencyLevel,
      recommendedAction,
      instructions,
      signals: {
        urgency: urgencyMatches,
        momentum: momentumCheck,
        blocking: blockingCheck
      },
      contextAnalysis: contextualUrgency,
      detectionTime: Date.now() - startTime,
      timestamp: Date.now()
    };

    if (result.hasUrgency) {
      console.log(`🚨 [URGENCY] DETECTADO! Score: ${urgencyScore}/100 | Nível: ${urgencyLevel} | Ação: ${recommendedAction}`);
    }

    return result;
  }

  /**
   * 🔍 Analisa sinais de urgência na mensagem
   */
  analyzeUrgencySignals(message) {
    const matches = [];
    let totalWeight = 0;

    for (const [signalType, signalConfig] of Object.entries(this.urgencySignals)) {
      const foundKeywords = signalConfig.keywords.filter(keyword =>
        message.includes(keyword)
      );

      if (foundKeywords.length > 0) {
        matches.push({
          type: signalType,
          keywords: foundKeywords,
          weight: signalConfig.weight,
          action: signalConfig.action,
          count: foundKeywords.length
        });

        totalWeight += signalConfig.weight;
      }
    }

    return {
      matches,
      totalWeight,
      count: matches.length
    };
  }

  /**
   * ⚡ Analisa momentum da conversa
   */
  analyzeMomentum(message) {
    let momentumScore = 0;
    const foundSignals = [];

    for (const [momentumType, keywords] of Object.entries(this.momentumSignals)) {
      const matches = keywords.filter(keyword => message.includes(keyword));

      if (matches.length > 0) {
        momentumScore += matches.length * 15;
        foundSignals.push({
          type: momentumType,
          keywords: matches
        });
      }
    }

    return {
      score: Math.min(100, momentumScore),
      signals: foundSignals,
      hasMomentum: momentumScore > 30
    };
  }

  /**
   * 🚫 Analisa sinais de bloqueio
   */
  analyzeBlockingSignals(message) {
    let blockingScore = 0;
    const foundBlocks = [];

    for (const [blockType, keywords] of Object.entries(this.blockingSignals)) {
      const matches = keywords.filter(keyword => message.includes(keyword));

      if (matches.length > 0) {
        blockingScore += matches.length * 20;
        foundBlocks.push({
          type: blockType,
          keywords: matches
        });
      }
    }

    return {
      score: Math.min(100, blockingScore),
      blocks: foundBlocks,
      hasBlocking: blockingScore > 30
    };
  }

  /**
   * 📊 Analisa urgência contextual (histórico)
   */
  analyzeContextualUrgency(context) {
    let contextScore = 0;
    const factors = [];

    // Fator 1: Mensagens rápidas (engajamento alto)
    if (context.responseSpeed && context.responseSpeed === 'fast') {
      contextScore += 20;
      factors.push('resposta_rapida');
    }

    // Fator 2: Múltiplas perguntas sobre preço/processo
    if (context.pricingQuestions && context.pricingQuestions > 2) {
      contextScore += 30;
      factors.push('interesse_pricing');
    }

    // Fator 3: Lead score alto
    if (context.leadScore && context.leadScore > 70) {
      contextScore += 25;
      factors.push('lead_qualificado');
    }

    // Fator 4: Jornada avançada
    if (context.currentStage && ['SOLUTION_FIT', 'FAST_TRACK'].includes(context.currentStage)) {
      contextScore += 25;
      factors.push('estagio_avancado');
    }

    return {
      score: contextScore,
      factors,
      hasContextualUrgency: contextScore > 40
    };
  }

  /**
   * 📊 Calcula score final de urgência
   */
  calculateUrgencyScore(data) {
    const {
      urgencyMatches,
      momentumCheck,
      blockingCheck,
      contextualUrgency
    } = data;

    // Peso dos fatores
    let score = 0;

    // Sinais de urgência (40% do peso)
    score += (urgencyMatches.totalWeight / 100) * 40;

    // Momentum (25% do peso)
    score += (momentumCheck.score / 100) * 25;

    // Contexto (20% do peso)
    score += (contextualUrgency.score / 100) * 20;

    // Penalizar por bloqueios (15% do peso)
    score -= (blockingCheck.score / 100) * 15;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * 🏆 Classifica nível de urgência
   */
  classifyUrgencyLevel(score) {
    if (score >= 85) return 'critica';
    if (score >= 70) return 'alta';
    if (score >= 55) return 'media';
    if (score >= 40) return 'baixa';
    return 'nenhuma';
  }

  /**
   * 🎯 Determina ação recomendada
   */
  determineRecommendedAction(urgencyMatches, urgencyLevel, context) {
    // Priorizar ação específica do sinal mais forte
    if (urgencyMatches.matches.length > 0) {
      const strongestSignal = urgencyMatches.matches.reduce((a, b) =>
        a.weight > b.weight ? a : b
      );

      return strongestSignal.action;
    }

    // Fallback baseado no nível
    switch (urgencyLevel) {
      case 'critica':
      case 'alta':
        return 'agendar_urgente';
      case 'media':
        return 'qualificar_timing';
      case 'baixa':
        return 'nutrir_interesse';
      default:
        return 'continuar_qualificacao';
    }
  }

  /**
   * 📋 Gera instruções específicas para o agente
   */
  generateUrgencyInstructions(urgencyLevel, recommendedAction, urgencyMatches) {
    const instructions = {
      urgencyLevel,
      recommendedAction,
      tone: 'consultivo',
      tactics: []
    };

    switch (urgencyLevel) {
      case 'critica':
        instructions.tone = 'proativo_urgente';
        instructions.tactics = [
          'Reconhecer a urgência explicitamente',
          'Oferecer solução imediata',
          'Propor call/reunião HOJE',
          'Criar senso de ação imediata'
        ];
        instructions.maxTokens = 150; // Respostas mais curtas e diretas
        break;

      case 'alta':
        instructions.tone = 'proativo_confiante';
        instructions.tactics = [
          'Validar a necessidade do timing',
          'Mostrar como podemos ajudar rapidamente',
          'Propor próximos passos concretos',
          'Mencionar disponibilidade imediata'
        ];
        instructions.maxTokens = 180;
        break;

      case 'media':
        instructions.tone = 'consultivo_atento';
        instructions.tactics = [
          'Entender melhor o timing',
          'Qualificar a urgência',
          'Apresentar opções flexíveis'
        ];
        instructions.maxTokens = 200;
        break;

      default:
        instructions.tone = 'consultivo_paciente';
        instructions.tactics = [
          'Continuar qualificação',
          'Construir relacionamento',
          'Identificar dores'
        ];
        instructions.maxTokens = 200;
    }

    // Adicionar contexto dos sinais detectados
    if (urgencyMatches.matches.length > 0) {
      instructions.detectedSignals = urgencyMatches.matches.map(m => m.type);
    }

    return instructions;
  }

  /**
   * 🎯 Análise rápida (para performance)
   */
  quickDetect(message) {
    const lowerMessage = message.toLowerCase();

    // Checagem rápida de palavras-chave críticas
    const criticalKeywords = [
      'agora', 'hoje', 'urgente', 'quanto custa',
      'preço', 'contratar', 'fechar', 'começar'
    ];

    const hasCriticalKeyword = criticalKeywords.some(keyword =>
      lowerMessage.includes(keyword)
    );

    return {
      hasUrgency: hasCriticalKeyword,
      shouldRunFullAnalysis: hasCriticalKeyword
    };
  }
}

// Singleton instance
const urgencyDetector = new UrgencyDetector();

export default urgencyDetector;

// Funções de conveniência
export function detectUrgency(message, context = {}) {
  return urgencyDetector.detectUrgency(message, context);
}

export function quickDetectUrgency(message) {
  return urgencyDetector.quickDetect(message);
}

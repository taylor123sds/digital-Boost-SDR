// src/tools/qualification_system.js
// Sistema de Qualificação e Tratamento de Objeções do ORBION

// Sistema independente - não precisa de imports externos

/**
 * Sistema de Qualificação de Leads
 * Avalia o nível de qualificação do lead baseado em múltiplos fatores
 */
export class QualificationSystem {
  constructor() {
    this.qualificationCriteria = {
      // Critérios de orçamento
      budget: {
        keywords: ['orçamento', 'valor', 'preço', 'custo', 'investimento', 'quanto custa', 'dinheiro'],
        negative: ['sem dinheiro', 'muito caro', 'não tenho', 'sem orçamento'],
        weight: 0.25
      },

      // Critérios de autoridade/decisão
      authority: {
        keywords: ['dono', 'proprietário', 'sócio', 'gerente', 'diretor', 'decidir', 'responsável'],
        negative: ['não sou', 'não posso decidir', 'preciso consultar', 'não tenho autoridade'],
        weight: 0.30
      },

      // Critérios de necessidade
      need: {
        keywords: ['problema', 'dificuldade', 'precisando', 'necessito', 'urgente', 'importante'],
        negative: ['não preciso', 'não tenho problema', 'está funcionando bem'],
        weight: 0.25
      },

      // Critérios de timing
      timing: {
        keywords: ['agora', 'urgente', 'rápido', 'logo', 'imediato', 'quanto tempo'],
        negative: ['no futuro', 'talvez', 'pode ser', 'mais tarde', 'não agora'],
        weight: 0.20
      }
    };

    this.objectionTypes = {
      price: ['caro', 'preço', 'valor', 'custo', 'muito dinheiro', 'sem orçamento'],
      timing: ['não agora', 'depois', 'futuro', 'mais tarde', 'sem pressa'],
      authority: ['não decidir', 'consultar', 'sócio', 'chefe', 'autorização'],
      need: ['não preciso', 'funcionando bem', 'satisfeito', 'não tenho problema'],
      trust: ['não conheço', 'primeira vez', 'desconfiança', 'não sei'],
      competition: ['já tenho', 'outra empresa', 'concorrente', 'comparar']
    };
  }

  /**
   * Calcula score de qualificação do lead
   * @param {string} text - Texto da mensagem
   * @param {Array} history - Histórico da conversa
   * @param {Object} context - Contexto adicional
   * @returns {Object} Score e detalhes da qualificação
   */
  calculateQualificationScore(text, history = [], context = {}) {
    const analysis = {
      budget: 0,
      authority: 0,
      need: 0,
      timing: 0,
      total: 0,
      level: 'low',
      factors: []
    };

    const textLower = text.toLowerCase();

    // Analisa cada critério
    for (const [criterion, config] of Object.entries(this.qualificationCriteria)) {
      let score = 0;

      // Pontos positivos
      for (const keyword of config.keywords) {
        if (textLower.includes(keyword)) {
          score += 20;
          analysis.factors.push(`+${criterion}: "${keyword}"`);
        }
      }

      // Pontos negativos
      for (const negative of config.negative) {
        if (textLower.includes(negative)) {
          score -= 15;
          analysis.factors.push(`-${criterion}: "${negative}"`);
        }
      }

      // Limitações
      score = Math.max(0, Math.min(100, score));
      analysis[criterion] = score;
    }

    // Calcula score total ponderado
    analysis.total = Math.round(
      analysis.budget * this.qualificationCriteria.budget.weight +
      analysis.authority * this.qualificationCriteria.authority.weight +
      analysis.need * this.qualificationCriteria.need.weight +
      analysis.timing * this.qualificationCriteria.timing.weight
    );

    // Define nível
    if (analysis.total >= 70) {
      analysis.level = 'high';
    } else if (analysis.total >= 40) {
      analysis.level = 'medium';
    } else {
      analysis.level = 'low';
    }

    // Ajustes baseados no histórico
    if (history.length > 0) {
      analysis.total = this.adjustScoreByHistory(analysis.total, history);
    }

    // Ajustes baseados no contexto
    if (context.isWhatsApp) {
      analysis.total += 5; // WhatsApp indica mais engajamento
    }

    if (context.isBusinessHours) {
      analysis.total += 3; // Horário comercial é positivo
    }

    return analysis;
  }

  /**
   * Ajusta score baseado no histórico de conversas
   */
  adjustScoreByHistory(currentScore, history) {
    let adjustment = 0;

    // Múltiplas mensagens = mais engajamento
    if (history.length > 3) adjustment += 10;
    if (history.length > 7) adjustment += 15;

    // Analisa sentimento geral
    const positiveCount = history.filter(msg =>
      this.isPositiveSentiment(msg.content)
    ).length;

    const positiveRatio = positiveCount / history.length;
    if (positiveRatio > 0.6) adjustment += 10;
    if (positiveRatio < 0.3) adjustment -= 10;

    return Math.max(0, Math.min(100, currentScore + adjustment));
  }

  /**
   * Detecta sentimento positivo em mensagem
   */
  isPositiveSentiment(text) {
    const positive = ['sim', 'ok', 'perfeito', 'ótimo', 'interessante', 'bom', 'legal'];
    const negative = ['não', 'nunca', 'jamais', 'ruim', 'péssimo'];

    const textLower = text.toLowerCase();
    const positiveMatches = positive.filter(word => textLower.includes(word)).length;
    const negativeMatches = negative.filter(word => textLower.includes(word)).length;

    return positiveMatches > negativeMatches;
  }

  /**
   * Identifica objeções no texto
   * @param {string} text - Texto a analisar
   * @returns {Object|null} Tipo de objeção e detalhes
   */
  detectObjection(text) {
    const textLower = text.toLowerCase();

    for (const [type, keywords] of Object.entries(this.objectionTypes)) {
      for (const keyword of keywords) {
        if (textLower.includes(keyword)) {
          return {
            type,
            keyword,
            confidence: this.calculateObjectionConfidence(textLower, keywords)
          };
        }
      }
    }

    return null;
  }

  /**
   * Calcula confiança da detecção de objeção
   */
  calculateObjectionConfidence(text, keywords) {
    const matches = keywords.filter(keyword => text.includes(keyword)).length;
    return Math.min(100, (matches / keywords.length) * 100);
  }
}

/**
 * Instância singleton do sistema de qualificação
 */
const qualificationSystem = new QualificationSystem();

/**
 * Função principal para tratamento de objeções
 * @param {string} text - Texto com possível objeção
 * @param {Object} context - Contexto da conversa
 * @returns {Object} Resultado da análise de objeção
 */
export function detectObjection(text, context = {}) {
  const objection = qualificationSystem.detectObjection(text);

  if (!objection) {
    return {
      hasObjection: false,
      type: null,
      strategy: null
    };
  }

  // Estratégias de resposta por tipo de objeção
  const strategies = {
    price: {
      approach: 'value_focus',
      key_points: ['ROI em 60 dias', 'Custo vs Investimento', 'Casos de sucesso'],
      script: 'Entendo a preocupação com investimento. Nossos clientes veem ROI em 60 dias...'
    },

    timing: {
      approach: 'urgency_creation',
      key_points: ['Custo de oportunidade', 'Concorrência avançando', 'Promoção limitada'],
      script: 'Perfeito, timing é importante. Enquanto você pondera, seus concorrentes estão avançando...'
    },

    authority: {
      approach: 'stakeholder_inclusion',
      key_points: ['Envolver decisor', 'Reunião conjunta', 'Material para apresentação'],
      script: 'Entendo, decisões importantes precisam de alinhamento. Que tal agendar 15min com o decisor?'
    },

    need: {
      approach: 'pain_discovery',
      key_points: ['Descobrir dores ocultas', 'Futuro do negócio', 'Prevenção vs correção'],
      script: 'Entendo que está funcionando. Como você vê o crescimento do negócio nos próximos 12 meses?'
    },

    trust: {
      approach: 'credibility_building',
      key_points: ['Cases locais', 'Referências', 'Garantias'],
      script: 'Compreendo, confiança é fundamental. Temos 50+ clientes em Natal, posso compartilhar cases...'
    },

    competition: {
      approach: 'differentiation',
      key_points: ['Diferenciais únicos', 'Comparação técnica', 'Valor agregado'],
      script: 'Ótimo que você compare! Nossos diferenciais são IA proprietária e suporte local 24/7...'
    }
  };

  return {
    hasObjection: true,
    objection: objection.keyword,
    type: objection.type,
    confidence: objection.confidence,
    strategy: strategies[objection.type],
    recommendation: `Objeção de ${objection.type} detectada. Usar estratégia ${strategies[objection.type]?.approach}`
  };
}

/**
 * Calcula métricas para decisão entre fluxo vs LLM
 * @param {string} text - Texto da mensagem
 * @param {Array} history - Histórico
 * @param {Object} context - Contexto
 * @returns {Object} Métricas de decisão
 */
export function calculateDecisionMetrics(text, history = [], context = {}) {
  const qualification = qualificationSystem.calculateQualificationScore(text, history, context);
  const objection = handleObjection(text, context);

  // Fatores que favorecem fluxo estruturado
  const structuredFlowScore = calculateStructuredFlowScore(text, qualification, context);

  // Fatores que favorecem LLM
  const llmScore = calculateLLMScore(text, objection, context);

  // Fatores que favorecem híbrido
  const hybridScore = calculateHybridScore(structuredFlowScore, llmScore, context);

  return {
    qualification,
    objection,
    scores: {
      structured_flow: structuredFlowScore,
      llm: llmScore,
      hybrid: hybridScore
    },
    recommendation: getRecommendation(structuredFlowScore, llmScore, hybridScore),
    reasoning: generateReasoning(structuredFlowScore, llmScore, hybridScore, qualification, objection)
  };
}

/**
 * Calcula score para fluxo estruturado
 */
function calculateStructuredFlowScore(text, qualification, context) {
  let score = 0;

  // Alto para leads qualificados
  if (qualification.level === 'high') score += 40;
  if (qualification.level === 'medium') score += 30;

  // Alto para primeiro contato
  if (context.isFirstContact) score += 35;

  // Alto para contexto comercial claro
  if (context.isCommercial) score += 45;

  // Alto para perguntas de vendas
  const salesKeywords = ['preço', 'valor', 'como funciona', 'serviços', 'produto'];
  if (salesKeywords.some(keyword => text.toLowerCase().includes(keyword))) {
    score += 30;
  }

  return Math.min(100, score);
}

/**
 * Calcula score para LLM
 */
function calculateLLMScore(text, objection, context) {
  let score = 0;

  // Alto para perguntas complexas
  if (text.length > 100) score += 20;

  // Alto para perguntas técnicas
  const techKeywords = ['como', 'por que', 'qual diferença', 'funcionalidade', 'integração'];
  if (techKeywords.some(keyword => text.toLowerCase().includes(keyword))) {
    score += 25;
  }

  // Alto para objeções complexas
  if (objection.hasObjection && objection.confidence > 70) {
    score += 30;
  }

  // Alto para contexto emocional
  if (context.sentiment === 'negative') score += 20;

  return Math.min(100, score);
}

/**
 * Calcula score para híbrido
 */
function calculateHybridScore(structuredScore, llmScore, context) {
  // Híbrido é bom quando ambos têm pontuação média
  const average = (structuredScore + llmScore) / 2;
  let score = 0;

  if (structuredScore > 30 && llmScore > 30) {
    score = average + 10; // Bônus para cenários equilibrados
  }

  // Bônus para conversas longas
  if (context.messageCount > 5) score += 15;

  return Math.min(100, score);
}

/**
 * Gera recomendação final
 */
function getRecommendation(structuredScore, llmScore, hybridScore) {
  const scores = { structured_flow: structuredScore, llm: llmScore, hybrid: hybridScore };
  const winner = Object.entries(scores).reduce((a, b) => scores[a[0]] > scores[b[0]] ? a : b);

  return {
    strategy: winner[0],
    confidence: winner[1],
    fallback: structuredScore > llmScore ? 'structured_flow' : 'llm'
  };
}

/**
 * Gera explicação da decisão
 */
function generateReasoning(structuredScore, llmScore, hybridScore, qualification, objection) {
  const reasons = [];

  if (structuredScore > llmScore && structuredScore > hybridScore) {
    reasons.push(`Fluxo estruturado (${structuredScore}): Lead qualificado (${qualification.level})`);
  } else if (llmScore > structuredScore && llmScore > hybridScore) {
    reasons.push(`LLM (${llmScore}): Pergunta complexa ou objeção detectada`);
  } else {
    reasons.push(`Híbrido (${hybridScore}): Cenário balanceado entre estrutura e flexibilidade`);
  }

  if (objection.hasObjection) {
    reasons.push(`Objeção ${objection.type} detectada (${objection.confidence}% confiança)`);
  }

  return reasons.join(' | ');
}

// Exports principais
export {
  qualificationSystem
};

export default {
  detectObjection,
  calculateDecisionMetrics,
  qualificationSystem
};
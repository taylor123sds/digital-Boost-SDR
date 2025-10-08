// tools/response_mode_calculator.js
// 🎯 Calculador de modo de resposta: Consultivo vs Objetivo

/**
 * 🎯 CALCULA O MODO DE RESPOSTA IDEAL
 *
 * Analisa o histórico e contexto para decidir se o agente deve ser:
 * - CONSULTIVO: Perguntas abertas, exploração de dores, construção de rapport
 * - OBJETIVO: Direto ao ponto, propostas concretas, call-to-action
 *
 * @param {Array} history - Histórico de mensagens
 * @param {String} userMessage - Mensagem atual do usuário
 * @param {Object} salesContext - Contexto de vendas (BANT, qualification, etc)
 * @returns {Object} - Modo e orientações
 */
export function calculateResponseMode(history = [], userMessage = '', salesContext = {}) {
  const messageLower = userMessage.toLowerCase();
  let score = 0; // Negativo = Consultivo, Positivo = Objetivo

  // 📊 CRITÉRIOS DE ANÁLISE

  // 1. Quantidade de mensagens trocadas
  const messageCount = history.length;
  if (messageCount < 3) {
    score -= 2; // Início da conversa = mais consultivo
  } else if (messageCount > 10) {
    score += 1; // Conversa longa = pode ser mais objetivo
  }

  // 2. Detectar sinais de INTERESSE (move para objetivo)
  const interestKeywords = [
    'interessado', 'interested', 'quero saber', 'want to know',
    'como funciona', 'how does it work', 'preço', 'price', 'custo', 'cost',
    'quando', 'when', 'como começar', 'how to start', 'próximo passo', 'next step',
    'reunião', 'meeting', 'conversar', 'talk', 'ligar', 'call'
  ];

  const interestMatches = interestKeywords.filter(kw => messageLower.includes(kw));
  score += interestMatches.length * 2;

  // 3. Detectar sinais de DOR/PROBLEMA (mantém consultivo)
  const painKeywords = [
    'problema', 'problem', 'dificuldade', 'difficulty', 'desafio', 'challenge',
    'não consigo', 'cannot', 'difícil', 'difficult', 'complicado', 'complicated',
    'perco tempo', 'waste time', 'gasto muito', 'spend too much', 'cansado', 'tired'
  ];

  const painMatches = painKeywords.filter(kw => messageLower.includes(kw));
  score -= painMatches.length * 1.5;

  // 4. Detectar PERGUNTAS (mantém consultivo para construir rapport)
  const questionCount = (userMessage.match(/\?/g) || []).length;
  score -= questionCount * 0.5;

  // 5. Usar contexto BANT se disponível
  if (salesContext.bant) {
    const { budget, authority, need, timing } = salesContext.bant;

    // Se já temos 3+ critérios BANT identificados = pode ser mais objetivo
    const bantIdentified = [budget, authority, need, timing].filter(x => x !== null).length;
    if (bantIdentified >= 3) {
      score += 2;
    }
  }

  // 6. Score de qualificação alto = mais objetivo
  if (salesContext.qualificationScore && salesContext.qualificationScore > 70) {
    score += 1.5;
  }

  // 7. Detectar mensagens de OBJEÇÃO (requer consultivo)
  const objectionKeywords = [
    'caro', 'expensive', 'não tenho', 'don\'t have', 'sem tempo', 'no time',
    'preciso pensar', 'need to think', 'talvez depois', 'maybe later',
    'não sei', 'don\'t know', 'incerto', 'uncertain'
  ];

  const objectionMatches = objectionKeywords.filter(kw => messageLower.includes(kw));
  score -= objectionMatches.length * 2;

  // 8. Mensagens curtas e diretas do usuário = responder objetivo
  if (userMessage.length < 30 && !userMessage.includes('?')) {
    score += 1;
  }

  // 9. Mensagens longas e detalhadas = responder consultivo
  if (userMessage.length > 100) {
    score -= 1;
  }

  // 10. Detectar URGÊNCIA (move para objetivo)
  const urgencyKeywords = [
    'urgente', 'urgent', 'hoje', 'today', 'agora', 'now', 'rápido', 'quick',
    'logo', 'soon', 'preciso já', 'need now'
  ];

  const urgencyMatches = urgencyKeywords.filter(kw => messageLower.includes(kw));
  score += urgencyMatches.length * 1.5;

  // 📊 DECISÃO FINAL
  let mode = 'CONSULTIVO'; // Default
  let confidence = 'BAIXA';

  if (score <= -3) {
    mode = 'CONSULTIVO';
    confidence = 'ALTA';
  } else if (score < 0) {
    mode = 'CONSULTIVO';
    confidence = 'MÉDIA';
  } else if (score < 2) {
    mode = 'BALANCEADO'; // Modo intermediário
    confidence = 'MÉDIA';
  } else if (score < 4) {
    mode = 'OBJETIVO';
    confidence = 'MÉDIA';
  } else {
    mode = 'OBJETIVO';
    confidence = 'ALTA';
  }

  // 🎯 ORIENTAÇÕES POR MODO
  const guidance = getGuidanceForMode(mode);

  console.log(`🎯 [RESPONSE-MODE] Calculado: ${mode} (score: ${score}, confiança: ${confidence})`);
  console.log(`📊 [RESPONSE-MODE] Fatores: msgs=${messageCount}, interesse=${interestMatches.length}, dor=${painMatches.length}, objeção=${objectionMatches.length}`);

  return {
    mode,
    score,
    confidence,
    guidance,
    factors: {
      messageCount,
      interestSignals: interestMatches.length,
      painSignals: painMatches.length,
      objectionSignals: objectionMatches.length,
      urgencySignals: urgencyMatches.length,
      questionCount,
      messageLength: userMessage.length
    }
  };
}

/**
 * Retorna orientações específicas para cada modo
 */
function getGuidanceForMode(mode) {
  const guidanceMap = {
    'CONSULTIVO': {
      tone: 'Exploratório e empático',
      approach: 'Faça perguntas abertas para entender dores e contexto',
      examples: [
        'Me conta mais sobre [situação atual]...',
        'Como você está lidando com [problema] hoje?',
        'O que seria ideal para você em relação a [área]?'
      ],
      avoid: [
        'Não dar pitches ou propostas diretas ainda',
        'Não pressionar por próximos passos',
        'Não focar em features/preços'
      ]
    },
    'BALANCEADO': {
      tone: 'Consultivo com direcionamento sutil',
      approach: 'Equilibre perguntas com insights e possibilidades',
      examples: [
        'Entendo sua situação. Normalmente ajudamos empresas assim com [solução]...',
        'Faz sentido para você explorarmos [área]?',
        'Baseado no que você falou, [insight]. O que acha?'
      ],
      avoid: [
        'Não ser excessivamente exploratório',
        'Não ser excessivamente direto'
      ]
    },
    'OBJETIVO': {
      tone: 'Direto e orientado à ação',
      approach: 'Faça perguntas BANT diretas e objetivas, avance mais rápido entre estágios',
      examples: [
        'Vocês já investem quanto em [área]? Para eu entender o contexto',
        'Quem participa dessa decisão com você?',
        'Quando vocês precisam ter isso implementado?'
      ],
      avoid: [
        'Não fazer perguntas vagas ou abertas demais',
        'Não prolongar um estágio BANT que já foi respondido',
        'Não ser indeciso sobre próximos passos'
      ]
    }
  };

  return guidanceMap[mode] || guidanceMap['CONSULTIVO'];
}

export default calculateResponseMode;

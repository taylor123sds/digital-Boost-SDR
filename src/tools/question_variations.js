// question_variations.js
//  SISTEMA DE VARIAÇÃO DE PERGUNTAS PARA EVITAR REDUNDÂNCIA

/**
 *  OBJETIVO:
 * Evitar que ORBION faça a mesma pergunta 2x de formas diferentes
 * Gerar perguntas naturais e variadas baseadas no contexto da conversa
 */

/**
 * VARIAÇÕES DE PERGUNTAS POR CAMPO BANT
 */
export const QUESTION_VARIATIONS = {
  // NEED STAGE - Problema Principal
  problema_principal: {
    primeira_vez: [
      "Me conta: o que você sente que poderia estar muito melhor no seu negócio hoje?",
      "Deixa eu entender: o que tá travando o crescimento de vocês agora?",
      "Pra começar: o que você mudaria no seu negócio se pudesse? O que te incomoda mais?"
    ],
    follow_up_se_vago: [
      "Entendi. Mas me dá um exemplo concreto: o que acontece no dia a dia que te frustra?",
      "Interessante. E como isso te impacta na prática? Tipo, o que você perde por conta disso?",
      "Pega esse problema aí. Se eu te perguntasse 'por que isso importa pra você?', o que você diria?"
    ],
    aprofundamento: [
      "Faz sentido. E há quanto tempo isso vem te incomodando?",
      "Entendo. Vocês já tentaram fazer algo pra resolver?",
      "E o que te impede de resolver isso agora? Falta tempo, grana, conhecimento...?"
    ]
  },

  // NEED STAGE - Impacto no Negócio
  impacto_negocio: {
    natural: [
      "E como isso impacta o negócio de vocês? Tipo vendas, receita, crescimento...",
      "Entendi o problema. Agora me diz: o que vocês perdem por conta disso?",
      "E no fim das contas, quanto isso custa pra vocês? (pode ser em dinheiro, tempo, oportunidade...)"
    ],
    reformulacao: [
      "Deixa eu ver se entendi: esse problema tá te custando quanto por mês, mais ou menos?",
      "Se vocês resolvessem isso, quanto a mais vocês poderiam faturar?",
      "E se continuarem assim, onde vocês vão estar daqui 6 meses?"
    ]
  },

  // BUDGET STAGE - Verba Disponível
  verba_disponivel: {
    primeira_vez: [
      "Agora sobre investimento: vocês têm uma verba separada pra marketing ou avaliam por projeto?",
      "Vamos falar de grana. Quanto vocês conseguem investir pra resolver isso? (pode ser uma faixa)",
      "E budget? Vocês têm algo já reservado ou depende do projeto?"
    ],
    se_evasivo: [
      "Tranquilo. Só pra eu entender: seria algo tipo R$ 2-5k, R$ 5-10k, ou mais que isso?",
      "Sem problema. Pensa assim: é coisa de mil reais, alguns milhares, ou mais investimento?",
      "Beleza. Vou te ajudar: o que vocês pagam hoje de marketing/mês? Seria parecido com isso?"
    ],
    se_diz_depende_roi: [
      "Perfeito, faz todo sentido! E qual ROI vocês precisam ver pra valer a pena?",
      "Ótima resposta! E se eu te mostrar um plano com ROI de 200-300%, qual seria o teto de investimento?",
      "Entendo. E se fosse algo com retorno em 3-4 meses, quanto conseguiriam alocar?"
    ]
  },

  // BUDGET STAGE - Flexibilidade
  flexibilidade: {
    natural: [
      "E esse budget é fixo ou flexível? Tipo, se o resultado for bom, dá pra aumentar?",
      "Entendi. Se a gente entregar resultado rápido, vocês topam escalar o investimento?",
      "E se vocês virem ROI claro, conseguem aumentar ou é um teto hard?"
    ]
  },

  // AUTHORITY STAGE - Decisor Principal
  decisor_principal: {
    primeira_vez: [
      "Agora sobre decisão: você decide isso sozinho ou tem mais alguém envolvido?",
      "Me diz uma coisa: quem bate o martelo nesse tipo de investimento aí?",
      "E pra fechar algo assim, você precisa alinhar com alguém (sócio, diretor...)?"
    ],
    se_nao_e_decisor: [
      "Entendi. E como funciona? Você apresenta e eles decidem, ou todo mundo decide junto?",
      "Beleza. E eles costumam confiar na sua recomendação ou gostam de avaliar tudo também?",
      "Faz sentido. E o que eles mais valorizam na hora de decidir? Preço, resultado, tempo...?"
    ],
    se_e_decisor: [
      "Show! Então você tem autonomia total. E costuma ser rápido pra decidir ou gosta de avaliar bem antes?",
      "Perfeito! E você é do tipo que decide rápido ou prefere ver proposta, dormir em cima, etc?",
      "Ótimo! E geralmente o que te faz fechar ou não com um fornecedor?"
    ]
  },

  // AUTHORITY STAGE - Processo de Decisão
  processo_decisao: {
    natural: [
      "E como funciona o processo aí? Tipo, eu te mando proposta, você analisa... e depois?",
      "Beleza. E geralmente quanto tempo leva pra vocês decidirem algo assim?",
      "Entendi. E tem algum ritual tipo 'preciso de 3 orçamentos' ou vocês decidem se fizer sentido?"
    ]
  },

  // TIMING STAGE - Urgência
  urgencia: {
    primeira_vez: [
      "Agora sobre timing: quando vocês querem começar? É pra ontem ou dá pra aguardar um pouco?",
      "E urgência? Vocês tão com fogo no rabo ou é tranquilo esperar mais um mês?",
      "Me diz: isso é urgente ou tá mais no radar de 'quando der certo'?"
    ],
    se_urgente: [
      "Entendi que é urgente. O que tá pegando fogo aí?",
      "Urgente mesmo! Tem alguma data limite ou evento que tá pressionando?",
      "Saquei. E se demorar, o que acontece?"
    ],
    se_nao_urgente: [
      "Tranquilo. Mas me diz: por que não começar já? Tem algo te segurando?",
      "Entendo. E se fosse pra começar, quando seria o ideal?",
      "Beleza. E o que precisa acontecer pra vocês priorizarem isso?"
    ]
  },

  // TIMING STAGE - Prazo Ideal
  prazo_ideal: {
    natural: [
      "E tem alguma data ideal pra ter isso rodando? Tipo um lançamento, Black Friday...",
      "Entendi. Tem algum evento ou deadline que vocês tão de olho?",
      "Beleza. E até quando vocês gostariam de ver resultado?"
    ]
  }
};

/**
 * VARIAÇÕES DE TRANSIÇÃO ENTRE STAGES
 */
export const TRANSITION_PHRASES = {
  need_to_budget: [
    "Perfeito! Agora que entendi o problema, vamos falar sobre investimento.",
    "Show de bola! Agora vamos pro lado prático: budget.",
    "Ótimo! Captei bem o desafio. Agora, sobre verba..."
  ],

  budget_to_authority: [
    "Beleza! Agora sobre o processo de decisão...",
    "Tranquilo! Vamos falar de quem decide o que aí?",
    "Perfeito! E pra fechar, quem bate o martelo?"
  ],

  authority_to_timing: [
    "Show! Última coisa: timing.",
    "Ótimo! Agora sobre quando começar...",
    "Perfeito! E pra finalizar: quando vocês querem isso rodando?"
  ]
};

/**
 * VARIAÇÕES DE RESPOSTA CONSULTIVA (EMPATIA + ENTENDIMENTO)
 */
export const CONSULTATIVE_RESPONSES = {
  // Quando lead descreve problema
  entendimento_problema: [
    "Entendo, isso realmente pode impactar bastante o dia a dia do negócio.\n\n",
    "Compreendo perfeitamente. Muitos clientes nossos enfrentaram exatamente esse desafio.\n\n",
    "Faz todo sentido. Esse tipo de situação é mais comum do que você imagina, e é totalmente solucionável.\n\n",
    "Consigo ver como isso afeta o crescimento da empresa.\n\n"
  ],

  // Quando lead diz que já tentou algo
  ja_tentou: [
    "Entendo. E o que especificamente não funcionou na tentativa anterior?\n\n",
    "Interessante. Você consegue identificar por que não deu o resultado esperado?\n\n",
    "Compreendo. Isso é bastante comum. Me conta: o que vocês tentaram especificamente?\n\n",
    "Faz sentido. A maioria das empresas já passou por tentativas assim. O que vocês implementaram?\n\n"
  ],

  // Quando lead demonstra interesse
  interesse_positivo: [
    "Que bom que faz sentido! Vou te explicar como podemos ajudar.\n\n",
    "Fico feliz que você veja valor nisso. Deixa eu te mostrar como funciona.\n\n",
    "Ótimo! Vou te apresentar como isso funcionaria no caso de vocês.\n\n",
    "Perfeito! Tenho um case bem parecido com o de vocês que pode te interessar.\n\n"
  ],

  // Quando lead está hesitante
  hesitacao: [
    "Entendo a cautela, é natural. O que te deixa mais receoso?\n\n",
    "Faz todo sentido avaliar bem antes. Qual sua maior dúvida?\n\n",
    "Compreendo perfeitamente. O que te ajudaria a ter mais clareza para decidir?\n\n",
    "É normal ter dúvidas nesse momento. Muitos clientes nossos eram assim no início. O que posso esclarecer?\n\n"
  ],

  // Quando lead apresenta objeção
  objecao: [
    "Entendo sua preocupação. Deixa eu te explicar como isso funciona na prática.\n\n",
    "Faz sentido pensar dessa forma. Vou te mostrar como resolvemos isso para nossos clientes.\n\n",
    "Excelente pergunta! Isso vem bastante. Deixa eu te mostrar alguns dados.\n\n",
    "Compreendo totalmente. Muitos clientes tinham a mesma dúvida. Vou te explicar.\n\n"
  ]
};

/**
 * DETECTOR DE REDUNDÂNCIA
 * Verifica se pergunta já foi feita antes (analisando histórico)
 */
export function isQuestionRedundant(newQuestion, conversationHistory) {
  // Extrair últimas 3-5 mensagens do ORBION
  const recentOrbionMessages = conversationHistory
    .filter(msg => msg.role === 'assistant' || msg.role === 'orbion')
    .slice(-5)
    .map(msg => msg.content.toLowerCase());

  // Palavras-chave por campo BANT
  const keywords = {
    problema: ['problema', 'desafio', 'dor', 'dificuldade'],
    impacto: ['impacta', 'custa', 'perde', 'receita', 'faturar'],
    budget: ['investir', 'verba', 'budget', 'grana', 'quanto'],
    authority: ['decide', 'decisão', 'sozinho', 'envolvido', 'martelo'],
    timing: ['quando', 'urgente', 'começar', 'prazo', 'deadline']
  };

  // Verificar se nova pergunta tem palavras-chave similares às recentes
  const newQuestionLower = newQuestion.toLowerCase();
  let redundancyScore = 0;

  for (const recentMsg of recentOrbionMessages) {
    for (const [campo, words] of Object.entries(keywords)) {
      const newHasKeywords = words.some(w => newQuestionLower.includes(w));
      const recentHasKeywords = words.some(w => recentMsg.includes(w));

      if (newHasKeywords && recentHasKeywords) {
        redundancyScore++;
      }
    }
  }

  // Se score > 2, provável redundância
  return redundancyScore > 2;
}

/**
 * SELETOR INTELIGENTE DE VARIAÇÃO
 * Escolhe variação baseada em: tentativa, tom da conversa, informações já coletadas
 */
export function selectQuestionVariation(campo, contexto = {}) {
  const { tentativa = 1, leadTone = 'neutro', camposColetados = {}, conversationHistory = [] } = contexto;

  const variations = QUESTION_VARIATIONS[campo];
  if (!variations) return null;

  // Lógica de seleção
  let selectedVariations;

  if (tentativa === 1 && variations.primeira_vez) {
    selectedVariations = variations.primeira_vez;
  } else if (tentativa >= 2 && variations.follow_up_se_vago && !camposColetados[campo]) {
    selectedVariations = variations.follow_up_se_vago;
  } else if (tentativa >= 3 && variations.aprofundamento) {
    selectedVariations = variations.aprofundamento;
  } else if (variations.natural) {
    selectedVariations = variations.natural;
  } else {
    // Fallback: primeira disponível
    selectedVariations = Object.values(variations)[0];
  }

  // Selecionar aleatoriamente entre as variações disponíveis
  const selected = selectedVariations[Math.floor(Math.random() * selectedVariations.length)];

  // Verificar redundância
  if (conversationHistory.length > 0 && isQuestionRedundant(selected, conversationHistory)) {
    console.log(` [VARIATION] Redundância detectada, tentando outra variação`);
    // Tentar outra variação
    const alternative = selectedVariations[(Math.floor(Math.random() * selectedVariations.length) + 1) % selectedVariations.length];
    return alternative;
  }

  return selected;
}

/**
 * SELETOR DE RESPOSTA CONSULTIVA
 * Escolhe resposta empática baseada no sentimento do lead
 */
export function selectConsultativeResponse(situacao, contexto = {}) {
  const responses = CONSULTATIVE_RESPONSES[situacao];
  if (!responses) return '';

  return responses[Math.floor(Math.random() * responses.length)];
}

/**
 * SELETOR DE TRANSIÇÃO
 */
export function selectTransitionPhrase(fromStage, toStage) {
  const key = `${fromStage}_to_${toStage}`;
  const transitions = TRANSITION_PHRASES[key];

  if (!transitions) return '';

  return transitions[Math.floor(Math.random() * transitions.length)];
}

export default {
  QUESTION_VARIATIONS,
  TRANSITION_PHRASES,
  CONSULTATIVE_RESPONSES,
  isQuestionRedundant,
  selectQuestionVariation,
  selectConsultativeResponse,
  selectTransitionPhrase
};

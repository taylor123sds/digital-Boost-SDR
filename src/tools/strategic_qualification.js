/**
 * Sistema de Qualificação Estratégica ORBION
 * Metodologia avançada para identificação e classificação de contatos
 */

import { saveMemory, getMemory } from '../memory.js';

/**
 * Tipos de contato possíveis
 */
export const CONTACT_TYPES = {
  PESSOA_FISICA: 'pessoa_fisica',
  PESSOA_JURIDICA: 'pessoa_juridica',
  ATENDIMENTO_AUTOMATIZADO: 'atendimento_automatizado'
};

/**
 * Tipos de respondente
 */
export const RESPONDENT_TYPES = {
  DECISOR: 'decisor',
  GESTOR: 'gestor', 
  RECEPCIONISTA: 'recepcionista',
  CHATBOT: 'chatbot'
};

/**
 * Classificações finais de leads
 */
export const LEAD_CLASSIFICATIONS = {
  DECISOR_ENCONTRADO: '✅ Decisor humano encontrado',
  AGUARDANDO_ENCAMINHAMENTO: '🔄 Recepcionista/assistente (aguardar encaminhamento)',
  CHATBOT_DETECTADO: '🤖 Chatbot (precisa de outra abordagem)',
  NAO_QUALIFICADO: '❌ Não qualificado'
};

/**
 * Analisa o tipo de contato baseado no perfil e contexto
 * @param {string} phoneNumber - Número do contato
 * @param {object} profileData - Dados do perfil do contato
 * @param {string} companyName - Nome da empresa (se disponível)
 * @returns {object} Análise do tipo de contato
 */
export async function analyzeContactType(phoneNumber, profileData, companyName) {
  const analysis = {
    contactType: null,
    confidence: 0,
    indicators: [],
    recommendations: []
  };

  // Análise baseada no nome
  if (profileData?.name) {
    const name = profileData.name.toLowerCase();
    
    // Indicadores de pessoa física
    if (name.includes(' ') && !name.includes('atendimento') && !name.includes('suporte')) {
      analysis.contactType = CONTACT_TYPES.PESSOA_FISICA;
      analysis.confidence += 0.3;
      analysis.indicators.push('Nome pessoal identificado');
    }
    
    // Indicadores de atendimento automatizado
    const botIndicators = ['atendimento', 'suporte', 'bot', 'assistente', 'central', 'sac'];
    if (botIndicators.some(indicator => name.includes(indicator))) {
      analysis.contactType = CONTACT_TYPES.ATENDIMENTO_AUTOMATIZADO;
      analysis.confidence += 0.5;
      analysis.indicators.push('Nome sugere atendimento automatizado');
    }
  }

  // Análise baseada na empresa
  if (companyName) {
    analysis.contactType = CONTACT_TYPES.PESSOA_JURIDICA;
    analysis.confidence += 0.4;
    analysis.indicators.push('Empresa identificada: ' + companyName);
  }

  // Análise baseada no segmento (se disponível no perfil)
  if (profileData?.segment) {
    analysis.contactType = CONTACT_TYPES.PESSOA_JURIDICA;
    analysis.confidence += 0.3;
    analysis.indicators.push('Segmento empresarial: ' + profileData.segment);
  }

  // Definir recomendações baseadas no tipo identificado
  switch (analysis.contactType) {
    case CONTACT_TYPES.PESSOA_FISICA:
      analysis.recommendations.push('Abordagem direta e pessoal');
      analysis.recommendations.push('Focar em benefícios individuais');
      break;
    case CONTACT_TYPES.PESSOA_JURIDICA:
      analysis.recommendations.push('Identificar o decisor');
      analysis.recommendations.push('Focar em ROI e resultados empresariais');
      break;
    case CONTACT_TYPES.ATENDIMENTO_AUTOMATIZADO:
      analysis.recommendations.push('Solicitar transferência para humano');
      analysis.recommendations.push('Usar perguntas que forçam resposta humana');
      break;
    default:
      analysis.contactType = CONTACT_TYPES.PESSOA_FISICA; // Default
      analysis.confidence = 0.1;
      analysis.recommendations.push('Monitorar próximas interações para classificar');
  }

  // Salvar análise na memória
  await saveMemory(`contact_analysis_${phoneNumber}`, JSON.stringify(analysis));
  
  return analysis;
}

/**
 * Detecta se o respondente é humano ou chatbot
 * @param {string} phoneNumber - Número do contato
 * @param {string} message - Mensagem recebida
 * @param {number} responseTime - Tempo de resposta em ms
 * @param {object} conversationHistory - Histórico da conversa
 * @returns {object} Análise humano vs bot
 */
export async function detectHumanVsBot(phoneNumber, message, responseTime, conversationHistory = []) {
  const botScore = 0;
  const indicators = [];
  
  // Recuperar análises anteriores
  const previousAnalysis = await getMemory(`bot_detection_${phoneNumber}`);
  let history = previousAnalysis ? JSON.parse(previousAnalysis) : {
    responses: [],
    botIndicators: 0,
    humanIndicators: 0
  };

  const analysis = {
    isBot: false,
    confidence: 0,
    indicators: [],
    responseTime,
    patterns: []
  };

  // 1. Análise do tempo de resposta
  if (responseTime < 1000) { // Menos de 1 segundo
    analysis.indicators.push('Resposta muito rápida (< 1s)');
    analysis.confidence += 0.3;
    history.botIndicators++;
  } else if (responseTime > 5000 && responseTime < 30000) { // Entre 5-30 segundos
    analysis.indicators.push('Tempo de resposta humano');
    history.humanIndicators++;
  }

  // 2. Análise do conteúdo da mensagem
  const message_lower = message.toLowerCase();
  
  // Indicadores de bot
  const botPhrases = [
    'obrigado por entrar em contato',
    'em que posso ajudar',
    'digite uma opção',
    'para falar com atendente',
    'horário de funcionamento',
    'pressione',
    'opção 1',
    'menu principal'
  ];
  
  const botPhrasesFound = botPhrases.filter(phrase => message_lower.includes(phrase));
  if (botPhrasesFound.length > 0) {
    analysis.indicators.push(`Frases típicas de bot: ${botPhrasesFound.join(', ')}`);
    analysis.confidence += 0.4;
    history.botIndicators++;
  }

  // Indicadores humanos
  const humanPhrases = [
    'oi', 'olá', 'opa', 'e aí',
    'desculpa', 'foi mal',
    'não entendi', 'como assim',
    'interessante', 'legal',
    'pode ser', 'talvez'
  ];
  
  const humanPhrasesFound = humanPhrases.filter(phrase => message_lower.includes(phrase));
  if (humanPhrasesFound.length > 0) {
    analysis.indicators.push(`Linguagem humana natural: ${humanPhrasesFound.join(', ')}`);
    history.humanIndicators++;
  }

  // 3. Análise de padrões estruturais
  if (message.includes('*') || message.includes('_') || message.includes('```')) {
    analysis.indicators.push('Formatação de mensagem automatizada');
    analysis.confidence += 0.2;
    history.botIndicators++;
  }

  // 4. Análise de erros de digitação (humanos cometem erros)
  const typos = /\b(vc|voce|pq|kk|rsrs|haha|uhm|aham)\b/gi;
  if (typos.test(message)) {
    analysis.indicators.push('Erros/informalidade típica humana');
    history.humanIndicators++;
  }

  // 5. Decisão final baseada em histórico
  const totalInteractions = history.botIndicators + history.humanIndicators;
  if (totalInteractions >= 2) {
    const botProbability = history.botIndicators / totalInteractions;
    if (botProbability > 0.6) {
      analysis.isBot = true;
      analysis.confidence = Math.min(0.9, botProbability);
    }
  }

  // Se confiança atual é alta, usar análise imediata
  if (analysis.confidence > 0.7) {
    analysis.isBot = true;
  }

  // Salvar histórico atualizado
  history.responses.push({
    message: message.substring(0, 100),
    responseTime,
    timestamp: new Date().toISOString(),
    analysis: analysis.indicators
  });

  await saveMemory(`bot_detection_${phoneNumber}`, JSON.stringify(history));
  
  return analysis;
}

/**
 * Mapeia o tipo de respondente (decisor, gestor, recepcionista)
 * @param {string} phoneNumber - Número do contato
 * @param {string} message - Mensagem recebida
 * @param {object} contactAnalysis - Análise prévia do contato
 * @returns {object} Mapeamento do respondente
 */
export async function mapRespondent(phoneNumber, message, contactAnalysis) {
  const mapping = {
    type: null,
    confidence: 0,
    indicators: [],
    decisionPower: 'unknown'
  };

  const message_lower = message.toLowerCase();

  // Indicadores de decisor/proprietário
  const ownerPhrases = [
    'sou o dono', 'sou proprietário', 'minha empresa', 'meu negócio',
    'eu decido', 'eu que cuido', 'sou responsável por',
    'trabalho por conta', 'sou autônomo'
  ];

  // Indicadores de gestor
  const managerPhrases = [
    'sou gerente', 'sou coordenador', 'sou supervisor',
    'cuido da parte de', 'responsável pelo setor',
    'equipe comigo', 'preciso consultar'
  ];

  // Indicadores de recepcionista/assistente
  const receptionistPhrases = [
    'vou transferir', 'não sou responsável', 'vou encaminhar',
    'precisa falar com', 'deixa eu ver', 'vou verificar',
    'atendimento da empresa', 'central de atendimento'
  ];

  // Análise
  if (ownerPhrases.some(phrase => message_lower.includes(phrase))) {
    mapping.type = RESPONDENT_TYPES.DECISOR;
    mapping.confidence = 0.8;
    mapping.decisionPower = 'high';
    mapping.indicators.push('Identificou-se como proprietário/decisor');
  } else if (managerPhrases.some(phrase => message_lower.includes(phrase))) {
    mapping.type = RESPONDENT_TYPES.GESTOR;
    mapping.confidence = 0.7;
    mapping.decisionPower = 'medium';
    mapping.indicators.push('Identificou-se como gestor/coordenador');
  } else if (receptionistPhrases.some(phrase => message_lower.includes(phrase))) {
    mapping.type = RESPONDENT_TYPES.RECEPCIONISTA;
    mapping.confidence = 0.9;
    mapping.decisionPower = 'low';
    mapping.indicators.push('Identificou-se como recepcionista/assistente');
  }

  // Se for pessoa física, provavelmente é decisor
  if (!mapping.type && contactAnalysis?.contactType === CONTACT_TYPES.PESSOA_FISICA) {
    mapping.type = RESPONDENT_TYPES.DECISOR;
    mapping.confidence = 0.6;
    mapping.decisionPower = 'high';
    mapping.indicators.push('Pessoa física - assumindo decisor');
  }

  await saveMemory(`respondent_mapping_${phoneNumber}`, JSON.stringify(mapping));
  
  return mapping;
}

/**
 * Aplicar roteiro de qualificação rápida
 * @param {object} contactAnalysis - Análise do contato
 * @param {object} respondentMapping - Mapeamento do respondente
 * @param {object} conversationContext - Contexto da conversa
 * @returns {object} Estratégia de qualificação
 */
export function generateQualificationStrategy(contactAnalysis, respondentMapping, conversationContext) {
  const strategy = {
    approach: '',
    questions: [],
    hooks: [],
    nextSteps: []
  };

  // Estratégia baseada no tipo de contato
  switch (contactAnalysis.contactType) {
    case CONTACT_TYPES.PESSOA_FISICA:
      strategy.approach = 'pessoal_direta';
      strategy.questions = [
        'Você tem algum negócio ou trabalha com vendas?',
        'Já pensou em automatizar seu atendimento no WhatsApp?',
        'Como você faz para não perder clientes quando não pode responder?'
      ];
      strategy.hooks = [
        'Imagina não perder mais nenhum cliente por demora no atendimento...',
        'E se você pudesse atender 24h mesmo dormindo?'
      ];
      break;

    case CONTACT_TYPES.PESSOA_JURIDICA:
      if (respondentMapping.type === RESPONDENT_TYPES.DECISOR) {
        strategy.approach = 'empresarial_decisor';
        strategy.questions = [
          'Vocês já usam alguma ferramenta de marketing digital?',
          'Quem cuida da parte de vendas/marketing na empresa?',
          'Como vocês fazem o follow-up dos leads que chegam?'
        ];
        strategy.hooks = [
          'A maioria das empresas perde 60% dos leads por demora no primeiro contato...',
          'Que tal triplicar sua conversão sem aumentar o time de vendas?'
        ];
      } else if (respondentMapping.type === RESPONDENT_TYPES.RECEPCIONISTA) {
        strategy.approach = 'cortesia_encaminhamento';
        strategy.questions = [
          'Quem seria a pessoa responsável por marketing/vendas aí?',
          'Vocês têm um diretor comercial ou gestor de marketing?',
          'Quando seria um bom horário para falar com quem decide sobre isso?'
        ];
        strategy.hooks = [
          'Tenho algo que pode ajudar muito vocês a ganharem mais clientes...',
          'É sobre uma solução que está fazendo empresas venderem 3x mais...'
        ];
      }
      break;

    case CONTACT_TYPES.ATENDIMENTO_AUTOMATIZADO:
      strategy.approach = 'bypass_bot';
      strategy.questions = [
        'Preciso falar com um humano, por favor',
        'Atendente',
        'Suporte técnico',
        'Comercial'
      ];
      strategy.hooks = [
        'Tenho uma proposta comercial importante',
        'Sou fornecedor, preciso falar com responsável'
      ];
      break;
  }

  // Definir próximos passos
  if (respondentMapping.decisionPower === 'high') {
    strategy.nextSteps = [
      'Apresentar benefícios diretos',
      'Fazer pergunta de dor',
      'Propor demonstração'
    ];
  } else if (respondentMapping.decisionPower === 'medium') {
    strategy.nextSteps = [
      'Qualificar necessidades',
      'Identificar decisor final',
      'Agendar apresentação'
    ];
  } else {
    strategy.nextSteps = [
      'Solicitar contato do decisor',
      'Agendar horário adequado',
      'Deixar material de apoio'
    ];
  }

  return strategy;
}

/**
 * Classifica o lead final após interação
 * @param {string} phoneNumber - Número do contato
 * @param {object} botAnalysis - Análise de bot
 * @param {object} respondentMapping - Mapeamento do respondente
 * @param {object} conversationQuality - Qualidade da conversa
 * @returns {object} Classificação final
 */
export async function classifyLead(phoneNumber, botAnalysis, respondentMapping, conversationQuality) {
  let classification = {
    category: '',
    confidence: 0,
    reasons: [],
    nextAction: ''
  };

  // Se detectou bot
  if (botAnalysis.isBot && botAnalysis.confidence > 0.7) {
    classification = {
      category: LEAD_CLASSIFICATIONS.CHATBOT_DETECTADO,
      confidence: botAnalysis.confidence,
      reasons: ['Comportamento automatizado detectado', ...botAnalysis.indicators],
      nextAction: 'Tentar horário diferente ou canal alternativo'
    };
  }
  // Se é decisor humano
  else if (respondentMapping.type === RESPONDENT_TYPES.DECISOR && !botAnalysis.isBot) {
    classification = {
      category: LEAD_CLASSIFICATIONS.DECISOR_ENCONTRADO,
      confidence: 0.9,
      reasons: ['Decisor identificado', 'Interação humana', ...respondentMapping.indicators],
      nextAction: 'Avançar com qualificação e proposta'
    };
  }
  // Se é recepcionista/assistente
  else if (respondentMapping.type === RESPONDENT_TYPES.RECEPCIONISTA) {
    classification = {
      category: LEAD_CLASSIFICATIONS.AGUARDANDO_ENCAMINHAMENTO,
      confidence: 0.8,
      reasons: ['Recepcionista/assistente identificado', ...respondentMapping.indicators],
      nextAction: 'Solicitar encaminhamento para decisor'
    };
  }
  // Se não conseguiu qualificar adequadamente
  else {
    classification = {
      category: LEAD_CLASSIFICATIONS.NAO_QUALIFICADO,
      confidence: 0.5,
      reasons: ['Não foi possível identificar tipo de respondente claramente'],
      nextAction: 'Continuar interação para qualificar melhor'
    };
  }

  // Salvar classificação final
  await saveMemory(`lead_classification_${phoneNumber}`, JSON.stringify({
    ...classification,
    timestamp: new Date().toISOString(),
    phoneNumber
  }));

  return classification;
}

/**
 * Gerar relatório completo de qualificação
 * @param {string} phoneNumber - Número do contato
 * @returns {object} Relatório completo
 */
export async function generateQualificationReport(phoneNumber) {
  const contactAnalysis = await getMemory(`contact_analysis_${phoneNumber}`);
  const botDetection = await getMemory(`bot_detection_${phoneNumber}`);
  const respondentMapping = await getMemory(`respondent_mapping_${phoneNumber}`);
  const leadClassification = await getMemory(`lead_classification_${phoneNumber}`);

  return {
    phoneNumber,
    contactAnalysis: contactAnalysis ? JSON.parse(contactAnalysis) : null,
    botDetection: botDetection ? JSON.parse(botDetection) : null,
    respondentMapping: respondentMapping ? JSON.parse(respondentMapping) : null,
    leadClassification: leadClassification ? JSON.parse(leadClassification) : null,
    generatedAt: new Date().toISOString()
  };
}
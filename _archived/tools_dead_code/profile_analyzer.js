/**
 * Sistema Avançado de Análise de Perfil e Segmento
 * Identifica empresas, segmentos e cria contextualizações personalizadas
 */

// Segmentos empresariais de Natal/RN e seus indicadores
const BUSINESS_SEGMENTS = {
  RESTAURANTE: {
    name: 'Restaurante/Food Service',
    keywords: ['restaurante', 'pizzaria', 'lanchonete', 'hamburgueria', 'delivery', 'food', 'comida', 'bar', 'açaí', 'pastel'],
    context: 'setor alimentício',
    painPoints: [
      'Volume alto de pedidos WhatsApp',
      'Demora no atendimento = pedidos perdidos',
      'Concorrência forte no delivery',
      'Gestão de cardápio e estoque'
    ],
    opportunities: [
      'Atendimento 24/7 automatizado',
      'Aumento de 200% nos pedidos',
      'Cardápio inteligente com sugestões',
      'Follow-up automático de clientes'
    ],
    hookAudio: 'Olá! Sei que no ramo alimentício cada minuto conta. Você sabia que restaurantes em Natal que automatizaram o WhatsApp aumentaram os pedidos em média 180%?',
    hookText: '🍕 *Atenção Restaurante!* Quantos pedidos você perde por dia por não conseguir responder rápido no WhatsApp? A solução está aqui!'
  },

  LOJA_VAREJO: {
    name: 'Loja/Varejo',
    keywords: ['loja', 'boutique', 'varejo', 'roupas', 'calçados', 'acessórios', 'moda', 'shopping', 'vendas'],
    context: 'varejo e comércio',
    painPoints: [
      'Clientes não finalizam compras online',
      'Dificuldade em mostrar produtos via WhatsApp',
      'Falta de follow-up pós-venda',
      'Concorrência com grandes lojas'
    ],
    opportunities: [
      'Catálogo inteligente no WhatsApp',
      'Vendas 24/7 automatizadas',
      'Personal shopper virtual',
      'Programa de fidelidade automatizado'
    ],
    hookAudio: 'Oi! Notei que você trabalha com varejo. Lojas em Natal que implementaram IA no atendimento viram suas vendas online crescerem 340%. Imagina isso no seu negócio!',
    hookText: '🛍️ *Loja Inteligente!* Transforme visitantes em compradores com IA que vende enquanto você dorme!'
  },

  CLINICA_SERVICOS: {
    name: 'Clínica/Serviços Médicos',
    keywords: ['clínica', 'consultório', 'médico', 'dentista', 'fisioterapia', 'estética', 'saúde', 'exames'],
    context: 'área da saúde',
    painPoints: [
      'Agendamentos perdidos',
      'Remarcações constantes',
      'Fila de espera desorganizada',
      'Confirmações manuais'
    ],
    opportunities: [
      'Agendamento inteligente 24/7',
      'Lembretes automáticos',
      'Redução de 70% no no-show',
      'Pré-consulta automatizada'
    ],
    hookAudio: 'Olá! Trabalho com clínicas e sei da dificuldade com agendamentos. Clínicas em Natal reduziram 70% das faltas usando nossa IA. Interessante, né?',
    hookText: '⚕️ *Clínica Inteligente!* Acabe com agendamentos perdidos e otimize sua agenda com IA!'
  },

  ECOMMERCE: {
    name: 'E-commerce',
    keywords: ['ecommerce', 'loja virtual', 'online', 'site', 'vendas digitais', 'marketplace'],
    context: 'comércio eletrônico',
    painPoints: [
      'Alto abandono de carrinho',
      'Suporte limitado',
      'Baixa conversão de visitantes',
      'Competição com grandes plataformas'
    ],
    opportunities: [
      'Recuperação de carrinho abandonado',
      'Suporte inteligente 24/7',
      'Aumento de 250% na conversão',
      'Cross-sell e upsell automático'
    ],
    hookAudio: 'Oi! Vi que você trabalha com e-commerce. E-commerces locais que implementaram IA aumentaram 250% a conversão. Que tal descobrir como?',
    hookText: '🛒 *E-commerce Turbinado!* Recupere 60% dos carrinhos abandonados com IA que converte!'
  },

  SERVICOS_PROFISSIONAIS: {
    name: 'Serviços Profissionais',
    keywords: ['advocacia', 'contabilidade', 'consultoria', 'engenharia', 'arquitetura', 'marketing', 'design'],
    context: 'serviços especializados',
    painPoints: [
      'Captação de novos clientes',
      'Follow-up de propostas',
      'Agenda sempre lotada',
      'Diferenciação da concorrência'
    ],
    opportunities: [
      'Qualificação automática de leads',
      'Agendamento inteligente',
      'Autoridade digital automatizada',
      'Nurturing de prospects'
    ],
    hookAudio: 'Olá! Trabalho com profissionais liberais e sei da dificuldade em captar clientes qualificados. Consultores em Natal aumentaram 400% os leads com nossa IA.',
    hookText: '👔 *Profissional Inteligente!* Multiplique seus clientes qualificados com IA especializada!'
  },

  EDUCACAO: {
    name: 'Educação/Cursos',
    keywords: ['escola', 'curso', 'ensino', 'educação', 'treinamento', 'faculdade', 'universitário'],
    context: 'educação e ensino',
    painPoints: [
      'Baixa conversão de interessados',
      'Dificuldade em mostrar valor',
      'Suporte a muitos alunos',
      'Concorrência de cursos online'
    ],
    opportunities: [
      'Consultor educacional virtual',
      'Aumento de 300% nas matrículas',
      'Suporte inteligente aos alunos',
      'Retenção automatizada'
    ],
    hookAudio: 'Olá! Trabalho com instituições de ensino. Escolas em Natal que automatizaram o atendimento aumentaram 300% as matrículas. Impressionante!',
    hookText: '🎓 *Educação Inteligente!* Transforme interessados em alunos matriculados com IA educacional!'
  }
};

// Indicadores para identificar se é empresa
const BUSINESS_INDICATORS = [
  // Nomes empresariais
  'ltda', 'me', 'eireli', 'sa', 's.a', 's/a',
  
  // Palavras que indicam negócio
  'empresas', 'negócios', 'comércio', 'indústria',
  'serviços', 'soluções', 'consultoria', 'group',
  'holding', 'corporação', 'firma', 'companhia',
  
  // Segmentos específicos
  'restaurante', 'loja', 'clínica', 'consultório',
  'bar', 'pizzaria', 'lanchonete', 'boutique',
  'farmácia', 'padaria', 'açougue', 'mercado',
  
  // Indicadores de WhatsApp Business
  'atendimento', 'vendas', 'comercial', 'suporte'
];

/**
 * Analisa perfil e identifica se é empresa e qual segmento
 * @param {Object} profileData - Dados do perfil do WhatsApp
 * @param {string} messageContext - Contexto da mensagem para análise adicional
 * @returns {Object} Análise completa do perfil
 */
export function analyzeProfileAndSegment(profileData, messageContext = '') {
  const analysis = {
    type: 'individual', // 'individual' ou 'business'
    segment: null,
    confidence: 0,
    businessName: null,
    contextData: null,
    recommendations: {
      audioHook: null,
      textHook: null,
      approach: 'friendly',
      painPoints: [],
      opportunities: []
    }
  };

  // Textos para análise
  const analysisTexts = [
    profileData?.name || '',
    profileData?.status || '',
    profileData?.pushName || '',
    messageContext
  ].join(' ').toLowerCase();

  // 1. Detecta se é empresa
  const businessScore = BUSINESS_INDICATORS.reduce((score, indicator) => {
    return analysisTexts.includes(indicator) ? score + 1 : score;
  }, 0);

  // Se detectou indicadores empresariais
  if (businessScore > 0 || profileData?.isBusiness) {
    analysis.type = 'business';
    analysis.businessName = extractBusinessName(profileData);
    
    // 2. Identifica segmento
    let maxScore = 0;
    let bestSegment = null;
    
    Object.entries(BUSINESS_SEGMENTS).forEach(([key, segment]) => {
      const segmentScore = segment.keywords.reduce((score, keyword) => {
        return analysisTexts.includes(keyword) ? score + 1 : score;
      }, 0);
      
      if (segmentScore > maxScore) {
        maxScore = segmentScore;
        bestSegment = key;
      }
    });
    
    if (bestSegment && maxScore > 0) {
      analysis.segment = bestSegment;
      analysis.confidence = Math.min(maxScore * 0.3, 0.9);
      analysis.contextData = BUSINESS_SEGMENTS[bestSegment];
      
      // 3. Define abordagem personalizada
      const segmentData = BUSINESS_SEGMENTS[bestSegment];
      analysis.recommendations = {
        audioHook: segmentData.hookAudio,
        textHook: segmentData.hookText,
        approach: 'consultative_business',
        painPoints: segmentData.painPoints,
        opportunities: segmentData.opportunities,
        contextIntro: `Trabalho especificamente com empresas do ${segmentData.context} aqui em Natal`
      };
    } else {
      // Empresa genérica
      analysis.segment = 'BUSINESS_GENERIC';
      analysis.confidence = 0.6;
      analysis.recommendations = {
        audioHook: 'Olá! Vi que você tem uma empresa. Negócios em Natal que implementaram IA aumentaram em média 200% na eficiência. Posso te mostrar como?',
        textHook: '🏢 *Empresário Inteligente!* Automatize seu negócio e multiplique resultados com IA!',
        approach: 'consultative_business',
        painPoints: ['Processos manuais', 'Perda de oportunidades', 'Falta de escalabilidade'],
        opportunities: ['Automação inteligente', 'Crescimento exponencial', 'Vantagem competitiva']
      };
    }
  } else {
    // Pessoa física
    analysis.type = 'individual';
    analysis.confidence = 0.8;
    analysis.recommendations = {
      audioHook: 'Oi! Tudo bem? Vi que você tem interesse em soluções inteligentes. Pessoas que automatizaram seus processos ganharam muito mais tempo livre!',
      textHook: '👋 *Olá!* Que bom te conhecer! Vamos conversar sobre como a tecnologia pode te ajudar?',
      approach: 'friendly_personal',
      painPoints: ['Tarefas repetitivas', 'Falta de tempo', 'Processos complicados'],
      opportunities: ['Mais tempo livre', 'Processos automatizados', 'Vida mais simples']
    };
  }

  return analysis;
}

/**
 * Extrai nome da empresa dos dados do perfil
 */
function extractBusinessName(profileData) {
  const name = profileData?.name || profileData?.pushName || '';
  
  // Remove indicadores comuns e limpa o nome
  return name
    .replace(/\b(ltda|me|eireli|sa|s\.a|s\/a)\b/gi, '')
    .replace(/\b(atendimento|vendas|comercial|suporte)\b/gi, '')
    .trim();
}

/**
 * Gera contexto personalizado para o system prompt
 */
export function generatePersonalizedContext(profileAnalysis, contactName) {
  if (profileAnalysis.type === 'business' && profileAnalysis.segment) {
    const segment = profileAnalysis.contextData;
    
    return {
      introduction: `Você está falando com ${contactName} ${profileAnalysis.businessName ? `da ${profileAnalysis.businessName}` : ''}, uma empresa do ${segment.context} em Natal/RN.`,
      approach: profileAnalysis.recommendations.approach,
      painPoints: segment.painPoints,
      opportunities: segment.opportunities,
      contextIntro: profileAnalysis.recommendations.contextIntro,
      hooks: {
        audio: profileAnalysis.recommendations.audioHook,
        text: profileAnalysis.recommendations.textHook
      }
    };
  } else {
    return {
      introduction: `Você está falando com ${contactName}, uma pessoa interessada em soluções tecnológicas.`,
      approach: 'friendly_personal',
      painPoints: profileAnalysis.recommendations.painPoints,
      opportunities: profileAnalysis.recommendations.opportunities,
      hooks: {
        audio: profileAnalysis.recommendations.audioHook,
        text: profileAnalysis.recommendations.textHook
      }
    };
  }
}

/**
 * Determina se deve enviar áudio no primeiro contato
 */
export function shouldSendWelcomeAudio(profileAnalysis, messageHistory) {
  // Sempre envia áudio no primeiro contato
  if (messageHistory.length === 0) {
    return true;
  }
  
  // Para empresas, pode enviar áudio em re-engajamento
  if (profileAnalysis.type === 'business' && messageHistory.length < 3) {
    return true;
  }
  
  return false;
}

export { BUSINESS_SEGMENTS };
/**
 * @file archetypes.config.js
 * @description Configuração de Arquétipos de Jung para Vendas Consultivas
 *
 * ARQUITETURA:
 * - Arquétipos são DIRETRIZES DE TOM, não templates fixos
 * - O Writer LLM usa essas diretrizes para criar mensagens dinâmicas
 * - Detecção é feita por análise de linguagem, não keywords fixas
 *
 * @author Digital Boost
 * @version 2.0.0
 */

/**
 * Diretrizes de tom por arquétipo
 * Cada arquétipo define COMO falar, não O QUE falar
 */
export const ARCHETYPE_TONE_DIRECTIVES = {
  heroi: {
    name: 'Herói',
    description: 'Lead orientado a resultados e superação de desafios',
    coreMotivation: 'Superar obstáculos e alcançar metas',

    // Diretrizes de TOM (não frases prontas)
    toneDirectives: {
      style: 'Direto, assertivo, focado em resultados',
      pace: 'Rápido, sem rodeios',
      vocabulary: 'Usar palavras de ação: resolver, conquistar, atingir, superar',
      emotionalTriggers: ['desafio', 'meta', 'resultado', 'conquista'],
    },

    // Como adaptar cada parte da mensagem
    messageGuidelines: {
      gancho: 'Vá direto ao ponto. Reconheça o desafio sem enrolação.',
      fato: 'Mostre resultados concretos. Use números quando possível.',
      pergunta: 'Pergunte sobre metas e obstáculos. Seja direto.',
    },

    // O que evitar
    avoid: ['rodeios', 'explicações longas', 'tom passivo', 'hesitação'],

    // Sinais de detecção (análise semântica, não keywords fixas)
    detectionHints: [
      'Fala de metas, resultados, urgência',
      'Usa linguagem de ação e conquista',
      'Demonstra pressa ou impaciência',
      'Menciona concorrência ou competição',
    ],
  },

  sabio: {
    name: 'Sábio',
    description: 'Lead que precisa entender antes de decidir',
    coreMotivation: 'Compreender profundamente antes de agir',

    toneDirectives: {
      style: 'Analítico, preciso, fundamentado',
      pace: 'Metódico, estruturado',
      vocabulary: 'Usar palavras técnicas: dados, análise, metodologia, processo',
      emotionalTriggers: ['lógica', 'evidência', 'compreensão', 'conhecimento'],
    },

    messageGuidelines: {
      gancho: 'Contextualize com dados ou fatos do setor.',
      fato: 'Traga dados, estatísticas ou explicações técnicas.',
      pergunta: 'Pergunte de forma analítica. Peça detalhes específicos.',
    },

    avoid: ['promessas vagas', 'emoção excessiva', 'simplificação demais', 'pressão'],

    detectionHints: [
      'Pede explicações ou detalhes',
      'Usa linguagem técnica ou analítica',
      'Demonstra ceticismo saudável',
      'Quer entender o "como" e "por quê"',
    ],
  },

  rebelde: {
    name: 'Rebelde',
    description: 'Lead frustrado com o status quo',
    coreMotivation: 'Mudar o que não funciona',

    toneDirectives: {
      style: 'Provocativo, validador de frustração, revolucionário',
      pace: 'Energético, intenso',
      vocabulary: 'Usar palavras de mudança: transformar, romper, chega de, cansei',
      emotionalTriggers: ['frustração', 'mudança', 'revolução', 'liberdade'],
    },

    messageGuidelines: {
      gancho: 'Valide a frustração. Mostre que você entende a raiva.',
      fato: 'Mostre que o jeito antigo é o problema, não a solução.',
      pergunta: 'Pergunte o que mais irrita. Amplifique a frustração construtivamente.',
    },

    avoid: ['defender o tradicional', 'minimizar frustração', 'ser conservador'],

    detectionHints: [
      'Expressa frustração ou insatisfação',
      'Critica sistemas ou processos atuais',
      'Usa linguagem de rejeição: "não aguento", "cansei de"',
      'Demonstra irritação com status quo',
    ],
  },

  cuidador: {
    name: 'Cuidador',
    description: 'Lead que busca proteção e suporte',
    coreMotivation: 'Proteger e ser apoiado',

    toneDirectives: {
      style: 'Acolhedor, empático, protetor',
      pace: 'Calmo, sem pressa',
      vocabulary: 'Usar palavras de apoio: ajudar, cuidar, acompanhar, junto',
      emotionalTriggers: ['segurança', 'suporte', 'parceria', 'confiança'],
    },

    messageGuidelines: {
      gancho: 'Demonstre empatia genuína. Mostre que se importa.',
      fato: 'Destaque suporte e acompanhamento. Fale de parceria.',
      pergunta: 'Pergunte com cuidado. Mostre preocupação real.',
    },

    avoid: ['pressão', 'frieza', 'foco só em números', 'pressa'],

    detectionHints: [
      'Expressa preocupação ou medo',
      'Menciona equipe ou família',
      'Demonstra insegurança',
      'Pede ajuda ou orientação',
    ],
  },

  explorador: {
    name: 'Explorador',
    description: 'Lead curioso sobre novas possibilidades',
    coreMotivation: 'Descobrir oportunidades inexploradas',

    toneDirectives: {
      style: 'Curioso, entusiasmado, inovador',
      pace: 'Dinâmico, aberto',
      vocabulary: 'Usar palavras de descoberta: explorar, novo, oportunidade, tendência',
      emotionalTriggers: ['novidade', 'possibilidade', 'descoberta', 'inovação'],
    },

    messageGuidelines: {
      gancho: 'Mostre curiosidade pelo que ele faz.',
      fato: 'Destaque novidades e possibilidades inexploradas.',
      pergunta: 'Pergunte sobre visão de futuro e o que querem explorar.',
    },

    avoid: ['o tradicional', 'o comum', 'limitações', 'negatividade'],

    detectionHints: [
      'Demonstra interesse em novidades',
      'Pergunta sobre tendências',
      'Usa linguagem de possibilidade',
      'Mostra abertura para experimentar',
    ],
  },

  mago: {
    name: 'Mago',
    description: 'Lead que busca transformação profunda',
    coreMotivation: 'Transformar a realidade atual',

    toneDirectives: {
      style: 'Visionário, transformador, inspirador',
      pace: 'Elevado, aspiracional',
      vocabulary: 'Usar palavras de transformação: mudar, transformar, revolucionar, antes/depois',
      emotionalTriggers: ['visão', 'transformação', 'futuro', 'potencial'],
    },

    messageGuidelines: {
      gancho: 'Pinte a visão do que pode ser.',
      fato: 'Mostre transformações possíveis. Use antes/depois.',
      pergunta: 'Pergunte sobre a transformação desejada.',
    },

    avoid: ['foco no passado', 'limitações', 'incrementalismo', 'detalhes técnicos demais'],

    detectionHints: [
      'Fala de transformação ou mudança radical',
      'Demonstra visão de futuro',
      'Quer reorganizar ou revolucionar',
      'Usa linguagem aspiracional',
    ],
  },

  amante: {
    name: 'Amante',
    description: 'Lead que valoriza conexão e dedicação',
    coreMotivation: 'Criar conexões significativas',

    toneDirectives: {
      style: 'Caloroso, conectado, apreciativo',
      pace: 'Fluido, relacional',
      vocabulary: 'Usar palavras de conexão: dedicação, paixão, construir, valor',
      emotionalTriggers: ['conexão', 'apreciação', 'dedicação', 'significado'],
    },

    messageGuidelines: {
      gancho: 'Reconheça a dedicação e esforço do lead.',
      fato: 'Conecte emocionalmente com o valor do que ele construiu.',
      pergunta: 'Pergunte sobre sentimentos e impacto pessoal.',
    },

    avoid: ['frieza', 'foco só em números', 'transacional demais'],

    detectionHints: [
      'Fala com paixão sobre o negócio',
      'Demonstra dedicação pessoal',
      'Usa linguagem emocional',
      'Valoriza relacionamentos',
    ],
  },

  governante: {
    name: 'Governante',
    description: 'Lead executivo focado em controle',
    coreMotivation: 'Ter controle e visão estratégica',

    toneDirectives: {
      style: 'Executivo, estratégico, orientado a controle',
      pace: 'Estruturado, objetivo',
      vocabulary: 'Usar palavras de gestão: controle, indicadores, estratégia, gestão',
      emotionalTriggers: ['controle', 'visão', 'liderança', 'eficiência'],
    },

    messageGuidelines: {
      gancho: 'Fale em linguagem executiva. Seja estruturado.',
      fato: 'Mostre ROI, KPIs e impacto estratégico.',
      pergunta: 'Pergunte sobre métricas e o que precisa controlar.',
    },

    avoid: ['informalidade excessiva', 'detalhes operacionais', 'falta de estrutura'],

    detectionHints: [
      'Fala de métricas e indicadores',
      'Demonstra visão de gestão',
      'Menciona equipe ou liderança',
      'Usa linguagem executiva',
    ],
  },

  // Arquétipo padrão quando não há detecção clara
  default: {
    name: 'Neutro',
    description: 'Tom equilibrado quando arquétipo não é claro',
    coreMotivation: 'Entender e avançar',

    toneDirectives: {
      style: 'Equilibrado, profissional, consultivo',
      pace: 'Moderado',
      vocabulary: 'Linguagem clara e direta, sem extremos',
      emotionalTriggers: ['clareza', 'praticidade', 'solução'],
    },

    messageGuidelines: {
      gancho: 'Espelhe o que o lead disse de forma neutra.',
      fato: 'Traga um insight prático e relevante.',
      pergunta: 'Pergunte para entender melhor a situação.',
    },

    avoid: ['extremos de tom', 'suposições', 'pressão'],

    detectionHints: ['Padrão quando nenhum arquétipo é claramente identificado'],
  },
};

/**
 * Configuração de detecção de arquétipos
 * Define como a IA deve analisar as mensagens para detectar arquétipos
 */
export const ARCHETYPE_DETECTION_CONFIG = {
  // Mínimo de confiança para aplicar um arquétipo (0-100)
  minConfidence: 40,

  // Número mínimo de turnos antes de "travar" um arquétipo
  minTurnsToLock: 2,

  // Prompt para detecção via LLM
  detectionPrompt: `Analise a mensagem do lead e identifique qual arquétipo de Jung melhor representa seu perfil de comunicação.

ARQUÉTIPOS DISPONÍVEIS:
- heroi: Orientado a resultados, desafios, metas, pressa
- sabio: Analítico, quer entender, pede detalhes, técnico
- rebelde: Frustrado, quer mudança, critica status quo
- cuidador: Preocupado, busca segurança, menciona equipe
- explorador: Curioso, aberto a novidades, quer explorar
- mago: Visionário, quer transformação, aspiracional
- amante: Apaixonado pelo negócio, emocional, conexão
- governante: Executivo, foco em métricas, gestão
- default: Quando nenhum é claro

MENSAGEM DO LEAD: "{message}"
CONTEXTO: {context}

Responda APENAS em JSON:
{
  "archetype": "nome_do_arquetipo",
  "confidence": 0-100,
  "reasoning": "breve explicação"
}`,
};

/**
 * Helper para obter diretrizes de um arquétipo
 * @param {string} archetypeName - Nome do arquétipo
 * @returns {object} Diretrizes do arquétipo
 */
export function getArchetypeDirectives(archetypeName) {
  return ARCHETYPE_TONE_DIRECTIVES[archetypeName] || ARCHETYPE_TONE_DIRECTIVES.default;
}

/**
 * Gera instruções de tom para o Writer baseado no arquétipo
 * @param {string} archetypeName - Nome do arquétipo
 * @returns {string} Instruções de tom formatadas
 */
export function generateToneInstructions(archetypeName) {
  const arch = getArchetypeDirectives(archetypeName);

  return `
TOM DE COMUNICAÇÃO (Arquétipo: ${arch.name})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Motivação do lead: ${arch.coreMotivation}
Estilo: ${arch.toneDirectives.style}
Ritmo: ${arch.toneDirectives.pace}
Vocabulário: ${arch.toneDirectives.vocabulary}

COMO ESCREVER CADA PARTE:
• Gancho: ${arch.messageGuidelines.gancho}
• Fato/Insight: ${arch.messageGuidelines.fato}
• Pergunta: ${arch.messageGuidelines.pergunta}

 EVITAR: ${arch.avoid.join(', ')}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
}

export default {
  ARCHETYPE_TONE_DIRECTIVES,
  ARCHETYPE_DETECTION_CONFIG,
  getArchetypeDirectives,
  generateToneInstructions,
};

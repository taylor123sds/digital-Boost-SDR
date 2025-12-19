// src/tools/archetypes.js
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Os 12 Arquétipos de Comunicação baseados em Jung para Vendas e Persuasão
 * Adaptados para maximizar conexão emocional e conversão em vendas B2B
 */
export const ARCHETYPES = {
  SABIO: {
    name: 'Sábio',
    description: 'Comunicação baseada em conhecimento, experiência e expertise',
    coreMotivation: 'Compartilhar conhecimento e educar',
    coreValues: ['sabedoria', 'conhecimento', 'experiência', 'orientação', 'expertise'],
    traits: [
      'Tom professoral e experiente',
      'Usa dados, estatísticas e cases reais',
      'Oferece insights valiosos e análises profundas',
      'Linguagem técnica mas didática',
      'Demonstra autoridade no assunto',
      'Educa antes de vender'
    ],
    voiceStyle: 'Baseado na minha experiência de 15 anos no mercado e nos dados que analisei...',
    salesApproach: {
      discovery: 'Faz perguntas analíticas e baseadas em métricas',
      presentation: 'Usa cases, estudos e dados para comprovar resultados',
      objection: 'Responde com análises lógicas e evidências concretas',
      closing: 'Apresenta a decisão como natural baseada nas evidências'
    },
    bestFor: ['PMEs que valorizam expertise', 'decisores analíticos', 'mercados técnicos'],
    contexts: ['consultoria', 'tecnologia', 'educação', 'estratégia', 'análise']
  },

  HEROI: {
    name: 'Herói',
    description: 'Comunicação corajosa, determinada, focada em superar desafios',
    coreMotivation: 'Superar obstáculos e alcançar o triunfo',
    coreValues: ['coragem', 'determinação', 'superação', 'conquista', 'disciplina'],
    traits: [
      'Tom confiante e determinado',
      'Foca em desafios e soluções',
      'Linguagem de batalha e conquista',
      'Inspira ação imediata',
      'Não aceita "não" facilmente',
      'Cria urgência baseada em oportunidade'
    ],
    voiceStyle: 'Vamos enfrentar esse desafio de frente e transformar sua empresa...',
    salesApproach: {
      discovery: 'Identifica o "inimigo" (problema) a ser derrotado',
      presentation: 'Apresenta a solução como arma para vencer',
      objection: 'Transforma objeções em desafios a superar',
      closing: 'Convoca para a "batalha" (implementação)'
    },
    bestFor: ['Empresários ambiciosos', 'mercados competitivos', 'momentos de crise'],
    contexts: ['vendas complexas', 'transformação digital', 'crescimento', 'inovação']
  },

  MAGO: {
    name: 'Mago',
    description: 'Comunicação transformadora, visionária, focada em mudança',
    coreMotivation: 'Transformar a realidade através de soluções inovadoras',
    coreValues: ['transformação', 'inovação', 'visão', 'mudança', 'possibilidades'],
    traits: [
      'Tom visionário e inspirador',
      'Fala de transformações impossíveis',
      'Linguagem de mudança e evolução',
      'Demonstra possibilidades inimagináveis',
      'Cria senso de magia nos resultados',
      'Foca no "como" da transformação'
    ],
    voiceStyle: 'Imagina transformar completamente a forma como você...',
    salesApproach: {
      discovery: 'Explora sonhos e visão do cliente',
      presentation: 'Mostra a "magia" da transformação',
      objection: 'Reframe limitações como possibilidades',
      closing: 'Convida para a jornada de transformação'
    },
    bestFor: ['Visionários', 'empresas em transição', 'inovadores'],
    contexts: ['automação', 'IA', 'transformação digital', 'inovação disruptiva']
  },

  INOCENTE: {
    name: 'Inocente',
    description: 'Comunicação pura, simples, honesta e confiável',
    coreMotivation: 'Fazer o bem e ser honesto em todas as interações',
    coreValues: ['honestidade', 'simplicidade', 'pureza', 'otimismo', 'confiança'],
    traits: [
      'Tom genuíno e transparente',
      'Linguagem simples e direta',
      'Sem jargões ou complexidade',
      'Demonstra autenticidade total',
      'Cria confiança pela transparência',
      'Foca em soluções descomplicadas'
    ],
    voiceStyle: 'Vou ser bem direto e honesto com você...',
    salesApproach: {
      discovery: 'Perguntas diretas e transparentes',
      presentation: 'Explicação simples e sem enrolação',
      objection: 'Resposta honesta, admite limitações se houver',
      closing: 'Convite simples e direto'
    },
    bestFor: ['PMEs tradicionais', 'clientes céticos', 'relações de longo prazo'],
    contexts: ['atendimento', 'suporte', 'relacionamento', 'confiança']
  },

  EXPLORADOR: {
    name: 'Explorador',
    description: 'Comunicação aventureira, curiosa, focada em descoberta',
    coreMotivation: 'Descobrir novos territórios e possibilidades',
    coreValues: ['liberdade', 'descoberta', 'aventura', 'independência', 'pioneirismo'],
    traits: [
      'Tom aventureiro e curioso',
      'Foca em novos mercados e oportunidades',
      'Linguagem de exploração e descoberta',
      'Evita rotina e padrões antigos',
      'Inspira a sair da zona de conforto',
      'Cria excitação sobre o desconhecido'
    ],
    voiceStyle: 'Vamos explorar um território completamente novo para seu negócio...',
    salesApproach: {
      discovery: 'Explora mercados inexplorados pelo cliente',
      presentation: 'Apresenta como jornada de descoberta',
      objection: 'Reframe medo como oportunidade de pioneirismo',
      closing: 'Convida para embarcar na aventura'
    },
    bestFor: ['Empreendedores pioneiros', 'novos mercados', 'startups'],
    contexts: ['expansão', 'novos mercados', 'inovação', 'crescimento']
  },

  AMANTE: {
    name: 'Amante',
    description: 'Comunicação apaixonada, emocional, focada em relacionamentos',
    coreMotivation: 'Criar conexões profundas e experiências emocionais',
    coreValues: ['paixão', 'conexão', 'intimidade', 'relacionamento', 'experiência'],
    traits: [
      'Tom caloroso e apaixonado',
      'Foca em experiências e sentimentos',
      'Linguagem emocional e envolvente',
      'Cria intimidade na conversa',
      'Demonstra paixão pelo que faz',
      'Personaliza profundamente a abordagem'
    ],
    voiceStyle: 'Tenho uma paixão genuína por ajudar negócios como o seu...',
    salesApproach: {
      discovery: 'Explora sonhos e paixões do cliente',
      presentation: 'Foca na experiência emocional',
      objection: 'Conecta emocionalmente com as preocupações',
      closing: 'Convida para um relacionamento de parceria'
    },
    bestFor: ['Negócios familiares', 'marcas com propósito', 'relacionamentos B2B'],
    contexts: ['relacionamento', 'experiência do cliente', 'fidelização', 'parceria']
  },

  CRIADOR: {
    name: 'Criador',
    description: 'Comunicação criativa, inovadora, focada em construção',
    coreMotivation: 'Criar algo novo e deixar uma marca no mundo',
    coreValues: ['criatividade', 'originalidade', 'construção', 'arte', 'expressão'],
    traits: [
      'Tom criativo e inspirador',
      'Foca em soluções personalizadas',
      'Linguagem de construção e criação',
      'Evita soluções padronizadas',
      'Inspira individualidade',
      'Cria visão de algo único'
    ],
    voiceStyle: 'Vamos criar algo completamente único para seu negócio...',
    salesApproach: {
      discovery: 'Explora necessidades únicas e específicas',
      presentation: 'Apresenta soluções customizadas',
      objection: 'Reframe como oportunidade de personalização',
      closing: 'Convida para co-criar a solução'
    },
    bestFor: ['Negócios criativos', 'soluções customizadas', 'diferenciação'],
    contexts: ['personalização', 'inovação', 'diferenciação', 'criatividade']
  },

  GOVERNANTE: {
    name: 'Governante',
    description: 'Comunicação autoritária, responsável, focada em controle',
    coreMotivation: 'Criar ordem, estabilidade e liderar com responsabilidade',
    coreValues: ['liderança', 'controle', 'responsabilidade', 'estabilidade', 'poder'],
    traits: [
      'Tom autoritário mas respeitoso',
      'Foca em controle e resultados',
      'Linguagem de liderança e comando',
      'Demonstra domínio da situação',
      'Inspira confiança na gestão',
      'Cria senso de ordem e organização'
    ],
    voiceStyle: 'Como líder do seu negócio, você precisa ter controle total sobre...',
    salesApproach: {
      discovery: 'Identifica áreas sem controle adequado',
      presentation: 'Apresenta como ferramenta de poder',
      objection: 'Reframe como questão de liderança',
      closing: 'Posiciona como decisão de líder'
    },
    bestFor: ['CEOs', 'grandes empresas', 'mercados formais'],
    contexts: ['gestão', 'controle', 'liderança', 'governança']
  },

  REBELDE: {
    name: 'Rebelde',
    description: 'Comunicação revolucionária, disruptiva, questionadora',
    coreMotivation: 'Quebrar convenções e revolucionar o status quo',
    coreValues: ['revolução', 'liberdade', 'mudança', 'autenticidade', 'disrupção'],
    traits: [
      'Tom provocativo e questionador',
      'Desafia formas tradicionais',
      'Linguagem de revolução e mudança',
      'Questiona o establishment',
      'Inspira coragem para mudança',
      'Cria urgência de transformação'
    ],
    voiceStyle: 'Chega de fazer as coisas do jeito antigo...',
    salesApproach: {
      discovery: 'Identifica frustrações com métodos atuais',
      presentation: 'Apresenta como revolução necessária',
      objection: 'Desafia o pensamento conservador',
      closing: 'Convoca para a revolução'
    },
    bestFor: ['Disruptores', 'mercados conservadores', 'mudança necessária'],
    contexts: ['disrupção', 'inovação radical', 'mudança cultural', 'transformação']
  },

  BOBO_DA_CORTE: {
    name: 'Bobo da Corte',
    description: 'Comunicação divertida, espontânea, aliviando tensões',
    coreMotivation: 'Levar alegria, diversão e aliviar a seriedade',
    coreValues: ['diversão', 'alegria', 'espontaneidade', 'leveza', 'humanidade'],
    traits: [
      'Tom descontraído e divertido',
      'Usa humor apropriado',
      'Linguagem leve e acessível',
      'Quebra tensões na conversa',
      'Humaniza a interação comercial',
      'Cria ambiente descontraído'
    ],
    voiceStyle: 'Olha, vou falar uma coisa que vai te fazer rir...',
    salesApproach: {
      discovery: 'Usa humor para quebrar barreiras',
      presentation: 'Apresenta de forma divertida e memorável',
      objection: 'Usa leveza para desarmar resistências',
      closing: 'Torna a decisão divertida e fácil'
    },
    bestFor: ['Ambientes tensos', 'clientes sérios demais', 'relacionamento'],
    contexts: ['networking', 'quebra-gelo', 'relacionamento', 'humanização']
  },

  CUIDADOR: {
    name: 'Cuidador',
    description: 'Comunicação protetiva, altruísta, focada em ajudar',
    coreMotivation: 'Cuidar e proteger outros, oferecendo suporte',
    coreValues: ['cuidado', 'proteção', 'altruísmo', 'suporte', 'generosidade'],
    traits: [
      'Tom carinhoso e protetor',
      'Foca nas necessidades do cliente',
      'Linguagem de cuidado e suporte',
      'Demonstra preocupação genuína',
      'Oferece proteção e segurança',
      'Prioriza bem-estar do cliente'
    ],
    voiceStyle: 'Minha preocupação é garantir que você tenha tudo que precisa...',
    salesApproach: {
      discovery: 'Identifica vulnerabilidades e riscos',
      presentation: 'Apresenta como proteção necessária',
      objection: 'Responde com preocupação genuína',
      closing: 'Posiciona como cuidado essencial'
    },
    bestFor: ['Serviços essenciais', 'clientes vulneráveis', 'suporte'],
    contexts: ['suporte', 'segurança', 'proteção', 'cuidado']
  },

  PESSOA_COMUM: {
    name: 'Pessoa Comum',
    description: 'Comunicação acessível, prática, focada no dia a dia',
    coreMotivation: 'Conectar-se com pessoas comuns e ser acessível',
    coreValues: ['simplicidade', 'praticidade', 'acessibilidade', 'realismo', 'humildade'],
    traits: [
      'Tom informal e acessível',
      'Usa linguagem do dia a dia',
      'Foca em soluções práticas',
      'Demonstra humildade e realismo',
      'Evita arrogância ou superioridade',
      'Cria identificação com o comum'
    ],
    voiceStyle: 'Olha, eu entendo sua situação porque já passei por isso...',
    salesApproach: {
      discovery: 'Conversa como igual, sem superioridade',
      presentation: 'Apresenta de forma prática e realista',
      objection: 'Responde com compreensão e empatia',
      closing: 'Convida como um igual ajudando outro'
    },
    bestFor: ['PMEs familiares', 'negócios locais', 'relacionamento peer-to-peer'],
    contexts: ['relacionamento', 'empatia', 'proximidade', 'comunidade']
  }
};

/**
 * Analisa o contexto e determina o arquétipo mais adequado
 * @param {string} message - Mensagem ou contexto para análise
 * @param {string} leadProfile - Perfil do lead (opcional)
 * @param {Object} salesContext - Contexto de vendas (persona, estágio, etc)
 * @returns {Promise<Object>} Arquétipo escolhido com análise
 */
export async function analyzeAndSelectArchetype(message, leadProfile = '', salesContext = {}) {
  try {
    const analysisPrompt = `
Como especialista em comunicação, arquétipos e vendas B2B, analise o contexto e determine o arquétipo mais adequado:

CONTEXTO DA COMUNICAÇÃO:
- Mensagem: "${message}"
- Perfil do Lead: "${leadProfile}"
- Persona: "${salesContext.persona || 'não identificada'}"
- Estágio de Vendas: "${salesContext.salesStage || 'inicial'}"
- Nível de Interesse: "${salesContext.interestLevel || 'baixo'}/10"
- Objeção Detectada: "${salesContext.objection || 'nenhuma'}"

OS 12 ARQUÉTIPOS DISPONÍVEIS:
1. SABIO: Para clientes analíticos, que valorizam expertise, dados e experiência
2. HEROI: Para desafios, superação, momentos de crise, empresários ambiciosos
3. MAGO: Para transformação, inovação, possibilidades, visão de futuro
4. INOCENTE: Para transparência, simplicidade, confiança, PMEs tradicionais
5. EXPLORADOR: Para novos mercados, pioneirismo, aventura empresarial
6. AMANTE: Para relacionamento, paixão, experiências, negócios familiares
7. CRIADOR: Para personalização, originalidade, soluções customizadas
8. GOVERNANTE: Para controle, liderança, autoridade, CEOs de grandes empresas
9. REBELDE: Para disrupção, mudança radical, quebra de convenções
10. BOBO_DA_CORTE: Para descontração, humor, quebrar tensões
11. CUIDADOR: Para proteção, cuidado, suporte, serviços essenciais
12. PESSOA_COMUM: Para proximidade, realismo, peer-to-peer, negócios locais

CRITÉRIOS DE SELEÇÃO:
- Palavras-chave na mensagem
- Personalidade inferida do lead
- Momento da conversa (inicial, objeção, fechamento)
- Tipo de negócio (persona identificada)
- Contexto emocional necessário

RETORNE JSON:
{
  "archetype": "NOME_DO_ARQUETIPO",
  "confidence": 0.85,
  "reasoning": "Por que este arquétipo foi escolhido",
  "alternative": "ARQUETIPO_ALTERNATIVO",
  "salesApproach": "como usar na venda"
}
`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'user', content: analysisPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.4
    });

    const analysis = JSON.parse(response.choices[0].message.content);
    
    // Valida se o arquétipo existe
    if (ARCHETYPES[analysis.archetype]) {
      console.log(` Arquétipo selecionado: ${analysis.archetype} (${analysis.confidence})`);
      console.log(` Razão: ${analysis.reasoning}`);
      return {
        ...analysis,
        archetypeData: ARCHETYPES[analysis.archetype]
      };
    } else {
      // Fallback inteligente baseado no contexto
      const fallbackArchetype = selectFallbackArchetype(message, leadProfile, salesContext);
      console.log(` Usando fallback: ${fallbackArchetype}`);
      return {
        archetype: fallbackArchetype,
        confidence: 0.6,
        reasoning: 'Seleção automática por fallback',
        archetypeData: ARCHETYPES[fallbackArchetype]
      };
    }
    
  } catch (error) {
    console.error(' Erro ao analisar arquétipo:', error);
    const fallbackArchetype = selectFallbackArchetype(message, leadProfile, salesContext);
    return {
      archetype: fallbackArchetype,
      confidence: 0.5,
      reasoning: 'Fallback por erro',
      archetypeData: ARCHETYPES[fallbackArchetype]
    };
  }
}

/**
 * Seleciona arquétipo de fallback baseado em regras heurísticas
 */
function selectFallbackArchetype(message, leadProfile, salesContext) {
  const text = `${message} ${leadProfile}`.toLowerCase();
  
  // Regras baseadas em palavras-chave
  const archetypeRules = {
    SABIO: ['experiência', 'dados', 'análise', 'expertise', 'consultoria', 'técnico'],
    HEROI: ['desafio', 'superar', 'conquistar', 'vencer', 'crescimento', 'competição'],
    MAGO: ['transformar', 'inovar', 'possível', 'mudança', 'evoluir', 'revolucionar'],
    INOCENTE: ['simples', 'honesto', 'direto', 'transparente', 'confiança', 'tradicional'],
    EXPLORADOR: ['novo', 'descobrir', 'explorar', 'mercado', 'oportunidade', 'pioneiro'],
    AMANTE: ['paixão', 'experiência', 'relacionamento', 'família', 'conexão', 'cuidado'],
    CRIADOR: ['personalizar', 'único', 'criar', 'customizar', 'original', 'específico'],
    GOVERNANTE: ['controle', 'gestão', 'liderança', 'autoridade', 'comando', 'poder'],
    REBELDE: ['diferente', 'quebrar', 'mudar', 'revolucionar', 'inovar', 'disruptivo'],
    BOBO_DA_CORTE: ['divertido', 'descontraído', 'humor', 'leve', 'informal', 'relaxado'],
    CUIDADOR: ['proteger', 'cuidar', 'suporte', 'ajudar', 'segurança', 'garantir'],
    PESSOA_COMUM: ['simples', 'prático', 'real', 'comum', 'local', 'normal']
  };

  let bestMatch = 'SABIO'; // Default
  let highestScore = 0;

  for (const [archetype, keywords] of Object.entries(archetypeRules)) {
    const score = keywords.reduce((acc, keyword) => {
      return acc + (text.includes(keyword) ? 1 : 0);
    }, 0);

    if (score > highestScore) {
      highestScore = score;
      bestMatch = archetype;
    }
  }

  // Regras baseadas na persona
  if (salesContext.persona) {
    const personaMapping = {
      'RESTAURANTE_DELIVERY': 'PESSOA_COMUM',
      'LOJA_VAREJO': 'AMANTE', 
      'CLINICA_SERVICOS': 'CUIDADOR',
      'ECOMMERCE_LOCAL': 'MAGO',
      'SERVICOS_PROFISSIONAIS': 'SABIO'
    };
    
    if (personaMapping[salesContext.persona]) {
      bestMatch = personaMapping[salesContext.persona];
    }
  }

  // Regras baseadas no estágio de vendas
  if (salesContext.salesStage) {
    const stageMapping = {
      'initial_contact': 'INOCENTE',
      'interest_discovery': 'EXPLORADOR',
      'problem_identification': 'SABIO',
      'solution_presentation': 'MAGO',
      'objection_handling': 'HEROI',
      'meeting_request': 'GOVERNANTE'
    };

    if (stageMapping[salesContext.salesStage]) {
      bestMatch = stageMapping[salesContext.salesStage];
    }
  }

  return bestMatch;
}

/**
 * Seleciona arquétipo baseado na persona de Natal
 * @param {string} personaType - Tipo de persona (RESTAURANTE_DELIVERY, LOJA_VAREJO, etc)
 * @param {Object} context - Contexto adicional
 * @returns {string} Arquétipo recomendado
 */
export function selectArchetypeByPersona(personaType, context = {}) {
  const personaArchetypeMap = {
    RESTAURANTE_DELIVERY: {
      primary: 'PESSOA_COMUM',
      alternatives: ['CUIDADOR', 'HEROI'],
      reason: 'Negócios familiares locais valorizam proximidade e praticidade'
    },
    
    LOJA_VAREJO: {
      primary: 'AMANTE',
      alternatives: ['CRIADOR', 'EXPLORADOR'],
      reason: 'Foco em experiência do cliente e relacionamento emocional'
    },
    
    CLINICA_SERVICOS: {
      primary: 'CUIDADOR',
      alternatives: ['SABIO', 'GOVERNANTE'], 
      reason: 'Área da saúde prioriza cuidado, proteção e responsabilidade'
    },
    
    ECOMMERCE_LOCAL: {
      primary: 'MAGO',
      alternatives: ['EXPLORADOR', 'CRIADOR'],
      reason: 'Transformação digital e inovação são essenciais'
    },
    
    SERVICOS_PROFISSIONAIS: {
      primary: 'SABIO',
      alternatives: ['GOVERNANTE', 'CUIDADOR'],
      reason: 'Expertise e conhecimento são valores fundamentais'
    }
  };

  const mapping = personaArchetypeMap[personaType];
  if (!mapping) {
    return 'SABIO'; // Default
  }

  // Seleciona alternativa baseada no contexto
  if (context.salesStage === 'objection_handling') {
    return 'HEROI'; // Sempre use Herói para objeções
  }
  
  if (context.interestLevel >= 8) {
    return 'GOVERNANTE'; // Use Governante para high-intent
  }

  if (context.needsHumor) {
    return 'BOBO_DA_CORTE';
  }

  return mapping.primary;
}

/**
 * Aplica o arquétipo escolhido ao roteiro de comunicação
 * @param {string} baseScript - Roteiro base
 * @param {Object} archetypeAnalysis - Análise completa do arquétipo
 * @param {Object} salesContext - Contexto de vendas
 * @returns {Promise<string>} Roteiro adaptado ao arquétipo
 */
export async function applyArchetypeToScript(baseScript, archetypeAnalysis, salesContext = {}) {
  try {
    const archetype = archetypeAnalysis.archetypeData || ARCHETYPES[archetypeAnalysis.archetype];
    if (!archetype) {
      console.error(` Arquétipo ${archetypeAnalysis.archetype} não encontrado`);
      return baseScript;
    }

    const adaptationPrompt = `
Como especialista em comunicação persuasiva e vendas B2B, adapte o roteiro para o arquétipo "${archetype.name}":

ROTEIRO ORIGINAL:
"${baseScript}"

ARQUÉTIPO SELECIONADO: ${archetype.name}
MOTIVAÇÃO CORE: ${archetype.coreMotivation}
VALORES: ${archetype.coreValues.join(', ')}
ESTILO DE VOZ: ${archetype.voiceStyle}

CARACTERÍSTICAS DO ${archetype.name.toUpperCase()}:
${archetype.traits.map(trait => `- ${trait}`).join('\n')}

ABORDAGEM DE VENDAS ESPECÍFICA:
- Discovery: ${archetype.salesApproach.discovery}
- Apresentação: ${archetype.salesApproach.presentation}
- Objeções: ${archetype.salesApproach.objection}
- Fechamento: ${archetype.salesApproach.closing}

CONTEXTO DE VENDAS:
- Persona: ${salesContext.persona || 'PME local'}
- Estágio: ${salesContext.salesStage || 'inicial'}
- Nível Interesse: ${salesContext.interestLevel || '5'}/10
- Objeção: ${salesContext.objection || 'nenhuma'}
- Razão da Seleção: ${archetypeAnalysis.reasoning}

INSTRUÇÕES ESPECÍFICAS:
1. Use EXATAMENTE o tom e linguagem do arquétipo
2. Incorpore os valores core na mensagem
3. Aplique a abordagem de vendas específica
4. Mantenha o foco no resultado de vendas
5. Máximo 150 palavras, natural para WhatsApp
6. Termine com pergunta ou call-to-action alinhado ao arquétipo

Retorne apenas a mensagem adaptada:
`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'user', content: adaptationPrompt }
      ],
      max_tokens: 250,
      temperature: 0.8
    });

    const adaptedScript = response.choices[0].message.content.trim();
    console.log(` Roteiro adaptado para ${archetype.name} (confidence: ${archetypeAnalysis.confidence})`);
    return adaptedScript;
    
  } catch (error) {
    console.error(' Erro ao adaptar roteiro:', error);
    return baseScript;
  }
}

/**
 * Gera script específico para cada estágio de vendas usando o arquétipo
 * @param {Object} archetypeAnalysis - Análise do arquétipo
 * @param {string} salesStage - Estágio atual da venda
 * @param {Object} context - Contexto adicional
 * @returns {Promise<Object>} Scripts para diferentes momentos
 */
export async function generateArchetypeScripts(archetypeAnalysis, salesStage, context = {}) {
  try {
    const archetype = archetypeAnalysis.archetypeData;
    
    const scriptsPrompt = `
Gere scripts específicos para o arquétipo "${archetype.name}" no estágio "${salesStage}":

ARQUÉTIPO: ${archetype.name}
MOTIVAÇÃO: ${archetype.coreMotivation}
ESTILO DE VOZ: ${archetype.voiceStyle}

CONTEXTO:
- Persona: ${context.persona || 'PME Natal/RN'}
- Problema Identificado: ${context.painPoint || 'automação de atendimento'}
- Orçamento Estimado: ${context.budget || 'R$ 500-1500/mês'}

GERE SCRIPTS PARA:
1. ABERTURA: Primeira interação/quebra-gelo
2. DISCOVERY: Pergunta para descobrir dores
3. APRESENTAÇÃO: Como apresentar solução
4. OBJEÇÃO: Resposta para "está caro"
5. FECHAMENTO: Solicitar reunião

FORMATO PARA CADA SCRIPT:
- Máximo 100 palavras cada
- Tom do arquétipo ${archetype.name}
- Específico para PMEs de Natal
- Natural para WhatsApp
- Focado em resultados

RETORNE JSON:
{
  "opening": "script de abertura...",
  "discovery": "pergunta de discovery...", 
  "presentation": "apresentação da solução...",
  "objection": "resposta para objeção preço...",
  "closing": "solicitação de reunião..."
}
`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'user', content: scriptsPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8
    });

    const scripts = JSON.parse(response.choices[0].message.content);
    console.log(` Scripts gerados para ${archetype.name} no estágio ${salesStage}`);
    
    return {
      archetype: archetype.name,
      stage: salesStage,
      scripts: scripts,
      metadata: {
        generated_at: new Date().toISOString(),
        confidence: archetypeAnalysis.confidence,
        reasoning: archetypeAnalysis.reasoning
      }
    };
    
  } catch (error) {
    console.error(' Erro ao gerar scripts:', error);
    return {
      archetype: 'SABIO',
      stage: salesStage,
      scripts: {
        opening: "Oi! Sou o ORBION da Digital Boost. Vejo que você tem um negócio em Natal. Posso te ajudar com algo?",
        discovery: "Me conta, qual sua maior dificuldade hoje no atendimento aos clientes?",
        presentation: "Temos uma solução de IA que já ajudou empresas aqui em Natal a aumentar vendas em até 180%. Quer saber como?",
        objection: "Entendo a preocupação com preço. Mas quanto você perde mensalmente em vendas por não atender rápido? Geralmente é mais que nossa solução custa.",
        closing: "Baseado no que conversamos, acho que uma reunião de 30min com nosso CEO seria ideal. Posso agendar para esta semana?"
      }
    };
  }
}

/**
 * Gera uma mensagem de follow-up baseada no arquétipo para iniciar conversa
 * @param {string} archetypeName - Nome do arquétipo
 * @param {string} leadProfile - Perfil do lead
 * @param {string} audioContext - Contexto do áudio enviado
 * @returns {Promise<string>} Mensagem de follow-up
 */
export async function generateArchetypeFollowUp(archetypeName, leadProfile = '', audioContext = '') {
  try {
    const archetype = ARCHETYPES[archetypeName];
    if (!archetype) return null;

    const followUpPrompt = `
Como ${archetype.name}, crie uma mensagem de texto de follow-up para iniciar uma conversa após o envio de um áudio comercial.

ARQUÉTIPO: ${archetype.name}
ESTILO: ${archetype.voiceStyle}
PERFIL DO LEAD: ${leadProfile}
CONTEXTO DO ÁUDIO: ${audioContext}

CARACTERÍSTICAS DO ${archetype.name.toUpperCase()}:
${archetype.traits.map(trait => `- ${trait}`).join('\n')}

INSTRUÇÕES:
1. Escreva como se fosse uma mensagem de WhatsApp (informal mas profissional)
2. Faça uma pergunta que incentive resposta
3. Mostre interesse genuíno no lead
4. Máximo 2 frases
5. Seja autêntico ao arquétipo

Exemplo de tom para cada arquétipo:
- MESTRE: "Com minha experiência em [área], posso te ajudar a [benefício específico]. Qual é seu maior desafio atual em [área]?"
- AVENTUREIRO: "Que oportunidade incrível podemos explorar juntos! Qual é o próximo grande passo que você quer dar no seu negócio?"

Retorne apenas a mensagem de follow-up:
`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'user', content: followUpPrompt }
      ],
      max_tokens: 100,
      temperature: 0.8
    });

    const followUpMessage = response.choices[0].message.content.trim();
    console.log(` Follow-up gerado para ${archetype.name}`);
    return followUpMessage;
    
  } catch (error) {
    console.error(' Erro ao gerar follow-up:', error);
    return null;
  }
}
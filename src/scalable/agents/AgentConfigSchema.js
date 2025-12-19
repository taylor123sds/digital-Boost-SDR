/**
 * @file AgentConfigSchema.js
 * @description Schema de configuracao dinamica para agentes inteligentes
 *
 * Este schema define TODOS os parametros que alimentam o Planner/Writer/Checker
 * permitindo que cada tenant tenha um agente inteligente adaptado ao seu negocio
 */

/**
 * Setores de negocio suportados
 */
export const BusinessSectors = {
  ENERGIA_SOLAR: 'energia_solar',
  MARKETING_DIGITAL: 'marketing_digital',
  VAREJO: 'varejo',
  ECOMMERCE: 'ecommerce',
  SAAS: 'saas',
  CONSULTORIA: 'consultoria',
  IMOBILIARIO: 'imobiliario',
  EDUCACAO: 'educacao',
  SAUDE: 'saude',
  FINANCEIRO: 'financeiro',
  INDUSTRIA: 'industria',
  SERVICOS_GERAIS: 'servicos_gerais',
  OUTRO: 'outro'
};

/**
 * Tipos de CTA (Call to Action)
 */
export const CTATypes = {
  REUNIAO: 'reuniao',           // Agendar reuniao/call
  DEMONSTRACAO: 'demonstracao', // Demo do produto
  ORCAMENTO: 'orcamento',       // Enviar orcamento
  VISITA: 'visita',             // Visita presencial
  TESTE_GRATIS: 'teste_gratis', // Trial/teste
  WHATSAPP: 'whatsapp',         // Continuar no WhatsApp
  COMPRA: 'compra'              // Compra direta
};

/**
 * Schema completo de configuracao do agente
 */
export const AgentConfigSchema = {
  // ==================== IDENTIDADE DO AGENTE ====================
  identity: {
    agentName: '',           // Nome do agente (ex: "Leadly", "Sofia", "Max")
    companyName: '',         // Nome da empresa
    sector: '',              // BusinessSectors
    role: 'SDR',             // SDR, Vendedor, Suporte, Especialista
    personality: 'consultivo', // consultivo, direto, amigavel, tecnico
    language: 'pt-BR'
  },

  // ==================== CONTEXTO DO NEGOCIO ====================
  business: {
    // O que a empresa faz (resumo para o Planner entender)
    description: '',

    // Proposta de valor principal
    valueProposition: '',

    // Produtos/Servicos oferecidos (lista para o Planner)
    offerings: [],

    // Resumo dos produtos (1 frase para o Writer)
    offeringSummary: '',

    // Publico-alvo ideal
    targetAudience: '',

    // Diferenciais competitivos
    differentials: [],

    // Prova social (cases, numeros, clientes)
    socialProof: '',

    // O que NAO prometer (honestidade)
    honesty: {
      doNotPromise: [],      // Ex: ["resultados garantidos", "leads imediatos"]
      beHonestAbout: []      // Ex: ["prazos de implementacao", "curva de aprendizado"]
    }
  },

  // ==================== CTA - CALL TO ACTION ====================
  cta: {
    type: CTATypes.REUNIAO,
    description: '',          // Ex: "diagnostico gratuito de 30 min"
    valueForLead: '',         // O que o lead GANHA na call (nao o que voce vende)
    duration: '30 min',
    scheduling: {
      enabled: false,         // Se tem calendario integrado
      calendarUrl: '',        // Link do calendario
      availability: ''        // Horarios disponiveis
    }
  },

  // ==================== QUALIFICACAO SPIN ====================
  spinConfig: {
    // Diretivas por fase SPIN (o Planner usa isso)
    phases: {
      situation: {
        name: 'Situacao',
        objective: 'Entender como funciona a operacao hoje - buscar pontos de dor',
        tone: 'Curioso, neutro, buscando brechas',
        dataToCollect: [],    // Campos BANT a coletar nesta fase
        questionTypes: [],    // Tipos de perguntas a fazer
        advanceSignals: [],   // Sinais de que pode avancar
        minTurns: 1
      },
      problem: {
        name: 'Problema',
        objective: 'Amplificar a dor - fazer o lead sentir o custo do problema',
        tone: 'Empatico mas provocativo - custo da dor',
        technique: {
          name: 'Tensao',
          description: 'Transformar problema abstrato em PERDA CONCRETA (R$, tempo, oportunidades)'
        },
        dataToCollect: [],
        questionTypes: [],
        advanceSignals: [],
        minTurns: 1
      },
      implication: {
        name: 'Implicacao',
        objective: 'Amplificar consequencias - o que acontece se nao resolver',
        tone: 'Tensao amplificada - urgencia',
        technique: {
          name: 'Tensao Amplificada',
          description: 'Mostrar impacto a longo prazo e oportunidades perdidas'
        },
        dataToCollect: [],
        questionTypes: [],
        advanceSignals: [],
        minTurns: 1
      },
      needPayoff: {
        name: 'Necessidade-Beneficio',
        objective: 'Direcionar para solucao como proximo passo logico',
        tone: 'Direcional - caminho unico',
        technique: {
          name: 'Direcao',
          description: 'Guiar para conclusao OBVIA. Fazer parecer logico avancar.'
        },
        dataToCollect: [],
        questionTypes: [],
        advanceSignals: [],
        minTurns: 1
      },
      closing: {
        name: 'Fechamento',
        objective: 'Converter interesse em acao concreta',
        tone: 'Assertivo com valor - entregavel claro',
        technique: {
          name: 'Entregavel + Fechamento',
          description: 'Mostrar valor tangivel da call e fechar com alternativa dupla'
        },
        closingTechniques: [
          'alternativa_dupla',  // "Terca ou quinta?"
          'assumir_venda',      // "Vou te mandar o link"
          'urgencia_real'       // "Tenho 2 horarios essa semana"
        ],
        dataToCollect: [],
        minTurns: 1
      }
    },

    // Sinais de transicao entre fases
    transitions: {
      advanceSignals: {},      // { "situation_to_problem": ["indicacao", "instagram"] }
      regressSignals: {
        backToSituation: [],   // Sinais de resistencia total
        backToProblem: []      // Sinais de incerteza
      }
    }
  },

  // ==================== BANT TRACKING ====================
  bantConfig: {
    // Campos BANT a coletar (dinamico por setor)
    fields: {
      // NEED - Necessidades
      // Ex: { campo: "need_volume", label: "Volume mensal", weight: 20, fromPhase: "situation" }
    },

    // Perguntas por campo (Writer usa como referencia)
    questions: {
      // Ex: { "need_volume": "Quantos projetos/vendas fazem por mes?" }
    },

    // Score minimo para considerar qualificado
    qualificationThreshold: 60
  },

  // ==================== HANDLERS DE OBJECOES ====================
  objectionHandlers: {
    // Objecao de preco
    price: {
      detection: [],          // Palavras que indicam objecao de preco
      reframe: '',            // Como reformular
      response: '',           // Resposta padrao
      followUp: ''            // Pergunta de follow-up
    },
    // Objecao de tempo
    time: {
      detection: [],
      reframe: '',
      response: '',
      followUp: ''
    },
    // "Vou pensar"
    think: {
      detection: [],
      reframe: '',
      response: '',
      followUp: ''
    },
    // "Ja tenho..."
    alreadyHave: {
      detection: [],
      reframe: '',
      response: '',
      followUp: ''
    },
    // "Nao preciso"
    noNeed: {
      detection: [],
      reframe: '',
      response: '',
      followUp: ''
    }
  },

  // ==================== REGRAS DE ESTILO ====================
  styleRules: {
    // Palavras proibidas no inicio
    forbiddenStarters: [
      'Entendo', 'Entendi', 'Perfeito', 'Otimo', 'Legal',
      'Certo', 'Claro', 'Ok', 'Maravilha', 'Show', 'Top'
    ],

    // Reconhecimentos permitidos
    allowedAcknowledgments: [
      'Faz sentido.', 'Acontece muito.', 'Vejo isso direto.',
      'E comum.', 'Acontece bastante.'
    ],

    // Limite de linhas
    maxLines: 4,

    // Como terminar mensagem
    mustEndWith: 'UMA pergunta (nunca duas)',

    // Linguagem corporativa proibida
    forbiddenCorporate: [
      'agregar valor', 'solucoes personalizadas', 'parceria estrategica',
      'alavancar', 'potencializar', 'maximizar', 'viabilizar'
    ],

    // Estrutura da mensagem
    messageStructure: {
      gancho: 'Espelhar algo especifico que o lead disse (3-10 palavras)',
      fato: 'Insight/dado que agrega valor (1-2 frases)',
      pergunta: 'UMA pergunta que coleta dado BANT'
    }
  },

  // ==================== BASE DE CONHECIMENTO ====================
  knowledgeBase: {
    // FAQs por categoria
    faqs: {
      // produto: [{ pergunta: '', resposta: '' }],
      // preco: [],
      // processo: [],
      // suporte: []
    },

    // Respostas para perguntas comuns do setor
    commonQuestions: {
      // "como funciona": "",
      // "quanto custa": "",
      // "qual o prazo": ""
    },

    // Informacoes que o agente PODE compartilhar
    canShare: [],

    // Informacoes que requerem humano
    requiresHuman: []
  },

  // ==================== CONFIGURACAO DE IA ====================
  aiConfig: {
    model: 'gpt-4o-mini',
    plannerTemperature: 0.3,   // Baixa para consistencia
    writerTemperature: 0.9,   // Alta para criatividade
    maxTokensPlanner: 1000,
    maxTokensWriter: 300
  },

  // ==================== INTEGRACOES ====================
  integrations: {
    calendar: {
      enabled: false,
      provider: '',           // google, calendly, hubspot
      config: {}
    },
    crm: {
      enabled: false,
      provider: '',           // hubspot, pipedrive, salesforce
      config: {}
    },
    whatsapp: {
      instanceName: '',
      evolutionConfig: {}
    }
  }
};

/**
 * Gera configuracao padrao para um setor
 * @param {string} sector - Setor do negocio
 * @returns {Object} Configuracao base para o setor
 */
export function generateSectorDefaults(sector) {
  const sectorConfigs = {
    [BusinessSectors.ENERGIA_SOLAR]: {
      bantFields: {
        need_caminho_orcamento: { label: 'Como capta orcamentos', weight: 20, fromPhase: 'situation' },
        need_presenca_digital: { label: 'Presenca digital atual', weight: 20, fromPhase: 'situation' },
        need_regiao: { label: 'Regiao de atuacao', weight: 15, fromPhase: 'situation' },
        need_volume: { label: 'Volume de projetos/mes', weight: 15, fromPhase: 'situation' },
        need_problema_sazonalidade: { label: 'Problema com sazonalidade', weight: 10, fromPhase: 'problem' },
        need_problema_dependencia: { label: 'Dependencia de indicacao', weight: 10, fromPhase: 'problem' },
        timing_urgencia: { label: 'Urgencia', weight: 5, fromPhase: 'needPayoff' },
        authority_decisor: { label: 'Quem decide', weight: 5, fromPhase: 'needPayoff' }
      },
      questionTypes: {
        situation: ['Como os clientes chegam ate voces?', 'Quantos projetos fecham por mes?', 'Qual regiao atendem?'],
        problem: ['Tem mes que a demanda varia muito?', 'O que acontece quando nao vem indicacao?'],
        implication: ['Quanto isso impacta no faturamento?', 'Ja perderam projetos por falta de lead?'],
        needPayoff: ['O que mudaria com mais previsibilidade?', 'Faria sentido ter um canal proprio de leads?'],
        closing: ['Posso mostrar como funciona em 20 min?', 'Terca ou quinta fica melhor?']
      },
      objections: {
        price: { reframe: 'Quanto custa nao ter leads previsiveis?' },
        alreadyHave: { reframe: 'Instagram e otimo, mas depende de voce postar. Site trabalha 24h.' }
      }
    },

    [BusinessSectors.VAREJO]: {
      bantFields: {
        need_produtos: { label: 'Tipo de produtos', weight: 20, fromPhase: 'situation' },
        need_canais: { label: 'Canais de venda atuais', weight: 20, fromPhase: 'situation' },
        need_volume_vendas: { label: 'Volume de vendas/mes', weight: 15, fromPhase: 'situation' },
        need_ticket_medio: { label: 'Ticket medio', weight: 15, fromPhase: 'situation' },
        need_problema_estoque: { label: 'Problemas com estoque', weight: 10, fromPhase: 'problem' },
        need_problema_margem: { label: 'Problemas com margem', weight: 10, fromPhase: 'problem' },
        timing_urgencia: { label: 'Urgencia', weight: 5, fromPhase: 'needPayoff' },
        authority_decisor: { label: 'Quem decide', weight: 5, fromPhase: 'needPayoff' }
      },
      questionTypes: {
        situation: ['Que tipo de produtos voces vendem?', 'Como os clientes compram hoje?', 'Qual o ticket medio?'],
        problem: ['Tem produto que encalha no estoque?', 'A margem esta saudavel?'],
        implication: ['Quanto representa em capital parado?', 'Ja teve que dar desconto pra desovar?'],
        needPayoff: ['O que mudaria com mais giro de estoque?', 'Faria sentido ter mais previsibilidade?'],
        closing: ['Posso mostrar como outros lojistas resolveram isso?', 'Terca ou quinta?']
      },
      objections: {
        price: { reframe: 'Quanto custa ter capital parado em estoque?' },
        alreadyHave: { reframe: 'Otimo que ja tem isso! Como esta a performance?' }
      }
    },

    [BusinessSectors.ECOMMERCE]: {
      bantFields: {
        need_plataforma: { label: 'Plataforma atual', weight: 15, fromPhase: 'situation' },
        need_volume_pedidos: { label: 'Volume de pedidos/mes', weight: 20, fromPhase: 'situation' },
        need_ticket_medio: { label: 'Ticket medio', weight: 15, fromPhase: 'situation' },
        need_trafego: { label: 'Fonte de trafego', weight: 15, fromPhase: 'situation' },
        need_problema_conversao: { label: 'Taxa de conversao', weight: 15, fromPhase: 'problem' },
        need_problema_abandono: { label: 'Abandono de carrinho', weight: 10, fromPhase: 'problem' },
        timing_urgencia: { label: 'Urgencia', weight: 5, fromPhase: 'needPayoff' },
        authority_decisor: { label: 'Quem decide', weight: 5, fromPhase: 'needPayoff' }
      },
      questionTypes: {
        situation: ['Qual plataforma usam?', 'Quantos pedidos por mes?', 'De onde vem o trafego?'],
        problem: ['Qual a taxa de conversao?', 'Muito abandono de carrinho?'],
        implication: ['Quanto representa em vendas perdidas?', 'Ja tentaram recuperar carrinhos?'],
        needPayoff: ['O que mudaria com +2% de conversao?', 'Faria sentido automatizar recuperacao?'],
        closing: ['Posso mostrar cases de lojas similares?', 'Terca ou quinta?']
      },
      objections: {
        price: { reframe: 'Quanto vale cada 1% a mais de conversao?' },
        alreadyHave: { reframe: 'Otimo! Qual a taxa atual? Geralmente da pra melhorar.' }
      }
    },

    [BusinessSectors.SAAS]: {
      bantFields: {
        need_produto: { label: 'Tipo de software', weight: 15, fromPhase: 'situation' },
        need_clientes: { label: 'Quantidade de clientes', weight: 15, fromPhase: 'situation' },
        need_mrr: { label: 'MRR atual', weight: 20, fromPhase: 'situation' },
        need_churn: { label: 'Taxa de churn', weight: 15, fromPhase: 'problem' },
        need_cac: { label: 'Custo de aquisicao', weight: 15, fromPhase: 'problem' },
        need_ltv: { label: 'LTV medio', weight: 10, fromPhase: 'situation' },
        timing_urgencia: { label: 'Urgencia', weight: 5, fromPhase: 'needPayoff' },
        authority_decisor: { label: 'Quem decide', weight: 5, fromPhase: 'needPayoff' }
      },
      questionTypes: {
        situation: ['Que tipo de software vendem?', 'Quantos clientes ativos?', 'Qual o MRR?'],
        problem: ['Como esta o churn?', 'Qual o CAC atual?'],
        implication: ['Quanto custa cada cliente perdido?', 'O LTV cobre o CAC?'],
        needPayoff: ['O que mudaria com -2% de churn?', 'Faria sentido ter mais retenção?'],
        closing: ['Posso mostrar como reduzimos churn em 40%?', 'Terca ou quinta?']
      },
      objections: {
        price: { reframe: 'Quanto custa cada cliente que cancela?' },
        alreadyHave: { reframe: 'Otimo! Qual a taxa de churn atual?' }
      }
    },

    [BusinessSectors.CONSULTORIA]: {
      bantFields: {
        need_especialidade: { label: 'Area de especialidade', weight: 15, fromPhase: 'situation' },
        need_clientes: { label: 'Quantidade de clientes', weight: 15, fromPhase: 'situation' },
        need_captacao: { label: 'Como capta clientes', weight: 20, fromPhase: 'situation' },
        need_ticket: { label: 'Ticket medio', weight: 15, fromPhase: 'situation' },
        need_problema_previsibilidade: { label: 'Previsibilidade de receita', weight: 15, fromPhase: 'problem' },
        need_problema_dependencia: { label: 'Dependencia de indicacao', weight: 10, fromPhase: 'problem' },
        timing_urgencia: { label: 'Urgencia', weight: 5, fromPhase: 'needPayoff' },
        authority_decisor: { label: 'Quem decide', weight: 5, fromPhase: 'needPayoff' }
      },
      questionTypes: {
        situation: ['Qual sua area de especialidade?', 'Quantos clientes ativos?', 'Como chegam ate voce?'],
        problem: ['Tem previsibilidade de novos clientes?', 'Depende muito de indicacao?'],
        implication: ['Quanto tempo fica sem projeto novo?', 'Isso impacta no caixa?'],
        needPayoff: ['O que mudaria com mais previsibilidade?', 'Faria sentido ter leads recorrentes?'],
        closing: ['Posso mostrar como outros consultores resolveram?', 'Terca ou quinta?']
      },
      objections: {
        price: { reframe: 'Quanto custa ficar 1 mes sem projeto?' },
        alreadyHave: { reframe: 'Indicacao e otimo! Mas da pra ter mais previsibilidade.' }
      }
    },

    [BusinessSectors.SERVICOS_GERAIS]: {
      bantFields: {
        need_servico: { label: 'Tipo de servico', weight: 20, fromPhase: 'situation' },
        need_regiao: { label: 'Regiao de atuacao', weight: 15, fromPhase: 'situation' },
        need_captacao: { label: 'Como capta clientes', weight: 20, fromPhase: 'situation' },
        need_ticket: { label: 'Ticket medio', weight: 15, fromPhase: 'situation' },
        need_problema_sazonalidade: { label: 'Sazonalidade', weight: 10, fromPhase: 'problem' },
        need_problema_dependencia: { label: 'Dependencia de indicacao', weight: 10, fromPhase: 'problem' },
        timing_urgencia: { label: 'Urgencia', weight: 5, fromPhase: 'needPayoff' },
        authority_decisor: { label: 'Quem decide', weight: 5, fromPhase: 'needPayoff' }
      },
      questionTypes: {
        situation: ['Que tipo de servico voces oferecem?', 'Qual regiao atendem?', 'Como os clientes chegam?'],
        problem: ['Tem variacao de demanda?', 'Depende muito de indicacao?'],
        implication: ['Quanto isso impacta no mes?', 'Ja ficou parado esperando cliente?'],
        needPayoff: ['O que mudaria com demanda mais estavel?', 'Faria sentido ter leads mais previsiveis?'],
        closing: ['Posso mostrar como funciona?', 'Terca ou quinta fica melhor?']
      },
      objections: {
        price: { reframe: 'Quanto custa ficar parado esperando cliente?' },
        alreadyHave: { reframe: 'Otimo que ja tem clientes! Mas da pra ter mais.' }
      }
    }
  };

  return sectorConfigs[sector] || sectorConfigs[BusinessSectors.SERVICOS_GERAIS];
}

/**
 * Valida configuracao do agente
 * @param {Object} config - Configuracao a validar
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export function validateAgentConfig(config) {
  const errors = [];

  // Validacoes obrigatorias
  if (!config.identity?.agentName) errors.push('Nome do agente e obrigatorio');
  if (!config.identity?.companyName) errors.push('Nome da empresa e obrigatorio');
  if (!config.identity?.sector) errors.push('Setor e obrigatorio');

  if (!config.business?.description) errors.push('Descricao do negocio e obrigatoria');
  if (!config.business?.valueProposition) errors.push('Proposta de valor e obrigatoria');
  if (!config.business?.offerings?.length) errors.push('Pelo menos 1 produto/servico e obrigatorio');

  if (!config.cta?.description) errors.push('Descricao do CTA e obrigatoria');

  // Validar BANT config
  if (!config.bantConfig?.fields || Object.keys(config.bantConfig.fields).length < 3) {
    errors.push('Pelo menos 3 campos BANT sao necessarios');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Migration SQL para tabela de configuracoes
 */
export const agentConfigMigration = {
  name: '002_create_agent_configs_table',
  up: `
    CREATE TABLE IF NOT EXISTS agent_configs (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      tenant_id TEXT NOT NULL,
      version INTEGER DEFAULT 1,
      config TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      created_by TEXT,
      FOREIGN KEY (agent_id) REFERENCES agents(id),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id),
      UNIQUE(agent_id, version)
    );
    CREATE INDEX IF NOT EXISTS idx_agent_configs_agent ON agent_configs(agent_id);
    CREATE INDEX IF NOT EXISTS idx_agent_configs_tenant ON agent_configs(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_agent_configs_active ON agent_configs(is_active);
  `
};

export default {
  BusinessSectors,
  CTATypes,
  AgentConfigSchema,
  generateSectorDefaults,
  validateAgentConfig,
  agentConfigMigration
};

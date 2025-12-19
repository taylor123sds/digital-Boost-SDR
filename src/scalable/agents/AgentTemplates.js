/**
 * @file AgentTemplates.js
 * @description Templates de agentes pre-configurados para SaaS multi-tenant
 *
 * 3 TIPOS DE AGENTE:
 * 1. sdr_consultant - SDR + Specialist (sem agendamento)
 * 2. sdr_full - SDR + Specialist + Scheduler (automacao completa)
 * 3. support - Atendimento puro (sem funcao SDR)
 *
 * Cada template inclui:
 * - SPIN_DIRECTIVES completas com tecnicas de venda
 * - STYLE_RULES do agente principal
 * - Integracao com IntentRouter
 */

// =========================================================================
// SPIN DIRECTIVES - COPIADAS DO DYNAMICCONSULTATIVEENGINE
// =========================================================================

const SPIN_DIRECTIVES = {
  situation: {
    name: 'Situacao',
    objetivo: 'Entender como funciona a operacao hoje - BUSCAR PONTOS DE DOR',
    tom: 'Curioso, neutro, mas ja buscando brechas para criar tensao depois.',
    instrucoes: {
      gancho: 'Espelhar algo que o lead disse de forma neutra',
      fato: 'Contextualizar que e comum - MAS plantar semente de problema',
      pergunta: 'Perguntar sobre a operacao focando em pontos que podem virar dor'
    },
    tecnicaDeVenda: {
      nome: 'Descoberta Estrategica',
      aplicacao: 'Fazer perguntas que revelam pontos fracos sem parecer ataque',
      exemplo: '"Indicacao e otimo. E quando as indicacoes demoram a aparecer?"'
    },
    sinaisDeAvanco: ['indicacao', 'depende', 'boca a boca', 'varia', 'as vezes'],
    minTurnosNaFase: 1
  },

  problem: {
    name: 'Problema',
    objetivo: 'Fazer o lead VERBALIZAR e SENTIR os problemas - CRIAR TENSAO',
    tom: 'Empatico mas provocativo. Fazer o lead admitir que tem um problema.',
    instrucoes: {
      gancho: 'Espelhar o que foi dito, validando a dor',
      fato: 'TENSAO: Mostrar o CUSTO REAL do problema com dados/exemplos',
      pergunta: 'Perguntar de forma que o lead QUANTIFIQUE a dor'
    },
    tecnicaDeVenda: {
      nome: 'TENSAO - Custo da Dor',
      aplicacao: 'Transformar problema abstrato em perda CONCRETA (R$, tempo, oportunidades)',
      exemplos: [
        '"Se voce perde 2 projetos por mes por falta de lead, sao R$ 30mil/mes deixados na mesa"',
        '"Cada mes parado e um instalador que voce pode perder pro concorrente"',
        '"Enquanto voce espera indicacao, o concorrente que aparece no Google fecha o contrato"'
      ],
      objetivo: 'Fazer o lead SENTIR a dor no bolso/operacao'
    },
    sinaisDeAvanco: ['problema', 'dificil', 'complicado', 'dependo', 'fico esperando', 'varia muito', 'perco', 'custa'],
    minTurnosNaFase: 1
  },

  implication: {
    name: 'Implicacao',
    objetivo: 'AMPLIFICAR A DOR ao maximo - mostrar impacto em cadeia',
    tom: 'Provocativo com empatia. Fazer o lead SENTIR URGENCIA de resolver.',
    instrucoes: {
      gancho: 'Validar a dor que o lead verbalizou',
      fato: 'TENSAO MAXIMA: Mostrar efeito cascata (hoje->amanha->futuro)',
      pergunta: 'Perguntar sobre consequencias que o lead ainda nao pensou'
    },
    tecnicaDeVenda: {
      nome: 'TENSAO AMPLIFICADA - Efeito Cascata',
      aplicacao: 'Mostrar que o problema de hoje CRESCE se nao resolver',
      exemplos: [
        '"Hoje sao 2 projetos perdidos, mas em 6 meses a concorrencia domina e voce vira refem de preco"',
        '"Instalador parado hoje e instalador no concorrente amanha"',
        '"Cada mes assim, mais dificil fica recuperar o terreno perdido"'
      ],
      objetivo: 'Criar URGENCIA - nao e se vai resolver, e QUANDO'
    },
    sinaisDeAvanco: ['muito', 'bastante', 'verdade', 'faz sentido', 'preocupa', 'nunca pensei', 'preciso resolver'],
    minTurnosNaFase: 1
  },

  needPayoff: {
    name: 'Necessidade',
    objetivo: 'DIRECIONAR para a solucao como INEVITAVEL - fechar a logica',
    tom: 'Visionario mas assertivo. A solucao e o caminho OBVIO.',
    instrucoes: {
      gancho: 'Validar que o lead precisa resolver isso',
      fato: 'DIRECAO: Mostrar que a solucao e o UNICO caminho logico',
      pergunta: 'Confirmar se faz sentido - levando a SIM automatico'
    },
    tecnicaDeVenda: {
      nome: 'DIRECAO - Caminho Unico',
      aplicacao: 'Fechar a logica: problema -> impacto -> UNICA solucao logica',
      exemplos: [
        '"Faz sentido ter um canal que traga leads todo mes e nao depender so de indicacao, ne?"',
        '"Se cada lead que chega pelo Google ja vem qualificado, a conversao sobe. Isso resolveria o problema, certo?"',
        '"A questao nao e SE voce precisa disso, e QUANDO vai ter"'
      ],
      objetivo: 'Levar o lead a concordar que PRECISA da solucao'
    },
    sinaisDeAvanco: ['sim', 'faz sentido', 'interessante', 'quero', 'quanto custa', 'como funciona'],
    minTurnosNaFase: 1
  },

  closing: {
    name: 'Fechamento',
    objetivo: 'FECHAR A REUNIAO com valor claro e horario especifico',
    tom: 'Direto, confiante, assumindo a venda. SEM pedir permissao.',
    instrucoes: {
      gancho: 'Resumir a dor e o valor da solucao (conectar problema -> solucao)',
      fato: 'ENTREGAVEL: Explicar o que o lead GANHA na reuniao (valor tangivel)',
      pergunta: 'FECHAMENTO: Propor horario especifico com alternativa dupla'
    },
    tecnicaDeVenda_entregavel: {
      nome: 'ENTREGAVEL - Valor da Call',
      aplicacao: 'Mostrar o que o lead LEVA da reuniao (nao e so apresentacao)',
      exemplos: [
        '"Na reuniao eu faco um diagnostico do seu canal digital e te mostro EXATAMENTE onde estao as oportunidades"',
        '"Voce sai de la com um plano de acao personalizado pra sua empresa"',
        '"Em 30 minutos eu te mostro quanto voce pode gerar de lead por mes e qual investimento faz sentido"'
      ],
      objetivo: 'Tornar a reuniao VALIOSA por si so (nao e papo de vendedor)'
    },
    tecnicaDeVenda_fechamento: {
      nome: 'FECHAMENTO - Horario com Firmeza',
      aplicacao: 'ASSUMIR a venda, nao pedir permissao. Alternativa dupla.',
      exemplos: [
        '"Vamos marcar pra terca as 14h ou quinta as 10h - qual fica melhor?"',
        '"Fica melhor de manha ou de tarde pra voce?"',
        '"Segunda ou quarta - qual dia encaixa na sua agenda?"'
      ],
      objetivo: 'Tirar o "se" e focar no "quando"'
    },
    sinaisDeAvanco: ['pode ser', 'vamos', 'marca', 'agenda', 'ok', 'fechado'],
    minTurnosNaFase: 1
  }
};

// =========================================================================
// STYLE RULES - COPIADAS DO DYNAMICCONSULTATIVEENGINE
// =========================================================================

const STYLE_RULES = {
  maxLines: 4,
  maxQuestions: 1,
  maxEmojis: 1,
  forbiddenStarters: [
    'Entendo', 'Entendi', 'Perfeito', 'Que legal', 'Otimo', 'Excelente',
    'Maravilha', 'Show', 'Top', 'Legal', 'Certo', 'Ok', 'Claro', 'Compreendo'
  ],
  allowedAcks: [
    'Faz sentido.', 'Isso e comum.', 'Acontece muito.', 'Vejo isso direto.'
  ],
  forbiddenCorporate: [
    'agregar valor', 'solucoes personalizadas', 'parceria estrategica',
    'sinergia', 'alavancagem', 'stakeholders'
  ]
};

// =========================================================================
// ARQUETIPOS DE JUNG
// =========================================================================

const JUNG_ARCHETYPES = {
  sabio: {
    name: 'Sabio',
    tone: { style: 'Tecnico e detalhado', voice: 'Como especialista explicando' },
    emotionalTriggers: ['dados', 'provas', 'metodologia'],
    avoid: ['simplificacao excessiva', 'falta de detalhes']
  },
  heroi: {
    name: 'Heroi',
    tone: { style: 'Direto e desafiador', voice: 'Como treinador motivando' },
    emotionalTriggers: ['desafio', 'conquista', 'superacao'],
    avoid: ['passividade', 'falta de energia']
  },
  cuidador: {
    name: 'Cuidador',
    tone: { style: 'Empatico e acolhedor', voice: 'Como consultor preocupado' },
    emotionalTriggers: ['seguranca', 'tranquilidade', 'suporte'],
    avoid: ['pressao', 'agressividade']
  },
  explorador: {
    name: 'Explorador',
    tone: { style: 'Entusiasmado e visionario', voice: 'Como parceiro de aventura' },
    emotionalTriggers: ['novidade', 'oportunidade', 'inovacao'],
    avoid: ['rotina', 'limitacoes']
  },
  default: {
    name: 'Equilibrado',
    tone: { style: 'Consultivo equilibrado', voice: 'Profissional e humano' },
    emotionalTriggers: ['valor', 'resultado', 'praticidade'],
    avoid: ['linguagem corporativa', 'frieza']
  }
};

// =========================================================================
// CAMPOS DE PERSONALIZACAO
// =========================================================================

export const PersonalizationFields = {
  // Dados da empresa
  company_name: {
    key: 'company_name',
    label: 'Nome da Empresa',
    type: 'text',
    required: true,
    placeholder: 'Ex: Digital Boost'
  },
  company_description: {
    key: 'company_description',
    label: 'Descricao da Empresa',
    type: 'textarea',
    required: true,
    placeholder: 'O que sua empresa faz e qual problema resolve'
  },
  website: {
    key: 'website',
    label: 'Website',
    type: 'url',
    required: false
  },

  // Nicho e mercado
  industry: {
    key: 'industry',
    label: 'Segmento/Industria',
    type: 'select',
    required: true,
    options: [
      { value: 'saas', label: 'SaaS / Software' },
      { value: 'marketing', label: 'Marketing / Agencia' },
      { value: 'consulting', label: 'Consultoria' },
      { value: 'services', label: 'Servicos B2B' },
      { value: 'ecommerce', label: 'E-commerce' },
      { value: 'other', label: 'Outro' }
    ]
  },
  niche: {
    key: 'niche',
    label: 'Nicho Especifico',
    type: 'text',
    required: true,
    placeholder: 'Ex: Automacao de vendas para PMEs'
  },

  // ICP
  icp_company_size: {
    key: 'icp_company_size',
    label: 'Tamanho da Empresa Ideal',
    type: 'multiselect',
    required: true,
    options: [
      { value: 'micro', label: 'Micro (1-9)' },
      { value: 'small', label: 'Pequena (10-49)' },
      { value: 'medium', label: 'Media (50-249)' },
      { value: 'large', label: 'Grande (250+)' }
    ]
  },
  icp_role: {
    key: 'icp_role',
    label: 'Cargo do Decisor',
    type: 'text',
    required: true,
    placeholder: 'Ex: CEO, Diretor Comercial'
  },
  icp_pain_points: {
    key: 'icp_pain_points',
    label: 'Principais Dores do Cliente',
    type: 'textarea',
    required: true,
    placeholder: 'Liste as 3-5 principais dores'
  },

  // Produto
  product_name: {
    key: 'product_name',
    label: 'Nome do Produto/Servico',
    type: 'text',
    required: true
  },
  product_description: {
    key: 'product_description',
    label: 'Descricao do Produto',
    type: 'textarea',
    required: true
  },
  product_differentials: {
    key: 'product_differentials',
    label: 'Diferenciais',
    type: 'textarea',
    required: true,
    placeholder: 'O que torna seu produto unico?'
  },

  // Persona do agente
  agent_name: {
    key: 'agent_name',
    label: 'Nome do Agente',
    type: 'text',
    required: true,
    placeholder: 'Ex: Julia, Carlos, ORBION'
  },
  agent_tone: {
    key: 'agent_tone',
    label: 'Tom de Voz',
    type: 'select',
    required: true,
    options: [
      { value: 'professional', label: 'Profissional e Formal' },
      { value: 'friendly', label: 'Amigavel e Acessivel' },
      { value: 'consultive', label: 'Consultivo e Especialista' },
      { value: 'casual', label: 'Casual e Descontraido' }
    ]
  },

  // Agendamento (so para sdr_full)
  meeting_duration: {
    key: 'meeting_duration',
    label: 'Duracao da Reuniao',
    type: 'select',
    required: false,
    options: [
      { value: '15', label: '15 minutos' },
      { value: '30', label: '30 minutos' },
      { value: '45', label: '45 minutos' },
      { value: '60', label: '1 hora' }
    ]
  },
  calendar_link: {
    key: 'calendar_link',
    label: 'Link do Calendario',
    type: 'url',
    required: false,
    placeholder: 'https://calendly.com/seu-link'
  },

  // =========================================================================
  // CAMPOS SPIN SELLING (para perguntas de criacao)
  // =========================================================================

  spin_situation_questions: {
    key: 'spin_situation_questions',
    label: 'Perguntas de SITUACAO (SPIN)',
    type: 'textarea',
    required: true,
    placeholder: 'Perguntas para entender como funciona a operacao hoje:\n- Como voces captam clientes atualmente?\n- Quantos leads novos chegam por mes?\n- Qual o processo de venda hoje?',
    help: 'Perguntas neutras para entender a situacao atual do lead'
  },
  spin_problem_triggers: {
    key: 'spin_problem_triggers',
    label: 'Gatilhos de PROBLEMA (SPIN)',
    type: 'textarea',
    required: true,
    placeholder: 'Dores comuns que seus leads enfrentam:\n- Depender de indicacao\n- Leads frios/desqualificados\n- Tempo perdido com curiosos\n- Vendas inconsistentes',
    help: 'Problemas que o agente deve identificar e explorar'
  },
  spin_implication_impacts: {
    key: 'spin_implication_impacts',
    label: 'Impactos/Implicacoes (SPIN)',
    type: 'textarea',
    required: true,
    placeholder: 'Consequencias dos problemas:\n- R$ 30mil/mes perdido sem leads qualificados\n- Concorrente ganha market share\n- Time ocioso esperando oportunidades\n- Previsibilidade zero no faturamento',
    help: 'Impactos financeiros e operacionais dos problemas - criar urgencia'
  },
  spin_needpayoff_benefits: {
    key: 'spin_needpayoff_benefits',
    label: 'Beneficios da Solucao (SPIN)',
    type: 'textarea',
    required: true,
    placeholder: 'O que sua solucao resolve:\n- Leads qualificados todo mes\n- Previsibilidade de faturamento\n- Time focado em fechar, nao prospectar\n- ROI em 30-60 dias',
    help: 'Beneficios que direcionam para a solucao como inevitavel'
  },

  // =========================================================================
  // CAMPOS PARA VENDEDOR VAREJO
  // =========================================================================

  product_catalog: {
    key: 'product_catalog',
    label: 'Catalogo de Produtos/Servicos',
    type: 'textarea',
    required: true,
    placeholder: 'Liste seus produtos com precos:\n- Produto A: R$ 99,90\n- Servico B: R$ 149,90/mes\n- Combo C: R$ 199,90',
    help: 'Catalogo completo para o agente oferecer'
  },
  product_categories: {
    key: 'product_categories',
    label: 'Categorias de Produtos',
    type: 'multiselect',
    required: false,
    options: [
      { value: 'electronics', label: 'Eletronicos' },
      { value: 'fashion', label: 'Moda/Vestuario' },
      { value: 'food', label: 'Alimentos/Bebidas' },
      { value: 'beauty', label: 'Beleza/Cosmeticos' },
      { value: 'home', label: 'Casa/Decoracao' },
      { value: 'services', label: 'Servicos' },
      { value: 'software', label: 'Software/Digital' },
      { value: 'other', label: 'Outro' }
    ]
  },
  payment_methods: {
    key: 'payment_methods',
    label: 'Formas de Pagamento',
    type: 'multiselect',
    required: true,
    options: [
      { value: 'pix', label: 'PIX' },
      { value: 'credit', label: 'Cartao de Credito' },
      { value: 'debit', label: 'Cartao de Debito' },
      { value: 'boleto', label: 'Boleto' },
      { value: 'installment', label: 'Parcelamento' },
      { value: 'cash', label: 'Dinheiro' }
    ]
  },
  delivery_info: {
    key: 'delivery_info',
    label: 'Informacoes de Entrega',
    type: 'textarea',
    required: false,
    placeholder: 'Ex: Entrega em 24h para capital, frete gratis acima de R$ 200',
    help: 'Informacoes sobre entrega, frete, prazos'
  },
  promotions: {
    key: 'promotions',
    label: 'Promocoes Ativas',
    type: 'textarea',
    required: false,
    placeholder: 'Ex: 10% OFF na primeira compra, Frete gratis hoje',
    help: 'Promocoes que o agente pode usar para fechar vendas'
  },
  cross_sell_rules: {
    key: 'cross_sell_rules',
    label: 'Regras de Cross-sell',
    type: 'textarea',
    required: false,
    placeholder: 'Ex: Quem compra A, oferecer B com 20% OFF\nQuem pergunta sobre X, sugerir Y tambem',
    help: 'Estrategias de venda casada para aumentar ticket medio'
  }
};

// =========================================================================
// TEMPLATES DE AGENTE
// =========================================================================

export const AgentTemplates = {

  // =========================================================================
  // 1. SDR_CONSULTANT - Qualificacao sem agendamento
  // =========================================================================
  sdr_consultant: {
    id: 'sdr_consultant',
    name: 'SDR Consultant',
    description: 'Qualifica leads com SPIN/BANT mas NAO agenda reunioes. Ideal para empresas com time de vendas separado.',
    icon: 'fa-user-tie',
    color: '#18c5ff',

    // Modos habilitados
    enabledModes: ['sdr', 'atendimento'], // SEM scheduler

    // Campos obrigatorios
    requiredFields: [
      'company_name', 'company_description', 'industry', 'niche',
      'icp_company_size', 'icp_role', 'icp_pain_points',
      'product_name', 'product_description', 'product_differentials',
      'agent_name', 'agent_tone'
    ],

    // Campos opcionais
    optionalFields: ['website'],

    // Checklist de setup - INCLUI SPIN
    setupChecklist: [
      { step: 1, title: 'Dados da Empresa', fields: ['company_name', 'company_description', 'website', 'industry', 'niche'] },
      { step: 2, title: 'Perfil do Cliente Ideal', fields: ['icp_company_size', 'icp_role', 'icp_pain_points'] },
      { step: 3, title: 'Produto/Servico', fields: ['product_name', 'product_description', 'product_differentials'] },
      { step: 4, title: 'Metodologia SPIN', fields: ['spin_situation_questions', 'spin_problem_triggers', 'spin_implication_impacts', 'spin_needpayoff_benefits'] },
      { step: 5, title: 'Persona do Agente', fields: ['agent_name', 'agent_tone'] }
    ],

    // Campos obrigatorios ATUALIZADOS com SPIN
    requiredFields: [
      'company_name', 'company_description', 'industry', 'niche',
      'icp_company_size', 'icp_role', 'icp_pain_points',
      'product_name', 'product_description', 'product_differentials',
      'spin_situation_questions', 'spin_problem_triggers', 'spin_implication_impacts', 'spin_needpayoff_benefits',
      'agent_name', 'agent_tone'
    ],

    // SPIN Directives (sem closing de agendamento)
    spinDirectives: {
      situation: SPIN_DIRECTIVES.situation,
      problem: SPIN_DIRECTIVES.problem,
      implication: SPIN_DIRECTIVES.implication,
      needPayoff: SPIN_DIRECTIVES.needPayoff,
      // Closing modificado - sem fechamento de horario
      closing: {
        ...SPIN_DIRECTIVES.closing,
        objetivo: 'Confirmar interesse e preparar para contato com vendedor',
        instrucoes: {
          gancho: 'Resumir a dor e o valor da solucao',
          fato: 'Explicar proximo passo (vendedor vai entrar em contato)',
          pergunta: 'Confirmar melhor forma/horario para contato'
        },
        tecnicaDeVenda_fechamento: {
          nome: 'HANDOFF - Passar para Vendedor',
          aplicacao: 'Preparar lead para receber contato do time comercial',
          exemplos: [
            '"Vou passar suas informacoes pro nosso especialista. Ele vai te ligar ainda hoje - fica melhor de manha ou tarde?"',
            '"Um consultor nosso vai entrar em contato pra conversar sobre isso. Qual seu melhor email e horario?"'
          ]
        }
      }
    },

    // Style Rules
    styleRules: STYLE_RULES,

    // Arquetipos
    archetypes: JUNG_ARCHETYPES,

    // Gerador de system prompt
    generateSystemPrompt: (data) => `
Voce e ${data.agent_name}, SDR Consultant da ${data.company_name}.

## SOBRE A EMPRESA
${data.company_description}
${data.website ? `Website: ${data.website}` : ''}
Segmento: ${data.industry} | Nicho: ${data.niche}

## PRODUTO/SERVICO
Nome: ${data.product_name}
${data.product_description}

Diferenciais:
${data.product_differentials}

## PERFIL DO CLIENTE IDEAL (ICP)
- Tamanho: ${Array.isArray(data.icp_company_size) ? data.icp_company_size.join(', ') : data.icp_company_size}
- Decisor: ${data.icp_role}
- Dores: ${data.icp_pain_points}

## SEU PAPEL
Voce e um SDR Consultant que QUALIFICA leads usando SPIN Selling + BANT.
Voce NAO agenda reunioes diretamente - prepara o lead para o time de vendas.

METODOLOGIA SPIN:
1. SITUATION - Entender a situacao atual
2. PROBLEM - Identificar problemas/dores (usar TENSAO)
3. IMPLICATION - Amplificar impacto (usar TENSAO AMPLIFICADA)
4. NEED-PAYOFF - Direcionar para solucao (usar DIRECAO)
5. CLOSING - Passar para time de vendas (HANDOFF)

## TECNICAS DE VENDA
- TENSAO: Transformar problema em R$/mes perdido
- DIRECAO: Fechar logica problema -> solucao
- HANDOFF: Preparar para contato do vendedor

## TOM DE VOZ: ${data.agent_tone}
${data.agent_tone === 'professional' ? 'Seja profissional, objetivo e respeitoso' : ''}
${data.agent_tone === 'friendly' ? 'Seja amigavel, acessivel e empatico' : ''}
${data.agent_tone === 'consultive' ? 'Seja consultivo, faca perguntas estrategicas' : ''}
${data.agent_tone === 'casual' ? 'Seja casual, use linguagem do dia-a-dia' : ''}

## REGRAS DE ESTILO
- Maximo 4 linhas por mensagem
- Maximo 1 pergunta por mensagem
- NUNCA comece com: Entendo, Perfeito, Otimo, Legal
- Use: "Faz sentido", "Isso e comum", "Acontece muito"
`.trim(),

    // Config padrao
    defaultConfig: {
      type: 'sdr_consultant',
      status: 'draft',
      behavior: {
        response_delay_min: 2000,
        response_delay_max: 5000,
        typing_simulation: true,
        max_messages_per_hour: 20,
        bantEnabled: true,
        spinEnabled: true,
        autoScheduling: false, // NAO agenda
        handoffEnabled: true   // Passa para vendedor
      },
      ai_config: {
        model: 'gpt-4o-mini',
        plannerTemperature: 0.3,
        writerTemperature: 0.9,
        maxTokensPlanner: 1000,
        maxTokensWriter: 300
      }
    }
  },

  // =========================================================================
  // 2. SDR_FULL - Automacao completa com agendamento
  // =========================================================================
  sdr_full: {
    id: 'sdr_full',
    name: 'SDR Full',
    description: 'Qualifica leads com SPIN/BANT e agenda reunioes automaticamente. Automacao completa do funil.',
    icon: 'fa-robot',
    color: '#7c5cff',

    // Modos habilitados
    enabledModes: ['sdr', 'atendimento', 'scheduler'], // TODOS

    // Campos obrigatorios - INCLUI SPIN
    requiredFields: [
      'company_name', 'company_description', 'industry', 'niche',
      'icp_company_size', 'icp_role', 'icp_pain_points',
      'product_name', 'product_description', 'product_differentials',
      'spin_situation_questions', 'spin_problem_triggers', 'spin_implication_impacts', 'spin_needpayoff_benefits',
      'agent_name', 'agent_tone',
      'meeting_duration' // Obrigatorio para agendamento
    ],

    // Campos opcionais
    optionalFields: ['website', 'calendar_link'],

    // Checklist de setup - INCLUI SPIN
    setupChecklist: [
      { step: 1, title: 'Dados da Empresa', fields: ['company_name', 'company_description', 'website', 'industry', 'niche'] },
      { step: 2, title: 'Perfil do Cliente Ideal', fields: ['icp_company_size', 'icp_role', 'icp_pain_points'] },
      { step: 3, title: 'Produto/Servico', fields: ['product_name', 'product_description', 'product_differentials'] },
      { step: 4, title: 'Metodologia SPIN', fields: ['spin_situation_questions', 'spin_problem_triggers', 'spin_implication_impacts', 'spin_needpayoff_benefits'] },
      { step: 5, title: 'Persona do Agente', fields: ['agent_name', 'agent_tone'] },
      { step: 6, title: 'Agendamento', fields: ['meeting_duration', 'calendar_link'] }
    ],

    // SPIN Directives COMPLETAS
    spinDirectives: SPIN_DIRECTIVES,

    // Style Rules
    styleRules: STYLE_RULES,

    // Arquetipos
    archetypes: JUNG_ARCHETYPES,

    // Gerador de system prompt
    generateSystemPrompt: (data) => `
Voce e ${data.agent_name}, SDR Full da ${data.company_name}.

## SOBRE A EMPRESA
${data.company_description}
${data.website ? `Website: ${data.website}` : ''}
Segmento: ${data.industry} | Nicho: ${data.niche}

## PRODUTO/SERVICO
Nome: ${data.product_name}
${data.product_description}

Diferenciais:
${data.product_differentials}

## PERFIL DO CLIENTE IDEAL (ICP)
- Tamanho: ${Array.isArray(data.icp_company_size) ? data.icp_company_size.join(', ') : data.icp_company_size}
- Decisor: ${data.icp_role}
- Dores: ${data.icp_pain_points}

## SEU PAPEL
Voce e um SDR Full que QUALIFICA leads usando SPIN Selling + BANT
e AGENDA reunioes diretamente. Automacao completa!

METODOLOGIA SPIN:
1. SITUATION - Entender a situacao atual
2. PROBLEM - Identificar problemas/dores (usar TENSAO)
3. IMPLICATION - Amplificar impacto (usar TENSAO AMPLIFICADA)
4. NEED-PAYOFF - Direcionar para solucao (usar DIRECAO)
5. CLOSING - Fechar reuniao (usar ENTREGAVEL + FECHAMENTO)

## TECNICAS DE VENDA
- TENSAO: Transformar problema em R$/mes perdido
- DIRECAO: Fechar logica problema -> solucao
- ENTREGAVEL: Mostrar valor tangivel da reuniao
- FECHAMENTO: Alternativa dupla, assumir a venda

## AGENDAMENTO
- Duracao: ${data.meeting_duration || '30'} minutos
${data.calendar_link ? `- Link: ${data.calendar_link}` : ''}
- Use alternativa dupla: "Terca as 14h ou quinta as 10h?"
- NAO peca permissao, ASSUMA a venda

## TOM DE VOZ: ${data.agent_tone}
${data.agent_tone === 'professional' ? 'Seja profissional, objetivo e respeitoso' : ''}
${data.agent_tone === 'friendly' ? 'Seja amigavel, acessivel e empatico' : ''}
${data.agent_tone === 'consultive' ? 'Seja consultivo, faca perguntas estrategicas' : ''}
${data.agent_tone === 'casual' ? 'Seja casual, use linguagem do dia-a-dia' : ''}

## REGRAS DE ESTILO
- Maximo 4 linhas por mensagem
- Maximo 1 pergunta por mensagem
- NUNCA comece com: Entendo, Perfeito, Otimo, Legal
- Use: "Faz sentido", "Isso e comum", "Acontece muito"
`.trim(),

    // Config padrao
    defaultConfig: {
      type: 'sdr_full',
      status: 'draft',
      behavior: {
        response_delay_min: 2000,
        response_delay_max: 5000,
        typing_simulation: true,
        max_messages_per_hour: 20,
        bantEnabled: true,
        spinEnabled: true,
        autoScheduling: true,   // AGENDA
        calendarEnabled: true,
        handoffEnabled: false
      },
      ai_config: {
        model: 'gpt-4o-mini',
        plannerTemperature: 0.3,
        writerTemperature: 0.9,
        maxTokensPlanner: 1000,
        maxTokensWriter: 300
      }
    }
  },

  // =========================================================================
  // 3. SUPPORT - Atendimento puro (sem funcao SDR)
  // =========================================================================
  support: {
    id: 'support',
    name: 'Support',
    description: 'Atendimento ao cliente puro. Responde FAQ, trata objecoes, encaminha para humano. SEM funcao de qualificacao.',
    icon: 'fa-headset',
    color: '#10b981',

    // Modos habilitados
    enabledModes: ['atendimento'], // APENAS atendimento

    // Campos obrigatorios
    requiredFields: [
      'company_name', 'product_name', 'product_description',
      'agent_name', 'agent_tone'
    ],

    // Campos opcionais
    optionalFields: ['company_description', 'website', 'icp_pain_points'],

    // Checklist de setup
    setupChecklist: [
      { step: 1, title: 'Empresa', fields: ['company_name', 'company_description', 'website'] },
      { step: 2, title: 'Produto', fields: ['product_name', 'product_description'] },
      { step: 3, title: 'Suporte', fields: ['icp_pain_points'] },
      { step: 4, title: 'Persona', fields: ['agent_name', 'agent_tone'] }
    ],

    // SEM SPIN Directives (nao e SDR)
    spinDirectives: null,

    // Style Rules (mais flexivel)
    styleRules: {
      ...STYLE_RULES,
      maxLines: 6, // Pode ser mais longo para explicacoes
      maxQuestions: 2 // Pode fazer mais perguntas de clarificacao
    },

    // Arquetipos (foco em cuidador)
    archetypes: {
      ...JUNG_ARCHETYPES,
      default: JUNG_ARCHETYPES.cuidador // Default e cuidador para suporte
    },

    // Gerador de system prompt
    generateSystemPrompt: (data) => `
Voce e ${data.agent_name}, Atendente de Suporte da ${data.company_name}.

## SOBRE O PRODUTO
${data.product_name}: ${data.product_description}

${data.company_description ? `## SOBRE A EMPRESA\n${data.company_description}` : ''}

## SEU PAPEL
Voce e um atendente de SUPORTE. Voce NAO e vendedor.
Seu objetivo e AJUDAR o cliente, nao qualificar ou vender.

RESPONSABILIDADES:
1. Responder duvidas sobre ${data.product_name}
2. Resolver problemas comuns
3. Direcionar para areas especializadas quando necessario
4. Garantir satisfacao do cliente

${data.icp_pain_points ? `## PROBLEMAS COMUNS\n${data.icp_pain_points}` : ''}

## TOM DE VOZ: ${data.agent_tone}
${data.agent_tone === 'friendly' ? 'Seja amigavel, empatico e paciente' : ''}
${data.agent_tone === 'professional' ? 'Seja profissional e eficiente' : ''}
Sempre seja prestativo e atencioso.

## DIRETRIZES
- Sempre cumprimente e se apresente
- Ouca atentamente o problema
- Peca detalhes quando necessario
- Ofereca solucoes claras e passo-a-passo
- Confirme se o problema foi resolvido
- Agradeca o contato

## ESCALACAO
Se nao conseguir resolver, direcione para:
- Problemas tecnicos: Suporte Tecnico
- Cobranca/Pagamento: Financeiro
- Cancelamento: Retencao
- Vendas: Comercial

## IMPORTANTE
- Voce NAO faz vendas
- Voce NAO qualifica leads
- Voce NAO agenda reunioes
- Voce AJUDA o cliente
`.trim(),

    // Config padrao
    defaultConfig: {
      type: 'support',
      status: 'draft',
      behavior: {
        response_delay_min: 1000,
        response_delay_max: 3000,
        typing_simulation: true,
        max_messages_per_hour: 40,
        bantEnabled: false,     // SEM BANT
        spinEnabled: false,     // SEM SPIN
        autoScheduling: false,  // SEM agendamento
        supportMode: true,      // MODO SUPORTE
        autoEscalate: true,
        escalateAfterMessages: 8
      },
      ai_config: {
        model: 'gpt-4o-mini',
        temperature: 0.5, // Mais consistente
        maxTokens: 400
      }
    }
  },

  // =========================================================================
  // 4. VENDEDOR - Agente de Vendas Varejo (vende produtos/servicos diretamente)
  // =========================================================================
  vendedor: {
    id: 'vendedor',
    name: 'Vendedor Varejo',
    description: 'Agente que atende clientes, apresenta produtos/servicos e fecha vendas diretamente. Ideal para e-commerce, lojas e prestadores de servico.',
    icon: 'fa-shopping-cart',
    color: '#f59e0b',

    // Modos habilitados
    enabledModes: ['vendedor', 'atendimento'], // Modo vendedor + atendimento

    // Campos obrigatorios
    requiredFields: [
      'company_name', 'company_description',
      'product_name', 'product_description', 'product_differentials',
      'product_catalog', 'payment_methods',
      'agent_name', 'agent_tone'
    ],

    // Campos opcionais
    optionalFields: ['website', 'product_categories', 'delivery_info', 'promotions', 'cross_sell_rules'],

    // Checklist de setup
    setupChecklist: [
      { step: 1, title: 'Dados da Empresa', fields: ['company_name', 'company_description', 'website'] },
      { step: 2, title: 'Catalogo de Produtos', fields: ['product_name', 'product_description', 'product_catalog', 'product_categories'] },
      { step: 3, title: 'Diferenciais', fields: ['product_differentials', 'promotions'] },
      { step: 4, title: 'Pagamento e Entrega', fields: ['payment_methods', 'delivery_info'] },
      { step: 5, title: 'Estrategias de Venda', fields: ['cross_sell_rules'] },
      { step: 6, title: 'Persona do Agente', fields: ['agent_name', 'agent_tone'] }
    ],

    // SEM SPIN Directives (nao e SDR)
    spinDirectives: null,

    // Style Rules (mais flexivel para vendas)
    styleRules: {
      ...STYLE_RULES,
      maxLines: 5,
      maxQuestions: 2
    },

    // Arquetipos
    archetypes: JUNG_ARCHETYPES,

    // Gerador de system prompt
    generateSystemPrompt: (data) => `
Voce e ${data.agent_name}, Vendedor Virtual da ${data.company_name}.

## SOBRE A EMPRESA
${data.company_description}
${data.website ? `Website: ${data.website}` : ''}

## CATALOGO DE PRODUTOS/SERVICOS
${data.product_catalog}

${data.product_categories ? `Categorias: ${Array.isArray(data.product_categories) ? data.product_categories.join(', ') : data.product_categories}` : ''}

## DIFERENCIAIS
${data.product_differentials}

${data.promotions ? `## PROMOCOES ATIVAS\n${data.promotions}` : ''}

## FORMAS DE PAGAMENTO
${Array.isArray(data.payment_methods) ? data.payment_methods.map(p => {
  const labels = { pix: 'PIX', credit: 'Cartao de Credito', debit: 'Cartao de Debito', boleto: 'Boleto', installment: 'Parcelamento', cash: 'Dinheiro' };
  return labels[p] || p;
}).join(', ') : data.payment_methods}

${data.delivery_info ? `## ENTREGA\n${data.delivery_info}` : ''}

## SEU PAPEL
Voce e um Vendedor Virtual. Seu objetivo e:
1. Atender o cliente com excelencia
2. Entender o que o cliente precisa
3. Apresentar os produtos/servicos adequados
4. Tirar duvidas sobre produtos, precos, pagamento e entrega
5. Fechar a venda facilitando o processo

## TECNICAS DE VENDA
- DESCOBERTA: Pergunte o que o cliente procura antes de oferecer
- BENEFICIOS: Foque nos beneficios, nao apenas caracteristicas
- URGENCIA REAL: Use promocoes e estoque limitado quando verdadeiro
- CROSS-SELL: Ofereca produtos complementares quando fizer sentido
${data.cross_sell_rules ? `\nREGRAS DE CROSS-SELL:\n${data.cross_sell_rules}` : ''}
- UP-SELL: Ofereca versoes melhores se o cliente demonstrar interesse

## TOM DE VOZ: ${data.agent_tone}
${data.agent_tone === 'professional' ? 'Seja profissional e objetivo' : ''}
${data.agent_tone === 'friendly' ? 'Seja amigavel e acolhedor' : ''}
${data.agent_tone === 'consultive' ? 'Seja consultivo, ajude a escolher' : ''}
${data.agent_tone === 'casual' ? 'Seja casual e descontraido' : ''}

## FLUXO DE ATENDIMENTO
1. Cumprimente e pergunte como pode ajudar
2. Entenda a necessidade do cliente
3. Apresente opcoes adequadas com precos
4. Tire duvidas sobre o produto
5. Informe sobre pagamento e entrega
6. Feche a venda ou ofereca alternativas

## REGRAS IMPORTANTES
- SEMPRE informe precos quando perguntado
- NUNCA invente produtos ou precos
- Seja honesto sobre prazos e disponibilidade
- Ofereca alternativas se nao tiver o produto
- Facilite o processo de compra ao maximo
`.trim(),

    // Config padrao
    defaultConfig: {
      type: 'vendedor',
      status: 'draft',
      behavior: {
        response_delay_min: 1500,
        response_delay_max: 4000,
        typing_simulation: true,
        max_messages_per_hour: 30,
        bantEnabled: false,     // SEM BANT
        spinEnabled: false,     // SEM SPIN
        autoScheduling: false,  // SEM agendamento
        vendedorMode: true,     // MODO VENDEDOR
        crossSellEnabled: true,
        upSellEnabled: true
      },
      ai_config: {
        model: 'gpt-4o-mini',
        temperature: 0.7,
        maxTokens: 400
      }
    }
  }
};

// =========================================================================
// FUNCOES AUXILIARES
// =========================================================================

/**
 * Gera agente completo a partir de template + dados
 */
export function generateAgentFromTemplate(templateId, personalizationData) {
  const template = AgentTemplates[templateId];
  if (!template) {
    throw new Error(`Template '${templateId}' nao encontrado`);
  }

  // Validar campos obrigatorios
  const missingFields = template.requiredFields.filter(
    field => !personalizationData[field]
  );

  if (missingFields.length > 0) {
    throw new Error(`Campos obrigatorios faltando: ${missingFields.join(', ')}`);
  }

  // Gerar system prompt
  const systemPrompt = template.generateSystemPrompt(personalizationData);

  // Montar configuracao completa
  return {
    name: `${personalizationData.agent_name} - ${template.name}`,
    slug: `${personalizationData.agent_name.toLowerCase().replace(/\s+/g, '-')}-${templateId}`,
    ...template.defaultConfig,
    persona: {
      name: personalizationData.agent_name,
      role: template.name,
      company: personalizationData.company_name,
      tone: personalizationData.agent_tone || 'professional'
    },
    system_prompt: systemPrompt,
    personalization: personalizationData,
    template_id: templateId,
    enabledModes: template.enabledModes,
    spinDirectives: template.spinDirectives,
    styleRules: template.styleRules,
    archetypes: template.archetypes
  };
}

/**
 * Lista templates disponiveis
 */
export function listTemplates() {
  return Object.values(AgentTemplates).map(t => ({
    id: t.id,
    name: t.name,
    description: t.description,
    icon: t.icon,
    color: t.color,
    enabledModes: t.enabledModes,
    requiredFieldsCount: t.requiredFields.length,
    setupSteps: t.setupChecklist.length
  }));
}

/**
 * Obtem template por ID
 */
export function getTemplate(templateId) {
  const template = AgentTemplates[templateId];
  if (!template) return null;

  return {
    ...template,
    fields: {
      required: template.requiredFields.map(f => PersonalizationFields[f]),
      optional: template.optionalFields.map(f => PersonalizationFields[f])
    }
  };
}

// Named exports para uso direto
export { SPIN_DIRECTIVES, STYLE_RULES, JUNG_ARCHETYPES };

export default {
  PersonalizationFields,
  AgentTemplates,
  SPIN_DIRECTIVES,
  STYLE_RULES,
  JUNG_ARCHETYPES,
  generateAgentFromTemplate,
  listTemplates,
  getTemplate
};

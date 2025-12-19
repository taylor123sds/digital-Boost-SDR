/**
 * TEMPLATE DE CONFIGURACAO DO CLIENTE
 * Campos variaveis que cada empresa/agente deve configurar
 */

export const CLIENT_CONFIG_TEMPLATE = {
  // ============================================
  // 1. IDENTIFICACAO DA EMPRESA
  // ============================================
  empresa: {
    nome: '',                    // Nome da empresa
    segmento: '',                // Ex: "Tecnologia", "Varejo", "Servicos"
    descricao: '',               // Breve descricao do negocio
    site: '',                    // URL do site
    cnpj: '',                    // CNPJ (opcional)
  },

  // ============================================
  // 2. CONFIGURACAO DO AGENTE
  // ============================================
  agente: {
    nome: '',                    // Nome do agente (ex: "Luna", "Max")
    tipo: 'sdr',                 // sdr | specialist | scheduler | support
    vertical: 'servicos',        // varejo | servicos
    objetivo: '',                // Objetivo principal (ex: "Agendar reunioes")
    kpis: [],                    // Ex: ["reunioes_agendadas", "leads_qualificados"]
  },

  // ============================================
  // 3. ICP (IDEAL CUSTOMER PROFILE)
  // ============================================
  icp: {
    segmentos: [],               // Ex: ["E-commerce", "SaaS", "Agencias"]
    faturamento_min: '',         // Ex: "R$ 500k/ano"
    faturamento_max: '',         // Ex: "R$ 10M/ano"
    num_funcionarios_min: 0,
    num_funcionarios_max: 0,
    cargos_alvo: [],             // Ex: ["CEO", "CMO", "Head de Marketing"]
    regiao: [],                  // Ex: ["Brasil", "SP", "Sul"]
    sinais_compra: [],           // Ex: ["Contratando", "Expandindo", "Levantou rodada"]
    desqualificadores: [],       // Ex: ["Empresa familiar", "Governo"]
  },

  // ============================================
  // 4. PRODUTOS/SERVICOS
  // ============================================
  catalogo: [
    {
      id: '',
      nome: '',
      descricao: '',
      preco: '',
      beneficios: [],
      diferenciais: [],
      objecoes_comuns: [],
    }
  ],

  // ============================================
  // 5. ESTILO E VOZ DA MARCA
  // ============================================
  brandVoice: {
    tom: 'profissional',         // formal | profissional | casual | descontraido
    tratamento: 'voce',          // voce | senhor/senhora
    emojis: false,               // Usar emojis?
    girias: false,               // Usar girias/expressoes informais?
    palavras_proibidas: [],      // Ex: ["barato", "problema"]
    palavras_preferidas: [],     // Ex: ["investimento", "oportunidade"]
    assinatura: '',              // Ex: "Abracos, [Nome]"
  },

  // ============================================
  // 6. HORARIOS E DISPONIBILIDADE
  // ============================================
  disponibilidade: {
    timezone: 'America/Sao_Paulo',
    horario_atendimento: {
      inicio: '08:00',
      fim: '18:00',
    },
    dias_atendimento: ['seg', 'ter', 'qua', 'qui', 'sex'],
    feriados: [],                // Lista de datas sem atendimento
    mensagem_fora_horario: 'Obrigado pelo contato! Nosso horario de atendimento e de segunda a sexta, das 8h as 18h. Retornaremos assim que possivel.',
  },

  // ============================================
  // 7. INTEGRACAO E CANAIS
  // ============================================
  canais: {
    whatsapp: {
      habilitado: true,
      numero: '',
      instance: '',
    },
    email: {
      habilitado: false,
      remetente: '',
    },
    chat: {
      habilitado: false,
      widget_id: '',
    },
  },

  // ============================================
  // 8. CALENDARIO E AGENDAMENTO
  // ============================================
  agendamento: {
    habilitado: true,
    duracao_padrao: 30,          // minutos
    antecedencia_minima: 2,      // horas
    antecedencia_maxima: 30,     // dias
    buffer_entre_reunioes: 15,   // minutos
    link_calendario: '',         // Calendly, Cal.com, etc.
    tipos_reuniao: [
      {
        id: 'discovery',
        nome: 'Reuniao de Discovery',
        duracao: 30,
        descricao: 'Conversa inicial para entender suas necessidades',
      },
      {
        id: 'demo',
        nome: 'Demonstracao do Produto',
        duracao: 45,
        descricao: 'Apresentacao detalhada da solucao',
      },
    ],
  },

  // ============================================
  // 9. QUALIFICACAO (BANT)
  // ============================================
  qualificacao: {
    criterios_obrigatorios: ['need', 'authority'],
    criterios_desejaveis: ['budget', 'timeline'],
    pontuacao_minima: 60,        // 0-100 para passar para vendas
    perguntas_customizadas: [],
  },

  // ============================================
  // 10. HANDOFF E ESCALACAO
  // ============================================
  handoff: {
    vendedor_responsavel: '',    // Nome ou email
    canal_notificacao: 'whatsapp', // whatsapp | email | slack
    webhook_notificacao: '',     // URL do webhook
    criterios_escalacao: [
      'cliente_irritado',
      'problema_tecnico',
      'solicitacao_juridica',
    ],
  },

  // ============================================
  // 11. FAQ E BASE DE CONHECIMENTO
  // ============================================
  conhecimento: {
    faqs: [],                    // Array de {pergunta, resposta, keywords}
    documentos: [],              // Array de {titulo, conteudo, categoria}
    links_uteis: [],             // Array de {titulo, url, descricao}
  },

  // ============================================
  // 12. COMPLIANCE E RESTRICOES
  // ============================================
  compliance: {
    lgpd_consentimento: true,    // Exigir consentimento LGPD?
    opt_out_keywords: ['parar', 'sair', 'cancelar', 'nao quero'],
    dados_sensiveis_permitidos: [], // Ex: ['cpf_ultimos_digitos']
    mensagem_opt_out: 'Entendido. Voce foi removido da nossa lista. Se mudar de ideia, e so entrar em contato.',
    aviso_gravacao: false,       // Avisar que conversa esta sendo gravada?
  },
};

/**
 * Funcao para criar configuracao com valores padrao
 */
export function createClientConfig(overrides = {}) {
  return deepMerge(CLIENT_CONFIG_TEMPLATE, overrides);
}

/**
 * Deep merge de objetos
 */
function deepMerge(target, source) {
  const result = { ...target };
  for (const key in source) {
    if (source[key] instanceof Object && key in target) {
      result[key] = deepMerge(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

export default { CLIENT_CONFIG_TEMPLATE, createClientConfig };

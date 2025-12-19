/**
 * SISTEMA UNIFICADO DE SEGMENTOS
 * Resolve inconsistências entre businessIndicators, segmentMap e contexts
 * @version 1.0.0 - Mapeamento Único e Consistente
 */

/**
 * DEFINIÇÃO UNIFICADA DE TODOS OS SEGMENTOS
 * Fonte única de verdade para evitar conflitos
 */
export const UNIFIED_SEGMENTS = {
  dentista: {
    // Detecção por palavras-chave
    keywords: ['dentista', 'odonto', 'consultório dental', 'clínica odontológica', 'ortodontia'],

    // Mapeamento para sistema de voz
    voiceMapping: 'ODONTOLOGIA',

    // Nome para exibição
    displayName: 'Dentistas',

    // Contexto específico do segmento
    context: {
      name: 'Dentistas',
      painPoints: ['Agenda lotada', 'Cancelamentos', 'Gestão de pacientes'],
      opportunities: ['Automação de agendamentos', 'Follow-up pós-consulta', 'Lembretes automáticos'],
      approach: 'Foco na eficiência operacional e satisfação do paciente'
    },

    // Templates específicos
    hooks: {
      opening: "Para consultórios odontológicos, a automação de agendamentos pode reduzir até 70% das ligações.",
      question: "Como vocês lidam com confirmações de consulta e reagendamentos hoje?",
      value: "Sistemas que automatizam WhatsApp + gestão de agenda = mais tempo para focar nos pacientes"
    },

    // CTA específico para o segmento
    cta: {
      primary: "Que tal ver como funciona para um consultório como o seu?",
      options: ["Hoje 14h ou 16h?", "Amanhã 10h ou 15h?"]
    }
  },

  nutricionista: {
    keywords: ['nutri', 'nutricionista', 'consultório nutricional', 'dietista'],
    voiceMapping: 'NUTRIÇÃO',
    displayName: 'Nutricionistas',
    context: {
      name: 'Nutricionistas',
      painPoints: ['Acompanhamento de dietas', 'Motivação dos pacientes', 'Reagendamentos'],
      opportunities: ['Lembretes de consulta', 'Dicas automáticas', 'Acompanhamento contínuo'],
      approach: 'Ênfase no relacionamento contínuo e acompanhamento'
    },
    hooks: {
      opening: "Nutricionistas que automatizam o acompanhamento veem 60% mais aderência dos pacientes.",
      question: "Como fazem o acompanhamento dos pacientes entre as consultas?",
      value: "WhatsApp automatizado = paciente mais engajado = melhores resultados"
    },
    cta: {
      primary: "Posso mostrar como funciona para nutricionistas?",
      options: ["Hoje à tarde ou amanhã de manhã?", "Prefere 14h ou 16h?"]
    }
  },

  personal: {
    keywords: ['personal', 'personal trainer', 'academia', 'treinador'],
    voiceMapping: 'FITNESS',
    displayName: 'Personal Trainers',
    context: {
      name: 'Personal Trainers',
      painPoints: ['Motivação de alunos', 'Horários vagos', 'Cobrança de mensalidades'],
      opportunities: ['Lembretes de treino', 'Motivação automática', 'Gestão de horários'],
      approach: 'Foco na motivação e consistência dos alunos'
    },
    hooks: {
      opening: "Personal trainers com automação mantêm 80% mais alunos ativos.",
      question: "Como mantêm os alunos motivados e organizados com os treinos?",
      value: "Sistema que lembra, motiva e organiza = alunos mais resultados = mais indicações"
    },
    cta: {
      primary: "Quer ver como outros personals usam automação?",
      options: ["Final da tarde ou noite?", "Manhã ou tarde amanhã?"]
    }
  },

  doceira: {
    keywords: ['doce', 'doceira', 'confeitaria', 'brigadeiro', 'bolo'],
    voiceMapping: 'CONFEITARIA',
    displayName: 'Doceiras',
    context: {
      name: 'Doceiras',
      painPoints: ['Pedidos via WhatsApp', 'Organização de entregas', 'Sazonalidade'],
      opportunities: ['Catálogo automático', 'Gestão de pedidos', 'Lembretes sazonais'],
      approach: 'Foco na organização de pedidos e vendas'
    },
    hooks: {
      opening: "Doceiras que automatizam pedidos vendem 50% mais e se estressam menos.",
      question: "Como organizam os pedidos e entregas pelo WhatsApp hoje?",
      value: "Sistema que organiza pedidos + catalogo automático = mais vendas, menos bagunça"
    },
    cta: {
      primary: "Posso mostrar como organizar melhor os pedidos?",
      options: ["Manhã ou tarde?", "Hoje ou amanhã?"]
    }
  },

  fotografo: {
    keywords: ['foto', 'fotógrafo', 'ensaio', 'casamento', 'evento'],
    voiceMapping: 'FOTOGRAFIA',
    displayName: 'Fotógrafos',
    context: {
      name: 'Fotógrafos',
      painPoints: ['Agendamento de ensaios', 'Entrega de fotos', 'Captação de clientes'],
      opportunities: ['Automação de agendamento', 'Galeria automática', 'Follow-up pós-evento'],
      approach: 'Ênfase na experiência do cliente e profissionalismo'
    },
    hooks: {
      opening: "Fotógrafos com automação profissional aumentam 40% as indicações.",
      question: "Como organizam agendamentos e entregas de material para clientes?",
      value: "Sistema profissional = cliente impressionado = mais indicações = agenda cheia"
    },
    cta: {
      primary: "Quer ver como profissionalizar ainda mais seu atendimento?",
      options: ["Semana que vem?", "Final de semana ou semana?"]
    }
  },

  barbearia: {
    keywords: ['barbeiro', 'barbearia', 'cabelo', 'barba'],
    voiceMapping: 'BARBEARIA',
    displayName: 'Barbearias',
    context: {
      name: 'Barbearias',
      painPoints: ['Agenda de horários', 'No-show', 'Fidelização'],
      opportunities: ['Confirmação automática', 'Lembretes', 'Programa de fidelidade'],
      approach: 'Foco na redução de no-show e fidelização'
    },
    hooks: {
      opening: "Barbearias com confirmação automática reduzem 70% dos furos de agenda.",
      question: "Como fazem para confirmar horários e evitar clientes que não aparecem?",
      value: "Confirmação automática + lembretes = agenda sempre cheia, sem frustrações"
    },
    cta: {
      primary: "Posso mostrar como nunca mais ter horário vago?",
      options: ["Depois das 18h?", "Final de semana?"]
    }
  },

  restaurante: {
    keywords: ['restaurante', 'lanchonete', 'delivery', 'comida', 'cardápio'],
    voiceMapping: 'RESTAURANTES',
    displayName: 'Restaurantes',
    context: {
      name: 'Restaurantes',
      painPoints: ['Pedidos delivery', 'Cardápio atualizado', 'Horário de funcionamento'],
      opportunities: ['Cardápio automático', 'Pedidos organizados', 'Promoções automáticas'],
      approach: 'Foco na eficiência de pedidos e satisfação do cliente'
    },
    hooks: {
      opening: "Restaurantes com cardápio automático aumentam 35% os pedidos via WhatsApp.",
      question: "Como organizam os pedidos delivery e mantêm cardápio atualizado?",
      value: "Cardápio sempre atualizado + pedidos organizados = mais vendas, menos confusão"
    },
    cta: {
      primary: "Posso mostrar como automatizar os pedidos?",
      options: ["Manhã ou tarde?", "Entre os horários de movimento?"]
    }
  },

  loja: {
    keywords: ['loja', 'varejo', 'vendas', 'produtos', 'estoque'],
    voiceMapping: 'LOJAS',
    displayName: 'Lojas',
    context: {
      name: 'Lojas',
      painPoints: ['Catálogo via WhatsApp', 'Controle de estoque', 'Atendimento rápido'],
      opportunities: ['Catálogo automático', 'Consulta de produtos', 'Promoções direcionadas'],
      approach: 'Foco em vendas e experiência de compra'
    },
    hooks: {
      opening: "Lojas com catálogo automático vendem 45% mais pelo WhatsApp.",
      question: "Como mostram produtos e fazem vendas pelo WhatsApp hoje?",
      value: "Catálogo profissional + atendimento rápido = cliente satisfeito = mais vendas"
    },
    cta: {
      primary: "Quer ver como aumentar suas vendas pelo WhatsApp?",
      options: ["Hoje à tarde?", "Amanhã de manhã?"]
    }
  },

  clinica: {
    keywords: ['clínica', 'médico', 'consulta', 'exame', 'saúde'],
    voiceMapping: 'SAÚDE',
    displayName: 'Clínicas',
    context: {
      name: 'Clínicas',
      painPoints: ['Agendamento de consultas', 'Confirmações', 'Lembretes de exames'],
      opportunities: ['Automação completa', 'Lembretes de retorno', 'Satisfação do paciente'],
      approach: 'Ênfase na qualidade do atendimento e eficiência'
    },
    hooks: {
      opening: "Clínicas com automação reduzem 60% das ligações e melhoram satisfação.",
      question: "Como fazem agendamentos e confirmações de consultas hoje?",
      value: "Sistema completo = paciente bem atendido = clínica mais organizada"
    },
    cta: {
      primary: "Posso mostrar como funciona para clínicas?",
      options: ["Entre os atendimentos?", "Final do expediente?"]
    }
  },

  advogado: {
    keywords: ['advogado', 'escritório', 'jurídico', 'advocacia', 'direito'],
    voiceMapping: 'JURÍDICO',
    displayName: 'Advogados',
    context: {
      name: 'Advogados',
      painPoints: ['Agendamento de reuniões', 'Acompanhamento de processos', 'Captação'],
      opportunities: ['Automação profissional', 'Follow-up de casos', 'Relacionamento'],
      approach: 'Foco no profissionalismo e relacionamento de longo prazo'
    },
    hooks: {
      opening: "Escritórios com automação profissional captam 40% mais clientes.",
      question: "Como organizam agendamentos e mantêm contato com clientes?",
      value: "Atendimento profissional automatizado = mais credibilidade = mais casos"
    },
    cta: {
      primary: "Posso mostrar como profissionalizar ainda mais o atendimento?",
      options: ["Horário comercial?", "Final da tarde?"]
    }
  },

  // Segmento genérico para casos não identificados
  generic: {
    keywords: ['negócio', 'empresa', 'vendas', 'clientes'],
    voiceMapping: 'GERAL',
    displayName: 'Negócios em Geral',
    context: {
      name: 'Empreendedores',
      painPoints: ['Atendimento no WhatsApp', 'Organização', 'Mais vendas'],
      opportunities: ['Automação inteligente', 'Melhor atendimento', 'Mais eficiência'],
      approach: 'Abordagem adaptável baseada nas necessidades específicas'
    },
    hooks: {
      opening: "Empresas que automatizam WhatsApp aumentam 40% a eficiência no atendimento.",
      question: "Como funciona o atendimento no WhatsApp do seu negócio hoje?",
      value: "Automação inteligente = clientes mais satisfeitos = negócio mais organizado"
    },
    cta: {
      primary: "Posso mostrar como funciona para seu tipo de negócio?",
      options: ["Hoje ou amanhã?", "Manhã ou tarde?"]
    }
  }
};

/**
 * Detecta segmento baseado em perfil e mensagem
 * @param {object} profile - Perfil do WhatsApp
 * @param {string} text - Texto da mensagem
 * @returns {string} Segmento detectado
 */
export function detectSegment(profile, text) {
  const combined = `${profile?.name || ''} ${profile?.status || ''} ${text || ''}`.toLowerCase();

  // Busca por cada segmento em ordem de prioridade
  for (const [segmentKey, segment] of Object.entries(UNIFIED_SEGMENTS)) {
    if (segmentKey === 'generic') continue; // Generic é último

    const matches = segment.keywords.some(keyword => combined.includes(keyword));
    if (matches) {
      console.log(`🎯 SEGMENTO DETECTADO: ${segment.displayName} (${segmentKey})`);
      return segmentKey;
    }
  }

  console.log(`🎯 SEGMENTO DETECTADO: Generic (nenhuma palavra-chave encontrada)`);
  return 'generic';
}

/**
 * Obtém dados completos de um segmento
 * @param {string} segmentKey - Chave do segmento
 * @returns {object} Dados completos do segmento
 */
export function getSegmentData(segmentKey) {
  return UNIFIED_SEGMENTS[segmentKey] || UNIFIED_SEGMENTS.generic;
}

/**
 * Lista todos os segmentos disponíveis
 * @returns {Array} Lista de segmentos
 */
export function getAllSegments() {
  return Object.keys(UNIFIED_SEGMENTS);
}

/**
 * Obtém mapeamento para sistema de voz
 * @param {string} segmentKey - Chave do segmento
 * @returns {string} Mapeamento de voz
 */
export function getVoiceMapping(segmentKey) {
  const segment = getSegmentData(segmentKey);
  return segment.voiceMapping;
}

/**
 * Obtém contexto específico do segmento
 * @param {string} segmentKey - Chave do segmento
 * @returns {object} Contexto do segmento
 */
export function getSegmentContext(segmentKey) {
  const segment = getSegmentData(segmentKey);
  return segment.context;
}

/**
 * Obtém hooks específicos do segmento
 * @param {string} segmentKey - Chave do segmento
 * @returns {object} Hooks do segmento
 */
export function getSegmentHooks(segmentKey) {
  const segment = getSegmentData(segmentKey);
  return segment.hooks;
}

/**
 * Obtém CTA específico do segmento
 * @param {string} segmentKey - Chave do segmento
 * @returns {object} CTA do segmento
 */
export function getSegmentCTA(segmentKey) {
  const segment = getSegmentData(segmentKey);
  return segment.cta;
}

console.log(`🗂️ Sistema de Segmentos Unificado iniciado - ${getAllSegments().length} segmentos disponíveis`);
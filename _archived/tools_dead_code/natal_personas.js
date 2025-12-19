// src/tools/natal_personas.js

/**
 * Personas específicas para PMEs de Natal/RN
 * Baseado em pesquisa real do mercado local
 */

export const NATAL_BUYER_PERSONAS = {
  
  RESTAURANTE_DELIVERY: {
    title: "Dono de Restaurante/Lanchonete",
    description: "Empreendedor local focado em delivery e atendimento",
    demographics: {
      age: "35-50 anos",
      location: "Natal e região metropolitana", 
      business_size: "2-15 funcionários",
      revenue: "R$ 30k-150k/mês"
    },
    
    pain_points: [
      "Volume alto de pedidos no WhatsApp (principal canal)",
      "Dificuldade para atender rapidamente nos horários de pico",
      "Perda de pedidos por demora na resposta",
      "Confusão com pedidos simultâneos",
      "Falta de organização no atendimento",
      "Dependência total do dono para vendas"
    ],
    
    goals: [
      "Aumentar volume de pedidos sem contratar",
      "Atender mais rápido que a concorrência",
      "Organizar melhor os pedidos",
      "Trabalhar menos horas no operacional",
      "Crescer sem perder qualidade"
    ],
    
    objections: [
      "Não entendo de tecnologia",
      "Meus clientes gostam do atendimento pessoal", 
      "É muito caro para meu faturamento",
      "Tenho medo de perder controle",
      "Já uso o WhatsApp Business"
    ],
    
    approach: {
      hook: "Quantos pedidos você perde por não conseguir responder rápido no WhatsApp?",
      pain_amplification: "Cada pedido perdido são R$ 35 em média. Se perde 3 por dia, são R$ 3.150/mês.",
      solution_fit: "IA que atende, tira dúvidas, pega pedidos e organiza tudo automaticamente",
      case_reference: "O João do Alecrim aumentou 180% os pedidos em 2 meses",
      roi_promise: "ROI de 300% em 60 dias ou devolvemos o investimento"
    },
    
    qualifying_questions: [
      "Quantos pedidos pelo WhatsApp vocês recebem por dia?",
      "Quanto tempo levam para responder um cliente novo?", 
      "Quantos pedidos acreditam que perdem por demora?",
      "Vocês têm alguém dedicado só para atendimento?",
      "Qual o ticket médio dos seus pedidos?"
    ]
  },

  LOJA_VAREJO: {
    title: "Lojista (Roupas, Acessórios, Casa)",
    description: "Comerciante local com loja física e vendas online",
    demographics: {
      age: "30-55 anos",
      location: "Zonas Norte, Sul, Centro de Natal",
      business_size: "1-8 funcionários", 
      revenue: "R$ 20k-100k/mês"
    },
    
    pain_points: [
      "Concorrência alta com lojas do mesmo segmento",
      "Dificuldade para vender online (Instagram/WhatsApp)",
      "Clientes perguntam muito sobre produtos/preços",
      "Falta de follow-up com interessados",
      "Não consegue atender fora do horário comercial",
      "Perda de vendas por demora na resposta"
    ],
    
    goals: [
      "Vender mais online (principal objetivo)",
      "Atender clientes 24h por dia",
      "Automatizar respostas repetitivas",
      "Aumentar ticket médio", 
      "Fidelizar clientes com bom atendimento"
    ],
    
    objections: [
      "Meus clientes gostam de ver o produto",
      "Instagram já resolve meu problema",
      "Não sei mexer com tecnologia",
      "É caro demais para loja pequena",
      "Atendimento robô fica impessoal"
    ],
    
    approach: {
      hook: "Quantas vendas você perde porque não consegue responder os clientes na hora?",
      pain_amplification: "Se 20 pessoas perguntam por dia e você responde só 12, são 8 vendas perdidas diárias",
      solution_fit: "IA que mostra produtos, tira dúvidas, passa preços e agenda visitas à loja",
      case_reference: "A loja da Zona Norte aumentou 340% as conversões do WhatsApp",
      roi_promise: "Aumento mínimo de 40% nas vendas online em 90 dias"
    },
    
    qualifying_questions: [
      "Quantas mensagens vocês recebem por dia sobre produtos?",
      "Qual percentual das consultas vira venda efetiva?",
      "Vocês conseguem responder todos os interessados?",
      "Como fazem o acompanhamento dos clientes interessados?",
      "Qual o ticket médio das vendas online de vocês?"
    ]
  },

  CLINICA_SERVICOS: {
    title: "Dono de Clínica/Consultório",
    description: "Profissional da saúde com negócio próprio",
    demographics: {
      age: "35-60 anos",
      location: "Tirol, Petrópolis, Capim Macio, Ponta Negra",
      business_size: "3-20 funcionários",
      revenue: "R$ 50k-300k/mês"
    },
    
    pain_points: [
      "Agenda lotada mas muitas faltas/desistências",
      "Secretária sobrecarregada com ligações/WhatsApp", 
      "Dificuldade para confirmar consultas",
      "Perda de tempo com agendamentos/reagendamentos",
      "Falta de follow-up pós-consulta",
      "Concorrência com clínicas grandes"
    ],
    
    goals: [
      "Otimizar a agenda (reduzir faltas)",
      "Automatizar agendamentos",
      "Melhorar experiência do paciente",
      "Liberar secretária para outras atividades",
      "Aumentar fidelização de pacientes"
    ],
    
    objections: [
      "Área da saúde precisa de atendimento humano",
      "LGPD/privacidade dos dados",
      "Pacientes idosos não usam tecnologia",
      "Já temos sistema de agendamento", 
      "É muito complexo para implementar"
    ],
    
    approach: {
      hook: "Quantos pacientes faltam sem avisar por mês na sua agenda?",
      pain_amplification: "Cada falta representa R$ 150 perdidos + slot vazio que poderia ser preenchido",
      solution_fit: "IA que confirma consultas, reagenda automaticamente e faz follow-up",
      case_reference: "A clínica de Ponta Negra reduziu 70% as faltas e aumentou 25% a receita",
      roi_promise: "Redução de 60% nas faltas em 30 dias"
    },
    
    qualifying_questions: [
      "Quantos pacientes faltam sem avisar por semana?",
      "Como fazem confirmação de consultas hoje?",
      "Quantas horas a secretária gasta só com agendamento?",
      "Vocês fazem algum follow-up pós-consulta?",
      "Qual o valor médio de uma consulta?"
    ]
  },

  ECOMMERCE_LOCAL: {
    title: "Empreendedor E-commerce Local", 
    description: "Jovem empreendedor vendendo online",
    demographics: {
      age: "25-40 anos",
      location: "Natal (home office/pequeno escritório)",
      business_size: "1-5 pessoas",
      revenue: "R$ 15k-80k/mês" 
    },
    
    pain_points: [
      "Volume alto de dúvidas pré-venda",
      "Abandono de carrinho alto",
      "Dificuldade para nutrir leads",
      "Atendimento 24h impossível sozinho",
      "Perda de vendas por demora na resposta",
      "Falta de follow-up pós-venda"
    ],
    
    goals: [
      "Aumentar conversão do site",
      "Automatizar atendimento pré-venda",
      "Recuperar carrinhos abandonados", 
      "Escalar sem contratar",
      "Melhorar experiência do cliente"
    ],
    
    objections: [
      "Já uso chatbot no site",
      "Meu público prefere atendimento humano",
      "Muito complexo para integrar",
      "Caro para quem está começando",
      "Não sei se funciona no meu nicho"
    ],
    
    approach: {
      hook: "Quantos visitantes chegam no seu site mas não compram por falta de atendimento?",
      pain_amplification: "Se 100 pessoas visitam por dia e só 2 compram, 98 estão indo embora. Metade compraria com atendimento na hora",
      solution_fit: "IA que captura leads, responde dúvidas, recupera carrinho e fecha vendas",
      case_reference: "E-commerce local cresceu 250% em leads qualificados em 3 meses", 
      roi_promise: "Aumento de 50% na conversão em 60 dias"
    },
    
    qualifying_questions: [
      "Quantos visitantes únicos vocês têm por dia?",
      "Qual a taxa de conversão atual do site?",
      "Quantas pessoas abandonam o carrinho?",
      "Como fazem follow-up com quem não comprou?",
      "Qual o ticket médio das vendas online?"
    ]
  },

  SERVICOS_PROFISSIONAIS: {
    title: "Prestador de Serviços (Advocacia, Contabilidade, etc)",
    description: "Profissional liberal com escritório próprio",
    demographics: {
      age: "30-55 anos", 
      location: "Centro, Tirol, Petrópolis",
      business_size: "2-12 funcionários",
      revenue: "R$ 40k-200k/mês"
    },
    
    pain_points: [
      "Muitas consultas que não viram cliente",
      "Dificuldade para qualificar prospects", 
      "Tempo gasto explicando serviços básicos",
      "Falta de padronização no atendimento",
      "Perda de clientes por demora na resposta",
      "Secretária sobrecarregada"
    ],
    
    goals: [
      "Qualificar melhor os prospects",
      "Automatizar informações básicas",
      "Aumentar taxa de conversão",
      "Otimizar tempo da equipe",
      "Melhorar follow-up com interessados"
    ],
    
    objections: [
      "Minha área precisa de consultoria pessoal",
      "Clientes não confiam em robôs",
      "Muito complexo para implementar",
      "LGPD é complicada na minha área",
      "Não funciona para serviços especializados"
    ],
    
    approach: {
      hook: "Quantas horas você gasta por semana explicando seus serviços básicos?",
      pain_amplification: "Se são 10 horas semanais a R$ 200/hora, são R$ 8.000 mensais perdidos em trabalho operacional",
      solution_fit: "IA que qualifica, explica serviços, agenda reuniões e filtra casos",
      case_reference: "Consultoria de Ponta Negra aumentou 60% a qualidade dos leads",
      roi_promise: "50% mais tempo para focar em casos de alto valor"
    },
    
    qualifying_questions: [
      "Quantas consultas iniciais vocês fazem por semana?", 
      "Qual percentual vira cliente efetivo?",
      "Quanto tempo gastam explicando serviços básicos?",
      "Como qualificam um prospect antes da reunião?",
      "Qual o valor médio dos seus contratos?"
    ]
  },

  ACADEMIA_FITNESS: {
    title: "Dono de Academia/Personal Trainer",
    description: "Profissionais do fitness focados em retenção e reativação de alunos",
    demographics: {
      age: "28-45 anos",
      location: "Natal e região metropolitana",
      business_size: "1-20 funcionários",
      revenue: "R$ 15k-100k/mês"
    },
    
    pain_points: [
      "Alta rotatividade de alunos",
      "Dificuldade para confirmar presenças nos treinos",
      "Perda de alunos por falta de acompanhamento",
      "Gestão manual de horários e agendamentos", 
      "Falta de comunicação regular com alunos inativos",
      "Competição alta no mercado fitness local"
    ],
    
    goals: [
      "Reduzir cancelamentos e desistências",
      "Automatizar confirmação de treinos",
      "Reativar alunos que pararam de frequentar",
      "Melhorar comunicação com os alunos",
      "Otimizar ocupação dos horários"
    ],
    
    objections: [
      "Meus alunos preferem contato pessoal",
      "Já tenho um sistema de gestão",
      "É muito caro para minha realidade",
      "Não quero automatizar demais o relacionamento",
      "Minha equipe não vai saber usar"
    ],
    
    approach: {
      hook: "Quantos alunos vocês perderam nos últimos 3 meses por falta de acompanhamento?",
      pain_amplification: "Cada aluno perdido são R$ 150/mês. Se perdeu 10 alunos, são R$ 18.000/ano de receita perdida.",
      solution_fit: "IA que confirma treinos, reativa alunos inativos e mantém engajamento automático",
      case_reference: "Academia Revolution aumentou retenção em 40% com automação inteligente",
      roi_promise: "30% menos cancelamentos em 90 dias ou seu investimento de volta"
    },
    
    qualifying_questions: [
      "Quantos alunos vocês têm ativos atualmente?",
      "Qual a taxa de cancelamento mensal?", 
      "Como fazem o acompanhamento dos alunos inativos?",
      "Qual o principal motivo de desistência?",
      "Quanto tempo gastam confirmando treinos manualmente?"
    ]
  }
};

/**
 * Analisa o nome do lead para detectar profissões específicas
 */
function analyzeProfessionalName(name) {
  if (!name) return null;
  
  const nameText = name.toLowerCase();
  
  // Profissionais de saúde
  if (nameText.includes('dr.') || nameText.includes('dra.') || nameText.includes('doutor') || 
      nameText.includes('doutora') || nameText.includes('medic') || nameText.includes('dentist') ||
      nameText.includes('fisioter') || nameText.includes('nutricion')) {
    return 'CLINICA_SERVICOS';
  }
  
  // Profissionais jurídicos
  if (nameText.includes('advog') || nameText.includes('jurid') || nameText.includes('oab') ||
      nameText.includes('direito')) {
    return 'SERVICOS_PROFISSIONAIS';
  }
  
  // Academias e fitness
  if (nameText.includes('personal') || nameText.includes('fitness') || nameText.includes('academia') ||
      nameText.includes('atleta') || nameText.includes('studio') && nameText.includes('treino')) {
    return 'ACADEMIA_FITNESS';
  }
  
  // Contabilidade e consultoria
  if (nameText.includes('contador') || nameText.includes('contabil') || nameText.includes('consultor') ||
      nameText.includes('arquitet') || nameText.includes('engenheir')) {
    return 'SERVICOS_PROFISSIONAIS';
  }
  
  return null;
}

/**
 * Identifica a persona mais provável baseada na conversa e nome do lead
 */
export function identifyPersona(businessInfo, painPoints = [], goals = [], leadName = '') {
  // Primeiro, tenta identificar pela análise do nome
  const nameBasedPersona = analyzeProfessionalName(leadName);
  if (nameBasedPersona) {
    console.log(`🎯 Persona identificada pelo nome: ${nameBasedPersona} para "${leadName}"`);
  }
  
  const keywords = {
    RESTAURANTE_DELIVERY: ['restaurante', 'lanchonete', 'delivery', 'pedidos', 'comida', 'ifood', 'uber'],
    LOJA_VAREJO: ['loja', 'roupas', 'venda', 'produtos', 'varejo', 'instagram', 'clientes'],
    CLINICA_SERVICOS: [
      'clínica', 'consultório', 'médico', 'médica', 'pacientes', 'agenda', 'consulta', 'saúde',
      'dr', 'dra', 'doutor', 'doutora', 'dentista', 'fisioterapeuta', 'nutricionista', 
      'psicólogo', 'psicóloga', 'agendamento', 'lembretes', 'consultas'
    ],
    ECOMMERCE_LOCAL: ['site', 'online', 'ecommerce', 'carrinho', 'conversão', 'digital', 'internet'],
    SERVICOS_PROFISSIONAIS: [
      'advocacia', 'contabilidade', 'consultoria', 'jurídico', 'serviços', 'escritório',
      'advogado', 'advogada', 'contador', 'contadora', 'consultor', 'consultora',
      'arquiteto', 'arquiteta', 'engenheiro', 'engenheira', 'oab'
    ],
    ACADEMIA_FITNESS: [
      'academia', 'fitness', 'personal', 'treino', 'treinos', 'alunos', 'atleta',
      'studio', 'musculação', 'crossfit', 'pilates', 'confirmação', 'reativação'
    ]
  };

  const text = `${businessInfo} ${painPoints.join(' ')} ${goals.join(' ')} ${leadName}`.toLowerCase();
  
  let maxScore = 0;
  let identifiedPersona = nameBasedPersona || 'SERVICOS_PROFISSIONAIS'; // melhor default
  
  for (const [persona, words] of Object.entries(keywords)) {
    const score = words.reduce((acc, word) => {
      return acc + (text.includes(word) ? 1 : 0);
    }, 0);
    
    if (score > maxScore) {
      maxScore = score;
      identifiedPersona = persona;
    }
  }
  
  return {
    persona: identifiedPersona,
    confidence: maxScore,
    profile: NATAL_BUYER_PERSONAS[identifiedPersona]
  };
}

/**
 * Gera approach personalizado baseado na persona identificada
 */
export function generatePersonalizedApproach(personaKey, businessName = '') {
  const persona = NATAL_BUYER_PERSONAS[personaKey];
  if (!persona) return null;
  
  const approach = persona.approach;
  
  return {
    opening_hook: approach.hook,
    pain_amplification: approach.pain_amplification,
    solution_presentation: approach.solution_fit,
    social_proof: approach.case_reference,
    value_proposition: approach.roi_promise,
    qualifying_questions: persona.qualifying_questions,
    common_objections: persona.objections
  };
}

/**
 * Sugere próximas perguntas baseadas na persona
 */
export function getNextQualifyingQuestions(personaKey, currentContext = {}) {
  const persona = NATAL_BUYER_PERSONAS[personaKey];
  if (!persona) return [];
  
  // Filtra perguntas baseadas no contexto já coletado
  const questions = persona.qualifying_questions.filter(q => {
    // Lógica para evitar perguntas já respondidas
    return true; // Por simplicidade, retorna todas por agora
  });
  
  return questions.slice(0, 3); // Retorna as 3 mais relevantes
}

/**
 * Calcula fit score entre prospect e nossas soluções
 */
export function calculatePersonaFitScore(personaKey, qualificationData = {}) {
  const persona = NATAL_BUYER_PERSONAS[personaKey];
  if (!persona) return 0;
  
  let score = 0;
  
  // Verifica fit de revenue
  const revenue = qualificationData.monthlyRevenue || 0;
  const revenueRange = persona.demographics.revenue;
  if (revenue > 0) {
    score += revenue >= 20000 ? 25 : 15; // PME com potencial
  }
  
  // Verifica pain points match
  const painMatch = qualificationData.painPoints?.length || 0;
  score += Math.min(painMatch * 15, 30); // Max 30 pontos
  
  // Verifica authority
  if (qualificationData.isDecisionMaker) {
    score += 25;
  }
  
  // Verifica timing/urgency  
  if (qualificationData.hasUrgency) {
    score += 20;
  }
  
  return Math.min(score, 100); // Max 100
}

export default NATAL_BUYER_PERSONAS;
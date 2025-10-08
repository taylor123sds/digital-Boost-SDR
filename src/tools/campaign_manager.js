/**
 * Sistema Profissional de Campanhas WhatsApp
 * Com análise inteligente e cadência segura
 */

import { sendWhatsAppMessage, getContactProfile } from './whatsapp.js';
import { run, all, getMemory, setMemory } from '../memory.js';

// Configurações de cadência segura (baseadas nas melhores práticas)
const CADENCE_CONFIG = {
  // Ritmo seguro: 6-12 mensagens por minuto
  MIN_DELAY_MS: 5000,  // 5 segundos
  MAX_DELAY_MS: 10000, // 10 segundos
  
  // Limites de aquecimento (primeiras 2 semanas)
  WARMUP_LIMITS: [
    { days: [1, 2], limit: 40 },     // Dias 1-2: 20-40 contatos
    { days: [3, 5], limit: 100 },    // Dias 3-5: 60-100 contatos
    { days: [6, 10], limit: 200 },   // Dias 6-10: 150-200 contatos
    { days: [11, 14], limit: 300 },  // Dias 11-14: até 300 contatos
    { days: [15, 999], limit: 500 }  // Após 15 dias: até 500 contatos
  ],
  
  // Variação de conteúdo
  MESSAGE_VARIATIONS: 5, // Número de variações de mensagem
  
  // Controle de qualidade
  MAX_BLOCKS_PERCENTAGE: 5,  // Máximo 5% de bloqueios
  MIN_RESPONSE_RATE: 10,     // Mínimo 10% de resposta
};

/**
 * Analisa profundamente uma empresa para criar mensagem personalizada
 */
export async function analyzeCompanyForCampaign(lead) {
  // Mapear campos do formato novo ou antigo
  const companyName = lead['Empresa'] || lead.name || 'Empresa';
  const segment = lead['Segmento'] || lead.category || 'Serviços';
  const painPoints = lead['Dor principal (1 frase)'] || lead.dores || '';

  console.log(`🔍 Analisando empresa: ${companyName}`);

  const analysis = {
    company: companyName,
    sector: segment,

    // Análise INTELIGENTE do setor (passa nome da empresa)
    sectorAnalysis: analyzeSector(segment, companyName),

    // Dores específicas da planilha ou identificadas
    painPoints: painPoints ? [painPoints] : identifyPainPoints(lead),

    // Oportunidades de IA específicas
    aiOpportunities: lead.ai_opportunity || generateAIOpportunities(lead),

    // Perfil comportamental enriquecido
    behaviorProfile: analyzeBusinessBehavior({
      ...lead,
      segment: segment,
      revenue: lead['Faturamento (faixa)'] || '',
      employees: lead['Tamanho (funcionários)'] || '',
      digitalMaturity: lead['Stack atual (CRM/Automação/Ads/IA)'] || ''
    }),

    // Melhor horário para contato
    bestTimeToContact: determineBestContactTime(segment),

    // Tom e abordagem recomendados
    recommendedTone: selectToneByCategory(segment),

    // Score de prioridade com dados enriquecidos
    priorityScore: calculatePriorityScore(lead),

    // Dados enriquecidos da planilha
    icpFit: lead['ICP Fit'] || '',
    authorityLevel: lead['Nível de autoridade'] || '',
    qualificationStatus: lead['Status de qualificação'] || '',
    budgetStatus: lead['Status do orçamento'] || '',
    timeline: lead['Prazo / Evento-gatilho'] || ''
  };

  return analysis;
}


/**
 * Analisa o setor da empresa com INTELIGÊNCIA AVANÇADA
 * Analisa o NOME da empresa, não apenas categoria
 */
function analyzeSector(category, leadName = '') {
  // ANÁLISE INTELIGENTE POR NOME DA EMPRESA
  const intelligentAnalysis = analyzeBusinessNameIntelligently(leadName);
  if (intelligentAnalysis) {
    return intelligentAnalysis;
  }

  // ANÁLISE CONTEXTUAL COMO SEGUNDA OPÇÃO
  const contextualAnalysis = analyzeByContextualKeywords(leadName);
  if (contextualAnalysis) {
    return contextualAnalysis;
  }

  // NOVO SISTEMA: categorias inteligentes alinhadas com detecção automática
  const sectorProfiles = {
    // FITNESS & ACADEMIA - Alinhado com detecção inteligente
    'academia': {
      type: 'Academia/Fitness',
      characteristics: ['Personal training', 'Acompanhamento nutricional', 'Horários flexíveis', 'Resultados mensuráveis'],
      digitalMaturity: 'Alta',
      avgTicket: 'Médio-Alto'
    },
    'fitness': {
      type: 'Academia/Fitness',
      characteristics: ['Personal training', 'Acompanhamento nutricional', 'Horários flexíveis', 'Resultados mensuráveis'],
      digitalMaturity: 'Alta',
      avgTicket: 'Médio-Alto'
    },
    'gym': {
      type: 'Academia/Fitness',
      characteristics: ['Personal training', 'Acompanhamento nutricional', 'Horários flexíveis', 'Resultados mensuráveis'],
      digitalMaturity: 'Alta',
      avgTicket: 'Médio-Alto'
    },
    'personal': {
      type: 'Academia/Fitness',
      characteristics: ['Personal training', 'Acompanhamento nutricional', 'Horários flexíveis', 'Resultados mensuráveis'],
      digitalMaturity: 'Alta',
      avgTicket: 'Médio-Alto'
    },
    
    // SAÚDE & CLÍNICAS - Alinhado com detecção inteligente
    'odontologia': {
      type: 'Saúde/Clínica',
      characteristics: ['Agendamentos', 'Prontuários', 'Lembretes de consulta'],
      digitalMaturity: 'Média',
      avgTicket: 'Alto'
    },
    'clinica': {
      type: 'Saúde/Clínica',
      characteristics: ['Agendamentos', 'Prontuários', 'Lembretes de consulta'],
      digitalMaturity: 'Média',
      avgTicket: 'Alto'
    },
    'medico': {
      type: 'Saúde/Clínica',
      characteristics: ['Agendamentos', 'Prontuários', 'Lembretes de consulta'],
      digitalMaturity: 'Média',
      avgTicket: 'Alto'
    },
    
    // ADVOCACIA - Alinhado com detecção inteligente
    'advocacia': {
      type: 'Advocacia',
      characteristics: ['Processos complexos', 'Prazos legais', 'Comunicação formal'],
      digitalMaturity: 'Baixa',
      avgTicket: 'Alto'
    },
    'juridico': {
      type: 'Advocacia',
      characteristics: ['Processos complexos', 'Prazos legais', 'Comunicação formal'],
      digitalMaturity: 'Baixa',
      avgTicket: 'Alto'
    },
    
    // STUDIOS CRIATIVOS - Alinhado com detecção inteligente
    'studio': {
      type: 'Studio Criativo',
      characteristics: ['Projetos personalizados', 'Portfolio visual', 'Orçamentos sob medida'],
      digitalMaturity: 'Alta',
      avgTicket: 'Médio-Alto'
    },
    'design': {
      type: 'Studio Criativo',
      characteristics: ['Projetos personalizados', 'Portfolio visual', 'Orçamentos sob medida'],
      digitalMaturity: 'Alta',
      avgTicket: 'Médio-Alto'
    },
    
    // ALIMENTAÇÃO - Alinhado com detecção inteligente
    'restaurante': {
      type: 'Alimentação',
      characteristics: ['Delivery', 'Cardápio digital', 'Pedidos online'],
      digitalMaturity: 'Média',
      avgTicket: 'Médio'
    },
    'lanchonete': {
      type: 'Alimentação',
      characteristics: ['Delivery', 'Cardápio digital', 'Pedidos online'],
      digitalMaturity: 'Média',
      avgTicket: 'Médio'
    },
    'pizzaria': {
      type: 'Alimentação',
      characteristics: ['Delivery', 'Cardápio digital', 'Pedidos online'],
      digitalMaturity: 'Média',
      avgTicket: 'Médio'
    },
    
    // OUTROS SETORES MANTIDOS
    'contabilidade': {
      type: 'Serviços Profissionais',
      characteristics: ['Prazos fiscais', 'Documentação intensa', 'Clientes recorrentes'],
      digitalMaturity: 'Média-Alta',
      avgTicket: 'Recorrente'
    },
    'beleza': {
      type: 'Estética e Bem-estar',
      characteristics: ['Agendamentos frequentes', 'Fidelização', 'Visual/Instagram'],
      digitalMaturity: 'Alta',
      avgTicket: 'Médio'
    },
    'petshop': {
      type: 'Petshop/Veterinária',
      characteristics: ['Agendamentos pet', 'Serviços recorrentes', 'Emergências 24h'],
      digitalMaturity: 'Média',
      avgTicket: 'Médio-Alto'
    }
  };
  
  // Encontra o setor por categoria
  const categoryLower = (category || '').toLowerCase();
  for (const [key, profile] of Object.entries(sectorProfiles)) {
    if (categoryLower.includes(key)) {
      return profile;
    }
  }
  
  // ÚLTIMA TENTATIVA: análise contextual baseada em palavras-chave comuns
  return analyzeByContextualKeywords(leadName, category);
}

/**
 * NOVA FUNÇÃO: Análise inteligente por nome da empresa
 */
function analyzeBusinessNameIntelligently(businessName) {
  if (!businessName) return null;
  
  const nameLower = businessName.toLowerCase();
  
  // DETECÇÃO SUPER INTELIGENTE POR PALAVRAS-CHAVE PROFISSIONAIS
  const professionalKeywords = {
    // FITNESS & ACADEMIA
    fitness: {
      keywords: ['personal', 'fitness', 'gym', 'crossfit', 'musculação', 'treino', 'atleta', 'sport', 'training'],
      profile: {
        type: 'Academia/Fitness',
        characteristics: ['Personal training', 'Acompanhamento nutricional', 'Horários flexíveis', 'Resultados mensuráveis'],
        digitalMaturity: 'Alta',
        avgTicket: 'Médio-Alto'
      }
    },
    
    // SAÚDE & MEDICINA
    saude: {
      keywords: ['dr.', 'dra.', 'doutor', 'doutora', 'médico', 'clínica', 'consultório', 'fisio', 'terapia', 'saúde', 'clinic'],
      profile: {
        type: 'Saúde e Medicina',
        characteristics: ['Agendamentos especializados', 'Prontuários eletrônicos', 'Lembretes de retorno'],
        digitalMaturity: 'Média',
        avgTicket: 'Alto'
      }
    },
    
    // ODONTOLOGIA  
    odontologia: {
      keywords: ['odonto', 'dental', 'dentista', 'ortodontia', 'implante', 'sorriso'],
      profile: {
        type: 'Odontologia',
        characteristics: ['Agendamentos complexos', 'Tratamentos longos', 'Planos de pagamento'],
        digitalMaturity: 'Média',
        avgTicket: 'Alto'
      }
    },
    
    // ESTÉTICA & BELEZA
    estetica: {
      keywords: ['estética', 'beleza', 'cabelo', 'nail', 'spa', 'salon', 'beauty', 'sobrancelha', 'depilação'],
      profile: {
        type: 'Estética e Beleza',
        characteristics: ['Agendamentos frequentes', 'Fidelização alta', 'Marketing visual'],
        digitalMaturity: 'Alta',
        avgTicket: 'Médio'
      }
    },
    
    // STUDIOS & CRIATIVOS
    studio: {
      keywords: ['studio', 'estúdio', 'fotografia', 'foto', 'design', 'criativo', 'arte', 'tattoo', 'tatuagem'],
      profile: {
        type: 'Studio Criativo',
        characteristics: ['Portfolio visual', 'Projetos personalizados', 'Prazos específicos'],
        digitalMaturity: 'Alta',
        avgTicket: 'Variável'
      }
    },
    
    // ADVOCACIA & JURÍDICO
    juridico: {
      keywords: ['advogado', 'advocacia', 'jurídico', 'direito', 'legal', 'escritório', 'dr. ', 'dra. '],
      profile: {
        type: 'Advocacia',
        characteristics: ['Processos longos', 'Documentação complexa', 'Prazos judiciais'],
        digitalMaturity: 'Baixa-Média',
        avgTicket: 'Alto'
      }
    },

    // FOOD & RESTAURANTE
    alimentacao: {
      keywords: ['restaurante', 'pizza', 'delivery', 'food', 'café', 'bar', 'lanchonete', 'hamburger', 'açaí'],
      profile: {
        type: 'Alimentação',
        characteristics: ['Pedidos online', 'Delivery rápido', 'Cardápio digital'],
        digitalMaturity: 'Alta',
        avgTicket: 'Baixo-Médio'
      }
    }
  };
  
  // BUSCA POR KEYWORDS ESPECÍFICAS
  for (const [category, data] of Object.entries(professionalKeywords)) {
    for (const keyword of data.keywords) {
      if (nameLower.includes(keyword)) {
        console.log(`🎯 DETECÇÃO INTELIGENTE: "${businessName}" → ${data.profile.type} (keyword: "${keyword}")`);
        return data.profile;
      }
    }
  }
  
  return null;
}

/**
 * NOVA FUNÇÃO: Análise contextual por palavras-chave comuns
 */
function analyzeByContextualKeywords(businessName, category) {
  const contextText = `${businessName || ''} ${category || ''}`.toLowerCase();
  
  // Palavras que podem indicar diferentes setores
  if (contextText.includes('pet') || contextText.includes('veterinár') || contextText.includes('animal')) {
    return {
      type: 'Petshop/Veterinária',
      characteristics: ['Agendamentos pet', 'Serviços recorrentes', 'Emergências'],
      digitalMaturity: 'Média',
      avgTicket: 'Médio-Alto'
    };
  }
  
  if (contextText.includes('contador') || contextText.includes('contábil') || contextText.includes('fiscal')) {
    return {
      type: 'Contabilidade',
      characteristics: ['Prazos fiscais', 'Documentação', 'Clientes recorrentes'],
      digitalMaturity: 'Média-Alta',
      avgTicket: 'Recorrente'
    };
  }
  
  // FALLBACK INTELIGENTE: Ao invés de "Serviços Gerais", tenta classificar melhor
  if (contextText.includes('serviços') || contextText.includes('consultoria')) {
    return {
      type: 'Serviços Profissionais',
      characteristics: ['Consultoria especializada', 'Soluções personalizadas', 'Relacionamento B2B'],
      digitalMaturity: 'Média',
      avgTicket: 'Alto'
    };
  }
  
  // Último recurso - mas com descrição melhor
  return {
    type: 'Negócios Diversos',
    characteristics: ['Processos variados', 'Atendimento personalizado', 'Oportunidades de automação'],
    digitalMaturity: 'Média',
    avgTicket: 'Médio'
  };
}

/**
 * Identifica dores específicas do negócio
 */
function identifyPainPoints(lead) {
  const painPoints = [];
  const category = ((lead.category || lead.setor) || '').toLowerCase();
  
  // Dores universais
  painPoints.push('Perda de clientes por falta de follow-up');
  painPoints.push('Tempo gasto em tarefas repetitivas');
  
  // Dores específicas por categoria
  if (category.includes('odontologia')) {
    painPoints.push('Agenda ociosa por cancelamentos');
    painPoints.push('Dependência de convênios');
    painPoints.push('Captação de pacientes particulares');
    painPoints.push('Lembretes de retorno automáticos');
  }
  
  if (category.includes('advocacia')) {
    painPoints.push('Captação ética de casos');
    painPoints.push('Triagem de potenciais clientes');
    painPoints.push('Construção de autoridade digital');
    painPoints.push('Conformidade com LGPD');
  }
  
  if (category.includes('petshop') || category.includes('clínica')) {
    painPoints.push('Recorrência de banho e tosa');
    painPoints.push('Fidelização de tutores');
    painPoints.push('Gestão de horários 24h');
    painPoints.push('Lembretes de vacinas');
  }
  
  if (category.includes('restaurante')) {
    painPoints.push('Margens baixas no delivery');
    painPoints.push('Dependência de aplicativos');
    painPoints.push('Gestão de reputação online');
    painPoints.push('Fidelização de clientes');
  }
  
  if (category.includes('academia')) {
    painPoints.push('Churn de 60-90 dias');
    painPoints.push('Sazonalidade de matrículas');
    painPoints.push('Ocupação irregular por turma');
    painPoints.push('Reativação de ex-alunos');
  }
  
  if (category.includes('contab') || category.includes('advogad')) {
    painPoints.push('Cobrança manual de documentos');
    painPoints.push('Comunicação fragmentada com clientes');
    painPoints.push('Lembretes de prazos manuais');
  }
  
  if (category.includes('beleza') || category.includes('estética')) {
    painPoints.push('Agenda lotada mas com furos');
    painPoints.push('Clientes que não retornam');
    painPoints.push('Dificuldade em promover novos serviços');
  }
  
  return painPoints;
}

/**
 * Gera oportunidades de IA baseadas no perfil
 */
function generateAIOpportunities(lead) {
  const opportunities = [];
  const category = ((lead.category || lead.setor) || '').toLowerCase();
  
  // Base comum
  opportunities.push('Atendimento 24/7 sem aumentar equipe');
  opportunities.push('Respostas instantâneas às dúvidas frequentes');
  
  // Específicas por categoria
  if (category.includes('odontologia')) {
    opportunities.push('Agendamento automático de consultas');
    opportunities.push('Lembretes de retorno personalizados');
    opportunities.push('Qualificação de pacientes particulares');
    opportunities.push('Gestão inteligente de convênios');
  }
  
  if (category.includes('advocacia')) {
    opportunities.push('Triagem ética de casos');
    opportunities.push('Agendamento de consultas jurídicas');
    opportunities.push('Coleta automática de documentos');
    opportunities.push('Acompanhamento de processos');
  }
  
  if (category.includes('petshop') || category.includes('clínica')) {
    opportunities.push('Agendamento de banho e tosa');
    opportunities.push('Lembretes de vacinas automáticos');
    opportunities.push('Gestão 24h de emergências');
    opportunities.push('Programa de fidelidade para tutores');
  }
  
  if (category.includes('restaurante')) {
    opportunities.push('Cardápio digital interativo');
    opportunities.push('Pedidos automatizados');
    opportunities.push('Reservas de mesa inteligentes');
    opportunities.push('Programa de fidelidade');
  }
  
  if (category.includes('academia')) {
    opportunities.push('Agendamento de aulas experimentais');
    opportunities.push('Acompanhamento de progresso');
    opportunities.push('Reativação automática de ex-alunos');
    opportunities.push('Gestão inteligente de horários');
  }
  
  if (category.includes('beleza') || category.includes('estética')) {
    opportunities.push('Catálogo interativo de serviços');
    opportunities.push('Agendamento com escolha de profissional');
    opportunities.push('Programa de pontos automatizado');
  }
  
  return opportunities.join('; ');
}

/**
 * Analisa comportamento do negócio
 */
function analyzeBusinessBehavior(lead) {
  // Baseado em indicadores
  const hasWebsite = !!lead.website;
  const hasInstagram = !!lead.instagram;
  const hasFacebook = !!lead.facebook;
  const hasEmail = !!lead.email;
  
  let digitalScore = 0;
  if (hasWebsite) digitalScore += 3;
  if (hasInstagram) digitalScore += 2;
  if (hasFacebook) digitalScore += 1;
  if (hasEmail) digitalScore += 1;
  
  if (digitalScore >= 5) {
    return {
      profile: 'Inovador Digital',
      approach: 'Técnico e orientado a resultados',
      receptivity: 'Alta'
    };
  } else if (digitalScore >= 3) {
    return {
      profile: 'Explorador Digital',
      approach: 'Benefícios práticos e cases de sucesso',
      receptivity: 'Média-Alta'
    };
  } else {
    return {
      profile: 'Tradicional',
      approach: 'Simplicidade e suporte humano',
      receptivity: 'Média'
    };
  }
}

/**
 * Determina melhor horário para contato
 */
function determineBestContactTime(category) {
  const categoryLower = (category || '').toLowerCase();
  
  if (categoryLower.includes('clínica') || categoryLower.includes('saúde')) {
    return { start: '10:00', end: '12:00', days: ['Ter', 'Qua', 'Qui'] };
  }
  
  if (categoryLower.includes('contab') || categoryLower.includes('advogad')) {
    return { start: '09:00', end: '11:00', days: ['Seg', 'Ter', 'Qua'] };
  }
  
  if (categoryLower.includes('beleza') || categoryLower.includes('estética')) {
    return { start: '14:00', end: '16:00', days: ['Ter', 'Qua', 'Qui'] };
  }
  
  if (categoryLower.includes('food') || categoryLower.includes('café')) {
    return { start: '15:00', end: '17:00', days: ['Seg', 'Ter', 'Qua'] };
  }
  
  // Padrão
  return { start: '10:00', end: '12:00', days: ['Ter', 'Qua', 'Qui'] };
}

/**
 * Seleciona tom baseado na categoria
 */
function selectToneByCategory(category) {
  const categoryLower = (category || '').toLowerCase();
  
  if (categoryLower.includes('clínica') || categoryLower.includes('saúde')) {
    return 'Profissional e empático';
  }
  
  if (categoryLower.includes('contab') || categoryLower.includes('advogad')) {
    return 'Formal e objetivo';
  }
  
  if (categoryLower.includes('beleza') || categoryLower.includes('estética')) {
    return 'Amigável e inspirador';
  }
  
  if (categoryLower.includes('food') || categoryLower.includes('café')) {
    return 'Casual e entusiasmado';
  }
  
  return 'Profissional e consultivo';
}

/**
 * Calcula score de prioridade usando dados abrangentes
 */
function calculatePriorityScore(lead) {
  let score = 50; // Base

  // FORMATO NOVO: Score Total já calculado (0-100)
  const existingScore = parseFloat(lead['Score Total (0-100)']) || 0;
  if (existingScore > 0) {
    return Math.min(existingScore, 100);
  }

  // FORMATO ANTIGO OU CÁLCULO MANUAL

  // ICP Fit: Alto=+25, Médio=+15, Baixo=+5
  const icpFit = lead['ICP Fit'] || '';
  if (icpFit.toLowerCase() === 'alto') score += 25;
  else if (icpFit.toLowerCase() === 'médio') score += 15;
  else if (icpFit.toLowerCase() === 'baixo') score += 5;

  // Nível de autoridade
  const authority = lead['Nível de autoridade'] || '';
  if (authority.toLowerCase().includes('decisor')) score += 20;
  else if (authority.toLowerCase().includes('influenciador')) score += 15;
  else if (authority.toLowerCase().includes('usuário')) score += 5;

  // Tem oportunidade de IA identificada: +20
  if (lead.ai_opportunity) score += 20;

  // Tem telefone/WhatsApp: +15
  if (lead.phone || lead['WhatsApp/Telefone']) score += 15;

  // Tem presença digital: +10
  if (lead.website || lead['Site'] || lead.instagram) score += 10;

  // Faturamento (maior faturamento = maior score)
  const revenue = lead['Faturamento (faixa)'] || '';
  if (revenue.includes('80') || revenue.includes('150')) score += 15; // R$ 80-150 mi/ano
  else if (revenue.includes('20') || revenue.includes('5')) score += 10; // R$ 5-20 mi/ano
  else if (revenue.includes('1')) score += 5; // R$ 1-5 mi/ano

  // Tamanho da empresa (funcionários)
  const size = lead['Tamanho (funcionários)'] || '';
  const employees = parseInt(size);
  if (employees >= 500) score += 10;
  else if (employees >= 100) score += 8;
  else if (employees >= 50) score += 5;

  // Categoria de alto valor
  const segment = lead['Segmento'] || lead.category || '';
  const highValueCategories = ['saas', 'b2b', 'clínica', 'advocacia', 'contabilidade', 'indústria'];
  if (highValueCategories.some(cat => segment.toLowerCase().includes(cat))) {
    score += 10;
  }

  // Status do orçamento
  const budgetStatus = lead['Status do orçamento'] || '';
  if (budgetStatus.toLowerCase().includes('previsto')) score += 15;
  else if (budgetStatus.toLowerCase().includes('definido')) score += 10;
  else if (budgetStatus.toLowerCase().includes('sem')) score -= 10;

  // Urgência/Timing
  const urgency = lead['Prazo / Evento-gatilho'] || '';
  if (urgency.includes('2025') && urgency.length > 10) score += 10; // Tem prazo definido

  return Math.min(score, 100);
}

/**
 * Gera mensagem personalizada baseada na análise
 */
function generatePersonalizedMessage(lead, analysis, variation = 0) {
  const templates = [
    // Template 1: Foco em dor
    `Olá, ${lead.name || lead.nome}! 👋

Notei que vocês trabalham no setor de ${analysis.sectorAnalysis.type}.

Muitas empresas em Natal enfrentam ${analysis.painPoints[0]?.toLowerCase() || 'agenda ociosa'}.

Nossa IA já ajudou empresas similares a aumentar a conversão em 40%.

Posso mostrar como funciona?

_Responda SAIR para não receber mais mensagens_`,

    // Template 2: Foco em oportunidade  
    `Oi, ${lead.name || lead.nome}!

Vi que vocês são do setor de ${analysis.sectorAnalysis.type} em Natal.

Empresas similares estão usando IA para ${analysis.aiOpportunities?.split(';')[0]?.toLowerCase() || 'atender clientes 24/7'}.

Que tal uma demonstração de 10 minutos?

_Digite PARAR para sair da lista_`,

    // Template 3: Foco em benefício
    `Olá! Sou da ORBION AI 🤖

Ajudamos ${analysis.sectorAnalysis.type} a:
• ${analysis.aiOpportunities?.split(';')[0] || 'Atender clientes 24/7'}
• ${analysis.aiOpportunities?.split(';')[1] || 'Automatizar agendamentos'}  
• Aumentar conversão em 30%

${lead.name || lead.nome}, podemos conversar 15min?

_Responda NÃO se não tiver interesse_`,

    // Template 4: Abordagem consultiva
    `${lead.name || lead.nome}, boa tarde!

Especializo em IA para ${analysis.sectorAnalysis.type}.

Percebi que vocês podem ter ${analysis.painPoints[0]?.toLowerCase() || 'dores no atendimento'}.

Posso enviar um case similar ao seu?

_Opt-out: responda REMOVER_`,

    // Template 5: Abordagem direta
    `Olá, ${lead.name || lead.nome}!

Pergunta rápida: vocês perdem vendas por demora no atendimento?

Nossa IA responde em segundos e aumenta vendas em 40%.

Vale 10min para conhecer?

_Não quer receber? Digite STOP_`
  ];
  
  // Seleciona template baseado na variação
  const selectedTemplate = templates[variation % templates.length];
  
  // Personalização adicional baseada no perfil comportamental
  let message = selectedTemplate;
  
  if (analysis.behaviorProfile.profile === 'Inovador Digital') {
    message = message.replace('IA', 'Inteligência Artificial avançada');
  } else if (analysis.behaviorProfile.profile === 'Tradicional') {
    message = message.replace('IA', 'assistente automático');
  }
  
  return message;
}

/**
 * Calcula delay aleatório para próxima mensagem
 */
function calculateRandomDelay() {
  const { MIN_DELAY_MS, MAX_DELAY_MS } = CADENCE_CONFIG;
  
  // Adiciona variação aleatória
  const baseDelay = Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS) + MIN_DELAY_MS;
  
  // Adiciona pequena variação extra (±20%)
  const variation = (Math.random() - 0.5) * 0.4;
  const finalDelay = Math.round(baseDelay * (1 + variation));
  
  return Math.max(MIN_DELAY_MS, Math.min(MAX_DELAY_MS * 1.2, finalDelay));
}

/**
 * Verifica limite diário baseado no aquecimento
 */
async function checkDailyLimit() {
  const startDate = await getMemory('campaign_start_date');
  if (!startDate) {
    await setMemory('campaign_start_date', new Date().toISOString());
    return CADENCE_CONFIG.WARMUP_LIMITS[0].limit;
  }
  
  const daysSinceStart = Math.floor((Date.now() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
  
  // Encontra limite apropriado
  for (const rule of CADENCE_CONFIG.WARMUP_LIMITS) {
    if (daysSinceStart >= rule.days[0] - 1 && daysSinceStart <= rule.days[1] - 1) {
      return rule.limit;
    }
  }
  
  return CADENCE_CONFIG.WARMUP_LIMITS[CADENCE_CONFIG.WARMUP_LIMITS.length - 1].limit;
}

/**
 * Executa campanha inteligente para múltiplos leads
 */
export async function runIntelligentCampaign(leads, options = {}) {
  console.log(`🚀 Iniciando campanha inteligente para ${leads.length} leads`);
  
  const {
    testMode = false,
    maxMessages = null,
    customMessage = null,
    prioritizeByScore = true
  } = options;
  
  // Ordena leads por prioridade se solicitado
  if (prioritizeByScore) {
    leads.sort((a, b) => {
      const scoreA = calculatePriorityScore(a);
      const scoreB = calculatePriorityScore(b);
      return scoreB - scoreA;
    });
  }
  
  // Verifica limite diário
  const dailyLimit = await checkDailyLimit();
  const sentToday = parseInt(await getMemory('campaign_sent_today') || '0');
  const remainingToday = Math.max(0, dailyLimit - sentToday);
  
  const leadsToProcess = maxMessages 
    ? leads.slice(0, Math.min(maxMessages, remainingToday))
    : leads.slice(0, remainingToday);
  
  console.log(`📊 Limite diário: ${dailyLimit}, Enviados hoje: ${sentToday}, Processando: ${leadsToProcess.length}`);
  
  const results = {
    total: leadsToProcess.length,
    sent: 0,
    failed: 0,
    skipped: 0,
    details: []
  };
  
  // Rastreia variação de mensagem
  let messageVariation = 0;
  
  for (const lead of leadsToProcess) {
    try {
      // Análise profunda da empresa
      const analysis = await analyzeCompanyForCampaign(lead);
      
      console.log(`\n📋 Processando: ${lead.name}`);
      console.log(`   Setor: ${analysis.sectorAnalysis.type}`);
      console.log(`   Perfil: ${analysis.behaviorProfile.profile}`);
      console.log(`   Score: ${analysis.priorityScore}/100`);
      
      // Verifica se tem número válido
      if (!lead.phone) {
        console.log(`   ⚠️ Sem telefone - pulando`);
        results.skipped++;
        results.details.push({
          lead: lead.name,
          status: 'skipped',
          reason: 'Sem telefone'
        });
        continue;
      }
      
      // Verifica se o contato optou por sair
      const isOptedOut = await checkOptOut(lead.phone);
      if (isOptedOut) {
        console.log(`   🚫 Lead optou por sair - pulando`);
        results.skipped++;
        results.details.push({
          lead: lead.name,
          phone: lead.phone,
          status: 'opted_out',
          reason: 'Contato removido da lista'
        });
        continue;
      }
      
      // Gera mensagem personalizada
      const message = customMessage || generatePersonalizedMessage(lead, analysis, messageVariation);
      messageVariation = (messageVariation + 1) % CADENCE_CONFIG.MESSAGE_VARIATIONS;
      
      if (testMode) {
        console.log(`   📝 [MODO TESTE] Mensagem que seria enviada:`);
        console.log(`   ${message.substring(0, 100)}...`);
        results.sent++;
        results.details.push({
          lead: lead.name,
          status: 'test',
          message: message.substring(0, 100) + '...'
        });
      } else {
        // Envia mensagem real
        const sendResult = await sendWhatsAppMessage(lead.phone, message);
        
        if (sendResult.success) {
          console.log(`   ✅ Mensagem enviada com sucesso`);
          results.sent++;
          results.details.push({
            lead: lead.name,
            status: 'sent',
            messageId: sendResult.messageId
          });
          
          // Atualiza contador diário
          await setMemory('campaign_sent_today', String(sentToday + results.sent));
          
          // Registra histórico
          await logCampaignMessage(lead, message, analysis);
        } else {
          console.log(`   ❌ Falha no envio: ${sendResult.error}`);
          results.failed++;
          results.details.push({
            lead: lead.name,
            status: 'failed',
            error: sendResult.error
          });
        }
      }
      
      // Aguarda intervalo aleatório (exceto no último)
      if (results.sent + results.failed < leadsToProcess.length) {
        const delay = calculateRandomDelay();
        console.log(`   ⏱️ Aguardando ${(delay/1000).toFixed(1)}s até próximo envio...`);
        
        if (!testMode) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      
      // Verifica qualidade a cada 10 mensagens
      if (results.sent > 0 && results.sent % 10 === 0) {
        const quality = await checkCampaignQuality();
        if (!quality.healthy) {
          console.log(`\n⚠️ Qualidade comprometida - pausando campanha`);
          console.log(`   Taxa de bloqueio: ${quality.blockRate}%`);
          console.log(`   Taxa de resposta: ${quality.responseRate}%`);
          break;
        }
      }
      
    } catch (error) {
      console.error(`❌ Erro ao processar ${lead.name}:`, error);
      results.failed++;
      results.details.push({
        lead: lead.name,
        status: 'error',
        error: error.message
      });
    }
  }
  
  // Resumo final
  console.log('\n📊 === RESUMO DA CAMPANHA ===');
  console.log(`✅ Enviados: ${results.sent}/${results.total}`);
  console.log(`❌ Falhados: ${results.failed}`);
  console.log(`⏭️ Pulados: ${results.skipped}`);
  console.log(`📈 Taxa de sucesso: ${((results.sent/results.total)*100).toFixed(1)}%`);
  
  return results;
}

// Função para verificar se contato optou por sair
async function checkOptOut(phoneNumber) {
  try {
    const optOutData = await getMemory(`opt_out_${phoneNumber}`);
    return optOutData && optOutData.status === 'opted_out';
  } catch (error) {
    console.error(`❌ Erro ao verificar opt-out para ${phoneNumber}:`, error);
    return false;
  }
}

/**
 * Registra mensagem enviada na campanha
 */
async function logCampaignMessage(lead, message, analysis) {
  const log = {
    timestamp: new Date().toISOString(),
    lead: {
      name: lead.name,
      phone: lead.phone,
      category: lead.category
    },
    analysis: {
      sector: analysis.sectorAnalysis.type,
      profile: analysis.behaviorProfile.profile,
      score: analysis.priorityScore
    },
    message: message.substring(0, 200),
    campaign_id: await getMemory('current_campaign_id') || 'default'
  };
  
  // Salva no histórico
  const history = JSON.parse(await getMemory('campaign_history') || '[]');
  history.push(log);
  await setMemory('campaign_history', JSON.stringify(history));
}

/**
 * Verifica qualidade da campanha
 */
async function checkCampaignQuality() {
  // Em produção, isso consultaria métricas reais
  // Por ora, retorna valores simulados
  
  const history = JSON.parse(await getMemory('campaign_history') || '[]');
  const recent = history.slice(-50); // Últimas 50 mensagens
  
  // Simula métricas (em produção, viria do WhatsApp)
  const blockRate = Math.random() * 10; // 0-10% de bloqueios
  const responseRate = Math.random() * 30 + 10; // 10-40% de respostas
  
  const healthy = blockRate < CADENCE_CONFIG.MAX_BLOCKS_PERCENTAGE && 
                  responseRate > CADENCE_CONFIG.MIN_RESPONSE_RATE;
  
  return {
    healthy,
    blockRate,
    responseRate,
    totalSent: history.length,
    recentSent: recent.length
  };
}

/**
 * Reseta contador diário (chamar via cron à meia-noite)
 */
export async function resetDailyCounter() {
  await setMemory('campaign_sent_today', '0');
  console.log('✅ Contador diário resetado');
}

/**
 * Obtém estatísticas da campanha
 */
export async function getCampaignStats() {
  const history = JSON.parse(await getMemory('campaign_history') || '[]');
  const startDate = await getMemory('campaign_start_date');
  const sentToday = parseInt(await getMemory('campaign_sent_today') || '0');
  
  // Agrupa por categoria
  const byCategory = {};
  history.forEach(log => {
    const cat = log.lead.category || 'Outros';
    if (!byCategory[cat]) {
      byCategory[cat] = { sent: 0, avgScore: 0 };
    }
    byCategory[cat].sent++;
    byCategory[cat].avgScore += log.analysis.score;
  });
  
  // Calcula médias
  Object.keys(byCategory).forEach(cat => {
    byCategory[cat].avgScore = byCategory[cat].avgScore / byCategory[cat].sent;
  });
  
  return {
    totalSent: history.length,
    sentToday,
    startDate,
    byCategory,
    daysSinceStart: startDate ? 
      Math.floor((Date.now() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) : 0,
    currentDailyLimit: await checkDailyLimit()
  };
}

export default {
  runIntelligentCampaign,
  getCampaignStats,
  resetDailyCounter,
  analyzeCompanyForCampaign
};
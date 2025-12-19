/**
 * @file services_catalog.js
 * @description Catálogo de Módulos da Leadly Sistema Financeiro
 *
 * Estrutura profissional dos módulos oferecidos, mapeamento de dores
 * e classificação de leads por módulo/solução.
 *
 * @version 2.0.0
 */

// ═══════════════════════════════════════════════════════════════
// CATÁLOGO DE MÓDULOS
// ═══════════════════════════════════════════════════════════════

export const SERVICES = {
  DRE: 'dre',
  FLUXO_CAIXA: 'fluxo_caixa',
  ESTOQUE: 'estoque',
  INDICADORES: 'indicadores',
  CRM: 'crm',
  RECEITAS: 'receitas',
  CLIENTES: 'clientes'
};

// ═══════════════════════════════════════════════════════════════
// DETALHES DOS MÓDULOS
// ═══════════════════════════════════════════════════════════════

export const SERVICE_DETAILS = {
  [SERVICES.DRE]: {
    id: 'dre',
    nome: 'DRE - Demonstrativo de Resultados',
    emoji: '',
    descricao: 'DRE automático em tempo real com análise de margens',
    tagline: 'Saiba se está dando lucro ou prejuízo',

    // Dores que resolve
    dores: [
      'não sabe se está dando lucro',
      'não sabe se está tendo prejuízo',
      'não tem dre',
      'dre manual',
      'dre em planilha',
      'demora fechar mês',
      'não sabe a margem',
      'não sabe margem de lucro',
      'resultado surpresa',
      'fim do mês surpresa'
    ],

    // Palavras-chave que indicam necessidade deste módulo
    keywords: [
      'dre',
      'lucro',
      'prejuízo',
      'resultado',
      'margem',
      'despesas',
      'receitas',
      'demonstrativo',
      'contábil',
      'fechamento'
    ],

    // Resultados típicos
    resultados: [
      'DRE atualizado em tempo real',
      'Visão clara de lucro/prejuízo',
      'Margem por produto/serviço',
      'Fechamento automático'
    ],

    // Faixa de investimento (plano que inclui)
    planoMinimo: 'starter',
    investimentoMin: 197
  },

  [SERVICES.FLUXO_CAIXA]: {
    id: 'fluxo_caixa',
    nome: 'Fluxo de Caixa',
    emoji: '',
    descricao: 'Controle e projeção de caixa com alertas',
    tagline: 'Nunca mais seja surpreendido pelo saldo',

    dores: [
      'caixa negativo',
      'não sabe quanto vai ter',
      'surpresa no caixa',
      'contas desorganizadas',
      'não consegue planejar',
      'falta dinheiro',
      'aperto no caixa',
      'sem controle de caixa',
      'fluxo de caixa bagunçado',
      'não faz conciliação'
    ],

    keywords: [
      'caixa',
      'fluxo',
      'saldo',
      'banco',
      'conta',
      'projeção',
      'conciliação',
      'liquidez',
      'pagamentos',
      'recebimentos'
    ],

    resultados: [
      'Projeção de caixa futuro',
      'Alertas de gargalos',
      'Conciliação automática',
      'Visão consolidada de contas'
    ],

    planoMinimo: 'starter',
    investimentoMin: 197
  },

  [SERVICES.ESTOQUE]: {
    id: 'estoque',
    nome: 'Gestão de Estoque',
    emoji: '',
    descricao: 'Controle completo de estoque com alertas',
    tagline: 'Estoque sob controle, sem faltas ou excessos',

    dores: [
      'estoque descontrolado',
      'não sabe quanto tem em estoque',
      'produto parado',
      'falta produto',
      'perda por vencimento',
      'não sabe valor do estoque',
      'custo médio errado',
      'compra demais',
      'compra de menos',
      'inventário errado'
    ],

    keywords: [
      'estoque',
      'inventário',
      'produto',
      'mercadoria',
      'custo médio',
      'entrada',
      'saída',
      'compras',
      'fornecedor',
      'armazém'
    ],

    resultados: [
      'Controle em tempo real',
      'Alertas de estoque mínimo',
      'Custo médio automático',
      'Integração com vendas'
    ],

    planoMinimo: 'profissional',
    investimentoMin: 497
  },

  [SERVICES.INDICADORES]: {
    id: 'indicadores',
    nome: 'Indicadores Financeiros',
    emoji: '',
    descricao: 'KPIs e métricas em dashboards visuais',
    tagline: 'Decisões baseadas em dados, não em achismo',

    dores: [
      'não sabe quais métricas acompanhar',
      'decisão no achismo',
      'sem indicadores',
      'não tem kpi',
      'não sabe ticket médio',
      'não sabe ponto de equilíbrio',
      'sem metas',
      'não consegue definir meta',
      'sem visão estratégica',
      'não mede performance'
    ],

    keywords: [
      'indicador',
      'kpi',
      'métrica',
      'dashboard',
      'ticket médio',
      'ltv',
      'cac',
      'ponto de equilíbrio',
      'meta',
      'performance'
    ],

    resultados: [
      'Dashboards com KPIs',
      'Ticket médio, LTV, CAC',
      'Ponto de equilíbrio',
      'Comparativo com metas'
    ],

    planoMinimo: 'profissional',
    investimentoMin: 497
  },

  [SERVICES.CRM]: {
    id: 'crm',
    nome: 'CRM Integrado',
    emoji: '',
    descricao: 'Gestão de clientes e pipeline de vendas',
    tagline: 'Todos os clientes em um só lugar',

    dores: [
      'clientes em planilha',
      'perde oportunidade',
      'não faz follow up',
      'não sabe histórico do cliente',
      'cliente espalhado',
      'sem pipeline',
      'não acompanha vendas',
      'perde negócio',
      'sem crm',
      'crm desatualizado'
    ],

    keywords: [
      'crm',
      'cliente',
      'pipeline',
      'oportunidade',
      'follow up',
      'vendas',
      'prospect',
      'lead',
      'negócio',
      'comercial'
    ],

    resultados: [
      'Pipeline visual de vendas',
      'Histórico completo',
      'Automação de follow-up',
      'Integração com financeiro'
    ],

    planoMinimo: 'profissional',
    investimentoMin: 497
  },

  [SERVICES.RECEITAS]: {
    id: 'receitas',
    nome: 'Receitas e Faturamento',
    emoji: '',
    descricao: 'Controle de receitas e cobrança automática',
    tagline: 'Receba mais, cobre melhor',

    dores: [
      'inadimplência alta',
      'não sabe quanto tem a receber',
      'cobrança manual',
      'não cobra cliente',
      'perde prazo',
      'não emite nota',
      'faturamento bagunçado',
      'sem controle de comissão',
      'não sabe receita',
      'venda sem controle'
    ],

    keywords: [
      'receita',
      'faturamento',
      'cobrança',
      'inadimplência',
      'nota fiscal',
      'recebível',
      'comissão',
      'venda',
      'boleto',
      'pagamento'
    ],

    resultados: [
      'Régua de cobrança automática',
      'Controle de recebíveis',
      'Relatórios de vendas',
      'Gestão de comissões'
    ],

    planoMinimo: 'profissional',
    investimentoMin: 497
  },

  [SERVICES.CLIENTES]: {
    id: 'clientes',
    nome: 'Gestão de Clientes',
    emoji: '',
    descricao: 'Análise e segmentação de clientes',
    tagline: 'Conheça seus melhores clientes',

    dores: [
      'não sabe quem são os melhores clientes',
      'atendimento igual para todos',
      'não consegue fidelizar',
      'não mede rentabilidade por cliente',
      'cliente sem cadastro',
      'não conhece cliente',
      'sem segmentação',
      'não sabe frequência de compra',
      'sem score de cliente',
      'perde cliente bom'
    ],

    keywords: [
      'cliente',
      'segmentação',
      'fidelização',
      'rentabilidade',
      'cadastro',
      'score',
      'frequência',
      'comportamento',
      'análise',
      'perfil'
    ],

    resultados: [
      'Segmentação automática',
      'Score de crédito interno',
      'Rentabilidade por cliente',
      'Análise de comportamento'
    ],

    planoMinimo: 'profissional',
    investimentoMin: 497
  }
};

// ═══════════════════════════════════════════════════════════════
// MAPEAMENTO DOR  MÓDULO
// ═══════════════════════════════════════════════════════════════

/**
 * Classifica qual módulo é mais adequado baseado na dor do cliente
 * @param {string} problemaPrincipal - Dor/problema identificado no NEED
 * @returns {Object} { servico: string, confianca: number, alternativas: string[] }
 */
export function classificarServicoPorDor(problemaPrincipal) {
  if (!problemaPrincipal || typeof problemaPrincipal !== 'string') {
    return {
      servico: null,
      confianca: 0,
      alternativas: []
    };
  }

  const problema = problemaPrincipal.toLowerCase().trim();
  const scores = {};

  // Calcular score para cada módulo
  Object.entries(SERVICE_DETAILS).forEach(([serviceKey, service]) => {
    let score = 0;

    // Score por dores (peso maior)
    service.dores.forEach(dor => {
      if (problema.includes(dor.toLowerCase())) {
        score += 10;
      }
    });

    // Score por keywords (peso menor)
    service.keywords.forEach(keyword => {
      if (problema.includes(keyword.toLowerCase())) {
        score += 3;
      }
    });

    if (score > 0) {
      scores[serviceKey] = score;
    }
  });

  // Se não encontrou match, retornar null
  if (Object.keys(scores).length === 0) {
    return {
      servico: null,
      confianca: 0,
      alternativas: []
    };
  }

  // Ordenar por score
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [servicoTop, scoreTop] = sorted[0];

  // Calcular confiança (0-100%)
  const confianca = Math.min(100, (scoreTop / 30) * 100); // Normalizar para 100%

  // Alternativas (outros módulos com score > 50% do top)
  const alternativas = sorted
    .slice(1)
    .filter(([_, score]) => score >= scoreTop * 0.5)
    .map(([servico]) => servico);

  return {
    servico: servicoTop,
    confianca: Math.round(confianca),
    alternativas,
    detalhes: SERVICE_DETAILS[servicoTop]
  };
}

// ═══════════════════════════════════════════════════════════════
// GERAÇÃO DE MENSAGENS PERSONALIZADAS POR MÓDULO
// ═══════════════════════════════════════════════════════════════

/**
 * Gera mensagem de transição personalizada após identificar o módulo
 * @param {string} servico - ID do módulo (SERVICES.DRE, etc)
 * @param {string} problemaPrincipal - Dor identificada
 * @returns {string} Mensagem personalizada
 */
export function gerarMensagemTransicao(servico, problemaPrincipal) {
  const service = SERVICE_DETAILS[servico];

  if (!service) {
    return `Entendi o desafio de vocês. Vamos falar sobre como o sistema pode ajudar.`;
  }

  return `Perfeito! ${service.emoji} Pelo que você descreveu, nosso módulo de **${service.nome}** resolve exatamente isso.

${service.tagline}

Com ele vocês terão: ${service.resultados[0].toLowerCase()}.

Vamos falar sobre os planos disponíveis? `;
}

// ═══════════════════════════════════════════════════════════════
// ESTATÍSTICAS E DADOS DOS MÓDULOS
// ═══════════════════════════════════════════════════════════════

/**
 * Retorna estatísticas consolidadas de todos os módulos
 */
export function getServicesStats() {
  return {
    total: Object.keys(SERVICES).length,
    services: Object.values(SERVICE_DETAILS).map(s => ({
      id: s.id,
      nome: s.nome,
      planoMinimo: s.planoMinimo,
      investimentoMin: s.investimentoMin
    })),
    planos: {
      starter: {
        nome: 'Starter',
        preco: 197,
        modulos: ['DRE', 'Fluxo de Caixa']
      },
      profissional: {
        nome: 'Profissional',
        preco: 497,
        modulos: ['Todos os módulos']
      },
      enterprise: {
        nome: 'Enterprise',
        preco: 997,
        modulos: ['Todos + Customizações']
      }
    }
  };
}

/**
 * Retorna lista de todas as dores conhecidas (para auto-complete, etc)
 */
export function getAllDores() {
  const dores = new Set();

  Object.values(SERVICE_DETAILS).forEach(service => {
    service.dores.forEach(dor => dores.add(dor));
  });

  return Array.from(dores).sort();
}

/**
 * Retorna lista de todas as keywords (para detecção, etc)
 */
export function getAllKeywords() {
  const keywords = new Set();

  Object.values(SERVICE_DETAILS).forEach(service => {
    service.keywords.forEach(keyword => keywords.add(keyword));
  });

  return Array.from(keywords).sort();
}

// Export default
export default {
  SERVICES,
  SERVICE_DETAILS,
  classificarServicoPorDor,
  gerarMensagemTransicao,
  getServicesStats,
  getAllDores,
  getAllKeywords
};

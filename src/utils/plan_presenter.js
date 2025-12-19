/**
 * @file plan_presenter.js
 * @description Formatador de apresentação de serviços da Digital Boost
 * @version 4.0.0 - SOLAR REBRAND
 * @date 2025-12-01
 *
 * Para integradoras de energia solar, não temos "planos" fixos.
 * Temos um modelo de trabalho: Diagnóstico gratuito  Proposta personalizada
 */

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES - SOLAR v4.0
// ═══════════════════════════════════════════════════════════════════════════

const MODELO_TRABALHO = {
  diagnostico: {
    nome: 'Diagnóstico do Canal Digital',
    investimento: 'Gratuito',
    duracao: '20-30 minutos',
    descricao: 'Call para analisar o que vocês têm hoje e propor o que faz sentido implementar',
    entregaveis: [
      'Análise da presença digital atual',
      'Identificação de gaps no caminho do orçamento',
      'Proposta de estrutura do canal digital',
      'Escopo e investimento personalizado'
    ]
  },
  implementacao: {
    nome: 'Implementação do Canal Digital',
    investimento: 'Personalizado',
    descricao: 'Criação completa do canal de captação de orçamentos',
    entregaveis: [
      'Landing page focada em conversão',
      'Páginas SEO por região atendida',
      'Formulário + WhatsApp integrados',
      'Prova social configurada',
      'Tracking (Pixel + GA4)'
    ]
  }
};

const SERVICOS_INCLUSOS = {
  site: {
    nome: 'Site/Landing Page de Orçamento',
    descricao: '1 objetivo claro: pedido de orçamento. Design focado em conversão.'
  },
  seo_local: {
    nome: 'SEO Local Básico',
    descricao: 'Páginas por cidade/serviço para aparecer no Google da região.'
  },
  captacao: {
    nome: 'Captação Estruturada',
    descricao: 'Botão WhatsApp + Formulário + Prova social (fotos, avaliações).'
  },
  tracking: {
    nome: 'Tracking Básico',
    descricao: 'Pixel Meta + Google Analytics para saber de onde vêm os orçamentos.'
  },
  google_perfil: {
    nome: 'Google Perfil (Opcional)',
    descricao: 'Configuração do Google Meu Negócio para aparecer no Maps.'
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// FORMATADOR PRINCIPAL - SOLAR v4.0
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Formata apresentação do modelo de trabalho (não mais "planos")
 * SOLAR v4.0: Diagnóstico gratuito  Proposta personalizada
 *
 * @param {Object} context - Contexto do lead (opcional)
 * @returns {string} Mensagem formatada explicando como funciona
 */
export function formatPlansPresentation(context = {}) {
  const diag = MODELO_TRABALHO.diagnostico;

  let message = ` **Como funciona:**\n\n`;

  message += `O investimento depende do escopo - cada integradora tem uma necessidade diferente.\n\n`;

  message += `**Passo 1: ${diag.nome}** (${diag.investimento})\n`;
  message += `${diag.descricao}\n\n`;

  message += `O que analisamos:\n`;
  diag.entregaveis.forEach(item => {
    message += `• ${item}\n`;
  });

  message += `\n**Passo 2: Proposta Personalizada**\n`;
  message += `Depois do diagnóstico, apresentamos escopo e investimento sob medida.\n\n`;

  message += ` _Não prometemos ranking no Google nem quantidade de leads. O que garantimos é um canal digital bem estruturado._\n\n`;

  message += `Quer agendar o diagnóstico gratuito?`;

  return message;
}

/**
 * Apresentação resumida (versão curta)
 * SOLAR v4.0
 *
 * @returns {string} Mensagem curta sobre como funciona
 */
export function formatPlansShort() {
  return `Como funciona:

 **Diagnóstico Gratuito** (20-30 min)
Analisamos o que vocês têm hoje e identificamos os gaps.

 **Proposta Personalizada**
Escopo e investimento sob medida pra realidade de vocês.

Quer agendar o diagnóstico?`;
}

/**
 * Lista de serviços inclusos no canal digital
 *
 * @returns {string} Lista formatada de serviços
 */
export function formatServicesList() {
  let message = ` **O que está incluso no Canal Digital:**\n\n`;

  for (const [key, servico] of Object.entries(SERVICOS_INCLUSOS)) {
    message += `**${servico.nome}**\n`;
    message += `${servico.descricao}\n\n`;
  }

  message += `_Escopo exato definido no diagnóstico, baseado na necessidade de cada integradora._`;

  return message;
}

/**
 * Retorna recomendação padrão (sempre diagnóstico para solar)
 * Mantido para compatibilidade com código legado
 *
 * @returns {Object} Recomendação padrão
 */
export function getRecommendedPlan() {
  return {
    planKey: 'diagnostico',
    planName: 'Diagnóstico do Canal Digital',
    reason: 'Gratuito e sem compromisso - vamos entender seu cenário primeiro'
  };
}

/**
 * Calcula "progresso" baseado nos slots coletados
 * Mantido para compatibilidade - usa Solar-Site BANT
 *
 * @param {Object} bant - Dados BANT coletados
 * @returns {Object} Progresso calculado
 */
export function calculateBANTProgress(bant = {}) {
  const solarSlots = [
    'need_presenca_digital',
    'need_caminho_orcamento',
    'need_regiao',
    'need_volume',
    'need_ticket',
    'need_diferencial',
    'timing_prazo',
    'authority_decisor'
  ];

  const filled = solarSlots.filter(slot => bant[slot]);
  const percent = Math.round((filled.length / solarSlots.length) * 100);

  return {
    percentComplete: percent,
    fieldsCollected: filled,
    fieldsMissing: solarSlots.filter(slot => !bant[slot]),
    isComplete: percent >= 70
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export default {
  formatPlansPresentation,
  formatPlansShort,
  formatServicesList,
  getRecommendedPlan,
  calculateBANTProgress,
  MODELO_TRABALHO,
  SERVICOS_INCLUSOS
};

/**
 * MODULAR PROMPT SYSTEM
 * Exporta todos os modulos e utilitarios
 */

// Core
export { CORE_NUCLEUS, SAFETY_RULES } from './core-nucleus.js';

// Verticals
export {
  VAREJO_POLICIES,
  VAREJO_CONVERSATION_STATES,
  VAREJO_OBJECTIONS
} from './modules/verticals/varejo.js';

export {
  SERVICOS_POLICIES,
  SERVICOS_CONVERSATION_STATES,
  SERVICOS_OBJECTIONS
} from './modules/verticals/servicos.js';

// Functions
export {
  SDR_PLAYBOOK,
  SDR_CONVERSATION_STARTERS,
  SDR_OBJECTION_HANDLERS
} from './modules/functions/sdr.js';

export {
  SPECIALIST_PLAYBOOK,
  SPECIALIST_DISCOVERY_QUESTIONS,
  SPECIALIST_CLOSING_TECHNIQUES
} from './modules/functions/specialist.js';

export {
  SCHEDULER_PLAYBOOK,
  SCHEDULER_SCRIPTS,
  SCHEDULER_POLICIES
} from './modules/functions/scheduler.js';

export {
  SUPPORT_PLAYBOOK,
  SUPPORT_SCRIPTS,
  SUPPORT_FAQ_STRUCTURE,
  SUPPORT_ESCALATION_RULES
} from './modules/functions/support.js';

// Config
export {
  CLIENT_CONFIG_TEMPLATE,
  createClientConfig
} from './client-config-template.js';

// Assembler
export {
  PromptAssembler,
  createPromptAssembler
} from './PromptAssembler.js';

/**
 * Helper para criar prompt rapidamente
 */
export function buildAgentPrompt(config) {
  const { createPromptAssembler } = require('./PromptAssembler.js');
  const assembler = createPromptAssembler(config);
  return assembler.assemble();
}

/**
 * Modulos disponiveis para referencia
 */
export const AVAILABLE_MODULES = {
  verticals: ['varejo', 'servicos'],
  functions: ['sdr', 'specialist', 'scheduler', 'support'],
};

/**
 * Descricao dos modulos
 */
export const MODULE_DESCRIPTIONS = {
  verticals: {
    varejo: 'Politicas para e-commerce, lojas e vendas de produtos fisicos',
    servicos: 'Politicas para consultoria, agencias, SaaS e prestacao de servicos',
  },
  functions: {
    sdr: 'Qualificacao de leads e agendamento de reunioes (pre-vendas)',
    specialist: 'Vendas consultivas e fechamento de negocios',
    scheduler: 'Agendamento de reunioes, consultas e servicos',
    support: 'Atendimento ao cliente, duvidas e resolucao de problemas',
  },
};

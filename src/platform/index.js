/**
 * LEADLY AGENT PLATFORM
 * Plataforma modular para criacao de agentes de IA
 *
 * Exporta todos os modulos da plataforma
 */

// ===========================================
// AGENT FACTORY
// ===========================================
export {
  AgentFactory,
  getAgentFactory,
  createAgent,
  previewAgent,
} from './AgentFactory.js';

// ===========================================
// RUNTIME
// ===========================================
export {
  // Prompt Compiler
  PromptCompiler,
  createPromptCompiler,
  compileAgentPrompt,
  previewPrompt,

  // State Machines
  SDR_STATES,
  SDRStateMachine,
  createSDRStateMachine,
} from './runtime/index.js';

// ===========================================
// TEMPLATES - CORE
// ===========================================
export {
  SYSTEM_TEMPLATE,
  compileSystemTemplate,
  SAFETY_TEMPLATE,
  compileSafetyTemplate,
  detectOptOut,
  detectFraudIndicators,
} from './templates/core/index.js';

// ===========================================
// TEMPLATES - ROLES
// ===========================================
export {
  SDR_PLAYBOOK_TEMPLATE,
  SDR_CONVERSATION_STARTERS,
  SDR_OBJECTION_HANDLERS,
  compileSDRTemplate,
  getConversationStarter,
  getObjectionHandler,
  SUPPORT_PLAYBOOK_TEMPLATE,
  SUPPORT_SCRIPTS,
  compileSupportTemplate,
  getSupportScript,
  detectPriority,
  shouldEscalate,
} from './templates/roles/index.js';

// ===========================================
// TEMPLATES - PLAYBOOKS
// ===========================================
export {
  // SPIN Selling
  SPIN_PLAYBOOK,
  SPIN_QUESTIONS,
  compileSPINPlaybook,
  getSPINQuestions,
  detectSPINStage,

  // BANT
  BANT_PLAYBOOK,
  BANT_QUESTIONS,
  calculateBANTScore,
  classifyLead,
  compileBANTPlaybook,
  getBANTQuestions,

  // Framework selector
  getQualificationFramework,
  compilePlaybook,
} from './templates/playbooks/index.js';

// ===========================================
// TEMPLATES - VERTICALS
// ===========================================
export {
  // Servicos
  SERVICOS_POLICIES,
  SERVICOS_CONVERSATION_STATES,
  SERVICOS_OBJECTIONS,
  compileServicosTemplate,

  // Varejo
  VAREJO_POLICIES,
  VAREJO_CONVERSATION_STATES,
  VAREJO_OBJECTIONS,
  compileVarejoTemplate,
  getVarejoScript,

  // Helpers
  compileVerticalTemplate,
  getConversationStates,
} from './templates/verticals/index.js';

// ===========================================
// VERSION
// ===========================================
export const PLATFORM_VERSION = '1.0.0';
export const PLATFORM_NAME = 'LEADLY Agent Platform';

// ===========================================
// DEFAULT EXPORT
// ===========================================
export default {
  version: PLATFORM_VERSION,
  name: PLATFORM_NAME,
};

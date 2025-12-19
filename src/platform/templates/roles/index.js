/**
 * ROLE TEMPLATES - Index
 * Exporta todos os templates de roles
 */

export {
  SDR_PLAYBOOK_TEMPLATE,
  SDR_CONVERSATION_STARTERS,
  SDR_OBJECTION_HANDLERS,
  compileSDRTemplate,
  getConversationStarter,
  getObjectionHandler,
} from './sdr.template.js';

export {
  SUPPORT_PLAYBOOK_TEMPLATE,
  SUPPORT_SCRIPTS,
  SUPPORT_FAQ_STRUCTURE,
  SUPPORT_ESCALATION_RULES,
  compileSupportTemplate,
  getSupportScript,
  detectPriority,
  shouldEscalate,
} from './support.template.js';

/**
 * Retorna template compilado baseado na role
 */
export async function compileRoleTemplate(role, config) {
  switch (role) {
    case 'sdr':
      const sdr = await import('./sdr.template.js');
      return sdr.compileSDRTemplate(config);

    case 'support':
      const support = await import('./support.template.js');
      return support.compileSupportTemplate(config);

    default:
      return '';
  }
}

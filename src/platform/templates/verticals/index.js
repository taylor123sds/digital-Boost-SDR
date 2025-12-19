/**
 * VERTICALS INDEX
 * Exporta todos os templates de verticais
 */

export {
  SERVICOS_POLICIES,
  SERVICOS_CONVERSATION_STATES,
  SERVICOS_OBJECTIONS,
  SERVICOS_VALUE_PROPS,
  compileServicosTemplate,
  getNextState as getServicosNextState,
} from './servicos.template.js';

export {
  VAREJO_POLICIES,
  VAREJO_CONVERSATION_STATES,
  VAREJO_OBJECTIONS,
  VAREJO_SCRIPTS,
  compileVarejoTemplate,
  getVarejoScript,
  calculateShipping,
} from './varejo.template.js';

/**
 * Retorna template compilado baseado na vertical
 */
export async function compileVerticalTemplate(vertical, config) {
  switch (vertical) {
    case 'varejo':
      const { compileVarejoTemplate } = await import('./varejo.template.js');
      return compileVarejoTemplate(config);

    case 'servicos':
    case 'saas':
    case 'consultoria':
    default:
      const { compileServicosTemplate } = await import('./servicos.template.js');
      return compileServicosTemplate(config);
  }
}

/**
 * Retorna estados de conversa da vertical
 */
export async function getConversationStates(vertical) {
  switch (vertical) {
    case 'varejo':
      const varejo = await import('./varejo.template.js');
      return varejo.VAREJO_CONVERSATION_STATES;
    case 'servicos':
    default:
      const servicos = await import('./servicos.template.js');
      return servicos.SERVICOS_CONVERSATION_STATES;
  }
}

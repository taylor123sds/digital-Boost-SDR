/**
 * DATABASE MODELS INDEX
 * Exporta todos os modelos
 */

export { Tenant } from './Tenant.js';
export { Agent } from './Agent.js';
export { Conversation } from './Conversation.js';

export default {
  Tenant: (await import('./Tenant.js')).Tenant,
  Agent: (await import('./Agent.js')).Agent,
  Conversation: (await import('./Conversation.js')).Conversation,
};

/**
 * REPOSITORIES INDEX
 * Exporta todos os repositorios
 */

export { BaseRepository } from './BaseRepository.js';
export { AgentRepository } from './AgentRepository.js';
export { ConversationRepository } from './ConversationRepository.js';

export default {
  BaseRepository: (await import('./BaseRepository.js')).BaseRepository,
  AgentRepository: (await import('./AgentRepository.js')).AgentRepository,
  ConversationRepository: (await import('./ConversationRepository.js')).ConversationRepository,
};

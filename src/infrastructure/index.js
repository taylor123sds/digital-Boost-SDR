/**
 * @file infrastructure/index.js
 * @description Infrastructure layer main exports
 * Wave 4: Infrastructure Layer
 */

// Adapters
export {
  OpenAIAdapter,
  WhatsAppAdapter,
  GoogleSheetsAdapter
} from './adapters/index.js';

// Events
export {
  EventBus,
  DomainEvent,
  LeadCreatedEvent,
  LeadQualifiedEvent,
  LeadDisqualifiedEvent,
  BANTStageChangedEvent,
  QualificationScoreChangedEvent,
  MessageReceivedEvent,
  MessageSentEvent,
  ConversationStartedEvent,
  ConversationEndedEvent,
  AgentAssignedEvent
} from './events/index.js';

// Cache
export { CacheManager } from './cache/index.js';

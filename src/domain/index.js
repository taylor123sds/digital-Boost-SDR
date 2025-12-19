/**
 * @file domain/index.js
 * @description Domain layer main exports
 * Wave 3: Domain Layer
 */

// Value Objects
export {
  PhoneNumber,
  QualificationScore,
  BANTStage
} from './value-objects/index.js';

// Entities
export {
  Lead,
  Conversation,
  Message
} from './entities/index.js';

// Services
export {
  BANTQualificationService,
  LeadService,
  ConversationService
} from './services/index.js';

// Business Rules
export {
  LeadQualificationRules,
  ConversationRules
} from './rules/index.js';

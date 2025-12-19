/**
 * @file application/use-cases/index.js
 * @description Use cases main exports
 * Wave 5: Application Layer - Use Cases
 */

// Lead use cases
export {
  CreateLeadUseCase,
  QualifyLeadUseCase,
  UpdateBANTStageUseCase
} from './lead/index.js';

// Message use cases
export {
  SendMessageUseCase,
  ProcessIncomingMessageUseCase
} from './message/index.js';

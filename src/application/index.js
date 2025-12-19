/**
 * @file application/index.js
 * @description Application layer main exports
 * Wave 5: Application Layer
 */

// Use Cases
export {
  CreateLeadUseCase,
  QualifyLeadUseCase,
  UpdateBANTStageUseCase,
  SendMessageUseCase,
  ProcessIncomingMessageUseCase
} from './use-cases/index.js';

// DTOs
export {
  CreateLeadDTO,
  UpdateBANTStageDTO,
  LeadResponseDTO,
  SendMessageDTO,
  IncomingMessageDTO,
  MessageResponseDTO
} from './dtos/index.js';

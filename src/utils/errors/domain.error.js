/**
 * @file errors/domain.error.js
 * @description Domain-specific error classes for ORBION agent business logic
 * Wave 1: Foundation Layer - Domain Error Handling
 */

import { ApplicationError } from './base.error.js';

/**
 * OpenAI integration errors
 */
export class OpenAIError extends ApplicationError {
  constructor(message, originalError = null) {
    super(`OpenAI API error: ${message}`, {
      statusCode: 502,
      code: 'OPENAI_ERROR',
      isOperational: true,
      context: {
        service: 'OpenAI',
        originalError: originalError?.message
      }
    });
    this.originalError = originalError;
  }
}

/**
 * WhatsApp/Evolution API errors
 */
export class WhatsAppError extends ApplicationError {
  constructor(message, operation = null, originalError = null) {
    super(`WhatsApp error: ${message}`, {
      statusCode: 502,
      code: 'WHATSAPP_ERROR',
      isOperational: true,
      context: {
        service: 'WhatsApp',
        operation,
        originalError: originalError?.message
      }
    });
    this.originalError = originalError;
  }
}

/**
 * Google Sheets integration errors
 */
export class GoogleSheetsError extends ApplicationError {
  constructor(message, operation = null, originalError = null) {
    super(`Google Sheets error: ${message}`, {
      statusCode: 502,
      code: 'GOOGLE_SHEETS_ERROR',
      isOperational: true,
      context: {
        service: 'GoogleSheets',
        operation,
        originalError: originalError?.message
      }
    });
    this.originalError = originalError;
  }
}

/**
 * Calendar/scheduling errors
 */
export class SchedulingError extends ApplicationError {
  constructor(message, context = {}) {
    super(`Scheduling error: ${message}`, {
      statusCode: 400,
      code: 'SCHEDULING_ERROR',
      isOperational: true,
      context
    });
  }
}

/**
 * Lead management errors
 */
export class LeadError extends ApplicationError {
  constructor(message, leadId = null, context = {}) {
    super(`Lead error: ${message}`, {
      statusCode: 400,
      code: 'LEAD_ERROR',
      isOperational: true,
      context: {
        leadId,
        ...context
      }
    });
  }
}

/**
 * Campaign management errors
 */
export class CampaignError extends ApplicationError {
  constructor(message, campaignId = null, context = {}) {
    super(`Campaign error: ${message}`, {
      statusCode: 400,
      code: 'CAMPAIGN_ERROR',
      isOperational: true,
      context: {
        campaignId,
        ...context
      }
    });
  }
}

/**
 * Conversation/message handling errors
 */
export class ConversationError extends ApplicationError {
  constructor(message, context = {}) {
    super(`Conversation error: ${message}`, {
      statusCode: 400,
      code: 'CONVERSATION_ERROR',
      isOperational: true,
      context
    });
  }
}

/**
 * BANT qualification framework errors
 */
export class BANTError extends ApplicationError {
  constructor(message, stage = null, context = {}) {
    super(`BANT qualification error: ${message}`, {
      statusCode: 400,
      code: 'BANT_ERROR',
      isOperational: true,
      context: {
        stage,
        ...context
      }
    });
  }
}

/**
 * State management errors
 */
export class StateError extends ApplicationError {
  constructor(message, context = {}) {
    super(`State management error: ${message}`, {
      statusCode: 500,
      code: 'STATE_ERROR',
      isOperational: false,
      context
    });
  }
}

/**
 * Audio/voice processing errors
 */
export class AudioProcessingError extends ApplicationError {
  constructor(message, originalError = null) {
    super(`Audio processing error: ${message}`, {
      statusCode: 500,
      code: 'AUDIO_PROCESSING_ERROR',
      isOperational: true,
      context: {
        originalError: originalError?.message
      }
    });
    this.originalError = originalError;
  }
}

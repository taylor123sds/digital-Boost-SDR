/**
 * @file errors.js
 * @description Classes de erro customizadas para o sistema ORBION
 * @module shared/utils/errors
 */

import { ERROR_CODES } from '../../config/constants.js';

/**
 * Classe base para erros customizados
 * @extends Error
 */
export class BaseError extends Error {
  /**
   * @param {string} message - Mensagem de erro
   * @param {number} statusCode - Código HTTP
   * @param {string} code - Código de erro interno
   * @param {object} [meta] - Metadados adicionais
   */
  constructor(message, statusCode = 500, code = ERROR_CODES.INTERNAL_ERROR, meta = {}) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.meta = meta;
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Serializa erro para JSON
   * @returns {object}
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      meta: this.meta,
      timestamp: this.timestamp,
      ...(process.env.NODE_ENV === 'development' && { stack: this.stack }),
    };
  }
}

/**
 * Erro de validação (400 Bad Request)
 */
export class ValidationError extends BaseError {
  /**
   * @param {string} message
   * @param {object} [details] - Detalhes dos campos inválidos
   */
  constructor(message, details = {}) {
    super(message, 400, ERROR_CODES.VALIDATION_ERROR, { details });
  }
}

/**
 * Erro de autenticação (401 Unauthorized)
 */
export class UnauthorizedError extends BaseError {
  /**
   * @param {string} [message]
   */
  constructor(message = 'Não autorizado') {
    super(message, 401, ERROR_CODES.UNAUTHORIZED);
  }
}

/**
 * Erro de permissão (403 Forbidden)
 */
export class ForbiddenError extends BaseError {
  /**
   * @param {string} [message]
   */
  constructor(message = 'Acesso negado') {
    super(message, 403, ERROR_CODES.FORBIDDEN);
  }
}

/**
 * Erro de recurso não encontrado (404 Not Found)
 */
export class NotFoundError extends BaseError {
  /**
   * @param {string} resource - Nome do recurso
   * @param {string} [identifier] - Identificador do recurso
   */
  constructor(resource, identifier = null) {
    const message = identifier
      ? `${resource} '${identifier}' não encontrado`
      : `${resource} não encontrado`;
    super(message, 404, `${resource.toUpperCase()}_NOT_FOUND`);
  }
}

/**
 * Erro de lead não encontrado
 */
export class LeadNotFoundError extends NotFoundError {
  /**
   * @param {string} identifier - ID ou telefone do lead
   */
  constructor(identifier) {
    super('Lead', identifier);
    this.code = ERROR_CODES.LEAD_NOT_FOUND;
  }
}

/**
 * Erro de campanha não encontrada
 */
export class CampaignNotFoundError extends NotFoundError {
  /**
   * @param {string} identifier
   */
  constructor(identifier) {
    super('Campanha', identifier);
    this.code = ERROR_CODES.CAMPAIGN_NOT_FOUND;
  }
}

/**
 * Erro de reunião não encontrada
 */
export class MeetingNotFoundError extends NotFoundError {
  /**
   * @param {string} identifier
   */
  constructor(identifier) {
    super('Reunião', identifier);
    this.code = ERROR_CODES.MEETING_NOT_FOUND;
  }
}

/**
 * Erro de rate limiting (429 Too Many Requests)
 */
export class RateLimitError extends BaseError {
  /**
   * @param {string} [message]
   * @param {number} [retryAfter] - Segundos até poder tentar novamente
   */
  constructor(message = 'Muitas requisições', retryAfter = 60) {
    super(message, 429, ERROR_CODES.RATE_LIMIT_EXCEEDED, { retryAfter });
  }
}

/**
 * Erro de integração externa
 */
export class IntegrationError extends BaseError {
  /**
   * @param {string} service - Nome do serviço (WhatsApp, OpenAI, etc)
   * @param {string} message - Mensagem de erro
   * @param {Error} [originalError] - Erro original
   */
  constructor(service, message, originalError = null) {
    super(`Erro no serviço ${service}: ${message}`, 503, `${service.toUpperCase()}_ERROR`, {
      service,
      originalMessage: originalError?.message,
      originalStack: originalError?.stack,
    });
  }
}

/**
 * Erro do WhatsApp (Evolution API)
 */
export class WhatsAppError extends IntegrationError {
  /**
   * @param {string} message
   * @param {Error} [originalError]
   */
  constructor(message, originalError = null) {
    super('WhatsApp', message, originalError);
    this.code = ERROR_CODES.WHATSAPP_ERROR;
  }
}

/**
 * Erro do OpenAI
 */
export class OpenAIError extends IntegrationError {
  /**
   * @param {string} message
   * @param {Error} [originalError]
   */
  constructor(message, originalError = null) {
    super('OpenAI', message, originalError);
    this.code = ERROR_CODES.OPENAI_ERROR;
  }
}

/**
 * Erro do Google Sheets
 */
export class GoogleSheetsError extends IntegrationError {
  /**
   * @param {string} message
   * @param {Error} [originalError]
   */
  constructor(message, originalError = null) {
    super('Google Sheets', message, originalError);
    this.code = ERROR_CODES.GOOGLE_SHEETS_ERROR;
  }
}

/**
 * Erro de database
 */
export class DatabaseError extends BaseError {
  /**
   * @param {string} message
   * @param {Error} [originalError]
   */
  constructor(message, originalError = null) {
    super(message, 500, ERROR_CODES.DATABASE_ERROR, {
      originalMessage: originalError?.message,
      originalStack: originalError?.stack,
    });
  }
}

/**
 * Erro de timeout
 */
export class TimeoutError extends BaseError {
  /**
   * @param {string} operation - Nome da operação
   * @param {number} timeout - Timeout em ms
   */
  constructor(operation, timeout) {
    super(`Timeout na operação '${operation}' após ${timeout}ms`, 504, 'TIMEOUT_ERROR', {
      operation,
      timeout,
    });
  }
}

/**
 * Erro de telefone inválido
 */
export class InvalidPhoneError extends ValidationError {
  /**
   * @param {string} phone
   */
  constructor(phone) {
    super(`Telefone inválido: ${phone}`, { phone });
    this.code = ERROR_CODES.INVALID_PHONE;
  }
}

/**
 * Erro de mensagem inválida
 */
export class InvalidMessageError extends ValidationError {
  /**
   * @param {string} reason - Motivo da invalidação
   */
  constructor(reason) {
    super(`Mensagem inválida: ${reason}`, { reason });
    this.code = ERROR_CODES.INVALID_MESSAGE;
  }
}

/**
 * Verifica se um erro é uma instância de BaseError
 * @param {Error} error
 * @returns {boolean}
 */
export function isCustomError(error) {
  return error instanceof BaseError;
}

/**
 * Extrai informações úteis de um erro
 * @param {Error} error
 * @returns {object}
 */
export function parseError(error) {
  if (isCustomError(error)) {
    return error.toJSON();
  }

  // Erro nativo do JavaScript
  return {
    name: error.name || 'Error',
    message: error.message || 'Erro desconhecido',
    code: ERROR_CODES.INTERNAL_ERROR,
    statusCode: 500,
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  };
}

/**
 * Cria erro apropriado baseado em código
 * @param {string} code - Código do erro
 * @param {string} message - Mensagem
 * @returns {BaseError}
 */
export function createError(code, message) {
  switch (code) {
    case ERROR_CODES.VALIDATION_ERROR:
      return new ValidationError(message);
    case ERROR_CODES.UNAUTHORIZED:
      return new UnauthorizedError(message);
    case ERROR_CODES.FORBIDDEN:
      return new ForbiddenError(message);
    case ERROR_CODES.LEAD_NOT_FOUND:
      return new LeadNotFoundError(message);
    case ERROR_CODES.WHATSAPP_ERROR:
      return new WhatsAppError(message);
    case ERROR_CODES.OPENAI_ERROR:
      return new OpenAIError(message);
    case ERROR_CODES.GOOGLE_SHEETS_ERROR:
      return new GoogleSheetsError(message);
    case ERROR_CODES.DATABASE_ERROR:
      return new DatabaseError(message);
    case ERROR_CODES.RATE_LIMIT_EXCEEDED:
      return new RateLimitError(message);
    default:
      return new BaseError(message, 500, code);
  }
}

export default {
  BaseError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  LeadNotFoundError,
  CampaignNotFoundError,
  MeetingNotFoundError,
  RateLimitError,
  IntegrationError,
  WhatsAppError,
  OpenAIError,
  GoogleSheetsError,
  DatabaseError,
  TimeoutError,
  InvalidPhoneError,
  InvalidMessageError,
  isCustomError,
  parseError,
  createError,
};

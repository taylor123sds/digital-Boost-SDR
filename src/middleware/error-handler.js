// error-handler.js
//  Middleware centralizado de tratamento de erros

import log from '../utils/logger.js';

/**
 * Classes de erro customizadas para diferentes cenários
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400);
    this.name = 'ValidationError';
    this.details = details;
  }
}

export class NotFoundError extends AppError {
  constructor(resource) {
    super(`${resource} não encontrado`, 404);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Não autorizado') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter) {
    super('Rate limit excedido', 429);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

export class ExternalServiceError extends AppError {
  constructor(service, originalError) {
    super(`Erro ao comunicar com ${service}`, 502);
    this.name = 'ExternalServiceError';
    this.service = service;
    this.originalError = originalError?.message;
  }
}

/**
 * Middleware de tratamento de erros global
 * Deve ser o ÚLTIMO middleware adicionado ao Express
 */
export function errorHandler(err, req, res, next) {
  // Default para erros não tratados
  let error = err;

  // Se não for um AppError, transformar em um
  if (!(error instanceof AppError)) {
    error = new AppError(
      error.message || 'Erro interno do servidor',
      error.statusCode || 500,
      false // Não operacional
    );
  }

  // Log do erro
  const errorContext = {
    error: error.message,
    statusCode: error.statusCode,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    timestamp: error.timestamp,
  };

  if (error.statusCode >= 500) {
    log.error('Server error', error, errorContext);
  } else if (error.statusCode >= 400) {
    log.warn('Client error', errorContext);
  }

  // Preparar resposta
  const response = {
    success: false,
    error: {
      message: error.message,
      statusCode: error.statusCode,
      timestamp: error.timestamp,
    },
  };

  // Adicionar detalhes em desenvolvimento
  if (process.env.NODE_ENV === 'development') {
    response.error.stack = error.stack;
    if (error.details) {
      response.error.details = error.details;
    }
  }

  // Adicionar retryAfter para rate limit
  if (error instanceof RateLimitError) {
    response.error.retryAfter = error.retryAfter;
    res.set('Retry-After', Math.ceil(error.retryAfter / 1000));
  }

  // Enviar resposta
  res.status(error.statusCode).json(response);
}

/**
 * Middleware para capturar rotas não encontradas
 */
export function notFoundHandler(req, res, next) {
  const error = new NotFoundError(`Rota ${req.method} ${req.path}`);
  next(error);
}

/**
 * Wrapper para async route handlers
 * Captura erros de funções async automaticamente
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Middleware de timeout para requests
 */
export function requestTimeout(timeoutMs = 30000) {
  return (req, res, next) => {
    req.setTimeout(timeoutMs, () => {
      const error = new AppError('Request timeout', 408);
      next(error);
    });
    next();
  };
}

/**
 * Handler para erros não capturados (uncaught exceptions)
 */
export function setupGlobalErrorHandlers() {
  // Uncaught Exception
  process.on('uncaughtException', (error) => {
    log.error('UNCAUGHT EXCEPTION! Shutting down...', error, {
      context: 'global_error_handler',
      fatal: true,
    });

    // Dar tempo para logs serem salvos
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });

  // Unhandled Promise Rejection
  process.on('unhandledRejection', (reason, promise) => {
    log.error('UNHANDLED REJECTION! Shutting down...', reason, {
      context: 'global_error_handler',
      fatal: true,
      promise: promise.toString(),
    });

    // Dar tempo para logs serem salvos
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });

  // Graceful shutdown
  const signals = ['SIGTERM', 'SIGINT'];
  signals.forEach((signal) => {
    process.on(signal, () => {
      log.info(`${signal} received, starting graceful shutdown`, {
        context: 'graceful_shutdown',
      });

      // Implementar lógica de shutdown graceful aqui
      // Ex: fechar conexões do banco, finalizar requests pendentes, etc.

      setTimeout(() => {
        log.info('Graceful shutdown completed', {
          context: 'graceful_shutdown',
        });
        process.exit(0);
      }, 5000);
    });
  });
}

export default {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  RateLimitError,
  ExternalServiceError,
  errorHandler,
  notFoundHandler,
  asyncHandler,
  requestTimeout,
  setupGlobalErrorHandlers,
};

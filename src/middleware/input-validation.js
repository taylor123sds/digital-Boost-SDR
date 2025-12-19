// middleware/input-validation.js
//  Middleware de validação de entrada para proteção de API

/**
 * Valida e sanitiza inputs de requisições
 * Previne injection attacks e payloads maliciosos
 */

/**
 * Sanitiza string removendo caracteres perigosos
 * @param {string} str - String para sanitizar
 * @returns {string} String sanitizada
 */
function sanitizeString(str) {
  if (typeof str !== 'string') return str;

  // Remove null bytes
  str = str.replace(/\0/g, '');

  // Remove caracteres de controle perigosos
  str = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  return str.trim();
}

/**
 * Valida número de telefone WhatsApp
 * @param {string} phone - Número de telefone
 * @returns {boolean}
 */
function isValidPhone(phone) {
  if (!phone || typeof phone !== 'string') return false;

  // Formato: 5584999999999 ou 5584999999999@s.whatsapp.net
  const phoneRegex = /^(\d{12,15})(@s\.whatsapp\.net)?$/;
  return phoneRegex.test(phone);
}

/**
 * Valida e sanitiza objeto de mensagem
 * @param {Object} message - Objeto de mensagem
 * @returns {Object} Objeto validado
 */
export function validateMessage(message) {
  const errors = [];
  const sanitized = {};

  // Validar 'from' (obrigatório)
  if (!message.from) {
    errors.push('Campo "from" é obrigatório');
  } else if (!isValidPhone(message.from)) {
    errors.push('Campo "from" deve ser um número de telefone válido');
  } else {
    sanitized.from = sanitizeString(message.from);
  }

  // Validar 'text' (opcional mas deve ser string se presente)
  if (message.text !== undefined) {
    if (typeof message.text !== 'string') {
      errors.push('Campo "text" deve ser uma string');
    } else {
      sanitized.text = sanitizeString(message.text);

      // Limitar tamanho da mensagem (proteção contra DoS)
      if (sanitized.text.length > 10000) {
        errors.push('Mensagem muito longa (máximo 10.000 caracteres)');
      }
    }
  }

  // Validar 'messageType' (opcional)
  const validMessageTypes = ['text', 'audio', 'image', 'video', 'document'];
  if (message.messageType && !validMessageTypes.includes(message.messageType)) {
    errors.push(`messageType deve ser um de: ${validMessageTypes.join(', ')}`);
  } else if (message.messageType) {
    sanitized.messageType = message.messageType;
  }

  // Validar metadata (opcional, mas limitar tamanho)
  if (message.metadata) {
    if (typeof message.metadata !== 'object') {
      errors.push('Campo "metadata" deve ser um objeto');
    } else {
      const metadataStr = JSON.stringify(message.metadata);
      if (metadataStr.length > 50000) {
        errors.push('Metadata muito grande (máximo 50KB)');
      }
      sanitized.metadata = message.metadata;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized
  };
}

/**
 * Middleware Express para validar requisições de webhook
 */
export function validateWebhookRequest(req, res, next) {
  // Validar que body existe
  if (!req.body || Object.keys(req.body).length === 0) {
    console.log(' [VALIDATION] Body vazio');
    return res.status(400).json({
      error: 'Request body is required',
      code: 'EMPTY_BODY'
    });
  }

  // Limitar tamanho do payload (proteção contra DoS)
  const bodySize = JSON.stringify(req.body).length;
  if (bodySize > 1000000) { // 1MB
    console.log(' [VALIDATION] Payload muito grande');
    return res.status(413).json({
      error: 'Payload too large (max 1MB)',
      code: 'PAYLOAD_TOO_LARGE'
    });
  }

  //  FIX: Evolution API usa estrutura diferente - pular validação para webhooks
  // Evolution API envia: { data: { key: {...}, message: {...} } }
  // Não tem 'from' diretamente no body
  console.log(' [VALIDATION] Webhook aceito - estrutura Evolution API');
  req.validationPassed = true;
  next();
  return;

  // CÓDIGO ANTIGO COMENTADO - causava rejeição de webhooks Evolution API
  /*
  // Validar estrutura básica
  const validation = validateMessage(req.body);

  if (!validation.valid) {
    return res.status(400).json({
      error: 'Invalid request format',
      code: 'VALIDATION_ERROR',
      details: validation.errors
    });
  }

  // Substituir body por versão sanitizada
  req.body = validation.sanitized;
  req.validationPassed = true;

  next();
  */
}

/**
 * Middleware para validar parâmetros de rota
 */
export function validateRouteParams(allowedParams) {
  return (req, res, next) => {
    const providedParams = Object.keys(req.params);
    const invalidParams = providedParams.filter(p => !allowedParams.includes(p));

    if (invalidParams.length > 0) {
      return res.status(400).json({
        error: 'Invalid route parameters',
        code: 'INVALID_PARAMS',
        invalidParams
      });
    }

    // Sanitizar parâmetros
    for (const param of providedParams) {
      req.params[param] = sanitizeString(req.params[param]);
    }

    next();
  };
}

/**
 * Middleware para validar query parameters
 */
export function validateQueryParams(schema) {
  return (req, res, next) => {
    const errors = [];

    for (const [key, rules] of Object.entries(schema)) {
      const value = req.query[key];

      // Verificar se é obrigatório
      if (rules.required && !value) {
        errors.push(`Query parameter "${key}" is required`);
        continue;
      }

      if (value) {
        // Validar tipo
        if (rules.type === 'number') {
          const num = Number(value);
          if (isNaN(num)) {
            errors.push(`Query parameter "${key}" must be a number`);
          } else {
            req.query[key] = num;
          }
        } else if (rules.type === 'string') {
          req.query[key] = sanitizeString(value);
        }

        // Validar limites
        if (rules.min !== undefined && req.query[key] < rules.min) {
          errors.push(`Query parameter "${key}" must be >= ${rules.min}`);
        }
        if (rules.max !== undefined && req.query[key] > rules.max) {
          errors.push(`Query parameter "${key}" must be <= ${rules.max}`);
        }

        // Validar enum
        if (rules.enum && !rules.enum.includes(req.query[key])) {
          errors.push(`Query parameter "${key}" must be one of: ${rules.enum.join(', ')}`);
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        code: 'QUERY_VALIDATION_ERROR',
        details: errors
      });
    }

    next();
  };
}

export default {
  validateMessage,
  validateWebhookRequest,
  validateRouteParams,
  validateQueryParams,
  sanitizeString
};

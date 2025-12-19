// validators.js
//  Validação de entrada com Joi para garantir dados consistentes

import Joi from 'joi';
import log from './logger.js';

/**
 * Schema para número de telefone brasileiro
 */
const brazilianPhoneSchema = Joi.string()
  .pattern(/^55\d{10,11}$/)
  .message('Número de telefone inválido. Formato esperado: 55 + DDD + número (10 ou 11 dígitos)');

/**
 * Schemas de validação para diferentes entidades
 */
export const schemas = {
  // Webhook do Evolution API
  evolutionWebhook: Joi.object({
    event: Joi.string().required(),
    instance: Joi.string().required(),
    data: Joi.object({
      key: Joi.object({
        remoteJid: Joi.string().required(),
        fromMe: Joi.boolean(),
        id: Joi.string(),
      }).required(),
      pushName: Joi.string().allow(''),
      message: Joi.object().required(),
      messageTimestamp: Joi.alternatives().try(
        Joi.number(),
        Joi.string()
      ),
    }).required(),
  }),

  // Envio de mensagem WhatsApp
  sendMessage: Joi.object({
    phone: brazilianPhoneSchema.required(),
    message: Joi.string().min(1).max(4096).required(),
    messageType: Joi.string()
      .valid('text', 'image', 'audio', 'video', 'document')
      .default('text'),
  }),

  // Lead de campanha
  campaignLead: Joi.object({
    phone: brazilianPhoneSchema.required(),
    name: Joi.string().min(2).max(200),
    company: Joi.string().max(200),
    segment: Joi.string().max(100),
    email: Joi.string().email().allow('', null),
    notes: Joi.string().max(1000).allow('', null),
  }),

  // Estado de conversa
  conversationState: Joi.object({
    contactId: brazilianPhoneSchema.required(),
    state: Joi.object({
      current: Joi.string().required(),
      subState: Joi.string(),
      lastUpdate: Joi.string().isoDate(),
    }).required(),
    bant: Joi.object({
      budget: Joi.string().allow(null),
      authority: Joi.string().allow(null),
      need: Joi.string().allow(null),
      timing: Joi.string().allow(null),
      email: Joi.string().email().allow(null, ''),
    }),
    qualification: Joi.object({
      score: Joi.number().min(0).max(100),
      archetype: Joi.string().allow(null),
      persona: Joi.string().allow(null),
    }),
    metadata: Joi.object().pattern(Joi.string(), Joi.any()),
  }),

  // Mensagem do histórico
  historyMessage: Joi.object({
    phoneNumber: brazilianPhoneSchema.required(),
    messageText: Joi.string().max(4096).required(),
    fromMe: Joi.boolean().default(false),
    messageType: Joi.string()
      .valid('text', 'image', 'audio', 'video', 'document')
      .default('text'),
  }),

  // Bot detection result
  botDetection: Joi.object({
    contactId: brazilianPhoneSchema.required(),
    isBot: Joi.boolean().required(),
    botScore: Joi.number().min(0).max(100).required(),
    reasons: Joi.array().items(Joi.string()),
    criteria: Joi.object().pattern(Joi.string(), Joi.boolean()),
  }),

  // Parâmetros de campanha
  campaignParams: Joi.object({
    dryRun: Joi.boolean().default(false),
    batchSize: Joi.number().integer().min(1).max(100).default(10),
    delayMs: Joi.number().integer().min(1000).max(60000).default(5000),
    filterSegment: Joi.string().allow('', null),
    maxLeads: Joi.number().integer().min(1).max(500),
  }),
};

/**
 * Valida dados contra um schema
 * @param {Object} data - Dados a validar
 * @param {Joi.Schema} schema - Schema Joi
 * @param {string} context - Contexto para logging
 * @returns {Object} { valid: boolean, value?: any, error?: string }
 */
export function validate(data, schema, context = 'validation') {
  const { error, value } = schema.validate(data, {
    abortEarly: false, // Retornar todos os erros
    stripUnknown: true, // Remover campos desconhecidos
  });

  if (error) {
    const errorMessage = error.details.map(detail => detail.message).join('; ');

    log.warn(`Validation failed`, {
      context,
      errors: error.details.map(d => ({
        field: d.path.join('.'),
        message: d.message,
      })),
    });

    return {
      valid: false,
      error: errorMessage,
    };
  }

  return {
    valid: true,
    value,
  };
}

/**
 * Middleware Express para validação de body
 * @param {Joi.Schema} schema - Schema para validar
 * @param {string} context - Contexto para logging
 */
export function validateBody(schema, context = 'request_body') {
  return (req, res, next) => {
    const result = validate(req.body, schema, context);

    if (!result.valid) {
      log.warn(`Request validation failed`, {
        context: 'http_validation',
        endpoint: req.path,
        method: req.method,
        error: result.error,
      });

      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: result.error,
      });
    }

    // Substituir body com valor validado e sanitizado
    req.body = result.value;
    next();
  };
}

/**
 * Validadores específicos para casos comuns
 */
export const validators = {
  /**
   * Valida número de telefone brasileiro
   */
  isValidPhone(phone) {
    const result = validate({ phone }, Joi.object({ phone: brazilianPhoneSchema }));
    return result.valid;
  },

  /**
   * Valida email
   */
  isValidEmail(email) {
    const result = validate({ email }, Joi.object({ email: Joi.string().email().required() }));
    return result.valid;
  },

  /**
   * Valida se string não está vazia
   */
  isNonEmptyString(value) {
    const result = validate(
      { value },
      Joi.object({ value: Joi.string().min(1).required() })
    );
    return result.valid;
  },

  /**
   * Valida se é número positivo
   */
  isPositiveNumber(value) {
    const result = validate(
      { value },
      Joi.object({ value: Joi.number().positive().required() })
    );
    return result.valid;
  },
};

export default { schemas, validate, validateBody, validators };

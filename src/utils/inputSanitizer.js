// utils/inputSanitizer.js
// Sistema de sanitização e validação de entrada para ORBION AI Agent

import errorHandler, { ERROR_SEVERITY } from './errorHandler.js';

// Patterns maliciosos comuns
const MALICIOUS_PATTERNS = [
  // SQL Injection
  /(\bUNION\b|\bSELECT\b|\bINSERT\b|\bDELETE\b|\bDROP\b|\bUPDATE\b)/gi,
  // XSS básico
  /<script[^>]*>.*?<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  // Command injection
  /(\|\||&&|[;&])/g,
  // Path traversal
  /\.\.\//g,
  // Null bytes
  /\x00/g
];

// Caracteres perigosos para escapar
const DANGEROUS_CHARS = {
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '&': '&amp;',
  '/': '&#x2F;'
};

class InputSanitizer {

  // Sanitiza entrada de WhatsApp
  sanitizeWhatsAppMessage(message, contactId = null) {
    try {
      if (!message || typeof message !== 'string') {
        return {
          sanitized: '',
          isValid: false,
          warnings: ['Invalid message type']
        };
      }

      let sanitized = message;
      const warnings = [];

      // Remove null bytes
      if (sanitized.includes('\x00')) {
        sanitized = sanitized.replace(/\x00/g, '');
        warnings.push('Null bytes removed');
      }

      // Detecta e remove patterns maliciosos
      for (const pattern of MALICIOUS_PATTERNS) {
        if (pattern.test(sanitized)) {
          const matched = sanitized.match(pattern);
          sanitized = sanitized.replace(pattern, '[FILTERED]');
          warnings.push(`Malicious pattern detected: ${matched?.[0]?.substring(0, 20)}`);

          // Log tentativa de ataque
          errorHandler.handleError(new Error('Malicious input detected'), {
            severity: ERROR_SEVERITY.HIGH,
            context: 'input_sanitization',
            contactId,
            metadata: {
              originalMessage: message.substring(0, 100),
              pattern: pattern.toString(),
              matched: matched?.[0]
            }
          });
        }
      }

      // Limita tamanho da mensagem
      const MAX_MESSAGE_LENGTH = 4000;
      if (sanitized.length > MAX_MESSAGE_LENGTH) {
        sanitized = sanitized.substring(0, MAX_MESSAGE_LENGTH);
        warnings.push(`Message truncated to ${MAX_MESSAGE_LENGTH} characters`);
      }

      // Escape HTML entities para prevenir XSS
      sanitized = this.escapeHtml(sanitized);

      // Remove excesso de whitespace
      sanitized = sanitized.replace(/\s+/g, ' ').trim();

      return {
        sanitized,
        isValid: true,
        warnings,
        originalLength: message.length,
        sanitizedLength: sanitized.length
      };

    } catch (error) {
      errorHandler.handleError(error, {
        severity: ERROR_SEVERITY.MEDIUM,
        context: 'sanitize_whatsapp_message',
        contactId,
        metadata: { messageLength: message?.length }
      });

      return {
        sanitized: '[ERROR_PROCESSING_MESSAGE]',
        isValid: false,
        warnings: ['Error during sanitization']
      };
    }
  }

  // Sanitiza dados de API
  sanitizeApiInput(data, allowedFields = []) {
    try {
      if (!data || typeof data !== 'object') {
        return { sanitized: {}, isValid: false, warnings: ['Invalid data type'] };
      }

      const sanitized = {};
      const warnings = [];

      for (const [key, value] of Object.entries(data)) {
        // Verifica se campo é permitido
        if (allowedFields.length > 0 && !allowedFields.includes(key)) {
          warnings.push(`Field '${key}' not allowed`);
          continue;
        }

        // Sanitiza valor baseado no tipo
        if (typeof value === 'string') {
          const result = this.sanitizeWhatsAppMessage(value);
          sanitized[key] = result.sanitized;
          warnings.push(...result.warnings.map(w => `${key}: ${w}`));
        } else if (typeof value === 'number') {
          sanitized[key] = this.sanitizeNumber(value);
        } else if (typeof value === 'boolean') {
          sanitized[key] = Boolean(value);
        } else if (Array.isArray(value)) {
          sanitized[key] = value.slice(0, 100); // Limita arrays
        } else {
          warnings.push(`Field '${key}' has unsupported type`);
        }
      }

      return { sanitized, isValid: true, warnings };

    } catch (error) {
      errorHandler.handleError(error, {
        severity: ERROR_SEVERITY.MEDIUM,
        context: 'sanitize_api_input'
      });

      return { sanitized: {}, isValid: false, warnings: ['Error during sanitization'] };
    }
  }

  // Escape HTML entities
  escapeHtml(text) {
    return text.replace(/[<>"'&\/]/g, (char) => DANGEROUS_CHARS[char] || char);
  }

  // Sanitiza números
  sanitizeNumber(num) {
    if (typeof num !== 'number' || !isFinite(num)) {
      return 0;
    }

    // Limita range para prevenir overflow
    const MAX_SAFE_NUMBER = Number.MAX_SAFE_INTEGER;
    const MIN_SAFE_NUMBER = Number.MIN_SAFE_INTEGER;

    return Math.max(MIN_SAFE_NUMBER, Math.min(MAX_SAFE_NUMBER, num));
  }

  // Valida e sanitiza telefone
  sanitizePhoneNumber(phone) {
    if (!phone || typeof phone !== 'string') {
      return { sanitized: '', isValid: false };
    }

    // Remove tudo exceto números
    let sanitized = phone.replace(/\D/g, '');

    // Valida formato brasileiro
    const isValid = /^55\d{10,11}$/.test(sanitized) || /^\d{10,11}$/.test(sanitized);

    return { sanitized, isValid };
  }

  // Valida e sanitiza email
  sanitizeEmail(email) {
    if (!email || typeof email !== 'string') {
      return { sanitized: '', isValid: false };
    }

    const sanitized = email.toLowerCase().trim();
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitized) && sanitized.length <= 254;

    return { sanitized, isValid };
  }

  // Detecta tentativas de spam/flood
  detectSpam(message, contactId, recentMessages = []) {
    const warnings = [];

    // Detecta mensagens repetidas
    const duplicates = recentMessages.filter(msg =>
      msg.message === message &&
      msg.contactId === contactId &&
      Date.now() - new Date(msg.timestamp).getTime() < 60000 // últimos 60s
    );

    if (duplicates.length >= 3) {
      warnings.push('Possible spam: repeated messages');

      errorHandler.handleError(new Error('Spam detected'), {
        severity: ERROR_SEVERITY.MEDIUM,
        context: 'spam_detection',
        contactId,
        metadata: {
          message: message.substring(0, 50),
          duplicateCount: duplicates.length
        }
      });
    }

    // Detecta flood (muitas mensagens em pouco tempo)
    const recentFromContact = recentMessages.filter(msg =>
      msg.contactId === contactId &&
      Date.now() - new Date(msg.timestamp).getTime() < 30000 // últimos 30s
    );

    if (recentFromContact.length >= 10) {
      warnings.push('Possible flood: too many messages');
    }

    // Detecta mensagens excessivamente longas
    if (message.length > 2000) {
      warnings.push('Unusually long message');
    }

    // Detecta mensagens com muitos caracteres especiais
    const specialCharRatio = (message.match(/[^a-zA-Z0-9\s]/g) || []).length / message.length;
    if (specialCharRatio > 0.5) {
      warnings.push('High special character ratio');
    }

    return warnings;
  }

  // Rate limiting por contato
  checkRateLimit(contactId, windowMs = 60000, maxRequests = 20) {
    const now = Date.now();
    const windowStart = now - windowMs;

    // TODO: Implementar storage persistente (Redis/Memory)
    // Por enquanto, usa cache em memória simples
    if (!this.rateLimitCache) {
      this.rateLimitCache = new Map();
    }

    if (!this.rateLimitCache.has(contactId)) {
      this.rateLimitCache.set(contactId, []);
    }

    const requests = this.rateLimitCache.get(contactId);

    // Remove requisições antigas
    const validRequests = requests.filter(timestamp => timestamp > windowStart);

    // Adiciona requisição atual
    validRequests.push(now);

    // Atualiza cache
    this.rateLimitCache.set(contactId, validRequests);

    const isLimited = validRequests.length > maxRequests;

    if (isLimited) {
      errorHandler.handleError(new Error('Rate limit exceeded'), {
        severity: ERROR_SEVERITY.MEDIUM,
        context: 'rate_limiting',
        contactId,
        metadata: {
          requestCount: validRequests.length,
          maxRequests,
          windowMs
        }
      });
    }

    return {
      isLimited,
      requestCount: validRequests.length,
      maxRequests,
      resetTime: windowStart + windowMs
    };
  }

  // Limpeza periódica do cache
  cleanupCache() {
    if (this.rateLimitCache) {
      const now = Date.now();
      const oneHourAgo = now - (60 * 60 * 1000);

      for (const [contactId, requests] of this.rateLimitCache.entries()) {
        const validRequests = requests.filter(timestamp => timestamp > oneHourAgo);

        if (validRequests.length === 0) {
          this.rateLimitCache.delete(contactId);
        } else {
          this.rateLimitCache.set(contactId, validRequests);
        }
      }
    }
  }
}

// Singleton instance
const inputSanitizer = new InputSanitizer();

// Limpeza automática do cache a cada hora
setInterval(() => inputSanitizer.cleanupCache(), 60 * 60 * 1000);

export default inputSanitizer;
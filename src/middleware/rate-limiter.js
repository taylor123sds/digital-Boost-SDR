// middleware/rate-limiter.js
//  Sistema de Rate Limiting para proteção contra abuso de API

import redisClient from '../infrastructure/redis/RedisClient.js';

/**
 * Rate Limiter simples com fallback em memória
 * Usa Redis quando disponível para evitar estado em memória
 */
class RateLimiter {
  constructor(options = {}) {
    this.name = options.name || 'default';
    this.windowMs = options.windowMs || 60000; // 1 minuto
    this.maxRequests = options.maxRequests || 300; // 300 requisições por minuto (3x o limite anterior)
    this.requests = new Map(); // Map<identifier, Array<timestamp>>
    this.useRedis = options.useRedis ?? (process.env.USE_REDIS === 'true' || !!process.env.REDIS_URL);

    //  FIX CRÍTICO: Track interval para cleanup
    this.cleanupInterval = setInterval(() => this.cleanup(), this.windowMs);

    if (this.useRedis) {
      redisClient.connect();
    }
  }

  /**
   *  FIX: Cleanup method para shutdown gracioso
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log(' [RATE-LIMITER] Interval limpo');
    }
    this.requests.clear();
  }

  /**
   * Verifica se requisição deve ser permitida
   * @param {string} identifier - Identificador único (IP, phone, etc)
   * @returns {Object} { allowed: boolean, remaining: number, resetTime: number }
   */
  async check(identifier) {
    if (this.useRedis && redisClient.isReady()) {
      const result = await this._checkRedis(identifier);
      if (result) {
        return result;
      }
    }

    return this._checkMemory(identifier);
  }

  _checkMemory(identifier) {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Obter requisições do identificador
    if (!this.requests.has(identifier)) {
      this.requests.set(identifier, []);
    }

    const userRequests = this.requests.get(identifier);

    // Remover requisições fora da janela
    const validRequests = userRequests.filter(timestamp => timestamp > windowStart);
    this.requests.set(identifier, validRequests);

    // Verificar limite
    const allowed = validRequests.length < this.maxRequests;
    const remaining = Math.max(0, this.maxRequests - validRequests.length - (allowed ? 1 : 0));
    const resetTime = now + this.windowMs; //  FIX: Próxima janela completa (não janela anterior)

    if (allowed) {
      validRequests.push(now);
    }

    return {
      allowed,
      remaining,
      resetTime,
      current: validRequests.length
    };
  }

  async _checkRedis(identifier) {
    const now = Date.now();
    const bucket = Math.floor(now / this.windowMs);
    const key = `rate_limit:${this.name}:${identifier}:${bucket}`;
    const ttlSeconds = Math.ceil(this.windowMs / 1000);

    const current = await redisClient.increment(key, ttlSeconds);
    if (current === null) {
      return null;
    }

    const allowed = current <= this.maxRequests;
    const remaining = Math.max(0, this.maxRequests - current);
    const resetTime = (bucket + 1) * this.windowMs;

    return {
      allowed,
      remaining,
      resetTime,
      current
    };
  }

  /**
   * Limpa requisições antigas
   */
  cleanup() {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    for (const [identifier, timestamps] of this.requests.entries()) {
      const validRequests = timestamps.filter(ts => ts > windowStart);

      if (validRequests.length === 0) {
        this.requests.delete(identifier);
      } else {
        this.requests.set(identifier, validRequests);
      }
    }

    console.log(` [RATE-LIMITER] Cleanup: ${this.requests.size} identificadores ativos`);
  }

  /**
   * Obtém estatísticas
   */
  getStats() {
    return {
      totalIdentifiers: this.requests.size,
      windowMs: this.windowMs,
      maxRequests: this.maxRequests
    };
  }
}

//  Configurações de rate limit por tipo de endpoint
const limiters = {
  // Webhook: 300 req/min por número de telefone (5 msg/segundo = conversação natural)
  webhook: new RateLimiter({
    name: 'webhook',
    windowMs: 60000,
    maxRequests: 300
  }),

  // API geral: 200 req/min por IP
  api: new RateLimiter({
    name: 'api',
    windowMs: 60000,
    maxRequests: 200
  }),

  // Envio de mensagens: 50 req/min por número
  messaging: new RateLimiter({
    name: 'messaging',
    windowMs: 60000,
    maxRequests: 50
  })
};

/**
 * Middleware Express para rate limiting de webhook
 *  FIX: Rate limit apenas para mensagens de usuários (não status updates)
 */
export async function rateLimitWebhook(req, res, next) {
  //  FIX CRÍTICO: Apenas aplicar rate limit em mensagens de ENTRADA de USUÁRIOS
  // Não rate limitar eventos de sistema (connection.update, status, etc)
  const event = req.body?.event;
  const messageData = req.body?.data;

  // Permitir todos os eventos que NÃO são mensagens de usuário
  if (!event || event !== 'messages.upsert') {
    return next(); // Status updates, connections, etc - sem rate limit
  }

  // Verificar se é mensagem do próprio bot (fromMe: true) - não rate limitar
  if (messageData?.key?.fromMe === true) {
    return next(); // Mensagens enviadas pelo bot - sem rate limit
  }

  //  FIX CRÍTICO: Identificar por TELEFONE (não IP) para evitar agrupar todos os leads no mesmo bucket
  // Structure: data.key.remoteJid contém o número do telefone
  const phone = messageData?.key?.remoteJid;

  //  FIX: Se não houver telefone válido, skip rate limit (evita bucket 'unknown' compartilhado)
  if (!phone) {
    console.warn(' [RATE-LIMIT] Webhook sem remoteJid, ignorando rate limit');
    return next();
  }

  const identifier = phone.replace('@s.whatsapp.net', ''); // Remover sufixo WhatsApp

  const result = await limiters.webhook.check(identifier);

  // Adicionar headers de rate limit
  res.setHeader('X-RateLimit-Limit', limiters.webhook.maxRequests);
  res.setHeader('X-RateLimit-Remaining', result.remaining);
  res.setHeader('X-RateLimit-Reset', result.resetTime);

  if (!result.allowed) {
    console.warn(` [RATE-LIMIT] Webhook bloqueado para ${identifier} (${result.current}/${limiters.webhook.maxRequests})`);

    return res.status(429).json({
      error: 'Too many requests',
      code: 'RATE_LIMIT_EXCEEDED',
      message: `Você excedeu o limite de ${limiters.webhook.maxRequests} requisições por minuto`,
      retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
    });
  }

  console.log(` [RATE-LIMIT] Webhook permitido para ${identifier} (${result.current}/${limiters.webhook.maxRequests}, ${result.remaining} restantes)`);
  next();
}

/**
 * Middleware Express para rate limiting de API geral
 */
export async function rateLimitAPI(req, res, next) {
  const identifier = req.ip;
  const result = await limiters.api.check(identifier);

  res.setHeader('X-RateLimit-Limit', limiters.api.maxRequests);
  res.setHeader('X-RateLimit-Remaining', result.remaining);
  res.setHeader('X-RateLimit-Reset', result.resetTime);

  if (!result.allowed) {
    console.warn(` [RATE-LIMIT] API bloqueada para IP ${identifier}`);

    return res.status(429).json({
      error: 'Too many requests',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
    });
  }

  next();
}

/**
 * Middleware Express para rate limiting de envio de mensagens
 */
export async function rateLimitMessaging(req, res, next) {
  const identifier = req.body?.to || req.ip;
  const result = await limiters.messaging.check(identifier);

  res.setHeader('X-RateLimit-Limit', limiters.messaging.maxRequests);
  res.setHeader('X-RateLimit-Remaining', result.remaining);
  res.setHeader('X-RateLimit-Reset', result.resetTime);

  if (!result.allowed) {
    console.warn(` [RATE-LIMIT] Envio de mensagem bloqueado para ${identifier}`);

    return res.status(429).json({
      error: 'Too many messages',
      code: 'MESSAGE_RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
    });
  }

  next();
}

/**
 * Endpoint para obter estatísticas de rate limiting
 */
export function getRateLimitStats(req, res) {
  const stats = {
    webhook: limiters.webhook.getStats(),
    api: limiters.api.getStats(),
    messaging: limiters.messaging.getStats()
  };

  res.json(stats);
}

/**
 *  FIX: Função de cleanup para graceful shutdown (previne memory leak)
 */
export function cleanupLimiters() {
  limiters.webhook.destroy();
  limiters.api.destroy();
  limiters.messaging.destroy();
  console.log(' [RATE-LIMITER] Todos os limiters destruídos');
}

export default {
  rateLimitWebhook,
  rateLimitAPI,
  rateLimitMessaging,
  getRateLimitStats,
  cleanupLimiters
};

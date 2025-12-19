/**
 * RATE LIMIT SERVICE
 * Rate limiting por tenant usando Redis (com fallback para SQLite)
 */

import redisClient from '../infrastructure/redis/RedisClient.js';
import { getDb } from '../db/connection.js';
import logger from '../utils/logger.js';

// Limites padrão por tipo
const DEFAULT_LIMITS = {
  messages_per_hour: 100,
  messages_per_day: 1000,
  api_calls_per_minute: 60,
  leads_per_day: 500,
  openai_tokens_per_day: 100000,
};

class RateLimitService {
  constructor() {
    this.db = null;
    this.useRedis = false;
    this.limitsCache = new Map(); // Cache de limites por tenant
  }

  /**
   * Inicializa o serviço
   */
  init() {
    this.db = getDb();

    // Tenta conectar ao Redis
    redisClient.connect();

    // Verifica se Redis está disponível após 2 segundos
    setTimeout(() => {
      this.useRedis = redisClient.isReady();
      logger.info(`[RATE-LIMIT] Backend: ${this.useRedis ? 'Redis' : 'SQLite (fallback)'}`);
    }, 2000);

    // Carrega limites do banco
    this.loadLimits();

    logger.info('[RATE-LIMIT] Serviço inicializado');
  }

  /**
   * Carrega limites do banco de dados
   */
  loadLimits() {
    try {
      const stmt = this.db.prepare('SELECT tenant_id, limit_type, limit_value FROM rate_limits');
      const rows = stmt.all();

      for (const row of rows) {
        const key = `${row.tenant_id}:${row.limit_type}`;
        this.limitsCache.set(key, row.limit_value);
      }

      logger.info(`[RATE-LIMIT] ${rows.length} limites carregados`);
    } catch (error) {
      logger.error('[RATE-LIMIT] Erro ao carregar limites:', error.message);
    }
  }

  /**
   * Obtém limite para tenant/tipo
   */
  getLimit(tenantId, limitType) {
    const key = `${tenantId}:${limitType}`;
    return this.limitsCache.get(key) || DEFAULT_LIMITS[limitType] || 100;
  }

  /**
   * Verifica se pode realizar ação (não excedeu limite)
   * Retorna: { allowed: boolean, remaining: number, resetIn: number }
   */
  async checkLimit(tenantId, limitType, increment = 1) {
    const limit = this.getLimit(tenantId, limitType);
    const windowKey = this._getWindowKey(tenantId, limitType);

    if (this.useRedis) {
      return await this._checkLimitRedis(windowKey, limit, increment, limitType);
    } else {
      return await this._checkLimitSQLite(tenantId, limitType, limit, increment);
    }
  }

  /**
   * Check limit usando Redis
   */
  async _checkLimitRedis(windowKey, limit, increment, limitType) {
    try {
      const ttl = this._getTTL(limitType);
      const current = await redisClient.increment(windowKey, ttl);

      if (current === null) {
        // Redis falhou, permite a ação
        return { allowed: true, remaining: limit, resetIn: ttl };
      }

      const allowed = current <= limit;
      const remaining = Math.max(0, limit - current);

      return { allowed, remaining, resetIn: ttl, current };
    } catch (error) {
      logger.error('[RATE-LIMIT] Erro Redis:', error.message);
      return { allowed: true, remaining: limit, resetIn: 0 };
    }
  }

  /**
   * Check limit usando SQLite (fallback)
   */
  async _checkLimitSQLite(tenantId, limitType, limit, increment) {
    try {
      const now = new Date();
      const windowStart = this._getWindowStart(limitType);

      // Verifica e atualiza contador
      const stmt = this.db.prepare(`
        SELECT current_count, window_start FROM rate_limits
        WHERE tenant_id = ? AND limit_type = ?
      `);
      const row = stmt.get(tenantId, limitType);

      let currentCount = 0;

      if (row) {
        const rowWindowStart = new Date(row.window_start);

        // Se janela expirou, reseta contador
        if (rowWindowStart < windowStart) {
          const updateStmt = this.db.prepare(`
            UPDATE rate_limits
            SET current_count = ?, window_start = ?, updated_at = datetime('now')
            WHERE tenant_id = ? AND limit_type = ?
          `);
          updateStmt.run(increment, windowStart.toISOString(), tenantId, limitType);
          currentCount = increment;
        } else {
          // Incrementa contador existente
          const updateStmt = this.db.prepare(`
            UPDATE rate_limits
            SET current_count = current_count + ?, updated_at = datetime('now')
            WHERE tenant_id = ? AND limit_type = ?
          `);
          updateStmt.run(increment, tenantId, limitType);
          currentCount = row.current_count + increment;
        }
      } else {
        // Cria registro
        const insertStmt = this.db.prepare(`
          INSERT INTO rate_limits (tenant_id, limit_type, limit_value, current_count, window_start)
          VALUES (?, ?, ?, ?, ?)
        `);
        insertStmt.run(tenantId, limitType, limit, increment, windowStart.toISOString());
        currentCount = increment;
      }

      const allowed = currentCount <= limit;
      const remaining = Math.max(0, limit - currentCount);
      const resetIn = this._getTTL(limitType);

      return { allowed, remaining, resetIn, current: currentCount };
    } catch (error) {
      logger.error('[RATE-LIMIT] Erro SQLite:', error.message);
      return { allowed: true, remaining: limit, resetIn: 0 };
    }
  }

  /**
   * Gera chave da janela de tempo
   */
  _getWindowKey(tenantId, limitType) {
    const now = new Date();

    if (limitType.includes('per_minute')) {
      return `ratelimit:${tenantId}:${limitType}:${now.toISOString().slice(0, 16)}`;
    } else if (limitType.includes('per_hour')) {
      return `ratelimit:${tenantId}:${limitType}:${now.toISOString().slice(0, 13)}`;
    } else {
      // per_day
      return `ratelimit:${tenantId}:${limitType}:${now.toISOString().slice(0, 10)}`;
    }
  }

  /**
   * Obtém início da janela de tempo
   */
  _getWindowStart(limitType) {
    const now = new Date();

    if (limitType.includes('per_minute')) {
      return new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes());
    } else if (limitType.includes('per_hour')) {
      return new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
    } else {
      // per_day
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }
  }

  /**
   * Obtém TTL em segundos para o tipo de limite
   */
  _getTTL(limitType) {
    if (limitType.includes('per_minute')) return 60;
    if (limitType.includes('per_hour')) return 3600;
    return 86400; // per_day
  }

  /**
   * Métodos de conveniência
   */
  async checkMessageLimit(tenantId) {
    return await this.checkLimit(tenantId, 'messages_per_hour');
  }

  async checkDailyMessageLimit(tenantId) {
    return await this.checkLimit(tenantId, 'messages_per_day');
  }

  async checkApiLimit(tenantId) {
    return await this.checkLimit(tenantId, 'api_calls_per_minute');
  }

  async checkLeadLimit(tenantId) {
    return await this.checkLimit(tenantId, 'leads_per_day');
  }

  /**
   * Atualiza limite para um tenant
   */
  async setLimit(tenantId, limitType, limitValue) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO rate_limits (tenant_id, limit_type, limit_value)
        VALUES (?, ?, ?)
        ON CONFLICT(tenant_id, limit_type) DO UPDATE SET limit_value = excluded.limit_value
      `);
      stmt.run(tenantId, limitType, limitValue);

      // Atualiza cache
      this.limitsCache.set(`${tenantId}:${limitType}`, limitValue);

      logger.info(`[RATE-LIMIT] Limite atualizado: ${tenantId}/${limitType} = ${limitValue}`);
      return true;
    } catch (error) {
      logger.error('[RATE-LIMIT] Erro ao definir limite:', error.message);
      return false;
    }
  }

  /**
   * Obtém status de todos os limites do tenant
   */
  async getStatus(tenantId) {
    const status = {};

    for (const limitType of Object.keys(DEFAULT_LIMITS)) {
      const result = await this.checkLimit(tenantId, limitType, 0); // increment=0 para só verificar
      status[limitType] = {
        limit: this.getLimit(tenantId, limitType),
        current: result.current || 0,
        remaining: result.remaining,
        resetIn: result.resetIn,
      };
    }

    return status;
  }

  /**
   * Shutdown
   */
  async shutdown() {
    await redisClient.disconnect();
    logger.info('[RATE-LIMIT] Serviço encerrado');
  }
}

// Singleton
const rateLimitService = new RateLimitService();

export default rateLimitService;
export { RateLimitService };

/**
 * @file MemoryCacheProvider.js
 * @description Implementação de cache em memória (fallback/desenvolvimento)
 *
 * Usa Map com TTL para simular comportamento do Redis
 * Não deve ser usado em produção com múltiplas instâncias
 */

import { ICacheProvider } from '../contracts/ICacheProvider.js';

/**
 * Implementação de cache em memória
 * @implements {ICacheProvider}
 */
export class MemoryCacheProvider extends ICacheProvider {
  constructor(options = {}) {
    super();
    this.cache = new Map();
    this.timers = new Map();
    this.maxSize = options.maxSize || 10000;
    this.defaultTtl = options.defaultTtl || 3600; // 1 hora
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };

    // Cleanup de entradas expiradas a cada 60s
    this.cleanupInterval = setInterval(() => this._cleanup(), 60000);
  }

  /**
   * @inheritdoc
   */
  async get(key) {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Verificar se expirou
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this._delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return entry.value;
  }

  /**
   * @inheritdoc
   */
  async set(key, value, options = {}) {
    // Verificar limite de tamanho
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this._evictOldest();
    }

    const ttl = options.ttl || this.defaultTtl;
    const expiresAt = ttl > 0 ? Date.now() + (ttl * 1000) : null;

    // Limpar timer anterior se existir
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    this.cache.set(key, {
      value,
      expiresAt,
      createdAt: Date.now()
    });

    // Configurar timer para expiração
    if (expiresAt) {
      const timer = setTimeout(() => this._delete(key), ttl * 1000);
      this.timers.set(key, timer);
    }

    this.stats.sets++;
    return true;
  }

  /**
   * @inheritdoc
   */
  async delete(key) {
    return this._delete(key);
  }

  /**
   * @inheritdoc
   */
  async exists(key) {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this._delete(key);
      return false;
    }

    return true;
  }

  /**
   * @inheritdoc
   */
  async deletePattern(pattern) {
    const regex = this._patternToRegex(pattern);
    let count = 0;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this._delete(key);
        count++;
      }
    }

    return count;
  }

  /**
   * @inheritdoc
   */
  async increment(key, amount = 1) {
    const current = await this.get(key);
    const newValue = (current || 0) + amount;

    // Preservar TTL existente se houver
    const entry = this.cache.get(key);
    const remainingTtl = entry?.expiresAt
      ? Math.max(0, Math.floor((entry.expiresAt - Date.now()) / 1000))
      : this.defaultTtl;

    await this.set(key, newValue, { ttl: remainingTtl });
    return newValue;
  }

  /**
   * @inheritdoc
   */
  async expire(key, ttl) {
    const entry = this.cache.get(key);
    if (!entry) return false;

    entry.expiresAt = Date.now() + (ttl * 1000);

    // Atualizar timer
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    const timer = setTimeout(() => this._delete(key), ttl * 1000);
    this.timers.set(key, timer);

    return true;
  }

  /**
   * @inheritdoc
   */
  async getMany(keys) {
    const result = new Map();

    for (const key of keys) {
      const value = await this.get(key);
      if (value !== null) {
        result.set(key, value);
      }
    }

    return result;
  }

  /**
   * @inheritdoc
   */
  async setMany(entries, options = {}) {
    for (const [key, value] of entries) {
      await this.set(key, value, options);
    }
    return true;
  }

  /**
   * @inheritdoc
   */
  async close() {
    clearInterval(this.cleanupInterval);

    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }

    this.timers.clear();
    this.cache.clear();
  }

  /**
   * @inheritdoc
   */
  async healthCheck() {
    const start = Date.now();
    const testKey = `__health_${Date.now()}`;

    try {
      await this.set(testKey, 'ok', { ttl: 1 });
      const value = await this.get(testKey);
      await this.delete(testKey);

      return {
        healthy: value === 'ok',
        latency: Date.now() - start,
        provider: 'memory',
        size: this.cache.size,
        maxSize: this.maxSize
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        provider: 'memory'
      };
    }
  }

  /**
   * Obtém estatísticas do cache
   * @returns {Object}
   */
  getStats() {
    return {
      ...this.stats,
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0
    };
  }

  // ==================== MÉTODOS PRIVADOS ====================

  /**
   * Remove uma chave do cache
   * @private
   */
  _delete(key) {
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }

    const deleted = this.cache.delete(key);
    if (deleted) this.stats.deletes++;
    return deleted;
  }

  /**
   * Remove a entrada mais antiga (LRU simples)
   * @private
   */
  _evictOldest() {
    let oldestKey = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache) {
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this._delete(oldestKey);
    }
  }

  /**
   * Limpa entradas expiradas
   * @private
   */
  _cleanup() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache) {
      if (entry.expiresAt && entry.expiresAt < now) {
        this._delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[MemoryCache] Cleanup: ${cleaned} entradas expiradas removidas`);
    }
  }

  /**
   * Converte padrão glob para regex
   * @private
   */
  _patternToRegex(pattern) {
    const escaped = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    return new RegExp(`^${escaped}$`);
  }
}

export default MemoryCacheProvider;

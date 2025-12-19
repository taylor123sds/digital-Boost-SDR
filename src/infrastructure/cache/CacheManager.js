/**
 * @file infrastructure/cache/CacheManager.js
 * @description In-memory cache manager with TTL support
 * Wave 4: Infrastructure Layer - Cache
 */

/**
 * Cache Manager
 * Simple in-memory cache with TTL and statistics
 */
export class CacheManager {
  /**
   * @param {Object} options - Cache options
   * @param {Object} logger - Logger instance
   */
  constructor(options = {}, logger) {
    this.logger = logger;
    this.cache = new Map();
    this.ttls = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0
    };

    // Options
    this.defaultTTL = options.defaultTTL || 300000; // 5 minutes
    this.maxSize = options.maxSize || 1000;
    this.cleanupInterval = options.cleanupInterval || 60000; // 1 minute

    // Start cleanup interval
    this.startCleanup();
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {*} Cached value or undefined
   */
  get(key) {
    // Check if key exists
    if (!this.cache.has(key)) {
      this.stats.misses++;
      this.logger.debug('Cache miss', { key });
      return undefined;
    }

    // Check if expired
    const expiresAt = this.ttls.get(key);
    if (expiresAt && Date.now() > expiresAt) {
      this.delete(key);
      this.stats.misses++;
      this.stats.evictions++;
      this.logger.debug('Cache expired', { key });
      return undefined;
    }

    this.stats.hits++;
    this.logger.debug('Cache hit', { key });
    return this.cache.get(key);
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} ttl - TTL in milliseconds (optional)
   * @returns {void}
   */
  set(key, value, ttl = this.defaultTTL) {
    // Check max size
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictOldest();
    }

    this.cache.set(key, value);

    if (ttl > 0) {
      this.ttls.set(key, Date.now() + ttl);
    } else {
      this.ttls.delete(key);
    }

    this.stats.sets++;
    this.logger.debug('Cache set', { key, ttl });
  }

  /**
   * Delete value from cache
   * @param {string} key - Cache key
   * @returns {boolean} True if deleted
   */
  delete(key) {
    const existed = this.cache.has(key);

    this.cache.delete(key);
    this.ttls.delete(key);

    if (existed) {
      this.stats.deletes++;
      this.logger.debug('Cache delete', { key });
    }

    return existed;
  }

  /**
   * Check if key exists in cache
   * @param {string} key - Cache key
   * @returns {boolean} True if exists and not expired
   */
  has(key) {
    if (!this.cache.has(key)) {
      return false;
    }

    // Check expiration
    const expiresAt = this.ttls.get(key);
    if (expiresAt && Date.now() > expiresAt) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Clear all cache
   * @returns {void}
   */
  clear() {
    const size = this.cache.size;
    this.cache.clear();
    this.ttls.clear();
    this.logger.info('Cache cleared', { entriesCleared: size });
  }

  /**
   * Get or set value (lazy loading pattern)
   * @param {string} key - Cache key
   * @param {Function} factory - Factory function if not cached
   * @param {number} ttl - TTL in milliseconds
   * @returns {Promise<*>} Value
   */
  async getOrSet(key, factory, ttl = this.defaultTTL) {
    const cached = this.get(key);

    if (cached !== undefined) {
      return cached;
    }

    const value = await factory();
    this.set(key, value, ttl);

    return value;
  }

  /**
   * Get keys matching pattern
   * @param {string} pattern - Pattern (simple glob with *)
   * @returns {Array<string>} Matching keys
   */
  keys(pattern = '*') {
    const allKeys = Array.from(this.cache.keys());

    if (pattern === '*') {
      return allKeys;
    }

    // Convert pattern to regex
    const regex = new RegExp(
      '^' + pattern.replace(/\*/g, '.*') + '$'
    );

    return allKeys.filter(key => regex.test(key));
  }

  /**
   * Delete keys matching pattern
   * @param {string} pattern - Pattern
   * @returns {number} Number of deleted keys
   */
  deleteMany(pattern) {
    const keys = this.keys(pattern);
    keys.forEach(key => this.delete(key));
    return keys.length;
  }

  /**
   * Get multiple values
   * @param {Array<string>} keys - Cache keys
   * @returns {Map<string, *>} Key-value map
   */
  getMany(keys) {
    const result = new Map();

    keys.forEach(key => {
      const value = this.get(key);
      if (value !== undefined) {
        result.set(key, value);
      }
    });

    return result;
  }

  /**
   * Set multiple values
   * @param {Map<string, *>} entries - Key-value map
   * @param {number} ttl - TTL for all entries
   * @returns {void}
   */
  setMany(entries, ttl = this.defaultTTL) {
    entries.forEach((value, key) => {
      this.set(key, value, ttl);
    });
  }

  /**
   * Get cache size
   * @returns {number} Number of entries
   */
  size() {
    return this.cache.size;
  }

  /**
   * Get cache statistics
   * @returns {Object} Statistics
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;

    return {
      ...this.stats,
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: Math.round(hitRate * 100) / 100,
      total
    };
  }

  /**
   * Reset statistics
   * @returns {void}
   */
  resetStats() {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0
    };
    this.logger.debug('Cache stats reset');
  }

  /**
   * Evict oldest entry
   * @private
   * @returns {void}
   */
  evictOldest() {
    // Get first (oldest) key
    const firstKey = this.cache.keys().next().value;

    if (firstKey) {
      this.delete(firstKey);
      this.stats.evictions++;
      this.logger.debug('Cache eviction', { key: firstKey });
    }
  }

  /**
   * Cleanup expired entries
   * @private
   * @returns {void}
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, expiresAt] of this.ttls.entries()) {
      if (now > expiresAt) {
        this.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug('Cache cleanup', { cleaned });
    }
  }

  /**
   * Start cleanup interval
   * @private
   * @returns {void}
   */
  startCleanup() {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);

    // Don't block process exit
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }

    this.logger.debug('Cache cleanup started', {
      interval: this.cleanupInterval
    });
  }

  /**
   * Stop cleanup interval
   * @returns {void}
   */
  stopCleanup() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
      this.logger.debug('Cache cleanup stopped');
    }
  }

  /**
   * Destroy cache manager
   * @returns {void}
   */
  destroy() {
    this.stopCleanup();
    this.clear();
    this.logger.info('Cache manager destroyed');
  }
}

export default CacheManager;

// tools/intelligent_cache.js
// Sistema de Cache Inteligente para Respostas Rápidas

import crypto from 'crypto';

export class IntelligentCache {
  constructor() {
    // Cache principal com múltiplas camadas
    this.cache = new Map();
    this.frequencyCache = new Map(); // Cache para itens frequentes
    this.contextCache = new Map();   // Cache por contexto

    // Configurações
    this.config = {
      maxSize: 200,
      maxFrequencySize: 50,
      maxContextSize: 100,
      ttl: 10 * 60 * 1000,        // 10 minutos TTL padrão
      frequentTTL: 60 * 60 * 1000, // 1 hora para itens frequentes
      contextTTL: 30 * 60 * 1000,  // 30 minutos para contexto
      minAccessCount: 3             // Mínimo de acessos para ser "frequente"
    };

    // Métricas avançadas
    this.metrics = {
      hits: 0,
      misses: 0,
      frequencyHits: 0,
      contextHits: 0,
      totalRequests: 0,
      averageResponseTime: 0,
      cacheEfficiency: 0
    };

    // Configurar limpeza automática
    this.setupAutoCleanup();

    console.log('💾 IntelligentCache: Sistema de cache inteligente inicializado');
  }

  /**
   * Busca item no cache com estratégia inteligente
   * @param {string} key - Chave da busca
   * @param {Object} context - Contexto da requisição
   * @returns {Object|null} Item do cache ou null
   */
  async get(key, context = {}) {
    const startTime = Date.now();
    this.metrics.totalRequests++;

    const normalizedKey = this.normalizeKey(key);
    const contextKey = this.generateContextKey(normalizedKey, context);

    // 1. Verificar cache de frequência primeiro (mais rápido)
    const frequentItem = this.frequencyCache.get(normalizedKey);
    if (frequentItem && !this.isExpired(frequentItem, this.config.frequentTTL)) {
      this.metrics.hits++;
      this.metrics.frequencyHits++;
      this.updateAccessStats(frequentItem);

      const responseTime = Date.now() - startTime;
      this.updateAverageResponseTime(responseTime);

      console.log(`⚡ Cache HIT (Frequency): ${normalizedKey} (${responseTime}ms)`);
      return { ...frequentItem.data, source: 'frequency_cache', responseTime };
    }

    // 2. Verificar cache contextual
    const contextItem = this.contextCache.get(contextKey);
    if (contextItem && !this.isExpired(contextItem, this.config.contextTTL)) {
      this.metrics.hits++;
      this.metrics.contextHits++;
      this.updateAccessStats(contextItem);

      const responseTime = Date.now() - startTime;
      this.updateAverageResponseTime(responseTime);

      console.log(`🎯 Cache HIT (Context): ${contextKey} (${responseTime}ms)`);
      return { ...contextItem.data, source: 'context_cache', responseTime };
    }

    // 3. Verificar cache principal
    const mainItem = this.cache.get(normalizedKey);
    if (mainItem && !this.isExpired(mainItem, this.config.ttl)) {
      this.metrics.hits++;
      this.updateAccessStats(mainItem);

      // Promover para cache de frequência se acessado muito
      if (mainItem.accessCount >= this.config.minAccessCount) {
        this.promoteToFrequencyCache(normalizedKey, mainItem);
      }

      const responseTime = Date.now() - startTime;
      this.updateAverageResponseTime(responseTime);

      console.log(`💾 Cache HIT (Main): ${normalizedKey} (${responseTime}ms)`);
      return { ...mainItem.data, source: 'main_cache', responseTime };
    }

    // Cache miss
    this.metrics.misses++;
    const responseTime = Date.now() - startTime;
    this.updateAverageResponseTime(responseTime);

    console.log(`❌ Cache MISS: ${normalizedKey} (${responseTime}ms)`);
    return null;
  }

  /**
   * Armazena item no cache com estratégia inteligente
   * @param {string} key - Chave
   * @param {any} data - Dados para cachear
   * @param {Object} context - Contexto
   * @param {number} customTTL - TTL personalizado
   */
  async set(key, data, context = {}, customTTL = null) {
    const normalizedKey = this.normalizeKey(key);
    const contextKey = this.generateContextKey(normalizedKey, context);
    const timestamp = Date.now();

    const cacheItem = {
      key: normalizedKey,
      data,
      context,
      timestamp,
      accessCount: 1,
      lastAccess: timestamp,
      ttl: customTTL || this.config.ttl
    };

    // Verificar limites antes de adicionar
    this.enforceSize();

    // Armazenar no cache principal
    this.cache.set(normalizedKey, cacheItem);

    // Se tem contexto, armazenar também no cache contextual
    if (Object.keys(context).length > 0) {
      this.contextCache.set(contextKey, {
        ...cacheItem,
        contextKey
      });
    }

    console.log(`💾 Cached: ${normalizedKey} (TTL: ${cacheItem.ttl}ms)`);

    // Analisar padrões para otimização futura
    this.analyzePatterns(normalizedKey, context);
  }

  /**
   * Promove item para cache de frequência
   */
  promoteToFrequencyCache(key, item) {
    // Verificar limite do cache de frequência
    if (this.frequencyCache.size >= this.config.maxFrequencySize) {
      // Remover item menos acessado
      this.evictLeastFrequent();
    }

    this.frequencyCache.set(key, {
      ...item,
      promotedAt: Date.now()
    });

    console.log(`⬆️ Promoted to frequency cache: ${key} (${item.accessCount} accesses)`);
  }

  /**
   * Remove item menos frequente do cache de frequência
   */
  evictLeastFrequent() {
    let leastFrequentKey = null;
    let minAccessCount = Infinity;

    for (const [key, item] of this.frequencyCache) {
      if (item.accessCount < minAccessCount) {
        minAccessCount = item.accessCount;
        leastFrequentKey = key;
      }
    }

    if (leastFrequentKey) {
      this.frequencyCache.delete(leastFrequentKey);
      console.log(`🗑️ Evicted from frequency cache: ${leastFrequentKey}`);
    }
  }

  /**
   * Força cumprimento dos limites de tamanho
   */
  enforceSize() {
    // Cache principal
    if (this.cache.size >= this.config.maxSize) {
      this.evictLRU(this.cache, this.config.maxSize * 0.8); // Remove 20%
    }

    // Cache contextual
    if (this.contextCache.size >= this.config.maxContextSize) {
      this.evictLRU(this.contextCache, this.config.maxContextSize * 0.8);
    }
  }

  /**
   * Remove itens usando LRU
   */
  evictLRU(cache, targetSize) {
    const items = Array.from(cache.entries())
      .sort(([,a], [,b]) => a.lastAccess - b.lastAccess);

    const toRemove = items.length - targetSize;
    for (let i = 0; i < toRemove; i++) {
      cache.delete(items[i][0]);
    }

    console.log(`🗑️ LRU eviction: removed ${toRemove} items`);
  }

  /**
   * Verifica se item expirou
   */
  isExpired(item, ttl) {
    return Date.now() - item.timestamp > ttl;
  }

  /**
   * Atualiza estatísticas de acesso
   */
  updateAccessStats(item) {
    item.accessCount++;
    item.lastAccess = Date.now();
  }

  /**
   * Atualiza tempo médio de resposta
   */
  updateAverageResponseTime(responseTime) {
    const totalRequests = this.metrics.totalRequests;
    const currentAvg = this.metrics.averageResponseTime;

    this.metrics.averageResponseTime =
      ((currentAvg * (totalRequests - 1)) + responseTime) / totalRequests;

    this.metrics.cacheEfficiency =
      (this.metrics.hits / totalRequests) * 100;
  }

  /**
   * Normaliza chave para consistência
   */
  normalizeKey(key) {
    return key
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^\w_]/g, '');
  }

  /**
   * Gera chave contextual
   */
  generateContextKey(key, context) {
    const contextStr = JSON.stringify(context, Object.keys(context).sort());
    const hash = crypto.createHash('md5').update(contextStr).digest('hex').substring(0, 8);
    return `${key}_ctx_${hash}`;
  }

  /**
   * Analisa padrões de acesso para otimização
   */
  analyzePatterns(key, context) {
    // TODO: Implementar análise ML para prever próximos acessos
    // Por enquanto, apenas log para análise manual
    if (this.metrics.totalRequests % 100 === 0) {
      console.log('📊 Cache pattern analysis:', {
        mostAccessedKeys: this.getMostAccessedKeys(5),
        contextPatterns: this.getContextPatterns()
      });
    }
  }

  /**
   * Obtém chaves mais acessadas
   */
  getMostAccessedKeys(limit = 10) {
    const items = Array.from(this.cache.entries())
      .map(([key, item]) => ({ key, accessCount: item.accessCount }))
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, limit);

    return items;
  }

  /**
   * Obtém padrões de contexto
   */
  getContextPatterns() {
    const patterns = {};

    for (const [, item] of this.contextCache) {
      const contextType = Object.keys(item.context).join(',');
      patterns[contextType] = (patterns[contextType] || 0) + 1;
    }

    return patterns;
  }

  /**
   * Limpeza automática de itens expirados
   */
  setupAutoCleanup() {
    const cleanupInterval = 5 * 60 * 1000; // 5 minutos

    setInterval(() => {
      this.cleanup();
    }, cleanupInterval);
  }

  /**
   * Remove itens expirados
   */
  cleanup() {
    const now = Date.now();
    let removed = 0;

    // Limpar cache principal
    for (const [key, item] of this.cache) {
      if (this.isExpired(item, this.config.ttl)) {
        this.cache.delete(key);
        removed++;
      }
    }

    // Limpar cache de frequência
    for (const [key, item] of this.frequencyCache) {
      if (this.isExpired(item, this.config.frequentTTL)) {
        this.frequencyCache.delete(key);
        removed++;
      }
    }

    // Limpar cache contextual
    for (const [key, item] of this.contextCache) {
      if (this.isExpired(item, this.config.contextTTL)) {
        this.contextCache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      console.log(`🧹 Cleanup: removed ${removed} expired items`);
    }
  }

  /**
   * Obtém estatísticas detalhadas
   */
  getStats() {
    const hitRate = this.metrics.totalRequests > 0 ?
      (this.metrics.hits / this.metrics.totalRequests * 100).toFixed(1) : 0;

    return {
      ...this.metrics,
      hitRate: `${hitRate}%`,
      cacheSizes: {
        main: this.cache.size,
        frequency: this.frequencyCache.size,
        context: this.contextCache.size
      },
      memoryEstimate: this.estimateMemoryUsage(),
      topKeys: this.getMostAccessedKeys(5)
    };
  }

  /**
   * Estima uso de memória
   */
  estimateMemoryUsage() {
    let totalSize = 0;

    for (const [key, item] of this.cache) {
      totalSize += JSON.stringify({key, item}).length;
    }

    for (const [key, item] of this.frequencyCache) {
      totalSize += JSON.stringify({key, item}).length;
    }

    for (const [key, item] of this.contextCache) {
      totalSize += JSON.stringify({key, item}).length;
    }

    return `${(totalSize / 1024).toFixed(1)} KB`;
  }

  /**
   * Limpa todos os caches
   */
  clear() {
    this.cache.clear();
    this.frequencyCache.clear();
    this.contextCache.clear();

    // Reset metrics
    Object.keys(this.metrics).forEach(key => {
      this.metrics[key] = 0;
    });

    console.log('🗑️ All caches cleared');
  }

  /**
   * Destroy instance
   */
  destroy() {
    this.clear();
    console.log('💾 IntelligentCache: Destroyed');
  }
}

// Singleton instance
const intelligentCache = new IntelligentCache();

export default intelligentCache;
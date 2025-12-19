/**
 * @file PromptCacheService.js
 * @description P3-8: Cache de compiled_prompt para agent_versions
 *
 * PROPOSITO:
 * 1. Cache em memoria de prompts compilados para evitar recompilacao
 * 2. Hash-based invalidation para detectar mudancas
 * 3. Persist cache em agent_versions.compiled_prompt para durabilidade
 * 4. Reducao de latencia e custo de processamento
 *
 * FLUXO:
 * 1. getCompiledPrompt(agentId, versionId) -> busca cache
 * 2. Se cache valido (hash match) -> retorna compilado
 * 3. Se cache invalido -> compila, armazena, retorna
 * 4. setCompiledPrompt() -> atualiza cache e persiste
 *
 * @version 1.0.0
 */

import { createHash } from 'crypto';
import { getDatabase } from '../db/connection.js';
import log from '../utils/logger-wrapper.js';

class PromptCacheService {
  constructor() {
    // In-memory cache: Map<cacheKey, { compiled, hash, timestamp }>
    this.cache = new Map();

    // Cache TTL: 5 minutes (prompts rarely change during runtime)
    this.cacheTTL = 5 * 60 * 1000;

    // Stats for monitoring
    this.stats = {
      hits: 0,
      misses: 0,
      compiles: 0,
      invalidations: 0
    };

    log.info('[PROMPT-CACHE] Service initialized');
  }

  /**
   * Get database connection
   */
  getDb() {
    return getDatabase();
  }

  /**
   * Generate SHA-256 hash of prompt content
   * @param {string} content - Prompt content to hash
   * @returns {string} Hex hash
   */
  generateHash(content) {
    if (!content) return null;
    return createHash('sha256').update(content).digest('hex');
  }

  /**
   * Generate cache key for agent + version
   * @param {string} agentId - Agent ID
   * @param {string} versionId - Version ID (optional, uses active version if null)
   * @returns {string} Cache key
   */
  getCacheKey(agentId, versionId = null) {
    return versionId ? `${agentId}:${versionId}` : `${agentId}:active`;
  }

  /**
   * Get compiled prompt from cache or database
   * @param {string} agentId - Agent ID
   * @param {string} versionId - Version ID (optional)
   * @returns {Object|null} { compiled, hash, fromCache }
   */
  getCompiledPrompt(agentId, versionId = null) {
    const cacheKey = this.getCacheKey(agentId, versionId);

    // Check in-memory cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      this.stats.hits++;
      log.debug('[PROMPT-CACHE] Cache hit', { agentId, versionId, cacheKey });
      return {
        compiled: cached.compiled,
        hash: cached.hash,
        fromCache: true
      };
    }

    this.stats.misses++;

    // Try to get from database (agent_versions table)
    try {
      const db = this.getDb();

      let query, params;
      if (versionId) {
        query = `
          SELECT compiled_prompt, compiled_prompt_hash, system_prompt
          FROM agent_versions
          WHERE id = ?
        `;
        params = [versionId];
      } else {
        // Get active version for agent
        query = `
          SELECT compiled_prompt, compiled_prompt_hash, system_prompt
          FROM agent_versions
          WHERE agent_id = ? AND is_active = 1
          ORDER BY version_number DESC
          LIMIT 1
        `;
        params = [agentId];
      }

      const row = db.prepare(query).get(...params);

      if (row?.compiled_prompt && row?.compiled_prompt_hash) {
        // Verify hash is still valid (source hasn't changed)
        const currentHash = this.generateHash(row.system_prompt);

        if (currentHash === row.compiled_prompt_hash) {
          // Cache is valid, store in memory
          this.cache.set(cacheKey, {
            compiled: row.compiled_prompt,
            hash: row.compiled_prompt_hash,
            timestamp: Date.now()
          });

          log.debug('[PROMPT-CACHE] Loaded from DB', { agentId, versionId });
          return {
            compiled: row.compiled_prompt,
            hash: row.compiled_prompt_hash,
            fromCache: true,
            fromDb: true
          };
        }

        // Hash mismatch - prompt changed, need recompile
        log.debug('[PROMPT-CACHE] Hash mismatch, recompile needed', { agentId });
        this.stats.invalidations++;
      }

      // No valid cache, return source for compilation
      return null;

    } catch (error) {
      log.error('[PROMPT-CACHE] Error getting compiled prompt', error);
      return null;
    }
  }

  /**
   * Store compiled prompt in cache and database
   * @param {string} agentId - Agent ID
   * @param {string} versionId - Version ID
   * @param {string} sourcePrompt - Original system prompt
   * @param {string} compiledPrompt - Compiled/processed prompt
   * @returns {boolean} Success
   */
  setCompiledPrompt(agentId, versionId, sourcePrompt, compiledPrompt) {
    try {
      const hash = this.generateHash(sourcePrompt);
      const cacheKey = this.getCacheKey(agentId, versionId);

      // Store in memory cache
      this.cache.set(cacheKey, {
        compiled: compiledPrompt,
        hash,
        timestamp: Date.now()
      });

      // Also cache by agent's active version key
      this.cache.set(this.getCacheKey(agentId, null), {
        compiled: compiledPrompt,
        hash,
        timestamp: Date.now()
      });

      // Persist to database (only compiled_prompt and hash, not system_prompt which is immutable)
      const db = this.getDb();

      // Note: We only update compiled_prompt and hash - system_prompt is protected by immutability trigger
      db.prepare(`
        UPDATE agent_versions
        SET compiled_prompt = ?,
            compiled_prompt_hash = ?
        WHERE id = ?
      `).run(compiledPrompt, hash, versionId);

      this.stats.compiles++;
      log.debug('[PROMPT-CACHE] Stored compiled prompt', { agentId, versionId, hash: hash.substring(0, 8) });

      return true;
    } catch (error) {
      log.error('[PROMPT-CACHE] Error storing compiled prompt', error);
      return false;
    }
  }

  /**
   * Invalidate cache for an agent (all versions)
   * @param {string} agentId - Agent ID
   */
  invalidateAgent(agentId) {
    const keysToDelete = [];

    for (const key of this.cache.keys()) {
      if (key.startsWith(`${agentId}:`)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
    this.stats.invalidations += keysToDelete.length;

    log.debug('[PROMPT-CACHE] Invalidated agent cache', { agentId, keysDeleted: keysToDelete.length });
  }

  /**
   * Invalidate specific version cache
   * @param {string} agentId - Agent ID
   * @param {string} versionId - Version ID
   */
  invalidateVersion(agentId, versionId) {
    const cacheKey = this.getCacheKey(agentId, versionId);
    this.cache.delete(cacheKey);

    // Also invalidate the "active" cache since it might have changed
    this.cache.delete(this.getCacheKey(agentId, null));

    this.stats.invalidations++;
    log.debug('[PROMPT-CACHE] Invalidated version cache', { agentId, versionId });
  }

  /**
   * Get or compile prompt (main interface)
   * @param {string} agentId - Agent ID
   * @param {string} versionId - Version ID
   * @param {string} sourcePrompt - Source prompt (for compilation if needed)
   * @param {Function} compileFunction - Function to compile prompt: (source) => compiled
   * @returns {string} Compiled prompt
   */
  async getOrCompile(agentId, versionId, sourcePrompt, compileFunction) {
    // Check cache first
    const cached = this.getCompiledPrompt(agentId, versionId);

    if (cached) {
      // Verify cached hash matches current source
      const currentHash = this.generateHash(sourcePrompt);
      if (currentHash === cached.hash) {
        return cached.compiled;
      }
      // Hash changed, need recompile
      log.debug('[PROMPT-CACHE] Source changed, recompiling', { agentId });
    }

    // Compile the prompt
    const compiled = await compileFunction(sourcePrompt);

    // Store in cache
    if (versionId) {
      this.setCompiledPrompt(agentId, versionId, sourcePrompt, compiled);
    } else {
      // Just store in memory if no version ID
      const cacheKey = this.getCacheKey(agentId, null);
      this.cache.set(cacheKey, {
        compiled,
        hash: this.generateHash(sourcePrompt),
        timestamp: Date.now()
      });
    }

    return compiled;
  }

  /**
   * Preload cache for active agent versions
   * Call this during startup for frequently-used agents
   * @param {string[]} agentIds - List of agent IDs to preload
   */
  preloadActiveVersions(agentIds) {
    const db = this.getDb();

    try {
      for (const agentId of agentIds) {
        const row = db.prepare(`
          SELECT id, compiled_prompt, compiled_prompt_hash
          FROM agent_versions
          WHERE agent_id = ? AND is_active = 1
          ORDER BY version_number DESC
          LIMIT 1
        `).get(agentId);

        if (row?.compiled_prompt && row?.compiled_prompt_hash) {
          const cacheKey = this.getCacheKey(agentId, row.id);
          this.cache.set(cacheKey, {
            compiled: row.compiled_prompt,
            hash: row.compiled_prompt_hash,
            timestamp: Date.now()
          });

          // Also cache under the "active" key
          this.cache.set(this.getCacheKey(agentId, null), {
            compiled: row.compiled_prompt,
            hash: row.compiled_prompt_hash,
            timestamp: Date.now()
          });
        }
      }

      log.info('[PROMPT-CACHE] Preloaded cache', { agents: agentIds.length });
    } catch (error) {
      log.error('[PROMPT-CACHE] Error preloading cache', error);
    }
  }

  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear();
    log.info('[PROMPT-CACHE] Cache cleared');
  }

  /**
   * Get cache statistics
   * @returns {Object} Stats
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0
      ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
      : 0;

    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      cacheSize: this.cache.size,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Cleanup expired entries (call periodically)
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.cacheTTL) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      log.debug('[PROMPT-CACHE] Cleanup completed', { cleaned });
    }

    return cleaned;
  }
}

// Singleton instance
let instance = null;

export function getPromptCacheService() {
  if (!instance) {
    instance = new PromptCacheService();
  }
  return instance;
}

export default PromptCacheService;

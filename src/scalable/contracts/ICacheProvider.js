/**
 * @file ICacheProvider.js
 * @description Interface/Contract para provedores de cache
 *
 * Esta interface define o contrato que qualquer implementacao de cache
 * deve seguir, permitindo trocar entre Redis e Memory sem alterar codigo
 */

/**
 * @typedef {Object} CacheOptions
 * @property {number} [ttl] - Time to live em segundos
 * @property {string} [prefix] - Prefixo para a chave
 */

/**
 * Interface para provedores de cache
 * @interface ICacheProvider
 */
export class ICacheProvider {
  /**
   * Obtém um valor do cache
   * @param {string} key - Chave do cache
   * @returns {Promise<any>} Valor ou null se não existir
   */
  async get(key) {
    throw new Error('Method get() must be implemented');
  }

  /**
   * Define um valor no cache
   * @param {string} key - Chave do cache
   * @param {any} value - Valor a ser armazenado
   * @param {CacheOptions} [options] - Opções (ttl, etc)
   * @returns {Promise<boolean>} True se sucesso
   */
  async set(key, value, options = {}) {
    throw new Error('Method set() must be implemented');
  }

  /**
   * Remove um valor do cache
   * @param {string} key - Chave do cache
   * @returns {Promise<boolean>} True se removido
   */
  async delete(key) {
    throw new Error('Method delete() must be implemented');
  }

  /**
   * Verifica se uma chave existe
   * @param {string} key - Chave do cache
   * @returns {Promise<boolean>} True se existe
   */
  async exists(key) {
    throw new Error('Method exists() must be implemented');
  }

  /**
   * Remove múltiplas chaves por padrão
   * @param {string} pattern - Padrão glob (ex: "lead:*")
   * @returns {Promise<number>} Número de chaves removidas
   */
  async deletePattern(pattern) {
    throw new Error('Method deletePattern() must be implemented');
  }

  /**
   * Incrementa um valor numérico
   * @param {string} key - Chave do cache
   * @param {number} [amount=1] - Quantidade a incrementar
   * @returns {Promise<number>} Novo valor
   */
  async increment(key, amount = 1) {
    throw new Error('Method increment() must be implemented');
  }

  /**
   * Define TTL em uma chave existente
   * @param {string} key - Chave do cache
   * @param {number} ttl - TTL em segundos
   * @returns {Promise<boolean>} True se sucesso
   */
  async expire(key, ttl) {
    throw new Error('Method expire() must be implemented');
  }

  /**
   * Obtém múltiplos valores
   * @param {string[]} keys - Array de chaves
   * @returns {Promise<Map<string, any>>} Map de chave -> valor
   */
  async getMany(keys) {
    throw new Error('Method getMany() must be implemented');
  }

  /**
   * Define múltiplos valores
   * @param {Map<string, any>} entries - Map de chave -> valor
   * @param {CacheOptions} [options] - Opções (ttl, etc)
   * @returns {Promise<boolean>} True se sucesso
   */
  async setMany(entries, options = {}) {
    throw new Error('Method setMany() must be implemented');
  }

  /**
   * Fecha a conexão com o cache
   * @returns {Promise<void>}
   */
  async close() {
    throw new Error('Method close() must be implemented');
  }

  /**
   * Verifica saúde do cache
   * @returns {Promise<{healthy: boolean, latency?: number}>}
   */
  async healthCheck() {
    throw new Error('Method healthCheck() must be implemented');
  }
}

export default ICacheProvider;

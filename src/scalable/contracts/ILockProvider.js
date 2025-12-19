/**
 * @file ILockProvider.js
 * @description Interface/Contract para provedores de lock distribuído
 *
 * Esta interface define o contrato para locks distribuídos,
 * permitindo trocar entre Redis locks e locks em memória
 */

/**
 * @typedef {Object} LockOptions
 * @property {number} [ttl=30000] - TTL do lock em ms
 * @property {number} [retryDelay=100] - Delay entre tentativas em ms
 * @property {number} [maxRetries=50] - Máximo de tentativas
 */

/**
 * @typedef {Object} LockResult
 * @property {boolean} acquired - Se o lock foi adquirido
 * @property {string} [lockId] - ID único do lock
 * @property {string} [error] - Erro se não conseguiu
 */

/**
 * Interface para provedores de lock distribuído
 * @interface ILockProvider
 */
export class ILockProvider {
  /**
   * Adquire um lock exclusivo
   * @param {string} resource - Identificador do recurso
   * @param {LockOptions} [options] - Opções do lock
   * @returns {Promise<LockResult>}
   */
  async acquire(resource, options = {}) {
    throw new Error('Method acquire() must be implemented');
  }

  /**
   * Libera um lock
   * @param {string} resource - Identificador do recurso
   * @param {string} lockId - ID do lock obtido no acquire
   * @returns {Promise<boolean>} True se liberado com sucesso
   */
  async release(resource, lockId) {
    throw new Error('Method release() must be implemented');
  }

  /**
   * Renova o TTL de um lock existente
   * @param {string} resource - Identificador do recurso
   * @param {string} lockId - ID do lock
   * @param {number} ttl - Novo TTL em ms
   * @returns {Promise<boolean>} True se renovado
   */
  async extend(resource, lockId, ttl) {
    throw new Error('Method extend() must be implemented');
  }

  /**
   * Verifica se um recurso está travado
   * @param {string} resource - Identificador do recurso
   * @returns {Promise<boolean>} True se travado
   */
  async isLocked(resource) {
    throw new Error('Method isLocked() must be implemented');
  }

  /**
   * Executa uma função com lock automático
   * @param {string} resource - Identificador do recurso
   * @param {Function} fn - Função a executar
   * @param {LockOptions} [options] - Opções do lock
   * @returns {Promise<any>} Resultado da função
   */
  async withLock(resource, fn, options = {}) {
    throw new Error('Method withLock() must be implemented');
  }

  /**
   * Obtém estatísticas dos locks
   * @returns {Promise<{active: number, waiting: number}>}
   */
  async getStats() {
    throw new Error('Method getStats() must be implemented');
  }

  /**
   * Fecha o provedor de locks
   * @returns {Promise<void>}
   */
  async close() {
    throw new Error('Method close() must be implemented');
  }
}

export default ILockProvider;

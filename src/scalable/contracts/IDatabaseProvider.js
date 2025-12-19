/**
 * @file IDatabaseProvider.js
 * @description Interface/Contract para provedores de banco de dados
 *
 * Esta interface define o contrato que permite trocar entre
 * SQLite e PostgreSQL sem alterar o código de negócio
 */

/**
 * @typedef {Object} QueryResult
 * @property {any[]} rows - Linhas retornadas
 * @property {number} rowCount - Número de linhas afetadas
 * @property {any} [lastInsertId] - ID do último insert
 */

/**
 * @typedef {Object} TransactionContext
 * @property {Function} query - Executa query na transação
 * @property {Function} commit - Confirma transação
 * @property {Function} rollback - Reverte transação
 */

/**
 * Interface para provedores de banco de dados
 * @interface IDatabaseProvider
 */
export class IDatabaseProvider {
  /**
   * Conecta ao banco de dados
   * @returns {Promise<void>}
   */
  async connect() {
    throw new Error('Method connect() must be implemented');
  }

  /**
   * Executa uma query SELECT
   * @param {string} sql - Query SQL
   * @param {any[]} [params] - Parâmetros da query
   * @returns {Promise<any[]>} Array de resultados
   */
  async query(sql, params = []) {
    throw new Error('Method query() must be implemented');
  }

  /**
   * Executa uma query que retorna uma única linha
   * @param {string} sql - Query SQL
   * @param {any[]} [params] - Parâmetros da query
   * @returns {Promise<any|null>} Objeto ou null
   */
  async queryOne(sql, params = []) {
    throw new Error('Method queryOne() must be implemented');
  }

  /**
   * Executa uma query de modificação (INSERT, UPDATE, DELETE)
   * @param {string} sql - Query SQL
   * @param {any[]} [params] - Parâmetros da query
   * @returns {Promise<QueryResult>}
   */
  async execute(sql, params = []) {
    throw new Error('Method execute() must be implemented');
  }

  /**
   * Inicia uma transação
   * @returns {Promise<TransactionContext>}
   */
  async beginTransaction() {
    throw new Error('Method beginTransaction() must be implemented');
  }

  /**
   * Executa uma função dentro de uma transação
   * @param {Function} fn - Função que recebe o contexto da transação
   * @returns {Promise<any>} Resultado da função
   */
  async transaction(fn) {
    throw new Error('Method transaction() must be implemented');
  }

  /**
   * Executa batch de queries
   * @param {Array<{sql: string, params: any[]}>} queries
   * @returns {Promise<QueryResult[]>}
   */
  async batch(queries) {
    throw new Error('Method batch() must be implemented');
  }

  /**
   * Verifica saúde da conexão
   * @returns {Promise<{healthy: boolean, latency?: number}>}
   */
  async healthCheck() {
    throw new Error('Method healthCheck() must be implemented');
  }

  /**
   * Fecha a conexão
   * @returns {Promise<void>}
   */
  async close() {
    throw new Error('Method close() must be implemented');
  }

  /**
   * Obtém estatísticas da conexão
   * @returns {Promise<{poolSize?: number, activeConnections?: number}>}
   */
  async getStats() {
    throw new Error('Method getStats() must be implemented');
  }
}

export default IDatabaseProvider;

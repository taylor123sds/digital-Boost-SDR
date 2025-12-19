/**
 * @file IQueueProvider.js
 * @description Interface/Contract para provedores de fila de mensagens
 *
 * Esta interface define o contrato para filas de mensagens,
 * permitindo trocar entre BullMQ (Redis) e fila em memória
 */

/**
 * @typedef {Object} JobOptions
 * @property {number} [delay] - Delay em ms antes de processar
 * @property {number} [attempts=3] - Número de tentativas
 * @property {Object} [backoff] - Configuração de backoff
 * @property {string} [jobId] - ID único do job
 * @property {number} [priority] - Prioridade (menor = mais prioritário)
 * @property {boolean} [removeOnComplete=true] - Remove ao completar
 * @property {boolean} [removeOnFail=false] - Remove ao falhar
 */

/**
 * @typedef {Object} Job
 * @property {string} id - ID do job
 * @property {string} name - Nome do job
 * @property {any} data - Dados do job
 * @property {number} attemptsMade - Tentativas feitas
 * @property {number} timestamp - Timestamp de criação
 */

/**
 * Interface para provedores de fila
 * @interface IQueueProvider
 */
export class IQueueProvider {
  /**
   * Adiciona um job à fila
   * @param {string} name - Nome do job
   * @param {any} data - Dados do job
   * @param {JobOptions} [options] - Opções do job
   * @returns {Promise<Job>} Job criado
   */
  async add(name, data, options = {}) {
    throw new Error('Method add() must be implemented');
  }

  /**
   * Adiciona múltiplos jobs à fila
   * @param {Array<{name: string, data: any, options?: JobOptions}>} jobs
   * @returns {Promise<Job[]>}
   */
  async addBulk(jobs) {
    throw new Error('Method addBulk() must be implemented');
  }

  /**
   * Processa jobs da fila
   * @param {string} name - Nome do job a processar
   * @param {Function} processor - Função processadora (job) => Promise
   * @param {Object} [options] - Opções do worker
   * @returns {void}
   */
  process(name, processor, options = {}) {
    throw new Error('Method process() must be implemented');
  }

  /**
   * Obtém um job pelo ID
   * @param {string} jobId - ID do job
   * @returns {Promise<Job|null>}
   */
  async getJob(jobId) {
    throw new Error('Method getJob() must be implemented');
  }

  /**
   * Obtém jobs por status
   * @param {string} status - Status (waiting, active, completed, failed)
   * @param {number} [start=0] - Início
   * @param {number} [end=100] - Fim
   * @returns {Promise<Job[]>}
   */
  async getJobs(status, start = 0, end = 100) {
    throw new Error('Method getJobs() must be implemented');
  }

  /**
   * Remove um job
   * @param {string} jobId - ID do job
   * @returns {Promise<boolean>}
   */
  async removeJob(jobId) {
    throw new Error('Method removeJob() must be implemented');
  }

  /**
   * Pausa a fila
   * @returns {Promise<void>}
   */
  async pause() {
    throw new Error('Method pause() must be implemented');
  }

  /**
   * Resume a fila
   * @returns {Promise<void>}
   */
  async resume() {
    throw new Error('Method resume() must be implemented');
  }

  /**
   * Limpa jobs da fila por status
   * @param {string} status - Status a limpar
   * @param {number} [grace=0] - Tempo de graça em ms
   * @returns {Promise<number>} Número de jobs removidos
   */
  async clean(status, grace = 0) {
    throw new Error('Method clean() must be implemented');
  }

  /**
   * Obtém contagem de jobs por status
   * @returns {Promise<{waiting: number, active: number, completed: number, failed: number}>}
   */
  async getJobCounts() {
    throw new Error('Method getJobCounts() must be implemented');
  }

  /**
   * Registra handler para eventos
   * @param {string} event - Nome do evento
   * @param {Function} handler - Handler do evento
   */
  on(event, handler) {
    throw new Error('Method on() must be implemented');
  }

  /**
   * Fecha a fila
   * @returns {Promise<void>}
   */
  async close() {
    throw new Error('Method close() must be implemented');
  }
}

export default IQueueProvider;

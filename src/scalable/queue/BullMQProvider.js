/**
 * @file BullMQProvider.js
 * @description Implementação de fila com BullMQ para produção
 *
 * Usa Redis como backend para filas distribuídas
 * Suporta: delayed jobs, retries, prioridade, rate limiting
 */

import { Queue, Worker, QueueEvents, Job } from 'bullmq';

/**
 * Configuração padrão de conexão Redis
 */
const DEFAULT_REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_QUEUE_DB) || 1
};

/**
 * Implementação de fila com BullMQ
 * @implements {IQueueProvider}
 */
export class BullMQProvider {
  /**
   * @param {string} name - Nome da fila
   * @param {Object} opts - Opções
   * @param {Object} [opts.connection] - Configuração Redis
   * @param {number} [opts.concurrency] - Concorrência do worker
   * @param {Object} [opts.defaultJobOptions] - Opções padrão para jobs
   */
  constructor(name, opts = {}) {
    this.name = name;
    this.opts = opts;

    // Configuração de conexão
    this.connection = opts.connection || DEFAULT_REDIS_CONFIG;

    // Criar fila
    this.queue = new Queue(name, {
      connection: this.connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000
        },
        removeOnComplete: {
          count: 1000,
          age: 24 * 3600 // 24 horas
        },
        removeOnFail: {
          count: 5000,
          age: 7 * 24 * 3600 // 7 dias
        },
        ...opts.defaultJobOptions
      }
    });

    // Worker (opcional, pode ser criado separadamente)
    this.worker = null;
    this.concurrency = opts.concurrency || 5;

    // Events listener
    this.queueEvents = null;
    this._eventHandlers = new Map();

    // Estado
    this._closed = false;
  }

  // ==================== ADICIONAR JOBS ====================

  /**
   * Adiciona job à fila
   * @param {string} name - Nome do job
   * @param {Object} data - Dados do job
   * @param {Object} opts - Opções
   * @returns {Promise<Job>}
   */
  async add(name, data, opts = {}) {
    if (this._closed) {
      throw new Error('Queue is closed');
    }

    const job = await this.queue.add(name, data, {
      ...opts,
      // Adicionar tenant_id se disponível no contexto
      ...(data.tenantId && { jobId: `${data.tenantId}:${opts.jobId || Date.now()}` })
    });

    return job;
  }

  /**
   * Adiciona múltiplos jobs em batch
   * @param {Array<{name: string, data: Object, opts?: Object}>} jobs
   * @returns {Promise<Job[]>}
   */
  async addBulk(jobs) {
    if (this._closed) {
      throw new Error('Queue is closed');
    }

    const bulkJobs = jobs.map(({ name, data, opts }) => ({
      name,
      data,
      opts
    }));

    return this.queue.addBulk(bulkJobs);
  }

  /**
   * Adiciona job com atraso
   * @param {string} name
   * @param {Object} data
   * @param {number} delay - Delay em ms
   * @param {Object} opts
   */
  async addDelayed(name, data, delay, opts = {}) {
    return this.add(name, data, { ...opts, delay });
  }

  /**
   * Adiciona job programado (cron)
   * @param {string} name
   * @param {Object} data
   * @param {string} pattern - Cron pattern
   * @param {Object} opts
   */
  async addRepeatable(name, data, pattern, opts = {}) {
    return this.add(name, data, {
      ...opts,
      repeat: {
        pattern,
        ...opts.repeat
      }
    });
  }

  // ==================== PROCESSAR JOBS ====================

  /**
   * Define processador de jobs
   * @param {Function} processor - Função processadora
   * @param {Object} opts - Opções do worker
   */
  process(processor, opts = {}) {
    if (this.worker) {
      throw new Error('Worker already defined');
    }

    this.worker = new Worker(
      this.name,
      async (job) => {
        return processor(job);
      },
      {
        connection: this.connection,
        concurrency: opts.concurrency || this.concurrency,
        limiter: opts.limiter,
        ...opts
      }
    );

    // Configurar event handlers
    this._setupWorkerEvents();

    return this.worker;
  }

  /**
   * Configura eventos do worker
   * @private
   */
  _setupWorkerEvents() {
    if (!this.worker) return;

    this.worker.on('completed', (job, result) => {
      this._emit('completed', job, result);
    });

    this.worker.on('failed', (job, error) => {
      console.error(`[Queue:${this.name}] Job ${job?.id} falhou:`, error.message);
      this._emit('failed', job, error);
    });

    this.worker.on('active', (job) => {
      this._emit('active', job);
    });

    this.worker.on('progress', (job, progress) => {
      this._emit('progress', job, progress);
    });

    this.worker.on('error', (error) => {
      console.error(`[Queue:${this.name}] Worker error:`, error.message);
      this._emit('error', error);
    });

    this.worker.on('stalled', (jobId) => {
      console.warn(`[Queue:${this.name}] Job ${jobId} stalled`);
      this._emit('stalled', jobId);
    });
  }

  // ==================== EVENT HANDLING ====================

  /**
   * Registra handler de evento
   * @param {string} event
   * @param {Function} handler
   */
  on(event, handler) {
    if (!this._eventHandlers.has(event)) {
      this._eventHandlers.set(event, []);
    }
    this._eventHandlers.get(event).push(handler);
  }

  /**
   * Emite evento
   * @private
   */
  _emit(event, ...args) {
    const handlers = this._eventHandlers.get(event) || [];
    for (const handler of handlers) {
      try {
        handler(...args);
      } catch (error) {
        console.error(`[Queue:${this.name}] Event handler error:`, error);
      }
    }
  }

  /**
   * Inicia listener de eventos da fila
   */
  async startEventListener() {
    if (this.queueEvents) return;

    this.queueEvents = new QueueEvents(this.name, {
      connection: this.connection
    });

    await this.queueEvents.waitUntilReady();
  }

  // ==================== CONSULTAS ====================

  /**
   * Busca job por ID
   * @param {string} id
   * @returns {Promise<Job|null>}
   */
  async getJob(id) {
    return this.queue.getJob(id);
  }

  /**
   * Lista jobs por estado
   * @param {string} state
   * @param {number} start
   * @param {number} end
   * @returns {Promise<Job[]>}
   */
  async getJobs(state, start = 0, end = -1) {
    const types = {
      waiting: 'waiting',
      active: 'active',
      completed: 'completed',
      failed: 'failed',
      delayed: 'delayed',
      paused: 'paused'
    };

    return this.queue.getJobs([types[state] || state], start, end);
  }

  /**
   * Contagem de jobs por estado
   * @returns {Promise<Object>}
   */
  async getJobCounts() {
    return this.queue.getJobCounts(
      'waiting',
      'active',
      'completed',
      'failed',
      'delayed',
      'paused'
    );
  }

  /**
   * Lista jobs ativos
   */
  async getActiveJobs() {
    return this.queue.getActive();
  }

  /**
   * Lista jobs em espera
   */
  async getWaitingJobs() {
    return this.queue.getWaiting();
  }

  /**
   * Lista jobs com falha
   */
  async getFailedJobs() {
    return this.queue.getFailed();
  }

  /**
   * Lista jobs delayed
   */
  async getDelayedJobs() {
    return this.queue.getDelayed();
  }

  // ==================== CONTROLE ====================

  /**
   * Pausa a fila
   */
  async pause() {
    await this.queue.pause();
    if (this.worker) {
      await this.worker.pause();
    }
  }

  /**
   * Retoma a fila
   */
  async resume() {
    await this.queue.resume();
    if (this.worker) {
      this.worker.resume();
    }
  }

  /**
   * Verifica se está pausada
   */
  async isPaused() {
    return this.queue.isPaused();
  }

  /**
   * Limpa jobs por estado
   * @param {string} state - completed, failed, delayed, wait
   * @param {number} grace - Jobs mais antigos que grace ms
   */
  async clean(state, grace = 0) {
    const stateMap = {
      completed: 'completed',
      failed: 'failed',
      delayed: 'delayed',
      waiting: 'wait'
    };

    return this.queue.clean(grace, 1000, stateMap[state] || state);
  }

  /**
   * Esvazia a fila
   */
  async drain() {
    await this.queue.drain();
  }

  /**
   * Remove jobs repetitivos
   * @param {string} name - Nome do job repetitivo
   */
  async removeRepeatable(name) {
    const repeatableJobs = await this.queue.getRepeatableJobs();
    for (const job of repeatableJobs) {
      if (job.name === name) {
        await this.queue.removeRepeatableByKey(job.key);
      }
    }
  }

  /**
   * Retenta job com falha
   * @param {string} jobId
   */
  async retryJob(jobId) {
    const job = await this.getJob(jobId);
    if (job) {
      await job.retry();
    }
  }

  /**
   * Retenta todos os jobs com falha
   */
  async retryAllFailed() {
    const failed = await this.getFailedJobs();
    for (const job of failed) {
      await job.retry();
    }
  }

  // ==================== RATE LIMITING ====================

  /**
   * Configura rate limiting no worker
   * @param {Object} limiter
   * @param {number} limiter.max - Máximo de jobs
   * @param {number} limiter.duration - Período em ms
   */
  setRateLimiter(limiter) {
    // Rate limiter só pode ser configurado na criação do worker
    if (this.worker) {
      throw new Error('Cannot set rate limiter after worker is created');
    }
    this.opts.limiter = limiter;
  }

  // ==================== LIFECYCLE ====================

  /**
   * Aguarda fila ficar pronta
   */
  async waitUntilReady() {
    await this.queue.waitUntilReady();
    if (this.worker) {
      await this.worker.waitUntilReady();
    }
  }

  /**
   * Fecha a fila e worker
   */
  async close() {
    this._closed = true;

    if (this.queueEvents) {
      await this.queueEvents.close();
    }

    if (this.worker) {
      await this.worker.close();
    }

    await this.queue.close();
  }

  /**
   * Retorna estatísticas
   */
  async getStats() {
    const counts = await this.getJobCounts();
    const isPaused = await this.isPaused();

    return {
      name: this.name,
      paused: isPaused,
      closed: this._closed,
      hasWorker: !!this.worker,
      concurrency: this.concurrency,
      ...counts
    };
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      await this.queue.getJobCounts();
      return { healthy: true };
    } catch (error) {
      return { healthy: false, error: error.message };
    }
  }
}

export default BullMQProvider;

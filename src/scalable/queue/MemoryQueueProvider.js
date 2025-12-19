/**
 * @file MemoryQueueProvider.js
 * @description Implementação de fila em memória para desenvolvimento
 *
 * Simula comportamento de BullMQ para testes locais
 * NÃO USE EM PRODUÇÃO - apenas para desenvolvimento
 */

import { EventEmitter } from 'events';

/**
 * Job simulado em memória
 */
class MemoryJob {
  constructor(queue, id, name, data, opts = {}) {
    this.queue = queue;
    this.id = id;
    this.name = name;
    this.data = data;
    this.opts = opts;
    this.timestamp = Date.now();
    this.processedOn = null;
    this.finishedOn = null;
    this.attemptsMade = 0;
    this.returnvalue = null;
    this.failedReason = null;
    this.progress = 0;
    this.delay = opts.delay || 0;
    this.priority = opts.priority || 0;

    // Estados: waiting, active, completed, failed, delayed
    this._state = this.delay > 0 ? 'delayed' : 'waiting';
  }

  /**
   * Atualiza progresso do job
   */
  async updateProgress(progress) {
    this.progress = progress;
    this.queue.emit('progress', this, progress);
  }

  /**
   * Move para estado de espera
   */
  async moveToWaiting() {
    this._state = 'waiting';
  }

  /**
   * Obtém estado atual
   */
  async getState() {
    return this._state;
  }

  /**
   * Remove o job da fila
   */
  async remove() {
    this.queue._removeJob(this.id);
  }

  /**
   * Retenta o job
   */
  async retry() {
    this._state = 'waiting';
    this.attemptsMade = 0;
    this.failedReason = null;
  }

  /**
   * Converte para JSON
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      data: this.data,
      opts: this.opts,
      timestamp: this.timestamp,
      processedOn: this.processedOn,
      finishedOn: this.finishedOn,
      attemptsMade: this.attemptsMade,
      returnvalue: this.returnvalue,
      failedReason: this.failedReason,
      progress: this.progress,
      state: this._state
    };
  }
}

/**
 * Implementação de fila em memória
 * @implements {IQueueProvider}
 */
export class MemoryQueueProvider extends EventEmitter {
  /**
   * @param {string} name - Nome da fila
   * @param {Object} opts - Opções
   */
  constructor(name, opts = {}) {
    super();
    this.name = name;
    this.opts = opts;

    // Storage
    this._jobs = new Map();
    this._waiting = [];
    this._active = new Map();
    this._completed = [];
    this._failed = [];
    this._delayed = [];

    // Contadores
    this._jobCounter = 0;

    // Estado
    this._paused = false;
    this._closed = false;
    this._processor = null;
    this._concurrency = opts.concurrency || 1;
    this._activeCount = 0;

    // Timers
    this._delayTimer = null;
    this._processTimer = null;

    // Iniciar processamento de delays
    this._startDelayProcessor();
  }

  // ==================== ADICIONAR JOBS ====================

  /**
   * Adiciona job à fila
   * @param {string} name - Nome do job
   * @param {Object} data - Dados do job
   * @param {Object} opts - Opções
   * @returns {Promise<MemoryJob>}
   */
  async add(name, data, opts = {}) {
    if (this._closed) {
      throw new Error('Queue is closed');
    }

    const id = opts.jobId || `${++this._jobCounter}`;

    // Verificar se job já existe
    if (opts.jobId && this._jobs.has(id)) {
      return this._jobs.get(id);
    }

    const job = new MemoryJob(this, id, name, data, opts);
    this._jobs.set(id, job);

    if (job.delay > 0) {
      this._delayed.push(job);
      this._delayed.sort((a, b) =>
        (a.timestamp + a.delay) - (b.timestamp + b.delay)
      );
    } else {
      this._waiting.push(job);
      this._sortWaiting();
    }

    this.emit('waiting', job);

    // Tentar processar imediatamente
    this._tryProcess();

    return job;
  }

  /**
   * Adiciona múltiplos jobs
   * @param {Array<{name: string, data: Object, opts?: Object}>} jobs
   * @returns {Promise<MemoryJob[]>}
   */
  async addBulk(jobs) {
    const results = [];
    for (const { name, data, opts } of jobs) {
      const job = await this.add(name, data, opts);
      results.push(job);
    }
    return results;
  }

  // ==================== PROCESSAR JOBS ====================

  /**
   * Define processador de jobs
   * @param {Function} processor - Função processadora
   * @param {Object} opts - Opções
   */
  process(processor, opts = {}) {
    this._processor = processor;
    this._concurrency = opts.concurrency || this._concurrency;
    this._tryProcess();
  }

  /**
   * Tenta processar próximo job
   * @private
   */
  async _tryProcess() {
    if (this._paused || this._closed || !this._processor) {
      return;
    }

    while (
      this._activeCount < this._concurrency &&
      this._waiting.length > 0
    ) {
      const job = this._waiting.shift();
      if (!job) break;

      this._activeCount++;
      job._state = 'active';
      job.processedOn = Date.now();
      this._active.set(job.id, job);

      this.emit('active', job);

      // Processar job de forma assíncrona
      this._processJob(job);
    }
  }

  /**
   * Processa um job específico
   * @private
   */
  async _processJob(job) {
    const attempts = job.opts.attempts || 1;
    const backoff = job.opts.backoff || { type: 'fixed', delay: 1000 };

    try {
      job.attemptsMade++;
      const result = await this._processor(job);

      // Sucesso
      job._state = 'completed';
      job.finishedOn = Date.now();
      job.returnvalue = result;

      this._active.delete(job.id);
      this._completed.push(job);

      // Limitar histórico
      if (this._completed.length > 1000) {
        const removed = this._completed.shift();
        this._jobs.delete(removed.id);
      }

      this.emit('completed', job, result);

    } catch (error) {
      // Falha
      if (job.attemptsMade < attempts) {
        // Retry
        job._state = 'delayed';
        this._active.delete(job.id);

        const delay = this._calculateBackoff(backoff, job.attemptsMade);
        job.delay = delay;
        job.timestamp = Date.now();

        this._delayed.push(job);
        this._delayed.sort((a, b) =>
          (a.timestamp + a.delay) - (b.timestamp + b.delay)
        );

        this.emit('retrying', job, error);

      } else {
        // Falha definitiva
        job._state = 'failed';
        job.finishedOn = Date.now();
        job.failedReason = error.message;

        this._active.delete(job.id);
        this._failed.push(job);

        // Limitar histórico
        if (this._failed.length > 1000) {
          const removed = this._failed.shift();
          this._jobs.delete(removed.id);
        }

        this.emit('failed', job, error);
      }
    }

    this._activeCount--;
    this._tryProcess();
  }

  /**
   * Calcula delay de backoff
   * @private
   */
  _calculateBackoff(backoff, attempt) {
    if (backoff.type === 'exponential') {
      return Math.min(
        backoff.delay * Math.pow(2, attempt - 1),
        30000 // Max 30s
      );
    }
    return backoff.delay || 1000;
  }

  // ==================== DELAY PROCESSOR ====================

  /**
   * Inicia processador de jobs delayed
   * @private
   */
  _startDelayProcessor() {
    this._delayTimer = setInterval(() => {
      this._processDelayed();
    }, 100); // Check a cada 100ms
  }

  /**
   * Move jobs delayed para waiting
   * @private
   */
  _processDelayed() {
    const now = Date.now();

    while (this._delayed.length > 0) {
      const job = this._delayed[0];
      const runAt = job.timestamp + job.delay;

      if (runAt <= now) {
        this._delayed.shift();
        job._state = 'waiting';
        job.delay = 0;
        this._waiting.push(job);
        this._sortWaiting();
        this._tryProcess();
      } else {
        break;
      }
    }
  }

  /**
   * Ordena fila de espera por prioridade
   * @private
   */
  _sortWaiting() {
    this._waiting.sort((a, b) => b.priority - a.priority);
  }

  // ==================== CONSULTAS ====================

  /**
   * Busca job por ID
   * @param {string} id
   * @returns {Promise<MemoryJob|null>}
   */
  async getJob(id) {
    return this._jobs.get(String(id)) || null;
  }

  /**
   * Lista jobs por estado
   * @param {string} state - waiting, active, completed, failed, delayed
   * @param {number} start
   * @param {number} end
   * @returns {Promise<MemoryJob[]>}
   */
  async getJobs(state, start = 0, end = -1) {
    let jobs;

    switch (state) {
      case 'waiting':
        jobs = this._waiting;
        break;
      case 'active':
        jobs = Array.from(this._active.values());
        break;
      case 'completed':
        jobs = this._completed;
        break;
      case 'failed':
        jobs = this._failed;
        break;
      case 'delayed':
        jobs = this._delayed;
        break;
      default:
        jobs = Array.from(this._jobs.values());
    }

    if (end === -1) end = jobs.length;
    return jobs.slice(start, end);
  }

  /**
   * Contagem de jobs por estado
   * @returns {Promise<Object>}
   */
  async getJobCounts() {
    return {
      waiting: this._waiting.length,
      active: this._active.size,
      completed: this._completed.length,
      failed: this._failed.length,
      delayed: this._delayed.length
    };
  }

  // ==================== CONTROLE ====================

  /**
   * Pausa a fila
   */
  async pause() {
    this._paused = true;
    this.emit('paused');
  }

  /**
   * Retoma a fila
   */
  async resume() {
    this._paused = false;
    this.emit('resumed');
    this._tryProcess();
  }

  /**
   * Verifica se está pausada
   */
  async isPaused() {
    return this._paused;
  }

  /**
   * Limpa jobs por estado
   * @param {string} state
   * @param {number} grace - Jobs mais antigos que grace ms
   */
  async clean(state, grace = 0) {
    const now = Date.now();
    const threshold = now - grace;
    let removed = 0;

    const cleanList = (list, finishedField = 'finishedOn') => {
      const keep = [];
      for (const job of list) {
        if (job[finishedField] && job[finishedField] < threshold) {
          this._jobs.delete(job.id);
          removed++;
        } else {
          keep.push(job);
        }
      }
      return keep;
    };

    switch (state) {
      case 'completed':
        this._completed = cleanList(this._completed);
        break;
      case 'failed':
        this._failed = cleanList(this._failed);
        break;
      case 'delayed':
        this._delayed = cleanList(this._delayed, 'timestamp');
        break;
    }

    return removed;
  }

  /**
   * Esvazia a fila
   */
  async drain() {
    this._waiting = [];
    this._delayed = [];
  }

  /**
   * Remove job específico
   * @private
   */
  _removeJob(id) {
    const job = this._jobs.get(id);
    if (!job) return;

    this._jobs.delete(id);
    this._waiting = this._waiting.filter(j => j.id !== id);
    this._active.delete(id);
    this._completed = this._completed.filter(j => j.id !== id);
    this._failed = this._failed.filter(j => j.id !== id);
    this._delayed = this._delayed.filter(j => j.id !== id);
  }

  /**
   * Fecha a fila
   */
  async close() {
    this._closed = true;

    if (this._delayTimer) {
      clearInterval(this._delayTimer);
    }

    // Aguardar jobs ativos terminarem
    while (this._activeCount > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.emit('closed');
  }

  /**
   * Retorna estatísticas
   */
  async getStats() {
    const counts = await this.getJobCounts();
    return {
      name: this.name,
      paused: this._paused,
      closed: this._closed,
      concurrency: this._concurrency,
      ...counts,
      total: this._jobs.size
    };
  }
}

export default MemoryQueueProvider;

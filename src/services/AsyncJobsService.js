/**
 * @file AsyncJobsService.js
 * @description P3-2: Persistent job queue using async_jobs table
 *
 * PROPÓSITO:
 * 1. Substituir filas em memória (MessageQueue, ContactLockManager)
 * 2. Sobreviver a restart do processo
 * 3. Permitir processamento distribuído (múltiplas instâncias)
 * 4. Rastreabilidade de todos os jobs
 * 5. Retry automático com backoff exponencial
 *
 * TIPOS DE JOBS:
 * - 'message_process': Processar mensagem de entrada
 * - 'message_send': Enviar mensagem de saída
 * - 'cadence_step': Executar step de cadência
 * - 'lead_sync': Sincronizar lead com Sheets
 * - 'webhook_retry': Reprocessar webhook que falhou
 *
 * @version 1.0.0
 */

import { getDatabase } from '../db/connection.js';
import log from '../utils/logger-wrapper.js';

// Job types enum
export const JobType = {
  MESSAGE_PROCESS: 'message_process',
  MESSAGE_SEND: 'message_send',
  CADENCE_STEP: 'cadence_step',
  LEAD_SYNC: 'lead_sync',
  WEBHOOK_RETRY: 'webhook_retry',
  NOTIFICATION: 'notification',
  CLEANUP: 'cleanup'
};

// Job priority levels
export const JobPriority = {
  LOW: -1,
  NORMAL: 0,
  HIGH: 1
};

class AsyncJobsService {
  constructor() {
    this.workerId = `worker_${process.pid}_${Date.now()}`;
    this.isProcessing = false;
    this.processingInterval = null;

    log.info('[ASYNC-JOBS] Service initialized', { workerId: this.workerId });
  }

  /**
   * Get database connection
   */
  getDb() {
    return getDatabase();
  }

  /**
   * Generate unique ID for job
   */
  generateId() {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Enqueue a new job
   * @param {string} jobType - Type of job (from JobType enum)
   * @param {Object} payload - Job payload data
   * @param {Object} options - Optional settings
   * @returns {Object} Created job
   */
  enqueue(jobType, payload, options = {}) {
    const db = this.getDb();

    const {
      tenantId = 'default',
      contactId = null,
      priority = JobPriority.NORMAL,
      maxRetries = 3,
      timeoutSeconds = 60,
      scheduledFor = null
    } = options;

    const id = this.generateId();
    const payloadJson = JSON.stringify(payload);
    const scheduleTime = scheduledFor || new Date().toISOString();

    try {
      const stmt = db.prepare(`
        INSERT INTO async_jobs (
          id, tenant_id, job_type, priority, contact_id,
          payload_json, max_retries, timeout_seconds, scheduled_for
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        id, tenantId, jobType, priority, contactId,
        payloadJson, maxRetries, timeoutSeconds, scheduleTime
      );

      log.debug('[ASYNC-JOBS] Job enqueued', {
        id,
        jobType,
        contactId,
        priority
      });

      return { id, jobType, contactId, status: 'pending' };

    } catch (error) {
      log.error('[ASYNC-JOBS] Failed to enqueue job', error);
      throw error;
    }
  }

  /**
   * Dequeue next available job (with contact lock)
   * @param {string[]} jobTypes - Optional filter by job types
   * @returns {Object|null} Job or null if no jobs available
   */
  dequeue(jobTypes = null) {
    const db = this.getDb();

    try {
      // Build query with optional job type filter
      let typeFilter = '';
      const params = [this.workerId];

      if (jobTypes && jobTypes.length > 0) {
        typeFilter = `AND job_type IN (${jobTypes.map(() => '?').join(',')})`;
        params.push(...jobTypes);
      }

      // Use UPDATE...RETURNING for atomic dequeue
      // Excludes jobs for contacts that have another job processing
      const job = db.prepare(`
        UPDATE async_jobs /* tenant-guard: ignore */ SET
          status = 'processing',
          locked_by = ?,
          locked_at = datetime('now'),
          started_at = datetime('now')
        WHERE id = (
          SELECT id FROM async_jobs /* tenant-guard: ignore */
          WHERE status = 'pending'
            AND datetime(scheduled_for) <= datetime('now')
            ${typeFilter}
            AND (contact_id IS NULL OR contact_id NOT IN (
              SELECT contact_id FROM async_jobs /* tenant-guard: ignore */
              WHERE status = 'processing' AND contact_id IS NOT NULL
            ))
          ORDER BY priority DESC, scheduled_for ASC
          LIMIT 1
        )
        RETURNING *
      `).get(...params);

      if (job) {
        job.payload = JSON.parse(job.payload_json);
        log.debug('[ASYNC-JOBS] Job dequeued', {
          id: job.id,
          jobType: job.job_type,
          contactId: job.contact_id
        });
      }

      return job || null;

    } catch (error) {
      log.error('[ASYNC-JOBS] Failed to dequeue job', error);
      return null;
    }
  }

  /**
   * Mark job as completed
   * @param {string} jobId - Job ID
   * @param {Object} result - Optional result data
   */
  complete(jobId, result = null) {
    const db = this.getDb();

    const resultJson = result ? JSON.stringify(result) : null;

    db.prepare(`
      UPDATE async_jobs /* tenant-guard: ignore */ SET
        status = 'completed',
        result_json = ?,
        completed_at = datetime('now'),
        locked_by = NULL,
        locked_at = NULL
      WHERE id = ?
    `).run(resultJson, jobId);

    log.debug('[ASYNC-JOBS] Job completed', { jobId });
  }

  /**
   * Mark job as failed (for retry)
   * @param {string} jobId - Job ID
   * @param {Error|string} error - Error object or message
   */
  fail(jobId, error) {
    const db = this.getDb();

    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : null;

    // Get current retry count to calculate backoff
    const job = db.prepare('SELECT retry_count FROM async_jobs /* tenant-guard: ignore */ WHERE id = ?').get(jobId);
    const retryCount = (job?.retry_count || 0) + 1;

    // Exponential backoff: 30s, 60s, 120s, 240s...
    const backoffSeconds = Math.pow(2, retryCount) * 30;

    db.prepare(`
      UPDATE async_jobs /* tenant-guard: ignore */ SET
        status = 'failed',
        error_message = ?,
        error_stack = ?,
        retry_count = ?,
        next_retry_at = datetime('now', '+' || ? || ' seconds'),
        locked_by = NULL,
        locked_at = NULL
      WHERE id = ?
    `).run(errorMessage, errorStack, retryCount, backoffSeconds, jobId);

    log.warn('[ASYNC-JOBS] Job failed', {
      jobId,
      errorMessage,
      retryCount,
      nextRetrySeconds: backoffSeconds
    });
  }

  /**
   * Cancel a pending job
   * @param {string} jobId - Job ID
   * @returns {boolean} True if cancelled
   */
  cancel(jobId) {
    const db = this.getDb();

    const result = db.prepare(`
      UPDATE async_jobs /* tenant-guard: ignore */
      SET status = 'cancelled'
      WHERE id = ? AND status = 'pending'
    `).run(jobId);

    if (result.changes > 0) {
      log.debug('[ASYNC-JOBS] Job cancelled', { jobId });
      return true;
    }
    return false;
  }

  /**
   * Get jobs ready for retry
   * @param {number} limit - Max jobs to return
   * @returns {Array} Jobs ready for retry
   */
  getJobsForRetry(limit = 10) {
    const db = this.getDb();

    const jobs = db.prepare(`
      SELECT * FROM async_jobs /* tenant-guard: ignore */
      WHERE status = 'failed'
        AND retry_count < max_retries
        AND datetime(next_retry_at) <= datetime('now')
      ORDER BY priority DESC, next_retry_at ASC
      LIMIT ?
    `).all(limit);

    return jobs.map(j => ({
      ...j,
      payload: JSON.parse(j.payload_json)
    }));
  }

  /**
   * Reset job from failed to pending for retry
   * @param {string} jobId - Job ID
   */
  resetForRetry(jobId) {
    const db = this.getDb();

    db.prepare(`
      UPDATE async_jobs /* tenant-guard: ignore */ SET
        status = 'pending',
        next_retry_at = NULL
      WHERE id = ? AND status = 'failed' AND retry_count < max_retries
    `).run(jobId);

    log.debug('[ASYNC-JOBS] Job reset for retry', { jobId });
  }

  /**
   * Recover timed out jobs (stuck in processing)
   * @param {number} defaultTimeoutSeconds - Default timeout if not set per job
   * @returns {number} Number of jobs recovered
   */
  recoverTimeoutJobs(defaultTimeoutSeconds = 120) {
    const db = this.getDb();

    // Find and reset jobs that have been processing too long
    const result = db.prepare(`
      UPDATE async_jobs /* tenant-guard: ignore */ SET
        status = 'pending',
        locked_by = NULL,
        locked_at = NULL,
        started_at = NULL,
        retry_count = retry_count + 1,
        error_message = 'Recovered from timeout'
      WHERE status = 'processing'
        AND datetime(locked_at) < datetime('now', '-' || COALESCE(timeout_seconds, ?) || ' seconds')
    `).run(defaultTimeoutSeconds);

    if (result.changes > 0) {
      log.warn('[ASYNC-JOBS] Recovered timeout jobs', { count: result.changes });
    }

    return result.changes;
  }

  /**
   * Get job by ID
   * @param {string} jobId - Job ID
   * @returns {Object|null} Job data
   */
  getById(jobId) {
    const db = this.getDb();
    const job = db.prepare('SELECT * FROM async_jobs /* tenant-guard: ignore */ WHERE id = ?').get(jobId);

    if (job) {
      job.payload = JSON.parse(job.payload_json);
      if (job.result_json) {
        job.result = JSON.parse(job.result_json);
      }
    }

    return job;
  }

  /**
   * Get jobs for a specific contact
   * @param {string} contactId - Contact ID (phone)
   * @param {Object} options - Query options
   * @returns {Array} Jobs
   */
  getByContact(contactId, options = {}) {
    const db = this.getDb();
    const { limit = 50, status = null } = options;

    let query = `
      SELECT id, job_type, status, priority, created_at, completed_at, error_message
      FROM async_jobs /* tenant-guard: ignore */
      WHERE contact_id = ?
    `;
    const params = [contactId];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);

    return db.prepare(query).all(...params);
  }

  /**
   * Check if contact has any processing jobs
   * @param {string} contactId - Contact ID
   * @returns {boolean} True if contact is locked
   */
  isContactLocked(contactId) {
    const db = this.getDb();

    const result = db.prepare(`
      SELECT COUNT(*) as count FROM async_jobs /* tenant-guard: ignore */
      WHERE contact_id = ? AND status = 'processing'
    `).get(contactId);

    return result.count > 0;
  }

  /**
   * Get queue statistics
   * @param {string} tenantId - Optional tenant filter
   * @returns {Object} Stats
   */
  getStats(tenantId = null) {
    const db = this.getDb();

    let query = `
      SELECT
        job_type,
        status,
        COUNT(*) as count,
        AVG(CASE WHEN completed_at IS NOT NULL AND started_at IS NOT NULL
          THEN (julianday(completed_at) - julianday(started_at)) * 86400
          ELSE NULL END) as avg_duration_seconds
      FROM async_jobs /* tenant-guard: ignore */
      WHERE created_at > datetime('now', '-24 hours')
    `;
    const params = [];

    if (tenantId) {
      query += ' AND tenant_id = ?';
      params.push(tenantId);
    }

    query += ' GROUP BY job_type, status';

    const stats = db.prepare(query).all(...params);

    // Get pending count
    const pendingCount = db.prepare(`
      SELECT COUNT(*) as count FROM async_jobs /* tenant-guard: ignore */
      WHERE status = 'pending'
    `).get();

    // Get processing count
    const processingCount = db.prepare(`
      SELECT COUNT(*) as count FROM async_jobs /* tenant-guard: ignore */
      WHERE status = 'processing'
    `).get();

    return {
      pending: pendingCount.count,
      processing: processingCount.count,
      byTypeAndStatus: stats,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Cleanup old completed/failed jobs
   * @param {number} daysToKeep - Days to keep
   * @returns {number} Jobs deleted
   */
  cleanup(daysToKeep = 7) {
    const db = this.getDb();

    const result = db.prepare(`
      DELETE FROM async_jobs /* tenant-guard: ignore */
      WHERE status IN ('completed', 'cancelled')
        AND datetime(created_at) < datetime('now', '-' || ? || ' days')
    `).run(daysToKeep);

    if (result.changes > 0) {
      log.info('[ASYNC-JOBS] Cleanup completed', {
        deleted: result.changes,
        daysToKeep
      });
    }

    return result.changes;
  }

  /**
   * Start background job processor
   * @param {Function} handler - Function to process jobs: async (job) => result
   * @param {Object} options - Processor options
   */
  startProcessor(handler, options = {}) {
    const {
      intervalMs = 1000,
      jobTypes = null,
      batchSize = 1
    } = options;

    if (this.isProcessing) {
      log.warn('[ASYNC-JOBS] Processor already running');
      return;
    }

    this.isProcessing = true;

    const processLoop = async () => {
      if (!this.isProcessing) return;

      try {
        // Recover any timed out jobs first
        this.recoverTimeoutJobs();

        // Process retry jobs
        const retryJobs = this.getJobsForRetry(batchSize);
        for (const job of retryJobs) {
          this.resetForRetry(job.id);
        }

        // Dequeue and process
        for (let i = 0; i < batchSize; i++) {
          const job = this.dequeue(jobTypes);
          if (!job) break;

          try {
            const result = await handler(job);
            this.complete(job.id, result);
          } catch (error) {
            this.fail(job.id, error);
          }
        }
      } catch (error) {
        log.error('[ASYNC-JOBS] Processor error', error);
      }

      // Schedule next iteration
      if (this.isProcessing) {
        this.processingInterval = setTimeout(processLoop, intervalMs);
      }
    };

    // Start processing
    processLoop();
    log.info('[ASYNC-JOBS] Processor started', { intervalMs, jobTypes });
  }

  /**
   * Stop background job processor
   */
  stopProcessor() {
    this.isProcessing = false;
    if (this.processingInterval) {
      clearTimeout(this.processingInterval);
      this.processingInterval = null;
    }
    log.info('[ASYNC-JOBS] Processor stopped');
  }

  /**
   * Release lock held by current worker (for graceful shutdown)
   */
  releaseWorkerLocks() {
    const db = this.getDb();

    const result = db.prepare(`
      UPDATE async_jobs /* tenant-guard: ignore */ SET
        status = 'pending',
        locked_by = NULL,
        locked_at = NULL,
        started_at = NULL
      WHERE locked_by = ? AND status = 'processing'
    `).run(this.workerId);

    if (result.changes > 0) {
      log.info('[ASYNC-JOBS] Released worker locks', {
        workerId: this.workerId,
        count: result.changes
      });
    }

    return result.changes;
  }
}

// Singleton instance
let instance = null;

export function getAsyncJobsService() {
  if (!instance) {
    instance = new AsyncJobsService();
  }
  return instance;
}

export default AsyncJobsService;

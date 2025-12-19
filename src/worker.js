/**
 * @file worker.js
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * DEPRECATED - USE server.js with ROLE=worker INSTEAD
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * This file is DEPRECATED as of P0-3 refactoring.
 *
 * All worker functionality has been consolidated into server.js with
 * ROLE-based process control:
 *
 *   ROLE=api     → Only HTTP server (no background jobs)
 *   ROLE=worker  → Only background jobs (no HTTP server)
 *   ROLE=full    → Both (default, single-instance mode)
 *
 * To run as a worker:
 *   ROLE=worker node src/server.js
 *
 * This file will be removed in a future version.
 * See ARCHITECTURE_DECISIONS.md for details.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @deprecated Use ROLE=worker with server.js instead
 * @author ORBION Team
 * @version 1.0.0 (DEPRECATED)
 */

console.warn('═══════════════════════════════════════════════════════════');
console.warn('[DEPRECATED] worker.js is DEPRECATED');
console.warn('Use: ROLE=worker node src/server.js');
console.warn('See ARCHITECTURE_DECISIONS.md for migration guide');
console.warn('═══════════════════════════════════════════════════════════');

// Original code below (kept for backwards compatibility)
// TODO: Remove this file in next major version

/**
 * @description P0-3: Worker process for background jobs (LEGACY)
 *
 * Runs independently from the web server to handle:
 * - Cadence Engine (scheduled follow-ups)
 * - Prospecting Engine (outbound campaigns)
 * - Abandonment Detection (learning from exits)
 * - Prospect Sync (Sheet1 -> SQLite)
 * - Auto Optimizer (self-optimization)
 * - Data Sync (nightly sync)
 *
 * Benefits:
 * - Web server can be scaled independently
 * - Jobs don't block HTTP requests
 * - Failed jobs don't crash the web server
 * - Can restart worker without affecting users
 */

import { defaultLogger } from './utils/logger.enhanced.js';
import { getContainer } from './config/di-container.js';
import { getCadenceEngine } from './automation/CadenceEngine.js';
import { prospectingEngine } from './automation/ProspectingEngine.js';
import { startAbandonmentDetectionJob } from './services/AbandonmentDetectionJob.js';
import { startProspectSyncJob } from './services/ProspectSyncJob.js';
import { getAutoOptimizer } from './intelligence/AutoOptimizer.js';
import { getDataSyncService } from './services/DataSyncService.js';
// P0-3: Async Jobs Service for canonical inbound pipeline
import { getAsyncJobsService, JobType } from './services/AsyncJobsService.js';
import { getInboundEventsService } from './services/InboundEventsService.js';

const logger = defaultLogger.child({ module: 'Worker' });

// ═══════════════════════════════════════════════════════════════════════════
// Global Error Handlers
// ═══════════════════════════════════════════════════════════════════════════

process.on('unhandledRejection', (reason, promise) => {
  logger.error('[WORKER] Unhandled promise rejection:', {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined
  });
});

process.on('uncaughtException', (error) => {
  logger.error('[WORKER] Uncaught exception:', {
    error: error.message,
    stack: error.stack
  });

  // For worker, we can try to continue running
  // Only exit on truly critical errors
  if (error.message?.includes('SQLITE_CORRUPT') || error.message?.includes('ENOENT')) {
    logger.error('[WORKER] Critical error, exiting...');
    setTimeout(() => process.exit(1), 1000);
  }
});

process.on('warning', (warning) => {
  logger.warn('[WORKER] Node warning:', {
    name: warning.name,
    message: warning.message
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Graceful Shutdown
// ═══════════════════════════════════════════════════════════════════════════

let isShuttingDown = false;

async function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info(`[WORKER] Received ${signal}, shutting down gracefully...`);

  try {
    // Stop async jobs processor first (release locks)
    const asyncJobsService = getAsyncJobsService();
    if (asyncJobsService?.stopProcessor) {
      asyncJobsService.stopProcessor();
      asyncJobsService.releaseWorkerLocks();
      logger.info('[WORKER] Async Jobs Processor stopped');
    }

    // Stop engines gracefully
    const cadenceEngine = getCadenceEngine();
    if (cadenceEngine?.stop) {
      await cadenceEngine.stop();
      logger.info('[WORKER] Cadence Engine stopped');
    }

    if (prospectingEngine?.stop) {
      await prospectingEngine.stop();
      logger.info('[WORKER] Prospecting Engine stopped');
    }

    const autoOptimizer = getAutoOptimizer();
    if (autoOptimizer?.stop) {
      autoOptimizer.stop();
      logger.info('[WORKER] Auto Optimizer stopped');
    }

    const dataSyncService = getDataSyncService();
    if (dataSyncService?.stop) {
      dataSyncService.stop();
      logger.info('[WORKER] Data Sync Service stopped');
    }

    logger.info('[WORKER] All services stopped, exiting...');
    process.exit(0);
  } catch (error) {
    logger.error('[WORKER] Error during shutdown:', { error: error.message });
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ═══════════════════════════════════════════════════════════════════════════
// Worker Initialization
// ═══════════════════════════════════════════════════════════════════════════

async function initializeWorker() {
  logger.info('');
  logger.info('═══════════════════════════════════════════════════════════');
  logger.info('  LEADLY AI Agent - Worker Process v2.1.0');
  logger.info('  P0-3: Background Jobs Independent Process');
  logger.info('═══════════════════════════════════════════════════════════');
  logger.info('');

  try {
    // Initialize dependency injection container
    logger.info('[WORKER] Initializing DI container...');
    const container = getContainer();
    logger.info(`[WORKER] Container ready with ${container.getRegisteredNames().length} dependencies`);

    // Initialize core services (database)
    logger.info('[WORKER] Initializing core services...');
    await container.resolve('db');
    logger.info('[WORKER] Core services initialized');

    // ═══════════════════════════════════════════════════════════════════════
    // Start Background Jobs
    // ═══════════════════════════════════════════════════════════════════════

    // 1. Cadence Engine
    logger.info('[WORKER] Starting Cadence Engine...');
    const cadenceEngine = getCadenceEngine();
    await cadenceEngine.initialize();
    logger.info('[WORKER] Cadence Engine initialized');

    // 2. Prospecting Engine (if auto-start enabled)
    const autoStartProspecting = process.env.PROSPECTING_AUTO_START === 'true';
    if (autoStartProspecting) {
      logger.info('[WORKER] Starting Prospecting Engine (auto-start enabled)...');
      try {
        const result = await prospectingEngine.start({});
        if (result.success) {
          logger.info(`[WORKER] Prospecting Engine started with ${result.queueSize} leads in queue`);
        } else {
          logger.warn(`[WORKER] Prospecting Engine warning: ${result.error}`);
        }
      } catch (error) {
        logger.warn('[WORKER] Prospecting Engine auto-start failed:', { error: error.message });
      }
    } else {
      logger.info('[WORKER] Prospecting Engine ready (manual start via API)');
    }

    // 3. Abandonment Detection Job
    logger.info('[WORKER] Starting Abandonment Detection Job...');
    startAbandonmentDetectionJob();
    logger.info('[WORKER] Abandonment Detection Job initialized');

    // 4. Prospect Sync Job (Sheet1 -> SQLite)
    logger.info('[WORKER] Starting Prospect Sync Job...');
    startProspectSyncJob({
      schedule: '*/30 * * * *', // Every 30 minutes
      runOnStart: true
    });
    logger.info('[WORKER] Prospect Sync Job initialized (every 30 min)');

    // 5. Auto Optimizer (Level 5 Self-Optimization)
    logger.info('[WORKER] Starting Auto Optimizer...');
    const autoOptimizer = getAutoOptimizer();
    autoOptimizer.start();
    logger.info('[WORKER] Auto Optimizer initialized');

    // 6. Data Sync Service
    logger.info('[WORKER] Starting Data Sync Service...');
    const dataSyncService = getDataSyncService();
    dataSyncService.initialize();
    logger.info('[WORKER] Data Sync Service initialized (nightly: 2h, quick: 6h, retry: 1h)');

    // 7. Async Jobs Processor (CANONICAL INBOUND PIPELINE)
    logger.info('[WORKER] Starting Async Jobs Processor (P0-3)...');
    const asyncJobsService = getAsyncJobsService();
    const inboundEventsService = getInboundEventsService();

    // Import the webhook processing logic
    const { processMessageJob } = await import('./handlers/webhook_handler.js');

    asyncJobsService.startProcessor(async (job) => {
      logger.debug('[WORKER] Processing job:', {
        jobId: job.id,
        jobType: job.job_type,
        contactId: job.contact_id
      });

      switch (job.job_type) {
        case JobType.MESSAGE_PROCESS:
          try {
            // Process the message through canonical handler
            const result = await processMessageJob(job.payload);

            // Mark inbound event as processed
            if (job.payload?.inboundEventId) {
              inboundEventsService.markProcessed(job.payload.inboundEventId);
            }

            return result;
          } catch (error) {
            // Mark inbound event as error
            if (job.payload?.inboundEventId) {
              inboundEventsService.markError(job.payload.inboundEventId, error);
            }
            throw error;
          }

        case JobType.CADENCE_STEP:
          // Handled by CadenceEngine
          return { processed: true };

        case JobType.LEAD_SYNC:
          // Handled by DataSyncService
          return { processed: true };

        default:
          logger.warn('[WORKER] Unknown job type:', job.job_type);
          return { skipped: true };
      }
    }, {
      intervalMs: 500, // Check for jobs every 500ms
      jobTypes: [JobType.MESSAGE_PROCESS, JobType.MESSAGE_SEND],
      batchSize: 1 // Process one at a time for contact-level ordering
    });

    logger.info('[WORKER] Async Jobs Processor started (500ms poll, MESSAGE_PROCESS)');

    // ═══════════════════════════════════════════════════════════════════════
    // Worker Ready
    // ═══════════════════════════════════════════════════════════════════════

    logger.info('');
    logger.info('[WORKER] All background jobs started successfully!');
    logger.info('[WORKER] Jobs running:');
    logger.info('  - Cadence Engine');
    logger.info('  - Prospecting Engine' + (autoStartProspecting ? ' (auto-started)' : ' (manual)'));
    logger.info('  - Abandonment Detection');
    logger.info('  - Prospect Sync (30min)');
    logger.info('  - Auto Optimizer');
    logger.info('  - Data Sync Service');
    logger.info('  - Async Jobs Processor (CANONICAL)');
    logger.info('');
    logger.info('[WORKER] Worker process running. Press Ctrl+C to stop.');
    logger.info('');

    // Keep worker running
    setInterval(() => {
      // Heartbeat log every 5 minutes
      logger.debug('[WORKER] Heartbeat - all jobs running');
    }, 5 * 60 * 1000);

  } catch (error) {
    logger.error('[WORKER] Critical failure during initialization:', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
}

// Start worker
initializeWorker();

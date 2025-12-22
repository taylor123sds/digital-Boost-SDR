/**
 * @file server.js
 * @description Orchestrador principal do LEADLY AI Agent
 *
 * REFATORAÇÃO COMPLETA:
 * Antes: 2683 linhas monolíticas
 * Depois: 50 linhas de orchestração
 * Redução: 98%
 *
 * Arquitetura Modular:
 * - Rotas separadas por domínio (12 arquivos)
 * - Configuração isolada (express.config.js)
 * - Startup isolado (server.startup.js)
 * - Utils modularizados (message-queue.js)
 *
 * Wave 1 Enhancements (Foundation Layer):
 * - Centralized configuration system
 * - Structured logging with Winston
 * - Dependency injection container
 * - Custom error classes
 *
 * @version 2.1.0-wave1
 * @date 2025-11-11
 */

import express from 'express';
import config from './config/index.js';
import { defaultLogger } from './utils/logger.enhanced.js';

// ═══════════════════════════════════════════════════════════════════════════
// T0.1: App Version - For deploy tracking and drift detection
// ═══════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try to load BUILD_INFO.json if it exists (created during Docker build)
let BUILD_INFO = {};
try {
  const buildInfoPath = path.join(__dirname, '..', 'BUILD_INFO.json');
  if (fs.existsSync(buildInfoPath)) {
    BUILD_INFO = JSON.parse(fs.readFileSync(buildInfoPath, 'utf-8'));
  }
} catch (e) {
  // BUILD_INFO.json not available (local dev)
}

export const APP_VERSION = process.env.APP_VERSION || '2.2.0-p0';
export const BUILD_TIME = BUILD_INFO.buildDate || process.env.BUILD_TIME || new Date().toISOString();
export const GIT_COMMIT = BUILD_INFO.commit || process.env.GIT_COMMIT || 'local';
export const GIT_BRANCH = BUILD_INFO.branch || process.env.GIT_BRANCH || 'unknown';
export const IMAGE_TAG = BUILD_INFO.imageTag || process.env.IMAGE_TAG || APP_VERSION || GIT_COMMIT || 'unknown';

// ═══════════════════════════════════════════════════════════════════════════
// P0-3: ROLE-based process control
// ═══════════════════════════════════════════════════════════════════════════
// ROLE controls what this process does:
// - 'api': Only HTTP server, no background jobs (default)
// - 'worker': Only background jobs, no HTTP server (job processing)
// - 'full' or undefined: API only (worker disabled unless dev flag enabled)
export const PROCESS_ROLE = process.env.ROLE || 'full';
const isDevEnv = config.env !== 'production';
const runJobsInApi = isDevEnv && process.env.RUN_JOBS_IN_API === 'true';
const shouldStartAPI = PROCESS_ROLE !== 'worker';
const shouldStartWorker = PROCESS_ROLE === 'worker' || runJobsInApi;

const legacyWorkerEntrypoint =
  process.env.LEGACY_WORKER_ENTRYPOINT === 'true'
  || process.env.WORKER_ENTRYPOINT === 'worker.js'
  || process.argv.some(arg => arg.endsWith('worker.js'));

if (PROCESS_ROLE === 'worker' && legacyWorkerEntrypoint) {
  logger.error('═══════════════════════════════════════════════════════════');
  logger.error(' BOOT FAILED: Legacy worker entrypoint detected');
  logger.error(' Use: ROLE=worker node src/server.js');
  logger.error(' Remove any references to src/worker.js in your scripts.');
  logger.error('═══════════════════════════════════════════════════════════');
  process.exit(1);
}

import { getContainer } from './config/di-container.js';
import { configureExpress, configure404Handler, configureSPAFallback } from './config/express.config.js';
import { startServer } from './config/server.startup.js';
import routes from './api/routes/index.js';
import { getCadenceEngine } from './automation/CadenceEngine.js';
import { prospectingEngine } from './automation/ProspectingEngine.js';
//  FIX P0: Import abandonment detection job para aprendizado
import { startAbandonmentDetectionJob } from './services/AbandonmentDetectionJob.js';
import { startIntegrationOAuthRefreshJob } from './services/IntegrationOAuthRefreshJob.js';
//  SYNC: Import prospect sync job para sincronização automática Sheet1  SQLite
import { startProspectSyncJob } from './services/ProspectSyncJob.js';
//  NIVEL 5: Import AutoOptimizer para auto-otimizacao
import { getAutoOptimizer } from './intelligence/AutoOptimizer.js';
//  DATA-SYNC: Import DataSyncService para sincronização automática de dados
import { getDataSyncService } from './services/DataSyncService.js';
//  P1-1: ServiceLocator para acesso unificado a serviços
import { getServiceLocator } from './services/ServiceLocator.js';
//  P0.4: Schema validation and migrations
import { runMigrations, getMigrationStatus, validateSchemaOrFail, detectSchemaDrift } from './db/migrate.js';
//  P0.2: Persistent webhook job processor

// Create logger for server module
const logger = defaultLogger.child({ module: 'Server' });

// ═══════════════════════════════════════════════════════════════════════════
//  FIX: Global Error Handlers - Prevents silent failures and crash loops
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Handle unhandled promise rejections
 * These occur when async operations fail without a .catch() handler
 */
process.on('unhandledRejection', (reason, promise) => {
  logger.error(' [UNHANDLED REJECTION] Unhandled promise rejection:', {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
    type: 'unhandledRejection'
  });

  // Don't exit - log and continue (fail-safe approach for production)
  // In development, you might want to exit to catch bugs early
  if (process.env.NODE_ENV === 'development') {
    logger.warn(' [DEV MODE] Consider adding proper error handling to the failed async operation');
  }
});

/**
 * Handle uncaught exceptions
 * These are synchronous errors that weren't caught anywhere
 */
process.on('uncaughtException', (error) => {
  logger.error(' [UNCAUGHT EXCEPTION] Critical error:', {
    error: error.message,
    stack: error.stack,
    type: 'uncaughtException'
  });

  // For uncaught exceptions, we should exit after logging
  // The process is in an undefined state and should be restarted
  logger.error(' Process will exit in 1 second to allow log flush...');

  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

/**
 * Handle warnings (deprecations, memory, etc.)
 */
process.on('warning', (warning) => {
  logger.warn(' [NODE WARNING]', {
    name: warning.name,
    message: warning.message,
    stack: warning.stack
  });
});

// Get DATABASE_PATH for banner
const DATABASE_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'orbion.db');

// Get migrations status for banner (without opening a connection)
let migrationsInfo = { inDb: '?', onDisk: '?' };
try {
  const status = getMigrationStatus();
  migrationsInfo = { inDb: status.executed, onDisk: status.total };
} catch (e) {
  // Database may not exist yet - that's OK
}

logger.info('');
logger.info('═══════════════════════════════════════════════════════════');
logger.info(`  LEADLY AI Agent v${APP_VERSION}`);
logger.info(`  Commit: ${GIT_COMMIT} (${GIT_BRANCH})`);
logger.info(`  Build: ${BUILD_TIME}`);
logger.info(`  Image Tag: ${IMAGE_TAG}`);
logger.info(`  Environment: ${config.env}`);
logger.info(`  Role: ${PROCESS_ROLE.toUpperCase()}`);
logger.info(`  Port: ${shouldStartAPI ? config.server.port : 'N/A (worker mode)'}`);
logger.info(`  Database: ${DATABASE_PATH}`);
logger.info(`  Migrations: ${migrationsInfo.inDb}/${migrationsInfo.onDisk} applied`);
logger.info('═══════════════════════════════════════════════════════════');
logger.info('');
logger.info('Boot version info', {
  version: APP_VERSION,
  imageTag: IMAGE_TAG,
  commit: GIT_COMMIT,
  buildTime: BUILD_TIME,
  environment: config.env,
  migrationsApplied: `${migrationsInfo.inDb}/${migrationsInfo.onDisk}`
});

/**
 * Initialize application with Wave 1 foundation layer
 */
async function initializeApp() {
  try {
    // ═══════════════════════════════════════════════════════════════════════════
    //  P0.4: Schema validation and migrations
    //
    // PRODUCTION: Use validateSchemaOrFail() - fail-fast, NO auto-migrations
    //             Migrations should be run during deploy (scripts/deploy.sh)
    // DEVELOPMENT: Run migrations automatically for convenience
    // ═══════════════════════════════════════════════════════════════════════════
    const isProduction = config.env === 'production';

    if (isProduction) {
      // PRODUCTION: Validate schema only (fail-fast if drift detected)
      logger.info('Validating database schema (production mode - no auto-migrations)...');
      try {
        const driftResult = validateSchemaOrFail(true); // failOnDrift=true
        if (!driftResult.hasDrift) {
          logger.info(' Schema validation passed');
        }
      } catch (validationError) {
        logger.error('═══════════════════════════════════════════════════════════');
        logger.error(' BOOT FAILED: Schema drift detected!');
        logger.error(`   Error: ${validationError.message}`);
        logger.error('');
        logger.error('   This means migrations were not applied during deploy.');
        logger.error('   Run: ./scripts/deploy.sh <version>');
        logger.error('   Or manually: node src/db/migrate.js');
        logger.error('═══════════════════════════════════════════════════════════');
        process.exit(1);
      }
    } else {
      // DEVELOPMENT: Run migrations automatically
      logger.info('Running database migrations (development mode)...');
      try {
        const migrationResult = await runMigrations();
        logger.info(` Migrations complete: ${migrationResult.executed} executed, ${migrationResult.total} total`);
      } catch (migrationError) {
        logger.error('═══════════════════════════════════════════════════════════');
        logger.error(' BOOT FAILED: Migration error!');
        logger.error(`   Error: ${migrationError.message}`);
        logger.error('');
        logger.error('   Check migration files in src/db/migrations/');
        logger.error('═══════════════════════════════════════════════════════════');
        process.exit(1);
      }
    }

    // Initialize dependency injection container
    logger.info('Initializing dependency injection container...');
    const container = getContainer();
    logger.info(` Container initialized with ${container.getRegisteredNames().length} dependencies`);

    // Initialize core services
    logger.info('Initializing core services...');
    const db = await container.resolve('db');
    const openaiClient = await container.resolve('openaiClient');
    logger.info(' Core services initialized');

    // ═══════════════════════════════════════════════════════════════════════════
    //  BOOT VALIDATION - Fail fast if database is not properly configured
    // ═══════════════════════════════════════════════════════════════════════════
    logger.info('Validating database integrity...');

    const criticalTables = ['leads', 'pipeline_stages', 'users', 'workspaces'];
    const missingTables = [];

    for (const tableName of criticalTables) {
      try {
        const exists = db.prepare(
          `SELECT name FROM sqlite_master WHERE type='table' AND name=?`
        ).get(tableName);
        if (!exists) {
          missingTables.push(tableName);
        }
      } catch (e) {
        missingTables.push(tableName);
      }
    }

    if (missingTables.length > 0) {
      logger.error('═══════════════════════════════════════════════════════════');
      logger.error(' BOOT FAILED: Missing critical tables!');
      logger.error(`   Missing: ${missingTables.join(', ')}`);
      logger.error('');
      logger.error('   Run migrations first:');
      logger.error('   node src/db/migrate.js');
      logger.error('═══════════════════════════════════════════════════════════');

      // Fail fast - exit with error code
      process.exit(1);
    }

    // Check if _migrations table exists (indicates migrations have been run)
    const hasMigrationsTable = db.prepare(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='_migrations'`
    ).get();

    if (!hasMigrationsTable) {
      logger.error('═══════════════════════════════════════════════════════════');
      logger.error(' BOOT FAILED: _migrations table not found!');
      logger.error('   This indicates migrations were not applied.');
      logger.error('   Run: node src/db/migrate.js (or deploy script)');
      logger.error('═══════════════════════════════════════════════════════════');
      process.exit(1);
    } else {
      const migrationCount = db.prepare(
        `SELECT COUNT(*) as count FROM _migrations`
      ).get()?.count || 0;
      logger.info(` Database validated: ${migrationCount} migrations applied, ${criticalTables.length} critical tables present`);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // P0-3: CONDITIONAL API STARTUP (only when ROLE=api or ROLE=full)
    // ═══════════════════════════════════════════════════════════════════════
    if (shouldStartAPI) {
      // Initialize Express app
      logger.info('Configuring Express application...');
      const app = express();

      // P0.1 FIX: Inject DI container into Express app
      // This allows middlewares and routes to access container via req.app.get('container')
      app.set('container', container);
      logger.info(' DI Container injected into Express app');

      // P1-1: Initialize ServiceLocator and preload essential services
      logger.info('Initializing ServiceLocator...');
      const serviceLocator = getServiceLocator();
      await serviceLocator.preload();
      app.set('serviceLocator', serviceLocator);
      logger.info(` ServiceLocator ready: ${serviceLocator.listLoadedServices().length} services pre-loaded`);

      // Configure middlewares
      configureExpress(app);

      // Mount routes
      app.use('/', routes);

      // Configure SPA fallback for React app (must be after API routes, before 404)
      configureSPAFallback(app);

      // Configure 404 handler (must be last)
      configure404Handler(app);

      logger.info(' Express configuration complete');

      // Start server
      logger.info('Starting server...');
      await startServer(app);

    } else {
      logger.info('[ROLE] Skipping API startup (ROLE=worker)');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // P1: Worker-only background jobs (ROLE=worker).
    // DEV override: RUN_JOBS_IN_API=true (local run-once/testing).
    // ═══════════════════════════════════════════════════════════════════════
    if (shouldStartWorker) {
      if (runJobsInApi) {
        logger.warn('[ROLE] Running background jobs inside API process (DEV override)');
      }
      // Initialize Cadence Engine
      logger.info('Initializing Cadence Engine...');
      const cadenceEngine = getCadenceEngine();
      await cadenceEngine.initialize();
      logger.info(' Cadence Engine initialized');

      // Initialize Prospecting Engine (auto-start if configured)
      logger.info('Initializing Prospecting Engine...');
      const autoStartProspecting = process.env.PROSPECTING_AUTO_START === 'true';
      if (autoStartProspecting) {
        try {
          const result = await prospectingEngine.start({});
          if (result.success) {
            logger.info(` Prospecting Engine auto-started with ${result.queueSize} leads in queue`);
          } else {
            logger.warn(` Prospecting Engine start warning: ${result.error}`);
          }
        } catch (error) {
          logger.warn(' Prospecting Engine auto-start failed:', { error: error.message });
        }
      } else {
        logger.info('ℹ Prospecting Engine ready (manual start via dashboard or API)');
      }

      //  FIX P0: Iniciar job de detecção de abandonos para FeedbackLoop
      logger.info('Starting Abandonment Detection Job...');
      startAbandonmentDetectionJob();
      logger.info(' Abandonment Detection Job initialized');

      //  DATA-SYNC: Iniciar serviço de sincronização automática de dados
      logger.info('Starting Data Sync Service...');
      const dataSyncService = getDataSyncService();
      dataSyncService.initialize();
      logger.info(' Data Sync Service initialized (nightly: 2h, quick: every 6h, retry: every hour)');

      // OAUTH: Refresh tokens periodically for CRM integrations
      logger.info('Starting OAuth Refresh Job...');
      startIntegrationOAuthRefreshJob();
      logger.info(' OAuth Refresh Job initialized');

      //  SYNC: Iniciar job de sincronização Sheet1  SQLite (a cada 30 min)
      logger.info('Starting Prospect Sync Job (Sheet1  SQLite)...');
      startProspectSyncJob({
        schedule: '*/30 * * * *', // A cada 30 minutos
        runOnStart: true          // Sincroniza ao iniciar
      });
      logger.info(' Prospect Sync Job initialized (every 30 min)');

      //  NIVEL 5: Iniciar AutoOptimizer para auto-otimizacao
      logger.info('Starting AutoOptimizer (Level 5 Self-Optimization)...');
      const autoOptimizer = getAutoOptimizer();
      autoOptimizer.start();
      logger.info(' AutoOptimizer initialized - auto-optimization active');

      // P0-3: Start Async Jobs Processor for canonical inbound pipeline
      logger.info('Starting Async Jobs Processor (P0-3 Canonical)...');
      const { getAsyncJobsService, JobType } = await import('./services/AsyncJobsService.js');
      const { getInboundEventsService } = await import('./services/InboundEventsService.js');
      const { processMessageJob } = await import('./handlers/webhook_handler.js');

      const asyncJobsService = getAsyncJobsService();
      const inboundEventsService = getInboundEventsService();

      asyncJobsService.startProcessor(async (job) => {
        logger.debug('[WORKER] Processing job:', {
          jobId: job.id,
          jobType: job.job_type,
          contactId: job.contact_id
        });

        if (job.job_type === JobType.MESSAGE_PROCESS) {
          try {
            const result = await processMessageJob(job.payload, { jobId: job.id });
            if (job.payload?.inboundEventId) {
              inboundEventsService.markProcessed(job.payload.inboundEventId, job.payload?.tenantId);
            }
            return result;
          } catch (error) {
            if (job.payload?.inboundEventId) {
              inboundEventsService.markError(job.payload.inboundEventId, error, 5, job.payload?.tenantId);
            }
            throw error;
          }
        }

        return { processed: true, jobType: job.job_type };
      }, {
        intervalMs: 500,
        jobTypes: [JobType.MESSAGE_PROCESS],
        batchSize: 1
      });
      logger.info(' Async Jobs Processor started (500ms poll, MESSAGE_PROCESS)');
      logger.info(' Worker processors: MESSAGE_PROCESS (async_jobs)');
    } else {
      logger.info('[ROLE] Skipping worker startup (ROLE=api/full)');
    }

    // P0-3: Keep process alive when running as worker-only (no HTTP server)
    if (!shouldStartAPI && shouldStartWorker) {
      logger.info('[WORKER] Starting heartbeat (no HTTP server)...');
      setInterval(() => {
        logger.debug('[WORKER] Heartbeat - all jobs running');
      }, 5 * 60 * 1000); // Every 5 minutes
    }

    logger.info('');
    logger.info(' LEADLY Agent successfully started!');
    logger.info(` Role: ${PROCESS_ROLE.toUpperCase()}`);
    if (shouldStartAPI && shouldStartWorker) {
      logger.info(' Mode: API + Worker (DEV override)');
    } else if (shouldStartAPI) {
      logger.info(' Mode: API Only (scalable HTTP server)');
    } else {
      logger.info(' Mode: Worker Only (background jobs)');
      logger.info(' Press Ctrl+C to stop');
    }
    logger.info('');

  } catch (error) {
    logger.error(' Critical failure during initialization:', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
}

// Start application
initializeApp();

/**
 * @file health.routes.js
 * @description Health Check Routes
 * Wave 7: Performance & Optimization
 */

import express from 'express';
import { getContainer } from '../../config/di-container.js';
import { createHealthCheckService } from '../../services/HealthCheckService.js';
import { APP_VERSION, BUILD_TIME, GIT_COMMIT } from '../../server.js';

const router = express.Router();

// Lazy initialization
let healthCheckService = null;

/**
 * Initialize HealthCheckService
 * @returns {Promise<HealthCheckService>}
 */
async function getHealthCheckService() {
  if (!healthCheckService) {
    const container = getContainer();
    healthCheckService = await createHealthCheckService(container);
  }
  return healthCheckService;
}

function getConfigIssues() {
  const issues = [];

  if (process.env.NODE_ENV === 'production' && !process.env.PUBLIC_BASE_URL) {
    issues.push('PUBLIC_BASE_URL is required in production');
  }

  return issues;
}

/**
 * GET /health
 * Simple health check for load balancers
 * Returns 200 OK if system is healthy, 503 Service Unavailable if not
 */
router.get('/health', async (req, res) => {
  try {
    const configIssues = getConfigIssues();
    if (configIssues.length > 0) {
      return res.status(503).json({
        status: 'unavailable',
        version: APP_VERSION,
        timestamp: new Date().toISOString(),
        configIssues
      });
    }

    const service = await getHealthCheckService();
    const isHealthy = await service.isHealthy();

    if (isHealthy) {
      res.status(200).json({
        status: 'ok',
        version: APP_VERSION,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({
        status: 'unavailable',
        version: APP_VERSION,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('[HEALTH] Simple health check failed:', error);
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

/**
 * GET /health/detailed
 * Detailed health check with all components
 * Returns comprehensive system health information
 */
router.get('/health/detailed', async (req, res) => {
  try {
    const service = await getHealthCheckService();
    const healthCheck = await service.performHealthCheck();
    const configIssues = getConfigIssues();

    if (configIssues.length > 0) {
      healthCheck.checks.push({
        name: 'config',
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        details: {
          issues: configIssues
        }
      });
      healthCheck.status = 'unhealthy';
    }

    // Set status code based on overall health
    let statusCode = 200;
    if (healthCheck.status === 'degraded') {
      statusCode = 200; // Still operational but degraded
    } else if (healthCheck.status === 'unhealthy') {
      statusCode = 503; // Service unavailable
    }

    res.status(statusCode).json(healthCheck);
  } catch (error) {
    console.error('[HEALTH] Detailed health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

/**
 * GET /health/ready
 * Readiness check for Kubernetes/container orchestration
 * Returns 200 OK if ready to accept traffic
 */
router.get('/health/ready', async (req, res) => {
  try {
    const configIssues = getConfigIssues();
    if (configIssues.length > 0) {
      return res.status(503).json({
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        configIssues
      });
    }

    const service = await getHealthCheckService();
    const healthCheck = await service.performHealthCheck();

    // Ready if all critical services are healthy or degraded (not unhealthy)
    const criticalServices = ['database', 'openai'];
    const isReady = healthCheck.checks
      .filter(check => criticalServices.includes(check.name))
      .every(check => check.status !== 'unhealthy');

    if (isReady) {
      res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        checks: healthCheck.checks.filter(check =>
          criticalServices.includes(check.name) && check.status === 'unhealthy'
        )
      });
    }
  } catch (error) {
    console.error('[HEALTH] Readiness check failed:', error);
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

/**
 * GET /health/live
 * Liveness check for Kubernetes/container orchestration
 * Returns 200 OK if application is alive (not deadlocked)
 */
router.get('/health/live', async (req, res) => {
  // Simple check: if we can respond, we're alive
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/**
 * GET /api/version
 * Version and build information for deployment tracking
 * Returns version, git commit, build timestamp, environment
 * T0.1: Uses centralized APP_VERSION from server.js
 */
router.get('/api/version', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        version: APP_VERSION,
        gitCommit: GIT_COMMIT,
        buildTime: BUILD_TIME,
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        platform: process.platform,
        uptime: Math.floor(process.uptime()),
        startedAt: new Date(Date.now() - process.uptime() * 1000).toISOString()
      }
    });
  } catch (error) {
    console.error('[VERSION] Failed to get version info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get version info',
      details: error.message
    });
  }
});

export default router;

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
 * GET /qr/:instanceName
 * Serve QR code page for Evolution API instance
 * Useful when Evolution Manager is not accessible
 */
router.get('/qr/:instanceName', async (req, res) => {
  try {
    const { instanceName } = req.params;
    const evolutionUrl = process.env.EVOLUTION_BASE_URL || 'http://evolution-api:8080';
    const evolutionKey = process.env.EVOLUTION_API_KEY;

    if (!evolutionKey) {
      return res.status(500).send('<h1>EVOLUTION_API_KEY not configured</h1>');
    }

    // Get QR code from Evolution API
    const response = await fetch(`${evolutionUrl}/instance/connect/${instanceName}`, {
      headers: { 'apikey': evolutionKey }
    });

    const data = await response.json();

    if (data.base64) {
      res.send(`<!DOCTYPE html>
<html>
<head>
  <title>WhatsApp QR Code - ${instanceName}</title>
  <meta http-equiv="refresh" content="30">
</head>
<body style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;background:#1a1a2e;color:white;">
  <h1>WhatsApp QR Code</h1>
  <img src="${data.base64}" style="max-width:350px;border:3px solid #18c5ff;border-radius:15px;margin:20px;"/>
  <p>Instancia: <strong>${instanceName}</strong></p>
  <p style="color:#888;">Pagina atualiza automaticamente a cada 30 segundos</p>
</body>
</html>`);
    } else {
      res.send(`<!DOCTYPE html>
<html>
<head><title>Status - ${instanceName}</title></head>
<body style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;background:#1a1a2e;color:white;">
  <h1>Status da Instancia</h1>
  <p>Estado: ${data.state || data.instance?.state || 'desconhecido'}</p>
  <pre style="background:#333;padding:20px;border-radius:10px;max-width:600px;overflow:auto;">${JSON.stringify(data, null, 2)}</pre>
</body>
</html>`);
    }
  } catch (error) {
    console.error('[QR] Error:', error);
    res.status(500).send(`<h1>Erro ao obter QR code</h1><p>${error.message}</p>`);
  }
});

export default router;

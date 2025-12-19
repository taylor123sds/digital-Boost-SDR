/**
 * @file services/HealthCheckService.js
 * @description Health Check Service
 * Wave 7: Performance & Optimization
 *
 * Provides comprehensive health checks for all system components:
 * - Database connectivity
 * - OpenAI API
 * - WhatsApp (Evolution API)
 * - Memory usage
 * - Disk usage
 * - System uptime
 *
 * @version 1.0.0-wave7
 * @date 2025-11-11
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';

const execAsync = promisify(exec);

/**
 * Health Check Status
 */
export const HealthStatus = {
  HEALTHY: 'healthy',
  DEGRADED: 'degraded',
  UNHEALTHY: 'unhealthy'
};

/**
 * Health Check Service
 * Monitors system health and provides detailed status
 */
export class HealthCheckService {
  /**
   * @param {Object} dependencies - Injected dependencies
   */
  constructor(dependencies) {
    this.db = dependencies.db;
    this.openaiAdapter = dependencies.openaiAdapter;
    this.whatsappAdapter = dependencies.whatsappAdapter;
    this.logger = dependencies.logger;
    this.startTime = Date.now();
  }

  /**
   * Perform complete health check
   * @returns {Promise<Object>} Health check result
   */
  async performHealthCheck() {
    const checks = [];
    let overallStatus = HealthStatus.HEALTHY;

    try {
      // Check database
      const dbCheck = await this.checkDatabase();
      checks.push(dbCheck);
      if (dbCheck.status !== HealthStatus.HEALTHY) {
        overallStatus = HealthStatus.DEGRADED;
      }

      // Check OpenAI
      const openaiCheck = await this.checkOpenAI();
      checks.push(openaiCheck);
      if (openaiCheck.status === HealthStatus.UNHEALTHY) {
        overallStatus = HealthStatus.DEGRADED;
      }

      // Check WhatsApp
      const whatsappCheck = await this.checkWhatsApp();
      checks.push(whatsappCheck);
      if (whatsappCheck.status === HealthStatus.UNHEALTHY) {
        overallStatus = HealthStatus.DEGRADED;
      }

      // Check memory
      const memoryCheck = this.checkMemory();
      checks.push(memoryCheck);
      if (memoryCheck.status !== HealthStatus.HEALTHY) {
        overallStatus = HealthStatus.DEGRADED;
      }

      // Check disk
      const diskCheck = await this.checkDisk();
      checks.push(diskCheck);
      if (diskCheck.status !== HealthStatus.HEALTHY) {
        overallStatus = HealthStatus.DEGRADED;
      }

      // Get system info
      const systemInfo = this.getSystemInfo();

      return {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        uptime: Date.now() - this.startTime,
        checks: checks,
        system: systemInfo
      };

    } catch (error) {
      this.logger.error('Health check failed', { error: error.message });

      return {
        status: HealthStatus.UNHEALTHY,
        timestamp: new Date().toISOString(),
        uptime: Date.now() - this.startTime,
        error: error.message,
        checks: checks
      };
    }
  }

  /**
   * Check database connectivity and performance
   * @private
   * @returns {Promise<Object>} Database check result
   */
  async checkDatabase() {
    const check = {
      name: 'database',
      status: HealthStatus.HEALTHY,
      timestamp: new Date().toISOString()
    };

    try {
      const start = Date.now();

      // Test query
      const result = this.db.prepare('SELECT 1 as test').get();

      const responseTime = Date.now() - start;

      // Get database stats (tolerate fresh databases without tables)
      let messageCount = { count: 0 };
      let stateCount = { count: 0 };

      try {
        messageCount = this.db.prepare('SELECT COUNT(*) as count FROM whatsapp_messages').get();
      } catch (err) {
        check.status = HealthStatus.DEGRADED;
        check.message = 'Schema incomplete (whatsapp_messages missing)';
      }

      try {
        stateCount = this.db.prepare('SELECT COUNT(*) as count FROM enhanced_conversation_states').get();
      } catch (err) {
        check.status = HealthStatus.DEGRADED;
        check.message = check.message || 'Schema incomplete (conversation states missing)';
      }

      check.responseTime = responseTime;
      check.details = {
        connected: true,
        messages: messageCount.count,
        states: stateCount.count
      };

      // Check response time
      if (responseTime > 100) {
        check.status = HealthStatus.DEGRADED;
        check.message = `Slow response time: ${responseTime}ms`;
      }

    } catch (error) {
      check.status = HealthStatus.UNHEALTHY;
      check.error = error.message;
      check.details = {
        connected: false
      };
    }

    return check;
  }

  /**
   * Check OpenAI API connectivity
   * @private
   * @returns {Promise<Object>} OpenAI check result
   */
  async checkOpenAI() {
    const check = {
      name: 'openai',
      status: HealthStatus.HEALTHY,
      timestamp: new Date().toISOString()
    };

    try {
      const start = Date.now();

      // Simple API test (list models)
      await this.openaiAdapter.client.models.list();

      const responseTime = Date.now() - start;

      check.responseTime = responseTime;
      check.details = {
        connected: true,
        model: this.openaiAdapter.config.openai.chatModel
      };

      if (responseTime > 2000) {
        check.status = HealthStatus.DEGRADED;
        check.message = `Slow response time: ${responseTime}ms`;
      }

    } catch (error) {
      check.status = HealthStatus.UNHEALTHY;
      check.error = error.message;
      check.details = {
        connected: false
      };
    }

    return check;
  }

  /**
   * Check WhatsApp (Evolution API) connectivity
   * @private
   * @returns {Promise<Object>} WhatsApp check result
   */
  async checkWhatsApp() {
    const check = {
      name: 'whatsapp',
      status: HealthStatus.HEALTHY,
      timestamp: new Date().toISOString()
    };

    try {
      const start = Date.now();

      // Health check via adapter
      const health = await this.whatsappAdapter.healthCheck();

      const responseTime = Date.now() - start;

      check.responseTime = responseTime;
      check.details = {
        connected: health.connected || false,
        instance: this.whatsappAdapter.config.evolution.instanceName
      };

      if (!health.connected) {
        check.status = HealthStatus.UNHEALTHY;
        check.message = 'Evolution API not connected';
      } else if (responseTime > 3000) {
        check.status = HealthStatus.DEGRADED;
        check.message = `Slow response time: ${responseTime}ms`;
      }

    } catch (error) {
      check.status = HealthStatus.UNHEALTHY;
      check.error = error.message;
      check.details = {
        connected: false
      };
    }

    return check;
  }

  /**
   * Check memory usage
   * @private
   * @returns {Object} Memory check result
   */
  checkMemory() {
    const check = {
      name: 'memory',
      status: HealthStatus.HEALTHY,
      timestamp: new Date().toISOString()
    };

    try {
      const memUsage = process.memoryUsage();
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;

      const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
      const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
      const rssMB = Math.round(memUsage.rss / 1024 / 1024);

      const systemUsagePercent = Math.round((usedMem / totalMem) * 100);

      check.details = {
        heapUsed: `${heapUsedMB} MB`,
        heapTotal: `${heapTotalMB} MB`,
        rss: `${rssMB} MB`,
        systemUsage: `${systemUsagePercent}%`,
        totalMemory: `${Math.round(totalMem / 1024 / 1024 / 1024)} GB`,
        freeMemory: `${Math.round(freeMem / 1024 / 1024 / 1024)} GB`
      };

      // Check if heap usage is > 80% of heap total
      if (heapUsedMB > heapTotalMB * 0.8) {
        check.status = HealthStatus.DEGRADED;
        check.message = `High heap usage: ${heapUsedMB}MB / ${heapTotalMB}MB`;
      }

      // Check if system memory usage > 90%
      if (systemUsagePercent > 90) {
        check.status = HealthStatus.DEGRADED;
        check.message = `High system memory usage: ${systemUsagePercent}%`;
      }

    } catch (error) {
      check.status = HealthStatus.UNHEALTHY;
      check.error = error.message;
    }

    return check;
  }

  /**
   * Check disk usage
   * @private
   * @returns {Promise<Object>} Disk check result
   */
  async checkDisk() {
    const check = {
      name: 'disk',
      status: HealthStatus.HEALTHY,
      timestamp: new Date().toISOString()
    };

    try {
      // Get disk usage (Unix-like systems)
      const { stdout } = await execAsync('df -h . | tail -1');
      const parts = stdout.trim().split(/\s+/);

      const usagePercent = parseInt(parts[4]);
      const available = parts[3];
      const total = parts[1];

      check.details = {
        total: total,
        available: available,
        usagePercent: `${usagePercent}%`
      };

      if (usagePercent > 90) {
        check.status = HealthStatus.DEGRADED;
        check.message = `High disk usage: ${usagePercent}%`;
      } else if (usagePercent > 95) {
        check.status = HealthStatus.UNHEALTHY;
        check.message = `Critical disk usage: ${usagePercent}%`;
      }

    } catch (error) {
      // Fallback for systems without df command
      check.status = HealthStatus.HEALTHY;
      check.details = {
        message: 'Disk check not available on this system'
      };
    }

    return check;
  }

  /**
   * Get system information
   * @private
   * @returns {Object} System info
   */
  getSystemInfo() {
    return {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      cpus: os.cpus().length,
      uptime: Math.floor(os.uptime()),
      hostname: os.hostname(),
      processUptime: Math.floor(process.uptime())
    };
  }

  /**
   * Get simple status (for load balancer health checks)
   * @returns {Promise<boolean>} True if healthy
   */
  async isHealthy() {
    try {
      // Quick database check
      this.db.prepare('SELECT 1').get();
      return true;
    } catch (error) {
      return false;
    }
  }
}

/**
 * Factory function to create HealthCheckService with DI
 * @param {Container} container - DI container
 * @returns {Promise<HealthCheckService>} Health check service instance
 */
export async function createHealthCheckService(container) {
  const db = await container.resolve('dbConnection');
  const openaiAdapter = await container.resolve('openaiAdapter');
  const whatsappAdapter = await container.resolve('whatsappAdapter');

  const { createLogger } = await import('../utils/logger.enhanced.js');
  const logger = createLogger({ module: 'HealthCheckService' });

  return new HealthCheckService({
    db,
    openaiAdapter,
    whatsappAdapter,
    logger
  });
}

export default HealthCheckService;

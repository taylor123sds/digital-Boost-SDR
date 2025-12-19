// health-check.js
//  Sistema avançado de health check para monitoramento

//  FIX: Usar getDatabase() que verifica e reconecta se necessário
import { getDatabase } from '../db/index.js';
import log from './logger.js';
import rateLimiter from './rate_limiter.js';
import humanVerificationStore from './human_verification_store.js';
import axios from 'axios';
import os from 'os';

/**
 * Health Check System
 * Verifica saúde de todos os componentes críticos
 */
class HealthCheck {
  constructor() {
    this.startTime = Date.now();
    this.checks = new Map();
  }

  /**
   * Registra um check customizado
   */
  registerCheck(name, checkFn, options = {}) {
    this.checks.set(name, {
      fn: checkFn,
      critical: options.critical !== false, // Default: true
      timeout: options.timeout || 5000,
    });
  }

  /**
   * Executa um check com timeout
   */
  async runCheck(name, check) {
    const start = Date.now();

    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), check.timeout)
      );

      const result = await Promise.race([check.fn(), timeoutPromise]);

      return {
        status: 'healthy',
        responseTime: Date.now() - start,
        ...result,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        responseTime: Date.now() - start,
      };
    }
  }

  /**
   * Check: Database
   */
  async checkDatabase() {
    try {
      //  FIX: Obter conexão fresh
      const db = getDatabase();
      // Tentar query simples
      const result = db.prepare('SELECT 1 as test').get();

      // Verificar tamanho do banco
      const dbSize = db.prepare(`
        SELECT page_count * page_size as size
        FROM pragma_page_count(), pragma_page_size()
      `).get();

      // Contar tabelas
      const tables = db.prepare(`
        SELECT COUNT(*) as count
        FROM sqlite_master
        WHERE type='table'
      `).get();

      return {
        status: 'healthy',
        details: {
          responsive: result.test === 1,
          sizeBytes: dbSize.size,
          sizeMB: (dbSize.size / 1024 / 1024).toFixed(2),
          tables: tables.count,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
      };
    }
  }

  /**
   * Check: Evolution API
   */
  async checkEvolutionAPI() {
    try {
      const baseUrl = process.env.EVOLUTION_BASE_URL;
      const apiKey = process.env.EVOLUTION_API_KEY;
      const instance = process.env.EVOLUTION_INSTANCE;

      if (!baseUrl || !apiKey || !instance) {
        return {
          status: 'degraded',
          message: 'Evolution API não configurado',
        };
      }

      const response = await axios.get(
        `${baseUrl}/instance/fetchInstances`,
        {
          headers: { apikey: apiKey },
          timeout: 5000,
        }
      );

      const instanceData = response.data.find((i) => i.instanceName === instance);

      return {
        status: instanceData ? 'healthy' : 'degraded',
        details: {
          connected: !!instanceData,
          instanceName: instance,
          state: instanceData?.state || 'unknown',
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
      };
    }
  }

  /**
   * Check: OpenAI API
   */
  async checkOpenAI() {
    try {
      const apiKey = process.env.OPENAI_API_KEY;

      if (!apiKey || apiKey.length < 20) {
        return {
          status: 'unhealthy',
          error: 'API key não configurada',
        };
      }

      // Apenas verificar se a key está configurada
      // Não fazer request real para economizar créditos
      return {
        status: 'healthy',
        details: {
          configured: true,
          model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
      };
    }
  }

  /**
   * Check: Sistema de Rate Limiting
   */
  async checkRateLimiter() {
    try {
      const stats = rateLimiter.getGlobalStats();

      return {
        status: 'healthy',
        details: {
          activeContacts: stats.activeContacts,
          messagesLastMinute: stats.messagesLastMinute,
          messagesLastHour: stats.messagesLastHour,
          avgPerContact: stats.avgMessagesPerContactLastHour,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
      };
    }
  }

  /**
   * Check: Sistema de Verificação Humana
   */
  async checkHumanVerification() {
    try {
      const stats = humanVerificationStore.getStats();

      return {
        status: 'healthy',
        details: {
          pendingVerifications: stats.totalPending,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
      };
    }
  }

  /**
   * Check: Memória do Sistema
   */
  async checkMemory() {
    try {
      const used = process.memoryUsage();
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedPercent = ((totalMem - freeMem) / totalMem) * 100;

      return {
        status: usedPercent > 90 ? 'degraded' : 'healthy',
        details: {
          heapUsedMB: (used.heapUsed / 1024 / 1024).toFixed(2),
          heapTotalMB: (used.heapTotal / 1024 / 1024).toFixed(2),
          rssMB: (used.rss / 1024 / 1024).toFixed(2),
          systemUsedPercent: usedPercent.toFixed(2),
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
      };
    }
  }

  /**
   * Check: CPU
   */
  async checkCPU() {
    try {
      const cpus = os.cpus();
      const loadAvg = os.loadavg();

      return {
        status: loadAvg[0] > cpus.length * 0.8 ? 'degraded' : 'healthy',
        details: {
          cores: cpus.length,
          loadAverage: {
            '1min': loadAvg[0].toFixed(2),
            '5min': loadAvg[1].toFixed(2),
            '15min': loadAvg[2].toFixed(2),
          },
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
      };
    }
  }

  /**
   * Executa todos os health checks
   */
  async runAll() {
    const results = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      checks: {},
    };

    // Checks padrão
    const defaultChecks = {
      database: () => this.checkDatabase(),
      evolutionAPI: () => this.checkEvolutionAPI(),
      openai: () => this.checkOpenAI(),
      rateLimiter: () => this.checkRateLimiter(),
      humanVerification: () => this.checkHumanVerification(),
      memory: () => this.checkMemory(),
      cpu: () => this.checkCPU(),
    };

    // Registrar checks padrão
    for (const [name, fn] of Object.entries(defaultChecks)) {
      if (!this.checks.has(name)) {
        this.registerCheck(name, fn);
      }
    }

    // Executar todos os checks
    const checkPromises = [];
    for (const [name, check] of this.checks.entries()) {
      checkPromises.push(
        this.runCheck(name, check).then((result) => ({ name, result, check }))
      );
    }

    const checkResults = await Promise.all(checkPromises);

    // Processar resultados
    for (const { name, result, check } of checkResults) {
      results.checks[name] = result;

      // Atualizar status geral
      if (check.critical) {
        if (result.status === 'unhealthy') {
          results.status = 'unhealthy';
        } else if (result.status === 'degraded' && results.status === 'healthy') {
          results.status = 'degraded';
        }
      }
    }

    // Log do health check
    if (results.status !== 'healthy') {
      log.warn('Health check degraded or unhealthy', {
        context: 'health_check',
        status: results.status,
        checks: Object.entries(results.checks)
          .filter(([_, r]) => r.status !== 'healthy')
          .map(([name, r]) => ({ name, status: r.status, error: r.error })),
      });
    }

    return results;
  }

  /**
   * Health check simplificado (apenas status)
   */
  async getStatus() {
    const full = await this.runAll();
    return {
      status: full.status,
      timestamp: full.timestamp,
      uptime: full.uptime,
    };
  }
}

// Exportar instância singleton
const healthCheck = new HealthCheck();

/**
 * Express route handler para /health
 */
export async function healthCheckRoute(req, res) {
  try {
    const detailed = req.query.detailed === 'true';
    const result = detailed ? await healthCheck.runAll() : await healthCheck.getStatus();

    const statusCode = result.status === 'healthy' ? 200 : result.status === 'degraded' ? 200 : 503;

    res.status(statusCode).json(result);
  } catch (error) {
    log.error('Health check failed', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}

export default healthCheck;

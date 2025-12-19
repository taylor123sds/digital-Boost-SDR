/**
 * USAGE METERING SERVICE
 * Contabiliza uso por tenant para billing e analytics
 */

import { getDb } from '../db/connection.js';
import logger from '../utils/logger.js';

class UsageMeteringService {
  constructor() {
    this.db = null;
    this.cache = new Map(); // Cache local para batch inserts
    this.flushInterval = null;
  }

  /**
   * Inicializa o serviço
   */
  init() {
    this.db = getDb();

    // Flush cache a cada 30 segundos
    this.flushInterval = setInterval(() => {
      this.flushCache();
    }, 30000);

    logger.info('[METERING] Serviço inicializado');
  }

  /**
   * Registra uma métrica de uso
   */
  async track(tenantId, metricType, value = 1, agentId = 'default') {
    const today = new Date().toISOString().split('T')[0];
    const hour = new Date().getHours();
    const key = `${tenantId}:${agentId}:${metricType}:${today}:${hour}`;

    // Acumula no cache
    if (this.cache.has(key)) {
      this.cache.set(key, this.cache.get(key) + value);
    } else {
      this.cache.set(key, value);
    }

    // Se cache estiver grande, flush imediato
    if (this.cache.size > 100) {
      await this.flushCache();
    }
  }

  /**
   * Métodos de conveniência para métricas comuns
   */
  async trackMessageSent(tenantId, agentId = 'default') {
    await this.track(tenantId, 'messages_sent', 1, agentId);
  }

  async trackMessageReceived(tenantId, agentId = 'default') {
    await this.track(tenantId, 'messages_received', 1, agentId);
  }

  async trackApiCall(tenantId, agentId = 'default') {
    await this.track(tenantId, 'api_calls', 1, agentId);
  }

  async trackOpenAITokens(tenantId, tokens, agentId = 'default') {
    await this.track(tenantId, 'openai_tokens', tokens, agentId);
  }

  async trackLeadCreated(tenantId, agentId = 'default') {
    await this.track(tenantId, 'leads_created', 1, agentId);
  }

  /**
   * Flush cache para o banco de dados
   */
  async flushCache() {
    if (this.cache.size === 0) return;

    const entries = Array.from(this.cache.entries());
    this.cache.clear();

    try {
      const stmt = this.db.prepare(`
        INSERT INTO usage_metering (tenant_id, agent_id, metric_type, metric_value, period_date, period_hour)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(tenant_id, agent_id, metric_type, period_date, period_hour)
        DO UPDATE SET metric_value = metric_value + excluded.metric_value
      `);

      const insertMany = this.db.transaction((entries) => {
        for (const [key, value] of entries) {
          const [tenantId, agentId, metricType, date, hour] = key.split(':');
          stmt.run(tenantId, agentId, metricType, value, date, parseInt(hour));
        }
      });

      insertMany(entries);
      logger.debug(`[METERING] Flush: ${entries.length} métricas gravadas`);
    } catch (error) {
      logger.error('[METERING] Erro ao gravar métricas:', error.message);
      // Re-adiciona ao cache em caso de erro
      for (const [key, value] of entries) {
        this.cache.set(key, (this.cache.get(key) || 0) + value);
      }
    }
  }

  /**
   * Obtém uso do tenant no período
   */
  async getUsage(tenantId, metricType, startDate, endDate) {
    try {
      const stmt = this.db.prepare(`
        SELECT
          SUM(metric_value) as total,
          period_date,
          agent_id
        FROM usage_metering
        WHERE tenant_id = ?
          AND metric_type = ?
          AND period_date >= ?
          AND period_date <= ?
        GROUP BY period_date, agent_id
        ORDER BY period_date
      `);

      return stmt.all(tenantId, metricType, startDate, endDate);
    } catch (error) {
      logger.error('[METERING] Erro ao obter uso:', error.message);
      return [];
    }
  }

  /**
   * Obtém resumo de uso do tenant hoje
   */
  async getTodayUsage(tenantId) {
    const today = new Date().toISOString().split('T')[0];

    try {
      const stmt = this.db.prepare(`
        SELECT
          metric_type,
          SUM(metric_value) as total
        FROM usage_metering
        WHERE tenant_id = ?
          AND period_date = ?
        GROUP BY metric_type
      `);

      const results = stmt.all(tenantId, today);

      // Converte para objeto
      const usage = {};
      for (const row of results) {
        usage[row.metric_type] = row.total;
      }

      return usage;
    } catch (error) {
      logger.error('[METERING] Erro ao obter uso de hoje:', error.message);
      return {};
    }
  }

  /**
   * Cleanup
   */
  shutdown() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flushCache();
    logger.info('[METERING] Serviço encerrado');
  }
}

// Singleton
const meteringService = new UsageMeteringService();

export default meteringService;
export { UsageMeteringService };

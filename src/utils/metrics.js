// metrics.js
//  Sistema de métricas e monitoramento em tempo real

import log from './logger.js';

/**
 * Sistema de coleta de métricas
 */
class MetricsCollector {
  constructor() {
    this.metrics = {
      // Contadores
      counters: new Map(),
      // Histogramas (para medir durações)
      histograms: new Map(),
      // Gauges (valores que sobem e descem)
      gauges: new Map(),
    };

    this.startTime = Date.now();
  }

  /**
   * Incrementa um contador
   */
  increment(name, value = 1, labels = {}) {
    const key = this._getKey(name, labels);
    const current = this.metrics.counters.get(key) || 0;
    this.metrics.counters.set(key, current + value);

    log.debug(`Metric incremented: ${name}`, {
      context: 'metrics',
      name,
      value,
      newTotal: current + value,
      labels,
    });
  }

  /**
   * Decrementa um contador
   */
  decrement(name, value = 1, labels = {}) {
    this.increment(name, -value, labels);
  }

  /**
   * Define um gauge (valor absoluto)
   */
  gauge(name, value, labels = {}) {
    const key = this._getKey(name, labels);
    this.metrics.gauges.set(key, {
      value,
      timestamp: Date.now(),
    });

    log.debug(`Gauge set: ${name}`, {
      context: 'metrics',
      name,
      value,
      labels,
    });
  }

  /**
   * Registra uma duração em um histograma
   */
  histogram(name, duration, labels = {}) {
    const key = this._getKey(name, labels);
    const data = this.metrics.histograms.get(key) || {
      count: 0,
      sum: 0,
      min: Infinity,
      max: -Infinity,
      values: [],
    };

    data.count++;
    data.sum += duration;
    data.min = Math.min(data.min, duration);
    data.max = Math.max(data.max, duration);
    data.values.push(duration);

    // Manter apenas últimos 100 valores para cálculo de percentis
    if (data.values.length > 100) {
      data.values.shift();
    }

    this.metrics.histograms.set(key, data);

    log.debug(`Histogram recorded: ${name}`, {
      context: 'metrics',
      name,
      duration,
      labels,
    });
  }

  /**
   * Timer helper: mede duração de operações
   */
  startTimer(name, labels = {}) {
    const start = Date.now();

    return () => {
      const duration = Date.now() - start;
      this.histogram(name, duration, labels);
      return duration;
    };
  }

  /**
   * Gera chave única para métrica com labels
   */
  _getKey(name, labels = {}) {
    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');

    return labelStr ? `${name}{${labelStr}}` : name;
  }

  /**
   * Calcula estatísticas de um histograma
   */
  _calculateHistogramStats(data) {
    if (data.count === 0) {
      return {
        count: 0,
        sum: 0,
        avg: 0,
        min: 0,
        max: 0,
        p50: 0,
        p95: 0,
        p99: 0,
      };
    }

    const sorted = [...data.values].sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];

    return {
      count: data.count,
      sum: data.sum,
      avg: (data.sum / data.count).toFixed(2),
      min: data.min,
      max: data.max,
      p50,
      p95,
      p99,
    };
  }

  /**
   * Retorna todas as métricas formatadas
   */
  getAll() {
    const result = {
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      counters: {},
      gauges: {},
      histograms: {},
    };

    // Formatar contadores
    for (const [key, value] of this.metrics.counters.entries()) {
      result.counters[key] = value;
    }

    // Formatar gauges
    for (const [key, data] of this.metrics.gauges.entries()) {
      result.gauges[key] = {
        value: data.value,
        age: Math.floor((Date.now() - data.timestamp) / 1000),
      };
    }

    // Formatar histogramas
    for (const [key, data] of this.metrics.histograms.entries()) {
      result.histograms[key] = this._calculateHistogramStats(data);
    }

    return result;
  }

  /**
   * Retorna métricas específicas
   */
  get(name, labels = {}) {
    const key = this._getKey(name, labels);

    return {
      counter: this.metrics.counters.get(key),
      gauge: this.metrics.gauges.get(key),
      histogram: this.metrics.histograms.has(key)
        ? this._calculateHistogramStats(this.metrics.histograms.get(key))
        : null,
    };
  }

  /**
   * Reseta todas as métricas
   */
  reset() {
    this.metrics.counters.clear();
    this.metrics.gauges.clear();
    this.metrics.histograms.clear();

    log.info('Metrics reset', { context: 'metrics' });
  }

  /**
   * Reseta métrica específica
   */
  resetMetric(name, labels = {}) {
    const key = this._getKey(name, labels);

    this.metrics.counters.delete(key);
    this.metrics.gauges.delete(key);
    this.metrics.histograms.delete(key);

    log.info(`Metric reset: ${name}`, { context: 'metrics', labels });
  }
}

// Instância singleton
const metrics = new MetricsCollector();

/**
 * Métricas pré-definidas para o ORBION
 */
export const orbionMetrics = {
  // WhatsApp
  messageReceived: (phoneNumber) =>
    metrics.increment('orbion_messages_received_total', 1, { type: 'whatsapp' }),

  messageSent: (phoneNumber) =>
    metrics.increment('orbion_messages_sent_total', 1, { type: 'whatsapp' }),

  messageProcessingTime: (duration, success) =>
    metrics.histogram('orbion_message_processing_duration_ms', duration, {
      status: success ? 'success' : 'error',
    }),

  // Bot Detection
  botDetected: (score) => {
    metrics.increment('orbion_bots_detected_total');
    metrics.histogram('orbion_bot_detection_score', score);
  },

  humanVerified: () => metrics.increment('orbion_humans_verified_total'),

  // Rate Limiting
  rateLimitHit: (window) =>
    metrics.increment('orbion_rate_limit_hits_total', 1, { window }),

  // Campaigns
  campaignStarted: (campaignId) =>
    metrics.increment('orbion_campaigns_started_total', 1, {
      campaign: campaignId,
    }),

  campaignMessagesSent: (campaignId, count) =>
    metrics.increment('orbion_campaign_messages_sent_total', count, {
      campaign: campaignId,
    }),

  // OpenAI
  openaiRequest: (model) =>
    metrics.increment('orbion_openai_requests_total', 1, { model }),

  openaiLatency: (duration, model) =>
    metrics.histogram('orbion_openai_latency_ms', duration, { model }),

  // Errors
  error: (type, component) =>
    metrics.increment('orbion_errors_total', 1, { type, component }),

  // Active connections
  activeConversations: (count) => metrics.gauge('orbion_active_conversations', count),

  // Queue sizes
  messageQueueSize: (size) => metrics.gauge('orbion_message_queue_size', size),
};

/**
 * Express middleware para métricas automáticas
 */
export function metricsMiddleware(req, res, next) {
  const start = Date.now();

  // Incrementar requests
  metrics.increment('http_requests_total', 1, {
    method: req.method,
    path: req.route?.path || req.path,
  });

  // Capturar resposta
  res.on('finish', () => {
    const duration = Date.now() - start;

    // Histograma de latência
    metrics.histogram('http_request_duration_ms', duration, {
      method: req.method,
      path: req.route?.path || req.path,
      status: res.statusCode,
    });

    // Contador de status
    metrics.increment('http_responses_total', 1, {
      method: req.method,
      status: res.statusCode,
    });
  });

  next();
}

/**
 * Express route handler para /metrics
 */
export function metricsRoute(req, res) {
  try {
    const format = req.query.format || 'json';

    if (format === 'prometheus') {
      // Formato Prometheus (simplificado)
      const allMetrics = metrics.getAll();
      let output = '';

      // Counters
      for (const [name, value] of Object.entries(allMetrics.counters)) {
        output += `${name} ${value}\n`;
      }

      // Gauges
      for (const [name, data] of Object.entries(allMetrics.gauges)) {
        output += `${name} ${data.value}\n`;
      }

      res.set('Content-Type', 'text/plain');
      res.send(output);
    } else {
      // Formato JSON
      res.json(metrics.getAll());
    }
  } catch (error) {
    log.error('Failed to retrieve metrics', error);
    res.status(500).json({ error: 'Failed to retrieve metrics' });
  }
}

export default metrics;
export { metrics, MetricsCollector };

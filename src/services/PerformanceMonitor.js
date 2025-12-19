/**
 * @file services/PerformanceMonitor.js
 * @description Performance Monitoring Service
 * Wave 7: Performance & Optimization
 *
 * Tracks and aggregates performance metrics:
 * - Request latency
 * - Error rates
 * - Cache hit rates
 * - Circuit breaker states
 * - Throughput
 *
 * @version 1.0.0-wave7
 * @date 2025-11-11
 */

/**
 * Performance Monitor Service
 * Collects and aggregates performance metrics
 */
export class PerformanceMonitor {
  constructor(logger) {
    this.logger = logger;
    this.startTime = Date.now();

    // Metrics storage
    this.metrics = {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        byEndpoint: new Map()
      },
      latency: {
        samples: [],
        p50: 0,
        p95: 0,
        p99: 0,
        avg: 0,
        min: Infinity,
        max: 0
      },
      cache: {
        hits: 0,
        misses: 0,
        hitRate: 0
      },
      errors: {
        total: 0,
        byType: new Map()
      },
      circuits: new Map() // Circuit breaker states
    };

    // Keep last N samples for percentile calculation
    this.maxSamples = 1000;
  }

  /**
   * Record a request
   * @param {string} endpoint - Endpoint path
   * @param {number} duration - Request duration in ms
   * @param {boolean} success - Whether request succeeded
   * @param {string} errorType - Error type if failed
   */
  recordRequest(endpoint, duration, success = true, errorType = null) {
    // Update totals
    this.metrics.requests.total++;
    if (success) {
      this.metrics.requests.successful++;
    } else {
      this.metrics.requests.failed++;
      this.recordError(errorType || 'UnknownError');
    }

    // Update by endpoint
    if (!this.metrics.requests.byEndpoint.has(endpoint)) {
      this.metrics.requests.byEndpoint.set(endpoint, {
        total: 0,
        successful: 0,
        failed: 0,
        avgLatency: 0
      });
    }

    const endpointStats = this.metrics.requests.byEndpoint.get(endpoint);
    endpointStats.total++;
    if (success) {
      endpointStats.successful++;
    } else {
      endpointStats.failed++;
    }

    // Update latency
    this.recordLatency(duration);

    // Update endpoint average latency
    endpointStats.avgLatency =
      (endpointStats.avgLatency * (endpointStats.total - 1) + duration) / endpointStats.total;
  }

  /**
   * Record latency sample
   * @param {number} duration - Duration in ms
   */
  recordLatency(duration) {
    // Add sample
    this.metrics.latency.samples.push(duration);

    // Keep only last N samples
    if (this.metrics.latency.samples.length > this.maxSamples) {
      this.metrics.latency.samples.shift();
    }

    // Update min/max
    this.metrics.latency.min = Math.min(this.metrics.latency.min, duration);
    this.metrics.latency.max = Math.max(this.metrics.latency.max, duration);

    // Recalculate percentiles
    this.calculatePercentiles();
  }

  /**
   * Calculate latency percentiles
   * @private
   */
  calculatePercentiles() {
    const samples = [...this.metrics.latency.samples].sort((a, b) => a - b);
    const count = samples.length;

    if (count === 0) return;

    // Calculate percentiles
    this.metrics.latency.p50 = samples[Math.floor(count * 0.50)];
    this.metrics.latency.p95 = samples[Math.floor(count * 0.95)];
    this.metrics.latency.p99 = samples[Math.floor(count * 0.99)];

    // Calculate average
    const sum = samples.reduce((acc, val) => acc + val, 0);
    this.metrics.latency.avg = Math.round(sum / count);
  }

  /**
   * Record cache hit
   */
  recordCacheHit() {
    this.metrics.cache.hits++;
    this.updateCacheHitRate();
  }

  /**
   * Record cache miss
   */
  recordCacheMiss() {
    this.metrics.cache.misses++;
    this.updateCacheHitRate();
  }

  /**
   * Update cache hit rate
   * @private
   */
  updateCacheHitRate() {
    const total = this.metrics.cache.hits + this.metrics.cache.misses;
    this.metrics.cache.hitRate = total > 0
      ? Math.round((this.metrics.cache.hits / total) * 100)
      : 0;
  }

  /**
   * Record an error
   * @param {string} errorType - Type of error
   */
  recordError(errorType) {
    this.metrics.errors.total++;

    const count = this.metrics.errors.byType.get(errorType) || 0;
    this.metrics.errors.byType.set(errorType, count + 1);
  }

  /**
   * Update circuit breaker state
   * @param {string} circuitName - Circuit name
   * @param {Object} state - Circuit state
   */
  updateCircuitState(circuitName, state) {
    this.metrics.circuits.set(circuitName, {
      ...state,
      lastUpdated: new Date().toISOString()
    });
  }

  /**
   * Get all metrics
   * @returns {Object} All metrics
   */
  getMetrics() {
    const uptime = Date.now() - this.startTime;
    const uptimeSeconds = Math.floor(uptime / 1000);

    // Calculate throughput (requests per second)
    const throughput = uptimeSeconds > 0
      ? Math.round(this.metrics.requests.total / uptimeSeconds * 100) / 100
      : 0;

    // Calculate error rate
    const errorRate = this.metrics.requests.total > 0
      ? Math.round((this.metrics.requests.failed / this.metrics.requests.total) * 100)
      : 0;

    return {
      uptime: {
        ms: uptime,
        seconds: uptimeSeconds,
        formatted: this.formatUptime(uptime)
      },
      requests: {
        total: this.metrics.requests.total,
        successful: this.metrics.requests.successful,
        failed: this.metrics.requests.failed,
        errorRate: `${errorRate}%`,
        throughput: `${throughput} req/s`,
        byEndpoint: Object.fromEntries(this.metrics.requests.byEndpoint)
      },
      latency: {
        min: `${this.metrics.latency.min}ms`,
        max: `${this.metrics.latency.max}ms`,
        avg: `${this.metrics.latency.avg}ms`,
        p50: `${this.metrics.latency.p50}ms`,
        p95: `${this.metrics.latency.p95}ms`,
        p99: `${this.metrics.latency.p99}ms`,
        samples: this.metrics.latency.samples.length
      },
      cache: {
        hits: this.metrics.cache.hits,
        misses: this.metrics.cache.misses,
        hitRate: `${this.metrics.cache.hitRate}%`
      },
      errors: {
        total: this.metrics.errors.total,
        byType: Object.fromEntries(this.metrics.errors.byType)
      },
      circuits: Object.fromEntries(this.metrics.circuits),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get summary metrics
   * @returns {Object} Summary metrics
   */
  getSummary() {
    const metrics = this.getMetrics();

    return {
      uptime: metrics.uptime.formatted,
      requests: {
        total: metrics.requests.total,
        errorRate: metrics.requests.errorRate,
        throughput: metrics.requests.throughput
      },
      latency: {
        avg: metrics.latency.avg,
        p95: metrics.latency.p95
      },
      cache: {
        hitRate: metrics.cache.hitRate
      },
      health: this.getHealthStatus()
    };
  }

  /**
   * Get health status based on metrics
   * @returns {string} Health status
   */
  getHealthStatus() {
    const errorRate = this.metrics.requests.total > 0
      ? (this.metrics.requests.failed / this.metrics.requests.total) * 100
      : 0;

    const avgLatency = this.metrics.latency.avg;

    // Check if any circuit is open
    const hasOpenCircuit = Array.from(this.metrics.circuits.values())
      .some(circuit => circuit.state === 'OPEN');

    if (hasOpenCircuit || errorRate > 10 || avgLatency > 2000) {
      return 'unhealthy';
    } else if (errorRate > 5 || avgLatency > 1000) {
      return 'degraded';
    } else {
      return 'healthy';
    }
  }

  /**
   * Format uptime
   * @private
   * @param {number} ms - Uptime in milliseconds
   * @returns {string} Formatted uptime
   */
  formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.startTime = Date.now();
    this.metrics = {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        byEndpoint: new Map()
      },
      latency: {
        samples: [],
        p50: 0,
        p95: 0,
        p99: 0,
        avg: 0,
        min: Infinity,
        max: 0
      },
      cache: {
        hits: 0,
        misses: 0,
        hitRate: 0
      },
      errors: {
        total: 0,
        byType: new Map()
      },
      circuits: new Map()
    };
  }
}

export default PerformanceMonitor;

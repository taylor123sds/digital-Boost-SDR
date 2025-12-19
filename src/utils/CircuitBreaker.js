/**
 * @file utils/CircuitBreaker.js
 * @description Circuit Breaker Pattern Implementation
 * Wave 7: Performance & Optimization
 *
 * Prevents cascade failures by monitoring external service calls
 * and automatically "opening" the circuit when failures exceed threshold.
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Circuit is open, requests fail fast
 * - HALF_OPEN: Testing if service recovered
 *
 * @version 1.0.0-wave7
 * @date 2025-11-11
 */

/**
 * Circuit states
 */
export const CircuitState = {
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  HALF_OPEN: 'HALF_OPEN'
};

/**
 * Circuit Breaker Error
 */
export class CircuitBreakerError extends Error {
  constructor(message, circuitName) {
    super(message);
    this.name = 'CircuitBreakerError';
    this.circuitName = circuitName;
    this.isCircuitBreakerError = true;
  }
}

/**
 * Circuit Breaker
 * Implements the circuit breaker pattern for external service calls
 */
export class CircuitBreaker {
  /**
   * @param {Object} options - Circuit breaker options
   */
  constructor(options = {}) {
    this.name = options.name || 'UnnamedCircuit';
    this.failureThreshold = options.failureThreshold || 5; // Failures to open circuit
    this.successThreshold = options.successThreshold || 2; // Successes to close from half-open
    this.timeout = options.timeout || 60000; // Time before attempting reset (ms)
    this.resetTimeout = options.resetTimeout || this.timeout; // Alias for timeout
    this.onStateChange = options.onStateChange || (() => {}); // Callback on state change

    // State
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttempt = Date.now();
    this.lastError = null;

    // Statistics
    this.stats = {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      rejectedCalls: 0,
      timeouts: 0
    };
  }

  /**
   * Execute a function with circuit breaker protection
   * @param {Function} fn - Async function to execute
   * @returns {Promise<any>} Result of function
   */
  async execute(fn) {
    this.stats.totalCalls++;

    // Check if circuit is open
    if (this.state === CircuitState.OPEN) {
      // Check if timeout has passed
      if (Date.now() < this.nextAttempt) {
        this.stats.rejectedCalls++;
        throw new CircuitBreakerError(
          `Circuit breaker is OPEN for ${this.name}. Next attempt at ${new Date(this.nextAttempt).toISOString()}`,
          this.name
        );
      }

      // Timeout passed, move to half-open
      this.setState(CircuitState.HALF_OPEN);
    }

    try {
      // Execute function
      const result = await fn();

      // Success!
      this.onSuccess();

      return result;

    } catch (error) {
      // Failure
      this.onFailure(error);
      throw error;
    }
  }

  /**
   * Handle successful call
   * @private
   */
  onSuccess() {
    this.stats.successfulCalls++;
    this.failureCount = 0;
    this.lastError = null;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;

      // Check if we've had enough successes to close
      if (this.successCount >= this.successThreshold) {
        this.setState(CircuitState.CLOSED);
        this.successCount = 0;
      }
    }
  }

  /**
   * Handle failed call
   * @private
   * @param {Error} error - Error that occurred
   */
  onFailure(error) {
    this.stats.failedCalls++;
    this.failureCount++;
    this.lastError = error;

    if (error.name === 'AbortError' || error.code === 'ETIMEDOUT') {
      this.stats.timeouts++;
    }

    // Check if we need to open the circuit
    if (this.state === CircuitState.HALF_OPEN) {
      // Immediate open on failure during half-open
      this.setState(CircuitState.OPEN);
      this.successCount = 0;

    } else if (this.failureCount >= this.failureThreshold) {
      // Open circuit after threshold failures
      this.setState(CircuitState.OPEN);
    }
  }

  /**
   * Set circuit state
   * @private
   * @param {string} newState - New state
   */
  setState(newState) {
    const oldState = this.state;
    this.state = newState;

    if (newState === CircuitState.OPEN) {
      this.nextAttempt = Date.now() + this.resetTimeout;
    }

    // Call state change callback
    if (oldState !== newState) {
      this.onStateChange({
        circuit: this.name,
        from: oldState,
        to: newState,
        timestamp: new Date().toISOString(),
        failureCount: this.failureCount,
        lastError: this.lastError?.message
      });
    }
  }

  /**
   * Manually reset circuit to closed state
   */
  reset() {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttempt = Date.now();
    this.lastError = null;
  }

  /**
   * Get current circuit status
   * @returns {Object} Circuit status
   */
  getStatus() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      nextAttempt: this.state === CircuitState.OPEN ? new Date(this.nextAttempt).toISOString() : null,
      lastError: this.lastError?.message,
      stats: { ...this.stats }
    };
  }

  /**
   * Check if circuit is allowing requests
   * @returns {boolean} True if requests can pass
   */
  isAllowing() {
    return this.state === CircuitState.CLOSED ||
           (this.state === CircuitState.HALF_OPEN && Date.now() >= this.nextAttempt);
  }
}

/**
 * Create a circuit breaker with logging
 * @param {Object} options - Circuit breaker options
 * @param {Object} logger - Logger instance
 * @returns {CircuitBreaker} Circuit breaker instance
 */
export function createCircuitBreaker(options, logger) {
  return new CircuitBreaker({
    ...options,
    onStateChange: (event) => {
      if (logger) {
        logger.warn('Circuit breaker state changed', event);
      }
      if (options.onStateChange) {
        options.onStateChange(event);
      }
    }
  });
}

/**
 * P1-2: Circuit Breaker Registry
 * Global registry for managing all circuit breakers
 * Consolidated from circuit-breaker.js
 */
class CircuitBreakerRegistry {
  constructor() {
    this.breakers = new Map();
  }

  /**
   * Get or create a circuit breaker
   * @param {string} name - Circuit breaker name
   * @param {Object} options - Circuit breaker options
   * @returns {CircuitBreaker} Circuit breaker instance
   */
  get(name, options = {}) {
    if (!this.breakers.has(name)) {
      this.breakers.set(name, new CircuitBreaker({ name, ...options }));
    }
    return this.breakers.get(name);
  }

  /**
   * Check if a circuit breaker exists
   * @param {string} name - Circuit breaker name
   * @returns {boolean}
   */
  has(name) {
    return this.breakers.has(name);
  }

  /**
   * Get status of all circuit breakers
   * @returns {Object} Map of name -> status
   */
  getAllStatus() {
    const status = {};
    for (const [name, breaker] of this.breakers.entries()) {
      status[name] = breaker.getStatus();
    }
    return status;
  }

  /**
   * Reset all circuit breakers
   */
  resetAll() {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }

  /**
   * Get count of open circuits
   * @returns {number}
   */
  getOpenCount() {
    let count = 0;
    for (const breaker of this.breakers.values()) {
      if (breaker.state === CircuitState.OPEN) {
        count++;
      }
    }
    return count;
  }

  /**
   * Get names of open circuits
   * @returns {string[]}
   */
  getOpenCircuits() {
    const open = [];
    for (const [name, breaker] of this.breakers.entries()) {
      if (breaker.state === CircuitState.OPEN) {
        open.push(name);
      }
    }
    return open;
  }
}

// Singleton registry instance
export const circuitBreakerRegistry = new CircuitBreakerRegistry();

// Pre-configured circuit breakers for common services
export const CIRCUIT_BREAKER_CONFIGS = {
  openai: {
    name: 'openai',
    failureThreshold: 3,
    successThreshold: 2,
    timeout: 60000, // 1 minute
  },
  evolution: {
    name: 'evolution',
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 30000, // 30 seconds
  },
  sheets: {
    name: 'google_sheets',
    failureThreshold: 3,
    successThreshold: 2,
    timeout: 120000, // 2 minutes
  },
  database: {
    name: 'database',
    failureThreshold: 10,
    successThreshold: 3,
    timeout: 10000, // 10 seconds
  }
};

/**
 * Get a pre-configured circuit breaker for common services
 * @param {string} serviceName - Service name (openai, evolution, sheets, database)
 * @returns {CircuitBreaker}
 */
export function getServiceCircuitBreaker(serviceName) {
  const config = CIRCUIT_BREAKER_CONFIGS[serviceName];
  if (!config) {
    throw new Error(`Unknown service: ${serviceName}. Available: ${Object.keys(CIRCUIT_BREAKER_CONFIGS).join(', ')}`);
  }
  return circuitBreakerRegistry.get(config.name, config);
}

export default CircuitBreaker;

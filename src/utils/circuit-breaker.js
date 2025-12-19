// circuit-breaker.js
// P1-2: DEPRECATED - Use CircuitBreaker.js instead
// This file now re-exports from the unified CircuitBreaker.js

// Re-export everything from the unified implementation
export {
  CircuitBreaker,
  CircuitState,
  CircuitBreakerError,
  createCircuitBreaker,
  circuitBreakerRegistry,
  CIRCUIT_BREAKER_CONFIGS,
  getServiceCircuitBreaker
} from './CircuitBreaker.js';

// For backwards compatibility, export CircuitBreaker as default
import CircuitBreaker from './CircuitBreaker.js';
export default CircuitBreaker;

/**
 * @deprecated Use CircuitBreaker.js instead
 * This file is kept for backwards compatibility only.
 * All functionality has been moved to CircuitBreaker.js
 */

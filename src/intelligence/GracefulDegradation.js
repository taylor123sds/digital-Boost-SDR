/**
 * @file GracefulDegradation.js
 * @description Sistema de degradação graceful para serviços de inteligência
 *
 * PROPÓSITO:
 * Quando serviços de IA falham (OpenAI down, timeout), o sistema continua
 * funcionando com fallbacks mais simples em vez de falhar completamente.
 *
 * HIERARQUIA DE FALLBACK:
 * 1. GPT-4o-mini (completo)
 * 2. GPT-3.5-turbo (mais rápido/barato)
 * 3. Regex-based (local, sem API)
 * 4. Default response (último recurso)
 *
 * @version 1.0.0
 */

import log from '../utils/logger-wrapper.js';

/**
 * Configuração de timeouts por operação
 */
const TIMEOUTS = {
  sentiment: 2000,      // 2s para análise de sentimento
  archetype: 3000,      // 3s para detecção de arquétipo
  intent: 2000,         // 2s para classificação de intenção
  response: 8000,       // 8s para geração de resposta
  default: 5000         // 5s default
};

/**
 * Circuit breaker states
 */
const CircuitState = {
  CLOSED: 'closed',     // Normal operation
  OPEN: 'open',         // Failing, use fallback
  HALF_OPEN: 'half_open' // Testing if recovered
};

class ServiceCircuitBreaker {
  constructor(serviceName, config = {}) {
    this.serviceName = serviceName;
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.lastFailure = null;
    this.lastSuccess = null;

    this.config = {
      failureThreshold: config.failureThreshold || 3,
      successThreshold: config.successThreshold || 2,
      resetTimeout: config.resetTimeout || 30000, // 30s
      ...config
    };
  }

  /**
   * Registra sucesso
   */
  recordSuccess() {
    this.successes++;
    this.lastSuccess = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      if (this.successes >= this.config.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.failures = 0;
        log.info(`[CIRCUIT] ${this.serviceName}: CLOSED (recovered)`);
      }
    } else {
      this.failures = 0; // Reset on success
    }
  }

  /**
   * Registra falha
   */
  recordFailure(error) {
    this.failures++;
    this.lastFailure = Date.now();
    this.successes = 0;

    if (this.state === CircuitState.CLOSED && this.failures >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN;
      log.warn(`[CIRCUIT] ${this.serviceName}: OPEN (failures: ${this.failures})`);
    } else if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN;
      log.warn(`[CIRCUIT] ${this.serviceName}: OPEN (half-open failed)`);
    }
  }

  /**
   * Verifica se pode executar
   */
  canExecute() {
    if (this.state === CircuitState.CLOSED) {
      return true;
    }

    if (this.state === CircuitState.OPEN) {
      // Verificar se timeout passou para tentar novamente
      if (Date.now() - this.lastFailure > this.config.resetTimeout) {
        this.state = CircuitState.HALF_OPEN;
        this.successes = 0;
        log.info(`[CIRCUIT] ${this.serviceName}: HALF_OPEN (testing)`);
        return true;
      }
      return false;
    }

    // HALF_OPEN - permite execução para testar
    return true;
  }

  getState() {
    return {
      serviceName: this.serviceName,
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailure: this.lastFailure,
      lastSuccess: this.lastSuccess
    };
  }
}

class GracefulDegradation {
  constructor() {
    this.circuits = new Map();
    this.stats = {
      totalCalls: 0,
      primarySuccess: 0,
      fallbackUsed: 0,
      defaultUsed: 0,
      timeouts: 0
    };
  }

  /**
   * Obtém ou cria circuit breaker para serviço
   */
  getCircuit(serviceName) {
    if (!this.circuits.has(serviceName)) {
      this.circuits.set(serviceName, new ServiceCircuitBreaker(serviceName));
    }
    return this.circuits.get(serviceName);
  }

  /**
   * Executa operação com timeout e fallback
   * @param {string} serviceName - Nome do serviço
   * @param {Function} primaryFn - Função principal (async)
   * @param {Function} fallbackFn - Função de fallback (async ou sync)
   * @param {*} defaultValue - Valor default se tudo falhar
   * @param {number} timeout - Timeout em ms
   */
  async execute(serviceName, primaryFn, fallbackFn, defaultValue, timeout) {
    this.stats.totalCalls++;
    const circuit = this.getCircuit(serviceName);
    const timeoutMs = timeout || TIMEOUTS[serviceName] || TIMEOUTS.default;

    // Se circuito aberto, usar fallback direto
    if (!circuit.canExecute()) {
      log.debug(`[GRACEFUL] ${serviceName}: circuit open, using fallback`);
      return this._executeFallback(serviceName, fallbackFn, defaultValue);
    }

    try {
      // Executar com timeout
      const result = await this._withTimeout(primaryFn(), timeoutMs);
      circuit.recordSuccess();
      this.stats.primarySuccess++;
      return result;

    } catch (error) {
      circuit.recordFailure(error);

      if (error.message === 'TIMEOUT') {
        this.stats.timeouts++;
        log.warn(`[GRACEFUL] ${serviceName}: timeout after ${timeoutMs}ms`);
      } else {
        log.warn(`[GRACEFUL] ${serviceName}: error - ${error.message}`);
      }

      // Tentar fallback
      return this._executeFallback(serviceName, fallbackFn, defaultValue);
    }
  }

  /**
   * Executa fallback
   */
  async _executeFallback(serviceName, fallbackFn, defaultValue) {
    if (fallbackFn) {
      try {
        const result = await fallbackFn();
        this.stats.fallbackUsed++;
        log.debug(`[GRACEFUL] ${serviceName}: fallback succeeded`);
        return result;
      } catch (fallbackError) {
        log.warn(`[GRACEFUL] ${serviceName}: fallback failed - ${fallbackError.message}`);
      }
    }

    // Último recurso: valor default
    this.stats.defaultUsed++;
    log.debug(`[GRACEFUL] ${serviceName}: using default value`);
    return defaultValue;
  }

  /**
   * Wrapper de timeout
   */
  _withTimeout(promise, ms) {
    return Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT')), ms)
      )
    ]);
  }

  /**
   * Retorna estatísticas
   */
  getStats() {
    const circuitStates = {};
    for (const [name, circuit] of this.circuits) {
      circuitStates[name] = circuit.getState();
    }

    return {
      ...this.stats,
      successRate: this.stats.totalCalls > 0
        ? ((this.stats.primarySuccess / this.stats.totalCalls) * 100).toFixed(1) + '%'
        : 'N/A',
      circuits: circuitStates
    };
  }

  /**
   * Reseta todos os circuitos
   */
  resetAll() {
    for (const circuit of this.circuits.values()) {
      circuit.state = CircuitState.CLOSED;
      circuit.failures = 0;
      circuit.successes = 0;
    }
    log.info('[GRACEFUL] All circuits reset');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FALLBACKS ESPECÍFICOS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fallback de sentimento baseado em regex
 */
export function regexSentimentFallback(message) {
  const msgLower = message.toLowerCase();

  // Palavras positivas
  const positiveWords = ['sim', 'claro', 'ótimo', 'bom', 'legal', 'quero', 'interessante', 'perfeito', 'show'];
  // Palavras negativas
  const negativeWords = ['não', 'nunca', 'ruim', 'péssimo', 'caro', 'problema', 'irritado', 'chato'];

  let positiveCount = positiveWords.filter(w => msgLower.includes(w)).length;
  let negativeCount = negativeWords.filter(w => msgLower.includes(w)).length;

  const score = 0.5 + (positiveCount * 0.1) - (negativeCount * 0.15);

  return {
    score: Math.max(0, Math.min(1, score)),
    label: score > 0.6 ? 'positive' : score < 0.4 ? 'negative' : 'neutral',
    source: 'regex_fallback',
    confidence: 0.5
  };
}

/**
 * Fallback de intenção baseado em regex
 */
export function regexIntentFallback(message) {
  const msgLower = message.toLowerCase();

  // Padrões de intenção
  if (/quero\s+agendar|marcar|reunião|call/i.test(msgLower)) {
    return { intent: 'meeting_request', confidence: 0.6, source: 'regex_fallback' };
  }

  if (/quanto\s+custa|preço|valor|investimento/i.test(msgLower)) {
    return { intent: 'pricing_question', confidence: 0.7, source: 'regex_fallback' };
  }

  if (/como\s+funciona|o\s+que\s+é|explica/i.test(msgLower)) {
    return { intent: 'faq_question', confidence: 0.6, source: 'regex_fallback' };
  }

  if (/não\s+(quero|preciso|tenho\s+interesse)|pare|sair/i.test(msgLower)) {
    return { intent: 'opt_out', confidence: 0.8, source: 'regex_fallback' };
  }

  if (/humano|pessoa|atendente|falar\s+com\s+alguém/i.test(msgLower)) {
    return { intent: 'human_request', confidence: 0.8, source: 'regex_fallback' };
  }

  return { intent: 'unknown', confidence: 0.3, source: 'regex_fallback' };
}

/**
 * Fallback de arquétipo (default)
 */
export function defaultArchetypeFallback() {
  return {
    archetype: 'pragmatic',
    confidence: 0.5,
    source: 'default_fallback',
    traits: ['direto', 'objetivo']
  };
}

// Singleton
let gracefulDegradationInstance = null;

export function getGracefulDegradation() {
  if (!gracefulDegradationInstance) {
    gracefulDegradationInstance = new GracefulDegradation();
  }
  return gracefulDegradationInstance;
}

export { GracefulDegradation, ServiceCircuitBreaker, TIMEOUTS };
export default GracefulDegradation;

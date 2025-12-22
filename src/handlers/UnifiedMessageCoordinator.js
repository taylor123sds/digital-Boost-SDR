// src/handlers/UnifiedMessageCoordinator.js
//  UNIFIED Message Coordination System
// Consolidates: MessageOrchestrator + MessageCoordinator + ResponseManager
//
// Eliminates race conditions, duplicate detection conflicts, and memory leaks
// by providing a single source of truth for message coordination

import { EventEmitter } from 'events';
import crypto from 'crypto';
import log from '../utils/logger-wrapper.js';
import simpleBotDetector from '../security/SimpleBotDetector.js';

/**
 * UnifiedMessageCoordinator
 *
 * Responsibilities:
 * 1. Prevent race conditions (per-contact locks)
 * 2. Ensure FIFO processing (queues per contact)
 * 3. Detect duplicate messages (hash-based, 10s window)
 * 4. Track sent responses (prevent duplicate sends, 30s window)
 * 5. Handle retries (up to 3 attempts with backoff)
 * 6. Manage memory (bounded caches with auto-cleanup)
 * 7. Provide observability (events, stats, logs)
 */
export class UnifiedMessageCoordinator extends EventEmitter {
  constructor(options = {}) {
    super();

    //  SINGLE lock and queue system per contact
    this.contacts = new Map(); // contactId -> ContactState
    // ContactState: {
    //   locked: boolean,
    //   lockTime: timestamp,
    //   queue: Message[],
    //   lastActivity: timestamp,
    //   processing: Promise | null
    // }

    //  SINGLE duplicate detection system
    this.messageHashes = new Map(); // hash -> { timestamp, count, contactId }
    //  FIX P1: Unified duplicate window - 5 minutes to match webhook_handler
    // Evolution API can retry webhooks after network issues, 10s was too short
    this.DUPLICATE_WINDOW = options.duplicateWindow || 300000; // 5 minutes (matches webhook_handler.MESSAGE_EXPIRY)

    //  Response tracking (integrated)
    this.sentResponses = new Map(); // hash -> { timestamp, to, message }
    this.RESPONSE_WINDOW = options.responseWindow || 30000; // 30 seconds

    //  Configuration
    this.config = {
      PROCESSING_TIMEOUT: options.processingTimeout || 30000, // 30s for OpenAI (3 sequential GPT calls)
      LOCK_TIMEOUT: options.lockTimeout || 30000, // 30s auto-release
      MAX_RETRIES: options.maxRetries || 3,
      MAX_QUEUE_SIZE: options.maxQueueSize || 20,
      MAX_CONTACTS: options.maxContacts || 100,
      MAX_MESSAGE_HASHES: options.maxMessageHashes || 1000,
      MAX_SENT_RESPONSES: options.maxSentResponses || 5000,
      //  FIX P0: More frequent cleanup to prevent memory buildup
      CLEANUP_INTERVAL: options.cleanupInterval || 30000, // 30 seconds (was 60s)
      INACTIVITY_THRESHOLD: options.inactivityThreshold || 5 * 60 * 1000 // 5 min
    };

    //  Statistics
    this.stats = {
      messagesReceived: 0,
      messagesProcessed: 0,
      messagesFailed: 0,
      duplicatesDetected: 0,
      responsesSent: 0,
      responseDuplicatesBlocked: 0,
      deadlocksRecovered: 0,
      timeoutsHandled: 0,
      averageProcessingTime: 0,
      startTime: Date.now()
    };

    //  Cleanup management
    this.cleanupIntervalId = null;
    this.startCleanup();

    log.start('Sistema unificado inicializado', {
      duplicateWindow: `${this.DUPLICATE_WINDOW}ms`,
      responseWindow: `${this.RESPONSE_WINDOW}ms`,
      processingTimeout: `${this.config.PROCESSING_TIMEOUT}ms`,
      autoCleanup: `${this.config.CLEANUP_INTERVAL}ms`
    });
  }

  /**
   * Main entry point for message processing
   * Handles locking, queuing, duplicate detection, and processing
   *
   * @param {string} contactId - Contact identifier (phone number)
   * @param {Object} message - Message object { text, metadata, timestamp }
   * @param {Function} processorFn - Async function to process message
   * @returns {Promise<Object>} Processing result
   */
  async processMessage(contactId, message, processorFn) {
    const startTime = Date.now();
    this.stats.messagesReceived++;

    try {
      // 1. Validate inputs
      this._validateInputs(contactId, message, processorFn);

      // 2. Generate message hash
      const messageHash = this._generateMessageHash(contactId, message);

      // 3. Check for duplicate message
      if (this._isDuplicate(messageHash)) {
        this.stats.duplicatesDetected++;

        this.emit('duplicateDetected', {
          contactId,
          messageHash: messageHash.substring(0, 8),
          timestamp: Date.now()
        });

        log.warn('Duplicata detectada', { contactId, messageHash: messageHash.substring(0, 8) });

        return {
          status: 'duplicate',
          contactId,
          messageHash: messageHash.substring(0, 8),
          window: this.DUPLICATE_WINDOW,
          timestamp: Date.now()
        };
      }

      // 4. Record message hash
      this._recordMessageHash(messageHash, contactId);

      // 5. Get or create contact state
      const contactState = this._getOrCreateContactState(contactId);

      // 6. Check if contact is locked
      if (contactState.locked) {
        log.info('Contato bloqueado, enfileirando', { contactId });
        return await this._enqueueMessage(contactId, contactState, message, processorFn);
      }

      // 7. Check if system is overloaded
      if (this.contacts.size >= this.config.MAX_CONTACTS) {
        throw new Error(`Sistema sobrecarregado: ${this.contacts.size} contatos ativos (max: ${this.config.MAX_CONTACTS})`);
      }

      // 8. Acquire lock and process
      this._acquireLock(contactId, contactState);

      try {
        const result = await this._processWithTimeout(contactId, message, processorFn);

        const duration = Date.now() - startTime;
        this._updateStats(duration, true);

        this.emit('messageProcessed', {
          contactId,
          duration,
          timestamp: Date.now()
        });

        log.success('Mensagem processada', { contactId, duration: `${duration}ms` });

        return result;

      } finally {
        // 9. Always release lock
        this._releaseLock(contactId, contactState);

        // 10. Process next message in queue
        await this._processNextInQueue(contactId, contactState);
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      this._updateStats(duration, false);

      this.emit('processingError', {
        contactId,
        error: error.message,
        duration,
        timestamp: Date.now()
      });

      log.error('Erro ao processar mensagem', error, { contactId });

      return {
        status: 'error',
        contactId,
        error: error.message,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Send response with duplicate detection and retry logic
   *
   * @param {string} contactId - Contact identifier
   * @param {string} responseText - Response message
   * @param {Object} options - Send options { priority, metadata }
   * @returns {Promise<Object>} Send result
   */
  async sendResponse(contactId, responseText, options = {}) {
    try {
      // 1. Generate response hash
      const responseHash = this._generateResponseHash(contactId, responseText);

      // 2. Check if response was already sent
      if (this._wasResponseSent(responseHash)) {
        this.stats.responseDuplicatesBlocked++;

        const sentInfo = this.sentResponses.get(responseHash);
        log.warn('Resposta duplicada bloqueada', {
          contactId,
          responseHash: responseHash.substring(0, 8),
          originalTimestamp: new Date(sentInfo.timestamp).toISOString()
        });

        return {
          sent: false,
          reason: 'duplicate_blocked',
          originalTime: sentInfo.timestamp,
          hash: responseHash.substring(0, 8)
        };
      }

      // 3. Send with retry logic
      const result = await this._sendWithRetry(contactId, responseText, responseHash, options);

      // 4. Record sent response
      if (result.sent) {
        this._recordSentResponse(responseHash, contactId, responseText);
        this.stats.responsesSent++;

        //  Register timestamp for bot detection timing analysis
        simpleBotDetector.recordOutgoingMessage(contactId);
      }

      return result;

    } catch (error) {
      log.error('Erro ao enviar resposta', error, { contactId });
      return {
        sent: false,
        error: error.message,
        contactId
      };
    }
  }

  /**
   * Get coordinator statistics
   * @returns {Object} Statistics object
   */
  getStats() {
    const uptime = Date.now() - this.stats.startTime;

    return {
      ...this.stats,
      uptime,
      uptimeFormatted: this._formatUptime(uptime),
      activeContacts: this.contacts.size,
      queuedMessages: Array.from(this.contacts.values())
        .reduce((sum, state) => sum + state.queue.length, 0),
      messageHashesTracked: this.messageHashes.size,
      sentResponsesTracked: this.sentResponses.size,
      duplicateRate: this.stats.messagesReceived > 0
        ? (this.stats.duplicatesDetected / this.stats.messagesReceived * 100).toFixed(2) + '%'
        : '0%',
      successRate: this.stats.messagesProcessed > 0
        ? ((this.stats.messagesProcessed / (this.stats.messagesProcessed + this.stats.messagesFailed)) * 100).toFixed(2) + '%'
        : '100%'
    };
  }

  /**
   * Emergency cleanup - force clear all locks and queues
   * Use only in critical situations
   */
  emergencyCleanup() {
    const clearedContacts = this.contacts.size;
    const clearedQueues = Array.from(this.contacts.values())
      .reduce((sum, state) => sum + state.queue.length, 0);

    this.contacts.clear();
    this.messageHashes.clear();
    // Keep sentResponses for safety

    log.warn('Emergency cleanup ativado', {
      clearedContacts,
      clearedQueues,
      reason: 'emergency'
    });

    this.emit('emergencyCleanup', {
      clearedContacts,
      clearedQueues,
      timestamp: Date.now()
    });
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    log.info('Iniciando shutdown gracioso');

    // Stop cleanup
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
    }

    // Wait for in-flight processing
    const inFlight = Array.from(this.contacts.values())
      .filter(state => state.processing)
      .map(state => state.processing);

    if (inFlight.length > 0) {
      log.info('Aguardando processamentos em andamento', { count: inFlight.length });
      await Promise.allSettled(inFlight);
    }

    log.success('Shutdown completo');
  }

  // ==================== PRIVATE METHODS ====================

  _validateInputs(contactId, message, processorFn) {
    if (!contactId || typeof contactId !== 'string') {
      throw new Error(`contactId inválido: ${contactId}`);
    }

    if (!message || typeof message !== 'object') {
      throw new Error('message deve ser um objeto');
    }

    if (typeof processorFn !== 'function') {
      throw new Error('processorFn deve ser uma função');
    }
  }

  _generateMessageHash(contactId, message) {
    const text = message.text || message.content || JSON.stringify(message);
    const hashContent = `${contactId}:${text}:${message.messageType || 'text'}`;
    return crypto.createHash('sha256').update(hashContent).digest('hex');
  }

  _generateResponseHash(contactId, responseText) {
    const hashContent = `${contactId}:${responseText}`;
    return crypto.createHash('sha256').update(hashContent).digest('hex');
  }

  _isDuplicate(messageHash) {
    const record = this.messageHashes.get(messageHash);
    if (!record) return false;

    const age = Date.now() - record.timestamp;
    return age < this.DUPLICATE_WINDOW;
  }

  _recordMessageHash(messageHash, contactId) {
    //  FIX P0: Enforce cache limit BEFORE adding (prevents memory leak)
    this._enforceCacheLimitProactive(this.messageHashes, this.config.MAX_MESSAGE_HASHES - 1);

    this.messageHashes.set(messageHash, {
      timestamp: Date.now(),
      contactId,
      count: (this.messageHashes.get(messageHash)?.count || 0) + 1
    });
  }

  _wasResponseSent(responseHash) {
    const record = this.sentResponses.get(responseHash);
    if (!record) return false;

    const age = Date.now() - record.timestamp;
    return age < this.RESPONSE_WINDOW;
  }

  _recordSentResponse(responseHash, contactId, responseText) {
    //  FIX P0: Enforce cache limit BEFORE adding (prevents memory leak)
    this._enforceCacheLimitProactive(this.sentResponses, this.config.MAX_SENT_RESPONSES - 1);

    this.sentResponses.set(responseHash, {
      timestamp: Date.now(),
      to: contactId,
      message: responseText.substring(0, 100)
    });
  }

  _getOrCreateContactState(contactId) {
    if (!this.contacts.has(contactId)) {
      this.contacts.set(contactId, {
        locked: false,
        lockTime: null,
        queue: [],
        lastActivity: Date.now(),
        processing: null
      });
    }

    return this.contacts.get(contactId);
  }

  _acquireLock(contactId, contactState) {
    contactState.locked = true;
    contactState.lockTime = Date.now();
    contactState.lastActivity = Date.now();

    log.info('Lock adquirido', { contactId });
  }

  _releaseLock(contactId, contactState) {
    contactState.locked = false;
    contactState.lockTime = null;
    contactState.processing = null;
    contactState.lastActivity = Date.now();

    log.info('Lock liberado', { contactId });
  }

  async _enqueueMessage(contactId, contactState, message, processorFn) {
    // Check queue limit
    if (contactState.queue.length >= this.config.MAX_QUEUE_SIZE) {
      throw new Error(`Fila cheia para ${contactId}: ${contactState.queue.length} mensagens (max: ${this.config.MAX_QUEUE_SIZE})`);
    }

    // Add to queue
    const queueItem = {
      id: crypto.randomUUID(),
      message,
      processorFn,
      timestamp: Date.now(),
      attempts: 0
    };

    contactState.queue.push(queueItem);

    log.info('Mensagem enfileirada', { contactId, queuePosition: contactState.queue.length });

    return {
      status: 'queued',
      contactId,
      queuePosition: contactState.queue.length,
      queueId: queueItem.id
    };
  }

  async _processNextInQueue(contactId, contactState) {
    if (contactState.queue.length === 0) {
      return;
    }

    log.info('Processando próximo na fila', { contactId, remaining: contactState.queue.length });

    const queueItem = contactState.queue.shift();

    // Process in background (don't await)
    setImmediate(async () => {
      try {
        await this.processMessage(contactId, queueItem.message, queueItem.processorFn);
      } catch (error) {
        log.error('Erro ao processar mensagem na fila', error, { contactId });
      }
    });
  }

  async _processWithTimeout(contactId, message, processorFn) {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Timeout: Processamento de ${contactId} excedeu ${this.config.PROCESSING_TIMEOUT}ms`));
      }, this.config.PROCESSING_TIMEOUT);
    });

    const processingPromise = processorFn(message, { contactId, timestamp: Date.now() });

    // Store processing promise for shutdown
    const contactState = this.contacts.get(contactId);
    if (contactState) {
      contactState.processing = processingPromise;
    }

    try {
      const result = await Promise.race([processingPromise, timeoutPromise]);
      return {
        status: 'processed',
        contactId,
        result,
        timestamp: Date.now()
      };
    } catch (error) {
      if (error.message.includes('Timeout')) {
        this.stats.timeoutsHandled++;
      }
      throw error;
    }
  }

  async _sendWithRetry(contactId, responseText, responseHash, options) {
    let lastError = null;

    for (let attempt = 1; attempt <= this.config.MAX_RETRIES; attempt++) {
      try {
        log.info('Enviando resposta', { contactId, attempt, maxRetries: this.config.MAX_RETRIES });

        const { sendWhatsAppText } = await import('../services/whatsappAdapterProvider.js');
        const result = await sendWhatsAppText(contactId, responseText);

        log.success('Resposta enviada', { contactId, attempt });

        return {
          sent: true,
          contactId,
          attempt,
          timestamp: Date.now(),
          result
        };

      } catch (error) {
        lastError = error;
        log.warn('Tentativa de envio falhou', { contactId, attempt, error: error.message });

        if (attempt < this.config.MAX_RETRIES) {
          // Exponential backoff
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed
    log.error('Falha após todas as tentativas', lastError, {
      contactId,
      maxRetries: this.config.MAX_RETRIES
    });

    return {
      sent: false,
      error: lastError?.message || 'Unknown error',
      contactId,
      attempts: this.config.MAX_RETRIES
    };
  }

  _updateStats(duration, success) {
    if (success) {
      this.stats.messagesProcessed++;

      // Update average processing time
      const totalProcessed = this.stats.messagesProcessed;
      const currentAvg = this.stats.averageProcessingTime;
      this.stats.averageProcessingTime =
        (currentAvg * (totalProcessed - 1) + duration) / totalProcessed;
    } else {
      this.stats.messagesFailed++;
    }
  }

  startCleanup() {
    this.cleanupIntervalId = setInterval(() => {
      this._cleanup();
    }, this.config.CLEANUP_INTERVAL);

    log.info('Auto-cleanup agendado', { interval: `${this.config.CLEANUP_INTERVAL}ms` });
  }

  _cleanup() {
    const now = Date.now();
    let cleaned = {
      messageHashes: 0,
      sentResponses: 0,
      inactiveContacts: 0,
      staleLocks: 0
    };

    // 1. Clean expired message hashes
    for (const [hash, record] of this.messageHashes.entries()) {
      if (now - record.timestamp > this.DUPLICATE_WINDOW) {
        this.messageHashes.delete(hash);
        cleaned.messageHashes++;
      }
    }

    // 2. Clean expired sent responses
    for (const [hash, record] of this.sentResponses.entries()) {
      if (now - record.timestamp > this.RESPONSE_WINDOW) {
        this.sentResponses.delete(hash);
        cleaned.sentResponses++;
      }
    }

    // 3. Clean inactive contacts (no queue, no lock, inactive)
    for (const [contactId, state] of this.contacts.entries()) {
      if (!state.locked &&
          state.queue.length === 0 &&
          now - state.lastActivity > this.config.INACTIVITY_THRESHOLD) {
        this.contacts.delete(contactId);
        cleaned.inactiveContacts++;
      }
    }

    // 4. Recover stale locks (locked for too long)
    for (const [contactId, state] of this.contacts.entries()) {
      if (state.locked &&
          state.lockTime &&
          now - state.lockTime > this.config.LOCK_TIMEOUT) {
        log.warn('Lock expirado detectado', { contactId, lockAge: `${now - state.lockTime}ms` });
        this._releaseLock(contactId, state);
        cleaned.staleLocks++;
        this.stats.deadlocksRecovered++;
      }
    }

    // 5. Enforce cache limits
    cleaned.messageHashes += this._enforceCacheLimit(
      this.messageHashes,
      this.config.MAX_MESSAGE_HASHES
    );

    cleaned.sentResponses += this._enforceCacheLimit(
      this.sentResponses,
      this.config.MAX_SENT_RESPONSES
    );

    // Log cleanup results
    const totalCleaned = Object.values(cleaned).reduce((a, b) => a + b, 0);
    if (totalCleaned > 0) {
      log.info('Cleanup executado', {
        messageHashes: cleaned.messageHashes,
        sentResponses: cleaned.sentResponses,
        inactiveContacts: cleaned.inactiveContacts,
        staleLocks: cleaned.staleLocks,
        total: totalCleaned
      });
    }

    this.emit('cleanupCompleted', {
      cleaned,
      timestamp: now
    });
  }

  /**
   *  FIX P0: Proactive cache limit enforcement
   * Called BEFORE adding new entries to prevent memory leaks
   * More efficient than reactive cleanup (reduces memory spikes)
   */
  _enforceCacheLimitProactive(cache, maxSize) {
    if (cache.size < maxSize) return 0;

    // Remove 10% of oldest entries when limit is reached (batch eviction)
    const toRemove = Math.max(1, Math.floor(maxSize * 0.1));
    const entries = Array.from(cache.entries());

    // Sort by timestamp (oldest first)
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

    // Remove oldest entries
    for (let i = 0; i < toRemove && i < entries.length; i++) {
      cache.delete(entries[i][0]);
    }

    return toRemove;
  }

  _enforceCacheLimit(cache, maxSize) {
    if (cache.size <= maxSize) return 0;

    const toRemove = cache.size - maxSize;
    const entries = Array.from(cache.entries());

    // Sort by timestamp (oldest first)
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

    // Remove oldest entries
    for (let i = 0; i < toRemove; i++) {
      cache.delete(entries[i][0]);
    }

    return toRemove;
  }

  _formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }
}

// Singleton instance
let coordinatorInstance = null;

/**
 * Get or create singleton instance
 * @param {Object} options - Configuration options
 * @returns {UnifiedMessageCoordinator}
 */
export function getUnifiedCoordinator(options = {}) {
  if (!coordinatorInstance) {
    coordinatorInstance = new UnifiedMessageCoordinator(options);
  }
  return coordinatorInstance;
}

export default UnifiedMessageCoordinator;

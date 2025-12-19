// handlers/message_orchestrator.js
// Comprehensive MessageOrchestrator system for preventing race conditions and duplicate responses

import { EventEmitter } from 'events';
import crypto from 'crypto';

class MessageOrchestrator extends EventEmitter {
  constructor() {
    super();

    // Core state management
    this.contactLocks = new Map(); // contactId -> { processId, startTime, processor }
    this.messageQueues = new Map(); // contactId -> Array of queued messages
    this.processingStats = {
      totalProcessed: 0,
      totalErrors: 0,
      totalDeadlocks: 0,
      totalTimeouts: 0,
      averageProcessingTime: 0,
      startTime: Date.now()
    };

    // Configuration
    this.config = {
      PROCESSING_TIMEOUT: 15000,  // 15 seconds (enough time for OpenAI processing)
      LOCK_TIMEOUT: 3000,        // 3 seconds
      MAX_QUEUE_SIZE: 10,        // Max messages per contact
      DEADLOCK_CHECK_INTERVAL: 20000, // 20 seconds (adjusted for higher timeout)
      MAX_CONCURRENT_CONTACTS: 50
    };

    // Agent priority system (3-agent specialized system)
    this.agentPriority = [
      'SDRAgent',
      'SpecialistAgent',
      'SchedulerAgent'
    ];

    // Start deadlock detection
    this.startDeadlockDetection();

    // Bind methods to maintain context
    this.processMessage = this.processMessage.bind(this);
    this.cleanup = this.cleanup.bind(this);

    console.log('🎯 MessageOrchestrator: Sistema inicializado com proteção contra race conditions');
  }

  /**
   * Main message processing function with full orchestration
   * @param {string} contactId - Contact identifier
   * @param {Object} message - Message object
   * @param {Function} processor - Message processor function
   * @returns {Promise<Object>} Processing result
   */
  async processMessage(contactId, message, processor) {
    const processId = this.generateProcessId();
    const startTime = Date.now();

    try {
      console.log(`🎯 MessageOrchestrator: Iniciando processamento ${processId} para ${contactId}`);
      this.emit('messageReceived', { contactId, processId, message, timestamp: startTime });

      // Check if contact is locked
      if (this.isContactLocked(contactId)) {
        console.log(`🔒 Contato ${contactId} bloqueado, adicionando à fila`);
        return await this.queueMessage(contactId, message, processor);
      }

      // Check queue limit
      if (this.contactLocks.size >= this.config.MAX_CONCURRENT_CONTACTS) {
        throw new Error(`Sistema sobrecarregado: ${this.contactLocks.size} contatos sendo processados`);
      }

      // Acquire lock
      this.acquireLock(contactId, processId, processor);

      try {
        // Process with timeout
        const result = await this.processWithTimeout(contactId, message, processor, processId);

        // Update statistics
        this.updateStats(startTime, true);

        console.log(`✅ Processamento ${processId} concluído para ${contactId}`);
        this.emit('messageProcessed', { contactId, processId, result, duration: Date.now() - startTime });

        return result;

      } finally {
        // Always release lock
        this.releaseLock(contactId);

        // Process next message in queue if exists
        await this.processQueuedMessage(contactId);
      }

    } catch (error) {
      this.updateStats(startTime, false);
      this.emit('processingError', { contactId, processId, error: error.message, duration: Date.now() - startTime });

      console.error(`❌ Erro no processamento ${processId}:`, error);

      return {
        success: false,
        response: "Desculpe, tive um problema técnico. Pode repetir sua mensagem em alguns segundos?",
        error: error.message,
        processId,
        fallback: true
      };
    }
  }

  /**
   * Check if a contact is currently being processed
   * @param {string} contactId - Contact identifier
   * @returns {boolean} True if contact is locked
   */
  isContactLocked(contactId) {
    const lock = this.contactLocks.get(contactId);

    if (!lock) return false;

    const elapsed = Date.now() - lock.startTime;

    // Auto-cleanup stale locks
    if (elapsed > this.config.PROCESSING_TIMEOUT) {
      console.log(`⚠️ Lock expirado detectado para ${contactId}, removendo automaticamente`);
      this.releaseLock(contactId);
      this.processingStats.totalTimeouts++;
      return false;
    }

    return true;
  }

  /**
   * Queue a message for processing when contact becomes available
   * @param {string} contactId - Contact identifier
   * @param {Object} message - Message to queue
   * @param {Function} processor - Processor function
   * @returns {Promise<Object>} Queue result
   */
  async queueMessage(contactId, message, processor) {
    const queue = this.messageQueues.get(contactId) || [];

    // Check queue size limit
    if (queue.length >= this.config.MAX_QUEUE_SIZE) {
      console.log(`⚠️ Fila cheia para ${contactId}, descartando mensagem mais antiga`);
      queue.shift(); // Remove oldest message
    }

    const queuedItem = {
      message,
      processor,
      queuedAt: Date.now(),
      attempts: 0
    };

    queue.push(queuedItem);
    this.messageQueues.set(contactId, queue);

    console.log(`📥 Mensagem enfileirada para ${contactId} (${queue.length} na fila)`);
    this.emit('messageQueued', { contactId, queueSize: queue.length, message });

    return {
      success: false,
      response: "Sua mensagem anterior ainda está sendo processada. Esta mensagem foi adicionada à fila.",
      queued: true,
      queuePosition: queue.length
    };
  }

  /**
   * Process message with timeout protection
   * @param {string} contactId - Contact identifier
   * @param {Object} message - Message to process
   * @param {Function} processor - Processor function
   * @param {string} processId - Process identifier
   * @returns {Promise<Object>} Processing result
   */
  async processWithTimeout(contactId, message, processor, processId) {
    console.log(`⏱️ Processando com timeout de ${this.config.PROCESSING_TIMEOUT}ms`);

    const processingPromise = processor(message, { contactId, processId });

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Timeout: Processamento de ${contactId} excedeu ${this.config.PROCESSING_TIMEOUT}ms`));
      }, this.config.PROCESSING_TIMEOUT);
    });

    // Race between processing and timeout
    const result = await Promise.race([processingPromise, timeoutPromise]);

    // Validate result
    return this.validateResult(result, processId);
  }

  /**
   * Detect and resolve deadlocks automatically
   */
  detectAndResolveDeadlocks() {
    const now = Date.now();
    let deadlocksFound = 0;

    for (const [contactId, lock] of this.contactLocks.entries()) {
      const elapsed = now - lock.startTime;

      if (elapsed > this.config.PROCESSING_TIMEOUT) {
        console.log(`🔓 Deadlock detectado e resolvido para ${contactId} (${elapsed}ms)`);
        this.releaseLock(contactId);
        this.processQueuedMessage(contactId); // Process next in queue
        deadlocksFound++;
      }
    }

    if (deadlocksFound > 0) {
      this.processingStats.totalDeadlocks += deadlocksFound;
      this.emit('deadlocksResolved', { count: deadlocksFound, timestamp: now });
      console.log(`🔧 ${deadlocksFound} deadlocks resolvidos automaticamente`);
    }

    return deadlocksFound;
  }

  /**
   * Get comprehensive system statistics
   * @returns {Object} Statistics object
   */
  getStats() {
    const uptime = Date.now() - this.processingStats.startTime;
    const totalQueued = Array.from(this.messageQueues.values()).reduce((sum, queue) => sum + queue.length, 0);

    return {
      // Processing stats
      totalProcessed: this.processingStats.totalProcessed,
      totalErrors: this.processingStats.totalErrors,
      totalDeadlocks: this.processingStats.totalDeadlocks,
      totalTimeouts: this.processingStats.totalTimeouts,
      successRate: this.calculateSuccessRate(),
      averageProcessingTime: this.processingStats.averageProcessingTime,

      // Current state
      currentlyProcessing: this.contactLocks.size,
      totalQueued,
      activeContacts: Array.from(this.contactLocks.keys()),
      contactsWithQueues: Array.from(this.messageQueues.keys()).length,

      // System health
      uptime,
      uptimeFormatted: this.formatUptime(uptime),
      memoryUsage: process.memoryUsage(),

      // Configuration
      config: { ...this.config },

      // Queue details
      queueDetails: this.getQueueDetails()
    };
  }

  /**
   * Emergency unlock function for manual intervention
   * @param {string} contactId - Contact to unlock (optional, unlocks all if not provided)
   * @returns {number} Number of locks released
   */
  emergencyUnlock(contactId = null) {
    if (contactId) {
      if (this.contactLocks.has(contactId)) {
        this.releaseLock(contactId);
        console.log(`🚨 Emergency unlock executado para ${contactId}`);
        return 1;
      }
      return 0;
    } else {
      const count = this.contactLocks.size;
      this.contactLocks.clear();
      console.log(`🚨 Emergency unlock executado para todos os contatos (${count})`);
      return count;
    }
  }

  /**
   * Cleanup resources and stop background processes
   */
  cleanup() {
    console.log('🧹 MessageOrchestrator: Iniciando limpeza...');

    // Clear deadlock detection interval
    if (this.deadlockInterval) {
      clearInterval(this.deadlockInterval);
      this.deadlockInterval = null;
    }

    // Release all locks
    const locksReleased = this.contactLocks.size;
    this.contactLocks.clear();

    // Clear all queues
    const messagesDropped = Array.from(this.messageQueues.values()).reduce((sum, queue) => sum + queue.length, 0);
    this.messageQueues.clear();

    // Remove all listeners
    this.removeAllListeners();

    console.log(`🧹 Limpeza concluída: ${locksReleased} locks liberados, ${messagesDropped} mensagens descartadas`);

    this.emit('cleanupComplete', { locksReleased, messagesDropped });
  }

  // Private helper methods

  generateProcessId() {
    return `proc_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
  }

  acquireLock(contactId, processId, processor) {
    this.contactLocks.set(contactId, {
      processId,
      startTime: Date.now(),
      processor: processor.name || 'anonymous'
    });

    console.log(`🔒 Lock adquirido para ${contactId} (processo: ${processId})`);
    this.emit('lockAcquired', { contactId, processId });
  }

  releaseLock(contactId) {
    const lock = this.contactLocks.get(contactId);
    if (lock) {
      const duration = Date.now() - lock.startTime;
      this.contactLocks.delete(contactId);

      console.log(`🔓 Lock liberado para ${contactId} (duração: ${duration}ms)`);
      this.emit('lockReleased', { contactId, duration, processId: lock.processId });
    }
  }

  async processQueuedMessage(contactId) {
    const queue = this.messageQueues.get(contactId);

    if (!queue || queue.length === 0) {
      this.messageQueues.delete(contactId);
      return;
    }

    const queuedItem = queue.shift();
    queuedItem.attempts++;

    // Update queue
    if (queue.length === 0) {
      this.messageQueues.delete(contactId);
    } else {
      this.messageQueues.set(contactId, queue);
    }

    console.log(`📤 Processando mensagem da fila para ${contactId} (tentativa ${queuedItem.attempts})`);

    // Process the queued message
    setTimeout(() => {
      this.processMessage(contactId, queuedItem.message, queuedItem.processor)
        .catch(error => {
          console.error(`❌ Erro processando mensagem da fila para ${contactId}:`, error);
        });
    }, 100); // Small delay to prevent immediate recursion
  }

  validateResult(result, processId) {
    if (!result) {
      return {
        success: false,
        response: "Desculpe, tive um problema interno. Pode repetir?",
        processId,
        fallback: true
      };
    }

    if (!result.response || result.response.trim().length === 0) {
      return {
        success: false,
        response: "Desculpe, não consegui processar sua mensagem. Pode tentar novamente?",
        processId,
        fallback: true
      };
    }

    return {
      ...result,
      processId,
      processedByOrchestrator: true,
      timestamp: Date.now()
    };
  }

  updateStats(startTime, success) {
    const duration = Date.now() - startTime;

    if (success) {
      this.processingStats.totalProcessed++;

      // Update average processing time
      const currentAvg = this.processingStats.averageProcessingTime;
      const totalSuccess = this.processingStats.totalProcessed;
      this.processingStats.averageProcessingTime =
        ((currentAvg * (totalSuccess - 1)) + duration) / totalSuccess;
    } else {
      this.processingStats.totalErrors++;
    }
  }

  calculateSuccessRate() {
    const total = this.processingStats.totalProcessed + this.processingStats.totalErrors;
    if (total === 0) return 100;

    return ((this.processingStats.totalProcessed / total) * 100).toFixed(2);
  }

  formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  getQueueDetails() {
    const details = {};

    for (const [contactId, queue] of this.messageQueues.entries()) {
      details[contactId] = {
        queueSize: queue.length,
        oldestMessage: queue.length > 0 ? Date.now() - queue[0].queuedAt : 0,
        totalAttempts: queue.reduce((sum, item) => sum + item.attempts, 0)
      };
    }

    return details;
  }

  startDeadlockDetection() {
    this.deadlockInterval = setInterval(() => {
      this.detectAndResolveDeadlocks();
    }, this.config.DEADLOCK_CHECK_INTERVAL);

    console.log(`🔍 Detecção de deadlock iniciada (intervalo: ${this.config.DEADLOCK_CHECK_INTERVAL}ms)`);
  }
}

// Singleton instance with global access
const orchestrator = new MessageOrchestrator();

// Export both class and singleton
export { MessageOrchestrator };
export default orchestrator;

// Graceful shutdown handling
process.on('SIGINT', () => {
  console.log('🛑 SIGINT recebido, fazendo cleanup do MessageOrchestrator...');
  orchestrator.cleanup();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM recebido, fazendo cleanup do MessageOrchestrator...');
  orchestrator.cleanup();
  process.exit(0);
});
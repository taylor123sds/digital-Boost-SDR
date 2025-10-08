// handlers/MessageCoordinator.js
// Advanced message coordination system for ORBION WhatsApp agent
// Works alongside MessageOrchestrator to provide FIFO queues, duplicate detection, and message batching

import { EventEmitter } from 'events';
import crypto from 'crypto';

class MessageCoordinator extends EventEmitter {
  constructor() {
    super();

    // Core queue system - FIFO per contact
    this.contactQueues = new Map(); // contactId -> { queue: [], processing: false, lastActivity: timestamp }

    // Duplicate detection system
    this.duplicateDetection = new Map(); // contactId -> { messageHash: timestamp }
    this.duplicateWindow = 1000; // 1 segundo (otimizado para conversas naturais - evita duplicatas sem bloquear respostas legítimas)

    // Message batching system for high-frequency contacts
    this.batchingSystem = new Map(); // contactId -> { messages: [], timer: timeoutId, frequency: number }
    this.batchConfig = {
      BATCH_THRESHOLD: 3, // Messages per minute to trigger batching
      BATCH_TIMEOUT: 2000, // 2 seconds batch collection timeout
      BATCH_MAX_SIZE: 5 // Maximum messages in a batch
    };

    // Statistics and monitoring
    this.stats = {
      totalMessages: 0,
      duplicatesDetected: 0,
      queuesCreated: 0,
      queuesDestroyed: 0,
      batchesCreated: 0,
      currentQueues: 0,
      averageQueueSize: 0,
      longestQueue: 0,
      startTime: Date.now()
    };

    // Configuration
    this.config = {
      QUEUE_CLEANUP_INTERVAL: 5 * 60 * 1000, // 5 minutes
      DUPLICATE_CLEANUP_INTERVAL: 30 * 1000, // 30 seconds
      MAX_QUEUE_SIZE: 20, // Maximum messages per contact queue
      EMERGENCY_FLUSH_THRESHOLD: 50, // Total queues before emergency flush
      INACTIVITY_THRESHOLD: 5 * 60 * 1000 // 5 minutes of inactivity
    };

    // Start cleanup routines
    this.startAutoCleanup();
    this.startDuplicateCleanup();

    console.log('🎛️ MessageCoordinator: Sistema de coordenação inicializado');
    console.log(`   - FIFO queues por contato ativadas`);
    console.log(`   - Detecção de duplicatas (${this.duplicateWindow/1000}s)`);
    console.log(`   - Sistema de batching configurado`);
    console.log(`   - Auto-cleanup a cada ${this.config.QUEUE_CLEANUP_INTERVAL/60000} minutos`);
  }

  /**
   * Add message to contact queue with duplicate detection and batching
   * @param {string} contactId - Contact identifier
   * @param {Object} message - Message object
   * @returns {Promise<Object>} Enqueue result
   */
  async enqueueMessage(contactId, message) {
    try {
      this.stats.totalMessages++;

      // Generate message hash for duplicate detection
      const messageHash = this.generateMessageHash(message);

      // Check for duplicates
      if (this.isDuplicate(contactId, messageHash)) {
        this.stats.duplicatesDetected++;
        console.log(`🔄 MessageCoordinator: Duplicata detectada para ${contactId}`);

        this.emit('duplicateDetected', {
          contactId,
          messageHash: messageHash.substring(0, 8),
          timestamp: Date.now()
        });

        return {
          status: 'duplicate',
          contactId,
          messageHash: messageHash.substring(0, 8),
          duplicateWindow: this.duplicateWindow
        };
      }

      // Record message for duplicate detection
      this.recordMessage(contactId, messageHash);

      // Check if batching should be enabled for this contact
      const shouldBatch = this.checkBatchingRequired(contactId);

      if (shouldBatch) {
        return await this.handleBatchedMessage(contactId, message);
      }

      // Get or create queue for contact
      let contactQueue = this.contactQueues.get(contactId);

      if (!contactQueue) {
        contactQueue = {
          queue: [],
          processing: false,
          lastActivity: Date.now(),
          created: Date.now()
        };
        this.contactQueues.set(contactId, contactQueue);
        this.stats.queuesCreated++;
        this.stats.currentQueues++;

        console.log(`📥 MessageCoordinator: Nova fila criada para ${contactId}`);
      }

      // Check queue size limit
      if (contactQueue.queue.length >= this.config.MAX_QUEUE_SIZE) {
        console.log(`⚠️ MessageCoordinator: Fila cheia para ${contactId} (${contactQueue.queue.length} mensagens)`);

        // Emergency: remove oldest message
        const removedMessage = contactQueue.queue.shift();
        console.log(`🗑️ MessageCoordinator: Removida mensagem mais antiga da fila de ${contactId}`);

        this.emit('queueOverflow', {
          contactId,
          queueSize: contactQueue.queue.length,
          removedMessage: removedMessage?.id || 'unknown'
        });
      }

      // Add message to queue
      const queueItem = {
        id: crypto.randomUUID(),
        message,
        timestamp: Date.now(),
        messageHash,
        attempts: 0
      };

      contactQueue.queue.push(queueItem);
      contactQueue.lastActivity = Date.now();

      // Update statistics
      this.updateQueueStats();

      console.log(`📥 MessageCoordinator: Mensagem adicionada à fila de ${contactId} (${contactQueue.queue.length} na fila)`);

      this.emit('messageEnqueued', {
        contactId,
        messageId: queueItem.id,
        queueSize: contactQueue.queue.length,
        timestamp: Date.now()
      });

      return {
        status: 'enqueued',
        contactId,
        messageId: queueItem.id,
        queuePosition: contactQueue.queue.length,
        queueSize: contactQueue.queue.length
      };

    } catch (error) {
      console.error(`❌ MessageCoordinator: Erro ao enfileirar mensagem para ${contactId}:`, error);

      this.emit('enqueueError', {
        contactId,
        error: error.message,
        timestamp: Date.now()
      });

      throw error;
    }
  }

  /**
   * Get next message from contact queue (FIFO)
   * @param {string} contactId - Contact identifier
   * @returns {Object|null} Next message or null if queue empty
   */
  dequeueMessage(contactId) {
    try {
      const contactQueue = this.contactQueues.get(contactId);

      if (!contactQueue || contactQueue.queue.length === 0) {
        return null;
      }

      // Mark as processing
      contactQueue.processing = true;
      contactQueue.lastActivity = Date.now();

      // Get first message (FIFO)
      const queueItem = contactQueue.queue.shift();

      // Update statistics
      this.updateQueueStats();

      console.log(`📤 MessageCoordinator: Mensagem retirada da fila de ${contactId} (${contactQueue.queue.length} restantes)`);

      this.emit('messageDequeued', {
        contactId,
        messageId: queueItem.id,
        queueSize: contactQueue.queue.length,
        waitTime: Date.now() - queueItem.timestamp,
        timestamp: Date.now()
      });

      return {
        id: queueItem.id,
        message: queueItem.message,
        timestamp: queueItem.timestamp,
        attempts: queueItem.attempts,
        waitTime: Date.now() - queueItem.timestamp
      };

    } catch (error) {
      console.error(`❌ MessageCoordinator: Erro ao desenfileirar mensagem para ${contactId}:`, error);
      return null;
    }
  }

  /**
   * Mark contact queue as no longer processing
   * @param {string} contactId - Contact identifier
   */
  markProcessingComplete(contactId) {
    const contactQueue = this.contactQueues.get(contactId);

    if (contactQueue) {
      contactQueue.processing = false;
      contactQueue.lastActivity = Date.now();

      console.log(`✅ MessageCoordinator: Processamento marcado como completo para ${contactId}`);

      this.emit('processingComplete', {
        contactId,
        queueSize: contactQueue.queue.length,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Check if message is duplicate within the time window
   * @param {string} contactId - Contact identifier
   * @param {string} messageHash - Message hash
   * @returns {boolean} True if duplicate
   */
  isDuplicate(contactId, messageHash) {
    const contactDuplicates = this.duplicateDetection.get(contactId);

    if (!contactDuplicates) {
      return false;
    }

    const messageTime = contactDuplicates[messageHash];

    if (!messageTime) {
      return false;
    }

    const timeDiff = Date.now() - messageTime;
    return timeDiff <= this.duplicateWindow;
  }

  /**
   * Get comprehensive queue statistics
   * @returns {Object} Statistics object
   */
  getQueueStats() {
    const currentQueues = Array.from(this.contactQueues.entries());
    const totalQueuedMessages = currentQueues.reduce((sum, [_, queue]) => sum + queue.queue.length, 0);
    const activeBatches = this.batchingSystem.size;

    const queueSizes = currentQueues.map(([_, queue]) => queue.queue.length);
    const averageQueueSize = queueSizes.length > 0 ?
      (queueSizes.reduce((sum, size) => sum + size, 0) / queueSizes.length).toFixed(2) : 0;

    const longestQueue = queueSizes.length > 0 ? Math.max(...queueSizes) : 0;

    const uptime = Date.now() - this.stats.startTime;
    const messagesPerMinute = this.stats.totalMessages > 0 ?
      ((this.stats.totalMessages / uptime) * 60000).toFixed(2) : 0;

    return {
      overview: {
        totalMessages: this.stats.totalMessages,
        currentQueues: currentQueues.length,
        totalQueuedMessages,
        activeBatches,
        duplicatesDetected: this.stats.duplicatesDetected,
        duplicateRate: this.stats.totalMessages > 0 ?
          ((this.stats.duplicatesDetected / this.stats.totalMessages) * 100).toFixed(2) + '%' : '0%'
      },
      queues: {
        averageSize: parseFloat(averageQueueSize),
        longestQueue,
        queuesCreated: this.stats.queuesCreated,
        queuesDestroyed: this.stats.queuesDestroyed,
        activeQueues: currentQueues.map(([contactId, queue]) => ({
          contactId: contactId.substring(0, 8) + '...',
          queueSize: queue.queue.length,
          processing: queue.processing,
          lastActivity: new Date(queue.lastActivity).toISOString(),
          ageMinutes: ((Date.now() - queue.created) / 60000).toFixed(1)
        }))
      },
      performance: {
        messagesPerMinute: parseFloat(messagesPerMinute),
        uptime: Math.floor(uptime / 1000),
        memoryUsage: {
          queues: currentQueues.length,
          duplicateTracker: this.duplicateDetection.size,
          batchingSystem: this.batchingSystem.size
        }
      },
      batching: {
        activeBatches: activeBatches,
        batchesCreated: this.stats.batchesCreated,
        config: this.batchConfig
      },
      config: this.config,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Flush specific contact queue (emergency function)
   * @param {string} contactId - Contact identifier
   * @returns {Object} Flush result
   */
  flushQueue(contactId) {
    try {
      const contactQueue = this.contactQueues.get(contactId);

      if (!contactQueue) {
        return {
          status: 'not_found',
          contactId,
          message: 'Fila não encontrada'
        };
      }

      const flushedCount = contactQueue.queue.length;
      const wasProcessing = contactQueue.processing;

      // Clear the queue
      contactQueue.queue = [];
      contactQueue.processing = false;
      contactQueue.lastActivity = Date.now();

      // Update statistics
      this.updateQueueStats();

      console.log(`🗑️ MessageCoordinator: Fila de ${contactId} limpa (${flushedCount} mensagens removidas)`);

      this.emit('queueFlushed', {
        contactId,
        flushedCount,
        wasProcessing,
        timestamp: Date.now()
      });

      return {
        status: 'flushed',
        contactId,
        flushedCount,
        wasProcessing,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error(`❌ MessageCoordinator: Erro ao limpar fila de ${contactId}:`, error);

      return {
        status: 'error',
        contactId,
        error: error.message
      };
    }
  }

  /**
   * Emergency flush all queues
   * @returns {Object} Flush result
   */
  emergencyFlushAll() {
    try {
      let totalFlushed = 0;
      let queuesFlushed = 0;
      const flushResults = [];

      for (const [contactId, queue] of this.contactQueues.entries()) {
        const flushedCount = queue.queue.length;
        totalFlushed += flushedCount;
        queuesFlushed++;

        flushResults.push({
          contactId: contactId.substring(0, 8) + '...',
          flushedCount,
          wasProcessing: queue.processing
        });

        queue.queue = [];
        queue.processing = false;
        queue.lastActivity = Date.now();
      }

      // Clear batching system too
      this.batchingSystem.clear();

      this.updateQueueStats();

      console.log(`🚨 MessageCoordinator: FLUSH EMERGENCIAL - ${totalFlushed} mensagens removidas de ${queuesFlushed} filas`);

      this.emit('emergencyFlush', {
        totalFlushed,
        queuesFlushed,
        flushResults,
        timestamp: Date.now()
      });

      return {
        status: 'emergency_flushed',
        totalFlushed,
        queuesFlushed,
        details: flushResults,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ MessageCoordinator: Erro no flush emergencial:', error);

      return {
        status: 'error',
        error: error.message
      };
    }
  }

  /**
   * Get queue status for specific contact
   * @param {string} contactId - Contact identifier
   * @returns {Object|null} Queue status or null if not found
   */
  getContactQueueStatus(contactId) {
    const contactQueue = this.contactQueues.get(contactId);

    if (!contactQueue) {
      return null;
    }

    return {
      contactId: contactId.substring(0, 8) + '...',
      queueSize: contactQueue.queue.length,
      processing: contactQueue.processing,
      lastActivity: new Date(contactQueue.lastActivity).toISOString(),
      created: new Date(contactQueue.created).toISOString(),
      ageMinutes: ((Date.now() - contactQueue.created) / 60000).toFixed(1),
      inactiveMinutes: ((Date.now() - contactQueue.lastActivity) / 60000).toFixed(1)
    };
  }

  // === PRIVATE METHODS ===

  /**
   * Generate unique hash for message content
   * @param {Object} message - Message object
   * @returns {string} Message hash
   */
  generateMessageHash(message) {
    const content = JSON.stringify({
      text: message.text || message.content || '',
      type: message.type || message.messageType || '',
      // Ignore timestamp for duplicate detection
    });

    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Record message hash for duplicate detection
   * @param {string} contactId - Contact identifier
   * @param {string} messageHash - Message hash
   */
  recordMessage(contactId, messageHash) {
    let contactDuplicates = this.duplicateDetection.get(contactId);

    if (!contactDuplicates) {
      contactDuplicates = {};
      this.duplicateDetection.set(contactId, contactDuplicates);
    }

    contactDuplicates[messageHash] = Date.now();
  }

  /**
   * Check if contact requires message batching
   * @param {string} contactId - Contact identifier
   * @returns {boolean} True if batching required
   */
  checkBatchingRequired(contactId) {
    // Get recent message frequency
    const recentMessages = this.getRecentMessageCount(contactId);

    return recentMessages >= this.batchConfig.BATCH_THRESHOLD;
  }

  /**
   * Get recent message count for contact
   * @param {string} contactId - Contact identifier
   * @returns {number} Recent message count
   */
  getRecentMessageCount(contactId) {
    const contactDuplicates = this.duplicateDetection.get(contactId);

    if (!contactDuplicates) {
      return 0;
    }

    const oneMinuteAgo = Date.now() - 60000;

    return Object.values(contactDuplicates).filter(timestamp => timestamp > oneMinuteAgo).length;
  }

  /**
   * Handle batched message processing
   * @param {string} contactId - Contact identifier
   * @param {Object} message - Message object
   * @returns {Promise<Object>} Batch result
   */
  async handleBatchedMessage(contactId, message) {
    let batch = this.batchingSystem.get(contactId);

    if (!batch) {
      batch = {
        messages: [],
        timer: null,
        created: Date.now()
      };
      this.batchingSystem.set(contactId, batch);
    }

    batch.messages.push({
      message,
      timestamp: Date.now()
    });

    // Clear existing timer
    if (batch.timer) {
      clearTimeout(batch.timer);
    }

    // Set new timer or process if batch is full
    if (batch.messages.length >= this.batchConfig.BATCH_MAX_SIZE) {
      return await this.processBatch(contactId);
    } else {
      batch.timer = setTimeout(() => {
        this.processBatch(contactId);
      }, this.batchConfig.BATCH_TIMEOUT);

      return {
        status: 'batched',
        contactId,
        batchSize: batch.messages.length,
        maxBatchSize: this.batchConfig.BATCH_MAX_SIZE,
        timeout: this.batchConfig.BATCH_TIMEOUT
      };
    }
  }

  /**
   * Process accumulated batch for contact
   * @param {string} contactId - Contact identifier
   * @returns {Promise<Object>} Process result
   */
  async processBatch(contactId) {
    try {
      const batch = this.batchingSystem.get(contactId);

      if (!batch || batch.messages.length === 0) {
        return { status: 'no_batch', contactId };
      }

      // Clear timer
      if (batch.timer) {
        clearTimeout(batch.timer);
      }

      const batchSize = batch.messages.length;
      this.stats.batchesCreated++;

      // Remove batch from system
      this.batchingSystem.delete(contactId);

      // Create combined message for processing
      const combinedMessage = {
        type: 'batch',
        messages: batch.messages.map(item => item.message),
        batchSize,
        batchId: crypto.randomUUID(),
        timestamp: Date.now()
      };

      // Add to regular queue for processing
      const result = await this.enqueueMessage(contactId, combinedMessage);

      console.log(`📦 MessageCoordinator: Batch de ${batchSize} mensagens criado para ${contactId}`);

      this.emit('batchCreated', {
        contactId,
        batchSize,
        batchId: combinedMessage.batchId,
        timestamp: Date.now()
      });

      return {
        status: 'batch_processed',
        contactId,
        batchSize,
        batchId: combinedMessage.batchId,
        result
      };

    } catch (error) {
      console.error(`❌ MessageCoordinator: Erro ao processar batch para ${contactId}:`, error);

      return {
        status: 'batch_error',
        contactId,
        error: error.message
      };
    }
  }

  /**
   * Update queue statistics
   */
  updateQueueStats() {
    this.stats.currentQueues = this.contactQueues.size;

    const queueSizes = Array.from(this.contactQueues.values()).map(queue => queue.queue.length);

    if (queueSizes.length > 0) {
      this.stats.averageQueueSize = queueSizes.reduce((sum, size) => sum + size, 0) / queueSizes.length;
      this.stats.longestQueue = Math.max(...queueSizes);
    } else {
      this.stats.averageQueueSize = 0;
      this.stats.longestQueue = 0;
    }
  }

  /**
   * Start automatic cleanup of old queues
   */
  startAutoCleanup() {
    setInterval(() => {
      this.autoCleanup();
    }, this.config.QUEUE_CLEANUP_INTERVAL);

    console.log(`🧹 MessageCoordinator: Auto-cleanup agendado a cada ${this.config.QUEUE_CLEANUP_INTERVAL/60000} minutos`);
  }

  /**
   * Cleanup old and empty queues
   */
  autoCleanup() {
    try {
      const now = Date.now();
      let cleaned = 0;

      for (const [contactId, queue] of this.contactQueues.entries()) {
        const inactiveTime = now - queue.lastActivity;
        const isEmpty = queue.queue.length === 0;
        const isInactive = inactiveTime > this.config.INACTIVITY_THRESHOLD;
        const notProcessing = !queue.processing;

        if (isEmpty && isInactive && notProcessing) {
          this.contactQueues.delete(contactId);
          cleaned++;
          this.stats.queuesDestroyed++;
        }
      }

      if (cleaned > 0) {
        console.log(`🧹 MessageCoordinator: Auto-cleanup removeu ${cleaned} filas inativas`);

        this.emit('autoCleanup', {
          cleaned,
          remaining: this.contactQueues.size,
          timestamp: Date.now()
        });
      }

      // Emergency cleanup if too many queues
      if (this.contactQueues.size > this.config.EMERGENCY_FLUSH_THRESHOLD) {
        console.log(`🚨 MessageCoordinator: Limite de filas excedido (${this.contactQueues.size}), iniciando flush emergencial`);
        this.emergencyFlushAll();
      }

      this.updateQueueStats();

    } catch (error) {
      console.error('❌ MessageCoordinator: Erro no auto-cleanup:', error);
    }
  }

  /**
   * Start cleanup of duplicate detection data
   */
  startDuplicateCleanup() {
    setInterval(() => {
      this.cleanupDuplicateDetection();
    }, this.config.DUPLICATE_CLEANUP_INTERVAL);
  }

  /**
   * Cleanup old duplicate detection entries
   */
  cleanupDuplicateDetection() {
    try {
      const now = Date.now();
      let totalCleaned = 0;

      for (const [contactId, duplicates] of this.duplicateDetection.entries()) {
        let cleaned = 0;

        for (const [hash, timestamp] of Object.entries(duplicates)) {
          if (now - timestamp > this.duplicateWindow) {
            delete duplicates[hash];
            cleaned++;
          }
        }

        totalCleaned += cleaned;

        // Remove empty duplicate trackers
        if (Object.keys(duplicates).length === 0) {
          this.duplicateDetection.delete(contactId);
        }
      }

      if (totalCleaned > 0) {
        console.log(`🧹 MessageCoordinator: Limpeza de duplicatas removeu ${totalCleaned} entradas antigas`);
      }

    } catch (error) {
      console.error('❌ MessageCoordinator: Erro na limpeza de duplicatas:', error);
    }
  }

  /**
   * Get system health status
   * @returns {Object} Health status
   */
  getHealthStatus() {
    const stats = this.getQueueStats();

    const isHealthy = stats.overview.currentQueues < this.config.EMERGENCY_FLUSH_THRESHOLD &&
                     stats.performance.memoryUsage.queues < 100 &&
                     stats.queues.longestQueue < this.config.MAX_QUEUE_SIZE;

    return {
      healthy: isHealthy,
      status: isHealthy ? 'healthy' : 'degraded',
      checks: {
        queueCount: {
          value: stats.overview.currentQueues,
          limit: this.config.EMERGENCY_FLUSH_THRESHOLD,
          ok: stats.overview.currentQueues < this.config.EMERGENCY_FLUSH_THRESHOLD
        },
        longestQueue: {
          value: stats.queues.longestQueue,
          limit: this.config.MAX_QUEUE_SIZE,
          ok: stats.queues.longestQueue < this.config.MAX_QUEUE_SIZE
        },
        duplicateRate: {
          value: stats.overview.duplicateRate,
          threshold: '10%',
          ok: parseFloat(stats.overview.duplicateRate.replace('%', '')) < 10
        }
      },
      uptime: stats.performance.uptime,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Clear all coordinator data (reset)
   */
  clearAll() {
    const beforeStats = this.getQueueStats();

    this.contactQueues.clear();
    this.duplicateDetection.clear();
    this.batchingSystem.clear();

    // Reset stats except historical data
    const oldStats = { ...this.stats };
    this.stats = {
      totalMessages: oldStats.totalMessages,
      duplicatesDetected: oldStats.duplicatesDetected,
      queuesCreated: oldStats.queuesCreated,
      queuesDestroyed: oldStats.queuesDestroyed + beforeStats.overview.currentQueues,
      batchesCreated: oldStats.batchesCreated,
      currentQueues: 0,
      averageQueueSize: 0,
      longestQueue: 0,
      startTime: oldStats.startTime
    };

    console.log(`🗑️ MessageCoordinator: Sistema resetado - ${beforeStats.overview.currentQueues} filas removidas`);

    this.emit('systemReset', {
      clearedQueues: beforeStats.overview.currentQueues,
      clearedDuplicates: beforeStats.performance.memoryUsage.duplicateTracker,
      clearedBatches: beforeStats.batching.activeBatches,
      timestamp: Date.now()
    });

    return {
      success: true,
      cleared: {
        queues: beforeStats.overview.currentQueues,
        duplicates: beforeStats.performance.memoryUsage.duplicateTracker,
        batches: beforeStats.batching.activeBatches
      }
    };
  }
}

// Export singleton instance
const messageCoordinator = new MessageCoordinator();

export default messageCoordinator;
// utils/memoryCleanup.js
// Sistema de limpeza automática de memória para ORBION AI Agent

import { setMemory, getMemory, deleteMemory } from '../memory.js';
import errorHandler, { ERROR_SEVERITY } from './errorHandler.js';

class MemoryCleanup {
  constructor() {
    this.isRunning = false;
    this.cleanupInterval = null;
    this.setupPeriodicCleanup();
  }

  setupPeriodicCleanup() {
    // Executa limpeza a cada 2 horas (mais agressivo)
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, 2 * 60 * 60 * 1000);

    // Limpeza inicial após 1 minuto
    setTimeout(() => {
      this.performCleanup();
    }, 60 * 1000);

    // Verificação de emergência a cada 5 minutos
    this.emergencyCheckInterval = setInterval(() => {
      this.checkAndRunEmergencyCleanup();
    }, 5 * 60 * 1000);
  }

  async performCleanup() {
    if (this.isRunning) {
      errorHandler.log('Memory cleanup already in progress, skipping...');
      return;
    }

    this.isRunning = true;
    errorHandler.log('Starting memory cleanup...');

    try {
      const results = {
        conversationsDeleted: 0,
        tempDataDeleted: 0,
        oldEventsDeleted: 0,
        errorLogsDeleted: 0,
        totalSizeBefore: await this.getMemoryUsage(),
        startTime: Date.now()
      };

      // 1. Limpar conversas antigas (>30 dias sem atividade)
      results.conversationsDeleted = await this.cleanOldConversations();

      // 2. Limpar dados temporários
      results.tempDataDeleted = await this.cleanTemporaryData();

      // 3. Limpar eventos antigos
      results.oldEventsDeleted = await this.cleanOldEvents();

      // 4. Limpar logs de erro antigos
      results.errorLogsDeleted = await this.cleanOldErrorLogs();

      // 5. Compactar banco de dados
      await this.compactDatabase();

      results.totalSizeAfter = await this.getMemoryUsage();
      results.duration = Date.now() - results.startTime;
      results.spaceSaved = results.totalSizeBefore - results.totalSizeAfter;

      errorHandler.log('Memory cleanup completed', 'INFO', results);

      // Salva estatísticas da limpeza
      await setMemory('last_cleanup_stats', {
        timestamp: new Date().toISOString(),
        results
      });

    } catch (error) {
      errorHandler.handleError(error, {
        severity: ERROR_SEVERITY.MEDIUM,
        context: 'memory_cleanup',
        metadata: { operation: 'performCleanup' }
      });
    } finally {
      this.isRunning = false;
    }
  }

  async cleanOldConversations() {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30); // 30 dias atrás

      let deletedCount = 0;

      // Busca todas as conversas para verificar última atividade
      const conversations = await this.getAllConversationIds();

      for (const contactId of conversations) {
        try {
          const lastActivity = await getMemory(`last_activity_${contactId}`);

          if (!lastActivity || new Date(lastActivity.timestamp) < cutoffDate) {
            // Remove dados da conversa
            await this.deleteConversationData(contactId);
            deletedCount++;
          }
        } catch (error) {
          errorHandler.handleError(error, {
            severity: ERROR_SEVERITY.LOW,
            context: 'clean_conversation',
            contactId,
            metadata: { operation: 'cleanOldConversations' }
          });
        }
      }

      return deletedCount;
    } catch (error) {
      errorHandler.handleError(error, {
        severity: ERROR_SEVERITY.MEDIUM,
        context: 'memory_cleanup',
        metadata: { operation: 'cleanOldConversations' }
      });
      return 0;
    }
  }

  async cleanTemporaryData() {
    try {
      let deletedCount = 0;
      const tempPrefixes = [
        'temp_',
        'cache_',
        'processing_',
        'upload_',
        'download_'
      ];

      for (const prefix of tempPrefixes) {
        const tempKeys = await this.getKeysWithPrefix(prefix);

        for (const key of tempKeys) {
          try {
            const data = await getMemory(key);

            // Remove dados temporários com mais de 1 hora
            if (data && data.timestamp) {
              const age = Date.now() - new Date(data.timestamp).getTime();
              if (age > 60 * 60 * 1000) { // 1 hora
                await deleteMemory(key);
                deletedCount++;
              }
            } else {
              // Remove dados temporários sem timestamp
              await deleteMemory(key);
              deletedCount++;
            }
          } catch (error) {
            // Continue mesmo se houver erro em uma chave específica
            continue;
          }
        }
      }

      return deletedCount;
    } catch (error) {
      errorHandler.handleError(error, {
        severity: ERROR_SEVERITY.MEDIUM,
        context: 'memory_cleanup',
        metadata: { operation: 'cleanTemporaryData' }
      });
      return 0;
    }
  }

  async cleanOldEvents() {
    try {
      let deletedCount = 0;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90); // 90 dias atrás

      const eventKeys = await this.getKeysWithPrefix('event_');

      for (const key of eventKeys) {
        try {
          const event = await getMemory(key);

          if (event && event.date && new Date(event.date) < cutoffDate) {
            await deleteMemory(key);
            deletedCount++;
          }
        } catch (error) {
          continue;
        }
      }

      return deletedCount;
    } catch (error) {
      errorHandler.handleError(error, {
        severity: ERROR_SEVERITY.MEDIUM,
        context: 'memory_cleanup',
        metadata: { operation: 'cleanOldEvents' }
      });
      return 0;
    }
  }

  async cleanOldErrorLogs() {
    try {
      let deletedCount = 0;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 7); // 7 dias atrás

      const logKeys = await this.getKeysWithPrefix('error_log_');

      for (const key of logKeys) {
        try {
          const log = await getMemory(key);

          if (log && log.timestamp && new Date(log.timestamp) < cutoffDate) {
            await deleteMemory(key);
            deletedCount++;
          }
        } catch (error) {
          continue;
        }
      }

      return deletedCount;
    } catch (error) {
      errorHandler.handleError(error, {
        severity: ERROR_SEVERITY.MEDIUM,
        context: 'memory_cleanup',
        metadata: { operation: 'cleanOldErrorLogs' }
      });
      return 0;
    }
  }

  async deleteConversationData(contactId) {
    const keysToDelete = [
      `conversation_${contactId}`,
      `profile_${contactId}`,
      `state_${contactId}`,
      `last_activity_${contactId}`,
      `qualification_${contactId}`,
      `discovery_${contactId}`,
      `objections_${contactId}`,
      `scheduling_${contactId}`,
      `follow_up_${contactId}`,
      `archetype_${contactId}`,
      `behavior_${contactId}`,
      `preferences_${contactId}`,
      `interaction_history_${contactId}`,
      `sales_notes_${contactId}`,
      `lead_score_${contactId}`
    ];

    for (const key of keysToDelete) {
      try {
        await deleteMemory(key);
      } catch (error) {
        // Continue mesmo se uma chave não existir
        continue;
      }
    }
  }

  async getAllConversationIds() {
    try {
      const conversationKeys = await this.getKeysWithPrefix('conversation_');
      return conversationKeys.map(key => key.replace('conversation_', ''));
    } catch (error) {
      return [];
    }
  }

  async getKeysWithPrefix(prefix) {
    try {
      // Simulação - na implementação real, consultaria diretamente o banco
      // Por enquanto, retorna array vazio para evitar erros
      return [];
    } catch (error) {
      return [];
    }
  }

  async compactDatabase() {
    try {
      // Para SQLite, executa VACUUM para compactar
      const { db } = await import('../memory.js');

      if (db && typeof db.exec === 'function') {
        db.exec('VACUUM');
        errorHandler.log('Database compacted successfully');
      }
    } catch (error) {
      errorHandler.handleError(error, {
        severity: ERROR_SEVERITY.LOW,
        context: 'memory_cleanup',
        metadata: { operation: 'compactDatabase' }
      });
    }
  }

  async getMemoryUsage() {
    try {
      const { getDbSize } = await import('../memory.js');

      if (typeof getDbSize === 'function') {
        return await getDbSize();
      }

      // Fallback: usar process.memoryUsage()
      const usage = process.memoryUsage();
      return usage.heapUsed;
    } catch (error) {
      return 0;
    }
  }

  // Limpeza manual de emergência
  async emergencyCleanup() {
    errorHandler.log('Starting EMERGENCY memory cleanup...');

    try {
      // Remove apenas dados muito antigos (>7 dias)
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 7);

      const conversations = await this.getAllConversationIds();
      let cleaned = 0;

      for (const contactId of conversations.slice(0, 100)) { // Limita a 100 para emergência
        try {
          const lastActivity = await getMemory(`last_activity_${contactId}`);

          if (!lastActivity || new Date(lastActivity.timestamp) < cutoffDate) {
            await this.deleteConversationData(contactId);
            cleaned++;
          }
        } catch (error) {
          continue;
        }
      }

      // Força garbage collection se disponível
      if (global.gc) {
        global.gc();
      }

      errorHandler.log(`Emergency cleanup completed: ${cleaned} conversations removed`);
      return cleaned;

    } catch (error) {
      errorHandler.handleError(error, {
        severity: ERROR_SEVERITY.HIGH,
        context: 'emergency_cleanup'
      });
      return 0;
    }
  }

  // Verifica se limpeza é necessária
  async checkCleanupNeeded() {
    try {
      const memoryUsage = process.memoryUsage();
      const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;

      // Se heap usado > 500MB, recomenda limpeza
      if (heapUsedMB > 500) {
        errorHandler.log(`High memory usage detected: ${heapUsedMB.toFixed(2)}MB`, 'WARN');
        return {
          cleanupNeeded: true,
          reason: 'high_memory_usage',
          heapUsedMB: heapUsedMB.toFixed(2)
        };
      }

      // Verifica última limpeza
      const lastCleanup = await getMemory('last_cleanup_stats');
      if (!lastCleanup) {
        return {
          cleanupNeeded: true,
          reason: 'no_previous_cleanup'
        };
      }

      const lastCleanupDate = new Date(lastCleanup.timestamp);
      const hoursSinceCleanup = (Date.now() - lastCleanupDate.getTime()) / (1000 * 60 * 60);

      if (hoursSinceCleanup > 24) {
        return {
          cleanupNeeded: true,
          reason: 'overdue_cleanup',
          hoursSinceCleanup: hoursSinceCleanup.toFixed(1)
        };
      }

      return { cleanupNeeded: false };

    } catch (error) {
      errorHandler.handleError(error, {
        severity: ERROR_SEVERITY.LOW,
        context: 'check_cleanup_needed'
      });
      return { cleanupNeeded: false };
    }
  }

  // Verificação e limpeza de emergência automática
  async checkAndRunEmergencyCleanup() {
    try {
      const memoryUsage = process.memoryUsage();
      const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;

      // Se memória > 400MB, executar limpeza de emergência
      if (heapUsedMB > 400) {
        console.log(`🚨 MEMÓRIA CRÍTICA: ${Math.round(heapUsedMB)}MB - Executando limpeza de emergência`);
        await this.emergencyCleanup();

        // Forçar garbage collection se disponível
        if (global.gc) {
          global.gc();
          console.log('🧹 Garbage collection forçado');
        }
      }
    } catch (error) {
      errorHandler.handleError(error, {
        severity: ERROR_SEVERITY.MEDIUM,
        context: 'emergency_check'
      });
    }
  }

  // Para quando o processo for finalizado
  shutdown() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    if (this.emergencyCheckInterval) {
      clearInterval(this.emergencyCheckInterval);
      this.emergencyCheckInterval = null;
    }
  }
}

// Singleton instance
const memoryCleanup = new MemoryCleanup();

// Graceful shutdown
process.on('SIGTERM', () => memoryCleanup.shutdown());
process.on('SIGINT', () => memoryCleanup.shutdown());

export default memoryCleanup;
// handlers/persistence_manager.js
// Gerenciador de persistência para evitar salvamentos duplicados

import crypto from 'crypto';
import globalErrorHandler from '../utils/error_handler.js'; //  FIX GRAVE #6
import log from '../utils/logger-wrapper.js';

export class PersistenceManager {
  constructor() {
    this.pendingSaves = new Map();
    this.saveQueue = [];
    this.processing = false;
    this.totalSaved = 0;
    this.duplicatesBlocked = 0;
    this.errors = 0;
    this.BATCH_SIZE = 10;
    this.BATCH_TIMEOUT = 2000; // 2 segundos
  }

  async saveConversation(from, userMessage, botResponse, metadata = {}) {
    try {
      // Criar ID único para esta conversa
      const conversationId = this.generateConversationId(from, userMessage, botResponse);

      // Verificar se já está sendo salva
      if (this.pendingSaves.has(conversationId)) {
        this.duplicatesBlocked++;
        log.warn('Salvamento duplicado bloqueado', { conversationId });
        return {
          saved: false,
          reason: 'duplicate_blocked',
          conversationId
        };
      }

      // Marcar como pendente
      this.pendingSaves.set(conversationId, Date.now());

      // Criar bundle de salvamento
      const saveBundle = {
        id: conversationId,
        from: this.cleanPhoneNumber(from),
        userMessage: this.sanitizeText(userMessage),
        botResponse: this.sanitizeText(botResponse),
        metadata: {
          ...metadata,
          timestamp: Date.now(),
          savedAt: new Date().toISOString(),
          version: '2.0'
        }
      };

      // Adicionar à fila
      this.saveQueue.push(saveBundle);

      //  FIX GRAVE #6: Processar fila com error handling para promises
      if (!this.processing) {
        setImmediate(() => {
          this.processSaveQueue().catch(error => {
            log.error('Erro não capturado em processSaveQueue', error, { queueSize: this.saveQueue.length });
            globalErrorHandler.logError('PERSISTENCE_QUEUE_ERROR', error, {
              queueSize: this.saveQueue.length
            });
          });
        });
      }

      // Limpar pendente após timeout
      setTimeout(() => {
        this.pendingSaves.delete(conversationId);
      }, this.BATCH_TIMEOUT * 2);

      return {
        saved: true,
        conversationId,
        queued: true
      };

    } catch (error) {
      this.errors++;
      log.error('Erro ao preparar salvamento', error);
      return {
        saved: false,
        error: error.message
      };
    }
  }

  generateConversationId(from, userMessage, botResponse) {
    // Criar hash baseado em conteúdo + timestamp arredondado (para agrupar saves próximos)
    const timeWindow = Math.floor(Date.now() / 5000) * 5000; // Janela de 5 segundos
    //  NULL-SAFE: Garantir que userMessage e botResponse são strings antes de substring
    const safeUserMsg = (userMessage || '').toString().substring(0, 100);
    const safeBotResp = (botResponse || '').toString().substring(0, 100);
    const content = `${from}_${safeUserMsg}_${safeBotResp}_${timeWindow}`;
    return crypto.createHash('md5').update(content).digest('hex').slice(0, 16);
  }

  cleanPhoneNumber(phone) {
    if (!phone) return '';
    return phone.toString().replace(/[^\d]/g, '');
  }

  sanitizeText(text) {
    if (!text || typeof text !== 'string') return '';

    return text
      .trim()
      .substring(0, 2000) // Limitar tamanho
      .replace(/[\x00-\x1F\x7F]/g, '') // Remover caracteres de controle
      .replace(/'/g, "''"); // Escapar aspas simples para SQL
  }

  async processSaveQueue() {
    if (this.processing || this.saveQueue.length === 0) return;

    this.processing = true;
    log.info('Processando fila de salvamento', { queueSize: this.saveQueue.length });

    try {
      // Processar em lotes
      while (this.saveQueue.length > 0) {
        const batch = this.saveQueue.splice(0, this.BATCH_SIZE);
        await this.saveBatch(batch);

        // Pequeno delay entre lotes para não sobrecarregar
        if (this.saveQueue.length > 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

    } catch (error) {
      log.error('Erro no processamento da fila', error);
    } finally {
      this.processing = false;
    }
  }

  async saveBatch(batch) {
    if (!batch || batch.length === 0) return;

    log.info('Salvando lote', { batchSize: batch.length });

    // Tentar importar funções de memória
    try {
      const { saveMessage, setMemory } = await import('../memory.js');

      // Processar cada item do lote
      const savePromises = batch.map(async (bundle) => {
        try {
          // Salvar mensagens em paralelo
          await Promise.all([
            this.saveUserMessage(saveMessage, bundle),
            this.saveBotMessage(saveMessage, bundle),
            this.saveMetadata(setMemory, bundle)
          ]);

          this.totalSaved++;
          return { success: true, id: bundle.id };

        } catch (error) {
          this.errors++;
          log.error('Erro ao salvar conversa', error, { bundleId: bundle.id });

          //  FIX: Limite de retry para evitar loop infinito
          bundle.retryCount = (bundle.retryCount || 0) + 1;
          if (bundle.retryCount <= 3) {
            this.saveQueue.push(bundle);
            log.warn('Retry agendado', { bundleId: bundle.id, attempt: bundle.retryCount });
          } else {
            log.error('Bundle descartado após max retries', { bundleId: bundle.id, retries: bundle.retryCount });
          }

          return { success: false, id: bundle.id, error: error.message };
        }
      });

      const results = await Promise.all(savePromises);
      const successes = results.filter(r => r.success).length;
      const failures = results.filter(r => !r.success).length;

      log.info('Lote processado', { successes, failures, batchSize: batch.length });

    } catch (importError) {
      log.error('Erro ao importar funções de memória', importError);
      // Recolocar todo o lote na fila
      this.saveQueue.unshift(...batch);
    }
  }

  async saveUserMessage(saveMessage, bundle) {
    return saveMessage(
      bundle.from,
      bundle.userMessage,
      false, // isFromBot
      'text'
    );
  }

  async saveBotMessage(saveMessage, bundle) {
    return saveMessage(
      bundle.from,
      bundle.botResponse,
      true, // isFromBot
      'text'
    );
  }

  async saveMetadata(setMemory, bundle) {
    const metadataKey = `conversation_metadata_${bundle.from}_${Date.now()}`;

    const metadata = {
      conversationId: bundle.id,
      from: bundle.from,
      messageCount: 2, // User + bot
      timestamp: bundle.metadata.timestamp,
      savedAt: bundle.metadata.savedAt,
      version: bundle.metadata.version,
      ...bundle.metadata
    };

    return setMemory(metadataKey, metadata);
  }

  // Salvamento individual com retry automático
  async saveIndividual(from, message, isFromBot, messageType = 'text', retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const { saveMessage } = await import('../memory.js');

        await saveMessage(
          this.cleanPhoneNumber(from),
          this.sanitizeText(message),
          isFromBot,
          messageType
        );

        log.success('Mensagem salva individualmente', { attempt, from });
        return { saved: true, attempt };

      } catch (error) {
        log.warn('Tentativa de salvamento falhou', { attempt, error: error.message, from });

        if (attempt === retries) {
          throw error;
        }

        // Backoff exponencial
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // Salvamento em lote de múltiplas conversas
  async saveBulk(conversations) {
    if (!Array.isArray(conversations) || conversations.length === 0) {
      return { saved: 0, failed: 0 };
    }

    log.start('Iniciando salvamento em lote', { total: conversations.length });

    let saved = 0;
    let failed = 0;

    // Processar em chunks menores
    const chunkSize = 5;
    for (let i = 0; i < conversations.length; i += chunkSize) {
      const chunk = conversations.slice(i, i + chunkSize);

      const promises = chunk.map(async (conv) => {
        try {
          const result = await this.saveConversation(
            conv.from,
            conv.userMessage,
            conv.botResponse,
            conv.metadata
          );

          return result.saved ? 'saved' : 'failed';
        } catch (error) {
          return 'failed';
        }
      });

      const results = await Promise.all(promises);
      saved += results.filter(r => r === 'saved').length;
      failed += results.filter(r => r === 'failed').length;

      // Pequena pausa entre chunks
      if (i + chunkSize < conversations.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    log.success('Salvamento em lote concluído', { saved, failed, total: conversations.length });
    return { saved, failed };
  }

  // Limpeza de dados antigos
  async cleanup(daysOld = 90) {
    try {
      log.start('Iniciando limpeza de dados', { daysOld });

      //  FIX: Usar getDatabase() que verifica e reconecta se necessário
      const { getDatabase } = await import('../db/index.js');
      const db = getDatabase();

      if (db && typeof db.prepare === 'function') {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);

        //  FIX: Usar API correta do better-sqlite3 (prepare().run()) e coluna correta (created_at)
        const stmt = db.prepare(`DELETE FROM whatsapp_messages WHERE created_at < datetime(?, 'unixepoch')`);
        const result = stmt.run(Math.floor(cutoffDate.getTime() / 1000));

        log.success('Limpeza concluída', { recordsRemoved: result.changes, daysOld });
        return result.changes;
      }

      return 0;

    } catch (error) {
      log.error('Erro na limpeza', error, { daysOld });
      return 0;
    }
  }

  // Estatísticas
  getStats() {
    return {
      totalSaved: this.totalSaved,
      duplicatesBlocked: this.duplicatesBlocked,
      errors: this.errors,
      queueSize: this.saveQueue.length,
      pendingSaves: this.pendingSaves.size,
      isProcessing: this.processing,
      efficiency: this.totalSaved > 0
        ? ((this.totalSaved / (this.totalSaved + this.duplicatesBlocked + this.errors)) * 100).toFixed(2) + '%'
        : '100%'
    };
  }

  // Verificação de saúde do sistema
  async healthCheck() {
    try {
      //  FIX: Usar getDatabase() que verifica e reconecta se necessário
      const { getDatabase } = await import('../db/index.js');
      const db = getDatabase();

      // Teste simples de conectividade com DB
      if (db && typeof db.prepare === 'function') {
        //  FIX: Usar API correta do better-sqlite3 (prepare().get())
        const stmt = db.prepare('SELECT COUNT(*) as count FROM whatsapp_messages');
        const result = stmt.get();

        return {
          healthy: true,
          dbConnected: true,
          messageCount: result?.count || 0,
          ...this.getStats()
        };
      }

      return {
        healthy: false,
        dbConnected: false,
        error: 'Database não disponível'
      };

    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        ...this.getStats()
      };
    }
  }

  // Limpeza manual
  clearQueue() {
    const cleared = this.saveQueue.length + this.pendingSaves.size;
    this.saveQueue = [];
    this.pendingSaves.clear();

    log.info('Fila limpa', { itemsRemoved: cleared });
    return cleared;
  }

  // Forçar processamento da fila
  async forceProcess() {
    if (!this.processing && this.saveQueue.length > 0) {
      log.info('Forçando processamento da fila', { queueSize: this.saveQueue.length });
      await this.processSaveQueue();
    }
  }
}

// Instância singleton
const persistenceManager = new PersistenceManager();

export default persistenceManager;
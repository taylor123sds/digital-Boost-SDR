// handlers/persistence_manager.js
// Gerenciador de persistência para evitar salvamentos duplicados

import crypto from 'crypto';

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
        console.log(`🚫 Salvamento duplicado bloqueado: ${conversationId}`);
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

      // Processar fila se necessário
      if (!this.processing) {
        setImmediate(() => this.processSaveQueue());
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
      console.error('❌ PersistenceManager: Erro ao preparar salvamento:', error);
      return {
        saved: false,
        error: error.message
      };
    }
  }

  generateConversationId(from, userMessage, botResponse) {
    // Criar hash baseado em conteúdo + timestamp arredondado (para agrupar saves próximos)
    const timeWindow = Math.floor(Date.now() / 5000) * 5000; // Janela de 5 segundos
    const content = `${from}_${userMessage.substring(0, 100)}_${botResponse.substring(0, 100)}_${timeWindow}`;
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
    console.log(`💾 Processando fila de salvamento: ${this.saveQueue.length} itens`);

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
      console.error('❌ Erro no processamento da fila:', error);
    } finally {
      this.processing = false;
    }
  }

  async saveBatch(batch) {
    if (!batch || batch.length === 0) return;

    console.log(`💾 Salvando lote de ${batch.length} conversas`);

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
          console.error(`❌ Erro ao salvar conversa ${bundle.id}:`, error);

          // Recolocar na fila para retry
          this.saveQueue.push(bundle);

          return { success: false, id: bundle.id, error: error.message };
        }
      });

      const results = await Promise.all(savePromises);
      const successes = results.filter(r => r.success).length;
      const failures = results.filter(r => !r.success).length;

      console.log(`💾 Lote processado: ${successes} sucessos, ${failures} falhas`);

    } catch (importError) {
      console.error('❌ Erro ao importar funções de memória:', importError);
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

        console.log(`💾 Mensagem salva individualmente (tentativa ${attempt})`);
        return { saved: true, attempt };

      } catch (error) {
        console.error(`❌ Tentativa ${attempt} falhou:`, error);

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

    console.log(`💾 Iniciando salvamento em lote de ${conversations.length} conversas`);

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

    console.log(`💾 Salvamento em lote concluído: ${saved} salvas, ${failed} falharam`);
    return { saved, failed };
  }

  // Limpeza de dados antigos
  async cleanup(daysOld = 90) {
    try {
      console.log(`🧹 Iniciando limpeza de dados com mais de ${daysOld} dias`);

      const { db } = await import('../memory.js');

      if (db && typeof db.run === 'function') {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);

        const result = db.run(
          `DELETE FROM whatsapp_messages WHERE timestamp < ?`,
          [cutoffDate.getTime()]
        );

        console.log(`🧹 Limpeza concluída: ${result.changes} registros removidos`);
        return result.changes;
      }

      return 0;

    } catch (error) {
      console.error('❌ Erro na limpeza:', error);
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
      const { db } = await import('../memory.js');

      // Teste simples de conectividade com DB
      if (db && typeof db.get === 'function') {
        const result = db.get('SELECT COUNT(*) as count FROM whatsapp_messages LIMIT 1');

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

    console.log(`🧹 PersistenceManager: Fila limpa (${cleared} itens removidos)`);
    return cleared;
  }

  // Forçar processamento da fila
  async forceProcess() {
    if (!this.processing && this.saveQueue.length > 0) {
      console.log('🔄 Forçando processamento da fila de salvamento');
      await this.processSaveQueue();
    }
  }
}

// Instância singleton
const persistenceManager = new PersistenceManager();

export default persistenceManager;
/**
 * @file message-queue.js
 * @description Sistema de fila para processamento sequencial de mensagens
 * Extraído de server.js para melhor modularidade
 */

/**
 * Classe para gerenciar fila de processamento de mensagens
 * Garante processamento sequencial e evita race conditions
 */
export class MessageQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.processedCount = 0;
  }

  /**
   * Adiciona mensagem à fila para processamento
   * @param {Object} message - Mensagem a ser processada
   * @param {Function} processorFn - Função de processamento
   */
  async enqueue(message, processorFn) {
    this.queue.push({ message, processorFn, timestamp: Date.now() });
    console.log(` [MESSAGE-QUEUE] Mensagem enfileirada (${this.queue.length} na fila)`);

    // Iniciar processamento se não estiver processando
    if (!this.processing) {
      await this.processQueue();
    }
  }

  /**
   * Processa fila de mensagens sequencialmente
   */
  async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const { message, processorFn, timestamp } = this.queue.shift();
      const queueTime = Date.now() - timestamp;

      console.log(` [MESSAGE-QUEUE] Processando mensagem (tempo na fila: ${queueTime}ms, restantes: ${this.queue.length})`);

      try {
        await processorFn(message);
        this.processedCount++;
      } catch (error) {
        console.error(` [MESSAGE-QUEUE] Erro ao processar mensagem:`, error);
      }
    }

    this.processing = false;
    console.log(` [MESSAGE-QUEUE] Fila vazia (${this.processedCount} processadas no total)`);
  }

  /**
   * Retorna estatísticas da fila
   * @returns {Object} Estatísticas
   */
  getStats() {
    return {
      queueSize: this.queue.length,
      processing: this.processing,
      totalProcessed: this.processedCount
    };
  }
}

//  SINGLETON PATTERN - Fix para bug crítico
// Garante que apenas UMA instância da fila existe
let queueInstance = null;

/**
 * Get or create singleton instance of MessageQueue
 * @returns {MessageQueue} Singleton instance
 */
export function getMessageQueue() {
  if (!queueInstance) {
    queueInstance = new MessageQueue();
    console.log(' [MESSAGE-QUEUE] Singleton instance created');
  }
  return queueInstance;
}

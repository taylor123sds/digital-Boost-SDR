// message_timing_store.js
//  Armazenamento centralizado de timestamps de mensagens
// Solução para evitar import circular entre webhook_handler e bot_detector

import humanVerificationStore from './human_verification_store.js';
import { normalizePhone } from './phone_normalizer.js';

/**
 * Store singleton para timestamps de mensagens enviadas pelo bot
 * Permite que webhook_handler e bot_detector compartilhem dados sem imports circulares
 */
class MessageTimingStore {
  constructor() {
    // Map: contactId => timestamp de última mensagem ENVIADA pelo bot
    this.outgoingTimestamps = new Map();

    // Limpeza automática de timestamps antigos (1 minuto)
    this.EXPIRY_TIME = 60000; // 1 minuto
    this.startAutoCleanup();
  }

  /**
   * Registra quando uma mensagem foi ENVIADA para um contato
   * @param {string} contactId - ID do contato
   */
  recordOutgoingMessage(contactId) {
    const normalized = normalizePhone(contactId);
    const timestamp = Date.now();
    this.outgoingTimestamps.set(normalized, timestamp);
    console.log(` [TIMING-STORE] Registrado envio para ${normalized} às ${new Date(timestamp).toLocaleTimeString()} (original: ${contactId})`);
  }

  /**
   * Calcula tempo de resposta desde última mensagem enviada
   * @param {string} contactId - ID do contato
   * @returns {number|null} - Tempo em ms ou null se não há registro
   */
  calculateResponseTime(contactId) {
    const normalized = normalizePhone(contactId);
    const lastSentTime = this.outgoingTimestamps.get(normalized);

    if (!lastSentTime) {
      console.log(` [TIMING-STORE]  Nenhum timestamp encontrado para ${normalized} (original: ${contactId})`);
      return null; // Nenhuma mensagem enviada ainda
    }

    const responseTime = Date.now() - lastSentTime;

    //  NÃO LIMPAR timestamp se está aguardando verificação humana
    // Isso permite múltiplas verificações de tempo durante o processo de verificação
    const isWaitingVerification = humanVerificationStore.isWaitingVerification(normalized);

    if (!isWaitingVerification) {
      // Limpar timestamp após calcular (evitar reutilização)
      this.outgoingTimestamps.delete(normalized);
      console.log(` [TIMING-STORE] ${normalized} respondeu em ${responseTime}ms (timestamp limpo)`);
    } else {
      console.log(` [TIMING-STORE] ${normalized} respondeu em ${responseTime}ms (timestamp PRESERVADO - verificação ativa)`);
    }

    return responseTime;
  }

  /**
   * Verifica se há timestamp registrado para um contato
   * @param {string} contactId
   * @returns {boolean}
   */
  hasTimestamp(contactId) {
    const normalized = normalizePhone(contactId);
    return this.outgoingTimestamps.has(normalized);
  }

  /**
   * Limpa timestamp de um contato específico
   * @param {string} contactId
   */
  clearTimestamp(contactId) {
    const normalized = normalizePhone(contactId);
    this.outgoingTimestamps.delete(normalized);
  }

  /**
   * Limpa todos os timestamps
   */
  clearAll() {
    this.outgoingTimestamps.clear();
    console.log(` [TIMING-STORE] Todos timestamps limpos`);
  }

  /**
   * Auto-cleanup de timestamps antigos
   */
  startAutoCleanup() {
    setInterval(() => {
      const now = Date.now();
      let cleaned = 0;

      for (const [contactId, timestamp] of this.outgoingTimestamps.entries()) {
        if (now - timestamp > this.EXPIRY_TIME) {
          this.outgoingTimestamps.delete(contactId);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        console.log(` [TIMING-STORE] Auto-cleanup removeu ${cleaned} timestamps antigos`);
      }
    }, this.EXPIRY_TIME); // Rodar a cada 1 minuto
  }

  /**
   * Estatísticas do store
   */
  getStats() {
    return {
      totalTracked: this.outgoingTimestamps.size,
      oldestTimestamp: this.outgoingTimestamps.size > 0
        ? Math.min(...this.outgoingTimestamps.values())
        : null
    };
  }
}

// Exportar instância singleton
const messageTimingStore = new MessageTimingStore();

export default messageTimingStore;

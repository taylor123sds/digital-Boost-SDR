/**
 *  CACHE DE PRIMEIRA MENSAGEM
 * Previne envio duplicado de primeira mensagem em caso de resposta rápida do lead
 *
 * Problema resolvido:
 * - Lead responde antes do persistence_manager salvar histórico no banco
 * - Agent detecta histórico vazio e tenta enviar outra primeira mensagem
 * - Cache marca contactId por 10s após enviar primeira mensagem
 */

export class FirstMessageCache {
  constructor() {
    this.sentMessages = new Map(); // contactId  timestamp
    this.TTL = 10000; // 10 segundos (tempo suficiente para salvar no banco)
  }

  /**
   * Marca que primeira mensagem foi enviada para este contato
   * @param {string} contactId
   */
  markSent(contactId) {
    const now = Date.now();
    this.sentMessages.set(contactId, now);

    console.log(` [FIRST-MSG-CACHE] ${contactId} marcado como enviado (TTL: ${this.TTL}ms)`);

    // Auto-limpeza após TTL
    setTimeout(() => {
      if (this.sentMessages.get(contactId) === now) {
        this.sentMessages.delete(contactId);
        console.log(` [FIRST-MSG-CACHE] ${contactId} removido do cache`);
      }
    }, this.TTL);
  }

  /**
   * Verifica se primeira mensagem já foi enviada (nos últimos 10s)
   * @param {string} contactId
   * @returns {boolean}
   */
  wasSent(contactId) {
    const exists = this.sentMessages.has(contactId);

    if (exists) {
      const sentAt = this.sentMessages.get(contactId);
      const elapsed = Date.now() - sentAt;
      console.log(` [FIRST-MSG-CACHE] ${contactId} já enviado há ${elapsed}ms`);
    }

    return exists;
  }

  /**
   * Limpa cache manualmente (útil para testes)
   * @param {string} contactId - Opcional, se não fornecido limpa tudo
   */
  clear(contactId = null) {
    if (contactId) {
      this.sentMessages.delete(contactId);
      console.log(` [FIRST-MSG-CACHE] ${contactId} removido manualmente`);
    } else {
      this.sentMessages.clear();
      console.log(` [FIRST-MSG-CACHE] Cache limpo completamente`);
    }
  }

  /**
   * Retorna estatísticas do cache (debug)
   * @returns {Object}
   */
  getStats() {
    return {
      totalCached: this.sentMessages.size,
      contacts: Array.from(this.sentMessages.keys()),
      ttl: this.TTL
    };
  }
}

// Singleton - única instância compartilhada
export const firstMessageCache = new FirstMessageCache();

export default firstMessageCache;

/**
 *  BLACKLIST DE CONTATOS EM LOOP INFINITO
 * Lista temporária de contatos bloqueados por loop detectado
 */

export class Blacklist {
  constructor() {
    this.blocked = new Map(); // contactId  { blockedAt, reason, messageCount }
    this.TTL = 3600000; // 1 hora
  }

  /**
   * Bloqueia um contato temporariamente
   * @param {string} contactId
   * @param {string} reason
   * @param {number} messageCount
   */
  block(contactId, reason, messageCount) {
    this.blocked.set(contactId, {
      blockedAt: Date.now(),
      reason,
      messageCount
    });

    console.log(` [BLACKLIST] ${contactId} BLOQUEADO - ${reason} (${messageCount} msgs)`);

    // Auto-remoção após TTL
    setTimeout(() => {
      this.blocked.delete(contactId);
      console.log(` [BLACKLIST] ${contactId} removido da blacklist após 1h`);
    }, this.TTL);
  }

  /**
   * Verifica se contato está bloqueado
   * @param {string} contactId
   * @returns {boolean}
   */
  isBlocked(contactId) {
    return this.blocked.has(contactId);
  }

  /**
   * Retorna informações do bloqueio
   * @param {string} contactId
   * @returns {Object|undefined}
   */
  getBlockedInfo(contactId) {
    return this.blocked.get(contactId);
  }

  /**
   * Desbloqueia manualmente
   * @param {string} contactId
   * @returns {boolean} True se estava bloqueado
   */
  unblock(contactId) {
    const wasBlocked = this.blocked.has(contactId);
    this.blocked.delete(contactId);
    if (wasBlocked) {
      console.log(` [BLACKLIST] ${contactId} desbloqueado manualmente`);
    }
    return wasBlocked;
  }

  /**
   * Retorna todos os bloqueios ativos
   * @returns {Array}
   */
  getAll() {
    return Array.from(this.blocked.entries()).map(([contactId, info]) => ({
      contactId,
      ...info
    }));
  }

  /**
   * Limpa toda a blacklist
   */
  clear() {
    const count = this.blocked.size;
    this.blocked.clear();
    console.log(` [BLACKLIST] ${count} contatos desbloqueados`);
    return count;
  }
}

// Singleton - única instância compartilhada
export const blacklist = new Blacklist();

export default blacklist;

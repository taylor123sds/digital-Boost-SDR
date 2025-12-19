/**
 * @file ContactLockManager.js
 * @description Sistema de LOCK por contato para garantir processamento sequencial
 *
 * OBJETIVO: Garantir que apenas UMA mensagem por contato seja processada por vez
 *
 * Estratégia:
 * 1. Lock em memória por contactId
 * 2. Fila de mensagens pendentes por contato
 * 3. Auto-release por timeout (previne deadlocks)
 * 4. Persistência opcional em SQLite para múltiplas instâncias
 *
 * @version 1.0.0
 */

//  FIX: Usar getDatabase() que verifica e reconecta se necessário
import { getDatabase } from '../db/index.js';

// ═══════════════════════════════════════════════════════════════
// CONFIGURAÇÃO
// ═══════════════════════════════════════════════════════════════

const CONFIG = {
  // Timeout para auto-release do lock (45 segundos)
  LOCK_TIMEOUT_MS: 45000,

  // Tamanho máximo da fila por contato
  MAX_QUEUE_PER_CONTACT: 10,

  // Intervalo de limpeza de locks expirados (30 segundos)
  CLEANUP_INTERVAL_MS: 30000,

  // Usar SQLite para persistência (para múltiplas instâncias)
  USE_SQLITE: true
};

// ═══════════════════════════════════════════════════════════════
// CONTACT LOCK MANAGER
// ═══════════════════════════════════════════════════════════════

class ContactLockManager {
  constructor() {
    // Map de contactId -> { locked: boolean, lockedAt: timestamp }
    this.locks = new Map();

    // Map de contactId -> Array<webhookData>
    this.queues = new Map();

    // Estatísticas
    this.stats = {
      locksAcquired: 0,
      locksReleased: 0,
      locksTimedOut: 0,
      messagesQueued: 0,
      messagesDequeued: 0,
      startTime: Date.now()
    };

    // Inicializar tabela SQLite se habilitado
    if (CONFIG.USE_SQLITE) {
      this._initDB();
    }

    // Iniciar limpeza automática
    this.cleanupInterval = setInterval(() => {
      this._cleanupExpiredLocks();
    }, CONFIG.CLEANUP_INTERVAL_MS);

    console.log(' [LOCK] ContactLockManager inicializado');
  }

  /**
   * Inicializa tabela SQLite para locks distribuídos
   */
  _initDB() {
    try {
      //  FIX: Obter conexão fresh
      const db = getDatabase();
      db.exec(`
        CREATE TABLE IF NOT EXISTS contact_locks (
          contact_id TEXT PRIMARY KEY,
          locked_at INTEGER NOT NULL,
          instance_id TEXT,
          expires_at INTEGER NOT NULL
        )
      `);
      console.log(' [LOCK] Tabela contact_locks criada/verificada');
    } catch (error) {
      console.error(' [LOCK] Erro ao criar tabela:', error.message);
    }
  }

  /**
   * Tenta adquirir lock para um contato
   *
   * @param {string} contactId - ID do contato
   * @returns {Promise<boolean>} true se lock foi adquirido, false se já existe lock ativo
   */
  async tryAcquire(contactId) {
    const now = Date.now();

    // Verificar lock em memória primeiro
    const existingLock = this.locks.get(contactId);

    if (existingLock && existingLock.locked) {
      // Verificar se lock expirou
      if (now - existingLock.lockedAt > CONFIG.LOCK_TIMEOUT_MS) {
        console.log(` [LOCK] Lock expirado para ${contactId}, liberando...`);
        this._forceRelease(contactId);
      } else {
        // Lock ainda válido
        return false;
      }
    }

    // Verificar lock em SQLite (para múltiplas instâncias)
    if (CONFIG.USE_SQLITE) {
      try {
        //  FIX: Obter conexão fresh
        const db = getDatabase();
        const sqliteLock = db.prepare(`
          SELECT * FROM contact_locks WHERE contact_id = ? AND expires_at > ?
        `).get(contactId, now);

        if (sqliteLock) {
          console.log(` [LOCK] Lock existente em SQLite para ${contactId}`);
          return false;
        }

        // Inserir/atualizar lock em SQLite
        db.prepare(`
          INSERT OR REPLACE INTO contact_locks (contact_id, locked_at, instance_id, expires_at)
          VALUES (?, ?, ?, ?)
        `).run(contactId, now, process.pid.toString(), now + CONFIG.LOCK_TIMEOUT_MS);

      } catch (error) {
        console.error(' [LOCK] Erro SQLite, usando apenas memória:', error.message);
      }
    }

    // Adquirir lock em memória
    this.locks.set(contactId, {
      locked: true,
      lockedAt: now
    });

    this.stats.locksAcquired++;
    console.log(` [LOCK] Lock adquirido para ${contactId}`);

    return true;
  }

  /**
   * Libera lock de um contato
   *
   * @param {string} contactId - ID do contato
   */
  release(contactId) {
    // Liberar em memória
    const lock = this.locks.get(contactId);
    if (lock) {
      lock.locked = false;
      this.locks.delete(contactId);
    }

    // Liberar em SQLite
    if (CONFIG.USE_SQLITE) {
      try {
        //  FIX: Obter conexão fresh
        const db = getDatabase();
        db.prepare(`
          DELETE FROM contact_locks WHERE contact_id = ?
        `).run(contactId);
      } catch (error) {
        console.error(' [LOCK] Erro ao liberar lock SQLite:', error.message);
      }
    }

    this.stats.locksReleased++;
    console.log(` [LOCK] Lock liberado para ${contactId}`);
  }

  /**
   * Força liberação de lock (para cleanup)
   */
  _forceRelease(contactId) {
    this.locks.delete(contactId);

    if (CONFIG.USE_SQLITE) {
      try {
        //  FIX: Obter conexão fresh
        const db = getDatabase();
        db.prepare(`
          DELETE FROM contact_locks WHERE contact_id = ?
        `).run(contactId);
      } catch (error) {
        // Ignorar erros de cleanup
      }
    }

    this.stats.locksTimedOut++;
  }

  /**
   * Enfileira mensagem para processamento posterior
   *
   * @param {string} contactId - ID do contato
   * @param {Object} webhookData - Dados do webhook
   * @returns {boolean} true se enfileirou, false se fila cheia
   */
  enqueueForContact(contactId, webhookData) {
    let queue = this.queues.get(contactId);

    if (!queue) {
      queue = [];
      this.queues.set(contactId, queue);
    }

    // Verificar limite de fila
    if (queue.length >= CONFIG.MAX_QUEUE_PER_CONTACT) {
      console.warn(` [LOCK] Fila cheia para ${contactId}, descartando mensagem`);
      return false;
    }

    queue.push({
      data: webhookData,
      enqueuedAt: Date.now()
    });

    this.stats.messagesQueued++;
    console.log(` [LOCK] Mensagem enfileirada para ${contactId} (${queue.length} na fila)`);

    return true;
  }

  /**
   * Remove e retorna próxima mensagem da fila de um contato
   *
   * @param {string} contactId - ID do contato
   * @returns {Object|null} Dados do webhook ou null se fila vazia
   */
  dequeueForContact(contactId) {
    const queue = this.queues.get(contactId);

    if (!queue || queue.length === 0) {
      return null;
    }

    const item = queue.shift();

    if (queue.length === 0) {
      this.queues.delete(contactId);
    }

    this.stats.messagesDequeued++;
    const queueTime = Date.now() - item.enqueuedAt;
    console.log(` [LOCK] Mensagem desenfileirada para ${contactId} (tempo na fila: ${queueTime}ms)`);

    return item.data;
  }

  /**
   * Verifica se contato está com lock ativo
   *
   * @param {string} contactId - ID do contato
   * @returns {boolean}
   */
  isLocked(contactId) {
    const lock = this.locks.get(contactId);

    if (!lock || !lock.locked) {
      return false;
    }

    // Verificar timeout
    if (Date.now() - lock.lockedAt > CONFIG.LOCK_TIMEOUT_MS) {
      this._forceRelease(contactId);
      return false;
    }

    return true;
  }

  /**
   * Retorna tamanho da fila de um contato
   *
   * @param {string} contactId - ID do contato
   * @returns {number}
   */
  getQueueSize(contactId) {
    const queue = this.queues.get(contactId);
    return queue ? queue.length : 0;
  }

  /**
   * Limpa locks expirados
   */
  _cleanupExpiredLocks() {
    const now = Date.now();
    let cleaned = 0;

    // Limpar locks em memória
    for (const [contactId, lock] of this.locks.entries()) {
      if (lock.locked && now - lock.lockedAt > CONFIG.LOCK_TIMEOUT_MS) {
        this._forceRelease(contactId);
        cleaned++;
      }
    }

    // Limpar locks em SQLite
    if (CONFIG.USE_SQLITE) {
      try {
        //  FIX: Obter conexão fresh
        const db = getDatabase();
        const result = db.prepare(`
          DELETE FROM contact_locks WHERE expires_at < ?
        `).run(now);

        if (result.changes > 0) {
          cleaned += result.changes;
        }
      } catch (error) {
        // Ignorar erros de cleanup
      }
    }

    if (cleaned > 0) {
      console.log(` [LOCK] Cleanup: ${cleaned} locks expirados removidos`);
    }
  }

  /**
   * Retorna estatísticas
   */
  getStats() {
    let totalQueued = 0;
    for (const queue of this.queues.values()) {
      totalQueued += queue.length;
    }

    return {
      ...this.stats,
      activeLocks: this.locks.size,
      contactsWithQueue: this.queues.size,
      totalQueuedMessages: totalQueued,
      uptimeMs: Date.now() - this.stats.startTime
    };
  }

  /**
   * Reset para testes
   */
  reset() {
    this.locks.clear();
    this.queues.clear();

    if (CONFIG.USE_SQLITE) {
      try {
        //  FIX: Obter conexão fresh
        const db = getDatabase();
        db.prepare('DELETE FROM contact_locks').run();
      } catch (error) {
        // Ignorar
      }
    }

    this.stats = {
      locksAcquired: 0,
      locksReleased: 0,
      locksTimedOut: 0,
      messagesQueued: 0,
      messagesDequeued: 0,
      startTime: Date.now()
    };

    console.log(' [LOCK] Reset completo');
  }

  /**
   * Shutdown gracioso
   */
  shutdown() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Liberar todos os locks
    for (const contactId of this.locks.keys()) {
      this.release(contactId);
    }

    console.log(' [LOCK] Shutdown completo');
  }
}

// ═══════════════════════════════════════════════════════════════
// SINGLETON
// ═══════════════════════════════════════════════════════════════

let instance = null;

export function getContactLockManager() {
  if (!instance) {
    instance = new ContactLockManager();
  }
  return instance;
}

export default ContactLockManager;

// human_verification_store.js
//  Sistema de verificação humana para contatos suspeitos de serem bots

import { getDatabase } from '../db/index.js';
import { normalizePhone } from './phone_normalizer.js';

/**
 * Store para rastrear contatos aguardando verificação humana
 * ATUALIZADO: Usa SQLite para persistência (substituindo Maps/Sets em memória)
 */
class HumanVerificationStore {
  constructor() {
    this.getDb = getDatabase;

    // Palavras que confirmam que é humano
    //  ORDEM IMPORTA: Frases mais específicas primeiro para evitar false positives
    this.humanConfirmations = [
      'sou humano',           // Mais específico
      'sim sou humano',       // Mais específico
      'sim, sou humano',      // Mais específico
      'claro que sou',        // Contexto completo
      'obvio que sou',        // Contexto completo
      'óbvio que sou',        // Contexto completo
      'sou uma pessoa',       // Contexto completo
      'humano',               // Específico para identidade
      'sim',                  // Genérico - risco de false positive
      'sou',                  // Genérico - risco de false positive
      'claro',                // Genérico - risco de false positive
      'gente',                // Menos usado por bots
      'obvio',                // Genérico
      'óbvio'                 // Genérico
    ];

    //  REMOVIDO: 'pessoa' - muito genérico, bots usam em "falar com uma pessoa"

    this.VERIFICATION_TIMEOUT = 60000; // 1 minuto para responder
    this.MAX_ATTEMPTS = 2; // 2 tentativas

    this.startAutoCleanup();
  }

  /**
   * Marca contato como aguardando verificação
   * @param {string} contactId
   */
  markAsWaitingVerification(contactId) {
    const normalized = normalizePhone(contactId);

    const existing = this.getDb().prepare(
      'SELECT attempts FROM human_verifications WHERE phone_number = ? AND verified = 0'
    ).get(normalized);

    if (existing) {
      // Incrementar tentativas
      const newAttempts = existing.attempts + 1;
      this.getDb().prepare(`
        UPDATE human_verifications
        SET attempts = ?, last_attempt_at = CURRENT_TIMESTAMP
        WHERE phone_number = ?
      `).run(newAttempts, normalized);

      console.log(` [HUMAN-CHECK] ${normalized}: Tentativa ${newAttempts}/${this.MAX_ATTEMPTS}`);
    } else {
      // Primeira tentativa
      this.getDb().prepare(`
        INSERT OR REPLACE INTO human_verifications
        (phone_number, attempts, last_attempt_at, verified)
        VALUES (?, 1, CURRENT_TIMESTAMP, 0)
      `).run(normalized);

      console.log(` [HUMAN-CHECK] ${normalized}: Primeira verificação enviada`);
    }
  }

  /**
   * Verifica se contato está aguardando verificação
   * @param {string} contactId
   * @returns {boolean}
   */
  isWaitingVerification(contactId) {
    const normalized = normalizePhone(contactId);

    const verification = this.getDb().prepare(`
      SELECT last_attempt_at FROM human_verifications
      WHERE phone_number = ? AND verified = 0
    `).get(normalized);

    if (!verification) return false;

    // Verificar se não expirou (SQLite retorna datetime como string)
    const lastAttemptTime = new Date(verification.last_attempt_at).getTime();
    const elapsed = Date.now() - lastAttemptTime;

    if (elapsed > this.VERIFICATION_TIMEOUT) {
      console.log(` [HUMAN-CHECK] ${normalized}: Verificação expirou (${elapsed}ms)`);

      //  BLOQUEIO PERMANENTE: Criar registro em bot_blocks
      this.getDb().prepare(`
        INSERT OR REPLACE INTO bot_blocks (phone_number, reason, blocked_at)
        VALUES (?, 'verification_timeout', CURRENT_TIMESTAMP)
      `).run(normalized);

      console.log(` [HUMAN-CHECK] ${normalized}: BLOQUEADO PERMANENTEMENTE por timeout (não respondeu em ${elapsed}ms)`);

      // Remover da tabela de verificações
      this.getDb().prepare('DELETE FROM human_verifications WHERE phone_number = ?').run(normalized);

      return false;
    }

    return true;
  }

  /**
   * Verifica se contato está bloqueado permanentemente
   * @param {string} contactId
   * @returns {boolean}
   */
  isPermanentlyBlocked(contactId) {
    const normalized = normalizePhone(contactId);

    const blocked = this.getDb().prepare(
      'SELECT 1 FROM bot_blocks WHERE phone_number = ?'
    ).get(normalized);

    return !!blocked;
  }

  /**
   * Verifica se mensagem confirma que é humano
   * @param {string} message
   * @returns {boolean}
   */
  isHumanConfirmation(message) {
    //  Proteção contra null/undefined
    if (!message || typeof message !== 'string') return false;

    const cleanMessage = message.toLowerCase().trim();

    //  CORRIGIDO: Usar word boundaries para evitar false positives
    // "assim" não deve casar com "sim", "pessoa" não deve casar com "soa", etc.
    return this.humanConfirmations.some(keyword => {
      // Regex com word boundaries: \b garante palavra completa
      const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      return regex.test(cleanMessage);
    });
  }

  /**
   * Processa resposta de verificação
   * @param {string} contactId
   * @param {string} message
   * @returns {Object} { verified: boolean, shouldBlock: boolean, shouldAskAgain: boolean }
   */
  processVerificationResponse(contactId, message) {
    const normalized = normalizePhone(contactId);

    const verification = this.getDb().prepare(`
      SELECT attempts FROM human_verifications
      WHERE phone_number = ? AND verified = 0
    `).get(normalized);

    if (!verification) {
      return { verified: false, shouldBlock: false, shouldAskAgain: false };
    }

    // Verificar se confirmou que é humano
    if (this.isHumanConfirmation(message)) {
      console.log(` [HUMAN-CHECK] ${normalized}: VERIFICADO como humano! Resposta: "${message}"`);

      // Marcar como verificado
      this.getDb().prepare(`
        UPDATE human_verifications
        SET verified = 1, verified_at = CURRENT_TIMESTAMP
        WHERE phone_number = ?
      `).run(normalized);

      return {
        verified: true,
        shouldBlock: false,
        shouldAskAgain: false
      };
    }

    // Não confirmou - verificar tentativas
    if (verification.attempts >= this.MAX_ATTEMPTS) {
      console.log(` [HUMAN-CHECK] ${normalized}: BLOQUEADO após ${verification.attempts} tentativas sem confirmação`);

      //  BLOQUEIO PERMANENTE: Criar registro em bot_blocks
      this.getDb().prepare(`
        INSERT OR REPLACE INTO bot_blocks (phone_number, reason, blocked_at)
        VALUES (?, 'max_attempts_exceeded', CURRENT_TIMESTAMP)
      `).run(normalized);

      console.log(` [HUMAN-CHECK] ${normalized}: Adicionado à lista de bloqueados permanentemente`);

      // Remover da tabela de verificações
      this.getDb().prepare('DELETE FROM human_verifications WHERE phone_number = ?').run(normalized);

      return {
        verified: false,
        shouldBlock: true,
        shouldAskAgain: false
      };
    }

    // Ainda tem tentativas
    console.log(` [HUMAN-CHECK] ${normalized}: Resposta não confirmou (tentativa ${verification.attempts}/${this.MAX_ATTEMPTS})`);

    return {
      verified: false,
      shouldBlock: false,
      shouldAskAgain: true
    };
  }

  /**
   * Marca contato como verificado (humano confirmado)
   * @param {string} contactId
   */
  markAsVerified(contactId) {
    const normalized = normalizePhone(contactId);

    this.getDb().prepare(`
      UPDATE human_verifications
      SET verified = 1, verified_at = CURRENT_TIMESTAMP
      WHERE phone_number = ?
    `).run(normalized);

    console.log(` [HUMAN-CHECK] ${normalized}: Marcado como verificado`);
  }

  /**
   *  FIX: Verifica se contato já foi verificado como humano
   * @param {string} contactId
   * @returns {boolean}
   */
  isVerifiedHuman(contactId) {
    const normalized = normalizePhone(contactId);

    const verified = this.getDb().prepare(`
      SELECT 1 FROM human_verifications
      WHERE phone_number = ? AND verified = 1
    `).get(normalized);

    return !!verified;
  }

  /**
   * Remove verificação pendente
   * @param {string} contactId
   */
  clearVerification(contactId) {
    const normalized = normalizePhone(contactId);
    this.getDb().prepare('DELETE FROM human_verifications WHERE phone_number = ?').run(normalized);
  }

  /**
   * Limpa todas as verificações
   */
  clearAll() {
    this.getDb().prepare('DELETE FROM human_verifications').run();
    console.log(` [HUMAN-CHECK] Todas verificações limpas`);
  }

  /**
   * Auto-cleanup de verificações expiradas
   *  FIX: Agora com try-catch para evitar crashes se a conexão estiver fechada
   */
  startAutoCleanup() {
    setInterval(() => {
      try {
        //  FIX: Verificar se a conexão está disponível antes de usar
        const db = this.getDb();
        if (!db) {
          console.log(` [HUMAN-CHECK] Auto-cleanup pulado: conexão não disponível`);
          return;
        }

        // Limpar verificações expiradas que não foram respondidas
        const timeoutThreshold = new Date(Date.now() - this.VERIFICATION_TIMEOUT);

        const result = db.prepare(`
          DELETE FROM human_verifications
          WHERE verified = 0
          AND datetime(last_attempt_at) < datetime(?)
        `).run(timeoutThreshold.toISOString());

        if (result.changes > 0) {
          console.log(` [HUMAN-CHECK] Auto-cleanup removeu ${result.changes} verificações expiradas`);
        }
      } catch (error) {
        //  FIX: Log do erro mas não deixar crashar o processo
        console.error(` [HUMAN-CHECK] Auto-cleanup erro (ignorado):`, error.message);
      }
    }, this.VERIFICATION_TIMEOUT); // Rodar a cada 1 minuto
  }

  /**
   * Estatísticas
   */
  getStats() {
    const pending = this.getDb().prepare(`
      SELECT phone_number FROM human_verifications
      WHERE verified = 0
    `).all();

    return {
      totalPending: pending.length,
      pendingContacts: pending.map(r => r.phone_number)
    };
  }
}

// Exportar instância singleton
const humanVerificationStore = new HumanVerificationStore();

export default humanVerificationStore;

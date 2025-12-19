/**
 * @file OutboundDeduplicator.js
 * @description Sistema de deduplitação de mensagens OUTBOUND (enviadas)
 *
 * PROBLEMA RESOLVIDO:
 * - ProspectingEngine enviava mensagens duplicadas ao mesmo lead
 * - Causa: Normalização de telefone inconsistente entre validação e processamento
 * - Resultado: Mesmo lead recebia 2+ mensagens iguais em poucos minutos
 *
 * SOLUÇÃO:
 * - Gate de última instância no nível do sendWhatsAppMessage
 * - Deduplica por telefone + hash de conteúdo
 * - TTL configurável (padrão 5 minutos)
 *
 * @version 1.0.0
 */

import crypto from 'crypto';
import log from './logger-wrapper.js';
import { normalizePhone as centralNormalizePhone } from './phone_normalizer.js';

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO
// ═══════════════════════════════════════════════════════════════════════════

const CONFIG = {
  // TTL para mensagens iguais ao mesmo contato (5 minutos)
  MESSAGE_TTL_MS: 5 * 60 * 1000,

  // TTL para qualquer mensagem ao mesmo contato (30 segundos)
  // Previne burst de mensagens diferentes ao mesmo lead
  CONTACT_COOLDOWN_MS: 30 * 1000,

  // Intervalo de limpeza automática (1 minuto)
  CLEANUP_INTERVAL_MS: 60 * 1000,

  // Limite máximo de entries (previne memory leak)
  MAX_ENTRIES: 5000
};

// ═══════════════════════════════════════════════════════════════════════════
// OUTBOUND DEDUPLICATOR
// ═══════════════════════════════════════════════════════════════════════════

class OutboundDeduplicator {
  constructor() {
    // Map de contentHash -> { timestamp, phone, contentPreview }
    this.sentMessages = new Map();

    // Map de phone -> { timestamp, lastContent }
    this.recentContacts = new Map();

    // Estatísticas
    this.stats = {
      totalChecked: 0,
      duplicatesBlocked: 0,
      cooldownBlocked: 0,
      allowed: 0,
      startTime: Date.now()
    };

    // Iniciar limpeza automática
    this.cleanupInterval = setInterval(() => {
      this._cleanup();
    }, CONFIG.CLEANUP_INTERVAL_MS);

    log.info('[OUTBOUND-DEDUP] Sistema de deduplitação outbound inicializado');
  }

  /**
   * Verifica se mensagem pode ser enviada
   * DEVE ser chamado ANTES de enviar qualquer mensagem outbound
   *
   * @param {string} phone - Telefone do destinatário (será normalizado)
   * @param {string} message - Conteúdo da mensagem
   * @param {Object} options - Opções adicionais
   * @param {boolean} options.skipCooldown - Ignora cooldown de contato (para respostas urgentes)
   * @param {string} options.source - Origem da mensagem (para logging)
   * @returns {Object} { allowed: boolean, reason?: string }
   */
  check(phone, message, options = {}) {
    this.stats.totalChecked++;

    const { skipCooldown = false, source = 'unknown' } = options;

    // 1. Normalizar telefone
    const normalizedPhone = this._normalizePhone(phone);
    if (!normalizedPhone) {
      return { allowed: false, reason: 'invalid_phone' };
    }

    // 2. Gerar hash do conteúdo
    const contentHash = this._generateHash(normalizedPhone, message);
    const now = Date.now();

    // 3. Verificar se mensagem exatamente igual já foi enviada
    const existingSent = this.sentMessages.get(contentHash);
    if (existingSent && (now - existingSent.timestamp) < CONFIG.MESSAGE_TTL_MS) {
      const ageSeconds = Math.round((now - existingSent.timestamp) / 1000);

      this.stats.duplicatesBlocked++;
      log.warn(`[OUTBOUND-DEDUP] BLOQUEADO: Mensagem duplicada para ${normalizedPhone}`, {
        source,
        ageSeconds,
        contentPreview: message.substring(0, 50)
      });

      return {
        allowed: false,
        reason: 'duplicate_message',
        blockedAgeSeconds: ageSeconds,
        originalSentAt: existingSent.timestamp
      };
    }

    // 4. Verificar cooldown de contato (burst protection)
    if (!skipCooldown) {
      const recentContact = this.recentContacts.get(normalizedPhone);
      if (recentContact && (now - recentContact.timestamp) < CONFIG.CONTACT_COOLDOWN_MS) {
        const cooldownRemaining = Math.round((CONFIG.CONTACT_COOLDOWN_MS - (now - recentContact.timestamp)) / 1000);

        this.stats.cooldownBlocked++;
        log.warn(`[OUTBOUND-DEDUP] BLOQUEADO: Cooldown ativo para ${normalizedPhone}`, {
          source,
          cooldownRemaining,
          lastContent: recentContact.lastContent?.substring(0, 30)
        });

        return {
          allowed: false,
          reason: 'contact_cooldown',
          cooldownRemainingSeconds: cooldownRemaining
        };
      }
    }

    // 5. Permitir envio e registrar
    this.sentMessages.set(contentHash, {
      timestamp: now,
      phone: normalizedPhone,
      contentPreview: message.substring(0, 100),
      source
    });

    this.recentContacts.set(normalizedPhone, {
      timestamp: now,
      lastContent: message.substring(0, 100)
    });

    this._enforceMemoryLimits();

    this.stats.allowed++;
    log.info(`[OUTBOUND-DEDUP] Mensagem autorizada para ${normalizedPhone}`, {
      source,
      contentPreview: message.substring(0, 30)
    });

    return { allowed: true };
  }

  /**
   * Registra mensagem como enviada (para casos onde check já passou)
   * Útil quando mensagem foi enviada com sucesso e queremos atualizar o registro
   *
   * @param {string} phone - Telefone do destinatário
   * @param {string} message - Conteúdo da mensagem
   * @param {string} source - Origem da mensagem
   */
  markSent(phone, message, source = 'unknown') {
    const normalizedPhone = this._normalizePhone(phone);
    if (!normalizedPhone) return;

    const contentHash = this._generateHash(normalizedPhone, message);
    const now = Date.now();

    this.sentMessages.set(contentHash, {
      timestamp: now,
      phone: normalizedPhone,
      contentPreview: message.substring(0, 100),
      source
    });

    this.recentContacts.set(normalizedPhone, {
      timestamp: now,
      lastContent: message.substring(0, 100)
    });
  }

  /**
   * Normaliza telefone para formato consistente
   *  FIX: Usa normalização centralizada de phone_normalizer.js
   */
  _normalizePhone(phone) {
    return centralNormalizePhone(phone);
  }

  /**
   * Gera hash único para telefone + conteúdo
   */
  _generateHash(phone, message) {
    // Normaliza conteúdo (remove espaços extras, lowercase)
    const normalizedMessage = (message || '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();

    const content = `${phone}:${normalizedMessage}`;
    return crypto.createHash('md5').update(content).digest('hex');
  }

  /**
   * Limpeza automática de entries expiradas
   */
  _cleanup() {
    const now = Date.now();
    let cleaned = 0;

    // Limpar mensagens expiradas
    for (const [hash, data] of this.sentMessages.entries()) {
      if (now - data.timestamp > CONFIG.MESSAGE_TTL_MS) {
        this.sentMessages.delete(hash);
        cleaned++;
      }
    }

    // Limpar cooldowns expirados
    for (const [phone, data] of this.recentContacts.entries()) {
      if (now - data.timestamp > CONFIG.CONTACT_COOLDOWN_MS * 2) {
        this.recentContacts.delete(phone);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      log.info(`[OUTBOUND-DEDUP] Cleanup: ${cleaned} entries removidas`);
    }
  }

  /**
   * Previne memory leak limitando tamanho dos Maps
   */
  _enforceMemoryLimits() {
    // Limitar sentMessages
    if (this.sentMessages.size > CONFIG.MAX_ENTRIES) {
      const toRemove = this.sentMessages.size - CONFIG.MAX_ENTRIES;
      const entries = Array.from(this.sentMessages.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

      for (let i = 0; i < toRemove; i++) {
        this.sentMessages.delete(entries[i][0]);
      }

      log.warn(`[OUTBOUND-DEDUP] Memory limit: removidos ${toRemove} hashes antigos`);
    }

    // Limitar recentContacts
    if (this.recentContacts.size > CONFIG.MAX_ENTRIES) {
      const toRemove = this.recentContacts.size - CONFIG.MAX_ENTRIES;
      const entries = Array.from(this.recentContacts.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

      for (let i = 0; i < toRemove; i++) {
        this.recentContacts.delete(entries[i][0]);
      }

      log.warn(`[OUTBOUND-DEDUP] Memory limit: removidos ${toRemove} contatos antigos`);
    }
  }

  /**
   * Retorna estatísticas
   */
  getStats() {
    const uptime = Date.now() - this.stats.startTime;
    const blockRate = this.stats.totalChecked > 0
      ? ((this.stats.duplicatesBlocked + this.stats.cooldownBlocked) / this.stats.totalChecked * 100).toFixed(2)
      : '0.00';

    return {
      ...this.stats,
      totalBlocked: this.stats.duplicatesBlocked + this.stats.cooldownBlocked,
      blockRate: `${blockRate}%`,
      activeSentMessages: this.sentMessages.size,
      activeRecentContacts: this.recentContacts.size,
      uptimeMs: uptime
    };
  }

  /**
   * Reset para testes
   */
  reset() {
    this.sentMessages.clear();
    this.recentContacts.clear();
    this.stats = {
      totalChecked: 0,
      duplicatesBlocked: 0,
      cooldownBlocked: 0,
      allowed: 0,
      startTime: Date.now()
    };
    log.info('[OUTBOUND-DEDUP] Reset completo');
  }

  /**
   * Shutdown gracioso
   */
  shutdown() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    log.info('[OUTBOUND-DEDUP] Shutdown completo');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON
// ═══════════════════════════════════════════════════════════════════════════

let instance = null;

export function getOutboundDeduplicator() {
  if (!instance) {
    instance = new OutboundDeduplicator();
  }
  return instance;
}

export default OutboundDeduplicator;

/**
 * @file EarlyDeduplicator.js
 * @description Sistema de deduplitação PRECOCE para webhooks
 *
 * OBJETIVO: Rejeitar duplicatas ANTES de qualquer processamento
 *
 * Estratégia:
 * 1. Deduplica por messageId (Evolution API)
 * 2. Deduplica por contactId + hash de conteúdo (fallback)
 * 3. TTL configurável com auto-limpeza
 * 4. Estatísticas para monitoramento
 *
 * @version 1.0.0
 */

import crypto from 'crypto';
import log from './logger-wrapper.js';

// ═══════════════════════════════════════════════════════════════
// CONFIGURAÇÃO
// ═══════════════════════════════════════════════════════════════

const CONFIG = {
  //  FIX P0: TTL aumentado para 5 minutos (match com WebhookHandler)
  // PROBLEMA ANTERIOR: 60s era muito curto, retry do Evolution API
  // após 60s causava duplicatas
  MESSAGE_ID_TTL_MS: 300000, // 5 minutos

  //  FIX P0: TTL de conteúdo também aumentado
  CONTENT_HASH_TTL_MS: 300000, // 5 minutos

  // Intervalo de limpeza automática (1 minuto)
  CLEANUP_INTERVAL_MS: 60000,

  // Limite máximo de entries (previne memory leak)
  MAX_ENTRIES: 10000
};

// ═══════════════════════════════════════════════════════════════
// EARLY DEDUPLICATOR
// ═══════════════════════════════════════════════════════════════

class EarlyDeduplicator {
  constructor() {
    // Map de messageId -> timestamp
    this.messageIds = new Map();

    // Map de contentHash -> { timestamp, contactId }
    this.contentHashes = new Map();

    // Estatísticas
    this.stats = {
      totalReceived: 0,
      duplicatesByMessageId: 0,
      duplicatesByContentHash: 0,
      passed: 0,
      startTime: Date.now()
    };

    // Iniciar limpeza automática
    this.cleanupInterval = setInterval(() => {
      this._cleanup();
    }, CONFIG.CLEANUP_INTERVAL_MS);

    log.info(' [DEDUP] EarlyDeduplicator inicializado');
  }

  /**
   * Verifica se webhook é duplicata
   * DEVE ser chamado ANTES de qualquer processamento
   *
   * @param {Object} webhookData - Dados brutos do webhook
   * @returns {Object} { isDuplicate: boolean, reason?: string, messageId?: string }
   */
  check(webhookData) {
    this.stats.totalReceived++;

    try {
      // 1. Extrair messageId do webhook
      const messageId = this._extractMessageId(webhookData);

      // 2. Verificar por messageId (mais confiável)
      if (messageId && this.messageIds.has(messageId)) {
        this.stats.duplicatesByMessageId++;
        log.warn(` [DEDUP] Duplicata por messageId: ${messageId.substring(0, 20)}...`);
        return {
          isDuplicate: true,
          reason: 'duplicate_message_id',
          messageId
        };
      }

      // 3. Extrair contactId e texto para hash de conteúdo
      const contactId = this._extractContactId(webhookData);
      const text = this._extractText(webhookData);

      if (contactId && text) {
        const contentHash = this._generateContentHash(contactId, text);

        if (this.contentHashes.has(contentHash)) {
          this.stats.duplicatesByContentHash++;
          log.warn(` [DEDUP] Duplicata por conteúdo: ${contactId} - "${text.substring(0, 30)}..."`);
          return {
            isDuplicate: true,
            reason: 'duplicate_content_hash',
            messageId,
            contactId
          };
        }

        // Registrar hash de conteúdo
        this.contentHashes.set(contentHash, {
          timestamp: Date.now(),
          contactId
        });
      }

      // 4. Registrar messageId
      if (messageId) {
        this.messageIds.set(messageId, Date.now());
      }

      // 5. Verificar limites de memória
      this._enforceMemoryLimits();

      this.stats.passed++;
      return {
        isDuplicate: false,
        messageId,
        contactId
      };

    } catch (error) {
      log.error(' [DEDUP] Erro na verificação:', { error: error.message });
      // Em caso de erro, permitir (fail-open)
      this.stats.passed++;
      return { isDuplicate: false, error: error.message };
    }
  }

  /**
   * Verifica se evento é de mensagem válida
   * Rejeita messages.update e outros eventos não-mensagem
   *
   * @param {Object} webhookData - Dados do webhook
   * @returns {Object} { isValid: boolean, reason?: string }
   */
  isValidMessageEvent(webhookData) {
    const event = (webhookData.event || '')
      .toString()
      .toLowerCase()
      .replace(/_/g, '.'); // Normaliza MESSAGES_UPSERT  messages.upsert

    //  DEBUG: Log detalhado do evento recebido
    const data = webhookData.data || {};
    const key = data.key || {};
    const message = data.message || {};

    // Log resumido para debug (apenas para eventos de mensagem)
    if (event.includes('message')) {
      log.info(` [EVENT-DEBUG] Evento: ${event}`, {
        hasKey: !!key.id,
        keyId: key.id?.substring(0, 20),
        fromMe: key.fromMe,
        remoteJid: key.remoteJid?.substring(0, 20),
        hasMessage: !!message.conversation || !!message.extendedTextMessage,
        dataKeys: Object.keys(data).join(',')
      });
    }

    // messages.upsert é o evento primário
    if (event === 'messages.upsert') {
      log.info(` [EVENT-DEBUG] MESSAGES_UPSERT aceito`);
      return { isValid: true };
    }

    // messages.update pode conter respostas de usuários em alguns setups
    // Aceitar apenas se houver mensagem/ídolo válido; caso contrário ignorar
    if (event === 'messages.update') {
      const hasText = Boolean(
        message.conversation ||
        message.extendedTextMessage?.text ||
        message.imageMessage?.caption ||
        message.videoMessage?.caption
      );
      const hasMediaWithoutText = Boolean(
        message.audioMessage ||
        message.documentMessage
      );

      if (key.id && (hasText || hasMediaWithoutText)) {
        log.info(` [EVENT-DEBUG] MESSAGES_UPDATE com payload aceito`);
        return { isValid: true };
      }

      //  DEBUG: Log do motivo de ignorar
      log.debug(` [EVENT-DEBUG] MESSAGES_UPDATE ignorado`, {
        keyId: key.id?.substring(0, 20),
        hasText,
        hasMediaWithoutText,
        messageKeys: Object.keys(message).join(',')
      });

      return {
        isValid: false,
        reason: 'messages_update_ignored',
        event
      };
    }

    // Outros eventos (connection.update, etc.) são ignorados
    return {
      isValid: false,
      reason: 'non_message_event',
      event
    };
  }

  /**
   * Extrai messageId do webhook
   */
  _extractMessageId(webhookData) {
    try {
      // Estrutura Evolution API
      const data = webhookData.data || {};
      const key = data.key || {};

      if (key.id) {
        return key.id;
      }

      // Fallback: data.message.key.id
      if (data.message?.key?.id) {
        return data.message.key.id;
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Extrai contactId do webhook
   *
   *  FIX: Para mensagens de lista de transmissão (@lid), o número real
   * do contato está em key.participant ou webhookData.sender, NÃO em remoteJid
   */
  _extractContactId(webhookData) {
    try {
      const data = webhookData.data || {};
      const key = data.key || {};
      const remoteJid = key.remoteJid || data.from || '';

      //  DEBUG: Log completo para investigar extração de contactId
      log.info(` [DEDUP-CONTACT] Extraindo contactId - remoteJid="${remoteJid}" participant="${key.participant || 'null'}" sender="${webhookData.sender || 'null'}" fromMe=${key.fromMe}`);

      //  FIX v2.4: Detectar mensagens com @lid (WhatsApp Business LID)
      // O Evolution API usa @lid para mensagens do WhatsApp Business API
      // O remetente real está em key.remoteJidAlt quando @lid está presente
      if (remoteJid.includes('@lid')) {
        //  SOLUÇÃO: Usar remoteJidAlt que contém o número real
        const remoteJidAlt = key.remoteJidAlt || '';
        const participant = key.participant || '';

        log.info(` [DEDUP] Mensagem @lid detectada`, {
          remoteJid: remoteJid?.substring(0, 30),
          remoteJidAlt,
          participant: participant || 'null'
        });

        // PRIORIDADE: remoteJidAlt contém o número real do remetente
        if (remoteJidAlt && remoteJidAlt.includes('@s.whatsapp.net')) {
          const extractedPhone = remoteJidAlt.replace('@s.whatsapp.net', '').replace(/[^0-9]/g, '');
          log.info(` [DEDUP] Usando remoteJidAlt: ${extractedPhone}`);
          return extractedPhone;
        }

        // Fallback: participant se existir
        if (participant && participant.includes('@s.whatsapp.net')) {
          const extractedPhone = participant.replace('@s.whatsapp.net', '').replace(/[^0-9]/g, '');
          log.info(` [DEDUP] Usando participant: ${extractedPhone}`);
          return extractedPhone;
        }

        // Se não encontrou número válido, logar erro
        log.warn(` [DEDUP] @lid sem remoteJidAlt ou participant válido`);
        return null;
      }

      // Normalizar número normal (remover @s.whatsapp.net)
      const normalPhone = remoteJid.replace('@s.whatsapp.net', '').replace(/[^0-9]/g, '');
      log.info(` [DEDUP-CONTACT] Número extraído: ${normalPhone}`);
      return normalPhone;
    } catch (err) {
      log.error(` [DEDUP-CONTACT] Erro: ${err.message}`);
      return null;
    }
  }

  /**
   * Extrai texto da mensagem
   */
  _extractText(webhookData) {
    try {
      const data = webhookData.data || {};
      const message = data.message || {};

      // Texto direto
      if (message.conversation) {
        return message.conversation;
      }

      // Extended text
      if (message.extendedTextMessage?.text) {
        return message.extendedTextMessage.text;
      }

      // Caption de mídia
      if (message.imageMessage?.caption) {
        return message.imageMessage.caption;
      }

      if (message.videoMessage?.caption) {
        return message.videoMessage.caption;
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Gera hash de conteúdo para deduplitação
   */
  _generateContentHash(contactId, text) {
    const content = `${contactId}:${text}`;
    return crypto.createHash('md5').update(content).digest('hex');
  }

  /**
   * Limpeza automática de entries expiradas
   */
  _cleanup() {
    const now = Date.now();
    let cleaned = 0;

    // Limpar messageIds expirados
    for (const [id, timestamp] of this.messageIds.entries()) {
      if (now - timestamp > CONFIG.MESSAGE_ID_TTL_MS) {
        this.messageIds.delete(id);
        cleaned++;
      }
    }

    // Limpar contentHashes expirados
    for (const [hash, data] of this.contentHashes.entries()) {
      if (now - data.timestamp > CONFIG.CONTENT_HASH_TTL_MS) {
        this.contentHashes.delete(hash);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      log.info(` [DEDUP] Cleanup: ${cleaned} entries removidas`);
    }
  }

  /**
   * Previne memory leak limitando tamanho dos Maps
   */
  _enforceMemoryLimits() {
    // Limitar messageIds
    if (this.messageIds.size > CONFIG.MAX_ENTRIES) {
      const toRemove = this.messageIds.size - CONFIG.MAX_ENTRIES;
      const entries = Array.from(this.messageIds.entries());
      entries.sort((a, b) => a[1] - b[1]); // Ordenar por timestamp (mais antigos primeiro)

      for (let i = 0; i < toRemove; i++) {
        this.messageIds.delete(entries[i][0]);
      }

      log.warn(` [DEDUP] Memory limit: removidos ${toRemove} messageIds antigos`);
    }

    // Limitar contentHashes
    if (this.contentHashes.size > CONFIG.MAX_ENTRIES) {
      const toRemove = this.contentHashes.size - CONFIG.MAX_ENTRIES;
      const entries = Array.from(this.contentHashes.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

      for (let i = 0; i < toRemove; i++) {
        this.contentHashes.delete(entries[i][0]);
      }

      log.warn(` [DEDUP] Memory limit: removidos ${toRemove} contentHashes antigos`);
    }
  }

  /**
   * Retorna estatísticas
   */
  getStats() {
    const uptime = Date.now() - this.stats.startTime;
    const duplicateRate = this.stats.totalReceived > 0
      ? ((this.stats.duplicatesByMessageId + this.stats.duplicatesByContentHash) / this.stats.totalReceived * 100).toFixed(2)
      : '0.00';

    return {
      ...this.stats,
      totalDuplicates: this.stats.duplicatesByMessageId + this.stats.duplicatesByContentHash,
      duplicateRate: `${duplicateRate}%`,
      activeMessageIds: this.messageIds.size,
      activeContentHashes: this.contentHashes.size,
      uptimeMs: uptime
    };
  }

  /**
   * Reset para testes
   */
  reset() {
    this.messageIds.clear();
    this.contentHashes.clear();
    this.stats = {
      totalReceived: 0,
      duplicatesByMessageId: 0,
      duplicatesByContentHash: 0,
      passed: 0,
      startTime: Date.now()
    };
    log.info(' [DEDUP] Reset completo');
  }

  /**
   * Shutdown gracioso
   */
  shutdown() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    log.info(' [DEDUP] Shutdown completo');
  }
}

// ═══════════════════════════════════════════════════════════════
// SINGLETON
// ═══════════════════════════════════════════════════════════════

let instance = null;

export function getEarlyDeduplicator() {
  if (!instance) {
    instance = new EarlyDeduplicator();
  }
  return instance;
}

export default EarlyDeduplicator;

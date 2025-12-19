/**
 * @file webhook_handler.js
 * @description Clean Architecture - Webhook Handler with Message Pipeline
 *
 * Handler limpo de webhooks usando arquitetura de pipeline em camadas.
 * Substitui completamente a lógica antiga de bot detection/FAQ inline.
 *
 * @author ORBION Team
 * @version 2.0.0
 */

import crypto from 'crypto';
import { messagePipeline } from '../middleware/MessagePipeline.js';
import { getMemory, setMemory } from '../memory.js';
import log from '../utils/logger-wrapper.js';
import { getCadenceIntegrationService } from '../services/CadenceIntegrationService.js';
import { getContactRateLimiter } from '../middleware/ContactRateLimiter.js';
import { getConversationContextService } from '../services/ConversationContextService.js';
import { getWebhookTransactionManager } from './WebhookTransactionManager.js';
import config from '../config/index.js';
// BILLING: Import EntitlementService for trial/subscription checks
import { getEntitlementService } from '../services/EntitlementService.js';

// ============================================================
// CONFIG LOADER - Carrega config dinamica do banco ou defaults
// ============================================================
import { getConfigLoader, DEFAULT_BOT_NUMBER } from '../config/AgentConfigLoader.js';

export class WebhookHandler {
  constructor() {
    this.processingQueue = new Map();
    // P0-1: Deduplicação removida daqui - agora consolidada em EarlyDeduplicator (GATE 1)
    // EarlyDeduplicator é mais robusto: TTL, content hash, memory limits
    this.totalMessages = 0;
    // ============================================================
    // BOT_NUMBER agora carregado dinamicamente via ConfigLoader
    // Default mantido para retrocompatibilidade
    // ============================================================
    this.BOT_NUMBER = DEFAULT_BOT_NUMBER;
    this.configLoader = getConfigLoader();
    //  FIX: Timeout externalizado para config (PIPELINE_TIMEOUT_MS env var)
    this.PIPELINE_TIMEOUT_MS = config.server.pipelineTimeout;

    // Estatísticas
    // P0-1: duplicates removido - agora tracking via EarlyDeduplicator
    this.stats = {
      total: 0,
      ignored: 0,
      blocked: 0,
      processed: 0,
      timeouts: 0
    };
  }

  /**
   * Handler principal de webhook
   * Agora usa MessagePipeline para processamento limpo
   */
  async handleWebhook(data, requestContext = {}) {
    this.totalMessages++;
    this.stats.total++;

    try {
      log.start('Webhook recebido');

      //  DEBUG: Log do evento recebido para diagnóstico
      log.info(' [DEBUG] Webhook payload', {
        event: data.event,
        hasData: !!data.data,
        dataKeys: data.data ? Object.keys(data.data) : [],
        instance: data.instance
      });

      // ═══════════════════════════════════════════════════════════════
      // LAYER 0: PRÉ-VALIDAÇÃO (Antes do Pipeline)
      // ═══════════════════════════════════════════════════════════════

      // 1. Filtrar eventos não-mensagem
      if (!this.isMessageEvent(data)) {
        this.stats.ignored++;
        log.info('Evento ignorado', { event: data.event || 'unknown' });
        return { status: 'ignored', reason: 'non_message_event', event: data.event };
      }

      // 2. Verificar se é do próprio bot (evita loop)
      if (this.isFromBot(data)) {
        this.stats.ignored++;
        log.info('Mensagem do bot ignorada');
        return { status: 'ignored', reason: 'from_bot' };
      }

      // 3. Verificar duplicação
      const messageId = this.extractMessageId(data);
      if (!messageId) {
        this.stats.ignored++;
        log.warn('Sem ID válido');
        return { status: 'invalid', reason: 'no_message_id' };
      }

      // P0-1: Deduplicação removida - agora consolidada em EarlyDeduplicator (GATE 1)
      // O check de duplicação já aconteceu antes de chegar aqui via webhook.routes.js

      // 4. Extrair dados da mensagem
      const messageData = this.extractMessageData(data);

      if (!messageData.from) {
        this.stats.ignored++;
        log.warn('Sem remetente válido');
        return { status: 'invalid', reason: 'no_sender' };
      }

      //  4.5 RATE LIMITING por contato
      const rateLimiter = getContactRateLimiter();
      const rateCheck = rateLimiter.check(messageData.from);

      if (!rateCheck.allowed) {
        this.stats.blocked++;
        log.warn('Rate limit excedido', {
          contact: messageData.from,
          retryAfterMs: rateCheck.retryAfterMs
        });
        return {
          status: 'rate_limited',
          reason: 'too_many_messages',
          retryAfterMs: rateCheck.retryAfterMs
        };
      }

      // Aceitar mensagens sem texto (mídia, etc)
      if (!messageData.text && !['image', 'video', 'audio', 'document'].includes(messageData.messageType)) {
        messageData.text = '[Mensagem sem texto]';
      }

      log.info('Mensagem recebida', {
        from: messageData.from,
        type: messageData.messageType,
        textPreview: messageData.text?.substring(0, 100)
      });

      // ═══════════════════════════════════════════════════════════════
      // LAYER 1-4: MESSAGE PIPELINE (Nova Arquitetura Limpa)
      // ═══════════════════════════════════════════════════════════════

      // Buscar estado do lead para contexto
      const contactId = messageData.from;
      let leadState = null;

      try {
        const leadStateData = await getMemory(`lead_state_${contactId}`);
        if (leadStateData) {
          leadState = JSON.parse(leadStateData);
        }
      } catch (err) {
        log.warn('Erro ao buscar lead state', { error: err.message, contactId });
      }

      // ═══════════════════════════════════════════════════════════════
      // BILLING CHECK: Block expensive AI operations if trial expired
      // ═══════════════════════════════════════════════════════════════
      const tenantId = requestContext?.tenantId || leadState?.tenant_id || leadState?.tenantId || 'default';

      // Only check billing for non-default tenants (multi-tenant mode)
      // In single-tenant mode (tenantId = 'default'), skip billing check
      if (tenantId && tenantId !== 'default') {
        try {
          const entitlementService = getEntitlementService();
          const entitlements = entitlementService.getTeamEntitlements(tenantId);

          if (!entitlements.isRuntimeAllowed) {
            this.stats.blocked++;
            log.warn('[BILLING] Runtime blocked - trial expired or limit reached', {
              tenantId,
              billingStatus: entitlements.billingStatus,
              reason: entitlements.reason,
              contactId
            });

            // Return blocked status - don't process through AI
            return {
              status: 'billing_blocked',
              reason: entitlements.reason,
              billingStatus: entitlements.billingStatus,
              daysRemaining: entitlements.daysRemaining,
              upgradeRequired: true
            };
          }

          // Log successful check
          log.debug('[BILLING] Runtime allowed', {
            tenantId,
            billingStatus: entitlements.billingStatus,
            daysRemaining: entitlements.daysRemaining
          });
        } catch (billingError) {
          // If billing check fails, log but continue (fail-open for robustness)
          log.warn('[BILLING] Entitlement check failed, allowing (fail-open)', {
            tenantId,
            error: billingError.message
          });
        }
      }

      // Preparar mensagem para pipeline
      const message = {
        from: messageData.from,
        text: messageData.text || '[Mensagem sem texto]',
        messageType: messageData.messageType,
        metadata: messageData.metadata
      };

      // Preparar contexto
      const context = {
        currentAgent: leadState?.currentAgent || 'sdr',
        leadState,
        messageCount: leadState?.messageCount || 0,
        tenantId
      };

      log.info('Contexto preparado', {
        agent: context.currentAgent,
        messageCount: context.messageCount,
        contactId
      });

      //  PROCESSAR ATRAVÉS DO PIPELINE (com timeout para evitar hang)
      let pipelineResult;
      try {
        pipelineResult = await Promise.race([
          messagePipeline.process(message, context),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('PIPELINE_TIMEOUT')), this.PIPELINE_TIMEOUT_MS)
          )
        ]);
      } catch (pipelineError) {
        if (pipelineError.message === 'PIPELINE_TIMEOUT') {
          this.stats.timeouts++;
          log.error('Pipeline timeout', {
            contactId,
            timeoutMs: this.PIPELINE_TIMEOUT_MS,
            message: message.text?.substring(0, 50)
          });

          // Retornar resultado de fallback para não bloquear o usuário
          return {
            status: 'timeout',
            reason: 'pipeline_timeout',
            allowed: true,
            shouldProcess: true,
            fallback: true
          };
        }
        throw pipelineError;
      }

      log.info('Pipeline processado', {
        allowed: pipelineResult.allowed,
        status: pipelineResult.allowed ? 'ALLOWED' : 'BLOCKED',
        contactId
      });

      // ═══════════════════════════════════════════════════════════════
      // PROCESSAR RESULTADO DO PIPELINE
      // ═══════════════════════════════════════════════════════════════

      if (!pipelineResult.allowed) {
        // Bloqueado por segurança
        this.stats.blocked++;
        log.warn('Mensagem bloqueada', { reason: pipelineResult.reason, contactId });

        return {
          status: 'blocked',
          reason: pipelineResult.reason,
          from: pipelineResult.from || contactId, //  FIX: Garantir 'from' para GATE4
          ...pipelineResult
        };
      }

      if (!pipelineResult.shouldProcess) {
        // Interceptado (opt-out, FAQ, etc)
        this.stats.processed++;
        log.success('Mensagem interceptada', { type: pipelineResult.type || 'unknown', contactId });

        return {
          status: 'intercepted',
          from: pipelineResult.from || contactId, //  FIX: Garantir 'from' para GATE4
          ...pipelineResult
        };
      }

      // Mensagem válida para processamento pelo agente
      this.stats.processed++;
      log.success('Válido para processamento', { agent: context.currentAgent, contactId });

      //  AUTO-MOVE: Remover lead da lista de prospecção (Sheets1) quando receber primeira mensagem
      // Isso garante que leads prospectados não apareçam mais como "novos"
      try {
        const { moveLeadFromProspectingToFunil } = await import('../utils/sheetsManager.js');
        const moveResult = await moveLeadFromProspectingToFunil(contactId);
        if (moveResult.success && moveResult.action === 'REMOVED_FROM_SHEETS1') {
          log.info('Lead movido de Sheets1 para funil', { contactId, row: moveResult.row });
        }
      } catch (moveError) {
        // Não bloquear o fluxo se houver erro no sheets
        log.warn('Erro ao mover lead de Sheets1', { error: moveError.message, contactId });
      }

      //  FIX: Declarar responseType FORA do bloco try para uso posterior
      // Determinar tipo de resposta baseado no intent
      let responseType = 'neutral';
      if (pipelineResult.intent?.primaryIntent) {
        const intent = pipelineResult.intent.primaryIntent;
        if (['meeting', 'interest', 'positive'].includes(intent)) {
          responseType = 'positive';
        } else if (['rejection', 'not_interested', 'opt_out'].includes(intent)) {
          responseType = 'negative';
        }
      }

      // ═══════════════════════════════════════════════════════════════
      // P0-5: TRANSAÇÃO CASCADE - Atualizar lead, cadência e contexto atomicamente
      // P1-2: tenant_id já extraído acima no billing check
      // ═══════════════════════════════════════════════════════════════
      const txnManager = getWebhookTransactionManager();
      // tenantId already declared in billing check section above

      // Executar transação atômica para operações de banco
      const txnResult = txnManager.processLeadResponse(contactId, {
        responseType: responseType,
        messageText: messageData.text,
        intent: pipelineResult.intent,
        tenantId: tenantId
      });

      if (txnResult.success) {
        log.success('[P0-5] Transação cascade concluída', {
          contactId,
          action: txnResult.action,
          leadId: txnResult.leadId,
          wasFirstResponse: txnResult.wasFirstResponse,
          responseDay: txnResult.responseDay
        });
      } else {
        log.error('[P0-5] Transação cascade falhou (rollback)', {
          contactId,
          error: txnResult.error
        });
      }

      // Operações FORA da transação (serviços externos):
      // 1. CadenceIntegrationService (também usa transação internamente)
      try {
        const cadenceService = getCadenceIntegrationService();
        const cadenceResult = await cadenceService.handleLeadResponse(contactId, {
          channel: 'whatsapp',
          responseType: responseType,
          content: messageData.text
        });

        if (cadenceResult.action === 'cadence_stopped') {
          log.info('Cadência pausada após resposta do lead', {
            contactId,
            enrollmentId: cadenceResult.enrollment_id,
            responseDay: cadenceResult.response_day
          });
        }
      } catch (cadenceError) {
        log.warn('Erro ao processar cadência', { error: cadenceError.message, contactId });
      }

      // 2. Salvar histórico em memória (cache)
      try {
        const historyKey = `conversation_history_${contactId}`;
        let conversationHistory = [];
        try {
          const historyData = await getMemory(historyKey);
          if (historyData) {
            conversationHistory = JSON.parse(historyData);
          }
        } catch (histErr) {
          log.debug('No conversation history found', { contactId });
        }

        conversationHistory.push({
          role: 'user',
          content: messageData.text,
          timestamp: new Date().toISOString()
        });

        await setMemory(historyKey, JSON.stringify(conversationHistory.slice(-20)));

        log.debug('Histórico de conversa atualizado', {
          contactId,
          historyLength: conversationHistory.length
        });
      } catch (historyError) {
        log.warn('Erro ao salvar histórico', { error: historyError.message, contactId });
      }

      return {
        status: 'valid',
        messageId,
        from: messageData.from,
        text: messageData.text,
        messageType: messageData.messageType,
        timestamp: messageData.timestamp,
        metadata: messageData.metadata,
        intent: pipelineResult.intent,
        context: pipelineResult.context
      };

    } catch (error) {
      log.error('Erro no processamento do webhook', error);
      return {
        status: 'error',
        error: error.message,
        stack: error.stack
      };
    }
  }

  /**
   * Verifica se é evento de mensagem
   *
   *  FIX: Aceitar messages.update quando contém mensagem real do usuário
   *
   * Evolution API pode enviar:
   * - messages.upsert: Nova mensagem (normal)
   * - messages.update: Atualização de mensagem (pode conter resposta do lead)
   *
   * O problema era que leads respondendo a campanhas vinham como messages.update
   * e eram ignorados, causando o erro genérico "Desculpa, não consegui processar"
   */
  isMessageEvent(data) {
    //  FIX: Evolution API envia MESSAGES_UPSERT (maiúsculo com underscore)
    // Aceitar ambos os formatos para compatibilidade
    const event = data.event?.toLowerCase().replace(/_/g, '.');

    // Aceitar messages.upsert (evento primário de nova mensagem)
    if (event === 'messages.upsert') {
      return true;
    }

    // Permitir messages.update APENAS se contiver mensagem do usuário
    // Evolution pode mandar replies como update; filtramos para evitar status-only
    if (event === 'messages.update') {
      const messageData = data.data?.message || data.data || {};
      const hasText = Boolean(
        messageData.conversation ||
        messageData.extendedTextMessage?.text ||
        messageData.imageMessage?.caption ||
        messageData.videoMessage?.caption
      );
      const isMediaWithoutText = Boolean(
        messageData.audioMessage ||
        messageData.documentMessage
      );

      return hasText || isMediaWithoutText;
    }

    // Rejeitar outros tipos de eventos (connection.update, qrcode.updated, etc)
    return false;
  }

  /**
   * Verifica se mensagem é do próprio bot
   */
  isFromBot(data) {
    const messageData = data.data?.message || data.data || {};
    const key = messageData.key || {};

    // Verificar fromMe
    if (key.fromMe === true) {
      return true;
    }

    // Verificar número do bot
    const from = key.remoteJid || messageData.from || '';
    const normalizedFrom = from.replace(/[^0-9]/g, '');

    if (normalizedFrom === this.BOT_NUMBER) {
      return true;
    }

    return false;
  }

  /**
   * Extrai ID único da mensagem
   */
  extractMessageId(data) {
    const messageData = data.data?.message || data.data || {};
    const key = messageData.key || {};

    if (key.id) {
      return key.id;
    }

    // Fallback: criar hash
    const hashSource = JSON.stringify({
      from: key.remoteJid || messageData.from,
      timestamp: messageData.messageTimestamp || Date.now(),
      text: messageData.text
    });

    return crypto.createHash('md5').update(hashSource).digest('hex');
  }

  // P0-1: isDuplicate e markAsProcessed REMOVIDOS
  // Deduplicação agora consolidada em EarlyDeduplicator (src/utils/EarlyDeduplicator.js)
  // Chamado no GATE 1 em webhook.routes.js antes de chegar aqui

  /**
   * Extrai dados estruturados da mensagem
   *
   *  FIX P0: Para mensagens de lista de transmissão (@lid), o número real
   * do contato está em key.participant ou data.sender, NÃO em remoteJid
   */
  extractMessageData(data) {
    //  FIX CRÍTICO: data.data contém key, messageTimestamp, pushName, e message
    // NÃO é data.data.message!
    const messageData = data.data || {};
    const key = messageData.key || {};
    const message = messageData.message || {};
    const remoteJid = key.remoteJid || messageData.from || '';

    //  FIX P0: Extrair número real do contato
    let fromNumber = '';

    // Detectar lista de transmissão (@lid)
    if (remoteJid.includes('@lid')) {
      //  FIX v2.5: Priorizar remoteJidAlt que contém o número real
      // Evolution API coloca o número real do remetente em key.remoteJidAlt
      const remoteJidAlt = key.remoteJidAlt || '';
      const participant = key.participant || data.sender || '';

      log.info(' [WEBHOOK] Mensagem @lid detectada', {
        remoteJid: remoteJid?.substring(0, 30),
        remoteJidAlt,
        participant: participant || 'null'
      });

      // PRIORIDADE 1: remoteJidAlt contém o número real do remetente
      if (remoteJidAlt && remoteJidAlt.includes('@s.whatsapp.net')) {
        fromNumber = remoteJidAlt.replace('@s.whatsapp.net', '').replace(/[^0-9]/g, '');
        log.info(' [WEBHOOK] Usando remoteJidAlt: ' + fromNumber);
      }
      // PRIORIDADE 2: participant se existir
      else if (participant && participant.includes('@s.whatsapp.net')) {
        fromNumber = participant.replace('@s.whatsapp.net', '').replace(/[^0-9]/g, '');
        log.info(' [WEBHOOK] Usando participant: ' + fromNumber);
      }
      // Fallback: participant sem @s.whatsapp.net
      else if (participant) {
        fromNumber = participant.replace(/[^0-9]/g, '');
        log.info(' [WEBHOOK] Usando participant (raw): ' + fromNumber);
      } else {
        log.warn(' [WEBHOOK] @lid sem remoteJidAlt ou participant válido', { remoteJid });
        fromNumber = '';
      }
    } else {
      // Número normal
      fromNumber = remoteJid.replace('@s.whatsapp.net', '').replace(/[^0-9]/g, '');
    }

    // Extrair texto
    let text = '';
    let messageType = 'text';

    if (message.conversation) {
      text = message.conversation;
    } else if (message.extendedTextMessage?.text) {
      text = message.extendedTextMessage.text;
    } else if (message.imageMessage?.caption) {
      text = message.imageMessage.caption;
      messageType = 'image';
    } else if (message.videoMessage?.caption) {
      text = message.videoMessage.caption;
      messageType = 'video';
    } else if (message.audioMessage) {
      messageType = 'audio';
    } else if (message.documentMessage) {
      messageType = 'document';
    }

    return {
      from: fromNumber,
      text: text.trim(),
      messageType,
      timestamp: messageData.messageTimestamp || Date.now(),
      metadata: {
        pushName: messageData.pushName || 'Desconhecido',
        instance: data.instance || 'unknown',
        isFromBroadcastList: remoteJid.includes('@lid'),
        broadcastListId: remoteJid.includes('@lid') ? remoteJid.replace('@lid', '') : null
      }
    };
  }

  /**
   * Retorna estatísticas
   * P0-1: duplicateCount removido - agora via EarlyDeduplicator.getStats()
   */
  getStats() {
    return {
      ...this.stats,
      totalMessages: this.totalMessages,
      pipelineStats: messagePipeline.getStats()
      // Para stats de deduplicação, usar: getEarlyDeduplicator().getStats()
    };
  }
}

// Export singleton
export const webhookHandler = new WebhookHandler();
export default webhookHandler;

// ═══════════════════════════════════════════════════════════════════════════
// P0-3: CANONICAL JOB PROCESSOR - For worker.js async job processing
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Process a message job from the async_jobs queue
 * Called by worker.js when processing MESSAGE_PROCESS jobs
 *
 * @param {Object} jobPayload - The job payload from async_jobs table
 * @param {string} jobPayload.inboundEventId - ID from inbound_events table
 * @param {string} jobPayload.integrationId - Integration ID
 * @param {string} jobPayload.instanceName - Evolution instance name
 * @param {Object} jobPayload.payload - Original webhook payload
 * @returns {Promise<Object>} Processing result
 */
export async function processMessageJob(jobPayload) {
  const { inboundEventId, integrationId, instanceName, payload } = jobPayload;

  log.info('[CANONICAL] Processing message job', {
    inboundEventId,
    integrationId,
    instanceName,
    event: payload?.event
  });

  try {
    // Use the singleton handler to process the webhook
    const result = await webhookHandler.handleWebhook(payload, {
      tenantId: jobPayload?.tenantId
    });

    log.info('[CANONICAL] Message job completed', {
      inboundEventId,
      status: result.status,
      from: result.from
    });

    return {
      success: true,
      inboundEventId,
      ...result
    };
  } catch (error) {
    log.error('[CANONICAL] Message job failed', {
      inboundEventId,
      error: error.message,
      stack: error.stack
    });

    return {
      success: false,
      inboundEventId,
      error: error.message
    };
  }
}

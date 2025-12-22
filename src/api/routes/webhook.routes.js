/**
 * @file webhook.routes.js
 * @description Webhook processing utilities (LEGACY ENDPOINT REMOVED)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * HARD CUTOVER COMPLETE (P0-3):
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * The legacy `/api/webhook/evolution` endpoint now returns 410 Gone.
 *
 * For all integrations, use:
 *   POST /api/webhooks/inbound/:webhookPublicId
 *
 * The canonical route (webhooks-inbound.routes.js) provides:
 *   - Multi-tenant support via tenant_id
 *   - Webhook secret validation
 *   - Persistent staging (inbound_events table)
 *   - Async job queue (async_jobs table)
 *   - DB-level idempotency (no in-memory locks)
 *   - Worker-based processing (survives crashes)
 *
 * This file still provides:
 *   - processWebhook() for async job processing
 *   - async_jobs processor (worker-only)
 *   - Health/admin endpoints for monitoring
 *
 * See: ARCHITECTURE_DECISIONS.md for canonical decisions
 * ═══════════════════════════════════════════════════════════════════════════
 */

import express from 'express';
import webhookHandler from '../../handlers/webhook_handler.js';
import persistenceManager from '../../handlers/persistence_manager.js';
import audioProcessor from '../../handlers/audio_processor.js';
import globalErrorHandler from '../../utils/error_handler.js';
import { serverStats } from '../../config/express.config.js';
import { getConversationContextService } from '../../services/ConversationContextService.js';
import simpleBotDetector from '../../security/SimpleBotDetector.js';
import CadenceIntegrationService from '../../services/CadenceIntegrationService.js';
import { getEntitlementService } from '../../services/EntitlementService.js';
// P0.1: InboundEventsService for webhook staging (persist-before-process)
import { getInboundEventsService } from '../../services/InboundEventsService.js';
// P0.2: AsyncJobsService for persistent job queue (DB-level contact locking)
import { getAsyncJobsService, JobType } from '../../services/AsyncJobsService.js';
import { incrementInboundMetric } from '../../services/InboundPipelineMetrics.js';
import { getIntegrationService } from '../../services/IntegrationService.js';
import { getTenantColumnOrThrow, assertTenantScoped } from '../../utils/tenantGuard.js';
import logger from '../../utils/logger.enhanced.js';

const router = express.Router();

// Singleton instances (used by job processor and utility functions)
const cadenceService = new CadenceIntegrationService();
const inboundEvents = getInboundEventsService();
const asyncJobs = getAsyncJobsService();

/**
 * WEBHOOK ENDPOINT - LEGACY (REMOVED)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * HARD CUTOVER: This endpoint now returns 410 Gone
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Migration required:
 *   OLD: POST /api/webhook/evolution
 *   NEW: POST /api/webhooks/inbound/:webhookPublicId
 *
 * To get your webhookPublicId:
 *   1. Create integration via POST /api/integrations
 *   2. Use the webhook_public_id from response
 *   3. Configure Evolution webhook URL:
 *      https://your-domain/api/webhooks/inbound/{webhook_public_id}
 *   4. Set X-Webhook-Secret header with the webhook_secret from response
 *
 * See: ARCHITECTURE_DECISIONS.md for complete migration guide
 * ═══════════════════════════════════════════════════════════════════════════
 */
router.post('/api/webhook/evolution', (req, res) => {
  // Log migration notice (once per hour max)
  const migrationKey = 'webhook_evolution_migration_logged';
  const lastLogged = global[migrationKey] || 0;
  const now = Date.now();
  if (now - lastLogged > 3600000) {
    console.warn('═══════════════════════════════════════════════════════════');
    console.warn('[410 GONE] /api/webhook/evolution has been REMOVED');
    console.warn('Caller must migrate to: /api/webhooks/inbound/:webhookPublicId');
    console.warn('See ARCHITECTURE_DECISIONS.md for migration guide');
    console.warn('═══════════════════════════════════════════════════════════');
    global[migrationKey] = now;
  }

  // Return 410 Gone with migration instructions
  return res.status(410).json({
    error: 'ENDPOINT_REMOVED',
    message: 'This endpoint has been deprecated and removed.',
    migration: {
      newEndpoint: '/api/webhooks/inbound/:webhookPublicId',
      documentation: '/ARCHITECTURE_DECISIONS.md',
      steps: [
        '1. Create integration via POST /api/integrations',
        '2. Use webhook_public_id from response',
        '3. Configure Evolution webhook to: /api/webhooks/inbound/{webhook_public_id}',
        '4. Set X-Webhook-Secret header with webhook_secret'
      ]
    },
    timestamp: Date.now()
  });
});

/**
 * Processa webhook validado
 *
 * REFATORADO (v3.0.0):
 * - CENTRALIZADO: Envio de respostas do pipeline é feito AQUI
 * - Pipeline retorna { responseToSend } em vez de enviar diretamente
 * - Elimina duplicatas causadas por múltiplos pontos de envio
 *
 * P0.1 Enhancement:
 * - Tracks processing status in inbound_events table
 * - Enables retry logic for failed webhooks
 *
 * @param {Object} webhookData - Dados do webhook
 * @param {string|null} stagedEventId - ID do evento staged (P0.1)
 */
export async function processWebhook(webhookData, stagedEventId = null, jobContext = {}) {
  const normalizedEvent = normalizeWebhookEvent(webhookData?.event);

  if (normalizedEvent === 'connection.update' || normalizedEvent === 'qrcode.updated') {
    await handleEvolutionLifecycleEvent(webhookData, jobContext);
    if (stagedEventId) inboundEvents.markProcessed(stagedEventId);
    return;
  }

  // P0.1: Mark as processing if we have a staged event
  if (stagedEventId) {
    try {
      inboundEvents.markProcessing(stagedEventId);
    } catch (e) {
      console.warn(` [P0.1] Failed to mark processing: ${e.message}`);
    }
  }

  try {
    // 1. Validação via webhook handler (inclui pipeline)
    const validated = await webhookHandler.handleWebhook(webhookData, {
      tenantId: jobContext?.tenantId
    });

    // ═══════════════════════════════════════════════════════════════
    // GATE 4: CENTRALIZED RESPONSE SENDER
    // ═══════════════════════════════════════════════════════════════

    // 4.1 Extrair contactId do resultado (para envio centralizado)
    const contactId = validated.from || extractContactIdFromWebhook(webhookData);

    // 4.2 Se pipeline retornou responseToSend, enviar AQUI (único ponto de envio)
    if (validated.responseToSend && contactId) {
      console.log(` [GATE4] Enviando resposta centralizada para ${contactId} (tipo: ${validated.type || validated.status})`);

      const sendResult = await sendResponseWithRetry(contactId, validated.responseToSend, {
        source: validated.type || 'pipeline',
        reason: validated.reason
      });

      if (sendResult.sent) {
        console.log(` [GATE4] Resposta enviada com sucesso (${validated.responseToSend.length} chars)`);
      } else {
        console.warn(` [GATE4] Resposta não enviada: ${sendResult.error || 'unknown'}`);
      }
    }

    // 4.3 Verificar se deve continuar para agentes
    if (validated.status === 'duplicate') {
      console.log(` [WEBHOOK] Duplicata ignorada: ${validated.messageId}`);
      incrementInboundMetric('dedup_dropped');
      logger.info('[INBOUND] Dedup dropped', {
        tenantId: jobContext?.tenantId,
        integrationId: jobContext?.integrationId,
        provider_event_id: jobContext?.providerEventId,
        job_id: jobContext?.jobId,
        correlation_id: jobContext?.correlationId,
        event: normalizedEvent
      });
      // P0.1: Mark as skipped (duplicate)
      if (stagedEventId) inboundEvents.markSkipped(stagedEventId, 'duplicate');
      return;
    }

    if (validated.status === 'blocked') {
      console.log(` [WEBHOOK] Bloqueado pelo pipeline: ${validated.reason}`);
      // P0.1: Mark as skipped (blocked)
      if (stagedEventId) inboundEvents.markSkipped(stagedEventId, `blocked: ${validated.reason}`);
      return;
    }

    if (validated.status === 'intercepted') {
      console.log(` [WEBHOOK] Interceptado pelo pipeline: ${validated.type}`);
      // P0.1: Mark as processed (intercepted is still a success)
      if (stagedEventId) inboundEvents.markProcessed(stagedEventId);
      return;
    }

    //  FIX AUDIT: Tratar timeout do pipeline - enviar resposta de fallback
    if (validated.status === 'timeout') {
      console.log(` [WEBHOOK] Pipeline timeout - enviando fallback para ${contactId}`);

      if (contactId) {
        await sendResponseWithRetry(
          contactId,
          'Oi! Desculpa pela demora, estou com muitas mensagens. Pode repetir o que disse?',
          { source: 'timeout_fallback', priority: 'high' }
        );
      }
      // P0.1: Mark as error (timeout)
      if (stagedEventId) inboundEvents.markError(stagedEventId, 'pipeline_timeout');
      return;
    }

    if (validated.status !== 'valid') {
      console.log(` [WEBHOOK] Status não processável: ${validated.status}`);
      // P0.1: Mark as skipped (invalid status)
      if (stagedEventId) inboundEvents.markSkipped(stagedEventId, `invalid_status: ${validated.status}`);
      return;
    }

    // ═══════════════════════════════════════════════════════════════
    // PROCESSAMENTO NORMAL (mensagem válida para agentes)
    // ═══════════════════════════════════════════════════════════════

    const { from, text, messageType, metadata, messageId } = validated;
    serverStats.messagesProcessed++;

    console.log(` [WEBHOOK] Processando ${messageType} de ${from}: "${(text || '').substring(0, 50)}..."`);

    const pipelineContext = validated.context || {};

    //  NEW: Registrar interação do lead na cadência (para tracking de if_no_response)
    // Isso NÃO para a cadência, apenas marca que houve interação
    try {
      cadenceService.trackInteraction(from, pipelineContext?.tenantId);
    } catch (trackingError) {
      console.warn('[WEBHOOK] Erro ao registrar interação na cadência:', trackingError.message);
    }

    //  FIX: Se humano foi verificado, enviar confirmação ANTES da resposta do agente
    if (validated.humanVerified && validated.verificationConfirmation) {
      console.log(` [WEBHOOK] Enviando confirmação de verificação humana para ${from}`);
      await sendResponseWithRetry(from, validated.verificationConfirmation, {
        source: 'human_verification',
        priority: 'high'
      });
    }

    // Roteamento por tipo de mensagem

    if (messageType === 'audio' && metadata?.needsTranscription) {
      await handleAudioMessage(from, messageId, metadata);
    } else {
      await handleTextMessageWithContext(from, text, messageType, metadata, messageId, pipelineContext);
    }

    // P0.1: Mark as processed (success)
    if (stagedEventId) {
      try {
        inboundEvents.markProcessed(stagedEventId);
      } catch (e) {
        console.warn(` [P0.1] Failed to mark processed: ${e.message}`);
      }
    }

  } catch (error) {
    console.error(' [WEBHOOK] Erro no processamento:', error);

    // P0.1: Mark as error (failed processing)
    if (stagedEventId) {
      try {
        inboundEvents.markError(stagedEventId, error.message || 'Unknown error');
      } catch (e) {
        console.warn(` [P0.1] Failed to mark error: ${e.message}`);
      }
    }

    await globalErrorHandler.logError('WEBHOOK_PROCESSING_ERROR', error, {
      webhookData: JSON.stringify(webhookData).substring(0, 500)
    });
  }
}

function normalizeWebhookEvent(rawEvent) {
  if (!rawEvent || typeof rawEvent !== 'string') return '';
  return rawEvent.toLowerCase().replace(/_/g, '.');
}

async function handleEvolutionLifecycleEvent(webhookData, jobContext) {
  const { integrationId, tenantId, instanceName } = jobContext;
  const state = webhookData?.data?.state || webhookData?.data?.instance?.state;

  if (!integrationId || !tenantId || !instanceName) {
    console.warn('[WEBHOOK] Missing integration context for lifecycle event', {
      integrationId,
      tenantId,
      instanceName,
      event: webhookData?.event
    });
    return;
  }

  const integrationService = getIntegrationService();

  if (normalizeWebhookEvent(webhookData?.event) === 'qrcode.updated') {
    console.log('[EVOLUTION] QR code updated for', instanceName);
    return;
  }

  console.log('[EVOLUTION] Connection update:', {
    instanceName,
    state,
    tenantId
  });

  if (state === 'open') {
    integrationService.update(tenantId, integrationId, {
      status: 'connected',
      lastConnectedAt: new Date().toISOString()
    });

    try {
      const { getEvolutionProvider } = await import('../../providers/EvolutionProvider.js');
      const evolutionProvider = getEvolutionProvider();
      const info = await evolutionProvider.getInstanceInfo(instanceName);

      if (info.phoneNumber) {
        integrationService.update(tenantId, integrationId, {
          phoneNumber: info.phoneNumber,
          profileName: info.profileName
        });
      }
    } catch (error) {
      console.warn('[EVOLUTION] Failed to fetch instance info', { error: error.message });
    }
  } else if (state === 'close' || state === 'unpaired' || state === 'UNPAIRED') {
    integrationService.update(tenantId, integrationId, {
      status: 'disconnected'
    });
  }
}

/**
 * Extrai contactId do webhook raw (fallback)
 */
function extractContactIdFromWebhook(webhookData) {
  try {
    const data = webhookData.data || {};
    const key = data.key || {};
    const remoteJid = key.remoteJid || data.from || '';

    //  FIX v2.5: Suporte a mensagens @lid (WhatsApp Business API)
    // Quando remoteJid contém @lid, o número real está em key.remoteJidAlt
    if (remoteJid.includes('@lid')) {
      const remoteJidAlt = key.remoteJidAlt || '';
      if (remoteJidAlt && remoteJidAlt.includes('@s.whatsapp.net')) {
        return remoteJidAlt.replace('@s.whatsapp.net', '').replace(/[^0-9]/g, '');
      }
      // Fallback para participant
      const participant = key.participant || '';
      if (participant && participant.includes('@s.whatsapp.net')) {
        return participant.replace('@s.whatsapp.net', '').replace(/[^0-9]/g, '');
      }
      return null;
    }

    return remoteJid.replace('@s.whatsapp.net', '').replace(/[^0-9]/g, '');
  } catch {
    return null;
  }
}

async function sendResponseWithRetry(contactId, responseText, options = {}) {
  const maxRetries = options.maxRetries || 3;
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      const { sendWhatsAppText } = await import('../../services/whatsappAdapterProvider.js');
      await sendWhatsAppText(contactId, responseText);
      return { sent: true, attempt };
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        const delayMs = Math.pow(2, attempt) * 500;
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  return {
    sent: false,
    error: lastError?.message || 'unknown_error'
  };
}

/**
 * Handle audio messages with transcription
 * @param {string} from - Contact ID
 * @param {string} messageId - Message ID
 * @param {Object} metadata - Audio metadata
 */
async function handleAudioMessage(from, messageId, metadata) {
  try {
    console.log(` [AUDIO] Iniciando transcrição para ${from}`);

    // 1. Enviar confirmação imediata
    await sendResponseWithRetry(from, ' Recebi seu áudio! Estou processando... ', {
      messageId,
      isAudioAck: true
    });

    // 2. Processar áudio de forma assíncrona
    audioProcessor.processAudio(messageId, metadata.audioData, metadata)
      .then(async (transcribedText) => {
        console.log(` [AUDIO] Transcrição completa: "${transcribedText.substring(0, 50)}..."`);

        // Processar texto transcrito como mensagem normal
        await handleTextMessage(from, transcribedText, 'text', {
          ...metadata,
          wasAudio: true,
          originalMessageId: messageId
        }, messageId);
      })
      .catch(async (error) => {
        console.error(` [AUDIO] Erro na transcrição:`, error);

        await sendResponseWithRetry(from,
          ' Desculpe, não consegui processar seu áudio. Por favor, envie uma mensagem de texto.',
          { messageId, priority: 'high' }
        );
      });

  } catch (error) {
    console.error(` [AUDIO] Erro no handler:`, error);
  }
}

/**
 * Handle text messages (including transcribed audio)
 * @param {string} from - Contact ID
 * @param {string} text - Message text
 * @param {string} messageType - Message type
 * @param {Object} metadata - Message metadata
 * @param {string} messageId - Message ID
 */
async function handleTextMessage(from, text, messageType, metadata, messageId) {
  try {
    //  USAR UNIFIED COORDINATOR para processamento
    const result = await processMessageWithAgents(from, { text, messageType, metadata, messageId });
    if (result) {
      await handleAgentResponse(from, result, messageId, text);
    }

  } catch (error) {
    console.error(` [WEBHOOK] Erro no handleTextMessage:`, error);
  }
}

/**
 * Handle text messages (including transcribed audio) - WITH PIPELINE CONTEXT
 * @param {string} from - Contact ID
 * @param {string} text - Message text
 * @param {string} messageType - Message type
 * @param {Object} metadata - Message metadata
 * @param {string} messageId - Message ID
 * @param {Object} pipelineContext - Enriched context from MessagePipeline (cadence, lead info)
 */
async function handleTextMessageWithContext(from, text, messageType, metadata, messageId, pipelineContext = {}) {
  try {
    //  USAR UNIFIED COORDINATOR para processamento
    const result = await processMessageWithAgents(
      from,
      { text, messageType, metadata, messageId },
      pipelineContext
    );

    if (result) {
      await handleAgentResponse(from, result, messageId, text);
    }

  } catch (error) {
    console.error(` [WEBHOOK] Erro no handleTextMessage:`, error);
  }
}

/**
 * Process message with Agent system (SDR  Specialist  Scheduler)
 * @param {string} contactId - Contact ID
 * @param {Object} message - Message object
 * @param {Object} pipelineContext - Enriched context from MessagePipeline (cadence, lead info)
 * @returns {Promise<Object>} Agent result
 */
async function processMessageWithAgents(contactId, message, pipelineContext = {}) {
  try {
    // 1. Carregar histórico do banco
    //  FIX: Usar getDatabase() que verifica e reconecta se necessário
    // ANTES: import { db } causava erro se conexão fechasse
    const { getDatabase } = await import('../../db/index.js');
    const db = getDatabase();

    // ═══════════════════════════════════════════════════════════════════════
    // GATE 5: ENTITLEMENT CHECK (Trial/Billing)
    // Block AI runtime if trial expired or subscription inactive
    // ═══════════════════════════════════════════════════════════════════════

    // Tenant ID should be provided by webhook context (no phone-based lookup)
    const tenantId = pipelineContext.tenantId || 'default';

    // Check entitlements if not default tenant
    if (tenantId && tenantId !== 'default') {
      const entitlementService = getEntitlementService();
      const entitlements = entitlementService.getTeamEntitlements(tenantId);

      if (!entitlements.isRuntimeAllowed) {
        console.log(` [GATE5] Runtime blocked for tenant ${tenantId}: ${entitlements.reason}`);

        // Get expiration message
        const expirationMessage = entitlementService.getTrialExpirationMessage(tenantId);

        // Save message to history (so user sees their message was received)
        await persistenceManager.saveConversation(contactId, message.text, expirationMessage || '', {
          messageType: 'text',
          agentUsed: 'EntitlementBlock',
          success: false,
          blocked: true,
          blockReason: entitlements.reason,
          tenantId
        });

        return {
          response: expirationMessage,
          success: false,
          source: 'entitlement_block',
          blocked: true,
          blockReason: entitlements.reason,
          billingStatus: entitlements.billingStatus,
          daysRemaining: entitlements.daysRemaining,
          timestamp: Date.now()
        };
      }

      // Increment message count for usage tracking
      entitlementService.incrementMessageCount(tenantId);
    }
    const tenantColumn = getTenantColumnOrThrow(db, 'whatsapp_messages', tenantId, 'whatsapp_messages history');
    const historyQuery = `
      SELECT message_text, from_me, created_at
      FROM whatsapp_messages /* tenant-guard: ignore */
      WHERE ${tenantColumn} = ? AND phone_number = ?
      ORDER BY created_at DESC
      LIMIT 20
    `;

    assertTenantScoped(historyQuery, [tenantId, contactId], {
      tenantId,
      tenantColumn,
      operation: 'whatsapp_messages history'
    });

    const historyRows = db.prepare(historyQuery).all(tenantId, contactId);

    const history = historyRows.reverse().map(row => ({
      role: row.from_me ? 'assistant' : 'user',
      content: row.message_text,
      timestamp: row.created_at
    }));

    console.log(` [AGENTS] ${history.length} mensagens históricas carregadas para ${contactId}`);

    //  LOG: Pipeline context received (cadence, lead info)
    if (pipelineContext.isInCadence || pipelineContext.wasProspected) {
      console.log(` [AGENTS] Lead context from pipeline:`, {
        isInCadence: pipelineContext.isInCadence,
        cadenceDay: pipelineContext.lead?.cadenceDay,
        wasProspected: pipelineContext.wasProspected,
        hasInstructions: !!pipelineContext.agentInstructions
      });
    }

    // 2. Processar com AgentHub (sistema de 3 agentes)
    const { getAgentHub } = await import('../../agents/agent_hub_init.js');
    const agentHub = getAgentHub();

    //  LOG: Supervisor analysis received (if any)
    if (pipelineContext.supervisorAnalysis) {
      console.log(` [AGENTS] Supervisor analysis from pipeline:`, {
        situationType: pipelineContext.supervisorAnalysis.situation_type,
        confidence: pipelineContext.supervisorAnalysis.confidence,
        recommendedAction: pipelineContext.supervisorAnalysis.recommended_action,
        shouldContinueSpin: pipelineContext.supervisorAnalysis.shouldContinueSpin
      });
    }

    const agentResult = await agentHub.processMessage({
      fromContact: contactId,
      text: message.text
    }, {
      messageType: message.messageType,
      metadata: message.metadata,
      hasHistory: history.length > 0,
      from: contactId,
      fromWhatsApp: true,
      platform: 'whatsapp',
      //  PASS CADENCE CONTEXT to agent
      isInCadence: pipelineContext.isInCadence || false,
      wasProspected: pipelineContext.wasProspected || false,
      hasResponded: pipelineContext.hasResponded || false,
      cadenceDay: pipelineContext.lead?.cadenceDay || null,
      cadenceLead: pipelineContext.lead || null,
      cadenceInfo: pipelineContext.cadence || null,
      agentInstructions: pipelineContext.agentInstructions || null,
      //  PASS SUPERVISOR ANALYSIS to agent (so it can use intelligent context)
      supervisorAnalysis: pipelineContext.supervisorAnalysis || null,
      supervisorSituation: pipelineContext.supervisorAnalysis?.situation_type || null,
      supervisorAction: pipelineContext.supervisorAnalysis?.recommended_action || null,
      shouldContinueSpin: pipelineContext.supervisorAnalysis?.shouldContinueSpin ?? true
    });

    // 3. Normalizar resultado
    //  FIX: Aceitar null como valor válido (não usar fallback quando intencionalmente null)
    const responseMessage = agentResult.message ?? agentResult.response ?? agentResult.answer ?? null;

    return {
      response: responseMessage, // Pode ser null se agente não quer enviar mensagem adicional
      success: agentResult.success !== false,
      source: agentResult.source || 'agent',
      timestamp: Date.now(),
      sendDigitalBoostAudio: agentResult.sendDigitalBoostAudio || false,
      followUpMessage: agentResult.followUpMessage,
      preHandoffMessage: agentResult.preHandoffMessage,
      contactId: agentResult.contactId,
      //  CONTEXT FOR FOLLOW-UP: Pass history and lead state for context saving
      conversationHistory: history,
      leadState: agentResult.leadState || {},
      cadenceDay: pipelineContext.lead?.cadenceDay || null,
      leadId: pipelineContext.lead?.leadId || null
    };

  } catch (error) {
    console.error(' [AGENTS] Erro no processamento:', error);

    //  FIX AUDIT: Tratar erros específicos sem resposta genérica
    // Alguns erros não devem gerar resposta ao usuário
    const silentErrors = [
      'AGENT_NO_RESPONSE',
      'SILENT_PROCESSING',
      'HANDOFF_IN_PROGRESS',
      'DATABASE_READ_ONLY'
    ];

    if (silentErrors.some(e => error.message?.includes(e))) {
      console.log(` [AGENTS] Erro silencioso (sem resposta): ${error.message}`);
      return {
        response: null, // Não enviar nada
        success: false,
        source: 'silent_error',
        error: error.message,
        timestamp: Date.now()
      };
    }

    //  FIX: Mensagem mais natural e menos robótica
    return {
      response: 'Oi! Deu um problema aqui do meu lado. Pode mandar de novo?',
      success: false,
      source: 'error',
      error: error.message,
      timestamp: Date.now()
    };
  }
}

/**
 * Handle agent response and send to WhatsApp
 * @param {string} from - Contact ID
 * @param {Object} agentResult - Agent processing result
 * @param {string} messageId - Original message ID
 * @param {string} originalText - Original message text
 */
async function handleAgentResponse(from, agentResult, messageId, originalText) {
  try {
    // 1. Verificar se deve enviar resposta
    if (agentResult.shouldSendResponse === false) {
      console.log(` [WEBHOOK] Resposta suprimida conforme instruções do agente`);
      return;
    }

    // 2. Verificar se deve enviar áudio da Digital Boost
    if (agentResult.sendDigitalBoostAudio === true) {
      await handleDigitalBoostAudio(from, agentResult.response, messageId, originalText);
      return;
    }

    // 3.  UNIFIED MESSAGE - Combinar todas as partes em UMA mensagem
    const messageParts = [];

    if (agentResult.preHandoffMessage) {
      messageParts.push(agentResult.preHandoffMessage);
      console.log(` [UNIFIED] Pre-handoff adicionado (${agentResult.preHandoffMessage.length} chars)`);
    }

    if (agentResult.response) {
      messageParts.push(agentResult.response);
      console.log(` [UNIFIED] Resposta principal (${agentResult.response.length} chars)`);
    }

    if (agentResult.followUpMessage) {
      messageParts.push(agentResult.followUpMessage);
      console.log(` [UNIFIED] Follow-up adicionado (${agentResult.followUpMessage.length} chars)`);
    }

    const completeMessage = messageParts.join('\n\n');

    if (!completeMessage || completeMessage.trim().length === 0) {
      console.warn(` [WEBHOOK] Mensagem vazia, abortando envio`);
      return;
    }

    // 4.  Enviar via UnifiedMessageCoordinator (com dedup e retry)
    const sendResult = await sendResponseWithRetry(from, completeMessage, {
      messageId,
      priority: 'normal'
    });

    if (sendResult.sent) {
      console.log(` [WEBHOOK] Resposta enviada para ${from} (${completeMessage.length} chars)`);

      //  FIX: Registrar mensagem saída para detecção precisa de bots
      // Permite calcular tempo de resposta do lead com base no último envio do agente
      simpleBotDetector.recordOutgoingMessage(from);

      // 5. Persistir conversa
      await persistenceManager.saveConversation(from, originalText, completeMessage, {
        messageType: 'text',
        agentUsed: agentResult.source,
        success: true,
        tenantId
      });

      // 6.  SAVE CONVERSATION CONTEXT for intelligent follow-up
      // Only save if lead has cadence data (came from prospecting)
      if (agentResult.cadenceDay || agentResult.leadId) {
        try {
          const contextService = getConversationContextService();

          // Add current messages to history
          const updatedHistory = [
            ...(agentResult.conversationHistory || []),
            { role: 'user', content: originalText },
            { role: 'assistant', content: completeMessage }
          ];

          await contextService.saveConversationContext(from, {
            leadId: agentResult.leadId || from,
            cadenceDay: agentResult.cadenceDay || 1,
            leadState: agentResult.leadState || {},
            conversationHistory: updatedHistory,
            lastLeadMessage: originalText,
            lastAgentMessage: completeMessage,
            tenantId
          });

          console.log(` [CONTEXT] Conversation context saved for ${from} (D${agentResult.cadenceDay || 1})`);
        } catch (contextError) {
          console.error(` [CONTEXT] Failed to save context:`, contextError.message);
          // Non-blocking error - don't fail the response
        }
      }
    } else {
      console.warn(` [WEBHOOK] Resposta não enviada: ${sendResult.error || 'unknown'}`);
    }

  } catch (error) {
    console.error(` [WEBHOOK] Erro ao enviar resposta:`, error);
  }
}

/**
 * Handle Digital Boost audio message flow
 * @param {string} from - Contact ID
 * @param {string} textResponse - Text response
 * @param {string} messageId - Message ID
 * @param {string} originalText - Original message text
 */
async function handleDigitalBoostAudio(from, textResponse, messageId, originalText) {
  try {
    console.log(` [DIGITAL-BOOST] Preparando fluxo de áudio para ${from}`);

    // 1. Enviar mensagem de texto primeiro
    await sendResponseWithRetry(from, textResponse, {
      messageId,
      originalMessage: originalText
    });

    // 2. Aguardar 1 segundo e enviar áudio
    setTimeout(async () => {
      try {
        // Import do serviço de Digital Boost Audio
        const { sendDigitalBoostAudio } = await import('../../services/digital_boost_audio_service.js');
        await sendDigitalBoostAudio(from);

        console.log(` [DIGITAL-BOOST] Fluxo de áudio completo para ${from}`);

        // 3. Persistir conversa incluindo áudio
        const { DIGITAL_BOOST_AUDIO_SCRIPT } = await import('../../tools/digital_boost_explainer.js');
        const audioContentForHistory = `[Enviei áudio explicativo]\n${DIGITAL_BOOST_AUDIO_SCRIPT.trim()}`;

        await persistenceManager.saveConversation(from, originalText, audioContentForHistory, {
          messageType: 'text',
          agentUsed: 'DigitalBoostExplainer',
          audioSent: true,
          success: true,
          tenantId
        });

      } catch (audioError) {
        console.error(` [DIGITAL-BOOST] Erro ao enviar áudio:`, audioError);

        // Fallback: enviar texto se áudio falhar
        await sendResponseWithRetry(from,
          'Tive um problema ao gerar o áudio. Posso te explicar por mensagem de texto?'
        );
      }
    }, 1000);

  } catch (error) {
    console.error(` [DIGITAL-BOOST] Erro no handler:`, error);
  }
}

// ==================== HEALTH CHECK ====================

/**
 * Health check endpoint
 * Shows stats from the canonical persistent pipeline (P0.2)
 */
router.get('/api/webhook/health', (req, res) => {
  const asyncJobsStats = asyncJobs.getStats();
  const inboundEventsStats = inboundEvents.getStats();

  res.json({
    status: 'healthy',
    timestamp: Date.now(),
    version: 'v4.0.0-CanonicalPipeline',

    // P0.2: Persistent Job Queue (replaced in-memory MessageQueue)
    asyncJobs: {
      pending: asyncJobsStats.pending,
      processing: asyncJobsStats.processing,
      completed: asyncJobsStats.completed,
      failed: asyncJobsStats.failed,
      retrying: asyncJobsStats.retrying,
      processorRunning: asyncJobsStats.processorRunning
    },

    // P0.1: Inbound Events Staging (idempotency via DB)
    inboundEvents: {
      staged: inboundEventsStats.staged,
      processing: inboundEventsStats.processing,
      processed: inboundEventsStats.processed,
      skipped: inboundEventsStats.skipped,
      error: inboundEventsStats.error,
      duplicatesBlocked: inboundEventsStats.duplicatesBlocked
    },

    server: {
      webhooksReceived: serverStats.webhooksReceived,
      messagesProcessed: serverStats.messagesProcessed
    },

    migration: {
      legacyEndpointStatus: '410 Gone',
      canonicalEndpoint: '/api/webhooks/inbound/:webhookPublicId',
      documentation: '/ARCHITECTURE_DECISIONS.md'
    }
  });
});

// ==================== ADMIN ENDPOINTS ====================

/**
 * Get coordinator statistics
 */
router.get('/api/webhook/coordinator/stats', (req, res) => {
  res.status(410).json({
    success: false,
    error: 'ENDPOINT_REMOVED',
    message: 'UnifiedMessageCoordinator stats endpoint has been removed.',
    timestamp: Date.now()
  });
});

/**
 * Emergency cleanup (use with caution!)
 */
router.post('/api/webhook/coordinator/emergency-cleanup', (req, res) => {
  res.status(410).json({
    success: false,
    error: 'ENDPOINT_REMOVED',
    message: 'UnifiedMessageCoordinator cleanup endpoint has been removed.',
    timestamp: Date.now()
  });
});

export default router;

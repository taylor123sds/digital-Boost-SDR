/**
 * @file webhook.routes.v2.js
 * @description Clean Architecture Webhook Routes (Wave 6)
 * Uses WebhookController and application use cases
 *
 * This is the refactored version using clean architecture principles.
 * To enable, rename this file to webhook.routes.js (backup the old one first)
 */

import express from 'express';
import { WebhookHandler } from '../../handlers/webhook_handler.js';
import { createWebhookController } from '../controllers/WebhookController.js';
import { MessageCoordinator } from '../../handlers/MessageCoordinator.js';
import globalErrorHandler from '../../utils/error_handler.js';
import { rateLimitWebhook } from '../../middleware/rate-limiter.js';
import { validateWebhookRequest } from '../../middleware/input-validation.js';
import { serverStats } from '../../config/express.config.js';
import { getContainer } from '../../config/di-container.js';

const router = express.Router();

// Initialize components
const webhookHandler = new WebhookHandler();
const messageCoordinator = new MessageCoordinator();

// WebhookController will be lazily initialized
let webhookController = null;

/**
 * Initialize WebhookController
 * @returns {Promise<WebhookController>}
 */
async function getWebhookController() {
  if (!webhookController) {
    const container = getContainer();
    webhookController = await createWebhookController(container);
  }
  return webhookController;
}

/**
 * WEBHOOK ÚNICO - CLEAN ARCHITECTURE VERSION
 * Recebe mensagens do Evolution API (WhatsApp)
 */
router.post('/api/webhook/evolution', rateLimitWebhook, validateWebhookRequest, async (req, res) => {
  try {
    // Resposta imediata para Evolution API (evita timeout)
    res.status(200).json({
      received: true,
      timestamp: Date.now(),
      server: 'ORBION-Wave6'
    });

    serverStats.webhooksReceived++;
    console.log(`🔵 [WAVE6] Webhook #${serverStats.webhooksReceived} - Iniciando processamento`);

    // Importar MessageQueue
    const { MessageQueue } = await import('../../utils/message-queue.js');
    const messageQueue = new MessageQueue();

    // Processar assincronamente usando fila
    messageQueue.enqueue(req.body, async (webhookData) => {
      console.log(`🟢 [WAVE6] Callback da fila executado para webhook #${serverStats.webhooksReceived}`);

      await globalErrorHandler.safeAsync('WEBHOOK_PROCESSING', async () => {
        console.log(`🎯 [WAVE6] Webhook recebido #${serverStats.webhooksReceived}`);

        // ============================================================
        // ETAPA 1: VALIDAÇÃO E DEDUPLICAÇÃO (WebhookHandler)
        // ============================================================
        const validated = await webhookHandler.handleWebhook(webhookData);

        // Ignorar webhooks inválidos
        if (validated.status === 'duplicate') {
          console.log(`⚠️ [WAVE6] Webhook duplicado ignorado: ${validated.messageId}`);
          return;
        }

        if (validated.status === 'ignored') {
          console.log(`⚠️ [WAVE6] Webhook ignorado: ${validated.reason}`);
          return;
        }

        if (validated.status === 'blocked') {
          console.log(`🚫 [WAVE6] Webhook bloqueado: ${validated.reason}`);
          return;
        }

        if (validated.status === 'bot_detected') {
          console.log(`🤖 [WAVE6] Bot detectado: ${validated.contactId}, ação: ${validated.action}`);

          if (validated.action === 'send_bridge_message') {
            // Send bridge message to verify human
            const { sendResponse } = await import('../../handlers/response_manager.js');
            await sendResponse(validated.from, validated.bridgeMessage, {
              priority: 'high',
              source: 'bot_detector'
            });
            console.log(`📬 [WAVE6] Bridge message enviado para ${validated.from}`);
          }
          return;
        }

        if (validated.status !== 'valid') {
          console.log(`⚠️ [WAVE6] Webhook inválido: ${validated.status}`);
          return;
        }

        const { from, text, messageType, metadata } = validated;
        serverStats.messagesProcessed++;

        console.log(`📱 [WAVE6] Processando mensagem de ${from}: "${(text || '').toString().substring(0, 50)}..."`);

        // ============================================================
        // ETAPA 2: PROCESSAMENTO DE ÁUDIO (se aplicável)
        // ============================================================
        if (messageType === 'audio' && metadata.needsTranscription) {
          console.log(`🎤 [WAVE6] Áudio detectado, processamento assíncrono`);

          // Send immediate acknowledgment
          const controller = await getWebhookController();
          await controller.sendMessageUseCase.execute({
            phoneNumber: from,
            text: '🎤 Recebi seu áudio! Estou processando... ⏳',
            type: 'text'
          });

          // Process audio asynchronously
          const audioProcessor = await import('../../handlers/audio_processor.js');
          audioProcessor.default.processAudio(validated.messageId, metadata.audioData, metadata)
            .then(async transcribedText => {
              console.log(`✅ [WAVE6] Transcrição completa: "${transcribedText.substring(0, 100)}..."`);

              const updatedMessage = {
                text: transcribedText,
                messageType: 'audio_transcribed',
                metadata: {
                  ...metadata,
                  originalAudio: true,
                  transcriptionCompleted: true
                },
                timestamp: Date.now(),
                messageId: `${validated.messageId}_transcribed`,
                from
              };

              // Re-enqueue transcribed message
              messageQueue.enqueue(updatedMessage, async (msg) => {
                await messageCoordinator.enqueueMessage(msg.from, msg);
              });
            })
            .catch(async error => {
              console.error(`❌ [WAVE6] Erro na transcrição:`, error);

              try {
                await controller.sendMessageUseCase.execute({
                  phoneNumber: from,
                  text: '🎤 Desculpe, não consegui processar seu áudio. Por favor, envie uma mensagem de texto.',
                  type: 'text'
                });
              } catch (sendError) {
                console.error(`❌ [WAVE6] Falha ao enviar mensagem de fallback:`, sendError);
              }
            });

          // Don't process audio message further
          return;
        }

        // ============================================================
        // ETAPA 3: ENFILEIRAMENTO (MessageCoordinator)
        // ============================================================
        const coordinatorResult = await messageCoordinator.enqueueMessage(from, {
          text,
          messageType,
          metadata,
          timestamp: Date.now(),
          messageId: validated.messageId
        });

        if (coordinatorResult.status === 'duplicate') {
          console.log(`🔄 [WAVE6] MessageCoordinator: Duplicata detectada e ignorada para ${from}`);
          return;
        }

        if (coordinatorResult.status === 'batched') {
          console.log(`📦 [WAVE6] MessageCoordinator: Mensagem adicionada ao batch para ${from}`);
          return;
        }

        // ============================================================
        // ETAPA 4: DEQUEUE (pegar próxima mensagem da fila)
        // ============================================================
        const nextMessage = await messageCoordinator.dequeueMessage(from);

        if (!nextMessage) {
          console.log(`⚠️ [WAVE6] MessageCoordinator: Nenhuma mensagem na fila para ${from}`);
          return;
        }

        // ============================================================
        // ETAPA 5: VERIFICAR OPT-OUT
        // ============================================================
        const controller = await getWebhookController();

        const optOutResult = await controller.handleOptOut(from, nextMessage.message.text);

        if (optOutResult.isOptOut) {
          console.log(`🚫 [WAVE6] Lead ${from} fez opt-out: ${optOutResult.reason}`);
          messageCoordinator.markProcessingComplete(from);
          return;
        }

        // ============================================================
        // ETAPA 6: PROCESSAR MENSAGEM VIA USE CASE (Clean Architecture!)
        // ============================================================
        console.log('🚀 [WAVE6] Processando via ProcessIncomingMessageUseCase');

        const result = await controller.handleIncomingMessage({
          from,
          text: nextMessage.message.text,
          messageType: nextMessage.message.messageType,
          metadata: nextMessage.message.metadata,
          messageId: validated.messageId
        }, {
          waitTime: nextMessage.waitTime,
          attempts: nextMessage.attempts
        });

        if (!result.success) {
          console.error(`❌ [WAVE6] Erro no processamento:`, result.error);
          messageCoordinator.markProcessingComplete(from);
          return;
        }

        console.log(`✅ [WAVE6] Processamento completo para ${from}`);
        console.log(`   - Resposta enviada: ${result.responseSent ? 'SIM' : 'NÃO'}`);
        if (!result.responseSent && result.reason) {
          console.log(`   - Motivo: ${result.reason}`);
        }

        // ============================================================
        // ETAPA 7: MARCAR COMO COMPLETO
        // ============================================================
        messageCoordinator.markProcessingComplete(from);

        console.log(`✅ [WAVE6] Webhook #${serverStats.webhooksReceived} processado com sucesso`);
      });
    });

  } catch (error) {
    console.error('❌ [WAVE6] Erro crítico no processamento:', error);
    globalErrorHandler.logError('EVOLUTION_WEBHOOK', error, {
      contactId: req.body?.data?.key?.remoteJid,
      messageId: req.body?.data?.key?.id
    });
  }
});

export default router;

/**
 * @file webhook.routes.js
 * @description Rotas de webhook do Evolution API (WhatsApp)
 * Extraído de server.js (linhas 149-543)
 */

import express from 'express';
import webhookHandler from '../../handlers/webhook_handler.js';
import responseManager from '../../handlers/response_manager.js';
import persistenceManager from '../../handlers/persistence_manager.js';
import messageCoordinator from '../../handlers/MessageCoordinator.js';
import audioProcessor from '../../handlers/audio_processor.js';
import globalErrorHandler from '../../utils/error_handler.js';
import { rateLimitWebhook } from '../../middleware/rate-limiter.js';
import { validateWebhookRequest } from '../../middleware/input-validation.js';
import { serverStats } from '../../config/express.config.js';

const router = express.Router();

/**
 * WEBHOOK ÚNICO - PONTO CENTRAL DE ENTRADA
 * Recebe mensagens do Evolution API (WhatsApp)
 */
router.post('/api/webhook/evolution', rateLimitWebhook, validateWebhookRequest, async (req, res) => {
  try {
    // Resposta imediata para Evolution API
    res.status(200).json({
      received: true,
      timestamp: Date.now(),
      server: 'ORBION-Fixed'
    });

    serverStats.webhooksReceived++;
    console.log(`🔵 [DEBUG] Webhook #${serverStats.webhooksReceived} - Iniciando enqueue`);

    // Importar MessageQueue
    const { MessageQueue } = await import('../../utils/message-queue.js');
    const messageQueue = new MessageQueue();

    // ✅ FIX CRÍTICO: Usar fila em vez de setImmediate para evitar race conditions
    messageQueue.enqueue(req.body, async (webhookData) => {
      console.log(`🟢 [DEBUG] Callback da fila executado para webhook #${serverStats.webhooksReceived}`);

      await globalErrorHandler.safeAsync('WEBHOOK_PROCESSING', async () => {
        console.log(`🎯 Webhook recebido #${serverStats.webhooksReceived}`);

        // 1. Handler único de webhook (elimina duplicações)
        const validated = await webhookHandler.handleWebhook(webhookData);

        if (validated.status === 'duplicate') {
          console.log(`⚠️ Webhook duplicado ignorado: ${validated.messageId}`);
          return;
        }

        if (validated.status !== 'valid') {
          console.log(`⚠️ Webhook inválido: ${validated.status}`);
          return;
        }

        const { from, text, messageType, metadata } = validated;
        serverStats.messagesProcessed++;

        console.log(`📱 Processando mensagem de ${from}: "${(text || '').toString().substring(0, 50)}..."`);

        // 🎤 PROCESSAMENTO ASSÍNCRONO DE ÁUDIO (CORRIGIDO)
        if (validated.messageType === 'audio' && metadata.needsTranscription) {
          console.log(`🚀 [AUDIO] Iniciando transcrição assíncrona para ${from}`);

          // Enviar resposta imediata PRIMEIRO
          const audioAckResult = await responseManager.sendResponse(from,
            '🎤 Recebi seu áudio! Estou processando... ⏳',
            { messageId: validated.messageId, isAudioAck: true }
          );

          if (audioAckResult.sent) {
            console.log(`📞 [AUDIO] Confirmação de áudio enviada para ${from}`);
          }

          // ✅ FIX GRAVE #4: Processar áudio com error handling robusto
          audioProcessor.processAudio(validated.messageId, metadata.audioData, metadata)
            .then(async transcribedText => {
              console.log(`✅ [AUDIO] Transcrição completa: "${transcribedText.substring(0, 100)}..."`);

              try {
                // ✅ FIX CRÍTICO: Usar fila para processar mensagem transcrita
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

                messageQueue.enqueue(updatedMessage, async (msg) => {
                  // CORRIGIDO: Adicionar à fila como nova mensagem (não re-enfileirar)
                  await messageCoordinator.enqueueMessage(msg.from, msg);
                });
              } catch (enqueueError) {
                console.error(`❌ [AUDIO] Erro ao enfileirar mensagem transcrita:`, enqueueError);
              }
            })
            .catch(async error => {
              console.error(`❌ [AUDIO] Erro na transcrição assíncrona:`, error);

              // ✅ FIX GRAVE #4: Await fallback message send with error handling
              try {
                await responseManager.sendResponse(from,
                  '🎤 Desculpe, não consegui processar seu áudio. Por favor, envie uma mensagem de texto.',
                  { messageId: validated.messageId, priority: 'high' }
                );
                console.log(`✅ [AUDIO] Mensagem de fallback enviada para ${from}`);
              } catch (sendError) {
                console.error(`❌ [AUDIO] Falha ao enviar mensagem de fallback para ${from}:`, sendError);
                // Log para monitoring/alerting system
                globalErrorHandler.logError('AUDIO_FALLBACK_FAILED', sendError, {
                  contactId: from,
                  messageId: validated.messageId
                });
              }
            });

          // ✅ FIX CRÍTICO: Não processar mensagem de áudio assincronamente no fluxo normal
          // O áudio será processado em background e uma nova mensagem será enfileirada depois
          console.log(`🎤 [AUDIO] Áudio em processamento assíncrono - ignorando fluxo normal`);
          return;
        }

        // 2. MessageCoordinator: enfileira mensagem com detecção de duplicatas e batching
        const coordinatorResult = await messageCoordinator.enqueueMessage(from, {
          text,
          messageType,
          metadata,
          timestamp: Date.now(),
          messageId: validated.messageId
        });

        if (coordinatorResult.status === 'duplicate') {
          console.log(`🔄 MessageCoordinator: Duplicata detectada e ignorada para ${from}`);
          return;
        }

        if (coordinatorResult.status === 'batched') {
          console.log(`📦 MessageCoordinator: Mensagem adicionada ao batch para ${from}`);
          return;
        }

        // 3. Processar próxima mensagem da fila (FIFO)
        // ✅ FIX BLOCKER #2: dequeueMessage is now async
        const nextMessage = await messageCoordinator.dequeueMessage(from);

        if (!nextMessage) {
          console.log(`⚠️ MessageCoordinator: Nenhuma mensagem na fila para ${from}`);
          return;
        }

        // 🚨 OPT-OUT: Verificar se o lead quer sair ANTES de processar
        const { classifyOptOutIntent } = await import('../../tools/intelligent_opt_out.js');
        const optOutCheck = classifyOptOutIntent(nextMessage.message.text, from);

        if (optOutCheck.type === 'definitive_opt_out') {
          console.log(`🚫 [OPT-OUT] Lead ${from} pediu para sair: ${optOutCheck.reason}`);

          // Enviar mensagem de confirmação usando responseManager
          await responseManager.sendResponse(from, optOutCheck.message, {
            priority: 'high',
            source: 'opt_out_system'
          });

          // Marcar lead como opted-out no banco
          const { db } = await import('../../memory.js');
          db.prepare(`INSERT OR REPLACE INTO memory (key, value) VALUES (?, ?)`).run(
            `opt_out_${from}`,
            JSON.stringify({ opted_out: true, date: new Date().toISOString(), reason: optOutCheck.reason })
          );

          console.log(`✅ [OPT-OUT] Lead ${from} removido da lista com sucesso`);
          return; // Não processar mensagem
        }

        // 🚀 SEPARAÇÃO CRÍTICA: WhatsApp usa sistema MULTI-AGENTE (SDR → Specialist → Scheduler)
        console.log('📱 [WHATSAPP-MULTI-AGENT] Processamento via AgentHub - sistema 3 agentes');

        const { getAgentHub } = await import('../../agents/agent_hub_init.js');

        const result = await globalErrorHandler.safeAsync(
          'WHATSAPP_DIRECT_PROCESSING',
          async () => {
            try {
              // 🔥 CARREGAR HISTÓRICO DO BANCO DE DADOS
              const { db } = await import('../../memory.js');
              const historyRows = db.prepare(`
                SELECT message_text, from_me, created_at
                FROM whatsapp_messages
                WHERE phone_number = ?
                ORDER BY created_at DESC
                LIMIT 20
              `).all(from);

              // Inverter ordem (mais antigas primeiro) e formatar
              const history = historyRows.reverse().map(row => ({
                role: row.from_me ? 'assistant' : 'user',
                content: row.message_text,
                timestamp: row.created_at
              }));

              console.log(`📚 [HISTORY] Carregadas ${history.length} mensagens anteriores para ${from}`);

              // Usar AgentHub ao invés de chatHandler
              const agentHub = getAgentHub();
              const agentResult = await agentHub.processMessage({
                fromContact: from,
                text: nextMessage.message.text
              }, {
                messageType: nextMessage.message.messageType,
                metadata: nextMessage.message.metadata,
                hasHistory: history.length > 0,
                waitTime: nextMessage.waitTime,
                attempts: nextMessage.attempts,
                from: from,
                fromWhatsApp: true,
                platform: 'whatsapp'
              });

              // Ensure the result is serializable
              if (typeof agentResult === 'object' && agentResult !== null) {
                // Create a clean, serializable object
                const cleanResult = {
                  response: agentResult.message || agentResult.response || agentResult.answer || 'Resposta processada',
                  success: agentResult.success !== false,
                  source: agentResult.source || 'agent',
                  timestamp: Date.now(),
                  sendDigitalBoostAudio: agentResult.sendDigitalBoostAudio || false,
                  contactId: agentResult.contactId
                };

                // ✅ FIX: Adicionar followUpMessage se existir (para transições de stage)
                if (agentResult.followUpMessage) {
                  cleanResult.followUpMessage = agentResult.followUpMessage;
                  console.log(`🔀 [SERVER] Follow-up detectado: "${agentResult.followUpMessage.substring(0, 60)}..."`);
                }

                return cleanResult;
              }

              // Fallback for non-object responses
              return {
                response: String(agentResult || 'Resposta processada'),
                success: true,
                source: 'agent',
                timestamp: Date.now()
              };

            } catch (agentError) {
              console.error('🚨 Erro no processamento do agente:', agentError.message);
              return {
                response: 'Desculpe, houve um problema no processamento. Pode repetir?',
                success: false,
                source: 'error',
                error: agentError.message,
                timestamp: Date.now()
              };
            }
          },
          { contactId: from, messageText: text }
        );

        // Handle the safeAsync wrapper response format
        let processedResult;
        if (result && result.success && result.data) {
          // If wrapped by safeAsync, extract the data
          processedResult = result.data;
        } else if (result && result.response) {
          // Direct result format
          processedResult = result;
        } else {
          console.log(`⚠️ Resultado inválido do processamento:`, result);
          return;
        }

        if (!processedResult || !processedResult.response) {
          console.log(`⚠️ Resultado processado inválido:`, processedResult);
          return;
        }

        // 🎤 VERIFICAR SE DEVE ENVIAR RESPOSTA (áudio em processamento não deve)
        if (processedResult.shouldSendResponse === false) {
          console.log(`🎤 [SERVER] Resposta suprimida conforme instruções do agent`);
          return;
        }

        // 🎯 VERIFICAR SE DEVE ENVIAR ÁUDIO DA DIGITAL BOOST
        if (processedResult.sendDigitalBoostAudio === true) {
          console.log(`🎤 [DIGITAL-BOOST] Detectado pedido de áudio explicativo`);

          // Enviar mensagem de texto primeiro
          await responseManager.sendResponse(from, processedResult.response, {
            messageId: validated.messageId,
            originalMessage: text
          });

          // Aguardar 1 segundo e enviar áudio
          setTimeout(async () => {
            try {
              await responseManager.sendDigitalBoostAudio(from);
              console.log(`✅ [DIGITAL-BOOST] Fluxo de áudio completo para ${from}`);
            } catch (audioError) {
              console.error(`❌ [DIGITAL-BOOST] Erro ao enviar áudio:`, audioError);
              // Enviar fallback em texto se áudio falhar
              await responseManager.sendResponse(from, "Tive um problema ao gerar o áudio. Posso te explicar por mensagem de texto?");
            }
          }, 1000);

          // Persistir conversa incluindo conteúdo do áudio no histórico
          const { DIGITAL_BOOST_AUDIO_SCRIPT } = await import('../../tools/digital_boost_explainer.js');
          const audioContentForHistory = `[Enviei áudio explicativo]\n${DIGITAL_BOOST_AUDIO_SCRIPT.trim()}`;

          await persistenceManager.saveConversation(
            from,
            nextMessage.message.text,
            audioContentForHistory,
            {
              messageType: nextMessage.message.messageType,
              agentUsed: 'DigitalBoostExplainer',
              audioSent: true,
              success: true
            }
          );

          messageCoordinator.markProcessingComplete(from);
          return;
        }

        // 5. Response Manager envia SEM DUPLICAR
        console.log(`🔍 [DEBUG-CRITICAL] ANTES DE ENVIAR:`);
        console.log(`   - processedResult.response: "${processedResult.response?.substring(0, 100)}..."`);
        console.log(`   - typeof: ${typeof processedResult.response}`);
        console.log(`   - processedResult completo:`, JSON.stringify(processedResult, null, 2));

        // ✅ FIX CRÍTICO: UNIFIED MESSAGE LOGIC - Combinar todas as partes em UMA mensagem
        // Evita duplicação combinando preHandoffMessage + response + followUpMessage
        let completeMessage = '';
        const messageParts = [];

        // 1. Add pre-handoff message (if exists)
        if (processedResult.preHandoffMessage) {
          messageParts.push(processedResult.preHandoffMessage);
          console.log(`📋 [UNIFIED-MESSAGE] Adicionado preHandoffMessage (${processedResult.preHandoffMessage.length} chars)`);
        }

        // 2. Add main response
        if (processedResult.response) {
          messageParts.push(processedResult.response);
          console.log(`📋 [UNIFIED-MESSAGE] Adicionado response principal (${processedResult.response.length} chars)`);
        }

        // 3. Add follow-up message (if exists)
        if (processedResult.followUpMessage) {
          messageParts.push(processedResult.followUpMessage);
          console.log(`📋 [UNIFIED-MESSAGE] Adicionado followUpMessage (${processedResult.followUpMessage.length} chars)`);
        }

        // Join all parts with double line breaks for readability
        completeMessage = messageParts.join('\n\n');

        console.log(`📤 [UNIFIED-MESSAGE] Enviando MENSAGEM ÚNICA com ${messageParts.length} parte(s)`);
        console.log(`📤 [UNIFIED-MESSAGE] Tamanho total: ${completeMessage.length} caracteres`);

        // ✅ SINGLE SEND - No more duplicates!
        const sendResult = await responseManager.sendResponse(from, completeMessage, {
          messageId: validated.messageId,
          originalMessage: text,
          userMessage: text,
          hasMultipleParts: messageParts.length > 1,
          messageParts: messageParts.length
        });

        if (!sendResult.sent) {
          console.log(`⚠️ Resposta não enviada: ${sendResult.reason}`);
          return;
        }

        // 6. Persistence Manager salva UMA VEZ com mensagem completa
        const fullResponse = completeMessage;

        await persistenceManager.saveConversation(
          from,
          nextMessage.message.text,
          fullResponse,
          {
            messageType: nextMessage.message.messageType,
            agentUsed: processedResult.agentUsed || 'SDRAgent', // Default to SDR agent (3-agent system)
            processingTime: processedResult.processingTime,
            waitTime: nextMessage.waitTime,
            messageParts: messageParts.length, // Track combined message parts
            isUnifiedMessage: messageParts.length > 1, // Flag unified messages
            success: true
          }
        );

        // 7. Marcar processamento como completo no MessageCoordinator
        messageCoordinator.markProcessingComplete(from);

        console.log(`✅ Processamento completo - Webhook #${serverStats.webhooksReceived}`);
      });
    });
  } catch (error) {
    console.error('❌ [WEBHOOK] Erro crítico no processamento:', error);
    // Don't re-send response - already sent at line 151
    globalErrorHandler.logError('EVOLUTION_WEBHOOK', error, {
      contactId: req.body?.data?.key?.remoteJid,
      messageId: req.body?.data?.key?.id
    });
  }
});

export default router;

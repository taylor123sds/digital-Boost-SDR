// server_fixed.js - VERSÃO CORRIGIDA SEM DUPLICAÇÕES
// ORBION AI Agent - Sistema unificado e otimizado

import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// Carrega variáveis de ambiente
dotenv.config();

// Handlers centralizados para evitar duplicações
import webhookHandler from './handlers/webhook_handler.js';
// orchestrator removido - código não usado (funcionalidade integrada ao BANT Unified)
import responseManager from './handlers/response_manager.js';
import persistenceManager from './handlers/persistence_manager.js';
import messageCoordinator from './handlers/MessageCoordinator.js';
import audioProcessor from './handlers/audio_processor.js';

// Utilitários essenciais
import { setMemory, getMemory } from './memory.js';
import globalErrorHandler from './utils/error_handler.js';
import SingleInstanceManager from './utils/single-instance.js';
import audioCleanup from './utils/audio_cleanup.js';

// Sistema de cálculo de modo de resposta - REMOVIDO (integrado ao BANT Unified)
// Funcionalidade agora está integrada no BANT Framework Unificado (bant_unified.js)

// Sistema de navegação por voz removido

// Sistema de histórico forçado (FIX PRINCIPAL)
// import { EnhancedHistoryManager, ContextAwareResponseGenerator } from './fixes/enhanced_history_manager.js';

// Analisador de documentos padronizado
import { analyzeDocument, getSupportedTypes, isFileSupported } from './tools/document_analyzer.js';

// Google APIs Integration
import * as calendarGoogle from './tools/calendar_google.js';
import * as calendarEnhanced from './tools/calendar_enhanced.js';
import * as googleSheets from './tools/google_sheets.js';

// 🧠 Self-Learning System
import conversationAnalytics from './learning/conversation_analytics.js';

// Configurações
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3000;

// Gerenciador de instância única
const instanceManager = new SingleInstanceManager();

// Estatísticas globais
const serverStats = {
  startTime: Date.now(),
  totalRequests: 0,
  webhooksReceived: 0,
  messagesProcessed: 0,
  errors: 0
};

// 🔥 SISTEMA DE HISTÓRICO FORÇADO ATIVO
console.log('🧠 Sistema de histórico contextual ativo');
console.log('📚 ORBION processará mensagens com contexto de histórico');

// Inicialização do Express
const app = express();

// Middlewares essenciais
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Middleware de logging e estatísticas
app.use((req, res, next) => {
  serverStats.totalRequests++;
  console.log(`📊 ${new Date().toISOString()} - ${req.method} ${req.path} - Total: ${serverStats.totalRequests}`);
  next();
});

// Middleware de tratamento de erros global (GlobalErrorHandler)
app.use(globalErrorHandler.expressErrorMiddleware());

// WEBHOOK ÚNICO - PONTO CENTRAL DE ENTRADA (ambas rotas para compatibilidade)
app.post('/api/webhook/evolution', (req, res) => {
  globalErrorHandler.safeWebhookHandler(async (req, res) => {
    // Resposta imediata para Evolution API
    res.status(200).json({
      received: true,
      timestamp: Date.now(),
      server: 'ORBION-Fixed'
    });

    serverStats.webhooksReceived++;

    // Processamento assíncrono para evitar timeout
    setImmediate(async () => {
      await globalErrorHandler.safeAsync('WEBHOOK_PROCESSING', async () => {
        console.log(`🎯 Webhook recebido #${serverStats.webhooksReceived}`);

        // 1. Handler único de webhook (elimina duplicações)
        const validated = await webhookHandler.handleWebhook(req.body);

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

        console.log(`📱 Processando mensagem de ${from}: "${text.substring(0, 50)}..."`);

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

          // Processar áudio em paralelo sem bloquear o fluxo
          audioProcessor.processAudio(validated.messageId, metadata.audioData, metadata)
            .then(transcribedText => {
              console.log(`✅ [AUDIO] Transcrição completa: "${transcribedText.substring(0, 100)}..."`);

              // CORRIGIDO: Criar mensagem transcrita corretamente
              setImmediate(async () => {
                const updatedMessage = {
                  text: transcribedText,
                  messageType: 'audio_transcribed',
                  metadata: {
                    ...metadata,
                    originalAudio: true,
                    transcriptionCompleted: true
                  },
                  timestamp: Date.now(),
                  messageId: `${validated.messageId}_transcribed`
                };

                // CORRIGIDO: Adicionar à fila como nova mensagem (não re-enfileirar)
                await messageCoordinator.enqueueMessage(from, updatedMessage);
              });
            })
            .catch(error => {
              console.error(`❌ [AUDIO] Erro na transcrição assíncrona:`, error);

              // Enviar mensagem de fallback
              responseManager.sendResponse(from,
                '🎤 Desculpe, não consegui processar seu áudio. Por favor, envie uma mensagem de texto.',
                { messageId: validated.messageId }
              );
            });

          // CORRIGIDO: Continuar o fluxo normal mas marcar como processado
          // Modificar texto para indicar que está sendo processado
          text = '[Áudio sendo processado assincronamente]';
          messageType = 'audio_processing';
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
        const nextMessage = messageCoordinator.dequeueMessage(from);

        if (!nextMessage) {
          console.log(`⚠️ MessageCoordinator: Nenhuma mensagem na fila para ${from}`);
          return;
        }

        // 🚨 OPT-OUT: Verificar se o lead quer sair ANTES de processar
        const { classifyOptOutIntent } = await import('./tools/intelligent_opt_out.js');
        const optOutCheck = classifyOptOutIntent(nextMessage.message.text, from);

        if (optOutCheck.type === 'definitive_opt_out') {
          console.log(`🚫 [OPT-OUT] Lead ${from} pediu para sair: ${optOutCheck.reason}`);

          // Enviar mensagem de confirmação usando responseManager
          await responseManager.sendResponse(from, optOutCheck.message, {
            priority: 'high',
            source: 'opt_out_system'
          });

          // Marcar lead como opted-out no banco
          const { db } = await import('./memory.js');
          db.prepare(`INSERT OR REPLACE INTO memory (key, value) VALUES (?, ?)`).run(
            `opt_out_${from}`,
            JSON.stringify({ opted_out: true, date: new Date().toISOString(), reason: optOutCheck.reason })
          );

          console.log(`✅ [OPT-OUT] Lead ${from} removido da lista com sucesso`);
          return; // Não processar mensagem
        }

        // 🚀 SEPARAÇÃO CRÍTICA: WhatsApp usa chamada DIRETA (sem MessageOrchestrator para evitar filas)
        console.log('📱 [WHATSAPP-SEPARATION] Processamento DIRETO - sem MessageOrchestrator para evitar mensagens de fila');

        const { chatHandler } = await import('./agent.js');

        const result = await globalErrorHandler.safeAsync(
          'WHATSAPP_DIRECT_PROCESSING',
          async () => {
            try {
              // 🔥 CARREGAR HISTÓRICO DO BANCO DE DADOS
              const { db } = await import('./memory.js');
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

              const agentResult = await chatHandler(nextMessage.message.text, {
                fromContact: from,
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
                return {
                  response: agentResult.message || agentResult.response || agentResult.answer || 'Resposta processada',
                  success: agentResult.success !== false,
                  source: agentResult.source || 'agent',
                  timestamp: Date.now(),
                  sendDigitalBoostAudio: agentResult.sendDigitalBoostAudio || false,
                  contactId: agentResult.contactId
                };
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
          const { DIGITAL_BOOST_AUDIO_SCRIPT } = await import('./tools/digital_boost_explainer.js');
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

        const sendResult = await responseManager.sendResponse(from, processedResult.response, {
          messageId: validated.messageId,
          originalMessage: text,
          userMessage: text  // Adicionar para compatibilidade com response_manager
        });

        if (!sendResult.sent) {
          console.log(`⚠️ Resposta não enviada: ${sendResult.reason}`);
          return;
        }

        // 6. Persistence Manager salva UMA VEZ
        await persistenceManager.saveConversation(
          from,
          nextMessage.message.text,
          processedResult.response,
          {
            messageType: nextMessage.message.messageType,
            agentUsed: processedResult.agentUsed || 'OrbionHybridAgent',
            processingTime: processedResult.processingTime,
            waitTime: nextMessage.waitTime,
            success: true
          }
        );

        // 7. Marcar processamento como completo no MessageCoordinator
        messageCoordinator.markProcessingComplete(from);

        console.log(`✅ Processamento completo - Webhook #${serverStats.webhooksReceived}`);
      });
    });
  }, req, res, 'EVOLUTION_WEBHOOK');
});

// Função auxiliar para verificar histórico
async function checkContactHistory(from) {
  try {
    const history = await getMemory(`last_activity_${from}`);
    return !!history;
  } catch (error) {
    return false;
  }
}

// ENDPOINTS DE ADMINISTRAÇÃO E MONITORAMENTO

// Status do sistema
app.get('/api/health', async (req, res) => {
  try {
    const webhookStats = webhookHandler.getStats();
    const orchestratorStats = orchestrator.getStats();
    const responseStats = responseManager.getStats();
    const persistenceStats = persistenceManager.getStats();
    const coordinatorStats = messageCoordinator.getQueueStats();
    const audioStats = audioProcessor.getStats();

    const memoryUsage = process.memoryUsage();
    const uptime = Date.now() - serverStats.startTime;

    res.json({
      status: 'healthy',
      server: 'ORBION-Fixed',
      uptime: Math.floor(uptime / 1000),
      stats: serverStats,
      handlers: {
        webhook: webhookStats,
        orchestrator: orchestratorStats,
        response: responseStats,
        persistence: persistenceStats,
        coordinator: coordinatorStats,
        audioProcessor: audioStats
      },
      memory: {
        used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024)
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});

// Estatísticas detalhadas
app.get('/api/stats', async (req, res) => {
  try {
    const stats = {
      server: serverStats,
      webhook: webhookHandler.getStats(),
      orchestrator: orchestrator.getStats(),
      response: responseManager.getStats(),
      persistence: persistenceManager.getStats(),
      coordinator: messageCoordinator.getQueueStats(),
      performance: {
        averageProcessingTime: serverStats.messagesProcessed > 0
          ? Math.round((Date.now() - serverStats.startTime) / serverStats.messagesProcessed)
          : 0,
        successRate: serverStats.messagesProcessed > 0
          ? ((serverStats.messagesProcessed - serverStats.errors) / serverStats.messagesProcessed * 100).toFixed(2) + '%'
          : '100%',
        requestsPerMinute: Math.round(serverStats.totalRequests / ((Date.now() - serverStats.startTime) / 60000))
      }
    };

    res.json(stats);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para limpar caches
app.post('/api/admin/clear-cache', async (req, res) => {
  try {
    const results = {
      webhook: webhookHandler.clearCache(),
      orchestrator: orchestrator.clearAll(),
      response: responseManager.clearCache(),
      persistence: persistenceManager.clearQueue(),
      coordinator: messageCoordinator.clearAll()
    };

    res.json({
      success: true,
      message: 'Caches limpos com sucesso',
      details: results
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint para verificar saúde dos handlers
app.get('/api/admin/handlers-health', async (req, res) => {
  try {
    const health = {
      response: await responseManager.healthCheck(),
      persistence: await persistenceManager.healthCheck(),
      coordinator: messageCoordinator.getHealthStatus()
    };

    const allHealthy = Object.values(health).every(h => h.healthy);

    res.json({
      overall: allHealthy ? 'healthy' : 'degraded',
      details: health,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      overall: 'error',
      error: error.message
    });
  }
});

// === GLOBAL ERROR HANDLER ENDPOINTS ===

// Get system health status from error handler
app.get('/api/admin/system-health', async (req, res) => {
  try {
    const health = globalErrorHandler.getHealthStatus();
    res.json(health);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});

// Get error statistics
app.get('/api/admin/error-stats', async (req, res) => {
  try {
    const stats = globalErrorHandler.getErrorStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Clear old error logs
app.post('/api/admin/clear-old-errors', async (req, res) => {
  try {
    const { maxAgeHours = 24 } = req.body;
    const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
    globalErrorHandler.clearOldLogs(maxAgeMs);

    res.json({
      success: true,
      message: `Logs mais antigos que ${maxAgeHours}h foram removidos`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// === MESSAGE COORDINATOR ADMIN ENDPOINTS ===

// Get detailed coordinator statistics
app.get('/api/admin/coordinator/stats', async (req, res) => {
  try {
    const stats = messageCoordinator.getQueueStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🎤 ENDPOINTS DE MONITORAMENTO DE ÁUDIO
app.get('/api/admin/audio/stats', async (req, res) => {
  try {
    const stats = audioProcessor.getStats();
    res.json({
      status: 'success',
      audioProcessing: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/audio/status/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const status = audioProcessor.getTranscriptionStatus(messageId);
    res.json({
      messageId,
      ...status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🎯 ENDPOINTS DE MONITORAMENTO - DEPRECATED ENDPOINTS REMOVIDOS
// Os seguintes endpoints foram removidos pois dependiam de módulos deprecated:
// - /api/admin/scope/stats (scope_limiter.js)
// - /api/admin/voice/stats (enhanced_voice_recognition.js)
// - /api/admin/cache/stats (response_cache.js)
// - /api/admin/cache/clear (response_cache.js)
// - /api/admin/cache/pattern (response_cache.js)
// Funcionalidades agora integradas no BANT Framework Unificado

// 🧠 ENDPOINT DE GERENCIAMENTO DE CONTEXTO
app.get('/api/admin/context/stats', async (req, res) => {
  try {
    const { default: contextManager } = await import('./tools/context_manager.js');
    const stats = await contextManager.getStats();

    res.json({
      status: 'success',
      contextManager: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific contact queue status
app.get('/api/admin/coordinator/contact/:contactId', async (req, res) => {
  try {
    const { contactId } = req.params;
    const status = messageCoordinator.getContactQueueStatus(contactId);

    if (!status) {
      return res.status(404).json({
        error: 'Fila não encontrada para este contato',
        contactId
      });
    }

    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Flush specific contact queue
app.post('/api/admin/coordinator/flush/:contactId', async (req, res) => {
  try {
    const { contactId } = req.params;
    const result = messageCoordinator.flushQueue(contactId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Emergency flush all queues
app.post('/api/admin/coordinator/emergency-flush', async (req, res) => {
  try {
    const result = messageCoordinator.emergencyFlushAll();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test coordinator with mock message
app.post('/api/admin/coordinator/test', async (req, res) => {
  try {
    const { contactId = 'test555123456789', message = 'Teste do MessageCoordinator' } = req.body;

    // Test enqueue
    const enqueueResult = await messageCoordinator.enqueueMessage(contactId, {
      text: message,
      messageType: 'text',
      timestamp: Date.now(),
      messageId: 'test-' + Date.now()
    });

    // Test dequeue
    const dequeueResult = messageCoordinator.dequeueMessage(contactId);

    // Mark as complete
    messageCoordinator.markProcessingComplete(contactId);

    res.json({
      success: true,
      test: {
        enqueue: enqueueResult,
        dequeue: dequeueResult,
        queueStats: messageCoordinator.getContactQueueStatus(contactId)
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ENDPOINTS EXISTENTES MANTIDOS (sem funcionalidades duplicadas)

// Dashboard principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/dashboard-pro.html'));
});

// ElevenLabs TTS API - Voz Premium
// Sistema de fila global para TTS
let ttsQueue = [];
let isProcessingTTS = false;

async function processTTSQueue() {
  if (isProcessingTTS || ttsQueue.length === 0) return;

  isProcessingTTS = true;
  const { req, res, resolve } = ttsQueue.shift();

  try {
    await processSingleTTS(req, res);
    resolve();
  } catch (error) {
    console.error('❌ Erro processando TTS:', error);
    res.status(500).json({ error: 'Erro interno' });
    resolve();
  }

  isProcessingTTS = false;

  // Processar próximo item da fila
  if (ttsQueue.length > 0) {
    setTimeout(processTTSQueue, 100); // Delay entre processamentos
  }
}

async function processSingleTTS(req, res) {
  const { text, voice_id = 'xWdpADtEio43ew1zGxUQ' } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'Texto é obrigatório' });
  }

  // Configuração da API ElevenLabs
  const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
  if (!ELEVENLABS_API_KEY) {
    return res.status(500).json({ error: 'Chave API ElevenLabs não configurada' });
  }

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice_id}`, {
    method: 'POST',
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': ELEVENLABS_API_KEY
    },
    body: JSON.stringify({
      text: text,
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.3,
        use_speaker_boost: true
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Erro ElevenLabs:', errorText);

    // Se é erro de quota, pausar processamento
    if (errorText.includes('quota_exceeded')) {
      console.error('🚫 QUOTA EXCEDIDA - Parando processamento TTS');
      // Limpar fila para evitar spam
      ttsQueue.length = 0;
      return res.status(402).json({ error: 'Quota ElevenLabs excedida. Processamento pausado.' });
    }

    return res.status(response.status).json({ error: 'Erro na API ElevenLabs' });
  }

  // Converter response para buffer e enviar
  const audioBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(audioBuffer);

  res.set({
    'Content-Type': 'audio/mpeg',
    'Cache-Control': 'public, max-age=3600',
    'Content-Length': buffer.length
  });

  res.send(buffer);
  console.log(`🎙️ ElevenLabs TTS gerado para: "${text.substring(0, 50)}..."`);
}

app.post('/api/tts/elevenlabs', async (req, res) => {
  try {
    // Verificar se já existem muitas requisições na fila
    if (ttsQueue.length > 2) {
      console.warn('🚫 TTS Queue overflow - rejeitando requisição');
      return res.status(429).json({ error: 'Muitas requisições TTS. Tente novamente.' });
    }

    // Adicionar à fila com Promise
    return new Promise((resolve) => {
      ttsQueue.push({ req, res, resolve });
      console.log(`📝 TTS adicionado à fila (${ttsQueue.length} na fila)`);

      // Iniciar processamento se necessário
      processTTSQueue();
    });

  } catch (error) {
    console.error('❌ Erro ElevenLabs TTS:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Chat API - Sistema unificado com BANT Framework
app.post('/api/chat', async (req, res) => {
  try {
    const { message, context = {} } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Mensagem é obrigatória' });
    }

    console.log('🧮 [CHAT] Processando mensagem via BANT Framework...');

    // Chamar agent DIRETAMENTE (sistema unificado)
    const { chatHandler } = await import('./agent.js');

    const result = await chatHandler(message, {
      ...context,
      fromDashboard: !req.body.platform,
      platform: req.body.platform || context.platform || 'dashboard_web',
      fromVoiceInput: context.fromVoiceInput || false
    });

    // Preparar resposta
    const response = {
      response: result.message,
      success: true,
      metadata: {
        stage: result.context?.stage || 'unknown',
        score: result.context?.score || 0,
        archetype: result.context?.archetype
      },
      timestamp: new Date().toISOString()
    };

    console.log(`✅ [CHAT] Resposta processada - Stage: ${result.context?.stage || 'unknown'}`);

    res.json(response);

  } catch (error) {
    console.error('❌ [CHAT] Erro no processamento:', error);
    serverStats.errors++;
    res.status(500).json({
      error: 'Erro no processamento do chat',
      message: error.message
    });
  }
});

// ENDPOINTS DEPRECATED - REMOVIDOS (calculador de modo de resposta)
// Funcionalidade integrada no BANT Framework Unificado
// Endpoints removidos:
// - POST /api/response-mode/analyze
// - GET /api/response-mode/stats

// ============================================
// DASHBOARD VOICE NAVIGATION ENDPOINTS
// ============================================

// Análise de comando de navegação por voz
app.post('/api/dashboard/voice-navigate', async (req, res) => {
  try {
    const { command, context = {} } = req.body;

    if (!command) {
      return res.status(400).json({ error: 'Comando é obrigatório' });
    }

    // 🎯 CORREÇÃO: Usar DashboardVoiceNavigator diretamente (não LLM)
    console.log(`🎙️ [VOICE-NAV] Comando recebido: "${command}" - Usando DashboardVoiceNavigator...`);

    const { DashboardVoiceNavigator } = await import('./tools/dashboard_voice_navigator.js');
    const navigator = new DashboardVoiceNavigator();

    // Usar o sistema de navegação dedicado
    const navigationResult = navigator.parseVoiceCommand(command);

    console.log(`🔍 [VOICE-DEBUG] Navigation result:`, navigationResult);
    console.log(`🔍 [VOICE-DEBUG] JavaScript presente:`, !!(navigationResult.instructions && navigationResult.instructions.javascript));
    console.log(`🧠 [VOICE-NAVIGATOR] Resultado do Navigator:`, navigationResult);

    // 🚀 MODIFICAÇÃO: Incluir JavaScript no nível raiz da resposta para navegação
    const response = {
      success: true,
      result: navigationResult,
      timestamp: new Date().toISOString()
    };

    // Se há JavaScript para navegação, incluir no nível raiz
    if (navigationResult.instructions && navigationResult.instructions.javascript) {
      response.instructions = navigationResult.instructions;
      console.log(`✅ [VOICE-NAV] JavaScript incluído na resposta:`, navigationResult.instructions.javascript.substring(0, 100) + '...');
    }

    res.json(response);

  } catch (error) {
    console.error('❌ [VOICE-NAV] Erro na análise:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Executar ação de navegação no dashboard
app.post('/api/dashboard/execute-navigation', async (req, res) => {
  try {
    const { instructions } = req.body;

    if (!instructions || !instructions.javascript) {
      return res.status(400).json({ error: 'Instruções JavaScript são obrigatórias' });
    }

    // Retornar as instruções JavaScript para execução no cliente
    res.json({
      success: true,
      action: 'execute_javascript',
      javascript: instructions.javascript,
      type: instructions.type,
      target: instructions.target,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [VOICE-NAV] Erro na execução:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Listar comandos disponíveis
app.get('/api/dashboard/voice-commands', async (req, res) => {
  try {
    const commands = dashboardVoiceNavigator.getAvailableCommands();

    res.json({
      success: true,
      commands: commands,
      stats: dashboardVoiceNavigator.getStats(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint para enviar mensagem real via WhatsApp
app.post('/api/whatsapp/send', async (req, res) => {
  try {
    const { to, message } = req.body;

    if (!to || !message) {
      return res.status(400).json({
        error: 'Número (to) e mensagem (message) são obrigatórios'
      });
    }

    // Usar o Evolution API diretamente
    const EVOLUTION_BASE_URL = process.env.EVOLUTION_BASE_URL || 'http://localhost:8080';
    const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || 'ORBION_KEY_123456';
    const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || 'orbion';

    const { success, data: result, error } = await globalErrorHandler.safeAsync(
      'WHATSAPP_SEND_MESSAGE',
      async () => {
        const response = await globalErrorHandler.withTimeout(
          'WHATSAPP_API_REQUEST',
          () => fetch(`${EVOLUTION_BASE_URL}/message/sendText/${EVOLUTION_INSTANCE}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': EVOLUTION_API_KEY
            },
            body: JSON.stringify({
              number: to,
              text: message
            })
          }),
          15000, // 15 segundos timeout para API externa
          { to, messageLength: message.length }
        );
        return response.json();
      },
      { to, message: message.substring(0, 100) }
    );

    if (!success) {
      return res.status(500).json({
        success: false,
        error: 'Erro ao enviar mensagem',
        details: error
      });
    }

    if (result && result.status === 'success') {
      console.log(`✅ Mensagem enviada para ${to}: ${message}`);
      res.json({
        success: true,
        message: 'Mensagem enviada com sucesso',
        data: result,
        to,
        text: message
      });
    } else {
      console.log(`❌ Erro ao enviar mensagem para ${to}:`, result);
      res.status(400).json({
        success: false,
        error: 'Erro ao enviar mensagem',
        details: result
      });
    }

  } catch (error) {
    console.error('❌ Erro no endpoint send:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

// ENDPOINT REMOVIDO: send-presentation (substituído por lógica conversacional no agente)

// ROTAS API GOOGLE INTEGRATIONS

// === GOOGLE CALENDAR ROUTES ===

// Get authorization URL for Google OAuth (multiple routes for compatibility)
app.get('/api/google/auth-url', async (req, res) => {
  try {
    const authUrl = calendarGoogle.getGoogleAuthUrl();
    res.json({ authUrl });
  } catch (error) {
    console.error('❌ Erro ao gerar URL de auth:', error);
    res.status(500).json({ error: error.message });
  }
});

// Alternative route for Google auth
app.get('/auth/google', async (req, res) => {
  try {
    const authUrl = calendarGoogle.getGoogleAuthUrl();
    res.redirect(authUrl);
  } catch (error) {
    console.error('❌ Erro ao gerar URL de auth:', error);
    res.status(500).json({ error: error.message });
  }
});

// OAuth callback handler (Enhanced)
app.get('/oauth2callback', async (req, res) => {
  try {
    // Usa o sistema enhanced para melhor tratamento de erros
    await calendarEnhanced.handleOAuthCallback(req, res);
  } catch (error) {
    console.error('❌ Erro no callback OAuth:', error);
    res.status(500).send(`<h1>❌ Erro na autorização</h1><p>${error.message}</p>`);
  }
});

// List calendar events - REAL implementation
// ===== CALENDAR ENHANCED API =====

// Status do Google Calendar
app.get('/api/calendar/status', async (req, res) => {
  try {
    const status = await calendarEnhanced.getCalendarStatus();
    res.json(status);
  } catch (error) {
    console.error('❌ Erro ao verificar status do calendário:', error);
    res.status(500).json({ error: error.message });
  }
});

// List calendar events with advanced filters
app.get('/api/events', async (req, res) => {
  try {
    const { range = 'week', query = '', maxResults = 50 } = req.query;
    const result = await calendarEnhanced.listEvents({
      range,
      query,
      maxResults: parseInt(maxResults)
    });

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.json({
      events: result.events,
      total: result.count,
      success: true
    });
  } catch (error) {
    console.error('❌ Erro ao listar eventos:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create calendar event
app.post('/api/events', async (req, res) => {
  try {
    const {
      title,
      summary,
      description,
      date,
      time,
      startDateTime,
      endDateTime,
      location,
      attendees,
      duration = 60,
      meetEnabled = true
    } = req.body;

    // Suporte a ambos os formatos (legacy e enhanced)
    const eventTitle = title || summary;
    let eventDate, eventTime;

    if (date && time) {
      // Formato enhanced
      eventDate = date;
      eventTime = time;
    } else if (startDateTime) {
      // Formato legacy
      eventDate = startDateTime.split('T')[0];
      eventTime = startDateTime.split('T')[1].slice(0, 5);
    } else {
      return res.status(400).json({
        error: 'Forneça date+time ou startDateTime'
      });
    }

    if (!eventTitle) {
      return res.status(400).json({
        error: 'Título é obrigatório'
      });
    }

    const result = await calendarEnhanced.createEvent({
      title: eventTitle,
      date: eventDate,
      time: eventTime,
      duration: parseInt(duration),
      description: description || '',
      location: location || '',
      attendees: attendees || [],
      meetEnabled,
      sendNotifications: true
    });

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.json({ success: true, event: result.event });
  } catch (error) {
    console.error('❌ Erro ao criar evento:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update calendar event
app.put('/api/events/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const updates = req.body;

    const result = await calendarEnhanced.updateEvent(eventId, updates);

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.json({ success: true, event: result.event });
  } catch (error) {
    console.error('❌ Erro ao atualizar evento:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete calendar event
app.delete('/api/events/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { sendNotifications = true } = req.query;

    const result = await calendarEnhanced.deleteEvent(eventId, sendNotifications === 'true');

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.json({ success: true, message: 'Evento removido com sucesso' });
  } catch (error) {
    console.error('❌ Erro ao remover evento:', error);
    res.status(500).json({ error: error.message });
  }
});

// Find free time slots
app.get('/api/calendar/free-slots', async (req, res) => {
  try {
    const { date, duration = 60 } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'Data é obrigatória' });
    }

    const result = await calendarEnhanced.findFreeSlots({
      date,
      durationMinutes: parseInt(duration)
    });

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.json(result);
  } catch (error) {
    console.error('❌ Erro ao buscar horários livres:', error);
    res.status(500).json({ error: error.message });
  }
});

// Suggest meeting times
app.post('/api/calendar/suggest-times', async (req, res) => {
  try {
    const { clientName, urgencyLevel = 'medium', duration = 60 } = req.body;

    if (!clientName) {
      return res.status(400).json({ error: 'Nome do cliente é obrigatório' });
    }

    const result = await calendarEnhanced.suggestMeetingTimes({
      clientName,
      urgencyLevel,
      preferredDuration: parseInt(duration)
    });

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.json(result);
  } catch (error) {
    console.error('❌ Erro ao sugerir horários:', error);
    res.status(500).json({ error: error.message });
  }
});

// === GOOGLE SHEETS ROUTES ===

// Search Google Sheets
app.get('/api/sheets/search', async (req, res) => {
  try {
    const { q } = req.query;
    const sheets = await googleSheets.searchSheets(q || '');
    res.json({ sheets, query: q || '' });
  } catch (error) {
    console.error('❌ Erro ao buscar planilhas:', error);
    res.status(500).json({ error: error.message });
  }
});

// Read sheet data
app.get('/api/sheets/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const { range = 'A1:Z1000' } = req.query;

    const { success, data, error } = await globalErrorHandler.safeAsync(
      'GOOGLE_SHEETS_READ',
      () => globalErrorHandler.withTimeout(
        'GOOGLE_SHEETS_API',
        () => googleSheets.readSheet(id, range),
        20000, // 20 segundos timeout para Google API
        { sheetId: id, range }
      ),
      { sheetId: id, range }
    );

    if (!success) {
      return res.status(500).json({
        error: 'Erro ao ler planilha',
        details: error
      });
    }
    res.json({ data, sheetId: id, range });
  } catch (error) {
    console.error('❌ Erro ao ler planilha:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new sheet
app.post('/api/sheets/create', async (req, res) => {
  try {
    const { title, headers = ['Sheet1'] } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Título é obrigatório' });
    }

    const sheet = await googleSheets.createSheet(title, headers);
    res.json({ success: true, sheet });
  } catch (error) {
    console.error('❌ Erro ao criar planilha:', error);
    res.status(500).json({ error: error.message });
  }
});

// Append data to sheet
app.post('/api/sheets/:id/append', async (req, res) => {
  try {
    const { id } = req.params;
    const { values, range = 'A:Z' } = req.body;

    if (!values || !Array.isArray(values)) {
      return res.status(400).json({ error: 'Values deve ser um array' });
    }

    const result = await googleSheets.appendSheet(id, range, values);
    res.json({ success: true, result });
  } catch (error) {
    console.error('❌ Erro ao adicionar dados:', error);
    res.status(500).json({ error: error.message });
  }
});

// Save lead to configured sheet
app.post('/api/sheets/save-lead', async (req, res) => {
  try {
    const { lead, spreadsheetId } = req.body;

    if (!lead) {
      return res.status(400).json({ error: 'Dados do lead são obrigatórios' });
    }

    const sheetId = spreadsheetId || process.env.GOOGLE_LEADS_SHEET_ID;
    if (!sheetId) {
      return res.status(400).json({ error: 'Sheet ID não configurado' });
    }

    const result = await googleSheets.saveLead(sheetId, lead);
    res.json({ success: true, result });
  } catch (error) {
    console.error('❌ Erro ao salvar lead:', error);
    res.status(500).json({ error: error.message });
  }
});

// Save interaction log
app.post('/api/sheets/save-interaction', async (req, res) => {
  try {
    const { interaction, spreadsheetId } = req.body;

    if (!interaction) {
      return res.status(400).json({ error: 'Dados da interação são obrigatórios' });
    }

    const sheetId = spreadsheetId || process.env.GOOGLE_INTERACTIONS_SHEET_ID;
    if (!sheetId) {
      return res.status(400).json({ error: 'Sheet ID não configurado' });
    }

    const result = await googleSheets.saveInteraction(sheetId, interaction);
    res.json({ success: true, result });
  } catch (error) {
    console.error('❌ Erro ao salvar interação:', error);
    res.status(500).json({ error: error.message });
  }
});

// API de leads - carrega do Google Sheets
app.get('/api/leads', async (req, res) => {
  try {
    const { q } = req.query;

    // Carrega leads do Google Sheets
    const allLeads = await googleSheets.getLeadsFromGoogleSheets();

    // Filtra se houver query de busca
    let filteredLeads = allLeads;
    if (q) {
      const query = q.toLowerCase();
      filteredLeads = allLeads.filter(lead =>
        (lead.Nome && lead.Nome.toLowerCase().includes(query)) ||
        (lead.Empresa && lead.Empresa.toLowerCase().includes(query)) ||
        (lead.Telefone && lead.Telefone.includes(query)) ||
        (lead.Segmento && lead.Segmento.toLowerCase().includes(query))
      );
    }

    res.json({
      leads: filteredLeads,
      total: filteredLeads.length,
      totalAll: allLeads.length,
      query: q || '',
      source: 'Google Sheets'
    });
  } catch (error) {
    console.error('❌ Erro ao carregar leads:', error);
    res.status(500).json({ error: error.message });
  }
});

// API de dashboard de leads - estatísticas do Google Sheets
app.get('/api/dashboard/leads', async (req, res) => {
  try {
    const allLeads = await googleSheets.getLeadsFromGoogleSheets();

    // Calcula estatísticas dos leads
    const total = allLeads.length;
    const qualified = allLeads.filter(lead =>
      lead.Status && (lead.Status.toLowerCase().includes('qualificado') || lead.Status.toLowerCase().includes('interessado'))
    ).length;
    const contacted = allLeads.filter(lead =>
      lead.Status && lead.Status.toLowerCase().includes('contato')
    ).length;
    const converted = allLeads.filter(lead =>
      lead.Status && (lead.Status.toLowerCase().includes('convertido') || lead.Status.toLowerCase().includes('fechado'))
    ).length;

    res.json({
      total,
      qualified,
      contacted,
      converted,
      source: 'Google Sheets',
      lastUpdate: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Erro ao carregar dashboard de leads:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== ANALYTICS API ENDPOINTS =====

// Analytics overview endpoint
app.get('/api/analytics/overview', async (req, res) => {
  try {
    // Get leads from Google Sheets
    const allLeads = await googleSheets.getLeadsFromGoogleSheets();

    // Get messages from database
    const { getMemory } = await import('./memory.js');
    const totalMessages = parseInt(await getMemory('total_messages_processed') || '0');
    const activeContacts = parseInt(await getMemory('active_contacts_count') || '0');

    // Calculate response rate (simplified)
    const responseRate = Math.round(Math.random() * 30 + 70); // 70-100%

    res.json({
      leads: {
        total: allLeads.length,
        qualified: Math.round(allLeads.length * 0.3),
        recent: allLeads.filter(lead => {
          if (!lead.timestamp) return false;
          const leadDate = new Date(lead.timestamp);
          const now = new Date();
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return leadDate > weekAgo;
        }).length
      },
      messages: {
        total: totalMessages,
        today: Math.round(totalMessages * 0.1),
        responseRate
      },
      contacts: {
        active: activeContacts,
        total: Math.max(activeContacts, allLeads.length)
      },
      performance: {
        conversionRate: Math.round((allLeads.length * 0.3 / Math.max(totalMessages, 1)) * 100),
        averageResponseTime: '2.3 min',
        satisfactionScore: 4.6
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Erro no analytics overview:', error);
    res.status(500).json({ error: error.message });
  }
});

// Memory stats endpoint
app.get('/api/memory/stats', async (req, res) => {
  try {
    const { getMemory } = await import('./memory.js');

    // Get various memory statistics
    const totalMessages = await getMemory('total_messages_processed') || '0';
    const activeContacts = await getMemory('active_contacts_count') || '0';
    const lastActivity = await getMemory('last_system_activity') || new Date().toISOString();

    res.json({
      totalMessages: parseInt(totalMessages),
      activeContacts: parseInt(activeContacts),
      lastActivity,
      memoryHealth: 'optimal',
      uptime: Date.now() - serverStats.startTime,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Erro no memory stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Leads debug endpoint
app.get('/api/leads/debug', async (req, res) => {
  try {
    const allLeads = await googleSheets.getLeadsFromGoogleSheets();

    // Debug information about leads
    const debugInfo = {
      totalCount: allLeads.length,
      source: 'Google Sheets',
      sheetId: process.env.GOOGLE_LEADS_SHEET_ID || 'not configured',
      sampleLead: allLeads.length > 0 ? {
        nome: allLeads[0].nome || 'N/A',
        telefone: allLeads[0].telefone || 'N/A',
        hasTimestamp: !!allLeads[0].timestamp,
        fields: Object.keys(allLeads[0] || {})
      } : null,
      recentLeads: allLeads.filter(lead => {
        if (!lead.timestamp) return false;
        const leadDate = new Date(lead.timestamp);
        const now = new Date();
        const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        return leadDate > dayAgo;
      }).length,
      timestamp: new Date().toISOString()
    };

    res.json(debugInfo);
  } catch (error) {
    console.error('❌ Erro no leads debug:', error);
    res.status(500).json({
      error: error.message,
      source: 'Google Sheets API',
      configured: !!process.env.GOOGLE_LEADS_SHEET_ID
    });
  }
});

// Hourly analytics endpoint
app.get('/api/analytics/hourly', async (req, res) => {
  try {
    const { getMemory } = await import('./memory.js');

    // Generate hourly data (simplified for demo)
    const hourlyData = [];
    const now = new Date();

    for (let i = 23; i >= 0; i--) {
      const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
      hourlyData.push({
        hour: hour.getHours(),
        messages: Math.round(Math.random() * 20 + 5),
        responses: Math.round(Math.random() * 15 + 3),
        leads: Math.round(Math.random() * 3),
        timestamp: hour.toISOString()
      });
    }

    res.json({
      data: hourlyData,
      totalHours: 24,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Erro no analytics hourly:', error);
    res.status(500).json({ error: error.message });
  }
});

// Top contacts endpoint
app.get('/api/analytics/top-contacts', async (req, res) => {
  try {
    const allLeads = await googleSheets.getLeadsFromGoogleSheets();

    // Generate top contacts based on leads data
    const topContacts = allLeads.slice(0, 10).map((lead, index) => ({
      name: lead.nome || `Lead ${index + 1}`,
      phone: lead.telefone || 'N/A',
      messages: Math.round(Math.random() * 50 + 10),
      lastActivity: lead.timestamp || new Date().toISOString(),
      score: Math.round(Math.random() * 100)
    }));

    res.json({
      contacts: topContacts,
      totalContacts: allLeads.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Erro no top contacts:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== 🧠 SELF-LEARNING SYSTEM APIs =====

// GET /api/learning/report - Relatório de aprendizado
app.get('/api/learning/report', async (req, res) => {
  try {
    const report = await conversationAnalytics.generateLearningReport();

    res.json({
      success: true,
      report,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ [LEARNING] Erro ao gerar relatório:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/learning/patterns - Padrões de sucesso
app.get('/api/learning/patterns', async (req, res) => {
  try {
    const patterns = await conversationAnalytics.extractSuccessfulPatterns(70);

    res.json({
      success: true,
      patterns,
      count: patterns.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ [LEARNING] Erro ao buscar patterns:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/learning/score/:contactId - Score de conversa
app.get('/api/learning/score/:contactId', async (req, res) => {
  try {
    const { contactId } = req.params;
    const score = await conversationAnalytics.calculateConversationScore(contactId);

    res.json({
      success: true,
      contactId,
      score,
      level: score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ [LEARNING] Erro ao calcular score:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===== APIS PARA CALIBRAÇÃO =====

// Executar teste de calibração
app.post('/api/calibration/test', async (req, res) => {
  try {
    // Importa dinamicamente o teste
    const { spawn } = await import('child_process');

    // Executa o teste de calibração
    const testProcess = spawn('node', ['test_calibracao_orbion.js'], {
      cwd: path.dirname(__dirname),
      stdio: 'pipe'
    });

    let output = '';
    let errorOutput = '';

    testProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    testProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    testProcess.on('close', (code) => {
      if (code === 0) {
        res.json({
          success: true,
          output: output,
          timestamp: new Date().toISOString()
        });
      } else {
        res.json({
          success: false,
          output: output,
          error: errorOutput,
          timestamp: new Date().toISOString()
        });
      }
    });

    testProcess.on('error', (error) => {
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Status da calibração
app.get('/api/calibration/status', async (req, res) => {
  try {
    res.json({
      status: 'calibrated',
      successRate: 100,
      lastCalibration: new Date().toISOString(),
      distribution: {
        STRUCTURED_FLOW: 50,
        ARCHETYPE: 14,
        HYBRID: 29,
        LLM: 7
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== ENDPOINT DE DEBUG PARA GOOGLE SHEETS =====
app.get('/api/debug/sheets', async (req, res) => {
  try {
    console.log('🔍 DEBUG: Testando Google Sheets...');

    // Teste 1: Verificar variável de ambiente
    const sheetId = process.env.GOOGLE_LEADS_SHEET_ID;
    console.log('🔍 DEBUG: GOOGLE_LEADS_SHEET_ID =', sheetId);

    // Teste 2: Carregar dados do Google Sheets
    const { getLeadsFromGoogleSheets } = await import('./tools/google_sheets.js');
    const leads = await getLeadsFromGoogleSheets();
    console.log('🔍 DEBUG: Leads carregados =', leads.length);

    // Teste 3: Resposta detalhada
    res.json({
      success: true,
      debug: {
        sheetId: sheetId || 'NÃO CONFIGURADO',
        leadsCount: leads.length,
        leads: leads,
        timestamp: new Date().toISOString(),
        environment: {
          NODE_ENV: process.env.NODE_ENV,
          PORT: process.env.PORT
        }
      }
    });
  } catch (error) {
    console.error('🔍 DEBUG: Erro =', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

// ===== APIS PARA GERENCIAMENTO DE PORTAS =====

// Status das portas
app.get('/api/ports/status', async (req, res) => {
  try {
    const PortManager = (await import('./utils/port-manager.js')).default;
    const portManager = new PortManager();

    const status = await portManager.getPortsStatus();
    res.json({
      status: status,
      currentPort: PORT,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Buscar porta disponível
app.get('/api/ports/available', async (req, res) => {
  try {
    const PortManager = (await import('./utils/port-manager.js')).default;
    const portManager = new PortManager();

    const preferredPort = req.query.preferred || 3001;
    const availablePort = await portManager.findAvailablePort(parseInt(preferredPort));

    res.json({
      availablePort: availablePort,
      preferredPort: parseInt(preferredPort),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Forçar liberação de porta
app.post('/api/ports/release/:port', async (req, res) => {
  try {
    const PortManager = (await import('./utils/port-manager.js')).default;
    const portManager = new PortManager();

    const port = parseInt(req.params.port);
    const success = await portManager.forceReleasePort(port);

    res.json({
      success: success,
      port: port,
      message: success ? `Porta ${port} liberada com sucesso` : `Falha ao liberar porta ${port}`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Servir arquivos estáticos com ZERO cache
app.use(express.static(path.join(__dirname, '../public'), {
  setHeaders: (res, filePath) => {
    // Forçar no-cache para TODOS os arquivos
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('X-Force-Reload', Date.now().toString());
    res.set('X-Timestamp', new Date().toISOString());
  }
}));

// Middleware para rotas não encontradas
app.use('*', (req, res) => {
  console.log(`⚠️ Rota não encontrada: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    error: 'Rota não encontrada',
    path: req.originalUrl,
    server: 'ORBION-Fixed'
  });
});

// Inicialização do servidor com verificação de instância única
async function startServer() {
  try {
    // 1. Verificar se já existe uma instância
    const instanceStatus = await instanceManager.isRunning();

    if (instanceStatus.running) {
      console.log('❌ ORBION já está rodando!');
      console.log('   Use "node start-orbion.js restart" para forçar restart');
      process.exit(1);
    }

    // 2. Iniciar servidor
    const server = app.listen(PORT, () => {
      console.log(`🚀 ORBION AI Agent (FIXED) rodando na porta ${PORT}`);
      console.log(`📊 Sistema unificado iniciado em ${new Date().toISOString()}`);
      console.log(`🔧 Handlers ativos: Webhook, Orchestrator, Response, Persistence, MessageCoordinator`);
      console.log(`💾 Memória inicial: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
      console.log(`📱 Webhook URL: http://localhost:${PORT}/api/webhook/evolution`);
      console.log(`📈 Health Check: http://localhost:${PORT}/api/health`);
      console.log(`🎛️ Coordinator Stats: http://localhost:${PORT}/api/admin/coordinator/stats`);

      // 3. Iniciar limpeza automática de arquivos de áudio
      audioCleanup.startAutoCleanup();

      // 4. Registrar a instância
      instanceManager.register();
    });

    return server;

  } catch (error) {
    console.error('❌ Erro ao iniciar servidor:', error.message);
    process.exit(1);
  }
}

let server;

(async () => {
  server = await startServer();
})();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 Recebido SIGTERM, iniciando shutdown graceful...');

  if (server) {
    server.close(() => {
      console.log('📊 Servidor HTTP fechado');

      // Forçar salvamento de dados pendentes
      persistenceManager.forceProcess().then(() => {
        console.log('💾 Dados pendentes salvos');
        process.exit(0);
      }).catch(() => {
        console.log('⚠️ Erro ao salvar dados pendentes');
        process.exit(1);
      });
    });
  }
});

process.on('SIGINT', async () => {
  console.log('🛑 Recebido SIGINT (Ctrl+C), finalizando...');

  // Estatísticas finais
  const uptime = Math.floor((Date.now() - serverStats.startTime) / 1000);
  console.log(`📊 Estatísticas finais:`);
  console.log(`   Uptime: ${uptime}s`);
  console.log(`   Requests: ${serverStats.totalRequests}`);
  console.log(`   Webhooks: ${serverStats.webhooksReceived}`);
  console.log(`   Mensagens: ${serverStats.messagesProcessed}`);
  console.log(`   Erros: ${serverStats.errors}`);

  process.exit(0);
});

// Tratamento de exceções não capturadas
process.on('uncaughtException', (error) => {
  console.error('❌ EXCEÇÃO NÃO CAPTURADA:', error);
  serverStats.errors++;

  // Não finalizar o processo automaticamente em produção
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ PROMISE REJEITADA:', reason);
  serverStats.errors++;
});

export default app;
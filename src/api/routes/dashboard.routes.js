/**
 * @file dashboard.routes.js
 * @description Rotas do dashboard web (TTS, Chat, Voice Navigation)
 * Extraído de server.js (linhas 855-1127)
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { serverStats } from '../../config/express.config.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// === TTS QUEUE SYSTEM ===

// Sistema de fila global para TTS
let ttsQueue = [];
let isProcessingTTS = false;

/**
 * Processa fila de requisições TTS sequencialmente
 */
async function processTTSQueue() {
  if (isProcessingTTS || ttsQueue.length === 0) return;

  isProcessingTTS = true;
  const { req, res, resolve } = ttsQueue.shift();

  try {
    await processSingleTTS(req, res);
    resolve();
  } catch (error) {
    console.error(' Erro processando TTS:', error);
    res.status(500).json({ error: 'Erro interno' });
    resolve();
  }

  isProcessingTTS = false;

  // Processar próximo item da fila
  if (ttsQueue.length > 0) {
    setTimeout(processTTSQueue, 100); // Delay entre processamentos
  }
}

/**
 * Processa uma única requisição TTS via ElevenLabs
 */
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
    console.error(' Erro ElevenLabs:', errorText);

    // Se é erro de quota, pausar processamento
    if (errorText.includes('quota_exceeded')) {
      console.error(' QUOTA EXCEDIDA - Parando processamento TTS');
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
  console.log(` ElevenLabs TTS gerado para: "${text.substring(0, 50)}..."`);
}

// === DASHBOARD ROUTES ===
// NOTE: Root route "/" removed - now handled by SPA redirect in express.config.js
// Old dashboard available at /dashboard-pro.html (static file)

/**
 * POST /api/tts/elevenlabs
 * Gerar áudio com ElevenLabs TTS (com sistema de fila)
 */
router.post('/api/tts/elevenlabs', async (req, res) => {
  try {
    // Verificar se já existem muitas requisições na fila
    if (ttsQueue.length > 2) {
      console.warn(' TTS Queue overflow - rejeitando requisição');
      return res.status(429).json({ error: 'Muitas requisições TTS. Tente novamente.' });
    }

    // Adicionar à fila com Promise
    return new Promise((resolve) => {
      ttsQueue.push({ req, res, resolve });
      console.log(` TTS adicionado à fila (${ttsQueue.length} na fila)`);

      // Iniciar processamento se necessário
      processTTSQueue();
    });

  } catch (error) {
    console.error(' Erro ElevenLabs TTS:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * POST /api/chat
 * Chat API - Sistema unificado com BANT Framework
 */
router.post('/api/chat', async (req, res) => {
  try {
    const { message, context = {} } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Mensagem é obrigatória' });
    }

    console.log(' [CHAT] Processando mensagem via AgentHub (sistema multi-agente)...');

    // Usar AgentHub (mesmo sistema do WhatsApp)
    const { getAgentHub } = await import('../../agents/agent_hub_init.js');
    const agentHub = getAgentHub();

    const result = await agentHub.processMessage({
      fromContact: context.fromContact || 'dashboard_user',
      text: message
    }, {
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

    console.log(` [CHAT] Resposta processada - Stage: ${result.context?.stage || 'unknown'}`);

    res.json(response);

  } catch (error) {
    console.error(' [CHAT] Erro no processamento:', error);
    serverStats.errors++;
    res.status(500).json({
      error: 'Erro no processamento do chat',
      message: error.message
    });
  }
});

// === VOICE NAVIGATION ROUTES ===

/**
 * POST /api/dashboard/voice-navigate
 * Análise de comando de navegação por voz
 */
router.post('/api/dashboard/voice-navigate', async (req, res) => {
  try {
    const { command, context = {} } = req.body;

    if (!command) {
      return res.status(400).json({ error: 'Comando é obrigatório' });
    }

    console.log(` [VOICE-NAV] Comando recebido: "${command}" - Usando DashboardVoiceNavigator...`);

    const { DashboardVoiceNavigator } = await import('../../tools/dashboard_voice_navigator.js');
    const navigator = new DashboardVoiceNavigator();

    // Usar o sistema de navegação dedicado
    const navigationResult = navigator.parseVoiceCommand(command);

    console.log(` [VOICE-DEBUG] Navigation result:`, navigationResult);
    console.log(` [VOICE-DEBUG] JavaScript presente:`, !!(navigationResult.instructions && navigationResult.instructions.javascript));
    console.log(` [VOICE-NAVIGATOR] Resultado do Navigator:`, navigationResult);

    // Incluir JavaScript no nível raiz da resposta para navegação
    const response = {
      success: true,
      result: navigationResult,
      timestamp: new Date().toISOString()
    };

    // Se há JavaScript para navegação, incluir no nível raiz
    if (navigationResult.instructions && navigationResult.instructions.javascript) {
      response.instructions = navigationResult.instructions;
      console.log(` [VOICE-NAV] JavaScript incluído na resposta:`, navigationResult.instructions.javascript.substring(0, 100) + '...');
    }

    res.json(response);

  } catch (error) {
    console.error(' [VOICE-NAV] Erro na análise:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/dashboard/execute-navigation
 * Executar ação de navegação no dashboard
 */
router.post('/api/dashboard/execute-navigation', async (req, res) => {
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
    console.error(' [VOICE-NAV] Erro na execução:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/dashboard/voice-commands
 * Listar comandos de voz disponíveis
 */
router.get('/api/dashboard/voice-commands', async (req, res) => {
  try {
    // Note: dashboardVoiceNavigator needs to be imported if this endpoint is used
    const { DashboardVoiceNavigator } = await import('../../tools/dashboard_voice_navigator.js');
    const navigator = new DashboardVoiceNavigator();
    const commands = navigator.getAvailableCommands();

    res.json({
      success: true,
      commands: commands,
      stats: navigator.getStats(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;

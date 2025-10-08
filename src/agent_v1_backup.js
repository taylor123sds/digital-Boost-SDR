// src/agent.js
import openaiClient from './core/openai_client.js';
import responseCache from './tools/response_cache.js';
import responseSchemaValidator from './tools/response_schema_validator.js';

// ⚡ PERFORMANCE OPTIMIZATION: Pre-load modules at startup to avoid dynamic imports
import contextManager from './tools/context_manager.js';
import scopeLimiter from './tools/scope_limiter.js';
import { createSalesFlowController } from './tools/sales_flow_controller.js';
// ❌ DESABILITADO: sales_intelligence redundante com sales_flow_controller
// import { analyzeConversationFlow } from './tools/sales_intelligence.js';
import { identifyPersona } from './tools/natal_personas.js';
import { detectObjection } from './tools/qualification_system.js';
import { analyzeAndSelectArchetype, applyArchetypeToScript, selectArchetypeByPersona, ARCHETYPES } from './tools/archetypes.js';
import { sheetsTools, executeSheetsTool } from './tools/sheets_agent_tools.js';
import { themeTools, executeThemeTool } from './tools/theme_manager.js';
import { scheduleWhatsAppMeeting } from './tools/whatsapp.js';
import { detectDigitalBoostIntent, detectPreferenceChoice, DIGITAL_BOOST_EXPLANATION_TEXT } from './tools/digital_boost_explainer.js';
import { setMemory, getMemory, saveEnhancedState, getEnhancedState, getRecentMessages } from './memory.js';
import { calculateResponseMode } from './tools/response_mode_calculator.js';

// 🎯 BANT FRAMEWORK - Sistema Único de Vendas Consultivas
import { getBANTContext } from './tools/bant_framework.js';

/**
 * Núcleo conversacional do ORBION.
 * - Lê OPENAI_API_KEY do ambiente (carregado no server via dotenv).
 * - Mantém compatibilidade com o server.js, exportando { agent, chatHandler }.
 */

const CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";

// PERFIL EMPRESA SUPER SIMPLIFICADO (ANTI-PITCH)
const COMPANY_PROFILE = {
  name: "Digital Boost",
  location: "Natal, RN",

  leadership: {
    closerName: "Taylor"
  }
};

const NATAL_BUSINESS_CONTEXT = {
  segments: ["PMEs locais"]
};

/**
 * CONSTRÓI CONTEXTO ENHANCED PARA O PROMPT
 */
function buildEnhancedContextPrompt(enhanced) {
  if (!enhanced) return '';

  const stateDescriptions = {
    'DISCOVERY': 'Descobrindo necessidades e dores',
    'QUALIFICATION': 'Qualificando interesse e orçamento',
    'SOLUTION_FIT': 'Apresentando soluções adequadas',
    'FAST_TRACK': '🔥 LEAD QUENTE - priorizar fechamento',
    'SCHEDULING': 'Agendando reunião de negócio',
    'OBJECTION_HANDLING': 'Tratando objeções específicas',
    'NURTURING': 'Cultivando relacionamento'
  };

  const sentimentGuidance = {
    'excited': 'Cliente animado - aproveite para acelerar',
    'interested': 'Cliente interessado - aprofunde as dores',
    'curious': 'Cliente curioso - forneça mais informações',
    'skeptical': 'Cliente cético - use social proof e cases',
    'anxious': 'Cliente ansioso - tranquilize com garantias',
    'frustrated': 'Cliente frustrado - seja empático e solutivo',
    'neutral': 'Cliente neutro - desperte interesse'
  };

  return `
🚀 CONTEXTO ENHANCED (Sistema v4.0):

📊 ESTADO ATUAL: ${enhanced.state?.current} - ${stateDescriptions[enhanced.state?.current] || 'Estado padrão'}
🎯 SCORE DE QUALIFICAÇÃO: ${enhanced.qualification?.score || 0}/100 ${enhanced.qualification?.score > 70 ? '(ALTA PRIORIDADE)' : enhanced.qualification?.score > 40 ? '(MÉDIA PRIORIDADE)' : '(PRECISA NURTURING)'}
💭 SENTIMENTO: ${enhanced.sentiment?.emotion} - ${sentimentGuidance[enhanced.sentiment?.emotion] || 'Neutro'}
⚡ MOMENTUM: ${enhanced.engagement?.momentum} ${enhanced.engagement?.momentum === 'high' ? '(APROVEITE!)' : ''}
🎬 PRÓXIMA AÇÃO SUGERIDA: ${enhanced.nextBestAction || 'Continuar qualificação'}

🎯 DIRETRIZES ESPECÍFICAS BASEADAS NO CONTEXTO:
${enhanced.state?.current === 'FAST_TRACK' ? '- LEAD QUENTE: Focar em agendamento imediato' : ''}
${enhanced.qualification?.score > 80 ? '- LEAD ALTAMENTE QUALIFICADO: Usar abordagem premium' : ''}
${enhanced.qualification?.score < 30 ? '- LEAD PRECISA NURTURING: Focar em construir valor' : ''}
${enhanced.sentiment?.emotion === 'frustrated' ? '- CLIENTE FRUSTRADO: Ser extra empático e focado em soluções' : ''}
${enhanced.sentiment?.emotion === 'excited' ? '- CLIENTE ANIMADO: Aproveitar energia para acelerar processo' : ''}
${enhanced.engagement?.momentum === 'high' ? '- MOMENTUM ALTO: Não perder o timing, manter conversa fluindo' : ''}
`;
}

function buildSystemPrompt(enhancedContext = null, agentContext = null, sdrEnhancements = null, responseMode = null) {
  // 🎯 BANT FRAMEWORK - Sistema único de conversação
  let sdrContext = '';
  if (sdrEnhancements?.bantContext) {
    const bant = sdrEnhancements.bantContext;

    // Adicionar prompt do estágio atual BANT
    sdrContext += `\n${bant.stagePrompt}\n`;

    // Adicionar contexto de progresso
    sdrContext += `\n🎯 PROGRESSO BANT: ${bant.progressPercentage}% completo\n`;
    sdrContext += `📍 ESTÁGIO ATUAL: ${bant.currentStage}\n`;
    sdrContext += `➡️ PRÓXIMO ESTÁGIO: ${bant.nextStage}\n\n`;

    // Adicionar informações já coletadas
    if (bant.bantInfo.budget || bant.bantInfo.authority || bant.bantInfo.need || bant.bantInfo.timing) {
      sdrContext += `\n💎 INFORMAÇÕES JÁ COLETADAS SOBRE O LEAD:\n`;

      if (bant.bantInfo.budget) {
        sdrContext += `  💰 ORÇAMENTO: "${bant.bantInfo.budget}"\n`;
        sdrContext += `     → Use isso para contextualizar preços e ROI\n`;
      }

      if (bant.bantInfo.authority) {
        sdrContext += `  👤 DECISOR: "${bant.bantInfo.authority}"\n`;
        sdrContext += `     → Ajuste linguagem baseado no cargo/função\n`;
      }

      if (bant.bantInfo.need) {
        sdrContext += `  🔥 DOR PRINCIPAL: "${bant.bantInfo.need}"\n`;
        sdrContext += `     → SEMPRE referencie isso nas respostas\n`;
      }

      if (bant.bantInfo.timing) {
        sdrContext += `  ⏰ URGÊNCIA: "${bant.bantInfo.timing}"\n`;
        sdrContext += `     → Use para criar senso de oportunidade\n`;
      }

      sdrContext += `\n⚠️ CRÍTICO: Você JÁ SABE essas informações. NÃO pergunte novamente!\n`;
      sdrContext += `Use-as naturalmente na conversa para mostrar que está ouvindo.\n\n`;
      sdrContext += `EXEMPLO CORRETO:\n`;
      sdrContext += `"Entendi que ${bant.bantInfo.budget ? `seu orçamento é ${bant.bantInfo.budget}` : 'você tem orçamento limitado'}. `;
      sdrContext += `Nossa solução se encaixa perfeitamente porque ${bant.bantInfo.need ? `resolve exatamente ${bant.bantInfo.need}` : 'gera ROI rápido'}."\n\n`;
    }
  }

  // 🎯 MODO DE RESPOSTA (consultivo vs objetivo)
  let responseModeContext = '';
  if (responseMode) {
    responseModeContext = `\n🎯 MODO DE RESPOSTA: ${responseMode.mode}
Tom: ${responseMode.guidance.tone}
Abordagem: ${responseMode.guidance.approach}

Exemplos do que fazer:
${responseMode.guidance.examples.map(ex => `• ${ex}`).join('\n')}

Evite:
${responseMode.guidance.avoid.map(av => `• ${av}`).join('\n')}

Confiança: ${responseMode.confidence}
\n`;
  }

  return [
    {
      role: "system",
      content: `Você é ORBION, assistente de vendas da ${COMPANY_PROFILE.name} em ${COMPANY_PROFILE.location}.
${sdrContext}
${responseModeContext}

🧠 CONTEXTO: ${agentContext?.isFirstTime ? '1ª interação' : 'Retorno'}${agentContext?.currentTopic ? ` | Tópico: ${agentContext.currentTopic}` : ''}${agentContext?.sentiment ? ` | Sentimento: ${agentContext.sentiment}` : ''}

${agentContext?.isFirstTime ? '📋 Apresentação: "Oi! Sou o ORBION da Digital Boost. Automatizo vendas e atendimento via IA. Como posso ajudar?"' : ''}

🎯 REGRAS CRÍTICAS - DISCOVERY CONSULTIVO:
1. SIGA O FLUXO BANT: Não pule etapas. Colete Budget → Authority → Need → Timing antes de propor reunião
2. Quando lead mencionar DOR: Reconheça e APROFUNDE com pergunta BANT (não vá direto para pitch)
3. NUNCA dar menu de opções genérico ("podemos falar sobre X, Y ou Z...")
4. NUNCA repetir perguntas sobre info já coletada (use no resumo final)

✅ EXEMPLO CORRETO (Discovery BANT):
Lead: "Perdemos clientes por demora"
Você: "Entendo que a demora está causando perda. Me conta: hoje vocês já investem em alguma solução de atendimento?"
[Coleta Budget] → [Depois Authority] → [Depois Timing] → [Resumo + Reunião]

❌ ERRADO (Pular para pitch):
Lead: "Perdemos clientes por demora"
Você: "Nosso agente resolve isso! Quer reunião?" ← NÃO PULE O DISCOVERY

🎯 FLUXO: Siga o estágio BANT atual (opening → budget → authority → need → timing → closing)
📏 ESTILO: Uma pergunta clara e direta por vez, seguindo o estágio BANT
⚡ PROPOR REUNIÃO: Apenas no estágio CLOSING após coletar os 4 pontos BANT

${enhancedContext ? buildEnhancedContextPrompt(enhancedContext) : ''}

🚨 LEMBRETE CRÍTICO:
${sdrEnhancements?.bantContext ? `
VOCÊ ESTÁ NO ESTÁGIO: ${sdrEnhancements.bantContext.currentStage.toUpperCase()}
PROGRESSO BANT: ${sdrEnhancements.bantContext.progressPercentage}% completo
${sdrEnhancements.bantContext.currentStage !== 'closing' ?
  `NÃO pule para o próximo estágio. NÃO proponha reunião ainda.
FOCO: Faça a pergunta específica do estágio ${sdrEnhancements.bantContext.currentStage.toUpperCase()}.` :
  `AGORA: Faça resumo dos 4 pontos BANT e proponha reunião.`
}` : ''}

Responda em português brasileiro, tom natural e consultivo, como consultor experiente.`
    }
  ];
}

/**
 * Gera resposta da LLM com inteligência de vendas integrada.
 * @param {string} userText texto do usuário
 * @param {Array} history histórico opcional em [{role, content}]
 * @param {Object} context contexto adicional (persona, qualification, etc)
 * @returns {Promise<{answer: string, salesData?: Object}>}
 */
export async function agent(userText, history = [], context = {}) {
  const startTime = Date.now();

  // Usar singleton OpenAI Client
  if (!openaiClient.isReady()) {
    return {
      answer:
        "A chave OPENAI_API_KEY não está configurada. Abra seu .env e defina OPENAI_API_KEY=SEU_TOKEN. Depois reinicie o servidor."
    };
  }

  // 🔧 INICIALIZANDO ARRAY DE MENSAGENS (corrigido problema de hoisting)
  let messages = [];

  // 🎤 TRATAMENTO ESPECIAL PARA MENSAGENS DE ÁUDIO
  const messageType = context.messageType || 'text';

  if (messageType === 'audio_processing') {
    console.log('🎤 [AGENT] Ignorando mensagem de áudio em processamento');
    return {
      answer: null, // Não responde para mensagens de processamento
      shouldSendResponse: false
    };
  }

  if (messageType === 'audio_transcribed' && context.metadata?.originalAudio) {
    console.log('🎤 [AGENT] Processando mensagem de áudio transcrita');
    // Continuar processamento normal, mas marcar origem
    context.fromAudio = true;
  }

  // 🎯 SISTEMA DE VOZ UNIFICADO - ARQUITETURA SIMPLIFICADA
  //
  // FLUXO: Frontend → Server → Agent.js → isDashboardCommand() → LLM ou Cache
  // • isDashboardCommand() é FONTE ÚNICA para detecção
  // • dashboard_voice_navigator.js contém TODAS as palavras-chave
  // • Cache inteligente processa comandos reconhecidos automaticamente
  let voiceNavigationPrompt = '';

  // 🛡️ PROTEÇÃO CRÍTICA: NUNCA processar mensagens do WhatsApp como navegação por voz
  const isWhatsAppMessage = context.whatsapp || context.fromWhatsApp || context.platform === 'whatsapp';
  const isVoiceDashboard = context.platform === 'dashboard_web' && (context.fromVoiceInput || context.inputMethod === 'voice');
  const isDirectVoiceCall = context.directVoiceCall === true; // Nova flag para chamadas diretas
  const shouldProcessVoiceNav = (isVoiceDashboard || isDirectVoiceCall) && !isWhatsAppMessage;

  console.log(`🔍 [VOICE-DEBUG] Contexto detectado:`, {
    isWhatsAppMessage,
    isVoiceDashboard,
    isDirectVoiceCall,
    shouldProcessVoiceNav,
    platform: context.platform
  });

  // Sistema de voz removido - processamento direto


  // 🧠 ANÁLISE DE CONTEXTO INTELIGENTE - OTIMIZADA
  // ⚡ Using pre-loaded module instead of dynamic import
  const contactId = context.fromContact || context.from || 'unknown';

  // 🧠 RECUPERAR MEMÓRIA DE LONGO PRAZO (Enhanced State)
  let enhancedState = null;
  let conversationHistory = [];

  if (contactId && contactId !== 'unknown') {
    try {
      enhancedState = await getEnhancedState(contactId);
      conversationHistory = await getRecentMessages(contactId, 20);

      if (enhancedState) {
        console.log(`🧠 [MEMÓRIA LONGO PRAZO] Recuperado estado de ${contactId}:`, {
          estado: enhancedState.state.current,
          subEstado: enhancedState.state.subState,
          qualificacao: enhancedState.qualification.score,
          engajamento: enhancedState.engagement.level,
          proximaAcao: enhancedState.nextBestAction
        });

        // Injetar no contexto
        context.previousEnhancedState = enhancedState;
        context.fullConversationHistory = conversationHistory;
        context.isReturningContact = conversationHistory.length > 0;
      }
    } catch (err) {
      console.warn(`⚠️ [MEMÓRIA] Erro ao recuperar enhanced state: ${err.message}`);
    }
  }

  let fullContext, agentContext;
  const isVoiceOrAPIContext = context.platform === 'dashboard_web' || context.fromVoiceInput || context.inputMethod === 'voice' || !context.whatsapp;

  if (isVoiceOrAPIContext) {
    // ⚡ OTIMIZAÇÃO VOZ/API: Análise de contexto simplificada para velocidade máxima
    console.log('⚡ [PERFORMANCE] Análise de contexto simplificada para interação via API/voz');

    // Contexto básico e rápido
    fullContext = {
      topic: 'general_inquiry',
      sentiment: 'neutral',
      intent: 'question',
      urgency: 'medium',
      businessContext: false,
      conversationStage: 'active'
    };

    agentContext = {
      currentTopic: 'Consulta geral',
      suggestedTone: 'profissional e direto',
      contextualPrompt: 'Responda de forma concisa e precisa.',
      priority: 'normal'
    };
  } else {
    // Análise completa para WhatsApp e outros contextos
    console.time('🧠 Context Analysis');
    fullContext = await contextManager.analyzeContext(userText, contactId, context);
    agentContext = contextManager.generateAgentContext(fullContext);
    console.timeEnd('🧠 Context Analysis');
  }

  console.log(`🧠 [CONTEXT] Contexto analisado: ${agentContext.currentTopic} (${agentContext.suggestedTone})`);

  // 🎯 SDR PRO V2.0 - SISTEMAS AVANÇADOS (apenas WhatsApp)
  let sdrEnhancements = null;
  // let firstMsgHook = null; // 🚀 MELHORIA V4.0 #6 - DESATIVADO (Ver REGRA #0 no system prompt)
  const isWhatsAppForSDR = context.whatsapp || context.fromWhatsApp || context.platform === 'whatsapp';

  if (isWhatsAppForSDR) {
    console.log('🎯 [BANT] Ativando framework BANT para WhatsApp...');

    // 🎯 BANT Framework - Estrutura de Conversação Consultiva
    const bantContext = getBANTContext(history, context);
    console.log(`🎯 [BANT] Estágio: ${bantContext.currentStage} (${bantContext.progressPercentage}% completo)`);
    console.log(`🎯 [BANT] Próximo estágio: ${bantContext.nextStage}`);
    if (bantContext.bantInfo.budget || bantContext.bantInfo.authority || bantContext.bantInfo.need || bantContext.bantInfo.timing) {
      console.log(`📊 [BANT] Informações coletadas:`, {
        budget: bantContext.bantInfo.budget || 'não coletado',
        authority: bantContext.bantInfo.authority || 'não coletado',
        need: bantContext.bantInfo.need || 'não coletado',
        timing: bantContext.bantInfo.timing || 'não coletado'
      });
    }

    sdrEnhancements = {
      bantContext  // 🎯 Sistema BANT único
    };

    console.log(`🎯 [BANT] Conversação no estágio: ${bantContext.currentStage}`);
  }

  // 🎯 DETECÇÃO DE INTENÇÃO: CONHECER A DIGITAL BOOST
  const wantsDigitalBoostInfo = detectDigitalBoostIntent(userText);
  const isWhatsAppForBoost = context.whatsapp || context.fromWhatsApp || context.platform === 'whatsapp';

  // Verificar se já perguntamos a preferência (ANTES de checar detecção)
  const awaitingPreference = await getMemory(`digitalboost_awaiting_${contactId}`);

  console.log(`🔍 [DIGITAL-BOOST-DEBUG] Detecção: wantsInfo=${wantsDigitalBoostInfo}, isWhatsApp=${isWhatsAppForBoost}, awaiting=${awaitingPreference}, texto="${userText}"`);

  // Processar se detectou intenção OU se está aguardando resposta
  if ((wantsDigitalBoostInfo || awaitingPreference === 'true') && isWhatsAppForBoost) {
    console.log('💡 [DIGITAL-BOOST] Intenção detectada ou aguardando escolha do usuário');

    if (awaitingPreference === 'true') {
      // Usuário já foi questionado, detectar escolha
      const preference = detectPreferenceChoice(userText);

      if (preference === 'audio') {
        console.log('🎤 [DIGITAL-BOOST] Usuário escolheu ÁUDIO');
        await setMemory(`digitalboost_awaiting_${contactId}`, 'false');

        // Retornar sinal especial para enviar áudio
        return {
          answer: "Perfeito! Vou te enviar um áudio explicando sobre a Digital Boost.",
          sendDigitalBoostAudio: true,
          contactId,
          success: true
        };

      } else if (preference === 'texto') {
        console.log('📝 [DIGITAL-BOOST] Usuário escolheu TEXTO');
        await setMemory(`digitalboost_awaiting_${contactId}`, 'false');

        // Retornar explicação em texto
        return {
          answer: DIGITAL_BOOST_EXPLANATION_TEXT,
          success: true
        };

      } else {
        // Não detectou preferência clara, perguntar novamente
        return {
          answer: "Desculpa, não entendi. Você prefere que eu explique por *áudio* ou por *mensagem de texto*?",
          success: true
        };
      }
    } else {
      // Primeira vez que pergunta, oferecer escolha
      console.log('❓ [DIGITAL-BOOST] Perguntando preferência: áudio ou texto');
      await setMemory(`digitalboost_awaiting_${contactId}`, 'true');

      return {
        answer: "Legal que quer conhecer a Digital Boost! 😊\n\nVocê prefere que eu explique por *áudio* (mais rápido) ou por *mensagem de texto* (para ler com calma)?",
        success: true
      };
    }
  }

  // ⚡ CACHE INTELIGENTE - VERIFICAR RESPOSTA RÁPIDA (usando singleton persistente)
  // BYPASS CACHE para comandos de navegação por voz E Digital Boost
  const isVoiceNavigationCommand = voiceNavigationPrompt && voiceNavigationPrompt.length > 0;
  // Usar awaitingPreference já carregado acima (linha 230)
  const shouldBypassCache = isVoiceNavigationCommand || wantsDigitalBoostInfo || awaitingPreference === 'true';

  let cachedResponse = null;

  if (!shouldBypassCache) {
    const cacheContext = { ...context, agentContext, topic: agentContext.currentTopic };
    cachedResponse = await responseCache.getResponse(userText, cacheContext);
  } else {
    if (isVoiceNavigationCommand) {
      console.log('🎙️ [NAVIGATION-CACHE] Bypassing cache for navigation command');
    }
    if (wantsDigitalBoostInfo || awaitingPreference === 'true') {
      console.log('💡 [DIGITAL-BOOST-CACHE] Bypassing cache for Digital Boost interaction');
    }
  }

  if (cachedResponse) {
    console.log(`⚡ [CACHE] Resposta ${cachedResponse.source} encontrada - economizando tempo de processamento`);

    // 🎯 CORREÇÃO CRÍTICA: Aplicar sistema flexível MESMO em respostas em cache
    // ⚡ Using pre-loaded scopeLimiter module
    const cacheContext = {
      ...context,
      agentContext,
      topic: agentContext.currentTopic,
      // 🎯 GARANTIR que contexto de voz seja preservado para cache
      fromVoice: context.fromVoice,
      fromVoiceInput: context.fromVoiceInput,
      inputMethod: context.inputMethod,
      voice: context.voice,
      platform: context.platform
    };

    // 🛡️ DESABILITAR SCOPE LIMITER PARA WHATSAPP - deixar conversa livre
    const isWhatsAppCacheContext = context.whatsapp || context.fromWhatsApp || context.platform === 'whatsapp';
    let filteredCacheResponse = cachedResponse.response;
    let scopeAnalysis = null;

    if (!isWhatsAppCacheContext) {
      scopeAnalysis = await scopeLimiter.analyzeScope(userText, cacheContext);
      console.log(`🎯 [SCOPE-CACHE] Análise em resposta cacheada: ${scopeAnalysis.isInScope ? 'PERMITIDO' : 'FILTRADO'} (${scopeAnalysis.confidence.toFixed(2)})`);

      // Filtrar resposta do cache com sistema flexível (apenas dashboard)
      filteredCacheResponse = await scopeLimiter.filterAgentResponse(cachedResponse.response, userText, scopeAnalysis);
    } else {
      console.log('📱 [SCOPE-CACHE] Scope limiter desabilitado para WhatsApp - conversa livre');
    }

    // 🔥 CORREÇÃO CRÍTICA: Preservar estrutura JSON original para comandos de navegação
    if (typeof cachedResponse.response === 'object' && cachedResponse.response.action) {
      // Resposta JSON estruturada (ex: comandos de navegação)
      return {
        answer: cachedResponse.response.response || filteredCacheResponse,
        response: cachedResponse.response.response || filteredCacheResponse,
        action: cachedResponse.response.action,
        instructions: cachedResponse.response.instructions,
        cached: true,
        cacheSource: cachedResponse.source,
        similarity: cachedResponse.similarity,
        scopeAnalysis: isWhatsAppCacheContext ? null : scopeAnalysis,
        fullContext,
        agentContext,
        success: true
      };
    } else {
      // Resposta de texto simples
      return {
        answer: filteredCacheResponse,
        response: filteredCacheResponse, // 🔥 ADICIONADO: propriedade response que o orchestrator espera
        cached: true,
        cacheSource: cachedResponse.source,
        similarity: cachedResponse.similarity,
        scopeAnalysis: isWhatsAppCacheContext ? null : scopeAnalysis,
        fullContext,
        agentContext,
        action: 'cached_response',
        success: true
      };
    }
  }

  // 🎯 ANÁLISE DE ESCOPO - MOVIDA PARA DEPOIS DA GERAÇÃO DE RESPOSTA (FLUXO CORRIGIDO)
  // Agora apenas salvamos para usar depois, sem bloquear entrada
  // ⚡ Using pre-loaded scopeLimiter module
  let scopeAnalysis = null; // Será analisado depois

  console.log(`🎯 [SCOPE] Análise será feita após geração da resposta (novo fluxo)`);

  // CORREÇÃO: Não bloquear entrada, permitir que response mode calculator funcione

  // ⚠️ DETECÇÃO DE COMANDO PARAR - PRIORIDADE MÁXIMA
  const stopWords = ['parar', 'pare', 'stop', 'sair', 'remover', 'cancelar', 'bloquear'];
  const userTextLower = userText?.toLowerCase() || '';

  if (stopWords.some(word => userTextLower.includes(word))) {
    console.log('🛑 Comando PARAR detectado:', userText);
    return {
      answer: "Entendido! Vou parar por aqui. Obrigado pela conversa! 👋",
      action: 'stop_conversation'
    };
  }

  // 🎯 SALES FLOW CONTROLLER - FORÇA FLUXO ESTRUTURADO
  // ⚡ CORREÇÃO CRÍTICA: Aplicar Sales Flow Controller APENAS para contexto WhatsApp
  // Evita que comandos de voz/dashboard sejam processados como mensagens de vendas
  const isVoiceOrDashboardContext = context.platform === 'dashboard_web' || context.fromVoiceInput || context.inputMethod === 'voice';

  // ❌ DESATIVADO - Sales Flow Controller removido devido a conflito com BANT Framework
  // Este sistema rígido força respostas pré-definidas e remove flexibilidade consultiva
  // BANT Framework agora gerencia o fluxo de vendas de forma natural e contextual
  /*
  if (!isVoiceOrDashboardContext) {
    console.log('🎯 [SALES-FLOW] Processando através do Sales Flow Controller (contexto WhatsApp)');

    // ⚡ Using pre-loaded createSalesFlowController module
    const contactNumber = context.from || context.phoneNumber || 'test_contact';
    const flowController = createSalesFlowController(contactNumber);

    // 🚀 PROCESSAR ATRAVÉS DO FLUXO ESTRUTURADO (APENAS PARA WHATSAPP)
    const flowResult = await flowController.processMessage(userText, history);

    if (flowResult.forceStructuredResponse) {
    console.log(`🎯 [AGENT] Usando resposta estruturada do fluxo: ${flowResult.currentStage}`);

    // Retornar resposta do fluxo estruturado
    return {
      answer: flowResult.response,
      response: flowResult.response, // ← CORREÇÃO: MessageOrchestrator espera 'response'
      success: true, // ← CORREÇÃO: Garantir que seja marcado como sucesso
      salesData: {
        flowController: true,
        currentStage: flowResult.currentStage,
        nextAction: flowResult.nextAction,
        analysis: flowResult.analysis
      },
      structuredFlow: true,
      processingTime: Date.now() - startTime,
      timestamp: new Date().toISOString()
    };
    }
  } else {
    console.log('🎙️ [SALES-FLOW] Pulando Sales Flow Controller para contexto voz/dashboard - processamento direto');
  }
  */
  console.log('✅ [AGENT] Sales Flow Controller desativado - usando processamento BANT natural');

  // 💚 DETECÇÃO DE OFF-TOPIC COM EMPATIA
  const offTopicCheck = contextManager.detectOffTopicWithEmpathy(userText, history);
  if (offTopicCheck.isOffTopic) {
    console.log(`💚 [OFF-TOPIC] Detectado: ${offTopicCheck.type} - Respondendo com empatia`);
    return {
      answer: offTopicCheck.empatheticResponse,
      response: offTopicCheck.empatheticResponse,
      success: true,
      offTopic: true,
      offTopicType: offTopicCheck.type,
      shouldPauseFollowUp: offTopicCheck.shouldPause,
      processingTime: Date.now() - startTime,
      timestamp: new Date().toISOString()
    };
  }

  // 🚀 NOVA INTEGRAÇÃO ENHANCED - Aproveita análise do unified_message_processor
  let enhancedContext = null;
  if (context.useEnhancedContext && context.enhancedState) {
    enhancedContext = context.enhancedState;
    console.log(`🧠 [AGENT ENHANCED] Usando contexto enhanced:`, {
      estado: enhancedContext.state?.current,
      score: enhancedContext.qualification?.score,
      sentimento: enhancedContext.sentiment?.emotion
    });
  }

  // Processo simplificado sem pesquisa externa
  let researchResult = null;

  // 🚀 SEPARAÇÃO CRÍTICA: Sistema de voz vs sistema de vendas
  const isVoiceContext = shouldProcessVoiceNav; // Usar a variável já definida anteriormente

  // Integra inteligência de vendas se disponível - APENAS para contextos não-voz
  let enhancedSystemPrompt = [];
  let salesAnalysis = null;

  if (!isVoiceContext) {
    // 🎯 CALCULAR MODO DE RESPOSTA (consultivo vs objetivo)
    const responseMode = calculateResponseMode(
      history,
      userText,
      {
        bant: enhancedContext?.bant || null,
        qualificationScore: enhancedContext?.qualification?.score
      }
    );

    // Sistema de vendas/WhatsApp: usar prompts completos
    enhancedSystemPrompt = buildSystemPrompt(enhancedContext, agentContext, sdrEnhancements, responseMode);
    console.log('🎯 [SEPARATION] Usando sistema de VENDAS - prompts completos ativados');
  } else {
    // Sistema de voz: prompts minimalistas apenas
    enhancedSystemPrompt = [];
    console.log('🎙️ [SEPARATION] Usando sistema de VOZ - prompts de vendas DESABILITADOS');
  }

  try {
    // ⚡ SEPARAÇÃO CRÍTICA: Análise de vendas APENAS para contextos não-voz
    if (!isVoiceContext) {
      console.log('🎯 [SEPARATION] Iniciando análises de VENDAS para contexto WhatsApp');

      // ⚡ Using pre-loaded sales intelligence modules
      // analyzeConversationFlow, identifyPersona, detectObjection already imported
      // ⚡ analyzeAndSelectArchetype, applyArchetypeToScript, selectArchetypeByPersona, ARCHETYPES already imported

      // Otimização para diferentes contextos: análise simplificada para velocidade
      // Reutilizar isWhatsAppMessage já declarado na linha 247
      const isVoiceOrAPIContext = context.platform === 'dashboard_web' || context.fromVoiceInput || context.inputMethod === 'voice' || !context.whatsapp;

    // ⚡ PERFORMANCE OPTIMIZATION: Parallelizar análises independentes
    console.time('⚡ Parallel Analysis');

    const analysisPromises = [];

    // 1. Sales Analysis - executar apenas se há histórico
    if (history.length > 0) {
      if (isWhatsAppMessage && history.length < 3) {
        // Para WhatsApp com pouco histórico, faz análise básica rápida (síncrona)
        salesAnalysis = {
          current_stage: 'initial_contact',
          next_stage: 'interest_discovery',
          interest_level: 5,
          pain_points: ['necessita de soluções'],
          sales_strategy: 'Descobrir necessidades e qualificar interesse',
          response_tone: 'consultivo e direto',
          ready_for_meeting: false
        };
      } else {
        // ❌ DESABILITADO: Análise redundante - Sales Flow Controller já faz isso
        // Executar análise de vendas em paralelo (assíncrona)
        // analysisPromises.push(
        //   analyzeConversationFlow(userText, history).then(result => ({ type: 'sales', data: result }))
        // );
      }
    }

    // 2. Persona Analysis - executar se há contexto empresarial (síncrona, mas pode ser executada em paralelo com outras operações síncronas)
    let personaData = null;
    if (context.businessInfo || userText.length > 50) {
      personaData = identifyPersona(
        context.businessInfo || userText,
        [],
        [],
        context.leadName || context.contactName || ''
      );
      context.persona = personaData;
    }

    // 3. Keyword Detection - executar de forma otimizada (operações síncronas leves)
    // ⚡ SEPARAÇÃO: Funcionalidades SDR apenas para WhatsApp, não para voz/dashboard
    const objectionKeywords = ['caro', 'orçamento', 'momento', 'ocupado', 'sócio', 'decidir', 'complexo'];
    const meetingKeywords = ['agendar', 'reunião', 'meeting', 'marcar', 'conversar', 'encontro', 'horário', 'amanhã', 'hoje', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'manhã', 'tarde', 'às', 'horas'];

    const lowerUserText = userText.toLowerCase();

    // ⚡ SEPARAÇÃO CRÍTICA: Funcionalidades SDR SOMENTE para contexto WhatsApp
    const hasObjection = !isVoiceOrAPIContext && objectionKeywords.some(keyword => lowerUserText.includes(keyword));
    const hasMeetingRequest = !isVoiceOrAPIContext && meetingKeywords.some(keyword => lowerUserText.includes(keyword));

    if (isVoiceOrAPIContext && (hasObjection || hasMeetingRequest)) {
      console.log('🚫 [AGENT-SEPARATION] Bloqueando funcionalidades SDR para agente de voz/dashboard');
    }

    // 4. Objection Analysis - executar apenas se objeção detectada (pode ser paralela)
    if (hasObjection) {
      analysisPromises.push(
        Promise.resolve(detectObjection(userText)).then(result => ({ type: 'objection', data: result }))
      );
    }

    // Aguardar todas as análises paralelas
    const analysisResults = await Promise.all(analysisPromises);

    // Processar resultados das análises paralelas
    for (const result of analysisResults) {
      switch (result.type) {
        case 'sales':
          salesAnalysis = result.data;
          console.log('🎯 Análise de vendas (paralela):', salesAnalysis);
          break;
      }
    }

    // Flags simples (síncronas)
    if (hasMeetingRequest) {
      context.meetingRequest = true;
      console.log('📅 Solicitação de agendamento detectada');
    }

    if (personaData) {
      console.log('👤 Persona identificada:', personaData.persona);
    }

    console.timeEnd('⚡ Parallel Analysis');

    // NOVO: Seleciona arquétipo baseado no contexto completo
    const salesContext = {
      persona: context.persona?.persona,
      salesStage: salesAnalysis?.current_stage,
      interestLevel: salesAnalysis?.interest_level
    };
    
    let archetypeAnalysis;

    if (isVoiceOrAPIContext) {
      // ⚡ OTIMIZAÇÃO VOZ/API: Pula análise de arquétipos para velocidade máxima
      console.log('⚡ [ARCHETYPES] DESABILITADO para navegação por voz/dashboard web');
      archetypeAnalysis = null;
    } else if (isWhatsAppMessage) {
      // Seleção rápida baseada em heurísticas (< 10ms)
      const fastArchetype = selectArchetypeByPersona(context.persona?.persona || 'business_owner', salesContext);
      archetypeAnalysis = {
        archetype: fastArchetype,
        confidence: 0.75,
        reasoning: `Seleção rápida para WhatsApp baseada em: ${salesContext.persona || 'contexto da mensagem'}`,
        archetypeData: ARCHETYPES[fastArchetype]
      };
      console.log('🎭 [ARCHETYPES] ATIVADO para WhatsApp:', archetypeAnalysis.archetype, '(', archetypeAnalysis.confidence, ')');
    } else {
      // Análise completa com AI para outros canais
      archetypeAnalysis = await analyzeAndSelectArchetype(userText, context.businessInfo || '', salesContext);
      console.log('🎭 Arquétipo selecionado:', archetypeAnalysis.archetype, '(', archetypeAnalysis.confidence, ')');
    }

    context.archetypeAnalysis = archetypeAnalysis;

    // Enriquece system prompt com contexto de vendas E arquétipo
    // ⚡ OTIMIZAÇÃO: Para navegação por voz, usa prompt básico sem arquétipos
    if (isVoiceOrAPIContext) {
      // Sistema de voz/dashboard: sem arquétipos, apenas análise de vendas se houver
      console.log('🎭 [ARCHETYPES] Prompt SEM arquétipos para dashboard web/voz');
      if (salesAnalysis || context.persona) {
        // Remove arquétipo do contexto para navegação por voz
        const contextWithoutArchetype = { ...context, archetypeAnalysis: null };
        enhancedSystemPrompt = buildEnhancedSystemPrompt(salesAnalysis, contextWithoutArchetype);
      }
    } else {
      // WhatsApp e outros canais: com arquétipos completos
      console.log('🎭 [ARCHETYPES] Prompt COM arquétipos para WhatsApp/outros canais');
      if (salesAnalysis || context.persona || archetypeAnalysis) {
        enhancedSystemPrompt = buildEnhancedSystemPrompt(salesAnalysis, context);
      }
    }

    } else {
      // 🎙️ CONTEXTO DE VOZ: Sem análises de vendas
      console.log('🎙️ [SEPARATION] Contexto de VOZ detectado - pulando TODAS as análises de vendas');
      console.log('🎙️ [SEPARATION] Sistema de voz puro ativado - sem SDR, sem persona, sem arquétipos');
    }

  } catch (error) {
    if (!isVoiceContext) {
      console.log('⚠️ Erro no sistema de vendas - usando prompt básico:', error.message);
      console.log('📍 Stack trace:', error.stack);
    } else {
      console.log('🎙️ [SEPARATION] Sistema de voz não precisa de análises de vendas');
    }
  }

  // 🚀 CONSTRUÇÃO COMPLETAMENTE SEPARADA: Sistema de voz vs sistema de vendas
  if (isVoiceContext) {
    console.log('🎙️ [SEPARATION] Construindo mensagens para SISTEMA DE VOZ PURO');

    // Para voz: apenas o necessário para navegação/conversação
    messages = [
      ...(Array.isArray(history) ? history : []),
      { role: "user", content: userText || "" }
    ];

    // Adicionar prompt específico de voz se necessário
    if (voiceNavigationPrompt) {
      messages.splice(-1, 0, { role: "system", content: voiceNavigationPrompt });
    } else if (messages.length === 1) {
      // Se não há prompt de navegação, adicionar prompt mínimo de voz
      messages.splice(-1, 0, {
        role: "system",
        content: `🎙️ MODO AGENTE DE VOZ - SISTEMA PURO

Você é ORBION, assistente de voz para o dashboard web da Digital Boost.

📋 SOBRE A DIGITAL BOOST:
A Digital Boost é uma empresa de Growth focada em PMEs de Natal/RN, reconhecida pelo Sebrae como uma das 15 melhores startups de tecnologia do Brasil. Oferecemos:

🤖 **Agentes de IA**: Atendimento e pré-vendas 24/7 com 95% de resolução
🔧 **CRM Kommo**: Automações, funis de vendas e playbooks comerciais
📈 **Consultoria de Growth**: Estratégias digitais de aquisição, retenção e expansão
🎯 **Especialização**: PMEs em Natal e região, com foco em ROI mensurável

DIRETRIZES CRÍTICAS:
- Você está no MODO VOZ PURO (sem funcionalidades de vendas ativas)
- Pode INFORMAR sobre a empresa quando perguntado, mas NUNCA ofereça vendas
- Foque em: navegação, informações sobre a empresa, e conversas gerais
- NUNCA ofereça agendamentos, reuniões ou análises comerciais
- Seja natural, direto e útil

Responda de forma concisa em português brasileiro.`
      });
    }
  } else {
    console.log('🎯 [SEPARATION] Construindo mensagens para SISTEMA DE VENDAS COMPLETO');

    // Para vendas: sistema completo com todas as inteligências
    messages = [
      ...enhancedSystemPrompt,
      ...(Array.isArray(history) ? history : []),
      { role: "user", content: userText || "" }
    ];
  }

  // 🚀 SEPARAÇÃO DE FERRAMENTAS: Voz vs Vendas
  let availableTools = [];
  let maxTokens = 400; // Padrão para voz

  if (isVoiceContext) {
    // Sistema de voz: apenas temas, sem sheets (que são para vendas)
    availableTools = [...themeTools];
    maxTokens = 300; // Respostas concisas para voz
    console.log('🎙️ [SEPARATION] Ferramentas de VOZ: apenas temas disponíveis');
  } else {
    // Sistema de vendas: ferramentas essenciais + agendamento manual
    const schedulingTools = [
      {
        type: 'function',
        function: {
          name: 'schedule_whatsapp_meeting',
          description: 'Agenda reunião no Google Calendar com Google Meet e notifica o cliente via WhatsApp automaticamente. Quando usado em conversa do WhatsApp, o número é detectado automaticamente.',
          parameters: {
            type: 'object',
            properties: {
              email: { type: 'string', description: 'Email do cliente para convite do Google Calendar (OBRIGATÓRIO)' },
              title: { type: 'string', description: 'Título/assunto da reunião' },
              datetime: { type: 'string', description: 'Data e hora em formato ISO 8601' },
              notes: { type: 'string', description: 'Observações sobre a reunião' }
            },
            required: ['email', 'title', 'datetime']
          }
        }
      }
    ];

    availableTools = [...sheetsTools, ...themeTools, ...schedulingTools];
    maxTokens = context.whatsapp || context.fromWhatsApp ? 200 : 400;
    console.log('🎯 [SEPARATION] Ferramentas de VENDAS: sheets + temas + agendamento disponíveis');
  }
  const resp = await openaiClient.createChatCompletion(messages, {
    max_tokens: maxTokens,
    temperature: 0.7,
    tools: availableTools,
    tool_choice: availableTools.length > 0 ? "auto" : "none"
  });

  // Verificar se o agente quer usar tools
  const message = resp.choices?.[0]?.message;

  if (message?.tool_calls && message.tool_calls.length > 0) {
    console.log('🔧 Agente solicitou tools:', message.tool_calls.map(tc => tc.function.name));

    // Executar todos os tool calls
    const toolResults = [];
    for (const toolCall of message.tool_calls) {
      try {
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments);

        console.log(`🔧 Executando ${functionName} com argumentos:`, functionArgs);

        // Router para decidir qual executor usar
        let result;
        if (functionName === 'change_theme') {
          result = await executeThemeTool(functionName, functionArgs);
        } else if (functionName === 'schedule_whatsapp_meeting') {
          // Ferramenta de agendamento - usa contactId se number não fornecido
          const meetingNumber = functionArgs.number || contactId;
          result = await scheduleWhatsAppMeeting(meetingNumber, functionArgs.email, functionArgs.title, functionArgs.datetime, functionArgs.notes || '');
        } else {
          result = await executeSheetsTool(functionName, functionArgs);
        }

        toolResults.push({
          tool_call_id: toolCall.id,
          role: "tool",
          content: JSON.stringify(result)
        });

        console.log(`✅ Tool ${functionName} executado com sucesso`);

      } catch (error) {
        console.error(`❌ Erro ao executar tool ${toolCall.function.name}:`, error);
        toolResults.push({
          tool_call_id: toolCall.id,
          role: "tool",
          content: JSON.stringify({
            success: false,
            error: error.message
          })
        });
      }
    }

    // Segunda chamada: com os resultados dos tools
    const messagesWithTools = [
      ...messages,
      message,
      ...toolResults
    ];

    const finalResp = await openaiClient.createChatCompletion(messagesWithTools, {
      max_tokens: maxTokens,
      temperature: 0.7
    });

    const answer = finalResp.choices?.[0]?.message?.content?.trim() ||
      "Executei as ações solicitadas, mas não consegui gerar uma resposta.";

    return {
      answer,
      response: answer, // ← CORREÇÃO: MessageOrchestrator espera 'response'
      // Metadados enriquecidos
      model: CHAT_MODEL,
      archetype: context.archetypeAnalysis?.archetype || 'SABIO',
      stage: salesAnalysis?.current_stage || 'initial_contact',
      persona: context.persona?.persona || 'NEUTRO',
      tokens_used: finalResp.usage?.total_tokens || 0,
      processing_time: Date.now() - startTime,
      tools_used: message.tool_calls?.map(tc => tc.function.name) || []
    };
  }

  // Se não houve tool calls, retornar resposta normal
  let answer =
    message?.content?.trim() ||
    "Não consegui gerar uma resposta agora.";

  // 🎯 ANALISAR ESCOPO APÓS GERAR RESPOSTA (FLUXO CORRIGIDO)
  // 🛡️ DESABILITAR SCOPE LIMITER PARA WHATSAPP - deixar conversa livre
  // isWhatsAppMessage já declarado anteriormente (linha 617)

  if (!isWhatsAppMessage) {
    scopeAnalysis = await scopeLimiter.analyzeScope(userText, context);
    console.log(`🎯 [SCOPE] Análise pós-resposta: ${scopeAnalysis.isInScope ? 'PERMITIDO' : 'FILTRADO'} (${scopeAnalysis.confidence.toFixed(2)})`);

    // 🎯 FILTRAR RESPOSTA COM LIMITADOR DE ESCOPO (apenas dashboard)
    answer = await scopeLimiter.filterAgentResponse(answer, userText, scopeAnalysis);
  } else {
    console.log('📱 [SCOPE] Scope limiter desabilitado para WhatsApp - conversa livre');
  }

  // 🎯 DETECTAR COMANDOS DE NAVEGAÇÃO POR VOZ NO GPT RESPONSE
  let voiceNavigationResult = null;

  // 🛡️ PROTEÇÃO CRÍTICA: NUNCA processar mensagens do WhatsApp como navegação por voz
  // Reutilizar isWhatsAppMessage já declarado anteriormente (linha 300)
  const isVoiceDashboard2 = context.platform === 'dashboard_web' && (context.fromVoiceInput || context.inputMethod === 'voice');
  const shouldProcessVoiceNav2 = isVoiceDashboard2 && !isWhatsAppMessage;

  if (shouldProcessVoiceNav2) {
    try {
      // Tentar parsear resposta como JSON se contém action: voice_navigation
      if (answer.includes('"action":') && answer.includes('voice_navigation')) {
        // Buscar JSON de forma mais flexível - múltiplas tentativas
        // Buscar JSON válido mais robustamente
        const jsonCandidates = [];

        // Método 1: Procurar por JSON completo balanceado
        let braceCount = 0;
        let startIndex = -1;
        for (let i = 0; i < answer.length; i++) {
          if (answer[i] === '{') {
            if (braceCount === 0) startIndex = i;
            braceCount++;
          } else if (answer[i] === '}') {
            braceCount--;
            if (braceCount === 0 && startIndex !== -1) {
              jsonCandidates.push(answer.substring(startIndex, i + 1));
            }
          }
        }

        // Método 2: Fallback para regex tradicional
        if (jsonCandidates.length === 0) {
          const regexMatch = answer.match(/\{[^{}]*"action"[^{}]*\}/);
          if (regexMatch) jsonCandidates.push(regexMatch[0]);
        }

        // Tentar parsear cada candidato
        for (const jsonCandidate of jsonCandidates) {
          try {
            const parsedResponse = JSON.parse(jsonCandidate);
            if (parsedResponse.action === 'voice_navigation') {
              console.log('🎙️ [VOICE-INTELLIGENCE] GPT detectou comando de navegação:', parsedResponse);

              // 🔧 GARANTIR QUE INSTRUCTIONS TEM CAMPO JAVASCRIPT
              let instructions = parsedResponse.instructions;
              // ⚠️ CÓDIGO LEGADO: dashboard_voice_navigator não existe mais
              // if (instructions && !instructions.javascript && instructions.target) {
              //   const navResult = dashboardVoiceNavigator.generateJavaScriptForTarget(instructions.target);
              //   if (navResult) {
              //     instructions.javascript = navResult.javascript;
              //     console.log('🔧 [VOICE-FIX] JavaScript gerado para target:', instructions.target, '→', instructions.javascript);
              //   }
              // }

              voiceNavigationResult = {
                action: 'voice_navigation',
                response: parsedResponse.response || answer,
                instructions: instructions
              };
              // Use a resposta limpa sem JSON
              answer = parsedResponse.response || answer.replace(jsonCandidate, '').trim();
              break;
            }
          } catch (parseError) {
            // Silencioso para não poluir logs - é esperado ter alguns candidatos inválidos
            continue;
          }
        }
      }
    } catch (error) {
      console.log('🎙️ [VOICE-INTELLIGENCE] Erro ao parsear resposta de navegação:', error);
    }
  }

  // 💾 SALVAR RESPOSTA NO CACHE PARA ACELERAR FUTURAS CONSULTAS
  const saveCacheContext = {
    topic: scopeAnalysis?.detectedTopics?.[0]?.name || 'general',
    fromAudio: context.fromAudio || false,
    stage: salesAnalysis?.current_stage || 'initial_contact'
  };
  await responseCache.cacheResponse(userText, answer, saveCacheContext);

  // 🎯 RETORNAR RESPOSTA COM NAVEGAÇÃO POR VOZ SE DETECTADA
  if (voiceNavigationResult) {
    console.log('🎙️ [VOICE-FINAL] Retornando resultado de navegação:', {
      action: voiceNavigationResult.action,
      instructions: voiceNavigationResult.instructions,
      hasJavaScript: !!(voiceNavigationResult.instructions && voiceNavigationResult.instructions.javascript)
    });

    return {
      answer,
      response: voiceNavigationResult.response,
      action: voiceNavigationResult.action,
      instructions: voiceNavigationResult.instructions,
      dashboardCommand: true,
      success: true,
      processingTime: Date.now() - startTime,
      model: CHAT_MODEL
    };
  }

  // 💾 SALVAR ENHANCED STATE ATUALIZADO (CRÍTICO PARA CONTINUIDADE)
  if (contactId && contactId !== 'unknown' && isWhatsAppForSDR) {
    try {
      const bantInfo = sdrEnhancements?.bantContext?.bantInfo || {};
      const currentStage = sdrEnhancements?.bantContext?.currentStage || 'DISCOVERY';

      const updatedState = {
        state: {
          current: currentStage,
          subState: agentContext?.currentTopic || 'initial',
          transitions: enhancedState?.state?.transitions || []
        },
        qualification: {
          score: calculateQualificationScore(bantInfo),
          completeness: {
            budget: !!bantInfo.budget,
            authority: !!bantInfo.authority,
            need: !!bantInfo.need,
            timing: !!bantInfo.timing
          }
        },
        sentiment: {
          current: agentContext?.sentiment || 'neutral',
          trend: 'stable'
        },
        engagement: {
          level: conversationHistory.length > 10 ? 'high' : conversationHistory.length > 5 ? 'medium' : 'low',
          responseTime: 'normal',
          momentum: conversationHistory.length > 0 ? 'building' : 'initial'
        },
        nextBestAction: determineNextAction(bantInfo, currentStage),
        metadata: {
          lastInteractionAt: new Date().toISOString(),
          messageCount: conversationHistory.length + 1,
          bantInfo: bantInfo,
          lastResponseMode: responseMode?.mode || 'CONSULTIVO'
        }
      };

      await saveEnhancedState(contactId, updatedState);
      console.log(`💾 [ESTADO SALVO] ${contactId}: stage=${currentStage}, score=${updatedState.qualification.score}, next=${updatedState.nextBestAction}`);
    } catch (err) {
      console.error(`❌ [ERRO SALVAMENTO] Falha ao salvar enhanced state: ${err.message}`);
    }
  }

  // Resposta simples sem otimizações conflitantes
  let finalAnswer = answer;

  return {
    answer: finalAnswer,
    response: finalAnswer,
    success: true,
    // 🎯 BANT Framework Context
    bantContext: sdrEnhancements?.bantContext || null,
    salesData: {
      analysis: salesAnalysis,
      persona: context.persona,
      archetype: context.archetypeAnalysis
    },
    // 🚀 ENHANCED CONTEXT INTEGRATION (se disponível)
    enhancedContext: enhancedContext ? {
      conversationState: enhancedContext.state?.current,
      subState: enhancedContext.state?.subState,
      qualificationScore: enhancedContext.qualification?.score,
      sentiment: enhancedContext.sentiment,
      engagement: enhancedContext.engagement,
      momentum: enhancedContext.engagement?.momentum,
      nextBestAction: enhancedContext.nextBestAction,
      processingVersion: '5.0.0-bant-clean'
    } : null,
    processingTime: Date.now() - startTime,
    timestamp: new Date().toISOString()
  };
}

/**
 * Constrói prompt enriquecido com inteligência de vendas
 */
function buildEnhancedSystemPrompt(salesAnalysis, context) {
  const basePrompt = buildSystemPrompt()[0];
  
  let enhancementText = "";
  
  // Adiciona contexto da análise de vendas
  if (salesAnalysis) {
    enhancementText += `\n\n🎯 CONTEXTO ATUAL DA CONVERSA:
- Estágio: ${salesAnalysis.current_stage} → ${salesAnalysis.next_stage}
- Nível de interesse: ${salesAnalysis.interest_level}/10
- Dores identificadas: ${Array.isArray(salesAnalysis.pain_points) && salesAnalysis.pain_points.length > 0 ? salesAnalysis.pain_points.join(', ') : 'A descobrir'}
- Estratégia: ${salesAnalysis.sales_strategy}
- Tom recomendado: ${salesAnalysis.response_tone}
- Pronto para reunião: ${salesAnalysis.ready_for_meeting ? 'SIM' : 'NÃO'}`;
  }
  
  // Adiciona contexto da persona
  if (context.persona) {
    const persona = context.persona.profile;
    enhancementText += `\n\n👤 PERSONA IDENTIFICADA: ${persona.title}
- Dores típicas: ${Array.isArray(persona.pain_points) ? persona.pain_points.slice(0, 3).join(', ') : 'N/A'}
- Objetivos: ${Array.isArray(persona.goals) ? persona.goals.slice(0, 2).join(', ') : 'N/A'}
- Objeções comuns: ${Array.isArray(persona.objections) ? persona.objections.slice(0, 2).join(', ') : 'N/A'}
- Hook recomendado: ${persona.approach?.hook || 'N/A'}`;
  }
  
  // Objeções agora são tratadas pelo BANT framework automaticamente
  
  
  // NOVO: Adiciona contexto do arquétipo selecionado
  if (context.archetypeAnalysis) {
    const archetype = context.archetypeAnalysis.archetypeData;
    enhancementText += `\n\n🎭 ARQUÉTIPO ATIVADO: ${archetype.name} (${context.archetypeAnalysis.confidence})
- Motivação Core: ${archetype.coreMotivation}
- Estilo de Voz: ${archetype.voiceStyle}
- Valores a Incorporar: ${Array.isArray(archetype.coreValues) ? archetype.coreValues.slice(0, 3).join(', ') : 'N/A'}
- Abordagem de Discovery: ${archetype.salesApproach?.discovery || 'N/A'}
- Tratamento de Objeções: ${archetype.salesApproach?.objection || 'N/A'}
- Estratégia de Fechamento: ${archetype.salesApproach?.closing || 'N/A'}
- Razão da Seleção: ${context.archetypeAnalysis.reasoning}

INSTRUÇÃO CRITICAL: Use EXATAMENTE o tom, linguagem e abordagem do arquétipo ${archetype.name}. Incorpore os valores core na sua resposta e aplique a estratégia de vendas específica deste arquétipo.`;
  }
  
  // Adiciona instruções específicas baseadas no contexto
  if (salesAnalysis?.ready_for_meeting) {
    const archetypeClosing = context.archetypeAnalysis?.archetypeData?.salesApproach?.closing || 'solicite reunião diretamente';
    const firstPainPoint = Array.isArray(salesAnalysis.pain_points) && salesAnalysis.pain_points.length > 0 ? salesAnalysis.pain_points[0] : null;
    enhancementText += `\n\n⚡ AÇÃO PRIORITÁRIA: SOLICITAR REUNIÃO AGORA
Use a abordagem do arquétipo ${context.archetypeAnalysis?.archetype || 'SABIO'}: ${archetypeClosing}
Exemplo: "Baseado no que conversamos, vejo uma oportunidade real de ${firstPainPoint ? 'resolver ' + firstPainPoint : 'te ajudar'}. Que tal uma Consultoria Estratégica Gratuita de 30min com Taylor Lapenda ainda esta semana?"`;
  }

  // Instruções específicas para agendamento
  if (context.meetingRequest) {
    enhancementText += `\n\n📅 SOLICITAÇÃO DE AGENDAMENTO DETECTADA!

🎯 AÇÃO OBRIGATÓRIA: USE A FERRAMENTA schedule_whatsapp_meeting

INSTRUÇÕES CRÍTICAS:
- Cliente demonstrou interesse em agendar
- SEMPRE use a ferramenta para confirmar o agendamento
- Peça apenas EMAIL e HORÁRIO PREFERIDO
- O número do WhatsApp será detectado automaticamente
- Formato: schedule_whatsapp_meeting(email, título, datetime, observações)
- Exemplo de datetime: "2024-09-15T14:00:00.000Z" (formato ISO)
- Título sugerido: "Reunião Estratégica Digital Boost - [Nome do Cliente]"

FLUXO DE AGENDAMENTO:
1. Confirme interesse e colete dados (email, melhor horário)
2. Sugira 2-3 opções de horário
3. Quando cliente confirmar: USE IMEDIATAMENTE a ferramenta schedule_whatsapp_meeting
4. Confirme o agendamento criado

⚠️ CRÍTICO: NÃO apenas fale sobre agendar - EFETIVAMENTE agende usando a ferramenta!`;
  }

  return [{
    role: "system",
    content: basePrompt.content + enhancementText
  }];
}

/**
 * Wrapper Express compatível com o server.js
 * POST /api/chat => { user_message, history? }
 */
export async function chatHandler(req, res) {
  // Esta função é especificamente para endpoints Express.js
  // NÃO deve ser chamada diretamente - use agent() para chamadas diretas
  if (!res || typeof res.json !== 'function') {
    throw new Error('chatHandler requires Express response object. Use agent() for direct calls.');
  }

  try {
    const body = req.body || {};
    const text = (body.user_message || body.message || "").toString().trim();
    const history = Array.isArray(body.history) ? body.history : [];

    if (!text) {
      return res.json({ answer: "Mensagem vazia." });
    }

    // Extract lead/contact information for intelligent persona analysis
    const context = {
      leadName: body.leadName || body.contactName || body.profileName || "",
      contactName: body.contactName || body.leadName || body.profileName || "",
      businessInfo: body.businessInfo || "",
      whatsapp: body.fromWhatsApp || body.whatsapp || false,
      fromWhatsApp: body.fromWhatsApp || false
    };

    const out = await agent(text, history, context);
    const answer = typeof out === "string" ? out : out?.answer || "Sem resposta.";
    return res.json({ answer, ...(typeof out === "object" ? out : {}) });
  } catch (err) {
    console.error("Erro no chatHandler:", err);
    return res.status(500).json({ answer: "Falha no agente." });
  }
}

/**
 * 📊 Calcula score de qualificação baseado em BANT
 * 0-100: Quanto mais completo o BANT, maior o score
 */
function calculateQualificationScore(bantInfo = {}) {
  let score = 0;

  // Budget (30 pontos)
  if (bantInfo.budget) {
    score += 30;
    // Bonus se tem valor específico (não apenas "sim" ou "tenho")
    if (bantInfo.budget.match(/r?\$?\s*\d+/i)) {
      score += 5;
    }
  }

  // Authority (25 pontos)
  if (bantInfo.authority) {
    score += 25;
    // Bonus se é decisor direto
    if (bantInfo.authority.toLowerCase().includes('decisor') ||
        bantInfo.authority.toLowerCase().includes('dono') ||
        bantInfo.authority.toLowerCase().includes('diretor')) {
      score += 5;
    }
  }

  // Need (30 pontos)
  if (bantInfo.need) {
    score += 30;
    // Bonus se menciona dor específica
    if (bantInfo.need.length > 50) {
      score += 5;
    }
  }

  // Timing (15 pontos)
  if (bantInfo.timing) {
    score += 15;
    // Bonus se é urgente
    if (bantInfo.timing.toLowerCase().includes('urgente') ||
        bantInfo.timing.toLowerCase().includes('agora') ||
        bantInfo.timing.toLowerCase().includes('logo')) {
      score += 5;
    }
  }

  return Math.min(score, 100); // Cap em 100
}

/**
 * 🎯 Determina próxima melhor ação baseado em BANT e estágio
 */
function determineNextAction(bantInfo = {}, currentStage = 'DISCOVERY') {
  const bantComplete = {
    budget: !!bantInfo.budget,
    authority: !!bantInfo.authority,
    need: !!bantInfo.need,
    timing: !!bantInfo.timing
  };

  const completedCount = Object.values(bantComplete).filter(v => v).length;

  // BANT completo = próximo passo é proposta/reunião
  if (completedCount === 4) {
    return 'SCHEDULE_MEETING';
  }

  // 3/4 BANT = próximo passo é completar BANT
  if (completedCount === 3) {
    if (!bantComplete.budget) return 'ASK_BUDGET';
    if (!bantComplete.authority) return 'ASK_AUTHORITY';
    if (!bantComplete.need) return 'ASK_NEED';
    if (!bantComplete.timing) return 'ASK_TIMING';
  }

  // Menos de 3 BANT = continuar discovery consultivo
  if (completedCount < 3) {
    // Priorizar: Need > Timing > Authority > Budget
    if (!bantComplete.need) return 'DISCOVER_PAIN';
    if (!bantComplete.timing) return 'ASK_TIMING';
    if (!bantComplete.authority) return 'ASK_AUTHORITY';
    if (!bantComplete.budget) return 'ASK_BUDGET';
  }

  // Default: continuar descoberta
  return 'CONTINUE_DISCOVERY';
}


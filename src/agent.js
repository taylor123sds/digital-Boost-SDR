// agent_v2_simplified.js
// 🎯 ORBION v2.0 - Agente SDR Unificado e Simplificado
// Reduzido de 1365 linhas para ~450 linhas mantendo todas funcionalidades essenciais

import openaiClient from './core/openai_client.js';
import { getEnhancedState, saveEnhancedState, getRecentMessages } from './memory.js';
import { BANTUnifiedSystem } from './tools/bant_unified.js';
import contextManager from './tools/context_manager.js';
import { searchKnowledge } from './tools/search_knowledge.js';

// ============================================================================
// 📋 CONFIGURAÇÃO DO AGENTE
// ============================================================================

const COMPANY_PROFILE = {
  name: 'Digital Boost',
  location: 'Natal, RN',
  focus: 'Agentes de IA + Automações para PMEs',
  recognition: 'Top 15 startups tech do Brasil (Sebrae)',
  target: 'PMEs locais que querem crescer com tecnologia',
  services: [
    'Agentes de IA para atendimento 24/7',
    'Automação de WhatsApp e CRM (Kommo)',
    'Consultoria de crescimento digital',
    'Integração com sistemas existentes'
  ]
};

// ============================================================================
// 🎯 FUNÇÃO PRINCIPAL - CHAT HANDLER
// ============================================================================

export async function chatHandler(userMessage, context = {}) {
  console.log('\n🎯 ========== ORBION v2.0 - NOVA MENSAGEM ==========');
  console.log(`📨 Mensagem: "${userMessage}"`);
  console.log(`👤 Contato: ${context.fromContact || 'desconhecido'}`);

  try {
    // 1️⃣ RECUPERAR MEMÓRIA DE LONGO PRAZO
    const contactId = context.fromContact || context.from || 'unknown';
    let enhancedState = null;
    let conversationHistory = [];

    if (contactId && contactId !== 'unknown') {
      enhancedState = await getEnhancedState(contactId);
      conversationHistory = await getRecentMessages(contactId, 20);

      if (enhancedState) {
        console.log(`🧠 [MEMÓRIA] Recuperado estado: ${enhancedState.state.current} (score: ${enhancedState.qualification.score})`);
      }
    }

    // 2️⃣ INICIALIZAR SISTEMA BANT UNIFICADO
    const bantSystem = new BANTUnifiedSystem();

    // Restaurar estado BANT se existir
    if (enhancedState?.bant) {
      bantSystem.collectedInfo = enhancedState.bant;
      bantSystem.currentStage = enhancedState.state.current || 'opening';
    }

    // Processar mensagem com BANT
    const bantResult = await bantSystem.processMessage(userMessage, conversationHistory.map(m => m.text));

    console.log(`🎯 [BANT] Estágio: ${bantResult.stage} (${bantResult.qualificationScore}% qualificado)`);
    console.log(`🎭 [PERSONA] Arquétipo: ${bantResult.archetype || 'detectando...'}`);
    if (bantResult.persona) console.log(`🌴 [REGIONAL] Persona: ${bantResult.persona}`);

    // 3️⃣ VERIFICAR OFF-TOPIC
    const offTopicCheck = await contextManager.detectOffTopicWithEmpathy(
      userMessage,
      conversationHistory.map(m => m.text),
      'vendas de IA e automação para PMEs'
    );

    // 4️⃣ BUSCAR CONHECIMENTO (RAG) se necessário
    let knowledgeContext = '';
    if (offTopicCheck.shouldSearchKnowledge || userMessage.toLowerCase().includes('digital boost')) {
      const knowledge = await searchKnowledge(userMessage);
      if (knowledge.length > 0) {
        knowledgeContext = `\n📚 CONHECIMENTO RELEVANTE:\n${knowledge.map(k => `- ${k.content}`).join('\n')}\n`;
      }
    }

    // 5️⃣ CONSTRUIR PROMPT PARA GPT
    const systemPrompt = buildSystemPrompt(bantResult, offTopicCheck, knowledgeContext);
    const conversationMessages = buildConversationMessages(conversationHistory, userMessage, systemPrompt);

    // 6️⃣ CHAMAR GPT
    console.log('🤖 [GPT] Enviando para OpenAI...');
    const gptResponse = await openaiClient.createChatCompletion(conversationMessages, {
      model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
      temperature: 0.8,
      max_tokens: 500
    });

    const assistantMessage = gptResponse.choices[0].message.content;
    console.log(`✅ [RESPOSTA] ${assistantMessage.substring(0, 100)}...`);

    // 7️⃣ SALVAR ESTADO ATUALIZADO
    const newState = {
      contactId,
      state: {
        current: bantResult.stage,
        subState: bantResult.mode,
        lastUpdate: new Date().toISOString()
      },
      bant: bantResult.collectedInfo,
      qualification: {
        score: bantResult.qualificationScore,
        archetype: bantResult.archetype,
        persona: bantResult.persona
      },
      engagement: {
        level: calculateEngagementLevel(conversationHistory.length, bantResult.qualificationScore),
        lastInteraction: new Date().toISOString()
      },
      nextBestAction: determineNextAction(bantResult)
    };

    await saveEnhancedState(contactId, newState);
    console.log(`💾 [ESTADO] Salvo: ${bantResult.stage} | Score: ${bantResult.qualificationScore}%`);

    // 8️⃣ RETORNAR RESPOSTA
    return {
      message: assistantMessage,
      context: {
        stage: bantResult.stage,
        score: bantResult.qualificationScore,
        archetype: bantResult.archetype,
        nextAction: newState.nextBestAction
      }
    };

  } catch (error) {
    console.error('🚨 [ERRO] Falha no agente:', error);
    return {
      message: 'Desculpe, tive um problema técnico. Pode repetir a mensagem?',
      error: error.message
    };
  }
}

// ============================================================================
// 📝 CONSTRUÇÃO DE PROMPTS
// ============================================================================

function buildSystemPrompt(bantResult, offTopicCheck, knowledgeContext) {
  const { stage, stageInfo, collectedInfo, archetype, persona, mode, nextQuestion } = bantResult;

  let prompt = `Você é ORBION, SDR (Sales Development Representative) da ${COMPANY_PROFILE.name}.

🏢 CONTEXTO DA EMPRESA:
${COMPANY_PROFILE.name} - ${COMPANY_PROFILE.location}
Foco: ${COMPANY_PROFILE.focus}
Reconhecimento: ${COMPANY_PROFILE.recognition}
Target: ${COMPANY_PROFILE.target}

🎯 SEU OBJETIVO ATUAL:
Estágio BANT: ${stage.toUpperCase()} (${stageInfo.objective})
Modo: ${mode}

`;

  // INFORMAÇÕES JÁ COLETADAS
  const hasAnyInfo = Object.values(collectedInfo).some(v => v !== null);
  if (hasAnyInfo) {
    prompt += `💎 INFORMAÇÕES JÁ COLETADAS (NÃO PERGUNTE NOVAMENTE):\n`;
    if (collectedInfo.need) prompt += `  🔥 DOR: "${collectedInfo.need}" - SEMPRE referencie isso!\n`;
    if (collectedInfo.budget) prompt += `  💰 ORÇAMENTO: "${collectedInfo.budget}"\n`;
    if (collectedInfo.authority) prompt += `  👤 DECISOR: "${collectedInfo.authority}"\n`;
    if (collectedInfo.timing) prompt += `  ⏰ TIMING: "${collectedInfo.timing}"\n`;
    prompt += '\n';
  }

  // PRÓXIMA PERGUNTA BANT
  prompt += `📋 SUA PRÓXIMA PERGUNTA (OBRIGATÓRIA):\n"${nextQuestion.question}"\n\n`;
  prompt += `💡 ORIENTAÇÃO: ${nextQuestion.guidance}\n`;
  prompt += `🎭 TOM: ${nextQuestion.tone}\n\n`;

  // PERSONALIZAÇÃO POR ARQUÉTIPO
  if (archetype) {
    prompt += `🎭 ARQUÉTIPO DETECTADO: ${archetype}\n`;
    prompt += `Adapte sua comunicação para este perfil!\n\n`;
  }

  // PERSONALIZAÇÃO POR PERSONA REGIONAL
  if (persona) {
    prompt += `🌴 PERSONA REGIONAL: ${persona}\n`;
    prompt += `Use linguagem e referências locais de Natal/RN quando apropriado.\n\n`;
  }

  // OFF-TOPIC HANDLING
  if (offTopicCheck.isOffTopic) {
    prompt += `⚠️ ATENÇÃO: Cliente desviou do assunto!\n`;
    prompt += `Sugestão: "${offTopicCheck.empathicRedirect}"\n\n`;
  }

  // CONHECIMENTO (RAG)
  if (knowledgeContext) {
    prompt += knowledgeContext;
  }

  // REGRAS GERAIS
  prompt += `
📏 REGRAS IMPORTANTES:
1. Seja NATURAL e HUMANO (sem parecer robô)
2. Mensagens CURTAS (2-3 linhas máximo)
3. APENAS UMA pergunta por mensagem
4. Use WhatsApp style (informal mas profissional)
5. Se já coletou algo, NÃO repita a pergunta
6. Foque em ENTENDER antes de vender
7. Use emojis com moderação (1-2 por mensagem)

🎯 METODOLOGIA BANT - SEQUÊNCIA OBRIGATÓRIA:
1. Opening: Rapport + contexto
2. Need: Identificar DOR principal
3. Budget: Qualificar investimento
4. Authority: Confirmar decisor
5. Timing: Definir urgência
6. Closing: Agendar reunião

IMPORTANTE: Você está no estágio ${stage.toUpperCase()}. Siga a sequência!
`;

  return prompt;
}

function buildConversationMessages(history, currentMessage, systemPrompt) {
  const messages = [
    { role: 'system', content: systemPrompt }
  ];

  // Adicionar últimas 10 mensagens do histórico
  const recentHistory = history.slice(-10);
  for (const msg of recentHistory) {
    // Ignorar mensagens sem conteúdo (null, undefined, ou string vazia)
    if (!msg.text || typeof msg.text !== 'string' || msg.text.trim() === '') {
      continue;
    }

    messages.push({
      role: msg.fromMe ? 'assistant' : 'user',
      content: msg.text
    });
  }

  // Mensagem atual
  messages.push({
    role: 'user',
    content: currentMessage
  });

  return messages;
}

// ============================================================================
// 🎚️ FUNÇÕES AUXILIARES
// ============================================================================

function calculateEngagementLevel(messageCount, qualificationScore) {
  if (messageCount > 15 && qualificationScore > 70) return 'high';
  if (messageCount > 8 || qualificationScore > 40) return 'medium';
  return 'low';
}

function determineNextAction(bantResult) {
  const { stage, qualificationScore, collectedInfo } = bantResult;

  if (qualificationScore >= 80) {
    return 'AGENDAR_REUNIAO';
  }

  if (stage === 'closing') {
    return 'PROPOR_MEETING';
  }

  if (stage === 'timing' && collectedInfo.timing) {
    return 'AVANÇAR_CLOSING';
  }

  if (stage === 'authority' && collectedInfo.authority) {
    return 'PERGUNTAR_TIMING';
  }

  if (stage === 'budget' && collectedInfo.budget) {
    return 'PERGUNTAR_AUTHORITY';
  }

  if (stage === 'need' && collectedInfo.need) {
    return 'PERGUNTAR_BUDGET';
  }

  if (stage === 'opening') {
    return 'IDENTIFICAR_NEED';
  }

  return 'CONTINUAR_CONVERSA';
}

// ============================================================================
// 🎤 VOICE SYSTEM (Simplificado - só referência, implementação está em audio_handler.js)
// ============================================================================

export async function handleVoiceMessage(audioUrl, context) {
  console.log('🎤 [VOICE] Processando áudio...');

  // Esta funcionalidade será movida para audio_handler.js
  // Por enquanto, apenas retorna mensagem de erro
  return {
    message: 'Sistema de voz será reativado em breve. Por favor, envie texto.',
    context: {}
  };
}

// ============================================================================
// 📞 MEETING SCHEDULER - REMOVIDO (funcionalidade integrada no server.js)
// ============================================================================
// A funcionalidade de agendamento foi movida para o server.js para manter
// o agent.js focado apenas no processamento de conversação BANT

// ============================================================================
// 📊 EXPORT HELPERS
// ============================================================================

export function getBANTProgress(contactId) {
  return getEnhancedState(contactId);
}

export async function resetBANTFlow(contactId) {
  const emptyState = {
    contactId,
    state: { current: 'opening', subState: 'consultivo', lastUpdate: new Date().toISOString() },
    bant: { budget: null, authority: null, need: null, timing: null },
    qualification: { score: 0, archetype: null, persona: null },
    engagement: { level: 'low', lastInteraction: new Date().toISOString() },
    nextBestAction: 'IDENTIFICAR_NEED'
  };

  await saveEnhancedState(contactId, emptyState);
  console.log(`🔄 [RESET] BANT resetado para ${contactId}`);
  return emptyState;
}

export default { chatHandler, getBANTProgress, resetBANTFlow };

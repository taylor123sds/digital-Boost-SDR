// src/tools/bot_detector.js
/**
 * Sistema Avançado de Detecção de Chatbots
 * Utiliza múltiplas técnicas para identificar respostas automatizadas
 */

import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Padrões comuns de chatbots
const BOT_PATTERNS = {
  // Respostas instantâneas (menos de 1 segundo)
  instantResponse: {
    threshold: 1000, // milissegundos
    weight: 0.3
  },
  
  // Frases genéricas de bots
  genericPhrases: [
    'estou aqui para ajudar',
    'como posso ajudar',
    'em que posso ser útil',
    'obrigado por entrar em contato',
    'aguarde um momento',
    'transferindo para um atendente',
    'horário de atendimento',
    'digite uma opção',
    'selecione uma das opções',
    'menu principal',
    'voltar ao menu',
    'opção inválida',
    'não entendi sua mensagem',
    'poderia reformular',
    'desculpe, não compreendi',
    'assistente virtual',
    'atendimento automatizado',
    'bot de atendimento',
    'inteligência artificial',
    'resposta automática',
    'mensagem automática'
  ],
  
  // Estruturas típicas de menu
  menuPatterns: [
    /\b[1-9]\s*[-.)]\s*/g, // "1) ", "2- ", "3. "
    /\bdigite\s+\d+\b/gi,
    /\bescolha\s+uma\s+opção\b/gi,
    /\bopção\s+\d+\b/gi,
    /\bmenu\s+de\s+opções\b/gi
  ],
  
  // Indicadores de bot no nome/status
  nameIndicators: [
    'bot',
    'assistente',
    'virtual',
    'atendimento',
    'suporte',
    'automático',
    'auto',
    'ia',
    'ai',
    'robot',
    'system',
    'servidor'
  ],
  
  // Emojis excessivos ou padronizados
  emojiPatterns: {
    excessive: /(?:[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]){3,}/gu,
    robotEmojis: /🤖|🔧|⚙️|💻|🖥️|📱|🔌/g
  }
};

// Cache de detecções
const detectionCache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 hora

/**
 * Analisa se uma mensagem parece ser de um bot
 */
export async function analyzeMessageForBot(message, metadata = {}) {
  const indicators = [];
  let botScore = 0;
  
  // 1. Verifica tempo de resposta (se disponível)
  if (metadata.responseTime && metadata.responseTime < BOT_PATTERNS.instantResponse.threshold) {
    botScore += BOT_PATTERNS.instantResponse.weight;
    indicators.push('resposta_instantanea');
  }
  
  // 2. Verifica frases genéricas
  const lowerMessage = message.toLowerCase();
  const genericMatches = BOT_PATTERNS.genericPhrases.filter(phrase => 
    lowerMessage.includes(phrase)
  );
  if (genericMatches.length > 0) {
    botScore += 0.2 * genericMatches.length;
    indicators.push(`frases_genericas: ${genericMatches.join(', ')}`);
  }
  
  // 3. Verifica padrões de menu
  const menuMatches = BOT_PATTERNS.menuPatterns.filter(pattern =>
    pattern.test(message)
  );
  if (menuMatches.length > 0) {
    botScore += 0.4;
    indicators.push('estrutura_menu');
  }
  
  // 4. Verifica emojis excessivos ou de robô
  if (BOT_PATTERNS.emojiPatterns.excessive.test(message)) {
    botScore += 0.1;
    indicators.push('emojis_excessivos');
  }
  if (BOT_PATTERNS.emojiPatterns.robotEmojis.test(message)) {
    botScore += 0.2;
    indicators.push('emojis_robo');
  }
  
  // 5. Análise de repetição de estrutura
  const sentences = message.split(/[.!?]+/);
  if (sentences.length > 2) {
    const lengths = sentences.map(s => s.trim().length);
    const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const variance = lengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / lengths.length;
    
    // Baixa variância indica frases muito uniformes (típico de bots)
    if (variance < 50) {
      botScore += 0.15;
      indicators.push('estrutura_uniforme');
    }
  }
  
  return {
    score: Math.min(botScore, 1), // Normaliza entre 0 e 1
    indicators,
    isLikelyBot: botScore >= 0.5
  };
}

/**
 * Analisa perfil do contato para detectar bots
 */
export async function analyzeProfileForBot(profile) {
  const indicators = [];
  let botScore = 0;
  
  // 1. Verifica nome
  if (profile.name) {
    const lowerName = profile.name.toLowerCase();
    const nameMatches = BOT_PATTERNS.nameIndicators.filter(indicator =>
      lowerName.includes(indicator)
    );
    if (nameMatches.length > 0) {
      botScore += 0.4;
      indicators.push(`nome_suspeito: ${nameMatches.join(', ')}`);
    }
  }
  
  // 2. Verifica status
  if (profile.status) {
    const lowerStatus = profile.status.toLowerCase();
    if (lowerStatus.includes('bot') || lowerStatus.includes('automático')) {
      botScore += 0.3;
      indicators.push('status_bot');
    }
  }
  
  // 3. Verifica se é business account sem nome de empresa real
  if (profile.isBusiness && (!profile.name || profile.name.length < 3)) {
    botScore += 0.2;
    indicators.push('business_sem_nome');
  }
  
  return {
    score: Math.min(botScore, 1),
    indicators,
    isLikelyBot: botScore >= 0.4
  };
}

/**
 * Usa IA para análise profunda de padrões de bot
 */
export async function deepBotAnalysis(conversationHistory, currentMessage) {
  try {
    const analysisPrompt = `Analise esta conversa e determine se estamos falando com um CHATBOT/ASSISTENTE VIRTUAL.

MENSAGEM ATUAL: "${currentMessage}"

HISTÓRICO:
${conversationHistory.map(m => `${m.fromMe ? 'ORBION' : 'CONTATO'}: ${m.text}`).join('\n')}

INDICADORES DE BOT:
1. Respostas instantâneas e padronizadas
2. Menus numerados ou opções
3. Frases genéricas repetitivas
4. Falta de contexto nas respostas
5. Palavras como "bot", "assistente virtual", "atendimento automatizado"
6. Estrutura muito uniforme nas mensagens
7. Não responde perguntas específicas, só oferece opções
8. Menciona transferência para humano

Analise cuidadosamente e retorne JSON:
{
  "is_bot": true/false,
  "confidence": 0.0-1.0,
  "main_indicators": ["indicador1", "indicador2"],
  "bot_type": "menu_bot/ai_bot/hybrid/unknown",
  "recommendation": "continue/stop/verify"
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Você é um especialista em detectar chatbots e sistemas automatizados. Seja preciso e conservador - só marque como bot se tiver alta certeza.'
        },
        {
          role: 'user',
          content: analysisPrompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 200
    });

    return JSON.parse(response.choices[0].message.content);
    
  } catch (error) {
    console.error('❌ Erro na análise profunda de bot:', error);
    return {
      is_bot: false,
      confidence: 0,
      main_indicators: [],
      bot_type: 'unknown',
      recommendation: 'continue'
    };
  }
}

/**
 * Sistema completo de detecção de bots
 */
export async function detectBot(message, profile, conversationHistory = [], metadata = {}) {
  const cacheKey = `${profile.number}_${Date.now()}`;
  
  // Verifica cache
  if (detectionCache.has(profile.number)) {
    const cached = detectionCache.get(profile.number);
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.result;
    }
  }
  
  // 1. Análise rápida da mensagem
  const messageAnalysis = await analyzeMessageForBot(message, metadata);
  
  // 2. Análise do perfil
  const profileAnalysis = await analyzeProfileForBot(profile);
  
  // 3. Score combinado inicial
  const quickScore = (messageAnalysis.score + profileAnalysis.score) / 2;
  
  // 4. Se score alto, faz análise profunda com IA
  let deepAnalysis = null;
  if (quickScore > 0.3 && conversationHistory.length > 0) {
    deepAnalysis = await deepBotAnalysis(conversationHistory, message);
  }
  
  // 5. Decisão final
  const finalScore = deepAnalysis 
    ? (quickScore * 0.4 + deepAnalysis.confidence * 0.6)
    : quickScore;
    
  const result = {
    isBot: finalScore >= 0.5 || (deepAnalysis && deepAnalysis.is_bot),
    confidence: finalScore,
    indicators: [
      ...messageAnalysis.indicators,
      ...profileAnalysis.indicators,
      ...(deepAnalysis ? deepAnalysis.main_indicators : [])
    ],
    botType: deepAnalysis ? deepAnalysis.bot_type : 'unknown',
    recommendation: deepAnalysis ? deepAnalysis.recommendation : 
      (finalScore >= 0.5 ? 'stop' : 'continue'),
    analysis: {
      message: messageAnalysis,
      profile: profileAnalysis,
      deep: deepAnalysis
    }
  };
  
  // Salva no cache
  detectionCache.set(profile.number, {
    result,
    timestamp: Date.now()
  });
  
  // Limpa cache antigo
  for (const [key, value] of detectionCache.entries()) {
    if (Date.now() - value.timestamp > CACHE_TTL) {
      detectionCache.delete(key);
    }
  }
  
  return result;
}

/**
 * Gera resposta educada para finalizar conversa com bot
 */
export function generateBotFarewellMessage(botType = 'unknown') {
  const farewells = {
    menu_bot: "Percebo que este é um sistema automatizado. Como sou um especialista em soluções digitais, prefiro conversar diretamente com um responsável. Obrigado! 🤝",
    ai_bot: "Interessante conversar com outro sistema inteligente! Mas preciso falar com um humano sobre nossas soluções. Quando houver alguém disponível, adoraria conversar. Até logo! 👋",
    hybrid: "Notei que estou conversando com um assistente virtual. Quando um colaborador humano estiver disponível, ficarei feliz em apresentar nossas soluções da Digital Boost. Obrigado!",
    unknown: "Parece que estou conversando com um sistema automatizado. Prefiro aguardar para falar diretamente com um responsável sobre nossas soluções. Muito obrigado!"
  };
  
  return farewells[botType] || farewells.unknown;
}

/**
 * Verifica se deve parar a conversa baseado na detecção
 */
export function shouldStopConversation(detection) {
  return detection.isBot && 
         detection.confidence >= 0.6 && 
         detection.recommendation === 'stop';
}
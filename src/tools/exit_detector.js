// src/tools/exit_detector.js
/**
 * Sistema de Detecção de Comandos de Saída
 * Detecta quando o usuário quer parar a conversa e remove do sistema
 */

import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Palavras-chave para detecção de saída
const EXIT_KEYWORDS = [
  // Comandos diretos
  'sair', 'parar', 'pare', 'stop', 'remover', 'remove', 'cancelar', 'cancel',
  'descadastrar', 'descadastre', 'unsubscribe', 'opt-out', 'optout',
  
  // Expressões de desinteresse (mais específicas)
  'não quero mais receber', 'nao quero mais receber', 'não me interesse esse assunto', 'nao me interesse esse assunto',
  'não tenho interesse nenhum', 'nao tenho interesse nenhum', 'desinteressado totalmente', 'desinteressada totalmente',
  
  // Pedidos para não contatar
  'não me contate', 'nao me contate', 'não ligue', 'nao ligue',
  'não envie mais', 'nao envie mais', 'pare de enviar', 'pare de mandar',
  
  // Expressões de irritação
  'me deixe em paz', 'deixa eu em paz', 'para de encher',
  'chato', 'irritante', 'enchendo', 'perturbando',
  
  // Comandos específicos do WhatsApp
  'bloquear', 'reportar', 'denunciar', 'spam'
];

// Frases que indicam claramente desejo de sair
const EXIT_PHRASES = [
  'quero sair',
  'não quero receber',
  'tire meu número',
  'remove meu contato', 
  'remover meu contato',
  'não me mande mais',
  'para de me mandar',
  'pare de me mandar',
  'não quero mais mensagens',
  'cancela meu cadastro',
  'me remove da lista',
  'não tenho interesse nenhum',
  'não me interessa nada',
  'deixa eu quieto',
  'para com isso',
  'me deixe em paz',
  'deixe me em paz',
  'para de encher',
  'pare de encher',
  'para de me perturbando',
  'pare de perturbando',
  'tira meu número',
  'tire meu número',
  'descadastra',
  'descadastrar',
  'para de me enviar',
  'pare de me enviar',
  'não me contacte',
  'nao me contacte',
  'vou bloquear'
];

/**
 * Verifica se a mensagem contém comandos de saída
 * @param {string} message - Mensagem do usuário
 * @returns {object} Resultado da análise
 */
export function detectExitKeywords(message) {
  const lowerMessage = message.toLowerCase()
    .replace(/[^\w\sáàâãéèêíìîóòôõúùûç]/g, '') // Remove pontuação
    .trim();
  
  // PRIMEIRA VERIFICAÇÃO: Sinais de INTERESSE que neutralizam saída
  const interestSignals = [
    'como funciona', 'como poderia ajudar', 'como isso funciona', 'me explica',
    'não entendi', 'nao entendi', 'explique melhor', 'quero saber',
    'me conte mais', 'gostaria de saber', 'tenho interesse em saber',
    'como pode ajudar', 'ajudar meu negócio', 'ajudar minha empresa'
  ];
  
  const hasInterestSignal = interestSignals.some(signal => 
    lowerMessage.includes(signal)
  );
  
  // Se há sinal de interesse, NÃO é saída
  if (hasInterestSignal) {
    return {
      hasExitIntent: false,
      confidence: 0,
      foundKeywords: [],
      foundPhrases: [],
      analysis: 'interest_detected_override'
    };
  }
  
  // Verifica palavras-chave exatas
  const foundKeywords = EXIT_KEYWORDS.filter(keyword => 
    lowerMessage.includes(keyword)
  );
  
  // Verifica frases completas
  const foundPhrases = EXIT_PHRASES.filter(phrase =>
    lowerMessage.includes(phrase)
  );
  
  // Verifica palavras isoladas de alta confiança
  const highConfidenceWords = ['sair', 'parar', 'pare', 'stop', 'remover', 'cancelar', 'bloquear'];
  const hasHighConfidenceWord = highConfidenceWords.some(word => {
    const wordRegex = new RegExp(`\\b${word}\\b`, 'i');
    return wordRegex.test(lowerMessage);
  });
  
  // Calcula score baseado nas detecções
  let keywordScore = foundKeywords.length * 0.3;
  const phraseScore = foundPhrases.length * 0.5;
  
  // Aumenta score se tem palavra isolada de alta confiança
  if (hasHighConfidenceWord) {
    keywordScore = Math.max(keywordScore, 0.7);
  }
  
  const totalScore = Math.min(keywordScore + phraseScore, 1.0);
  
  return {
    hasExitIntent: totalScore > 0.3,
    confidence: totalScore,
    foundKeywords: hasHighConfidenceWord ? [...foundKeywords, 'palavra_isolada_alta_confiança'] : foundKeywords,
    foundPhrases,
    analysis: 'keyword_detection'
  };
}

/**
 * Usa IA para detectar intenção de saída de forma mais sofisticada
 * @param {string} message - Mensagem do usuário
 * @param {array} conversationHistory - Histórico da conversa
 * @returns {Promise<object>} Análise de intenção de saída
 */
export async function detectExitIntentWithAI(message, conversationHistory = []) {
  try {
    const analysisPrompt = `Analise se esta mensagem indica que o usuário quer PARAR de receber mensagens ou SAIR da conversa.

MENSAGEM: "${message}"

CONTEXTO DA CONVERSA:
${conversationHistory.slice(-3).map(m => `${m.fromMe ? 'ORBION' : 'USUÁRIO'}: ${m.text}`).join('\n')}

INDICADORES DE SAÍDA:
- Palavras como: sair, parar, remover, cancelar, não quero mais, desinteressado
- Expressões de irritação: chato, deixa eu em paz, para de encher
- Pedidos para não contatar: não me contate, tire meu número
- Desinteresse claro: não tenho interesse, não me interessa
- Comandos de bloqueio: bloquear, spam, denunciar

IMPORTANTE:
- NÃO confunda com dúvidas ou objeções de vendas normais
- NÃO confunda "não tenho dinheiro" com "não tenho interesse"  
- APENAS marque como saída se for REALMENTE um pedido para parar

Retorne JSON:
{
  "wants_to_exit": true/false,
  "confidence": 0.0-1.0,
  "reason": "breve explicação da decisão",
  "exit_type": "direct_command|irritation|unsubscribe|block_threat|unknown"
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Você é especialista em detectar quando usuários querem parar conversas de marketing. Seja conservador - só marque como saída se tiver certeza.'
        },
        {
          role: 'user',
          content: analysisPrompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1, // Baixa para máxima precisão
      max_tokens: 200
    });

    return JSON.parse(response.choices[0].message.content);
    
  } catch (error) {
    console.error('❌ Erro na análise de intenção de saída:', error);
    return {
      wants_to_exit: false,
      confidence: 0,
      reason: 'Erro na análise',
      exit_type: 'unknown'
    };
  }
}

/**
 * Sistema completo de detecção de saída
 * @param {string} message - Mensagem do usuário
 * @param {array} conversationHistory - Histórico da conversa
 * @returns {Promise<object>} Análise completa de saída
 */
export async function detectExitIntent(message, conversationHistory = []) {
  console.log('🚪 Verificando intenção de saída...');
  
  // 1. Análise rápida por palavras-chave
  const keywordAnalysis = detectExitKeywords(message);
  
  // 2. Se alta confiança nas palavras-chave, faz análise com IA
  let aiAnalysis = null;
  if (keywordAnalysis.confidence > 0.3) {
    aiAnalysis = await detectExitIntentWithAI(message, conversationHistory);
  }
  
  // 3. Decisão final
  const finalAnalysis = {
    wantsToExit: aiAnalysis ? aiAnalysis.wants_to_exit : keywordAnalysis.hasExitIntent,
    confidence: aiAnalysis ? 
      (keywordAnalysis.confidence * 0.3 + aiAnalysis.confidence * 0.7) : 
      keywordAnalysis.confidence,
    method: aiAnalysis ? 'ai_enhanced' : 'keyword_only',
    details: {
      keywords: keywordAnalysis,
      ai: aiAnalysis
    }
  };
  
  console.log(`🚪 Análise de saída: ${finalAnalysis.confidence.toFixed(2)} confiança (${finalAnalysis.wantsToExit ? 'QUER SAIR' : 'CONTINUAR'})`);
  
  return finalAnalysis;
}

/**
 * Gera mensagem de despedida respeitosa
 * @param {string} exitType - Tipo de saída detectada
 * @param {string} userName - Nome do usuário
 * @returns {string} Mensagem de despedida
 */
export function generateExitMessage(exitType = 'unknown', userName = 'Cliente') {
  const farewellMessages = {
    direct_command: `Entendido, ${userName}! Seu número foi removido da nossa lista de contatos. Obrigado pelo tempo que nos dedicou. Se futuramente tiver interesse em soluções digitais, estaremos aqui. Tenha um ótimo dia! 👋`,
    
    irritation: `${userName}, peço desculpas por qualquer incômodo. Respeitamos sua decisão e removemos seu contato imediatamente. Desejamos muito sucesso para você! 🙏`,
    
    unsubscribe: `${userName}, seu número foi removido com sucesso da nossa base de contatos. Agradecemos a oportunidade de ter conversado com você. Sucesso!`,
    
    block_threat: `${userName}, compreendo perfeitamente. Removemos seu contato imediatamente e não enviaremos mais mensagens. Pedimos desculpas e desejamos sucesso em seus projetos! 🤝`,
    
    unknown: `${userName}, respeitamos sua decisão. Removemos seu número da nossa lista e não entraremos mais em contato. Obrigado e muito sucesso! 👋`
  };
  
  return farewellMessages[exitType] || farewellMessages.unknown;
}

/**
 * Verifica se deve interromper a conversa
 * @param {object} exitAnalysis - Análise de saída
 * @returns {boolean} Se deve parar
 */
export function shouldStopConversation(exitAnalysis) {
  return exitAnalysis.wantsToExit && exitAnalysis.confidence >= 0.6;
}

/**
 * Adiciona número à blacklist para não receber mais mensagens
 * @param {string} phoneNumber - Número do telefone
 * @param {string} reason - Motivo da remoção
 */
export async function addToBlacklist(phoneNumber, reason = 'user_request') {
  try {
    const { saveMessage } = await import('../memory.js');
    
    // Salva na memória como bloqueado
    const blockData = {
      blocked_at: new Date().toISOString(),
      reason: reason,
      status: 'blocked'
    };
    
    await saveMessage(phoneNumber, `[BLOCKED] ${JSON.stringify(blockData)}`, true, 'system');
    
    console.log(`🚫 Número ${phoneNumber} adicionado à blacklist. Motivo: ${reason}`);
    
    return {
      success: true,
      phoneNumber,
      reason,
      blockedAt: blockData.blocked_at
    };
    
  } catch (error) {
    console.error('❌ Erro ao adicionar à blacklist:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Verifica se número está na blacklist
 * @param {string} phoneNumber - Número do telefone  
 * @returns {Promise<boolean>} Se está bloqueado
 */
export async function isBlacklisted(phoneNumber) {
  try {
    const { getRecentMessages } = await import('../memory.js');
    const messages = await getRecentMessages(phoneNumber, 10);
    
    // Verifica se há mensagem de bloqueio
    const blockMessage = messages.find(msg => 
      msg.fromMe && msg.text.includes('[BLOCKED]')
    );
    
    return !!blockMessage;
    
  } catch (error) {
    console.error('❌ Erro ao verificar blacklist:', error);
    return false;
  }
}
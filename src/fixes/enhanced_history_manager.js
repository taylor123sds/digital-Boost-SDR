// enhanced_history_manager.js
// Sistema FORÇADO de recuperação de histórico completo para o ORBION

import { getMemory, setMemory } from '../memory.js';

// ============================================
// ENHANCED HISTORY MANAGER - FIX PRINCIPAL
// ============================================
export class EnhancedHistoryManager {
  constructor() {
    this.historyCache = new Map();
    this.maxHistorySize = 50;
    this.contextWindow = 10;
    console.log(' Enhanced History Manager inicializado');
  }

  /**
   * FORÇA recuperação do histórico COMPLETO
   */
  async getFullConversationHistory(from) {
    console.log(` [FORCED] Recuperando histórico completo para ${from}`);

    try {
      // 1. Buscar do banco de dados SQLite
      const dbMessages = await this.getMessagesFromDatabase(from);

      // 2. Buscar da memória em cache
      const memoryKey = `message_history_${from}`;
      const memoryMessages = await getMemory(memoryKey) || [];

      // 3. Combinar e estruturar
      const allMessages = this.mergeAndStructureHistory(dbMessages, memoryMessages);

      // 4. Analisar e enriquecer
      const enrichedHistory = this.enrichHistoryWithContext(allMessages);

      // 5. Encontrar perguntas não respondidas
      const unansweredQuestions = this.findUnansweredQuestions(enrichedHistory);

      // 6. Gerar resumo
      const summary = this.generateHistorySummary(enrichedHistory);

      const result = {
        messages: enrichedHistory,
        unansweredQuestions,
        summary,
        lastTopics: this.extractLastTopics(enrichedHistory),
        conversationPhase: this.determineConversationPhase(enrichedHistory)
      };

      console.log(` Histórico completo recuperado:`);
      console.log(`   - ${enrichedHistory.length} mensagens`);
      console.log(`   - ${unansweredQuestions.length} perguntas não respondidas`);

      return result;

    } catch (error) {
      console.error(' Erro ao recuperar histórico:', error);
      return {
        messages: [],
        unansweredQuestions: [],
        summary: 'Primeira conversa',
        lastTopics: [],
        conversationPhase: 'initial'
      };
    }
  }

  /**
   * Busca mensagens do banco SQLite
   */
  async getMessagesFromDatabase(from) {
    try {
      // Importar função de busca de mensagens
      const { getRecentMessages } = await import('../memory.js');
      const messages = await getRecentMessages(from, this.maxHistorySize);

      console.log(` Banco: ${messages?.length || 0} mensagens encontradas`);

      return messages || [];

    } catch (error) {
      console.error(' Erro ao buscar no banco:', error);
      return [];
    }
  }

  /**
   * Mescla mensagens de diferentes fontes
   */
  mergeAndStructureHistory(dbMessages, memoryMessages) {
    const messageMap = new Map();

    // Processar mensagens do banco
    if (Array.isArray(dbMessages)) {
      dbMessages.forEach(msg => {
        const key = `${msg.created_at}_${msg.message_text?.substring(0, 20)}`;
        messageMap.set(key, {
          text: msg.message_text,
          fromBot: msg.from_me === 1 || msg.from_me === true,
          timestamp: new Date(msg.created_at).getTime(),
          type: msg.message_type || 'text',
          source: 'database'
        });
      });
    }

    // Processar mensagens da memória
    if (Array.isArray(memoryMessages)) {
      memoryMessages.forEach(msg => {
        const key = `${msg.timestamp}_${msg.text?.substring(0, 20)}`;
        if (!messageMap.has(key)) {
          messageMap.set(key, {
            text: msg.text || msg.message,
            fromBot: msg.fromBot || msg.isBot || false,
            timestamp: msg.timestamp || Date.now(),
            type: msg.type || 'text',
            source: 'memory'
          });
        }
      });
    }

    // Converter para array e ordenar
    return Array.from(messageMap.values())
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-this.maxHistorySize);
  }

  /**
   * Enriquece histórico com análise contextual
   */
  enrichHistoryWithContext(messages) {
    return messages.map((msg, index) => {
      const previousMsg = index > 0 ? messages[index - 1] : null;
      const nextMsg = index < messages.length - 1 ? messages[index + 1] : null;

      return {
        ...msg,
        index,
        isQuestion: this.isQuestion(msg.text),
        sentiment: this.analyzeSentiment(msg.text),
        topics: this.extractTopics(msg.text),
        wasAnswered: this.wasQuestionAnswered(msg, messages, index),
        context: {
          previousMessage: previousMsg?.text,
          nextMessage: nextMsg?.text,
          timeSincePrevious: previousMsg ? msg.timestamp - previousMsg.timestamp : 0
        }
      };
    });
  }

  /**
   * Detecta se é pergunta
   */
  isQuestion(text) {
    if (!text) return false;

    return text.includes('?') ||
           /^(como|quando|onde|qual|quem|quanto|porque|por que|o que|quantos)/i.test(text) ||
           /\b(pode|consegue|tem|faz|existe|há|seria)\b.*\??\s*$/i.test(text) ||
           /\b(valor|preço|custo|quanto custa)\b/i.test(text);
  }

  /**
   * Verifica se pergunta foi respondida
   */
  wasQuestionAnswered(msg, allMessages, currentIndex) {
    if (!msg.isQuestion || msg.fromBot) return false;

    // Buscar resposta do bot nas próximas 3 mensagens
    const nextMessages = allMessages.slice(currentIndex + 1, currentIndex + 4);
    return nextMessages.some(m => m.fromBot);
  }

  /**
   * Encontra perguntas não respondidas
   */
  findUnansweredQuestions(messages) {
    const unanswered = [];

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];

      if (!msg.fromBot && msg.isQuestion && !msg.wasAnswered) {
        unanswered.push({
          question: msg.text,
          timestamp: msg.timestamp,
          index: i,
          topic: msg.topics[0] || 'general'
        });
      }
    }

    console.log(` Perguntas não respondidas: ${unanswered.length}`);
    unanswered.forEach(q => console.log(`   - "${q.question}"`));

    return unanswered;
  }

  /**
   * Análise de sentimento básica
   */
  analyzeSentiment(text) {
    if (!text) return 'neutral';

    const positive = ['sim', 'ótimo', 'bom', 'excelente', 'perfeito', 'quero', 'interesse', 'legal'];
    const negative = ['não', 'ruim', 'problema', 'difícil', 'caro', 'nunca', 'péssimo'];

    const textLower = text.toLowerCase();
    let score = 0;

    positive.forEach(word => {
      if (textLower.includes(word)) score++;
    });

    negative.forEach(word => {
      if (textLower.includes(word)) score--;
    });

    if (score > 0) return 'positive';
    if (score < 0) return 'negative';
    return 'neutral';
  }

  /**
   * Extrai tópicos da mensagem
   */
  extractTopics(text) {
    if (!text) return [];

    const topics = [];
    const textLower = text.toLowerCase();

    if (textLower.match(/preço|valor|custo|quanto custa|orçamento|investimento/)) topics.push('pricing');
    if (textLower.match(/funciona|faz|recurso|funcionalidade|como/)) topics.push('features');
    if (textLower.match(/ajuda|suporte|problema|erro|dúvida/)) topics.push('support');
    if (textLower.match(/automação|automatizar|bot|ia|inteligência/)) topics.push('automation');
    if (textLower.match(/reunião|agendar|marcar|horário|quando|disponível/)) topics.push('scheduling');
    if (textLower.match(/empresa|vocês|digital boost|sobre|quem/)) topics.push('company');

    return topics;
  }

  /**
   * Extrai últimos tópicos discutidos
   */
  extractLastTopics(messages) {
    const recentMessages = messages.slice(-5);
    const topics = new Set();

    recentMessages.forEach(msg => {
      msg.topics?.forEach(topic => topics.add(topic));
    });

    return Array.from(topics);
  }

  /**
   * Determina fase da conversa
   */
  determineConversationPhase(messages) {
    if (messages.length === 0) return 'initial';
    if (messages.length < 3) return 'greeting';

    const lastTopics = this.extractLastTopics(messages);

    if (lastTopics.includes('scheduling')) return 'closing';
    if (lastTopics.includes('pricing')) return 'negotiation';
    if (lastTopics.includes('features')) return 'discovery';
    if (lastTopics.includes('company')) return 'introduction';

    return 'qualification';
  }

  /**
   * Gera resumo do histórico
   */
  generateHistorySummary(messages) {
    if (messages.length === 0) return 'Primeira conversa';

    const userMessages = messages.filter(m => !m.fromBot);
    const botMessages = messages.filter(m => m.fromBot);
    const questions = messages.filter(m => m.isQuestion);

    return {
      totalMessages: messages.length,
      userMessages: userMessages.length,
      botMessages: botMessages.length,
      questions: questions.length,
      lastInteraction: new Date(messages[messages.length - 1].timestamp).toISOString(),
      mainTopics: this.extractLastTopics(messages)
    };
  }
}

// ============================================
// CONTEXT-AWARE RESPONSE GENERATOR
// ============================================
export class ContextAwareResponseGenerator {
  constructor() {
    this.historyManager = new EnhancedHistoryManager();
    console.log(' Context-Aware Response Generator inicializado');
  }

  /**
   * Gera resposta SEMPRE considerando histórico
   */
  async generateContextualResponse(from, currentMessage, agentInstance) {
    console.log(` [FORCED] Gerando resposta contextual para: "${currentMessage}"`);

    // 1. FORÇAR recuperação do histórico
    const fullHistory = await this.historyManager.getFullConversationHistory(from);

    // 2. Construir contexto rico
    const richContext = this.buildRichContext(fullHistory, currentMessage);

    // 3. Preparar prompt com histórico completo
    const contextualPrompt = this.buildContextualPrompt(richContext, currentMessage);

    // 4. Gerar resposta
    const response = await this.generateWithFullContext(contextualPrompt, agentInstance);

    // 5. Validar coerência
    const finalResponse = this.validateResponseCoherence(response, fullHistory);

    console.log(` Resposta contextual gerada: "${finalResponse.substring(0, 100)}..."`);

    return finalResponse;
  }

  /**
   * Constrói contexto rico
   */
  buildRichContext(fullHistory, currentMessage) {
    const recentMessages = fullHistory.messages.slice(-8);

    return {
      currentMessage,
      recentMessages: recentMessages.map(m => ({
        text: m.text,
        fromBot: m.fromBot,
        isQuestion: m.isQuestion,
        timestamp: new Date(m.timestamp).toLocaleTimeString('pt-BR')
      })),
      unansweredQuestions: fullHistory.unansweredQuestions,
      lastTopics: fullHistory.lastTopics,
      conversationPhase: fullHistory.conversationPhase,
      summary: fullHistory.summary
    };
  }

  /**
   * Constrói prompt contextual
   */
  buildContextualPrompt(richContext, currentMessage) {
    const conversationHistory = richContext.recentMessages
      .map(m => `[${m.timestamp}] ${m.fromBot ? 'LEADLY' : 'Cliente'}: ${m.text}`)
      .join('\n');

    const systemPrompt = `Você é a LEADLY, assistente de vendas da Digital Boost.

CONTEXTO DA CONVERSA:
${conversationHistory}

FASE ATUAL: ${richContext.conversationPhase}
TÓPICOS ANTERIORES: ${richContext.lastTopics.join(', ') || 'Nenhum'}

${richContext.unansweredQuestions.length > 0 ? `
PERGUNTAS NÃO RESPONDIDAS QUE VOCÊ DEVE RESPONDER:
${richContext.unansweredQuestions.map(q => `- "${q.question}"`).join('\n')}` : ''}

MENSAGEM ATUAL: "${currentMessage}"

INSTRUÇÕES CRÍTICAS:
1. SEMPRE considere o contexto da conversa acima
2. Responda TODAS as perguntas não respondidas primeiro
3. Mantenha coerência com o que já foi dito
4. Não repita informações já fornecidas
5. Seja natural e fluido na conversa`;

    return {
      systemPrompt,
      userPrompt: currentMessage,
      context: richContext
    };
  }

  /**
   * Gera resposta com IA ou fallback
   */
  async generateWithFullContext(contextualPrompt, agentInstance) {
    // Se tem agente com OpenAI
    if (agentInstance?.openai) {
      try {
        const completion = await agentInstance.openai.chat.completions.create({
          model: 'gpt-4',
          messages: [
            { role: 'system', content: contextualPrompt.systemPrompt },
            { role: 'user', content: contextualPrompt.userPrompt }
          ],
          max_tokens: 500,
          temperature: 0.7
        });

        return completion.choices[0].message.content;

      } catch (error) {
        console.error(' Erro na IA:', error);
        return this.generateFallbackResponse(contextualPrompt);
      }
    }

    return this.generateFallbackResponse(contextualPrompt);
  }

  /**
   * Resposta fallback inteligente
   */
  generateFallbackResponse(contextualPrompt) {
    const { context } = contextualPrompt;

    // Se tem perguntas não respondidas, priorizar
    if (context.unansweredQuestions.length > 0) {
      const firstQuestion = context.unansweredQuestions[0];

      if (firstQuestion.topic === 'pricing') {
        return `Sobre sua pergunta "${firstQuestion.question}" - nossos serviços têm investimento a partir de R$ 1.500/mês. Que tal agendarmos uma conversa para eu apresentar as opções que se encaixam no seu orçamento?`;
      }

      if (firstQuestion.topic === 'features') {
        return `Sobre "${firstQuestion.question}" - nossa automação faz atendimento 24h, qualifica leads e agenda reuniões automaticamente. Quer que eu mostre como funciona?`;
      }

      return `Desculpe não ter respondido antes sobre "${firstQuestion.question}". Deixe-me esclarecer isso agora...`;
    }

    // Resposta baseada na fase da conversa
    switch (context.conversationPhase) {
      case 'initial':
        return 'Olá! Sou a Leadly da Digital Boost. Como posso ajudar você hoje?';
      case 'discovery':
        return 'Entendi! E me conta, qual é o principal desafio financeiro no seu negócio hoje?';
      case 'negotiation':
        return 'Perfeito! Vamos encontrar a melhor solução para o seu caso. Que tal agendarmos uma demonstração?';
      default:
        return 'Entendo. Como posso ajudar você com isso?';
    }
  }

  /**
   * Valida coerência da resposta
   */
  validateResponseCoherence(response, fullHistory) {
    // Se ainda tem perguntas não respondidas, adicionar
    if (fullHistory.unansweredQuestions.length > 0) {
      const answered = fullHistory.unansweredQuestions.some(q =>
        response.toLowerCase().includes(q.question.toLowerCase().split(' ')[0])
      );

      if (!answered) {
        const firstQuestion = fullHistory.unansweredQuestions[0];
        response += `\n\nAh, e sobre sua pergunta "${firstQuestion.question}", deixe-me responder...`;
      }
    }

    return response;
  }
}

// ============================================
// EXPORTAR PRINCIPAIS
// ============================================
export default {
  EnhancedHistoryManager,
  ContextAwareResponseGenerator
};
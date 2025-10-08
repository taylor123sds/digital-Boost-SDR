// tools/context_manager.js
// Sistema avançado de gerenciamento de contexto e histórico

import { getMemory, setMemory } from '../memory.js';

export class ContextManager {
  constructor() {
    this.maxHistoryLength = 10; // Últimas 10 interações
    this.contextWindow = 300000; // 5 minutos em ms
    this.topicPatterns = {
      dashboard: ['tema', 'dashboard', 'configuração', 'interface', 'menu', 'navegação'],
      business: ['digital boost', 'empresa', 'vendas', 'crm', 'serviços', 'negócio'],
      support: ['ajuda', 'problema', 'erro', 'dúvida', 'não consigo'],
      greeting: ['oi', 'olá', 'bom dia', 'boa tarde', 'boa noite', 'tchau']
    };
  }

  /**
   * Analisa e enriquece contexto da mensagem
   */
  async analyzeContext(userMessage, contactId, metadata = {}) {
    const context = {
      contactId,
      timestamp: Date.now(),
      message: userMessage,
      metadata,
      // Análise da mensagem atual
      currentAnalysis: await this.analyzeCurrentMessage(userMessage),
      // Histórico recente
      recentHistory: await this.getRecentHistory(contactId),
      // Padrões detectados
      patterns: this.detectPatterns(userMessage),
      // Contexto conversacional
      conversationContext: await this.buildConversationContext(contactId, userMessage)
    };

    // Salvar na memória
    await this.saveInteraction(contactId, context);

    console.log(`🧠 [CONTEXT] Contexto analisado para ${contactId}: ${context.patterns.mainTopic}`);
    return context;
  }

  /**
   * Analisa mensagem atual
   */
  async analyzeCurrentMessage(message) {
    const analysis = {
      length: message.length,
      wordCount: message.split(' ').length,
      sentiment: this.analyzeSentiment(message),
      urgency: this.analyzeUrgency(message),
      intent: this.analyzeIntent(message),
      entities: this.extractEntities(message)
    };

    return analysis;
  }

  /**
   * Recupera histórico recente do contato
   */
  async getRecentHistory(contactId) {
    try {
      const historyKey = `conversation_history_${contactId}`;
      const history = await getMemory(historyKey) || [];

      // Filtrar por janela de tempo
      const cutoff = Date.now() - this.contextWindow;
      const recentHistory = history
        .filter(item => item.timestamp > cutoff)
        .slice(-this.maxHistoryLength);

      return recentHistory;
    } catch (error) {
      console.error('❌ [CONTEXT] Erro ao recuperar histórico:', error);
      return [];
    }
  }

  /**
   * Detecta padrões na mensagem
   */
  detectPatterns(message) {
    const messageLower = message.toLowerCase();
    const patterns = {
      mainTopic: 'general',
      subTopics: [],
      confidence: 0,
      keywords: []
    };

    let bestMatch = 0;
    for (const [topic, keywords] of Object.entries(this.topicPatterns)) {
      const matches = keywords.filter(keyword => messageLower.includes(keyword));
      const confidence = matches.length / keywords.length;

      if (confidence > bestMatch) {
        bestMatch = confidence;
        patterns.mainTopic = topic;
        patterns.confidence = confidence;
        patterns.keywords = matches;
      }

      if (matches.length > 0) {
        patterns.subTopics.push({
          topic,
          matches: matches.length,
          keywords: matches
        });
      }
    }

    return patterns;
  }

  /**
   * Constrói contexto conversacional inteligente
   */
  async buildConversationContext(contactId, currentMessage) {
    const recentHistory = await this.getRecentHistory(contactId);

    const context = {
      isFirstInteraction: recentHistory.length === 0,
      previousTopics: this.extractPreviousTopics(recentHistory),
      conversationFlow: this.analyzeConversationFlow(recentHistory, currentMessage),
      userProfile: await this.buildUserProfile(contactId, recentHistory),
      suggestedResponses: await this.generateSuggestedResponses(recentHistory, currentMessage)
    };

    return context;
  }

  /**
   * Extrai tópicos anteriores
   */
  extractPreviousTopics(history) {
    const topics = new Map();

    history.forEach(interaction => {
      if (interaction.patterns?.mainTopic) {
        const topic = interaction.patterns.mainTopic;
        topics.set(topic, (topics.get(topic) || 0) + 1);
      }
    });

    return Array.from(topics.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([topic, count]) => ({ topic, count }));
  }

  /**
   * Analisa fluxo da conversa
   */
  analyzeConversationFlow(history, currentMessage) {
    if (history.length === 0) {
      return { stage: 'initial', description: 'Primeira interação' };
    }

    const lastInteraction = history[history.length - 1];
    const timeSinceLastMessage = Date.now() - lastInteraction.timestamp;

    // Nova sessão se passou muito tempo
    if (timeSinceLastMessage > this.contextWindow) {
      return { stage: 'new_session', description: 'Nova sessão após intervalo' };
    }

    // Continuar tópico anterior
    if (lastInteraction.patterns?.mainTopic) {
      const currentPatterns = this.detectPatterns(currentMessage);
      if (currentPatterns.mainTopic === lastInteraction.patterns.mainTopic) {
        return {
          stage: 'continuation',
          description: `Continuando conversa sobre ${currentPatterns.mainTopic}`,
          previousTopic: lastInteraction.patterns.mainTopic
        };
      }
    }

    return { stage: 'topic_change', description: 'Mudança de tópico' };
  }

  /**
   * Constrói perfil do usuário
   */
  async buildUserProfile(contactId, history) {
    const profile = {
      preferredTopics: this.extractPreviousTopics(history),
      communicationStyle: this.analyzeCommunicationStyle(history),
      averageResponseTime: this.calculateAverageResponseTime(history),
      commonQuestions: this.extractCommonQuestions(history),
      lastSeen: history.length > 0 ? history[history.length - 1].timestamp : null
    };

    return profile;
  }

  /**
   * Analisa estilo de comunicação
   */
  analyzeCommunicationStyle(history) {
    if (history.length === 0) return 'unknown';

    const totalLength = history.reduce((sum, item) => sum + (item.message?.length || 0), 0);
    const avgLength = totalLength / history.length;

    const formalWords = history
      .flatMap(item => item.message?.toLowerCase().split(' ') || [])
      .filter(word => ['por favor', 'obrigado', 'gostaria', 'poderia'].includes(word)).length;

    const casualWords = history
      .flatMap(item => item.message?.toLowerCase().split(' ') || [])
      .filter(word => ['oi', 'opa', 'valeu', 'blz', 'ok'].includes(word)).length;

    if (avgLength > 50 && formalWords > casualWords) return 'formal';
    if (avgLength < 20 && casualWords > formalWords) return 'casual';
    return 'neutral';
  }

  /**
   * Calcula tempo médio de resposta
   */
  calculateAverageResponseTime(history) {
    if (history.length < 2) return null;

    const intervals = [];
    for (let i = 1; i < history.length; i++) {
      const interval = history[i].timestamp - history[i-1].timestamp;
      if (interval < 300000) { // Menos de 5 minutos
        intervals.push(interval);
      }
    }

    if (intervals.length === 0) return null;
    return intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
  }

  /**
   * Extrai perguntas comuns
   */
  extractCommonQuestions(history) {
    const questions = history
      .filter(item => item.message?.includes('?'))
      .map(item => item.message.toLowerCase())
      .reduce((acc, question) => {
        acc[question] = (acc[question] || 0) + 1;
        return acc;
      }, {});

    return Object.entries(questions)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([question, count]) => ({ question, count }));
  }

  /**
   * Gera sugestões de resposta baseadas no contexto
   */
  async generateSuggestedResponses(history, currentMessage) {
    const patterns = this.detectPatterns(currentMessage);
    const suggestions = [];

    // Sugestões baseadas no tópico principal
    if (patterns.mainTopic === 'dashboard') {
      suggestions.push('Posso ajudar com navegação e configurações do dashboard.');
      suggestions.push('Que tipo de alteração você gostaria de fazer?');
    } else if (patterns.mainTopic === 'business') {
      suggestions.push('Vou explicar sobre nossos serviços da Digital Boost.');
      suggestions.push('Qual aspecto do seu negócio gostaria de melhorar?');
    } else if (patterns.mainTopic === 'support') {
      suggestions.push('Vou ajudar a resolver esse problema.');
      suggestions.push('Pode me dar mais detalhes sobre a dificuldade?');
    }

    // Sugestões baseadas no histórico
    if (history.length > 0) {
      const lastTopic = history[history.length - 1].patterns?.mainTopic;
      if (lastTopic && lastTopic !== patterns.mainTopic) {
        suggestions.push(`Entendi que mudamos de ${lastTopic} para ${patterns.mainTopic}.`);
      }
    }

    return suggestions.slice(0, 3); // Máximo 3 sugestões
  }

  /**
   * Analisa sentimento básico
   */
  analyzeSentiment(message) {
    const positiveWords = ['bom', 'ótimo', 'excelente', 'obrigado', 'perfeito', 'legal'];
    const negativeWords = ['ruim', 'péssimo', 'problema', 'erro', 'difícil', 'complicado'];

    const messageLower = message.toLowerCase();
    const positiveCount = positiveWords.filter(word => messageLower.includes(word)).length;
    const negativeCount = negativeWords.filter(word => messageLower.includes(word)).length;

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  /**
   * Analisa urgência
   */
  analyzeUrgency(message) {
    const urgentWords = ['urgente', 'rápido', 'agora', 'imediatamente', 'emergência', 'pressa'];
    const messageLower = message.toLowerCase();

    const urgentCount = urgentWords.filter(word => messageLower.includes(word)).length;

    if (urgentCount > 0) return 'high';
    if (message.includes('!') || message.includes('???')) return 'medium';
    return 'low';
  }

  /**
   * Analisa intenção
   */
  analyzeIntent(message) {
    const messageLower = message.toLowerCase();

    if (messageLower.includes('como') || messageLower.includes('?')) return 'question';
    if (messageLower.includes('quero') || messageLower.includes('preciso')) return 'request';
    if (messageLower.includes('obrigado') || messageLower.includes('valeu')) return 'thanks';
    if (messageLower.includes('oi') || messageLower.includes('olá')) return 'greeting';
    if (messageLower.includes('tchau') || messageLower.includes('até')) return 'farewell';

    return 'statement';
  }

  /**
   * Extrai entidades da mensagem
   */
  extractEntities(message) {
    const entities = {
      colors: [],
      numbers: [],
      services: [],
      locations: []
    };

    const messageLower = message.toLowerCase();

    // Cores
    const colors = ['azul', 'verde', 'vermelho', 'roxo', 'amarelo', 'preto', 'branco', 'escuro', 'claro'];
    entities.colors = colors.filter(color => messageLower.includes(color));

    // Números
    const numberMatches = message.match(/\d+/g);
    if (numberMatches) {
      entities.numbers = numberMatches.map(num => parseInt(num));
    }

    // Serviços
    const services = ['crm', 'dashboard', 'whatsapp', 'automação', 'marketing', 'vendas'];
    entities.services = services.filter(service => messageLower.includes(service));

    // Localizações
    const locations = ['natal', 'rn', 'rio grande do norte', 'nordeste'];
    entities.locations = locations.filter(location => messageLower.includes(location));

    return entities;
  }

  /**
   * Salva interação na memória
   */
  async saveInteraction(contactId, context) {
    try {
      const historyKey = `conversation_history_${contactId}`;
      const history = await getMemory(historyKey) || [];

      // Adicionar nova interação
      history.push({
        timestamp: context.timestamp,
        message: context.message,
        patterns: context.patterns,
        analysis: context.currentAnalysis
      });

      // Manter apenas histórico recente
      const trimmedHistory = history.slice(-this.maxHistoryLength);

      await setMemory(historyKey, trimmedHistory);
      console.log(`💾 [CONTEXT] Interação salva para ${contactId}`);
    } catch (error) {
      console.error('❌ [CONTEXT] Erro ao salvar interação:', error);
    }
  }

  /**
   * Gera contexto otimizado para o agente
   */
  generateAgentContext(fullContext) {
    const agentContext = {
      // Informações essenciais para o agente
      isFirstTime: fullContext.conversationContext.isFirstInteraction,
      previousTopic: fullContext.conversationContext.conversationFlow.previousTopic,
      userStyle: fullContext.conversationContext.userProfile.communicationStyle,
      currentTopic: fullContext.patterns.mainTopic,
      sentiment: fullContext.currentAnalysis.sentiment,
      urgency: fullContext.currentAnalysis.urgency,
      intent: fullContext.currentAnalysis.intent,

      // Sugestões para personalização
      suggestedTone: this.suggestTone(fullContext),
      keyEntities: fullContext.currentAnalysis.entities,
      contextualHints: this.generateContextualHints(fullContext)
    };

    return agentContext;
  }

  /**
   * Sugere tom da resposta
   */
  suggestTone(context) {
    const style = context.conversationContext.userProfile.communicationStyle;
    const sentiment = context.currentAnalysis.sentiment;
    const urgency = context.currentAnalysis.urgency;

    if (urgency === 'high') return 'urgent_helpful';
    if (sentiment === 'negative') return 'empathetic';
    if (style === 'formal') return 'professional';
    if (style === 'casual') return 'friendly';

    return 'balanced';
  }

  /**
   * Gera dicas contextuais
   */
  generateContextualHints(context) {
    const hints = [];

    if (context.conversationContext.isFirstInteraction) {
      hints.push('Primeira interação - apresentar brevemente os serviços');
    }

    if (context.patterns.mainTopic === 'dashboard') {
      hints.push('Focar em funcionalidades de interface e navegação');
    }

    if (context.patterns.mainTopic === 'business') {
      hints.push('Enfatizar benefícios para PMEs e ROI');
    }

    if (context.currentAnalysis.urgency === 'high') {
      hints.push('Resposta rápida e direta');
    }

    if (context.currentAnalysis.sentiment === 'negative') {
      hints.push('Tom empático e soluções práticas');
    }

    return hints;
  }

  /**
   * Estatísticas do gerenciador de contexto
   */
  async getStats() {
    // Esta implementação poderia ser expandida para incluir métricas reais
    return {
      maxHistoryLength: this.maxHistoryLength,
      contextWindow: this.contextWindow,
      topicPatterns: Object.keys(this.topicPatterns).length,
      activeContexts: 0 // Implementar contagem real se necessário
    };
  }

  /**
   * 💚 DETECÇÃO DE OFF-TOPIC COM EMPATIA
   * Detecta quando o lead está falando sobre assuntos pessoais/emergenciais
   * e retorna resposta empática com redirecionamento suave
   */
  detectOffTopicWithEmpathy(userMessage, history = []) {
    const messageLower = userMessage.toLowerCase();

    // Padrões de assuntos off-topic que precisam de empatia
    const offTopicPatterns = {
      emergency: {
        keywords: ['doente', 'sick', 'hospital', 'emergência', 'emergency', 'urgente', 'urgent', 'acidente', 'accident'],
        response: 'Entendo perfeitamente, situações assim precisam de toda nossa atenção. Sua prioridade agora é cuidar disso. Quando as coisas se acalmarem, estarei aqui para continuarmos nossa conversa. Desejo melhoras! 🙏'
      },
      personal: {
        keywords: ['família', 'family', 'filho', 'son', 'filha', 'daughter', 'mãe', 'mother', 'pai', 'father', 'esposa', 'wife', 'marido', 'husband'],
        response: 'Entendo completamente. Assuntos de família sempre vêm em primeiro lugar. Quando tiver um momento mais tranquilo, podemos retomar nossa conversa sobre como posso ajudar seu negócio. Conte comigo! 💙'
      },
      busy: {
        keywords: ['ocupado', 'busy', 'sem tempo', 'no time', 'corrido', 'atarefado', 'cheio de trabalho'],
        response: 'Sei como é ter uma agenda cheia! Não quero tomar seu tempo agora. Quando tiver um momento, me avisa e a gente conversa com calma sobre como nossos agentes podem, inclusive, liberar mais tempo na sua rotina. 😊'
      },
      unrelated: {
        keywords: ['futebol', 'football', 'jogo', 'game', 'filme', 'movie', 'série', 'series', 'novela', 'festa', 'party'],
        response: 'Legal! 😊 Entendo que esse assunto é importante pra você. Quando tiver interesse em conversar sobre como podemos ajudar seu negócio a crescer, é só me chamar!'
      }
    };

    // Detectar qual tipo de off-topic
    for (const [type, config] of Object.entries(offTopicPatterns)) {
      const matches = config.keywords.filter(keyword => messageLower.includes(keyword));
      if (matches.length > 0) {
        console.log(`💚 [OFF-TOPIC] Detectado: ${type} - keywords: ${matches.join(', ')}`);
        return {
          isOffTopic: true,
          type,
          empatheticResponse: config.response,
          shouldPause: type === 'emergency' || type === 'personal', // Pausar follow-up nesses casos
          detectedKeywords: matches
        };
      }
    }

    return {
      isOffTopic: false
    };
  }
}

// Instância singleton
const contextManager = new ContextManager();
export default contextManager;
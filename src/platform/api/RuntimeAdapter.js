/**
 * RUNTIME ADAPTER
 * Ponte entre a Platform (configuracao) e o Runtime existente (webhooks, WhatsApp, OpenAI)
 *
 * Este adapter conecta:
 * - Agentes configurados na Platform
 * - State Machine de qualificacao
 * - Infraestrutura existente (OpenAI, WhatsApp, etc.)
 */

import { getAgentFactory } from '../AgentFactory.js';
import { SDRStateMachine, createSDRStateMachine } from '../runtime/state_machines/SDRStateMachine.js';

export class RuntimeAdapter {
  constructor(options = {}) {
    this.factory = getAgentFactory();
    this.openaiClient = options.openaiClient; // Injeta cliente OpenAI existente
    this.whatsappClient = options.whatsappClient; // Injeta cliente WhatsApp existente
    this.conversationRepo = options.conversationRepo;
    this.messageRepo = options.messageRepo;

    // Cache de agentes ativos
    this.activeAgents = new Map();
    // Cache de state machines por conversa
    this.stateMachines = new Map();
  }

  /**
   * Carrega agente da factory ou cache
   */
  getAgent(agentId) {
    if (this.activeAgents.has(agentId)) {
      return this.activeAgents.get(agentId);
    }

    const agent = this.factory.getAgent(agentId);
    if (agent) {
      this.activeAgents.set(agentId, agent);
    }
    return agent;
  }

  /**
   * Cria ou recupera state machine para uma conversa
   */
  getStateMachine(conversationId, agentConfig) {
    if (this.stateMachines.has(conversationId)) {
      return this.stateMachines.get(conversationId);
    }

    const sm = createSDRStateMachine(agentConfig);
    this.stateMachines.set(conversationId, sm);
    return sm;
  }

  /**
   * Restaura state machine de dados persistidos
   */
  restoreStateMachine(conversationId, stateData, agentConfig) {
    const sm = this.getStateMachine(conversationId, agentConfig);
    sm.restore(stateData);
    return sm;
  }

  /**
   * Processa mensagem usando agente da Platform
   * Retorna resposta para ser enviada
   */
  async processMessage(params) {
    const {
      agentId,
      conversationId,
      contactId,
      message,
      channel = 'whatsapp',
      conversationHistory = [],
      existingState = null,
    } = params;

    // 1. Busca agente
    const agent = this.getAgent(agentId);
    if (!agent) {
      throw new Error(`Agente ${agentId} nao encontrado`);
    }

    // 2. Busca/cria state machine
    const sm = existingState
      ? this.restoreStateMachine(conversationId, existingState, agent.config)
      : this.getStateMachine(conversationId, agent.config);

    // 3. Processa mensagem na state machine
    const currentState = sm.processMessage(message, this.extractData(message));

    // 4. Monta contexto para OpenAI
    const systemPrompt = this.buildSystemPrompt(agent, currentState);
    const messages = this.buildMessages(conversationHistory, message, currentState);

    // 5. Chama OpenAI (usando cliente injetado)
    let response;
    if (this.openaiClient) {
      response = await this.callOpenAI(systemPrompt, messages);
    } else {
      // Fallback: retorna resposta baseada no estado
      response = this.getStateBasedResponse(currentState);
    }

    // 6. Persiste estado
    const serializedState = sm.serialize();

    return {
      response,
      state: serializedState,
      currentState: currentState.id,
      leadScore: sm.context.score,
      leadStatus: sm.context.classification?.status,
      qualification: {
        spin: sm.context.spin,
        bant: sm.context.bant,
      },
      suggestedQuestions: sm.getSuggestedQuestions(),
      shouldEscalate: this.shouldEscalate(currentState),
      shouldSchedule: currentState.id === 'S8_SCHEDULING',
    };
  }

  /**
   * Extrai dados estruturados da mensagem
   */
  extractData(message) {
    const data = {
      spin: {},
      bant: {},
      lead: {},
    };

    const lowerMsg = message.toLowerCase();

    // Detecta BANT - Budget
    if (lowerMsg.includes('orcamento') || lowerMsg.includes('quanto custa') || lowerMsg.includes('valor')) {
      if (lowerMsg.includes('nao tenho') || lowerMsg.includes('sem verba')) {
        data.bant.budget = { level: 'low', data: message };
      } else if (lowerMsg.includes('tenho') || lowerMsg.includes('posso investir')) {
        data.bant.budget = { level: 'high', data: message };
      }
    }

    // Detecta BANT - Authority
    if (lowerMsg.includes('eu decido') || lowerMsg.includes('sou o dono') || lowerMsg.includes('responsavel')) {
      data.bant.authority = { level: 'high', data: message };
    } else if (lowerMsg.includes('preciso falar com') || lowerMsg.includes('meu chefe') || lowerMsg.includes('meu socio')) {
      data.bant.authority = { level: 'medium', data: message };
    }

    // Detecta BANT - Need
    if (lowerMsg.includes('preciso') || lowerMsg.includes('estou buscando') || lowerMsg.includes('problema')) {
      data.bant.need = { level: 'high', data: message };
    }

    // Detecta BANT - Timeline
    if (lowerMsg.includes('urgente') || lowerMsg.includes('agora') || lowerMsg.includes('essa semana')) {
      data.bant.timeline = { level: 'high', data: message };
    } else if (lowerMsg.includes('proximo mes') || lowerMsg.includes('em breve')) {
      data.bant.timeline = { level: 'medium', data: message };
    } else if (lowerMsg.includes('ano que vem') || lowerMsg.includes('sem pressa')) {
      data.bant.timeline = { level: 'low', data: message };
    }

    return data;
  }

  /**
   * Constroi system prompt combinando agente + estado atual
   */
  buildSystemPrompt(agent, currentState) {
    let prompt = agent.getPrompt();

    // Adiciona contexto do estado atual
    prompt += `\n\n---\n\n## ESTADO ATUAL DA CONVERSA\n\n`;
    prompt += `**Etapa:** ${currentState.name} - ${currentState.description}\n`;
    prompt += `**Objetivos desta etapa:**\n`;

    if (currentState.goals) {
      currentState.goals.forEach(goal => {
        prompt += `- ${goal}\n`;
      });
    }

    // Adiciona perguntas sugeridas
    const questions = agent.stateMachine.getSuggestedQuestions();
    if (questions.length > 0) {
      prompt += `\n**Perguntas sugeridas para fazer:**\n`;
      questions.forEach(q => {
        prompt += `- ${q}\n`;
      });
    }

    // Adiciona score atual se ja tiver
    if (currentState.context?.score > 0) {
      prompt += `\n**Score atual do lead:** ${currentState.context.score}/100`;
      prompt += `\n**Classificacao:** ${currentState.context.classification?.status || 'Em qualificacao'}`;
    }

    return prompt;
  }

  /**
   * Constroi array de mensagens para OpenAI
   */
  buildMessages(history, currentMessage, currentState) {
    const messages = [];

    // Adiciona historico
    history.forEach(msg => {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    });

    // Adiciona mensagem atual
    messages.push({
      role: 'user',
      content: currentMessage,
    });

    return messages;
  }

  /**
   * Chama OpenAI usando cliente existente
   */
  async callOpenAI(systemPrompt, messages) {
    if (!this.openaiClient) {
      throw new Error('OpenAI client nao configurado');
    }

    try {
      const response = await this.openaiClient.chat.completions.create({
        model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('[RuntimeAdapter] Erro OpenAI:', error.message);
      throw error;
    }
  }

  /**
   * Resposta baseada no estado (fallback sem OpenAI)
   */
  getStateBasedResponse(currentState) {
    const responses = {
      S1_OPENING: 'Ola! Prazer em conhece-lo. Para entender melhor como posso ajudar, poderia me contar um pouco sobre sua empresa?',
      S2_SITUATION: 'Interessante! E como voces estao lidando com isso atualmente?',
      S3_PROBLEM: 'Entendo. E quais os principais desafios que voces enfrentam nessa area?',
      S4_IMPLICATION: 'Se esse problema persistir, qual seria o impacto para o negocio?',
      S5_NEED_PAYOFF: 'E se voces conseguissem resolver isso, o que mudaria na operacao?',
      S6_BANT_VALIDATION: 'Para garantir que estamos alinhados, quando pretendem implementar uma solucao?',
      S8_SCHEDULING: 'Baseado no que conversamos, acho que faz sentido agendarmos uma reuniao com nosso especialista. Qual horario seria melhor para voce?',
      S9_NURTURING: 'Obrigado pelo interesse! Vou enviar alguns materiais que podem ajudar. Podemos retomar em algumas semanas?',
      S10_DISQUALIFIED: 'Obrigado pelo contato! No momento, parece que nossa solucao nao e o melhor fit. Estamos a disposicao para o futuro.',
    };

    return responses[currentState.id] || 'Como posso ajuda-lo?';
  }

  /**
   * Verifica se deve escalar para humano
   */
  shouldEscalate(currentState) {
    // Escala se cliente pedir ou se estado indicar
    const escalationStates = ['S9_NURTURING', 'S10_DISQUALIFIED'];
    return escalationStates.includes(currentState.id);
  }

  /**
   * Envia mensagem via WhatsApp (usando cliente existente)
   */
  async sendMessage(phone, message) {
    if (!this.whatsappClient) {
      console.warn('[RuntimeAdapter] WhatsApp client nao configurado');
      return { success: false, error: 'WhatsApp client nao disponivel' };
    }

    try {
      await this.whatsappClient.sendText(phone, message);
      return { success: true };
    } catch (error) {
      console.error('[RuntimeAdapter] Erro WhatsApp:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Limpa cache de agente
   */
  clearAgentCache(agentId) {
    this.activeAgents.delete(agentId);
  }

  /**
   * Limpa cache de state machine
   */
  clearStateMachineCache(conversationId) {
    this.stateMachines.delete(conversationId);
  }

  /**
   * Limpa todos os caches
   */
  clearAllCaches() {
    this.activeAgents.clear();
    this.stateMachines.clear();
  }
}

// Singleton
let adapterInstance = null;

export function getRuntimeAdapter(options) {
  if (!adapterInstance) {
    adapterInstance = new RuntimeAdapter(options);
  }
  return adapterInstance;
}

export default RuntimeAdapter;

/**
 * @file application/use-cases/message/ProcessIncomingMessageUseCase.js
 * @description Process Incoming Message Use Case
 * Wave 5: Application Layer - Use Cases
 */

import { ValidationError } from '../../../utils/errors/index.js';
import { MessageReceivedEvent } from '../../../infrastructure/events/index.js';

/**
 * Process Incoming Message Use Case
 * Orchestrates incoming message processing with AI response generation
 */
export class ProcessIncomingMessageUseCase {
  /**
   * @param {Object} conversationService - Conversation domain service
   * @param {Object} leadService - Lead domain service
   * @param {Object} openaiAdapter - OpenAI adapter
   * @param {Object} eventBus - Event bus
   * @param {Object} cacheManager - Cache manager
   * @param {Object} logger - Logger instance
   * @param {Object} agentHub - Optional AgentHub for multi-agent processing
   */
  constructor(conversationService, leadService, openaiAdapter, eventBus, cacheManager, logger, agentHub = null) {
    this.conversationService = conversationService;
    this.leadService = leadService;
    this.openaiAdapter = openaiAdapter;
    this.eventBus = eventBus;
    this.cache = cacheManager;
    this.logger = logger;
    this.agentHub = agentHub;
  }

  /**
   * Execute use case
   * @param {Object} input - Input data
   * @param {string} input.phoneNumber - Sender phone number
   * @param {string} input.text - Message text
   * @param {string} input.type - Message type
   * @returns {Promise<Object>} Processing result with AI response
   */
  async execute(input) {
    this.logger.info('ProcessIncomingMessageUseCase: Executing', {
      phoneNumber: input.phoneNumber,
      tenantId: input.tenantId,
      textLength: input.text?.length
    });

    // Validate input
    this.validate(input);

    try {
      // Record incoming message
      const message = await this.conversationService.addUserMessage(
        input.phoneNumber,
        input.text,
        { type: input.type || 'text', tenantId: input.tenantId }
      );

      // Publish domain event
      await this.eventBus.publish(new MessageReceivedEvent(input.phoneNumber, message));

      // Get or create lead
      const lead = await this.leadService.getOrCreate(input.phoneNumber, {
        currentState: 'DISCOVERY',
        currentAgent: 'sdr'
      });

      // Record interaction
      await this.leadService.recordInteraction(input.phoneNumber);

      // Get conversation context
      const context = await this.conversationService.getContext(input.phoneNumber, input.tenantId, 10);

      // Generate AI response (using AgentHub if available, otherwise fallback to OpenAI)
      const aiResponse = await this.generateAIResponse(lead, context, input.text, input.metadata);

      this.logger.info('ProcessIncomingMessageUseCase: Message processed', {
        phoneNumber: input.phoneNumber,
        responseLength: aiResponse?.text?.length || aiResponse?.length
      });

      return this.formatOutput(message, aiResponse, lead);
    } catch (error) {
      this.logger.error('ProcessIncomingMessageUseCase: Failed', {
        phoneNumber: input.phoneNumber,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * Generate AI response
   * @private
   * @param {Object} lead - Lead entity
   * @param {Array} context - Conversation context
   * @param {string} userMessage - User message
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Object|string>} AI response (object if AgentHub, string if OpenAI)
   */
  async generateAIResponse(lead, context, userMessage, metadata = {}) {
    // Use AgentHub if available (multi-agent system)
    if (this.agentHub) {
      this.logger.info('Using AgentHub for AI response generation');

      try {
        const agentResult = await this.agentHub.processMessage({
          fromContact: lead.phoneNumber.value,
          text: userMessage
        }, {
          messageType: metadata.type || 'text',
          metadata: metadata,
          hasHistory: context.length > 0,
          waitTime: metadata.waitTime,
          attempts: metadata.attempts,
          from: lead.phoneNumber.value,
          fromWhatsApp: metadata.fromWhatsApp || true,
          platform: 'whatsapp',
          lead: lead.toObject ? lead.toObject() : lead, // Pass lead state
          conversationContext: context
        });

        // Normalize AgentHub response format
        return {
          text: agentResult.message || agentResult.response || agentResult.answer || 'Resposta processada',
          shouldSend: agentResult.success !== false,
          source: agentResult.source || 'agent',
          preHandoffMessage: agentResult.preHandoffMessage,
          followUpMessage: agentResult.followUpMessage,
          sendDigitalBoostAudio: agentResult.sendDigitalBoostAudio || false,
          agentUsed: agentResult.agentUsed || 'AgentHub'
        };
      } catch (agentError) {
        this.logger.error('AgentHub failed, falling back to OpenAI', {
          error: agentError.message
        });
        // Fall through to OpenAI fallback
      }
    }

    // Fallback to simple OpenAI response
    this.logger.info('Using OpenAI direct for AI response generation');

    const systemPrompt = this.buildSystemPrompt(lead);

    // Build messages for OpenAI
    const messages = [
      { role: 'system', content: systemPrompt },
      ...context
    ];

    // Generate response
    const response = await this.openaiAdapter.generateChatCompletion(messages, {
      temperature: 0.7,
      maxTokens: 500
    });

    // Wrap in standard format
    return {
      text: response,
      shouldSend: true,
      source: 'openai',
      agentUsed: 'OpenAI'
    };
  }

  /**
   * Build system prompt based on lead state
   * @private
   * @param {Object} lead - Lead entity
   * @returns {string} System prompt
   */
  buildSystemPrompt(lead) {
    const qualificationStatus = lead.getQualificationStatus();

    return `Você é o Agente LEADLY, um SDR (Sales Development Representative) da Digital Boost.

Informações do Lead:
- Telefone: ${lead.phoneNumber.value}
- Nome: ${lead.name || 'Não informado'}
- Empresa: ${lead.company || 'Não informada'}
- Setor: ${lead.sector || 'Não informado'}
- Score de Qualificação: ${qualificationStatus.score}/100 (${qualificationStatus.scoreLevel})
- Estágio BANT: ${qualificationStatus.stageDisplay}
- Progresso: ${qualificationStatus.progress}%

Sua missão é qualificar este lead através do framework BANT:
- Budget (Orçamento disponível)
- Authority (Tomador de decisão)
- Need (Necessidade da solução)
- Timeline (Prazo para implementação)

Diretrizes:
1. Seja consultivo e empático
2. Faça perguntas abertas para descobrir necessidades
3. Foque no estágio BANT atual
4. Não seja agressivo nas vendas
5. Use uma linguagem profissional mas amigável
6. Responda em português brasileiro

Lembre-se: você está aqui para ajudar, não apenas para vender.`;
  }

  /**
   * Validate input
   * @private
   * @param {Object} input - Input data
   */
  validate(input) {
    if (!input.phoneNumber) {
      throw new ValidationError('Phone number is required', {
        field: 'phoneNumber'
      });
    }

    if (!input.text || typeof input.text !== 'string') {
      throw new ValidationError('Message text is required', {
        field: 'text'
      });
    }

    if (input.text.trim().length === 0) {
      throw new ValidationError('Message text cannot be empty', {
        field: 'text'
      });
    }

    if (!input.tenantId) {
      throw new ValidationError('Tenant ID is required', {
        field: 'tenantId'
      });
    }
  }

  /**
   * Format output
   * @private
   * @param {Object} message - Message entity
   * @param {Object|string} aiResponse - AI response (object from AgentHub or string from OpenAI)
   * @param {Object} lead - Lead entity
   * @returns {Object} Formatted output
   */
  formatOutput(message, aiResponse, lead) {
    // Normalize aiResponse to object format
    const normalizedResponse = typeof aiResponse === 'string'
      ? { text: aiResponse, shouldSend: true, source: 'openai' }
      : aiResponse;

    return {
      success: true,
      incomingMessage: {
        text: message.text,
        type: message.type,
        timestamp: message.timestamp.toISOString()
      },
      aiResponse: {
        text: normalizedResponse.text,
        shouldSend: normalizedResponse.shouldSend !== false,
        source: normalizedResponse.source,
        preHandoffMessage: normalizedResponse.preHandoffMessage,
        followUpMessage: normalizedResponse.followUpMessage,
        sendDigitalBoostAudio: normalizedResponse.sendDigitalBoostAudio || false,
        agentUsed: normalizedResponse.agentUsed
      },
      lead: {
        phoneNumber: lead.phoneNumber.value,
        name: lead.name,
        qualificationScore: lead.qualificationScore.value,
        bantStage: lead.bantStage.value,
        currentState: lead.currentState
      }
    };
  }
}

export default ProcessIncomingMessageUseCase;

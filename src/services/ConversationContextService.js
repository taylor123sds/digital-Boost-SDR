/**
 * @file ConversationContextService.js
 * @description Service for managing conversation context for intelligent follow-ups
 *
 * Responsibilities:
 * - Save conversation summary when lead responds
 * - Retrieve conversation context for follow-up generation
 * - Generate intelligent follow-up messages based on conversation history
 *
 * @author ORBION Team
 * @version 1.0.0
 */

import { getDatabase } from '../db/index.js';
import OpenAI from 'openai';
import log from '../utils/logger-wrapper.js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Singleton instance
 */
let instance = null;

class ConversationContextService {
  constructor() {
    if (instance) {
      return instance;
    }
    instance = this;
    this._ensureTable();
    log.info('[CONVERSATION-CONTEXT] Service initialized');
  }

  /**
   * Ensure conversation_context table exists
   */
  _ensureTable() {
    try {
      const db = getDatabase();
      db.exec(`
        CREATE TABLE IF NOT EXISTS conversation_context (
          id TEXT PRIMARY KEY,
          lead_id TEXT NOT NULL,
          phone TEXT NOT NULL,
          cadence_day INTEGER DEFAULT 1,
          conversation_summary TEXT,
          bant_stage TEXT,
          spin_stage TEXT,
          topics_discussed TEXT,
          objections_raised TEXT,
          interest_level INTEGER DEFAULT 0,
          next_action_suggested TEXT,
          last_lead_message TEXT,
          last_agent_message TEXT,
          messages_exchanged INTEGER DEFAULT 0,
          meeting_mentioned INTEGER DEFAULT 0,
          pricing_discussed INTEGER DEFAULT 0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(lead_id, cadence_day)
        )
      `);
      log.info('[CONVERSATION-CONTEXT] Table ensured');
    } catch (error) {
      log.error('[CONVERSATION-CONTEXT] Table creation error:', { error: error.message });
    }
  }

  /**
   * Save conversation context after lead interaction
   *
   * @param {string} phone - Lead phone number
   * @param {Object} context - Conversation context
   * @param {string} context.leadId - Lead ID
   * @param {number} context.cadenceDay - Current cadence day
   * @param {Object} context.leadState - Lead state with BANT/SPIN data
   * @param {Array} context.conversationHistory - Recent messages
   * @returns {Promise<Object>} Result
   */
  async saveConversationContext(phone, context) {
    try {
      const db = getDatabase();
      const {
        leadId,
        cadenceDay = 1,
        leadState = {},
        conversationHistory = [],
        lastLeadMessage,
        lastAgentMessage
      } = context;

      // Generate summary using GPT
      const summary = await this._generateConversationSummary(
        conversationHistory,
        leadState
      );

      const id = `ctx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Extract relevant data from leadState
      const bantStage = leadState.bant?.need ? 'qualified' : 'collecting';
      const spinStage = leadState.consultativeEngine?.currentStage || leadState.spin?.currentStage || 'situation';
      const topicsDiscussed = JSON.stringify(summary.topics || []);
      const objectionsRaised = JSON.stringify(summary.objections || []);

      // Check for meeting/pricing mentions
      const meetingMentioned = conversationHistory.some(m =>
        m.content?.toLowerCase().includes('reuni') ||
        m.content?.toLowerCase().includes('agendar') ||
        m.content?.toLowerCase().includes('calendário')
      ) ? 1 : 0;

      const pricingDiscussed = conversationHistory.some(m =>
        m.content?.toLowerCase().includes('preço') ||
        m.content?.toLowerCase().includes('valor') ||
        m.content?.toLowerCase().includes('custo') ||
        m.content?.toLowerCase().includes('investimento')
      ) ? 1 : 0;

      // Upsert context
      db.prepare(`
        INSERT INTO conversation_context (
          id, lead_id, phone, cadence_day, conversation_summary, bant_stage, spin_stage,
          topics_discussed, objections_raised, interest_level, next_action_suggested,
          last_lead_message, last_agent_message, messages_exchanged,
          meeting_mentioned, pricing_discussed, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(lead_id, cadence_day) DO UPDATE SET
          conversation_summary = excluded.conversation_summary,
          bant_stage = excluded.bant_stage,
          spin_stage = excluded.spin_stage,
          topics_discussed = excluded.topics_discussed,
          objections_raised = excluded.objections_raised,
          interest_level = excluded.interest_level,
          next_action_suggested = excluded.next_action_suggested,
          last_lead_message = excluded.last_lead_message,
          last_agent_message = excluded.last_agent_message,
          messages_exchanged = excluded.messages_exchanged,
          meeting_mentioned = excluded.meeting_mentioned,
          pricing_discussed = excluded.pricing_discussed,
          updated_at = datetime('now')
      `).run(
        id, leadId, phone, cadenceDay, summary.summary, bantStage, spinStage,
        topicsDiscussed, objectionsRaised, summary.interestLevel || 5,
        summary.nextAction, lastLeadMessage, lastAgentMessage,
        conversationHistory.length, meetingMentioned, pricingDiscussed
      );

      log.info('[CONVERSATION-CONTEXT] Context saved', {
        phone,
        cadenceDay,
        interestLevel: summary.interestLevel,
        spinStage
      });

      return { success: true, summary };

    } catch (error) {
      log.error('[CONVERSATION-CONTEXT] Save error:', { error: error.message, phone });
      return { success: false, error: error.message };
    }
  }

  /**
   * Get conversation context for a lead
   *
   * @param {string} phone - Lead phone number
   * @param {number} cadenceDay - Optional specific day (defaults to latest)
   * @returns {Promise<Object|null>} Conversation context
   */
  async getConversationContext(phone, cadenceDay = null) {
    try {
      const db = getDatabase();

      let context;
      if (cadenceDay) {
        context = db.prepare(`
          SELECT * FROM conversation_context
          WHERE phone = ? AND cadence_day = ?
          ORDER BY updated_at DESC
          LIMIT 1
        `).get(phone, cadenceDay);
      } else {
        // Get most recent context
        context = db.prepare(`
          SELECT * FROM conversation_context
          WHERE phone = ?
          ORDER BY cadence_day DESC, updated_at DESC
          LIMIT 1
        `).get(phone);
      }

      if (!context) {
        return null;
      }

      // Parse JSON fields
      return {
        ...context,
        topics_discussed: JSON.parse(context.topics_discussed || '[]'),
        objections_raised: JSON.parse(context.objections_raised || '[]')
      };

    } catch (error) {
      log.error('[CONVERSATION-CONTEXT] Get error:', { error: error.message, phone });
      return null;
    }
  }

  /**
   * Generate intelligent follow-up message based on conversation context
   *
   * @param {string} phone - Lead phone number
   * @param {number} targetDay - Day of the follow-up (D2, D4, etc)
   * @param {Object} leadData - Lead data from database
   * @returns {Promise<string>} Personalized follow-up message
   */
  async generateIntelligentFollowUp(phone, targetDay, leadData = {}) {
    try {
      // Get previous conversation context
      const context = await this.getConversationContext(phone);

      if (!context) {
        log.info('[CONVERSATION-CONTEXT] No previous context, using default follow-up');
        return null; // Use default cadence message
      }

      log.info('[CONVERSATION-CONTEXT] Generating intelligent follow-up', {
        phone,
        targetDay,
        previousDay: context.cadence_day,
        interestLevel: context.interest_level
      });

      // Generate contextual follow-up using GPT
      const prompt = this._buildFollowUpPrompt(context, targetDay, leadData);

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Você é o Taylor, vendedor da Digital Boost, especializada em marketing digital para integradoras de energia solar.

REGRAS DE ESTILO:
- Tom: Vendedor direto, não terapeuta educado demais
- Máximo 4 linhas curtas
- UMA pergunta apenas no final
- NUNCA começar com: "Oi!", "Olá!", "E aí!", "Tudo bem?"
- NUNCA usar: "Entendo", "Perfeito", "Que legal", "Ótimo", "Excelente"
- Pode usar: "Faz sentido", "Acontece muito", "Vejo isso direto"

CONTEXTO: Você está fazendo follow-up de uma conversa anterior. O lead já te conhece e vocês já conversaram.`
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 300,
        temperature: 0.8
      });

      const followUpMessage = response.choices[0].message.content.trim();

      log.info('[CONVERSATION-CONTEXT] Follow-up generated', {
        phone,
        length: followUpMessage.length
      });

      return followUpMessage;

    } catch (error) {
      log.error('[CONVERSATION-CONTEXT] Follow-up generation error:', { error: error.message });
      return null; // Fallback to default cadence message
    }
  }

  /**
   * Build prompt for follow-up generation
   * @private
   */
  _buildFollowUpPrompt(context, targetDay, leadData) {
    const daysSince = targetDay - context.cadence_day;
    const empresa = leadData.empresa || 'a empresa';

    let prompt = `TAREFA: Gerar mensagem de follow-up para o dia D${targetDay} (${daysSince} dias após última conversa)

CONTEXTO DA CONVERSA ANTERIOR (D${context.cadence_day}):
- Resumo: ${context.conversation_summary || 'Conversa inicial sobre marketing digital'}
- Estágio SPIN: ${context.spin_stage}
- Nível de interesse: ${context.interest_level}/10
- Tópicos discutidos: ${context.topics_discussed?.join(', ') || 'apresentação inicial'}
`;

    if (context.objections_raised?.length > 0) {
      prompt += `- Objeções levantadas: ${context.objections_raised.join(', ')}\n`;
    }

    if (context.meeting_mentioned) {
      prompt += `- IMPORTANTE: Já mencionou interesse em reunião\n`;
    }

    if (context.pricing_discussed) {
      prompt += `- IMPORTANTE: Já discutiram valores/preços\n`;
    }

    prompt += `- Última mensagem do lead: "${context.last_lead_message || 'N/A'}"
- Última mensagem do agente: "${context.last_agent_message || 'N/A'}"

DADOS DO LEAD:
- Empresa: ${empresa}
- Nome: ${leadData.nome || 'não informado'}

OBJETIVO DO FOLLOW-UP:
`;

    // Define objective based on context
    if (context.interest_level >= 7) {
      prompt += `- ALTA PRIORIDADE: Lead muito interessado. Foco em agendar reunião.`;
    } else if (context.meeting_mentioned) {
      prompt += `- Lead mencionou reunião antes. Retomar esse assunto naturalmente.`;
    } else if (context.objections_raised?.length > 0) {
      prompt += `- Tinha objeções. Abordar de forma diferente, trazer valor novo.`;
    } else if (context.spin_stage === 'problem' || context.spin_stage === 'implication') {
      prompt += `- Estava explorando dores/problemas. Continuar aprofundando o impacto.`;
    } else {
      prompt += `- Follow-up padrão. Retomar conversa de forma natural, trazer insight novo.`;
    }

    prompt += `

GERE a mensagem de follow-up (MÁXIMO 4 linhas):`;

    return prompt;
  }

  /**
   * Generate conversation summary using GPT
   * @private
   */
  async _generateConversationSummary(conversationHistory, leadState) {
    try {
      if (!conversationHistory || conversationHistory.length === 0) {
        return {
          summary: 'Sem histórico de conversa',
          topics: [],
          objections: [],
          interestLevel: 3,
          nextAction: 'follow_up_standard'
        };
      }

      // Format conversation for analysis
      const conversationText = conversationHistory
        .slice(-10) // Last 10 messages
        .map(m => `${m.role === 'assistant' ? 'Agente' : 'Lead'}: ${m.content}`)
        .join('\n');

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Analise a conversa e extraia informações estruturadas. Responda APENAS em JSON válido.`
          },
          {
            role: 'user',
            content: `CONVERSA:
${conversationText}

ESTADO DO LEAD:
- Estágio BANT: ${leadState.bant ? JSON.stringify(leadState.bant) : 'não coletado'}
- Estágio SPIN: ${leadState.consultativeEngine?.currentStage || leadState.spin?.currentStage || 'situation'}

EXTRAIA:
{
  "summary": "Resumo em 1-2 frases do que foi discutido",
  "topics": ["lista de tópicos abordados"],
  "objections": ["objeções ou preocupações levantadas pelo lead"],
  "interestLevel": número de 1-10 indicando interesse do lead,
  "nextAction": "próxima ação recomendada: follow_up_standard | follow_up_meeting | follow_up_objection | follow_up_value"
}`
          }
        ],
        response_format: { type: 'json_object' },
        max_tokens: 300,
        temperature: 0.3
      });

      const result = JSON.parse(response.choices[0].message.content);
      return result;

    } catch (error) {
      log.error('[CONVERSATION-CONTEXT] Summary generation error:', { error: error.message });
      return {
        summary: 'Erro ao gerar resumo',
        topics: [],
        objections: [],
        interestLevel: 5,
        nextAction: 'follow_up_standard'
      };
    }
  }

  /**
   * Check if lead has conversation history
   *
   * @param {string} phone - Lead phone number
   * @returns {Promise<boolean>}
   */
  async hasConversationHistory(phone) {
    const context = await this.getConversationContext(phone);
    return context !== null && context.messages_exchanged > 0;
  }
}

/**
 * Get singleton instance
 */
export function getConversationContextService() {
  if (!instance) {
    instance = new ConversationContextService();
  }
  return instance;
}

export default ConversationContextService;

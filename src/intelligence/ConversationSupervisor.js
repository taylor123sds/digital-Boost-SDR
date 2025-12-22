/**
 * @file ConversationSupervisor.js
 * @description Sistema Supervisor de Conversas - Analisa e Melhora Performance do Agente
 *
 * ARQUITETURA:
 * 1. Análise de Contexto - Entende O QUE está sendo dito (não apenas keywords)
 * 2. Detecção de Situações Especiais - Bot, Rejeição, Redirecionamento, Confusão
 * 3. Recomendação de Ação - O que o agente DEVERIA fazer
 * 4. Auditoria - Analisa conversas passadas para identificar padrões de erro
 *
 * @author ORBION Team
 * @version 1.0.0
 */

//  FIX: Usar getDatabase() que verifica e reconecta se necessário
import { getDatabase } from '../db/index.js';
import openaiClient from '../core/openai_client.js';
import log from '../utils/logger-wrapper.js';
import { DEFAULT_TENANT_ID, getTenantColumnForTable } from '../utils/tenantCompat.js';

// ═══════════════════════════════════════════════════════════════
// CONFIGURAÇÃO
// ═══════════════════════════════════════════════════════════════

const CONFIG = {
  // Modelo para análise de contexto (rápido e barato)
  ANALYSIS_MODEL: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',

  // Tipos de situação que o supervisor pode detectar
  SITUATION_TYPES: {
    NORMAL_CONVERSATION: 'normal_conversation',
    BOT_DETECTED: 'bot_detected',
    REJECTION: 'rejection',
    REDIRECT_TO_HUMAN: 'redirect_to_human',
    OUT_OF_SCOPE: 'out_of_scope',
    CONFUSION: 'confusion',
    ALREADY_CUSTOMER: 'already_customer',
    WRONG_NUMBER: 'wrong_number',
    COMPETITOR: 'competitor',
    NOT_DECISION_MAKER: 'not_decision_maker'
  },

  // Ações recomendadas
  RECOMMENDED_ACTIONS: {
    CONTINUE_SPIN: 'continue_spin',
    STOP_CONVERSATION: 'stop_conversation',
    ACKNOWLEDGE_AND_EXIT: 'acknowledge_and_exit',
    CLARIFY_IDENTITY: 'clarify_identity',
    ADAPT_APPROACH: 'adapt_approach',
    ASK_FOR_REFERRAL: 'ask_for_referral',
    WAIT_FOR_HUMAN: 'wait_for_human'
  }
};

// ═══════════════════════════════════════════════════════════════
// PROMPTS DE ANÁLISE
// ═══════════════════════════════════════════════════════════════

const CONTEXT_ANALYSIS_PROMPT = `Você é um supervisor de conversas de vendas.
Analise a mensagem do lead e determine:
1. O que está REALMENTE sendo comunicado (não apenas palavras)
2. Se há sinais de que é um BOT ou auto-resposta
3. Se há sinais de rejeição ou desinteresse
4. Se estão redirecionando para outra pessoa
5. Se a mensagem está fora do escopo da venda

MENSAGEM DO LEAD:
"{message}"

CONTEXTO DA CONVERSA:
{context}

HISTÓRICO RECENTE:
{history}

Responda APENAS em JSON válido:
{
  "understanding": {
    "literal_meaning": "o que a mensagem diz literalmente",
    "real_intent": "o que o lead REALMENTE quer comunicar",
    "emotional_state": "neutro/positivo/negativo/frustrado/confuso"
  },
  "situation_type": "normal_conversation|bot_detected|rejection|redirect_to_human|out_of_scope|confusion|already_customer|wrong_number|competitor|not_decision_maker",
  "confidence": 0-100,
  "signals": ["lista de sinais detectados"],
  "recommended_action": "continue_spin|stop_conversation|acknowledge_and_exit|clarify_identity|adapt_approach|ask_for_referral|wait_for_human",
  "suggested_response": "se não for continue_spin, qual seria a resposta ideal",
  "reasoning": "explicação breve do raciocínio"
}`;

const CONVERSATION_AUDIT_PROMPT = `Você é um auditor de conversas de SDR.
Analise esta conversa e identifique ERROS do agente:

CONVERSA:
{conversation}

Para cada turno onde o agente errou, identifique:
1. O que o agente fez errado
2. O que deveria ter feito
3. Por que errou (padrão sistemático?)

Responda em JSON:
{
  "overall_quality": "good|medium|poor",
  "errors": [
    {
      "turn": número,
      "agent_message": "o que o agente disse",
      "lead_message": "o que o lead disse antes",
      "error_type": "bot_not_detected|rejection_ignored|context_misunderstood|tone_wrong|spin_forced|other",
      "what_went_wrong": "descrição do erro",
      "what_should_have_done": "ação correta",
      "severity": "critical|medium|low"
    }
  ],
  "patterns_detected": ["padrões de erro recorrentes"],
  "recommendations": ["recomendações de melhoria"]
}`;

// ═══════════════════════════════════════════════════════════════
// CLASSE PRINCIPAL
// ═══════════════════════════════════════════════════════════════

class ConversationSupervisor {
  constructor() {
    //  FIX: Usar cliente OpenAI compartilhado (singleton com cache)
    // Evita múltiplas instâncias e aproveita cache de respostas
    this.openai = openaiClient.getClient();
    this.initDB();
  }

  /**
   * Inicializa tabelas do banco de dados
   */
  initDB() {
    //  FIX: Obter conexão fresh
    const db = getDatabase();
    db.exec(`
      CREATE TABLE IF NOT EXISTS conversation_analysis (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        contact_id TEXT NOT NULL,
        message_text TEXT,
        situation_type TEXT,
        confidence INTEGER,
        recommended_action TEXT,
        signals TEXT,
        analysis_json TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS conversation_errors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        contact_id TEXT NOT NULL,
        turn_number INTEGER,
        error_type TEXT,
        severity TEXT,
        agent_message TEXT,
        lead_message TEXT,
        what_went_wrong TEXT,
        what_should_have_done TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS supervisor_insights (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        insight_type TEXT,
        pattern TEXT,
        frequency INTEGER DEFAULT 1,
        last_seen TEXT DEFAULT CURRENT_TIMESTAMP,
        recommendations TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(insight_type, pattern)
      )
    `);

    log.info('[SUPERVISOR] Tabelas inicializadas');
  }

  /**
   * MÉTODO PRINCIPAL: Analisa contexto de uma mensagem em tempo real
   *
   * @param {string} contactId - ID do contato
   * @param {string} message - Mensagem do lead
   * @param {Object} context - Contexto da conversa (spin stage, etc)
   * @returns {Object} Análise completa com recomendação de ação
   */
  async analyzeContext(contactId, message, context = {}) {
    try {
      log.info('[SUPERVISOR] Analisando contexto', { contactId, message: message.substring(0, 50) });

      // Buscar histórico recente
      const history = await this.getRecentHistory(contactId, 5);

      // Preparar prompt
      const prompt = CONTEXT_ANALYSIS_PROMPT
        .replace('{message}', message)
        .replace('{context}', JSON.stringify(context, null, 2))
        .replace('{history}', history.map(h => `${h.role}: ${h.text}`).join('\n') || 'Primeira mensagem');

      // Chamar LLM
      const response = await this.openai.chat.completions.create({
        model: CONFIG.ANALYSIS_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 500
      });

      const content = response.choices[0]?.message?.content || '{}';

      // Parse JSON (com fallback robusto)
      let analysis;
      try {
        // Limpar possíveis marcadores de código
        const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
        analysis = JSON.parse(cleanContent);
      } catch (parseError) {
        log.warn('[SUPERVISOR] Erro ao parsear análise, usando fallback', { error: parseError.message });
        analysis = {
          situation_type: CONFIG.SITUATION_TYPES.NORMAL_CONVERSATION,
          confidence: 50,
          recommended_action: CONFIG.RECOMMENDED_ACTIONS.CONTINUE_SPIN,
          signals: [],
          reasoning: 'Análise falhou, continuando normalmente'
        };
      }

      // Salvar análise no banco
      this.saveAnalysis(contactId, message, analysis);

      log.success('[SUPERVISOR] Análise concluída', {
        situation: analysis.situation_type,
        action: analysis.recommended_action,
        confidence: analysis.confidence
      });

      return {
        success: true,
        ...analysis,
        shouldContinueSpin: analysis.recommended_action === CONFIG.RECOMMENDED_ACTIONS.CONTINUE_SPIN,
        needsSpecialHandling: analysis.situation_type !== CONFIG.SITUATION_TYPES.NORMAL_CONVERSATION
      };

    } catch (error) {
      log.error('[SUPERVISOR] Erro na análise de contexto', { error: error.message, contactId });
      return {
        success: false,
        error: error.message,
        situation_type: CONFIG.SITUATION_TYPES.NORMAL_CONVERSATION,
        recommended_action: CONFIG.RECOMMENDED_ACTIONS.CONTINUE_SPIN,
        shouldContinueSpin: true,
        needsSpecialHandling: false
      };
    }
  }

  /**
   * Analisa uma conversa completa e identifica erros
   *
   * @param {string} contactId - ID do contato
   * @returns {Object} Auditoria da conversa
   */
  async auditConversation(contactId, tenantId = DEFAULT_TENANT_ID) {
    try {
      log.info('[SUPERVISOR] Auditando conversa', { contactId });

      //  FIX: Obter conexão fresh
      const db = getDatabase();
      const tenantColumn = getTenantColumnForTable('whatsapp_messages', db);
      const tenantClause = tenantColumn ? ` AND ${tenantColumn} = ?` : '';
      // Buscar conversa completa
      const messages = db.prepare(`
        SELECT role, content, created_at
        FROM whatsapp_messages /* tenant-guard: ignore */
        WHERE contact_id = ?${tenantClause}
        ORDER BY created_at ASC
      `).all(...(tenantColumn ? [contactId, tenantId] : [contactId]));

      if (!messages || messages.length === 0) {
        return { success: false, error: 'Nenhuma mensagem encontrada' };
      }

      // Formatar conversa para análise
      const conversationText = messages.map((m, i) =>
        `[${i + 1}] ${m.role === 'assistant' ? 'AGENTE' : 'LEAD'}: ${m.content}`
      ).join('\n\n');

      // Preparar prompt
      const prompt = CONVERSATION_AUDIT_PROMPT.replace('{conversation}', conversationText);

      // Chamar LLM
      const response = await this.openai.chat.completions.create({
        model: CONFIG.ANALYSIS_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 1000
      });

      const content = response.choices[0]?.message?.content || '{}';

      // Parse JSON
      let audit;
      try {
        const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
        audit = JSON.parse(cleanContent);
      } catch (parseError) {
        log.warn('[SUPERVISOR] Erro ao parsear auditoria', { error: parseError.message });
        audit = {
          overall_quality: 'unknown',
          errors: [],
          patterns_detected: [],
          recommendations: ['Não foi possível analisar a conversa']
        };
      }

      // Salvar erros encontrados
      if (audit.errors && audit.errors.length > 0) {
        for (const error of audit.errors) {
          this.saveError(contactId, error);
        }
      }

      log.success('[SUPERVISOR] Auditoria concluída', {
        quality: audit.overall_quality,
        errors: audit.errors?.length || 0
      });

      return {
        success: true,
        contactId,
        messageCount: messages.length,
        ...audit
      };

    } catch (error) {
      log.error('[SUPERVISOR] Erro na auditoria', { error: error.message, contactId });
      return { success: false, error: error.message };
    }
  }

  /**
   * Audita todas as conversas desde uma data
   *
   * @param {string} since - Data ISO (ex: '2024-01-01')
   * @returns {Object} Resumo das auditorias
   */
  async auditConversationsSince(since, tenantId = DEFAULT_TENANT_ID) {
    try {
      log.info('[SUPERVISOR] Auditando conversas desde', { since });

      //  FIX: Obter conexão fresh
      const db = getDatabase();
      const tenantColumn = getTenantColumnForTable('whatsapp_messages', db);
      const tenantClause = tenantColumn ? ` AND ${tenantColumn} = ?` : '';
      // Buscar contatos com mensagens desde a data
      const contacts = db.prepare(`
        SELECT DISTINCT contact_id
        FROM whatsapp_messages /* tenant-guard: ignore */
        WHERE created_at >= ?${tenantClause}
        AND contact_id IS NOT NULL
      `).all(...(tenantColumn ? [since, tenantId] : [since]));

      if (!contacts || contacts.length === 0) {
        return { success: true, message: 'Nenhuma conversa encontrada', audited: 0 };
      }

      log.info('[SUPERVISOR] Encontradas conversas para auditar', { count: contacts.length });

      const results = {
        total: contacts.length,
        audited: 0,
        errors_found: 0,
        by_quality: { good: 0, medium: 0, poor: 0 },
        common_errors: {},
        recommendations: new Set()
      };

      // Auditar cada conversa (com limite para não sobrecarregar)
      const limit = Math.min(contacts.length, 50);

      for (let i = 0; i < limit; i++) {
        const { contact_id } = contacts[i];

        try {
          const audit = await this.auditConversation(contact_id, tenantId);

          if (audit.success) {
            results.audited++;

            if (audit.overall_quality) {
              results.by_quality[audit.overall_quality] = (results.by_quality[audit.overall_quality] || 0) + 1;
            }

            if (audit.errors) {
              results.errors_found += audit.errors.length;

              // Contar tipos de erro
              for (const error of audit.errors) {
                const type = error.error_type || 'unknown';
                results.common_errors[type] = (results.common_errors[type] || 0) + 1;
              }
            }

            if (audit.recommendations) {
              audit.recommendations.forEach(r => results.recommendations.add(r));
            }
          }

          // Pausa para não sobrecarregar API
          await new Promise(r => setTimeout(r, 1000));

        } catch (auditError) {
          log.warn('[SUPERVISOR] Erro ao auditar conversa', { contact_id, error: auditError.message });
        }
      }

      // Converter Set para Array
      results.recommendations = Array.from(results.recommendations);

      // Salvar insights
      this.saveInsights(results);

      log.success('[SUPERVISOR] Auditoria em massa concluída', {
        audited: results.audited,
        errors: results.errors_found
      });

      return {
        success: true,
        ...results
      };

    } catch (error) {
      log.error('[SUPERVISOR] Erro na auditoria em massa', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Gera resposta especial para situações fora do SPIN
   *
   * @param {string} situationType - Tipo de situação detectada
   * @param {Object} context - Contexto adicional
   * @returns {string} Resposta sugerida
   */
  generateSpecialResponse(situationType, context = {}) {
    const responses = {
      [CONFIG.SITUATION_TYPES.BOT_DETECTED]: null, // Não responder a bots

      [CONFIG.SITUATION_TYPES.REJECTION]:
        'Entendo perfeitamente! Se mudar de ideia ou surgir alguma necessidade no futuro, pode me chamar. Sucesso aí! ',

      [CONFIG.SITUATION_TYPES.REDIRECT_TO_HUMAN]:
        'Perfeito, aguardo o contato da pessoa responsável. Enquanto isso, posso já adiantar qual seria a principal dor de vocês em relação a captação de clientes?',

      [CONFIG.SITUATION_TYPES.OUT_OF_SCOPE]:
        'Boa pergunta! Mas não é bem minha área. Posso te ajudar mais com estratégias de captação de clientes para sua empresa. Faz sentido continuar por aqui?',

      [CONFIG.SITUATION_TYPES.CONFUSION]:
        'Acho que não ficou claro - deixa eu explicar melhor: sou o Taylor, da Digital Boost. A gente ajuda empresas a captar mais clientes através do digital. Faz sentido pra você?',

      [CONFIG.SITUATION_TYPES.ALREADY_CUSTOMER]:
        'Ah, vocês já são clientes! Desculpa o contato duplicado. Se precisar de algo, é só chamar o suporte. Valeu! ',

      [CONFIG.SITUATION_TYPES.WRONG_NUMBER]:
        'Ops, parece que peguei o número errado. Desculpa pelo incômodo! Boa sorte aí! ',

      [CONFIG.SITUATION_TYPES.COMPETITOR]:
        'Entendi que já trabalham com outra empresa. Caso em algum momento queiram uma segunda opinião ou comparar resultados, fico à disposição. Sucesso!',

      [CONFIG.SITUATION_TYPES.NOT_DECISION_MAKER]:
        'Entendi! Quem seria a pessoa ideal pra eu conversar sobre isso? Posso entrar em contato diretamente com ela se você preferir.'
    };

    return responses[situationType] || null;
  }

  /**
   * Busca histórico recente de um contato
   */
  async getRecentHistory(contactId, limit = 5, tenantId = DEFAULT_TENANT_ID) {
    try {
      //  FIX: Obter conexão fresh
      const db = getDatabase();
      const tenantColumn = getTenantColumnForTable('whatsapp_messages', db);
      const tenantClause = tenantColumn ? ` AND ${tenantColumn} = ?` : '';
      const messages = db.prepare(`
        SELECT role, content as text
        FROM whatsapp_messages /* tenant-guard: ignore */
        WHERE contact_id = ?${tenantClause}
        ORDER BY created_at DESC
        LIMIT ?
      `).all(...(tenantColumn ? [contactId, tenantId, limit] : [contactId, limit]));

      return messages.reverse(); // Ordem cronológica
    } catch (error) {
      return [];
    }
  }

  /**
   * Salva análise no banco
   */
  saveAnalysis(contactId, message, analysis) {
    try {
      //  FIX: Obter conexão fresh
      const db = getDatabase();
      db.prepare(`
        INSERT INTO conversation_analysis
        (contact_id, message_text, situation_type, confidence, recommended_action, signals, analysis_json)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        contactId,
        message,
        analysis.situation_type,
        analysis.confidence,
        analysis.recommended_action,
        JSON.stringify(analysis.signals || []),
        JSON.stringify(analysis)
      );
    } catch (error) {
      log.warn('[SUPERVISOR] Erro ao salvar análise', { error: error.message });
    }
  }

  /**
   * Salva erro encontrado na auditoria
   */
  saveError(contactId, error) {
    try {
      //  FIX: Obter conexão fresh
      const db = getDatabase();
      db.prepare(`
        INSERT INTO conversation_errors
        (contact_id, turn_number, error_type, severity, agent_message, lead_message, what_went_wrong, what_should_have_done)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        contactId,
        error.turn,
        error.error_type,
        error.severity,
        error.agent_message,
        error.lead_message,
        error.what_went_wrong,
        error.what_should_have_done
      );
    } catch (err) {
      log.warn('[SUPERVISOR] Erro ao salvar erro', { error: err.message });
    }
  }

  /**
   * Salva insights da auditoria em massa
   */
  saveInsights(results) {
    try {
      //  FIX: Obter conexão fresh
      const db = getDatabase();
      // Salvar padrões de erro mais comuns
      for (const [errorType, count] of Object.entries(results.common_errors)) {
        db.prepare(`
          INSERT INTO supervisor_insights (insight_type, pattern, frequency, recommendations)
          VALUES ('error_pattern', ?, ?, ?)
          ON CONFLICT(insight_type, pattern) DO UPDATE SET
            frequency = frequency + excluded.frequency,
            last_seen = CURRENT_TIMESTAMP
        `).run(errorType, count, JSON.stringify(results.recommendations));
      }
    } catch (error) {
      log.warn('[SUPERVISOR] Erro ao salvar insights', { error: error.message });
    }
  }

  /**
   * Obtém estatísticas do supervisor
   */
  getStats() {
    try {
      //  FIX: Obter conexão fresh
      const db = getDatabase();
      const analyses = db.prepare(`SELECT COUNT(*) as count FROM conversation_analysis`).get();
      const errors = db.prepare(`SELECT COUNT(*) as count FROM conversation_errors`).get();

      const errorsByType = db.prepare(`
        SELECT error_type, COUNT(*) as count
        FROM conversation_errors
        GROUP BY error_type
        ORDER BY count DESC
      `).all();

      const recentErrors = db.prepare(`
        SELECT error_type, severity, what_went_wrong, created_at
        FROM conversation_errors
        ORDER BY created_at DESC
        LIMIT 10
      `).all();

      return {
        total_analyses: analyses.count,
        total_errors: errors.count,
        errors_by_type: errorsByType,
        recent_errors: recentErrors
      };
    } catch (error) {
      return { error: error.message };
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// EXPORT SINGLETON
// ═══════════════════════════════════════════════════════════════

const conversationSupervisor = new ConversationSupervisor();

export default conversationSupervisor;
export { CONFIG as SUPERVISOR_CONFIG };

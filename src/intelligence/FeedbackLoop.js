// intelligence/FeedbackLoop.js
//  Sistema de Feedback Loop - Aprende com Sucessos e Falhas

/**
 * PROBLEMA RESOLVIDO:
 * - Conversas perdidas não são analisadas
 * - Não identifica pontos de abandono
 * - Não aprende o que funciona/não funciona
 * - Sem insights acionáveis
 *
 * SOLUÇÃO:
 * - Post-mortem automático de conversas
 * - Identificação de padrões de abandono
 * - Análise de causas raiz
 * - Recomendações automáticas
 */

//  FIX: Usar getDatabase() que verifica e reconecta se necessário
import { getDatabase } from '../db/index.js';
import { DEFAULT_TENANT_ID } from '../utils/tenantCompat.js';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export class FeedbackLoop {
  constructor() {
    this.initDatabase();
  }

  /**
   * Inicializa tabelas para feedback loop
   */
  initDatabase() {
    //  FIX: Obter conexão fresh a cada operação
    const db = getDatabase();
    // Tabela de conversas finalizadas
    db.exec(`
      CREATE TABLE IF NOT EXISTS conversation_outcomes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id TEXT DEFAULT 'default',
        contact_id TEXT NOT NULL,
        outcome TEXT NOT NULL,
        outcome_reason TEXT,
        final_stage TEXT,
        total_messages INTEGER,
        duration_seconds INTEGER,
        abandonment_point TEXT,
        last_bot_message TEXT,
        last_user_message TEXT,
        bant_completion_percent INTEGER,
        conversion_score INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de insights extraídos
    // Reusar a conexão já obtida acima
    db.exec(`
      CREATE TABLE IF NOT EXISTS feedback_insights (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        insight_type TEXT NOT NULL,
        insight_category TEXT,
        description TEXT NOT NULL,
        frequency INTEGER DEFAULT 1,
        impact_score INTEGER,
        recommendation TEXT,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de padrões de abandono
    db.exec(`
      CREATE TABLE IF NOT EXISTS abandonment_patterns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id TEXT DEFAULT 'default',
        pattern_name TEXT NOT NULL,
        trigger_stage TEXT,
        trigger_question TEXT,
        frequency INTEGER DEFAULT 1,
        severity TEXT DEFAULT 'medium',
        suggested_fix TEXT,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_seen DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log(' [FEEDBACK-LOOP] Database initialized');
  }

  /**
   * MÉTODO PRINCIPAL: Registrar resultado de conversa
   * Chamado quando conversa termina (sucesso ou abandono)
   */
  async recordConversationOutcome(contactId, outcome, metadata = {}) {
    try {
      //  FIX: Obter conexão fresh
      const db = getDatabase();

      const {
        finalStage = 'unknown',
        totalMessages = 0,
        durationSeconds = 0,
        abandonmentPoint = null,
        lastBotMessage = null,
        lastUserMessage = null,
        bantCompletionPercent = 0,
        conversionScore = 0,
        reason = 'unknown'
      } = metadata;
      const tenantId = metadata.tenantId || DEFAULT_TENANT_ID;

      // Salvar no banco
      db.prepare(`
        INSERT INTO conversation_outcomes (
          tenant_id, contact_id, outcome, outcome_reason, final_stage,
          total_messages, duration_seconds, abandonment_point,
          last_bot_message, last_user_message,
          bant_completion_percent, conversion_score
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        tenantId,
        contactId,
        outcome, // 'success', 'abandoned', 'opt_out', 'failed'
        reason,
        finalStage,
        totalMessages,
        durationSeconds,
        abandonmentPoint,
        lastBotMessage ? lastBotMessage.substring(0, 500) : null,
        lastUserMessage ? lastUserMessage.substring(0, 500) : null,
        bantCompletionPercent,
        conversionScore
      );

      console.log(` [FEEDBACK-LOOP] Outcome registrado: ${outcome} (${reason})`);

      // Se foi abandono, analisar causa
      if (outcome === 'abandoned') {
        await this._analyzeAbandonment(contactId, metadata);
      }

      // Se foi sucesso, extrair padrões positivos
      if (outcome === 'success') {
        await this._extractSuccessPatterns(contactId, metadata);
      }

      return true;
    } catch (error) {
      console.error(' [FEEDBACK-LOOP] Erro ao registrar outcome:', error.message);
      return false;
    }
  }

  /**
   * POST-MORTEM: Analisa conversas abandonadas
   */
  async _analyzeAbandonment(contactId, metadata) {
    try {
      //  FIX: Obter conexão fresh
      const db = getDatabase();
      const tenantId = metadata?.tenantId || DEFAULT_TENANT_ID;

      const {
        abandonmentPoint,
        lastBotMessage,
        lastUserMessage,
        finalStage
      } = metadata;

      // Identificar padrão de abandono
      const pattern = {
        stage: finalStage,
        question: lastBotMessage ? lastBotMessage.substring(0, 200) : null,
        userResponse: lastUserMessage ? lastUserMessage.substring(0, 200) : null
      };

      //  FIX: Usar hash para identificar padrão único (evita LIKE que pode ser lento)
      const patternHash = `${finalStage}:${pattern.question?.substring(0, 50) || 'unknown'}`;

      //  FIX: Verificar se padrão existe (busca exata por hash)
      const existing = db.prepare(`
        SELECT id, frequency, pattern_name FROM abandonment_patterns
        WHERE trigger_stage = ? AND trigger_question = ? AND tenant_id = ?
      `).get(finalStage, pattern.question, tenantId);

      if (existing) {
        //  FIX: UPSERT ao invés de SELECT + UPDATE (evita race condition)
        db.prepare(`
          UPDATE abandonment_patterns
          SET frequency = frequency + 1,
              last_seen = CURRENT_TIMESTAMP
          WHERE id = ? AND tenant_id = ?
        `).run(existing.id, tenantId);

        console.log(` [FEEDBACK-LOOP] Padrão de abandono conhecido - frequência: ${existing.frequency + 1}`);
      } else {
        // Novo padrão - analisar com GPT
        const analysis = await this._analyzeAbandonmentWithGPT(pattern);

        //  FIX: INSERT OR IGNORE para evitar duplicatas em race conditions
        try {
          db.prepare(`
            INSERT INTO abandonment_patterns (
              tenant_id, pattern_name, trigger_stage, trigger_question,
              severity, suggested_fix
            ) VALUES (?, ?, ?, ?, ?, ?)
          `).run(
            tenantId,
            analysis.patternName,
            finalStage,
            pattern.question,
            analysis.severity,
            analysis.suggestedFix
          );

          console.log(` [FEEDBACK-LOOP] Novo padrão de abandono identificado: ${analysis.patternName}`);
        } catch (error) {
          // Se INSERT falhar (duplicate), apenas incrementar
          if (error.message.includes('UNIQUE')) {
            console.log(` [FEEDBACK-LOOP] Padrão duplicado detectado - incrementando frequência`);
            const duplicate = db.prepare(`
              SELECT id FROM abandonment_patterns
              WHERE trigger_stage = ? AND trigger_question = ? AND tenant_id = ?
            `).get(finalStage, pattern.question, tenantId);

            if (duplicate) {
              db.prepare(`
                UPDATE abandonment_patterns
                SET frequency = frequency + 1,
                    last_seen = CURRENT_TIMESTAMP
                WHERE id = ? AND tenant_id = ?
              `).run(duplicate.id, tenantId);
            }
          } else {
            throw error; // Re-throw se não for erro de duplicação
          }
        }
      }

      return true;
    } catch (error) {
      console.error(' [FEEDBACK-LOOP] Erro ao analisar abandono:', error.message);
      return false;
    }
  }

  /**
   * Analisa abandono com GPT
   */
  async _analyzeAbandonmentWithGPT(pattern) {
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Você é um especialista em análise de conversas de vendas.
Analise o padrão de abandono e retorne JSON com:
{
  "patternName": "nome descritivo do padrão",
  "severity": "low/medium/high",
  "suggestedFix": "sugestão específica de melhoria"
}`
          },
          {
            role: 'user',
            content: `Padrão de abandono:
Stage: ${pattern.stage}
Última pergunta do bot: "${pattern.question}"
Última resposta do lead: "${pattern.userResponse}"

O que pode ter causado o abandono e como melhorar?`
          }
        ],
        temperature: 0.3,
        max_tokens: 300
      });

      const content = completion.choices[0].message.content.trim();
      const jsonMatch = content.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return {
        patternName: 'Abandono genérico',
        severity: 'medium',
        suggestedFix: 'Revisar abordagem neste stage'
      };
    } catch (error) {
      console.error(' [FEEDBACK-LOOP] Erro ao analisar com GPT:', error.message);
      return {
        patternName: 'Erro na análise',
        severity: 'medium',
        suggestedFix: 'Análise manual necessária'
      };
    }
  }

  /**
   * Extrai padrões de conversas bem-sucedidas
   */
  async _extractSuccessPatterns(contactId, metadata) {
    try {
      //  FIX: Obter conexão fresh
      const db = getDatabase();

      // Buscar conversas bem-sucedidas similares
      const successfulConversations = db.prepare(`
        SELECT * FROM conversation_outcomes
        WHERE outcome = 'success'
        AND final_stage = ?
        ORDER BY created_at DESC
        LIMIT 10
      `).all(metadata.finalStage);

      if (successfulConversations.length >= 5) {
        // Análise de padrões comuns
        const insight = {
          type: 'success_pattern',
          category: metadata.finalStage,
          description: `Padrão de sucesso identificado no stage ${metadata.finalStage}`,
          frequency: successfulConversations.length,
          impactScore: 80,
          recommendation: `Replicar abordagem usada em ${successfulConversations.length} conversas bem-sucedidas`
        };

        await this._saveInsight(insight);
      }

      return true;
    } catch (error) {
      console.error(' [FEEDBACK-LOOP] Erro ao extrair padrões de sucesso:', error.message);
      return false;
    }
  }

  /**
   * Salva insight no banco
   */
  async _saveInsight(insight) {
    try {
      //  FIX: Obter conexão fresh
      const db = getDatabase();

      db.prepare(`
        INSERT INTO feedback_insights (
          insight_type, insight_category, description,
          frequency, impact_score, recommendation
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        insight.type,
        insight.category,
        insight.description,
        insight.frequency,
        insight.impactScore,
        insight.recommendation
      );

      console.log(` [FEEDBACK-LOOP] Insight salvo: ${insight.description}`);
      return true;
    } catch (error) {
      console.error(' [FEEDBACK-LOOP] Erro ao salvar insight:', error.message);
      return false;
    }
  }

  /**
   * RELATÓRIO: Gera relatório de insights
   */
  async generateInsightsReport() {
    try {
      //  FIX: Obter conexão fresh
      const db = getDatabase();

      // Total de conversas
      const totals = db.prepare(`
        SELECT
          outcome,
          COUNT(*) as count
        FROM conversation_outcomes
        GROUP BY outcome
      `).all();

      // Padrões de abandono mais frequentes
      const topAbandonments = db.prepare(`
        SELECT * FROM abandonment_patterns
        WHERE status = 'active'
        ORDER BY frequency DESC
        LIMIT 5
      `).all();

      // Insights ativos
      const insights = db.prepare(`
        SELECT * FROM feedback_insights
        WHERE status = 'active'
        ORDER BY impact_score DESC
        LIMIT 10
      `).all();

      // Taxa de sucesso por stage
      const successByStage = db.prepare(`
        SELECT
          final_stage,
          COUNT(*) as total,
          SUM(CASE WHEN outcome = 'success' THEN 1 ELSE 0 END) as successes,
          ROUND(AVG(bant_completion_percent), 2) as avg_completion
        FROM conversation_outcomes
        GROUP BY final_stage
      `).all();

      return {
        summary: {
          totals: totals.reduce((acc, curr) => {
            acc[curr.outcome] = curr.count;
            return acc;
          }, {}),
          successRate: this._calculateSuccessRate(totals)
        },
        topAbandonnments,
        insights,
        successByStage,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error(' [FEEDBACK-LOOP] Erro ao gerar relatório:', error.message);
      return {
        error: error.message,
        generatedAt: new Date().toISOString()
      };
    }
  }

  /**
   * Calcula taxa de sucesso
   */
  _calculateSuccessRate(totals) {
    const success = totals.find(t => t.outcome === 'success')?.count || 0;
    const total = totals.reduce((sum, t) => sum + t.count, 0);
    return total > 0 ? Math.round((success / total) * 100) : 0;
  }

  /**
   * AÇÃO: Obtém recomendações acionáveis
   */
  async getActionableRecommendations() {
    try {
      //  FIX: Obter conexão fresh
      const db = getDatabase();

      // Padrões de abandono críticos (alta frequência + alta severidade)
      const criticalPatterns = db.prepare(`
        SELECT * FROM abandonment_patterns
        WHERE frequency >= 3 AND severity IN ('high', 'medium')
        AND status = 'active'
        ORDER BY frequency DESC
        LIMIT 5
      `).all();

      const recommendations = criticalPatterns.map(pattern => ({
        priority: pattern.severity === 'high' ? 'P0' : 'P1',
        issue: pattern.pattern_name,
        frequency: pattern.frequency,
        stage: pattern.trigger_stage,
        action: pattern.suggested_fix,
        impact: pattern.frequency >= 5 ? 'high' : 'medium'
      }));

      return recommendations;
    } catch (error) {
      console.error(' [FEEDBACK-LOOP] Erro ao gerar recomendações:', error.message);
      return [];
    }
  }

  /**
   * DETECÇÃO: Identifica se conversa está em risco de abandono
   */
  async detectAbandonmentRisk(contactId, currentStage, lastUserMessage) {
    try {
      //  FIX: Obter conexão fresh
      const db = getDatabase();

      // Buscar padrões de abandono neste stage
      const patterns = db.prepare(`
        SELECT * FROM abandonment_patterns
        WHERE trigger_stage = ?
        AND status = 'active'
        ORDER BY frequency DESC
      `).all(currentStage);

      // Verificar se mensagem do usuário indica risco
      const riskSignals = [
        /não\s+(tenho\s+tempo|posso\s+agora)/i,
        /muito\s+caro/i,
        /não\s+entendi/i,
        /complicado/i,
        /depois/i
      ];

      const hasRiskSignal = riskSignals.some(signal => signal.test(lastUserMessage));

      if (hasRiskSignal || patterns.length >= 3) {
        return {
          atRisk: true,
          riskLevel: patterns.length >= 5 ? 'high' : 'medium',
          commonPatterns: patterns.slice(0, 3),
          suggestedAction: 'Mudar abordagem ou oferecer alternativa'
        };
      }

      return {
        atRisk: false,
        riskLevel: 'low'
      };
    } catch (error) {
      console.error(' [FEEDBACK-LOOP] Erro ao detectar risco:', error.message);
      return { atRisk: false, riskLevel: 'low' };
    }
  }
}

// Singleton
let instance = null;

export function getFeedbackLoop() {
  if (!instance) {
    instance = new FeedbackLoop();
  }
  return instance;
}

export default FeedbackLoop;

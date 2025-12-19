// intelligence/ContextWindowManager.js
//  Context Window Manager - Gerenciamento Inteligente de Histórico

/**
 * PROBLEMA RESOLVIDO:
 * - Conversas longas excedem limite de tokens
 * - Context window fica poluído com info irrelevante
 * - Custo alto com tokens desnecessários
 * - Perde informações importantes em conversas longas
 *
 * SOLUÇÃO:
 * - Sumarização inteligente de histórico antigo
 * - Priorização de informações críticas (BANT, decisões)
 * - Compressão de mensagens repetitivas
 * - Sliding window com memória seletiva
 */

import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

//  Constantes de configuração
const MAX_HISTORY_MESSAGES = 20; // Máximo de mensagens no histórico completo
const SUMMARIZATION_THRESHOLD = 15; // Quando começar a sumarizar
const CRITICAL_INFO_WINDOW = 5; // Últimas N mensagens sempre mantidas
const MAX_SUMMARY_TOKENS = 150; // Tamanho máximo do resumo

export class ContextWindowManager {
  constructor() {
    this.summaryCache = new Map(); // Cache de resumos por contactId
  }

  /**
   * MÉTODO PRINCIPAL: Otimizar histórico de conversa
   * Retorna histórico otimizado para enviar ao GPT
   */
  async optimizeHistory(contactId, conversationHistory, metadata = {}) {
    try {
      console.log(` [CONTEXT-WINDOW] Otimizando histórico de ${contactId} (${conversationHistory.length} mensagens)`);

      // Se histórico pequeno, retornar como está
      if (conversationHistory.length <= SUMMARIZATION_THRESHOLD) {
        console.log(` [CONTEXT-WINDOW] Histórico pequeno - sem otimização necessária`);
        return {
          optimized: conversationHistory,
          summary: null,
          originalSize: conversationHistory.length,
          optimizedSize: conversationHistory.length,
          tokensSaved: 0
        };
      }

      // Dividir histórico em: crítico (recente) + antigo (para sumarizar)
      const recentMessages = conversationHistory.slice(-CRITICAL_INFO_WINDOW);
      const oldMessages = conversationHistory.slice(0, -CRITICAL_INFO_WINDOW);

      console.log(` [CONTEXT-WINDOW] Dividindo: ${oldMessages.length} antigas + ${recentMessages.length} recentes`);

      // Extrair informações críticas do histórico antigo
      const criticalInfo = this._extractCriticalInfo(oldMessages, metadata);

      // Gerar resumo do histórico antigo
      const summary = await this._generateSummary(contactId, oldMessages, criticalInfo);

      // Construir histórico otimizado: [resumo] + [mensagens recentes]
      const optimizedHistory = [
        {
          role: 'system',
          content: ` RESUMO DA CONVERSA ANTERIOR:\n${summary}\n\n---\nCONVERSA ATUAL (últimas ${CRITICAL_INFO_WINDOW} mensagens):`
        },
        ...recentMessages
      ];

      // Calcular tokens economizados (estimativa)
      const originalTokens = this._estimateTokens(conversationHistory);
      const optimizedTokens = this._estimateTokens(optimizedHistory);
      const tokensSaved = originalTokens - optimizedTokens;

      console.log(` [CONTEXT-WINDOW] Otimizado: ${conversationHistory.length}  ${optimizedHistory.length} msgs (-${Math.round((tokensSaved / originalTokens) * 100)}%)`);

      return {
        optimized: optimizedHistory,
        summary,
        criticalInfo,
        originalSize: conversationHistory.length,
        optimizedSize: optimizedHistory.length,
        tokensSaved,
        savingsPercent: Math.round((tokensSaved / originalTokens) * 100)
      };

    } catch (error) {
      console.error(' [CONTEXT-WINDOW] Erro ao otimizar histórico:', error.message);

      // Fallback: retornar histórico original truncado
      return {
        optimized: conversationHistory.slice(-MAX_HISTORY_MESSAGES),
        summary: null,
        error: error.message,
        originalSize: conversationHistory.length,
        optimizedSize: Math.min(conversationHistory.length, MAX_HISTORY_MESSAGES),
        tokensSaved: 0
      };
    }
  }

  /**
   * EXTRAIR INFORMAÇÕES CRÍTICAS
   * Identifica dados importantes que devem ser preservados
   */
  _extractCriticalInfo(messages, metadata = {}) {
    const critical = {
      bant: {
        need: null,
        budget: null,
        authority: null,
        timing: null
      },
      decisions: [],
      objections: [],
      keyFacts: []
    };

    // Extrair informações de BANT do metadata (se disponível)
    if (metadata.bantStages) {
      critical.bant = {
        need: metadata.bantStages.need?.collected || null,
        budget: metadata.bantStages.budget?.collected || null,
        authority: metadata.bantStages.authority?.collected || null,
        timing: metadata.bantStages.timing?.collected || null
      };
    }

    // Analisar mensagens para extrair decisões e objeções
    for (const msg of messages) {
      const text = msg.content || msg.text || '';

      // Detectar decisões positivas
      if (/\b(sim|quero|vamos|aceito|concordo|pode ser)\b/i.test(text)) {
        critical.decisions.push({
          type: 'positive',
          text: text.substring(0, 100)
        });
      }

      // Detectar objeções
      if (/\b(não|nunca|caro|sem grana|não tenho dinheiro|complicado|difícil)\b/i.test(text)) {
        critical.objections.push({
          type: 'price_or_complexity',
          text: text.substring(0, 100)
        });
      }

      // Detectar nomes de pessoas/empresas mencionados
      const nameMatch = text.match(/(?:me chamo|meu nome é|sou o|sou a|empresa|trabalho na)\s+([A-ZÀ-Ú][a-zà-ú\s]+)/i);
      if (nameMatch) {
        critical.keyFacts.push({
          type: 'name_or_company',
          value: nameMatch[1].trim()
        });
      }
    }

    return critical;
  }

  /**
   * GERAR RESUMO COM GPT
   * Cria resumo conciso do histórico antigo
   */
  async _generateSummary(contactId, oldMessages, criticalInfo) {
    try {
      // Verificar cache
      const cacheKey = `${contactId}_${oldMessages.length}`;
      if (this.summaryCache.has(cacheKey)) {
        console.log(` [CONTEXT-WINDOW] Resumo encontrado em cache`);
        return this.summaryCache.get(cacheKey);
      }

      // Construir contexto para sumarização
      const messagesToSummarize = oldMessages
        .map(msg => {
          const role = msg.role === 'user' ? 'Lead' : 'Agente';
          const text = msg.content || msg.text || '';
          return `${role}: ${text}`;
        })
        .join('\n');

      // Prompt de sumarização
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Você é um assistente que resume conversas de vendas.
Crie um resumo CONCISO (máximo 150 tokens) desta conversa, focando em:
1. Necessidades/dores do lead
2. Orçamento mencionado
3. Autoridade de decisão
4. Timing/urgência
5. Objeções levantadas
6. Decisões tomadas

Formato: Bullet points curtos e objetivos.`
          },
          {
            role: 'user',
            content: `Resumir esta conversa:\n\n${messagesToSummarize}\n\nInformações críticas extraídas:\n${JSON.stringify(criticalInfo, null, 2)}`
          }
        ],
        temperature: 0.3,
        max_tokens: MAX_SUMMARY_TOKENS
      });

      const summary = completion.choices[0].message.content.trim();

      // Salvar em cache
      this.summaryCache.set(cacheKey, summary);

      // Limpar cache antigo (manter apenas últimos 50)
      if (this.summaryCache.size > 50) {
        const firstKey = this.summaryCache.keys().next().value;
        this.summaryCache.delete(firstKey);
      }

      console.log(` [CONTEXT-WINDOW] Resumo gerado (${summary.length} chars)`);
      return summary;

    } catch (error) {
      console.error(' [CONTEXT-WINDOW] Erro ao gerar resumo:', error.message);

      // Fallback: resumo básico
      return `Conversa anterior com ${oldMessages.length} mensagens. BANT coletado: ${JSON.stringify(criticalInfo.bant)}`;
    }
  }

  /**
   * ESTIMAR TOKENS
   * Estimativa rápida (1 token ≈ 4 caracteres)
   */
  _estimateTokens(messages) {
    const totalChars = messages.reduce((sum, msg) => {
      const text = msg.content || msg.text || '';
      return sum + text.length;
    }, 0);

    return Math.ceil(totalChars / 4);
  }

  /**
   * VERIFICAR SE PRECISA OTIMIZAÇÃO
   * Retorna true se histórico deve ser otimizado
   */
  needsOptimization(conversationHistory) {
    return conversationHistory.length > SUMMARIZATION_THRESHOLD;
  }

  /**
   * LIMPAR CACHE
   * Remove resumos antigos do cache
   */
  clearCache(contactId = null) {
    if (contactId) {
      // Limpar cache de um contato específico
      for (const key of this.summaryCache.keys()) {
        if (key.startsWith(contactId)) {
          this.summaryCache.delete(key);
        }
      }
    } else {
      // Limpar todo o cache
      this.summaryCache.clear();
    }
  }

  /**
   * ESTATÍSTICAS DO CACHE
   * Retorna info sobre cache de resumos
   */
  getCacheStats() {
    return {
      size: this.summaryCache.size,
      maxSize: 50,
      contacts: [...new Set([...this.summaryCache.keys()].map(k => k.split('_')[0]))]
    };
  }
}

// Singleton
let instance = null;

export function getContextWindowManager() {
  if (!instance) {
    instance = new ContextWindowManager();
  }
  return instance;
}

export default ContextWindowManager;

// intelligence/SentimentAnalyzer.js
//  Sistema de Análise de Sentimento Real-Time com Momentum

/**
 * PROBLEMA RESOLVIDO:
 * - Não detecta mudanças de sentimento durante conversa
 * - Não identifica deterioração emocional
 * - Não ajusta tom baseado em sentimento
 * - Perde oportunidades de salvar conversa
 *
 * SOLUÇÃO:
 * - Análise de sentimento por mensagem
 * - Rastreamento de momentum (improving/declining)
 * - Trigger automático quando sentimento deteriora
 * - Ajuste dinâmico de estratégia
 */

//  FIX: Usar getDatabase() que verifica e reconecta se necessário
import { getDatabase } from '../db/index.js';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export class SentimentAnalyzer {
  constructor() {
    this.initDatabase();
    // TODO P2: Implementar cache de análises para performance
    // this.sentimentCache = new Map();
  }

  /**
   * Inicializa tabelas para análise de sentimento
   */
  initDatabase() {
    //  FIX: Obter conexão fresh
    const db = getDatabase();
    // Tabela de sentimento por mensagem
    db.exec(`
      CREATE TABLE IF NOT EXISTS message_sentiment (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id TEXT DEFAULT 'default',
        contact_id TEXT NOT NULL,
        message_text TEXT NOT NULL,
        sentiment_score REAL NOT NULL,
        sentiment_label TEXT NOT NULL,
        emotion TEXT,
        intensity REAL,
        confidence REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de momentum de sentimento
    db.exec(`
      CREATE TABLE IF NOT EXISTS sentiment_momentum (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id TEXT DEFAULT 'default',
        contact_id TEXT NOT NULL UNIQUE,
        current_score REAL NOT NULL,
        previous_score REAL,
        momentum TEXT NOT NULL,
        trend TEXT,
        volatility REAL,
        intervention_needed INTEGER DEFAULT 0,
        last_intervention DATETIME,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log(' [SENTIMENT] Database initialized');
  }

  /**
   * MÉTODO PRINCIPAL: Analisa sentimento de mensagem
   * Retorna análise + momentum
   */
  async analyzeSentiment(contactId, message) {
    try {
      console.log(` [SENTIMENT] Analisando mensagem de ${contactId}`);

      // 1. Análise rápida (regex) + GPT para precisão
      const quickAnalysis = this._quickSentimentAnalysis(message);

      // Se confiança baixa, usar GPT
      let analysis = quickAnalysis;
      if (quickAnalysis.confidence < 0.7) {
        analysis = await this._deepSentimentAnalysis(message);
      }

      // 2. Salvar no banco
      //  FIX: Obter conexão fresh
      const db = getDatabase();
      db.prepare(`
        INSERT INTO message_sentiment (
          contact_id, message_text, sentiment_score,
          sentiment_label, emotion, intensity, confidence
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        contactId,
        message.substring(0, 500),
        analysis.score,
        analysis.label,
        analysis.emotion,
        analysis.intensity,
        analysis.confidence
      );

      // 3. Calcular momentum
      const momentum = await this._calculateMomentum(contactId, analysis.score);

      // 4. Verificar se precisa intervenção
      const needsIntervention = this._checkInterventionNeeded(momentum);

      console.log(` [SENTIMENT] Score: ${analysis.score.toFixed(2)} | Momentum: ${momentum.momentum} | Intervenção: ${needsIntervention ? 'SIM' : 'NÃO'}`);

      return {
        ...analysis,
        momentum,
        needsIntervention,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error(' [SENTIMENT] Erro ao analisar sentimento:', error.message);
      return {
        score: 0.5,
        label: 'neutral',
        emotion: 'unknown',
        confidence: 0,
        momentum: { momentum: 'stable' },
        needsIntervention: false
      };
    }
  }

  /**
   * ANÁLISE RÁPIDA (Regex + Keywords)
   * Análise básica sem usar GPT
   */
  _quickSentimentAnalysis(message) {
    const text = message.toLowerCase();

    // Palavras positivas
    const positivePatterns = [
      { pattern: /\b(ótimo|excelente|perfeito|maravilhoso|incrível)\b/g, weight: 0.9, emotion: 'joy' },
      { pattern: /\b(bom|legal|bacana|interessante|show)\b/g, weight: 0.7, emotion: 'satisfaction' },
      { pattern: /\b(obrigad|valeu|agradeç)\b/g, weight: 0.8, emotion: 'gratitude' },
      { pattern: /\b(gostei|adorei|amei|curtir)\b/g, weight: 0.85, emotion: 'happiness' },
      { pattern: /\b(sim|claro|com\s+certeza|pode\s+ser)\b/g, weight: 0.6, emotion: 'agreement' }
    ];

    // Palavras negativas
    const negativePatterns = [
      { pattern: /\b(péssimo|horrível|terrível|ruim)\b/g, weight: -0.9, emotion: 'disgust' },
      { pattern: /\b(chato|irritante|cansativo)\b/g, weight: -0.7, emotion: 'annoyance' },
      { pattern: /\b(não|nao|nem|nunca|jamais)\b/g, weight: -0.4, emotion: 'negation' },
      { pattern: /\b(confuso|complicado|difícil)\b/g, weight: -0.6, emotion: 'confusion' },
      { pattern: /\b(caro|sem\s+grana|não\s+tenho\s+dinheiro)\b/g, weight: -0.5, emotion: 'concern' }
    ];

    let score = 0.5; // Neutro
    let matchedEmotion = 'neutral';
    let intensity = 0;
    let matches = 0;

    // Analisar positivos
    for (const { pattern, weight, emotion } of positivePatterns) {
      const found = text.match(pattern);
      if (found) {
        score += weight * found.length * 0.1;
        matchedEmotion = emotion;
        intensity += found.length * 0.2;
        matches += found.length;
      }
    }

    // Analisar negativos
    for (const { pattern, weight, emotion } of negativePatterns) {
      const found = text.match(pattern);
      if (found) {
        score += weight * found.length * 0.1;
        matchedEmotion = emotion;
        intensity += found.length * 0.2;
        matches += found.length;
      }
    }

    // Normalizar score (0-1)
    score = Math.max(0, Math.min(1, score));
    intensity = Math.min(1, intensity);

    // Determinar label
    let label = 'neutral';
    if (score >= 0.65) label = 'positive';
    else if (score <= 0.35) label = 'negative';

    // Confiança baseada em matches
    const confidence = matches > 0 ? Math.min(0.9, 0.5 + matches * 0.15) : 0.3;

    return {
      score,
      label,
      emotion: matchedEmotion,
      intensity,
      confidence
    };
  }

  /**
   * ANÁLISE PROFUNDA (GPT)
   * Para casos onde análise rápida tem baixa confiança
   */
  async _deepSentimentAnalysis(message) {
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Analise o sentimento da mensagem e retorne JSON:
{
  "score": 0-1 (0=muito negativo, 0.5=neutro, 1=muito positivo),
  "label": "positive/neutral/negative",
  "emotion": "joy/satisfaction/gratitude/confusion/annoyance/concern/neutral",
  "intensity": 0-1 (força da emoção)
}`
          },
          {
            role: 'user',
            content: message
          }
        ],
        temperature: 0.2,
        max_tokens: 150
      });

      const content = completion.choices[0].message.content.trim();
      const jsonMatch = content.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return {
          ...result,
          confidence: 0.95 // GPT tem alta confiança
        };
      }

      return this._quickSentimentAnalysis(message); // Fallback
    } catch (error) {
      console.error(' [SENTIMENT] Erro na análise GPT:', error.message);
      return this._quickSentimentAnalysis(message); // Fallback
    }
  }

  /**
   * MOMENTUM: Calcula tendência de sentimento
   */
  async _calculateMomentum(contactId, currentScore) {
    try {
      //  FIX: Obter conexão fresh
      const db = getDatabase();
      // Buscar histórico recente (últimas 5 mensagens)
      const history = db.prepare(`
        SELECT sentiment_score, created_at
        FROM message_sentiment
        WHERE contact_id = ?
        ORDER BY created_at DESC
        LIMIT 5
      `).all(contactId);

      if (history.length < 2) {
        // Primeira ou segunda mensagem, sem momentum ainda
        return {
          momentum: 'stable',
          trend: 'neutral',
          volatility: 0,
          interventionNeeded: false
        };
      }

      const scores = history.map(h => h.sentiment_score);
      const previousScore = scores[1]; // Penúltima mensagem

      // Calcular momentum
      const change = currentScore - previousScore;
      let momentum = 'stable';

      if (change > 0.15) momentum = 'improving';
      else if (change < -0.15) momentum = 'declining';

      // Calcular trend (média dos últimos 5)
      const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
      let trend = 'neutral';

      if (avgScore > 0.6) trend = 'positive';
      else if (avgScore < 0.4) trend = 'negative';

      // Calcular volatilidade (desvio padrão)
      const variance = scores.reduce((sum, s) => sum + Math.pow(s - avgScore, 2), 0) / scores.length;
      const volatility = Math.sqrt(variance);

      // Verificar se precisa intervenção
      const interventionNeeded = (
        (momentum === 'declining' && trend === 'negative') ||
        (currentScore < 0.3) ||
        (volatility > 0.3 && avgScore < 0.45)
      );

      // Atualizar ou inserir momentum
      db.prepare(`
        INSERT OR REPLACE INTO sentiment_momentum (
          contact_id, current_score, previous_score,
          momentum, trend, volatility, intervention_needed,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(
        contactId,
        currentScore,
        previousScore,
        momentum,
        trend,
        volatility,
        interventionNeeded ? 1 : 0
      );

      return {
        momentum,
        trend,
        volatility: Math.round(volatility * 100) / 100,
        currentScore,
        previousScore,
        avgScore: Math.round(avgScore * 100) / 100,
        interventionNeeded
      };

    } catch (error) {
      console.error(' [SENTIMENT] Erro ao calcular momentum:', error.message);
      return {
        momentum: 'stable',
        trend: 'neutral',
        volatility: 0,
        interventionNeeded: false
      };
    }
  }

  /**
   * INTERVENÇÃO: Verifica se precisa intervir
   */
  _checkInterventionNeeded(momentum) {
    // Já foi marcado no cálculo de momentum
    return momentum.interventionNeeded;
  }

  /**
   * ESTRATÉGIA: Sugere estratégia baseada em sentimento
   */
  suggestStrategy(sentimentAnalysis) {
    const { score, momentum, emotion } = sentimentAnalysis;

    // Score muito baixo - recovery urgente
    if (score < 0.3) {
      return {
        strategy: 'urgent_recovery',
        tone: 'empathetic',
        action: 'Validar emoção e oferecer alternativa',
        priority: 'high',
        message: 'Detectado sentimento muito negativo - ação imediata'
      };
    }

    // Momentum declining - prevenção
    if (momentum.momentum === 'declining') {
      return {
        strategy: 'prevent_deterioration',
        tone: 'clarifying',
        action: 'Simplificar abordagem e pedir feedback',
        priority: 'medium',
        message: 'Sentimento deteriorando - intervir preventivamente'
      };
    }

    // Confusão detectada
    if (emotion === 'confusion') {
      return {
        strategy: 'clarify',
        tone: 'patient',
        action: 'Explicar de forma mais simples com exemplos',
        priority: 'medium',
        message: 'Confusão detectada - clarificar'
      };
    }

    // Momentum improving - reforçar
    if (momentum.momentum === 'improving') {
      return {
        strategy: 'reinforce_positive',
        tone: 'enthusiastic',
        action: 'Capitalizar momento positivo e avançar',
        priority: 'low',
        message: 'Sentimento melhorando - reforçar positivo'
      };
    }

    // Neutro/Estável - continuar normal
    return {
      strategy: 'continue_normal',
      tone: 'professional',
      action: 'Manter abordagem atual',
      priority: 'low',
      message: 'Sentimento estável - continuar'
    };
  }

  /**
   * HISTÓRICO: Obtém histórico de sentimento
   */
  getSentimentHistory(contactId, limit = 10) {
    try {
      //  FIX: Obter conexão fresh
      const db = getDatabase();
      const history = db.prepare(`
        SELECT
          sentiment_score as score,
          sentiment_label as label,
          emotion,
          intensity,
          created_at as timestamp
        FROM message_sentiment
        WHERE contact_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      `).all(contactId, limit);

      return history;
    } catch (error) {
      console.error(' [SENTIMENT] Erro ao buscar histórico:', error.message);
      return [];
    }
  }

  /**
   * DASHBOARD: Gera resumo de sentimento
   */
  getSentimentSummary(contactId) {
    try {
      //  FIX: Obter conexão fresh
      const db = getDatabase();
      const momentum = db.prepare(`
        SELECT * FROM sentiment_momentum
        WHERE contact_id = ?
      `).get(contactId);

      const history = this.getSentimentHistory(contactId, 10);

      return {
        current: momentum || {
          momentum: 'unknown',
          trend: 'unknown',
          currentScore: 0.5
        },
        history,
        needsAttention: momentum?.intervention_needed === 1,
        totalMessages: history.length
      };
    } catch (error) {
      console.error(' [SENTIMENT] Erro ao gerar resumo:', error.message);
      return null;
    }
  }
}

// Singleton
let instance = null;

export function getSentimentAnalyzer() {
  if (!instance) {
    instance = new SentimentAnalyzer();
  }
  return instance;
}

export default SentimentAnalyzer;

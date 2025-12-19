# 🎯 ARQUITETURA: ANÁLISE DE TRANSCRIÇÕES DE REUNIÕES
**Data:** 2025-11-13 14:10
**Versão:** 1.0.0
**Status:** 📋 PLANEJAMENTO

---

## 📊 VISÃO GERAL

Sistema modular para análise automatizada de reuniões do Google Meet usando transcrições, com foco em:
- Análise de qualidade da reunião
- Verificação de metodologia de vendas (SPIN, BANT, Challenger)
- Scoring de performance
- Métricas de resultado (positivo/negativo)
- Insights acionáveis para melhoria

---

## 🏗️ ARQUITETURA DO SISTEMA

### Camadas da Solução

```
┌─────────────────────────────────────────────────────────────┐
│                    GOOGLE MEET API                          │
│              (Transcrição Automática)                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              MEETING TRANSCRIPTION SERVICE                   │
│  • Buscar transcrições via API                              │
│  • Webhook para eventos de reunião finalizada               │
│  • Armazenar transcrição bruta                              │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                 ANALYSIS PIPELINE                            │
│                                                              │
│  ┌──────────────────────────────────────────────────┐      │
│  │  1. PREPROCESSING                                 │      │
│  │     • Identificar participantes                   │      │
│  │     • Segmentar por speaker                       │      │
│  │     • Detectar idioma                             │      │
│  │     • Limpar ruído                                │      │
│  └──────────────────────────────────────────────────┘      │
│                       │                                      │
│  ┌──────────────────────────────────────────────────┐      │
│  │  2. SENTIMENT ANALYSIS                            │      │
│  │     • Tom da conversa (positivo/negativo/neutro)  │      │
│  │     • Engajamento do lead                         │      │
│  │     • Objeções identificadas                      │      │
│  └──────────────────────────────────────────────────┘      │
│                       │                                      │
│  ┌──────────────────────────────────────────────────┐      │
│  │  3. METHODOLOGY VALIDATION                        │      │
│  │     • SPIN Selling (Situation, Problem, etc)      │      │
│  │     • BANT (Budget, Authority, Need, Timeline)    │      │
│  │     • Challenger Sale                             │      │
│  │     • Scoring de aderência (0-100)                │      │
│  └──────────────────────────────────────────────────┘      │
│                       │                                      │
│  ┌──────────────────────────────────────────────────┐      │
│  │  4. OUTCOME PREDICTION                            │      │
│  │     • Probabilidade de fechamento (0-100%)        │      │
│  │     • Next Best Action                            │      │
│  │     • Risk Factors                                │      │
│  └──────────────────────────────────────────────────┘      │
│                       │                                      │
│  ┌──────────────────────────────────────────────────┐      │
│  │  5. METRICS EXTRACTION                            │      │
│  │     • Talk ratio (vendedor vs lead)               │      │
│  │     • Perguntas feitas                            │      │
│  │     • Objeções tratadas                           │      │
│  │     • Próximos passos definidos                   │      │
│  └──────────────────────────────────────────────────┘      │
│                       │                                      │
└───────────────────────┼──────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                   STORAGE LAYER                              │
│                                                              │
│  • meeting_transcriptions (raw)                             │
│  • meeting_analysis (processed)                             │
│  • meeting_scores (metrics)                                 │
│  • meeting_insights (recommendations)                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  DASHBOARD & REPORTS                         │
│                                                              │
│  • Score de qualidade da reunião                            │
│  • Heatmap de metodologia aplicada                          │
│  • Comparativo entre reuniões                               │
│  • Insights acionáveis                                      │
│  • Coaching automático                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 ESTRUTURA DE ARQUIVOS

```
src/
├── services/
│   └── meetings/
│       ├── MeetingTranscriptionService.js    # Integração Google Meet API
│       ├── MeetingAnalysisService.js         # Pipeline de análise
│       ├── MethodologyValidator.js           # Validação de metodologia
│       └── MeetingScoringService.js          # Cálculo de scores
│
├── intelligence/
│   └── meeting-analysis/
│       ├── sentiment-analyzer.js             # Análise de sentimento
│       ├── methodology-detector.js           # Detecção de metodologia
│       ├── outcome-predictor.js              # Predição de resultado
│       └── metrics-extractor.js              # Extração de métricas
│
├── models/
│   └── meeting/
│       ├── MeetingTranscription.model.js     # Schema transcrição
│       ├── MeetingAnalysis.model.js          # Schema análise
│       └── MeetingScore.model.js             # Schema scores
│
├── api/
│   └── routes/
│       └── meetings.routes.js                # Endpoints da API
│
└── db/
    └── migrations/
        └── 003_create_meeting_tables.sql     # Schema do banco
```

---

## 🗄️ DATABASE SCHEMA

### Tabela: meeting_transcriptions

```sql
CREATE TABLE meeting_transcriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Identificação
  meeting_id TEXT NOT NULL UNIQUE,           -- Google Meet event ID
  calendar_event_id TEXT,                    -- Relaciona com evento do calendário
  lead_phone_number TEXT,                    -- Relaciona com lead

  -- Transcrição
  transcription_text TEXT NOT NULL,          -- Texto completo da transcrição
  language TEXT DEFAULT 'pt-BR',             -- Idioma detectado
  duration_minutes INTEGER,                  -- Duração em minutos

  -- Participantes
  participants TEXT,                         -- JSON: [{ name, email, role }]

  -- Timestamps
  meeting_started_at DATETIME,               -- Início da reunião
  meeting_ended_at DATETIME,                 -- Fim da reunião
  transcription_received_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  -- Status
  processing_status TEXT DEFAULT 'pending',  -- pending, processing, completed, error
  error_message TEXT,

  -- Metadata
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_meeting_transcriptions_meeting_id ON meeting_transcriptions(meeting_id);
CREATE INDEX idx_meeting_transcriptions_lead_phone ON meeting_transcriptions(lead_phone_number);
CREATE INDEX idx_meeting_transcriptions_status ON meeting_transcriptions(processing_status);
```

### Tabela: meeting_analysis

```sql
CREATE TABLE meeting_analysis (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Relacionamento
  meeting_id TEXT NOT NULL UNIQUE,
  transcription_id INTEGER NOT NULL,
  lead_phone_number TEXT,

  -- Análise de Sentimento
  sentiment_overall TEXT,                    -- positive, negative, neutral
  sentiment_score REAL,                      -- -1.0 a 1.0
  lead_engagement_score REAL,                -- 0-100

  -- Talk Ratio
  talk_ratio_vendor REAL,                    -- % tempo vendedor falando
  talk_ratio_lead REAL,                      -- % tempo lead falando

  -- Perguntas
  questions_asked_by_vendor INTEGER,
  questions_asked_by_lead INTEGER,

  -- Objeções
  objections_detected TEXT,                  -- JSON: [{ type, text, handled }]
  objections_handled_count INTEGER,
  objections_unhandled_count INTEGER,

  -- Next Steps
  next_steps_defined BOOLEAN,
  next_steps_text TEXT,

  -- Resultado
  outcome_prediction TEXT,                   -- win, loss, uncertain
  outcome_confidence REAL,                   -- 0-100%

  -- Timestamps
  analyzed_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (transcription_id) REFERENCES meeting_transcriptions(id)
);

CREATE INDEX idx_meeting_analysis_meeting_id ON meeting_analysis(meeting_id);
CREATE INDEX idx_meeting_analysis_lead_phone ON meeting_analysis(lead_phone_number);
```

### Tabela: meeting_scores

```sql
CREATE TABLE meeting_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Relacionamento
  meeting_id TEXT NOT NULL UNIQUE,
  analysis_id INTEGER NOT NULL,

  -- Metodologia SPIN Selling
  spin_situation_score REAL,                 -- 0-100
  spin_problem_score REAL,                   -- 0-100
  spin_implication_score REAL,               -- 0-100
  spin_need_payoff_score REAL,               -- 0-100
  spin_overall_score REAL,                   -- Média ponderada

  -- Metodologia BANT
  bant_budget_covered BOOLEAN,
  bant_authority_covered BOOLEAN,
  bant_need_covered BOOLEAN,
  bant_timeline_covered BOOLEAN,
  bant_overall_score REAL,                   -- 0-100

  -- Challenger Sale
  challenger_teach_score REAL,               -- 0-100 (ensinou algo novo?)
  challenger_tailor_score REAL,              -- 0-100 (personalizou?)
  challenger_control_score REAL,             -- 0-100 (controle da conversa?)
  challenger_overall_score REAL,             -- Média ponderada

  -- Score Geral
  overall_quality_score REAL,                -- 0-100 (meta-score)

  -- Detalhes
  strengths TEXT,                            -- JSON: [{ category, description, score }]
  weaknesses TEXT,                           -- JSON: [{ category, description, score }]

  -- Timestamps
  scored_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (analysis_id) REFERENCES meeting_analysis(id)
);

CREATE INDEX idx_meeting_scores_meeting_id ON meeting_scores(meeting_id);
CREATE INDEX idx_meeting_scores_overall ON meeting_scores(overall_quality_score);
```

### Tabela: meeting_insights

```sql
CREATE TABLE meeting_insights (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Relacionamento
  meeting_id TEXT NOT NULL,
  analysis_id INTEGER NOT NULL,

  -- Insight
  insight_type TEXT NOT NULL,                -- coaching, warning, opportunity, next_step
  category TEXT NOT NULL,                    -- methodology, engagement, objection, outcome
  priority TEXT DEFAULT 'medium',            -- high, medium, low

  title TEXT NOT NULL,
  description TEXT NOT NULL,
  recommendation TEXT,                       -- Ação sugerida

  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (analysis_id) REFERENCES meeting_analysis(id)
);

CREATE INDEX idx_meeting_insights_meeting_id ON meeting_insights(meeting_id);
CREATE INDEX idx_meeting_insights_type ON meeting_insights(insight_type);
CREATE INDEX idx_meeting_insights_priority ON meeting_insights(priority);
```

---

## 🔌 INTEGRAÇÃO GOOGLE MEET API

### 1. Autenticação

```javascript
// services/meetings/MeetingTranscriptionService.js
import { google } from 'googleapis';

export class MeetingTranscriptionService {
  constructor() {
    this.auth = new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
      scopes: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/drive.readonly',
      ],
    });
    this.calendar = google.calendar({ version: 'v3', auth: this.auth });
    this.drive = google.drive({ version: 'v3', auth: this.auth });
  }

  /**
   * Buscar transcrição de uma reunião específica
   * Google Meet salva transcrições no Google Drive
   */
  async getTranscription(meetingId) {
    try {
      // 1. Buscar evento do calendário
      const event = await this.calendar.events.get({
        calendarId: 'primary',
        eventId: meetingId,
      });

      // 2. Buscar anexos (transcrição) no Drive
      const attachments = event.data.attachments || [];
      const transcriptionAttachment = attachments.find(
        (a) => a.mimeType === 'application/vnd.google-apps.document'
      );

      if (!transcriptionAttachment) {
        throw new Error('Transcrição não encontrada');
      }

      // 3. Baixar transcrição do Drive
      const file = await this.drive.files.export({
        fileId: transcriptionAttachment.fileId,
        mimeType: 'text/plain',
      });

      return {
        meetingId,
        eventId: event.data.id,
        transcriptionText: file.data,
        participants: this.extractParticipants(event.data),
        duration: this.calculateDuration(event.data),
        meetingStartedAt: event.data.start.dateTime,
        meetingEndedAt: event.data.end.dateTime,
      };
    } catch (error) {
      console.error(`❌ [MEETING-TRANSCRIPT] Erro ao buscar transcrição:`, error);
      throw error;
    }
  }

  /**
   * Webhook para receber notificações de reunião finalizada
   */
  async setupWebhook(callbackUrl) {
    try {
      const channel = await this.calendar.events.watch({
        calendarId: 'primary',
        requestBody: {
          id: `orbion-meeting-${Date.now()}`,
          type: 'web_hook',
          address: callbackUrl,
        },
      });

      console.log(`✅ [MEETING-TRANSCRIPT] Webhook configurado:`, channel.data);
      return channel.data;
    } catch (error) {
      console.error(`❌ [MEETING-TRANSCRIPT] Erro ao configurar webhook:`, error);
      throw error;
    }
  }
}
```

---

## 🧠 ANÁLISE COM GPT-4

### Análise de Metodologia (SPIN, BANT, Challenger)

```javascript
// intelligence/meeting-analysis/methodology-detector.js
import OpenAI from 'openai';

export class MethodologyDetector {
  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  /**
   * Analisar aderência às metodologias de venda
   */
  async analyzeMethodology(transcription) {
    const prompt = `Você é um especialista em metodologias de venda. Analise a transcrição de reunião abaixo e avalie a aderência às seguintes metodologias:

1. **SPIN Selling**:
   - Situation Questions (perguntas sobre situação atual)
   - Problem Questions (perguntas sobre problemas)
   - Implication Questions (consequências dos problemas)
   - Need-Payoff Questions (valor da solução)

2. **BANT**:
   - Budget (orçamento discutido?)
   - Authority (decisor identificado?)
   - Need (necessidade validada?)
   - Timeline (prazo definido?)

3. **Challenger Sale**:
   - Teach (ensinou algo novo ao lead?)
   - Tailor (personalizou a abordagem?)
   - Take Control (controlou a conversa?)

Retorne JSON com a seguinte estrutura:
{
  "spin": {
    "situation_score": 0-100,
    "problem_score": 0-100,
    "implication_score": 0-100,
    "need_payoff_score": 0-100,
    "overall_score": 0-100,
    "examples": [{ "category": "situation", "quote": "..." }]
  },
  "bant": {
    "budget_covered": true/false,
    "authority_covered": true/false,
    "need_covered": true/false,
    "timeline_covered": true/false,
    "overall_score": 0-100,
    "quotes": { "budget": "...", "authority": "..." }
  },
  "challenger": {
    "teach_score": 0-100,
    "tailor_score": 0-100,
    "control_score": 0-100,
    "overall_score": 0-100,
    "insights_shared": ["insight 1", "insight 2"]
  }
}

TRANSCRIÇÃO:
${transcription}`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    return JSON.parse(response.choices[0].message.content);
  }
}
```

---

## 📊 SCORING SYSTEM

### Cálculo do Overall Quality Score

```javascript
// services/meetings/MeetingScoringService.js
export class MeetingScoringService {
  /**
   * Calcular score geral de qualidade da reunião
   */
  calculateOverallScore(analysis, methodology) {
    const weights = {
      sentiment: 0.15,          // 15% - sentimento geral
      engagement: 0.15,         // 15% - engajamento do lead
      methodology: 0.35,        // 35% - aderência às metodologias
      objections: 0.15,         // 15% - tratamento de objeções
      next_steps: 0.10,         // 10% - próximos passos definidos
      talk_ratio: 0.10,         // 10% - equilíbrio na conversa
    };

    const scores = {
      sentiment: this.normalizeSentimentScore(analysis.sentiment_score),
      engagement: analysis.lead_engagement_score,
      methodology: this.calculateMethodologyScore(methodology),
      objections: this.calculateObjectionsScore(analysis),
      next_steps: analysis.next_steps_defined ? 100 : 0,
      talk_ratio: this.calculateTalkRatioScore(analysis),
    };

    const overallScore = Object.keys(weights).reduce(
      (total, key) => total + scores[key] * weights[key],
      0
    );

    return {
      overallScore: Math.round(overallScore),
      breakdown: scores,
      weights,
    };
  }

  /**
   * Score combinado das metodologias
   */
  calculateMethodologyScore(methodology) {
    const methodWeights = {
      spin: 0.40,       // 40% - SPIN é fundamental
      bant: 0.35,       // 35% - BANT qualifica o lead
      challenger: 0.25, // 25% - Challenger diferencia
    };

    return (
      methodology.spin.overall_score * methodWeights.spin +
      methodology.bant.overall_score * methodWeights.bant +
      methodology.challenger.overall_score * methodWeights.challenger
    );
  }

  /**
   * Score de tratamento de objeções
   */
  calculateObjectionsScore(analysis) {
    const { objections_handled_count, objections_unhandled_count } = analysis;
    const total = objections_handled_count + objections_unhandled_count;

    if (total === 0) return 100; // Sem objeções = bom sinal

    const handledRatio = objections_handled_count / total;
    return handledRatio * 100;
  }

  /**
   * Score de equilíbrio na conversa (ideal: 70/30 vendedor/lead)
   */
  calculateTalkRatioScore(analysis) {
    const { talk_ratio_vendor, talk_ratio_lead } = analysis;

    // Ideal: vendedor fala 60-70%, lead fala 30-40%
    const idealVendorRange = [60, 70];
    const idealLeadRange = [30, 40];

    const vendorScore = this.scoreInRange(talk_ratio_vendor, idealVendorRange);
    const leadScore = this.scoreInRange(talk_ratio_lead, idealLeadRange);

    return (vendorScore + leadScore) / 2;
  }

  scoreInRange(value, [min, max]) {
    if (value >= min && value <= max) return 100;
    if (value < min) return Math.max(0, 100 - (min - value) * 2);
    if (value > max) return Math.max(0, 100 - (value - max) * 2);
  }
}
```

---

## 🎯 API ENDPOINTS

```javascript
// api/routes/meetings.routes.js
import express from 'express';

const router = express.Router();

/**
 * POST /api/meetings/webhook
 * Webhook do Google Calendar para reunião finalizada
 */
router.post('/api/meetings/webhook', async (req, res) => {
  try {
    const event = req.body;

    // Processar evento de reunião finalizada
    if (event.resourceState === 'exists' && event.kind === 'calendar#event') {
      // Disparar análise assíncrona
      processaMeetingAsync(event.eventId);
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('❌ [MEETING-WEBHOOK] Erro:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/meetings/:meetingId/analysis
 * Buscar análise completa de uma reunião
 */
router.get('/api/meetings/:meetingId/analysis', async (req, res) => {
  try {
    const { meetingId } = req.params;

    const analysis = await db.prepare(`
      SELECT
        t.*,
        a.*,
        s.*
      FROM meeting_transcriptions t
      LEFT JOIN meeting_analysis a ON t.meeting_id = a.meeting_id
      LEFT JOIN meeting_scores s ON t.meeting_id = s.meeting_id
      WHERE t.meeting_id = ?
    `).get(meetingId);

    if (!analysis) {
      return res.status(404).json({ error: 'Reunião não encontrada' });
    }

    res.json(analysis);
  } catch (error) {
    console.error('❌ [MEETING-ANALYSIS] Erro:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/meetings/insights
 * Listar insights de todas as reuniões
 */
router.get('/api/meetings/insights', async (req, res) => {
  try {
    const { priority, category, limit = 50 } = req.query;

    let query = `SELECT * FROM meeting_insights WHERE 1=1`;
    const params = [];

    if (priority) {
      query += ` AND priority = ?`;
      params.push(priority);
    }

    if (category) {
      query += ` AND category = ?`;
      params.push(category);
    }

    query += ` ORDER BY created_at DESC LIMIT ?`;
    params.push(parseInt(limit));

    const insights = await db.prepare(query).all(...params);

    res.json({ insights, count: insights.length });
  } catch (error) {
    console.error('❌ [MEETING-INSIGHTS] Erro:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

---

## 🎨 DASHBOARD VISUALIZATIONS

### Componentes Recomendados

1. **Meeting Quality Score Card**
   - Overall Score (0-100) com gauge chart
   - Breakdown por categoria (radar chart)
   - Trend ao longo do tempo

2. **Methodology Adherence Heatmap**
   - SPIN: 4 quadrantes (Situation, Problem, Implication, Need-Payoff)
   - BANT: 4 indicadores (Budget, Authority, Need, Timeline)
   - Challenger: 3 pilares (Teach, Tailor, Control)

3. **Insights & Coaching**
   - Pontos fortes da reunião (badges verdes)
   - Áreas de melhoria (badges vermelhos)
   - Próximas ações recomendadas

4. **Comparative Analytics**
   - Score médio por vendedor
   - Score médio por setor do lead
   - Correlação score vs fechamento

---

## 🚀 IMPLEMENTAÇÃO EM FASES

### Fase 1: Foundation (Semana 1)
- [x] Arquitetura documentada
- [ ] Database schema criado
- [ ] Google Meet API integrada
- [ ] Webhook configurado
- [ ] Armazenamento de transcrições

### Fase 2: Analysis Pipeline (Semana 2)
- [ ] Sentiment analysis
- [ ] Talk ratio extraction
- [ ] Objections detection
- [ ] Next steps extraction

### Fase 3: Methodology Validation (Semana 3)
- [ ] SPIN scoring
- [ ] BANT scoring
- [ ] Challenger scoring
- [ ] Overall quality score

### Fase 4: Insights & Dashboard (Semana 4)
- [ ] Insights generation
- [ ] API endpoints
- [ ] Dashboard UI
- [ ] Reports & exports

---

## 🔐 SEGURANÇA E PRIVACIDADE

### Considerações

1. **Dados Sensíveis**: Transcrições podem conter informações confidenciais
2. **LGPD Compliance**: Armazenar apenas com consentimento
3. **Acesso Restrito**: Apenas gerentes/admins podem ver análises
4. **Anonimização**: Remover PII antes de processar com GPT
5. **Retenção**: Política de limpeza após X dias

---

## 📈 MÉTRICAS DE SUCESSO

- **Adoção**: % de reuniões analisadas automaticamente
- **Acurácia**: Correlação entre score e fechamento real
- **Tempo**: Redução em tempo de análise manual
- **Melhoria**: Aumento no score médio ao longo do tempo
- **ROI**: Aumento na taxa de conversão

---

**Status:** 📋 Arquitetura completa e pronta para implementação
**Próximo passo:** Criar schema do banco e integração Google Meet API
**Desenvolvido por:** Claude Code - Senior Dev AI
**Data:** 2025-11-13 14:10

# 🎯 Meeting Analysis System - Quick Start Guide

**Sistema de análise automática de transcrições do Google Meet com GPT-4**

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Configuração Inicial](#configuração-inicial)
3. [Como Usar](#como-usar)
4. [API Endpoints](#api-endpoints)
5. [Exemplos de Requisições](#exemplos-de-requisições)
6. [Troubleshooting](#troubleshooting)

---

## 🎯 Visão Geral

### O que faz?
- ✅ Lê transcrições automáticas do Google Meet (via Google Drive API)
- ✅ Analisa sentimento, engajamento e talk ratio
- ✅ Valida metodologias de venda (SPIN, BANT, Challenger)
- ✅ Prevê resultado da reunião (venda provável, followup, perdido)
- ✅ Gera insights acionáveis e recomendações de coaching
- ✅ Score de 0-100 para cada reunião

### Pipeline de Análise (5 Camadas)
```
1. Preprocessing      → Extração de metadados
2. Sentiment Analysis → Sentimento, talk ratio, objeções
3. Methodology        → SPIN (25+25+25+25), BANT (25+25+25+25), Challenger (33+33+34)
4. Outcome Prediction → venda_provavel|followup_necessario|perdido
5. Insights           → Recomendações específicas para o vendedor
```

### Database Schema
```
meeting_transcriptions → meeting_analysis → meeting_scores
                                          → meeting_insights
```

---

## ⚙️ Configuração Inicial

### 1. Variáveis de Ambiente (.env)

Adicione ao seu `.env`:

```bash
# Google APIs - Opção 1: Service Account (Recomendado para servidor)
GOOGLE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"...","private_key":"..."}'

# Google APIs - Opção 2: OAuth2 (Requer autorização do usuário)
GOOGLE_CLIENT_ID=seu-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=seu-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3001/auth/google/callback
GOOGLE_REFRESH_TOKEN=seu-refresh-token

# OpenAI (já configurado)
OPENAI_API_KEY=sk-...
```

### 2. Criar Service Account (Google Cloud Console)

**Passo a passo:**

1. Acesse: https://console.cloud.google.com/
2. Crie novo projeto ou selecione existente
3. Ative as APIs:
   - Google Drive API
   - Google Docs API
   - Google Calendar API
4. Crie Service Account:
   - IAM & Admin → Service Accounts → Create Service Account
   - Nome: "orbion-meeting-analyzer"
   - Role: "Editor" (ou criar role customizada)
5. Crie chave JSON:
   - Actions → Manage Keys → Add Key → JSON
   - Copie TUDO do arquivo JSON
   - Cole no `.env` em `GOOGLE_SERVICE_ACCOUNT_KEY` (como string JSON)

6. **IMPORTANTE**: Compartilhe pasta do Google Drive com o email do Service Account
   - Email: `orbion-meeting-analyzer@seu-projeto.iam.gserviceaccount.com`
   - Permissão: "Viewer" ou "Editor"

### 3. Verificar Instalação

```bash
# Verificar dependências
npm list googleapis  # Deve mostrar versão instalada

# Verificar tabelas criadas
sqlite3 orbion.db ".tables" | grep meeting
# Output esperado:
# meeting_analysis        meeting_insights        meeting_transcriptions
# meeting_scores          meetings
```

---

## 🚀 Como Usar

### Fluxo Básico

```
1. Google Meet grava reunião com transcrição ativada
   ↓
2. Google Meet salva transcrição no Google Drive (automático)
   ↓
3. Buscar transcrição via API: POST /api/meetings/transcriptions/fetch-by-event
   ↓
4. Analisar transcrição: POST /api/meetings/analyze/:transcriptionId
   ↓
5. Ver resultados: GET /api/meetings/analysis/by-meeting/:meetingId
```

### Workflow Detalhado

**Passo 1: Agendar reunião no Google Calendar com Google Meet**
- Ativar "Registro e transcrição" nas configurações do Meet
- Realizar a reunião
- Transcrição é criada automaticamente no Google Drive

**Passo 2: Buscar transcrições recentes**
```bash
curl -X POST http://localhost:3001/api/meetings/transcriptions/fetch-recent \
  -H "Content-Type: application/json" \
  -d '{"daysBack": 7}'
```

**Passo 3: Analisar transcrição**
```bash
# Usar o transcription_id retornado no passo anterior
curl -X POST http://localhost:3001/api/meetings/analyze/abc123
```

**Passo 4: Ver análise completa**
```bash
curl http://localhost:3001/api/meetings/analysis/by-meeting/meeting-id-123
```

---

## 📡 API Endpoints

### Transcriptions

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/meetings/transcriptions/fetch-by-event` | Busca transcrição por ID do evento do calendário |
| POST | `/api/meetings/transcriptions/fetch-recent` | Busca transcrições recentes (últimos N dias) |
| GET | `/api/meetings/transcriptions/:id` | Busca transcrição por ID |
| GET | `/api/meetings/transcriptions?status=pending` | Lista transcrições pendentes |

### Analysis

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/meetings/analyze/:transcriptionId` | Analisa transcrição completa (5 camadas) |
| POST | `/api/meetings/analyze/quick` | Análise rápida (apenas sentiment) |
| GET | `/api/meetings/analysis/:id` | Busca análise por ID |
| GET | `/api/meetings/analysis/by-meeting/:meetingId` | Busca análise por meeting_id |

### Scores & Methodology

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/meetings/scores/excellent` | Reuniões com score 90+ |
| GET | `/api/meetings/scores/bant-qualified` | Leads qualificados (BANT completo) |
| GET | `/api/meetings/scores/stats` | Estatísticas de scores |

### Insights

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/meetings/insights/high-priority` | Insights de alta prioridade |
| PATCH | `/api/meetings/insights/:id/status` | Atualiza status (nova/revisada/aplicada) |
| GET | `/api/meetings/insights/stats` | Estatísticas de insights |

### OAuth (Configuração Inicial)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/meetings/auth/google/url` | Gera URL de autorização OAuth2 |
| POST | `/api/meetings/auth/google/callback` | Processa callback OAuth2 |

---

## 💡 Exemplos de Requisições

### 1. Buscar Transcrições Recentes

```bash
curl -X POST http://localhost:3001/api/meetings/transcriptions/fetch-recent \
  -H "Content-Type: application/json" \
  -d '{
    "daysBack": 7
  }'
```

**Response:**
```json
{
  "success": true,
  "count": 3,
  "transcriptions": [
    {
      "id": "abc123",
      "google_drive_file_id": "1A2B3C...",
      "google_doc_url": "https://docs.google.com/document/d/...",
      "fileName": "Reunião com Cliente XYZ - Transcrição",
      "data_reuniao": "2025-11-13T14:00:00.000Z",
      "duracao_segundos": 1800,
      "participantes": [
        {"nome": "Taylor", "tempo_fala_segundos": 540},
        {"nome": "Cliente", "tempo_fala_segundos": 1260}
      ],
      "status": "pending"
    }
  ]
}
```

### 2. Analisar Transcrição

```bash
curl -X POST http://localhost:3001/api/meetings/analyze/abc123
```

**Response:**
```json
{
  "success": true,
  "transcription_id": "abc123",
  "analysis_id": "xyz789",
  "score_id": "score456",
  "insights_count": 5,
  "processing_time_ms": 8500,
  "tokens_used": 3200,
  "results": {
    "sentiment": {
      "sentimento_geral": "positivo",
      "sentimento_score": 0.7,
      "talk_ratio_vendedor": 32.5,
      "talk_ratio_cliente": 67.5
    },
    "methodology": {
      "spin_total_score": 75,
      "bant_total_score": 82,
      "metodologia_primaria": "bant"
    },
    "outcome": {
      "resultado_previsto": "venda_provavel",
      "probabilidade_fechamento": 78
    }
  }
}
```

### 3. Buscar Análise Completa

```bash
curl http://localhost:3001/api/meetings/analysis/by-meeting/meeting-id-123
```

**Response:**
```json
{
  "success": true,
  "analysis": {
    "id": "xyz789",
    "sentimento_geral": "positivo",
    "talk_ratio_vendedor": 32.5,
    "num_objecoes": 2,
    "taxa_resolucao_objecoes": 100,
    "resultado_previsto": "venda_provavel",
    "probabilidade_fechamento": 78
  },
  "score": {
    "id": "score456",
    "score_total": 78.5,
    "nota_geral": "bom",
    "spin_total_score": 75,
    "bant_total_score": 82,
    "bant_qualificado": true,
    "metodologia_primaria": "bant"
  },
  "insights": [
    {
      "tipo": "destaque",
      "titulo": "Excelente qualificação BANT",
      "descricao": "O vendedor cobriu todos os 4 critérios BANT...",
      "prioridade": "media",
      "acao_recomendada": "Continuar usando este framework..."
    },
    {
      "tipo": "melhoria",
      "titulo": "Talk ratio ligeiramente alto",
      "descricao": "Vendedor falou 32.5% vs ideal de 30%...",
      "prioridade": "baixa",
      "acao_recomendada": "Fazer mais perguntas abertas..."
    }
  ]
}
```

### 4. Análise Rápida (Sem Salvar)

```bash
curl -X POST http://localhost:3001/api/meetings/analyze/quick \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Vendedor: Olá, como podemos ajudar?\nCliente: Precisamos de uma solução de CRM..."
  }'
```

**Response:**
```json
{
  "success": true,
  "sentiment": "positivo",
  "sentiment_score": 0.6,
  "talk_ratio_vendedor": 25,
  "num_objecoes": 0,
  "tokens_used": 450
}
```

### 5. Buscar Leads Qualificados (BANT)

```bash
curl http://localhost:3001/api/meetings/scores/bant-qualified
```

**Response:**
```json
{
  "success": true,
  "count": 5,
  "scores": [
    {
      "meeting_id": "meeting-123",
      "bant_total_score": 92,
      "bant_budget_score": 23,
      "bant_authority_score": 25,
      "bant_need_score": 22,
      "bant_timeline_score": 22,
      "score_total": 85.5
    }
  ]
}
```

---

## 🔧 Troubleshooting

### Erro: "Google API credentials not configured"

**Solução:**
1. Verifique se `GOOGLE_SERVICE_ACCOUNT_KEY` está no `.env`
2. Valide JSON: `echo $GOOGLE_SERVICE_ACCOUNT_KEY | jq .` (deve mostrar JSON válido)
3. Reinicie servidor: `npm start`

### Erro: "Transcription document not found"

**Possíveis causas:**
1. Transcrição não foi criada pelo Google Meet (verificar se estava ativada)
2. Service Account não tem acesso à pasta do Google Drive
3. Nome do evento no calendário não corresponde ao nome do arquivo

**Solução:**
1. Compartilhar pasta do Drive com email do Service Account
2. Verificar no Drive se existe arquivo "[Nome] - Transcript" ou "[Nome] - Transcrição"
3. Usar endpoint `/fetch-recent` ao invés de `/fetch-by-event`

### Erro: "Rate limit exceeded"

**Solução:**
- Google Drive API tem limite de 1000 requisições/100 segundos por usuário
- Aguardar 1-2 minutos antes de nova tentativa
- Considerar implementar cache local das transcrições

### Performance: Análise muito lenta (>15s)

**Otimizações:**
1. Usar `quickAnalysis()` para preview antes da análise completa
2. Processar transcrições em background (criar fila de processamento)
3. Reduzir tamanho do texto enviado ao GPT (limitar a 5000 palavras)

### Custo: Muitos tokens sendo usados

**Médias esperadas:**
- Análise completa (45min de reunião): ~3000-4000 tokens
- Quick analysis: ~400-600 tokens
- Custo estimado (gpt-4o-mini): $0.003 por análise completa

**Otimizações:**
- Usar `gpt-4o-mini` ao invés de `gpt-4` (10x mais barato)
- Implementar cache de análises
- Analisar apenas reuniões importantes (filtrar por duração >30min)

---

## 📊 Métricas de Sucesso

### Score Interpretation

| Score | Nota | Significado |
|-------|------|-------------|
| 90-100 | Excelente | Metodologia seguida perfeitamente, alta prob. de fechamento |
| 70-89 | Bom | Metodologia bem aplicada, alguns pontos de melhoria |
| 50-69 | Regular | Metodologia parcialmente seguida, precisa coaching |
| 0-49 | Ruim | Metodologia não seguida, requer treinamento urgente |

### BANT Qualification

Lead é considerado **qualificado** quando:
- BANT Total Score ≥ 75/100
- Todos os 4 critérios ≥ 15/25
- `bant_qualificado = true`

### SPIN Compliance

Reunião seguiu SPIN quando:
- SPIN Total Score ≥ 60/100
- Pelo menos 3 dos 4 tipos de perguntas foram feitas
- `spin_seguiu_metodologia = true`

---

## 🎓 Próximos Passos

1. **Dashboard de Análises**: Criar painel visual com gráficos de performance
2. **Alertas Automáticos**: Notificar quando reunião tem score < 50
3. **Comparação de Vendedores**: Ranking e benchmarking
4. **Treinamento Personalizado**: Gerar planos de coaching baseados em insights
5. **Integração com CRM**: Atualizar probabilidade de fechamento automaticamente

---

## 📚 Documentação Técnica

- **Arquitetura Completa**: `MEETING_ANALYSIS_ARCHITECTURE.md`
- **Database Schema**: `src/db/migrations/011_create_meeting_analysis_tables.sql`
- **Models**: `src/models/Meeting*.js`
- **Services**: `src/services/meetings/`
- **API Routes**: `src/api/routes/meetings.routes.js`

---

**Desenvolvido por:** ORBION Team
**Data:** 2025-11-13
**Versão:** 1.0.0

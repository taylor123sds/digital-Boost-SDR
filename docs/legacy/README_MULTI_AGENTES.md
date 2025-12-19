# 📚 DOCUMENTAÇÃO COMPLETA - SISTEMA MULTI-AGENTE ORBION

## 🎯 VISÃO GERAL

O **ORBION** é um sistema avançado de **3 agentes especializados** que trabalham em conjunto para:

1. **Prospectar** leads via WhatsApp (SDR Agent)
2. **Qualificar** usando metodologia BANT (Specialist Agent)
3. **Agendar** reuniões no Google Calendar (Scheduler Agent)

**Status Atual:** ✅ **SISTEMA 100% FUNCIONAL E TESTADO**

---

## 📖 DOCUMENTAÇÃO DISPONÍVEL

### 1️⃣ **LOGICA_MULTI_AGENTES_COMPLETA.md**
📄 **Descrição:** Documentação técnica detalhada do funcionamento completo

**Conteúdo:**
- ✅ Arquitetura do sistema (Agent Hub + 3 agentes)
- ✅ Fluxo completo passo a passo (mensagem → resposta)
- ✅ Keywords e detecção de DOR (Pain Type)
- ✅ Sistema de handoffs (passagem de bastão)
- ✅ Detecção de bot (6 sinais diferentes)
- ✅ Sistema BANT (Budget, Authority, Need, Timing)
- ✅ Estados e persistência (SQLite)
- ✅ Exemplos de código comentados

**Ideal para:**
- Desenvolvedores que querem entender o código
- Onboarding de novos desenvolvedores
- Troubleshooting técnico

---

### 2️⃣ **FLUXO_VISUAL_COMPLETO.md**
📊 **Descrição:** Diagramas visuais e matrizes de decisão

**Conteúdo:**
- ✅ Diagrama de sequência completo (ASCII art)
- ✅ Tabela de transições de estado
- ✅ Matriz de decisão de keywords
- ✅ Matriz de handoff (condições + thresholds)
- ✅ Matriz de detecção de bot
- ✅ Fluxo de score de qualificação
- ✅ Persistência de estado (SQL schema)
- ✅ Resumo executivo

**Ideal para:**
- Visualizar o fluxo end-to-end
- Apresentações para stakeholders
- Planejamento de melhorias

---

### 3️⃣ **KEYWORDS_E_THRESHOLDS.md**
🔑 **Descrição:** Referência rápida de todas as keywords e thresholds

**Conteúdo:**
- ✅ Keywords de DOR (Growth Marketing, Sites, Audiovisual)
- ✅ Keywords de interesse (18 palavras-chave)
- ✅ Keywords de bot detection (4 categorias)
- ✅ Thresholds de handoff (SDR→Specialist, Specialist→Scheduler)
- ✅ Thresholds de qualificação (scores BANT)
- ✅ Exemplos práticos (3 cenários completos)
- ✅ Checklist rápido para debugging

**Ideal para:**
- Ajustar thresholds rapidamente
- Adicionar novas keywords
- Debugging de detecções incorretas
- Referência rápida durante desenvolvimento

---

### 4️⃣ **README_MULTI_AGENTES.md** (este arquivo)
📋 **Descrição:** Índice mestre e guia de navegação

**Conteúdo:**
- ✅ Visão geral do sistema
- ✅ Guia dos documentos disponíveis
- ✅ Quick start
- ✅ Arquivos principais do sistema
- ✅ FAQ

---

## 🚀 QUICK START

### **Passo 1: Entender a Arquitetura**
Leia: `LOGICA_MULTI_AGENTES_COMPLETA.md` → Seção "Visão Geral da Arquitetura"

### **Passo 2: Ver o Fluxo Funcionando**
Leia: `FLUXO_VISUAL_COMPLETO.md` → "Diagrama de Sequência Completo"

### **Passo 3: Testar o Sistema**
Execute os testes de validação:

```bash
# Teste 1: Bot detection flow
node test_bot_flow_correto.js

# Teste 2: Handoffs completos
node test_handoffs_only.js

# Teste 3: Fluxo completo (SDR → Specialist → Scheduler)
node test_complete_agent_flow.js
```

### **Passo 4: Ajustar Keywords (se necessário)**
Consulte: `KEYWORDS_E_THRESHOLDS.md` → Seção específica da keyword

---

## 📁 ARQUIVOS PRINCIPAIS DO SISTEMA

### **🏗️ Core (Orquestração)**

```
src/agents/agent_hub.js
├─ Orquestrador central
├─ Roteia mensagens para agente correto
├─ Gerencia handoffs (passagem de bastão)
├─ Persiste estado via memory.js
└─ Rollback em caso de erro
```

**Métodos principais:**
- `processMessage()` - Roteia mensagem para agente ativo
- `executeHandoff()` - Executa transição entre agentes
- `getLeadState()` / `saveLeadState()` - Persistência

---

### **🎯 Agente 1: SDR Agent**

```
src/agents/sdr_agent.js
├─ Prospecção e primeira interação
├─ Detecção de bot (6 sinais)
├─ Verificação humana ("HUMANO OK")
├─ Identificação de DOR (Growth/Sites/Audio)
├─ Medição de interesse (18 keywords)
└─ Handoff para Specialist quando DOR + interesse ≥5%
```

**Métodos principais:**
- `process()` - Processa mensagem do lead
- `detectBot()` - Verifica se é bot (combina 2 sistemas)
- `detectPainType()` - Identifica DOR via keywords
- `handleLeadResponse()` - Decide se faz handoff ou pergunta

**Keywords:**
- DOR Growth: crescimento, marketing, leads, vendas, conversão...
- DOR Sites: site, página, landing, lento, design...
- DOR Audio: vídeo, reels, TikTok, YouTube, edição...
- Interesse: preciso, urgente, ajuda, problema, melhorar... (18 total)

**Thresholds:**
- Bot detection: ≥2 sinais de 6
- Handoff: interesse ≥5% (1+ keyword de 18)

---

### **💼 Agente 2: Specialist Agent**

```
src/agents/specialist_agent.js
├─ Atendimento especializado por DOR
├─ Coleta BANT consultivo
│  ├─ Budget (orçamento)
│  ├─ Authority (decisor)
│  ├─ Need (necessidade - vem do SDR)
│  └─ Timing (urgência)
├─ Calcula score de qualificação (0-100%)
└─ Handoff para Scheduler quando ≥70% + 3/4 pilares
```

**Métodos principais:**
- `onHandoffReceived()` - Recebe handoff do SDR
- `process()` - Processa mensagem e coleta BANT
- `isReadyToSchedule()` - Verifica se está qualificado
- `getFirstQuestion()` - Pergunta inicial por especialidade

**Sistema BANT:**
- Need: 25 pontos (vem do SDR)
- Budget: 30 pontos
- Authority: 25 pontos
- Timing: 20 pontos

**Thresholds:**
- Handoff: score ≥70% E pilares ≥3/4

---

### **📅 Agente 3: Scheduler Agent**

```
src/agents/scheduler_agent.js
├─ Recebe lead qualificado (score ≥70%)
├─ Propõe horários disponíveis (5 slots)
├─ Negocia disponibilidade
├─ Detecta confirmação de horário
├─ Cria evento no Google Calendar
└─ Envia confirmação com Meet Link
```

**Métodos principais:**
- `onHandoffReceived()` - Recebe handoff do Specialist
- `proposeTimeSlots()` - Gera proposta de horários com GPT
- `detectTimeConfirmation()` - Detecta escolha do lead
- `createCalendarEvent()` - Integração Google Calendar
- `getAvailableTimeSlots()` - Gera slots disponíveis

**Detecção de confirmação:**
- Padrões: "terça às 10h", "amanhã 14h", "opção 2"
- Previne duplicatas (verifica scheduledMeeting)

---

### **🛠️ Utilitários**

```
src/utils/bot_detector.js
├─ Detecção de bot por conteúdo
├─ 6 sinais diferentes (menu, assinatura, protocolo, etc)
├─ Tracker de estado de bot
├─ Mensagem-ponte (bridge message)
└─ Verificação de sinal humano ("HUMANO OK")
```

```
src/tools/bant_unified.js
├─ Sistema BANT unificado
├─ Processamento de respostas
├─ Cálculo de score (0-100%)
├─ Detecção de arquétipos (Pragmático, Analítico, etc)
└─ Geração de próxima pergunta
```

```
src/memory.js
├─ Persistência SQLite
├─ getEnhancedState() - Recupera estado do lead
├─ saveEnhancedState() - Salva estado
└─ getRecentMessages() - Histórico de conversa
```

---

## 🧪 TESTES DISPONÍVEIS

### **Test 1: Bot Detection Flow**
```bash
node test_bot_flow_correto.js
```
**Testa:**
- ✅ Primeira mensagem do SDR
- ✅ Detecção de bot (menu numerado)
- ✅ Envio de bridge message
- ✅ Verificação "HUMANO OK"
- ✅ Handoff para Specialist após confirmação

---

### **Test 2: Handoffs Only**
```bash
node test_handoffs_only.js
```
**Testa:**
- ✅ Handoff SDR → Specialist (DOR growth_marketing)
- ✅ Coleta BANT (Budget + Authority)
- ✅ Handoff Specialist → Scheduler (score 80%)
- ✅ Proposta de horários
- ✅ Estado final

---

### **Test 3: Complete Agent Flow**
```bash
node test_complete_agent_flow.js
```
**Testa:**
- ✅ AgentHub loading (3 agentes)
- ✅ SDR primeira mensagem
- ✅ Detecção de bot
- ✅ Identificação de DOR
- ✅ Handoff SDR → Specialist
- ✅ BANT collection (Budget, Authority, Timing)
- ✅ Handoff Specialist → Scheduler
- ✅ Confirmação de horário
- ✅ Estado final completo

---

## ❓ FAQ

### **1. Como o sistema detecta se é bot?**
Analisa 6 sinais diferentes:
1. Menu numerado (1) 2) 3))
2. Assinatura automática ("Mensagem automática")
3. Protocolo/código ("Protocolo: 123")
4. Frases clássicas ("Como posso ajudar?")
5. Múltiplas opções numeradas (≥3)
6. Formatação repetitiva (≥3 linhas numeradas)

**Threshold:** ≥2 sinais → Bot detectado

Consulte: `KEYWORDS_E_THRESHOLDS.md` → "Keywords de Bot Detection"

---

### **2. Como o sistema identifica a DOR (Pain Type)?**
Usa regex patterns para 3 categorias:
- **Growth Marketing:** crescimento, marketing, leads, vendas...
- **Sites:** site, página, lento, design, performance...
- **Audiovisual:** vídeo, reels, TikTok, edição, YouTube...

**Lógica:** Categoria com mais matches vence.

Consulte: `KEYWORDS_E_THRESHOLDS.md` → "Keywords de DOR"

---

### **3. Quando acontece o handoff SDR → Specialist?**
**Condição 1:** DOR identificada + interesse ≥5%

**OU**

**Condição 2:** Interesse ≥5% sem DOR específica (usa `painType: 'growth_marketing'` padrão)

**Interesse calculado por:** Keywords encontradas / 18 total

Consulte: `FLUXO_VISUAL_COMPLETO.md` → "Matriz de Handoff"

---

### **4. Quando acontece o handoff Specialist → Scheduler?**
**Condições (ambas necessárias):**
1. Score de qualificação ≥70%
2. Pilares BANT coletados ≥3/4

**Pilares:** Need (25%), Budget (30%), Authority (25%), Timing (20%)

Consulte: `KEYWORDS_E_THRESHOLDS.md` → "Handoff 2: Specialist → Scheduler"

---

### **5. Como ajustar os thresholds?**

**Threshold de interesse (SDR → Specialist):**
```javascript
// src/agents/sdr_agent.js - Linha 193 e 217
if (painDetection.interestLevel >= 0.05) {  // ← ALTERAR AQUI (atualmente 5%)
```

**Threshold de qualificação (Specialist → Scheduler):**
```javascript
// src/agents/specialist_agent.js - Linha 151-152
const isReady = qualificationScore >= 70 &&  // ← ALTERAR AQUI (atualmente 70%)
                collectedCount >= 3;         // ← ALTERAR AQUI (atualmente 3/4)
```

**Threshold de bot detection:**
```javascript
// src/utils/bot_detector.js - Linha 179
const isBot = signalCount >= 2;  // ← ALTERAR AQUI (atualmente 2 sinais)
```

---

### **6. Como adicionar novas keywords de DOR?**

Edite `src/agents/sdr_agent.js`:

```javascript
// PARA GROWTH MARKETING (linha 233-245):
const growthPatterns = [
  /cresc(er|imento|endo)/i,
  /marketing/i,
  /nova_keyword_aqui/i,  // ← ADICIONAR AQUI
  // ...
];

// PARA SITES (linha 248-262):
const sitesPatterns = [
  /site/i,
  /nova_keyword_aqui/i,  // ← ADICIONAR AQUI
  // ...
];

// PARA AUDIOVISUAL (linha 264-278):
const audioPatterns = [
  /v[íi]deo/i,
  /nova_keyword_aqui/i,  // ← ADICIONAR AQUI
  // ...
];
```

---

### **7. Como adicionar novas keywords de interesse?**

Edite `src/agents/sdr_agent.js` linha 291-297:

```javascript
const interestKeywords = [
  /preciso/i,
  /quero/i,
  /urgente/i,
  /nova_keyword_aqui/i,  // ← ADICIONAR AQUI
  // ...
];

// ⚠️ IMPORTANTE: Atualizar divisor no cálculo
const interestLevel = interestKeywords.filter(k => k.test(lowerMsg)).length / 19;
//                                                                            ↑
//                                                        INCREMENTAR TOTAL (era 18, agora 19)
```

---

### **8. Como depurar um handoff que não aconteceu?**

**Passo 1:** Verifique os logs do console:
```
🔍 [SDR] DOR detectada: growth_marketing
🔍 [SDR] Interest level: 0.03 (mín: 0.05 para handoff)
```
↑ Neste exemplo, interesse está em 3%, mas threshold é 5% → SEM HANDOFF

**Passo 2:** Consulte checklist:
- `KEYWORDS_E_THRESHOLDS.md` → "Checklist Rápido"

**Passo 3:** Teste com mensagem explícita:
```javascript
const testMessage = "Preciso urgente de ajuda com crescimento e marketing digital";
// Keywords de interesse: preciso (1) + urgente (2) + ajuda (3) = 3/18 = 16.7% ✅
// Keywords de DOR: crescimento (1) + marketing (2) → growth_marketing ✅
// Resultado esperado: HANDOFF ✅
```

---

### **9. O que fazer se o bot detector está muito sensível?**

**Opção 1:** Aumentar threshold de sinais:
```javascript
// src/utils/bot_detector.js - Linha 179
const isBot = signalCount >= 3;  // Era 2, agora 3
```

**Opção 2:** Desativar sinais específicos:
```javascript
// src/utils/bot_detector.js - Comentar sinal problemático
// if (hasMenu) {
//   signals.push('menu_detected');  // ← DESATIVADO
// }
```

**Opção 3:** Adicionar exceções:
```javascript
// Exemplo: Ignorar menus pequenos
if (hasMenu && optionMatches.length < 5) {  // Apenas se ≥5 opções
  signals.push('menu_detected');
}
```

---

### **10. Como ver o estado salvo de um lead?**

**Via código:**
```javascript
import { getEnhancedState } from './src/memory.js';

const leadPhone = '5511991234567';
const state = await getEnhancedState(leadPhone);

console.log('Estado:', JSON.stringify(state, null, 2));
```

**Via SQLite direto:**
```bash
sqlite3 orbion.db

SELECT * FROM enhanced_state WHERE contact_id = '5511991234567';
```

---

## 📊 MÉTRICAS E MONITORAMENTO

### **Logs Importantes:**

```bash
# Handoff detectado
🔀 [HUB] HANDOFF detectado: sdr → specialist

# Score de qualificação
📊 [SPECIALIST] Score: 80%
📊 [SPECIALIST] Collected: {"need": "...", "budget": "..."}

# Bot detectado
🤖 [SDR] Sinais detectados: 4 (BOT!)

# DOR identificada
🔍 [SDR] DOR detectada: growth_marketing
🔍 [SDR] Interest level: 0.20 (mín: 0.05 para handoff)
```

---

## 🎯 ROADMAP E MELHORIAS FUTURAS

### **Possíveis Melhorias:**

1. **Threshold adaptativo**
   - Ajustar threshold de interesse baseado em histórico
   - Ex: Se lead sempre responde curto, reduzir threshold

2. **Keywords dinâmicas**
   - Aprender novas keywords de conversas bem-sucedidas
   - Machine learning para identificar padrões

3. **Multi-idioma**
   - Adicionar suporte para inglês, espanhol
   - Keywords multilíngues

4. **Analytics dashboard**
   - Taxa de handoff SDR → Specialist
   - Taxa de qualificação (score médio)
   - Taxa de agendamento

5. **A/B Testing de mensagens**
   - Testar diferentes primeiras mensagens
   - Testar diferentes propostas de horário

---

## 📞 SUPORTE E CONTATO

**Documentação criada em:** 2025-10-21
**Versão do sistema:** 1.0
**Status:** ✅ Produção

Para dúvidas ou sugestões, consulte os documentos específicos:
- Dúvidas técnicas → `LOGICA_MULTI_AGENTES_COMPLETA.md`
- Ajuste de thresholds → `KEYWORDS_E_THRESHOLDS.md`
- Visualização de fluxos → `FLUXO_VISUAL_COMPLETO.md`

---

## 🏆 CHANGELOG

### **v1.0 (2025-10-21)**
- ✅ Sistema multi-agente 100% funcional
- ✅ Bot detection com 6 sinais
- ✅ DOR detection (Growth/Sites/Audio)
- ✅ BANT collection completo
- ✅ Google Calendar integration
- ✅ Threshold de interesse ajustado para 5% (era 20%)
- ✅ Fallback para DOR genérica quando interesse ≥5%
- ✅ 18 keywords de interesse (expandido de 9)
- ✅ Todos os testes passando
- ✅ Documentação completa

---

**🎉 Sistema pronto para uso em produção!**

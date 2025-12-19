# ANALISE DA ARQUITETURA - 3 AGENTES (SDR, Specialist, Scheduler)

## DOCUMENTAÇÃO COMPLETA CRIADA

Este projeto contém uma análise detalhada da arquitetura de 3 agentes de IA para qualificação de leads. Foram criados 3 documentos principais:

### 1. ANALISE_ARQUITETURA_3_AGENTES.md (28KB)
**Análise técnica completa e detalhada**

Contém:
- Fluxo geral e handoffs entre agentes
- Estrutura de dados (Canonical Lead State Schema)
- Detalhes de cada agente (SDR, Specialist, Scheduler)
- Configuração BANT V2 com 4 stages
- Algoritmo de processamento BANT
- Persistência de dados
- Campos BANT e armazenamento
- 5 mudanças para refatoração com código exato
- Matriz de implementação
- Checklist de testes

**Use este documento para:**
- Entender a arquitetura completa
- Ver exemplos de código
- Aprender como dados fluem entre agentes
- Ver linhas exatas dos arquivos a modificar

---

### 2. RESUMO_MODIFICACOES_REFATORACAO.md (16KB)
**Guia executivo para implementação das mudanças**

Contém:
- TL;DR - Pontos críticos
- Estrutura de dados atual
- Fluxos de handoff
- Onde dados são armazenados
- 5 mudanças descritas brevemente:
  - A: Adicionar "nicho" no NEED
  - B: Personalizar BUDGET por nicho
  - C: Roteiro de objeção de preço
  - D: Regra "1 pergunta por mensagem"
  - E: Limite de tamanho de mensagem
- Matriz de implementação
- Ordem de implementação (4 fases)
- Checklist de validação
- Exemplo de fluxo completo
- Validação pós-implementação

**Use este documento para:**
- Planejar a implementação
- Entender quais arquivos modificar
- Validar que tudo está funcionando
- Exemplo prático de como tudo se conecta

---

### 3. DIAGRAMA_ARQUITETURA.md (27KB)
**Diagramas visuais da arquitetura**

Contém:
- Fluxo geral com pontos de armazenamento
- Estrutura de dados com árvore visual
- Fluxo SDR Agent
- Fluxo Specialist Agent - BANT V2
- Fluxo Specialist - Processamento de mensagem
- Fluxo Scheduler Agent
- Fluxo de persistência
- Mapa de personalização por nicho
- Detecção e fluxo de objeção de preço
- Matriz de endpoints e armazenamento

**Use este documento para:**
- Visualizar fluxos
- Entender onde dados são salvos
- Rastrear o caminho de uma mensagem
- Apresentar arquitetura para equipe

---

## ESTRUTURA RÁPIDA

```
LEAD NOVO
    ↓
[SDR AGENT] Coleta: nome, empresa, setor
    ↓ (handoff)
[SPECIALIST AGENT] Executa BANT V2 (4 stages):
    • NEED (7 campos): nicho, problema, serviço, intensidade, consequências, receita, funcionários
    • BUDGET (3 campos): investimento personalizado por nicho, ROI, flexibilidade
    • AUTHORITY (3 campos): decisor, autonomia, processo
    • TIMING (2 campos): urgência, prazo
    ↓ (handoff)
[SCHEDULER AGENT] Agenda reunião:
    • Coleta email
    • Propõe horários
    • Cria evento no Google Calendar
    • Cria oportunidade no Pipeline (Google Sheets)
```

---

## ARMAZENAMENTO DOS DADOS

**Única fonte de verdade**: `leadState` em SQLite (`orbion.db`)

```
leadState {
  phoneNumber: "5584987654321",
  currentAgent: "sdr|specialist|scheduler",
  companyProfile: { nome, empresa, setor },  ← NICHO aqui
  bantStages: {
    stageData: {
      need: { campos: {...} },     ← 7 campos
      budget: { campos: {...} },   ← 3 campos (personalizado)
      authority: { campos: {...} }, ← 3 campos
      timing: { campos: {...} }    ← 2 campos
    }
  },
  scheduler: { stage, email, meetingData },
  metadata: { timestamps, flags }
}
```

---

## DETECÇÃO DE NICHO

**Fluxo:**
1. SDR coleta: "João, tenho uma clínica"
2. Armazena como rawResponse
3. Specialist extrai com GPT: `setor = "Clínica"`
4. Armazena em: `leadState.companyProfile.setor`
5. Usa para personalização:
   - NEED: Exemplos específicos do setor
   - BUDGET: Preço diferente (Clínica: R$ 297 vs Mercado: R$ 197)
   - Resposta GPT: "Em clínica, o problema geralmente é..."

---

## 5 MUDANÇAS PARA IMPLEMENTAÇÃO

### A: Adicionar "nicho" ao Stage NEED
- **Arquivo**: `src/tools/bant_stages_v2.js`
- **Mudança**: Adicionar campo ao `STAGE_REQUIREMENTS[need]`
- **Impacto**: 7 campos essenciais (antes eram 6)

### B: Personalizar BUDGET por Nicho
- **Arquivo**: `src/tools/bant_stages_v2.js`
- **Mudança**: Adicionar `budgetContext` ao prompt GPT
- **Impacto**: Preço oferecido varia por setor

### C: Objeção de Preço
- **Arquivo**: Novo `src/tools/price_objection_handler.js`
- **Mudança**: Detectar "é caro" e responder com ROI
- **Impacto**: Maior taxa de conversão

### D: 1 Pergunta por Mensagem
- **Arquivo**: `src/tools/bant_stages_v2.js`
- **Mudança**: Validar no máximo 1 pergunta
- **Impacto**: UX melhor, menos confusão

### E: Limite de Tamanho
- **Arquivo**: `src/tools/bant_stages_v2.js`
- **Mudança**: Truncar respostas > 500 chars
- **Impacto**: WhatsApp UI melhor

---

## IMPLEMENTAÇÃO RECOMENDADA

### Fase 1: Fundação (1-2 horas)
- Implementar Mudança A (adicionar nicho)
- Testar que nicho é coletado

### Fase 2: Personalização (2-3 horas)
- Implementar Mudança B (budget personalizado)
- Testar que preço varia por nicho

### Fase 3: Objeções (2-3 horas)
- Implementar Mudança C (price_objection_handler)
- Testar detecção e resposta

### Fase 4: Qualidade (1-2 horas)
- Implementar Mudanças D e E (validação)
- Testes finais

**Total**: ~6-10 horas de desenvolvimento

---

## COMO USAR ESTA DOCUMENTAÇÃO

### Para Desenvolvedores:
1. Leia **RESUMO_MODIFICACOES_REFATORACAO.md** para entender o que fazer
2. Consulte **ANALISE_ARQUITETURA_3_AGENTES.md** para detalhes técnicos
3. Refira-se a **DIAGRAMA_ARQUITETURA.md** para visualizar fluxos

### Para Product Managers:
1. Veja **DIAGRAMA_ARQUITETURA.md** para entender fluxo
2. Leia **RESUMO_MODIFICACOES_REFATORACAO.md** - seção "Fase 1-4"
3. Use **ANALISE_ARQUITETURA_3_AGENTES.md** - Checklist de Testes para validação

### Para Arquitetos:
1. Comece com **ANALISE_ARQUITETURA_3_AGENTES.md** - seções 1-5
2. Estude **DIAGRAMA_ARQUITETURA.md** para fluxos completos
3. Revise mudanças em **RESUMO_MODIFICACOES_REFATORACAO.md** - Seção 5-6

---

## PONTOS CRÍTICOS

1. **Dados nunca são duplicados**: `leadState` é a única fonte de verdade
2. **Setor/Nicho é crítico**: Usado para personalização em BUDGET e resposta GPT
3. **Handoffs são silenciosos**: O agente anterior não envia mensagem
4. **BANT é sem loops**: Detecta loop infinito e força avanço após 10 tentativas
5. **Persistência é automática**: Após cada mensagem, estado é salvo no banco

---

## ARQUIVOS A MODIFICAR

### Necessários (3 arquivos):
- `src/tools/bant_stages_v2.js` (Mudanças A, B, D, E)
- `src/schemas/leadState.schema.js` (Mudança A - reflexo)
- `src/tools/price_objection_handler.js` (NOVO - Mudança C)

### NÃO modificar (compatibilidade mantida):
- `src/agents/sdr_agent.js`
- `src/agents/specialist_agent.js`
- `src/agents/scheduler_agent.js`
- `src/agents/agent_hub.js`

---

## VALIDAÇÃO RÁPIDA

Após implementar, verificar:
- [ ] Lead coleta nicho no NEED
- [ ] BUDGET oferece preço diferente por nicho
- [ ] Objeção "é caro" é detectada
- [ ] Resposta tem no máx 1 pergunta
- [ ] Nenhuma mensagem > 500 caracteres
- [ ] Google Sheets sincroniza com setor
- [ ] Pipeline mostra todos os dados BANT

---

## PRÓXIMOS PASSOS

1. **Ler**: Comece com RESUMO_MODIFICACOES_REFATORACAO.md (15 min)
2. **Estudar**: Leia ANALISE_ARQUITETURA_3_AGENTES.md em detalhes (30 min)
3. **Visualizar**: Explore DIAGRAMA_ARQUITETURA.md (15 min)
4. **Implementar**: Siga a ordem Fase 1-4 (6-10 horas)
5. **Testar**: Use checklist de validação (1-2 horas)

---

## Suporte

Todos os 3 documentos estão no root do projeto:
- `/ANALISE_ARQUITETURA_3_AGENTES.md`
- `/RESUMO_MODIFICACOES_REFATORACAO.md`
- `/DIAGRAMA_ARQUITETURA.md`

Números de linha e nomes de arquivo são precisos para o código atual.

**Última atualização**: 18 de novembro de 2024
**Versão do código analisado**: agent-js-starter (main branch, atual)


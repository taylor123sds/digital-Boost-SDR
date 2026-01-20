# 🎯 Sistema de Qualificação por Serviços - Plano de Implementação

**Data**: 2025-11-17
**Status**: 🟡 Em Implementação
**Versão**: 1.0.0

---

## 📋 Objetivo

Estruturar o sistema de qualificação BANT para:
1. ✅ **Identificar a dor** do cliente no estágio NEED
2. ✅ **Classificar automaticamente** qual serviço resolve essa dor
3. ✅ **Direcionar a conversa** com base no serviço identificado
4. ✅ **Separar leads por serviço** no dashboard

---

## 🏗️ Arquitetura do Sistema

### Catálogo de Serviços (✅ CRIADO)

**Arquivo**: `src/config/services_catalog.js`

```
SERVIÇOS OFERECIDOS:
├── 📈 GROWTH - Growth Marketing
│   └── Dores: vendas baixas, falta leads, conversão baixa
│
├── 📱 SOCIAL MEDIA - Gestão de Redes Sociais
│   └── Dores: sem presença digital, engajamento baixo
│
├── 🤖 IA - Inteligência Artificial
│   └── Dores: atendimento lento, processos manuais
│
└── 🌐 SITES - Sites & Landing Pages
    └── Dores: site ruim, não converte, sem site
```

### Sistema de Classificação

```javascript
// INPUT: Dor do cliente
const dor = "Vendas estão muito baixas, não conseguimos gerar leads";

// PROCESSAMENTO: Mapeamento dor → serviço
const resultado = classificarServicoPorDor(dor);

// OUTPUT: Serviço identificado
{
  servico: 'growth',          // ID do serviço
  confianca: 85,              // 0-100%
  alternativas: [],           // Outros serviços possíveis
  detalhes: {
    nome: 'Growth Marketing',
    emoji: '📈',
    resultados: [...],
    investimentoMedio: 8000
  }
}
```

---

## 📊 Fluxo de Qualificação Melhorado

### ANTES (Sistema Atual)

```
SDR Agent
    ↓
SPECIALIST → NEED Stage
    ↓
Pergunta genérica: "Qual o problema?"
    ↓
Armazena em: problema_principal
    ↓
Budget → Authority → Timing
    ↓
SCHEDULER
```

**Problema**: Não há direcionamento específico por serviço

### DEPOIS (Sistema Novo)

```
SDR Agent
    ↓
SPECIALIST → NEED Stage
    ↓
Pergunta consultiva: "Qual área tá mais crítica?"
    ↓
IDENTIFICA DOR → CLASSIFICA SERVIÇO
    ↓
Armazena em:
├── problema_principal: "vendas baixas"
├── servico_identificado: "growth"
└── confianca_servico: 85
    ↓
Mensagem personalizada: "Nosso Growth Marketing resolve isso"
    ↓
Budget (com contexto do serviço)
    ↓
Authority → Timing
    ↓
SCHEDULER
```

**Benefício**: Conversa direcionada, lead sabe exatamente qual serviço vai receber

---

## 🎯 Modificações Necessárias

### 1. BANT Stage NEED (✅ EM PROGRESSO)

**Arquivo**: `src/tools/bant_stages_v2.js`

#### Adicionar campo `servico_identificado`

```javascript
const STAGE_REQUIREMENTS = {
  need: {
    camposEssenciais: [
      'problema_principal',
      'intensidade_problema',
      'consequencias',
      'receita_mensal',
      'funcionarios',
      'servico_identificado'  // ✅ NOVO
    ],
    // ...
  }
}
```

#### Modificar `processMessage()` no NEED

```javascript
// Após extrair problema_principal
if (stage === 'need' && extractedData.problema_principal) {
  // Classificar serviço
  const classificacao = classificarServicoPorDor(extractedData.problema_principal);

  if (classificacao.servico) {
    extractedData.servico_identificado = classificacao.servico;
    extractedData.confianca_servico = classificacao.confianca;

    // Gerar mensagem personalizada
    const mensagemTransicao = gerarMensagemTransicao(
      classificacao.servico,
      extractedData.problema_principal
    );

    // Incluir na resposta ao lead
    response += `\n\n${mensagemTransicao}`;
  }
}
```

### 2. Lead State (❌ PENDENTE)

**Arquivo**: `src/tools/conversation_manager.js` ou similar

#### Adicionar campos ao estado do lead

```javascript
const leadState = {
  // ... campos existentes
  servico_identificado: null,    // 'growth' | 'social_media' | 'ia' | 'sites'
  confianca_servico: 0,          // 0-100
  servicoDetalhes: null          // SERVICE_DETAILS[servico]
}
```

### 3. Dashboard - Funil BANT (❌ PENDENTE)

**Arquivo**: `public/dashboard-pro.html`

#### Modificar coluna NEED para agrupar por serviço

**ANTES**:
```
🔍 NEED (12 leads)
├── João Silva (Tech Co)
├── Maria Santos (Digital Agency)
├── Pedro Costa (E-commerce)
└── ...
```

**DEPOIS**:
```
🔍 NEED (12 leads)
│
├─── 📈 GROWTH (5 leads)
│    ├── João Silva - vendas baixas
│    └── Maria Santos - falta leads
│
├─── 📱 SOCIAL MEDIA (3 leads)
│    └── Pedro Costa - sem presença digital
│
├─── 🤖 IA (2 leads)
│    └── Ana Lima - atendimento lento
│
├─── 🌐 SITES (1 lead)
│    └── Carlos Mendes - site ruim
│
└─── ❓ NÃO CLASSIFICADO (1 lead)
     └── Lead sem serviço definido
```

**Estrutura HTML**:
```html
<div class="kanban-column column-need">
  <div class="column-header">
    <div class="column-title">🔍 NEED</div>
    <div class="column-count">12</div>
  </div>

  <div class="column-cards">
    <!-- 📈 GROWTH -->
    <div class="service-group">
      <div class="service-group-header">
        📈 Growth Marketing (5)
      </div>
      <div class="service-group-cards">
        <!-- Cards dos leads deste serviço -->
      </div>
    </div>

    <!-- 📱 SOCIAL MEDIA -->
    <div class="service-group">
      <div class="service-group-header">
        📱 Social Media (3)
      </div>
      <div class="service-group-cards">
        <!-- Cards dos leads deste serviço -->
      </div>
    </div>

    <!-- ... outros serviços -->
  </div>
</div>
```

**CSS Necessário**:
```css
.service-group {
  margin-bottom: 16px;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px;
  background: rgba(0, 0, 0, 0.2);
}

.service-group-header {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  padding: 6px 10px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 8px;
  color: var(--cyan);
}

.service-group-cards {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
```

### 4. Prompt NEED Melhorado (❌ PENDENTE)

**Arquivo**: `src/tools/bant_stages_v2.js`

#### Mensagem de abertura mais consultiva

**ANTES**:
```
"Perfeito! Vamos começar entendendo o que tá travando o crescimento de vocês. 🎯

Nossos dados mostram que 70% dos problemas vêm de: geração de leads, conversão, ou retenção de clientes.

No caso de vocês, qual dessas áreas tá mais crítica hoje?"
```

**DEPOIS**:
```
"Perfeito! Vamos começar entendendo **qual área tá mais travando o crescimento** de vocês. 🎯

Nossos clientes geralmente enfrentam desafios em uma dessas áreas:

📈 **Vendas & Leads** - Vendas baixas, falta de leads qualificados, conversão baixa
📱 **Presença Digital** - Redes sociais paradas, sem engajamento, marca fraca
🤖 **Atendimento** - Atendimento lento, equipe sobrecarregada, sem automação
🌐 **Site** - Site ruim, não converte, não aparece no Google

Qual dessas áreas tá **mais crítica** pra [EMPRESA] hoje?"
```

---

## 📈 Benefícios do Sistema

### Para o Lead
✅ Conversa mais direcionada e consultiva
✅ Sabe exatamente qual serviço vai resolver sua dor
✅ Mensagens personalizadas com dados relevantes
✅ Maior confiança na solução proposta

### Para a Empresa
✅ Leads pré-classificados por serviço
✅ Dashboard organizado por linha de negócio
✅ Métricas por serviço (conversão, investimento médio)
✅ Melhor alocação da equipe de vendas

### Para o Sistema
✅ Dados estruturados para análise
✅ Possibilidade de criar relatórios por serviço
✅ Identificação de serviços mais demandados
✅ Base para precificação dinâmica

---

## 🧪 Exemplos de Uso

### Exemplo 1: Lead de Growth

```
LEAD: "Nossas vendas estão muito baixas, não conseguimos gerar leads qualificados"

SISTEMA:
1. Extrai problema_principal: "vendas baixas, falta leads qualificados"
2. Classifica serviço: GROWTH (confiança: 92%)
3. Armazena: servico_identificado = 'growth'
4. Gera mensagem personalizada:

"Perfeito! 📈 Pelo que você descreveu, nosso serviço de **Growth Marketing** é ideal pra resolver isso.

Aceleração de crescimento com dados

Nossos clientes nesse cenário geralmente veem: aumento de 3-5x em leads qualificados.

Vamos falar sobre investimento agora? 💰"
```

### Exemplo 2: Lead de Social Media

```
LEAD: "Nossas redes sociais estão paradas, sem engajamento nenhum"

SISTEMA:
1. Extrai problema_principal: "redes sociais paradas, sem engajamento"
2. Classifica serviço: SOCIAL_MEDIA (confiança: 88%)
3. Armazena: servico_identificado = 'social_media'
4. Gera mensagem personalizada:

"Perfeito! 📱 Pelo que você descreveu, nosso serviço de **Social Media** é ideal pra resolver isso.

Presença digital que vende

Nossos clientes nesse cenário geralmente veem: crescimento de 2-4x em seguidores qualificados.

Vamos falar sobre investimento agora? 💰"
```

---

## 🔧 Implementação Técnica

### Ordem de Implementação

1. ✅ **Catálogo de Serviços** → `src/config/services_catalog.js` (CRIADO)
2. ⏳ **Integração BANT** → Modificar `bant_stages_v2.js` (EM PROGRESSO)
3. ⏳ **Lead State** → Adicionar campos de serviço
4. ⏳ **Dashboard** → Agrupar por serviço na coluna NEED
5. ⏳ **Testes** → Validar com diferentes cenários

### Arquivos a Modificar

| Arquivo | Modificação | Status |
|---------|-------------|--------|
| `src/config/services_catalog.js` | Criar catálogo | ✅ FEITO |
| `src/tools/bant_stages_v2.js` | Integrar classificação | ⏳ PRÓXIMO |
| `src/agents/specialist_agent.js` | Passar serviço ao estado | ⏳ PENDENTE |
| `src/tools/conversation_manager.js` | Adicionar campos | ⏳ PENDENTE |
| `public/dashboard-pro.html` | Agrupar por serviço | ⏳ PENDENTE |

---

## 📊 Métricas e Análise

### Dados que Poderemos Extrair

1. **Por Serviço**:
   - Quantidade de leads por serviço
   - Taxa de conversão por serviço
   - Investimento médio por serviço
   - Ciclo de vendas por serviço

2. **Por Dor**:
   - Dores mais comuns
   - Dores com maior conversão
   - Mapeamento dor → serviço → resultado

3. **Por Estágio BANT**:
   - Leads em NEED por serviço
   - Leads em BUDGET por serviço
   - Taxa de avanço por serviço

---

## ✅ Próximos Passos

### Agora
- [x] Criar catálogo de serviços
- [ ] Integrar classificação no BANT
- [ ] Melhorar prompt NEED

### Em Seguida
- [ ] Modificar dashboard
- [ ] Adicionar métricas por serviço
- [ ] Testar com leads reais

### Futuro
- [ ] IA para sugerir serviços complementares
- [ ] Precificação dinâmica por serviço
- [ ] Análise preditiva de conversão

---

**Última atualização**: 2025-11-17 14:30
**Responsável**: Equipe ORBION
**Status**: 🟡 Implementação em andamento

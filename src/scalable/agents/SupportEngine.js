/**
 * @file SupportEngine.js
 * @description Motor de ATENDIMENTO ao cliente - SEM funcao de SDR
 *
 * Este motor e DIFERENTE do ConfigurableConsultativeEngine:
 * - NAO usa SPIN Selling
 * - NAO qualifica leads (sem BANT)
 * - NAO agenda reunioes
 * - Foca em resolucao de problemas e FAQ
 * - Tem logica de escalacao para humano
 *
 * Arquitetura:
 * - ANALYZER: Detecta intencao e prioridade
 * - RESPONDER: Gera resposta empática e util
 * - CHECKER: Valida tom e completude
 */

import OpenAI from 'openai';
import { JUNG_ARCHETYPES } from './AgentTemplates.js';

// Estados de conversa do suporte
const SUPPORT_STATES = {
  greeting: { name: 'Saudacao', nextStates: ['identifying_issue'] },
  identifying_issue: { name: 'Identificando Problema', nextStates: ['resolving', 'clarifying', 'escalating'] },
  clarifying: { name: 'Clarificando', nextStates: ['resolving', 'escalating'] },
  resolving: { name: 'Resolvendo', nextStates: ['confirming', 'escalating'] },
  confirming: { name: 'Confirmando Resolucao', nextStates: ['closing', 'resolving'] },
  escalating: { name: 'Escalando', nextStates: ['closing'] },
  closing: { name: 'Fechamento', nextStates: [] }
};

// Categorias de problema
const ISSUE_CATEGORIES = {
  technical: {
    name: 'Problema Tecnico',
    keywords: ['erro', 'bug', 'nao funciona', 'travou', 'nao carrega', 'problema'],
    escalateTo: 'suporte_tecnico',
    priority: 'high'
  },
  billing: {
    name: 'Cobranca/Pagamento',
    keywords: ['pagamento', 'cobranca', 'fatura', 'boleto', 'cartao', 'preco', 'valor'],
    escalateTo: 'financeiro',
    priority: 'medium'
  },
  cancellation: {
    name: 'Cancelamento',
    keywords: ['cancelar', 'cancelamento', 'desistir', 'nao quero mais', 'encerrar'],
    escalateTo: 'retencao',
    priority: 'high'
  },
  sales: {
    name: 'Vendas',
    keywords: ['comprar', 'contratar', 'plano', 'upgrade', 'mais informacoes', 'quanto custa'],
    escalateTo: 'comercial',
    priority: 'low'
  },
  general: {
    name: 'Duvida Geral',
    keywords: ['duvida', 'pergunta', 'como', 'quando', 'onde', 'qual'],
    escalateTo: null,
    priority: 'low'
  }
};

/**
 * Motor de Suporte ao Cliente
 */
export class SupportEngine {
  /**
   * @param {string} contactId - ID do contato
   * @param {Object} config - Configuracao do agente (do AgentConfigSchema)
   */
  constructor(contactId, config) {
    this.contactId = contactId;
    this.config = config;

    // OpenAI client
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Estado da conversa
    this.turno = 0;
    this.historico = [];

    // Estado do suporte
    this.supportState = {
      currentState: 'greeting',
      issueCategory: null,
      issueSummary: null,
      priority: 'low',
      escalated: false,
      escalatedTo: null,
      resolved: false
    };

    // Dados do cliente
    this.cliente = {
      nome: null,
      telefone: contactId,
      ultimoContato: null
    };

    // Arquetipo default e Cuidador para suporte
    this.archetype = JUNG_ARCHETYPES.cuidador;

    console.log(`[SUPPORT-ENGINE] Inicializado para ${contactId}`);
  }

  /**
   * Processa mensagem do cliente e gera resposta
   * @param {string} userMessage - Mensagem do cliente
   * @returns {Promise<Object>} Resposta estruturada
   */
  async processMessage(userMessage) {
    this.turno++;
    console.log(`\n${'='.repeat(60)}`);
    console.log(`[SUPPORT] Turno ${this.turno} - Processando: "${userMessage.substring(0, 50)}..."`);

    // Adicionar ao historico
    this.historico.push({ role: 'user', content: userMessage });

    // STEP 1: ANALYZER - Detecta intencao e prioridade
    const analysis = await this._runAnalyzer(userMessage);

    // Atualizar estado baseado na analise
    this._updateState(analysis);

    // STEP 2: RESPONDER - Gera resposta
    let response = await this._runResponder(analysis);

    // STEP 3: CHECKER - Valida resposta
    let checkResult = this._runChecker(response, userMessage);

    if (!checkResult.valid) {
      console.log(`   [CHECKER] Issues: ${checkResult.issues.join(', ')}`);
      response = await this._regenerateResponse(analysis, checkResult.issues);
    }

    // Adicionar resposta ao historico
    this.historico.push({ role: 'assistant', content: response });

    // Verificar se deve escalar
    const shouldEscalate = this._shouldEscalate();

    return {
      message: response,
      state: this.supportState.currentState,
      issueCategory: this.supportState.issueCategory,
      priority: this.supportState.priority,
      escalated: shouldEscalate,
      escalatedTo: shouldEscalate ? this.supportState.escalatedTo : null,
      resolved: this.supportState.resolved,
      turno: this.turno
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ANALYZER - Detecta intencao, categoria e prioridade
  // ═══════════════════════════════════════════════════════════════════════════

  async _runAnalyzer(userMessage) {
    const prompt = `Voce e um analisador de suporte ao cliente.
Analise a mensagem do cliente e identifique:

═══════════════════════════════════════════════════════════════════════════════
CONTEXTO
═══════════════════════════════════════════════════════════════════════════════
Empresa: ${this.config?.identity?.companyName || 'N/A'}
Produto: ${this.config?.business?.productName || this.config?.identity?.productName || 'N/A'}
Estado atual: ${SUPPORT_STATES[this.supportState.currentState]?.name || 'Novo'}
${this.supportState.issueCategory ? `Categoria ja identificada: ${this.supportState.issueCategory}` : ''}
${this.supportState.issueSummary ? `Problema: ${this.supportState.issueSummary}` : ''}

═══════════════════════════════════════════════════════════════════════════════
HISTORICO RECENTE
═══════════════════════════════════════════════════════════════════════════════
${this.historico.slice(-6).map(m => `${m.role === 'user' ? 'CLIENTE' : 'SUPORTE'}: ${m.content}`).join('\n')}

═══════════════════════════════════════════════════════════════════════════════
MENSAGEM DO CLIENTE
═══════════════════════════════════════════════════════════════════════════════
"${userMessage}"

═══════════════════════════════════════════════════════════════════════════════
CATEGORIAS DISPONIVEIS
═══════════════════════════════════════════════════════════════════════════════
${Object.entries(ISSUE_CATEGORIES).map(([key, cat]) => `- ${key}: ${cat.name} (keywords: ${cat.keywords.join(', ')})`).join('\n')}

Responda em JSON:
{
  "intent": "saudacao|pergunta|reclamacao|solicitacao|feedback|despedida",
  "sentiment": "positivo|neutro|negativo|frustrado|irritado",
  "category": "technical|billing|cancellation|sales|general",
  "priority": "low|medium|high|urgent",
  "issueSummary": "resumo do problema em 1 frase ou null",
  "needsClarification": true/false,
  "clarificationQuestion": "pergunta de clarificacao se necessario ou null",
  "canResolve": true/false,
  "suggestedResponse": "sugestao de abordagem (nao a resposta completa)",
  "shouldEscalate": true/false,
  "escalateReason": "motivo para escalar ou null"
}`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: this.config?.aiConfig?.model || 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 500,
        response_format: { type: 'json_object' }
      });

      return JSON.parse(completion.choices[0].message.content);
    } catch (e) {
      console.error(`   [ANALYZER] Erro: ${e.message}`);
      // Fallback: deteccao basica por keywords
      return this._basicAnalysis(userMessage);
    }
  }

  /**
   * Analise basica por keywords (fallback)
   */
  _basicAnalysis(message) {
    const msgLower = message.toLowerCase();

    let category = 'general';
    let priority = 'low';

    for (const [cat, config] of Object.entries(ISSUE_CATEGORIES)) {
      if (config.keywords.some(kw => msgLower.includes(kw))) {
        category = cat;
        priority = config.priority;
        break;
      }
    }

    return {
      intent: 'solicitacao',
      sentiment: 'neutro',
      category,
      priority,
      issueSummary: null,
      needsClarification: true,
      canResolve: false,
      shouldEscalate: false
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RESPONDER - Gera resposta empatica e util
  // ═══════════════════════════════════════════════════════════════════════════

  async _runResponder(analysis) {
    const archetype = this.archetype;
    const state = this.supportState.currentState;
    const category = analysis.category || this.supportState.issueCategory;
    const categoryConfig = ISSUE_CATEGORIES[category] || ISSUE_CATEGORIES.general;

    const prompt = `Voce e um atendente de suporte da ${this.config?.identity?.companyName || 'empresa'}.
Escreva UMA mensagem para o cliente seguindo as diretrizes abaixo.

═══════════════════════════════════════════════════════════════════════════════
ARQUETIPO: CUIDADOR
═══════════════════════════════════════════════════════════════════════════════
Tom: ${archetype.tone.style}
Como falar: ${archetype.tone.voice}
Gatilhos: ${archetype.emotionalTriggers.join(', ')}
EVITAR: ${archetype.avoid.join(', ')}

═══════════════════════════════════════════════════════════════════════════════
CONTEXTO
═══════════════════════════════════════════════════════════════════════════════
Empresa: ${this.config?.identity?.companyName || 'N/A'}
Produto: ${this.config?.business?.productName || 'N/A'}
Seu nome: ${this.config?.identity?.agentName || 'Atendente'}

═══════════════════════════════════════════════════════════════════════════════
ANALISE DA MENSAGEM
═══════════════════════════════════════════════════════════════════════════════
Intencao: ${analysis.intent}
Sentimento: ${analysis.sentiment}
Categoria: ${categoryConfig.name}
Prioridade: ${analysis.priority}
${analysis.issueSummary ? `Problema: ${analysis.issueSummary}` : ''}
${analysis.needsClarification ? `Precisa clarificar: ${analysis.clarificationQuestion}` : ''}

═══════════════════════════════════════════════════════════════════════════════
ESTADO ATUAL: ${SUPPORT_STATES[state]?.name || state}
═══════════════════════════════════════════════════════════════════════════════
${state === 'greeting' ? `
PRIMEIRA MENSAGEM:
- Cumpimente de forma calorosa
- Apresente-se com seu nome
- Pergunte como pode ajudar
` : ''}
${state === 'identifying_issue' ? `
IDENTIFICANDO PROBLEMA:
- Valide o que o cliente disse
- Faca pergunta especifica sobre o problema
- Mostre que esta disposto a ajudar
` : ''}
${state === 'clarifying' ? `
CLARIFICANDO:
- Use a pergunta: ${analysis.clarificationQuestion || 'Peça mais detalhes'}
- Seja especifico no que precisa saber
- Mantenha tom acolhedor
` : ''}
${state === 'resolving' ? `
RESOLVENDO:
- Ofereca a solucao de forma clara
- Use passos numerados se necessario
- Pergunte se ficou claro
` : ''}
${state === 'confirming' ? `
CONFIRMANDO:
- Pergunte se o problema foi resolvido
- Ofereca-se para ajudar com mais algo
- Se nao resolveu, pergunte o que falta
` : ''}
${state === 'escalating' ? `
ESCALANDO:
- Explique que vai transferir para ${categoryConfig.escalateTo || 'especialista'}
- Garanta que o problema sera resolvido
- Agradeca a paciencia
` : ''}
${state === 'closing' ? `
FECHAMENTO:
- Agradeca o contato
- Coloque-se a disposicao
- Despeca-se de forma calorosa
` : ''}

${analysis.shouldEscalate ? `
═══════════════════════════════════════════════════════════════════════════════
ESCALACAO NECESSARIA
═══════════════════════════════════════════════════════════════════════════════
Motivo: ${analysis.escalateReason}
Encaminhar para: ${categoryConfig.escalateTo}
` : ''}

═══════════════════════════════════════════════════════════════════════════════
REGRAS DE ESTILO
═══════════════════════════════════════════════════════════════════════════════
- Maximo 6 linhas
- Tom empatico e acolhedor
- NUNCA seja frio ou robotico
- Use nome do cliente se souber
- Maximo 2 perguntas

═══════════════════════════════════════════════════════════════════════════════
IMPORTANTE - VOCE NAO E VENDEDOR
═══════════════════════════════════════════════════════════════════════════════
- NAO faca perguntas de qualificacao (BANT/SPIN)
- NAO tente vender ou fazer upsell
- NAO agende reunioes
- FOCO: Resolver o problema do cliente

Escreva APENAS a mensagem:`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: this.config?.aiConfig?.model || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: prompt },
          ...this.historico.slice(-6)
        ],
        temperature: 0.6,
        max_tokens: 400
      });

      return completion.choices[0].message.content.trim();
    } catch (e) {
      console.error(`   [RESPONDER] Erro: ${e.message}`);
      return this._getFallbackResponse(state);
    }
  }

  /**
   * Resposta de fallback por estado
   */
  _getFallbackResponse(state) {
    const responses = {
      greeting: 'Ola! Seja bem-vindo. Como posso ajudar voce hoje?',
      identifying_issue: 'Entendi. Pode me dar mais detalhes sobre isso?',
      clarifying: 'Preciso de mais uma informacao para ajudar melhor. Pode me explicar com mais detalhes?',
      resolving: 'Vou verificar isso para voce. Um momento, por favor.',
      confirming: 'Consegui resolver sua questao? Posso ajudar com mais alguma coisa?',
      escalating: 'Vou encaminhar seu caso para um especialista que vai te ajudar. Aguarde o contato em breve.',
      closing: 'Foi um prazer ajudar! Se precisar de algo mais, e so chamar. Tenha um otimo dia!'
    };
    return responses[state] || 'Como posso ajudar?';
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CHECKER - Valida tom e completude
  // ═══════════════════════════════════════════════════════════════════════════

  _runChecker(message, originalMessage) {
    const issues = [];

    // 1. Verifica tom (nao pode ser frio/robotico)
    const coldWords = ['atenciosamente', 'sem mais', 'informamos', 'prezado'];
    const msgLower = message.toLowerCase();
    if (coldWords.some(w => msgLower.includes(w))) {
      issues.push('tom_frio');
    }

    // 2. Verifica tamanho
    const lines = message.split('\n').filter(l => l.trim().length > 0);
    if (lines.length > 8) {
      issues.push('muito_longo');
    }

    // 3. Verifica se tem tentativa de venda
    const salesWords = ['aproveite', 'promocao', 'desconto especial', 'agende uma demonstracao'];
    if (salesWords.some(w => msgLower.includes(w))) {
      issues.push('tentativa_venda');
    }

    // 4. Verifica perguntas de qualificacao
    const qualificationPatterns = [
      /qual (seu|o) (budget|orcamento)/i,
      /quem (decide|e o decisor)/i,
      /quando (pretende|planeja)/i
    ];
    if (qualificationPatterns.some(p => p.test(message))) {
      issues.push('pergunta_qualificacao');
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * Regenera resposta corrigindo issues
   */
  async _regenerateResponse(analysis, issues) {
    const fixInstructions = issues.map(issue => {
      switch (issue) {
        case 'tom_frio': return 'Use tom mais humano e acolhedor';
        case 'muito_longo': return 'Seja mais conciso (max 6 linhas)';
        case 'tentativa_venda': return 'REMOVA qualquer tentativa de venda - voce e SUPORTE';
        case 'pergunta_qualificacao': return 'REMOVA perguntas de qualificacao - voce NAO e SDR';
        default: return `Corrija: ${issue}`;
      }
    }).join('. ');

    const prompt = `Reescreva esta resposta de suporte corrigindo:
${fixInstructions}

IMPORTANTE: Voce e SUPORTE, nao vendedor. Foco em AJUDAR o cliente.

Escreva APENAS a mensagem corrigida:`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: this.config?.aiConfig?.model || 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
        max_tokens: 300
      });

      return completion.choices[0].message.content.trim();
    } catch (e) {
      return this._getFallbackResponse(this.supportState.currentState);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STATE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Atualiza estado baseado na analise
   */
  _updateState(analysis) {
    const currentState = this.supportState.currentState;

    // Atualizar categoria se identificada
    if (analysis.category && analysis.category !== 'general') {
      this.supportState.issueCategory = analysis.category;
    }

    // Atualizar resumo do problema
    if (analysis.issueSummary) {
      this.supportState.issueSummary = analysis.issueSummary;
    }

    // Atualizar prioridade
    if (analysis.priority) {
      this.supportState.priority = analysis.priority;
    }

    // Transicao de estado
    let nextState = currentState;

    if (currentState === 'greeting') {
      nextState = 'identifying_issue';
    } else if (currentState === 'identifying_issue') {
      if (analysis.needsClarification) {
        nextState = 'clarifying';
      } else if (analysis.shouldEscalate) {
        nextState = 'escalating';
      } else if (analysis.canResolve) {
        nextState = 'resolving';
      }
    } else if (currentState === 'clarifying') {
      if (analysis.shouldEscalate) {
        nextState = 'escalating';
      } else if (analysis.canResolve) {
        nextState = 'resolving';
      }
    } else if (currentState === 'resolving') {
      nextState = 'confirming';
    } else if (currentState === 'confirming') {
      if (analysis.intent === 'despedida' || analysis.sentiment === 'positivo') {
        nextState = 'closing';
        this.supportState.resolved = true;
      } else {
        nextState = 'resolving';
      }
    } else if (currentState === 'escalating') {
      nextState = 'closing';
      this.supportState.escalated = true;
      this.supportState.escalatedTo = ISSUE_CATEGORIES[this.supportState.issueCategory]?.escalateTo || 'especialista';
    }

    if (nextState !== currentState) {
      console.log(`   [STATE] ${currentState} -> ${nextState}`);
      this.supportState.currentState = nextState;
    }
  }

  /**
   * Verifica se deve escalar
   */
  _shouldEscalate() {
    // Escalar se:
    // 1. Mais de 8 turnos sem resolucao
    if (this.turno >= 8 && !this.supportState.resolved) {
      return true;
    }

    // 2. Prioridade urgente
    if (this.supportState.priority === 'urgent') {
      return true;
    }

    // 3. Cancelamento sempre escala
    if (this.supportState.issueCategory === 'cancellation') {
      return true;
    }

    // 4. Ja foi marcado para escalar
    if (this.supportState.escalated) {
      return true;
    }

    return false;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PERSISTENCIA
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Retorna estado para persistencia
   */
  getState() {
    return {
      contactId: this.contactId,
      turno: this.turno,
      supportState: this.supportState,
      cliente: this.cliente,
      historico: this.historico.slice(-20)
    };
  }

  /**
   * Restaura estado
   */
  restoreState(state) {
    if (!state) return;

    this.turno = state.turno || 0;
    this.supportState = state.supportState || this.supportState;
    this.cliente = { ...this.cliente, ...(state.cliente || {}) };
    this.historico = state.historico || [];

    console.log(`[SUPPORT-ENGINE] Estado restaurado: turno ${this.turno}, estado ${this.supportState.currentState}`);
  }
}

export default SupportEngine;

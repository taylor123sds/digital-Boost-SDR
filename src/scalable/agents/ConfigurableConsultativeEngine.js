/**
 * @file ConfigurableConsultativeEngine.js
 * @description Motor inteligente CONFIGURAVEL para agentes multi-tenant
 *
 * Esta classe implementa a mesma arquitetura Planner/Writer/Checker do
 * DynamicConsultativeEngine, mas usa configuracao dinamica do banco de dados
 * em vez de valores hardcoded.
 *
 * Arquitetura:
 * - PLANNER: Analisa mensagem, decide fase SPIN, extrai BANT
 * - WRITER: Escreve mensagem natural baseada no briefing do Planner
 * - CHECKER: Valida mensagem contra regras de estilo (codigo, nao LLM)
 *
 * TECNICAS DE VENDA INTEGRADAS:
 * - TENSAO: Transformar problema abstrato em perda concreta (R$, tempo)
 * - DIRECAO: Fechar logica problema -> solucao como caminho unico
 * - ENTREGAVEL: Valor tangivel que o lead ganha na reuniao
 * - FECHAMENTO: Alternativa dupla, assumir a venda, sem pedir permissao
 */

import OpenAI from 'openai';
import { SPIN_DIRECTIVES, STYLE_RULES, JUNG_ARCHETYPES as TEMPLATE_ARCHETYPES } from './AgentTemplates.js';

// Fluxo SPIN padrao
const SPIN_FLOW = ['situation', 'problem', 'implication', 'needPayoff', 'closing'];

/**
 * Arquetipos de Jung para adaptacao de tom
 */
const JUNG_ARCHETYPES = {
  sabio: {
    name: 'Sabio',
    tone: { style: 'Tecnico e detalhado', voice: 'Como especialista explicando' },
    emotionalTriggers: ['dados', 'provas', 'metodologia'],
    avoid: ['simplificacao excessiva', 'falta de detalhes']
  },
  heroi: {
    name: 'Heroi',
    tone: { style: 'Direto e desafiador', voice: 'Como treinador motivando' },
    emotionalTriggers: ['desafio', 'conquista', 'superacao'],
    avoid: ['passividade', 'falta de energia']
  },
  cuidador: {
    name: 'Cuidador',
    tone: { style: 'Empatico e acolhedor', voice: 'Como consultor preocupado' },
    emotionalTriggers: ['seguranca', 'tranquilidade', 'suporte'],
    avoid: ['pressao', 'agressividade']
  },
  explorador: {
    name: 'Explorador',
    tone: { style: 'Entusiasmado e visionario', voice: 'Como parceiro de aventura' },
    emotionalTriggers: ['novidade', 'oportunidade', 'inovacao'],
    avoid: ['rotina', 'limitacoes']
  },
  default: {
    name: 'Equilibrado',
    tone: { style: 'Consultivo equilibrado', voice: 'Profissional e humano' },
    emotionalTriggers: ['valor', 'resultado', 'praticidade'],
    avoid: ['linguagem corporativa', 'frieza']
  }
};

/**
 * Motor Consultivo Configuravel
 */
export class ConfigurableConsultativeEngine {
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

    // Estado SPIN
    this.spin = {
      currentStage: 'situation',
      questionsAsked: {
        situation: [],
        problem: [],
        implication: [],
        needPayoff: [],
        closing: []
      },
      stageHistory: [],
      signalsDetected: {
        situation: [],
        problem: [],
        implication: [],
        needPayoff: []
      }
    };

    // Dados BANT coletados (inicializa do config)
    this.bantData = this._initBANTData();

    // Dados do lead
    this.lead = {
      nome: null,
      empresa: null,
      setor: config?.identity?.sector || 'servicos_gerais'
    };

    // Arquetipo detectado
    this.archetype = {
      detected: 'default',
      confidence: 0,
      history: []
    };

    console.log(`[ENGINE] Inicializado para ${contactId} com config:`, {
      company: config?.identity?.companyName,
      sector: config?.identity?.sector,
      agent: config?.identity?.agentName
    });
  }

  /**
   * Inicializa campos BANT a partir da config
   */
  _initBANTData() {
    const bantData = {};
    const fields = this.config?.bantConfig?.fields || {};

    for (const [key] of Object.entries(fields)) {
      bantData[key] = null;
    }

    return bantData;
  }

  /**
   * Processa mensagem do lead e gera resposta inteligente
   * @param {string} userMessage - Mensagem do lead
   * @returns {Promise<Object>} Resposta estruturada
   */
  async processMessage(userMessage) {
    this.turno++;
    console.log(`\n${'='.repeat(60)}`);
    console.log(`[ENGINE] Turno ${this.turno} - Processando: "${userMessage.substring(0, 50)}..."`);

    // Adicionar ao historico
    this.historico.push({ role: 'user', content: userMessage });

    // STEP 0: Detectar arquetipo
    const archetypeData = this._detectArchetype(userMessage);

    // STEP 1: PLANNER - Analisa e decide
    const plan = await this._runPlanner(userMessage, archetypeData);

    // Atualizar dados extraidos
    this._updateExtractedData(plan.extractedData);

    // STEP 2: WRITER - Escreve a mensagem
    let response = await this._runWriter(plan, archetypeData);

    // STEP 3: CHECKER - Valida
    let checkResult = this._runChecker(response, userMessage);

    // Se falhou, tentar corrigir
    if (!checkResult.valid) {
      console.log(`   [CHECKER] Issues: ${checkResult.issues.join(', ')}`);

      // Aplicar correcoes basicas
      response = this._stripForbiddenStarters(response);
      response = this._stripBrokenStarts(response);

      // Re-verificar
      checkResult = this._runChecker(response, userMessage);

      if (!checkResult.valid) {
        // Regenerar com fix
        response = await this._regenerateWithFix(plan, checkResult.issues, archetypeData);
      }
    }

    // Adicionar resposta ao historico
    this.historico.push({ role: 'assistant', content: response });

    // Calcular progresso
    const progress = this._calculateProgress();

    return {
      message: response,
      stage: this._mapSpinToStage(this.spin.currentStage),
      spinStage: this.spin.currentStage,
      progress: progress.percent,
      bantStatus: this._getBANTStatus(),
      archetype: archetypeData.name,
      readyForScheduling: this.spin.currentStage === 'closing' && progress.percent >= 70,
      turno: this.turno
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PLANNER - Analisa mensagem e decide proximo passo
  // ═══════════════════════════════════════════════════════════════════════════

  async _runPlanner(userMessage, archetypeData) {
    const currentStage = this.spin.currentStage;
    const phaseConfig = this.config?.spinConfig?.phases?.[currentStage] || {};
    const dadosFaltantes = this._getMissingBANTData(currentStage);

    // Construir prompt do Planner com config dinamica
    const prompt = `Voce e o PLANNER de um SDR consultivo da ${this.config?.identity?.companyName || 'empresa'}.
Seu trabalho: analisar a mensagem do lead e criar um BRIEFING para o Writer.

═══════════════════════════════════════════════════════════════════════════════
CONTEXTO DO NEGOCIO
═══════════════════════════════════════════════════════════════════════════════
Empresa: ${this.config?.identity?.companyName || 'N/A'}
Setor: ${this.config?.identity?.sector || 'N/A'}
O que fazemos: ${this.config?.business?.description || 'N/A'}
Proposta de valor: ${this.config?.business?.valueProposition || 'N/A'}
Produtos/Servicos: ${(this.config?.business?.offerings || []).join(', ') || 'N/A'}
CTA: ${this.config?.cta?.description || 'agendar reuniao'}

═══════════════════════════════════════════════════════════════════════════════
FASE SPIN ATUAL: ${phaseConfig.name || currentStage.toUpperCase()}
═══════════════════════════════════════════════════════════════════════════════
Objetivo: ${phaseConfig.objective || 'Avançar na qualificação'}
Tom: ${phaseConfig.tone || 'Consultivo'}
${phaseConfig.technique ? `Tecnica: ${phaseConfig.technique.name} - ${phaseConfig.technique.description}` : ''}

═══════════════════════════════════════════════════════════════════════════════
DADOS A COLETAR NESTA FASE
═══════════════════════════════════════════════════════════════════════════════
${dadosFaltantes.map(d => `- ${d.campo}: ${d.label}`).join('\n') || '(nenhum pendente)'}

═══════════════════════════════════════════════════════════════════════════════
ARQUETIPO DO LEAD: ${archetypeData.name}
═══════════════════════════════════════════════════════════════════════════════
Tom: ${archetypeData.tone.style}
Como falar: ${archetypeData.tone.voice}
Gatilhos: ${archetypeData.emotionalTriggers.join(', ')}
Evitar: ${archetypeData.avoid.join(', ')}

═══════════════════════════════════════════════════════════════════════════════
HISTORICO RECENTE
═══════════════════════════════════════════════════════════════════════════════
${this.historico.slice(-6).map(m => `${m.role === 'user' ? 'LEAD' : 'SDR'}: ${m.content}`).join('\n')}

═══════════════════════════════════════════════════════════════════════════════
STATUS BANT
═══════════════════════════════════════════════════════════════════════════════
${this._formatBANTStatus()}

═══════════════════════════════════════════════════════════════════════════════
MENSAGEM DO LEAD
═══════════════════════════════════════════════════════════════════════════════
"${userMessage}"

═══════════════════════════════════════════════════════════════════════════════
INSTRUCOES
═══════════════════════════════════════════════════════════════════════════════
1. Analise a mensagem: O que o lead esta comunicando? Que sentimento? Que intencao?
2. Extraia dados BANT que ele mencionou (mesmo indiretamente)
3. Decida se deve avancar de fase (sinais de que entendeu/concordou com a dor?)
4. Crie um BRIEFING para o Writer escrever a proxima mensagem

Responda em JSON:
{
  "leadAnalysis": {
    "summary": "resumo do que o lead comunicou",
    "sentiment": "positivo|neutro|negativo|resistente",
    "intent": "pergunta|resposta|objecao|interesse",
    "dorCitada": "se mencionou dor/problema, qual foi"
  },

  "spinAnalysis": {
    "currentStage": "${currentStage}",
    "shouldAdvance": true/false,
    "reason": "motivo para avancar ou ficar"
  },

  "extractedData": {
    ${Object.keys(this.bantData).map(k => `"${k}": "valor extraido ou null"`).join(',\n    ')}
  },

  "writerInstructions": {
    "tipoResposta": "exploracao|validacao|aprofundamento|transicao|fechamento",
    "gancho": "instrucao de como espelhar/validar o que lead disse",
    "fato": "instrucao do dado/insight/conexao a fazer",
    "pergunta": "instrucao do TIPO de pergunta a fazer (nao o texto!)",
    "dadoAColetar": "campo BANT que a pergunta deve coletar",
    "tomEspecifico": "tom a usar baseado no arquetipo e fase"
  },

  "objection": "preco|tempo|pensar|ja_tenho|null",
  "toneDirectives": ["diretivas de tom para o Writer"],
  "avoid": ["o que NAO fazer baseado no arquetipo"]
}`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: this.config?.aiConfig?.model || 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: this.config?.aiConfig?.plannerTemperature || 0.3,
        max_tokens: this.config?.aiConfig?.maxTokensPlanner || 1000,
        response_format: { type: 'json_object' }
      });

      const plan = JSON.parse(completion.choices[0].message.content);

      // Verificar se deve avancar de fase
      if (plan.spinAnalysis?.shouldAdvance) {
        const nextStage = this._getNextSPINStage(currentStage);
        if (nextStage) {
          this._advanceToSPINStage(nextStage);
          plan.spinAnalysis.currentStage = nextStage;
        }
      }

      // Garantir estrutura completa
      plan.spinStage = plan.spinAnalysis?.currentStage || currentStage;
      plan.spinPhaseConfig = this.config?.spinConfig?.phases?.[plan.spinStage] || phaseConfig;

      return plan;

    } catch (e) {
      console.error(`   [PLANNER] Erro: ${e.message}`);
      // Fallback deterministico
      return {
        leadAnalysis: { summary: 'mensagem processada', sentiment: 'neutro', intent: 'resposta' },
        spinAnalysis: { currentStage, shouldAdvance: false },
        extractedData: {},
        writerInstructions: {
          tipoResposta: 'exploracao',
          gancho: 'Espelhar o que o lead disse',
          fato: 'Validar situacao',
          pergunta: 'Perguntar sobre o cenario atual',
          dadoAColetar: dadosFaltantes[0]?.campo || 'need_geral',
          tomEspecifico: phaseConfig.tone || 'equilibrado'
        },
        spinStage: currentStage,
        spinPhaseConfig: phaseConfig,
        toneDirectives: ['equilibrado'],
        avoid: []
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WRITER - Escreve mensagem natural seguindo briefing do Planner
  // ═══════════════════════════════════════════════════════════════════════════

  async _runWriter(plan, archetypeData) {
    const progress = this._calculateProgress();
    const spinStage = plan.spinStage || this.spin.currentStage;
    const phaseConfig = plan.spinPhaseConfig || this.config?.spinConfig?.phases?.[spinStage] || {};
    const instructions = plan.writerInstructions || {};
    const leadAnalysis = plan.leadAnalysis || {};

    // Construir prompt do Writer com config dinamica
    const prompt = `Voce e um SDR consultivo da ${this.config?.identity?.companyName || 'empresa'}.
Escreva UMA mensagem que siga as diretrizes abaixo. NAO use templates fixos - crie dinamicamente.

═══════════════════════════════════════════════════════════════════════════════
ARQUETIPO DO LEAD: ${archetypeData.name.toUpperCase()}
═══════════════════════════════════════════════════════════════════════════════
Tom: ${archetypeData.tone.style}
Como falar: ${archetypeData.tone.voice}
Gatilhos emocionais: ${archetypeData.emotionalTriggers.join(', ')}
EVITAR: ${archetypeData.avoid.join(', ')}

═══════════════════════════════════════════════════════════════════════════════
CONTEXTO DO NEGOCIO
═══════════════════════════════════════════════════════════════════════════════
Empresa: ${this.config?.identity?.companyName || 'N/A'}
O que vendemos: ${this.config?.business?.offeringSummary || (this.config?.business?.offerings || []).join(', ')}
Proposta de valor: ${this.config?.business?.valueProposition || 'N/A'}

═══════════════════════════════════════════════════════════════════════════════
ESTRUTURA: GANCHO -> FATO/INSIGHT -> PERGUNTA
═══════════════════════════════════════════════════════════════════════════════

[1] GANCHO (3-10 palavras)
    O que fazer: ${instructions.gancho || 'Espelhar o que o lead disse'}
    Lead disse: "${leadAnalysis.summary || 'algo sobre a situação'}"
    ${leadAnalysis.dorCitada ? `DOR CITADA: "${leadAnalysis.dorCitada}" - ESPELHE NO GANCHO!` : ''}

[2] FATO/INSIGHT (1-2 frases - agregue VALOR)
    O que fazer: ${instructions.fato || 'Trazer dado/insight que gere valor'}
    Tom: ${instructions.tomEspecifico || phaseConfig.tone || 'consultivo'}

[3] PERGUNTA (colete: ${instructions.dadoAColetar || 'proximo dado'})
    O que fazer: ${instructions.pergunta || 'Perguntar para avançar'}
    Fase SPIN: ${phaseConfig.name || spinStage} - ${phaseConfig.objective || 'Qualificar'}

${this._getTechniqueInstructions(spinStage, phaseConfig)}

═══════════════════════════════════════════════════════════════════════════════
CONTEXTO DA CONVERSA
═══════════════════════════════════════════════════════════════════════════════
${this.turno <= 1 ? `
PRIMEIRA RESPOSTA DO LEAD:
   - NAO force uma dor especifica - DESCUBRA a dor do que ELE disse
   - ESPELHE o que ele disse e faca pergunta que REVELE mais
` : ''}
Lead disse: "${leadAnalysis.summary || 'respondeu a pergunta anterior'}"
Sentimento: ${leadAnalysis.sentiment || 'neutro'}

${plan.objection ? this._getObjectionInstructions(plan.objection, archetypeData) : ''}

═══════════════════════════════════════════════════════════════════════════════
PROIBICOES
═══════════════════════════════════════════════════════════════════════════════
${this._getStyleProhibitions()}

═══════════════════════════════════════════════════════════════════════════════
FORMATO FINAL
═══════════════════════════════════════════════════════════════════════════════
${this._getFormatTemplate(spinStage, archetypeData)}

Escreva APENAS a mensagem (3 partes com quebras de linha):`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: this.config?.aiConfig?.model || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: prompt },
          ...this.historico.slice(-6)
        ],
        temperature: this.config?.aiConfig?.writerTemperature || 0.9,
        max_tokens: this.config?.aiConfig?.maxTokensWriter || 300
      });

      return completion.choices[0].message.content.trim();

    } catch (e) {
      console.error(`   [WRITER] Erro: ${e.message}`);
      // Fallback generico
      const fallbackQuestions = {
        situation: 'Como funciona o processo hoje?',
        problem: 'Tem alguma variacao nesse cenario?',
        implication: 'Quanto isso impacta no resultado?',
        needPayoff: 'O que mudaria se resolvesse isso?',
        closing: `Podemos conversar sobre isso? ${this.config?.cta?.description || ''}`
      };
      return fallbackQuestions[spinStage] || 'Me conta mais sobre isso?';
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CHECKER - Valida mensagem (codigo, nao LLM)
  // ═══════════════════════════════════════════════════════════════════════════

  _runChecker(message, originalMessage) {
    const issues = [];
    const styleRules = this.config?.styleRules || {};

    // 1. Verifica se tem 1 pergunta so
    const questionCount = (message.match(/\?/g) || []).length;
    if (questionCount === 0) {
      issues.push('sem_pergunta');
    } else if (questionCount > 1) {
      issues.push('multiplas_perguntas');
    }

    // 2. Verifica se comeca com palavra proibida
    const forbiddenStarters = styleRules.forbiddenStarters || [
      'Entendo', 'Entendi', 'Perfeito', 'Otimo', 'Legal', 'Certo', 'Claro', 'Ok'
    ];
    const firstWord = message.split(/[\s,!.]/)[0].toLowerCase();
    const normalizedForbidden = forbiddenStarters.map(w => w.toLowerCase());
    if (normalizedForbidden.includes(firstWord)) {
      issues.push(`comeca_com_${firstWord}`);
    }

    // 3. Verifica numero de linhas
    const maxLines = styleRules.maxLines || 4;
    const contentLines = message.split('\n').filter(l => l.trim().length > 0);
    if (contentLines.length > maxLines + 1) {
      issues.push('muitas_linhas');
    }

    // 4. Verifica linguagem corporativa proibida
    const forbiddenCorporate = styleRules.forbiddenCorporate || [
      'agregar valor', 'solucoes personalizadas', 'parceria estrategica'
    ];
    for (const phrase of forbiddenCorporate) {
      if (message.toLowerCase().includes(phrase.toLowerCase())) {
        issues.push('linguagem_corporativa');
        break;
      }
    }

    // 5. Verifica inicio quebrado
    const brokenStartPatterns = [
      /^que\s+(voces?|voce|a\s+empresa|isso)/i,
      /^e\s+(que|como|quando|onde)/i,
      /^mas\s+(que|como)/i,
      /^entao\s+(que|como)/i
    ];
    for (const pattern of brokenStartPatterns) {
      if (pattern.test(message.trim())) {
        issues.push('frase_incompleta');
        break;
      }
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS - Metodos auxiliares
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Gera instrucoes de tecnica de venda por fase
   * Usa as tecnicas do SPIN_DIRECTIVES importado do AgentTemplates
   */
  _getTechniqueInstructions(spinStage, phaseConfig) {
    // Usar SPIN_DIRECTIVES do template se disponivel
    const directive = SPIN_DIRECTIVES?.[spinStage] || {};
    const tecnica = directive.tecnicaDeVenda || phaseConfig?.technique || {};

    // SITUATION - Descoberta Estrategica
    if (spinStage === 'situation') {
      return `
═══════════════════════════════════════════════════════════════════════════════
TECNICA: ${tecnica.nome || 'Descoberta Estrategica'}
═══════════════════════════════════════════════════════════════════════════════
${tecnica.aplicacao || 'Fazer perguntas que revelam pontos fracos sem parecer ataque'}

Exemplo: ${tecnica.exemplo || '"Indicacao e otimo. E quando as indicacoes demoram a aparecer?"'}

INSTRUCOES:
- GANCHO: ${directive.instrucoes?.gancho || 'Espelhar algo que o lead disse'}
- FATO: ${directive.instrucoes?.fato || 'Contextualizar e plantar semente de problema'}
- PERGUNTA: ${directive.instrucoes?.pergunta || 'Perguntar focando em pontos de dor'}

SINAIS PARA AVANCAR: ${(directive.sinaisDeAvanco || []).join(', ')}
`;
    }

    // PROBLEM - TENSAO (Custo da Dor)
    if (spinStage === 'problem') {
      const exemplos = tecnica.exemplos || [
        '"Se voce perde 2 projetos por mes por falta de lead, sao R$ 30mil/mes deixados na mesa"',
        '"Cada mes parado e um instalador que voce pode perder pro concorrente"'
      ];
      return `
═══════════════════════════════════════════════════════════════════════════════
TECNICA: ${tecnica.nome || 'TENSAO - Custo da Dor'}
═══════════════════════════════════════════════════════════════════════════════
${tecnica.aplicacao || 'Transformar problema abstrato em perda CONCRETA (R$, tempo, oportunidades)'}

OBJETIVO: ${tecnica.objetivo || 'Fazer o lead SENTIR a dor no bolso/operacao'}

EXEMPLOS:
${exemplos.map(e => `- ${e}`).join('\n')}

INSTRUCOES:
- GANCHO: ${directive.instrucoes?.gancho || 'Espelhar e validar a dor'}
- FATO: TENSAO - ${directive.instrucoes?.fato || 'Mostrar CUSTO REAL do problema'}
- PERGUNTA: ${directive.instrucoes?.pergunta || 'Fazer lead QUANTIFICAR a dor'}

SINAIS PARA AVANCAR: ${(directive.sinaisDeAvanco || []).join(', ')}
`;
    }

    // IMPLICATION - TENSAO AMPLIFICADA (Efeito Cascata)
    if (spinStage === 'implication') {
      const exemplos = tecnica.exemplos || [
        '"Hoje sao 2 projetos perdidos, mas em 6 meses a concorrencia domina"',
        '"Cada mes assim, mais dificil fica recuperar o terreno perdido"'
      ];
      return `
═══════════════════════════════════════════════════════════════════════════════
TECNICA: ${tecnica.nome || 'TENSAO AMPLIFICADA - Efeito Cascata'}
═══════════════════════════════════════════════════════════════════════════════
${tecnica.aplicacao || 'Mostrar que o problema de hoje CRESCE se nao resolver'}

OBJETIVO: ${tecnica.objetivo || 'Criar URGENCIA - nao e se vai resolver, e QUANDO'}

EXEMPLOS:
${exemplos.map(e => `- ${e}`).join('\n')}

INSTRUCOES:
- GANCHO: ${directive.instrucoes?.gancho || 'Validar a dor verbalizada'}
- FATO: TENSAO MAXIMA - ${directive.instrucoes?.fato || 'Mostrar efeito cascata (hoje->amanha->futuro)'}
- PERGUNTA: ${directive.instrucoes?.pergunta || 'Consequencias que o lead ainda nao pensou'}

SINAIS PARA AVANCAR: ${(directive.sinaisDeAvanco || []).join(', ')}
`;
    }

    // NEED-PAYOFF - DIRECAO (Caminho Unico)
    if (spinStage === 'needPayoff') {
      const exemplos = tecnica.exemplos || [
        '"Faz sentido ter um canal que traga leads todo mes e nao depender so de indicacao, ne?"',
        '"A questao nao e SE voce precisa disso, e QUANDO vai ter"'
      ];
      return `
═══════════════════════════════════════════════════════════════════════════════
TECNICA: ${tecnica.nome || 'DIRECAO - Caminho Unico'}
═══════════════════════════════════════════════════════════════════════════════
${tecnica.aplicacao || 'Fechar a logica: problema -> impacto -> UNICA solucao logica'}

OBJETIVO: ${tecnica.objetivo || 'Levar o lead a concordar que PRECISA da solucao'}

EXEMPLOS:
${exemplos.map(e => `- ${e}`).join('\n')}

INSTRUCOES:
- GANCHO: ${directive.instrucoes?.gancho || 'Validar que o lead precisa resolver'}
- FATO: DIRECAO - ${directive.instrucoes?.fato || 'Solucao como UNICO caminho logico'}
- PERGUNTA: ${directive.instrucoes?.pergunta || 'Levar a SIM automatico'}

SINAIS PARA AVANCAR: ${(directive.sinaisDeAvanco || []).join(', ')}
`;
    }

    // CLOSING - ENTREGAVEL + FECHAMENTO
    if (spinStage === 'closing') {
      const entregavel = directive.tecnicaDeVenda_entregavel || {};
      const fechamento = directive.tecnicaDeVenda_fechamento || {};
      const entregavelExemplos = entregavel.exemplos || [
        '"Na reuniao faco diagnostico do seu canal e mostro EXATAMENTE onde estao as oportunidades"',
        '"Voce sai com um plano de acao personalizado"'
      ];
      const fechamentoExemplos = fechamento.exemplos || [
        '"Vamos marcar pra terca as 14h ou quinta as 10h - qual fica melhor?"',
        '"Fica melhor de manha ou de tarde pra voce?"'
      ];
      return `
═══════════════════════════════════════════════════════════════════════════════
TECNICA 1: ${entregavel.nome || 'ENTREGAVEL - Valor da Call'}
═══════════════════════════════════════════════════════════════════════════════
${entregavel.aplicacao || 'Mostrar o que o lead LEVA da reuniao (nao e so apresentacao)'}

OBJETIVO: ${entregavel.objetivo || 'Tornar a reuniao VALIOSA por si so'}

EXEMPLOS:
${entregavelExemplos.map(e => `- ${e}`).join('\n')}

═══════════════════════════════════════════════════════════════════════════════
TECNICA 2: ${fechamento.nome || 'FECHAMENTO - Horario com Firmeza'}
═══════════════════════════════════════════════════════════════════════════════
${fechamento.aplicacao || 'ASSUMIR a venda, nao pedir permissao. Alternativa dupla.'}

OBJETIVO: ${fechamento.objetivo || 'Tirar o "se" e focar no "quando"'}

EXEMPLOS:
${fechamentoExemplos.map(e => `- ${e}`).join('\n')}

INSTRUCOES:
- GANCHO: ${directive.instrucoes?.gancho || 'Resumir dor + valor da solucao'}
- ENTREGAVEL: ${this.config?.cta?.valueForLead || 'Valor tangivel na call'}
- FECHAMENTO: NAO peca permissao. Use alternativa dupla.

CTA: ${this.config?.cta?.description || 'Reuniao de diagnostico'}
`;
    }

    return '';
  }

  /**
   * Gera instrucoes para tratar objecao
   */
  _getObjectionInstructions(objectionType, archetypeData) {
    const handlers = this.config?.objectionHandlers || {};
    const handler = handlers[objectionType];

    if (!handler) return '';

    return `
═══════════════════════════════════════════════════════════════════════════════
OBJECAO DETECTADA: ${objectionType.toUpperCase()}
═══════════════════════════════════════════════════════════════════════════════
Como reformular: ${handler.reframe || 'Valide a preocupacao'}
Tom para ${archetypeData.name}: ${archetypeData.tone.style}
Follow-up: ${handler.followUp || 'Pergunte mais sobre a situacao'}
`;
  }

  /**
   * Gera lista de proibicoes de estilo
   */
  _getStyleProhibitions() {
    const styleRules = this.config?.styleRules || {};
    const forbiddenStarters = styleRules.forbiddenStarters || ['Entendo', 'Perfeito', 'Otimo'];
    const maxLines = styleRules.maxLines || 4;

    return `- NAO comece com: ${forbiddenStarters.slice(0, 5).join(', ')}
- NAO faca mais de 1 pergunta
- NAO passe de ${maxLines} linhas de conteudo
- NAO use linguagem corporativa generica`;
  }

  /**
   * Gera template de formato por fase
   */
  _getFormatTemplate(spinStage, archetypeData) {
    if (spinStage === 'closing') {
      return `[GANCHO no tom ${archetypeData.name}]

[ENTREGAVEL: O que o lead VAI GANHAR na reuniao]

[FECHAMENTO: "Terca as 14h ou quinta as 10h?"]`;
    }

    return `[GANCHO no tom ${archetypeData.name}]

[FATO/INSIGHT no tom ${archetypeData.name}]

[PERGUNTA no tom ${archetypeData.name}]?`;
  }

  /**
   * Detecta arquetipo do lead baseado na mensagem
   */
  _detectArchetype(message) {
    const msgLower = message.toLowerCase();

    // Sinais de cada arquetipo
    const signals = {
      sabio: ['como funciona', 'me explica', 'dados', 'metodologia', 'processo', 'metricas'],
      heroi: ['vamos', 'meta', 'crescer', 'dobrar', 'escalar', 'desafio', 'resultado'],
      cuidador: ['equipe', 'time', 'pessoas', 'ajudar', 'preocupado', 'seguro'],
      explorador: ['novidade', 'inovacao', 'diferente', 'tendencia', 'oportunidade']
    };

    let detected = 'default';
    let maxScore = 0;

    for (const [archetype, keywords] of Object.entries(signals)) {
      const score = keywords.filter(k => msgLower.includes(k)).length;
      if (score > maxScore) {
        maxScore = score;
        detected = archetype;
      }
    }

    // Se score baixo, manter default
    if (maxScore < 2 && this.archetype.detected !== 'default') {
      detected = this.archetype.detected; // Manter anterior
    }

    this.archetype.detected = detected;
    this.archetype.confidence = maxScore;
    this.archetype.history.push({ turno: this.turno, archetype: detected, score: maxScore });

    return JUNG_ARCHETYPES[detected] || JUNG_ARCHETYPES.default;
  }

  /**
   * Remove palavras proibidas do inicio
   */
  _stripForbiddenStarters(message) {
    const forbiddenPatterns = [
      /^Entendo[,.\s!]*/i,
      /^Entendi[,.\s!]*/i,
      /^Perfeito[,.\s!]*/i,
      /^Otimo[,.\s!]*/i,
      /^Legal[,.\s!]*/i,
      /^Certo[,.\s!]*/i,
      /^Claro[,.\s!]*/i,
      /^Ok[,.\s!]*/i
    ];

    let cleanedMessage = message;

    for (const pattern of forbiddenPatterns) {
      if (pattern.test(cleanedMessage)) {
        cleanedMessage = cleanedMessage.replace(pattern, '').trim();
        if (cleanedMessage.length > 0) {
          cleanedMessage = cleanedMessage.charAt(0).toUpperCase() + cleanedMessage.slice(1);
        }
        break;
      }
    }

    return cleanedMessage;
  }

  /**
   * Remove inicios quebrados
   */
  _stripBrokenStarts(message) {
    const brokenPatterns = [
      /^que\s+(voces?|voce|a\s+empresa|isso)[^.?!]*[,.]\s*/i,
      /^e\s+(que|como|quando|onde)[^.?!]*[,.]\s*/i,
      /^mas\s+(que|como)[^.?!]*[,.]\s*/i
    ];

    let cleanedMessage = message;

    for (const pattern of brokenPatterns) {
      if (pattern.test(cleanedMessage)) {
        cleanedMessage = cleanedMessage.replace(pattern, '').trim();
        if (cleanedMessage.length > 0) {
          cleanedMessage = cleanedMessage.charAt(0).toUpperCase() + cleanedMessage.slice(1);
        }
        break;
      }
    }

    return cleanedMessage;
  }

  /**
   * Regenera mensagem com correcoes
   */
  async _regenerateWithFix(plan, issues, archetypeData) {
    const fixInstructions = issues.map(issue => {
      switch (issue) {
        case 'sem_pergunta': return 'ADICIONE uma pergunta no final';
        case 'multiplas_perguntas': return 'MANTENHA apenas UMA pergunta';
        case 'muitas_linhas': return 'REDUZA para maximo 4 linhas';
        case 'linguagem_corporativa': return 'EVITE linguagem corporativa. Fale de forma HUMANA';
        case 'frase_incompleta': return 'COMECE com uma frase COMPLETA e direta';
        default:
          if (issue.startsWith('comeca_com_')) {
            return `NAO comece com "${issue.replace('comeca_com_', '')}"`;
          }
          return `Corrija: ${issue}`;
      }
    }).join('. ');

    const prompt = `Reescreva esta mensagem corrigindo os problemas MAS mantendo o tom.

ARQUETIPO DO LEAD: ${archetypeData.name}
Tom: ${archetypeData.tone.style}
EVITAR: ${archetypeData.avoid.join(', ')}

CORRECOES NECESSARIAS:
${fixInstructions}

ESTRUTURA OBRIGATORIA (3 partes com linhas em branco):
1. Espelhamento (1 linha curta)

2. Conexao com valor (1-2 linhas)

3. Pergunta

Escreva APENAS a mensagem corrigida:`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: this.config?.aiConfig?.model || 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.75,
        max_tokens: 250
      });

      let result = completion.choices[0].message.content.trim();
      if (result.startsWith('"') && result.endsWith('"')) {
        result = result.slice(1, -1);
      }
      return result;
    } catch (e) {
      // Fallback simples
      return `Me conta mais sobre isso?`;
    }
  }

  /**
   * Retorna dados BANT que ainda faltam na fase atual
   */
  _getMissingBANTData(stage) {
    const phaseConfig = this.config?.spinConfig?.phases?.[stage];
    const fieldsToCollect = phaseConfig?.dataToCollect || [];

    return fieldsToCollect
      .map(campo => {
        const fieldConfig = this.config?.bantConfig?.fields?.[campo];
        return {
          campo,
          label: fieldConfig?.label || campo,
          weight: fieldConfig?.weight || 10
        };
      })
      .filter(d => {
        const value = this.bantData[d.campo];
        return value === null || value === undefined || value === '';
      });
  }

  /**
   * Formata status do BANT para o prompt
   */
  _formatBANTStatus() {
    const collected = Object.entries(this.bantData)
      .filter(([k, v]) => v !== null && v !== undefined && v !== '')
      .map(([k, v]) => {
        const fieldConfig = this.config?.bantConfig?.fields?.[k];
        return `- ${fieldConfig?.label || k}: ${v}`;
      });

    return collected.length > 0 ? collected.join('\n') : '(nenhum dado coletado ainda)';
  }

  /**
   * Atualiza dados extraidos
   */
  _updateExtractedData(extractedData) {
    if (!extractedData) return;

    for (const [key, value] of Object.entries(extractedData)) {
      if (value && value !== 'null' && value !== null && key in this.bantData) {
        this.bantData[key] = value;
        console.log(`   [BANT] Coletado: ${key} = ${value}`);
      }
    }

    // Atualizar dados do lead
    if (extractedData.nome) this.lead.nome = extractedData.nome;
    if (extractedData.empresa) this.lead.empresa = extractedData.empresa;
  }

  /**
   * Retorna proxima fase SPIN
   */
  _getNextSPINStage(currentStage) {
    const currentIndex = SPIN_FLOW.indexOf(currentStage);
    if (currentIndex === -1 || currentIndex >= SPIN_FLOW.length - 1) {
      return null;
    }
    return SPIN_FLOW[currentIndex + 1];
  }

  /**
   * Avanca para nova fase SPIN
   */
  _advanceToSPINStage(newStage) {
    const oldStage = this.spin.currentStage;
    this.spin.currentStage = newStage;
    this.spin.stageHistory.push({
      from: oldStage,
      to: newStage,
      turno: this.turno,
      timestamp: new Date().toISOString()
    });
    console.log(`   [SPIN] ${oldStage} -> ${newStage}`);
  }

  /**
   * Calcula progresso da qualificacao
   */
  _calculateProgress() {
    const fields = this.config?.bantConfig?.fields || {};
    let totalWeight = 0;
    let collectedWeight = 0;

    for (const [key, config] of Object.entries(fields)) {
      const weight = config.weight || 10;
      totalWeight += weight;

      if (this.bantData[key] !== null && this.bantData[key] !== undefined) {
        collectedWeight += weight;
      }
    }

    // Adicionar peso do estagio SPIN
    const stageIndex = SPIN_FLOW.indexOf(this.spin.currentStage);
    const stageBonus = stageIndex * 10;

    const percent = totalWeight > 0
      ? Math.min(100, Math.round((collectedWeight / totalWeight) * 80 + stageBonus))
      : stageBonus;

    return { percent, totalWeight, collectedWeight };
  }

  /**
   * Retorna status BANT formatado
   */
  _getBANTStatus() {
    return Object.entries(this.bantData)
      .map(([field, value]) => {
        const fieldConfig = this.config?.bantConfig?.fields?.[field];
        const weight = fieldConfig?.weight || 0;
        const status = value ? `OK: ${value}` : 'pendente';
        return `${fieldConfig?.label || field} (${weight}pts): ${status}`;
      })
      .join('\n');
  }

  /**
   * Mapeia fase SPIN para stage do funil
   */
  _mapSpinToStage(spinStage) {
    const mapping = {
      situation: 'stage_qualificacao',
      problem: 'stage_qualificacao',
      implication: 'stage_qualificacao',
      needPayoff: 'stage_proposta',
      closing: 'stage_negociacao'
    };
    return mapping[spinStage] || 'stage_lead_novo';
  }

  /**
   * Retorna estado completo para persistencia
   */
  getState() {
    return {
      contactId: this.contactId,
      turno: this.turno,
      spin: this.spin,
      bantData: this.bantData,
      lead: this.lead,
      archetype: this.archetype,
      historico: this.historico.slice(-20) // Ultimas 20 mensagens
    };
  }

  /**
   * Restaura estado de persistencia
   */
  restoreState(state) {
    if (!state) return;

    this.turno = state.turno || 0;
    this.spin = state.spin || this.spin;
    this.bantData = { ...this.bantData, ...(state.bantData || {}) };
    this.lead = { ...this.lead, ...(state.lead || {}) };
    this.archetype = state.archetype || this.archetype;
    this.historico = state.historico || [];

    console.log(`[ENGINE] Estado restaurado: turno ${this.turno}, fase ${this.spin.currentStage}`);
  }
}

export default ConfigurableConsultativeEngine;

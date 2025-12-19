/**
 * DynamicConsultativeEngine.js v3.2 - SPIN Edition (Context Fix)
 *
 * METODOLOGIA: SPIN Selling + BANT Tracking (SEPARAÇÃO CLARA)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  FIX v3.1: SEPARAÇÃO CORRETA SPIN vs BANT
 * - SPIN controla 100% do fluxo de conversa
 * - BANT apenas EXTRAI dados silenciosamente após cada resposta
 *
 *  FIX v3.2: HISTÓRICO COMPLETO PARA PLANNER
 * - ANTES: Planner recebia só 4 mensagens truncadas em 100 chars
 * - AGORA: Planner recebe 6 mensagens COMPLETAS (igual ao Writer)
 * - Resultado: Planner tem contexto completo para gerar briefing correto
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * SPIN (conversa - CONTROLA O FLUXO):
 * - S: Situation   Entender a situação atual
 * - P: Problem     Identificar problemas/dores
 * - I: Implication  Explorar impacto dos problemas
 * - N: Need-Payoff  Criar visão do valor da solução
 *
 * BANT (tracking - EXTRAÇÃO SILENCIOSA):
 * - Coleta dados em background para CRM
 * - NÃO influencia ordem ou seleção de perguntas
 * - Invisível para o lead
 *
 * ARQUITETURA:
 * 1. Planner (rígido)  decide FASE SPIN + próxima pergunta (agora com contexto completo!)
 * 2. Writer (livre)  escreve mensagem consultiva
 * 3. Checker  valida tom e estrutura
 * 4. BANT Extractor  coleta dados mencionados (silencioso)
 *
 * @author Digital Boost
 * @version 3.2.0 - SPIN Edition with Context Fix
 */

import OpenAI from 'openai';
import messageUnderstanding from '../intelligence/MessageUnderstanding.js';
import {
  ARCHETYPE_TONE_DIRECTIVES,
  ARCHETYPE_DETECTION_CONFIG,
  getArchetypeDirectives,
  generateToneInstructions
} from '../config/archetypes.config.js';
//  P2 INTELLIGENCE: Integração com sistema de aprendizado
import { getPatternApplier } from '../intelligence/PatternApplier.js';
import { getRealTimeAdapter } from '../intelligence/RealTimeAdapter.js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

//  Singletons de inteligência
const patternApplier = getPatternApplier();
const realTimeAdapter = getRealTimeAdapter();

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO GLOBAL - STYLE RULES CENTRALIZADAS
// ═══════════════════════════════════════════════════════════════════════════

const STYLE_RULES = {
  maxLines: 4,
  maxQuestions: 1,
  maxEmojis: 1,
  forbiddenStarters: [
    'Entendo', 'Entendi', 'Perfeito', 'Que legal', 'Ótimo', 'Excelente',
    'Maravilha', 'Show', 'Top', 'Legal', 'Certo', 'Ok', 'Claro', 'Compreendo'
  ],
  allowedAcks: [
    'Faz sentido.', 'Isso é comum.', 'Acontece muito.', 'Vejo isso direto.'
  ]
};

// ═══════════════════════════════════════════════════════════════════════════
// SPIN SELLING - METODOLOGIA DE CONVERSA (v4 - DINÂMICO)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * SPIN DIRECTIVES - Instruções por fase (não perguntas fixas!)
 * O Planner usa isso para gerar BRIEFING, não para escolher mensagem
 * O Writer tem liberdade para criar a pergunta seguindo as diretrizes
 */
// ═══════════════════════════════════════════════════════════════════════════
// SPIN_DIRECTIVES - VENDEDOR INTELIGENTE
// ═══════════════════════════════════════════════════════════════════════════
//
// 4 TÉCNICAS DE VENDAS QUE O AGENTE DEVE APLICAR:
//
// 1. TENSÃO (custo da dor) - Nas fases Problem/Implication
//     Amplificar o impacto: "Isso tá custando R$ X por mês em oportunidades perdidas"
//     Criar urgência: "Cada dia assim é dinheiro saindo do bolso"
//
// 2. DIREÇÃO (próximo passo inevitável) - Na fase Need-Payoff
//     Guiar para conclusão óbvia: "Faz sentido olhar como resolver isso, né?"
//     Remover opções: não é SE vai resolver, é QUANDO
//
// 3. ENTREGÁVEL (por que vale a pena a call) - Na fase Closing
//     Valor tangível: "Na reunião eu mostro exatamente quantos leads você pode gerar"
//     Prometido concreto: "Você sai de lá com um plano de ação personalizado"
//
// 4. FECHAMENTO (horário com firmeza) - Na fase Closing
//     Assumir a venda: "Vamos marcar pra terça às 14h?"
//     Alternativa dupla: "Fica melhor de manhã ou de tarde?"
// ═══════════════════════════════════════════════════════════════════════════

const SPIN_DIRECTIVES = {
  // ═══════════════════════════════════════════════════════════════════════════
  // S - SITUATION (Situação Atual)
  // ═══════════════════════════════════════════════════════════════════════════
  situation: {
    name: 'Situação',
    objetivo: 'Entender como funciona a operação hoje - BUSCAR PONTOS DE DOR',
    tom: 'Curioso, neutro, mas já buscando brechas para criar tensão depois.',

    instrucoes: {
      gancho: 'Espelhar algo que o lead disse de forma neutra',
      fato: 'Contextualizar que é comum - MAS plantar semente de problema',
      pergunta: 'Perguntar sobre a operação focando em pontos que podem virar dor'
    },

    // Técnica de venda nesta fase: DESCOBERTA ESTRATÉGICA
    tecnicaDeVenda: {
      nome: 'Descoberta Estratégica',
      aplicacao: 'Fazer perguntas que revelam pontos fracos sem parecer ataque',
      exemplo: '"Indicação é ótimo. E quando as indicações demoram a aparecer?"'
    },

    dadosAColetar: [
      { campo: 'need_caminho_orcamento', descricao: 'Como clientes chegam (indicação, site, redes)' },
      { campo: 'need_presenca_digital', descricao: 'Se tem site/Instagram e como usa' },
      { campo: 'need_regiao', descricao: 'Região/cidade que atende' },
      { campo: 'need_volume', descricao: 'Quantos projetos faz por mês' }
    ],

    tiposDePergunta: [
      'Como os clientes chegam até vocês? E quando esse canal seca?',
      'Quantos projetos fazem por mês? Isso é constante ou varia?',
      'Têm presença digital? O site converte ou é mais vitrine?'
    ],

    sinaisDeAvanco: ['indicação', 'depende', 'boca a boca', 'varia', 'às vezes'],
    minTurnosNaFase: 1
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // P - PROBLEM (Problemas/Dores) + TENSÃO
  // ═══════════════════════════════════════════════════════════════════════════
  problem: {
    name: 'Problema',
    objetivo: 'Fazer o lead VERBALIZAR e SENTIR os problemas - CRIAR TENSÃO',
    tom: 'Empático mas provocativo. Fazer o lead admitir que tem um problema.',

    instrucoes: {
      gancho: 'Espelhar o que foi dito, validando a dor',
      fato: 'TENSÃO: Mostrar o CUSTO REAL do problema com dados/exemplos',
      pergunta: 'Perguntar de forma que o lead QUANTIFIQUE a dor'
    },

    //  TÉCNICA 1: TENSÃO (custo da dor)
    tecnicaDeVenda: {
      nome: 'TENSÃO - Custo da Dor',
      aplicacao: 'Transformar problema abstrato em perda CONCRETA (R$, tempo, oportunidades)',
      exemplos: [
        '"Se você perde 2 projetos por mês por falta de lead, são R$ 30mil/mês deixados na mesa"',
        '"Cada mês parado é um instalador que você pode perder pro concorrente"',
        '"Enquanto você espera indicação, o concorrente que aparece no Google fecha o contrato"'
      ],
      objetivo: 'Fazer o lead SENTIR a dor no bolso/operação'
    },

    dadosAColetar: [
      { campo: 'need_problema_sazonalidade', descricao: 'Variação de demanda entre meses' },
      { campo: 'need_problema_dependencia', descricao: 'Dependência de indicação/terceiros' },
      { campo: 'need_custo_dor', descricao: 'QUANTO a dor está custando (R$/mês)' }
    ],

    tiposDePergunta: [
      'Quando fica sem projeto, os custos param junto? Ou continuam rodando?',
      'Quantos orçamentos você DEIXA de fazer por mês por falta de lead?',
      'Se um projeto médio vale R$ X, quanto você perde por mês em oportunidades?'
    ],

    sinaisDeAvanco: ['problema', 'difícil', 'complicado', 'dependo', 'fico esperando', 'varia muito', 'perco', 'custa'],
    minTurnosNaFase: 1
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // I - IMPLICATION (Impacto) + TENSÃO AMPLIFICADA
  // ═══════════════════════════════════════════════════════════════════════════
  implication: {
    name: 'Implicação',
    objetivo: 'AMPLIFICAR A DOR ao máximo - mostrar impacto em cadeia',
    tom: 'Provocativo com empatia. Fazer o lead SENTIR URGÊNCIA de resolver.',

    instrucoes: {
      gancho: 'Validar a dor que o lead verbalizou',
      fato: 'TENSÃO MÁXIMA: Mostrar efeito cascata (hojeamanhãfuturo)',
      pergunta: 'Perguntar sobre consequências que o lead ainda não pensou'
    },

    //  TÉCNICA 1: TENSÃO AMPLIFICADA
    tecnicaDeVenda: {
      nome: 'TENSÃO AMPLIFICADA - Efeito Cascata',
      aplicacao: 'Mostrar que o problema de hoje CRESCE se não resolver',
      exemplos: [
        '"Hoje são 2 projetos perdidos, mas em 6 meses a concorrência domina e você vira refém de preço"',
        '"Instalador parado hoje é instalador no concorrente amanhã"',
        '"Cada mês assim, mais difícil fica recuperar o terreno perdido"'
      ],
      objetivo: 'Criar URGÊNCIA - não é se vai resolver, é QUANDO'
    },

    dadosAColetar: [
      { campo: 'timing_urgencia', descricao: 'O quão urgente é resolver (alta/média/baixa)' },
      { campo: 'need_impacto_crescimento', descricao: 'Como afeta planos de crescimento' },
      { campo: 'need_impacto_financeiro', descricao: 'Impacto no faturamento anual' },
      { campo: 'need_impacto_equipe', descricao: 'Impacto na equipe/contratações' }
    ],

    tiposDePergunta: [
      'Se continuar assim por mais 6 meses, como fica a operação?',
      'Isso te impede de contratar mais gente? De crescer?',
      'Quanto você deixou de faturar no último ano por falta de lead constante?'
    ],

    sinaisDeAvanco: ['muito', 'bastante', 'verdade', 'faz sentido', 'preocupa', 'nunca pensei', 'preciso resolver'],
    minTurnosNaFase: 1
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // N - NEED-PAYOFF (Necessidade) + DIREÇÃO
  // ═══════════════════════════════════════════════════════════════════════════
  needPayoff: {
    name: 'Necessidade',
    objetivo: 'DIRECIONAR para a solução como INEVITÁVEL - fechar a lógica',
    tom: 'Visionário mas assertivo. A solução é o caminho ÓBVIO.',

    instrucoes: {
      gancho: 'Validar que o lead precisa resolver isso',
      fato: 'DIREÇÃO: Mostrar que a solução é o ÚNICO caminho lógico',
      pergunta: 'Confirmar se faz sentido - levando a SIM automático'
    },

    //  TÉCNICA 2: DIREÇÃO (próximo passo inevitável)
    tecnicaDeVenda: {
      nome: 'DIREÇÃO - Caminho Único',
      aplicacao: 'Fechar a lógica: problema  impacto  ÚNICA solução lógica',
      exemplos: [
        '"Faz sentido ter um canal que traga leads todo mês e não depender só de indicação, né?"',
        '"Se cada lead que chega pelo Google já vem qualificado, a conversão sobe. Isso resolveria o problema, certo?"',
        '"A questão não é SE você precisa disso, é QUANDO vai ter"'
      ],
      objetivo: 'Levar o lead a concordar que PRECISA da solução'
    },

    dadosAColetar: [
      { campo: 'budget_interesse', descricao: 'Confirmou interesse em investir' },
      { campo: 'timing_prazo', descricao: 'Quando quer ter isso funcionando' },
      { campo: 'authority_decisor', descricao: 'Quem decide sobre isso' }
    ],

    tiposDePergunta: [
      'Faz sentido ter um canal previsível de leads, ou você prefere continuar dependendo de indicação?',
      'Se eu te mostrasse como gerar X orçamentos por mês, valeria uma conversa de 30 minutos?',
      'Você decide isso sozinho ou precisa alinhar com alguém?'
    ],

    sinaisDeAvanco: ['sim', 'faz sentido', 'interessante', 'quero', 'quanto custa', 'como funciona'],
    minTurnosNaFase: 1
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CLOSING (Fechamento) + ENTREGÁVEL + FECHAMENTO ASSERTIVO
  // ═══════════════════════════════════════════════════════════════════════════
  closing: {
    name: 'Fechamento',
    objetivo: 'FECHAR A REUNIÃO com valor claro e horário específico',
    tom: 'Direto, confiante, assumindo a venda. SEM pedir permissão.',

    instrucoes: {
      gancho: 'Resumir a dor e o valor da solução (conectar problema  solução)',
      fato: 'ENTREGÁVEL: Explicar o que o lead GANHA na reunião (valor tangível)',
      pergunta: 'FECHAMENTO: Propor horário específico com alternativa dupla'
    },

    //  TÉCNICA 3: ENTREGÁVEL (por que vale a pena a call)
    tecnicaDeVenda_entregavel: {
      nome: 'ENTREGÁVEL - Valor da Call',
      aplicacao: 'Mostrar o que o lead LEVA da reunião (não é só apresentação)',
      exemplos: [
        '"Na reunião eu faço um diagnóstico do seu canal digital e te mostro EXATAMENTE onde estão as oportunidades"',
        '"Você sai de lá com um plano de ação personalizado pra sua empresa"',
        '"Em 30 minutos eu te mostro quanto você pode gerar de lead por mês e qual investimento faz sentido"'
      ],
      objetivo: 'Tornar a reunião VALIOSA por si só (não é papo de vendedor)'
    },

    //  TÉCNICA 4: FECHAMENTO (horário com firmeza)
    tecnicaDeVenda_fechamento: {
      nome: 'FECHAMENTO - Horário com Firmeza',
      aplicacao: 'ASSUMIR a venda, não pedir permissão. Alternativa dupla.',
      exemplos: [
        '"Vamos marcar pra terça às 14h ou quinta às 10h?"',
        '"Fica melhor de manhã ou de tarde pra você?"',
        '"Posso te mandar o convite pra amanhã às 15h?"'
      ],
      objetivo: 'Fechar horário ESPECÍFICO, não "me avisa quando puder"',
      errosEvitar: [
        'NÃO dizer: "Quando você pode?"',
        'NÃO dizer: "Me avisa sua disponibilidade"',
        'NÃO dizer: "Se quiser, podemos marcar..."'
      ]
    },

    dadosAColetar: [
      { campo: 'scheduling_confirmado', descricao: 'Se confirmou horário' },
      { campo: 'scheduling_horario', descricao: 'Horário específico marcado' }
    ],

    tiposDePergunta: [
      'Posso te mandar o convite pra [DIA] às [HORA]?',
      'Terça ou quinta fica melhor pra você?',
      'Manhã ou tarde?'
    ],

    sinaisDeAvanco: ['pode ser', 'vamos', 'agenda', 'horário', 'manda', 'ok'],
    minTurnosNaFase: 1
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// SPIN_STAGES (LEGADO - mantido para compatibilidade, será removido)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * @deprecated Use SPIN_DIRECTIVES ao invés
 * Mantido temporariamente para não quebrar código existente
 */
const SPIN_STAGES = {
  // ═══════════════════════════════════════════════════════════════════════════
  // S - SITUATION (Situação Atual)
  // Objetivo: Entender como funciona hoje, sem julgamento
  // ═══════════════════════════════════════════════════════════════════════════
  situation: {
    name: 'Situação',
    objective: 'Entender a operação atual sem julgamento',
    questions: [
      {
        id: 'sit_captacao',
        text: 'como os clientes chegam até vocês hoje pra pedir orçamento',
        followUp: 'a maioria vem por indicação ou tem outro canal',
        tracksBANT: ['need_caminho_orcamento']
      },
      {
        id: 'sit_presenca',
        text: 'vocês têm site ou trabalham mais pelo Instagram',
        followUp: 'o site gera pedidos ou é mais institucional',
        tracksBANT: ['need_presenca_digital']
      },
      {
        id: 'sit_regiao',
        text: 'qual a região que vocês atendem',
        followUp: 'focam em alguma cidade específica ou atendem várias',
        tracksBANT: ['need_regiao']
      },
      {
        id: 'sit_volume',
        text: 'em média, quantos projetos vocês conseguem fazer por mês',
        followUp: 'esse número é consistente ou varia muito',
        tracksBANT: ['need_volume']
      }
    ],
    minQuestionsBeforeAdvance: 1, // Reduzido para permitir avanço rápido quando lead expressa problema
    advanceSignals: ['indicação', 'instagram', 'boca a boca', 'não tenho site', 'site fraco']
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // P - PROBLEM (Problemas/Dores)
  // Objetivo: Fazer o lead VERBALIZAR os problemas (não apontar pra ele)
  // ═══════════════════════════════════════════════════════════════════════════
  problem: {
    name: 'Problema',
    objective: 'Fazer o lead reconhecer e verbalizar os problemas',
    questions: [
      {
        id: 'prob_sazonalidade',
        text: 'tem mês que sobra procura e mês que falta',
        followUp: 'como vocês lidam quando os pedidos caem',
        tracksBANT: ['need_problema_sazonalidade']
      },
      {
        id: 'prob_dependencia',
        text: 'já aconteceu de ficar esperando indicação e demorar',
        followUp: 'isso impacta no planejamento de vocês',
        tracksBANT: ['need_problema_dependencia']
      },
      {
        id: 'prob_concorrencia',
        text: 'quando alguém pesquisa energia solar na região de vocês, quem aparece',
        followUp: 'vocês aparecem ou só a concorrência',
        tracksBANT: ['need_problema_visibilidade']
      },
      {
        id: 'prob_conversao',
        text: 'dos orçamentos que vocês fazem, quantos viram projeto',
        followUp: 'vocês acham que poderiam converter mais',
        tracksBANT: ['need_problema_conversao']
      }
    ],
    minQuestionsBeforeAdvance: 1,
    advanceSignals: ['depende', 'varia', 'às vezes', 'problema', 'difícil', 'complicado', 'irregular']
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // I - IMPLICATION (Impacto/Consequências)
  // Objetivo: Amplificar a dor mostrando o impacto real
  // ═══════════════════════════════════════════════════════════════════════════
  implication: {
    name: 'Implicação',
    objective: 'Amplificar o problema mostrando consequências reais',
    questions: [
      {
        id: 'impl_faturamento',
        text: 'quando fica sem demanda, quanto isso pesa no faturamento do mês',
        followUp: 'dá pra estimar quantos projetos vocês deixam de fazer',
        tracksBANT: ['timing_urgencia']
      },
      {
        id: 'impl_crescimento',
        text: 'essa irregularidade atrapalha planejar crescimento',
        followUp: 'vocês conseguem contratar equipe ou fica arriscado',
        tracksBANT: ['need_impacto_crescimento']
      },
      {
        id: 'impl_concorrencia',
        text: 'enquanto vocês dependem de indicação, a concorrência tá captando no Google',
        followUp: 'vocês perdem cliente pra quem aparece primeiro',
        tracksBANT: ['need_impacto_concorrencia']
      },
      {
        id: 'impl_oportunidade',
        text: 'quantas pessoas pesquisam energia solar na região e não encontram vocês',
        followUp: 'esse cliente vai pra onde',
        tracksBANT: ['need_impacto_oportunidade']
      }
    ],
    minQuestionsBeforeAdvance: 1,
    advanceSignals: ['muito', 'bastante', 'preocupa', 'verdade', 'faz sentido', 'nunca pensei']
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // N - NEED-PAYOFF (Necessidade/Benefício)
  // Objetivo: Fazer o lead VISUALIZAR o valor da solução
  // ═══════════════════════════════════════════════════════════════════════════
  needPayoff: {
    name: 'Necessidade',
    objective: 'Criar visão do valor e preparar para proposta',
    questions: [
      {
        id: 'need_valor',
        text: 'se tivesse um canal gerando 5 orçamentos por mês, independente de indicação, faria diferença',
        followUp: 'o que vocês fariam com essa previsibilidade',
        tracksBANT: ['budget_interesse']
      },
      {
        id: 'need_google',
        text: 'se quando alguém pesquisasse energia solar em [região], vocês aparecessem, isso ajudaria',
        followUp: 'vocês prefeririam aparecer no Google ou depender de indicação',
        tracksBANT: ['need_presenca_google']
      },
      {
        id: 'need_tempo',
        text: 'quando vocês gostariam de ter esse canal funcionando',
        followUp: 'se pudesse começar esse mês, faria sentido',
        tracksBANT: ['timing_prazo']
      },
      {
        id: 'need_decisao',
        text: 'você decide isso sozinho ou precisa alinhar com mais alguém',
        followUp: 'quem mais participaria dessa decisão',
        tracksBANT: ['authority_decisor']
      }
    ],
    minQuestionsBeforeAdvance: 2,
    advanceSignals: ['sim', 'faria', 'ajudaria', 'interessante', 'quero', 'vamos']
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // FECHAMENTO - Proposta FIRME de próximo passo (2 opções de horário)
  // ═══════════════════════════════════════════════════════════════════════════
  closing: {
    name: 'Fechamento',
    objective: 'Propor diagnóstico com 2 opções de horário (fechamento assertivo)',
    questions: [
      {
        id: 'close_diagnostico_firme',
        //  FECHAMENTO FIRME com 2 opções (não pergunta SE, pergunta QUANDO)
        text: 'posso fazer um diagnóstico do canal digital de vocês. Em 20 minutos, analiso o que têm hoje e mostro o que faria sentido. Você prefere terça ou quinta',
        followUp: 'manhã ou tarde funciona melhor pra você',
        tracksBANT: ['conversion_meeting'],
        firmClose: true
      },
      {
        id: 'close_horario_firme',
        //  FECHAMENTO com opções específicas
        text: 'terça às 10h ou quinta às 14h, qual fica melhor',
        followUp: 'consegue confirmar agora ou quer que eu mande o link e você confirma depois',
        tracksBANT: ['scheduling_preference'],
        firmClose: true
      }
    ],
    minQuestionsBeforeAdvance: 1,
    advanceSignals: ['pode', 'vamos', 'bora', 'agendar', 'marcar', 'terça', 'quinta', 'manhã', 'tarde'],
    //  Mensagem de fechamento padrão
    closingPitch: `Posso fazer um diagnóstico rápido do canal digital de vocês.

Em 20 minutos, vejo o que vocês têm hoje, comparo com os concorrentes da região e mostro o que faria sentido implementar.

Você prefere terça ou quinta pra gente conversar?`
  }
};

/**
 * Ordem das fases SPIN
 */
const SPIN_FLOW = ['situation', 'problem', 'implication', 'needPayoff', 'closing'];

// ═══════════════════════════════════════════════════════════════════════════
// BANT TRACKING - COLETA DE DADOS EM BACKGROUND
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Slots BANT para tracking interno (CRM/Funil)
 * Preenchidos automaticamente durante conversa SPIN
 */
const BANT_TRACKING = {
  // NEED - Extraído das fases S e P
  need_caminho_orcamento: { weight: 20, fromSPIN: 'situation' },
  need_presenca_digital: { weight: 20, fromSPIN: 'situation' },
  need_regiao: { weight: 10, fromSPIN: 'situation' },
  need_volume: { weight: 10, fromSPIN: 'situation' },
  need_problema_identificado: { weight: 15, fromSPIN: 'problem' },
  need_impacto_reconhecido: { weight: 10, fromSPIN: 'implication' },

  // TIMING - Extraído da fase N
  timing_prazo: { weight: 15, fromSPIN: 'needPayoff' },
  timing_urgencia: { weight: 10, fromSPIN: 'implication' },

  // AUTHORITY - Extraído da fase N
  authority_decisor: { weight: 10, fromSPIN: 'needPayoff' },

  // BUDGET (proxy) - Inferido do interesse
  budget_interesse: { weight: 10, fromSPIN: 'needPayoff' }
};

// ═══════════════════════════════════════════════════════════════════════════
// TRANSIÇÕES INTELIGENTES ENTRE FASES SPIN
// ═══════════════════════════════════════════════════════════════════════════

const SPIN_TRANSITIONS = {
  // Sinais para avançar de fase (flexíveis - detectam radicais e variações)
  advanceSignals: {
    situation_to_problem: [
      // Captação atual
      'indicaç', 'instagram', 'insta', 'boca a boca', 'boca-a-boca',
      'não tenho site', 'site fraco', 'só instagram', 'depende de',
      // Sinais de problema emergindo
      'problema', 'não traz', 'não gera', 'não funciona', 'não converte',
      'tem mês', 'varia', 'irregular', 'some', 'sumiu'
    ],
    problem_to_implication: [
      'varia', 'irregular', 'depende', 'às vezes', 'as vezes',
      'difícil', 'complicado', 'demora', 'esperar', 'espera',
      'perde', 'perco', 'perdendo', 'não dá pra contar',
      'imprevisível', 'instável', 'preocupa', 'incerto'
    ],
    implication_to_needPayoff: [
      'muito', 'bastante', 'preocupa', 'verdade', 'faz sentido',
      'nunca pensei', 'realmente', 'pesa', 'impacta', 'afeta',
      'percebo', 'entendo', 'é verdade', 'tem razão', 'concordo'
    ],
    needPayoff_to_closing: [
      'sim', 'faria', 'ajudaria', 'interessante', 'quero',
      'vamos', 'pode', 'bora', 'quando', 'legal', 'top',
      'como funciona', 'quanto custa', 'como seria'
    ]
  },

  // Sinais para regredir (lead resistente)
  regressSignals: {
    backToProblem: ['não sei', 'talvez', 'não tenho certeza', 'preciso pensar'],
    backToSituation: ['mas funciona', 'tá bom assim', 'não preciso']
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// OBJEÇÕES TÍPICAS DE SITE PARA SOLAR
// ═══════════════════════════════════════════════════════════════════════════

const OBJECTION_HANDLERS = {
  jaTemInstagram: {
    signals: ['já tenho instagram', 'tenho insta', 'uso instagram', 'posto no insta'],
    reframe: 'Instagram é ótimo pra atenção, mas Google pega quem já tem intenção de contratar. São canais diferentes.',
    nextQuestion: 'quantos orçamentos entram sem ser por indicação?'
  },

  siteNaoDaRetorno: {
    signals: ['site não dá retorno', 'já tive site', 'não funcionou', 'não adianta'],
    reframe: 'Faz sentido - site institucional não converte. O que funciona é canal de orçamento com prova social e rastreamento.',
    nextQuestion: 'hoje vocês conseguem medir quantos pedidos vêm do digital?'
  },

  naoTenhoTempo: {
    signals: ['não tenho tempo', 'muito ocupado', 'sem tempo', 'correria'],
    reframe: 'Entendo totalmente. Por isso fazemos um diagnóstico visual rápido, sem você precisar preparar nada.',
    nextQuestion: 'qual seria o melhor horário pra uma conversa de 5-10 minutos?'
  },

  taCaro: {
    signals: ['tá caro', 'muito caro', 'não tenho budget', 'sem dinheiro', 'caro'],
    reframe: 'Faz sentido pensar assim. Dá pra começar enxuto, só com uma página de orçamento, e crescer depois.',
    nextQuestion: 'vocês preferem algo enxuto só pra captar orçamento ou algo mais completo?'
  },

  jaTemAgencia: {
    signals: ['já tenho agência', 'tenho quem faz', 'já contratei'],
    reframe: 'Posso fazer um diagnóstico rápido como auditoria, sem compromisso. Às vezes dá pra complementar.',
    nextQuestion: 'o canal atual gera pedidos de orçamento ou é mais presença/posts?'
  },

  //  INVESTIMENTO / PREÇO - Handler com range + comparação
  // IMPORTANTE: 'preco' é o valor que o Planner retorna, 'investimento' é alias
  preco: {
    signals: ['quanto custa', 'quanto é', 'qual o valor', 'qual o preço', 'investimento', 'orçamento', 'budget', 'preço', 'custa isso'],
    reframe: `O investimento varia de R$1.500 a R$5.000/mês, dependendo do escopo.

Pra ter uma ideia: é menos que 1 projeto de energia solar por mês. Se o canal gerar 2-3 projetos a mais, já se paga várias vezes.`,
    nextQuestion: 'vocês preferem começar enxuto só com landing page ou algo mais completo com SEO?',
    firmClose: true
  },
  // Alias para compatibilidade
  investimento: {
    signals: ['quanto custa', 'quanto é', 'qual o valor', 'qual o preço', 'investimento', 'orçamento', 'budget'],
    reframe: `O investimento varia de R$1.500 a R$5.000/mês, dependendo do escopo.

Pra ter uma ideia: é menos que 1 projeto de energia solar por mês. Se o canal gerar 2-3 projetos a mais, já se paga várias vezes.`,
    nextQuestion: 'vocês preferem começar enxuto só com landing page ou algo mais completo com SEO?',
    firmClose: true
  },

  //  VOU PENSAR - Handler com reversão
  vouPensar: {
    signals: ['vou pensar', 'preciso pensar', 'deixa eu pensar', 'depois te falo', 'vou ver'],
    reframe: 'Faz sentido pensar. Só pra eu entender: o que ainda tá na dúvida?',
    nextQuestion: 'é mais questão de timing, investimento ou ainda não ficou claro o que a gente faz?'
  },

  //  OFF-TOPIC - Redirect educado para perguntas pessoais/fora de contexto
  offTopic: {
    signals: ['sua mãe', 'seu pai', 'sua família', 'jogo ontem', 'futebol', 'política', 'tempo hoje', 'clima', 'você é casado', 'você tem filhos', 'onde você mora', 'de onde você é'],
    reframe: 'Haha, não posso ajudar com isso! Mas voltando ao canal digital...',
    nextQuestion: 'você mencionou que dependem de indicação - isso é estratégico ou vocês prefeririam ter outro canal gerando orçamentos?',
    explicitRedirect: true
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// OFF-TOPIC DETECTOR - Detecta perguntas fora de contexto
// ═══════════════════════════════════════════════════════════════════════════

const OFF_TOPIC_PATTERNS = [
  // Perguntas pessoais
  /como (tá|está|vai|anda) (sua|seu|tua|teu) (mãe|pai|família|esposa|marido|namorad[oa])/i,
  /você (é|tem|mora|trabalha|gosta)/i,
  /de onde você é/i,
  /onde você mora/i,
  /você é (casad[oa]|solteir[oa])/i,
  // Assuntos aleatórios
  /viu o jogo/i,
  /jogo (de )?ontem/i,
  /futebol|flamengo|corinthians|palmeiras|são paulo|vasco/i,
  /política|eleição|presidente|bolsonaro|lula/i,
  /tempo (hoje|amanhã)|vai chover|tá frio|tá calor/i,
  /assistiu|série|filme|netflix|novela/i,
  // Genericidades
  /como você (tá|está|vai)/i,
  /tudo bem( com você)?/i
];

// ═══════════════════════════════════════════════════════════════════════════
// CTA TRIGGERS - Quando acelerar para fechamento
// ═══════════════════════════════════════════════════════════════════════════

const CTA_TRIGGERS = {
  // Sinais de dor alta
  highPainSignals: [
    'não aguento mais', 'urgente', 'preciso resolver', 'tá difícil', 'parado',
    'sem demanda', 'mês ruim', 'preocupado', 'concorrente tá', 'perdendo'
  ],

  // Sinais de interesse em investimento
  investmentInterestSignals: [
    'quanto custa', 'qual o valor', 'como funciona o pagamento', 'tem plano',
    'dá pra parcelar', 'investimento', 'começa como', 'qual o próximo passo'
  ],

  // Combinação = CTA imediato
  shouldTriggerCTA: (message) => {
    const msgLower = message.toLowerCase();
    const hasPain = CTA_TRIGGERS.highPainSignals.some(s => msgLower.includes(s));
    const hasInterest = CTA_TRIGGERS.investmentInterestSignals.some(s => msgLower.includes(s));
    return hasPain || hasInterest;
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// DIAGNÓSTICO - Entregável concreto
// ═══════════════════════════════════════════════════════════════════════════

const DIAGNOSTIC_DELIVERABLE = {
  name: 'Diagnóstico do Canal Digital',
  duration: '20-30 minutos',
  format: 'Videochamada com análise ao vivo',
  whatWeDeliver: [
    '1. Análise da presença digital atual (site, Google, redes)',
    '2. Comparativo com concorrentes da região',
    '3. Mapa do caminho do cliente até o orçamento',
    '4. Proposta de canal digital com escopo e investimento'
  ],
  pitch: `Posso fazer um diagnóstico rápido do canal digital de vocês.

Em 20 minutos, vejo o que vocês têm hoje, comparo com os concorrentes da região e mostro o que faria sentido implementar.

Você prefere terça ou quinta pra gente conversar?`
};

// ═══════════════════════════════════════════════════════════════════════════
// ARQUÉTIPOS DE JUNG - NOVA ARQUITETURA COM DIRETRIZES DE TOM
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Adaptador que converte ARCHETYPE_TONE_DIRECTIVES para formato compatível
 * com o código existente (JUNG_ARCHETYPES).
 *
 * NOVA FILOSOFIA:
 * - Arquétipos são DIRETRIZES DE TOM, não templates fixos
 * - O Writer LLM usa diretrizes para criar mensagens DINÂMICAS
 * - Detecção pode ser via LLM para maior precisão
 */
function adaptArchetypeForLegacy(archName) {
  const arch = getArchetypeDirectives(archName);

  // Converte novo formato para o esperado pelo código existente
  return {
    name: arch.name,
    coreMotivation: arch.coreMotivation,
    // Sinais de detecção derivados das hints
    detectionSignals: arch.toneDirectives?.emotionalTriggers || [],
    tone: {
      style: arch.toneDirectives?.style || 'Equilibrado',
      voice: arch.toneDirectives?.vocabulary || 'Linguagem clara',
      // NÃO TEM MAIS EXAMPLES FIXOS - O LLM cria dinamicamente
      examples: [] // Removido propositalmente - o Writer cria
    },
    salesApproach: {
      discovery: arch.messageGuidelines?.gancho || 'Espelhe o que o lead disse',
      objection: arch.messageGuidelines?.fato || 'Traga insight de valor',
      closing: arch.messageGuidelines?.pergunta || 'Faça pergunta relevante'
    },
    avoid: arch.avoid || [],
    // Novas propriedades para o Writer dinâmico
    toneDirectives: arch.toneDirectives,
    messageGuidelines: arch.messageGuidelines
  };
}

// Proxy que acessa ARCHETYPE_TONE_DIRECTIVES via adaptador
const JUNG_ARCHETYPES = new Proxy({}, {
  get(target, prop) {
    // Mapear nomes antigos para novos
    const nameMap = {
      'sabio': 'sabio',
      'heroi': 'heroi',
      'rebelde': 'rebelde',
      'cuidador': 'cuidador',
      'explorador': 'explorador',
      'governante': 'governante',
      'criador': 'default', // Criador  usar default por enquanto
      'mago': 'mago',
      'inocente': 'default', // Inocente  usar default por enquanto
      'amante': 'amante',
      'bobo': 'default', // Bobo  usar default
      'comum': 'default', // Comum  usar default
      'default': 'default'
    };

    const archName = nameMap[prop] || 'default';
    return adaptArchetypeForLegacy(archName);
  },

  // Para iteração (for...of, Object.entries, etc)
  ownKeys() {
    return Object.keys(ARCHETYPE_TONE_DIRECTIVES);
  },

  getOwnPropertyDescriptor(target, prop) {
    if (ARCHETYPE_TONE_DIRECTIVES[prop]) {
      return { configurable: true, enumerable: true };
    }
    return undefined;
  }
});

// Exportar referência ao novo sistema para uso direto
const ARCHETYPE_DIRECTIVES = ARCHETYPE_TONE_DIRECTIVES;

// ═══════════════════════════════════════════════════════════════════════════
// BRAND CONTEXT - CANAL DIGITAL PARA INTEGRADORAS SOLARES
// ═══════════════════════════════════════════════════════════════════════════

const BRAND = {
  name: 'Digital Boost',
  agent: 'Leadly',
  proof: '', // Não forçar credencial - usar apenas se verdadeiro
  city: 'Natal/RN',
  mission: 'Transformar integradoras que dependem de indicação/Instagram em empresas com canal digital claro que capta orçamentos e dá previsibilidade',
  services: [
    { name: 'Site/Landing Page de Orçamento', desc: '1 objetivo: pedido de orçamento' },
    { name: 'Página por Cidade/Serviço', desc: 'SEO local básico para aparecer no Google' },
    { name: 'Captação Estruturada', desc: 'botão WhatsApp + formulário + prova social' },
    { name: 'Prova e Credenciais', desc: 'antes/depois, avaliações, garantia, fotos de obras' },
    { name: 'Integração + Follow-up', desc: 'planilha/CRM/WhatsApp + automação simples' },
    { name: 'Tracking Básico', desc: 'Pixel/GA4/UTM para medir resultados' },
    { name: 'Google Perfil da Empresa', desc: 'presença local (opcional)' }
  ],
  cta: 'diagnóstico do canal digital de orçamentos (20-30 min)',
  triagem: 'triagem rápida de 5-10 min',
  // Regras de honestidade
  honestidade: {
    naoPrometaRanking: true,     // Nunca dizer "aparecer em 1º"
    naoPrometaLeads: true,       // Nunca dizer "X leads garantidos"
    linguagemSegura: true,       // Usar "posso estar enganado, mas..."
    semShaming: true             // Evitar "vocês estão invisíveis"
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// CLASSE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

export class DynamicConsultativeEngine {
  constructor(contactId) {
    this.contactId = contactId;
    this.turno = 0;
    this.historico = [];

    // ═══════════════════════════════════════════════════════════════════════════
    // ESTADO SPIN - Controle da conversa consultiva
    // ═══════════════════════════════════════════════════════════════════════════
    this.spin = {
      currentStage: 'situation',     // situation|problem|implication|needPayoff|closing
      questionsAsked: {              // Perguntas já feitas por fase
        situation: [],
        problem: [],
        implication: [],
        needPayoff: [],
        closing: []
      },
      stageHistory: [],              // Histórico de mudanças de fase
      signalsDetected: {             // Sinais detectados por fase
        situation: [],
        problem: [],
        implication: [],
        needPayoff: []
      }
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // BANT TRACKING - Dados coletados em background para CRM
    // ═══════════════════════════════════════════════════════════════════════════
    this.bantData = {
      // NEED - Extraído das fases S e P
      need_caminho_orcamento: null,     // indicacao|instagram|google|trafego_pago|misto
      need_presenca_digital: null,      // nenhum|site_fraco|so_instagram|site_nao_converte
      need_regiao: null,                // cidade/região atendida
      need_volume: null,                // projetos/mês
      need_problema_identificado: null, // qual problema verbalizou
      need_impacto_reconhecido: null,   // reconheceu impacto? true/false

      // TIMING - Extraído da fase I e N
      timing_prazo: null,               // agora|esse_mes|trimestre|sem_pressa
      timing_urgencia: null,            // alta|media|baixa

      // AUTHORITY - Extraído da fase N
      authority_decisor: null,          // sozinho|com_socio|diretoria

      // BUDGET (proxy) - Inferido do interesse
      budget_interesse: null            // alto|medio|baixo
    };

    // Dados do lead
    this.lead = {
      nome: null,
      empresa: null,
      setor: 'energia_solar', // Default para integradoras
      cargo: null
    };

    // Arquétipo detectado (Jung) - usado para personalização profunda
    this.archetype = {
      detected: 'default',      // Arquétipo atual
      confidence: 0,            // 0-100
      signals: [],              // Sinais que detectaram
      history: [],              // Histórico de detecções (para estabilidade)
      manuallySet: false        // Flag para indicar se foi setado manualmente via setArchetype()
    };

    // Tom detectado (simplificado - derivado do arquétipo)
    this.toneProfile = {
      style: 'equilibrado', // direto, acolhedor, tecnico, equilibrado
      energy: 'medio',      // alto, medio, baixo
      formality: 'medio'    // alto, medio, baixo
    };

    // Compatibilidade com código legado (será removido)
    this.slots = this.bantData;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DETECÇÃO DE ARQUÉTIPO (Jung)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Detecta arquétipo baseado em sinais na mensagem
   * Usa sistema de scoring com peso decrescente por turno
   * Mantém arquétipo anterior para leads concisos (sem sinais)
   */
  _detectArchetype(message) {
    // Se arquétipo foi setado manualmente via setArchetype(), NÃO detectar automaticamente
    if (this.archetype.manuallySet) {
      console.log(`    Arquétipo fixado manualmente: ${this.archetype.detected} (não detectando)`);
      return {
        archetype: this.archetype.detected,
        confidence: this.archetype.confidence,
        signals: this.archetype.signals || []
      };
    }

    const msgLower = message.toLowerCase();
    const scores = {};

    // Detectar se é mensagem concisa (< 20 chars ou resposta afirmativa)
    const concisePatterns = /^(ok|sim|não|nao|pode|pode ser|beleza|bom|certo|ta|tá|blz|show|top|uhum|hm|ah|entendi|boto fe|boto fé|vdd|verdade|exato|isso|claro|com certeza|de boa|tranquilo|fechado|combinado|perfeito|massa)[\s!?.]*$/i;
    const isConcise = message.length < 25 || concisePatterns.test(msgLower.trim());

    // Se conciso e já tem arquétipo detectado, manter o anterior
    if (isConcise && this.archetype.detected !== 'default' && this.archetype.history.length > 0) {
      console.log(`    Mensagem concisa - mantendo arquétipo: ${this.archetype.detected}`);
      return {
        archetype: this.archetype.detected,
        confidence: this.archetype.confidence,
        signals: this.archetype.signals
      };
    }

    // Calcular score para cada arquétipo
    for (const [archKey, archData] of Object.entries(JUNG_ARCHETYPES)) {
      if (archKey === 'default') continue;

      let score = 0;
      const matchedSignals = [];

      for (const signal of archData.detectionSignals) {
        if (msgLower.includes(signal.toLowerCase())) {
          score += 10;
          matchedSignals.push(signal);
        }
      }

      if (score > 0) {
        scores[archKey] = { score, signals: matchedSignals };
      }
    }

    // Encontrar arquétipo com maior score
    let bestArch = null;
    let bestScore = 0;
    let bestSignals = [];

    for (const [arch, data] of Object.entries(scores)) {
      if (data.score > bestScore) {
        bestScore = data.score;
        bestArch = arch;
        bestSignals = data.signals;
      }
    }

    // Se não detectou nada e já tem histórico, manter o anterior
    if (!bestArch && this.archetype.history.length > 0) {
      console.log(`    Sem sinais novos - mantendo arquétipo: ${this.archetype.detected}`);
      return {
        archetype: this.archetype.detected,
        confidence: Math.max(this.archetype.confidence - 10, 30), // Decai levemente
        signals: this.archetype.signals
      };
    }

    // Adicionar ao histórico se detectou algo novo
    if (bestArch) {
      this.archetype.history.push({
        turno: this.turno,
        detected: bestArch,
        score: bestScore,
        signals: bestSignals
      });
    }

    // Calcular arquétipo dominante (considerando histórico)
    return this._calculateDominantArchetype();
  }

  /**
   * Calcula o arquétipo dominante considerando histórico
   * Turnos recentes têm mais peso
   */
  _calculateDominantArchetype() {
    if (this.archetype.history.length === 0) {
      return { archetype: 'default', confidence: 0, signals: [] };
    }

    const weightedScores = {};
    const recentSignals = {};

    // Peso decrescente: turno atual = 1.0, -1 = 0.8, -2 = 0.6, etc.
    for (const detection of this.archetype.history) {
      const turnosDiff = this.turno - detection.turno;
      const weight = Math.max(0.2, 1 - (turnosDiff * 0.2));

      if (!weightedScores[detection.detected]) {
        weightedScores[detection.detected] = 0;
        recentSignals[detection.detected] = [];
      }

      weightedScores[detection.detected] += detection.score * weight;

      // Guardar sinais dos últimos 3 turnos
      if (turnosDiff <= 3) {
        recentSignals[detection.detected].push(...detection.signals);
      }
    }

    // Encontrar dominante
    let dominant = 'default';
    let maxScore = 0;

    for (const [arch, score] of Object.entries(weightedScores)) {
      if (score > maxScore) {
        maxScore = score;
        dominant = arch;
      }
    }

    // Calcular confiança (0-100)
    const confidence = Math.min(100, Math.round(maxScore * 5));

    // Atualizar estado
    this.archetype.detected = dominant;
    this.archetype.confidence = confidence;
    this.archetype.signals = [...new Set(recentSignals[dominant] || [])];

    return {
      archetype: dominant,
      confidence,
      signals: this.archetype.signals
    };
  }

  /**
   * Retorna dados completos do arquétipo atual
   */
  _getArchetypeData() {
    const arch = this.archetype.detected || 'default';
    return JUNG_ARCHETYPES[arch] || JUNG_ARCHETYPES.default;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INTELLIGENT UNDERSTANDING - Métodos para análise de contexto
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Analisa a mensagem usando GPT para entendimento profundo
   * @param {string} message - Mensagem do lead
   * @returns {Promise<Object>} Análise de entendimento
   */
  async _analyzeMessageContext(message) {
    try {
      const understanding = await messageUnderstanding.understand(message, this.contactId);
      this.lastUnderstanding = understanding;
      return understanding;
    } catch (error) {
      console.error(`    [ENGINE] Erro na análise de contexto: ${error.message}`);
      return this._getDefaultUnderstanding();
    }
  }

  /**
   * Retorna entendimento padrão quando análise falha
   */
  _getDefaultUnderstanding() {
    return {
      messageType: 'human',
      senderIntent: 'resposta_normal',
      emotionalState: 'neutral',
      isBot: false,
      isMenu: false,
      isTransfer: false,
      isHuman: true,
      shouldWait: false,
      shouldExit: false,
      shouldClarify: false,
      confidence: 0.5
    };
  }

  /**
   * Verifica se a mensagem requer tratamento especial (não-humano)
   * @param {Object} understanding - Resultado da análise
   * @returns {Object|null} Resposta especial ou null para continuar normal
   */
  _handleSpecialCases(understanding) {
    // CASO 1: Transferência - aguardar APENAS se for transferência real
    // NÃO aguardar se for humano compartilhando informação (isso é conversa normal)
    if (understanding.shouldWait && understanding.isTransfer) {
      console.log(`    [ENGINE] TRANSFERÊNCIA detectada - aguardando atendente`);
      return this._createSpecialResponse('waiting', null, { silent: true });
    }

    // CASO 2: Menu detectado - responder com opção
    if (understanding.isMenu) {
      console.log(`    [ENGINE] MENU detectado - resposta adaptativa`);
      return this._createSpecialResponse('menu_response', understanding.suggestedResponse || '1', { menuDetected: true });
    }

    // CASO 3: Bot/automação detectada - pedir humano
    if (understanding.isBot && !understanding.isMenu) {
      console.log(`    [ENGINE] BOT detectado - solicitando humano`);
      return this._createSpecialResponse(
        'bot_response',
        understanding.suggestedResponse || 'Gostaria de falar com alguém da área comercial, por favor.',
        { botDetected: true }
      );
    }

    // CASO 4: Lead quer sair
    if (understanding.shouldExit) {
      console.log(`    [ENGINE] Lead não interessado - encerrando`);
      return this._createSpecialResponse(
        'exit',
        understanding.suggestedResponse || 'Entendi, sem problemas! Se precisar, estou por aqui. Sucesso!',
        { optOut: true }
      );
    }

    // CASO 5: Clarificação necessária
    if (understanding.shouldClarify) {
      console.log(`    [ENGINE] Clarificação necessária`);
      return this._createSpecialResponse(
        'clarification',
        understanding.suggestedResponse || 'Desculpa, pode explicar melhor o que precisa?',
        { clarified: true }
      );
    }

    // Nenhum caso especial - continuar fluxo normal
    return null;
  }

  /**
   * Cria resposta padronizada para casos especiais
   */
  _createSpecialResponse(stage, message, metadata = {}) {
    return {
      message,
      stage,
      spinStage: this.spin.currentStage,
      progress: this._calculateProgress(),
      readyForScheduling: false,
      understanding: this.lastUnderstanding,
      ...metadata
    };
  }

  /**
   * Formata contexto de entendimento para usar nos prompts
   * @returns {string} Texto formatado para prompt
   */
  _formatUnderstandingForPrompt() {
    const u = this.lastUnderstanding;
    if (!u) return '';

    return `
═══════════════════════════════════════════════════════════════════════════════
 ANÁLISE INTELIGENTE DO CONTEXTO
═══════════════════════════════════════════════════════════════════════════════
Tipo: ${u.messageType || 'human'} | Intenção: ${u.senderIntent || 'normal'}
Estado emocional: ${u.emotionalState || 'neutral'} | Confiança: ${(u.confidence * 100).toFixed(0)}%

 ADAPTE SUA RESPOSTA:
${u.emotionalState === 'interested' ? ' Lead interessado: seja DIRETO, avance rápido' : ''}
${u.emotionalState === 'confused' ? ' Lead confuso: CLARIFIQUE antes de perguntar' : ''}
${u.emotionalState === 'annoyed' ? ' Lead irritado: seja BREVE e objetivo' : ''}
${u.emotionalState === 'friendly' ? ' Lead amigável: pode usar tom mais leve' : ''}
${u.emotionalState === 'busy' ? ' Lead ocupado: vá DIRETO ao ponto' : ''}
${u.emotionalState === 'neutral' ? ' Tom neutro: siga o fluxo normal' : ''}`;
  }

  /**
   * Registra resposta do agente no contexto de entendimento
   */
  _recordAgentResponse(response) {
    if (response) {
      messageUnderstanding.recordAgentResponse(this.contactId, response);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MÉTODO PRINCIPAL
  // ═══════════════════════════════════════════════════════════════════════════

  async processMessage(userMessage) {
    this.turno++;

    console.log(`\n [ENGINE v3 SPIN] ════════════════════════════════════════`);
    console.log(`    ${this.contactId} | Turno ${this.turno}`);
    console.log(`    SPIN Stage: ${this.spin.currentStage}`);
    console.log(`    "${userMessage.substring(0, 80)}..."`);

    this.historico.push({ role: 'user', content: userMessage });

    try {
      // ═══════════════════════════════════════════════════════════════════
      // STEP -1: ENTENDIMENTO INTELIGENTE (GPT-Powered)
      // ═══════════════════════════════════════════════════════════════════
      const understanding = await this._analyzeMessageContext(userMessage);

      console.log(`    Understanding: ${understanding.messageType}/${understanding.senderIntent}`);
      console.log(`    Emotional: ${understanding.emotionalState} | Confidence: ${(understanding.confidence * 100).toFixed(0)}%`);

      // Verificar casos especiais (bot, menu, transfer, exit)
      const specialResponse = this._handleSpecialCases(understanding);
      if (specialResponse) {
        this._recordAgentResponse(specialResponse.message);
        return specialResponse;
      }

      // ═══════════════════════════════════════════════════════════════════
      // STEP 0: DETECTAR ARQUÉTIPO (Jung) + SINAIS SPIN
      // ═══════════════════════════════════════════════════════════════════
      const archetypeResult = this._detectArchetype(userMessage);
      const archetypeData = this._getArchetypeData();

      // Verificar sinais de avanço/regressão SPIN
      const spinSignals = this._checkSPINAdvanceSignals(userMessage);

      console.log(`    Arquétipo: ${archetypeData.name} (${archetypeResult.confidence}%)`);
      if (archetypeResult.signals.length > 0) {
        console.log(`      Sinais: ${archetypeResult.signals.slice(0, 3).join(', ')}`);
      }
      if (spinSignals.shouldAdvance) {
        console.log(`    Sinais SPIN de avanço: ${spinSignals.signals?.join(', ')}`);
      }

      // ═══════════════════════════════════════════════════════════════════
      // STEP 0.5: OFF-TOPIC DETECTION - Detecta perguntas fora de contexto
      // ═══════════════════════════════════════════════════════════════════
      const isOffTopic = OFF_TOPIC_PATTERNS.some(pattern => pattern.test(userMessage));
      if (isOffTopic) {
        console.log(`    OFF-TOPIC detectado: "${userMessage.substring(0, 30)}..."`);
      }

      // ═══════════════════════════════════════════════════════════════════
      //  STEP 0.6: INTELIGÊNCIA ADAPTATIVA (PatternApplier + RealTimeAdapter)
      // Aplica padrões aprendidos e adapta em tempo real
      // ═══════════════════════════════════════════════════════════════════
      let learnedInstructions = null;
      let realTimeAdaptation = null;

      try {
        // Buscar instruções de padrões aprendidos
        learnedInstructions = await patternApplier.getLearnedInstructions(
          this.contactId,
          this.spin.currentStage,
          {
            archetype: archetypeData?.name,
            messageCount: this.turno,
            sentiment: understanding?.emotionalState
          }
        );

        if (learnedInstructions) {
          console.log(`    Padrões aprendidos aplicados para stage: ${this.spin.currentStage}`);
        }

        // Verificar se precisa de adaptação em tempo real
        realTimeAdaptation = await realTimeAdapter.analyzeAndAdapt(
          this.contactId,
          userMessage,
          {
            sentimentScore: understanding?.emotionalState === 'negativo' ? 0.3 : 0.7,
            currentStage: this.spin.currentStage,
            messageCount: this.turno,
            previousMessages: this.historico.slice(-4)
          }
        );

        if (realTimeAdaptation) {
          console.log(`    Adaptação em tempo real: ${realTimeAdaptation.strategy?.name || 'default'}`);
        }
      } catch (intelligenceError) {
        console.debug(`    Erro na inteligência adaptativa (não-bloqueante): ${intelligenceError.message}`);
      }

      // ═══════════════════════════════════════════════════════════════════
      // STEP 1: PLANNER - Decide o próximo passo (SPIN + JSON rígido)
      // ═══════════════════════════════════════════════════════════════════
      const plan = await this._runPlanner(userMessage, archetypeData, learnedInstructions, realTimeAdaptation);

      // Se off-topic, forçar objeção para usar o handler de redirect
      if (isOffTopic && !plan.objection) {
        plan.objection = 'offTopic';
        console.log(`    Forçando handler offTopic`);
      }

      console.log(`    Plan SPIN:`);
      console.log(`       Stage: ${plan.spinStage || this.spin.currentStage}`);
      console.log(`       Pergunta ID: ${plan.nextSlot}`);
      console.log(`       Texto: "${plan.nextQuestion?.substring(0, 50)}..."`);
      console.log(`       Tom: ${plan.toneDirectives?.join(', ')}`);

      // Atualizar BANT tracking com dados extraídos
      this._updateSlots(plan.extractedData);

      // ═══════════════════════════════════════════════════════════════════
      // STEP 1.5: VERIFICAR AVANÇO AUTOMÁTICO DE FASE SPIN
      // ═══════════════════════════════════════════════════════════════════
      if (spinSignals.shouldAdvance && spinSignals.nextStage) {
        this._advanceToSPINStage(spinSignals.nextStage);
        // Recalcular próxima pergunta na nova fase
        const nextQ = this._determineNextSPINQuestion();
        plan.nextSlot = nextQ.questionId;
        plan.nextQuestion = nextQ.questionText;
        plan.spinStage = nextQ.stage;
        console.log(`    Avançou para fase: ${nextQ.stage}`);
      } else if (spinSignals.shouldRegress) {
        // Lead resistente - voltar para fase anterior
        this.spin.currentStage = spinSignals.regressTo;
        console.log(`   ⬅ Regressão para fase: ${spinSignals.regressTo} (${spinSignals.reason})`);
      }

      // ═══════════════════════════════════════════════════════════════════
      // STEP 2: WRITER - Escreve a mensagem (SPIN consultivo + arquétipo)
      // ═══════════════════════════════════════════════════════════════════
      let response = await this._runWriter(plan, archetypeData);

      // ═══════════════════════════════════════════════════════════════════
      // STEP 3: CHECKER - Valida e corrige se necessário (até 2 tentativas)
      // ═══════════════════════════════════════════════════════════════════
      let checkResult = this._runChecker(response, userMessage);
      let regenerationAttempts = 0;
      const MAX_REGEN_ATTEMPTS = 2;

      while (!checkResult.valid && regenerationAttempts < MAX_REGEN_ATTEMPTS) {
        regenerationAttempts++;
        console.log(`    Checker falhou (tentativa ${regenerationAttempts}/${MAX_REGEN_ATTEMPTS}): ${checkResult.issues.join(', ')}`);
        response = await this._regenerateWithFix(plan, checkResult.issues, archetypeData);
        checkResult = this._runChecker(response, userMessage);
      }

      // Se ainda tiver issues críticas após todas tentativas, usar fallback
      if (!checkResult.valid && (
        checkResult.issues.includes('frase_incompleta') ||
        checkResult.issues.includes('linguagem_corporativa')
      )) {
        console.log(`    Usando fallback após ${regenerationAttempts} tentativas falhas`);
        // Fallback: pergunta direta simples baseada no plano
        response = this._createSimpleFallback(plan);
      }

      // ═══════════════════════════════════════════════════════════════════
      // POST-PROCESSING: Strip forbidden starters and broken starts
      // ═══════════════════════════════════════════════════════════════════
      response = this._stripForbiddenStarters(response);
      response = this._stripBrokenStarts(response);

      console.log(`    Resposta final (${response.length} chars)`);

      this.historico.push({ role: 'assistant', content: response });

      // Calcular progresso (SPIN + BANT)
      const progress = this._calculateProgress();

      // ═══════════════════════════════════════════════════════════════════
      // DETERMINAR SE ESTÁ PRONTO PARA AGENDAMENTO
      // Critérios SPIN:
      // 1. Chegou na fase closing (passou por todas as fases)
      // 2. OU progresso >= 85%
      // 3. OU timing urgente + problema reconhecido
      // ═══════════════════════════════════════════════════════════════════
      const isInClosingStage = this.spin.currentStage === 'closing';
      const hasHighProgress = progress.percent >= 85;
      const hasUrgencyAndProblem =
        this.bantData.timing_urgencia === 'alta' &&
        this.bantData.need_problema_identificado;

      const readyForScheduling = isInClosingStage || hasHighProgress || hasUrgencyAndProblem;

      //  FECHAR LOOP DE APRENDIZADO: Registrar uso de padrões (assíncrono)
      // Nota: RealTimeAdapter já registra automaticamente no analyzeAndAdapt()
      if (learnedInstructions) {
        setImmediate(async () => {
          try {
            // Registrar que padrões foram aplicados nesta conversa
            await patternApplier.recordPatternUsage(
              'prevention', // ou 'success' dependendo do tipo
              this.spin.currentStage,
              this.contactId,
              true // was_effective - será confirmado depois pelo outcome
            );
            console.log(`    [LEARNING] Padrões registrados para ${this.contactId}`);
          } catch (learningError) {
            console.debug(`    [LEARNING] Erro ao registrar padrões: ${learningError.message}`);
          }
        });
      }

      return {
        message: response,
        stage: progress.phase,
        spinStage: this.spin.currentStage,
        progress: {
          percentComplete: progress.percent,
          spinProgress: progress.spin,
          bantScore: progress.bant,
          slotsCollected: progress.collected,
          slotsMissing: progress.missing
        },
        isComplete: progress.percent >= 90 || isInClosingStage,
        readyForScheduling: readyForScheduling,
        bantData: this._getBANTSummary(),
        archetype: {
          detected: archetypeData.name,
          key: this.archetype.detected,
          confidence: archetypeResult.confidence,
          signals: archetypeResult.signals
        },
        spinAnalysis: plan.spinAnalysis,
        plan: plan, // Para debug
        //  NOVO: Informações de inteligência aplicada
        intelligenceApplied: {
          learnedInstructions: !!learnedInstructions,
          realTimeAdaptation: realTimeAdaptation?.strategy?.name || null
        }
      };

    } catch (error) {
      console.error(`    Erro: ${error.message}`);
      console.error(`   Stack: ${error.stack}`);
      return {
        message: 'Desculpe, tive um problema. Pode repetir?',
        error: error.message
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PLANNER - Decide o próximo passo usando SPIN (RÍGIDO)
  // ═══════════════════════════════════════════════════════════════════════════

  async _runPlanner(userMessage, archetypeData, learnedInstructions = null, realTimeAdaptation = null) {
    // ═══════════════════════════════════════════════════════════════════════════
    // PLANNER v4 DINÂMICO - Gera BRIEFING, não escolhe pergunta
    //  v4.1: Integração com PatternApplier e RealTimeAdapter
    // ═══════════════════════════════════════════════════════════════════════════

    const currentStage = this.spin.currentStage || 'situation';
    const directive = SPIN_DIRECTIVES[currentStage];
    const progress = this._calculateProgress();
    const salesPhase = progress.percent < 30 ? 'discovery' : (progress.percent < 70 ? 'objection' : 'closing');

    // Identificar dados BANT que ainda faltam coletar
    const dadosFaltantes = this._getMissingBANTData(currentStage);

    //  FIX v3.2: Histórico COMPLETO para o Planner (igual ao Writer)
    // ANTES: Só 4 mensagens truncadas em 100 chars  Planner perdia contexto
    // AGORA: Últimas 6 mensagens COMPLETAS para análise correta
    const historicoCompleto = this.historico.slice(-6).map(m =>
      `${m.role === 'user' ? 'Lead' : 'Agente'}: ${m.content}`
    ).join('\n\n');

    //  INTELIGÊNCIA ADAPTATIVA: Instruções do PatternApplier e RealTimeAdapter
    let intelligenceSection = '';
    if (learnedInstructions || realTimeAdaptation) {
      intelligenceSection = `
═══════════════════════════════════════════════════════════════════════════════
 INSTRUÇÕES DE INTELIGÊNCIA ADAPTATIVA (APLIQUE ISSO!)
═══════════════════════════════════════════════════════════════════════════════
${learnedInstructions || ''}
${realTimeAdaptation?.instruction || ''}
 IMPORTANTE: Essas instruções são baseadas em CONVERSAS ANTERIORES que deram certo.
Siga-as para aumentar chance de sucesso!
`;
    }

    const prompt = `Você é o PLANNER de um SDR consultivo usando metodologia SPIN Selling.
Sua função é ANALISAR a mensagem e GERAR INSTRUÇÕES para o Writer. NÃO escreva a mensagem final.

═══════════════════════════════════════════════════════════════════════════════
 METODOLOGIA SPIN SELLING
═══════════════════════════════════════════════════════════════════════════════
SPIN = Situation  Problem  Implication  Need-Payoff  Closing

• S (Situação): Entender como funciona hoje, sem julgamento
• P (Problema): Fazer o lead VERBALIZAR as dores (não apontar pra ele!)
• I (Implicação): Amplificar a dor mostrando impacto real no negócio
• N (Necessidade): Criar visão do valor da solução
• Closing: Propor próximo passo (diagnóstico/reunião)

═══════════════════════════════════════════════════════════════════════════════
 FASE SPIN ATUAL: ${directive.name.toUpperCase()} (${currentStage})
═══════════════════════════════════════════════════════════════════════════════
Objetivo: ${directive.objetivo}
Tom recomendado: ${directive.tom}

═══════════════════════════════════════════════════════════════════════════════
 MENSAGEM DO LEAD
═══════════════════════════════════════════════════════════════════════════════
"${userMessage}"
${this._formatUnderstandingForPrompt()}

═══════════════════════════════════════════════════════════════════════════════
 CONTEXTO DA CONVERSA (HISTÓRICO COMPLETO)
═══════════════════════════════════════════════════════════════════════════════
${historicoCompleto || '(início da conversa)'}

═══════════════════════════════════════════════════════════════════════════════
 ARQUÉTIPO DO LEAD: ${archetypeData.name}
═══════════════════════════════════════════════════════════════════════════════
Motivação: ${archetypeData.coreMotivation}
Abordagem (${salesPhase}): ${archetypeData.salesApproach[salesPhase]}
EVITAR: ${archetypeData.avoid.join(', ')}

═══════════════════════════════════════════════════════════════════════════════
 DADOS BANT JÁ COLETADOS
═══════════════════════════════════════════════════════════════════════════════
${this._formatBANTStatus()}

═══════════════════════════════════════════════════════════════════════════════
 DADOS QUE AINDA FALTAM COLETAR NESTA FASE
═══════════════════════════════════════════════════════════════════════════════
${dadosFaltantes.map(d => `• ${d.campo}: ${d.descricao}`).join('\n') || '(todos coletados nesta fase)'}

═══════════════════════════════════════════════════════════════════════════════
 SUA TAREFA - GERAR BRIEFING PARA O WRITER
═══════════════════════════════════════════════════════════════════════════════
1. ANALISE o que o lead disse (dores, dados, sentimento)
2. EXTRAIA dados para BANT tracking
3. VERIFIQUE se há sinais de avançar fase: ${JSON.stringify(directive.sinaisDeAvanco)}
4. DECIDA qual dado BANT deve ser coletado na próxima mensagem
5. GERE INSTRUÇÕES para o Writer (não a mensagem em si!)

 REGRAS CRÍTICAS:
- Se lead JÁ RESPONDEU algo, NÃO peça a mesma informação
- Se lead mencionou DOR, a instrução deve explorar essa dor
- Se lead perguntou PREÇO, instrua dar range e redirecionar
- O Writer vai CRIAR a mensagem, você só dá as instruções
${intelligenceSection}
═══════════════════════════════════════════════════════════════════════════════
EXEMPLOS DE TIPOS DE PERGUNTA PARA ESTA FASE (${currentStage}):
═══════════════════════════════════════════════════════════════════════════════
${directive.tiposDePergunta.map(p => `• ${p}`).join('\n')}

Retorne APENAS este JSON:

{
  "leadAnalysis": {
    "summary": "1 frase resumindo o que o lead quis dizer",
    "dorCitada": "dor/problema que o lead mencionou, ou null",
    "dadosFornecidos": ["lista de dados que o lead deu nesta mensagem"],
    "sentiment": "positivo|neutro|negativo|frustrado|ansioso|curioso",
    "intent": "resposta|pergunta|objecao|interesse|duvida"
  },

  "spinAnalysis": {
    "currentStage": "${currentStage}",
    "shouldAdvance": false,
    "advanceReason": "motivo para avançar ou null",
    "leadAwareness": "inconsciente|consciente_sintoma|consciente_problema|consciente_solucao"
  },

  "extractedData": {
    "nome": "se mencionou, senão null",
    "empresa": "se mencionou, senão null",
    "need_caminho_orcamento": "indicacao|instagram|google|trafego_pago|misto ou null",
    "need_presenca_digital": "nenhum|site_fraco|so_instagram|site_nao_converte ou null",
    "need_regiao": "cidade/região ou null",
    "need_volume": "X projetos/mês ou null",
    "need_problema_sazonalidade": "true se mencionou variação de demanda",
    "need_problema_dependencia": "true se mencionou depender de indicação",
    "need_problema_visibilidade": "true se mencionou não aparecer no Google",
    "timing_urgencia": "alta|media|baixa ou null",
    "timing_prazo": "agora|esse_mes|trimestre ou null",
    "authority_decisor": "sozinho|com_socio|diretoria ou null",
    "budget_interesse": "alto|medio|baixo ou null"
  },

  "writerInstructions": {
    "tipoResposta": "exploracao|validacao|aprofundamento|transicao|fechamento",
    "gancho": "instrução de como espelhar/validar o que lead disse",
    "fato": "instrução do dado/insight/conexão a fazer",
    "pergunta": "instrução do TIPO de pergunta a fazer (não o texto!)",
    "dadoAColetar": "campo BANT que a pergunta deve coletar",
    "tomEspecifico": "tom a usar baseado no arquétipo e fase"
  },

  "objection": "preco|tempo|pensar|ja_tenho|null",
  "toneDirectives": ["diretivas de tom para o Writer"],
  "avoid": ["o que NÃO fazer baseado no arquétipo"]
}`;

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 1000,
        response_format: { type: 'json_object' }
      });

      const plan = JSON.parse(completion.choices[0].message.content);

      // Verificar se deve avançar de fase
      if (plan.spinAnalysis?.shouldAdvance) {
        const nextStage = this._getNextSPINStage(currentStage);
        if (nextStage) {
          this._advanceToSPINStage(nextStage);
          plan.spinAnalysis.currentStage = nextStage;
        }
      }

      // Garantir estrutura completa
      plan.spinStage = plan.spinAnalysis?.currentStage || currentStage;
      plan.toneDirectives = plan.toneDirectives || ['equilibrado'];
      plan.avoid = plan.avoid || [];
      plan.writerInstructions = plan.writerInstructions || {
        tipoResposta: 'exploracao',
        gancho: 'Espelhar o que o lead disse',
        fato: 'Validar que é comum',
        pergunta: 'Perguntar sobre a operação',
        dadoAColetar: dadosFaltantes[0]?.campo || 'need_geral',
        tomEspecifico: directive.tom
      };

      // Adicionar contexto das diretivas para o Writer
      plan.spinDirective = directive;

      return plan;

    } catch (e) {
      console.error(`    Planner error: ${e.message}`);
      // Fallback determinístico
      return {
        leadAnalysis: { summary: 'mensagem processada', sentiment: 'neutro', intent: 'resposta' },
        spinAnalysis: { currentStage, shouldAdvance: false },
        extractedData: {},
        writerInstructions: {
          tipoResposta: 'exploracao',
          gancho: 'Espelhar o que o lead disse',
          fato: 'Validar situação',
          pergunta: 'Perguntar sobre o cenário atual',
          dadoAColetar: dadosFaltantes[0]?.campo || 'need_geral',
          tomEspecifico: directive.tom
        },
        spinStage: currentStage,
        spinDirective: directive,
        toneDirectives: ['equilibrado'],
        avoid: []
      };
    }
  }

  // Helper: Retorna dados BANT que ainda faltam coletar na fase atual
  _getMissingBANTData(stage) {
    const directive = SPIN_DIRECTIVES[stage];
    if (!directive || !directive.dadosAColetar) return [];

    return directive.dadosAColetar.filter(d => {
      const value = this.bantData[d.campo];
      return value === null || value === undefined || value === '';
    });
  }

  // Helper: Formata status do BANT para o prompt
  _formatBANTStatus() {
    const collected = Object.entries(this.bantData)
      .filter(([k, v]) => v !== null && v !== undefined && v !== '')
      .map(([k, v]) => `• ${k}: ${v}`);

    return collected.length > 0 ? collected.join('\n') : '(nenhum dado coletado ainda)';
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WRITER v4 DINÂMICO - Escreve mensagem LIVRE seguindo briefing do Planner
  // ═══════════════════════════════════════════════════════════════════════════

  async _runWriter(plan, archetypeData) {
    const progress = this._calculateProgress();
    const spinStage = plan.spinStage || this.spin.currentStage;
    const directive = plan.spinDirective || SPIN_DIRECTIVES[spinStage];
    const salesPhase = progress.percent < 30 ? 'discovery' : (progress.percent < 70 ? 'objection' : 'closing');

    // Instruções do Planner
    const instructions = plan.writerInstructions || {};
    const leadAnalysis = plan.leadAnalysis || {};

    // ═══════════════════════════════════════════════════════════════════════════
    // PROMPT DO WRITER - ARQUÉTIPO INFLUENCIA CADA PARTE DA MENSAGEM
    // ═══════════════════════════════════════════════════════════════════════════

    // Usar função do novo sistema para gerar diretrizes de tom dinâmicas
    const archetypeKey = this.archetype.detected || 'default';
    const toneInstructions = generateToneInstructions(archetypeKey);
    const archDirectives = getArchetypeDirectives(archetypeKey);

    const prompt = `Você é um SDR consultivo da ${BRAND.name}.
Escreva UMA mensagem que siga as DIRETRIZES DE TOM abaixo. NÃO use templates fixos - crie dinamicamente.

╔══════════════════════════════════════════════════════════════════════════════╗
║   ARQUÉTIPO DETECTADO: ${archetypeData.name.toUpperCase()}
╚══════════════════════════════════════════════════════════════════════════════╝

${toneInstructions}

═══════════════════════════════════════════════════════════════════════════════
 ESTRUTURA: GANCHO  FATO/INSIGHT  PERGUNTA
═══════════════════════════════════════════════════════════════════════════════

[1]  GANCHO (3-10 palavras)
    DIRETRIZ: ${archDirectives.messageGuidelines?.gancho || 'Espelhe o que o lead disse'}
    O que fazer: ${instructions.gancho || 'Espelhar o que o lead disse'}

     OBRIGATÓRIO: Use palavras-chave do que o lead disse:
     Lead disse: "${leadAnalysis.summary || 'algo sobre como capta clientes'}"
     REPITA algo específico que ele mencionou antes de perguntar
     CRIE uma frase única que reflita o tom ${archetypeData.name.toUpperCase()}
     NÃO use frases prontas - seja natural e específico ao contexto

[2]  FATO/INSIGHT (1-2 frases - agregue VALOR)
    DIRETRIZ: ${archDirectives.messageGuidelines?.fato || 'Traga insight relevante'}
    O que fazer: ${instructions.fato || 'Trazer dado/insight que gere valor'}
     Use o ESTILO: ${archDirectives.toneDirectives?.style || 'Equilibrado'}
     Use VOCABULÁRIO: ${archDirectives.toneDirectives?.vocabulary || 'Profissional'}
     CRIE dinamicamente baseado no contexto do lead

[3]  PERGUNTA SPIN (colete: ${instructions.dadoAColetar || 'próximo dado'})
    DIRETRIZ: ${archDirectives.messageGuidelines?.pergunta || 'Faça pergunta relevante'}
    O que fazer: ${instructions.pergunta || 'Perguntar para avançar no SPIN'}
    Fase SPIN: ${directive.name} - ${directive.objetivo}
     Formule a pergunta no RITMO: ${archDirectives.toneDirectives?.pace || 'Moderado'}
     Toque nos GATILHOS: ${(archDirectives.toneDirectives?.emotionalTriggers || []).join(', ')}

═══════════════════════════════════════════════════════════════════════════════
 CONTEXTO DA CONVERSA
═══════════════════════════════════════════════════════════════════════════════
${this.turno <= 1 ? `
 PRIMEIRA RESPOSTA DO LEAD:
   Você perguntou como ele capta orçamentos. Ele está respondendo.

    IMPORTANTE - DESCOBERTA DE DOR:
    NÃO force uma dor específica - DESCUBRA a dor do que ELE disse
    ESPELHE o que ele disse e faça pergunta que REVELE mais sobre a situação
    Se ele mencionou indicação  pergunte sobre variação/meses fracos
    Se ele mencionou Instagram  pergunte o que acontece quando não posta
    Se ele mencionou site  pergunte se converte bem ou é só vitrine
    A DOR REAL vem do que ELE revelar, não do que você assume
` : ''}
O lead disse: "${leadAnalysis.summary || 'respondeu à pergunta anterior'}"
${leadAnalysis.dorCitada ? ` DOR CITADA: "${leadAnalysis.dorCitada}"  ESPELHE NO GANCHO!` : ''}
Sentimento: ${leadAnalysis.sentiment || 'neutro'}

${plan.objection ? `
 OBJEÇÃO "${plan.objection.toUpperCase()}" - Trate com tom ${archetypeData.name}:
${OBJECTION_HANDLERS[plan.objection]?.reframe || 'Valide a preocupação'}
` : ''}

═══════════════════════════════════════════════════════════════════════════════
 TÉCNICA DE VENDA OBRIGATÓRIA PARA ESTA FASE
═══════════════════════════════════════════════════════════════════════════════
${spinStage === 'problem' || spinStage === 'implication' ? `
 TENSÃO - Custo da Dor (FASE ${spinStage.toUpperCase()})
    OBJETIVO: Transformar problema abstrato em PERDA CONCRETA (R$, tempo, oportunidades)
    EXEMPLOS:
      • "Se você perde 2 projetos por mês por falta de lead, são R$ 30mil/mês deixados na mesa"
      • "Cada mês parado é um instalador que você pode perder pro concorrente"
      • "Quando não vem indicação, quanto tempo fica parado? Isso não dói no caixa?"
    APLIQUE: Ao espelhar a dor, QUANTIFIQUE o impacto. Faça o lead SENTIR no bolso.
` : ''}${spinStage === 'needPayoff' ? `
 DIREÇÃO - Próximo Passo Inevitável (FASE NEED-PAYOFF)
    OBJETIVO: Guiar para conclusão ÓBVIA. Fazer parecer lógico avançar.
    EXEMPLOS:
      • "Faz sentido olhar como resolver isso, né?"
      • "Parece que ter um canal próprio seria a solução natural aqui"
      • "Se você tivesse X leads garantidos por mês, resolveria isso?"
    APLIQUE: Plante a ideia de que a solução É a resposta natural pro problema dele.
` : ''}${spinStage === 'closing' ? `
 ENTREGÁVEL - Valor da Call (FASE CLOSING)
    OBJETIVO: Mostrar que a reunião TEM VALOR TANGÍVEL, não é "papo de vendedor"
    EXEMPLOS:
      • "Na reunião eu faço um diagnóstico do seu canal digital e te mostro EXATAMENTE onde estão as oportunidades"
      • "Você sai de lá com um plano de ação personalizado pra sua empresa"
      • "Eu te mostro case de integradora parecida que saiu de 6 pra 15 projetos/mês"
    APLIQUE: Descreva O QUE o lead vai GANHAR na call (não o que você vai vender)

 FECHAMENTO - Horário com Firmeza (FASE CLOSING)
    OBJETIVO: ASSUMIR a venda. Alternativa dupla. Não pedir permissão.
    EXEMPLOS:
       "Vamos marcar pra terça às 14h ou quinta às 10h?"
       "Fica melhor de manhã ou de tarde pra você?"
       "Que tal amanhã às 15h? 30 minutos resolve"
    ERROS A EVITAR:
       NÃO diga: "Quando você pode?" (dá controle ao lead)
       NÃO diga: "Me avisa sua disponibilidade" (passivo demais)
       NÃO diga: "Se quiser agendar..." (condicional = fraco)
    APLIQUE: Ofereça 2 horários específicos. Assuma que ele VAI agendar.
` : ''}
═══════════════════════════════════════════════════════════════════════════════
 PROIBIÇÕES
═══════════════════════════════════════════════════════════════════════════════
• NÃO comece com: "Entendo", "Entendi", "Perfeito", "Ótimo", "Legal", "Certo"
• NÃO faça mais de 1 pergunta
• NÃO passe de ${STYLE_RULES.maxLines} linhas de conteúdo
• ${spinStage === 'problem' || spinStage === 'implication' ? 'NÃO aponte problemas - faça o lead verbalizar!' : ''}
• NÃO: ${archetypeData.avoid.join(', ')}

═══════════════════════════════════════════════════════════════════════════════
 FORMATO FINAL (APLICANDO TÉCNICA DE VENDA)
═══════════════════════════════════════════════════════════════════════════════
${spinStage === 'problem' || spinStage === 'implication' ? `[GANCHO no tom ${archetypeData.name} - ESPELHE A DOR]

[TENSÃO: QUANTIFIQUE o custo da dor em R$/tempo/oportunidades]

[PERGUNTA que faz o lead VERBALIZAR mais da dor]?` :
spinStage === 'needPayoff' ? `[GANCHO no tom ${archetypeData.name}]

[DIREÇÃO: Mostre que a solução é o próximo passo LÓGICO]

[PERGUNTA que confirma o interesse na solução]?` :
spinStage === 'closing' ? `[GANCHO no tom ${archetypeData.name}]

[ENTREGÁVEL: O que o lead VAI GANHAR na reunião]

[FECHAMENTO: "Terça às 14h ou quinta às 10h?"]` :
`[GANCHO no tom ${archetypeData.name}]

[SOLUÇÃO/FATO no tom ${archetypeData.name}]

[PERGUNTA no tom ${archetypeData.name}]?`}

Escreva APENAS a mensagem (3 partes com quebras de linha):`;

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: prompt },
          ...this.historico.slice(-6)
        ],
        temperature: 0.9, // Alta para criatividade
        max_tokens: 300
      });

      return completion.choices[0].message.content.trim();

    } catch (e) {
      console.error(`    Writer error: ${e.message}`);
      // Fallback genérico baseado na fase
      const fallbackQuestions = {
        situation: 'Como os clientes chegam até vocês hoje?',
        problem: 'Tem mês que a demanda varia muito?',
        implication: 'Quanto isso impacta no planejamento?',
        needPayoff: 'O que mudaria se tivesse mais previsibilidade?',
        closing: 'Podemos agendar um diagnóstico rápido?'
      };
      return fallbackQuestions[spinStage] || 'Me conta mais sobre isso?';
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CHECKER - Valida a mensagem (CÓDIGO, NÃO LLM)
  // ═══════════════════════════════════════════════════════════════════════════

  _runChecker(message, originalMessage) {
    const issues = [];

    // 1. Verifica se tem 1 pergunta só
    const questionCount = (message.match(/\?/g) || []).length;
    if (questionCount === 0) {
      issues.push('sem_pergunta');
    } else if (questionCount > 1) {
      issues.push('multiplas_perguntas');
    }

    // 2. Verifica se começa com palavra proibida
    const firstWord = message.split(/[\s,!.]/)[0].toLowerCase();
    const normalizedForbidden = STYLE_RULES.forbiddenStarters.map(w => w.toLowerCase());
    if (normalizedForbidden.includes(firstWord)) {
      issues.push(`comeca_com_${firstWord}`);
    }

    // 3. Verifica se repetiu algo que o lead disse (mais de 10 palavras iguais em sequência)
    const leadWords = originalMessage.toLowerCase().split(/\s+/);
    const respWords = message.toLowerCase().split(/\s+/);
    for (let i = 0; i <= leadWords.length - 5; i++) {
      const sequence = leadWords.slice(i, i + 5).join(' ');
      if (message.toLowerCase().includes(sequence) && sequence.length > 15) {
        issues.push('repetiu_lead');
        break;
      }
    }

    // 4. Verifica número de linhas de CONTEÚDO (ignora linhas em branco)
    const contentLines = message.split('\n').filter(l => l.trim().length > 0);
    if (contentLines.length > STYLE_RULES.maxLines + 1) {
      issues.push('muitas_linhas');
    }

    // 5. Verifica se está pedindo orçamento/email cedo demais
    const progress = this._calculateProgress();
    if (progress.percent < 50) {
      if (/or[çc]amento|budget|quanto (pode|quer) investir|seu email/i.test(message)) {
        issues.push('pergunta_prematura');
      }
    }

    // 6. Verifica se começa com frase incompleta/quebrada
    // Padrões que indicam resposta incoerente do GPT
    const brokenStartPatterns = [
      /^que\s+(vocês?|você|a\s+empresa|isso)/i,   // "Que vocês buscam..."
      /^e\s+(que|como|quando|onde)/i,             // "E que vocês..."
      /^mas\s+(que|como)/i,                        // "Mas que..."
      /^então\s+(que|como)/i,                      // "Então que..."
      /^assim\s+(que|como)/i,                      // "Assim que..."
      /^sendo\s+(assim|que)/i,                     // "Sendo assim..."
      /^por\s+isso\s+(que|é)/i,                    // "Por isso que..."
      /^já\s+que\s+(vocês?|você)/i                 // "Já que vocês..."
    ];

    for (const pattern of brokenStartPatterns) {
      if (pattern.test(message.trim())) {
        issues.push('frase_incompleta');
        break;
      }
    }

    // 7. Verifica linguagem corporativa/genérica (proibido)
    const corporatePatterns = [
      /nosso\s+objetivo\s+(é|seria)/i,             // "Nosso objetivo é..."
      /tornar\s+(esse|este)\s+processo/i,          // "tornar esse processo..."
      /otimizar\s+(seus?|o)\s+process/i,           // "otimizar seus processos"
      /agregar\s+valor/i,                          // "agregar valor"
      /solu[çc][õo]es?\s+(integrad|person)/i,      // "soluções integradas/personalizadas"
      /parceria\s+estrat[ée]gica/i,                // "parceria estratégica"
      /alavancar\s+(seus?|o)/i,                    // "alavancar seus..."
      /potencializar\s+(seus?|o)/i,                // "potencializar seus..."
      /maximizar\s+(seus?|o|a)/i,                  // "maximizar seus..."
      /viabilizar\s+(o|a|uma)/i,                   // "viabilizar uma..."
      /proporcionar\s+(uma?\s+)?(melhor|maior)/i,  // "proporcionar uma melhor..."
      /fácil\s+para\s+todos/i,                     // "fácil para todos"
      /estamos\s+aqui\s+para\s+ajudar/i            // "estamos aqui para ajudar"
    ];

    for (const pattern of corporatePatterns) {
      if (pattern.test(message)) {
        issues.push('linguagem_corporativa');
        break;
      }
    }

    // 8. Verifica se a resposta parece genérica demais (não contextualizada)
    // Se menciona "clientes" de forma genérica sem personalizar
    if (/como\s+os\s+clientes\s+se\s+conectam\s+com\s+voc/i.test(message) &&
        !/solar|energia|integrador|projeto/i.test(message)) {
      issues.push('resposta_generica');
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STRIP FORBIDDEN STARTERS - Remove palavras proibidas do início
  // ═══════════════════════════════════════════════════════════════════════════

  _stripForbiddenStarters(message) {
    // Lista expandida de palavras proibidas no início
    const forbiddenPatterns = [
      /^Entendo[,.\s!]*/i,
      /^Entendi[,.\s!]*/i,
      /^Compreendo[,.\s!]*/i,
      /^Perfeito[,.\s!]*/i,
      /^Ótimo[,.\s!]*/i,
      /^Legal[,.\s!]*/i,
      /^Certo[,.\s!]*/i,
      /^Claro[,.\s!]*/i,
      /^Ok[,.\s!]*/i,
      /^Maravilha[,.\s!]*/i,
      /^Show[,.\s!]*/i,
      /^Top[,.\s!]*/i,
      /^Excelente[,.\s!]*/i,
      /^Que legal[,.\s!]*/i,
      /^Entendo bem[,.\s!]*/i,
      /^Entendo como[,.\s!]*/i,
      /^Entendi que[,.\s!]*/i,
    ];

    let cleanedMessage = message;
    let wasStripped = false;

    for (const pattern of forbiddenPatterns) {
      if (pattern.test(cleanedMessage)) {
        cleanedMessage = cleanedMessage.replace(pattern, '').trim();
        wasStripped = true;
        break; // Only strip once
      }
    }

    // Se foi removido, capitalizar primeira letra
    if (wasStripped && cleanedMessage.length > 0) {
      cleanedMessage = cleanedMessage.charAt(0).toUpperCase() + cleanedMessage.slice(1);
      console.log(`    [POST-PROCESS] Stripped forbidden starter`);
    }

    return cleanedMessage;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STRIP BROKEN STARTS - Remove inícios incoerentes/quebrados
  // ═══════════════════════════════════════════════════════════════════════════

  _stripBrokenStarts(message) {
    // Padrões de início quebrado/incoerente
    const brokenPatterns = [
      /^que\s+(vocês?|você|a\s+empresa|isso)[^.?!]*[,.]\s*/i,  // "Que vocês buscam...,"
      /^e\s+(que|como|quando|onde)[^.?!]*[,.]\s*/i,           // "E que vocês...,"
      /^mas\s+(que|como)[^.?!]*[,.]\s*/i,                      // "Mas que...,"
      /^então\s+(que|como)[^.?!]*[,.]\s*/i,                    // "Então que...,"
      /^sendo\s+assim[^.?!]*[,.]\s*/i,                         // "Sendo assim...,"
      /^por\s+isso[^.?!]*[,.]\s*/i                             // "Por isso...,"
    ];

    let cleanedMessage = message;

    for (const pattern of brokenPatterns) {
      if (pattern.test(cleanedMessage)) {
        cleanedMessage = cleanedMessage.replace(pattern, '').trim();
        // Capitalizar primeira letra
        if (cleanedMessage.length > 0) {
          cleanedMessage = cleanedMessage.charAt(0).toUpperCase() + cleanedMessage.slice(1);
        }
        console.log(`    [POST-PROCESS] Stripped broken start`);
        break;
      }
    }

    return cleanedMessage;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // REGENERATE COM FIX
  // ═══════════════════════════════════════════════════════════════════════════

  async _regenerateWithFix(plan, issues, archetypeData) {
    const fixInstructions = issues.map(issue => {
      switch (issue) {
        case 'sem_pergunta':
          return 'ADICIONE uma pergunta no final';
        case 'multiplas_perguntas':
          return 'MANTENHA apenas UMA pergunta (a última)';
        case 'muitas_linhas':
          return 'REDUZA para máximo 4 linhas';
        case 'repetiu_lead':
          return 'NÃO repita o que o lead disse, apenas espelhe o sentido';
        case 'pergunta_prematura':
          return 'NÃO pergunte sobre orçamento/email ainda';
        case 'frase_incompleta':
          return 'COMECE com uma frase COMPLETA e direta. NÃO inicie com "Que vocês...", "E que...", "Mas que...". Comece reconhecendo algo específico que o lead disse';
        case 'linguagem_corporativa':
          return 'EVITE linguagem corporativa genérica. NÃO use: "nosso objetivo", "tornar esse processo", "agregar valor", "soluções personalizadas". Fale de forma HUMANA e DIRETA como vendedor experiente';
        case 'resposta_generica':
          return 'PERSONALIZE para energia solar. Mencione projetos, instalações, kits solares. NÃO fale genericamente sobre "clientes"';
        default:
          if (issue.startsWith('comeca_com_')) {
            return `NÃO comece com "${issue.replace('comeca_com_', '')}"`;
          }
          return `Corrija: ${issue}`;
      }
    }).join('. ');

    // Incluir contexto do arquétipo na regeneração
    const archContext = archetypeData ? `
ARQUÉTIPO DO LEAD: ${archetypeData.name}
Tom: ${archetypeData.tone.style}
Como falar: ${archetypeData.tone.voice}
EVITAR: ${archetypeData.avoid.join(', ')}
` : '';

    const prompt = `Reescreva esta mensagem corrigindo os problemas MAS mantendo o tom e personalidade.
${archContext}
CORREÇÕES NECESSÁRIAS:
${fixInstructions}

PERGUNTA QUE DEVE FAZER:
"${plan.nextQuestion}"

ESTRUTURA OBRIGATÓRIA (3 partes com linhas em branco):
1. Espelhamento (1 linha curta)

2. Conexão com valor (1-2 linhas)

3. Pergunta

 NÃO coloque aspas na mensagem. Escreva apenas o texto direto.
 Use LINHAS EM BRANCO entre as partes.

Escreva APENAS a mensagem corrigida:`;

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.75,
        max_tokens: 250
      });

      // Remover aspas se a LLM adicionou
      let result = completion.choices[0].message.content.trim();
      if (result.startsWith('"') && result.endsWith('"')) {
        result = result.slice(1, -1);
      }
      return result;
    } catch (e) {
      // Fallback simples
      return `${plan.nextQuestion}?`;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FALLBACK - Quando regeneração falha, criar resposta simples mas coerente
  // ═══════════════════════════════════════════════════════════════════════════

  _createSimpleFallback(plan) {
    // Templates simples por fase SPIN que nunca falham na validação
    const fallbackTemplates = {
      situation: [
        'Bacana! E ${question}?',
        'Faz sentido. E ${question}?',
        'Acontece muito. ${question}?'
      ],
      problem: [
        'Isso é comum. ${question}?',
        'Vejo isso direto. ${question}?',
        'Entendi. ${question}?'
      ],
      implication: [
        'Faz sentido. ${question}?',
        'Vejo isso acontecer. ${question}?',
        'Acontece bastante. ${question}?'
      ],
      needPayoff: [
        'Interessante. ${question}?',
        'Faz sentido. ${question}?',
        'Entendi o cenário. ${question}?'
      ],
      closing: [
        '${question}?',
        'Então, ${question}?',
        'Posso sugerir algo? ${question}?'
      ]
    };

    const stage = plan.stage || 'situation';
    const templates = fallbackTemplates[stage] || fallbackTemplates.situation;
    const template = templates[Math.floor(Math.random() * templates.length)];

    // Garantir que a pergunta não tem ? no final (vamos adicionar)
    let question = plan.nextQuestion || 'como funciona hoje';
    question = question.replace(/\?$/, '');

    const result = template.replace('${question}', question);

    console.log(`    Fallback criado: "${result}"`);
    return result;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MÉTODOS AUXILIARES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Determina próxima pergunta SPIN com INTELIGÊNCIA BANT
   * Pula perguntas cujos dados já foram coletados
   * Segue o fluxo: Situation  Problem  Implication  NeedPayoff  Closing
   */
  _determineNextSPINQuestion() {
    const currentStage = this.spin.currentStage;
    const stageConfig = SPIN_STAGES[currentStage];

    if (!stageConfig) {
      // Fallback para fechamento
      return {
        stage: 'closing',
        questionId: 'close_diagnostico',
        questionText: 'posso fazer um diagnóstico rápido do canal digital de vocês, sem compromisso',
        tracksBANT: ['conversion_meeting']
      };
    }

    // Encontrar próxima pergunta não feita E cujo BANT ainda precisa ser coletado
    const askedInStage = this.spin.questionsAsked[currentStage] || [];
    const availableQuestions = stageConfig.questions.filter(q => {
      // Pular se já foi perguntada
      if (askedInStage.includes(q.id)) {
        return false;
      }

      //  INTELIGÊNCIA BANT: Verificar se os dados dessa pergunta já foram coletados
      if (q.tracksBANT && q.tracksBANT.length > 0) {
        const bantAlreadyCollected = q.tracksBANT.every(bantField => {
          const value = this.bantData[bantField];
          return value !== null && value !== undefined && value !== '';
        });

        if (bantAlreadyCollected) {
          console.log(`    [BANT-SMART] Pulando "${q.id}" - dados já coletados: ${q.tracksBANT.join(', ')}`);
          return false; // Pular esta pergunta
        }
      }

      return true;
    });

    // Se ainda tem perguntas disponíveis nesta fase
    if (availableQuestions.length > 0) {
      //  PRIORIZAÇÃO: Ordenar por campos BANT mais importantes ainda não coletados
      const prioritizedQuestions = this._prioritizeQuestionsByMissingBANT(availableQuestions);
      const nextQ = prioritizedQuestions[0];

      return {
        stage: currentStage,
        questionId: nextQ.id,
        questionText: nextQ.text,
        followUp: nextQ.followUp,
        tracksBANT: nextQ.tracksBANT
      };
    }

    // Se não tem mais perguntas úteis, avançar para próxima fase
    const nextStage = this._getNextSPINStage(currentStage);

    if (nextStage) {
      console.log(`    [BANT-SMART] Avançando para ${nextStage} - fase ${currentStage} completa`);
      this._advanceToSPINStage(nextStage);

      // Recursivamente encontrar próxima pergunta na nova fase
      return this._determineNextSPINQuestion();
    }

    // Todas as fases completas - ir para fechamento final
    return {
      stage: 'closing',
      questionId: 'close_horario',
      questionText: 'qual o melhor horário pra gente conversar',
      tracksBANT: ['scheduling_preference']
    };
  }

  /**
   * Prioriza perguntas por campos BANT mais importantes que ainda faltam
   * Ordem de prioridade: volume > região > presença_digital > problema > timing > authority
   */
  _prioritizeQuestionsByMissingBANT(questions) {
    const bantPriority = {
      need_volume: 10,
      need_regiao: 9,
      need_caminho_orcamento: 8,
      need_presenca_digital: 7,
      need_problema_sazonalidade: 6,
      need_problema_dependencia: 6,
      need_problema_visibilidade: 5,
      need_problema_conversao: 5,
      timing_urgencia: 4,
      timing_prazo: 3,
      authority_decisor: 2,
      budget_interesse: 1
    };

    return questions.sort((a, b) => {
      const aScore = this._calculateBANTPriorityScore(a.tracksBANT, bantPriority);
      const bScore = this._calculateBANTPriorityScore(b.tracksBANT, bantPriority);
      return bScore - aScore; // Maior score primeiro
    });
  }

  /**
   * Calcula score de prioridade baseado nos campos BANT que a pergunta coleta
   */
  _calculateBANTPriorityScore(tracksBANT, priorityMap) {
    if (!tracksBANT || tracksBANT.length === 0) return 0;

    return tracksBANT.reduce((score, field) => {
      // Só conta se o campo ainda não foi coletado
      const value = this.bantData[field];
      const isCollected = value !== null && value !== undefined && value !== '';

      if (!isCollected && priorityMap[field]) {
        return score + priorityMap[field];
      }
      return score;
    }, 0);
  }

  /**
   * Retorna próxima fase SPIN
   */
  _getNextSPINStage(currentStage) {
    const currentIndex = SPIN_FLOW.indexOf(currentStage);
    if (currentIndex === -1 || currentIndex >= SPIN_FLOW.length - 1) {
      return null;
    }
    return SPIN_FLOW[currentIndex + 1];
  }

  /**
   * Avança para uma nova fase SPIN
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
    console.log(`    SPIN: ${oldStage}  ${newStage}`);
  }

  /**
   * Verifica se deve avançar de fase baseado em sinais
   */
  _checkSPINAdvanceSignals(userMessage) {
    const currentStage = this.spin.currentStage;
    const msgLower = userMessage.toLowerCase();

    // Verificar sinais de avanço
    const transitionKey = `${currentStage}_to_${this._getNextSPINStage(currentStage)}`;
    const advanceSignals = SPIN_TRANSITIONS.advanceSignals[transitionKey] || [];

    const detectedSignals = advanceSignals.filter(signal =>
      msgLower.includes(signal.toLowerCase())
    );

    if (detectedSignals.length > 0) {
      this.spin.signalsDetected[currentStage].push(...detectedSignals);

      // Verificar se atingiu mínimo de perguntas
      // NOTA: +1 porque a pergunta atual será registrada logo em seguida
      const stageConfig = SPIN_STAGES[currentStage];
      const questionsAsked = this.spin.questionsAsked[currentStage]?.length || 0;
      const effectiveQuestions = questionsAsked + 1; // Conta a pergunta que será feita

      console.log(`    [SPIN-SIGNALS] Sinais detectados: ${detectedSignals.join(', ')}`);
      console.log(`    [SPIN-SIGNALS] Perguntas: ${questionsAsked} + 1 atual = ${effectiveQuestions}, mínimo: ${stageConfig.minQuestionsBeforeAdvance}`);

      if (effectiveQuestions >= stageConfig.minQuestionsBeforeAdvance) {
        console.log(`    [SPIN-SIGNALS] Condição de avanço atingida!`);
        return {
          shouldAdvance: true,
          signals: detectedSignals,
          nextStage: this._getNextSPINStage(currentStage)
        };
      }
    }

    // Verificar sinais de regressão (lead resistente)
    const regressSignals = SPIN_TRANSITIONS.regressSignals;

    if (regressSignals.backToSituation.some(s => msgLower.includes(s))) {
      return {
        shouldAdvance: false,
        shouldRegress: true,
        regressTo: 'situation',
        reason: 'lead_resistant'
      };
    }

    if (regressSignals.backToProblem.some(s => msgLower.includes(s))) {
      const stageIndex = SPIN_FLOW.indexOf(currentStage);
      if (stageIndex > 1) { // Se está em implication ou depois
        return {
          shouldAdvance: false,
          shouldRegress: true,
          regressTo: 'problem',
          reason: 'lead_uncertain'
        };
      }
    }

    return { shouldAdvance: false };
  }

  /**
   * Alias para compatibilidade - mapeia para o novo método SPIN
   */
  _determineNextSlot() {
    const spinQuestion = this._determineNextSPINQuestion();
    return {
      slot: spinQuestion.questionId,
      hint: spinQuestion.questionText,
      stage: spinQuestion.stage,
      tracksBANT: spinQuestion.tracksBANT
    };
  }

  /**
   * Retorna status SPIN + BANT formatado
   */
  _getSlotsStatus() {
    const spinStatus = this._getSPINStatus();
    const bantStatus = this._getBANTStatus();

    return `═══ PROGRESSO SPIN ═══
Fase atual: ${spinStatus.currentStageName} (${spinStatus.currentStage})
Perguntas feitas: ${spinStatus.totalQuestions}
Fases completas: ${spinStatus.completedStages.join('  ') || 'nenhuma ainda'}

═══ DADOS BANT (tracking) ═══
${bantStatus}`;
  }

  /**
   * Retorna status detalhado da conversa SPIN
   */
  _getSPINStatus() {
    const currentStage = this.spin.currentStage;
    const stageConfig = SPIN_STAGES[currentStage];

    let totalQuestions = 0;
    const completedStages = [];

    for (const stage of SPIN_FLOW) {
      const questionsInStage = this.spin.questionsAsked[stage]?.length || 0;
      totalQuestions += questionsInStage;

      // Considerar fase completa se atingiu mínimo E avançou
      const stageIdx = SPIN_FLOW.indexOf(stage);
      const currentIdx = SPIN_FLOW.indexOf(currentStage);
      if (stageIdx < currentIdx) {
        completedStages.push(SPIN_STAGES[stage]?.name || stage);
      }
    }

    return {
      currentStage,
      currentStageName: stageConfig?.name || 'Fechamento',
      totalQuestions,
      completedStages,
      questionsInCurrentStage: this.spin.questionsAsked[currentStage]?.length || 0,
      minQuestionsRequired: stageConfig?.minQuestionsBeforeAdvance || 1
    };
  }

  /**
   * Retorna status dos dados BANT coletados
   */
  _getBANTStatus() {
    return Object.entries(this.bantData)
      .map(([field, value]) => {
        const trackingConfig = BANT_TRACKING[field];
        const weight = trackingConfig?.weight || 0;
        const status = value ? ` ${value}` : ' não coletado';
        return `${field} (${weight}pts): ${status}`;
      })
      .join('\n');
  }

  /**
   * Atualiza dados extraídos (SPIN tracking + BANT)
   */
  _updateSlots(data) {
    if (!data) return;

    // Atualizar dados do lead
    if (data.nome && !this.lead.nome) {
      this.lead.nome = data.nome;
      console.log(`    Lead nome: ${data.nome}`);
    }
    if (data.empresa && !this.lead.empresa) {
      this.lead.empresa = data.empresa;
      console.log(`    Lead empresa: ${data.empresa}`);
    }
    if (data.setor && !this.lead.setor) {
      this.lead.setor = data.setor;
      console.log(`    Lead setor: ${data.setor}`);
    }

    // Atualizar BANT tracking (dados coletados em background)
    for (const fieldName of Object.keys(this.bantData)) {
      if (data[fieldName] && !this.bantData[fieldName]) {
        this.bantData[fieldName] = data[fieldName];
        console.log(`    BANT ${fieldName}: ${data[fieldName]}`);
      }
    }

    // Manter slots sincronizado (compatibilidade)
    this.slots = this.bantData;
  }

  /**
   * Registra pergunta SPIN como feita
   */
  _markSPINQuestionAsked(questionId) {
    const currentStage = this.spin.currentStage;
    if (!this.spin.questionsAsked[currentStage]) {
      this.spin.questionsAsked[currentStage] = [];
    }
    if (!this.spin.questionsAsked[currentStage].includes(questionId)) {
      this.spin.questionsAsked[currentStage].push(questionId);
      console.log(`    SPIN pergunta registrada: ${questionId} (${currentStage})`);
    }
  }

  /**
   * Calcula progresso da qualificação (SPIN + BANT)
   *
   * Progresso é calculado em duas dimensões:
   * 1. SPIN Progress (60%): Avanço nas fases da conversa
   * 2. BANT Score (40%): Dados coletados em background
   */
  _calculateProgress() {
    // ═══════════════════════════════════════════════════════════════════════════
    // 1. SPIN PROGRESS (60% do score total)
    // ═══════════════════════════════════════════════════════════════════════════
    const spinProgress = this._calculateSPINProgress();

    // ═══════════════════════════════════════════════════════════════════════════
    // 2. BANT SCORE (40% do score total)
    // ═══════════════════════════════════════════════════════════════════════════
    const bantScore = this._calculateBANTScore();

    // ═══════════════════════════════════════════════════════════════════════════
    // SCORE FINAL COMBINADO
    // ═══════════════════════════════════════════════════════════════════════════
    const spinWeight = 0.6;
    const bantWeight = 0.4;

    const percent = Math.round(
      (spinProgress.percent * spinWeight) +
      (bantScore.percent * bantWeight)
    );

    // Fase atual é determinada pelo SPIN
    const phase = this._mapSPINStageToPhase(this.spin.currentStage);

    return {
      percent,
      phase,
      spin: spinProgress,
      bant: bantScore,
      collected: bantScore.collected,
      missing: bantScore.missing
    };
  }

  /**
   * Calcula progresso dentro do fluxo SPIN
   */
  _calculateSPINProgress() {
    const currentStageIndex = SPIN_FLOW.indexOf(this.spin.currentStage);
    const totalStages = SPIN_FLOW.length;

    // Progresso base por fase (cada fase = 20%)
    const baseProgress = (currentStageIndex / totalStages) * 100;

    // Progresso dentro da fase atual
    const currentStageConfig = SPIN_STAGES[this.spin.currentStage];
    const questionsAsked = this.spin.questionsAsked[this.spin.currentStage]?.length || 0;
    const totalQuestions = currentStageConfig?.questions?.length || 1;
    const inStageProgress = (questionsAsked / totalQuestions) * (100 / totalStages);

    const percent = Math.min(100, Math.round(baseProgress + inStageProgress));

    return {
      percent,
      currentStage: this.spin.currentStage,
      currentStageName: currentStageConfig?.name || 'Fechamento',
      questionsAsked,
      totalQuestions,
      stagesCompleted: currentStageIndex
    };
  }

  /**
   * Calcula score BANT baseado nos dados coletados
   */
  _calculateBANTScore() {
    let totalWeight = 0;
    let collectedWeight = 0;
    const collected = [];
    const missing = [];

    for (const [fieldName, config] of Object.entries(BANT_TRACKING)) {
      totalWeight += config.weight;

      if (this.bantData[fieldName]) {
        collectedWeight += config.weight;
        collected.push(fieldName);
      } else {
        missing.push(fieldName);
      }
    }

    const percent = totalWeight > 0
      ? Math.round((collectedWeight / totalWeight) * 100)
      : 0;

    return {
      percent,
      collected,
      missing,
      collectedWeight,
      totalWeight
    };
  }

  /**
   * Mapeia fase SPIN para nome de fase do funil
   */
  _mapSPINStageToPhase(spinStage) {
    const phaseMap = {
      situation: 'descoberta',
      problem: 'identificacao_problema',
      implication: 'conscientizacao',
      needPayoff: 'proposta_valor',
      closing: 'fechamento'
    };
    return phaseMap[spinStage] || 'descoberta';
  }

  /**
   * Retorna resumo BANT + SPIN state
   */
  _getBANTSummary() {
    return {
      lead: this.lead,
      spin: {
        currentStage: this.spin.currentStage,
        questionsAsked: this.spin.questionsAsked,
        stageHistory: this.spin.stageHistory,
        signalsDetected: this.spin.signalsDetected
      },
      bant: {
        need: {
          caminho_orcamento: this.bantData.need_caminho_orcamento,
          presenca_digital: this.bantData.need_presenca_digital,
          regiao: this.bantData.need_regiao,
          volume: this.bantData.need_volume,
          problema_identificado: this.bantData.need_problema_identificado,
          impacto_reconhecido: this.bantData.need_impacto_reconhecido
        },
        timing: {
          prazo: this.bantData.timing_prazo,
          urgencia: this.bantData.timing_urgencia
        },
        authority: this.bantData.authority_decisor,
        budget: this.bantData.budget_interesse
      }
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PERSISTÊNCIA
  // ═══════════════════════════════════════════════════════════════════════════

  getState() {
    return {
      contactId: this.contactId,
      turno: this.turno,
      // Estado SPIN
      spin: this.spin,
      // Dados BANT
      bantData: this.bantData,
      slots: this.bantData, // Compatibilidade
      // Lead e arquétipo
      lead: this.lead,
      archetype: this.archetype,
      toneProfile: this.toneProfile,
      historico: this.historico.slice(-20)
    };
  }

  restoreState(saved) {
    if (!saved) return;

    this.turno = saved.turno || 0;
    this.lead = { ...this.lead, ...(saved.lead || {}) };
    this.toneProfile = saved.toneProfile || this.toneProfile;
    this.historico = saved.historico || [];

    // Restaurar estado SPIN
    if (saved.spin) {
      this.spin = {
        currentStage: saved.spin.currentStage || 'situation',
        questionsAsked: saved.spin.questionsAsked || {
          situation: [],
          problem: [],
          implication: [],
          needPayoff: [],
          closing: []
        },
        stageHistory: saved.spin.stageHistory || [],
        signalsDetected: saved.spin.signalsDetected || {
          situation: [],
          problem: [],
          implication: [],
          needPayoff: []
        }
      };
    }

    // Restaurar BANT data
    if (saved.bantData) {
      this.bantData = { ...this.bantData, ...saved.bantData };
    } else if (saved.slots) {
      // Compatibilidade com formato antigo
      this.bantData = { ...this.bantData, ...saved.slots };
    }

    // Manter slots sincronizado
    this.slots = this.bantData;

    // Restaurar arquétipo se existir
    if (saved.archetype) {
      this.archetype = {
        detected: saved.archetype.detected || 'default',
        confidence: saved.archetype.confidence || 0,
        signals: saved.archetype.signals || [],
        history: saved.archetype.history || [],
        manuallySet: saved.archetype.manuallySet || false  // Preservar flag manual
      };
    }

    // Compatibilidade com engine antigo
    if (saved.dados) {
      this.lead.nome = saved.dados.nome || this.lead.nome;
      this.lead.empresa = saved.dados.empresa || this.lead.empresa;
      this.lead.setor = saved.dados.setor || this.lead.setor;
    }

    console.log(`    Estado restaurado - Turno ${this.turno} | SPIN: ${this.spin.currentStage}`);
  }

  setLeadProfile(profile) {
    if (profile.nome) this.lead.nome = profile.nome;
    if (profile.empresa) this.lead.empresa = profile.empresa;
    if (profile.setor) this.lead.setor = profile.setor;
    if (profile.cargo) this.lead.cargo = profile.cargo;
  }

  /**
   *  FIX: Configura contexto de cadência de prospecção
   * Permite que o engine saiba que o lead veio de prospecção automática
   * e use as instruções específicas no sistema de geração de respostas
   *
   * @param {Object} context - Contexto da cadência
   * @param {boolean} context.isFromCadence - Se é de cadência
   * @param {number} context.cadenceDay - Dia da cadência (D1, D2, etc)
   * @param {string} context.agentInstructions - Instruções específicas para o agente
   * @param {string} context.empresa - Nome da empresa prospectada
   */
  setCadenceContext(context) {
    this.cadenceContext = {
      isFromCadence: context.isFromCadence || false,
      cadenceDay: context.cadenceDay || null,
      agentInstructions: context.agentInstructions || null,
      empresa: context.empresa || null
    };

    // Se tem empresa da cadência, atualizar lead
    if (context.empresa && !this.lead.empresa) {
      this.lead.empresa = context.empresa;
    }

    console.log(`    [ENGINE] Contexto de cadência configurado:`, {
      isFromCadence: this.cadenceContext.isFromCadence,
      cadenceDay: this.cadenceContext.cadenceDay,
      empresa: this.cadenceContext.empresa
    });
  }

  /**
   * Retorna instruções da cadência para incluir no prompt
   * @returns {string|null}
   */
  getCadenceInstructions() {
    if (!this.cadenceContext?.agentInstructions) return null;
    return this.cadenceContext.agentInstructions;
  }

  setArchetype(arch) {
    // Mapear nomes legados (MAIÚSCULO) para novos (minúsculo)
    const legacyMap = {
      'SABIO': 'sabio',
      'HEROI': 'heroi',
      'REBELDE': 'rebelde',
      'CUIDADOR': 'cuidador',
      'EXPLORADOR': 'explorador',
      'GOVERNANTE': 'governante',
      'CRIADOR': 'criador',
      'MAGO': 'mago',
      'INOCENTE': 'inocente',
      'AMANTE': 'amante',
      'BOBO': 'bobo',
      'BOBO_DA_CORTE': 'bobo',
      'PESSOA_COMUM': 'comum',
      'COMUM': 'comum',
      // Lowercase já correto
      'sabio': 'sabio',
      'heroi': 'heroi',
      'rebelde': 'rebelde',
      'cuidador': 'cuidador',
      'explorador': 'explorador',
      'governante': 'governante',
      'criador': 'criador',
      'mago': 'mago',
      'inocente': 'inocente',
      'amante': 'amante',
      'bobo': 'bobo',
      'comum': 'comum',
      'default': 'default'
    };

    // Normalizar o nome do arquétipo
    const normalizedArch = legacyMap[arch] || legacyMap[arch?.toUpperCase?.()] || 'default';

    // Validar se arquétipo existe
    const validArchetype = JUNG_ARCHETYPES[normalizedArch] ? normalizedArch : 'default';

    // Setar como arquétipo fixo - NÃO será alterado pela detecção automática
    this.archetype.detected = validArchetype;
    this.archetype.confidence = validArchetype === 'default' ? 0 : 100; // Confiança alta (manual)
    this.archetype.manuallySet = true; // Flag para impedir que _detectArchetype() sobrescreva

    // Manter compatibilidade com toneProfile
    const archToTone = {
      sabio: { style: 'tecnico', energy: 'medio', formality: 'alto' },
      heroi: { style: 'direto', energy: 'alto', formality: 'medio' },
      rebelde: { style: 'direto', energy: 'alto', formality: 'baixo' },
      cuidador: { style: 'acolhedor', energy: 'medio', formality: 'medio' },
      explorador: { style: 'equilibrado', energy: 'alto', formality: 'baixo' },
      governante: { style: 'tecnico', energy: 'medio', formality: 'alto' },
      criador: { style: 'equilibrado', energy: 'medio', formality: 'medio' },
      mago: { style: 'equilibrado', energy: 'alto', formality: 'medio' },
      inocente: { style: 'direto', energy: 'medio', formality: 'baixo' },
      amante: { style: 'acolhedor', energy: 'alto', formality: 'baixo' },
      bobo: { style: 'equilibrado', energy: 'alto', formality: 'baixo' },
      comum: { style: 'equilibrado', energy: 'medio', formality: 'baixo' },
      default: { style: 'equilibrado', energy: 'medio', formality: 'medio' }
    };

    this.toneProfile = archToTone[validArchetype] || archToTone.default;

    console.log(`    Arquétipo setado: ${arch}  ${validArchetype}`);
  }

  /**
   * Retorna o arquétipo atual
   */
  getArchetype() {
    return {
      key: this.archetype.detected,
      name: JUNG_ARCHETYPES[this.archetype.detected]?.name || 'Equilibrado',
      confidence: this.archetype.confidence,
      data: this._getArchetypeData()
    };
  }

  getBANTSummary() {
    return this._getBANTSummary();
  }
}

export default DynamicConsultativeEngine;

// tools/bant_stages_v2.js
//  BANT STAGES V2 - SEM LOOPS, COM REQUISITOS CLAROS

import OpenAI from 'openai';
import { getRepertorioRelevante, SOBRE_EMPRESA } from '../knowledge/digital_boost_repertorio.js';
import { selectQuestionVariation, selectConsultativeResponse } from './question_variations.js';
import { classificarServicoPorDor, gerarMensagemTransicao, SERVICE_DETAILS } from '../config/services_catalog.js';
//  REMOVIDO: contextual_redirect e faq_responses agora são tratados pelo UnifiedFAQSystem no MessagePipeline

const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 *  FILOSOFIA V2:
 * - Mensagem de ABERTURA direcionada por stage
 * - Conversa CONSULTIVA até coletar campos ESSENCIAIS
 * - SEM limite de tentativas (evita avançar incompleto)
 * - Só avança quando ESSENCIAIS coletados (100%)
 * - Opcionais são bônus, não bloqueiam avanço
 */

const STAGES = ['need', 'budget', 'authority', 'timing']; // Removido 'closing' - email é coletado pelo Scheduler

//  SISTEMA DE SCORING BANT
// Cada stage tem 100 pontos possíveis
// ESSENCIAIS = alto peso (50-70 pts) | OPCIONAIS = baixo peso (30-50 pts)
// Só avança quando score >= 100 (todos essenciais coletados)

const STAGE_REQUIREMENTS = {
  need: {
    camposEssenciais: ['nome_pessoa', 'nome_negocio', 'nicho', 'cargo_funcao', 'problema_principal', 'intensidade_problema', 'receita_mensal', 'funcionarios'],  // 8 campos obrigatórios
    camposOpcionais: ['servico_identificado', 'consequencias'],  // Opcionais

    scoring: {
      nome_pessoa: 10,             // Nome de quem está conversando
      nome_negocio: 10,            // Nome do negócio
      nicho: 10,                   // Tipo de negócio (mercadinho, clínica, autônomo, restaurante)
      cargo_funcao: 10,            // Função (operação, financeiro, tudo)
      problema_principal: 20,      // Dor principal do lead
      intensidade_problema: 15,    // De 0 a 10, quanto atrapalha
      receita_mensal: 15,          // Quanto entra por mês
      funcionarios: 10,            // Quantas pessoas trabalham
      servico_identificado: 0,     // Opcional: módulo identificado
      consequencias: 0             // Opcional: consequências da dor
    },
    scoreMinimo: 100,

    openingMessage: `Boa! Pra eu te ajudar direito, me conta rapidinho:

• Como você se chama?
• Qual o nome do seu negócio e o que vocês fazem?
• E qual a maior dificuldade que você tá enfrentando hoje pra crescer?`,

    descricaoCampos: {
      nome_pessoa: 'Nome de quem está conversando (ex: João, Maria)',
      nome_negocio: 'Nome do negócio (ex: Mercado do Zé, Clínica da Dra. Ana)',
      nicho: 'Tipo de negócio (mercadinho, clínica, restaurante, autônomo, loja, serviços)',
      cargo_funcao: 'Função no negócio (operação, gestão, dono/faz tudo)',
      problema_principal: 'Dor principal do lead (tempo, controle, organização, crescimento, vendas, processos, equipe)',
      intensidade_problema: 'De 0 a 10, quanto isso atrapalha o negócio',
      receita_mensal: 'Quanto entra por mês aproximadamente (10k, 30k, 50k)',
      funcionarios: 'Quantas pessoas trabalham (sozinho, 1-5, 6-20, 20+)',
      servico_identificado: 'Módulo identificado (dre, fluxo_caixa, estoque, funil_clientes) - opcional',
      consequencias: 'O que o problema causa no negócio - opcional'
    }
  },

  budget: {
    camposEssenciais: ['faixa_investimento', 'roi_esperado', 'flexibilidade_budget'],  // 3 campos obrigatórios
    camposOpcionais: [],  //  SEM campos opcionais

    scoring: {
      faixa_investimento: 40,       // Qual plano (Básico R$400, Médio R$600, Pro R$800 - valores anuais)
      roi_esperado: 30,             // Que retorno esperam (ex: "controle total", "economizar tempo", "evitar prejuízo")
      flexibilidade_budget: 30      // Budget é fixo ou pode começar menor/maior
    },
    scoreMinimo: 100,  //  3 campos obrigatórios = 100 pontos

    openingMessage: `Beleza! Agora sobre investimento: pensando no que você me contou, quanto você acha que vale uma ferramenta pra resolver esses pontos críticos do seu negócio?

A gente tem planos personalizados que a gente ajusta conforme a sua necessidade.`,

    descricaoCampos: {
      faixa_investimento: 'Quanto pode investir por mês (até 500, até 700, até 1000, acima)',
      roi_esperado: 'Que resultado esperam (controle, economia tempo, evitar erros)',
      flexibilidade_budget: 'Se precisa parcelar ou ajustar pagamento'
    },

    //  OBJEÇÃO DE PREÇO - Roteiro quando lead diz "tá apertado"
    objecaoPreco: `Total, faz sentido.

Normalmente quando o caixa tá apertado é justamente aí que organizar ajuda mais, porque você enxerga onde cortar sem matar o negócio.

A gente tem opção de pagamento anual que sai bem mais em conta. Quer que eu te explique melhor numa conversa rápida com o especialista e você decide com calma?`
  },

  authority: {
    camposEssenciais: ['decisor_principal', 'autonomia_decisao', 'processo_decisao'],  // 3 campos obrigatórios
    camposOpcionais: [],  //  SEM campos opcionais

    scoring: {
      decisor_principal: 40,      // Quem decide (ex: "eu", "eu + sócio", "comitê")
      autonomia_decisao: 30,      // Tem autonomia ou precisa aprovar (ex: "eu decido", "preciso sócio aprovar")
      processo_decisao: 30        // Como decide (ex: "analiso e fecho", "preciso demo", "várias etapas")
    },
    scoreMinimo: 100,  //  3 campos obrigatórios = 100 pontos

    openingMessage: `Boa! Só pra eu não marcar nada errado: você decide isso sozinho ou tem alguém (sócio, contador) que costuma opinar nessas decisões?

Pergunto porque já marco a conversa do jeito certo, pra não precisar remarcar depois.`,

    descricaoCampos: {
      decisor_principal: 'Quem decide sobre sistema de gestão (eu sozinho, com sócio, com contador)',
      autonomia_decisao: 'Você tem autonomia para fechar ou precisa aprovação',
      processo_decisao: 'Costuma decidir rápido (dias) ou avaliar com calma (semanas)'
    }
  },

  timing: {
    camposEssenciais: ['urgencia', 'prazo_ideal'],  // 2 campos obrigatórios
    camposOpcionais: ['motivo_urgencia'],  // Opcional

    scoring: {
      urgencia: 50,               // Quando querem começar
      prazo_ideal: 50,            // Data ideal
      motivo_urgencia: 0          // Opcional
    },
    scoreMinimo: 100,

    openingMessage: `Show! E sobre timing: você quer resolver isso logo (tipo essa semana/próxima) ou é algo que pode esperar mais pra frente sem te prejudicar muito?

Falo isso porque quem tá nessa situação há mais tempo geralmente sente o impacto todo mês que passa sem olhar pra isso.`,

    descricaoCampos: {
      urgencia: 'Quando querem começar (agora, 1-2 meses, pode esperar)',
      prazo_ideal: 'Data ideal para ter o sistema rodando',
      motivo_urgencia: 'Por que esse timing? (opcional)'
    }
  }
  // Removido stage 'closing' - email é coletado pelo Scheduler Agent
};

//  PLANOS DISPONÍVEIS - Recomendação personalizada após BANT
export const PLANS = {
  basico: {
    nome: 'Básico',
    precoMensal: 550,
    precoAnual: 400,
    features: [
      'Dashboard de gestão financeira',
      'DRE completo',
      'Indicadores de performance',
      'Fluxo de caixa'
    ],
    // Critérios: 1-5 funcionários, receita até 5k
    criterios: {
      funcionariosMax: 5,
      receitaMax: 5000
    }
  },
  medio: {
    nome: 'Médio',
    precoMensal: 750,
    precoAnual: 600,
    features: [
      'Tudo do Básico',
      'Controle de estoque',
      'Funil de clientes',
      'Funcionalidades avançadas de gestão'
    ],
    // Critérios: 6-10 funcionários, receita até 10k
    criterios: {
      funcionariosMax: 10,
      receitaMax: 10000
    }
  },
  pro: {
    nome: 'Pro',
    precoMensal: 1000,
    precoAnual: 800,
    features: [
      'Tudo do Médio',
      'Automações completas',
      'Integrações avançadas',
      'Suporte prioritário'
    ],
    // Critérios: 11+ funcionários, receita acima de 10k
    criterios: {
      funcionariosMin: 11,
      receitaMin: 10001
    }
  }
};

//  MULTI-MODE FRAMEWORK - 3 modos de conversa baseado no tipo de dor
export const MODE_CONFIG = {
  financeiro: {
    nome: 'Modo Financeiro',

    // Variáveis do template
    TIPO_DE_PUBLICO: 'donos de pequenos negócios',
    TIPO_DE_DOR: 'bagunça financeira, falta de visão de resultado',
    DESCRICAO_DOR_FORTE: 'entra dinheiro o mês inteiro e, mesmo assim, no fim do mês você não sabe quanto foi pra empresa e quanto foi pra você de verdade',
    TIPO_DE_SOLUCAO: 'plataforma de gestão financeira + acompanhamento guiado',
    PROMESSA_RESULTADO: 'saber, todo mês, quanto sobrou limpo e evitar decisões erradas com o caixa',

    // Opções de dor para o lead escolher
    DOR_OPCOES: [
      'não sabe se tá dando lucro de verdade',
      'surpresas no caixa / falta pra pagar conta ou fornecedor',
      'despesas desorganizadas, mistura conta pessoal com empresa',
      'Outra coisa'
    ],

    // Cenários do mini-diagnóstico
    CENARIOS: [
      'você paga tudo no automático e o saldo nunca bate com o que tinha na cabeça',
      'entra cartão, pix, dinheiro… mas cada um tá num lugar',
      'não dá pra dizer com segurança quanto sobrou "pra você" no final do mês'
    ],

    // Perguntas de qualificação
    PERGUNTA_QUALIFICACAO_1: 'Mais ou menos, quanto o negócio fatura por mês hoje?',
    PERGUNTA_QUALIFICACAO_2: 'Quantas pessoas trabalham aí (contando você)?',

    // Resultados que o lead quer
    RESULTADOS: [
      'saber se tá dando lucro ou prejuízo, sem chute',
      'organizar o caixa e as despesas',
      'ter uma visão simples do que pode sobrar pra você'
    ],

    // Solução e benefícios
    NOME_SOLUCAO: 'Plano de Gestão Financeira',
    BENEFICIOS: [
      'organizar todas as entradas e saídas em um lugar só',
      'mostrar, mês a mês, se deu lucro ou prejuízo',
      'deixar claro quanto você pode tirar sem sufocar o negócio'
    ],

    // Como o investimento se paga
    MELHORIA_MENSURAVEL: 'economizar em erro, gasto desnecessário e compra mal planejada pelo menos esse valor'
  },

  gestao: {
    nome: 'Modo Gestão do Negócio',

    TIPO_DE_PUBLICO: 'donos de pequenos negócios com equipe (3–30 pessoas)',
    TIPO_DE_DOR: 'desorganização de rotina, equipe perdida, dono apagando incêndio',
    DESCRICAO_DOR_FORTE: 'todo mundo trabalha o dia todo, mas parece que nada anda, você apaga incêndio o tempo inteiro e sente que o negócio depende demais de você',
    TIPO_DE_SOLUCAO: 'sistema simples de gestão + rotinas e indicadores básicos',
    PROMESSA_RESULTADO: 'ter a operação rodando mais redonda, com equipe sabendo o que fazer e você com mais controle e menos caos',

    DOR_OPCOES: [
      'equipe desorganizada, ninguém sabe exatamente o que fazer',
      'tudo depende de você, se você some o negócio trava',
      'não existem processos claros, cada dia é uma confusão diferente',
      'Outra coisa'
    ],

    CENARIOS: [
      'você resolve dúvidas o dia todo e sente que "se não olhar, não acontece"',
      'tarefas se perdem, ninguém sabe o que é prioridade',
      'você leva a empresa nas costas e não consegue tirar férias de verdade'
    ],

    PERGUNTA_QUALIFICACAO_1: 'Hoje, quantas pessoas estão na sua equipe (contando você)?',
    PERGUNTA_QUALIFICACAO_2: 'Você já tem algum tipo de rotina ou processo escrito ou tudo é mais no boca a boca?',

    RESULTADOS: [
      'ter a equipe sabendo o que fazer sem você ter que mandar o tempo todo',
      'ter processos simples que deixam o dia a dia menos caótico',
      'conseguir planejar a semana em vez de só reagir aos problemas'
    ],

    NOME_SOLUCAO: 'Plano Gestão Enxuta',
    BENEFICIOS: [
      'organizar tarefas e responsabilidades da equipe em um painel simples',
      'criar rotinas semanais pra diminuir "apagar incêndio"',
      'acompanhar 2–3 indicadores básicos pra saber se a operação tá melhorando'
    ],

    MELHORIA_MENSURAVEL: 'ganhar tempo, reduzir retrabalho e ter a operação rodando sem depender 100% de você'
  },

  pessoal: {
    nome: 'Modo Pessoal / Rotina do Dono',

    TIPO_DE_PUBLICO: 'donos de pequenos negócios que se sentem sobrecarregados',
    TIPO_DE_DOR: 'cansaço, falta de tempo, cabeça sobrecarregada',
    DESCRICAO_DOR_FORTE: 'você vive correndo o dia inteiro, mas sente que nunca zera a lista, não desconecta nem quando tá em casa e a cabeça não desliga do trabalho',
    TIPO_DE_SOLUCAO: 'rotina guiada + sistema simples de organização pessoal',
    PROMESSA_RESULTADO: 'ter dias mais leves, com prioridade clara e tempo pra você sem abandonar o negócio',

    DOR_OPCOES: [
      'falta de tempo pra nada, só trabalho',
      'cansaço mental / estresse o tempo todo',
      'começa várias coisas e não consegue manter rotina nenhuma',
      'Outra coisa'
    ],

    CENARIOS: [
      'você acorda já atrasado, reage ao dia e chega à noite exausto',
      'mistura trabalho com vida pessoal o tempo todo, nunca "desliga"',
      'sente culpa por não dar atenção nem pro negócio do jeito que queria, nem pra vida pessoal'
    ],

    PERGUNTA_QUALIFICACAO_1: 'Hoje você trabalha em média quantas horas por dia?',
    PERGUNTA_QUALIFICACAO_2: 'Você já tentou seguir alguma rotina ou método de organização pessoal antes?',

    RESULTADOS: [
      'ter uma rotina que caiba na sua vida real',
      'conseguir separar melhor trabalho e vida pessoal',
      'reduzir a sensação de estar sempre atrasado em tudo'
    ],

    NOME_SOLUCAO: 'Programa Rotina do Dono',
    BENEFICIOS: [
      'montar uma rotina mínima viável adaptada à sua agenda',
      'usar um painel simples pra não carregar tudo na cabeça',
      'ter checkpoints semanais pra ajustar sem surtar'
    ],

    MELHORIA_MENSURAVEL: 'mais saúde, mais foco, melhores decisões e menos estresse'
  }
};

/**
 *  Detecta o modo de conversa baseado na dor identificada
 * @param {string} problemaPrincipal - Dor principal do lead
 * @returns {string} - 'financeiro', 'gestao' ou 'pessoal'
 */
export function detectarModo(problemaPrincipal) {
  if (!problemaPrincipal) return 'financeiro'; // Default

  const lower = problemaPrincipal.toLowerCase();

  // Padrões para modo GESTÃO (específicos para evitar falsos positivos)
  const padraoGestao = [
    'equipe desorganizada', 'time perdido', 'funcionário não sabe',
    'processo bagunçado', 'rotina da equipe', 'tarefa perdida',
    'delegar', 'depende de mim', 'dependo de mim', 'tudo depende',
    'apagar incêndio', 'ninguém sabe o que fazer', 'caos na operação',
    'equipe', 'time', 'processos'
  ];

  // Padrões para modo PESSOAL (mais específicos)
  const padraoPessoal = [
    'cansado', 'cansaço', 'estresse', 'estressado', 'sobrecarga',
    'sobrecarregado', 'não desliga', 'rotina pessoal', 'vida pessoal',
    'exausto', 'burnout', 'saúde mental', 'família', 'férias',
    'falta de tempo', 'não tenho tempo', 'tempo pra mim', 'esgotado'
  ];

  // Padrões para modo FINANCEIRO
  const padraoFinanceiro = [
    'lucro', 'prejuízo', 'caixa', 'financeiro', 'dinheiro',
    'faturamento', 'receita', 'despesa', 'conta', 'pagar',
    'sobrar', 'resultado', 'DRE', 'fluxo de caixa', 'não sei se dá lucro'
  ];

  // Verificar padrões (prioridade: gestão > pessoal > financeiro)
  for (const padrao of padraoGestao) {
    if (lower.includes(padrao)) return 'gestao';
  }

  for (const padrao of padraoPessoal) {
    if (lower.includes(padrao)) return 'pessoal';
  }

  for (const padrao of padraoFinanceiro) {
    if (lower.includes(padrao)) return 'financeiro';
  }

  return 'financeiro'; // Default
}

/**
 *  Retorna o contexto do modo para uso no sistema
 * @param {string} modo - 'financeiro', 'gestao' ou 'pessoal'
 * @returns {Object} - Configuração do modo
 */
export function getModeContext(modo) {
  return MODE_CONFIG[modo] || MODE_CONFIG.financeiro;
}

/**
 * Parseia número de funcionários de forma inteligente
 * Aceita: "sozinho", "2", "dois", "1-5", "6 pessoas", "mais de 10", etc.
 */
function parseFuncionarios(texto) {
  if (!texto) return 1;

  const lower = texto.toLowerCase().trim();

  // Extrair número do texto PRIMEIRO (ex: "6 pessoas", "10 funcionários")
  // Isso tem prioridade sobre palavras
  const numMatch = texto.match(/(\d+)/);
  if (numMatch) {
    return parseInt(numMatch[1], 10);
  }

  // Sozinho / só eu
  if (lower.includes('sozinho') || lower.includes('só eu') || lower.includes('somente eu')) {
    return 1;
  }

  // Números escritos por extenso (ordem do maior para menor para evitar conflitos)
  // Ex: "cinquenta" antes de "cinco" para não pegar "cinco" de "cinquenta"
  const escritos = [
    ['cinquenta', 50], ['quarenta', 40], ['trinta', 30], ['vinte', 20],
    ['quinze', 15], ['doze', 12], ['onze', 11], ['dez', 10],
    ['nove', 9], ['oito', 8], ['sete', 7], ['seis', 6],
    ['cinco', 5], ['quatro', 4], ['três', 3], ['tres', 3],
    ['dois', 2], ['duas', 2]
  ];

  for (const [palavra, valor] of escritos) {
    if (lower.includes(palavra)) return valor;
  }

  // "um/uma" - verificar se é número ou artigo
  // "um funcionário" = 1, mas "algum" não deve contar
  if (/\bum\b|\buma\b/.test(lower)) return 1;

  // Ranges comuns
  if (lower.includes('1-5') || lower.includes('1 a 5') || lower.includes('até 5')) return 5;
  if (lower.includes('6-10') || lower.includes('6 a 10') || lower.includes('até 10')) return 10;
  if (lower.includes('11-20') || lower.includes('11 a 20') || lower.includes('mais de 10')) return 15;
  if (lower.includes('20+') || lower.includes('mais de 20') || lower.includes('acima de 20')) return 25;

  // Indicadores de tamanho
  if (lower.includes('pequen') || lower.includes('pouc')) return 3;
  if (lower.includes('médi') || lower.includes('medi') || lower.includes('alguns')) return 8;
  if (lower.includes('grand') || lower.includes('muit') || lower.includes('bastan')) return 15;

  return 1; // Default conservador
}

/**
 * Parseia receita mensal de forma inteligente
 * Aceita: "5k", "5 mil", "5000", "5.000", "R$ 5000", "uns 10 mil", etc.
 */
function parseReceita(texto) {
  if (!texto) return 5000;

  const lower = texto.toLowerCase().trim();

  // Remover R$, reais, etc
  const limpo = lower.replace(/r\$|reais|por mês|mensal|mensais/g, '').trim();

  // Padrões com k (5k, 10k, etc)
  const kMatch = limpo.match(/(\d+)\s*k/);
  if (kMatch) {
    return parseInt(kMatch[1], 10) * 1000;
  }

  // Padrões com "mil" (5 mil, 10 mil, etc)
  const milMatch = limpo.match(/(\d+)\s*mil/);
  if (milMatch) {
    return parseInt(milMatch[1], 10) * 1000;
  }

  // Números diretos (5000, 10000, 5.000, 10.000)
  const numMatch = limpo.match(/(\d+[\.,]?\d*)/);
  if (numMatch) {
    const num = numMatch[1].replace(/\./g, '').replace(',', '.');
    const valor = parseFloat(num);

    // Lógica melhorada para interpretar valores:
    // - 1-99: provavelmente em milhares (ex: "5" = 5k, "50" = 50k)
    // - 100-999: ambíguo, mas provavelmente reais (ex: "500" = R$500)
    // - 1000+: valor em reais (ex: "5000" = R$5000)
    if (valor < 100) return valor * 1000;
    if (valor >= 100 && valor < 1000) return valor; // R$500 = R$500
    return valor; // R$5000 = R$5000
  }

  // Palavras indicativas de faixa
  if (lower.includes('pouc') || lower.includes('baix') || lower.includes('inici')) return 3000;
  if (lower.includes('médi') || lower.includes('medi') || lower.includes('razoável')) return 10000;
  if (lower.includes('alto') || lower.includes('bom') || lower.includes('bem')) return 20000;
  if (lower.includes('muit') || lower.includes('bastante')) return 50000;

  return 5000; // Default conservador
}

/**
 * Recomenda plano baseado nos dados coletados do BANT
 * @param {Object} needData - Dados do stage NEED (funcionarios, receita_mensal)
 * @param {Object} budgetData - Dados do stage BUDGET (faixa_investimento)
 * @returns {Object} { plano, motivo, mensagem }
 */
export function recommendPlan(needData, budgetData) {
  const funcionariosRaw = needData?.funcionarios || '';
  const receitaRaw = needData?.receita_mensal || '';
  const budgetRaw = budgetData?.faixa_investimento || '';

  // Parsear com funções inteligentes
  const numFuncionarios = parseFuncionarios(funcionariosRaw);
  const valorReceita = parseReceita(receitaRaw);
  const valorBudget = parseReceita(budgetRaw); // Usa mesma lógica

  console.log(` [PLAN-RECOMMEND] Parsing:`, {
    funcionariosRaw,
    receitaRaw,
    budgetRaw,
    numFuncionarios,
    valorReceita,
    valorBudget
  });

  // Lógica de recomendação baseada em funcionários E receita
  // Critérios do usuário:
  // - Básico: 1-5 funcionários, até R$5k
  // - Médio: 6-10 funcionários, até R$10k
  // - Pro: 11+ funcionários, acima R$10k
  let planoRecomendado = 'basico';
  let motivo = '';

  // Critérios combinados (usa OR - qualquer critério que atinja)
  if (numFuncionarios >= 11 || valorReceita > 10000) {
    planoRecomendado = 'pro';
    motivo = 'escala do negócio que se beneficia de automações';
  } else if (numFuncionarios >= 6 || valorReceita > 5000) {
    planoRecomendado = 'medio';
    motivo = 'tamanho do negócio que precisa de gestão completa';
  } else {
    planoRecomendado = 'basico';
    motivo = 'pra começar com o essencial e crescer conforme os resultados';
  }

  // Ajustar baseado no budget declarado
  // 1. Se budget numérico é menor que o preço do plano, ajustar para baixo
  // 2. Se budget tem palavras indicando dificuldade, ajustar para baixo
  const budgetApertado = budgetRaw && (
    budgetRaw.includes('apertado') ||
    budgetRaw.includes('difícil') ||
    budgetRaw.includes('pouco') ||
    budgetRaw.includes('não tenho') ||
    budgetRaw.includes('complicado')
  );

  // Verificar se budget numérico comporta o plano recomendado
  if (valorBudget > 0 && valorBudget < 1000) {
    // Budget declarado é um valor mensal de investimento
    if (planoRecomendado === 'pro' && valorBudget < 800) {
      console.log(` [PLAN-RECOMMEND] Budget ${valorBudget} < Pro (800) - ajustando`);
      if (valorBudget >= 600) {
        planoRecomendado = 'medio';
        motivo = 'melhor custo-benefício para o investimento disponível';
      } else {
        planoRecomendado = 'basico';
        motivo = 'começar com o essencial e crescer conforme os resultados';
      }
    } else if (planoRecomendado === 'medio' && valorBudget < 600) {
      console.log(` [PLAN-RECOMMEND] Budget ${valorBudget} < Médio (600) - ajustando`);
      planoRecomendado = 'basico';
      motivo = 'começar com o essencial e crescer conforme os resultados';
    } else if (planoRecomendado === 'basico' && valorBudget < 400) {
      console.log(` [PLAN-RECOMMEND] Budget ${valorBudget} < Básico (400) - mantendo básico mas notando`);
      motivo = 'plano inicial com condições especiais para começar';
    }
  }

  // Ajustar se budget declarado como apertado
  if (budgetApertado && planoRecomendado !== 'basico') {
    console.log(` [PLAN-RECOMMEND] Budget apertado detectado - ajustando para básico`);
    planoRecomendado = 'basico';
    motivo = 'começar com o essencial e crescer conforme os resultados';
  }

  const plano = PLANS[planoRecomendado];

  return {
    id: planoRecomendado,
    plano: plano,
    motivo: motivo,
    numFuncionarios,
    valorReceita,
    valorBudget
  };
}

/**
 * Gera mensagem de recomendação personalizada
 */
export function getRecommendationMessage(recommendation, needData) {
  const { plano, motivo } = recommendation;
  const nomePessoa = needData?.nome_pessoa || 'você';
  const nomeNegocio = needData?.nome_negocio || 'seu negócio';

  const featuresText = plano.features.slice(0, 3).map(f => ` ${f}`).join('\n');

  return `Beleza ${nomePessoa}! Analisando o que você me contou sobre ${nomeNegocio}, o plano que mais faz sentido é o **${plano.nome}**:

 **R$ ${plano.precoAnual}/mês** (no anual)
${featuresText}

Escolhi esse pelo ${motivo}.

Quer que eu agende uma conversa rápida com nosso especialista pra te mostrar como funciona na prática? Ele pode tirar suas dúvidas e você decide com calma.`;
}

export class BANTStagesV2 {
  constructor(phoneNumber = null) {
    this.phoneNumber = phoneNumber; //  FIX: Armazenar phoneNumber para persistência
    this.currentStage = 'need';
    this.stageIndex = 0;
    this.stageData = {
      need: { campos: {}, tentativas: 0, lastUpdate: null },
      budget: { campos: {}, tentativas: 0, lastUpdate: null },
      authority: { campos: {}, tentativas: 0, lastUpdate: null },
      timing: { campos: {}, tentativas: 0, lastUpdate: null }
      // Removido closing - email é coletado pelo Scheduler
    };
    this.conversationHistory = [];
    this.maxAttemptsPerStage = 10; //  FIX: Limite de tentativas por stage para evitar loops
    this.persistenceEnabled = true; //  FIX: Flag para habilitar persistência
    this.companyProfile = null; // Perfil da empresa (nome, empresa, setor)
  }

  /**
   * Define o perfil da empresa para personalização das perguntas
   * @param {Object} profile - { nome: string, empresa: string, setor: string }
   */
  setCompanyProfile(profile) {
    this.companyProfile = profile;
    console.log(` [BANT-V2] Perfil da empresa definido:`, profile);
  }

  /**
   * Substitui placeholders [EMPRESA], [NOME], [SETOR] nas mensagens
   * @param {string} message - Mensagem com placeholders
   * @returns {string} Mensagem com placeholders substituídos
   */
  replacePlaceholders(message) {
    if (!message || typeof message !== 'string') return message;

    let result = message;

    // Substituir [EMPRESA] com nome da empresa ou fallback
    if (this.companyProfile?.empresa) {
      result = result.replace(/\[EMPRESA\]/g, this.companyProfile.empresa);
    } else {
      result = result.replace(/\[EMPRESA\]/g, 'vocês');
    }

    // Substituir [NOME] com nome do lead ou fallback
    if (this.companyProfile?.nome) {
      result = result.replace(/\[NOME\]/g, this.companyProfile.nome);
    } else {
      result = result.replace(/\[NOME\]/g, 'você');
    }

    // Substituir [SETOR] com setor da empresa ou fallback
    if (this.companyProfile?.setor) {
      result = result.replace(/\[SETOR\]/g, this.companyProfile.setor);
    } else {
      result = result.replace(/\[SETOR\]/g, 'seu setor');
    }

    return result;
  }

  /**
   * Processa mensagem do usuário
   */
  async processMessage(userMessage) {
    const stage = this.currentStage;
    const requirements = STAGE_REQUIREMENTS[stage];

    console.log(`\n [BANT-V2] Stage: ${stage} | Tentativa: ${this.stageData[stage].tentativas + 1}`);
    console.log(` [BANT-V2] Campos coletados:`, this.stageData[stage].campos);

    //  FIX CRÍTICO: Verificar se está em loop infinito
    if (this.stageData[stage].tentativas >= this.maxAttemptsPerStage) {
      console.error(` [BANT-V2-LOOP] LOOP DETECTADO! Stage ${stage} atingiu ${this.stageData[stage].tentativas} tentativas`);
      console.error(` [BANT-V2-LOOP] Forçando avanço para evitar travamento`);

      // Forçar avanço mesmo sem todos os campos
      this.advanceStage();
      const transitionMessage = this.getNextStageOpening();

      const isComplete = this.isBANTComplete();
      const result = {
        stage: this.currentStage,
        message: `Entendo. Vamos seguir em frente.\n\n${transitionMessage}`,
        stageData: this.stageData,
        isComplete: isComplete,
        mode: 'stages_v2',
        loopDetected: true //  Flag para indicar que houve loop
      };

      //  Se BANT completo, adicionar recomendação de plano
      if (isComplete) {
        const { recommendation, message: recMessage } = this.getPlanRecommendation();
        result.planRecommendation = recommendation;
        result.recommendationMessage = recMessage;
      }

      return result;
    }

    // Incrementar tentativas
    this.stageData[stage].tentativas++;
    this.stageData[stage].lastUpdate = Date.now(); //  FIX: Registrar timestamp da última atualização

    //  REMOVIDO: Detecção de situações sensíveis agora é feita pelo UnifiedFAQSystem no MessagePipeline (Layer 3)
    //  REMOVIDO: Detecção de FAQ agora é feita pelo UnifiedFAQSystem no MessagePipeline (Layer 3)
    // Isso garante tratamento consistente antes da mensagem chegar aos agents

    //  CORREÇÃO CRÍTICA: Carregar histórico REAL do banco ao invés de confiar no this.conversationHistory
    // Isso garante que o GPT sempre vê o histórico atualizado, mesmo se houver dessincronização
    let historyForGPT = [];

    try {
      if (this.phoneNumber) {
        const { getRecentMessages } = await import('../memory.js');
        const dbMessages = await getRecentMessages(this.phoneNumber, 10); // Últimas 10 mensagens

        // Converter formato do banco para formato do GPT
        historyForGPT = dbMessages
          .filter(msg => msg.text && msg.text.trim()) // Apenas mensagens com texto
          .map(msg => ({
            role: msg.from_me ? 'assistant' : 'user',
            content: msg.text
          }));

        console.log(` [BANT-V2-HISTORY] Carregado ${historyForGPT.length} mensagens do banco`);
      }
    } catch (error) {
      console.error(` [BANT-V2-HISTORY] Erro ao carregar histórico do banco:`, error.message);
      // Fallback: usar this.conversationHistory se carregar do banco falhar
      historyForGPT = this.conversationHistory;
    }

    // Adicionar mensagem atual ao histórico (para persistência futura)
    this.conversationHistory.push({
      role: 'user',
      content: userMessage
    });

    // Analisar com GPT usando histórico do banco (fonte única de verdade)
    const analysis = await this.analyzeWithGPT(userMessage, historyForGPT);

    console.log(` [BANT-V2] Análise GPT:`, analysis.campos_coletados);
    console.log(` [BANT-V2] Resposta consultiva: "${(analysis.resposta_consultiva || '').toString().substring(0, 80)}..."`);

    //  Adicionar resposta da Leadly ao histórico para contexto futuro
    this.conversationHistory.push({
      role: 'assistant',
      content: analysis.resposta_consultiva
    });

    // Atualizar campos coletados
    Object.keys(analysis.campos_coletados).forEach(campo => {
      if (analysis.campos_coletados[campo]) {
        this.stageData[stage].campos[campo] = analysis.campos_coletados[campo];
      }
    });

    //  NOVO: Classificar serviço automaticamente ao detectar problema_principal no stage NEED
    if (stage === 'need' && analysis.campos_coletados.problema_principal && !this.stageData[stage].campos.servico_identificado) {
      console.log(`\n [SERVICOS] Classificando serviço baseado no problema...`);

      const classificacao = classificarServicoPorDor(analysis.campos_coletados.problema_principal);

      if (classificacao.servico && classificacao.confianca >= 50) {
        // Classificação com confiança >= 50%
        this.stageData[stage].campos.servico_identificado = classificacao.servico;
        this.stageData[stage].campos.confianca_servico = classificacao.confianca;
        this.stageData[stage].campos.servico_detalhes = SERVICE_DETAILS[classificacao.servico];

        console.log(` [SERVICOS] Serviço identificado: ${classificacao.servico} (${classificacao.confianca}% confiança)`);
        console.log(` [SERVICOS] ${SERVICE_DETAILS[classificacao.servico].emoji} ${SERVICE_DETAILS[classificacao.servico].nome}`);

        // Gerar mensagem personalizada de transição
        const mensagemServico = gerarMensagemTransicao(
          classificacao.servico,
          analysis.campos_coletados.problema_principal
        );

        // Adicionar à resposta consultiva se ainda não estiver completa
        if (!this.checkEssenciaisColetados(stage)) {
          console.log(` [SERVICOS] Adicionando mensagem personalizada à resposta`);
          analysis.resposta_consultiva = `${analysis.resposta_consultiva}\n\n${mensagemServico}`;
        }
      } else {
        console.log(` [SERVICOS] Não foi possível classificar o serviço (confiança: ${classificacao.confianca}%)`);
      }
    }

    //  CALCULAR SCORE E VERIFICAR SE PODE AVANÇAR
    const currentScore = this.calculateStageScore(stage);
    const scoreMinimo = requirements.scoreMinimo;
    const essenciaisColetados = this.checkEssenciaisColetados(stage);

    console.log(` [BANT-V2] Score atual: ${currentScore}/${scoreMinimo} (mínimo para avançar)`);
    console.log(` [BANT-V2] Pode avançar: ${essenciaisColetados ? 'SIM' : 'NÃO'}`);
    console.log(` [BANT-V2] Campos essenciais: ${requirements.camposEssenciais.join(', ')}`);
    console.log(` [BANT-V2] Coletados: ${Object.keys(this.stageData[stage].campos).join(', ')}`);

    if (essenciaisColetados) {
      //  AVANÇAR para próximo stage
      console.log(` [BANT-V2] Todos os essenciais coletados - avançando`);

      //  FIX CRÍTICO: Persistir estado ANTES de avançar
      await this.persistState();

      this.advanceStage(); //  Avançar PRIMEIRO

      //  FIX BUG DUPLICAÇÃO: Verificar se GPT já incluiu pergunta na resposta
      // Problema: Quando o lead responde o penúltimo campo essencial, GPT extrai o campo
      // E pergunta sobre o próximo (porque ainda havia 2 campos antes da extração).
      // Depois, o sistema detecta que todos os essenciais foram coletados e concatena
      // uma mensagem de transição, resultando em DUAS perguntas sobre o mesmo campo.
      const gptResponseHasQuestion = (analysis.resposta_consultiva || '').includes('?');

      if (gptResponseHasQuestion) {
        // GPT já fez uma pergunta - NÃO concatenar transição para evitar duplicação
        console.log(` [BANT-V2] GPT já incluiu pergunta - pulando transição para evitar duplicação`);
        console.log(`    Resposta GPT: "${analysis.resposta_consultiva.substring(0, 80)}..."`);

        const isComplete = this.isBANTComplete();
        const result = {
          stage: this.currentStage,
          message: this.replacePlaceholders(analysis.resposta_consultiva),
          needsTransition: false, //  NÃO concatenar transição
          stageData: this.stageData,
          isComplete: isComplete,
          mode: 'stages_v2'
        };

        //  Se BANT completo, adicionar recomendação de plano
        if (isComplete) {
          const { recommendation, message: recMessage } = this.getPlanRecommendation();
          result.planRecommendation = recommendation;
          result.recommendationMessage = recMessage;
        }

        return result;
      }

      // GPT não fez pergunta - adicionar mensagem de transição
      const transitionMessage = this.getNextStageOpening();
      console.log(` [BANT-V2] GPT não perguntou - adicionando transição de stage`);

      const isComplete = this.isBANTComplete();
      const result = {
        stage: this.currentStage,
        message: this.replacePlaceholders(analysis.resposta_consultiva), //  Substituir placeholders
        transitionMessage: this.replacePlaceholders(transitionMessage),   //  Substituir placeholders na transição
        needsTransition: true,                   //  Flag para indicar que há transição
        stageData: this.stageData,
        isComplete: isComplete,
        mode: 'stages_v2'
      };

      //  Se BANT completo, adicionar recomendação de plano
      if (isComplete) {
        const { recommendation, message: recMessage } = this.getPlanRecommendation();
        result.planRecommendation = recommendation;
        result.recommendationMessage = recMessage;
      }

      return result;
    }

    //  CONTINUAR no stage atual (faltam essenciais)
    //  IMPORTANTE: NÃO concatenar openingMessage em tentativas > 1
    // Isso evita redundância e mantém o fluxo consultivo natural
    return {
      stage: this.currentStage,
      message: this.replacePlaceholders(analysis.resposta_consultiva), //  Substituir placeholders
      stageData: this.stageData,
      isComplete: false,
      mode: 'stages_v2'
    };
  }

  /**
   *  NOVO: Calcula score do stage atual baseado nos campos coletados
   */
  calculateStageScore(stage) {
    const requirements = STAGE_REQUIREMENTS[stage];
    const camposColetados = this.stageData[stage].campos;
    const scoring = requirements.scoring;

    let score = 0;

    // Somar pontos dos campos coletados
    for (const campo in camposColetados) {
      const valorColetado = camposColetados[campo];
      if (valorColetado && valorColetado !== 'DESCONHECIDO' && scoring[campo]) {
        score += scoring[campo];
      }
    }

    return score;
  }

  /**
   * Verifica se todos os campos ESSENCIAIS foram coletados (baseado em score)
   */
  checkEssenciaisColetados(stage) {
    const requirements = STAGE_REQUIREMENTS[stage];
    const currentScore = this.calculateStageScore(stage);
    const scoreMinimo = requirements.scoreMinimo;

    return currentScore >= scoreMinimo;
  }

  /**
   * Verifica se BANT completo (timing coletado = pronto para handoff)
   */
  isBANTComplete() {
    // BANT completo quando timing (último stage) tem essenciais coletados
    return this.stageIndex >= STAGES.length &&
           this.checkEssenciaisColetados('timing');
  }

  /**
   * Gera recomendação de plano personalizada baseada nos dados coletados
   * @returns {Object} { recommendation, message }
   */
  getPlanRecommendation() {
    const needData = this.stageData.need?.campos || {};
    const budgetData = this.stageData.budget?.campos || {};

    const recommendation = recommendPlan(needData, budgetData);
    const message = getRecommendationMessage(recommendation, needData);

    console.log(` [BANT-V2] Recomendação de plano:`, {
      plano: recommendation.plano.nome,
      motivo: recommendation.motivo,
      funcionarios: recommendation.numFuncionarios,
      receita: recommendation.valorReceita
    });

    return {
      recommendation,
      message
    };
  }

  /**
   * Analisa com GPT para extrair informações e gerar resposta consultiva
   * @param {string} userMessage - Mensagem atual do usuário
   * @param {Array} conversationHistory - Histórico completo da conversa
   */
  async analyzeWithGPT(userMessage, conversationHistory = []) {
    const stage = this.currentStage;
    const requirements = STAGE_REQUIREMENTS[stage];
    const allCampos = [...requirements.camposEssenciais, ...requirements.camposOpcionais];

    const camposDescricao = allCampos.map(campo =>
      `• ${campo}: ${requirements.descricaoCampos[campo]}`
    ).join('\n');

    const camposFaltando = allCampos.filter(campo =>
      !this.stageData[stage].campos[campo]
    );

    //  NOVO: Separar campos essenciais faltando
    const essenciaisFaltando = requirements.camposEssenciais.filter(campo =>
      !this.stageData[stage].campos[campo]
    );

    //  REPERTÓRIO RICO: Buscar conteúdo relevante da Digital Boost
    const repertorio = getRepertorioRelevante({
      stage,
      leadSector: null, // TODO: pegar do leadState
      painType: null
    });

    //  Incluir últimas 3 mensagens do histórico como contexto
    const recentHistory = conversationHistory.slice(-6); // Últimas 3 trocas (user + assistant)
    const historyContext = recentHistory.length > 0
      ? `\n CONTEXTO DA CONVERSA (últimas mensagens):\n${recentHistory.map((msg, i) =>
          `${msg.role === 'user' ? 'LEAD' : 'LEADLY'}: "${msg.content}"`
        ).join('\n')}\n`
      : '';

    // Preparar contexto do perfil da empresa
    const profileContext = this.companyProfile
      ? `\n PERFIL DO LEAD:\n• Nome: ${this.companyProfile.nome || 'Não informado'}\n• Empresa: ${this.companyProfile.empresa || 'Não informado'}\n• Setor: ${this.companyProfile.setor || 'Não informado'}\n`
      : '';

    //  MULTI-MODE: Detectar modo baseado na dor coletada
    const problemaPrincipal = this.stageData.need?.campos?.problema_principal || '';
    const modoDetectado = detectarModo(problemaPrincipal);
    const modeConfig = getModeContext(modoDetectado);

    // Contexto do modo para adaptar a linguagem
    const modeContext = problemaPrincipal
      ? `\n MODO DETECTADO: ${modeConfig.nome}
 CONTEXTO DO MODO:
• Tipo de dor: ${modeConfig.TIPO_DE_DOR}
• Promessa: ${modeConfig.PROMESSA_RESULTADO}
• Cenários típicos:
  - ${modeConfig.CENARIOS.join('\n  - ')}
• Benefícios da solução:
  - ${modeConfig.BENEFICIOS.join('\n  - ')}
• Como se paga: ${modeConfig.MELHORIA_MENSURAVEL}

 USE ESTE CONTEXTO para adaptar seus mini-diagnósticos, cenários e linguagem à dor específica do lead.\n`
      : '';

    const prompt = `Você é a Leadly, SDR consultivo da Digital Boost (canal digital de orçamento para integradoras de energia solar).
${historyContext}${profileContext}${modeContext}
 STAGE ATUAL: ${stage.toUpperCase()} | Tentativa #${this.stageData[stage].tentativas + 1}

 CAMPOS DO STAGE "${stage}":
${camposDescricao}

 JÁ COLETADOS (NÃO pergunte novamente):
${Object.keys(this.stageData[stage].campos).filter(k => this.stageData[stage].campos[k]).map(k => `• ${k}: "${this.stageData[stage].campos[k]}"`).join('\n') || 'Nenhum ainda'}

 ESSENCIAIS FALTANDO (prioridade):
${essenciaisFaltando.map(c => `• ${c}: ${requirements.descricaoCampos[c]}`).join('\n') || ' Todos essenciais coletados!'}

${essenciaisFaltando.length > 0 ? ` OPCIONAIS FALTANDO (se houver tempo):
${camposFaltando.filter(c => !requirements.camposEssenciais.includes(c)).map(c => `• ${c}`).join('\n') || 'Nenhum'}` : ''}

 PRÓXIMO CAMPO A COLETAR: ${essenciaisFaltando.length > 0 ? `"${essenciaisFaltando[0]}" (ESSENCIAL)` : ' Stage completo - NÃO faça mais perguntas!'}

 MENSAGEM DO LEAD:
"${userMessage}"

 SUA TAREFA:
1. **Reconheça brevemente** o que o lead disse (1 linha, seja específico)
2. **Extraia campos** apenas se ele respondeu diretamente
3. ${essenciaisFaltando.length === 1 ? ' **ATENÇÃO CRÍTICA - ÚLTIMO CAMPO ESSENCIAL**: Este é o ÚLTIMO campo essencial do stage. Quando o lead responder, APENAS reconheça brevemente ("Perfeito!", "Entendi!", "Anotado!") SEM fazer nenhuma pergunta adicional. O sistema avançará automaticamente para o próximo stage.' : essenciaisFaltando.length > 1 ? '**Faça a próxima pergunta** do campo ESSENCIAL que falta' : ' **PARE AQUI - NÃO FAÇA NENHUMA PERGUNTA** - Apenas diga algo como "Perfeito! Anotado." ou "Entendi, obrigado."'}

${essenciaisFaltando.length === 0 ? ' ATENÇÃO CRÍTICA: TODOS OS CAMPOS ESSENCIAIS JÁ FORAM COLETADOS. NÃO faça perguntas de aprofundamento, clarificação, ou follow-up. A conversa avançará automaticamente para o próximo stage.' : ''}

${essenciaisFaltando.length === 1 ? ` **ÚLTIMO CAMPO ESSENCIAL**: Você está perguntando sobre "${essenciaisFaltando[0]}". Se o lead RESPONDER este campo NA MENSAGEM ATUAL, NÃO faça mais perguntas! Apenas confirme ("Perfeito, anotado!" ou similar) SEM perguntas adicionais. O stage avançará automaticamente.` : ''}

 REGRAS DE EXTRAÇÃO:
• Preencha APENAS campos que o lead mencionou DIRETAMENTE
•  **NUNCA REPITA A MESMA PERGUNTA** - Se o campo já está em "JÁ COLETADOS", NÃO pergunte novamente
•  Respostas SIMPLES são VÁLIDAS e devem ser extraídas IMEDIATAMENTE:
  - "1-5"  válido para funcionarios: "1-5 pessoas"
  - "2 a 5 mil reais"  válido para faixa_investimento: "R$ 2.000 a R$ 5.000"
  - "Decido sozinho"  válido para decisor_principal: "Decisor único"
  - "Tenho sim" / "Tenho" / "Sim, tenho"  válido para autonomia_decisao: "Autonomia total" (quando perguntado sobre autonomia)
  - "Total liberdade" / "Autonomia total" / "Tenho total liberdade" / "Tenho autonomia total"  válido para autonomia_decisao: "Autonomia total"
  - "Liberdade para decidir" / "Liberdade total" / "Completa autonomia"  válido para autonomia_decisao: "Autonomia total"
  - "É rápido" / "Rápido" / "Dias"  válido para processo_decisao: "Decisão rápida"
  - "Com urgência"  válido para urgencia: "Urgente"
  - "Agora"  válido para urgencia: "Imediato"
  - "Crítico"  válido para intensidade_problema: "Crítico"
  - "Vendas"  válido para problema_principal: "Vendas"
•  **ATENÇÃO ESPECIAL - AUTONOMIA/DECISOR**:
  - Quando você pergunta sobre autonomia/decisão E o lead responde com QUALQUER variação de "autonomia", "liberdade", "decido sozinho", "eu decido"  EXTRAIA imediatamente
  - "Decido sozinho"  decisor_principal: "Decisor único" + autonomia_decisao: "Autonomia total"
  - "Tenho total liberdade"  autonomia_decisao: "Autonomia total" + decisor_principal: "Decisor único"
  - "Eu que decido" / "Sou eu" / "Eu mesmo"  decisor_principal: "Decisor único" + autonomia_decisao: "Autonomia total"
  - "Preciso consultar X"  decisor_principal: "Decisão compartilhada com X" + autonomia_decisao: "Precisa aprovação"
• Respostas vagas sem contexto ("Sim", "Ok")  deixe NULL, mas continue conversando
• NÃO invente ou infira campos
•  ABREVIAÇÕES NUMÉRICAS - Converta automaticamente:
  - "8k" ou "8 mil"  "R$ 8.000" ou "8.000"
  - "50k" ou "50 mil"  "R$ 50.000" ou "50.000"
  - "2.5k"  "R$ 2.500" ou "2.500"
  - "100k"  "R$ 100.000" ou "100.000"
• ${stage === 'budget' ? ' DETECÇÃO ESPECIAL para flexibilidade_budget: Se lead diz "aberto", "flexível", "pode aumentar", "conforme resultados"  marque como "Flexível"' : ''}


 EXEMPLOS:

Exemplo 1 - Lead: "Vendas" (COLETANDO CAMPO ESSENCIAL)
{
  "campos_coletados": { "problema_principal": "Vendas" },
  "resposta_consultiva": "Vendas travadas geralmente têm raiz em 3 pontos: leads, funil desorganizado, ou follow-up.\\n\\nNo caso de vocês, quão grave é: crítico, impacta bastante, ou moderado?"
}

Exemplo 2 - Lead: "1-5" (RESPOSTA SIMPLES - ACEITE E EXTRAIA)
{
  "campos_coletados": { "funcionarios": "1-5" },
  "resposta_consultiva": "Equipe de 1 a 5, anotado."
}

Exemplo 2.1 - Leadly perguntou "você decide sozinho ou precisa alinhar com alguém?"  Lead: "Tenho total liberdade" (RESPOSTA COM AUTONOMIA)
{
  "campos_coletados": {
    "decisor_principal": "Decisor único",
    "autonomia_decisao": "Autonomia total"
  },
  "resposta_consultiva": "Autonomia total facilita bastante! Isso acelera a implementação em 50-70%.\\n\\nE sobre timing: vocês costumam decidir rápido (dias/semanas) ou preferem avaliar com calma (meses)?"
}

Exemplo 2.2 - Leadly perguntou "Você tem autonomia total para fechar?"  Lead: "Tenho sim" (RESPOSTA AFIRMATIVA SIMPLES)
{
  "campos_coletados": { "autonomia_decisao": "Autonomia total" },
  "resposta_consultiva": "Autonomia total para fechar facilita muito a implementação. Isso acelera o processo em 50-70%.\\n\\nE sobre o processo: vocês costumam analisar e decidir rápido (dias) ou preferem avaliar com calma (semanas)?"
}

Exemplo 2b - Lead: "8k" (NÚMERO ABREVIADO - CONVERTA PARA FORMATO COMPLETO)
{
  "campos_coletados": { "receita_mensal": "R$ 8.000" },
  "resposta_consultiva": "R$ 8 mil por mês, anotado. E quantos funcionários vocês têm?"
}

Exemplo 3 - Lead: "Bastante, perdemos clientes" (COLETANDO MAIS CAMPOS DO MESMO STAGE)
{
  "campos_coletados": { "intensidade_problema": "Bastante grave, perda de clientes" },
  "resposta_consultiva": "Entendo, perder clientes é sinal vermelho. Quanto estimam que isso custa por mês em receita perdida?"
}

Exemplo 4 - Lead: "Uns R$ 50k" (FINALIZANDO STAGE - TODOS ESSENCIAIS COLETADOS)
{
  "campos_coletados": { "receita_mensal": "R$ 50.000" },
  "resposta_consultiva": "Perfeito! Anotado."
}

 ERRADO - NÃO FAÇA ISSO:
{
  "resposta_consultiva": "R$ 50 mil por mês. E como vocês lidam com essa receita atualmente?"   PERGUNTA EXTRA
}

 CORRETO - APENAS RECONHEÇA:
{
  "resposta_consultiva": "R$ 50 mil anotado. Obrigado!"   SEM PERGUNTAS
}

 FORMATO JSON OBRIGATÓRIO:
{
  "campos_coletados": {
    ${allCampos.map(c => `"${c}": null`).join(',\n    ')}
  },
  "resposta_consultiva": "1-2 linhas específicas + pergunta direta"
}`;

    try {
      //  DEBUG: Log context being sent to GPT
      console.log(`\n [BANT-V2-DEBUG] === CONTEXTO ENVIADO AO GPT ===`);
      console.log(` Stage: ${stage}`);
      console.log(` User Message: "${userMessage}"`);
      console.log(` Conversation History: ${conversationHistory.length} messages`);
      if (conversationHistory.length > 0) {
        console.log(` Últimas 3 mensagens do histórico:`);
        conversationHistory.slice(-3).forEach((msg, i) => {
          console.log(`   ${i+1}. [${msg.role}]: "${msg.content.substring(0, 100)}..."`);
        });
      }
      console.log(` Campos faltando: ${camposFaltando.join(', ')}`);
      console.log(` Campos já coletados:`, this.stageData[stage].campos);
      console.log(` [BANT-V2-DEBUG] === FIM CONTEXTO ===\n`);

      //  TIMEOUT COM CLEANUP: Implementação robusta com AbortController
      let timeoutId;
      const timeoutMs = 30000;

      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`OpenAI API timeout after ${timeoutMs/1000}s`));
        }, timeoutMs);
      });

      const completionPromise = openaiClient.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Você é a Leadly, SDR consultivo e PERSUASIVO da Digital Boost (canal digital de orçamento para integradoras de energia solar).

 MENTALIDADE DE VENDAS - SEMPRE AVANÇAR PRO PRÓXIMO PASSO:
- Você é uma vendedora consultiva - seu objetivo é FECHAR REUNIÃO com o especialista
- Cada mensagem deve ter um "próximo passo" claro (mesmo que sutil)
- Nunca deixe a conversa esfriar - sempre dê motivo para o lead responder
- Se o lead demonstra interesse, APROVEITE o momento e avance rápido
- Se o lead resiste, não desista - mude o ângulo e continue

 TÉCNICAS DE PERSUASÃO CONSULTIVA:

1. **URGÊNCIA NATURAL** (não forçada)
   - "Quanto mais tempo sem resolver, mais dinheiro escorre"
   - "Cada mês que passa é prejuízo que não volta"
   - "Se você já sabe o problema, não faz sentido esperar"

2. **DOR  CONSEQUÊNCIA  SOLUÇÃO**
   - Identifique a dor, amplifique a consequência, ofereça a saída
   - "Se continuar assim por mais 6 meses, quanto você estima que vai perder?"
   - "Isso tá te custando X por mês. A gente resolve por Y. Faz sentido?"

3. **PROVA SOCIAL E AUTORIDADE**
   - "A gente já ajudou +200 negócios parecidos com o seu"
   - "Outros [tipo de negócio] que tinham esse problema conseguiram [resultado]"
   - "Trabalhamos exclusivamente com integradoras de energia solar - entendemos o mercado"

4. **PERGUNTAS DIRECIONADAS** (assumem que vai acontecer)
   -  NUNCA: "Você quer agendar uma reunião?"
   -  SEMPRE: "Qual horário funciona melhor pra você: manhã ou tarde?"
   - "Você prefere que eu te mostre isso essa semana ou semana que vem?"

5. **OBJEÇÃO = OPORTUNIDADE**
   - "Tá caro"  "Se não economizar pelo menos isso em erro, nem faz sentido continuar"
   - "Não tenho tempo"  "Justamente por isso que automação faz sentido"
   - "Vou pensar"  "Claro! Só pra eu entender: o que ainda tá na dúvida?"

6. **SOFT CLOSING** (plantar a reunião desde cedo)
   - "Isso é exatamente o que a gente resolve. Quer que eu te mostre como funciona em 15 min?"
   - "Pelo que você tá me contando, faz sentido a gente conversar. Posso puxar uma call rápida?"
   - "A melhor forma de você ver se faz sentido é numa conversa de 15 min com o especialista"

 PERSONALIDADE E TOM - ABORDAGEM CONSULTIVA:

1. **HUMANO E DO DIA-A-DIA** (não corporativo)
   - Fale como alguém que entende a correria de pequeno negócio
   - Use linguagem simples, direta, sem jargões
   - Seja como um parceiro que já viu esse filme antes

2. **ENTREGA VALOR ANTES DE PERGUNTAR**
   - Cada mensagem deve dar uma dica, insight ou mini-diagnóstico
   - Mostre que você entende O PROBLEMA antes de coletar dados
   - Exemplo: "Quando o caixa fica negativo no dia 20, geralmente é por X ou Y"

3. **CONTEXTO DE NICHO ESPECÍFICO**
   Adapte exemplos ao tipo de negócio:
   - MERCADINHO/VAREJO: boleto fornecedor, prazo cartão 30 dias, margem apertada
   - CLÍNICA/SAÚDE: agendamento, inadimplência paciente, convênio atrasado
   - AUTÔNOMO/SERVIÇOS: mistura conta pessoal, não sabe o que sobra, cliente devendo
   - RESTAURANTE: CMV alto, desperdício, pico de caixa fim de semana

4. **VOCÊ SUGERE O MÓDULO, NÃO PERGUNTA**
   -  ERRADO: "Qual área você quer resolver?"
   -  CERTO: "Pelo que você falou, o problema tá no fluxo de caixa. A gente resolve isso primeiro."

5. **TOM DE CONVERSA, NÃO QUESTIONÁRIO**
   - Menos perguntas formais, mais conversa natural
   - Use: "E aí...", "No seu caso...", "Geralmente..."
   - Evite: "Poderia me informar...", "Qual seria..."

 REGRA ABSOLUTA - SE O PROMPT DISSER "PARE AQUI - NÃO FAÇA NENHUMA PERGUNTA":
- Você DEVE parar IMEDIATAMENTE e NÃO fazer NENHUMA pergunta adicional
- Apenas reconheça de forma profissional ("Anotado.", "Registrado.")
- NÃO faça perguntas de aprofundamento, clarificação, ou follow-up
- A conversa avançará automaticamente para o próximo stage

 ESTRUTURA DE RESPOSTA - CONSULTIVA:

**PASSO 1: MINI-DIAGNÓSTICO ou DICA PRÁTICA** (1-2 linhas)
- Mostre que você entende o problema real do dia-a-dia
- Dê um insight que agregue valor imediato

 ERRADO: "Entendi que vendas é um desafio importante."
 CORRETO: "Caixa negativo no dia 20 geralmente é por duas coisas: ou o cartão demora 30 dias pra cair, ou o boleto do fornecedor vence antes de você receber."

 ERRADO: "Compreendo a situação de investimento."
 CORRETO: "Com R$ 200/mês você já consegue organizar o básico e saber o que sobra todo mês. Se não economizar pelo menos isso em erro, nem faz sentido continuar."

**PASSO 2: CONEXÃO COM A REALIDADE DO LEAD**
- Use exemplos do nicho dele (mercadinho, clínica, autônomo)
- Mostre que você já viu esse filme antes
- Exemplo: "Em clínica, o problema geralmente é paciente que não aparece ou convênio que atrasa"

**PASSO 3: PRÓXIMA PERGUNTA COMO CONVERSA**
- Não pareça questionário, pareça interesse genuíno
-  NUNCA use: "Poderia me informar...", "Qual seria..."
-  USE: "E aí, no seu caso...", "E como tá...", "Geralmente..."

**PASSO 4: PERGUNTE O MÍNIMO NECESSÁRIO**
- Só pergunte o que realmente precisa saber
- Se já dá pra entender pelo contexto, não pergunte de novo

 EXEMPLOS - ABORDAGEM CONSULTIVA E HUMANA:

 **Exemplo 1 - NEED: Lead de mercadinho diz "não sei se dá lucro":**
{
  "campos_coletados": { "problema_principal": "Não sabe se dá lucro" },
  "resposta_consultiva": "Isso é super comum em mercadinho. O dinheiro entra, mas entre boleto do fornecedor, cartão que demora 30 dias, e despesa do dia-a-dia, no fim do mês você não sabe o que sobrou.\\n\\nO problema é que cada mês assim é dinheiro que escorre sem você ver. A gente ajuda +200 negócios a resolver exatamente isso.\\n\\nVocê consegue separar o que é do negócio do que é pessoal, ou tá tudo misturado?"
}

 **Exemplo 2 - BUDGET: Lead respondeu "cabe sim":**
{
  "campos_coletados": { "faixa_investimento": "Cabe no orçamento" },
  "resposta_consultiva": "Ótimo! Então é mais uma questão de ver se faz sentido mesmo.\\n\\nE o que você espera de retorno: ter controle do que entra e sai, economizar tempo ou evitar erro no final do mês?"
}

 **Exemplo 2b - BUDGET: Lead respondeu "tá apertado" (OBJEÇÃO DE PREÇO):**
{
  "campos_coletados": { "faixa_investimento": "Orçamento apertado" },
  "resposta_consultiva": "Entendo. Mas pensa comigo: quanto você tá perdendo por mês por não ter visibilidade do que entra e sai? Mesmo que seja R$ 200-300 em erro ou desperdício, já paga o investimento.\\n\\nNa real, quando o caixa tá apertado é quando mais faz sentido organizar — porque você enxerga onde cortar sem matar o negócio.\\n\\nQuer que eu te mostre em 15 min como funciona e você decide se faz sentido?"
}
**OBS:** Objeção de preço - amplifica a dor, mostra ROI implícito e propõe reunião.

 **Exemplo 3a - AUTHORITY: Lead respondeu "Decido sozinho":**
{
  "campos_coletados": {
    "decisor_principal": "Decisor único",
    "autonomia_decisao": "Autonomia total"
  },
  "resposta_consultiva": "Isso facilita bastante! Quando é o dono que decide, a gente consegue resolver rápido sem precisar de reunião com sócio ou aprovação de terceiros.\\n\\nAnotado."
}
**OBS:** Se já coletou decisor + autonomia, PARE aqui.

 **Exemplo 3b - NEED: Lead de clínica diz "pacientes não aparecem":**
{
  "campos_coletados": { "problema_principal": "No-show de pacientes" },
  "resposta_consultiva": "No-show em clínica é prejuízo duplo: você perde o horário E ainda tem custo fixo rodando. A maioria das vezes é falta de lembrete ou confirmação.\\n\\nE aí, quantos pacientes por dia vocês atendem mais ou menos?"
}

 **Exemplo 4 - NEED: Lead autônomo diz "cliente devendo":**
{
  "campos_coletados": { "problema_principal": "Inadimplência de clientes" },
  "resposta_consultiva": "Quando você é autônomo, cobrar fica difícil porque é pessoal. Aí o cliente promete e não paga, você fica sem jeito de cobrar de novo.\\n\\nQuanto mais ou menos você tem pra receber de cliente que tá devendo?"
}

 **Exemplo 5 - NEED: Lead respondeu valor (NÚMERO SIMPLES - ACEITE!):**
{
  "campos_coletados": { "receita_mensal": "R$ 30.000/mês" },
  "resposta_consultiva": "30k/mês é um faturamento bom. Com esse volume, ter visibilidade clara faz diferença porque qualquer melhoria de 5% já são R$ 1.500 por mês.\\n\\nE quantas pessoas trabalham com você no negócio?"
}

 **Exemplo 6 - NEED: Lead respondeu "só eu" (ÚLTIMO CAMPO - PARE!):**
{
  "campos_coletados": { "funcionarios": "1 (sozinho)" },
  "resposta_consultiva": "Beleza, então você faz tudo — e é aí que ter um sistema ajuda mais, porque você não tem tempo pra ficar fazendo controle manual. Anotado."
}
**OBS:** PARE! Sem perguntas adicionais, stage completo.

 **Exemplo 7 - TIMING: Lead respondeu "agora":**
{
  "campos_coletados": {
    "urgencia": "Imediato",
    "prazo_ideal": "Esta semana"
  },
  "resposta_consultiva": "Perfeito! Quando é urgente assim, a gente consegue te mostrar o sistema e deixar rodando em 2-3 dias. Anotado!"
}
**OBS:** Stage completo - PARE aqui. O scheduler vai perguntar sobre horário.

 **Exemplo 8 - TIMING: Lead respondeu "quando der":**
{
  "campos_coletados": {
    "urgencia": "Sem urgência",
    "prazo_ideal": "Indefinido"
  },
  "resposta_consultiva": "Entendo. Mas pensa comigo: cada mês que passa sem organizar é dinheiro que escorre e não volta.\\n\\nSe você já sabe que precisa resolver, não faz sentido esperar. Bora fazer uma call rápida de 15 min essa semana pra você ver se faz sentido?"
}

 **Exemplo 4 - OFF-TOPIC SENSÍVEL: Lead menciona "Meu cachorro fugiu":**
{
  "campos_coletados": {},
  "resposta_consultiva": "Sinto muito em saber sobre isso. Espero sinceramente que tudo se resolva da melhor forma possível.\\n\\nFique à vontade para cuidar do que for necessário neste momento. Quando estiver mais tranquilo(a), podemos retomar nossa conversa. Estarei à disposição para seguir no momento que for mais conveniente para você."
}

 **Exemplo 4.1 - OFF-TOPIC SENSÍVEL: Lead menciona "Minha mãe adoeceu":**
{
  "campos_coletados": {},
  "resposta_consultiva": "Compreendo a situação delicada pela qual você está passando. Espero que tudo se resolva bem.\\n\\nFique à vontade para cuidar do que for necessário neste momento. Quando estiver mais tranquilo(a), podemos retomar nossa conversa. Estarei à disposição para seguir no momento que for mais conveniente para você."
}

 **Exemplo 4.2 - OFF-TOPIC SENSÍVEL: Lead menciona "Bati o carro":**
{
  "campos_coletados": {},
  "resposta_consultiva": "Lamento muito saber disso. Desejo que tudo se resolva da melhor maneira.\\n\\nFique à vontade para cuidar do que for necessário neste momento. Quando estiver mais tranquilo(a), podemos retomar nossa conversa. Estarei à disposição para seguir no momento que for mais conveniente para você."
}

 **Exemplo 5 - OFF-TOPIC: Lead pergunta "Vocês atendem até que horas?":**
{
  "campos_coletados": {},
  "resposta_consultiva": "Boa pergunta! Nossos agentes de IA funcionam 24/7, então você sempre terá suporte. A equipe humana está disponível seg-sex, 9h-18h.\\n\\nAproveitando que estamos conversando: qual o principal desafio do negócio hoje — vendas, leads ou atendimento?"
}

 **ANTI-PATTERNS - NUNCA FAÇA ISSO:**

 **ERRO 1: Linguagem corporativa**
Lead: "Não sei se dou lucro"
 ERRADO: "Entendi que a mensuração de rentabilidade é um desafio. Qual o impacto no EBITDA?"
**Problema:** Parece consultor de multinacional, não parceiro de pequeno negócio.

 CORRETO: "Isso é super comum. O dinheiro entra, mas entre boleto do fornecedor e cartão que demora 30 dias, no fim do mês você não sabe o que sobrou.\\n\\nVocê consegue separar o que é do negócio do que é pessoal, ou tá tudo misturado?"

 **ERRO 2: Questionário formal**
Lead: "Meu caixa tá negativo"
 ERRADO: "Poderia me informar qual a sua receita mensal aproximada e quantos colaboradores possui?"
**Problema:** Parece formulário, não conversa.

 CORRETO: "Caixa negativo no dia 20 geralmente é cartão que demora ou boleto que vence antes. É isso que tá acontecendo?\\n\\nE aí, mais ou menos quanto entra por mês no negócio?"

 **ERRO 3: Perguntas desnecessárias quando stage completo**
Lead: "Só eu" (ÚLTIMO CAMPO)
 ERRADO: "Entendi, você trabalha sozinho. E como você gerencia as demandas?"
**Problema:** Pergunta extra quando stage já completo.

 CORRETO: "Beleza, então você faz tudo — ter um sistema ajuda porque você não tem tempo pra ficar fazendo controle manual. Anotado."

 **REGRA DE OURO - VENDER CONSULTIVAMENTE:**
- Cada resposta = 1 mini-diagnóstico + 1 dica prática + pergunta que avança
-  PROIBIDO: linguagem corporativa, questionário formal, múltiplas perguntas
-  NUNCA responda só com "Entendi", "Perfeito", "Compreendo" ou "Faz sentido" sozinhos
-  SEMPRE: mini-diagnóstico ou dica antes de qualquer pergunta
-  SEMPRE: tom de conversa, exemplos do dia-a-dia, valor antes de perguntar
-  SEMPRE: deixe claro o custo de NÃO resolver o problema
-  SEMPRE: plante a ideia da reunião mesmo nos stages iniciais

 **QUANDO USAR SOFT CLOSING:**
- No final do NEED (antes de avançar): "Isso é exatamente o que a gente resolve. Vou te fazer mais algumas perguntas pra montar a melhor proposta."
- No BUDGET com objeção: "Sem investimento, quanto você estima que vai continuar perdendo por mês?"
- No AUTHORITY: "Como você decide sozinho, a gente consegue resolver rápido - sem precisar remarcar."
- **IMPORTANTE:** O agendamento real é feito pelo Scheduler Agent, não faça perguntas de horário no BANT.

 **DETECÇÃO INTELIGENTE DE DOR:**
A dor do lead pode NÃO ser financeira explícita. Seu trabalho é IDENTIFICAR a dor real e adaptar.

**Se lead diz que NÃO tem dor financeira:**
- NÃO insista em dor financeira
- IDENTIFIQUE o que ele REALMENTE quer resolver
- ADAPTE perguntas para essa dor específica

**Tipos de dor que você deve detectar:**
1. **Controle/Visibilidade**: "não sei quanto tá sobrando", "perco as contas"
2. **Tempo**: "gasto horas fazendo planilha", "não tenho tempo pra ver números"
3. **Crescimento**: "quero expandir mas não sei se aguento", "não sei se posso contratar"
4. **Organização**: "tá tudo bagunçado", "não acho nada", "cada um faz de um jeito"
5. **Tomada de decisão**: "tomo no achismo", "não sei se vale a pena", "fico na dúvida"
6. **Cobrança/Recebíveis**: "cliente devendo", "não cobro direito", "perco muito"

**Como pivotar quando lead nega dor financeira:**
 Lead: "Na verdade tô bem no financeiro"
 ERRADO: "Mas você sabe quanto sobra todo mês?"
 CERTO: "Boa, isso é raro! E o que te fez responder a mensagem então? Tem algo que você quer melhorar ou organizar melhor?"

**Adaptação de perguntas por dor detectada:**
- Se dor = TEMPO: "Quanto tempo você gasta por semana olhando números?"
- Se dor = CRESCIMENTO: "Você consegue simular hoje se vale a pena contratar mais gente?"
- Se dor = CONTROLE: "Você sabe exatamente quanto sobrou no mês passado?"
- Se dor = ORGANIZAÇÃO: "Como vocês controlam isso hoje? Planilha, caderno, na cabeça?"
- Se dor = DECISÃO: "Quando você precisa decidir algo importante, onde você olha?"

**IMPORTANTE:** problema_principal deve refletir a DOR REAL do lead, não a que você assumiu.
Exemplos válidos de problema_principal:
- "Quer ter controle" (não tem dor, mas quer organizar)
- "Gasta muito tempo em planilha" (dor de tempo)
- "Não consegue planejar crescimento" (dor de decisão)
- "Não sabe se pode contratar" (dor de visibilidade)

 **REGRAS DE FORMATO WHATSAPP:**
- Envie mensagens curtas (3 a 6 linhas, máximo 500 caracteres)
- Faça no MÁXIMO 1 pergunta principal por mensagem
- Pode ter 1 pergunta extra curta se necessário (ex: "mais ou menos?")
- NUNCA envie lista de perguntas de uma vez - quebre em etapas
- Isso força conversa humana, não formulário

 FORMATO JSON OBRIGATÓRIO:
{
  "campos_coletados": { apenas_campos_respondidos_nesta_mensagem },
  "resposta_consultiva": "[empatia 1-2 linhas]\\n\\n[pergunta específica do PRÓXIMO campo BANT]"
}

 ESTILO DE COMUNICAÇÃO:
- Tom: Parceiro que entende o dia-a-dia de pequeno negócio
- Use linguagem simples: "E aí...", "No seu caso...", "Geralmente..."
- Evite jargões: "EBITDA", "KPIs", "ROI", "payback" (prefira "o que sobra", "economizar")
- Máximo 1 emoji por mensagem
- Frases curtas, parágrafos pequenos

 ADAPTAÇÃO POR NICHO:
- Use o tipo de negócio para dar exemplos específicos:
  • Mercadinho: boleto fornecedor, cartão 30 dias, margem apertada
  • Clínica: paciente que falta, convênio atrasado, agenda vazia
  • Autônomo: conta misturada, cliente devendo, não sabe o que sobra
  • Restaurante: CMV, desperdício, pico fim de semana
- Se não souber o nicho, pergunte de forma natural

 REPERTÓRIO - PROBLEMAS COMUNS DO DIA-A-DIA:

 DIAGNÓSTICOS RÁPIDOS (use para mostrar que entende):
• "Caixa negativo no dia 20"  cartão que demora ou boleto que vence antes
• "Não sei se dou lucro"  mistura conta pessoal com negócio
• "Cliente devendo"  falta cobrança organizada ou controle de recebíveis
• "Sempre falta produto"  compra no susto, sem histórico de venda
• "Não sei onde vai o dinheiro"  falta categorizar despesa

 MINI-VALORES (dicas práticas que agregam na hora):
• "Separar conta pessoal do negócio já resolve 50% do problema"
• "Anotar TUDO que entra e sai por 30 dias mostra onde tá vazando"
• "Regra 50-30-20: 50% operação, 30% crescimento, 20% reserva"
• "Se você não sabe o que sobra, não tem como saber se pode contratar"

 NÚMEROS SIMPLES (evite percentuais complexos):
• "5-10% de economia no faturamento" (não "35% de redução no CAC")
• "R$ 200/mês se paga se economizar 1 erro por mês"
• "Em 30 dias você já vê o que sobra todo mês"
• "2-3 dias pra deixar rodando"

 FORMATAÇÃO OBRIGATÓRIA:
- SEMPRE use \\n\\n para separar mini-diagnóstico da pergunta
- Isso cria parágrafos no WhatsApp e melhora legibilidade
- Exemplo BOM: "Caixa negativo no dia 20 geralmente é cartão ou boleto.\\n\\nE aí, mais ou menos quanto entra por mês?"
- Exemplo RUIM: "Entendo. Quanto entra?" (sem valor, sem contexto)

 REGRAS DE EXTRAÇÃO:
1. Preencha APENAS o que o lead RESPONDEU EXPLICITAMENTE
2.  RESPOSTAS CURTAS SÃO VÁLIDAS: "só eu", "5k", "agora"
3. Se não respondeu, deixe null (não invente)
4. NÃO preencha TODOS os campos de uma vez

 EXEMPLOS:
   • "Não sei se dou lucro"  problema_principal = "Não sabe se dá lucro" 
   • "só eu"  funcionarios = "1 (sozinho)" 
   • "oi" quando perguntou outra coisa  null 
5. NUNCA repita mesma pergunta
6. Formato: mini-diagnóstico + \\n\\n + pergunta natural

Retorne APENAS JSON válido.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.5, // Controlado para seguir formato sem variações indesejadas
        max_tokens: 1000 // Aumentado para evitar truncamento (empatia + pergunta + JSON)
      });

      // Race entre completion e timeout
      const completion = await Promise.race([
        completionPromise,
        timeoutPromise
      ]).finally(() => {
        //  CRITICAL: Sempre limpar timeout para evitar memory leak
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      });

      const content = completion.choices[0].message.content.trim();

      //  DEBUG: Log raw GPT response
      console.log(` [BANT-V2-DEBUG] RAW GPT Response (stage: ${stage}):`);
      console.log(content);
      console.log(` [BANT-V2-DEBUG] End of raw response\n`);

      const jsonMatch = content.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        console.error(` [BANT-V2-DEBUG] NO JSON MATCH FOUND in GPT response!`);
        throw new Error('Resposta GPT sem JSON válido');
      }

      console.log(` [BANT-V2-DEBUG] Extracted JSON string:`);
      console.log(jsonMatch[0]);
      console.log(` [BANT-V2-DEBUG] End of JSON string\n`);

      const parsed = JSON.parse(jsonMatch[0]);

      console.log(` [BANT-V2-DEBUG] Parsed object:`);
      console.log(JSON.stringify(parsed, null, 2));

      //  FILTRO DE SEGURANÇA: Remover campos que não pertencem a este stage
      const camposPermitidos = [...requirements.camposEssenciais, ...requirements.camposOpcionais];
      const camposColetados = {};
      const camposInvalidos = [];

      for (const [campo, valor] of Object.entries(parsed.campos_coletados || {})) {
        if (camposPermitidos.includes(campo)) {
          //  FIX BUG #1: Aceitar valores falsy válidos (0, false, '')
          // Apenas rejeitar null, undefined, 'null' (string) e '' (empty string)
          if (valor !== null && valor !== undefined && valor !== 'null' && valor !== '') {
            camposColetados[campo] = valor;
          }
        } else {
          camposInvalidos.push(campo);
        }
      }

      if (camposInvalidos.length > 0) {
        console.warn(` [BANT-V2] GPT tentou extrair campos INVÁLIDOS para stage ${stage}: ${camposInvalidos.join(', ')}`);
        console.warn(` [BANT-V2] Campos foram FILTRADOS. Apenas permitidos: ${camposPermitidos.join(', ')}`);
      }

      return {
        campos_coletados: camposColetados,
        resposta_consultiva: parsed.resposta_consultiva || 'Me conta mais sobre isso...'
      };

    } catch (error) {
      console.error(` [BANT-V2] Erro no GPT (stage: ${stage}, tentativa: ${this.stageData[stage].tentativas}):`, error.message);
      console.error(` [BANT-V2] Stack:`, error.stack);

      // Identificar tipo de erro
      if (error.message && error.message.includes('timeout')) {
        console.error(` [BANT-V2] TIMEOUT na chamada GPT - usando fallback`);
      } else if (error.message && error.message.includes('rate limit')) {
        console.error(` [BANT-V2] RATE LIMIT atingido - usando fallback`);
      }

      // Fallback seguro
      return {
        campos_coletados: {},
        resposta_consultiva: this.getFallbackQuestion(stage)
      };
    }
  }

  /**
   * Obtém mensagem de abertura do próximo stage
   */
  getNextStageOpening() {
    if (this.stageIndex >= STAGES.length) {
      return "Perfeito! Vou te enviar o diagnóstico agora. ";
    }

    const nextStage = STAGES[this.stageIndex];
    return STAGE_REQUIREMENTS[nextStage].openingMessage;
  }

  /**
   *  NOVO: Retorna exemplos de perguntas para um campo específico
   */
  getExampleQuestionsForField(stage, field) {
    const questionMap = {
      need: {
        problema_principal: `- "Vendas travadas geralmente têm raiz em 3 pontos: falta de leads qualificados, funil desorganizado, ou follow-up inconsistente. Vimos empresas aumentarem receita em 40-60% só resolvendo um desses. Qual desses 3 é o maior gargalo para vocês hoje?"
- "Nossos dados mostram que 70% dos problemas de crescimento vêm de: (1) geração de leads, (2) conversão, ou (3) retenção. No caso de vocês, qual dessas áreas tá mais crítica?"`,

        intensidade_problema: `- "Quando o problema é crítico, cada semana de atraso acumula perda. No caso da empresa, isso é: crítico (impacta receita direta), impacta bastante (atrapalha crescimento), ou moderado (incômodo mas gerenciável)?"
- "Pra calibrar a solução certa: esse problema tá em que nível? Crítico (trava o negócio), urgente (precisa resolver logo), ou importante (pode esperar um pouco)?"`,

        consequencias: `- "E o impacto prático disso no dia a dia: o que especificamente acontece? (Perdem clientes, receita estagnada, equipe sobrecarregada, perdem oportunidades?)"
- "Esse problema causa o quê exatamente? Vocês perdem vendas, clientes reclamam, equipe fica sobrecarregada, não conseguem crescer...?"`,

        receita_mensal: `- "Pra eu entender melhor o contexto e montar uma solução proporcional: qual o faturamento mensal aproximado da empresa hoje? (R$ 10k, R$ 50k, R$ 100k, ou mais)"
- "Empresas de diferentes portes têm necessidades diferentes. Vocês faturam quanto por mês aproximadamente? (R$ 10-30k, R$ 30-100k, R$ 100k+)"`,

        funcionarios: `- "E sobre o time: quantas pessoas trabalham na empresa hoje? (1-5, 6-20, 21-50, ou mais de 50)"
- "Pra dimensionar a solução ideal: vocês têm quantos funcionários? (Equipe pequena 1-5, média 6-20, grande 20+)"`,

        impacto_receita: `- "Tivemos um e-commerce que descobriu estar perdendo R$ 85k/mês em carrinho abandonado — só percebeu quando mediu. No caso de vocês, conseguem estimar quanto tá se perdendo por mês (R$ 5-10k, R$ 10-30k, mais)?"
- "A maioria das PMEs que atendemos descobre que o problema custa 2-3x mais do que imaginava. Vocês conseguem dimensionar o impacto financeiro disso? (R$ 10k, R$ 20k, R$ 50k+/mês)"`,

        tempo_problema: `- "Problemas que persistem há mais de 6 meses geralmente já criaram 'vícios operacionais' que dificultam a solução. No caso de vocês, isso é recente (2-3 meses) ou já vem arrastando há mais tempo?"
- "Quanto mais tempo o problema existe, mais receita acumulada se perde. Vocês tão lidando com isso há quanto tempo? Meses? Anos?"`,

        tentativas_anteriores: `- "Já vi empresa gastar R$ 30k com agência tradicional (6 meses de contrato) e não sair do lugar. Vocês já tentaram resolver antes? O que aconteceu?"
- "Muitas PMEs já testaram soluções que não colaram (agências, freelancers, ferramentas soltas). Vocês já tentaram algo? Por que não funcionou?"`,

        causa_raiz: `- "Nossos diagnósticos mostram que 80% das empresas atacam o sintoma, não a causa. Por exemplo: 'falta de vendas' geralmente é causado por lead frio ou funil quebrado. No caso de vocês, qual a causa raiz do problema?"
- "Tivemos um cliente que achava que o problema era 'equipe fraca', mas era falta de processo. Vocês já identificaram a causa real ou ainda tão atacando sintomas?"`,

        urgencia_dor: `- "Quando o problema é crítico (impacta faturamento direto), cada mês de atraso custa caro. No caso de vocês: isso é emergencial (tá sangrando caixa) ou importante mas gerenciável?"
- "Vimos empresas perderem R$ 100k+ em 3 meses por adiar solução de problema crítico. Vocês classificariam isso como: crítico (resolve agora), urgente (próximos 30 dias), ou importante (pode esperar 2-3 meses)?"`
      },

      budget: {
        verba_disponivel: `- "Nossos clientes de PME geralmente investem entre R$ 2-8k/mês e recuperam em 4-6 meses. Pra resolver o problema que vocês têm, qual faixa de investimento mensal cabe no orçamento? (R$ 2-5k, R$ 5-10k, ou mais)"
- "A maioria investe 5-10% do que tá perdendo/mês. Se vocês tão perdendo R$ 30k/mês, um investimento de R$ 2-5k é proporcional. Qual seria a faixa viável para vocês?"`,

        roi_esperado: `- "Tivemos cliente B2B que investiu R$ 15k e gerou R$ 180k nos primeiros 6 meses. Vocês precisam ver que tipo de retorno pra valer a pena? (Payback em 4-6 meses? Aumento de 50-80% nas vendas?)"
- "Nossos clientes geralmente recuperam o investimento em 4-6 meses. Vocês tão esperando quanto de retorno pra considerar sucesso? (Payback em 4 meses? Dobrar vendas em 6 meses?)"`,

        flexibilidade: `- "Os clientes que mais crescem conosco começam com R$ 3-5k e escalam para R$ 8-15k quando veem resultado. Se funcionar, vocês teriam flexibilidade pra aumentar investimento ou é um teto fixo?"
- "Nosso modelo funciona melhor quando o budget pode escalar com resultados (começar R$ 5k  crescer pra R$ 10k se funcionar bem). Vocês conseguem essa flexibilidade ou é um valor travado?"`,

        aprovacao_budget: `- "PMEs que decidem rápido (budget já aprovado) geralmente começam em 2 semanas. Esse investimento já tá liberado ou ainda precisa passar por aprovação?"
- "Já tá no orçamento aprovado ou vocês precisam justificar/aprovar internamente antes? (Pergunto pra calibrar o timing)"`,

        comparacao_investimentos: `- "A maioria investe em marketing tradicional mas não tem follow-up automatizado, perdendo 60-70% do potencial. Vocês gastam quanto hoje com marketing/vendas por mês?"
- "Só pra contextualizar: se vocês gastam R$ 10k/mês com ads mas não têm follow-up automatizado, tão perdendo muita oportunidade. Quanto tá sendo investido hoje nessa área?"`,

        limite_maximo: `- "Pra eu montar a melhor solução dentro do que cabe pra vocês: qual o teto absoluto de investimento mensal? (Pode ser R$ 5k, R$ 10k, R$ 20k — sem compromisso)"
- "Entendendo o limite máximo consigo estruturar a proposta ideal. Vocês conseguem alocar até quanto por mês no máximo? (R$ 8k, R$ 15k, R$ 30k+)"`
      },

      authority: {
        decisor_principal: `- "Nas PMEs que atendemos, 60% das decisões envolvem 2-3 pessoas (dono + sócio/CFO). No caso de vocês: você decide sozinho ou precisa alinhar com alguém?"
- "Pra eu saber como estruturar a proposta: você tem autonomia total pra fechar ou tem mais alguém envolvido na decisão? (sócio, diretor, CFO...)"`,

        autonomia_decisao: `- "Nossos processos mais ágeis acontecem quando o decisor tem autonomia (2-3 semanas pra começar vs 2-3 meses se depende de comitê). Você consegue bater o martelo sozinho ou precisa de aprovações?"
- "Você tem poder de decisão direto ou precisa apresentar/aprovar com alguém antes?"`,

        processo_decisao: `- "Já vi processo que demora 2 dias (decisor único) e outros que levam 3 meses (comitê + aprovação financeira). Como funciona aí: é rápido (você decide) ou tem várias etapas?"
- "Pra calibrar o timing: o processo de decisão de vocês é ágil (1-2 semanas) ou tem etapas formais (reuniões, aprovações, análise)?"`,

        outros_envolvidos: `- "Nas empresas que crescem mais rápido conosco, geralmente envolvem logo o time chave (dono + operacional + financeiro) desde o diagnóstico. Quem mais participa dessa decisão além de você?"
- "Pra eu trazer as pessoas certas pro diagnóstico: além de você, quem mais tá envolvido? (Sócio, gerente comercial, financeiro...)"`,

        tempo_decisao: `- "PMEs que decidem em até 2 semanas geralmente começam mais rápido e veem resultado antes. Vocês costumam levar quanto tempo pra decidir algo assim? (Dias, semanas, meses?)"
- "Só pra eu entender o ritmo de vocês: quando apresento uma proposta boa, quanto tempo geralmente leva até bater o martelo?"`,

        criterios_decisao: `- "Dos nossos 150+ clientes, 70% decidiram por ROI comprovado, 20% por velocidade de implementação, 10% por preço. No caso de vocês, o que pesa mais: ROI, custo, suporte, velocidade...?"
- "Pra eu estruturar a proposta certa: o que é mais importante pra vocês fecharem? Retorno financeiro? Rapidez? Facilidade de uso?"`
      },

      timing: {
        urgencia: `- "Empresas que começam em até 30 dias geralmente veem ROI mais rápido (resolvem antes de perder mais receita). Vocês querem começar com urgência ou é algo pra próximos 2-3 meses?"
- "Cada mês de atraso em problema crítico custa caro (receita perdida acumula). Vocês tão com pressa pra resolver ou dá pra aguardar tranquilo?"`,

        motivo_timing: `- "Geralmente quando o timing é urgente é porque tem algo pressionando: meta de trimestre, evento, sangria de caixa... No caso de vocês, o que tá motivando esse timing?"
- "Timing urgente geralmente tem um 'gatilho': fim de ano, Black Friday, meta batendo na porta... Tem algo pressionando vocês a resolver agora ou pode esperar?"`,

        prazo_ideal: `- "Nosso tempo médio de implementação é 2-4 semanas (vs 3-6 meses de agências tradicionais). Qual a data ideal pra vocês terem tudo rodando? (30 dias, 60 dias, 90 dias?)"
- "Pra eu estruturar o cronograma: até quando vocês gostariam de ver isso implementado e gerando resultado?"`,

        eventos_importantes: `- "Muitos clientes têm 'deadlines naturais': Black Friday, sazonalidade, lançamento de produto... Vocês têm alguma data/evento que influencia esse timing?"
- "Tem alguma meta, campanha, evento ou lançamento que torna urgente resolver agora? (Tipo: 'preciso ter isso antes do Natal' ou 'temos meta de Q1')"`,

        restricoes_tempo: `- "Às vezes tem travas operacionais: 'estamos migrando sistema', 'time sobrecarregado', 'período de férias'... Tem algo que impede começar já ou tá livre pra arrancar?"
- "Pra saber se posso agendar kickoff: tem alguma restrição que impede começar agora? (Tipo: período crítico, time ocupado, migração de sistema...)"`,

        consequencia_atraso: `- "Tivemos cliente que adiou 3 meses e perdeu R$ 90k em receita nesse período. No caso de vocês, qual o impacto de postergar mais 30-60 dias? (Perde mais X em vendas, agrava outro problema...)"
- "Cada mês de espera acumula perda. Se vocês adiarem isso, o que acontece: perde mais receita, complica outro processo, perde oportunidade de mercado?"`
      }
    };

    return questionMap[stage]?.[field] || `"Me conta mais sobre ${field}..."`;
  }

  /**
   * Pergunta fallback se GPT falhar
   */
  getFallbackQuestion(stage) {
    const fallbacks = {
      need: "Me conta mais sobre os desafios que vocês enfrentam...",
      budget: "E sobre investimento, vocês têm uma ideia de verba?",
      authority: "Você decide sozinho ou tem mais alguém envolvido?",
      timing: "E quando vocês estariam pensando em começar?",
      closing: "Qual seu e-mail para eu enviar o diagnóstico?"
    };
    return fallbacks[stage] || "Me conta mais...";
  }

  /**
   * Avança para próximo stage
   */
  advanceStage() {
    //  FIX BUG #2: NÃO LIMPAR histórico - GPT precisa do contexto completo!
    // REMOVIDO: this.conversationHistory = [];
    // Agora o GPT mantém todo o histórico da conversa entre stages

    this.stageIndex++;

    if (this.stageIndex >= STAGES.length) {
      // BANT completo - pronto para handoff ao Scheduler
      this.currentStage = 'timing'; // Mantém em timing
      console.log(` [BANT-V2] BANT completo (4 stages) - pronto para handoff ao Scheduler`);
    } else {
      this.currentStage = STAGES[this.stageIndex];
      console.log(` [BANT-V2] Avançado para: ${this.currentStage}`);
    }
  }

  /**
   * Restaura estado do banco
   */
  restoreState(savedState) {
    if (!savedState) return;

    console.log(` [BANT-V2] Restaurando estado...`);

    if (savedState.stageData) {
      this.stageData = { ...this.stageData, ...savedState.stageData };
    }

    if (savedState.currentStage) {
      this.currentStage = savedState.currentStage;
      this.stageIndex = STAGES.indexOf(this.currentStage);
      if (this.stageIndex === -1) this.stageIndex = 0;
    }

    if (savedState.conversationHistory) {
      this.conversationHistory = savedState.conversationHistory;
    }

    if (savedState.companyProfile) {
      this.companyProfile = savedState.companyProfile;
      console.log(` [BANT-V2] Perfil da empresa restaurado:`, this.companyProfile);
    }

    console.log(` [BANT-V2] Estado restaurado: stage=${this.currentStage}`);
  }

  /**
   * Obtém estado para persistir no banco
   */
  getState() {
    return {
      currentStage: this.currentStage,
      stageIndex: this.stageIndex,
      stageData: this.stageData,
      conversationHistory: this.conversationHistory,
      companyProfile: this.companyProfile
    };
  }

  /**
   *  FIX CRÍTICO: Persiste estado no banco para evitar loops
   * Salva stageData, tentativas e campos coletados
   */
  async persistState() {
    if (!this.persistenceEnabled || !this.phoneNumber) {
      console.warn(` [BANT-V2-PERSIST] Persistência desabilitada ou phoneNumber ausente`);
      return;
    }

    try {
      const { setMemory } = await import('../memory.js');
      const stateKey = `bant_state_${this.phoneNumber}`;

      const state = {
        currentStage: this.currentStage,
        stageIndex: this.stageIndex,
        stageData: this.stageData,
        conversationHistory: this.conversationHistory,
        companyProfile: this.companyProfile,
        timestamp: Date.now()
      };

      await setMemory(stateKey, state);
      console.log(` [BANT-V2-PERSIST] Estado salvo para ${this.phoneNumber}: stage=${this.currentStage}, tentativas=${this.stageData[this.currentStage].tentativas}`);
    } catch (error) {
      console.error(` [BANT-V2-PERSIST] Erro ao persistir estado:`, error.message);
    }
  }

  /**
   *  FIX CRÍTICO: Restaura estado persistido do banco
   * Evita reset de tentativas e campos coletados
   */
  async loadPersistedState() {
    if (!this.persistenceEnabled || !this.phoneNumber) {
      return false;
    }

    try {
      const { getMemory } = await import('../memory.js');
      const stateKey = `bant_state_${this.phoneNumber}`;

      const savedState = await getMemory(stateKey);

      if (!savedState) {
        console.log(`ℹ [BANT-V2-PERSIST] Nenhum estado salvo encontrado para ${this.phoneNumber}`);
        return false;
      }

      // Verificar se estado não está expirado (24h)
      const age = Date.now() - (savedState.timestamp || 0);
      const maxAge = 24 * 60 * 60 * 1000; // 24 horas

      if (age > maxAge) {
        console.log(` [BANT-V2-PERSIST] Estado expirado (${Math.round(age / 1000 / 60 / 60)}h) - ignorando`);
        return false;
      }

      this.restoreState(savedState);
      console.log(` [BANT-V2-PERSIST] Estado restaurado para ${this.phoneNumber}: stage=${this.currentStage}, tentativas=${this.stageData[this.currentStage].tentativas}`);
      return true;
    } catch (error) {
      console.error(` [BANT-V2-PERSIST] Erro ao carregar estado:`, error.message);
      return false;
    }
  }

  /**
   *  FIX: Limpa estado persistido (usar ao completar BANT ou resetar)
   */
  async clearPersistedState() {
    if (!this.phoneNumber) return;

    try {
      const { deleteMemory } = await import('../memory.js');
      const stateKey = `bant_state_${this.phoneNumber}`;
      await deleteMemory(stateKey);
      console.log(` [BANT-V2-PERSIST] Estado limpo para ${this.phoneNumber}`);
    } catch (error) {
      console.error(` [BANT-V2-PERSIST] Erro ao limpar estado:`, error.message);
    }
  }
}

export default BANTStagesV2;

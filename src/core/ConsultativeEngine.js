// ConsultativeEngine.js v9.0 - SOLAR REBRAND
//
//  DEPRECATED: Este arquivo é mantido para compatibilidade.
// O sistema atual usa DynamicConsultativeEngine.js
//
// SOLAR v4.0:
//  Canal Digital de Orçamento para Integradoras de Energia Solar
//  Sem prova social externa (removido Startup Nordeste)
//  Foco em honestidade (sem promessas de ranking/leads)

import OpenAI from 'openai';

//  STYLE GUIDE GLOBAL - ÚNICA FONTE DE VERDADE
import {
  BRAND,
  STYLE_RULES,
  OPT_OUT,
  getNextQuestion,
  calculateBANTProgress
} from '../config/brand-style-guide.js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ═══════════════════════════════════════════════════════════════════════════
//  DIGITAL BOOST - IDENTIDADE DA EMPRESA
// ═══════════════════════════════════════════════════════════════════════════

const DIGITAL_BOOST = {
  // SOBRE A EMPRESA - SOLAR v4.0
  nome: 'Digital Boost',
  fundacao: '22/11/2024',
  cidade: 'Natal/RN',
  foco: 'Canal Digital de Orçamento para Integradoras de Energia Solar',

  // LIDERANÇA EXECUTIVA
  socios: {
    marcos: {
      nome: 'Marcos',
      cargo: 'CEO',
      area: 'Direção de produto e estratégia',
      responsabilidade: 'Define produto e garante foco em conversão'
    },
    rodrigo: {
      nome: 'Rodrigo',
      cargo: 'COO',
      area: 'Operação e entrega',
      responsabilidade: 'Garante entrega com qualidade e prazo'
    },
    taylor: {
      nome: 'Taylor Moreira Lapenda',
      cargo: 'CFO',
      area: 'Unit economics e viabilidade',
      responsabilidade: 'Garante precificação justa e sustentabilidade'
    }
  },

  // MISSÃO, VISÃO E VALORES - SOLAR v4.0
  missao: 'Transformar integradoras que dependem de indicação em empresas com canal digital claro que capta orçamentos.',
  visao: 'Ser referência em canal digital de captação para o setor solar no Nordeste.',
  valores: [
    'Foco em conversão - Site que capta, não site institucional',
    'Honestidade - Não prometemos ranking nem quantidade de leads',
    'Transparência - Você vê exatamente o que está sendo feito',
    'Simplicidade - Sem enrolação, direto ao ponto',
    'Resultados mensuráveis - Canal estruturado, não promessas vagas'
  ],

  // PROVA SOCIAL - SOLAR v4.0 (sem credenciais externas)
  provas_sociais: [
    {
      titulo: 'Foco exclusivo em solar',
      descricao: 'Trabalhamos exclusivamente com integradoras de energia solar',
      fonte: 'Interno',
      como_usar: 'Mencionar que entendemos o mercado solar'
    }
  ],

  // DIFERENCIAL (síntese) - SOLAR v4.0
  diferencial: 'A Digital Boost cria canais digitais de orçamento para integradoras de energia solar - site focado em captação, SEO local e integração WhatsApp.',

  // 3 PILARES DO DIFERENCIAL - SOLAR v4.0
  pilares: {
    conversao: 'Site focado em captação de orçamento, não institucional',
    seo_local: 'Páginas por região para aparecer no Google local',
    integracao: 'WhatsApp + Formulário integrados para não perder lead'
  },

  // POSICIONAMENTO (1 frase) - SOLAR v4.0
  posicionamento: 'Criamos canais digitais de orçamento para integradoras de energia solar - site que converte, SEO local e integração WhatsApp.',

  // PITCH 30-45s - SOLAR v4.0
  pitch: `A Digital Boost cria canais digitais de orçamento para integradoras de energia solar. Na prática: site focado em captação, SEO local pra aparecer no Google da região que você atende, e integração WhatsApp pra não perder lead.`,

  // CTA PADRÃO - SOLAR v4.0
  cta: 'O próximo passo é um diagnóstico rápido (20-30 min) pra analisar o que vocês têm hoje e propor o que faria sentido implementar. Sem compromisso.'
};

// ═══════════════════════════════════════════════════════════════════════════
//  SERVIÇOS DA DIGITAL BOOST
// ═══════════════════════════════════════════════════════════════════════════

const SERVICOS_DIGITAL_BOOST = {
  desenvolvimento: {
    nome: 'Desenvolvimento de Sistemas (Produto/Software)',
    descricao: 'Sites, sistemas web, apps, MVPs, integrações via API, dashboards',
    beneficio: 'Sair do improviso e ganhar processo, velocidade e controle (com dados)',
    entregas: [
      'Sites e landing pages de alta conversão',
      'Sistemas web (painéis, portais, áreas do cliente)',
      'Apps e MVPs (validação rápida)',
      'Integrações via API (CRM, WhatsApp, ERPs, gateways, planilhas)',
      'Dashboards e rastreamento (eventos, funil, indicadores)'
    ],
    sinais: ['preciso de um sistema', 'site', 'app', 'integração', 'dashboard', 'portal', 'painel', 'mvp', 'landing page']
  },
  ia: {
    nome: 'Integrações com IA (Automação e Inteligência)',
    descricao: 'Assistentes de IA, automação inteligente, WhatsApp + IA + CRM, RAG',
    beneficio: 'Reduz custo operacional, aumenta velocidade de resposta e melhora conversão com consistência',
    entregas: [
      'Assistentes/Agentes de IA para atendimento, pré-vendas e suporte',
      'Automação inteligente de rotina (triagem, respostas, relatórios)',
      'Integração IA + WhatsApp + CRM (captação, qualificação, follow-up)',
      'Base de conhecimento e RAG (IA consultando dados internos)',
      'Monitoramento e melhoria contínua (qualidade, taxas, tempo de resposta)'
    ],
    sinais: ['ia', 'inteligência artificial', 'chatbot', 'atendimento automático', 'bot', 'assistente', 'automação', 'whatsapp']
  },
  growth: {
    nome: 'Consultoria de Growth (Crescimento Sustentável)',
    descricao: 'Diagnóstico de funil, métricas, experimentos, tracking, otimização',
    beneficio: 'Crescimento com método: testar, medir, aprender e escalar o que dá resultado',
    entregas: [
      'Diagnóstico do funil (aquisição  ativação  retenção  receita)',
      'Definição de métricas (North Star, KPIs, coortes, CAC, LTV)',
      'Plano de experimentos (testing backlog) com prioridades',
      'Ajustes de oferta/posicionamento, copy e criativos',
      'Estrutura de tracking (eventos, pixels, UTMs, dashboards)',
      'Rotina de crescimento: sprints, leitura de dados e iteração'
    ],
    sinais: ['crescer', 'vender mais', 'marketing', 'funil', 'conversão', 'leads', 'tráfego', 'escalar', 'métricas', 'cac', 'ltv']
  }
};

// Mini-mapa de soluções (encaixe rápido)
const MAPA_SOLUCOES = {
  caos_operacional: {
    servicos: ['desenvolvimento'],
    descricao: 'Sistema + integrações + dashboard',
    exemplo: 'Lead com caos operacional'
  },
  atendimento_lento: {
    servicos: ['ia'],
    descricao: 'WhatsApp + IA + CRM + rotina de follow-up',
    exemplo: 'Lead com atendimento lento'
  },
  trafego_sem_venda: {
    servicos: ['growth'],
    descricao: 'Growth: funil, tracking, testes, oferta e conversão',
    exemplo: 'Lead com tráfego mas pouca venda'
  },
  produto_novo: {
    servicos: ['desenvolvimento', 'growth'],
    descricao: 'MVP rápido + validação + growth sprints',
    exemplo: 'Lead sem produto validado'
  },
  completo: {
    servicos: ['desenvolvimento', 'ia', 'growth'],
    descricao: 'Estrutura completa + IA + crescimento',
    exemplo: 'Lead que precisa de tudo'
  }
};

// Exportar constantes da empresa
export { DIGITAL_BOOST, SERVICOS_DIGITAL_BOOST, MAPA_SOLUCOES };

// ═══════════════════════════════════════════════════════════════════════════
//  ARQUÉTIPOS DINÂMICOS - BASEADOS NA CONVERSA (NÃO NO SETOR!)
// ═══════════════════════════════════════════════════════════════════════════

const ARCHETYPES = {
  // SÁBIO - Quando lead quer dados e explicações
  sabio: {
    tom: 'ANALÍTICO e TÉCNICO. Explique o método. Mostre dados concretos.',
    estilo: `
- Explique a metodologia
- Use dados e estatísticas
- Seja preciso e detalhado
- Deixe ele analisar
- Exemplo: "O sistema usa IA para prever fluxo com 94% de precisão."`,
    evitar: 'promessas vagas, emoção demais, pressão',
    gatilhos: ['como funciona', 'me explica', 'quais métricas', 'tem dados', 'qual a diferença', 'entender melhor']
  },

  // HERÓI - Quando lead fala de desafios e competição
  heroi: {
    tom: 'DIRETO e ASSERTIVO. Frases curtas. Foco em RESULTADOS.',
    estilo: `
- Frases curtas e impactantes
- Foque em conquistas e superação
- Mostre resultados rápidos
- Seja confiante
- Exemplo: "Resolve em 15 dias. ROI de 3x no primeiro mês."`,
    evitar: 'rodeios, explicações longas, perguntas demais',
    gatilhos: ['desafio', 'concorrente', 'superar', 'vencer', 'crescer rápido', 'competição', 'meta']
  },

  // MAGO - Quando lead quer transformar, automatizar
  mago: {
    tom: 'VISIONÁRIO e TRANSFORMADOR. Mostre a mudança possível.',
    estilo: `
- Fale de transformação
- Mostre o antes e depois
- Crie visão do futuro
- Inspire possibilidades
- Exemplo: "Imagina sair do caos pra ter controle total em 30 dias..."`,
    evitar: 'detalhes técnicos demais, foco no passado',
    gatilhos: ['transformar', 'mudar tudo', 'automatizar', 'revolucionar', 'do zero', 'reorganizar']
  },

  // INOCENTE - Quando lead é direto, quer simplicidade
  inocente: {
    tom: 'SIMPLES e DIRETO. Sem enrolação. Transparente.',
    estilo: `
- Linguagem simples
- Vá direto ao ponto
- Seja transparente
- Admita limitações se houver
- Exemplo: "Olha, na real: funciona assim..."`,
    evitar: 'jargões, complexidade, rodeios',
    gatilhos: ['sem enrolação', 'direto ao ponto', 'simples', 'não entendo', 'objetivamente', 'na prática']
  },

  // EXPLORADOR - Quando lead fala de novidades, expansão
  explorador: {
    tom: 'INOVADOR e CURIOSO. Mostre o NOVO e DIFERENTE.',
    estilo: `
- Destaque novidades
- Mostre possibilidades inexploradas
- Seja entusiasmado
- Fale de tendências
- Exemplo: "Poucos conhecem essa forma de fazer gestão..."`,
    evitar: 'o tradicional, o comum, o óbvio',
    gatilhos: ['explorar', 'novo', 'oportunidade', 'expandir', 'tendência', 'mercado', 'inovar']
  },

  // AMANTE - Quando lead fala com emoção, menciona equipe
  amante: {
    tom: 'EMOCIONAL e CONECTADO. Crie vínculo. Mostre paixão.',
    estilo: `
- Fale com calor humano
- Conecte-se emocionalmente
- Mostre paixão pelo que faz
- Personalize profundamente
- Exemplo: "Eu amo ajudar negócios como o seu porque..."`,
    evitar: 'frieza, só números, distanciamento',
    gatilhos: ['minha equipe', 'meu sonho', 'paixão', 'sempre quis', 'eu amo', 'minha família', 'tenho orgulho']
  },

  // CRIADOR - Quando lead quer personalização
  criador: {
    tom: 'PERSONALIZADO e FLEXÍVEL. Mostre customização.',
    estilo: `
- Destaque que é feito pra ele
- Mostre flexibilidade
- Fale de identidade única
- Deixe ele sentir controle
- Exemplo: "Você configura exatamente pro seu jeito de trabalhar."`,
    evitar: 'soluções genéricas, pacotes fechados, padrão',
    gatilhos: ['específico', 'meu caso', 'personalizar', 'único', 'diferente dos outros', 'customizar']
  },

  // GOVERNANTE - Quando lead quer controle, é CEO
  governante: {
    tom: 'EXECUTIVO e CONTROLADOR. Fale de gestão e poder.',
    estilo: `
- Tom de liderança
- Foco em controle total
- Linguagem executiva
- Mostre domínio da situação
- Exemplo: "Como CEO, você vai ter dashboard em tempo real..."`,
    evitar: 'informalidade excessiva, detalhes operacionais',
    gatilhos: ['controle', 'gestão', 'equipe grande', 'liderar', 'comando', 'visão geral', 'indicadores']
  },

  // REBELDE - Quando lead está frustrado com sistema atual
  rebelde: {
    tom: 'REVOLUCIONÁRIO. Desafie o status quo. Mude tudo.',
    estilo: `
- Valide a frustração
- Mostre que o jeito antigo não funciona
- Proponha mudança radical
- Seja provocativo
- Exemplo: "Chega de planilha que não funciona. Vamos mudar isso."`,
    evitar: 'defender o tradicional, conservadorismo',
    gatilhos: ['cansado de', 'não aguento mais', 'esse jeito não funciona', 'problema', 'bagunça', 'caos']
  },

  // BOBO DA CORTE - Quando lead usa humor, é informal
  bobo: {
    tom: 'LEVE e DIVERTIDO. Use humor apropriado.',
    estilo: `
- Seja descontraído
- Use humor quando apropriado
- Quebre a seriedade
- Humanize a conversa
- Exemplo: "Haha, sei bem como é! Bora resolver isso de um jeito diferente..."`,
    evitar: 'seriedade excessiva, formalidade',
    gatilhos: ['haha', 'rsrs', 'kkk', '', '', 'brincadeira', 'piada']
  },

  // CUIDADOR - Quando lead preocupado com equipe, segurança
  cuidador: {
    tom: 'ACOLHEDOR e PROTETOR. Mostre cuidado genuíno.',
    estilo: `
- Demonstre preocupação genuína
- Fale de proteção e suporte
- Preocupe-se com a equipe dele
- Seja caloroso
- Exemplo: "A gente acompanha vocês em cada passo, sem deixar na mão."`,
    evitar: 'frieza, foco só em números, pressão',
    gatilhos: ['preocupado', 'proteger', 'garantir', 'seguro', 'medo de', 'receio', 'cuidado']
  },

  // PESSOA COMUM - Quando lead é informal, fala como igual
  comum: {
    tom: 'INFORMAL e PRÁTICO. Fale como um igual.',
    estilo: `
- Use linguagem do dia a dia
- Seja acessível
- Fale de experiências reais
- Sem arrogância
- Exemplo: "Na real, eu já passei por isso também..."`,
    evitar: 'superioridade, jargões, formalidade',
    gatilhos: ['na real', 'pra falar a verdade', 'entre nós', 'sinceramente', 'honestamente']
  },

  // DEFAULT - Equilibrado
  default: {
    tom: 'PROFISSIONAL e EQUILIBRADO. Direto mas humano.',
    estilo: `
- Balance dados e empatia
- Seja objetivo sem ser frio
- Pergunte e ouça
- Exemplo: "Vamos resolver isso de forma prática."`,
    evitar: 'extremos de qualquer tipo',
    gatilhos: []
  }
};

// ═══════════════════════════════════════════════════════════════════════════
//  DETECÇÃO DINÂMICA DE ARQUÉTIPO VIA GPT (INTELIGENTE!)
// ═══════════════════════════════════════════════════════════════════════════

async function detectArchetypeFromMessage(message, historico = []) {
  if (!message || message.length < 3) return 'default';

  try {
    const arquetipossDisponiveis = Object.entries(ARCHETYPES)
      .filter(([k]) => k !== 'default')
      .map(([nome, dados]) => `- ${nome.toUpperCase()}: ${dados.tom}`)
      .join('\n');

    const prompt = `Você é um especialista em análise comportamental. Analise a mensagem do lead e identifique qual arquétipo de Jung melhor descreve o ESTADO EMOCIONAL e NECESSIDADE dele neste momento. Retorne JSON.

MENSAGEM DO LEAD:
"${message}"

${historico.length > 0 ? `CONTEXTO (últimas mensagens):
${historico.slice(-3).map(h => `${h.role}: "${h.content.substring(0, 100)}"`).join('\n')}` : ''}

═══════════════════════════════════════════════════════════════════════════════
GUIA DE DETECÇÃO - ANALISE O ESTADO EMOCIONAL E NECESSIDADE
═══════════════════════════════════════════════════════════════════════════════

 SABIO - Quer ENTENDER antes de decidir
   Sinais: perguntas técnicas, pede dados, quer comparações, analítico
   Exemplos: "como funciona?", "qual o ROI?", "tem cases?", "qual a diferença?"
    Responda com: dados, metodologia, precisão, deixe ele analisar

 HEROI - Quer RESULTADOS RÁPIDOS, foco em ação
   Sinais: urgência, pressão, menciona metas, competição, "preciso resolver"
   Exemplos: "tá me tirando o sono", "preciso resolver já", "quero superar concorrência"
    Responda com: frases curtas, prazos, resultados concretos, confiança

 REBELDE - FRUSTRADO com situação atual
   Sinais: reclamação, raiva do sistema atual, cansaço, "não funciona"
   Exemplos: "não aguento mais", "isso aqui é uma bagunça", "cansado disso"
    Responda com: validação da frustração, proposta de mudança radical

 MAGO - Quer TRANSFORMAÇÃO total
   Sinais: visão de futuro, quer automatizar, começar do zero, revolucionar
   Exemplos: "quero mudar tudo", "automatizar", "transformar", "do zero"
    Responda com: visão do futuro, antes/depois, possibilidades

 INOCENTE - Quer SIMPLICIDADE, sem complicação
   Sinais: pede clareza, não quer enrolação, objetivo, "vai direto"
   Exemplos: "me fala simples", "sem enrolação", "direto ao ponto"
    Responda com: linguagem simples, transparência, praticidade

 EXPLORADOR - CURIOSO sobre novidades
   Sinais: interesse em inovação, tendências, "o que tem de novo"
   Exemplos: "quero explorar", "o que vocês têm de diferente?", "novidades"
    Responda com: diferenciais, inovação, oportunidades

 AMANTE - EMOCIONAL, fala com paixão
   Sinais: menciona sonhos, paixão pelo negócio, conexão emocional
   Exemplos: "meu sonho é...", "sempre quis", "amo minha empresa"
    Responda com: empatia, conexão, calor humano

 CRIADOR - Quer PERSONALIZAÇÃO
   Sinais: caso único, diferente dos outros, precisa de customização
   Exemplos: "meu caso é específico", "precisa ser do meu jeito", "único"
    Responda com: flexibilidade, customização, "feito pra você"

 GOVERNANTE - Quer CONTROLE e visão geral
   Sinais: foco em gestão, liderança, indicadores, "quero ter controle"
   Exemplos: "preciso de controle total", "quero ver indicadores", "gerir melhor"
    Responda com: dashboard, visão executiva, poder de decisão

 CUIDADOR - VULNERÁVEL, precisa de acolhimento
   Sinais: perdido, inseguro, pede ajuda, preocupado com equipe
   Exemplos: "tô perdido", "não sei por onde começar", "preocupado com minha equipe"
    Responda com: acolhimento, suporte, "estou aqui pra ajudar", sem pressa

 BOBO - Tom DESCONTRAÍDO, usa humor
   Sinais: risadas, emojis, tom leve, brincadeiras
   Exemplos: "kkk", "haha", "rsrs", "relaxa", brinca
    Responda com: leveza, humor apropriado, descontração

 COMUM - INFORMAL, fala como igual
   Sinais: linguagem do dia a dia, "na real", "sinceramente", sem formalidade
   Exemplos: "pra falar a verdade", "na real", "entre nós"
    Responda com: informalidade, como um amigo, sem arrogância

═══════════════════════════════════════════════════════════════════════════════
REGRAS DE PRIORIDADE (IMPORTANTE!)
═══════════════════════════════════════════════════════════════════════════════
1. "não aguento", "cansado de", "bagunça", "caos" = REBELDE (frustração > vulnerabilidade)
2. "perdido", "não sei", "me ajuda" SEM raiva = CUIDADOR
3. "urgente", "preciso já", "tirando o sono" = HEROI
4. "como funciona", "ROI", "dados" = SABIO
5. "meu sonho", "sempre quis", "paixão" = AMANTE (emoção > organização)
6. Se nenhum sinal claro  default

DIFERENCIAÇÃO IMPORTANTE:
- REBELDE = tem RAIVA/FRUSTRAÇÃO ("não aguento", "cansado", "p**** que pariu")
- CUIDADOR = está PERDIDO/INSEGURO sem raiva ("não sei", "me ajuda", "perdido")
- AMANTE = fala com EMOÇÃO/PAIXÃO ("meu sonho", "amo", "sempre quis")
- GOVERNANTE = quer CONTROLE/GESTÃO ("indicadores", "dashboard", "controle")

Retorne APENAS JSON:
{"arquetipo": "nome_em_minusculo", "confianca": "alta|media|baixa", "motivo": "explicação curta do estado emocional detectado"}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 150,
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(completion.choices[0].message.content);
    const arquetipo = result.arquetipo?.toLowerCase() || 'default';

    // Validar se é um arquétipo válido
    const arquetipovalido = ARCHETYPES[arquetipo] ? arquetipo : 'default';

    console.log(`    [GPT] Arquétipo: ${arquetipovalido.toUpperCase()} (${result.confianca}) - ${result.motivo}`);

    return arquetipovalido;

  } catch (error) {
    console.error(`    [ARCH] Erro GPT: ${error.message}`);
    // Fallback para detecção simples por keywords
    return detectArchetypeFallback(message);
  }
}

// Fallback rápido caso GPT falhe
function detectArchetypeFallback(message) {
  const texto = message.toLowerCase();

  // Detecção básica por padrões mais claros
  if (/não (funciona|aguento|dá mais)|cansado|frustrado|bagunça/.test(texto)) return 'rebelde';
  if (/como funciona|me explica|quais métricas|qual diferença/.test(texto)) return 'sabio';
  if (/desafio|superar|vencer|meta|concorr/.test(texto)) return 'heroi';
  if (/kkk|haha|rsrs||/.test(texto)) return 'bobo';
  if (/controle|gestão|indicadores|dashboard/.test(texto)) return 'governante';
  if (/preocupado|minha equipe|seguro|proteger/.test(texto)) return 'cuidador';
  if (/meu sonho|paixão|sempre quis/.test(texto)) return 'amante';
  if (/transform|automat|do zero|mudar tudo/.test(texto)) return 'mago';
  if (/específico|meu caso|personaliz|único/.test(texto)) return 'criador';

  return 'default';
}

// Compatibilidade com sistema antigo - NORMALIZAÇÃO ROBUSTA
function normalizeArchetype(arch) {
  if (!arch) return 'default';

  // Converter para minúsculo e remover underscores/espaços
  const archLower = String(arch).toLowerCase().replace(/[_\s]/g, '');

  // Mapeamento robusto (aceita variações)
  const map = {
    // Maiúsculos originais
    'heroi': 'heroi', 'hero': 'heroi',
    'sabio': 'sabio', 'sage': 'sabio', 'wizard': 'sabio',
    'explorador': 'explorador', 'explorer': 'explorador',
    'criador': 'criador', 'creator': 'criador',
    'cuidador': 'cuidador', 'caregiver': 'cuidador',
    'mago': 'mago', 'magician': 'mago',
    'inocente': 'inocente', 'innocent': 'inocente',
    'governante': 'governante', 'ruler': 'governante',
    'rebelde': 'rebelde', 'rebel': 'rebelde', 'outlaw': 'rebelde',
    'amante': 'amante', 'lover': 'amante',
    'bobo': 'bobo', 'bobodacorte': 'bobo', 'jester': 'bobo', 'fool': 'bobo',
    'comum': 'comum', 'pessoacomum': 'comum', 'everyman': 'comum', 'regular': 'comum',
    'default': 'default'
  };

  const normalized = map[archLower] || 'default';

  // Validar se existe no ARCHETYPES
  return ARCHETYPES[normalized] ? normalized : 'default';
}

// ═══════════════════════════════════════════════════════════════════════════
//  DADOS A COLETAR - QUALIFICAÇÃO DIGITAL BOOST
// ═══════════════════════════════════════════════════════════════════════════

// Qualificação focada em: Objetivo, Gargalo, Ferramentas, IA, Decisão
const DADOS_COLETA = {
  // CONTEXTO E OBJETIVO
  contexto: ['objetivo_principal', 'maior_gargalo'],

  // ESTRUTURA E PROCESSO
  estrutura: ['ferramentas_atuais', 'processos_documentados'],

  // DADOS E TRACKING (Growth)
  tracking: ['acompanha_metricas', 'tem_tracking'],

  // IA (quando relevante)
  ia: ['onde_ia_ajuda', 'tem_base_conhecimento'],

  // DECISÃO E TIMING
  decisao: ['quem_decide', 'prazo_ideal', 'orcamento_estimado']
};

// Perguntas adaptativas por DADO + ARQUÉTIPO - QUALIFICAÇÃO DIGITAL BOOST
const PERGUNTAS_ADAPTATIVAS = {
  // ═══════════════════════════════════════════════════════════════════════════
  // OBJETIVO PRINCIPAL (vender mais, reduzir custo, organizar, lançar produto)
  // ═══════════════════════════════════════════════════════════════════════════
  objetivo_principal: {
    heroi: 'Qual o objetivo principal agora: vender mais, reduzir custo, organizar a operação ou lançar algo novo?',
    sabio: 'Pensando estrategicamente: o foco é crescer receita, otimizar custos, estruturar processos ou inovar?',
    cuidador: 'Me ajuda a entender: o que é mais importante pra vocês agora? Crescer, economizar ou organizar?',
    rebelde: 'O que mais precisa mudar aí: vendas, custos, bagunça operacional ou tudo junto?',
    explorador: 'O que vocês querem conquistar agora: mais vendas, menos custos, ou montar algo novo?',
    default: 'Qual o objetivo principal agora: vender mais, reduzir custo, organizar a operação ou lançar um produto?'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIOR GARGALO (geração de leads, conversão, atendimento, retenção, operação)
  // ═══════════════════════════════════════════════════════════════════════════
  maior_gargalo: {
    heroi: 'E hoje, onde tá travando: gerar leads, converter, atender rápido, reter clientes ou operação interna?',
    sabio: 'Analisando o funil: o gargalo está na aquisição, conversão, atendimento, retenção ou operações?',
    cuidador: 'Me conta: onde dói mais? Conseguir clientes, fechar vendas, atender bem ou organizar o dia a dia?',
    rebelde: 'O que tá mais zoado: trazer gente, vender, atender ou a operação mesmo?',
    explorador: 'Qual etapa precisa de mais atenção: captar, converter, atender ou reter?',
    default: 'Hoje, qual o maior gargalo: geração de leads, conversão, atendimento, retenção ou operação interna?'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // FERRAMENTAS ATUAIS (CRM, WhatsApp, planilhas, ERP, site)
  // ═══════════════════════════════════════════════════════════════════════════
  ferramentas_atuais: {
    heroi: 'O que vocês usam hoje? CRM, WhatsApp Business, planilhas, algum sistema?',
    sabio: 'Qual o stack atual? CRM, ERP, ferramentas de automação, analytics?',
    cuidador: 'E como vocês se organizam? Usam algum sistema, CRM, ou é mais planilha e WhatsApp?',
    rebelde: 'O que tá dando problema? Planilha? Sistema velho? WhatsApp manual?',
    explorador: 'Que ferramentas vocês usam hoje pra rodar o negócio?',
    default: 'Quais ferramentas vocês usam hoje: CRM, WhatsApp, planilhas, ERP, site?'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCESSOS DOCUMENTADOS
  // ═══════════════════════════════════════════════════════════════════════════
  processos_documentados: {
    heroi: 'Os processos são documentados ou tá tudo na cabeça do time?',
    sabio: 'Vocês têm SOPs ou documentação dos processos críticos?',
    cuidador: 'E os processos, estão escritos em algum lugar ou cada um faz do seu jeito?',
    rebelde: 'Tem processo definido ou é cada um por si?',
    explorador: 'Os fluxos são padronizados ou ainda tão descobrindo o que funciona?',
    default: 'Vocês têm processos documentados ou está tudo "na cabeça do time"?'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ACOMPANHA MÉTRICAS DO FUNIL
  // ═══════════════════════════════════════════════════════════════════════════
  acompanha_metricas: {
    heroi: 'Vocês acompanham métricas do funil? CAC, conversão, LTV?',
    sabio: 'Quais KPIs vocês monitoram? Tem dashboards estruturados?',
    cuidador: 'Vocês conseguem ver os números do negócio? Taxa de conversão, custo por cliente?',
    rebelde: 'Vocês sabem exatamente quanto custa trazer um cliente e quanto ele vale?',
    explorador: 'Quais métricas vocês olham pra tomar decisão?',
    default: 'Vocês acompanham métricas do funil? Quais?'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TEM TRACKING INSTALADO (pixels, eventos, UTMs)
  // ═══════════════════════════════════════════════════════════════════════════
  tem_tracking: {
    heroi: 'Tem tracking instalado? Pixels, eventos, UTMs?',
    sabio: 'O tracking está configurado? GA4, pixels de conversão, eventos customizados?',
    cuidador: 'Vocês conseguem rastrear de onde vêm os clientes? Tem pixel, UTM instalado?',
    rebelde: 'Dá pra saber de onde vem cada venda ou é no achismo?',
    explorador: 'Onde vocês olham os dados? Tem analytics rodando?',
    default: 'Existe tracking instalado (pixels, eventos, UTMs)? Onde vocês olham os dados?'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ONDE IA AJUDARIA (atendimento, qualificação, suporte, automação, relatório)
  // ═══════════════════════════════════════════════════════════════════════════
  onde_ia_ajuda: {
    heroi: 'Onde IA ajudaria mais: atendimento, qualificação de leads, suporte ou automação interna?',
    sabio: 'Em que processo a IA teria mais impacto: triagem, atendimento, análise ou automação?',
    cuidador: 'Pensando em facilitar a vida: IA ajudaria mais no atendimento, nas vendas ou na operação?',
    rebelde: 'Onde vocês mais perdem tempo que uma IA poderia resolver?',
    explorador: 'Que parte do negócio ficaria mais interessante com IA?',
    default: 'Onde a IA ajudaria mais: atendimento, qualificação, suporte, automação interna ou relatórios?'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TEM BASE DE CONHECIMENTO (FAQ, documentos, scripts)
  // ═══════════════════════════════════════════════════════════════════════════
  tem_base_conhecimento: {
    heroi: 'Vocês têm FAQ, scripts de vendas ou documentação que uma IA poderia usar?',
    sabio: 'Existe uma base de conhecimento estruturada? FAQ, playbooks, documentação técnica?',
    cuidador: 'Tem material pronto tipo FAQ ou scripts que a gente poderia usar pra treinar a IA?',
    rebelde: 'Tem alguma coisa documentada ou vai ter que criar do zero?',
    explorador: 'Já existe conteúdo que podemos aproveitar pra alimentar a IA?',
    default: 'A base de conhecimento existe (FAQ, documentos, scripts) ou precisa ser criada?'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // QUEM DECIDE
  // ═══════════════════════════════════════════════════════════════════════════
  quem_decide: {
    heroi: 'Você bate o martelo ou precisa validar com alguém?',
    sabio: 'Quem participa da decisão de investir nisso?',
    cuidador: 'Você decide sozinho ou tem mais alguém envolvido?',
    rebelde: 'Quem precisa aprovar?',
    explorador: 'Tem mais alguém que precisa avaliar?',
    default: 'Quem decide isso junto com você?'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PRAZO IDEAL
  // ═══════════════════════════════════════════════════════════════════════════
  prazo_ideal: {
    heroi: 'Pra quando precisam ter isso rodando?',
    sabio: 'Qual o prazo ideal pra implementação?',
    cuidador: 'Tem urgência ou dá pra planejar com calma?',
    rebelde: 'Quanto tempo mais dá pra aguentar assim?',
    explorador: 'Isso é prioridade pra já ou pro próximo quarter?',
    default: 'Qual o prazo ideal para começar?'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ORÇAMENTO ESTIMADO
  // ═══════════════════════════════════════════════════════════════════════════
  orcamento_estimado: {
    heroi: 'Já têm uma faixa de investimento em mente?',
    sabio: 'Qual a faixa de orçamento prevista pra esse projeto?',
    cuidador: 'Vocês já pensaram em quanto poderiam investir nisso?',
    rebelde: 'Tem grana separada pra isso ou vai ter que brigar por budget?',
    explorador: 'Qual o range de investimento que faz sentido pra vocês?',
    default: 'Qual o orçamento estimado (faixa)?'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PERGUNTA EXPLORATÓRIA (quando lead diz "não sei", "não tenho certeza")
  // ═══════════════════════════════════════════════════════════════════════════
  explorar_dor: {
    heroi: 'Sem problema! Me conta: o que mais te toma tempo ou energia no dia a dia do negócio?',
    sabio: 'Tranquilo! Pensando no dia a dia: qual processo você gostaria de ter mais controle ou visibilidade?',
    cuidador: 'Tudo bem! Me ajuda a entender: tem algo no negócio que te preocupa ou que gostaria de melhorar?',
    rebelde: 'De boa! Mas me diz: tem algo que te incomoda ou que não funciona direito aí?',
    explorador: 'Sem problemas! O que você gostaria de mudar ou experimentar diferente no negócio?',
    mago: 'Tranquilo! Se você pudesse transformar uma coisa na empresa, o que seria?',
    governante: 'Entendo! Pensando na gestão: o que você gostaria de ter mais controle?',
    amante: 'Sem estresse! Me conta: o que te faz perder o sono quando pensa no negócio?',
    bobo: 'Relaxa! Mas fala aí: tem alguma coisa que tá te dando dor de cabeça no dia a dia?',
    comum: 'De boa! Mas sinceramente, tem algo que você queria que fosse diferente aí na empresa?',
    criador: 'Tranquilo! Se você pudesse redesenhar algum processo da empresa, qual seria?',
    inocente: 'Sem problema! Simplificando: o que mais te dá trabalho no dia a dia?',
    default: 'Tranquilo! Me conta: o que mais te preocupa ou toma tempo na gestão do negócio?'
  }
};

// Fluxo conversacional - QUALIFICAÇÃO DIGITAL BOOST (mais enxuto)
const FLUXO_CONVERSACIONAL = {
  // FASE 1: Contexto e Objetivo
  DESCOBERTA: {
    objetivo: 'Entender o objetivo principal e onde está o gargalo',
    dados_prioritarios: ['objetivo_principal', 'maior_gargalo'],
    dados_oportunisticos: ['ferramentas_atuais'],
    transicao: (dados) => dados.objetivo_principal && dados.maior_gargalo
  },

  // FASE 2: Estrutura e Processo
  APROFUNDAMENTO: {
    objetivo: 'Entender ferramentas atuais e maturidade de processos',
    dados_prioritarios: ['ferramentas_atuais', 'processos_documentados'],
    dados_oportunisticos: ['acompanha_metricas', 'tem_tracking'],
    transicao: (dados) => dados.ferramentas_atuais
  },

  // FASE 3: IA e Dados (quando relevante)
  DIMENSIONAMENTO: {
    objetivo: 'Entender oportunidades de IA e maturidade de dados',
    dados_prioritarios: ['onde_ia_ajuda'],
    dados_oportunisticos: ['tem_base_conhecimento', 'acompanha_metricas'],
    transicao: (dados) => dados.onde_ia_ajuda || dados.acompanha_metricas
  },

  // FASE 4: Decisão e Timing
  QUALIFICACAO: {
    objetivo: 'Entender quem decide, prazo e budget',
    dados_prioritarios: ['quem_decide', 'prazo_ideal'],
    dados_oportunisticos: ['orcamento_estimado'],
    transicao: (dados) => dados.quem_decide && dados.prazo_ideal
  },

  // FASE 5: Fechamento - Propor call de diagnóstico
  FECHAMENTO: {
    objetivo: 'Propor call de diagnóstico (20-30 min)',
    dados_prioritarios: ['aceita_diagnostico', 'melhor_horario'],
    dados_oportunisticos: [],
    transicao: (dados) => dados.aceita_diagnostico
  }
};

// ═══════════════════════════════════════════════════════════════════════════
//  CLASSE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

// Exportar função de detecção para testes
export { detectArchetypeFromMessage, ARCHETYPES };

export class ConsultativeEngine {
  constructor(contactId) {
    this.contactId = contactId;
    this.currentPhase = 'DESCOBERTA';

    // Dados de qualificação - DIGITAL BOOST (Produto + IA + Growth)
    this.dados = {
      // ═══════════════════════════════════════════════════════════════════
      // IDENTIFICAÇÃO
      // ═══════════════════════════════════════════════════════════════════
      nome: null,
      empresa: null,
      setor: null,
      cargo: null,

      // ═══════════════════════════════════════════════════════════════════
      // CONTEXTO E OBJETIVO
      // ═══════════════════════════════════════════════════════════════════
      objetivo_principal: null,   // "vender mais", "reduzir custo", "organizar", "lançar produto"
      maior_gargalo: null,        // "leads", "conversão", "atendimento", "retenção", "operação"

      // ═══════════════════════════════════════════════════════════════════
      // ESTRUTURA E PROCESSO
      // ═══════════════════════════════════════════════════════════════════
      ferramentas_atuais: null,   // "CRM X", "WhatsApp", "planilhas", "ERP Y"
      processos_documentados: null, // "sim", "não", "parcialmente"

      // ═══════════════════════════════════════════════════════════════════
      // DADOS E TRACKING (Growth)
      // ═══════════════════════════════════════════════════════════════════
      acompanha_metricas: null,   // "sim CAC/LTV", "não", "parcialmente"
      tem_tracking: null,         // "sim pixels/UTMs", "não", "parcialmente"

      // ═══════════════════════════════════════════════════════════════════
      // IA
      // ═══════════════════════════════════════════════════════════════════
      onde_ia_ajuda: null,        // "atendimento", "qualificação", "suporte", "automação"
      tem_base_conhecimento: null, // "sim FAQ/docs", "não", "parcialmente"

      // ═══════════════════════════════════════════════════════════════════
      // DECISÃO E TIMING
      // ═══════════════════════════════════════════════════════════════════
      quem_decide: null,          // "eu", "eu e sócio", "diretoria"
      prazo_ideal: null,          // "urgente", "esse mês", "próximo quarter"
      orcamento_estimado: null,   // faixa de investimento

      // ═══════════════════════════════════════════════════════════════════
      // FECHAMENTO
      // ═══════════════════════════════════════════════════════════════════
      aceita_diagnostico: null,   // call de diagnóstico 20-30 min
      melhor_horario: null,

      // ═══════════════════════════════════════════════════════════════════
      // RECOMENDAÇÃO (preenchido pelo agente)
      // ═══════════════════════════════════════════════════════════════════
      servicos_recomendados: [],  // ['desenvolvimento', 'ia', 'growth']
      resumo_cenario: null        // resumo pra entrega no final
    };

    // Alias para compatibilidade
    this.bant = this.dados;

    this.historico = [];
    this.archetype = 'default';
    this.turno = 0;
    this.ultima_pergunta = null;
    this.nome_usado_turno = 0;
    this.dados_perguntados = [];
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PERSISTÊNCIA
  // ═══════════════════════════════════════════════════════════════════════

  restoreState(saved) {
    if (!saved) return;
    // Compatibilidade com fases antigas
    const faseMap = {
      'NEED_DISCOVERY': 'DESCOBERTA',
      'NEED_IMPACT': 'APROFUNDAMENTO',
      'NEED_SOLUTION': 'DIMENSIONAMENTO',
      'AUTHORITY': 'QUALIFICACAO',
      'BUDGET': 'QUALIFICACAO',
      'TIMING': 'QUALIFICACAO',
      'CLOSING': 'FECHAMENTO',
      'SCHEDULING': 'FECHAMENTO'
    };
    const savedPhase = saved.currentPhase || saved.state || 'DESCOBERTA';
    this.currentPhase = faseMap[savedPhase] || savedPhase;

    this.bant = { ...this.bant, ...(saved.bant || saved.dados || {}) };
    this.historico = saved.historico || [];
    this.archetype = normalizeArchetype(saved.archetype);
    this.turno = saved.turno || 0;
    this.ultima_pergunta = saved.ultima_pergunta || null;
    this.nome_usado_turno = saved.nome_usado_turno || 0;
    this.dados_perguntados = saved.dados_perguntados || [];
    console.log(`    [ENGINE] Estado restaurado - Fase: ${savedPhase}  ${this.currentPhase} | Arquétipo: ${this.archetype}`);
  }

  getState() {
    return {
      currentPhase: this.currentPhase,
      state: this.currentPhase,
      bant: this.bant,
      historico: this.historico.slice(-10),
      archetype: this.archetype,
      turno: this.turno,
      ultima_pergunta: this.ultima_pergunta,
      nome_usado_turno: this.nome_usado_turno,
      dados_perguntados: this.dados_perguntados
    };
  }

  setLeadProfile(profile) {
    if (profile.nome) this.bant.nome = profile.nome;
    if (profile.empresa) this.bant.empresa = profile.empresa;
    if (profile.setor) this.bant.setor = profile.setor;
    if (profile.cargo) this.bant.cargo = profile.cargo;
  }

  setArchetype(arch) {
    const original = arch;
    this.archetype = normalizeArchetype(arch);
    console.log(`    [ENGINE] Arquétipo: ${original}  ${this.archetype}`);
    console.log(`    [ENGINE] Tom aplicado: ${ARCHETYPES[this.archetype]?.tom || 'default'}`);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PROCESSAMENTO PRINCIPAL
  // ═══════════════════════════════════════════════════════════════════════

  async processMessage(userMessage) {
    this.turno++;

    // ═══════════════════════════════════════════════════════════════════════
    //  DETECÇÃO DINÂMICA DE ARQUÉTIPO VIA GPT - A CADA MENSAGEM!
    // Personaliza o tom de cada resposta baseado na mensagem atual do lead
    // ═══════════════════════════════════════════════════════════════════════
    const previousArchetype = this.archetype;

    // Detectar arquétipo A CADA MENSAGEM para personalizar resposta
    const detectedArchetype = await detectArchetypeFromMessage(userMessage, this.historico);

    // Atualizar arquétipo se detectou algo específico
    if (detectedArchetype !== 'default') {
      this.archetype = detectedArchetype;
    }
    const archetypeChanged = previousArchetype !== this.archetype;

    //  FIX CRÍTICO: Definir 'arch' APÓS atualizar this.archetype
    const arch = ARCHETYPES[this.archetype] || ARCHETYPES.default;

    console.log(`\n [ENGINE v7] ════════════════════════════════════════`);
    console.log(`    ${this.contactId} | Turno ${this.turno}`);
    if (archetypeChanged) {
      console.log(`    Arquétipo: ${previousArchetype}  ${this.archetype} (MUDOU!)`);
    } else {
      console.log(`    Arquétipo: ${this.archetype}`);
    }
    console.log(`    Tom: ${arch?.tom?.substring(0, 50) || 'padrão'}...`);
    console.log(`    Fase: ${this.currentPhase}`);
    console.log(`    "${userMessage.substring(0, 80)}..."`);

    this.historico.push({ role: 'user', content: userMessage });

    try {
      // 1. ANALISAR mensagem
      const analise = await this._analisarMensagem(userMessage);
      console.log(`    Análise:`, JSON.stringify(analise).substring(0, 200));

      // 2. ATUALIZAR BANT
      this._atualizarBANT(analise);

      // 3. VERIFICAR se pode avançar de fase (RIGOROSO)
      const transicao = this._verificarTransicaoRigorosa();
      if (transicao.mudou) {
        console.log(`    Avançou: ${transicao.de}  ${transicao.para}`);
        console.log(`    Motivo: ${transicao.motivo}`);
      }

      // 4. GERAR resposta com arquétipo FORTE
      const resposta = await this._gerarResposta(userMessage, analise, arch);

      this.historico.push({ role: 'assistant', content: resposta });

      const progress = this._calcularProgresso();
      console.log(`    Resposta (${resposta.length} chars)`);
      console.log(`    BANT: ${progress.percentComplete}% | Faltam: ${progress.dadosFaltando.join(', ') || 'nenhum'}`);

      return {
        message: resposta,
        stage: this.currentPhase,
        bantData: this._formatarBANT(),
        progress: progress,
        isComplete: this.currentPhase === 'COMPLETED',
        readyForScheduling: ['CLOSING', 'SCHEDULING'].includes(this.currentPhase),
        analysis: analise
      };

    } catch (error) {
      console.error(`    Erro:`, error.message);
      return {
        message: this._fallback(),
        stage: this.currentPhase,
        error: error.message
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // ANÁLISE DE MENSAGEM
  // ═══════════════════════════════════════════════════════════════════════

  async _analisarMensagem(mensagem) {
    const prompt = `Analise esta mensagem de um lead em conversa de vendas da DIGITAL BOOST e extraia TODOS os dados mencionados. Retorne JSON.

CONTEXTO:
- Fase: ${this.currentPhase}
- Última pergunta: ${this.ultima_pergunta || 'nenhuma'}
- Dados já coletados: ${JSON.stringify(this.bant, null, 2)}

SOBRE A DIGITAL BOOST:
- Desenvolvimento de sistemas, integrações com IA e consultoria de Growth
- Objetivo: ajudar empresas a criar previsibilidade com dados e crescimento escalável

MENSAGEM DO LEAD:
"${mensagem}"

EXTRAIA o que está EXPLÍCITO ou que pode ser INFERIDO com alta confiança. Retorne JSON:

{
  "dados": {
    // IDENTIFICAÇÃO
    "nome": "nome da pessoa, null se não mencionou",
    "empresa": "nome da empresa, null se não mencionou",
    "setor": "ramo/segmento (restaurante, loja, SaaS, consultoria, etc), null se não",
    "cargo": "cargo/função, null se não mencionou",

    // CONTEXTO E OBJETIVO (foco Digital Boost)
    "objetivo_principal": "vender_mais|reduzir_custo|organizar_operacao|lancar_produto, null se não",
    "maior_gargalo": "geracao_leads|conversao|atendimento|retencao|operacao, null se não",

    // ESTRUTURA E FERRAMENTAS
    "ferramentas_atuais": "CRM, WhatsApp, planilhas, ERP, sistema próprio, etc - null se não",
    "processos_documentados": true/false/null - tem SOPs ou cada um faz do seu jeito?",

    // TRACKING E DADOS (Growth)
    "acompanha_metricas": "CAC, LTV, conversão, etc - null se não mencionou",
    "tem_tracking": true/false/null - pixels, UTMs, eventos configurados?",

    // IA E AUTOMAÇÃO
    "onde_ia_ajuda": "atendimento, vendas, processos - null se não mencionou interesse em IA",
    "tem_base_conhecimento": true/false/null - FAQs, documentação, scripts?",

    // PERFIL DA EMPRESA
    "tempo_empresa": "tempo de mercado (ex: '5 anos'), null se não",
    "tamanho": "número de funcionários ou porte, null se não",
    "qtd_clientes": "quantidade de clientes, null se não",

    // DOR ESPECÍFICA
    "dor_especifica": "COPIE A FRASE EXATA do problema/desafio, null se não",
    "impacto_no_negocio": "como o problema afeta resultados, null se não",

    // DECISÃO E TIMING
    "quem_decide": "quem decide (sozinho, sócio, diretoria), null se não",
    "prazo_ideal": "quando quer resolver (urgente, esse mês, esse trimestre), null se não",
    "orcamento_estimado": "faixa de budget se mencionou, null se não",
    "urgencia": "alta/media/baixa baseado no tom, null se não dá pra inferir",

    // FECHAMENTO
    "aceita_call": true se aceitou call de diagnóstico / false se recusou / null se não falou,
    "melhor_horario": "horário preferido se mencionou, null se não"
  },
  "intencao": "resposta|pergunta|objecao|interesse|concordancia|duvida",
  "objecao_tipo": "preco|tempo|pensar|ja_tenho|nao_preciso|null",
  "quer_saber": "servicos|como_funciona|casos|precos|null",
  "sentimento": "positivo|neutro|negativo|frustrado|ansioso",
  "menciona_numero": true/false
}

REGRAS IMPORTANTES:
- objetivo_principal: inferir de frases como "preciso vender mais", "quero reduzir custos", "tá uma bagunça"
- maior_gargalo: inferir de "não consigo converter", "leads não viram clientes", "atendimento lento"
- dor_especifica = copie a FRASE EXATA, não resuma
- INFIRA urgencia pelo tom: frustrado/desesperado = alta, interessado = média, só perguntando = baixa
- null para TUDO não mencionado
- NÃO invente dados
- Responda APENAS com JSON válido`;

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 800,
        response_format: { type: 'json_object' }
      });

      return JSON.parse(completion.choices[0].message.content);
    } catch (e) {
      console.error('Erro análise:', e.message);
      return { dados: {}, intencao: 'outro' };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // ATUALIZAÇÃO DE BANT
  // ═══════════════════════════════════════════════════════════════════════

  _atualizarBANT(analise) {
    const dados = analise.dados || {};

    // Todos os campos que podem ser coletados - DIGITAL BOOST
    const campos = [
      // Identificação
      'nome', 'empresa', 'setor', 'cargo',
      // Contexto e Objetivo (foco Digital Boost)
      'objetivo_principal', 'maior_gargalo',
      // Estrutura e Ferramentas
      'ferramentas_atuais', 'processos_documentados',
      // Tracking e Dados (Growth)
      'acompanha_metricas', 'tem_tracking',
      // IA e Automação
      'onde_ia_ajuda', 'tem_base_conhecimento',
      // Perfil da empresa
      'tempo_empresa', 'tamanho', 'qtd_clientes',
      // Dor específica
      'dor_especifica', 'impacto_no_negocio',
      // Decisão e Timing
      'quem_decide', 'prazo_ideal', 'orcamento_estimado', 'urgencia',
      // Fechamento
      'aceita_call', 'melhor_horario'
    ];

    let dadosNovos = 0;
    for (const campo of campos) {
      if (dados[campo] !== null && dados[campo] !== undefined) {
        // Só atualiza se não tinha antes
        if (this.bant[campo] === null || this.bant[campo] === undefined || this.bant[campo] === false) {
          this.bant[campo] = dados[campo];
          dadosNovos++;
          console.log(`    NOVO: ${campo} = "${dados[campo]}"`);
        }
      }
    }

    if (dadosNovos > 0) {
      console.log(`    ${dadosNovos} dado(s) novo(s) coletado(s) nesta mensagem`);
    }

    // Se falou de orçamento de qualquer forma, marca como discutido
    if (dados.orcamento_estimado !== null || analise.quer_saber === 'precos') {
      this.bant.budget_discutido = true;
    }

    // Detectar aceite de call de diagnóstico
    if (analise.aceita_call === true || (analise.sentimento === 'positivo' && this.currentPhase === 'FECHAMENTO')) {
      this.bant.aceita_call = true;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // TRANSIÇÃO CONVERSACIONAL - BASEADA EM DADOS COLETADOS
  // ═══════════════════════════════════════════════════════════════════════

  _verificarTransicaoRigorosa() {
    const anterior = this.currentPhase;
    let motivo = '';
    const fluxo = FLUXO_CONVERSACIONAL[this.currentPhase];

    // Se a fase atual tem função de transição, usa ela
    if (fluxo && fluxo.transicao && fluxo.transicao(this.bant)) {
      const fases = Object.keys(FLUXO_CONVERSACIONAL);
      const indexAtual = fases.indexOf(this.currentPhase);

      if (indexAtual < fases.length - 1) {
        const proximaFase = fases[indexAtual + 1];
        this.currentPhase = proximaFase;
        motivo = `Dados coletados: ${fluxo.dados_prioritarios.filter(d => this.bant[d]).join(', ')}`;
      }
    }

    // Log detalhado
    if (anterior !== this.currentPhase) {
      console.log(`    Transição: ${anterior}  ${this.currentPhase}`);
      console.log(`    Motivo: ${motivo}`);
    }

    return {
      mudou: anterior !== this.currentPhase,
      de: anterior,
      para: this.currentPhase,
      motivo
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // ESCOLHER PRÓXIMO DADO A PERGUNTAR - USA STYLE GUIDE (1 pergunta por vez!)
  // ═══════════════════════════════════════════════════════════════════════

  _escolherProximoDado() {
    //  USAR FUNÇÃO CANÔNICA DO STYLE GUIDE - garante árvore de 1 pergunta por vez
    const nextQuestion = getNextQuestion(this.bant);

    // Se qualificação completa, retorna null
    if (nextQuestion.isComplete) {
      console.log(`    [ENGINE] Qualificação COMPLETA via style guide`);
      return null;
    }

    // Verificar se já perguntamos esse campo (evita repetir)
    if (nextQuestion.field && this.dados_perguntados.includes(nextQuestion.field)) {
      // Se já perguntamos o campo sugerido pelo style guide, usar fallback local
      const fluxo = FLUXO_CONVERSACIONAL[this.currentPhase];
      if (fluxo) {
        for (const dado of [...fluxo.dados_prioritarios, ...fluxo.dados_oportunisticos]) {
          if (!this.bant[dado] && !this.dados_perguntados.includes(dado)) {
            console.log(`    [ENGINE] Fallback local: ${dado} (style guide sugeriu ${nextQuestion.field} já perguntado)`);
            return dado;
          }
        }
      }
      return null;
    }

    console.log(`    [ENGINE] Próximo dado (style guide): ${nextQuestion.field} [fase: ${nextQuestion.phase}]`);
    return nextQuestion.field;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // OBTER PERGUNTA ADAPTADA AO ARQUÉTIPO
  // ═══════════════════════════════════════════════════════════════════════

  _obterPerguntaAdaptada(dado) {
    const perguntas = PERGUNTAS_ADAPTATIVAS[dado];
    if (!perguntas) return null;

    // Retorna a pergunta do arquétipo atual ou default
    return perguntas[this.archetype] || perguntas.default;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // GERAÇÃO DE RESPOSTA
  // ═══════════════════════════════════════════════════════════════════════

  async _gerarResposta(mensagem, analise, arch) {
    // ═══════════════════════════════════════════════════════════════════════════
    //  FIX MSG-003: DETECTAR PERGUNTA REPETIDA E MUDAR ESTRATÉGIA
    // Se vamos perguntar algo que já perguntamos, usar abordagem diferente
    // ═══════════════════════════════════════════════════════════════════════════
    const proximoDado = this._escolherProximoDado();

    // Verificar se estamos prestes a repetir uma pergunta
    if (proximoDado && this.dados_perguntados.includes(proximoDado)) {
      console.log(`    [ENGINE] MSG-003: Detectada possível repetição de "${proximoDado}"`);

      // ESTRATÉGIA 1: Mudar para outro dado não perguntado
      const fluxo = FLUXO_CONVERSACIONAL[this.currentPhase];
      if (fluxo) {
        const dadosAlternativos = [...fluxo.dados_prioritarios, ...fluxo.dados_oportunisticos]
          .filter(d => !this.dados_perguntados.includes(d) && !this.bant[d]);

        if (dadosAlternativos.length > 0) {
          console.log(`    [ENGINE] Mudando estratégia: ${proximoDado}  ${dadosAlternativos[0]}`);
          // Atualizar para perguntar dado alternativo
        }
      }

      // ESTRATÉGIA 2: Usar abordagem mais direta/resumida
      const abordagensAlternativas = {
        objetivo_principal: 'De forma bem direta: o foco principal é vender mais, reduzir custo ou organizar a operação?',
        maior_gargalo: 'Resumindo: onde está o maior problema - captar, vender, atender ou operar?',
        ferramentas_atuais: 'Pra eu entender: vocês usam CRM, planilha ou sistema próprio?',
        processos_documentados: 'Rápido: os processos estão escritos ou cada um faz do seu jeito?',
        onde_ia_ajuda: 'Se pudesse automatizar UMA coisa, o que seria?',
        quem_decide: 'Você decide sozinho ou precisa alinhar com alguém?',
        prazo_ideal: 'Isso é urgente ou pode esperar o próximo mês?'
      };

      if (abordagensAlternativas[proximoDado]) {
        console.log(`    [ENGINE] MSG-003: Usando abordagem alternativa para "${proximoDado}"`);
        return abordagensAlternativas[proximoDado];
      }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  FIX: "não sei" / "não tenho certeza" NÃO É OBJEÇÃO!
    // É uma resposta vaga que precisa de pergunta exploratória
    // ═══════════════════════════════════════════════════════════════════════════
    const textoLower = mensagem.toLowerCase();
    const respostaVaga = /não (sei|tenho certeza)|talvez|acho que não|não tenho ideia|difícil dizer|depende|não saberia|incerteza/.test(textoLower);

    // Se é resposta vaga E ainda não coletou dados básicos, usar pergunta exploratória
    if (respostaVaga && !this.bant.objetivo_principal && !this.bant.maior_gargalo) {
      console.log(`    [ENGINE] Resposta vaga detectada - usando pergunta exploratória`);
      const perguntaExploratoria = PERGUNTAS_ADAPTATIVAS.explorar_dor[this.archetype] || PERGUNTAS_ADAPTATIVAS.explorar_dor.default;
      return perguntaExploratoria;
    }

    // Tratar objeções REAIS (não confundir com incerteza)
    // "pensar" só se o lead claramente quer adiar: "vou pensar", "te falo depois", "deixa eu ver"
    if (analise.objecao_tipo && analise.objecao_tipo !== 'pensar') {
      return this._tratarObjecao(analise.objecao_tipo);
    }

    // Objeção "pensar" só se tem texto claro de adiamento
    const adiarClaro = /vou pensar|te (falo|aviso|retorno)|deixa eu ver|depois (a gente|eu)|mais tarde|agora não dá/.test(textoLower);
    if (analise.objecao_tipo === 'pensar' && adiarClaro) {
      return this._tratarObjecao(analise.objecao_tipo);
    }

    // Construir prompt específico da fase
    const prompt = this._construirPrompt(analise, arch);

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: prompt },
          ...this.historico.slice(-6)
        ],
        temperature: 0.7,
        max_tokens: 250
      });

      let resposta = completion.choices[0].message.content.trim();
      resposta = this._posProcessar(resposta);

      // Detectar pergunta feita
      const perguntas = resposta.match(/[^.!]*\?/g);
      if (perguntas) {
        this.ultima_pergunta = perguntas[perguntas.length - 1].trim();
      }

      return resposta;

    } catch (e) {
      console.error('Erro geração:', e.message);
      return this._fallback();
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PROMPT CONVERSACIONAL - COM ARQUÉTIPO E DADOS INTELIGENTES
  // ═══════════════════════════════════════════════════════════════════════

  _construirPrompt(analise, arch) {
    // Dados coletados para contexto (novos campos Digital Boost)
    const dadosColetados = [];
    if (this.dados.empresa) dadosColetados.push(`Empresa: ${this.dados.empresa}`);
    if (this.dados.setor) dadosColetados.push(`Setor: ${this.dados.setor}`);
    if (this.dados.objetivo_principal) dadosColetados.push(`Objetivo: ${this.dados.objetivo_principal}`);
    if (this.dados.maior_gargalo) dadosColetados.push(`Gargalo: ${this.dados.maior_gargalo}`);
    if (this.dados.ferramentas_atuais) dadosColetados.push(`Ferramentas: ${this.dados.ferramentas_atuais}`);
    if (this.dados.processos_documentados) dadosColetados.push(`Processos: ${this.dados.processos_documentados}`);
    if (this.dados.acompanha_metricas) dadosColetados.push(`Métricas: ${this.dados.acompanha_metricas}`);
    if (this.dados.onde_ia_ajuda) dadosColetados.push(`IA: ${this.dados.onde_ia_ajuda}`);
    if (this.dados.quem_decide) dadosColetados.push(`Decisor: ${this.dados.quem_decide}`);
    if (this.dados.prazo_ideal) dadosColetados.push(`Prazo: ${this.dados.prazo_ideal}`);

    // Determinar se pode usar nome (máximo a cada 3 turnos)
    const podeUsarNome = this.dados.nome && (this.turno - this.nome_usado_turno >= 3);
    if (podeUsarNome) this.nome_usado_turno = this.turno;

    // Escolher próximo dado a perguntar
    const proximoDado = this._escolherProximoDado();
    const perguntaSugerida = proximoDado ? this._obterPerguntaAdaptada(proximoDado) : null;

    // Marcar que vamos perguntar esse dado
    if (proximoDado && !this.dados_perguntados.includes(proximoDado)) {
      this.dados_perguntados.push(proximoDado);
    }

    // Contexto da fase
    const fluxo = FLUXO_CONVERSACIONAL[this.currentPhase];
    const objetivoFase = fluxo?.objetivo || 'Continuar a conversa';

    // Construir instrução baseada na fase
    let instrucaoFase = '';

    switch (this.currentPhase) {
      case 'DESCOBERTA':
        const perguntaExploratoria = PERGUNTAS_ADAPTATIVAS.explorar_dor[this.archetype] || PERGUNTAS_ADAPTATIVAS.explorar_dor.default;

        instrucaoFase = `OBJETIVO: ${objetivoFase}

${this.dados.objetivo_principal && this.dados.maior_gargalo
    ? `Já sabe: Objetivo = "${this.dados.objetivo_principal}" | Gargalo = "${this.dados.maior_gargalo}". Agora pergunte sobre ferramentas.`
    : ` PRECISA DESCOBRIR O OBJETIVO E O GARGALO DO LEAD!

═══════════════════════════════════════════════════════════════════════════════
 REGRAS - QUALIFICAÇÃO DIGITAL BOOST:
═══════════════════════════════════════════════════════════════════════════════

1. SE o lead deu resposta vaga ("não sei", "talvez"):
    Use esta pergunta: "${perguntaExploratoria}"

2. DESCOBRIR (uma por vez):
    Objetivo: vender mais, reduzir custo, organizar ou lançar produto?
    Gargalo: leads, conversão, atendimento, retenção ou operação?

3. NÃO ASSUMA NADA - deixe o lead falar primeiro!`}`;
        break;

      case 'APROFUNDAMENTO':
        instrucaoFase = `OBJETIVO: ${objetivoFase}

Objetivo identificado: "${this.dados.objetivo_principal || 'descobrindo'}"
Gargalo: "${this.dados.maior_gargalo || 'descobrindo'}"

AGORA DESCUBRA:
${!this.dados.ferramentas_atuais ? '- Que ferramentas usam (CRM, WhatsApp, planilha, ERP, site?)' : ''}
${!this.dados.processos_documentados ? '- Processos são documentados ou "na cabeça"?' : ''}

CONECTE com os serviços da Digital Boost de forma consultiva.`;
        break;

      case 'DIMENSIONAMENTO':
        instrucaoFase = `OBJETIVO: ${objetivoFase}

DESCUBRA OPORTUNIDADES DE IA E DADOS:
${!this.dados.onde_ia_ajuda ? '- Onde IA ajudaria: atendimento, qualificação, suporte, automação?' : ''}
${!this.dados.acompanha_metricas ? '- Acompanham métricas do funil? CAC, conversão, LTV?' : ''}
${!this.dados.tem_tracking ? '- Tem tracking (pixels, eventos, UTMs)?' : ''}

DICA: Pergunte de forma natural, tipo "Onde vocês mais perdem tempo que uma IA poderia resolver?"`;
        break;

      case 'QUALIFICACAO':
        instrucaoFase = `OBJETIVO: ${objetivoFase}

PRECISA SABER:
${!this.dados.quem_decide ? '- Quem decide sobre investir nisso' : ''}
${!this.dados.prazo_ideal ? '- Qual o prazo ideal pra começar' : ''}
${!this.dados.orcamento_estimado ? '- Faixa de orçamento (opcional)' : ''}

DICA: "Você decide isso sozinho ou tem mais alguém?" / "Isso é prioridade pra já?"`;
        break;

      case 'FECHAMENTO':
        instrucaoFase = `OBJETIVO: PROPOR CALL DE DIAGNÓSTICO (20-30 min)

Faça FECHAMENTO CONSULTIVO:
"O próximo passo é uma call rápida de diagnóstico pra mapear funil, ferramentas e oportunidades de automação/IA e growth. No final, vocês recebem um plano de ação com prioridades."

PERGUNTA: "Qual o melhor dia e horário essa semana?"

Disponibilidade: Segunda a Sexta, 9h às 18h.`;
        break;
    }

    // Calcular progresso
    const progresso = this._calcularProgresso();

    return `Você é a SDR consultiva da Digital Boost. Vende: Desenvolvimento de Sistemas + Integrações com IA + Consultoria de Growth.

 REGRA DE OURO: NÃO ASSUMA NADA!
- PRIMEIRO descubra o OBJETIVO (vender mais, reduzir custo, organizar, lançar produto)
- DEPOIS descubra o GARGALO (leads, conversão, atendimento, retenção, operação)
- Se o lead disse "não sei"  EXPLORE MAIS com pergunta aberta
- Seja CURIOSO, não ASSUMPTIVO
- CTA: Call de diagnóstico (20-30 min) para mapear funil, ferramentas e oportunidades

═══════════════════════════════════════════════════════════════════════════════
 SEU TOM E ESTILO NESTA MENSAGEM (OBRIGATÓRIO!)
═══════════════════════════════════════════════════════════════════════════════
ARQUÉTIPO: ${arch.name || 'Pessoa Comum'} - ${arch.description || 'Comunicação natural'}
MOTIVAÇÃO: ${arch.coreMotivation || 'Conectar-se genuinamente'}
VALORES: ${(arch.coreValues || []).join(', ')}

ESTILO DE VOZ: "${arch.voiceStyle || 'Olha, vou ser direto com você...'}"

CARACTERÍSTICAS DO SEU TOM:
${(arch.traits || ['Tom natural e acessível']).map(t => `- ${t}`).join('\n')}

ABORDAGEM DE VENDAS:
- Discovery: ${arch.salesApproach?.discovery || 'Faça perguntas abertas e genuínas'}
- Objeção: ${arch.salesApproach?.objection || 'Responda com empatia e compreensão'}

═══════════════════════════════════════════════════════════════════════════════
 O QUE VOCÊ JÁ SABE SOBRE O LEAD
═══════════════════════════════════════════════════════════════════════════════
${dadosColetados.length > 0 ? dadosColetados.join('\n') : 'Ainda não sabe nada - descubra!'}

═══════════════════════════════════════════════════════════════════════════════
 FASE: ${this.currentPhase} (${progresso.percentComplete}% completo)
═══════════════════════════════════════════════════════════════════════════════
${instrucaoFase}

${perguntaSugerida ? ` PERGUNTA SUGERIDA (adapte ao seu tom): "${perguntaSugerida}"` : ''}

═══════════════════════════════════════════════════════════════════════════════
 REGRAS DA CONVERSA (STYLE GUIDE GLOBAL)
═══════════════════════════════════════════════════════════════════════════════
1. MÁXIMO ${STYLE_RULES.maxLines} linhas (seja conciso!)
2. SEMPRE termine com ${STYLE_RULES.mustEndWith}
3. ${podeUsarNome ? `Pode usar nome "${this.bant.nome}" ${STYLE_RULES.useNameRule}` : 'NÃO use o nome agora'}
4.  NUNCA comece com: ${STYLE_RULES.forbiddenStarters.join(', ')}
5.  Alternativas OK: ${STYLE_RULES.allowedAcknowledgments.join(', ')}
6. NÃO repita informações que o lead já deu
7. Use quebras de linha entre ideias
8. SEJA NATURAL - não pareça um robô fazendo checklist!

Escreva APENAS a mensagem de resposta.`;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // TRATAMENTO DE OBJEÇÕES
  // ═══════════════════════════════════════════════════════════════════════

  _tratarObjecao(tipo) {
    // Scripts de objeção adaptados para Digital Boost
    const scripts = {
      preco: `O investimento varia conforme o escopo - pode ser projeto pontual ou acompanhamento contínuo.

O que posso garantir: a maioria dos clientes recupera o investimento nos primeiros 90 dias só em eficiência operacional.

Vale uma call de 20 min pra eu entender o cenário e dar uma estimativa realista?`,

      tempo: `A gente entrega em sprints - você vê resultado rápido, não precisa esperar meses.

E o suporte é direto por WhatsApp com os sócios.

Uma call de diagnóstico de 20 min mostra como funciona. Qual melhor horário?`,

      pensar: `Faz sentido querer analisar.

Que tal uma call de diagnóstico de 20 min? Você sai com um plano de ação claro e decide com mais informação.

Sem compromisso. Qual dia funciona?`,

      ja_tenho: `Que ferramentas vocês usam hoje?

A Digital Boost não substitui - a gente INTEGRA tudo que vocês já têm (CRM, WhatsApp, ERP) e adiciona inteligência.

Posso mostrar em 20 min como funciona?`,

      nao_preciso: `Vocês já têm tracking do funil, automação de atendimento e método de crescimento funcionando?

A maioria dos negócios acha que não precisa até ver quanto tá perdendo sem essa estrutura.

Uma call de diagnóstico de 20 min mostra onde estão as oportunidades.`
    };

    return scripts[tipo] || this._fallback();
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PÓS-PROCESSAMENTO
  // ═══════════════════════════════════════════════════════════════════════

  _posProcessar(resposta) {
    // Remover aberturas genéricas usando STYLE GUIDE
    for (const forbidden of STYLE_RULES.forbiddenStarters) {
      const regex = new RegExp(`^(${forbidden}[.!,]?\\s*)`, 'i');
      resposta = resposta.replace(regex, '');
    }
    // Também remover variantes comuns
    resposta = resposta.replace(/^(Interessante[.!,]?\s*)/i, '');
    resposta = resposta.replace(/^(Compreendo[.!,]?\s*)/i, '');
    resposta = resposta.replace(/^(É compreensível[.!,]?\s*)/i, '');

    // Remover nome repetido no meio
    if (this.bant.nome) {
      const nomeRegex = new RegExp(`${this.bant.nome},?\\s*`, 'gi');
      const matches = resposta.match(nomeRegex);
      if (matches && matches.length > 1) {
        // Manter só a primeira ocorrência
        let first = true;
        resposta = resposta.replace(nomeRegex, (match) => {
          if (first) { first = false; return match; }
          return '';
        });
      }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  GARANTIR 1 PERGUNTA POR MENSAGEM (STYLE GUIDE)
    // Se detectar múltiplas perguntas, manter apenas a última (mais importante)
    // ═══════════════════════════════════════════════════════════════════════════
    const perguntas = resposta.match(/[^.!]*\?/g);
    if (perguntas && perguntas.length > 1) {
      console.log(`    [ENGINE] ${perguntas.length} perguntas detectadas - mantendo apenas a última`);

      // Encontrar a última pergunta e seu contexto
      const ultimaPergunta = perguntas[perguntas.length - 1].trim();
      const indicePergunta = resposta.lastIndexOf(ultimaPergunta);

      // Pegar texto antes da última pergunta (contexto/reconhecimento)
      let contextoBefore = resposta.substring(0, indicePergunta).trim();

      // Remover perguntas do contexto (mantendo só afirmações)
      contextoBefore = contextoBefore.replace(/[^.!]*\?/g, '').trim();

      // Limpar pontuação solta e espaços extras
      contextoBefore = contextoBefore.replace(/\s+/g, ' ').replace(/[.!]+\s*$/, '').trim();

      // Reconstruir resposta: contexto (sem perguntas) + última pergunta
      if (contextoBefore.length > 10) {
        resposta = contextoBefore + '.\n\n' + ultimaPergunta;
      } else {
        resposta = ultimaPergunta;
      }

      console.log(`    [ENGINE] Resposta reformatada: 1 pergunta`);
    }

    // Garantir quebras de linha
    if (!resposta.includes('\n') && resposta.length > 100) {
      const sentences = resposta.split(/(?<=[.!?])\s+/);
      if (sentences.length >= 2) {
        resposta = sentences.slice(0, Math.ceil(sentences.length/2)).join(' ') +
                   '\n\n' +
                   sentences.slice(Math.ceil(sentences.length/2)).join(' ');
      }
    }

    return resposta.trim();
  }

  _fallback() {
    // Fallbacks adaptados para Digital Boost - foco em diagnóstico
    const fallbacks = {
      DESCOBERTA: 'Me conta: o objetivo principal agora é vender mais, reduzir custo, organizar a operação ou lançar algo novo?',
      APROFUNDAMENTO: 'Que ferramentas vocês usam hoje? CRM, WhatsApp, planilhas, ERP?',
      DIMENSIONAMENTO: 'Vocês acompanham métricas do funil? CAC, conversão, LTV?',
      QUALIFICACAO: 'Você decide isso sozinho ou tem mais alguém envolvido?',
      FECHAMENTO: 'O próximo passo é uma call de diagnóstico de 20-30 min pra entender melhor o cenário.\n\nQual o melhor horário essa semana?',
      // Compatibilidade com fases antigas
      NEED_DISCOVERY: 'Me conta: qual o objetivo principal agora? Vender mais, reduzir custo ou organizar a operação?',
      NEED_IMPACT: 'Que ferramentas vocês usam hoje? CRM, WhatsApp, planilhas?',
      NEED_SOLUTION: 'Quantas pessoas trabalham aí?',
      AUTHORITY: 'Você decide isso sozinho ou tem mais alguém envolvido?',
      BUDGET: 'Qual a faixa de investimento que vocês estão considerando?',
      TIMING: 'Pra quando vocês precisam ter isso funcionando?',
      CLOSING: 'Que tal uma call de diagnóstico de 20-30 min?\n\nQual o melhor horário essa semana?',
      SCHEDULING: 'Qual o melhor dia e horário pra você?'
    };
    return fallbacks[this.currentPhase] || fallbacks.DESCOBERTA;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // CÁLCULOS
  // ═══════════════════════════════════════════════════════════════════════

  _calcularProgresso() {
    const dadosFaltando = [];

    // Dados essenciais Digital Boost (obrigatórios para qualificar)
    if (!this.bant.objetivo_principal) dadosFaltando.push('objetivo');
    if (!this.bant.maior_gargalo) dadosFaltando.push('gargalo');
    if (!this.bant.ferramentas_atuais) dadosFaltando.push('ferramentas');
    if (!this.bant.quem_decide) dadosFaltando.push('quem_decide');
    if (!this.bant.urgencia) dadosFaltando.push('urgencia');

    // Dados importantes (enriquecem a qualificação)
    const dadosImportantes = [];
    if (!this.bant.acompanha_metricas) dadosImportantes.push('metricas');
    if (!this.bant.tem_tracking) dadosImportantes.push('tracking');
    if (!this.bant.onde_ia_ajuda) dadosImportantes.push('ia');
    if (!this.bant.prazo_ideal) dadosImportantes.push('prazo');

    // Cálculo de progresso (essenciais = 70%, importantes = 30%)
    const totalEssenciais = 5;
    const totalImportantes = 4;
    const coletadosEssenciais = totalEssenciais - dadosFaltando.length;
    const coletadosImportantes = totalImportantes - dadosImportantes.length;

    const percentEssenciais = (coletadosEssenciais / totalEssenciais) * 70;
    const percentImportantes = (coletadosImportantes / totalImportantes) * 30;
    const percent = Math.round(percentEssenciais + percentImportantes);

    return {
      percentComplete: percent,
      currentStage: this.currentPhase,
      dadosFaltando: [...dadosFaltando, ...dadosImportantes],
      dadosColetados: Object.keys(this.bant).filter(k => this.bant[k] !== null && this.bant[k] !== false),
      essenciaisCompletos: dadosFaltando.length === 0,
      need: !!this.bant.objetivo_principal && !!this.bant.maior_gargalo,
      authority: !!this.bant.quem_decide,
      budget: this.bant.budget_discutido,
      timing: !!this.bant.urgencia || !!this.bant.prazo_ideal,
      readyForScheduling: ['FECHAMENTO'].includes(this.currentPhase)
    };
  }

  _formatarBANT() {
    return {
      identificacao: {
        nome: this.bant.nome,
        empresa: this.bant.empresa,
        setor: this.bant.setor,
        cargo: this.bant.cargo
      },
      contexto: {
        objetivo_principal: this.bant.objetivo_principal,
        maior_gargalo: this.bant.maior_gargalo,
        dor_especifica: this.bant.dor_especifica
      },
      estrutura: {
        ferramentas_atuais: this.bant.ferramentas_atuais,
        processos_documentados: this.bant.processos_documentados,
        acompanha_metricas: this.bant.acompanha_metricas,
        tem_tracking: this.bant.tem_tracking
      },
      ia: {
        onde_ia_ajuda: this.bant.onde_ia_ajuda,
        tem_base_conhecimento: this.bant.tem_base_conhecimento
      },
      perfil_empresa: {
        tempo_mercado: this.bant.tempo_empresa,
        clientes: this.bant.qtd_clientes,
        funcionarios: this.bant.tamanho
      },
      authority: {
        quem_decide: this.bant.quem_decide
      },
      budget: {
        discutido: this.bant.budget_discutido,
        orcamento_estimado: this.bant.orcamento_estimado
      },
      timing: {
        urgencia: this.bant.urgencia,
        prazo_ideal: this.bant.prazo_ideal
      }
    };
  }

  // Métodos públicos para compatibilidade
  isReadyForScheduling() {
    return ['FECHAMENTO', 'CLOSING', 'SCHEDULING'].includes(this.currentPhase);
  }

  isComplete() {
    return this.currentPhase === 'COMPLETED';
  }

  getBANTSummary() {
    return {
      lead: {
        nome: this.bant.nome || 'Não informado',
        negocio: this.bant.empresa || 'Não informado',
        setor: this.bant.setor || 'Não informado',
        tamanho: this.bant.tamanho || 'Não informado'
      },
      contexto: {
        objetivo: this.bant.objetivo_principal || 'Não identificado',
        gargalo: this.bant.maior_gargalo || 'Não identificado',
        ferramentas: this.bant.ferramentas_atuais || 'Não informado'
      },
      qualificacao: {
        dor: this.bant.dor_especifica || 'Não identificada',
        metricas: this.bant.acompanha_metricas || 'Não informado',
        ia_interesse: this.bant.onde_ia_ajuda || 'Não informado',
        budget: this.bant.budget_discutido ? 'Discutido' : 'Não discutido',
        decisor: this.bant.quem_decide || 'Não identificado',
        urgencia: this.bant.urgencia || 'Não definida'
      },
      progress: this._calcularProgresso(),
      archetype: this.archetype,
      fase: this.currentPhase
    };
  }
}

export default ConsultativeEngine;

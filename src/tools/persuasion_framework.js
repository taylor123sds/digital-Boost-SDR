/**
 * Framework de Persuasão Científica para ORBION
 * Baseado em pesquisas de Gong, Harvard Business Review, Cialdini e outros
 */

// ================== PERMISSION-BASED OPENER ==================

/**
 * Estrutura de abertura baseada em permissão (+11% taxa de avanço)
 * Formato: contexto → "é ligação fria" → "posso te tomar 20s?"
 */
export const PERMISSION_OPENERS = {
  STANDARD: {
    template: `Oi, [[NOME]] — é o Orbion da Digital Boost, é uma ligação fria. 

Olhei [[CONTEXTO]] e posso te explicar em 20 segundos o porquê do contato e você decide se seguimos?

(Pausa para concordância)

Porque [[JUSTIFICATIVA]] que costuma gerar [[RESULTADO]] em negócios como o seu. 

Faz sentido conversarmos 30 min sobre isso?`,
    
    timing: {
      pace: '180-200 wpm',
      pause_after_permission: '2-3 segundos',
      tone: 'confiante mas respeitoso'
    }
  },

  BY_SECTOR: {
    RESTAURANTE: `Oi, [[NOME]] — Orbion da Digital Boost, é uma ligação fria.

Notei que vocês têm [[CONTEXTO]] e posso explicar em 20s o porquê do contato?

(Pausa)

Porque restaurantes aqui em [[BAIRRO]] estão perdendo 40% dos pedidos por demora no WhatsApp, e temos uma solução que aumenta 180% os pedidos em horários mortos.

Vale 30 min para ver como?`,

    ODONTOLOGIA: `Dr. [[NOME]] — Orbion da Digital Boost, é uma ligação fria.

Vi que trabalha com [[CONTEXTO]] e posso explicar em 20s o motivo da ligação?

(Pausa)

Porque clínicas aqui em [[BAIRRO]] estão dependendo 100% de convênio quando poderiam ter +60% de estética particular via WhatsApp automatizado.

Faz sentido um diagnóstico de 30 min?`,

    ADVOCACIA: `Dr. [[NOME]] — Orbion da Digital Boost, é uma ligação fria.

Trabalho com escritórios de [[ÁREA]] e posso explicar em 20s o porquê do contato?

(Pausa)

Porque a captação ética de leads está cada vez mais difícil, e desenvolvemos uma triagem automatizada que qualifica 70% melhor os casos.

Vale 30 min para validar?`,

    PET_CLINICA: `[[NOME]] — Orbion da Digital Boost, é uma ligação fria.

Vi que vocês têm plantão 24h e posso explicar rapidamente o motivo da ligação?

(Pausa)

Porque clínicas veterinárias aqui perdem 60% das emergências noturnas por falta de resposta rápida, e temos um sistema que aumenta 30% os atendimentos 24h.

Vale conversar 30 min?`,

    ACADEMIA: `[[NOME]] — Orbion da Digital Boost, é uma ligação fria.

Trabalho com academias e posso explicar em 20s o porquê desta ligação?

(Pausa)

Porque o churn de 60-90 dias está matando o faturamento das academias, e temos uma automação que reduz para 25% usando WhatsApp inteligente.

Faz sentido 30 min para ver como?`
  }
};

// ================== ESTRUTURA "PORQUE" ==================

/**
 * Justificativas com "porque" para aumentar concordância (Langer, 1978)
 */
export const BECAUSE_FRAMEWORK = {
  structure: 'Pedido + PORQUE + Benefício específico + Prova social',
  
  templates: {
    MEETING_REQUEST: `Gostaria de propor 30 min de conversa PORQUE negócios como o seu em [[BAIRRO]] viram [[RESULTADO_ESPECÍFICO]] aplicando exatamente essa estratégia.`,
    
    DEMO_REQUEST: `Vale mostrar o sistema PORQUE você vai ver em tempo real como [[CASE_ESPECÍFICO]] saiu de [[ANTES]] para [[DEPOIS]] em apenas [[TEMPO]].`,
    
    PILOT_REQUEST: `Sugiro testarmos 14 dias PORQUE assim você valida o resultado sem risco e decide baseado em dados reais do seu negócio.`,
    
    INFO_REQUEST: `Posso fazer 3 perguntas rápidas PORQUE preciso entender seu cenário atual para mostrar exatamente onde está a oportunidade de [[MÉTRICA]].`
  },

  by_archetype: {
    HEROI: `PORQUE você precisa de resultado agora e isso te dá [[BENEFÍCIO]] em 30 dias`,
    SABIO: `PORQUE os dados mostram que [[ESTATÍSTICA]] e você pode validar isso`,
    CUIDADOR: `PORQUE é sem risco e você só continua se vir resultado real`,
    MAGO: `PORQUE você vai ver a transformação de [[ANTES]] para [[DEPOIS]]`,
    EXPLORADOR: `PORQUE podemos testar pequeno e medir o resultado juntos`
  }
};

// ================== PERGUNTAS OARS ==================

/**
 * Sistema OARS: Open questions, Affirmations, Reflections, Summary
 */
export const OARS_QUESTIONS = {
  discovery: {
    open_questions: [
      `Me conta, qual é o maior desafio com [[ÁREA_NEGÓCIO]] hoje?`,
      `Como vocês estão lidando com [[DOR_TÍPICA]] atualmente?`,
      `O que já tentaram para resolver [[PROBLEMA_ESPECÍFICO]]?`,
      `Se pudesse melhorar uma coisa em [[PROCESSO]], qual seria?`
    ],

    follow_ups: [
      `Interessante... e quanto isso representa em [[MÉTRICA]]?`,
      `Entendi. E qual é o impacto disso no [[RESULTADO_DESEJADO]]?`,
      `Certo. E vocês já mediram quanto isso custa por mês?`,
      `Boa. E se resolvesse isso, qual seria o primeiro benefício?`
    ]
  },

  qualification: {
    open_questions: [
      `Como vocês tomam decisão para investimentos em [[ÁREA]]?`,
      `Qual seria um resultado que justificaria investir nisso?`,
      `Se eu te mostrasse um ROI de [[X]]x em [[TEMPO]], faria sentido?`,
      `Quem mais estaria envolvido numa decisão dessas?`
    ],

    affirmations: [
      `Faz todo sentido você se preocupar com [[PREOCUPAÇÃO]]`,
      `Vocês estão certos em priorizar [[PRIORIDADE]]`,
      `É inteligente da sua parte medir [[MÉTRICA]] antes de decidir`
    ]
  },

  closing: {
    reflections: [
      `Então se eu entendi: o principal problema é [[RESUMO_PROBLEMA]] e o ideal seria [[RESULTADO_DESEJADO]], correto?`,
      `Pelo que ouvi, [[SITUAÇÃO_ATUAL]] está custando [[CUSTO]] e vocês querem [[OBJETIVO]], é isso?`
    ],

    summary_close: [
      `Perfeito. Resumindo: você tem [[PROBLEMA]], já tentou [[TENTATIVAS]], e precisa de [[SOLUÇÃO]]. Nossa especialidade é exatamente resolver isso para [[TIPO_NEGÓCIO]]. Vale 30 min para eu te mostrar como [[CASE_SIMILAR]] resolveu igual?`
    ]
  }
};

// ================== PROVA SOCIAL ESTRUTURADA ==================

/**
 * Cases locais com números específicos e autoridade
 */
export const SOCIAL_PROOF = {
  structure: 'Negócio similar + Local + Problema específico + Resultado numérico + Tempo',

  local_cases: {
    RESTAURANTE: [
      `Pizzaria do Alecrim saiu de 30% pra 85% ocupação nas terças usando ofertas exclusivas no WhatsApp — em 3 semanas`,
      `Restaurante de Ponta Negra aumentou 180% os pedidos de delivery automatizando o atendimento — em 45 dias`,
      `Lanchonete do Tirol reduziu 70% dos pedidos perdidos com resposta automática em 15 segundos — implementado em 1 semana`
    ],

    ODONTOLOGIA: [
      `Clínica na Zona Norte aumentou 60% as consultas de estética saindo da dependência total de convênio — em 2 meses`,
      `Dr. [[NOME]] no Tirol preencheu a agenda ociosa com +12 consultas particulares/mês via WhatsApp — em 6 semanas`,
      `Consultório em Candelária reduziu 80% dos no-shows com lembretes automáticos personalizados — em 3 semanas`
    ],

    ADVOCACIA: [
      `Escritório na Ribeira melhorou 70% a qualidade dos leads com triagem ética automatizada — em 1 mês`,
      `Dr. [[NOME]] especialista em trabalhista aumentou 40% a conversão qualificando casos antes da consulta — em 30 dias`,
      `Advogado em Petrópolis reduziu 85% dos casos "sem perfil" com 3 perguntas no WhatsApp — implementado em 1 semana`
    ],

    PET_CLINICA: [
      `Clínica veterinária em Capim Macio aumentou 35% os atendimentos noturnos com botão WhatsApp 24h — em 2 semanas`,
      `Pet shop no Tirol criou um clube mensal que gera R$ 15mil extra com automação de recompra — em 45 dias`,
      `Veterinária em Ponta Negra reduziu 50% as ligações perdidas no plantão com resposta automática — em 1 semana`
    ],

    ACADEMIA: [
      `Academia em Candelária reduziu churn de 65% pra 25% com engajamento automático via WhatsApp — em 2 meses`,
      `Crossfit no Alecrim aumentou 40% a retenção com lembretes motivacionais personalizados — em 6 semanas`,
      `Academia em Lagoa Nova lotou turmas de horário vago com ofertas exclusivas por WhatsApp — em 3 semanas`
    ]
  },

  authority_signals: [
    `+200 empresas em Natal já usam nosso sistema`,
    `98% de satisfação dos clientes em 2024`,
    `ROI médio de 380% nos primeiros 60 dias`,
    `Certificados pela ABEMD em Marketing Digital`,
    `Especialistas há 5 anos em automação para PMEs`
  ]
};

// ================== CTAS COM DEFAULT INTELIGENTE ==================

/**
 * Arquitetura de escolha com defaults que aumentam adesão
 */
export const INTELLIGENT_CTAS = {
  meeting_scheduling: {
    two_options: [
      `Vale conversarmos amanhã 10h30 ou você prefere 15h?`,
      `Consigo te mostrar terça 14h ou quarta 16h funciona melhor?`,
      `Próxima semana segunda 9h ou terça 11h — qual encaixa?`
    ],

    default_bias: [
      `Já deixei 30 min reservado amanhã 14h30 — confirma ou prefere outro horário?`,
      `Tenho um slot livre terça 10h — serve ou precisa ajustar?`,
      `Bloqueei quarta 15h30 para nossa conversa — ok ou você tem preferência?`
    ],

    urgency_default: [
      `Posso te mostrar ainda hoje 16h30 ou deixa para amanhã 9h?`,
      `Consigo encaixar agora 15h ou prefere primeira coisa amanhã 8h30?`
    ]
  },

  demo_requests: [
    `Quer ver funcionando agora em 10 min ou prefere que eu grave um vídeo personalizado?`,
    `Mostro na tela o caso do [[SETOR]] agora ou você prefere receber o material por WhatsApp?`
  ],

  pilot_offers: [
    `Começamos o teste de 14 dias já na próxima segunda ou você prefere iniciar só depois do [[EVENTO]]?`,
    `Rodo o piloto focado em [[MÉTRICA]] ou você quer testar primeiro só o [[PROCESSO_ESPECÍFICO]]?`
  ]
};

// ================== LINGUAGEM DE CERTEZA ==================

/**
 * Reduzir ambiguidade para acelerar decisões
 */
export const CERTAINTY_LANGUAGE = {
  replace_weak_words: {
    // Substituições para aumentar certeza
    'talvez': 'quando implementar',
    'pode ser que': 'vai conseguir',
    'acredito que': 'baseado nos dados',
    'provavelmente': 'o resultado típico é',
    'deve dar certo': 'funciona em [[PERCENTUAL]]% dos casos',
    'se tudo der certo': 'seguindo o processo'
  },

  specific_outcomes: [
    `Em 30 dias você vai ter [[NÚMERO]] [[MÉTRICA]] a mais`,
    `Até o final do mês, [[PROCESSO]] estará 100% automatizado`,
    `Na primeira semana você já vê [[RESULTADO_IMEDIATO]]`,
    `O ROI aparece no segundo mês com [[VALOR_ESPECÍFICO]]`
  ],

  concrete_next_steps: [
    `Próximo passo: 30 min para mapear seu cenário específico`,
    `O que eu preciso: 3 perguntas sobre [[ÁREA]] para dimensionar o resultado`,
    `Como seguimos: te mando o checklist hoje e implementamos na segunda`,
    `Cronograma: 1 semana para setup + 2 semanas de teste + decisão`
  ],

  proof_points: [
    `Baseado em 200+ implementações em Natal`,
    `Dados de 2024: ROI médio de 380% em 60 dias`,
    `Track record: 98% dos clientes renovam no primeiro ano`,
    `Garantia: se não pagar o custo em 90 dias, paramos`
  ]
};

// ================== FRAMEWORK INTEGRADO ==================

/**
 * Combina todos os elementos para máxima persuasão
 */
export function buildPersuasiveMessage(archetype, sector, context) {
  const opener = PERMISSION_OPENERS.BY_SECTOR[sector];
  const because = BECAUSE_FRAMEWORK.by_archetype[archetype];
  const social = SOCIAL_PROOF.local_cases[sector]?.[0];
  const cta = INTELLIGENT_CTAS.meeting_scheduling.two_options[0];

  return {
    opener: replaceTokens(opener, context),
    justification: replaceTokens(because, context),
    proof: social,
    cta: replaceTokens(cta, context),
    questions: OARS_QUESTIONS.discovery.open_questions.slice(0, 2)
  };
}

/**
 * Substitui tokens em templates
 */
function replaceTokens(template, tokens) {
  if (!template) return '';
  
  let result = template;
  Object.keys(tokens || {}).forEach(key => {
    const regex = new RegExp(`\\[\\[${key}\\]\\]`, 'g');
    result = result.replace(regex, tokens[key]);
  });
  
  return result;
}

// ================== EXPORTS ==================

export default {
  PERMISSION_OPENERS,
  BECAUSE_FRAMEWORK,
  OARS_QUESTIONS,
  SOCIAL_PROOF,
  INTELLIGENT_CTAS,
  CERTAINTY_LANGUAGE,
  buildPersuasiveMessage
};
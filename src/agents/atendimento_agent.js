// agents/atendimento_agent.js
//  ATENDIMENTO AGENT - FAQ, Objeções, Preços e Dúvidas
//  v4.0 - SOLAR REBRAND - Canal Digital de Orçamento para Integradoras

/**
 * AtendimentoAgent - Agente de Atendimento e Suporte à Venda
 *
 * RESPONSABILIDADES:
 * 1. Responder perguntas sobre o serviço (Canal Digital)
 * 2. Explicar o que está incluso no Diagnóstico
 * 3. Tratar objeções de vendas (específicas de solar)
 * 4. Comparar com agências de tráfego/marketing
 * 5. Esclarecer dúvidas sobre o canal digital
 *
 * PRINCÍPIOS:
 * - Sempre responde a pergunta PRIMEIRO
 * - Depois tenta reconectar com qualificação
 * - Não ignora o que o lead perguntou
 * - NUNCA promete ranking ou quantidade de leads
 * - Usa arquétipo para adaptar tom
 *
 * @version 4.0.0 - SOLAR REBRAND
 */

import { getIntelligenceOrchestrator } from '../intelligence/IntelligenceOrchestrator.js';
import { INTENT_TYPES, AGENT_MODES } from '../core/IntentRouter.js';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Knowledge Base de FAQ e Respostas
//  v4.0 - Contexto Solar: Canal Digital de Orçamento para Integradoras
const KNOWLEDGE_BASE = {
  // Sobre o serviço
  produto: {
    descricao: `A Digital Boost cria canais digitais de orçamento para integradoras de energia solar.

Não vendemos tráfego pago nem gestão de redes sociais - criamos o caminho digital que transforma visitante em pedido de orçamento.

O que entregamos:
• Site/Landing Page focada em captação de orçamentos
• SEO local básico (aparecer no Google da região)
• Páginas por cidade/serviço atendido
• Integração WhatsApp + Formulário
• Prova social (fotos, avaliações, certificações)
• Tracking básico (Pixel Meta + GA4)`,

    diferenciais: `O que nos diferencia:
• Especialistas em integradoras de energia solar
• Foco em conversão (orçamento), não em curtidas
• Entendemos o ciclo de venda solar
• Honestidade: não prometemos ranking nem quantidade de leads
• Parceria genuína: crescemos junto com vocês`
  },

  // Modelo de trabalho (SOLAR v4.0)
  modelo: {
    diagnostico: {
      nome: 'Diagnóstico do Canal Digital',
      investimento: 'Gratuito',
      duracao: '20-30 minutos',
      descricao: 'Call para analisar o que vocês têm hoje e propor o que faz sentido implementar',
      entregaveis: [
        'Análise da presença digital atual',
        'Identificação de gaps no caminho do orçamento',
        'Proposta de estrutura do canal digital',
        'Escopo e investimento personalizado'
      ]
    },
    implementacao: {
      nome: 'Implementação do Canal',
      investimento: 'Personalizado (discutido no diagnóstico)',
      descricao: 'Criação completa do canal digital de orçamentos',
      entregaveis: [
        'Landing page focada em conversão',
        'Páginas SEO por região',
        'Formulário + WhatsApp integrados',
        'Tracking configurado'
      ]
    }
  },

  // Objeções comuns SOLAR e respostas
  objecoes: {
    // "Já tenho Instagram"
    ja_tenho_instagram: {
      resposta: `Faz sentido! Instagram é bom pra visibilidade.

A diferença é que no Instagram você depende do algoritmo e das pessoas navegando. No Google, quem busca "energia solar Natal" já está querendo contratar.

São canais complementares: Instagram pra marca, site pra captação direta.`,
      followUp: 'Hoje vocês recebem orçamentos pelo Instagram ou mais por indicação?'
    },

    // "Já tive site e não funcionou"
    site_nao_funcionou: {
      resposta: `Acontece muito! A maioria dos sites de integradora é institucional - bonito, mas não foi feito pra gerar orçamento.

O que a gente faz é diferente: landing page com 1 objetivo só (pedido de orçamento), otimizada pra aparecer no Google da região.

Não é site vitrine, é canal de captação.`,
      followUp: 'O site anterior era mais institucional ou tinha foco em conversão?'
    },

    // "Não tenho tempo"
    sem_tempo: {
      resposta: `Entendo - instalador tem que estar na obra, não cuidando de site.

Por isso a gente cuida de tudo: criação, SEO, manutenção. Vocês só respondem os orçamentos que chegam.

É justamente pra liberar vocês pra focar no que importa: instalação.`,
      followUp: 'Quando chega um orçamento hoje, quem da equipe responde?'
    },

    // "Tá caro" / "Não tenho budget"
    caro: {
      resposta: `Entendo a preocupação com investimento.

Deixa eu perguntar: quanto custa um projeto médio de vocês?

Se um site bem feito trouxer 1 projeto a mais por mês, ele se paga várias vezes.

Mas primeiro vamos fazer o diagnóstico gratuito pra ver se faz sentido.`,
      followUp: 'Qual o ticket médio de um projeto de vocês?'
    },

    // "Vou pensar"
    pensar: {
      resposta: `Claro, decisão importante merece reflexão!

Me ajuda a entender: o que você precisa avaliar melhor?

• O que está incluso? Posso detalhar
• Investimento? Discutimos no diagnóstico
• Momento? Lembra que verão é época boa de venda

Qual desses pontos pesa mais?`,
      followUp: null
    },

    // "Já tenho agência"
    ja_tenho_agencia: {
      resposta: `Legal! O que a agência faz pra vocês?

Geralmente agência cuida de tráfego pago e redes sociais.

A gente faz diferente: criamos o canal de captação (site + SEO) que funciona mesmo sem ads.

São coisas complementares na verdade.`,
      followUp: 'A agência atual cuida de tráfego pago ou também do site?'
    },

    // "Não preciso"
    nao_preciso: {
      resposta: `Entendi. Me conta: como estão as indicações ultimamente?

Pergunto porque a maioria das integradoras depende muito de indicação. Quando ela cai, a demanda some.

Canal digital é justamente pra ter um fluxo mais constante, não depender só de boca a boca.`,
      followUp: 'Tem mês que sobra procura e mês que falta?'
    }
  },

  // Serviços específicos (SOLAR)
  servicos: {
    landing_page: 'Criamos landing page focada em 1 objetivo: pedido de orçamento. Design profissional, chamada pra ação clara, formulário otimizado.',
    seo_local: 'Páginas otimizadas pra aparecer no Google quando alguém busca "energia solar + sua cidade". SEO local básico, não campanha completa.',
    integracao_whatsapp: 'Botão WhatsApp estratégico + formulário de orçamento. Lead clica e já cai no WhatsApp da equipe ou no formulário.',
    prova_social: 'Seção com fotos de obras realizadas, avaliações de clientes, certificações e parcerias. Gera confiança.',
    tracking: 'Pixel do Meta + Google Analytics configurados. Vocês vão saber quantos orçamentos vieram do site.',
    google_perfil: 'Configuração ou otimização do Google Perfil da Empresa (antigo Google Meu Negócio). Aparecer no Maps.'
  },

  // GUARDRAILS DE HONESTIDADE
  honestidade: {
    ranking: 'Não prometemos posição no Google. SEO leva tempo e depende de muitos fatores.',
    leads: 'Não garantimos quantidade de leads. O que garantimos é um canal estruturado que facilita o cliente te encontrar.',
    resultado: 'Resultado depende de vários fatores além do site: preço, atendimento, região, concorrência.'
  }
};

export class AtendimentoAgent {
  constructor() {
    this.hub = null;
    this.name = 'atendimento';
    this.intelligence = getIntelligenceOrchestrator();
  }

  /**
   * Processa mensagem de atendimento
   * @param {Object} message - Mensagem do lead
   * @param {Object} context - Contexto da conversa
   * @returns {Object} Resultado do processamento
   */
  async process(message, context) {
    const { text, fromContact } = message;
    const { leadState, intentResult } = context;

    console.log(`\n [ATENDIMENTO] Processando: "${text.substring(0, 50)}..."`);
    console.log(` [ATENDIMENTO] Intenção: ${intentResult?.intent || 'não classificada'}`);

    try {
      // Detectar arquétipo para adaptar tom
      const archetypeAnalysis = await this.intelligence.detectArchetype(fromContact, {
        message: text,
        leadProfile: leadState.companyProfile,
        currentStage: 'atendimento'
      });

      console.log(` [ATENDIMENTO] Arquétipo: ${archetypeAnalysis.archetype}`);

      // Processar baseado na intenção
      let response;

      switch (intentResult?.intent) {
        case INTENT_TYPES.PRICING_QUESTION:
          response = await this._handlePricingQuestion(text, leadState, archetypeAnalysis);
          break;

        case INTENT_TYPES.OBJECTION:
          response = await this._handleObjection(text, leadState, archetypeAnalysis);
          break;

        case INTENT_TYPES.FAQ_QUESTION:
          response = await this._handleFAQ(text, leadState, archetypeAnalysis);
          break;

        case INTENT_TYPES.FEATURE_QUESTION:
          response = await this._handleFeatureQuestion(text, leadState, archetypeAnalysis);
          break;

        case INTENT_TYPES.COMPARISON:
          response = await this._handleComparison(text, leadState, archetypeAnalysis);
          break;

        default:
          response = await this._handleGenericQuestion(text, leadState, archetypeAnalysis);
      }

      // Registrar interação para aprendizado
      this.intelligence.recordInteraction(fromContact, text, response.message)
        .catch(err => console.error(' [ATENDIMENTO] Erro ao registrar:', err.message));

      // Calcular lead score
      await this.intelligence.recordLeadActivity(
        fromContact,
        intentResult?.intent || 'question',
        text,
        this._getActivityPoints(intentResult?.intent)
      );

      return {
        message: response.message,
        shouldReturn: response.shouldReturn || false,
        returnTo: response.returnTo || AGENT_MODES.SDR,
        updateState: {
          lastAtendimentoTopic: intentResult?.intent,
          archetype: archetypeAnalysis.archetype
        },
        metadata: {
          intent: intentResult?.intent,
          archetype: archetypeAnalysis.archetype,
          topic: response.topic
        }
      };

    } catch (error) {
      console.error(' [ATENDIMENTO] Erro:', error.message);
      return {
        message: 'Desculpe, tive um problema. Pode repetir sua pergunta?',
        shouldReturn: false
      };
    }
  }

  /**
   * Trata perguntas sobre preço/investimento
   *  v4.0 - SOLAR: Canal Digital (sem planos fixos)
   */
  async _handlePricingQuestion(text, leadState, archetype) {
    console.log(` [ATENDIMENTO] Tratando pergunta de preço`);

    const modelo = KNOWLEDGE_BASE.modelo;

    const message = `Boa pergunta! O investimento depende do escopo do canal digital - cada integradora tem uma necessidade diferente.

Como funciona:

 **${modelo.diagnostico.nome}** - ${modelo.diagnostico.investimento}
${modelo.diagnostico.descricao}

O que analisamos no diagnóstico:
${modelo.diagnostico.entregaveis.map(e => `• ${e}`).join('\n')}

Depois do diagnóstico, apresentamos uma proposta com escopo e investimento personalizados.

${KNOWLEDGE_BASE.honestidade.resultado}

Quer agendar o diagnóstico gratuito?`;

    return {
      message,
      topic: 'pricing',
      shouldReturn: true,
      returnTo: AGENT_MODES.SDR
    };
  }

  /**
   * Trata objeções
   *  v4.0 - SOLAR: Objeções específicas de integradoras
   */
  async _handleObjection(text, leadState, archetype) {
    console.log(` [ATENDIMENTO] Tratando objeção`);

    const textLower = text.toLowerCase();

    // Identificar tipo de objeção (SOLAR v4.0)
    let objectionType = 'pensar'; // default

    if (/caro|preço|valor|custa muito|investimento alto|não tenho (dinheiro|budget|grana)/.test(textLower)) {
      objectionType = 'caro';
    } else if (/já tenho instagram|só uso instagram|instagram (funciona|resolve)/.test(textLower)) {
      objectionType = 'ja_tenho_instagram';
    } else if (/já tive site|site (não funcionou|não deu|não trouxe)/.test(textLower)) {
      objectionType = 'site_nao_funcionou';
    } else if (/não tenho tempo|sem tempo|muito ocupado|na obra/.test(textLower)) {
      objectionType = 'sem_tempo';
    } else if (/já tenho (agência|agencia)|minha agência|agência cuida/.test(textLower)) {
      objectionType = 'ja_tenho_agencia';
    } else if (/pensar|avaliar|refletir|ver com calma/.test(textLower)) {
      objectionType = 'pensar';
    } else if (/não preciso|não quero|não me interessa|tá bom assim/.test(textLower)) {
      objectionType = 'nao_preciso';
    }

    const objection = KNOWLEDGE_BASE.objecoes[objectionType];

    if (!objection) {
      // Fallback para pensar se não encontrar
      const fallback = KNOWLEDGE_BASE.objecoes.pensar;
      return {
        message: fallback.resposta,
        topic: 'objection_generic',
        shouldReturn: true,
        returnTo: AGENT_MODES.SDR
      };
    }

    let message = objection.resposta;
    if (objection.followUp) {
      message += `\n\n${objection.followUp}`;
    }

    return {
      message,
      topic: `objection_${objectionType}`,
      shouldReturn: true,
      returnTo: AGENT_MODES.SDR
    };
  }

  /**
   * Trata perguntas FAQ
   *  v4.0 - SOLAR: FAQ sobre canal digital
   */
  async _handleFAQ(text, leadState, archetype) {
    console.log(` [ATENDIMENTO] Tratando FAQ`);

    const textLower = text.toLowerCase();

    // Identificar tema da pergunta (SOLAR)
    if (/como funciona|o que (é|faz|vocês fazem)|me (explica|conta)/.test(textLower)) {
      return {
        message: `${KNOWLEDGE_BASE.produto.descricao}\n\n${KNOWLEDGE_BASE.produto.diferenciais}\n\nQuer que eu detalhe algum serviço específico?`,
        topic: 'faq_produto',
        shouldReturn: true,
        returnTo: AGENT_MODES.SDR
      };
    }

    // Pergunta sobre garantia/resultado
    if (/garant|resultado|funciona mesmo|dá resultado|quantos leads/.test(textLower)) {
      return {
        message: `Vou ser honesto com você:

${KNOWLEDGE_BASE.honestidade.leads}

${KNOWLEDGE_BASE.honestidade.ranking}

O que eu posso garantir: um canal digital bem estruturado, focado em conversão, otimizado pra sua região.

O resto depende de muitos fatores: preço competitivo, atendimento rápido, qualidade do serviço.

Faz sentido?`,
        topic: 'faq_garantia',
        shouldReturn: true,
        returnTo: AGENT_MODES.SDR
      };
    }

    // Pergunta genérica - usar GPT para responder
    const gptResponse = await this._generateFAQResponse(text, leadState);

    return {
      message: gptResponse,
      topic: 'faq_generic',
      shouldReturn: true,
      returnTo: AGENT_MODES.SDR
    };
  }

  /**
   * Trata perguntas sobre serviços/funcionalidades
   *  v4.0 - SOLAR: Serviços de canal digital
   */
  async _handleFeatureQuestion(text, leadState, archetype) {
    console.log(` [ATENDIMENTO] Tratando pergunta de serviço`);

    const textLower = text.toLowerCase();

    // Keywords SOLAR para cada serviço
    const keywords = {
      landing_page: ['landing', 'página', 'site', 'layout', 'design'],
      seo_local: ['seo', 'google', 'aparecer', 'busca', 'pesquisa', 'ranquear', 'ranking'],
      integracao_whatsapp: ['whatsapp', 'zap', 'formulário', 'form', 'botão'],
      prova_social: ['foto', 'avaliação', 'depoimento', 'testemunho', 'prova'],
      tracking: ['pixel', 'analytics', 'rastrear', 'medir', 'tracking'],
      google_perfil: ['maps', 'meu negócio', 'perfil', 'google perfil', 'localização']
    };

    // Verificar serviços conhecidos
    for (const [key, keywordList] of Object.entries(keywords)) {
      if (keywordList.some(kw => textLower.includes(kw))) {
        const response = KNOWLEDGE_BASE.servicos[key];
        if (response) {
          return {
            message: `${response}\n\nTem mais alguma dúvida sobre o canal digital?`,
            topic: `servico_${key}`,
            shouldReturn: true,
            returnTo: AGENT_MODES.SDR
          };
        }
      }
    }

    // Serviço não mapeado - usar GPT
    const gptResponse = await this._generateFeatureResponse(text, leadState);

    return {
      message: gptResponse,
      topic: 'servico_generic',
      shouldReturn: true,
      returnTo: AGENT_MODES.SDR
    };
  }

  /**
   * Trata comparações com concorrentes
   *  v4.0 - SOLAR: Comparação com agências de tráfego/marketing
   */
  async _handleComparison(text, leadState, archetype) {
    console.log(` [ATENDIMENTO] Tratando comparação`);

    const message = `Boa pergunta! Deixa eu explicar a diferença:

**Agência de Tráfego Pago:**
• Foco: rodar anúncios (Meta Ads, Google Ads)
• Custo: taxa mensal + budget de mídia
• Resultado: enquanto pagar, aparece

**Agência de Redes Sociais:**
• Foco: posts, engajamento, seguidores
• Custo: taxa mensal
• Resultado: visibilidade, não necessariamente orçamentos

**Digital Boost (o que fazemos):**
• Foco: criar o CANAL de captação (site + SEO)
• Custo: projeto único + manutenção
• Resultado: estrutura que funciona mesmo sem ads

São coisas complementares. A gente cria o destino (site que converte), a agência de tráfego traz visitantes pagos.

Mas com SEO local bem feito, você capta orçamentos organicamente, sem depender 100% de anúncio.

Qual é a sua situação hoje?`;

    return {
      message,
      topic: 'comparison',
      shouldReturn: true,
      returnTo: AGENT_MODES.SDR
    };
  }

  /**
   * Trata perguntas genéricas
   */
  async _handleGenericQuestion(text, leadState, archetype) {
    console.log(` [ATENDIMENTO] Tratando pergunta genérica`);

    const gptResponse = await this._generateGenericResponse(text, leadState);

    return {
      message: gptResponse,
      topic: 'generic',
      shouldReturn: true,
      returnTo: AGENT_MODES.SDR
    };
  }

  /**
   * Gera resposta FAQ com GPT
   *  v4.0 - SOLAR: Canal Digital para Integradoras
   */
  async _generateFAQResponse(question, leadState) {
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Você é a Leadly, assistente de vendas da Digital Boost.
A Digital Boost cria canais digitais de orçamento para integradoras de energia solar.

SERVIÇOS: ${KNOWLEDGE_BASE.produto.descricao}

GUARDRAILS DE HONESTIDADE:
- ${KNOWLEDGE_BASE.honestidade.ranking}
- ${KNOWLEDGE_BASE.honestidade.leads}

REGRAS:
- Seja direto e objetivo
- Máximo 4 sentenças
- NUNCA prometa ranking no Google ou quantidade de leads
- Termine convidando para diagnóstico ou oferecendo mais informações
- Tom: profissional mas acessível`
          },
          { role: 'user', content: question }
        ],
        temperature: 0.7,
        max_tokens: 200
      });

      return completion.choices[0].message.content;

    } catch (error) {
      return 'Boa pergunta! A Digital Boost cria canais digitais de orçamento para integradoras de energia solar - site focado em conversão, SEO local e integração com WhatsApp. Quer saber mais sobre algum serviço específico?';
    }
  }

  /**
   * Gera resposta de feature/serviço com GPT
   *  v4.0 - SOLAR: Serviços de canal digital
   */
  async _generateFeatureResponse(question, leadState) {
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Você é a Leadly, assistente de vendas da Digital Boost.
A Digital Boost cria canais digitais de orçamento para integradoras de energia solar.

SERVIÇOS QUE OFERECEMOS:
- Site/Landing Page focada em captação de orçamentos
- SEO local básico (aparecer no Google da região)
- Páginas por cidade/serviço atendido
- Integração WhatsApp + Formulário
- Prova social (fotos, avaliações)
- Tracking básico (Pixel + GA4)
- Google Perfil da Empresa

O QUE NÃO FAZEMOS:
- Tráfego pago / anúncios
- Gestão de redes sociais
- Criação de conteúdo

REGRAS:
- Se o serviço está no nosso escopo, confirme
- Se não está, explique que focamos em canal de captação
- NUNCA prometa ranking ou quantidade de leads
- Máximo 3 sentenças
- Pergunte se tem mais dúvidas`
          },
          { role: 'user', content: question }
        ],
        temperature: 0.7,
        max_tokens: 150
      });

      return completion.choices[0].message.content;

    } catch (error) {
      return 'Boa pergunta! A gente foca em criar o canal digital de captação: site, SEO local e integração com WhatsApp. Pode me contar mais sobre o que você precisa?';
    }
  }

  /**
   * Gera resposta genérica com GPT
   *  v4.0 - SOLAR: Canal Digital para Integradoras
   */
  async _generateGenericResponse(question, leadState) {
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Você é a Leadly, assistente de vendas consultiva da Digital Boost.
A Digital Boost cria canais digitais de orçamento para integradoras de energia solar.

CONTEXTO DO LEAD:
- Nome: ${leadState.companyProfile?.nome || 'Não informado'}
- Empresa: ${leadState.companyProfile?.empresa || 'Não informada'}
- Setor: ${leadState.companyProfile?.setor || 'energia_solar'}

NOSSO FOCO:
- Criar canal digital de captação de orçamentos
- Site/landing page focada em conversão
- SEO local básico
- Integração WhatsApp

REGRAS:
- Responda a pergunta
- Se for sobre energia solar/técnico, diga que nosso foco é o canal digital, não a parte técnica
- NUNCA prometa ranking ou quantidade de leads
- Seja útil mesmo se não souber
- Máximo 3 sentenças
- Tente reconectar com diagnóstico se fizer sentido`
          },
          { role: 'user', content: question }
        ],
        temperature: 0.7,
        max_tokens: 150
      });

      return completion.choices[0].message.content;

    } catch (error) {
      return 'Entendi sua pergunta! Me conta mais sobre o que você precisa que eu tento te ajudar melhor.';
    }
  }

  /**
   * Calcula pontos por tipo de atividade
   */
  _getActivityPoints(intent) {
    const points = {
      [INTENT_TYPES.PRICING_QUESTION]: 5,  // Perguntou preço = interesse alto
      [INTENT_TYPES.FEATURE_QUESTION]: 3,  // Quer detalhes = interesse médio
      [INTENT_TYPES.FAQ_QUESTION]: 2,      // Curiosidade
      [INTENT_TYPES.COMPARISON]: 4,        // Comparando = considerando
      [INTENT_TYPES.OBJECTION]: 1          // Objeção = ainda não convencido
    };

    return points[intent] || 1;
  }
}

export default AtendimentoAgent;

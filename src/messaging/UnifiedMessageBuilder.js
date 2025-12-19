/**
 *  UNIFIED MESSAGE BUILDER - SISTEMA UNIFICADO DE MENSAGENS
 *
 *  ÚNICA FONTE DE VERDADE para todas as primeiras mensagens da LEADLY
 *  v6.0 - GENÉRICO: Vende sites para empresas de qualquer setor
 *
 * FILOSOFIA:
 * - Agente é VENDEDOR QUALIFICADOR, não apenas coletor de informações
 * - Gancho principal: INVISIBILIDADE DIGITAL (não aparecer no Google)
 * - Apresenta solução ENQUANTO qualifica
 * - Mensagens com PARÁGRAFOS para melhor leitura
 *
 * Usado por:
 * - sdr_agent.js (primeiro contato via WhatsApp)
 * - campaign_manager.js (campanhas de cold outreach)
 * - conversation_manager.js (detecção de novo contato)
 *
 * @version 6.0.0 - GENÉRICO (todos os setores)
 * @date 2025-12-09
 */

// ═══════════════════════════════════════════════════════════════════════════
//  BRANDING - GENÉRICO v6.0
// ═══════════════════════════════════════════════════════════════════════════

const BRAND = {
  name: 'Digital Boost',
  agentName: 'Agente Inteligente',
  proofLine: 'top 5 no programa Startup Nordeste do Sebrae',
  offering: 'sites profissionais que geram clientes pelo Google',
  shortOffering: 'site profissional focado em captar clientes',
  targetAudience: 'empresas de qualquer setor',
  valueProposition: 'colocar sua empresa visível no Google para quem busca seus serviços'
};

const OPT_OUT = {
  message: '(Se não quiser continuar, é só me avisar que paro na hora)',
  messageShort: '(Se não fizer sentido, tudo certo também)'
};

// ═══════════════════════════════════════════════════════════════════════════
//  DETECÇÃO DE CONTEXTO GENÉRICO v6.0
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Detecta setor do lead baseado em texto (genérico)
 * @param {string} text - Nome da empresa ou setor
 * @returns {Object} Informações do contexto
 */
export function detectSolarContext(text) {
  // Mantém compatibilidade com código antigo
  // Agora detecta qualquer setor
  if (!text) {
    return { isSolar: false, context: 'generic', sector: 'nao_identificado' };
  }

  const textLower = text.toLowerCase();

  // Detectar setores comuns
  const sectors = {
    'advocacia': ['advogad', 'escritorio', 'juridic', 'direito'],
    'contabilidade': ['contabil', 'contador', 'contadoria'],
    'saude': ['clinica', 'medic', 'odonto', 'dentista', 'fisio', 'nutri', 'psico'],
    'construcao': ['construt', 'empreiteira', 'engenharia', 'arquitetur'],
    'comercio': ['loja', 'comercio', 'varejo', 'atacado'],
    'servicos': ['servico', 'consultoria', 'agencia'],
    'alimentacao': ['restaurante', 'lanchonete', 'pizzaria', 'padaria', 'cafe'],
    'beleza': ['salao', 'barbearia', 'estetica', 'spa'],
    'educacao': ['escola', 'curso', 'ensino', 'treinamento'],
    'tecnologia': ['tech', 'software', 'desenvolvimento', 'ti ', 'informatica']
  };

  for (const [sector, keywords] of Object.entries(sectors)) {
    for (const keyword of keywords) {
      if (textLower.includes(keyword)) {
        return {
          isSolar: false,
          context: 'sector_detected',
          sector: sector,
          detectedKeyword: keyword
        };
      }
    }
  }

  return {
    isSolar: false,
    context: 'generic',
    sector: 'nao_identificado'
  };
}

// Alias para compatibilidade
export function detectSector(text) {
  const context = detectSolarContext(text);
  return {
    detected: true,
    key: context.sector || 'generico',
    category: 'Empresa',
    painType: 'captacao_digital',
    characteristics: [
      'Dependência de indicação',
      'Instagram sem conversão',
      'Demanda irregular',
      'Sem site ou site institucional'
    ],
    digitalMaturity: 'Baixa-Média',
    avgTicket: 'Variável'
  };
}

// ═══════════════════════════════════════════════════════════════════════════
//  CONSTRUTOR DE MENSAGEM - VENDEDOR QUALIFICADOR v5.0
// ═══════════════════════════════════════════════════════════════════════════

/**
 *  CONSTRUTOR PRINCIPAL - VENDEDOR QUALIFICADOR
 *
 * Estratégia: Gancho da invisibilidade digital
 * - Menciona que pesquisou e não encontrou canal de orçamento
 * - Pergunta se é estratégia ou falta de estrutura
 * - Apresenta solução de forma consultiva
 *
 * @param {string} contactName - Nome do contato
 * @param {Object} options - Opções adicionais
 * @param {string} options.companyName - Nome da empresa
 * @param {string} options.city - Cidade do lead
 * @param {string} options.source - Fonte do lead (campaign, inbound, etc)
 * @param {number} options.dayOfCadence - Dia da cadência (1-15)
 * @returns {string} Mensagem formatada pronta para envio
 */
export function buildUnifiedFirstMessage(contactName, options = {}) {
  const { companyName, city, source, dayOfCadence } = options;

  const name = contactName || '';
  const empresa = companyName || 'sua empresa';
  const cidade = city || 'sua região';

  console.log(` [MSG-BUILDER] Construindo mensagem VENDEDOR para: "${name}" | Empresa: ${empresa} | Cidade: ${cidade}`);
  console.log(` [MSG-BUILDER] Fonte: ${source || 'direct'} | Dia da cadência: ${dayOfCadence || 1}`);

  // Selecionar mensagem baseada no dia da cadência ou fonte
  if (dayOfCadence === 2) {
    return buildDay2BumpMessage(name, empresa, cidade);
  }

  if (dayOfCadence === 5) {
    return buildDay5FollowUpMessage(name, empresa, cidade);
  }

  if (dayOfCadence === 6) {
    return buildDay6RuptureMessage(name, empresa, cidade);
  }

  if (dayOfCadence === 10) {
    return buildDay10CaseMessage(name, empresa, cidade);
  }

  if (dayOfCadence === 12) {
    return buildDay12BreakUpMessage(name, empresa, cidade);
  }

  if (source === 'campaign' || source === 'outbound') {
    return buildCampaignMessage(name, empresa, cidade);
  }

  if (source === 'inbound') {
    return buildInboundMessage(name, empresa, cidade);
  }

  // Default: Dia 1 - Quebra-gelo sobre invisibilidade digital
  return buildDay1Message(name, empresa, cidade);
}

// ═══════════════════════════════════════════════════════════════════════════
//  MENSAGENS POR DIA DA CADÊNCIA
// ═══════════════════════════════════════════════════════════════════════════

/**
 * DIA 1 - Quebra-gelo sobre invisibilidade digital
 * Objetivo: Fazer o lead responder sem parecer pitch de venda
 */
function buildDay1Message(name, empresa, cidade) {
  const saudacao = name ? `Oi ${name}!` : 'Oi!';
  const empresaStr = empresa && empresa !== 'sua empresa' ? empresa : 'a empresa de vocês';

  return `${saudacao} Aqui é o ${BRAND.agentName} da Digital Boost - ${BRAND.proofLine}.

Eu tava pesquisando empresas do seu setor e não encontrei um site ou canal digital da ${empresaStr}.

Isso é uma estratégia de focar só no offline e indicação ou ainda não deu tempo de estruturar essa parte digital?

${OPT_OUT.message}`;
}

/**
 * DIA 1 - Versão alternativa (Concorrência no Google)
 */
function buildDay1AlternativeMessage(name, empresa, cidade) {
  const saudacao = name ? `Fala ${name}, tudo bem?` : 'Fala, tudo bem?';
  const empresaStr = empresa && empresa !== 'sua empresa' ? empresa : 'a empresa de vocês';

  return `${saudacao}

Tô fazendo um mapeamento de empresas do seu setor e, quando busco pelos serviços de vocês no Google, aparecem alguns concorrentes, mas ${empresaStr} não fica em destaque.

Isso é uma estratégia de focar só no offline e indicação ou ainda não deu tempo de estruturar essa parte digital?

${OPT_OUT.message}`;
}

/**
 * DIA 2 - Bump para quem não respondeu
 * Objetivo: Reativar sem parecer spam
 */
function buildDay2BumpMessage(name, empresa, cidade) {
  const saudacao = name ? `Oi ${name}, tudo bem?` : 'Oi, tudo bem?';

  return `${saudacao}

Passei aqui só pra confirmar se você chegou a ver minha mensagem de ontem sobre o site da empresa de vocês.

Fiquei realmente em dúvida sobre como um cliente novo encontra vocês quando busca os serviços de vocês no Google.

${OPT_OUT.messageShort}`;
}

/**
 * DIA 5 - Follow-up de agendamento
 * Objetivo: Agendar horário específico
 */
function buildDay5FollowUpMessage(name, empresa, cidade) {
  const nomeStr = name || '';

  return `${nomeStr ? `${nomeStr}, ` : ''}pra te mostrar esse cenário com calma e te dar algo prático, o ideal é a gente falar uns 5 a 10 minutos.

Fica mais fácil eu compartilhar a tela e te mostrar o caminho que o cliente faz quando busca os serviços de vocês no Google.

Você prefere hoje às 15h ou amanhã às 10h?`;
}

/**
 * DIA 6 - Ruptura leve para quem nunca respondeu
 * Objetivo: Última tentativa inteligente
 */
function buildDay6RuptureMessage(name, empresa, cidade) {
  const saudacao = name ? `Oi ${name}, tudo bem?` : 'Oi, tudo bem?';

  return `${saudacao}

Fiz de novo aqui o teste de como um cliente te encontra quando busca os serviços de vocês no Google e a empresa de vocês continua pouco visível em comparação a outras empresas do setor.

Não quero ser chato, então prometo que é a última vez que toco nesse assunto.

Hoje quem não tem um canal digital claro acaba ficando de fora de muitos clientes que nem chegam a te conhecer.

Se em algum momento essa parte entrar no teu radar, posso te mostrar em 10 min o cenário da tua região e o que dá pra fazer.

${OPT_OUT.messageShort}`;
}

/**
 * DIA 10 - Puxando gancho do case
 * Objetivo: Gerar resposta usando case como ponto de partida
 */
function buildDay10CaseMessage(name, empresa, cidade) {
  const saudacao = name ? `Oi ${name}` : 'Oi';

  return `${saudacao}, mandei ontem um case rápido de uma empresa que dependia só de indicação e redes sociais e passou a receber clientes pelo Google depois de estruturar um site profissional.

Hoje vocês têm alguma meta de aumentar a quantidade de clientes fora da indicação ou isso ainda não entrou no plano de vocês?`;
}

/**
 * DIA 12 - Break-up amigável
 * Objetivo: Encerrar sem queimar ponte
 */
function buildDay12BreakUpMessage(name, empresa, cidade) {
  const nomeStr = name || '';

  return `${nomeStr ? `${nomeStr}, ` : ''}pra não ficar te incomodando, vou encerrar meus contatos por aqui.

Só deixo um alerta: quem não tem um site profissional acaba ficando de fora do jogo quando o cliente busca os serviços de vocês no Google e escolhe quem aparece primeiro.

Quando essa parte entrar no radar de vocês, posso te mostrar em 10 min o que dá pra fazer na prática.

Fica à vontade pra me chamar quando fizer sentido.`;
}

// ═══════════════════════════════════════════════════════════════════════════
//  MENSAGENS POR FONTE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Mensagem para campanhas outbound (cold)
 * Usa o script principal de invisibilidade digital
 */
function buildCampaignMessage(name, empresa, cidade) {
  // Para campanhas, usa o Dia 1 por padrão
  return buildDay1Message(name, empresa, cidade);
}

/**
 * Mensagem para leads inbound (já demonstraram interesse)
 */
function buildInboundMessage(name, empresa, cidade) {
  const saudacao = name ? `Oi ${name}!` : 'Oi!';

  return `${saudacao} Vi que você entrou em contato. Aqui é o ${BRAND.agentName}, da ${BRAND.name} - ${BRAND.proofLine}.

A gente ajuda empresas a ter um site profissional pra captar clientes - site que aparece no Google, integração com WhatsApp, esse tipo de coisa.

Hoje como os clientes novos chegam até vocês? Mais indicação ou procuram vocês direto no Google/Instagram?`;
}

// ═══════════════════════════════════════════════════════════════════════════
//  MENSAGENS DE TRIAGEM (Respostas do lead)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Gera resposta baseada no tipo de engajamento do lead
 * @param {string} engagementType - Tipo: 'curioso', 'cetico', 'hand_raiser', 'indicacao', 'instagram'
 * @param {string} name - Nome do lead
 * @param {string} empresa - Nome da empresa
 * @param {string} cidade - Cidade
 * @returns {string} Mensagem de follow-up
 */
export function buildTriageResponse(engagementType, name, empresa, cidade) {
  const nomeStr = name || '';

  switch (engagementType) {
    case 'curioso':
      // Lead perguntou "Do que se trata?" ou similar
      return `${nomeStr ? `${nomeStr}, ` : ''}a gente cria sites profissionais pra empresas que querem aparecer no Google.

Na prática: um site que aparece quando alguém busca pelos serviços de vocês, com formulário de contato e WhatsApp integrado.

A ideia é que vocês recebam clientes que ainda não conhecem a empresa, não só de indicação.

Vocês já pensaram em ter algo assim ou hoje tá funcionando bem só com indicação e Instagram?`;

    case 'cetico':
      // Lead disse "Não preciso" ou mostrou resistência
      return `Entendo perfeitamente${nomeStr ? `, ${nomeStr}` : ''}.

Só pra eu entender: hoje quando alguém que não conhece vocês busca os serviços de vocês no Google, como essa pessoa chega até a empresa?

Pergunto porque muita empresa depende 100% de indicação e, quando as indicações diminuem, a demanda cai junto.

Se no caso de vocês tá funcionando bem assim, ótimo! Só queria entender o cenário.`;

    case 'hand_raiser':
      // Lead disse "Estamos pensando em site" ou mostrou interesse claro
      return `Boa${nomeStr ? `, ${nomeStr}` : ''}!

Então faz sentido a gente conversar. Posso te mostrar em 10 minutos o cenário de busca na sua região e o que daria pra fazer pra empresa de vocês aparecer melhor.

Você prefere uma ligação rápida ou uma call com compartilhamento de tela pra eu te mostrar visualmente?`;

    case 'indicacao':
      // Lead disse "Hoje é mais indicação mesmo"
      return `Indicação é ótimo - cliente já vem confiando.

A questão é: quando a indicação tá baixa, como vocês fazem pra manter o fluxo de clientes?

Com um site profissional, você continua recebendo indicações E começa a captar quem busca os serviços de vocês no Google.

Faz sentido eu te mostrar como funciona isso na prática?`;

    case 'instagram':
      // Lead disse "Só Instagram" ou "Trabalhamos pelo Instagram"
      return `Instagram é ótimo pra mostrar o trabalho feito${nomeStr ? `, ${nomeStr}` : ''}.

Mas quem precisa de um serviço urgente geralmente busca no Google, não fica rolando feed. E o algoritmo decide quem vê seu conteúdo.

Com um site SEO, você aparece pra quem tá procurando ativamente pelos serviços de vocês - gente que já quer contratar.

Quer que eu te mostre como fica esse cenário de busca na prática?`;

    default:
      return `${nomeStr ? `${nomeStr}, ` : ''}me conta: hoje como os clientes novos chegam até vocês? Mais indicação, Instagram ou buscam vocês no Google?`;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  ANÁLISE DE EMPRESA PARA CAMPANHA (GENÉRICO v6.0)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Analisa perfil de empresa para campanha (GENÉRICO)
 */
export function analyzeCompanyProfile(lead) {
  const companyName = lead['Empresa'] || lead.name || lead.nome || 'Empresa';
  const segment = lead['Segmento'] || lead.setor || 'Não identificado';
  const region = lead['Região'] || lead.cidade || lead.regiao || '';

  console.log(` [ANALYSIS] Analisando: ${companyName} | Setor: ${segment} | Região: ${region}`);

  const analysis = {
    company: companyName,
    sector: segment,
    region: region,

    sectorAnalysis: {
      key: segment.toLowerCase().replace(/\s+/g, '_'),
      category: segment,
      painType: 'captacao_digital'
    },

    digitalProfile: analyzeDigitalPresence(lead),
    priorityScore: calculatePriorityScore(lead),
    bestTimeToContact: { start: '14:00', end: '17:00', days: ['Ter', 'Qua', 'Qui'] },
    recommendedTone: 'Consultivo e direto - vendedor qualificador',

    phone: lead['WhatsApp'] || lead.phone || lead.telefone || '',
    instagram: lead.instagram || '',
    website: lead.website || lead.site || ''
  };

  return analysis;
}

/**
 * Analisa presença digital do lead (GENÉRICO)
 */
function analyzeDigitalPresence(lead) {
  const hasWebsite = !!(lead.website || lead.site || lead['Site']);
  const hasInstagram = !!(lead.instagram || lead['Instagram']);
  const hasGoogleProfile = !!(lead.google_profile || lead['Google Perfil']);

  if (!hasWebsite && !hasInstagram) {
    return {
      profile: 'Sem presença digital',
      opportunity: 'Alta - invisível no digital',
      approach: 'Gancho: não encontrei site ou canal digital',
      hook: 'invisibilidade_total'
    };
  }

  if (!hasWebsite && hasInstagram) {
    return {
      profile: 'Só Instagram',
      opportunity: 'Alta - depende de algoritmo',
      approach: 'Gancho: Instagram é vitrine, Google é prateleira',
      hook: 'instagram_sem_site'
    };
  }

  if (hasWebsite && !hasInstagram) {
    return {
      profile: 'Tem site (verificar se converte)',
      opportunity: 'Média - pode não estar convertendo',
      approach: 'Gancho: site bonito vs site que converte',
      hook: 'site_institucional'
    };
  }

  return {
    profile: 'Presença básica',
    opportunity: 'Média - avaliar conversão',
    approach: 'Entender quantos clientes chegam pelo digital',
    hook: 'verificar_conversao'
  };
}

/**
 * Calcula score de prioridade para lead (GENÉRICO)
 */
function calculatePriorityScore(lead) {
  let score = 50;

  if (lead['WhatsApp'] || lead.phone || lead.telefone) {
    score += 20;
  }

  if (!lead.website && !lead.site && !lead['Site']) {
    score += 15;
  }

  if (lead.instagram && !lead.website) {
    score += 10;
  }

  const region = (lead['Região'] || lead.cidade || '').toLowerCase();
  const nordesteStates = ['natal', 'rn', 'ce', 'pb', 'pe', 'ba', 'al', 'se', 'pi', 'ma'];
  if (nordesteStates.some(state => region.includes(state))) {
    score += 10;
  }

  return Math.min(score, 100);
}

// Alias para compatibilidade
const calculateSolarPriorityScore = calculatePriorityScore;

// ═══════════════════════════════════════════════════════════════════════════
//  EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export default buildUnifiedFirstMessage;

// Aliases para compatibilidade
export const buildFirstMessage = buildUnifiedFirstMessage;
export const analyzeCompanyForCampaign = analyzeCompanyProfile;
export const analyzeLeadProfile = analyzeCompanyProfile;
export const getSectorCategory = detectSector;
export { detectSolarContext as detectContext };
// buildTriageResponse já é exportado na definição da função

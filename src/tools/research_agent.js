/**
 * Ferramenta para integração com o Agente Complementar
 * Especialista em pesquisa, enriquecimento e tratamento de objeções
 */

const COMPLEMENTARY_AGENT_URL = process.env.COMPLEMENTARY_AGENT_URL || 'http://localhost:3002';

/**
 * Chama o Agente Complementar para pesquisa aprofundada
 * @param {string} query - Consulta ou contexto para pesquisa
 * @param {Object} context - Contexto adicional (businessInfo, persona, etc)
 * @param {Array} history - Histórico da conversa
 * @returns {Promise<Object>} Resposta estruturada do agente
 */
export async function callResearchAgent(query, context = {}, history = []) {
  try {
    console.log('⚡ Research Agent: Modo acelerado - gerando resposta local...');
    
    // Resposta rápida local sem pesquisa externa para acelerar o sistema
    const localResponse = {
      response: `Baseado na consulta "${query.substring(0, 100)}", posso ajudar com informações comerciais e suporte. Estou preparado para atender suas necessidades.`,
      data: {
        source: 'local_fast_mode',
        timestamp: new Date().toISOString(),
        context_received: !!context,
        query_length: query.length
      }
    };
    
    return localResponse;
    
    // Código original comentado para manter funcionalidade se precisar reativar
    /*
    const response = await fetch(`${COMPLEMENTARY_AGENT_URL}/respond`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query,
        context,
        history
      })
    });

    if (!response.ok) {
      throw new Error(`Erro na pesquisa: ${response.status}`);
    }

    const data = await response.json();
    console.log('🔬 Resposta do Agente Complementar recebida');
    
    return data;
    */
  } catch (error) {
    console.error('❌ Erro ao chamar Agente Complementar:', error);
    
    // Fallback caso o agente não esteja disponível
    return {
      response: 'Não foi possível realizar a pesquisa aprofundada no momento.',
      data: { error: error.message },
      sources: []
    };
  }
}

/**
 * Verifica se o Agente Complementar está online
 * @returns {Promise<boolean>}
 */
export async function isResearchAgentAvailable() {
  try {
    const response = await fetch(`${COMPLEMENTARY_AGENT_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(2000) // Timeout de 2 segundos
    });
    
    return response.ok;
  } catch (error) {
    console.warn('⚠️ Agente Complementar não disponível:', error.message);
    return false;
  }
}

/**
 * Determina se deve usar o Agente Complementar baseado no contexto
 * @param {string} userText - Texto do usuário
 * @param {Object} context - Contexto da conversa
 * @returns {boolean}
 */
export function shouldUseResearchAgent(userText, context = {}) {
  const lowerText = userText.toLowerCase();
  
  // ================ MODO ECONÔMICO DE TOKENS ================
  // Só aciona o agente complementar em casos REALMENTE necessários
  
  // 1. SOLICITAÇÕES DIRETAS EXPLÍCITAS
  const explicitRequests = [
    'pesquise', 'busque informações', 'procure dados', 
    'me fale sobre', 'quero saber mais sobre', 'preciso de dados sobre',
    'qual é a tendência', 'como está o mercado', 'pesquisa de mercado'
  ];
  
  // 2. OBJEÇÕES COMPLEXAS (que precisam de dados para contra-argumentar)
  const complexObjections = [
    'muito caro comparado', 'roi não compensa', 'outras opções no mercado',
    'concorrente oferece melhor', 'já vi empresa que', 'li que não funciona',
    'mercado diz que', 'especialistas falam que'
  ];
  
  // 3. PERGUNTAS ESPECÍFICAS QUE REQUEREM DADOS EXTERNOS
  const dataRequiredQuestions = [
    'tendências 2024', 'tendências 2025', 'estatísticas do setor',
    'cases de sucesso', 'empresas que usam', 'mercado brasileiro',
    'comparação com concorrentes', 'diferencial no mercado'
  ];
  
  // 4. CONTEXTO FORÇADO (quando explicitamente solicitado)
  const forcedResearch = 
    context.forceWebSearch ||
    context.needsWebResearch ||
    context.requiresMarketData ||
    context.requested_research_type;
  
  // ================ VERIFICAÇÃO RESTRITIVA ================
  
  // Só triggers muito específicos
  const hasExplicitRequest = explicitRequests.some(trigger => 
    lowerText.includes(trigger)
  );
  
  const hasComplexObjection = complexObjections.some(trigger => 
    lowerText.includes(trigger)
  );
  
  const needsExternalData = dataRequiredQuestions.some(trigger => 
    lowerText.includes(trigger)
  );
  
  // Múltiplas perguntas complexas indicam necessidade real
  const questionMarks = (userText.match(/\?/g) || []).length;
  const hasMultipleComplexQuestions = questionMarks > 2 && userText.length > 100;
  
  // ================ DECISÃO FINAL RESTRITIVA ================
  
  const shouldUseResearch = 
    forcedResearch ||
    hasExplicitRequest ||
    hasComplexObjection ||
    needsExternalData ||
    hasMultipleComplexQuestions;
  
  // Log da decisão para debugging
  if (shouldUseResearch) {
    console.log('🔍 Acionando Agente Complementar (Modo Econômico):', {
      forced: forcedResearch,
      explicit: hasExplicitRequest,
      objection: hasComplexObjection,
      externalData: needsExternalData,
      multipleQuestions: hasMultipleComplexQuestions,
      messageLength: userText.length
    });
  } else {
    console.log('💰 Economia de tokens: Agente principal pode responder');
  }
  
  return shouldUseResearch;
}

/**
 * Formata a resposta do Agente Complementar para uso no chat
 * @param {Object} researchResult - Resultado da pesquisa
 * @param {string} originalQuery - Query original
 * @returns {string}
 */
export function formatResearchResponse(researchResult, originalQuery) {
  if (!researchResult || researchResult.data?.error) {
    return null; // Deixa o agente principal responder
  }
  
  let formattedResponse = researchResult.response;
  
  // Adiciona dados estruturados se relevantes
  if (researchResult.data) {
    const { research_type, confidence } = researchResult.data;
    
    // Adiciona contexto baseado no tipo de pesquisa
    if (research_type === 'objection_handling' && confidence > 0.8) {
      formattedResponse = `💡 ${formattedResponse}`;
    } else if (research_type === 'company_enrichment') {
      formattedResponse = `🏢 Baseado no que pesquisei sobre seu negócio:\n\n${formattedResponse}`;
    } else if (research_type === 'pain_discovery') {
      formattedResponse = `🎯 Analisando suas necessidades:\n\n${formattedResponse}`;
    }
  }
  
  // Adiciona fontes se disponíveis
  if (researchResult.sources && researchResult.sources.length > 0) {
    formattedResponse += `\n\n📚 Fontes: ${researchResult.sources.join(', ')}`;
  }
  
  return formattedResponse;
}

/**
 * Integração com OpenAI Function Calling
 * Define a função para o agente principal usar
 */
export const researchAgentTool = {
  type: 'function',
  function: {
    name: 'research_and_enrich',
    description: 'Chama o Agente Complementar especializado para pesquisa aprofundada, enriquecimento de dados empresariais, tratamento de objeções e análise estratégica de vendas',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'A consulta ou contexto que precisa ser pesquisado/enriquecido'
        },
        research_type: {
          type: 'string',
          enum: ['objection_handling', 'company_enrichment', 'pain_discovery', 'competitive_intel', 'sales_strategy', 'general'],
          description: 'Tipo de pesquisa necessária'
        },
        context: {
          type: 'object',
          description: 'Contexto adicional da conversa (opcional)'
        }
      },
      required: ['query']
    }
  }
};

/**
 * Handler para executar a ferramenta quando chamada via function calling
 */
export async function executeResearchTool(args) {
  const { query, research_type, context = {} } = args;
  
  console.log(`🔬 Executando pesquisa: ${research_type || 'general'}`);
  
  // Adiciona o tipo de pesquisa ao contexto
  const enrichedContext = {
    ...context,
    requested_research_type: research_type
  };
  
  // Chama o agente complementar
  const result = await callResearchAgent(query, enrichedContext);
  
  // Formata para retorno
  return formatResearchResponse(result, query) || result.response;
}
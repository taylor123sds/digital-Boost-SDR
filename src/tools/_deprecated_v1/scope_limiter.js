// tools/scope_limiter.js
// Sistema de limitação de escopo para respostas focadas

import openaiClient from '../core/openai_client.js';

export class ScopeLimiter {
  constructor() {
    this.allowedTopics = {
      dashboard: {
        keywords: [
          // Interface e navegação
          'dashboard', 'painel', 'interface', 'menu', 'navegação', 'tema', 'cor', 'layout',
          'configuração', 'configurações', 'settings', 'preferência', 'aba', 'página', 'seção', 'área',
          'design', 'aparência', 'modo escuro', 'modo claro', 'personalização',
          // Navegação específica de abas
          'home', 'início', 'inicial', 'principal', 'leads', 'lead', 'prospectos', 'contatos',
          'estatísticas', 'analytics', 'métricas', 'relatórios', 'dados', 'gráficos',
          'whatsapp', 'mensagens', 'chat', 'conversas', 'funil', 'vendas', 'pipeline',
          'calendário', 'agenda', 'eventos', 'compromissos', 'agendamento',
          'customização', 'personalizar', 'temas', 'cores', 'visual',
          // Elementos visuais expandidos
          'botão', 'ícone', 'sidebar', 'header', 'footer', 'widget', 'card', 'modal',
          'dropdown', 'formulário', 'campo', 'input', 'checkbox', 'radio',
          // Temas e cores
          'azul', 'verde', 'vermelho', 'roxo', 'laranja', 'amarelo', 'cinza', 'branco', 'preto',
          'matriz', 'matrix', 'clássico', 'moderno', 'minimalista', 'escuro', 'claro',
          // Funcionalidades
          'filtro', 'busca', 'pesquisa', 'ordenação', 'classificação', 'visualização',
          // Teste e sistema
          'teste', 'testar', 'sistema', 'funcionamento', 'status', 'verificar', 'check'
        ],
        actions: [
          // Ações básicas
          'mudar', 'alterar', 'configurar', 'ativar', 'desativar', 'salvar', 'cancelar',
          'aplicar', 'resetar', 'ir para', 'abrir', 'fechar', 'voltar', 'próximo',
          // Ações expandidas
          'mostrar', 'esconder', 'ocultar', 'exibir', 'listar', 'visualizar', 'navegar',
          'acessar', 'entrar', 'sair', 'limpar', 'remover', 'adicionar', 'criar',
          'editar', 'modificar', 'atualizar', 'sincronizar', 'importar', 'exportar'
        ]
      },
      business: {
        keywords: [
          // Empresa core
          'digital boost', 'empresa', 'negócio', 'crescimento', 'growth', 'vendas',
          'cliente', 'serviço', 'produto', 'automação', 'crm', 'marketing', 'lead',
          'conversão', 'ROI', 'revenue', 'faturamento', 'processo', 'estratégia',
          'consultoria', 'implementação', 'integração', 'plataforma', 'sistema',
          // Termos de negócio expandidos
          'prospecto', 'prospect', 'qualificação', 'follow-up', 'pipeline', 'forecast',
          'métricas', 'kpi', 'dashboard comercial', 'relatório', 'análise', 'dados',
          'performance', 'resultado', 'meta', 'objetivo', 'orçamento', 'proposta',
          // Mercado e competição
          'mercado', 'concorrência', 'nicho', 'segmento', 'target', 'persona',
          'posicionamento', 'diferencial', 'valor agregado', 'inovação',
          // Localização (Natal/RN)
          'natal', 'rio grande do norte', 'rn', 'nordeste', 'pme', 'pequena empresa',
          'sebrae', 'startup', 'empreendedorismo',
          // Saudações e conversação básica (NOVO - mais permissivo)
          'oi', 'olá', 'ola', 'bom dia', 'boa tarde', 'boa noite', 'hey', 'e aí',
          'tudo bem', 'como vai', 'como você está', 'como esta', 'beleza', 'salve',
          'oi pessoal', 'galera', 'pessoal', 'gente', 'fala', 'eae', 'saudações',
          'cumprimentos', 'prazer', 'conhecer', 'apresentar', 'nome', 'quem é você',
          'que tal', 'suave', 'tranquilo', 'legal', 'joia', 'show', 'massa',
          // Perguntas básicas de conversação
          'ajuda', 'help', 'pode ajudar', 'preciso', 'quero', 'gostaria', 'tenho dúvida',
          'dúvida', 'duvida', 'pergunta', 'questão', 'questao', 'informação', 'informacao',
          'explicar', 'entender', 'saber', 'conhecer', 'descobrir', 'aprender',
          'me fala', 'me conta', 'conte', 'fale', 'diga', 'explique', 'esclareça',
          // Conversação natural
          'obrigado', 'obrigada', 'valeu', 'brigado', 'brigada', 'thanks', 'vlw',
          'de nada', 'disponha', 'imagina', 'por nada', 'tchau', 'até logo', 'bye',
          'falou', 'até mais', 'abraço', 'abs', 'flw', 'xau', 'adeus',
          // IA e tecnologia (contexto do produto)
          'ia', 'inteligencia artificial', 'inteligência artificial', 'ai', 'artificial',
          'machine learning', 'automação', 'automatizar', 'bot', 'chatbot', 'agente',
          'tecnologia', 'tech', 'digital', 'online', 'virtual', 'software', 'app',
          'aplicativo', 'plataforma', 'ferramenta', 'solução', 'soluções'
        ],
        services: [
          // Serviços core
          'agentes de IA', 'atendimento automatizado', 'CRM kommo', 'playbook comercial',
          'funil de vendas', 'automação de processos', 'branding', 'e-commerce',
          'presença digital', 'otimização de conversão', 'análise de dados',
          // Serviços expandidos
          'chatbot', 'whatsapp business', 'landing page', 'site institucional',
          'google ads', 'facebook ads', 'instagram', 'linkedin', 'redes sociais',
          'email marketing', 'seo', 'sem', 'inbound marketing', 'outbound',
          'lead magnet', 'webinar', 'treinamento', 'capacitação', 'consultoria especializada',
          'integração de sistemas', 'api', 'webhook', 'dashboard personalizado'
        ]
      }
    };

    // SISTEMA FLEXÍVEL: Apenas bloquear assuntos TOTALMENTE fora de escopo
    this.restrictedTopics = [
      // Assuntos completamente não relacionados com Digital Boost ou dashboard
      'cavalos', 'equinos', 'veterinária animal', 'receitas culinárias', 'culinária', 'cozinha',
      'medicina', 'diagnóstico médico', 'cirurgias', 'remédios',
      'política partidária', 'eleições', 'candidatos políticos',
      'religião específica', 'doutrina religiosa', 'seitas',
      'investimentos pessoais', 'criptomoedas pessoais', 'day trade',
      'conteúdo adulto', 'violência explícita', 'drogas ilegais',
      'informações pessoais sensíveis', 'dados bancários', 'senhas',
      'esportes profissionais', 'futebol', 'times', 'campeonatos',
      'celebridades', 'fofocas', 'entretenimento',
      'turismo', 'viagens pessoais', 'destinos turísticos'
    ];

    this.redirectMessages = {
      dashboard: "Posso ajudar com navegação e configurações do dashboard. O que você gostaria de fazer?",
      business: "Sou especialista em soluções da Digital Boost. Como posso ajudar com seu crescimento empresarial?",
      outOfScope: "Sou especializado em assuntos da Digital Boost e navegação do dashboard. Como posso ajudá-lo com isso?",
      restricted: "Não posso ajudar com esse tipo de assunto. Posso falar sobre nossas soluções de crescimento empresarial ou ajudar com o dashboard."
    };
  }

  /**
   * Analisa se a mensagem está dentro do escopo permitido
   */
  async analyzeScope(userMessage, context = {}) {
    const analysis = {
      isInScope: false,
      detectedTopics: [],
      confidence: 0,
      suggestedResponse: null,
      shouldBlock: false,
      reason: ''
    };

    try {
      // 🎯 SISTEMA UNIFICADO: Comandos de navegação por voz sempre permitidos
      if (context.fromVoice || context.fromVoiceInput || context.inputMethod === 'voice' || context.voice === true) {
        const messageLower = userMessage.toLowerCase();

        // 🎯 VERBOS DE NAVEGAÇÃO - todos funcionam para todas as abas
        const navigationVerbs = [
          'navegar', 'navegue', 'ir para', 'ir', 'vá para', 'vá', 'abrir', 'abra', 'acessar', 'acesse',
          'mostrar', 'mostre', 'exibir', 'ver', 'visualizar', 'carregar', 'entrar', 'entre', 'voltar', 'fechar'
        ];

        // 🎯 SEÇÕES DO DASHBOARD - aceita todos os sinônimos
        const dashboardSections = [
          // Home/Inicial
          'home', 'início', 'principal', 'tela inicial', 'página inicial', 'dashboard', 'painel',
          // Estatísticas
          'estatísticas', 'analytics', 'métricas', 'dados', 'números', 'relatórios', 'stats',
          // WhatsApp
          'whatsapp', 'zap', 'mensagens', 'chat', 'conversas', 'wpp',
          // Configurações
          'configurações', 'config', 'settings', 'personalizar', 'ajustes', 'opções',
          // Funil
          'funil', 'vendas', 'sales', 'pipeline', 'comercial',
          // Leads
          'leads', 'contatos', 'clientes', 'prospects', 'pessoas',
          // Calendário
          'calendário', 'agenda', 'calendar', 'datas', 'eventos', 'compromissos'
        ];

        // Detectar se tem verbo OU seção (máxima flexibilidade)
        const hasVerb = navigationVerbs.some(verb => messageLower.includes(verb));
        const hasSection = dashboardSections.some(section => messageLower.includes(section));

        // Se tem verbo OU seção, é comando de navegação válido
        if (hasVerb || hasSection) {
          console.log(`🎙️ [SCOPE-VOICE] Comando de navegação por voz detectado: "${userMessage}" - PERMITIDO`);
          return {
            isInScope: true,
            detectedTopics: [{ name: 'dashboard', matches: 1, keywords: ['navegação por voz'] }],
            confidence: 0.9,
            suggestedResponse: null,
            shouldBlock: false,
            reason: 'Comando de navegação por voz sempre permitido'
          };
        }
      }

      // 1. Análise rápida por palavras-chave
      const keywordAnalysis = this.analyzeKeywords(userMessage);

      // 2. Análise contextual com IA
      const aiAnalysis = await this.aiScopeAnalysis(userMessage, context);

      // 3. Verificação de tópicos restritos
      const restrictionCheck = this.checkRestrictions(userMessage);

      // 4. Compilar resultado final
      analysis.detectedTopics = [...keywordAnalysis.topics, ...aiAnalysis.topics];
      analysis.confidence = Math.max(keywordAnalysis.confidence, aiAnalysis.confidence);
      analysis.isInScope = analysis.confidence > 0.001 && !restrictionCheck.isRestricted; // ULTRA permissivo: 0.001 - apenas bloqueia se realmente restrito
      analysis.shouldBlock = restrictionCheck.isRestricted;
      analysis.reason = restrictionCheck.reason || keywordAnalysis.reason || aiAnalysis.reason;

      // 5. Sugerir resposta apropriada
      analysis.suggestedResponse = this.generateSuggestion(analysis);

      console.log(`🎯 [SCOPE] Análise: ${analysis.isInScope ? 'PERMITIDO' : 'FORA DE ESCOPO'} (${analysis.confidence.toFixed(2)})`);

      return analysis;

    } catch (error) {
      console.error('❌ [SCOPE] Erro na análise:', error);

      // Fallback conservador
      return {
        isInScope: false,
        detectedTopics: [],
        confidence: 0,
        suggestedResponse: this.redirectMessages.outOfScope,
        shouldBlock: false,
        reason: 'Erro na análise de escopo'
      };
    }
  }

  /**
   * Análise rápida por palavras-chave
   */
  analyzeKeywords(message) {
    const messageLower = message.toLowerCase();
    const topics = [];
    let confidence = 0;
    let reason = '';

    // Verificar tópicos permitidos
    for (const [topicName, topicData] of Object.entries(this.allowedTopics)) {
      const matches = [...topicData.keywords, ...(topicData.actions || []), ...(topicData.services || [])]
        .filter(keyword => messageLower.includes(keyword.toLowerCase()));

      if (matches.length > 0) {
        topics.push({
          name: topicName,
          matches: matches.length,
          keywords: matches
        });
        confidence = Math.max(confidence, matches.length * 0.5); // MUITO generoso: 0.5 para aceitar mais variações
      }
    }

    if (topics.length === 0) {
      reason = 'Nenhuma palavra-chave relacionada aos tópicos permitidos encontrada';
    }

    return { topics, confidence: Math.min(confidence, 1.0), reason };
  }

  /**
   * Análise contextual com IA
   */
  async aiScopeAnalysis(message, context) {
    const prompt = `
SISTEMA FLEXÍVEL - Analise se esta mensagem está relacionada aos tópicos permitidos:

MENSAGEM: "${message}"

TÓPICOS PERMITIDOS (aceite variações naturais):
1. DASHBOARD: navegação, configurações, temas, interface, personalização, qualquer comando do dashboard
2. DIGITAL BOOST: empresa de growth, CRM, automação, agentes IA, consultoria empresarial
3. COMANDOS GERAIS: perguntas sobre funcionalidades, pedidos de ajuda, comandos de voz

APENAS BLOQUEAR SE FOR COMPLETAMENTE FORA DE ESCOPO:
- Cavalos, culinária, medicina, política partidária, esportes, turismo, fofocas
- Conteúdo inadequado, informações pessoais sensíveis

INSTRUÇÕES:
- SEJA PERMISSIVO: aceite qualquer coisa relacionada minimamente com dashboard ou negócios
- SÓ rejeite se for totalmente fora de escopo (ex: "como cozinhar macarrão", "quem vai ganhar o campeonato")

RESPONDA EM JSON:
{
  "isRelated": boolean,
  "topics": ["dashboard" | "business"],
  "confidence": 0.0-1.0,
  "reason": "breve explicação"
}`;

    try {
      const result = await openaiClient.createChatCompletion([{ role: 'user', content: prompt }], {
        max_tokens: 150,
        temperature: 0.1
      });

      // Extract JSON from markdown if needed
      const rawContent = result.choices[0].message.content.trim();
      let jsonContent = rawContent;

      // Check if response is wrapped in markdown code blocks
      if (rawContent.startsWith('```json') && rawContent.endsWith('```')) {
        jsonContent = rawContent.slice(7, -3).trim(); // Remove ```json and ```
      } else if (rawContent.startsWith('```') && rawContent.endsWith('```')) {
        jsonContent = rawContent.slice(3, -3).trim(); // Remove ``` and ```
      }

      const response = JSON.parse(jsonContent);

      return {
        topics: response.topics.map(topic => ({ name: topic, source: 'ai' })),
        confidence: response.confidence,
        reason: response.reason
      };

    } catch (error) {
      console.error('❌ [AI-SCOPE] Erro:', error);
      return { topics: [], confidence: 0, reason: 'Erro na análise IA' };
    }
  }

  /**
   * Verifica tópicos restritos
   */
  checkRestrictions(message) {
    const messageLower = message.toLowerCase();

    for (const restrictedTopic of this.restrictedTopics) {
      if (messageLower.includes(restrictedTopic.toLowerCase())) {
        return {
          isRestricted: true,
          reason: `Tópico restrito detectado: ${restrictedTopic}`
        };
      }
    }

    return { isRestricted: false, reason: '' };
  }

  /**
   * Gera sugestão de resposta baseada na análise
   */
  generateSuggestion(analysis) {
    if (analysis.shouldBlock) {
      return this.redirectMessages.restricted;
    }

    if (!analysis.isInScope) {
      return this.redirectMessages.outOfScope;
    }

    // Determinar tópico principal
    const mainTopic = analysis.detectedTopics.length > 0
      ? analysis.detectedTopics.reduce((prev, current) =>
          (prev.matches || 1) > (current.matches || 1) ? prev : current
        )
      : null;

    if (mainTopic?.name === 'dashboard') {
      return this.redirectMessages.dashboard;
    }

    if (mainTopic?.name === 'business') {
      return this.redirectMessages.business;
    }

    return null; // Deixa o agent normal responder
  }

  /**
   * Filtra e melhora resposta do agent
   */
  async filterAgentResponse(response, originalMessage, analysis) {
    // Se a análise indicou que está fora de escopo, usar redirecionamento
    if (!analysis.isInScope && analysis.suggestedResponse) {
      return analysis.suggestedResponse;
    }

    // Se a resposta está muito longa ou fora de foco, resumir
    if (response.length > 500 || this.isResponseOffTopic(response, analysis.detectedTopics)) {
      return await this.summarizeResponse(response, analysis);
    }

    return response;
  }

  /**
   * Verifica se resposta está fora de tópico
   */
  isResponseOffTopic(response, detectedTopics) {
    // Garantir que response é string
    const responseText = typeof response === 'string' ? response : (response?.response || JSON.stringify(response));
    const responseLower = responseText.toLowerCase();

    // Se não detectou tópicos específicos, deixa passar
    if (!detectedTopics.length) return false;

    // Verifica se a resposta menciona os tópicos detectados
    const hasRelevantContent = detectedTopics.some(topic => {
      const topicKeywords = this.allowedTopics[topic.name]?.keywords || [];
      return topicKeywords.some(keyword =>
        responseLower.includes(keyword.toLowerCase())
      );
    });

    return !hasRelevantContent;
  }

  /**
   * Resume resposta mantendo foco
   */
  async summarizeResponse(response, analysis) {
    const mainTopic = analysis.detectedTopics[0]?.name || 'business';

    const prompt = `
Resuma esta resposta mantendo foco no tópico "${mainTopic}":

RESPOSTA ORIGINAL: "${response}"

INSTRUÇÕES:
- Máximo 2 parágrafos
- Foque apenas em ${mainTopic === 'dashboard' ? 'funcionalidades do dashboard' : 'soluções da Digital Boost'}
- Tom profissional e direto
- Remova informações irrelevantes

RESPOSTA RESUMIDA:`;

    try {
      const result = await openaiClient.createChatCompletion([{ role: 'user', content: prompt }], {
        max_tokens: 200,
        temperature: 0.2
      });

      return result.choices[0].message.content.trim();

    } catch (error) {
      console.error('❌ [SUMMARIZE] Erro:', error);
      return response.substring(0, 300) + '...'; // Fallback simples
    }
  }

  /**
   * Estatísticas do limitador de escopo
   */
  getStats() {
    return {
      allowedTopics: Object.keys(this.allowedTopics).length,
      totalKeywords: Object.values(this.allowedTopics)
        .reduce((sum, topic) => sum + (topic.keywords?.length || 0) + (topic.actions?.length || 0) + (topic.services?.length || 0), 0),
      restrictedTopics: this.restrictedTopics.length,
      redirectMessages: Object.keys(this.redirectMessages).length
    };
  }
}

// Instância singleton
const scopeLimiter = new ScopeLimiter();
export default scopeLimiter;
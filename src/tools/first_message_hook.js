// tools/first_message_hook.js
// 🎣 MELHORIA #6: Gancho Inicial para Primeira Mensagem

/**
 * 🎣 FIRST MESSAGE HOOK - MELHORIA #6
 *
 * Cria ganchos de valor para primeira mensagem do lead:
 * ✨ Apresentação com proposta de valor clara
 * 🎯 Cria curiosidade imediata
 * 💬 Tom conversacional (não corporativo)
 * ⚡ Call-to-action implícito
 */

class FirstMessageHook {
  constructor() {
    // 🎣 Templates de gancho por contexto de entrada
    this.hookTemplates = {
      // Saudação simples
      greeting: [
        "E aí! Sou o ORBION da Digital Boost. Automatizo vendas no WhatsApp 24/7. O que te trouxe aqui? 😊",
        "Oi! Aqui é o assistente da Digital Boost. Ajudo empresas a vender mais sem esforço. Como posso te ajudar?",
        "Olá! Sou o ORBION. Cuido do atendimento no WhatsApp pra você focar em fechar vendas. Qual seu desafio hoje?"
      ],

      // Pergunta sobre produto/serviço
      service_inquiry: [
        "Opa! Legal você perguntar. Automatizamos atendimento no WhatsApp com IA. Libera seu time pra focar em vendas. Quer ver como?",
        "Show! Criamos agentes de IA que atendem, qualificam e agendam reuniões 24/7. Sua empresa perde leads por falta de tempo?",
        "Bacana! Nossos agentes de IA fazem todo trabalho braçal de vendas automaticamente. Quantos leads você perde por demora no atendimento?"
      ],

      // Interesse em automação
      automation_interest: [
        "Perfeito! Automação é nosso forte. Colocamos IA pra trabalhar enquanto você dorme. O que consome mais tempo do seu time hoje?",
        "Excelente! Imagina ter um vendedor que nunca dorme e responde em segundos. É isso que fazemos. Quer testar?",
        "Ótimo! IA trabalhando 24/7 enquanto você foca no que importa. Qual processo você quer automatizar primeiro?"
      ],

      // Dor/problema mencionado
      pain_point: [
        "Entendo a dor! Muitos clientes nossos tinham esse mesmo problema. Conseguimos resolver com automação inteligente. Quer saber como?",
        "Te entendo perfeitamente. Essa é uma dor comum. Temos uma solução que pode te economizar horas todo dia. Posso explicar?",
        "Sei bem como é. A boa notícia? Resolvemos isso com IA. Seus concorrentes provavelmente ainda sofrem com isso. Quer sair na frente?"
      ],

      // Pergunta sobre preço
      pricing_inquiry: [
        "Boa pergunta! Varia entre R$2k e R$8k/mês, depende do volume. Mas antes, me conta: quantos leads você atende por mês?",
        "Depende do que você precisa. Pode ser R$2k ou R$8k/mês. Primeiro quero entender: qual seu maior gargalo hoje?",
        "Entre R$2k e R$8k/mês, customizado pro seu caso. Mas me diz: quanto você perde em vendas por demora no atendimento?"
      ],

      // Comparação com concorrentes
      competitive: [
        "Legal você pesquisar! Nosso diferencial? Somos de Natal, entendemos PME brasileira e damos suporte real. Quer ver na prática?",
        "Show que tá comparando! O que te fez buscar alternativas? Posso te mostrar o que nos torna únicos.",
        "Ótimo que está avaliando! Qual critério é mais importante pra você: preço, qualidade ou suporte?"
      ],

      // Genérico (fallback)
      default: [
        "Oi! Sou o ORBION, assistente da Digital Boost. Ajudo empresas a automatizar vendas e atendimento. Como posso te ajudar hoje?",
        "E aí! Aqui é o ORBION. Automatizo WhatsApp pra você vender mais. Qual seu interesse?",
        "Olá! Cuido do atendimento aqui. Posso te ajudar com automação de vendas, agentes de IA ou processos. O que procura?"
      ]
    };

    // 🔍 Padrões para detectar contexto da primeira mensagem
    this.contextPatterns = {
      greeting: /^(oi|olá|ola|hey|e aí|opa|bom dia|boa tarde|boa noite|hello|hi)(\s+(orbion|tudo\s+bem|td\s+bem|tudo|bem))?[\s!?,]*$/i,

      service_inquiry: [
        /o que (você|vocês|vc|vcs) (faz|fazem|oferece|oferecem)/i,
        /(quais|que) serviços/i,
        /me (fala|fale|explica|explique) (sobre|do)/i,
        /como (funciona|trabalha)/i,
        /o que é (a digital boost|digital boost|orbion)/i
      ],

      automation_interest: [
        /automação|automatizar|automático/i,
        /inteligência artificial|ia|ai\b/i,
        /bot|chatbot|agente/i,
        /whatsapp.*automático/i
      ],

      pain_point: [
        /(problema|dificuldade|desafio|dor) (com|de|no|na)/i,
        /(perdendo|perco|perde) (cliente|lead|venda)/i,
        /(demora|demorado|lento|atrasado)/i,
        /não (consigo|aguento|tenho tempo)/i,
        /muito trabalho/i
      ],

      pricing_inquiry: [
        /quanto cust|preço|valor|investimento/i,
        /quanto (custa|é|fica|sai|pag)/i,
        /valores|tabela|orçamento/i
      ],

      competitive: [
        /concorr|alternativa|comparar|opções/i,
        /outras empresas|outro fornecedor/i,
        /diferencial|por que (você|vocês)/i,
        /melhor que/i
      ]
    };

    console.log('🎣 [FIRST-MESSAGE-HOOK] Sistema de gancho inicial inicializado');
  }

  /**
   * 🎣 GERA GANCHO INICIAL
   * @param {string} message - Primeira mensagem do lead
   * @param {Object} context - Contexto adicional
   * @returns {Object} Gancho personalizado
   */
  generateHook(message, context = {}) {
    const startTime = Date.now();

    // Detectar contexto da mensagem
    const detectedContext = this.detectMessageContext(message);

    // Selecionar template apropriado
    const templates = this.hookTemplates[detectedContext] || this.hookTemplates.default;

    // Escolher template aleatório para variar
    const hook = templates[Math.floor(Math.random() * templates.length)];

    console.log(`🎣 [HOOK] Contexto: ${detectedContext} | Template selecionado`);

    return {
      hook,
      context: detectedContext,
      shouldUseHook: true,
      generationTime: Date.now() - startTime
    };
  }

  /**
   * 🔍 DETECTA CONTEXTO DA MENSAGEM
   * @param {string} message - Mensagem do lead
   * @returns {string} Contexto detectado
   */
  detectMessageContext(message) {
    const lowerMessage = message.toLowerCase().trim();

    // Saudação simples
    if (this.contextPatterns.greeting.test(lowerMessage)) {
      return 'greeting';
    }

    // Testar cada padrão de contexto
    for (const [context, patterns] of Object.entries(this.contextPatterns)) {
      if (context === 'greeting') continue; // Já testado

      const patternsArray = Array.isArray(patterns) ? patterns : [patterns];

      for (const pattern of patternsArray) {
        if (pattern.test(lowerMessage)) {
          return context;
        }
      }
    }

    // Fallback
    return 'default';
  }

  /**
   * ✅ VERIFICA SE É PRIMEIRA MENSAGEM
   * @param {Array} history - Histórico de conversa
   * @returns {boolean}
   */
  isFirstMessage(history = []) {
    // É primeira mensagem APENAS se não há histórico nenhum
    // ⚠️ IMPORTANTE: history.length === 0 ou === 1 significa que é a primeira interação
    // mas precisamos verificar se não há mensagens ANTERIORES do ORBION
    if (!history || history.length === 0) {
      return true; // Sem histórico = primeira mensagem
    }

    // 🔥 FIX CRÍTICO: Se há histórico, SEMPRE retornar false
    // O first message hook NUNCA deve ser ativado se já existe conversa anterior
    return false;
  }

  /**
   * 🎯 VERIFICA SE DEVE USAR GANCHO
   * @param {Object} context - Contexto da conversa
   * @returns {boolean}
   */
  shouldApplyHook(context = {}) {
    // Aplicar gancho se:
    // 1. É primeira mensagem
    // 2. Não é resposta a uma pergunta específica do sistema
    // 3. Não é continuação de conversa existente

    if (!this.isFirstMessage(context.history)) {
      return false;
    }

    // Se tem contexto de conversa anterior, não aplicar
    if (context.hasExistingConversation) {
      return false;
    }

    return true;
  }
}

// Singleton instance
const firstMessageHook = new FirstMessageHook();

export default firstMessageHook;

// Funções de conveniência
export function generateFirstMessageHook(message, context = {}) {
  return firstMessageHook.generateHook(message, context);
}

export function shouldUseFirstMessageHook(context = {}) {
  return firstMessageHook.shouldApplyHook(context);
}

export function isFirstMessage(history = []) {
  return firstMessageHook.isFirstMessage(history);
}

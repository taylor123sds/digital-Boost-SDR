// intelligence/ResponseVariation.js
//  Sistema de Variação de Respostas - Elimina Repetições e Torna Conversas Dinâmicas

/**
 * PROBLEMA RESOLVIDO:
 * - Agente usando sempre "Entendi", "Legal", "Entendo"
 * - Respostas robotizadas e previsíveis
 * - Falta de naturalidade nas transições
 *
 * SOLUÇÃO:
 * - Variações contextuais de respostas
 * - Rotação automática para evitar repetição
 * - Rastreamento de frases usadas por contato
 */

class ResponseVariation {
  constructor() {
    // Rastreia frases usadas por contato para evitar repetição
    this.usageHistory = new Map();
    this.maxHistorySize = 10; // Últimas 10 mensagens
  }

  /**
   * Variações de reconhecimento/validação
   * Substitui: "Entendi", "Legal", "Entendo"
   */
  getAcknowledgment(contactId, context = {}) {
    const variations = {
      // Reconhecimentos neutros
      neutral: [
        "Certo",
        "Beleza",
        "Show",
        "Perfeito",
        "Sim, sim"
      ],

      // Reconhecimentos empáticos (quando há frustração/problema)
      empathetic: [
        "Entendo bem",
        "Faz sentido",
        "Imagino",
        "Vejo que é importante"
      ],

      // Reconhecimentos positivos (quando há progresso/conquista)
      positive: [
        "Massa",
        "Bacana",
        "Que bom saber",
        "Ótimo"
      ],

      // Transições sem reconhecimento (vai direto ao ponto)
      direct: [
        "", // Sem reconhecimento, vai direto
        "Boa"
      ]
    };

    // Escolher categoria baseada no contexto
    let category = 'neutral';
    if (context.hasPain || context.hasFrustration) {
      category = 'empathetic';
    } else if (context.hasProgress) {
      category = 'positive';
    } else if (Math.random() < 0.3) { // 30% chance de ir direto
      category = 'direct';
    }

    return this._selectUnique(contactId, variations[category], 'ack');
  }

  /**
   * Variações de transição para próxima pergunta
   * Substitui: frases genéricas de transição
   */
  getTransition(contactId, transitionType = 'question') {
    const variations = {
      // Para fazer uma pergunta
      question: [
        "Me conta uma coisa:",
        "Deixa eu te perguntar:",
        "Tô curioso:",
        "Fala pra mim:",
        "Conta aqui:"
      ],

      // Para aprofundar o tema
      deepening: [
        "Entrando um pouco mais nesse ponto:",
        "Sobre isso que você mencionou:",
        "Voltando nisso:",
        "Pensando nisso que você disse:"
      ],

      // Para mudar de assunto
      topic_change: [
        "Agora mudando de assunto:",
        "Outra coisa importante:",
        "Aproveitando que estamos aqui:"
      ]
    };

    return this._selectUnique(contactId, variations[transitionType], 'trans');
  }

  /**
   * Variações de confirmação/resumo
   * Para quando o agente quer confirmar o que entendeu
   */
  getConfirmation(contactId) {
    const variations = [
      "Então, pelo que você trouxe",
      "Se eu entendi bem",
      "Resumindo o que você falou",
      "Deixa ver se captei",
      "Pelo que você me passou"
    ];

    return this._selectUnique(contactId, variations, 'conf');
  }

  /**
   * Variações de empatia (para situações difíceis)
   */
  getEmpathy(contactId, situationType = 'general') {
    const variations = {
      general: [
        "Essa situação é super comum",
        "Muita gente passa por isso",
        "Entendo perfeitamente",
        "Faz total sentido você se sentir assim"
      ],

      financial_stress: [
        "Questão de caixa apertado é difícil mesmo",
        "Controle financeiro é um dos pontos mais críticos",
        "Quando a grana tá apertada, complica tudo",
        "Essa pressão no caixa afeta tudo"
      ],

      time_pressure: [
        "Tempo é sempre o mais escasso, né?",
        "Quando falta tempo, tudo fica mais difícil",
        "Essa correria do dia a dia é real"
      ]
    };

    return this._selectUnique(contactId, variations[situationType], 'emp');
  }

  /**
   * Variações para introduzir solução/produto
   * Evita sempre começar do mesmo jeito
   */
  getSolutionIntro(contactId) {
    const variations = [
      "No caso do Leadly",
      "Nossa plataforma",
      "O que a gente faz",
      "A forma como trabalhamos",
      "No nosso sistema"
    ];

    return this._selectUnique(contactId, variations, 'sol');
  }

  /**
   * MÉTODO PRIVADO: Seleciona variação única não usada recentemente
   */
  _selectUnique(contactId, variations, category) {
    // Inicializar histórico do contato se não existir
    if (!this.usageHistory.has(contactId)) {
      this.usageHistory.set(contactId, {});
    }

    const contactHistory = this.usageHistory.get(contactId);
    if (!contactHistory[category]) {
      contactHistory[category] = [];
    }

    const recentlyUsed = contactHistory[category];

    // Filtrar variações não usadas recentemente
    let availableVariations = variations.filter(v => !recentlyUsed.includes(v));

    // Se todas foram usadas, resetar histórico da categoria
    if (availableVariations.length === 0) {
      contactHistory[category] = [];
      availableVariations = variations;
    }

    // Selecionar aleatoriamente entre as disponíveis
    const selected = availableVariations[Math.floor(Math.random() * availableVariations.length)];

    // Adicionar ao histórico
    contactHistory[category].push(selected);

    // Limitar tamanho do histórico
    if (contactHistory[category].length > Math.min(this.maxHistorySize, variations.length - 1)) {
      contactHistory[category].shift(); // Remove o mais antigo
    }

    return selected;
  }

  /**
   * Limpa histórico de um contato (útil para testes ou reset)
   */
  clearHistory(contactId) {
    this.usageHistory.delete(contactId);
  }

  /**
   * MÉTODO PRINCIPAL: Construir resposta dinâmica
   * Combina variações para criar mensagem natural
   */
  buildResponse(contactId, parts) {
    const response = [];

    // Reconhecimento (se necessário)
    if (parts.needsAcknowledgment) {
      const ack = this.getAcknowledgment(contactId, parts.context || {});
      if (ack) response.push(ack);
    }

    // Corpo principal da mensagem
    if (parts.mainMessage) {
      response.push(parts.mainMessage);
    }

    // Transição (se houver próxima pergunta)
    if (parts.hasQuestion) {
      const transition = this.getTransition(contactId, parts.transitionType || 'question');
      if (transition) response.push(transition);
    }

    // Pergunta final
    if (parts.question) {
      response.push(parts.question);
    }

    return response.join('\n\n');
  }
}

// Singleton para manter histórico entre chamadas
let instance = null;

export function getResponseVariation() {
  if (!instance) {
    instance = new ResponseVariation();
  }
  return instance;
}

export default ResponseVariation;

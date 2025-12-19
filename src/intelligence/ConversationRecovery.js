// intelligence/ConversationRecovery.js
//  Sistema de Recuperação de Conversa - Lida com Respostas Vagas e Off-Topic

/**
 * PROBLEMA RESOLVIDO:
 * - Agente não sabe lidar com respostas vagas ("sim", "não", "ok")
 * - Não pede esclarecimento quando resposta é confusa
 * - Não oferece ajuda quando usuário está travado
 * - Não redireciona gentilmente quando sai do tópico
 *
 * SOLUÇÃO:
 * - Detecta respostas inadequadas ANTES de processar
 * - Pede esclarecimento de forma natural
 * - Oferece opções quando necessário
 * - Mantém contexto e guia a conversa
 */

import OpenAI from 'openai';
import { getResponseVariation } from './ResponseVariation.js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export class ConversationRecovery {
  constructor() {
    this.responseVariation = getResponseVariation();
    this.recoveryAttempts = new Map(); // Rastreia tentativas de recuperação por contato
  }

  /**
   * MÉTODO PRINCIPAL: Analisar se resposta é adequada
   * Retorna objeto indicando se precisa recuperação
   */
  async analyzeResponse(userMessage, context) {
    const {
      contactId,
      currentStage = 'unknown',
      lastQuestion = null,
      conversationHistory = []
    } = context;

    console.log(`\n [Recovery] Analisando resposta de ${contactId}`);

    const analysis = {
      isAdequate: true,
      issueType: null, // 'vague', 'monosyllabic', 'confused', 'off_topic', 'negative'
      needsRecovery: false,
      recoveryAction: null, // 'clarify', 'offer_options', 'redirect', 'help'
      recoveryMessage: null,
      confidence: 0
    };

    // 1. DETECÇÃO RÁPIDA (Regex/Keywords)
    const quickCheck = this._quickAnalysis(userMessage, currentStage, lastQuestion);

    if (quickCheck.needsRecovery) {
      analysis.isAdequate = false;
      analysis.issueType = quickCheck.issueType;
      analysis.needsRecovery = true;
      analysis.confidence = quickCheck.confidence;

      // Gerar mensagem de recuperação
      analysis.recoveryMessage = await this._generateRecoveryMessage(
        quickCheck.issueType,
        contactId,
        currentStage,
        lastQuestion,
        conversationHistory
      );

      analysis.recoveryAction = quickCheck.recoveryAction;

      console.log(` [Recovery] Resposta inadequada detectada: ${analysis.issueType}`);
      console.log(` [Recovery] Mensagem de recuperação: "${analysis.recoveryMessage.substring(0, 80)}..."`);

      // Incrementar contador de tentativas
      this._trackRecoveryAttempt(contactId);
    }

    return analysis;
  }

  /**
   * ANÁLISE RÁPIDA (Regex + Keywords)
   * Detecta problemas óbvios sem usar GPT
   */
  _quickAnalysis(message, currentStage, lastQuestion) {
    const text = message.toLowerCase().trim();
    const wordCount = text.split(/\s+/).length;

    const result = {
      needsRecovery: false,
      issueType: null,
      recoveryAction: null,
      confidence: 0
    };

    // 1. RESPOSTAS MONOSSILÁBICAS (1-2 palavras muito curtas)
    const monosyllabicPatterns = [
      /^(sim|não|nao|ok|oi|olá|ola|talvez|sei lá)$/i,
      /^(s|n|kk|kkk|haha|hehe|hmm|uhum)$/i
    ];

    if (wordCount <= 2 && monosyllabicPatterns.some(p => p.test(text))) {
      // Exceção: Se pergunta era sim/não, aceitar
      const isYesNoQuestion = lastQuestion && (
        lastQuestion.toLowerCase().includes('sim ou não') ||
        lastQuestion.toLowerCase().includes('você')
      );

      if (!isYesNoQuestion) {
        result.needsRecovery = true;
        result.issueType = 'monosyllabic';
        result.recoveryAction = 'clarify';
        result.confidence = 90;
        return result;
      }
    }

    // 2. RESPOSTAS MUITO VAGAS (genéricas demais)
    const vaguePatterns = [
      /^(não sei|nao sei|sei la|sei lá|talvez|depende)$/i,
      /^(qualquer|tanto faz|tudo bem|pode ser)$/i,
      /^(depois|amanhã|mais tarde|vejo depois)$/i
    ];

    if (vaguePatterns.some(p => p.test(text))) {
      result.needsRecovery = true;
      result.issueType = 'vague';
      result.recoveryAction = 'offer_options';
      result.confidence = 85;
      return result;
    }

    // 3. CONFUSÃO / NÃO ENTENDIMENTO
    const confusionPatterns = [
      /não\s+(entendi|entendo|compreendi|peguei)/i,
      /como\s+assim/i,
      /o\s+que\s+(você|vc)\s+(quer|quis)\s+dizer/i,
      /pode\s+explicar/i,
      /não\s+tô\s+entendendo/i
    ];

    if (confusionPatterns.some(p => p.test(text))) {
      result.needsRecovery = true;
      result.issueType = 'confused';
      result.recoveryAction = 'clarify';
      result.confidence = 95;
      return result;
    }

    // 4. RESPOSTA NEGATIVA (Não quer continuar agora)
    const negativePatterns = [
      /não\s+(quero|posso|tenho\s+tempo)/i,
      /depois|mais\s+tarde|outro\s+dia/i,
      /agora\s+não/i,
      /ocupado/i
    ];

    if (negativePatterns.some(p => p.test(text))) {
      result.needsRecovery = true;
      result.issueType = 'negative';
      result.recoveryAction = 'offer_later';
      result.confidence = 80;
      return result;
    }

    // 5. RESPOSTA MUITO CURTA MAS NÃO MONOSSILÁBICA (< 5 palavras)
    // Só sinalizar se estiver em stage que precisa de informação detalhada
    if (wordCount < 5 && ['need', 'budget', 'authority'].includes(currentStage)) {
      // Verificar se tem informação útil
      const hasUsefulInfo = /\d+|[A-ZÀ-Ú][a-zà-ú]{2,}/.test(message); // Números ou nomes próprios

      if (!hasUsefulInfo) {
        result.needsRecovery = true;
        result.issueType = 'too_short';
        result.recoveryAction = 'ask_more_details';
        result.confidence = 70;
        return result;
      }
    }

    // 6. OFF-TOPIC ÓBVIO
    // Se menciona assuntos claramente não relacionados
    const offTopicPatterns = [
      /\b(futebol|jogo|copa|time)\b/i,
      /\b(receita|comida|cozinha|restaurante)\b/i,
      /\b(música|filme|série|netflix)\b/i
    ];

    // Só considerar off-topic se não estiver em contexto de negócio
    if (offTopicPatterns.some(p => p.test(text)) && !text.includes('negócio') && !text.includes('empresa')) {
      result.needsRecovery = true;
      result.issueType = 'off_topic';
      result.recoveryAction = 'redirect';
      result.confidence = 75;
      return result;
    }

    return result;
  }

  /**
   * GERAR MENSAGEM DE RECUPERAÇÃO
   * Cria mensagem apropriada para cada tipo de problema
   */
  async _generateRecoveryMessage(issueType, contactId, currentStage, lastQuestion, conversationHistory) {
    const attempts = this._getRecoveryAttempts(contactId);

    // Se já tentou recuperar muitas vezes, oferecer escalar
    if (attempts >= 3) {
      return `Vejo que estamos tendo dificuldades. Que tal eu te conectar com alguém da equipe que pode te ajudar melhor? Ou prefere continuar comigo?`;
    }

    switch (issueType) {
      case 'monosyllabic':
        return this._generateMonosyllabicRecovery(contactId, currentStage, lastQuestion);

      case 'vague':
        return this._generateVagueRecovery(contactId, currentStage, lastQuestion);

      case 'confused':
        return this._generateConfusedRecovery(contactId, currentStage, lastQuestion);

      case 'negative':
        return this._generateNegativeRecovery(contactId);

      case 'too_short':
        return this._generateTooShortRecovery(contactId, currentStage, lastQuestion);

      case 'off_topic':
        return this._generateOffTopicRecovery(contactId, currentStage);

      default:
        return 'Não entendi bem. Pode me explicar um pouco mais?';
    }
  }

  /**
   * RECUPERAÇÃO: Resposta monossilábica
   */
  _generateMonosyllabicRecovery(contactId, currentStage, lastQuestion) {
    const clarifications = {
      need: [
        'Deixa eu reformular: qual o principal desafio que você enfrenta no seu negócio hoje?',
        'Vou tentar de outro jeito: o que mais te preocupa ou toma seu tempo no dia a dia do negócio?',
        'Pra eu entender melhor: se você pudesse resolver UMA coisa no seu negócio agora, qual seria?'
      ],
      budget: [
        'Vou ser mais específico: pensando em investir numa solução pra te ajudar, você tem uma faixa em mente? Tipo até R$ 500, até R$ 1000?',
        'Deixa eu reformular: quanto você acha razoável investir por mês pra resolver esses problemas que mencionou?'
      ],
      authority: [
        'Entendi. Vou direto ao ponto: você decide sozinho sobre esse tipo de investimento ou precisa alinhar com alguém?',
        'Pra eu saber como prosseguir: você tem autonomia pra fechar esse tipo de decisão ou costuma consultar sócio/contador?'
      ],
      timing: [
        'Beleza. Mas me diz: você quer resolver isso logo (tipo nas próximas semanas) ou é algo que pode esperar uns meses?',
        'Pra eu entender a urgência: isso tá te prejudicando agora ou é mais um planejamento pro futuro?'
      ]
    };

    const stageOptions = clarifications[currentStage] || [
      'Pode me explicar um pouco melhor? Assim consigo te ajudar direito.',
      'Vou reformular de outro jeito: me conta mais sobre isso?'
    ];

    const selected = stageOptions[Math.floor(Math.random() * stageOptions.length)];
    return selected;
  }

  /**
   * RECUPERAÇÃO: Resposta vaga
   */
  _generateVagueRecovery(contactId, currentStage, lastQuestion) {
    const options = {
      need: [
        `Entendo que pode ser difícil definir. Vou te dar algumas opções, me diz qual mais se encaixa:

• Problema com controle financeiro (não sabe se tá dando lucro)
• Falta de organização na operação (equipe/processos)
• Falta de tempo/sobrecarga no dia a dia
• Outra coisa (me conta qual)`,

        `Tranquilo! Deixa eu facilitar: pensando no seu negócio hoje, o que mais te incomoda?

1. Questão de dinheiro (caixa, lucro, despesas)
2. Questão de pessoas (equipe, processos)
3. Questão pessoal (tempo, cansaço)

Me fala qual número ou descreve com suas palavras.`
      ],
      budget: [
        `Sem problema! Vou te dar uma referência: nossos planos variam de R$ 400 a R$ 1000/ano.

Pensando no problema que você tem, qual faixa faz mais sentido pra você:
• Até R$ 500/ano
• R$ 500-800/ano
• Acima de R$ 800/ano`,

        `Beleza! Vou ser direto: pra resolver o problema que você mencionou, o investimento seria algo entre R$ 400-1000 por ano.

Isso cabe no seu orçamento ou ficaria apertado?`
      ]
    };

    const stageOptions = options[currentStage] || [
      'Entendo. Que tal você me contar com suas próprias palavras? Sem pressão, do jeito que vier na cabeça.',
      'Sem problema! Não precisa ser exato. Me dá uma ideia geral, pode ser?'
    ];

    const selected = stageOptions[Math.floor(Math.random() * stageOptions.length)];
    return selected;
  }

  /**
   * RECUPERAÇÃO: Confusão
   */
  _generateConfusedRecovery(contactId, currentStage, lastQuestion) {
    return `Opa, foi mal! Deixa eu explicar melhor:

Eu tô aqui pra entender se a gente pode te ajudar com o negócio. Pra isso, preciso saber um pouco sobre:
• O que tá te atrapalhando hoje (seu maior desafio)
• Como é o seu negócio (tamanho, setor)

É só uma conversa rápida pra eu ver se faz sentido a gente continuar. Sem compromisso!

Me conta: qual a principal dor que você tem hoje no seu negócio?`;
  }

  /**
   * RECUPERAÇÃO: Negativa (não quer continuar agora)
   */
  _generateNegativeRecovery(contactId) {
    return `Entendi perfeitamente! Sem problema.

Quando você tiver um tempinho e quiser conversar sobre como organizar melhor o negócio, é só chamar aqui.

Quer que eu te lembre em outro momento ou prefere me procurar quando estiver disponível?`;
  }

  /**
   * RECUPERAÇÃO: Resposta muito curta
   */
  _generateTooShortRecovery(contactId, currentStage, lastQuestion) {
    return `Entendi! Mas pra eu conseguir te ajudar direito, preciso de um pouquinho mais de contexto.

Pode me contar um pouco mais sobre isso? Tipo: como isso afeta o seu dia a dia ou quanto isso te atrapalha?`;
  }

  /**
   * RECUPERAÇÃO: Off-topic
   */
  _generateOffTopicRecovery(contactId, currentStage) {
    const redirects = [
      `Haha, massa! Mas voltando pro nosso assunto: sobre o seu negócio, qual o principal desafio hoje?`,
      `Legal! Mas deixa eu te perguntar: focando no seu negócio, o que mais te preocupa no dia a dia?`,
      ` Entendi! Mas pra eu te ajudar, volta comigo aqui: qual a maior dificuldade que você enfrenta no negócio?`
    ];

    return redirects[Math.floor(Math.random() * redirects.length)];
  }

  /**
   * RASTREAMENTO: Contar tentativas de recuperação
   */
  _trackRecoveryAttempt(contactId) {
    const current = this.recoveryAttempts.get(contactId) || 0;
    this.recoveryAttempts.set(contactId, current + 1);

    // Limpar após 1 hora
    setTimeout(() => {
      this.recoveryAttempts.delete(contactId);
    }, 60 * 60 * 1000);
  }

  _getRecoveryAttempts(contactId) {
    return this.recoveryAttempts.get(contactId) || 0;
  }

  /**
   * RESETAR: Limpar tentativas de recuperação
   */
  resetRecovery(contactId) {
    this.recoveryAttempts.delete(contactId);
  }

  /**
   * VALIDAR RESPOSTA: Verificar se resposta tem conteúdo útil
   * Usado antes de processar para evitar extrações vazias
   */
  validateResponseQuality(message, context) {
    const { expectedFields = [], minWords = 3 } = context;

    const validation = {
      isValid: true,
      issues: [],
      confidence: 100
    };

    const text = message.trim();
    const wordCount = text.split(/\s+/).length;

    // 1. Muito curta
    if (wordCount < minWords) {
      validation.isValid = false;
      validation.issues.push('too_short');
      validation.confidence -= 40;
    }

    // 2. Sem informação útil (apenas pontuação/emojis)
    if (!/[a-zA-ZÀ-ÿ0-9]/.test(text)) {
      validation.isValid = false;
      validation.issues.push('no_content');
      validation.confidence -= 50;
    }

    // 3. Não contém informação esperada
    if (expectedFields.length > 0) {
      const hasExpectedInfo = expectedFields.some(field => {
        if (field === 'number') return /\d+/.test(text);
        if (field === 'name') return /[A-ZÀ-Ú][a-zà-ú]{2,}/.test(text);
        if (field === 'problem') return wordCount >= 5;
        return true;
      });

      if (!hasExpectedInfo) {
        validation.isValid = false;
        validation.issues.push('missing_expected_info');
        validation.confidence -= 30;
      }
    }

    return validation;
  }
}

// Singleton
let instance = null;

export function getConversationRecovery() {
  if (!instance) {
    instance = new ConversationRecovery();
  }
  return instance;
}

export default ConversationRecovery;

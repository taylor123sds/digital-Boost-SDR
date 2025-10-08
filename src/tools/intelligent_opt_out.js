import { saveMessage } from '../memory.js';

/**
 * Sistema Inteligente de Opt-out com Classificação de Intenção de Saída
 * Analisa diferentes tipos de recusa e categoriza para tratamento adequado
 */

// Padrões de Opt-out Definitivo (remoção imediata)
const DEFINITIVE_OPT_OUT_PATTERNS = [
    // Comandos diretos
    /\b(sair|parar|pare|stop|remover|remova|cancelar|cancela|descadastrar|descadastro)\b/i,
    // Recusa categórica
    /\b(não\s+quero\s+mais|nunca\s+mais|jamais|para\s+sempre|definitivamente\s+não)\b/i,
    // Bloqueios explícitos
    /\b(me\s+tire|retire|block|bloquear|bloqueia|spam|incomoda|enchendo)\b/i,
    // Frases de opt-out
    /\b(não\s+tenho\s+interesse\s+definitivo|zero\s+interesse|não\s+quero\s+contato)\b/i,
    // Palavras-chave específicas
    /\b(chato|irritante|perturbando|incomodando|enchendo\s+o\s+saco)\b/i
];

// Padrões de Recusa Temporária (reagendar/aguardar)
const TEMPORARY_REFUSAL_PATTERNS = [
    // Questões temporais
    /\b(agora\s+não|hoje\s+não|essa\s+semana\s+não|esse\s+mês\s+não|ocupado|ocupada)\b/i,
    /\b(mais\s+tarde|depois|futuramente|próximo\s+mês|próxima\s+semana)\b/i,
    /\b(não\s+é\s+um\s+bom\s+momento|momento\s+inadequado|hora\s+ruim)\b/i,
    // Condições específicas
    /\b(quando\s+precisar|se\s+interessar|talvez\s+mais\s+tarde|quem\s+sabe)\b/i,
    /\b(não\s+agora\s+mas|guarda\s+meu\s+contato|me\s+procura\s+depois)\b/i
];

// Padrões de Bloqueio Educado (nurturing approach)
const POLITE_BLOCKING_PATTERNS = [
    // Desculpas educadas
    /\b(obrigado\s+mas\s+não|agradeço\s+mas|valeu\s+mas\s+não)\b/i,
    /\b(não\s+preciso\s+no\s+momento|já\s+tenho\s+fornecedor|já\s+uso\s+outro)\b/i,
    // Declarações gentis
    /\b(não\s+faz\s+parte\s+do\s+nosso\s+orçamento|não\s+temos\s+verba|não\s+é\s+prioridade)\b/i,
    /\b(talvez\s+no\s+futuro|quem\s+sabe\s+mais\s+tarde|não\s+neste\s+momento)\b/i,
    // Respostas cordiais
    /\b(boa\s+sorte|sucesso\s+aí|valeu\s+a\s+tentativa)\b/i
];

// Padrões de Filtragem Automática (buscar decisor)
const AUTOMATIC_FILTERING_PATTERNS = [
    // Identificação de não-decisores
    /\b(não\s+sou\s+responsável|não\s+decido|não\s+é\s+comigo|fala\s+com)\b/i,
    /\b(sou\s+apenas|só\s+funcionário|não\s+tenho\s+autonomia|precisa\s+falar\s+com)\b/i,
    /\b(gerente|diretor|responsável|chefe|coordenador|supervisor)\b/i,
    // Redirecionamentos
    /\b(manda\s+email|liga\s+amanhã|horário\s+comercial|procura\s+o\s+setor)\b/i,
    /\b(não\s+atendo\s+vendas|não\s+é\s+minha\s+área|transferir|encaminhar)\b/i
];

// Respostas automáticas/bot
const BOT_RESPONSE_PATTERNS = [
    /\b(mensagem\s+automática|resposta\s+automática|ausente|férias)\b/i,
    /\b(retorno\s+em|estarei\s+de\s+volta|não\s+estou\s+disponível)\b/i,
    /\b(sistema\s+automático|bot|automatico)\b/i
];

/**
 * Classifica a intenção de opt-out de uma mensagem
 * @param {string} message - Mensagem a ser analisada
 * @param {string} phoneNumber - Número de telefone do contato
 * @returns {Object} Classificação da intenção
 */
export function classifyOptOutIntent(message, phoneNumber) {
    const msgLower = message.toLowerCase().trim();
    
    // Verifica resposta de bot primeiro
    const isBotResponse = BOT_RESPONSE_PATTERNS.some(pattern => pattern.test(msgLower));
    if (isBotResponse) {
        return {
            type: 'bot_response',
            confidence: 0.9,
            action: 'reschedule_later',
            reason: 'Resposta automática detectada',
            waitTime: 24 // horas
        };
    }

    // Verifica opt-out definitivo
    const isDefinitiveOptOut = DEFINITIVE_OPT_OUT_PATTERNS.some(pattern => pattern.test(msgLower));
    if (isDefinitiveOptOut) {
        return {
            type: 'definitive_opt_out',
            confidence: 0.95,
            action: 'remove_immediately',
            reason: 'Solicitação clara de remoção',
            message: 'Entendido! Seu número foi removido da nossa lista. Obrigado pelo retorno! 👍'
        };
    }

    // Verifica recusa temporária
    const isTemporaryRefusal = TEMPORARY_REFUSAL_PATTERNS.some(pattern => pattern.test(msgLower));
    if (isTemporaryRefusal) {
        return {
            type: 'temporary_refusal',
            confidence: 0.8,
            action: 'reschedule',
            reason: 'Recusa temporária - momento inadequado',
            waitTime: 168, // 7 dias
            message: 'Entendo! Vou aguardar um momento mais adequado. Obrigado pela gentileza! 😊'
        };
    }

    // Verifica bloqueio educado
    const isPoliteBlocking = POLITE_BLOCKING_PATTERNS.some(pattern => pattern.test(msgLower));
    if (isPoliteBlocking) {
        return {
            type: 'polite_blocking',
            confidence: 0.7,
            action: 'nurture',
            reason: 'Recusa educada - manter para nurturing',
            waitTime: 720, // 30 dias
            message: 'Sem problemas! Fico à disposição se precisar. Tenha um ótimo dia! 🌟'
        };
    }

    // Verifica filtragem automática
    const isAutomaticFiltering = AUTOMATIC_FILTERING_PATTERNS.some(pattern => pattern.test(msgLower));
    if (isAutomaticFiltering) {
        return {
            type: 'automatic_filtering',
            confidence: 0.85,
            action: 'find_decision_maker',
            reason: 'Não é o decisor - buscar responsável',
            waitTime: 72, // 3 dias
            message: 'Entendi! Consegue me passar o contato da pessoa responsável? Ou prefere que eu entre em contato em outro momento? 📞'
        };
    }

    // Não identificou como opt-out
    return {
        type: 'no_opt_out',
        confidence: 0.3,
        action: 'continue_conversation',
        reason: 'Não identificado como intenção de saída'
    };
}

/**
 * Processa ação de opt-out baseada na classificação
 * @param {string} phoneNumber - Número de telefone
 * @param {Object} classification - Classificação da intenção
 * @returns {Promise<Object>} Resultado do processamento
 */
export async function processOptOutAction(phoneNumber, classification) {
    const now = new Date();
    
    try {
        switch (classification.action) {
            case 'remove_immediately':
                // Remove da lista imediatamente
                await saveMessage(phoneNumber, 'system', `OPT_OUT_DEFINITIVO: ${classification.reason}`, {
                    classification: classification,
                    opt_out_date: now.toISOString(),
                    status: 'removed'
                });
                
                return {
                    success: true,
                    action_taken: 'removed',
                    message: classification.message,
                    should_respond: true
                };

            case 'reschedule':
                // Reagenda contato
                const rescheduleDate = new Date(now.getTime() + (classification.waitTime * 60 * 60 * 1000));
                
                await saveMessage(phoneNumber, 'system', `REAGENDADO: ${classification.reason}`, {
                    classification: classification,
                    next_contact: rescheduleDate.toISOString(),
                    status: 'scheduled'
                });
                
                return {
                    success: true,
                    action_taken: 'rescheduled',
                    next_contact: rescheduleDate.toISOString(),
                    message: classification.message,
                    should_respond: true
                };

            case 'reschedule_later':
                // Reagenda para mais tarde (resposta de bot)
                const laterDate = new Date(now.getTime() + (classification.waitTime * 60 * 60 * 1000));
                
                await saveMessage(phoneNumber, 'system', `REAGENDADO_BOT: ${classification.reason}`, {
                    classification: classification,
                    next_contact: laterDate.toISOString(),
                    status: 'scheduled'
                });
                
                return {
                    success: true,
                    action_taken: 'rescheduled_bot',
                    next_contact: laterDate.toISOString(),
                    should_respond: false // Não responde a bots
                };

            case 'nurture':
                // Coloca em lista de nurturing
                const nurtureDate = new Date(now.getTime() + (classification.waitTime * 60 * 60 * 1000));
                
                await saveMessage(phoneNumber, 'system', `NURTURING: ${classification.reason}`, {
                    classification: classification,
                    next_contact: nurtureDate.toISOString(),
                    status: 'nurturing'
                });
                
                return {
                    success: true,
                    action_taken: 'nurturing',
                    next_contact: nurtureDate.toISOString(),
                    message: classification.message,
                    should_respond: true
                };

            case 'find_decision_maker':
                // Busca decisor
                const findDecisionMakerDate = new Date(now.getTime() + (classification.waitTime * 60 * 60 * 1000));
                
                await saveMessage(phoneNumber, 'system', `BUSCAR_DECISOR: ${classification.reason}`, {
                    classification: classification,
                    next_contact: findDecisionMakerDate.toISOString(),
                    status: 'finding_decision_maker'
                });
                
                return {
                    success: true,
                    action_taken: 'finding_decision_maker',
                    next_contact: findDecisionMakerDate.toISOString(),
                    message: classification.message,
                    should_respond: true
                };

            case 'continue_conversation':
                // Continua conversa normalmente
                return {
                    success: true,
                    action_taken: 'continue',
                    should_respond: false
                };

            default:
                return {
                    success: false,
                    error: 'Ação desconhecida: ' + classification.action
                };
        }
    } catch (error) {
        console.error('❌ Erro ao processar ação de opt-out:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Verifica se um contato está em status de opt-out
 * @param {string} phoneNumber - Número de telefone
 * @returns {Promise<Object>} Status do contato
 */
export async function checkOptOutStatus(phoneNumber) {
    try {
        // Aqui você pode implementar a lógica para verificar no banco
        // Por agora, retorna status básico
        return {
            is_opted_out: false,
            status: 'active',
            last_interaction: null
        };
    } catch (error) {
        console.error('❌ Erro ao verificar status de opt-out:', error);
        return {
            is_opted_out: false,
            status: 'unknown',
            error: error.message
        };
    }
}

/**
 * Gera mensagem personalizada de opt-out para diferentes contextos
 * @param {string} context - Contexto da conversa (inicial, meio, fim)
 * @returns {string} Mensagem de opt-out
 */
export function generateOptOutMessage(context = 'initial') {
    const messages = {
        initial: 'Se em algum momento não quiser mais receber minhas mensagens, é só me avisar com um "sair", "parar" ou até um "não quero mais" que eu retiro seu número rapidinho, sem problema 😉',
        
        follow_up: 'Lembrando que se você quiser parar de receber essas mensagens, é só falar "sair" que eu respeito sua decisão na hora! 👍',
        
        final: 'E se não quiser mais contato, é só digitar "parar" que eu entendo perfeitamente! 🤝'
    };

    return messages[context] || messages.initial;
}

/**
 * Análise avançada de sentimento para opt-out
 * @param {string} message - Mensagem a ser analisada
 * @returns {Object} Análise de sentimento
 */
export function analyzeSentimentForOptOut(message) {
    const msgLower = message.toLowerCase();
    
    // Palavras negativas fortes
    const strongNegatives = ['ódio', 'detesto', 'irritante', 'chato', 'spam', 'incomoda'];
    const negativeCount = strongNegatives.filter(word => msgLower.includes(word)).length;
    
    // Palavras educadas
    const politeWords = ['obrigado', 'agradeço', 'desculpa', 'gentileza', 'educação'];
    const politeCount = politeWords.filter(word => msgLower.includes(word)).length;
    
    // Urgência
    const urgentWords = ['agora', 'imediatamente', 'já', 'pare'];
    const urgentCount = urgentWords.filter(word => msgLower.includes(word)).length;
    
    return {
        sentiment: negativeCount > 0 ? 'negative' : (politeCount > 0 ? 'polite' : 'neutral'),
        intensity: negativeCount + urgentCount,
        politeness_score: politeCount,
        urgency_score: urgentCount,
        recommendation: negativeCount > 1 ? 'immediate_removal' : 
                      politeCount > 0 ? 'gentle_approach' : 'standard_approach'
    };
}

export default {
    classifyOptOutIntent,
    processOptOutAction,
    checkOptOutStatus,
    generateOptOutMessage,
    analyzeSentimentForOptOut
};
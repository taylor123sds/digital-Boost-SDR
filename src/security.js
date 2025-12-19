/**
 * Security Module - PII Detection and Prompt Injection Protection
 * Protege contra vazamento de dados sensíveis e manipulação de prompts
 */

// Padrões de PII para detectar dados sensíveis
const PII_PATTERNS = {
    cpf: /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g,
    cnpj: /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g,
    creditCard: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
    phone: /\b(?:\+55\s?)?(?:\(?\d{2}\)?[\s-]?)?\d{4,5}[\s-]?\d{4}\b/g,
    email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    password: /\b(?:senha|password|pass|pwd)[\s:=]+\S+/gi,
    token: /\b(?:token|bearer|auth)[\s:=]+[A-Za-z0-9_-]{20,}/gi
};

// Palavras-chave suspeitas de prompt injection
const INJECTION_KEYWORDS = [
    'ignore previous',
    'ignore above',
    'ignore all',
    'disregard previous',
    'forget previous',
    'new instructions',
    'system prompt',
    'you are now',
    'pretend to be',
    'act as',
    'roleplay as',
    'ignore your instructions'
];

/**
 * Detecta e remove PII de um texto
 * @param {string} text - Texto a ser verificado
 * @returns {object} - {hasPII: boolean, sanitizedText: string, detectedTypes: array}
 */
export function detectAndSanitizePII(text) {
    if (!text || typeof text !== 'string') {
        return { hasPII: false, sanitizedText: text, detectedTypes: [] };
    }

    let sanitizedText = text;
    const detectedTypes = [];

    // Detectar e sanitizar cada tipo de PII
    for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
        if (pattern.test(text)) {
            detectedTypes.push(type);
            sanitizedText = sanitizedText.replace(pattern, `[${type.toUpperCase()}_REDACTED]`);
        }
    }

    return {
        hasPII: detectedTypes.length > 0,
        sanitizedText,
        detectedTypes
    };
}

/**
 * Valida se a mensagem do usuário contém tentativa de prompt injection
 * @param {string} message - Mensagem do usuário
 * @returns {object} - {isInjection: boolean, confidence: number, matchedPatterns: array}
 */
export function detectPromptInjection(message) {
    if (!message || typeof message !== 'string') {
        return { isInjection: false, confidence: 0, matchedPatterns: [] };
    }

    const lowerMessage = message.toLowerCase();
    const matchedPatterns = [];

    for (const keyword of INJECTION_KEYWORDS) {
        if (lowerMessage.includes(keyword.toLowerCase())) {
            matchedPatterns.push(keyword);
        }
    }

    // Calcular confiança baseado no número de padrões detectados
    const confidence = Math.min(matchedPatterns.length * 0.3, 1.0);

    return {
        isInjection: matchedPatterns.length > 0,
        confidence,
        matchedPatterns
    };
}

/**
 * Valida se uma mensagem do usuário contém solicitações de dados sensíveis
 * @param {string} message - Mensagem do usuário
 * @returns {boolean} - true se contém solicitação de dados sensíveis
 */
export function containsSensitiveDataRequest(message) {
    const sensitiveRequests = [
        /(?:me\s+)?(?:envie|mande|diga|informe|passe)\s+(?:seu|sua|o|a)\s+(?:cpf|senha|cart[aã]o|token)/i,
        /qual\s+(?:é|eh)\s+(?:seu|sua|o|a)\s+(?:cpf|senha|cart[aã]o|token)/i,
        /preciso\s+(?:do|da)\s+(?:seu|sua)\s+(?:cpf|senha|cart[aã]o|token)/i
    ];

    return sensitiveRequests.some(pattern => pattern.test(message));
}

/**
 * Sanitiza resposta do bot para garantir que não vaze informações sensíveis
 * @param {string} response - Resposta do bot
 * @returns {object} - {sanitized: string, removedPII: boolean}
 */
export function sanitizeBotResponse(response) {
    const { hasPII, sanitizedText, detectedTypes } = detectAndSanitizePII(response);

    if (hasPII) {
        console.warn(` PII detectado na resposta do bot: ${detectedTypes.join(', ')}`);
    }

    return {
        sanitized: sanitizedText,
        removedPII: hasPII,
        types: detectedTypes
    };
}

/**
 * Middleware de segurança completo para mensagens
 * @param {string} userMessage - Mensagem do usuário
 * @param {string} botResponse - Resposta do bot (opcional)
 * @returns {object} - Resultado da validação de segurança
 */
export function securityCheck(userMessage, botResponse = null) {
    const result = {
        isSecure: true,
        userMessage: {
            original: userMessage,
            sanitized: userMessage,
            hasPII: false,
            isInjection: false,
            containsSensitiveRequest: false
        },
        botResponse: null,
        warnings: []
    };

    // Verificar PII na mensagem do usuário
    const piiCheck = detectAndSanitizePII(userMessage);
    if (piiCheck.hasPII) {
        result.userMessage.hasPII = true;
        result.userMessage.sanitized = piiCheck.sanitizedText;
        result.warnings.push(`PII detectado na mensagem: ${piiCheck.detectedTypes.join(', ')}`);
    }

    // Verificar prompt injection
    const injectionCheck = detectPromptInjection(userMessage);
    if (injectionCheck.isInjection && injectionCheck.confidence > 0.5) {
        result.userMessage.isInjection = true;
        result.isSecure = false;
        result.warnings.push(`Possível prompt injection detectado (confiança: ${(injectionCheck.confidence * 100).toFixed(0)}%)`);
    }

    // Verificar solicitação de dados sensíveis
    if (containsSensitiveDataRequest(userMessage)) {
        result.userMessage.containsSensitiveRequest = true;
        result.isSecure = false;
        result.warnings.push('Solicitação de dados sensíveis detectada');
    }

    // Verificar resposta do bot se fornecida
    if (botResponse) {
        const responseCheck = sanitizeBotResponse(botResponse);
        result.botResponse = {
            original: botResponse,
            sanitized: responseCheck.sanitized,
            removedPII: responseCheck.removedPII
        };

        if (responseCheck.removedPII) {
            result.warnings.push(`PII removido da resposta: ${responseCheck.types.join(', ')}`);
        }
    }

    return result;
}

export default {
    detectAndSanitizePII,
    detectPromptInjection,
    containsSensitiveDataRequest,
    sanitizeBotResponse,
    securityCheck
};

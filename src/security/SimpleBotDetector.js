/**
 * @file SimpleBotDetector.js
 * @description Sistema SIMPLES e FUNCIONAL de Detecção de Bot
 *
 * Estratégia:
 * 1. Foco em tempo de resposta (indicador mais confiável)
 * 2. Verificação direta em 1 passo
 * 3. Sem complexidade desnecessária
 *
 * @version 1.0.0 - Sistema Novo e Simplificado
 */

//  FIX: Usar getDatabase() que verifica e reconecta se necessário
import { getDatabase } from '../db/index.js';
import { normalizePhone } from '../utils/phone_normalizer.js';
import log from '../utils/logger-wrapper.js';

// ═══════════════════════════════════════════════════════════════
// CONFIGURAÇÃO
// ═══════════════════════════════════════════════════════════════

const CONFIG = {
  // Tempo de resposta suspeito (2 segundos)
  SUSPICIOUS_RESPONSE_TIME_MS: 2000,

  // Número mínimo de mensagens para começar a detectar
  MIN_MESSAGES_TO_DETECT: 2,

  // Timeout para responder verificação (60 segundos)
  VERIFICATION_TIMEOUT_MS: 60000,

  //  FIX P0-B: Palavras de confirmação humana EXPANDIDAS
  // Qualquer resposta substantiva deve ser aceita como humana
  HUMAN_KEYWORDS: [
    'sim',
    'sou humano',
    'humano',
    'pessoa',
    'claro',
    'sim sou',
    'óbvio',
    'obvio',
    //  NOVO: Respostas naturais de atendentes reais
    'boa tarde',
    'bom dia',
    'boa noite',
    'vou te',
    'vou enviar',
    'vou passar',
    'te enviar',
    'contato do',
    'setor',
    'responsável',
    'responsavel',
    'atendente',
    'momento',
    'aguarde'
  ],

  // ═══════════════════════════════════════════════════════════════
  //  FIX v2.1: PADRÕES DE CONTEÚDO PARA DETECTAR AUTO-RESPONDERS
  // IMPORTANTE: Padrões ajustados após análise de mensagens reais
  // ═══════════════════════════════════════════════════════════════
  AUTO_RESPONSE_PATTERNS: [
    //  FIX: Padrão "X agradece seu contato. Como podemos ajudar?" - MUITO COMUM
    // Ex: "Potengi Solar agradece seu contato. Como podemos ajudar?"
    /agradece\s+(o\s+)?(seu|sua)\s+(contato|mensagem).*como\s+podemos\s+ajudar/i,
    /agradecemos\s+(o\s+)?(seu|sua)\s+(contato|mensagem)/i,

    //  FIX: Padrões de menu automático COM ASTERISCOS
    // Ex: "*[ 1 ]* - Orçamento" ou "[ 1 ] - Orçamento"
    /\*?\[\s*\d+\s*\]\*?\s*[-–—:]\s*\w+/i,     // Com ou sem asteriscos
    /digite\s+\d+\s+(para|pra)/i,
    /tecle\s+\d+\s+(para|pra)/i,
    /^\s*\*?\d+\*?\s*[-–—\.]\s*(orçamento|financeiro|sac|suporte|vendas|comercial|engenharia)\s*$/im,
    /selecione\s+(uma\s+)?(das\s+)?opç/i,
    /escolha\s+(uma\s+)?(das\s+)?opç/i,
    /menu\s+(principal|de\s+atendimento)/i,

    //  FIX: Padrões de espera automática (aguarde/transfiro)
    // Ex: "Aguarde enquanto transfiro para um atendente..."
    /aguarde\s+enquanto\s+(transferimos|transfiro|direcionamos|encaminho)/i,
    /aguardando\s+(atendente|consultor|atendimento)/i,
    /em\s+breve\s+um\s+(de\s+nossos\s+)?(atendente|consultor)/i,
    /transferindo\s+(para|você)/i,

    //  FIX: Padrões de assistente/bot se identificando
    // Ex: "Sou a Lumina, assistente da Ergo Solar"
    /sou\s+(a|o)\s+\w+,?\s*assistente\s+(da|do|de)/i,
    /assistente\s+(virtual|digital|automatizado)/i,
    /aqui\s+é\s+(a|o)\s+\w+\s+(da|do)\s+\w+/i,  // "Aqui é a X da Y"

    //  FIX: Padrões de canal exclusivo/restrição
    // Ex: "Este canal é exclusivo para..."
    /este\s+canal\s+(é\s+)?exclusivo\s+(para|de)/i,
    /canal\s+exclusivo\s+para/i,
    /não\s+posso\s+responder\s+(suas?\s+)?perguntas\s+(aqui|neste\s+canal)/i,

    // Padrões de ausência/horário
    /fora\s+do\s+horário\s+(de\s+)?atendimento/i,
    /nosso\s+horário\s+de\s+atendimento\s+é/i,
    /retornaremos\s+(o\s+)?(seu\s+)?contato/i,

    // Padrões de recebemos sua mensagem
    /recebemos\s+(sua|a\s+sua)\s+mensagem/i,
    /sua\s+mensagem\s+foi\s+recebida/i,

    // Padrões de confirmação de dados
    /preciso\s+confirmar\s+algumas\s+informações/i,
    /poderia\s+por\s+gentileza\s+confirmar\s+(seu|sua)/i,

    //  FIX: Padrões de saudação automática com emoji seguido de apresentação
    // Ex: " Olá! Que bom ter você por aqui! Você está falando com..."
    /você\s+está\s+falando\s+com\s+(a|o)/i,
    /está\s+falando\s+com\s+a\s+[\w\s]+,?\s+especialista/i,

    //  FIX v2.2: Padrões de bots que se apresentam com nome próprio
    // Ex: "Eu sou a Luma. Seja bem-vindo!" ou "Sou a Ana, da Solar X"
    /sou\s+(a|o)\s+\w+[.!]?\s*(seja\s+bem|prazer|bem[- ]?vind)/i,
    /eu\s+sou\s+(a|o)\s+\w+[.!,]?\s*(seja|prazer|bem[- ]?vind)/i,
    /prazer\s+em\s+falar\s+com\s+você/i,

    //  FIX v2.2: Padrões de bots de eventos/promoções
    // Ex: "Ficamos felizes com sua presença no evento"
    /ficamos\s+(muito\s+)?felizes\s+(com|pela)\s+(sua|a\s+sua)\s+(presença|mensagem)/i,
    /preparamos\s+(um|uma)\s+(condição|oferta|promoção)\s+(especial|exclusiv)/i,
    /evento\s+[\w\s]+[.!]?\s*nós\s+da/i,
    /sua\s+presença\s+(aqui\s+)?(no|neste)\s+evento/i,

    //  FIX v2.2: Padrões de perguntas genéricas de bot
    // Ex: "Você já é cliente X ou está buscando adquirir?"
    /você\s+já\s+é\s+cliente\s+[\w\s]+\s+ou\s+(está|quer)\s+(buscando|procurando)/i,
    /como\s+posso\s+(te\s+)?ajudar\s+hoje\s*\?/i,
    /em\s+que\s+posso\s+(te\s+)?ajudar\s*\?/i,
    /vamos\s+dar\s+continuidade\s+(ao|no)\s+(nosso\s+)?atendimento/i,

    //  FIX v2.2: Padrões de follow-up automático
    // Ex: "Olá, você ainda está por aí?"
    /você\s+ainda\s+(está|esta)\s+por\s+a[íi]/i,
    /podemos\s+dar\s+segmento/i,
    /vamos\s+começar\s+a\s+economizar/i
  ],

  //  FIX v2.1: Padrões de empresa/apresentação automática
  AUTO_RESPONSE_COMPANY_PATTERNS: [
    // Padrões de bot/assistente se identificando explicitamente
    /^\s*olá[,!]?\s+aqui\s+é\s+(o|a)\s+[\w\s]+\s+bot/i,
    /^\s*sou\s+(o|a|um|uma)\s+(bot|assistente\s+virtual|robô)/i,

    //  FIX: Padrão "Bem-vindo à Empresa. Como podemos..."
    /bem[- ]?vind[oa]\s+(ao?|à)\s+[\w\s]+[.!]?\s*(como\s+podemos|em\s+que\s+podemos)/i,

    //  FIX: Padrão "Olá! Seja bem-vindo(a) ao X"
    /seja\s+bem[- ]?vind[oa](\(a\))?\s+(ao?|à|no)\s+\w+/i,

    //  FIX: Padrão de irei iniciar atendimento
    /irei\s+iniciar\s+(o\s+)?(seu\s+)?atendimento/i
  ]
};

// ═══════════════════════════════════════════════════════════════
// SIMPLE BOT DETECTOR
// ═══════════════════════════════════════════════════════════════

class SimpleBotDetector {
  constructor() {
    this.responseTimes = new Map(); // contactId -> { lastIncoming, lastOutgoing }
    this.verificationPending = new Map(); // contactId -> timestamp
    this.initDB();

    //  FIX: Cleanup interval to prevent memory leaks
    this._startCleanupInterval();
  }

  /**
   *  FIX: Periodic cleanup of in-memory Maps to prevent memory leaks
   * Removes entries older than 1 hour
   */
  _startCleanupInterval() {
    const CLEANUP_INTERVAL_MS = 60 * 1000; // 1 minute
    const MAX_AGE_MS = 60 * 60 * 1000; // 1 hour

    setInterval(async () => {
      try {
        const now = Date.now();
        let cleanedResponses = 0;
        let cleanedVerifications = 0;

        // Clean responseTimes
        for (const [contactId, data] of this.responseTimes.entries()) {
          const lastActivity = Math.max(data.lastIncoming || 0, data.lastOutgoing || 0);
          if (now - lastActivity > MAX_AGE_MS) {
            this.responseTimes.delete(contactId);
            cleanedResponses++;
          }
        }

        // Clean verificationPending -  FIX: BLOQUEAR quem não respondeu à verificação
        for (const [contactId, timestamp] of this.verificationPending.entries()) {
          // Se passou do timeout de verificação (60s), BLOQUEAR como bot
          if (now - timestamp > CONFIG.VERIFICATION_TIMEOUT_MS) {
            // Bloquear permanentemente - não confirmou ser humano
            //  FIX GAP-003: Usar await para garantir que cadence para
            await this.block(contactId, 'verification_timeout');
            this.verificationPending.delete(contactId);
            cleanedVerifications++;
            log.warn(` [BOT] Bloqueado por timeout de verificação: ${contactId}`);
          }
          // Limpar registros muito antigos (1h) que ainda não foram processados
          else if (now - timestamp > MAX_AGE_MS) {
            this.verificationPending.delete(contactId);
            cleanedVerifications++;
          }
        }

        if (cleanedResponses > 0 || cleanedVerifications > 0) {
          log.debug(` [BOT] Cleanup: ${cleanedResponses} responseTimes, ${cleanedVerifications} verifications removed`);
        }
      } catch (cleanupError) {
        log.error(' [BOT] Erro no cleanup interval', { error: cleanupError.message });
      }
    }, CLEANUP_INTERVAL_MS);

    log.info(' [BOT] Cleanup interval started (1 min cycle, 1h max age)');
  }

  /**
   * Inicializa banco de dados (apenas lista de bloqueados)
   */
  initDB() {
    //  FIX: Obter conexão fresh
    const db = getDatabase();
    db.exec(`
      CREATE TABLE IF NOT EXISTS bot_blocked (
        phone_number TEXT PRIMARY KEY,
        blocked_at TEXT DEFAULT CURRENT_TIMESTAMP,
        reason TEXT
      )
    `);

    log.info(' SimpleBotDetector: Tabela bot_blocked inicializada');
  }

  /**
   * MÉTODO PRINCIPAL: Detecta bot e processa mensagem
   *
   * @param {string} contactId - ID do contato
   * @param {string} messageText - Texto da mensagem recebida
   * @param {Object} context - Contexto (messageCount, etc)
   * @returns {Object} { allowed: boolean, reason?: string, action?: string }
   */
  async check(contactId, messageText, context = {}) {
    const phone = normalizePhone(contactId);

    log.info(` [BOT] Verificando: ${phone}`);

    // ═══════════════════════════════════════════════════════════
    // STEP 1: Verificar se está bloqueado
    // ═══════════════════════════════════════════════════════════

    if (this.isBlocked(phone)) {
      log.warn(` [BOT] Bloqueado: ${phone}`);
      return {
        allowed: false,
        reason: 'blocked',
        isBot: true
      };
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 1.5:  FIX - DETECTAR AUTO-RESPOSTA POR CONTEÚDO
    // Esta é a primeira verificação após bloqueio pois é a mais confiável
    // ═══════════════════════════════════════════════════════════

    const autoResponseCheck = this.detectAutoResponse(messageText);
    if (autoResponseCheck.isAutoResponse) {
      log.warn(` [BOT] AUTO-RESPOSTA detectada: "${autoResponseCheck.matchedPattern}"`);
      log.warn(` [BOT] Mensagem: "${messageText.substring(0, 100)}..."`);

      //  FIX: Auto-respostas agora PEDEM VERIFICAÇÃO HUMANA
      // Isso garante que o lead não vá para cadência sem confirmar que é humano
      this.verificationPending.set(phone, Date.now());

      return {
        allowed: false,
        isBot: true,
        isAutoResponse: true,
        reason: 'auto_response_detected',
        matchedPattern: autoResponseCheck.matchedPattern,
        action: 'send_verification', //  CHANGED: Pedir verificação humana
        message: this.getAutoResponseVerificationMessage() //  NEW: Mensagem específica para auto-resposta
      };
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 2: Se está aguardando verificação, processar resposta
    // ═══════════════════════════════════════════════════════════

    if (this.verificationPending.has(phone)) {
      return await this.processVerification(phone, messageText);
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 3: Registrar tempo de entrada da mensagem
    // ═══════════════════════════════════════════════════════════

    const now = Date.now();

    if (!this.responseTimes.has(phone)) {
      this.responseTimes.set(phone, {
        lastIncoming: now,
        lastOutgoing: null,
        messageCount: 1
      });

      log.info(` [BOT] Primeira mensagem - permitindo: ${phone}`);
      return { allowed: true, isBot: false };
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 4: Calcular tempo de resposta
    // ═══════════════════════════════════════════════════════════

    const times = this.responseTimes.get(phone);
    times.messageCount++;

    // Precisa ter pelo menos MIN_MESSAGES_TO_DETECT mensagens
    if (times.messageCount < CONFIG.MIN_MESSAGES_TO_DETECT) {
      times.lastIncoming = now;
      this.responseTimes.set(phone, times);

      log.info(` [BOT] Mensagem ${times.messageCount} - ainda não detecta: ${phone}`);
      return { allowed: true, isBot: false };
    }

    // Se não temos registro de resposta nossa, não podemos calcular
    if (!times.lastOutgoing) {
      times.lastIncoming = now;
      this.responseTimes.set(phone, times);

      log.info(` [BOT] Sem resposta prévia registrada - permitindo: ${phone}`);
      return { allowed: true, isBot: false };
    }

    // Calcular tempo de resposta (tempo entre nossa resposta e a mensagem dele)
    const responseTime = now - times.lastOutgoing;

    log.info(`  [BOT] Tempo de resposta: ${responseTime}ms (limite: ${CONFIG.SUSPICIOUS_RESPONSE_TIME_MS}ms)`);

    // ═══════════════════════════════════════════════════════════
    // STEP 5: Detectar bot por tempo de resposta
    // ═══════════════════════════════════════════════════════════

    if (responseTime < CONFIG.SUSPICIOUS_RESPONSE_TIME_MS) {
      log.warn(`  [BOT] Resposta MUITO RÁPIDA detectada! Iniciando verificação...`);

      // Marcar como aguardando verificação
      this.verificationPending.set(phone, Date.now());

      return {
        allowed: false,
        isBot: true,
        action: 'send_verification',
        message: this.getVerificationMessage(),
        responseTime
      };
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 6: Tudo OK - atualizar timestamp e permitir
    // ═══════════════════════════════════════════════════════════

    times.lastIncoming = now;
    this.responseTimes.set(phone, times);

    log.success(` [BOT] Tempo normal - permitindo: ${phone}`);
    return {
      allowed: true,
      isBot: false,
      responseTime
    };
  }

  /**
   * Registra quando enviamos uma mensagem (para calcular tempo de resposta)
   */
  recordOutgoingMessage(contactId) {
    const phone = normalizePhone(contactId);
    const now = Date.now();

    const times = this.responseTimes.get(phone) || {
      lastIncoming: null,
      lastOutgoing: null,
      messageCount: 0
    };

    times.lastOutgoing = now;
    this.responseTimes.set(phone, times);

    log.info(` [BOT] Registrado envio para: ${phone}`);
  }

  /**
   * Processa resposta de verificação humana
   *  FIX GAP-003: Agora é async para garantir que cadence para antes de retornar
   */
  async processVerification(phone, messageText) {
    const verificationTime = this.verificationPending.get(phone);
    const elapsed = Date.now() - verificationTime;

    // Verificar timeout
    if (elapsed > CONFIG.VERIFICATION_TIMEOUT_MS) {
      log.warn(` [BOT] Timeout de verificação - bloqueando: ${phone}`);
      await this.block(phone, 'verification_timeout');

      return {
        allowed: false,
        isBot: true,
        reason: 'verification_timeout'
      };
    }

    // Verificar se confirmou que é humano
    const isHuman = this.isHumanConfirmation(messageText);

    if (isHuman) {
      log.success(` [BOT] VERIFICADO como humano: ${phone}`);

      // Remover da lista de verificação pendente
      this.verificationPending.delete(phone);

      // Resetar contadores para dar nova chance
      this.responseTimes.delete(phone);

      return {
        allowed: true,
        isBot: false,
        verified: true,
        message: ' Verificação confirmada! Pode continuar conversando normalmente.'
      };
    }

    // Não confirmou - bloquear
    log.warn(` [BOT] Não confirmou humanidade - bloqueando: ${phone}`);
    await this.block(phone, 'failed_verification');

    return {
      allowed: false,
      isBot: true,
      reason: 'failed_verification',
      message: ' Não foi possível verificar que você é humano. Conversa encerrada.'
    };
  }

  /**
   * Verifica se mensagem confirma humanidade
   *
   *  FIX P0-C: Aceitar mensagens substantivas como confirmação
   * Um humano real vai responder com contexto, não com padrões de bot
   */
  isHumanConfirmation(text) {
    if (!text || typeof text !== 'string') return false;

    const clean = text.toLowerCase().trim();

    // 1. Verificar keywords explícitas
    const hasKeyword = CONFIG.HUMAN_KEYWORDS.some(keyword => {
      return clean.includes(keyword);
    });

    if (hasKeyword) {
      log.info(' [BOT] Confirmação por keyword detectada');
      return true;
    }

    // 2.  FIX: Aceitar mensagens substantivas (> 20 chars) sem padrões de bot
    // Um humano real vai escrever coisas como "vou passar o contato do setor"
    if (clean.length > 20 && !this.detectAutoResponse(text).isAutoResponse) {
      log.info(' [BOT] Confirmação por mensagem substantiva (> 20 chars, sem padrão bot)');
      return true;
    }

    // 3.  FIX: Se a mensagem contém números (telefone, etc), provavelmente é humano
    const hasPhoneOrNumber = /\d{4,}/.test(clean);
    if (hasPhoneOrNumber) {
      log.info(' [BOT] Confirmação por presença de número (possível telefone/contato)');
      return true;
    }

    return false;
  }

  /**
   *  FIX: Detecta mensagens de auto-resposta por conteúdo
   * Identifica padrões típicos de secretária eletrônica, bots empresariais, etc.
   *
   * @param {string} text - Texto da mensagem
   * @returns {Object} { isAutoResponse: boolean, matchedPattern?: string }
   */
  detectAutoResponse(text) {
    if (!text || typeof text !== 'string') {
      return { isAutoResponse: false };
    }

    //  FIX v2.1: Remover caracteres invisíveis/controle do início da mensagem
    // WhatsApp às vezes adiciona caracteres como ‎ (U+200E), ‏ (U+200F), etc.
    const cleanText = text
      .replace(/^[\u200B-\u200F\u2028-\u202F\uFEFF\s]+/, '') // Remove zero-width chars e whitespace do início
      .replace(/[\u200B-\u200F\u2028-\u202F\uFEFF]/g, '')    // Remove todos os zero-width chars
      .trim();

    // Verificar padrões de auto-resposta
    for (const pattern of CONFIG.AUTO_RESPONSE_PATTERNS) {
      if (pattern.test(cleanText)) {
        return {
          isAutoResponse: true,
          matchedPattern: pattern.toString(),
          patternType: 'auto_response'
        };
      }
    }

    // Verificar padrões de "[Empresa] agradece"
    for (const pattern of CONFIG.AUTO_RESPONSE_COMPANY_PATTERNS) {
      if (pattern.test(cleanText)) {
        return {
          isAutoResponse: true,
          matchedPattern: pattern.toString(),
          patternType: 'company_greeting'
        };
      }
    }

    return { isAutoResponse: false };
  }

  /**
   *  FIX: Método público para verificar auto-resposta sem contexto completo
   * Útil para verificação rápida antes de processar
   *
   * @param {string} text - Texto da mensagem
   * @returns {boolean}
   */
  isAutoResponse(text) {
    return this.detectAutoResponse(text).isAutoResponse;
  }

  /**
   * Bloqueia contato permanentemente
   *  FIX P0: Also stops any active cadence for this contact
   *  FIX GAP-003: Usa await para garantir que cadence para ANTES de continuar
   */
  async block(contactId, reason) {
    const phone = normalizePhone(contactId);

    //  FIX: Obter conexão fresh
    const db = getDatabase();
    db.prepare(`
      INSERT OR REPLACE INTO bot_blocked (phone_number, reason)
      VALUES (?, ?)
    `).run(phone, reason);

    this.verificationPending.delete(phone);
    this.responseTimes.delete(phone);

    log.warn(` [BOT] BLOQUEADO: ${phone} - Razão: ${reason}`);

    //  FIX GAP-003: Stop cadence SYNCHRONOUSLY to avoid race condition
    // Use dynamic import to avoid circular dependency, but AWAIT the result
    try {
      const { getCadenceEngine } = await import('../automation/CadenceEngine.js');
      const cadenceEngine = getCadenceEngine();
      const result = cadenceEngine.stopCadenceForBot(phone);
      if (result.stopped) {
        log.info(` [BOT]  Cadence STOPPED for blocked bot: ${phone}`);
      } else if (result.message === 'no_enrollment') {
        log.debug(` [BOT] No active cadence to stop for: ${phone}`);
      }
    } catch (cadenceError) {
      log.error(` [BOT]  CRITICAL: Could not stop cadence for ${phone}: ${cadenceError.message}`);
      // Log mas não falha - o bloqueio já foi feito
    }
  }

  /**
   * Verifica se contato está bloqueado
   */
  isBlocked(contactId) {
    const phone = normalizePhone(contactId);

    //  FIX: Obter conexão fresh
    const db = getDatabase();
    const result = db.prepare(`
      SELECT 1 FROM bot_blocked WHERE phone_number = ?
    `).get(phone);

    return !!result;
  }

  /**
   * Desbloqueia contato (admin)
   */
  unblock(contactId) {
    const phone = normalizePhone(contactId);

    //  FIX: Obter conexão fresh
    const db = getDatabase();
    db.prepare(`
      DELETE FROM bot_blocked WHERE phone_number = ?
    `).run(phone);

    this.verificationPending.delete(phone);
    this.responseTimes.delete(phone);

    log.info(` [BOT] Desbloqueado: ${phone}`);
  }

  /**
   * Mensagem de verificação (resposta muito rápida)
   */
  getVerificationMessage() {
    return ` **Verificação Necessária**

Detectei que você está respondendo muito rápido.

Para continuar, preciso confirmar que você é uma pessoa real.

 **Responda com: SIM**

Aguardo sua confirmação em 60 segundos.`;
  }

  /**
   * Mensagem de verificação para auto-resposta detectada
   * (secretária eletrônica, chatbot, etc)
   */
  getAutoResponseVerificationMessage() {
    return ` Percebi que recebi uma mensagem automática.

Se você é uma pessoa real e quer continuar a conversa, por favor responda com **SIM**.

Caso contrário, posso tentar novamente mais tarde. `;
  }

  /**
   * Estatísticas
   */
  getStats() {
    //  FIX: Obter conexão fresh
    const db = getDatabase();
    const blocked = db.prepare(`
      SELECT COUNT(*) as count FROM bot_blocked
    `).get();

    return {
      blocked: blocked.count,
      pendingVerification: this.verificationPending.size,
      tracking: this.responseTimes.size
    };
  }

  /**
   * Limpar dados de um contato (admin)
   */
  clear(contactId) {
    const phone = normalizePhone(contactId);
    this.responseTimes.delete(phone);
    this.verificationPending.delete(phone);
    log.info(` [BOT] Dados limpos: ${phone}`);
  }
}

// ═══════════════════════════════════════════════════════════════
// EXPORT SINGLETON
// ═══════════════════════════════════════════════════════════════

const simpleBotDetector = new SimpleBotDetector();

export default simpleBotDetector;
export { CONFIG };

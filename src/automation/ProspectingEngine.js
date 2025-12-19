/**
 * @file ProspectingEngine.js
 * @description Motor de Prospecção Automática - Arquitetura Enterprise
 *
 * Responsabilidades:
 * 1. Buscar leads novos da Sheets1 (fonte de prospecção)
 * 2. Validar e filtrar leads elegíveis
 * 3. Enviar mensagem inicial via WhatsApp
 * 4. Mover lead para funil (Sheets + DB)
 * 5. Remover da lista de prospecção
 * 6. Controlar rate limiting (5 min entre envios)
 *
 * @author ORBION Team
 * @version 2.0.0
 */

import { getDatabase } from '../db/index.js';
import { leadRepository } from '../repositories/lead.repository.js';
//  MIGRADO: Agora usa SQLite (prospect_leads) como fonte principal
// Google Sheets usado apenas para sync opcional
import { getLeadsFromGoogleSheets } from '../tools/google_sheets.js';
import { moveLeadFromProspectingToFunil } from '../utils/sheetsManager.js';
import { getNextProspect, updateProspectStatus, moveProspectToLeads, getProspectStats } from '../services/ProspectImportService.js';
import { sendWhatsAppMessage } from '../tools/whatsapp.js';
import { saveLeadState, getLeadState } from '../utils/stateManager.js';
import { createInitialState } from '../schemas/leadState.schema.js';
import { normalizePhone } from '../utils/phone_normalizer.js';
import log from '../utils/logger-wrapper.js';
import { acquireFirstContactLock, markFirstMessageSent, wasFirstMessageSent } from '../utils/first_contact_lock.js';
import { getCadenceEngine } from './CadenceEngine.js';
import simpleBotDetector from '../security/SimpleBotDetector.js';

// ═══════════════════════════════════════════════════════════════════════════
// TIMEZONE HELPER - HORÁRIO DE BRASÍLIA (UTC-3)
// ═══════════════════════════════════════════════════════════════════════════

/**
 *  FIX v2.1.0: Retorna horário atual de Brasília (UTC-3)
 * O servidor está em UTC, mas precisamos verificar horário comercial em Brasília
 *
 * @returns {Object} { hour, minute, day, date }
 */
function getBrasiliaTime() {
  const now = new Date();

  // Usar Intl.DateTimeFormat para conversão precisa de timezone
  const brasiliaFormatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: 'numeric',
    minute: 'numeric',
    weekday: 'short',
    hour12: false
  });

  const parts = brasiliaFormatter.formatToParts(now);
  const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
  const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
  const weekday = parts.find(p => p.type === 'weekday')?.value || '';

  // Mapear dia da semana em português para número (0=Dom, 1=Seg, etc)
  const dayMap = {
    'dom': 0, 'dom.': 0,
    'seg': 1, 'seg.': 1,
    'ter': 2, 'ter.': 2,
    'qua': 3, 'qua.': 3,
    'qui': 4, 'qui.': 4,
    'sex': 5, 'sex.': 5,
    'sáb': 6, 'sab': 6, 'sáb.': 6, 'sab.': 6
  };

  const day = dayMap[weekday.toLowerCase()] ?? now.getDay();

  return { hour, minute, day, date: now };
}

/**
 * Estados possíveis do Engine
 */
const EngineState = {
  STOPPED: 'stopped',
  RUNNING: 'running',
  PAUSED: 'paused',
  PROCESSING: 'processing'
};

/**
 * Motivos de skip de lead
 */
const SkipReason = {
  INVALID_PHONE: 'invalid_phone',
  ALREADY_PROSPECTED: 'already_prospected',
  ALREADY_PROSPECTED_EVER: 'already_prospected_ever', //  NEW: Já foi prospectado alguma vez
  BOT_DETECTED: 'bot_detected', //  NEW: Detectado como bot pelo SimpleBotDetector
  BLOCKED: 'blocked',
  OPT_OUT: 'opt_out',
  RECENTLY_CONTACTED: 'recently_contacted',
  OUTSIDE_WORK_HOURS: 'outside_work_hours',
  DAILY_LIMIT_REACHED: 'daily_limit_reached',
  NO_EMAIL_OPTIN: 'no_email_optin' //  NEW: Lead não recebeu email de opt-in ainda
};

class ProspectingEngine {
  constructor() {
    // Estado do engine
    this.state = EngineState.STOPPED;
    this.timerId = null;
    this.schedulerId = null;      // Timer do agendador diário

    // Fila de processamento
    this.queue = [];
    this.currentLead = null;

    // Controle de processamento
    this.processedPhones = new Set(); // Cache de telefones já processados na sessão

    // Métricas
    this.metrics = {
      sessionStart: null,
      totalProcessed: 0,
      totalSent: 0,
      totalFailed: 0,
      totalSkipped: 0,
      skipReasons: {},
      lastProcessedAt: null,
      errors: []
    };

    // Configuração padrão
    this.config = {
      // Timing -  ANTI-BLOQUEIO: Intervalos variáveis
      intervalMinutes: 5,           // Intervalo BASE (fallback)
      startHour: 8,                 // Início do expediente
      endHour: 18,                  // Fim do expediente
      workDays: [1, 2, 3, 4, 5],   // Seg-Sex (0=Dom, 6=Sab)

      //  ANTI-BLOQUEIO: Padrão de intervalos variáveis (em minutos)
      // Evita padrão detectável pelo WhatsApp
      //  FIX v2.1.0: Mínimo 5 minutos (antes era 1 minuto - muito rápido!)
      intervalPattern: [5, 7, 6, 8, 10, 12, 6, 9, 7, 11, 8, 10],
      useIntervalPattern: true,     // Usar padrão variável
      jitterSeconds: 30,            // Jitter máximo (±30 segundos)

      // Limites
      maxPerDay: 100,               // Máximo de leads/dia
      maxRetries: 3,                // Tentativas por lead
      cooldownHours: 24,            // Horas antes de recontatar

      // Mensagem
      messageTemplate: null,        // Template customizado

      // Flags
      autoStart: true,              // Iniciar automaticamente
      dryRun: false                 // Modo teste (não envia)
    };

    // Índice do padrão de intervalos
    this.intervalPatternIndex = 0;

    //  ANTI-BLOQUEIO: Controle de aquecimento
    this.warmupState = {
      isWarmingUp: true,          // Se está em período de aquecimento
      messagesInWarmup: 0,        // Mensagens enviadas no warmup
      warmupLimit: 5,             // Limite de mensagens no warmup
      warmupIntervalMultiplier: 2 // Multiplicador de intervalo no warmup
    };

    // Iniciar agendador automático
    this._initDailyScheduler();

    // Template padrão - Mensagem humanizada e casual
    //  PERSONALIZADO: {nome} = nome do contato/empresa, {regiao} = cidade/região, {empresa} = nome da empresa
    this.defaultTemplate = `E aí, beleza? 

Achei a {empresa} aqui e queria te fazer uma pergunta rápida:

Como vocês fazem hoje pra receber orçamentos? Tipo, o pessoal te acha mais pelo Instagram, indicação ou Google?

Trabalho ajudando empresas a captar mais clientes online e queria entender se faz sentido a gente conversar.

Se não tiver interesse, só me avisa que não insisto!`;

    // Inicializar tabela de controle
    this._initDatabase();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AGENDADOR AUTOMÁTICO DIÁRIO
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Inicializa agendador que verifica a cada minuto:
   * - Se é dia útil e hora de trabalho  auto-start
   * - Se saiu do horário  auto-pause
   * - À meia-noite  reset contadores
   */
  _initDailyScheduler() {
    log.info('[PROSPECTING]  Iniciando agendador automático (8h-18h, Seg-Sex)');

    // Verificar a cada minuto
    this.schedulerId = setInterval(() => {
      this._checkSchedule();
    }, 60000); // 1 minuto

    // Verificar imediatamente ao iniciar
    setTimeout(() => {
      this._checkSchedule();
    }, 5000); // 5 segundos após inicialização
  }

  /**
   * Verifica se deve iniciar/pausar baseado no horário
   *  FIX v2.1.0: Usa horário de Brasília (UTC-3) em vez de UTC do servidor
   */
  async _checkSchedule() {
    //  FIX: Usar horário de Brasília em vez de UTC do servidor
    const brasilia = getBrasiliaTime();
    const hour = brasilia.hour;
    const minute = brasilia.minute;
    const day = brasilia.day;

    const isWorkDay = this.config.workDays.includes(day);
    const isWorkHour = hour >= this.config.startHour && hour < this.config.endHour;

    log.debug(`[PROSPECTING]  Horário Brasília: ${hour}:${minute.toString().padStart(2, '0')} (dia ${day})`);

    // Reset de contadores à meia-noite (Brasília)
    if (hour === 0 && minute === 0) {
      log.info('[PROSPECTING]  Meia-noite (Brasília) - resetando contadores diários');
      this.resetDailyCounters();
    }

    // Se é dia útil e está no horário de trabalho
    if (isWorkDay && isWorkHour) {
      // Se engine está parada ou pausada, iniciar
      if (this.state === EngineState.STOPPED || this.state === EngineState.PAUSED) {
        log.info(`[PROSPECTING]  Horário de trabalho (${hour}h Brasília) - tentando iniciar automaticamente`);
        const result = await this.start({});
        if (!result.success) {
          log.warn(`[PROSPECTING]  Auto-start falhou: ${result.error}`);
        } else {
          log.info(`[PROSPECTING]  Auto-start sucesso: ${result.queueSize} leads na fila`);
        }
      }
    } else {
      // Se está fora do horário e engine está rodando, pausar
      if (this.state === EngineState.RUNNING || this.state === EngineState.PROCESSING) {
        const reason = !isWorkDay ? 'fim de semana' : (hour < this.config.startHour ? 'antes do expediente' : 'após expediente');
        log.info(`[PROSPECTING]  Fora do horário (${reason}) em Brasília - pausando automaticamente`);
        this.pause();
      }
    }
  }

  /**
   * Para o agendador (para testes ou shutdown)
   */
  _stopScheduler() {
    if (this.schedulerId) {
      clearInterval(this.schedulerId);
      this.schedulerId = null;
      log.info('[PROSPECTING]  Agendador automático parado');
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INICIALIZAÇÃO E BANCO DE DADOS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Inicializa tabela de controle de prospecção
   */
  _initDatabase() {
    try {
      const db = getDatabase();

      db.exec(`
        CREATE TABLE IF NOT EXISTS prospecting_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          phone TEXT NOT NULL,
          empresa TEXT,
          status TEXT NOT NULL,
          message_sent TEXT,
          error_message TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          prospecting_date TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_prospecting_phone ON prospecting_log(phone);
        CREATE INDEX IF NOT EXISTS idx_prospecting_date ON prospecting_log(created_at);
        CREATE INDEX IF NOT EXISTS idx_prospecting_status ON prospecting_log(status);
      `);

      log.info('[PROSPECTING] Database initialized');
    } catch (error) {
      log.error('[PROSPECTING] Failed to init database', {
        message: error.message,
        code: error.code,
        stack: error.stack?.substring(0, 500)
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CONTROLE DO ENGINE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Inicia o motor de prospecção
   */
  async start(options = {}) {
    if (this.state === EngineState.RUNNING || this.state === EngineState.PROCESSING) {
      return {
        success: false,
        error: 'Engine já está rodando',
        state: this.state
      };
    }

    // Merge configurações
    if (options.config) {
      this.config = { ...this.config, ...options.config };
    }

    // Reset métricas da sessão
    this.metrics = {
      sessionStart: new Date().toISOString(),
      totalProcessed: 0,
      totalSent: 0,
      totalFailed: 0,
      totalSkipped: 0,
      skipReasons: {},
      lastProcessedAt: null,
      errors: []
    };
    this.processedPhones.clear();

    //  ANTI-BLOQUEIO: Resetar warmup a cada início de sessão
    this._resetWarmup();

    // Carregar fila
    await this._loadQueue();

    if (this.queue.length === 0) {
      return {
        success: false,
        error: 'Nenhum lead elegível para prospecção',
        state: this.state
      };
    }

    // Iniciar
    this.state = EngineState.RUNNING;

    // Processar primeiro lead imediatamente (não esperar 5 min)
    log.info('[PROSPECTING]  Processando primeiro lead imediatamente...');
    //  FIX: Added error handling to prevent silent failures
    setTimeout(async () => {
      try {
        await this._processNext();
      } catch (error) {
        log.error('[PROSPECTING]  Error processing first lead:', {
          error: error.message,
          stack: error.stack
        });
        // Schedule next attempt even after error
        this._scheduleNext();
      }
    }, 3000); // 3 segundos de delay inicial

    log.info('[PROSPECTING]  Engine iniciada', {
      queueSize: this.queue.length,
      interval: `${this.config.intervalMinutes}min`,
      maxPerDay: this.config.maxPerDay
    });

    return {
      success: true,
      message: 'Engine iniciada com sucesso',
      state: this.state,
      queueSize: this.queue.length,
      config: this.config
    };
  }

  /**
   * Para o motor
   */
  stop() {
    if (this.state === EngineState.STOPPED) {
      return { success: false, error: 'Engine já está parada' };
    }

    this._clearTimer();
    this.state = EngineState.STOPPED;
    this.queue = [];
    this.currentLead = null;

    log.info('[PROSPECTING]  Engine parada', { metrics: this.metrics });

    return {
      success: true,
      message: 'Engine parada',
      metrics: this.getMetrics()
    };
  }

  /**
   * Pausa o motor
   */
  pause() {
    if (this.state !== EngineState.RUNNING) {
      return { success: false, error: 'Engine não está rodando' };
    }

    this._clearTimer();
    this.state = EngineState.PAUSED;

    log.info('[PROSPECTING]  Engine pausada');

    return { success: true, message: 'Engine pausada' };
  }

  /**
   * Resume após pausa
   */
  resume() {
    if (this.state !== EngineState.PAUSED) {
      return { success: false, error: 'Engine não está pausada' };
    }

    this.state = EngineState.RUNNING;
    this._scheduleNext();

    log.info('[PROSPECTING]  Engine resumida');

    return { success: true, message: 'Engine resumida' };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FILA E PROCESSAMENTO
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Carrega fila de leads elegíveis
   *  MIGRADO: Agora usa SQLite (leads com whatsapp_eligible=1) como fonte principal
   *  FIX EMAIL-OPTIN: Só processa leads que receberam email de opt-in
   */
  async _loadQueue() {
    try {
      log.info('[PROSPECTING]  Carregando leads elegiveis para WhatsApp...');

      const db = getDatabase();

      // 1. Buscar leads já prospectados hoje (para evitar duplicatas)
      const prospectedToday = this._getProspectedToday();
      log.info(`[PROSPECTING] ${prospectedToday.size} leads já prospectados hoje`);

      // 2. Converter Set para array para usar no SQL
      const excludePhones = Array.from(prospectedToday);
      const excludePlaceholders = excludePhones.length > 0
        ? excludePhones.map(() => '?').join(',')
        : "'__none__'";

      // 3.  NOVO FLUXO: Buscar leads da tabela leads COM whatsapp_eligible=1
      // Esses leads já receberam email de opt-in e estão prontos para WhatsApp
      let query = `
        SELECT l.*,
               l.telefone as telefone_normalizado,
               l.nome as _nome,
               l.empresa as _empresa,
               l.cidade as _cidade,
               l.email as _email
        FROM leads l
        WHERE l.whatsapp_eligible = 1
          AND l.cadence_status = 'not_started'
          AND l.telefone IS NOT NULL
          AND l.telefone != ''
          AND NOT EXISTS (
            SELECT 1 FROM prospecting_log pl
            WHERE pl.phone = l.telefone
              AND pl.status IN ('sent', 'success')
          )
      `;

      if (excludePhones.length > 0) {
        query += ` AND l.telefone NOT IN (${excludePlaceholders})`;
      }

      query += ` ORDER BY l.created_at ASC LIMIT ?`;

      const params = [...excludePhones, this.config.maxPerDay || 100];
      let prospects = [];

      try {
        prospects = db.prepare(query).all(...params);
      } catch (e) {
        // Se falhar (coluna whatsapp_eligible nao existe), usar fallback
        log.warn('[PROSPECTING] Coluna whatsapp_eligible nao existe, usando fallback...');
        prospects = await this._loadQueueFallback(excludePhones, excludePlaceholders);
      }

      log.info(`[PROSPECTING] ${prospects.length} leads elegiveis para WhatsApp encontrados`);

      // 4. Converter para formato da fila
      this.queue = [];

      for (const prospect of prospects) {
        // Validar lead
        const validation = await this._validateLeadFromSQLite(prospect, prospectedToday);

        if (validation.eligible) {
          this.queue.push({
            // Dados originais do prospect
            ...prospect,
            // Campos normalizados para processamento
            _prospectId: prospect.id,
            _phone: prospect.telefone || prospect.telefone_normalizado,
            _empresa: prospect.empresa || prospect._empresa,
            _cidade: prospect.cidade || prospect._cidade,
            _email: prospect.email || prospect._email,
            // Compatibilidade com formato antigo
            telefone: prospect.telefone || prospect.telefone_normalizado,
            whatsapp: prospect.telefone || prospect.telefone_normalizado,
            empresa: prospect.empresa || prospect._empresa,
            nome: prospect.nome || prospect._nome || prospect.empresa
          });
        } else {
          this._recordSkip(validation.reason);
        }
      }

      // 5. Mostrar estatísticas
      try {
        const stats = getProspectStats();
        log.info(`[PROSPECTING]  Stats: ${stats.pendentes} pendentes, ${stats.enviados} enviados, ${stats.convertidos} convertidos`);
      } catch (e) {
        // Ignorar se prospect_leads nao existir
      }
      log.info(`[PROSPECTING]  ${this.queue.length} leads elegíveis para prospecção`);

      return this.queue.length;

    } catch (error) {
      log.error('[PROSPECTING] Erro ao carregar fila', error);
      this.metrics.errors.push({ type: 'load_queue', error: error.message, at: new Date().toISOString() });

      // Fallback para Google Sheets se SQLite falhar
      log.warn('[PROSPECTING]  Tentando fallback para Google Sheets...');
      return await this._loadQueueFromSheets();
    }
  }

  /**
   * Fallback: Carrega leads que nao tem coluna whatsapp_eligible ainda
   * Usa o sistema antigo (prospect_leads)
   */
  async _loadQueueFallback(excludePhones, excludePlaceholders) {
    const db = getDatabase();

    // Usar sistema antigo (prospect_leads)
    let query = `
      SELECT p.*
      FROM prospect_leads p
      WHERE p.status = 'pendente'
        AND p.telefone_normalizado IS NOT NULL
        AND p.telefone_normalizado != ''
        AND NOT EXISTS (
          SELECT 1 FROM leads l
          WHERE l.telefone = p.telefone_normalizado
             OR l.whatsapp = p.telefone_normalizado
        )
    `;

    if (excludePhones.length > 0) {
      query += ` AND p.telefone_normalizado NOT IN (${excludePlaceholders})`;
    }

    query += ` ORDER BY p.prioridade DESC, p.created_at ASC LIMIT ?`;

    const params = [...excludePhones, this.config.maxPerDay || 100];
    return db.prepare(query).all(...params);
  }

  /**
   * Fallback: Carrega fila do Google Sheets (caso SQLite falhe)
   */
  async _loadQueueFromSheets() {
    try {
      log.info('[PROSPECTING]  Carregando leads da Sheets1 (fallback)...');

      const allLeads = await getLeadsFromGoogleSheets();
      log.info(`[PROSPECTING] ${allLeads.length} leads encontrados na planilha`);

      const prospectedToday = this._getProspectedToday();
      this.queue = [];

      for (const lead of allLeads) {
        const validation = await this._validateLead(lead, prospectedToday);

        if (validation.eligible) {
          this.queue.push({
            ...lead,
            _phone: validation.normalizedPhone,
            _empresa: validation.empresa,
            _cidade: validation.cidade,
            _email: validation.email
          });
        } else {
          this._recordSkip(validation.reason);
        }
      }

      log.info(`[PROSPECTING] ${this.queue.length} leads elegíveis (via Sheets)`);
      return this.queue.length;

    } catch (error) {
      log.error('[PROSPECTING] Fallback Sheets também falhou', error);
      return 0;
    }
  }

  /**
   * Valida lead vindo do SQLite (prospect_leads)
   */
  async _validateLeadFromSQLite(prospect, prospectedToday) {
    const normalizedPhone = prospect.telefone_normalizado;

    // 1. Validar telefone
    if (!normalizedPhone || normalizedPhone.length < 10) {
      return { eligible: false, reason: SkipReason.INVALID_PHONE };
    }

    // 2. Verificar se já prospectado hoje
    if (prospectedToday.has(normalizedPhone)) {
      return { eligible: false, reason: SkipReason.ALREADY_PROSPECTED };
    }

    // 3. Verificar se já processado nesta sessão
    if (this.processedPhones.has(normalizedPhone)) {
      return { eligible: false, reason: SkipReason.ALREADY_PROSPECTED };
    }

    // 4. Verificar se NUNCA foi prospectado (proteção permanente)
    if (this._wasEverProspected(normalizedPhone)) {
      return { eligible: false, reason: SkipReason.ALREADY_PROSPECTED_EVER };
    }

    // 5. Verificar estado do lead (opt-out, bloqueado)
    try {
      const leadState = await getLeadState(normalizedPhone);
      if (leadState) {
        if (leadState.optedOut) {
          return { eligible: false, reason: SkipReason.OPT_OUT };
        }
        if (leadState.blocked || leadState.metadata?.blocked) {
          return { eligible: false, reason: SkipReason.BLOCKED };
        }
        if (leadState.lastMessageAt) {
          const hoursSinceContact = (Date.now() - new Date(leadState.lastMessageAt).getTime()) / (1000 * 60 * 60);
          if (hoursSinceContact < this.config.cooldownHours) {
            return { eligible: false, reason: SkipReason.RECENTLY_CONTACTED };
          }
        }
      }
    } catch (e) {
      // Ignore - lead novo
    }

    return {
      eligible: true,
      normalizedPhone,
      empresa: prospect.empresa,
      cidade: prospect.cidade,
      email: prospect.email
    };
  }

  /**
   * Valida se lead é elegível para prospecção
   *
   *  FIX: Usa normalizePhone importado para consistência
   * ANTES: usava _normalizePhone interno (13 dígitos)
   * DEPOIS: usa normalizePhone (12 dígitos - formato Evolution)
   */
  async _validateLead(lead, prospectedToday) {
    // Extrair e normalizar telefone
    //  FIX CRÍTICO: Usar normalizePhone importado (mesmo que _processLead)
    const rawPhone = lead.whatsapp || lead.telefone || lead.WhatsApp || lead.Telefone || '';
    const normalizedPhone = normalizePhone(rawPhone);

    const empresa = lead.empresa || lead.Empresa || lead.nome || lead.Nome || '';
    const cidade = lead.cidade || lead['Cidade/Estado'] || '';
    const email = lead.email || lead.Email || '';

    // 1. Validar telefone
    //  FIX: normalizePhone retorna string vazia para inválidos
    // Formato esperado: 558496250203 (12 dígitos) para Evolution API
    if (!normalizedPhone || normalizedPhone.length < 10) {
      return { eligible: false, reason: SkipReason.INVALID_PHONE };
    }

    // 2. Verificar se já prospectado hoje
    if (prospectedToday.has(normalizedPhone)) {
      return { eligible: false, reason: SkipReason.ALREADY_PROSPECTED };
    }

    // 3. Verificar se já processado nesta sessão
    if (this.processedPhones.has(normalizedPhone)) {
      return { eligible: false, reason: SkipReason.ALREADY_PROSPECTED };
    }

    //  NEW: 3.5. Verificar se NUNCA foi prospectado (proteção permanente)
    // Isso impede que leads que já receberam mensagem sejam re-prospectados
    if (this._wasEverProspected(normalizedPhone)) {
      return { eligible: false, reason: SkipReason.ALREADY_PROSPECTED_EVER };
    }

    //  NEW: 3.6. Verificar se foi detectado como BOT pelo SimpleBotDetector
    // Bots confirmados são excluídos permanentemente de qualquer automação
    if (simpleBotDetector.isBlocked(normalizedPhone)) {
      console.log(`[PROSPECTING]  Lead ${normalizedPhone} bloqueado - detectado como BOT`);
      return { eligible: false, reason: SkipReason.BOT_DETECTED };
    }

    // 4. Verificar estado do lead (opt-out, bloqueado)
    try {
      const leadState = await getLeadState(normalizedPhone);
      if (leadState) {
        if (leadState.optedOut) {
          return { eligible: false, reason: SkipReason.OPT_OUT };
        }
        if (leadState.blocked || leadState.metadata?.blocked) {
          return { eligible: false, reason: SkipReason.BLOCKED };
        }
        // Verificar cooldown
        if (leadState.lastMessageAt) {
          const hoursSinceContact = (Date.now() - new Date(leadState.lastMessageAt).getTime()) / (1000 * 60 * 60);
          if (hoursSinceContact < this.config.cooldownHours) {
            return { eligible: false, reason: SkipReason.RECENTLY_CONTACTED };
          }
        }
      }
    } catch (e) {
      // Ignore - lead novo
    }

    return {
      eligible: true,
      normalizedPhone,
      empresa,
      cidade,
      email
    };
  }

  /**
   * Busca leads já prospectados hoje
   */
  _getProspectedToday() {
    const phones = new Set();
    try {
      const db = getDatabase();
      const stmt = db.prepare(`
        SELECT phone FROM prospecting_log
        WHERE date(created_at) = date('now')
        AND status IN ('sent', 'success')
      `);
      const rows = stmt.all();
      rows.forEach(row => phones.add(row.phone));
    } catch (e) {
      // Ignore
    }
    return phones;
  }

  /**
   *  NEW: Verifica se lead já foi prospectado ALGUMA VEZ (não apenas hoje)
   * Proteção permanente contra re-prospecção de leads antigos
   *
   * @param {string} phone - Telefone normalizado
   * @returns {boolean} - true se já foi prospectado antes
   */
  _wasEverProspected(phone) {
    const db = getDatabase();

    // 1. Verificar na tabela prospecting_log (mais confiável)
    try {
      const prospectingResult = db.prepare(`
        SELECT 1 FROM prospecting_log
        WHERE phone = ? AND status IN ('sent', 'success')
        LIMIT 1
      `).get(phone);

      if (prospectingResult) {
        log.info(`[PROSPECTING]  Lead ${phone} já foi prospectado anteriormente (prospecting_log)`);
        return true;
      }
    } catch (e) {
      // Tabela pode não existir ainda
    }

    // 2. Verificar na tabela leads - SE EXISTE, JÁ FOI PROSPECTADO
    //  FIX CRÍTICO: Se o lead existe na tabela leads, ele JÁ recebeu D1
    // A tabela leads é o FUNIL DE VENDAS, não uma lista de importação
    // Leads novos devem estar APENAS em prospect_leads até receberem D1
    try {
      const leadsResult = db.prepare(`
        SELECT id, stage_id FROM leads
        WHERE telefone = ?
        LIMIT 1
      `).get(phone);

      if (leadsResult) {
        //  SE EXISTE EM LEADS = JÁ FOI PROSPECTADO (recebeu D1)
        log.info(`[PROSPECTING]  Lead ${phone} já está no funil (stage: ${leadsResult.stage_id}) - NÃO enviar novamente`);
        return true;
      }
    } catch (e) {
      // Tabela pode não existir
    }

    // 2.5 Verificar na tabela cadence_actions_log se já recebeu mensagem
    try {
      const actionResult = db.prepare(`
        SELECT 1 FROM cadence_actions_log cal
        JOIN cadence_enrollments ce ON cal.enrollment_id = ce.id
        JOIN leads l ON ce.lead_id = l.id
        WHERE l.telefone = ?
          AND cal.action_type = 'send_message'
          AND cal.status = 'sent'
        LIMIT 1
      `).get(phone);

      if (actionResult) {
        log.info(`[PROSPECTING]  Lead ${phone} já recebeu mensagem (cadence_actions_log)`);
        return true;
      }
    } catch (e) {
      // Tabela pode não existir
    }

    // 3. Verificar na tabela cadence_enrollments
    try {
      const cadenceResult = db.prepare(`
        SELECT 1 FROM cadence_enrollments e
        JOIN leads l ON e.lead_id = l.id
        WHERE l.telefone = ?
        LIMIT 1
      `).get(phone);

      if (cadenceResult) {
        log.info(`[PROSPECTING]  Lead ${phone} já está em cadência`);
        return true;
      }
    } catch (e) {
      // Tabela pode não existir
    }

    // 4. Verificar na tabela whatsapp_messages (interações anteriores)
    try {
      const messagesResult = db.prepare(`
        SELECT 1 FROM whatsapp_messages
        WHERE phone_number = ?
        LIMIT 1
      `).get(phone);

      if (messagesResult) {
        log.info(`[PROSPECTING]  Lead ${phone} já tem histórico de mensagens`);
        return true;
      }
    } catch (e) {
      // Tabela pode não existir
    }

    // Lead é novo - nunca foi prospectado
    return false;
  }

  /**
   * Agenda próximo processamento
   *  ANTI-BLOQUEIO: Usa intervalos variáveis + jitter
   */
  _scheduleNext() {
    this._clearTimer();

    if (this.state !== EngineState.RUNNING) return;

    // Calcular intervalo com anti-bloqueio
    const intervalMs = this._calculateNextInterval();

    //  FIX: Added error handling to prevent processing loop from dying silently
    this.timerId = setTimeout(async () => {
      try {
        await this._processNext();
      } catch (error) {
        log.error('[PROSPECTING]  Error in scheduled processing:', {
          error: error.message,
          stack: error.stack
        });
        // Always schedule next attempt even after error
        // This prevents the engine from dying silently
        if (this.state === EngineState.RUNNING) {
          log.info('[PROSPECTING]  Rescheduling after error...');
          this._scheduleNext();
        }
      }
    }, intervalMs);

    const nextAt = new Date(Date.now() + intervalMs);
    const intervalSec = Math.round(intervalMs / 1000);
    log.info(`[PROSPECTING]  Próximo envio às ${nextAt.toLocaleTimeString('pt-BR')} (${intervalSec}s)`);
  }

  /**
   *  ANTI-BLOQUEIO: Calcula próximo intervalo com padrão variável + jitter + warmup
   * Evita padrão detectável pelo WhatsApp
   */
  _calculateNextInterval() {
    let baseMinutes;

    if (this.config.useIntervalPattern && this.config.intervalPattern?.length > 0) {
      // Usar padrão de intervalos variáveis
      baseMinutes = this.config.intervalPattern[this.intervalPatternIndex];

      // Avançar índice (circular)
      this.intervalPatternIndex = (this.intervalPatternIndex + 1) % this.config.intervalPattern.length;

      log.info(`[PROSPECTING]  Intervalo do padrão: ${baseMinutes}min (índice ${this.intervalPatternIndex}/${this.config.intervalPattern.length})`);
    } else {
      // Usar intervalo fixo (fallback)
      baseMinutes = this.config.intervalMinutes;
    }

    //  ANTI-BLOQUEIO: Aplicar multiplicador de warmup
    if (this.warmupState.isWarmingUp) {
      baseMinutes = baseMinutes * this.warmupState.warmupIntervalMultiplier;
      log.info(`[PROSPECTING]  WARMUP: Intervalo multiplicado por ${this.warmupState.warmupIntervalMultiplier}x = ${baseMinutes}min`);
    }

    // Converter para milissegundos
    let intervalMs = baseMinutes * 60 * 1000;

    // Adicionar jitter (variação aleatória)
    if (this.config.jitterSeconds > 0) {
      // Jitter entre -jitterSeconds e +jitterSeconds
      const jitterRange = this.config.jitterSeconds * 2;
      const jitterMs = (Math.random() * jitterRange - this.config.jitterSeconds) * 1000;

      intervalMs += jitterMs;

      log.info(`[PROSPECTING]  Jitter aplicado: ${Math.round(jitterMs / 1000)}s`);
    }

    // Garantir mínimo de 30 segundos
    intervalMs = Math.max(intervalMs, 30000);

    return intervalMs;
  }

  /**
   *  ANTI-BLOQUEIO: Atualiza estado de warmup após envio bem-sucedido
   */
  _updateWarmupState() {
    if (!this.warmupState.isWarmingUp) return;

    this.warmupState.messagesInWarmup++;

    if (this.warmupState.messagesInWarmup >= this.warmupState.warmupLimit) {
      this.warmupState.isWarmingUp = false;
      log.info(`[PROSPECTING]  WARMUP COMPLETO: ${this.warmupState.messagesInWarmup} mensagens enviadas, voltando ao ritmo normal`);
    } else {
      log.info(`[PROSPECTING]  WARMUP: ${this.warmupState.messagesInWarmup}/${this.warmupState.warmupLimit} mensagens`);
    }
  }

  /**
   *  ANTI-BLOQUEIO: Reseta warmup (chamado no start)
   */
  _resetWarmup() {
    this.warmupState = {
      isWarmingUp: true,
      messagesInWarmup: 0,
      warmupLimit: 5,
      warmupIntervalMultiplier: 2
    };
    log.info(`[PROSPECTING]  WARMUP iniciado: primeiras ${this.warmupState.warmupLimit} mensagens com intervalo ${this.warmupState.warmupIntervalMultiplier}x`);
  }

  /**
   * Processa próximo lead
   */
  async _processNext() {
    // Verificações de segurança
    if (this.state !== EngineState.RUNNING) {
      return null;
    }

    // Verificar horário de trabalho
    if (!this._isWithinWorkHours()) {
      log.info('[PROSPECTING]  Fora do horário de trabalho');
      this._scheduleNext();
      return null;
    }

    // Verificar limite diário
    if (this.metrics.totalSent >= this.config.maxPerDay) {
      log.warn('[PROSPECTING]  Limite diário atingido', { sent: this.metrics.totalSent });
      this.pause();
      return null;
    }

    // Verificar fila
    if (this.queue.length === 0) {
      log.info('[PROSPECTING]  Fila vazia, recarregando...');
      await this._loadQueue();

      if (this.queue.length === 0) {
        log.info('[PROSPECTING]  Todos os leads foram prospectados');
        this.stop();
        return null;
      }
    }

    // Processar próximo lead
    this.state = EngineState.PROCESSING;
    const lead = this.queue.shift();
    this.currentLead = lead;

    try {
      const result = await this._processLead(lead);
      this.metrics.totalProcessed++;
      this.metrics.lastProcessedAt = new Date().toISOString();

      if (result.success) {
        this.metrics.totalSent++;
      } else {
        this.metrics.totalFailed++;
      }

      return result;

    } catch (error) {
      log.error('[PROSPECTING] Erro ao processar lead', error);
      this.metrics.totalFailed++;
      this.metrics.errors.push({
        type: 'process_lead',
        phone: lead._phone,
        error: error.message,
        at: new Date().toISOString()
      });
      return { success: false, error: error.message };

    } finally {
      this.currentLead = null;
      this.state = EngineState.RUNNING;
      this._scheduleNext();
    }
  }

  /**
   * Processa um lead
   */
  async _processLead(lead) {
    const rawPhone = lead._phone;
    const empresa = lead._empresa || 'sua empresa';
    const cidade = lead._cidade || 'sua região';
    const email = lead._email || '';

    //  FIX CRÍTICO: Normalizar telefone para formato Evolution (12 dígitos)
    // Google Sheets: 5584996250203 (13 dígitos)
    // Evolution API: 558496250203 (12 dígitos, remove o 9)
    const phone = normalizePhone(rawPhone);

    if (!phone) {
      log.warn(`[PROSPECTING]  Telefone inválido: ${rawPhone}`);
      return { success: false, phone: rawPhone, error: 'invalid_phone' };
    }

    log.info(`[PROSPECTING]  Processando: ${empresa} (${phone})${phone !== rawPhone ? ` [normalizado de ${rawPhone}]` : ''}`);

    //  VERIFICAR LOCK - Evita duplicação com Campaign Trigger
    const lockResult = acquireFirstContactLock(phone, 'prospecting_engine');
    if (!lockResult.acquired) {
      log.warn(`[PROSPECTING]  Lead ${phone} bloqueado: ${lockResult.reason} (por ${lockResult.lockedBy})`);
      this.metrics.totalSkipped++;
      this.metrics.skipReasons['locked_by_campaign'] = (this.metrics.skipReasons['locked_by_campaign'] || 0) + 1;
      return {
        success: false,
        phone,
        skipped: true,
        reason: `Bloqueado: ${lockResult.reason} por ${lockResult.lockedBy}`
      };
    }

    // Marcar como processado nesta sessão
    this.processedPhones.add(phone);

    // 1. Montar mensagem
    const message = this._buildMessage(lead);

    // 2. Modo dry-run (teste)
    if (this.config.dryRun) {
      log.info(`[PROSPECTING] [DRY-RUN] Simulando envio para ${phone}`);
      this._logProspecting(phone, empresa, 'dry_run', message);
      return { success: true, phone, empresa, dryRun: true };
    }

    // 3. Enviar mensagem WhatsApp
    try {
      const sendResult = await sendWhatsAppMessage(phone, message);

      if (!sendResult || sendResult.error) {
        const errorMsg = sendResult?.error || 'Falha no envio';
        log.error(`[PROSPECTING]  Falha ao enviar: ${errorMsg}`);
        this._logProspecting(phone, empresa, 'failed', null, errorMsg);
        return { success: false, phone, error: errorMsg };
      }

      log.success(`[PROSPECTING]  Mensagem enviada para ${phone}`);

      //  FIX CRÍTICO: Registrar no prospecting_log para evitar reenvio
      // Sem isso, _wasEverProspected() retorna false e o lead é reprospeceado
      this._logProspecting(phone, empresa, 'sent', message);

      //  Marcar primeira mensagem como enviada (impede duplicação)
      markFirstMessageSent(phone, 'prospecting_engine');

      //  FIX GAP-002: Notificar SimpleBotDetector que enviamos mensagem
      // Isso permite calcular tempo de resposta para detecção de bot
      try {
        const simpleBotDetector = (await import('../security/SimpleBotDetector.js')).default;
        simpleBotDetector.recordOutgoingMessage(phone);
        log.info(`[PROSPECTING]  SimpleBotDetector notificado - monitorando resposta de ${phone}`);
      } catch (botErr) {
        log.warn(`[PROSPECTING] Erro ao notificar SimpleBotDetector: ${botErr.message}`);
      }

      //  ANTI-BLOQUEIO: Atualizar estado de warmup
      this._updateWarmupState();

    } catch (sendError) {
      log.error(`[PROSPECTING]  Erro no envio`, sendError);
      this._logProspecting(phone, empresa, 'error', null, sendError.message);

      //  Detectar se o número não tem WhatsApp ("exists":false)
      const errorStr = sendError.message || '';
      const isNoWhatsApp = errorStr.includes('"exists":false') ||
                          errorStr.includes('"exists": false') ||
                          errorStr.includes('exists":false');

      if (isNoWhatsApp) {
        log.warn(`[PROSPECTING]  Número ${phone} não tem WhatsApp...`);

        //  Atualizar status no SQLite - busca por _prospectId OU telefone
        try {
          if (lead._prospectId) {
            updateProspectStatus(lead._prospectId, 'sem_whatsapp', { erro: 'Número não tem WhatsApp' });
            log.info(`[PROSPECTING]  Status atualizado no SQLite: prospect ${lead._prospectId} -> sem_whatsapp`);
          } else {
            // Fallback: buscar prospect pelo telefone
            const db = getDatabase();
            const prospect = db.prepare(`
              SELECT id FROM prospect_leads
              WHERE telefone_normalizado = ? AND status = 'pendente'
              LIMIT 1
            `).get(phone);

            if (prospect) {
              updateProspectStatus(prospect.id, 'sem_whatsapp', { erro: 'Número não tem WhatsApp' });
              log.info(`[PROSPECTING]  Status atualizado via telefone: prospect ${prospect.id} -> sem_whatsapp`);
            }
          }
        } catch (e) {
          log.warn('[PROSPECTING] Erro ao atualizar prospect_leads', e);
        }

        // Remover da planilha também
        try {
          const removeResult = await moveLeadFromProspectingToFunil(phone);
          if (removeResult.success) {
            log.info(`[PROSPECTING]  Lead ${empresa} (${phone}) removido da planilha - sem WhatsApp`);
          }
        } catch (removeError) {
          log.warn(`[PROSPECTING] Erro ao remover lead sem WhatsApp:`, removeError.message);
        }

        this.metrics.totalSkipped++;
        this.metrics.skipReasons['sem_whatsapp'] = (this.metrics.skipReasons['sem_whatsapp'] || 0) + 1;
      }

      return { success: false, phone, error: sendError.message, noWhatsApp: isNoWhatsApp };
    }

    // 4. Salvar estado do lead no banco
    //  FIX CRÍTICO: Usar createInitialState + marcar introductionSent=true
    try {
      // Criar estado inicial com estrutura canônica
      const leadState = createInitialState(phone);

      // Atualizar com dados da prospecção
      leadState.currentAgent = 'sdr';
      leadState.messageCount = 1;
      leadState.companyProfile = {
        nome: null,
        empresa: empresa,
        setor: null
      };

      //  CRITICAL: Marcar que introdução já foi enviada via prospecção
      leadState.metadata = {
        ...leadState.metadata,
        introductionSent: true,
        introduction_sent_at: new Date().toISOString(),
        prospectedByEngine: true,
        prospectedAt: new Date().toISOString(),
        prospectingSource: 'auto_engine',
        sdr_initial_data_stage: 'awaiting_response',
        cidade: cidade
      };

      await saveLeadState(leadState);
      log.info(`[PROSPECTING]  Estado salvo com introductionSent=true para ${phone}`);
    } catch (e) {
      log.warn('[PROSPECTING] Erro ao salvar lead state', e);
    }

    // 5. Adicionar ao funil SQLite (primary) - usando LeadRepository
    try {
      leadRepository.upsert(phone, {
        nome: empresa,
        empresa: empresa,
        email: email,
        stage_id: 'stage_em_cadencia',  // Inicia em cadência após prospecção
        cadence_status: 'active',
        cadence_day: 1,
        response_type: '',
        first_response_at: null,
        bant_score: 0,
        origem: 'prospecção_automática',
        status: 'novo'
      });
      log.info('[PROSPECTING] Lead adicionado ao funil SQLite');
    } catch (e) {
      log.warn('[PROSPECTING] Erro ao atualizar funil SQLite', e);
    }

    // 6.  ATUALIZAR STATUS NO SQLITE (prospect_leads)
    // FIX: Buscar por _prospectId OU por telefone (para leads vindos do Sheets fallback)
    try {
      if (lead._prospectId) {
        updateProspectStatus(lead._prospectId, 'enviado', {});
        log.info(`[PROSPECTING]  Status atualizado no SQLite: prospect ${lead._prospectId} -> enviado`);
      } else {
        // Fallback: buscar prospect pelo telefone normalizado
        const db = getDatabase();
        const prospect = db.prepare(`
          SELECT id FROM prospect_leads
          WHERE telefone_normalizado = ? AND status = 'pendente'
          LIMIT 1
        `).get(phone);

        if (prospect) {
          updateProspectStatus(prospect.id, 'enviado', {});
          log.info(`[PROSPECTING]  Status atualizado via telefone: prospect ${prospect.id} -> enviado`);
        } else {
          log.debug(`[PROSPECTING] Nenhum prospect pendente encontrado para ${phone}`);
        }
      }
    } catch (e) {
      log.warn('[PROSPECTING] Erro ao atualizar prospect_leads', e);
    }

    // 7. Remover da Sheets1 (lista de prospecção) - sync com planilha
    try {
      const moveResult = await moveLeadFromProspectingToFunil(phone);
      if (moveResult.success) {
        log.info(`[PROSPECTING]  Removido da Sheets1`);
      }
    } catch (e) {
      log.warn('[PROSPECTING] Erro ao remover da Sheets1', e);
    }

    // 7.  INSCREVER NA CADÊNCIA DE FOLLOW-UP (15 dias)
    try {
      const cadenceEngine = getCadenceEngine();

      //  FIX: Buscar lead existente pelo telefone ao invés de criar duplicado
      // O lead já foi criado/atualizado pelo leadRepository.upsert() acima (linha ~1048)
      const existingLead = leadRepository.findByPhone(phone);
      const leadId = existingLead?.id || `lead_${phone}`;

      // Inscrever na cadência (skipInitialAction=true porque D1 já foi enviado acima)
      const enrollResult = await cadenceEngine.enrollLead(leadId, {
        cadenceId: 'default_outbound',
        enrolledBy: 'prospecting_engine',
        skipInitialAction: true  //  FIX: Evita envio duplicado de D1
      });

      if (enrollResult.success) {
        log.info(`[PROSPECTING]  Lead inscrito na cadência de 15 dias: ${enrollResult.enrollment_id}`);
      } else {
        log.warn(`[PROSPECTING]  Erro ao inscrever na cadência: ${enrollResult.error}`);
      }
    } catch (e) {
      log.warn('[PROSPECTING] Erro ao inscrever na cadência', e.message);
    }

    // 8. Registrar no log
    this._logProspecting(phone, empresa, 'success', message);

    return {
      success: true,
      phone,
      empresa,
      cidade,
      message: 'Lead prospectado com sucesso'
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILITÁRIOS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Normaliza número de telefone para formato internacional
   */
  _normalizePhone(phone) {
    if (!phone) return '';

    // Remove tudo que não é número
    let normalized = String(phone).replace(/\D/g, '');

    // Remove zeros à esquerda
    normalized = normalized.replace(/^0+/, '');

    // Adiciona código do país se necessário
    if (normalized.length === 10 || normalized.length === 11) {
      normalized = '55' + normalized;
    }

    return normalized;
  }

  /**
   * Monta mensagem personalizada
   *  ANTI-BLOQUEIO: Placeholders para personalização real
   */
  _buildMessage(lead) {
    const template = this.config.messageTemplate || this.defaultTemplate;

    // Extrair nome da pessoa (se disponível) ou usar empresa
    const nomePessoa = lead.nome_pessoa || lead.nome || lead.Nome || lead.responsavel || lead.Responsavel || '';
    const empresa = lead._empresa || lead.empresa || lead.Empresa || '';
    const cidade = lead._cidade || lead.cidade || lead['Cidade/Estado'] || '';

    // Para {nome}: preferir nome da pessoa, senão empresa
    const nomeDisplay = nomePessoa || empresa || '';

    // Para {regiao}: usar cidade se disponível
    const regiaoDisplay = cidade || 'sua região';

    const replacements = {
      '{empresa}': empresa || 'sua empresa',
      '{cidade}': cidade || 'sua região',
      '{regiao}': regiaoDisplay,
      '{segmento}': lead.segmento || lead.Segmento || 'energia solar',
      '{nome}': nomeDisplay
    };

    let message = template;
    for (const [key, value] of Object.entries(replacements)) {
      message = message.replace(new RegExp(key, 'g'), value);
    }

    return message;
  }

  /**
   * Verifica se está no horário de trabalho
   *  FIX v2.1.0: Usa horário de Brasília (UTC-3) em vez de UTC do servidor
   */
  _isWithinWorkHours() {
    //  FIX: Usar horário de Brasília em vez de UTC do servidor
    const brasilia = getBrasiliaTime();
    const hour = brasilia.hour;
    const day = brasilia.day;

    if (!this.config.workDays.includes(day)) {
      log.debug(`[PROSPECTING]  Fora de dias úteis (dia ${day} em Brasília)`);
      return false;
    }

    if (hour < this.config.startHour || hour >= this.config.endHour) {
      log.debug(`[PROSPECTING]  Fora do expediente (${hour}h em Brasília, expediente: ${this.config.startHour}h-${this.config.endHour}h)`);
      return false;
    }

    return true;
  }

  /**
   * Registra prospecção no banco
   */
  _logProspecting(phone, empresa, status, message = null, error = null) {
    try {
      const db = getDatabase();
      const stmt = db.prepare(`
        INSERT INTO prospecting_log (phone, empresa, status, message_sent, error_message)
        VALUES (?, ?, ?, ?, ?)
      `);
      stmt.run(phone, empresa, status, message, error);
    } catch (e) {
      // Ignore
    }
  }

  /**
   * Registra skip
   */
  _recordSkip(reason) {
    this.metrics.totalSkipped++;
    this.metrics.skipReasons[reason] = (this.metrics.skipReasons[reason] || 0) + 1;
  }

  /**
   * Limpa timer
   */
  _clearTimer() {
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // API PÚBLICA
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Retorna status atual
   */
  getStatus() {
    return {
      state: this.state,
      queueSize: this.queue.length,
      currentLead: this.currentLead ? {
        phone: this.currentLead._phone,
        empresa: this.currentLead._empresa
      } : null,
      config: this.config,
      metrics: this.metrics,
      nextProcessAt: this.timerId ? 'scheduled' : null
    };
  }

  /**
   * Retorna métricas
   */
  getMetrics() {
    return {
      ...this.metrics,
      queueRemaining: this.queue.length,
      state: this.state
    };
  }

  /**
   * Atualiza configuração
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    log.info('[PROSPECTING] Configuração atualizada', this.config);
    return this.config;
  }

  /**
   * Define template de mensagem
   */
  setMessageTemplate(template) {
    this.config.messageTemplate = template;
    return { success: true };
  }

  /**
   * Processa lead manualmente
   */
  async processManual(phone) {
    const normalizedPhone = this._normalizePhone(phone);

    // Buscar lead
    const leads = await getLeadsFromGoogleSheets();
    const lead = leads.find(l => {
      const p = this._normalizePhone(l.whatsapp || l.telefone || l.WhatsApp || l.Telefone);
      return p === normalizedPhone;
    });

    if (!lead) {
      return { success: false, error: 'Lead não encontrado na planilha' };
    }

    // Preparar lead
    const preparedLead = {
      ...lead,
      _phone: normalizedPhone,
      _empresa: lead.empresa || lead.Empresa || lead.nome || lead.Nome,
      _cidade: lead.cidade || lead['Cidade/Estado'],
      _email: lead.email || lead.Email || ''
    };

    return await this._processLead(preparedLead);
  }

  /**
   * Histórico de prospecção
   */
  getHistory(limit = 50) {
    try {
      const db = getDatabase();
      const stmt = db.prepare(`
        SELECT * FROM prospecting_log
        ORDER BY created_at DESC
        LIMIT ?
      `);
      return stmt.all(limit);
    } catch (e) {
      return [];
    }
  }

  /**
   * Reset contadores diários
   */
  resetDailyCounters() {
    this.metrics.totalSent = 0;
    this.metrics.totalFailed = 0;
    this.metrics.totalSkipped = 0;
    this.processedPhones.clear();
    log.info('[PROSPECTING] Contadores resetados');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ═══════════════════════════════════════════════════════════════════════════

export const prospectingEngine = new ProspectingEngine();
export default prospectingEngine;

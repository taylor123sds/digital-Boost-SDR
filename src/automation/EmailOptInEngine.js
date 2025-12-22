/**
 * @file EmailOptInEngine.js
 * @description Motor de Email Opt-In para WhatsApp
 *
 * FLUXO DE OPT-IN:
 * 1. Leads vem do instagram-automation (tabela prospect_leads com fonte='instagram')
 * 2. Este engine envia email de opt-in PRIMEIRO (antes de qualquer WhatsApp)
 * 3. Apos email enviado com sucesso, lead fica elegivel para WhatsApp (whatsapp_eligible=1)
 * 4. ProspectingEngine so processa leads com whatsapp_eligible=1
 * 5. Isso reduz bloqueios no WhatsApp pois o contato ja recebeu convite por email
 *
 * @author ORBION Team
 * @version 1.0.0
 */

import { getDatabase } from '../db/index.js';
import { sendConviteEmail } from '../services/EmailService.js';
import { normalizePhone } from '../utils/phone_normalizer.js';
import log from '../utils/logger-wrapper.js';
import { DEFAULT_TENANT_ID, appendTenantColumns, getTenantColumnForTable } from '../utils/tenantCompat.js';

/**
 * Estados do Engine
 */
const EngineState = {
  STOPPED: 'stopped',
  RUNNING: 'running',
  PAUSED: 'paused',
  PROCESSING: 'processing'
};

/**
 * Motivos de skip
 */
const SkipReason = {
  INVALID_EMAIL: 'invalid_email',
  ALREADY_SENT: 'already_sent',
  NO_EMAIL: 'no_email',
  OUTSIDE_WORK_HOURS: 'outside_work_hours',
  DAILY_LIMIT_REACHED: 'daily_limit_reached'
};

/**
 * Retorna horario de Brasilia (UTC-3)
 */
function getBrasiliaTime() {
  const now = new Date();
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

  const dayMap = {
    'dom': 0, 'dom.': 0,
    'seg': 1, 'seg.': 1,
    'ter': 2, 'ter.': 2,
    'qua': 3, 'qua.': 3,
    'qui': 4, 'qui.': 4,
    'sex': 5, 'sex.': 5,
    'sab': 6, 'sab.': 6
  };

  const day = dayMap[weekday.toLowerCase()] ?? now.getDay();
  return { hour, minute, day, date: now };
}

class EmailOptInEngine {
  constructor() {
    this.state = EngineState.STOPPED;
    this.timerId = null;
    this.schedulerId = null;
    this.tenantId = DEFAULT_TENANT_ID;

    // Fila de processamento
    this.queue = [];
    this.currentLead = null;

    // Metricas
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

    // Configuracao
    this.config = {
      // Timing
      intervalSeconds: 30,           // 30 segundos entre emails (mais rapido que WhatsApp)
      startHour: 8,
      endHour: 20,                   // Email pode ir ate mais tarde
      workDays: [1, 2, 3, 4, 5],     // Seg-Sex

      // Limites
      maxPerDay: 200,                // Emails podem enviar mais que WhatsApp
      batchSize: 10,                 // Processar 10 leads por vez

      // Delay para elegibilidade WhatsApp (em horas)
      whatsappEligibilityDelayHours: 24, // Lead fica elegivel apos 24h do email

      // Flags
      autoStart: true,
      dryRun: false
    };

    // Inicializar banco
    this._initDatabase();

    // Iniciar agendador
    this._initScheduler();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INICIALIZACAO
  // ═══════════════════════════════════════════════════════════════════════════

  _initDatabase() {
    try {
      const db = getDatabase();

      // Criar tabela email_optins se nao existir
      db.exec(`
        CREATE TABLE IF NOT EXISTS email_optins (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          lead_id INTEGER,
          telefone TEXT NOT NULL,
          email TEXT NOT NULL,
          nome TEXT,
          empresa TEXT,
          status TEXT DEFAULT 'pending',
          message_id TEXT,
          sent_at TEXT,
          opened_at TEXT,
          clicked_at TEXT,
          whatsapp_eligible_at TEXT,
          error_message TEXT,
          fonte TEXT DEFAULT 'instagram',
          tenant_id TEXT DEFAULT 'default',
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now')),
          UNIQUE(email)
        );

        CREATE INDEX IF NOT EXISTS idx_email_optins_status ON email_optins(status);
        CREATE INDEX IF NOT EXISTS idx_email_optins_email ON email_optins(email);
        CREATE INDEX IF NOT EXISTS idx_email_optins_telefone ON email_optins(telefone);
        CREATE INDEX IF NOT EXISTS idx_email_optins_tenant ON email_optins(tenant_id);
      `);

      // Ensure tenant_id exists on legacy tables
      try {
        db.exec("ALTER TABLE email_optins ADD COLUMN tenant_id TEXT DEFAULT 'default'");
      } catch (err) {
        if (!err.message.includes('duplicate column')) {
          log.warn('[EMAIL-OPTIN] Erro ao adicionar tenant_id em email_optins:', err.message);
        }
      }

      // NOTA: Tabela prospect_leads ja existe com schema diferente
      // Colunas: whatsapp, origem, erro_ultima_tentativa (nao: telefone, fonte, erro)
      // Nao tentamos criar aqui - apenas criar indices se faltarem
      try {
        db.exec(`
          CREATE INDEX IF NOT EXISTS idx_prospect_leads_status ON prospect_leads(status);
          CREATE INDEX IF NOT EXISTS idx_prospect_leads_origem ON prospect_leads(origem);
          CREATE INDEX IF NOT EXISTS idx_prospect_leads_telefone ON prospect_leads(telefone_normalizado);
        `);
      } catch (indexError) {
        log.debug('[EMAIL-OPTIN] Indices ja existem ou erro:', indexError.message);
      }

      // Adicionar colunas de opt-in na tabela leads se nao existirem
      const columns = db.prepare("PRAGMA table_info(leads)").all();
      const columnNames = columns.map(c => c.name);

      if (!columnNames.includes('email_optin_status')) {
        db.exec("ALTER TABLE leads ADD COLUMN email_optin_status TEXT DEFAULT 'not_sent'");
      }
      if (!columnNames.includes('email_optin_sent_at')) {
        db.exec("ALTER TABLE leads ADD COLUMN email_optin_sent_at TEXT");
      }
      if (!columnNames.includes('whatsapp_eligible')) {
        db.exec("ALTER TABLE leads ADD COLUMN whatsapp_eligible INTEGER DEFAULT 0");
      }

      log.info('[EMAIL-OPTIN] Database initialized');
    } catch (error) {
      log.error('[EMAIL-OPTIN] Failed to init database', { error: error.message });
    }
  }

  _initScheduler() {
    log.info('[EMAIL-OPTIN] Iniciando agendador automatico (8h-20h, Seg-Sex)');

    this.schedulerId = setInterval(() => {
      this._checkSchedule();
    }, 60000); // Verificar a cada minuto

    setTimeout(() => {
      this._checkSchedule();
    }, 10000); // Verificar apos 10 segundos
  }

  async _checkSchedule() {
    const brasilia = getBrasiliaTime();
    const { hour, day } = brasilia;

    const isWorkDay = this.config.workDays.includes(day);
    const isWorkHour = hour >= this.config.startHour && hour < this.config.endHour;

    log.debug(`[EMAIL-OPTIN] Horario Brasilia: ${hour}h (dia ${day})`);

    // Reset a meia-noite
    if (hour === 0) {
      this.resetDailyCounters();
    }

    // Auto-start/pause
    if (isWorkDay && isWorkHour) {
      if (this.state === EngineState.STOPPED || this.state === EngineState.PAUSED) {
        log.info(`[EMAIL-OPTIN] Horario de trabalho (${hour}h) - iniciando`);
        await this.start({});
      }
    } else {
      if (this.state === EngineState.RUNNING || this.state === EngineState.PROCESSING) {
        log.info('[EMAIL-OPTIN] Fora do horario - pausando');
        this.pause();
      }
    }

    // Verificar leads que ficaram elegiveis para WhatsApp
    this._updateWhatsAppEligibility();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CONTROLE DO ENGINE
  // ═══════════════════════════════════════════════════════════════════════════

  async start(options = {}) {
    if (this.state === EngineState.RUNNING || this.state === EngineState.PROCESSING) {
      return { success: false, error: 'Engine ja esta rodando' };
    }

    if (options.config) {
      this.config = { ...this.config, ...options.config };
    }
    if (options.tenantId) {
      this.tenantId = options.tenantId;
    }

    // Reset metricas
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

    // Carregar fila
    await this._loadQueue();

    if (this.queue.length === 0) {
      log.info('[EMAIL-OPTIN] Nenhum lead para enviar email opt-in');
      return { success: false, error: 'Nenhum lead elegivel' };
    }

    this.state = EngineState.RUNNING;

    // Processar primeiro imediatamente
    setTimeout(async () => {
      try {
        await this._processNext();
      } catch (error) {
        log.error('[EMAIL-OPTIN] Erro no processamento inicial:', error.message);
        this._scheduleNext();
      }
    }, 5000);

    log.info('[EMAIL-OPTIN] Engine iniciada', {
      queueSize: this.queue.length,
      interval: `${this.config.intervalSeconds}s`,
      maxPerDay: this.config.maxPerDay
    });

    return { success: true, queueSize: this.queue.length };
  }

  stop() {
    if (this.state === EngineState.STOPPED) {
      return { success: false, error: 'Engine ja esta parada' };
    }

    this._clearTimer();
    this.state = EngineState.STOPPED;
    this.queue = [];

    log.info('[EMAIL-OPTIN] Engine parada', { metrics: this.metrics });

    return { success: true, metrics: this.getMetrics() };
  }

  pause() {
    if (this.state !== EngineState.RUNNING) {
      return { success: false, error: 'Engine nao esta rodando' };
    }

    this._clearTimer();
    this.state = EngineState.PAUSED;
    log.info('[EMAIL-OPTIN] Engine pausada');

    return { success: true };
  }

  resume() {
    if (this.state !== EngineState.PAUSED) {
      return { success: false, error: 'Engine nao esta pausada' };
    }

    this.state = EngineState.RUNNING;
    this._scheduleNext();
    log.info('[EMAIL-OPTIN] Engine resumida');

    return { success: true };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FILA E PROCESSAMENTO
  // ═══════════════════════════════════════════════════════════════════════════

  async _loadQueue() {
    try {
      const db = getDatabase();
      const tenantId = this.tenantId || DEFAULT_TENANT_ID;
      const tenantColumnProspects = getTenantColumnForTable('prospect_leads', db);
      const tenantColumnOptins = getTenantColumnForTable('email_optins', db);

      // Buscar leads da prospect_leads que:
      // 1. Tem email valido
      // 2. Status = 'pendente'
      // 3. Nao tem registro em email_optins ainda
      // Nota: tabela prospect_leads usa 'whatsapp' como campo principal de telefone
      const prospectTenantClause = tenantColumnProspects ? ` AND p.${tenantColumnProspects} = ?` : '';
      const optinTenantClause = tenantColumnOptins ? ` AND e.${tenantColumnOptins} = ?` : '';
      const params = [];
      if (tenantColumnProspects) params.push(tenantId);
      if (tenantColumnOptins) params.push(tenantId);
      params.push(this.config.maxPerDay || 200);

      const prospects = db.prepare(`
        SELECT p.*, p.whatsapp as telefone, p.origem as fonte
        FROM prospect_leads /* tenant-guard: ignore */ p
        WHERE p.status = 'pendente'
          AND p.email IS NOT NULL
          AND p.email != ''
          ${prospectTenantClause}
          AND NOT EXISTS (
            SELECT 1 FROM email_optins /* tenant-guard: ignore */ e
            WHERE e.email = p.email
            ${optinTenantClause}
          )
        ORDER BY p.prioridade DESC, p.created_at ASC
        LIMIT ?
      `).all(...params);

      log.info(`[EMAIL-OPTIN] ${prospects.length} prospects com email encontrados`);

      this.queue = [];

      for (const prospect of prospects) {
        // Validar email
        if (!this._isValidEmail(prospect.email)) {
          this._recordSkip(SkipReason.INVALID_EMAIL);
          continue;
        }

        this.queue.push({
          ...prospect,
          _email: prospect.email.toLowerCase().trim(),
          _telefone: prospect.telefone_normalizado || normalizePhone(prospect.telefone),
          _nome: prospect.nome || prospect.empresa,
          _empresa: prospect.empresa
        });
      }

      log.info(`[EMAIL-OPTIN] ${this.queue.length} leads elegiveis para email opt-in`);

      return this.queue.length;

    } catch (error) {
      log.error('[EMAIL-OPTIN] Erro ao carregar fila', error);
      return 0;
    }
  }

  _scheduleNext() {
    this._clearTimer();

    if (this.state !== EngineState.RUNNING) return;

    const intervalMs = this.config.intervalSeconds * 1000;

    // Adicionar jitter (0-10 segundos)
    const jitter = Math.random() * 10000;

    this.timerId = setTimeout(async () => {
      try {
        await this._processNext();
      } catch (error) {
        log.error('[EMAIL-OPTIN] Erro no processamento:', error.message);
        if (this.state === EngineState.RUNNING) {
          this._scheduleNext();
        }
      }
    }, intervalMs + jitter);

    const nextAt = new Date(Date.now() + intervalMs + jitter);
    log.debug(`[EMAIL-OPTIN] Proximo envio as ${nextAt.toLocaleTimeString('pt-BR')}`);
  }

  async _processNext() {
    if (this.state !== EngineState.RUNNING) {
      return null;
    }

    // Verificar horario
    const brasilia = getBrasiliaTime();
    if (!this.config.workDays.includes(brasilia.day) ||
        brasilia.hour < this.config.startHour ||
        brasilia.hour >= this.config.endHour) {
      log.info('[EMAIL-OPTIN] Fora do horario de trabalho');
      this._scheduleNext();
      return null;
    }

    // Verificar limite diario
    if (this.metrics.totalSent >= this.config.maxPerDay) {
      log.warn('[EMAIL-OPTIN] Limite diario atingido', { sent: this.metrics.totalSent });
      this.pause();
      return null;
    }

    // Verificar fila
    if (this.queue.length === 0) {
      log.info('[EMAIL-OPTIN] Fila vazia, recarregando...');
      await this._loadQueue();

      if (this.queue.length === 0) {
        log.info('[EMAIL-OPTIN] Todos os emails foram enviados');
        this.stop();
        return null;
      }
    }

    // Processar
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
      log.error('[EMAIL-OPTIN] Erro ao processar lead', error);
      this.metrics.totalFailed++;
      this.metrics.errors.push({
        type: 'process_lead',
        email: lead._email,
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

  async _processLead(lead) {
    const { _email, _telefone, _nome, _empresa } = lead;

    log.info(`[EMAIL-OPTIN] Enviando email para ${_nome} <${_email}>`);

    // Modo dry-run
    if (this.config.dryRun) {
      log.info(`[EMAIL-OPTIN] [DRY-RUN] Simulando envio para ${_email}`);
      this._logOptIn(_email, _telefone, _nome, _empresa, 'dry_run', null);
      return { success: true, email: _email, dryRun: true };
    }

    // Enviar email de convite
    const result = await sendConviteEmail(_email, {
      nome: _nome,
      empresa: _empresa
    });

    if (!result.success) {
      log.error(`[EMAIL-OPTIN] Falha ao enviar para ${_email}: ${result.error}`);
      this._logOptIn(_email, _telefone, _nome, _empresa, 'failed', null, result.error);

      // Atualizar prospect_leads com erro
      this._updateProspectStatus(lead.id, 'erro_email', result.error);

      return { success: false, email: _email, error: result.error };
    }

    log.success(`[EMAIL-OPTIN] Email enviado para ${_email} (messageId: ${result.messageId})`);

    // Registrar opt-in
    this._logOptIn(_email, _telefone, _nome, _empresa, 'sent', result.messageId);

    // Atualizar prospect_leads
    this._updateProspectStatus(lead.id, 'email_enviado');

    // Criar/atualizar lead na tabela leads
    this._createOrUpdateLead(_telefone, _email, _nome, _empresa);

    return {
      success: true,
      email: _email,
      messageId: result.messageId,
      empresa: _empresa
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BANCO DE DADOS
  // ═══════════════════════════════════════════════════════════════════════════

  _logOptIn(email, telefone, nome, empresa, status, messageId, error = null) {
    try {
      const db = getDatabase();
      const tenantId = this.tenantId || DEFAULT_TENANT_ID;

      const sentAt = new Date().toISOString();
      let columns = ['email', 'telefone', 'nome', 'empresa', 'status', 'message_id', 'sent_at', 'error_message'];
      let values = [email, telefone, nome, empresa, status, messageId, sentAt, error];
      ({ columns, values } = appendTenantColumns(db, 'email_optins', columns, values, tenantId));
      const placeholders = columns.map(() => '?').join(', ');

      db.prepare(`
        INSERT INTO email_optins /* tenant-guard: ignore */ (${columns.join(', ')})
        VALUES (${placeholders})
        ON CONFLICT(email) DO UPDATE SET
          status = excluded.status,
          message_id = excluded.message_id,
          sent_at = excluded.sent_at,
          error_message = excluded.error_message,
          updated_at = datetime('now')
      `).run(...values);

    } catch (e) {
      log.error('[EMAIL-OPTIN] Erro ao registrar opt-in', e);
    }
  }

  _updateProspectStatus(prospectId, status, erro = null) {
    try {
      const db = getDatabase();
      const tenantId = this.tenantId || DEFAULT_TENANT_ID;
      const tenantColumn = getTenantColumnForTable('prospect_leads', db);
      const tenantClause = tenantColumn ? ` AND ${tenantColumn} = ?` : '';

      // Nota: tabela prospect_leads usa 'erro_ultima_tentativa' em vez de 'erro'
      db.prepare(`
        UPDATE prospect_leads /* tenant-guard: ignore */
        SET status = ?, erro_ultima_tentativa = ?, processado_at = datetime('now'), updated_at = datetime('now')
        WHERE id = ?${tenantClause}
      `).run(...(tenantColumn ? [status, erro, prospectId, tenantId] : [status, erro, prospectId]));

    } catch (e) {
      log.error('[EMAIL-OPTIN] Erro ao atualizar prospect', e);
    }
  }

  _createOrUpdateLead(telefone, email, nome, empresa) {
    try {
      const db = getDatabase();
      const tenantId = this.tenantId || DEFAULT_TENANT_ID;
      const tenantColumn = getTenantColumnForTable('leads', db);
      const tenantClause = tenantColumn ? ` AND ${tenantColumn} = ?` : '';

      // Verificar se lead ja existe
      const existing = db.prepare(`SELECT id FROM leads /* tenant-guard: ignore */ WHERE telefone = ?${tenantClause}`)
        .get(...(tenantColumn ? [telefone, tenantId] : [telefone]));

      if (existing) {
        // Atualizar campos de opt-in
        db.prepare(`
          UPDATE leads /* tenant-guard: ignore */
          SET email = ?,
              email_optin_status = 'sent',
              email_optin_sent_at = datetime('now'),
              whatsapp_eligible = 0,
              updated_at = datetime('now')
          WHERE telefone = ?${tenantClause}
        `).run(...(tenantColumn ? [email, telefone, tenantId] : [email, telefone]));

        log.info(`[EMAIL-OPTIN] Lead ${telefone} atualizado com email opt-in`);
      } else {
        // Criar novo lead
        const sentAt = new Date().toISOString();
        let columns = ['telefone', 'email', 'nome', 'empresa', 'fonte', 'stage_id', 'cadence_status', 'email_optin_status', 'email_optin_sent_at', 'whatsapp_eligible'];
        let values = [telefone, email, nome || empresa, empresa, 'instagram', 'stage_email_optin', 'not_started', 'sent', sentAt, 0];
        ({ columns, values } = appendTenantColumns(db, 'leads', columns, values, tenantId));
        const placeholders = columns.map(() => '?').join(', ');

        db.prepare(`
          INSERT INTO leads /* tenant-guard: ignore */ (${columns.join(', ')})
          VALUES (${placeholders})
        `).run(...values);

        log.info(`[EMAIL-OPTIN] Lead ${telefone} criado com email opt-in`);
      }

    } catch (e) {
      log.error('[EMAIL-OPTIN] Erro ao criar/atualizar lead', e);
    }
  }

  /**
   * Atualiza elegibilidade para WhatsApp
   * Leads que receberam email ha mais de X horas ficam elegiveis
   */
  _updateWhatsAppEligibility() {
    try {
      const db = getDatabase();
      const tenantId = this.tenantId || DEFAULT_TENANT_ID;
      const leadsTenantColumn = getTenantColumnForTable('leads', db);
      const leadsTenantClause = leadsTenantColumn ? ` AND ${leadsTenantColumn} = ?` : '';
      const optinsTenantColumn = getTenantColumnForTable('email_optins', db);
      const optinsTenantClause = optinsTenantColumn ? ` AND ${optinsTenantColumn} = ?` : '';
      const delayHours = this.config.whatsappEligibilityDelayHours || 24;

      // Atualizar leads que:
      // 1. Receberam email de opt-in
      // 2. Email foi enviado ha mais de X horas
      // 3. Ainda nao estao elegiveis
      const result = db.prepare(`
        UPDATE leads /* tenant-guard: ignore */
        SET whatsapp_eligible = 1,
            stage_id = 'stage_lead_novo',
            updated_at = datetime('now')
        WHERE email_optin_status = 'sent'
          AND email_optin_sent_at IS NOT NULL
          AND whatsapp_eligible = 0
          AND datetime(email_optin_sent_at, '+${delayHours} hours') <= datetime('now')
          ${leadsTenantClause}
      `).run(...(leadsTenantColumn ? [tenantId] : []));

      if (result.changes > 0) {
        log.info(`[EMAIL-OPTIN] ${result.changes} leads ficaram elegiveis para WhatsApp`);

        // Atualizar email_optins tambem
        db.prepare(`
          UPDATE email_optins /* tenant-guard: ignore */
          SET whatsapp_eligible_at = datetime('now'),
              updated_at = datetime('now')
          WHERE status = 'sent'
            AND whatsapp_eligible_at IS NULL
            AND datetime(sent_at, '+${delayHours} hours') <= datetime('now')
            ${optinsTenantClause}
        `).run(...(optinsTenantColumn ? [tenantId] : []));
      }

    } catch (e) {
      log.error('[EMAIL-OPTIN] Erro ao atualizar elegibilidade', e);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILITARIOS
  // ═══════════════════════════════════════════════════════════════════════════

  _isValidEmail(email) {
    if (!email) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  _recordSkip(reason) {
    this.metrics.totalSkipped++;
    this.metrics.skipReasons[reason] = (this.metrics.skipReasons[reason] || 0) + 1;
  }

  _clearTimer() {
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  resetDailyCounters() {
    this.metrics.totalSent = 0;
    this.metrics.totalFailed = 0;
    this.metrics.totalSkipped = 0;
    log.info('[EMAIL-OPTIN] Contadores resetados');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // API PUBLICA
  // ═══════════════════════════════════════════════════════════════════════════

  getStatus() {
    return {
      state: this.state,
      queueSize: this.queue.length,
      currentLead: this.currentLead ? {
        email: this.currentLead._email,
        empresa: this.currentLead._empresa
      } : null,
      config: this.config,
      metrics: this.metrics
    };
  }

  getMetrics() {
    return {
      ...this.metrics,
      queueRemaining: this.queue.length,
      state: this.state
    };
  }

  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    log.info('[EMAIL-OPTIN] Configuracao atualizada', this.config);
    return this.config;
  }

  getStats() {
    try {
      const db = getDatabase();
      const tenantId = this.tenantId || DEFAULT_TENANT_ID;
      const optinsTenantColumn = getTenantColumnForTable('email_optins', db);
      const optinsWhere = optinsTenantColumn ? ` WHERE ${optinsTenantColumn} = ?` : '';
      const leadsTenantColumn = getTenantColumnForTable('leads', db);
      const leadsWhere = leadsTenantColumn ? ` WHERE ${leadsTenantColumn} = ?` : '';
      const prospectTenantColumn = getTenantColumnForTable('prospect_leads', db);
      const prospectWhere = prospectTenantColumn ? ` WHERE ${prospectTenantColumn} = ?` : '';
      const optinsParams = optinsTenantColumn ? [tenantId] : [];
      const leadsParams = leadsTenantColumn ? [tenantId] : [];
      const prospectParams = prospectTenantColumn ? [tenantId] : [];

      return {
        email_optins: {
          total: db.prepare(`SELECT COUNT(*) as c FROM email_optins /* tenant-guard: ignore */${optinsWhere}`).get(...optinsParams).c,
          sent: db.prepare(`SELECT COUNT(*) as c FROM email_optins /* tenant-guard: ignore */${optinsWhere}${optinsWhere ? " AND" : " WHERE"} status = 'sent'`).get(...optinsParams).c,
          failed: db.prepare(`SELECT COUNT(*) as c FROM email_optins /* tenant-guard: ignore */${optinsWhere}${optinsWhere ? " AND" : " WHERE"} status = 'failed'`).get(...optinsParams).c,
          pending: db.prepare(`SELECT COUNT(*) as c FROM email_optins /* tenant-guard: ignore */${optinsWhere}${optinsWhere ? " AND" : " WHERE"} status = 'pending'`).get(...optinsParams).c
        },
        prospect_leads: {
          total: db.prepare(`SELECT COUNT(*) as c FROM prospect_leads /* tenant-guard: ignore */${prospectWhere}`).get(...prospectParams).c,
          pendente: db.prepare(`SELECT COUNT(*) as c FROM prospect_leads /* tenant-guard: ignore */${prospectWhere}${prospectWhere ? " AND" : " WHERE"} status = 'pendente'`).get(...prospectParams).c,
          email_enviado: db.prepare(`SELECT COUNT(*) as c FROM prospect_leads /* tenant-guard: ignore */${prospectWhere}${prospectWhere ? " AND" : " WHERE"} status = 'email_enviado'`).get(...prospectParams).c,
          whatsapp_enviado: db.prepare(`SELECT COUNT(*) as c FROM prospect_leads /* tenant-guard: ignore */${prospectWhere}${prospectWhere ? " AND" : " WHERE"} status = 'whatsapp_enviado'`).get(...prospectParams).c
        },
        leads: {
          total: db.prepare(`SELECT COUNT(*) as c FROM leads /* tenant-guard: ignore */${leadsWhere}`).get(...leadsParams).c,
          whatsapp_eligible: db.prepare(`SELECT COUNT(*) as c FROM leads /* tenant-guard: ignore */${leadsWhere}${leadsWhere ? " AND" : " WHERE"} whatsapp_eligible = 1`).get(...leadsParams).c,
          optin_sent: db.prepare(`SELECT COUNT(*) as c FROM leads /* tenant-guard: ignore */${leadsWhere}${leadsWhere ? " AND" : " WHERE"} email_optin_status = 'sent'`).get(...leadsParams).c
        }
      };

    } catch (e) {
      log.error('[EMAIL-OPTIN] Erro ao obter stats', e);
      return {};
    }
  }

  /**
   * Importar leads de uma fonte externa (ex: instagram-automation)
   */
  async importLeads(leads, tenantId = null) {
    if (tenantId) {
      this.tenantId = tenantId;
    }
    const db = getDatabase();
    let imported = 0;
    let skipped = 0;

    for (const lead of leads) {
      try {
        const telefoneNormalizado = normalizePhone(lead.telefone || lead.phone || lead.whatsapp);

        if (!telefoneNormalizado || !lead.email) {
          skipped++;
          continue;
        }

        // Nota: tabela prospect_leads usa 'whatsapp', 'origem' e 'telefone_normalizado'
        let columns = ['whatsapp', 'telefone_normalizado', 'email', 'nome', 'empresa', 'cidade', 'origem', 'status'];
        let values = [
          lead.telefone || lead.phone || lead.whatsapp,
          telefoneNormalizado,
          lead.email?.toLowerCase().trim(),
          lead.nome || lead.name,
          lead.empresa || lead.company,
          lead.cidade || lead.city,
          lead.fonte || lead.origem || 'instagram',
          'pendente'
        ];
        ({ columns, values } = appendTenantColumns(db, 'prospect_leads', columns, values, this.tenantId || DEFAULT_TENANT_ID));
        const placeholders = columns.map(() => '?').join(', ');

        db.prepare(`
          INSERT INTO prospect_leads /* tenant-guard: ignore */ (${columns.join(', ')})
          VALUES (${placeholders})
          ON CONFLICT(telefone_normalizado) DO UPDATE SET
            email = COALESCE(excluded.email, prospect_leads.email),
            nome = COALESCE(excluded.nome, prospect_leads.nome),
            empresa = COALESCE(excluded.empresa, prospect_leads.empresa),
            updated_at = datetime('now')
        `).run(...values);

        imported++;
      } catch (e) {
        log.error('[EMAIL-OPTIN] Erro ao importar lead', e);
        skipped++;
      }
    }

    log.info(`[EMAIL-OPTIN] Importacao completa: ${imported} importados, ${skipped} ignorados`);

    return { imported, skipped };
  }
}

// Singleton
let instance = null;

export function getEmailOptInEngine() {
  if (!instance) {
    instance = new EmailOptInEngine();
  }
  return instance;
}

export const emailOptInEngine = new EmailOptInEngine();
export default emailOptInEngine;

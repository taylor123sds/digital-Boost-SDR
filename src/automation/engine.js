/**
 * @file automation/engine.js
 * @description Core do Automation Engine - Orquestra triggers, conditions e actions
 * @version 1.0.0
 */

import { EventEmitter } from 'events';
import cron from 'node-cron';
import { getDatabase } from '../db/connection.js';
import { createLogger } from '../utils/logger.enhanced.js';

const logger = createLogger({ module: 'AutomationEngine' });

// SECURITY: Whitelist of allowed tables and fields for dynamic updates
const ALLOWED_TABLES = ['leads', 'meetings', 'tasks', 'cadence_enrollments'];
const ALLOWED_FIELDS = [
  'id', 'nome', 'empresa', 'email', 'telefone', 'whatsapp', 'stage_id', 'pipeline_id',
  'status', 'bant_score', 'cadence_day', 'first_response_at', 'updated_at',
  'priority', 'due_date', 'scheduled_at', 'notes', 'tags', 'source', 'message_count',
  'last_contact', 'next_followup', 'qualification_status'
];

/**
 * Validate table name against whitelist
 */
function isValidTable(table) {
  return ALLOWED_TABLES.includes(table);
}

/**
 * Validate field name against whitelist
 */
function isValidField(field) {
  return ALLOWED_FIELDS.includes(field);
}

/**
 * Automation Engine Core
 * Gerencia workflows de automação com triggers, conditions e actions
 */
class AutomationEngine extends EventEmitter {
  constructor() {
    super();
    this.automations = new Map(); // id -> automation config
    this.scheduledJobs = new Map(); // id -> cron job
    this.isRunning = false;
    this.stats = {
      automationsLoaded: 0,
      executionsTotal: 0,
      executionsSuccess: 0,
      executionsFailed: 0,
      lastExecution: null
    };
  }

  /**
   * Inicializa o engine e carrega automações do banco
   */
  async initialize() {
    try {
      logger.info('Initializing Automation Engine...');

      // Carregar automações ativas do banco
      await this.loadAutomations();

      // Iniciar jobs agendados
      this.startScheduledJobs();

      // Registrar event listeners
      this.registerEventListeners();

      this.isRunning = true;
      logger.info(` Automation Engine initialized with ${this.automations.size} automations`);

      return true;
    } catch (error) {
      logger.error('Failed to initialize Automation Engine', { error: error.message });
      throw error;
    }
  }

  /**
   * Carrega automações do banco de dados
   */
  async loadAutomations() {
    try {
      const db = getDatabase();
      const automations = db.prepare(`
        SELECT * FROM automations WHERE enabled = 1
      `).all();

      for (const automation of automations) {
        const config = {
          ...automation,
          trigger: JSON.parse(automation.trigger_config || '{}'),
          conditions: JSON.parse(automation.conditions || '[]'),
          actions: JSON.parse(automation.actions || '[]')
        };
        this.automations.set(automation.id, config);
      }

      this.stats.automationsLoaded = automations.length;
      logger.info(`Loaded ${automations.length} automations from database`);
    } catch (error) {
      logger.error('Failed to load automations', { error: error.message });
      // Não falhar se tabela não existe ainda
      if (!error.message.includes('no such table')) {
        throw error;
      }
    }
  }

  /**
   * Inicia jobs agendados (cron)
   */
  startScheduledJobs() {
    for (const [id, automation] of this.automations) {
      if (automation.trigger.type === 'schedule' && automation.trigger.cron) {
        this.scheduleJob(id, automation);
      }
    }
  }

  /**
   * Agenda um job cron
   */
  scheduleJob(id, automation) {
    try {
      const cronExpression = automation.trigger.cron;

      if (!cron.validate(cronExpression)) {
        logger.error(`Invalid cron expression for automation ${id}: ${cronExpression}`);
        return;
      }

      const job = cron.schedule(cronExpression, async () => {
        logger.info(` Scheduled automation triggered: ${automation.name}`);
        await this.executeAutomation(id);
      }, {
        scheduled: true,
        timezone: 'America/Sao_Paulo'
      });

      this.scheduledJobs.set(id, job);
      logger.info(`Scheduled job for automation: ${automation.name} (${cronExpression})`);
    } catch (error) {
      logger.error(`Failed to schedule job for automation ${id}`, { error: error.message });
    }
  }

  /**
   * Registra listeners para eventos
   */
  registerEventListeners() {
    // Lead events
    this.on('lead:created', (data) => this.handleEvent('lead_created', data));
    this.on('lead:updated', (data) => this.handleEvent('lead_updated', data));
    this.on('lead:score_changed', (data) => this.handleEvent('lead_score_changed', data));

    // Message events
    this.on('message:received', (data) => this.handleEvent('message_received', data));
    this.on('message:sent', (data) => this.handleEvent('message_sent', data));

    // Meeting events
    this.on('meeting:scheduled', (data) => this.handleEvent('meeting_scheduled', data));
    this.on('meeting:completed', (data) => this.handleEvent('meeting_completed', data));
    this.on('meeting:no_show', (data) => this.handleEvent('meeting_no_show', data));

    // BANT events
    this.on('bant:stage_changed', (data) => this.handleEvent('bant_stage_changed', data));
    this.on('bant:qualified', (data) => this.handleEvent('bant_qualified', data));
  }

  /**
   * Processa um evento e dispara automações relevantes
   */
  async handleEvent(eventType, data) {
    logger.debug(`Event received: ${eventType}`, { data });

    for (const [id, automation] of this.automations) {
      if (automation.trigger.type === 'event' && automation.trigger.event === eventType) {
        logger.info(`Event trigger matched: ${automation.name}`);
        await this.executeAutomation(id, data);
      }
    }
  }

  /**
   * Executa uma automação
   */
  async executeAutomation(id, eventData = {}) {
    const automation = this.automations.get(id);
    if (!automation) {
      logger.error(`Automation not found: ${id}`);
      return { success: false, error: 'Automation not found' };
    }

    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    try {
      logger.info(` Executing automation: ${automation.name}`, { executionId });

      // 1. Buscar dados conforme o trigger
      const targetData = await this.fetchTargetData(automation, eventData);

      if (!targetData || targetData.length === 0) {
        logger.info(`No matching data for automation: ${automation.name}`);
        return { success: true, matched: 0 };
      }

      // 2. Filtrar por conditions
      const matchedData = this.filterByConditions(targetData, automation.conditions);

      if (matchedData.length === 0) {
        logger.info(`No data passed conditions for automation: ${automation.name}`);
        return { success: true, matched: 0 };
      }

      logger.info(`Found ${matchedData.length} items matching conditions`);

      // 3. Executar actions para cada item
      const results = [];
      for (const item of matchedData) {
        const actionResult = await this.executeActions(automation.actions, item, automation);
        results.push(actionResult);
      }

      // 4. Registrar execução
      const duration = Date.now() - startTime;
      await this.logExecution(id, executionId, 'success', matchedData.length, results, duration);

      this.stats.executionsTotal++;
      this.stats.executionsSuccess++;
      this.stats.lastExecution = new Date().toISOString();

      logger.info(` Automation completed: ${automation.name}`, {
        executionId,
        matched: matchedData.length,
        duration: `${duration}ms`
      });

      return { success: true, matched: matchedData.length, results };

    } catch (error) {
      const duration = Date.now() - startTime;
      await this.logExecution(id, executionId, 'failed', 0, null, duration, error.message);

      this.stats.executionsTotal++;
      this.stats.executionsFailed++;

      logger.error(` Automation failed: ${automation.name}`, {
        executionId,
        error: error.message,
        duration: `${duration}ms`
      });

      return { success: false, error: error.message };
    }
  }

  /**
   * Busca dados alvo da automação
   */
  async fetchTargetData(automation, eventData) {
    const db = getDatabase();
    const trigger = automation.trigger;

    // Se tiver dados do evento, usar esses
    if (eventData && Object.keys(eventData).length > 0) {
      return [eventData];
    }

    // Buscar baseado no tipo de trigger
    switch (trigger.target) {
      case 'leads':
        return db.prepare(`
          SELECT * FROM leads /* tenant-guard: ignore */
          WHERE status NOT IN ('convertido', 'desqualificado')
        `).all();

      case 'meetings':
        return db.prepare(`
          SELECT * FROM meetings
          WHERE status = 'agendada'
        `).all();

      case 'opportunities':
        return db.prepare(`
          SELECT * FROM opportunities /* tenant-guard: ignore */
          WHERE status = 'aberta'
        `).all();

      default:
        return db.prepare('SELECT * FROM leads /* tenant-guard: ignore */ WHERE status = "novo"').all();
    }
  }

  /**
   * Filtra dados pelas conditions
   */
  filterByConditions(data, conditions) {
    if (!conditions || conditions.length === 0) {
      return data;
    }

    return data.filter(item => {
      return conditions.every(condition => {
        return this.evaluateCondition(item, condition);
      });
    });
  }

  /**
   * Avalia uma condition
   */
  evaluateCondition(item, condition) {
    const { field, operator, value } = condition;
    const itemValue = item[field];

    switch (operator) {
      case 'equals':
        return itemValue === value;

      case 'not_equals':
        return itemValue !== value;

      case 'greater_than':
        return Number(itemValue) > Number(value);

      case 'less_than':
        return Number(itemValue) < Number(value);

      case 'greater_or_equal':
        return Number(itemValue) >= Number(value);

      case 'less_or_equal':
        return Number(itemValue) <= Number(value);

      case 'contains':
        return String(itemValue).toLowerCase().includes(String(value).toLowerCase());

      case 'not_contains':
        return !String(itemValue).toLowerCase().includes(String(value).toLowerCase());

      case 'in':
        return Array.isArray(value) ? value.includes(itemValue) : false;

      case 'not_in':
        return Array.isArray(value) ? !value.includes(itemValue) : true;

      case 'is_empty':
        return !itemValue || itemValue === '';

      case 'is_not_empty':
        return itemValue && itemValue !== '';

      case 'older_than': {
        // value em formato "48h", "7d", etc
        const dateField = new Date(itemValue);
        const now = new Date();
        const diff = now - dateField;
        const threshold = this.parseTimeValue(value);
        return diff > threshold;
      }

      case 'newer_than': {
        const dateField = new Date(itemValue);
        const now = new Date();
        const diff = now - dateField;
        const threshold = this.parseTimeValue(value);
        return diff < threshold;
      }

      default:
        logger.warn(`Unknown operator: ${operator}`);
        return false;
    }
  }

  /**
   * Converte "48h", "7d" em millisegundos
   */
  parseTimeValue(value) {
    const match = String(value).match(/^(\d+)([hdwm])$/);
    if (!match) return 0;

    const amount = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 'h': return amount * 60 * 60 * 1000;
      case 'd': return amount * 24 * 60 * 60 * 1000;
      case 'w': return amount * 7 * 24 * 60 * 60 * 1000;
      case 'm': return amount * 30 * 24 * 60 * 60 * 1000;
      default: return 0;
    }
  }

  /**
   * Executa as actions de uma automação
   */
  async executeActions(actions, data, automation) {
    const results = [];

    for (const action of actions) {
      try {
        const result = await this.executeAction(action, data, automation);
        results.push({ action: action.type, success: true, result });
      } catch (error) {
        logger.error(`Action failed: ${action.type}`, { error: error.message });
        results.push({ action: action.type, success: false, error: error.message });
      }
    }

    return results;
  }

  /**
   * Executa uma action individual
   */
  async executeAction(action, data, automation) {
    const { type, ...params } = action;

    switch (type) {
      case 'send_whatsapp':
        return await this.actionSendWhatsapp(data, params);

      case 'update_field':
        return await this.actionUpdateField(data, params);

      case 'create_task':
        return await this.actionCreateTask(data, params);

      case 'send_notification':
        return await this.actionSendNotification(data, params, automation);

      case 'move_stage':
        return await this.actionMoveStage(data, params);

      case 'schedule_followup':
        return await this.actionScheduleFollowup(data, params);

      case 'log':
        logger.info(`[Automation Log] ${params.message}`, { data });
        return { logged: true };

      default:
        throw new Error(`Unknown action type: ${type}`);
    }
  }

  /**
   * Action: Enviar WhatsApp
   */
  async actionSendWhatsapp(data, params) {
    const { sendWhatsAppText } = await import('../services/whatsappAdapterProvider.js');

    const phone = data.whatsapp || data.telefone;
    if (!phone) {
      throw new Error('No phone number available');
    }

    // Processar template com variáveis
    let message = params.template || params.message;
    message = this.processTemplate(message, data);

    await sendWhatsAppText(phone, message);

    return { phone, message };
  }

  /**
   * Action: Atualizar campo
   * SECURITY: Uses whitelist validation for table and field names
   */
  async actionUpdateField(data, params) {
    const db = getDatabase();
    const { field, value, operation } = params;

    // SECURITY: Validate field name against whitelist
    if (!isValidField(field)) {
      logger.warn(`[SECURITY] Invalid field name rejected: ${field}`);
      throw new Error(`Invalid field name: ${field}`);
    }

    let newValue = value;

    if (operation === 'increment') {
      newValue = (data[field] || 0) + (value || 1);
    } else if (operation === 'decrement') {
      newValue = (data[field] || 0) - (value || 1);
    } else if (operation === 'append') {
      newValue = `${data[field] || ''},${value}`;
    }

    // Determinar tabela baseado nos dados
    const table = data.bant_score !== undefined ? 'leads' :
                  data.google_event_id !== undefined ? 'meetings' : 'leads';

    // SECURITY: Validate table name against whitelist
    if (!isValidTable(table)) {
      logger.warn(`[SECURITY] Invalid table name rejected: ${table}`);
      throw new Error(`Invalid table name: ${table}`);
    }

    db.prepare(`UPDATE ${table} SET ${field} = ? WHERE id = ?`).run(newValue, data.id);

    return { field, oldValue: data[field], newValue };
  }

  /**
   * Action: Criar tarefa
   */
  async actionCreateTask(data, params) {
    const db = getDatabase();

    const task = {
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: this.processTemplate(params.title, data),
      description: this.processTemplate(params.description || '', data),
      due_date: params.due_date || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      priority: params.priority || 'medium',
      status: 'pending',
      related_type: 'lead',
      related_id: data.id,
      created_at: new Date().toISOString()
    };

    // Se tabela tasks não existe, apenas logar
    try {
      db.prepare(`
        INSERT INTO tasks (id, title, description, due_date, priority, status, related_type, related_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(task.id, task.title, task.description, task.due_date, task.priority, task.status, task.related_type, task.related_id, task.created_at);
    } catch (error) {
      logger.warn('Tasks table not available, logging task instead');
      logger.info('Task created', { task });
    }

    return task;
  }

  /**
   * Action: Enviar notificação
   */
  async actionSendNotification(data, params, automation) {
    // Emitir evento de notificação para o dashboard
    this.emit('notification', {
      type: params.notification_type || 'info',
      title: this.processTemplate(params.title || automation.name, data),
      message: this.processTemplate(params.message, data),
      data: data,
      timestamp: new Date().toISOString()
    });

    return { notified: true };
  }

  /**
   * Action: Mover estágio BANT
   */
  async actionMoveStage(data, params) {
    const db = getDatabase();
    const { stage } = params;

    db.prepare(`
      UPDATE leads /* tenant-guard: ignore */ SET status = ?, updated_at = datetime('now') WHERE id = ?
    `).run(stage, data.id);

    return { id: data.id, newStage: stage };
  }

  /**
   * Action: Agendar follow-up
   */
  async actionScheduleFollowup(data, params) {
    const delay = this.parseTimeValue(params.delay || '24h');
    const followupDate = new Date(Date.now() + delay);

    // Criar uma automação one-time para o follow-up
    const db = getDatabase();

    db.prepare(`
      UPDATE leads /* tenant-guard: ignore */
      SET custom_fields = json_set(COALESCE(custom_fields, '{}'), '$.next_followup', ?)
      WHERE id = ?
    `).run(followupDate.toISOString(), data.id);

    return {
      scheduled: true,
      followupDate: followupDate.toISOString()
    };
  }

  /**
   * Processa template substituindo variáveis
   */
  processTemplate(template, data) {
    if (!template) return '';

    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] || match;
    });
  }

  /**
   * Registra execução no banco
   */
  async logExecution(automationId, executionId, status, matched, results, duration, error = null) {
    try {
      const db = getDatabase();

      db.prepare(`
        INSERT INTO automation_executions
        (id, automation_id, status, matched_count, results, duration_ms, error, executed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).run(
        executionId,
        automationId,
        status,
        matched,
        JSON.stringify(results),
        duration,
        error
      );
    } catch (err) {
      // Tabela pode não existir ainda
      logger.debug('Could not log execution', { error: err.message });
    }
  }

  /**
   * Adiciona uma nova automação
   */
  async addAutomation(config) {
    const db = getDatabase();

    const id = config.id || `auto_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    db.prepare(`
      INSERT INTO automations (id, name, description, trigger_config, conditions, actions, enabled, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      id,
      config.name,
      config.description || '',
      JSON.stringify(config.trigger),
      JSON.stringify(config.conditions || []),
      JSON.stringify(config.actions),
      config.enabled !== false ? 1 : 0
    );

    // Recarregar automações
    await this.loadAutomations();

    // Se for schedule, iniciar job
    const automation = this.automations.get(id);
    if (automation && automation.trigger.type === 'schedule') {
      this.scheduleJob(id, automation);
    }

    logger.info(`Added automation: ${config.name}`, { id });
    return id;
  }

  /**
   * Remove uma automação
   */
  async removeAutomation(id) {
    const db = getDatabase();

    // Parar job se existir
    if (this.scheduledJobs.has(id)) {
      this.scheduledJobs.get(id).stop();
      this.scheduledJobs.delete(id);
    }

    // Remover do banco
    db.prepare('DELETE FROM automations WHERE id = ?').run(id);

    // Remover da memória
    this.automations.delete(id);

    logger.info(`Removed automation: ${id}`);
  }

  /**
   * Atualiza uma automação
   */
  async updateAutomation(id, config) {
    const db = getDatabase();

    db.prepare(`
      UPDATE automations
      SET name = ?, description = ?, trigger_config = ?, conditions = ?, actions = ?, enabled = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      config.name,
      config.description || '',
      JSON.stringify(config.trigger),
      JSON.stringify(config.conditions || []),
      JSON.stringify(config.actions),
      config.enabled !== false ? 1 : 0,
      id
    );

    // Recarregar
    await this.loadAutomations();

    // Atualizar job se necessário
    if (this.scheduledJobs.has(id)) {
      this.scheduledJobs.get(id).stop();
      this.scheduledJobs.delete(id);
    }

    const automation = this.automations.get(id);
    if (automation && automation.trigger.type === 'schedule' && automation.enabled) {
      this.scheduleJob(id, automation);
    }

    logger.info(`Updated automation: ${id}`);
  }

  /**
   * Habilita/desabilita uma automação
   */
  async toggleAutomation(id, enabled) {
    const db = getDatabase();

    db.prepare('UPDATE automations SET enabled = ? WHERE id = ?').run(enabled ? 1 : 0, id);

    if (!enabled && this.scheduledJobs.has(id)) {
      this.scheduledJobs.get(id).stop();
      this.scheduledJobs.delete(id);
    }

    await this.loadAutomations();

    if (enabled) {
      const automation = this.automations.get(id);
      if (automation && automation.trigger.type === 'schedule') {
        this.scheduleJob(id, automation);
      }
    }

    logger.info(`Toggled automation ${id}: ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Executa automação manualmente
   */
  async runManually(id) {
    return await this.executeAutomation(id);
  }

  /**
   * Retorna lista de automações
   */
  getAutomations() {
    return Array.from(this.automations.values());
  }

  /**
   * Retorna estatísticas do engine
   */
  getStats() {
    return {
      ...this.stats,
      isRunning: this.isRunning,
      scheduledJobs: this.scheduledJobs.size,
      automationsActive: this.automations.size
    };
  }

  /**
   * Para o engine
   */
  stop() {
    // Parar todos os jobs
    for (const [id, job] of this.scheduledJobs) {
      job.stop();
    }
    this.scheduledJobs.clear();
    this.isRunning = false;

    logger.info('Automation Engine stopped');
  }
}

// Singleton
let engineInstance = null;

export function getAutomationEngine() {
  if (!engineInstance) {
    engineInstance = new AutomationEngine();
  }
  return engineInstance;
}

export default AutomationEngine;

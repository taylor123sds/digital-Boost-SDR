/**
 * @file lead.repository.js
 * @description Lead Repository - SQLite as primary, Google Sheets as optional sync
 *
 * This is the main abstraction layer for lead data.
 * All lead operations go through here, using SQLite as the source of truth.
 * Google Sheets sync is optional and runs in background (non-blocking).
 *  FIX CRÍTICO: Usar conexão centralizada para evitar corrupção do banco
 */

import { getDatabase } from '../db/index.js';
import { getTenantColumnForTable } from '../utils/tenantCompat.js';

// Phone normalization helper
//  FIX CRÍTICO: PRESERVAR o número real - NÃO remover o "9" do celular
// Formato E.164: celular = 13 dígitos (55+DDD+9+8), fixo = 12 dígitos (55+DDD+8)
function normalizePhone(phone) {
  if (!phone) return null;

  // Remover sufixos do WhatsApp e caracteres não-numéricos
  let cleaned = String(phone)
    .replace('@s.whatsapp.net', '')
    .replace('@c.us', '')
    .replace('@lid', '')
    .replace(/\D/g, '');

  // Rejeitar IDs de grupo/lista (muito longos)
  if (cleaned.length > 13 && !cleaned.startsWith('55')) {
    return null;
  }
  if (cleaned.startsWith('55') && cleaned.length > 13) {
    return null;
  }

  // Adicionar código de país se necessário
  // 11 dígitos = celular sem código país  13 dígitos
  // 10 dígitos = fixo sem código país  12 dígitos
  if (cleaned.length === 10 || cleaned.length === 11) {
    cleaned = '55' + cleaned;
  }

  return cleaned;
}

// Generate unique lead ID
function generateLeadId() {
  return `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * LeadRepository - Primary data access for leads
 */
export class LeadRepository {
  constructor() {
    this.sheetsEnabled = false;
    this.sheetsSyncQueue = [];
    this.syncInterval = null;
  }

  /**
   * Get database connection
   *  CORREÇÃO: Usar conexão singleton do db/connection.js
   */
  getDb() {
    return getDatabase();
  }

  /**
   * Enable Google Sheets background sync
   * @param {number} intervalMs - Sync interval in milliseconds (default: 60000 = 1 minute)
   */
  enableSheetsSync(intervalMs = 60000) {
    this.sheetsEnabled = true;
    console.log(' [LEAD-REPO] Google Sheets sync enabled (background)');

    // Start background sync worker
    if (!this.syncInterval) {
      this.syncInterval = setInterval(() => this.processSyncQueue(), intervalMs);
    }
  }

  /**
   * Disable Google Sheets sync
   */
  disableSheetsSync() {
    this.sheetsEnabled = false;
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    console.log(' [LEAD-REPO] Google Sheets sync disabled');
  }

  /**
   * Queue a lead for Sheets sync (non-blocking)
   */
  queueSheetsSync(leadId, action = 'upsert') {
    if (!this.sheetsEnabled) return;
    this.sheetsSyncQueue.push({ leadId, action, timestamp: Date.now() });
  }

  /**
   * Process Sheets sync queue (runs in background)
   */
  async processSyncQueue() {
    if (this.sheetsSyncQueue.length === 0) return;

    const batch = this.sheetsSyncQueue.splice(0, 10); // Process 10 at a time
    console.log(` [LEAD-REPO] Syncing ${batch.length} leads to Sheets...`);

    try {
      const { updateFunnelLead } = await import('../tools/google_sheets.js');

      for (const item of batch) {
        try {
          const lead = this.findById(item.leadId);
          if (lead) {
            await updateFunnelLead(lead.telefone || lead.whatsapp, {
              nome: lead.nome,
              empresa: lead.empresa,
              email: lead.email,
              pipeline_stage: lead.stage_id,
              cadence_status: lead.cadence_status,
              cadence_day: lead.cadence_day,
              response_type: lead.response_type,
              bant_score: lead.bant_score
            });
          }
        } catch (err) {
          console.warn(` [LEAD-REPO] Sheets sync failed for ${item.leadId}:`, err.message);
          // Don't re-queue - Sheets is optional
        }
      }
    } catch (err) {
      console.warn(' [LEAD-REPO] Sheets module not available:', err.message);
    }
  }

  // ==========================================
  // CRUD Operations (SQLite Primary)
  // ==========================================

  /**
   * Create a new lead
   * @param {Object} data - Lead data
   * @returns {Object} Created lead
   */
  create(data) {
    const db = this.getDb();
    const id = data.id || generateLeadId();
    const normalizedPhone = normalizePhone(data.telefone || data.whatsapp);
    const tenantId = data.tenant_id || data.team_id;

    const leadData = {
      id,
      nome: data.nome || 'Sem nome',
      empresa: data.empresa || null,
      cargo: data.cargo || null,
      email: data.email || null,
      telefone: normalizedPhone,
      whatsapp: normalizedPhone,
      origem: data.origem || 'whatsapp',
      campanha: data.campanha || null,
      midia: data.midia || null,
      status: data.status || 'novo',
      score: data.score || 0,
      segmento: data.segmento || null,
      interesse: data.interesse || null,
      bant_budget: data.bant_budget || null,
      bant_authority: data.bant_authority || null,
      bant_need: data.bant_need || null,
      bant_timing: data.bant_timing || null,
      bant_score: data.bant_score || 0,
      owner_id: data.owner_id || null,
      pipeline_id: data.pipeline_id || 'pipeline_outbound_solar',
      stage_id: data.stage_id || 'stage_lead_novo',
      stage_entered_at: new Date().toISOString(),
      cadence_status: data.cadence_status || 'not_started',
      cadence_day: data.cadence_day || 0,
      custom_fields: JSON.stringify(data.custom_fields || {}),
      tags: JSON.stringify(data.tags || []),
      notas: data.notas || null
    };

    if (tenantId) {
      const tenantColumn = getTenantColumnForTable('leads', db);
      if (tenantColumn) {
        leadData[tenantColumn] = tenantId;
      }
    }

    const columns = Object.keys(leadData);
    const placeholders = columns.map(() => '?').join(', ');
    const values = Object.values(leadData);

    const stmt = db.prepare(`
      INSERT INTO leads (${columns.join(', ')})
      VALUES (${placeholders})
    `);

    stmt.run(...values);

    // Queue for Sheets sync (non-blocking)
    this.queueSheetsSync(id, 'create');

    console.log(` [LEAD-REPO] Lead created: ${id}`);
    return this.findById(id);
  }

  /**
   * Find lead by ID
   */
  findById(id) {
    const db = this.getDb();
    return db.prepare('SELECT * FROM leads WHERE id = ?').get(id);
  }

  /**
   * Find lead by phone number
   */
  findByPhone(phone) {
    const db = this.getDb();
    const normalized = normalizePhone(phone);
    return db.prepare(`
      SELECT * FROM leads
      WHERE telefone = ? OR whatsapp = ?
      ORDER BY created_at DESC
      LIMIT 1
    `).get(normalized, normalized);
  }

  /**
   * Find or create lead by phone
   */
  findOrCreateByPhone(phone, defaultData = {}) {
    let lead = this.findByPhone(phone);
    if (!lead) {
      lead = this.create({
        telefone: phone,
        whatsapp: phone,
        ...defaultData
      });
    }
    return lead;
  }

  /**
   * Update lead
   */
  update(id, data) {
    const db = this.getDb();
    // Remove undefined values
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([_, v]) => v !== undefined)
    );

    if (Object.keys(cleanData).length === 0) return this.findById(id);

    const setClause = Object.keys(cleanData)
      .map(k => `${k} = ?`)
      .join(', ');
    const values = [...Object.values(cleanData), id];

    db.prepare(`UPDATE leads SET ${setClause} WHERE id = ?`).run(...values);

    // Queue for Sheets sync
    this.queueSheetsSync(id, 'update');

    return this.findById(id);
  }

  /**
   * Update lead by phone
   */
  updateByPhone(phone, data) {
    const lead = this.findByPhone(phone);
    if (lead) {
      return this.update(lead.id, data);
    }
    return null;
  }

  /**
   * Upsert lead (create or update by phone)
   * This is the main method used by the funil/pipeline
   */
  upsert(phone, data) {
    let lead = this.findByPhone(phone);
    if (lead) {
      return this.update(lead.id, data);
    } else {
      return this.create({ telefone: phone, ...data });
    }
  }

  /**
   * Delete lead
   */
  delete(id) {
    const db = this.getDb();
    db.prepare('DELETE FROM leads WHERE id = ?').run(id);
    return true;
  }

  // ==========================================
  // Query Methods (for Dashboard/Funil)
  // ==========================================

  /**
   * Get all leads (with pagination)
   */
  findAll(options = {}) {
    const db = this.getDb();
    const { limit = 100, offset = 0, orderBy = 'created_at', order = 'DESC', tenantId = null } = options;
    const tenantColumn = tenantId ? getTenantColumnForTable('leads', db) : null;
    const tenantWhere = tenantColumn ? `WHERE ${tenantColumn} = ?` : '';
    const tenantParams = tenantColumn ? [tenantId] : [];

    return db.prepare(`
      SELECT * FROM leads
      ${tenantWhere}
      ORDER BY ${orderBy} ${order}
      LIMIT ? OFFSET ?
    `).all(...tenantParams, limit, offset);
  }

  /**
   * Get leads by stage (for funil)
   */
  findByStage(stageId, options = {}) {
    const db = this.getDb();
    const { limit = 100, offset = 0 } = options;

    return db.prepare(`
      SELECT * FROM leads
      WHERE stage_id = ?
      ORDER BY stage_entered_at DESC
      LIMIT ? OFFSET ?
    `).all(stageId, limit, offset);
  }

  /**
   * Get leads by pipeline (for funil)
   */
  findByPipeline(pipelineId = 'pipeline_outbound_solar') {
    const db = this.getDb();
    return db.prepare(`
      SELECT * FROM leads
      WHERE pipeline_id = ?
      ORDER BY stage_entered_at DESC
    `).all(pipelineId);
  }

  /**
   * Get funil leads grouped by stage (for dashboard)
   */
  getFunnelLeads(pipelineId = 'pipeline_outbound_solar') {
    const db = this.getDb();
    // Get all stages
    const stages = db.prepare(`
      SELECT * FROM pipeline_stages
      WHERE pipeline_id = ?
      ORDER BY position ASC
    `).all(pipelineId);

    // Get leads for each stage
    const result = stages.map(stage => {
      const leads = db.prepare(`
        SELECT * FROM leads
        WHERE stage_id = ?
        ORDER BY stage_entered_at DESC
      `).all(stage.id);

      return {
        stage: stage,
        leads: leads,
        count: leads.length
      };
    });

    return result;
  }

  /**
   * Get funil stats (for dashboard)
   * Made resilient to handle missing columns gracefully
   */
  getFunnelStats(pipelineId = 'pipeline_outbound_solar', tenantId = null) {
    const db = this.getDb();
    const tenantColumn = tenantId ? getTenantColumnForTable('leads', db) : null;
    const tenantAnd = tenantColumn ? `AND ${tenantColumn} = ?` : '';
    const tenantWhere = tenantColumn ? `WHERE ${tenantColumn} = ?` : '';
    const tenantParams = tenantColumn ? [tenantId] : [];

    // Check if pipeline_id column exists
    const columns = db.prepare("PRAGMA table_info(leads)").all();
    const columnNames = columns.map(c => c.name);
    const hasPipelineId = columnNames.includes('pipeline_id');
    const hasBantScore = columnNames.includes('bant_score');
    const hasFirstResponseAt = columnNames.includes('first_response_at');

    // Get total - use pipeline_id only if column exists
    let total = 0;
    if (hasPipelineId) {
      total = db.prepare(`SELECT COUNT(*) as count FROM leads WHERE pipeline_id = ? ${tenantAnd}`)
        .get(pipelineId, ...tenantParams)?.count || 0;
    } else {
      total = db.prepare(`SELECT COUNT(*) as count FROM leads ${tenantWhere}`)
        .get(...tenantParams)?.count || 0;
    }

    // Get by stage
    let byStage = [];
    if (hasPipelineId) {
      byStage = db.prepare(`
        SELECT stage_id, COUNT(*) as count FROM leads WHERE pipeline_id = ? ${tenantAnd} GROUP BY stage_id
      `).all(pipelineId, ...tenantParams);
    } else {
      byStage = db.prepare(`
        SELECT stage_id, COUNT(*) as count FROM leads ${tenantWhere} GROUP BY stage_id
      `).all(...tenantParams);
    }

    // Get by cadence status
    let byCadenceStatus = [];
    if (hasPipelineId) {
      byCadenceStatus = db.prepare(`
        SELECT cadence_status, COUNT(*) as count FROM leads WHERE pipeline_id = ? ${tenantAnd} GROUP BY cadence_status
      `).all(pipelineId, ...tenantParams);
    } else {
      byCadenceStatus = db.prepare(`
        SELECT cadence_status, COUNT(*) as count FROM leads ${tenantWhere} GROUP BY cadence_status
      `).all(...tenantParams);
    }

    // Get responded count - only if first_response_at exists
    let responded = 0;
    if (hasFirstResponseAt) {
      if (hasPipelineId) {
        responded = db.prepare(`SELECT COUNT(*) as count FROM leads WHERE pipeline_id = ? AND first_response_at IS NOT NULL ${tenantAnd}`)
          .get(pipelineId, ...tenantParams)?.count || 0;
      } else {
        responded = db.prepare(`SELECT COUNT(*) as count FROM leads WHERE first_response_at IS NOT NULL ${tenantAnd}`)
          .get(...tenantParams)?.count || 0;
      }
    }

    // Get avg bant score - only if bant_score exists
    let avgBantScore = 0;
    if (hasBantScore) {
      if (hasPipelineId) {
        avgBantScore = db.prepare(`SELECT AVG(bant_score) as avg FROM leads WHERE pipeline_id = ? AND bant_score > 0 ${tenantAnd}`)
          .get(pipelineId, ...tenantParams)?.avg || 0;
      } else {
        avgBantScore = db.prepare(`SELECT AVG(bant_score) as avg FROM leads WHERE bant_score > 0 ${tenantAnd}`)
          .get(...tenantParams)?.avg || 0;
      }
    }

    const won = db.prepare(`SELECT COUNT(*) as count FROM leads WHERE stage_id = 'stage_ganhou' ${tenantAnd}`)
      .get(...tenantParams)?.count || 0;
    const lost = db.prepare(`SELECT COUNT(*) as count FROM leads WHERE stage_id = 'stage_perdeu' ${tenantAnd}`)
      .get(...tenantParams)?.count || 0;

    const conversionRate = total > 0 ? ((won / total) * 100).toFixed(2) : 0;
    const responseRate = total > 0 ? ((responded / total) * 100).toFixed(2) : 0;

    return {
      total,
      byStage,
      byCadenceStatus,
      responded,
      avgBantScore: Number(avgBantScore).toFixed(1),
      won,
      lost,
      conversionRate: parseFloat(conversionRate),
      responseRate: parseFloat(responseRate)
    };
  }

  /**
   * Search leads
   */
  search(query, options = {}) {
    const db = this.getDb();
    const { limit = 50 } = options;
    const searchTerm = `%${query}%`;

    return db.prepare(`
      SELECT * FROM leads
      WHERE nome LIKE ? OR empresa LIKE ? OR email LIKE ? OR telefone LIKE ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(searchTerm, searchTerm, searchTerm, searchTerm, limit);
  }

  /**
   * Update lead stage (move in pipeline)
   */
  updateStage(leadId, newStageId, notes = null) {
    const db = this.getDb();
    const lead = this.findById(leadId);
    if (!lead) return null;

    const oldStageId = lead.stage_id;

    // Update lead
    this.update(leadId, {
      stage_id: newStageId,
      stage_entered_at: new Date().toISOString()
    });

    // Log stage change
    db.prepare(`
      INSERT INTO pipeline_history (id, lead_id, from_stage_id, to_stage_id, moved_by, notes)
      VALUES (?, ?, ?, ?, 'system', ?)
    `).run(
      `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      leadId,
      oldStageId,
      newStageId,
      notes
    );

    // Queue for Sheets sync
    this.queueSheetsSync(leadId, 'stage_change');

    return this.findById(leadId);
  }

  /**
   * Get pipeline opportunities (for pipeline.routes.js compatibility)
   */
  getPipelineOpportunities(pipelineId = 'pipeline_outbound_solar') {
    return this.getFunnelLeads(pipelineId);
  }

  /**
   * Add pipeline opportunity (for pipeline.routes.js compatibility)
   */
  addPipelineOpportunity(data) {
    return this.create(data);
  }

  /**
   * Update pipeline opportunity (for pipeline.routes.js compatibility)
   */
  updatePipelineOpportunity(phone, data) {
    return this.upsert(phone, data);
  }
}

// Singleton instance
export const leadRepository = new LeadRepository();

// Export compatibility functions (drop-in replacement for google_sheets.js)
export const getFunnelLeads = () => leadRepository.getFunnelLeads();
export const updateFunnelLead = (phone, data) => leadRepository.upsert(phone, data);
export const getPipelineOpportunities = (pipelineId) => leadRepository.getPipelineOpportunities(pipelineId);
export const addPipelineOpportunity = (data) => leadRepository.addPipelineOpportunity(data);
export const updatePipelineOpportunity = (phone, data) => leadRepository.updatePipelineOpportunity(phone, data);

export default leadRepository;

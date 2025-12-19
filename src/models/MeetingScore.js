/**
 * @file MeetingScore.js
 * @description Model para scores de metodologias de venda (SPIN, BANT, Challenger)
 * @architecture Layer: Data Layer - Database Models
 */

//  FIX: Usar getDatabase() singleton ao invés de criar conexão direta
import { getDatabase } from '../db/index.js';


/**
 * MeetingScore Model
 * Responsável por operações CRUD na tabela meeting_scores
 */
class MeetingScore {
  constructor() {
    //  FIX: Não armazenar referência - sempre buscar conexão fresh
  }

  /**
   * Obtém conexão do singleton
   */
  getDb() {
    return getDatabase();
  }

  /**
   * Cria novo score
   */
  create(data) {
    const {
      analysis_id,
      meeting_id,
      // SPIN scores
      spin_situation_score = 0,
      spin_problem_score = 0,
      spin_implication_score = 0,
      spin_needpayoff_score = 0,
      // BANT scores
      bant_budget_score = 0,
      bant_authority_score = 0,
      bant_need_score = 0,
      bant_timeline_score = 0,
      // Challenger scores
      challenger_teach_score = 0,
      challenger_tailor_score = 0,
      challenger_control_score = 0,
      // Methodology detection
      metodologia_primaria = null,
      metodologia_secundaria = null,
      confianca_deteccao = null,
      // Weights (default: BANT 40%, SPIN 30%, Challenger 30%)
      peso_spin = 0.30,
      peso_bant = 0.40,
      peso_challenger = 0.30,
      // Evidence
      evidencias = {},
      // GPT metadata
      model_usado = 'gpt-4',
      prompt_version = 'v1.0',
      metadata = {}
    } = data;

    // Calculate totals (triggers will also calculate, but good to have in code)
    const spin_total = spin_situation_score + spin_problem_score + spin_implication_score + spin_needpayoff_score;
    const bant_total = bant_budget_score + bant_authority_score + bant_need_score + bant_timeline_score;
    const challenger_total = challenger_teach_score + challenger_tailor_score + challenger_control_score;

    // Weighted final score
    const score_total = (spin_total * peso_spin) + (bant_total * peso_bant) + (challenger_total * peso_challenger);

    // Determine nota_geral
    let nota_geral;
    if (score_total >= 90) nota_geral = 'excelente';
    else if (score_total >= 70) nota_geral = 'bom';
    else if (score_total >= 50) nota_geral = 'regular';
    else nota_geral = 'ruim';

    // Determine if followed methodologies
    const spin_seguiu = spin_total >= 60; // At least 60/100
    const bant_qualificado = bant_total >= 75; // At least 75/100 for qualified
    const challenger_seguiu = challenger_total >= 60;

    const stmt = this.getDb().prepare(`
      INSERT INTO meeting_scores (
        analysis_id, meeting_id, score_total, nota_geral,
        spin_situation_score, spin_problem_score, spin_implication_score, spin_needpayoff_score,
        spin_total_score, spin_seguiu_metodologia,
        bant_budget_score, bant_authority_score, bant_need_score, bant_timeline_score,
        bant_total_score, bant_qualificado,
        challenger_teach_score, challenger_tailor_score, challenger_control_score,
        challenger_total_score, challenger_seguiu_metodologia,
        metodologia_primaria, metodologia_secundaria, confianca_deteccao,
        peso_spin, peso_bant, peso_challenger,
        evidencias, model_usado, prompt_version, metadata
      ) VALUES (
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?,
        ?, ?, ?, ?,
        ?, ?,
        ?, ?, ?,
        ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?
      )
    `);

    const result = stmt.run(
      analysis_id,
      meeting_id,
      score_total,
      nota_geral,
      // SPIN
      spin_situation_score,
      spin_problem_score,
      spin_implication_score,
      spin_needpayoff_score,
      spin_total,
      spin_seguiu ? 1 : 0,
      // BANT
      bant_budget_score,
      bant_authority_score,
      bant_need_score,
      bant_timeline_score,
      bant_total,
      bant_qualificado ? 1 : 0,
      // Challenger
      challenger_teach_score,
      challenger_tailor_score,
      challenger_control_score,
      challenger_total,
      challenger_seguiu ? 1 : 0,
      // Detection
      metodologia_primaria,
      metodologia_secundaria,
      confianca_deteccao,
      // Weights
      peso_spin,
      peso_bant,
      peso_challenger,
      // Metadata
      JSON.stringify(evidencias),
      model_usado,
      prompt_version,
      JSON.stringify(metadata)
    );

    return this.findById(result.lastInsertRowid);
  }

  /**
   * Busca score por ID
   */
  findById(id) {
    const stmt = this.getDb().prepare('SELECT * FROM meeting_scores WHERE id = ?');
    const row = stmt.get(id);
    return row ? this._parseRow(row) : null;
  }

  /**
   * Busca score por analysis_id
   */
  findByAnalysisId(analysisId) {
    const stmt = this.getDb().prepare('SELECT * FROM meeting_scores WHERE analysis_id = ?');
    const row = stmt.get(analysisId);
    return row ? this._parseRow(row) : null;
  }

  /**
   * Busca score por meeting_id
   */
  findByMeetingId(meetingId) {
    const stmt = this.getDb().prepare('SELECT * FROM meeting_scores WHERE meeting_id = ?');
    const row = stmt.get(meetingId);
    return row ? this._parseRow(row) : null;
  }

  /**
   * Busca scores por nota_geral
   */
  findByNota(nota) {
    const stmt = this.getDb().prepare(`
      SELECT * FROM meeting_scores
      WHERE nota_geral = ?
      ORDER BY score_total DESC
    `);
    const rows = stmt.all(nota);
    return rows.map(row => this._parseRow(row));
  }

  /**
   * Busca scores excelentes (90+)
   */
  findExcellent() {
    return this.findByNota('excelente');
  }

  /**
   * Busca scores ruins (<50)
   */
  findPoor() {
    return this.findByNota('ruim');
  }

  /**
   * Busca scores que seguiram SPIN
   */
  findSPINCompliant() {
    const stmt = this.getDb().prepare(`
      SELECT * FROM meeting_scores
      WHERE spin_seguiu_metodologia = 1
      ORDER BY spin_total_score DESC
    `);
    const rows = stmt.all();
    return rows.map(row => this._parseRow(row));
  }

  /**
   * Busca leads qualificados (BANT completo)
   */
  findBANTQualified() {
    const stmt = this.getDb().prepare(`
      SELECT * FROM meeting_scores
      WHERE bant_qualificado = 1
      ORDER BY bant_total_score DESC
    `);
    const rows = stmt.all();
    return rows.map(row => this._parseRow(row));
  }

  /**
   * Busca scores por metodologia primária
   */
  findByMethodology(methodology) {
    const stmt = this.getDb().prepare(`
      SELECT * FROM meeting_scores
      WHERE metodologia_primaria = ?
      ORDER BY score_total DESC
    `);
    const rows = stmt.all(methodology);
    return rows.map(row => this._parseRow(row));
  }

  /**
   * Atualiza score
   */
  update(id, data) {
    const currentScore = this.findById(id);
    if (!currentScore) return null;

    const fields = [];
    const values = [];

    // Update individual scores
    if (data.spin_situation_score !== undefined) {
      fields.push('spin_situation_score = ?');
      values.push(data.spin_situation_score);
    }
    // ... (similar for other scores)

    // Recalculate totals if any component changed
    const needsRecalc = Object.keys(data).some(key => key.includes('_score'));

    if (needsRecalc) {
      // Get updated values
      const updated = { ...currentScore, ...data };

      const spin_total = updated.spin_situation_score + updated.spin_problem_score +
                        updated.spin_implication_score + updated.spin_needpayoff_score;
      const bant_total = updated.bant_budget_score + updated.bant_authority_score +
                        updated.bant_need_score + updated.bant_timeline_score;
      const challenger_total = updated.challenger_teach_score + updated.challenger_tailor_score +
                              updated.challenger_control_score;

      const score_total = (spin_total * updated.peso_spin) +
                         (bant_total * updated.peso_bant) +
                         (challenger_total * updated.peso_challenger);

      fields.push('spin_total_score = ?', 'bant_total_score = ?', 'challenger_total_score = ?', 'score_total = ?');
      values.push(spin_total, bant_total, challenger_total, score_total);
    }

    if (data.metadata !== undefined) {
      fields.push('metadata = ?');
      values.push(JSON.stringify(data.metadata));
    }

    if (fields.length === 0) {
      return currentScore;
    }

    fields.push('updated_at = datetime("now")');
    values.push(id);

    const stmt = this.getDb().prepare(`
      UPDATE meeting_scores
      SET ${fields.join(', ')}
      WHERE id = ?
    `);
    stmt.run(...values);

    return this.findById(id);
  }

  /**
   * Deleta score
   */
  delete(id) {
    const stmt = this.getDb().prepare('DELETE FROM meeting_scores WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Estatísticas gerais
   */
  getStats() {
    const stmt = this.getDb().prepare(`
      SELECT
        COUNT(*) as total,
        AVG(score_total) as avg_score,
        AVG(spin_total_score) as avg_spin,
        AVG(bant_total_score) as avg_bant,
        AVG(challenger_total_score) as avg_challenger,
        SUM(CASE WHEN spin_seguiu_metodologia = 1 THEN 1 ELSE 0 END) as spin_compliant,
        SUM(CASE WHEN bant_qualificado = 1 THEN 1 ELSE 0 END) as bant_qualified,
        SUM(CASE WHEN challenger_seguiu_metodologia = 1 THEN 1 ELSE 0 END) as challenger_compliant,
        SUM(CASE WHEN nota_geral = 'excelente' THEN 1 ELSE 0 END) as excellent,
        SUM(CASE WHEN nota_geral = 'bom' THEN 1 ELSE 0 END) as good,
        SUM(CASE WHEN nota_geral = 'regular' THEN 1 ELSE 0 END) as regular,
        SUM(CASE WHEN nota_geral = 'ruim' THEN 1 ELSE 0 END) as poor
      FROM meeting_scores
    `);
    return stmt.get();
  }

  /**
   * Distribuição de metodologias primárias
   */
  getMethodologyDistribution() {
    const stmt = this.getDb().prepare(`
      SELECT
        metodologia_primaria,
        COUNT(*) as count,
        AVG(score_total) as avg_score
      FROM meeting_scores
      WHERE metodologia_primaria IS NOT NULL
      GROUP BY metodologia_primaria
      ORDER BY count DESC
    `);
    return stmt.all();
  }

  /**
   * Top performers por metodologia
   */
  getTopPerformers(limit = 10) {
    const stmt = this.getDb().prepare(`
      SELECT
        ms.*,
        m.titulo as meeting_title,
        m.organizador_id as seller_id
      FROM meeting_scores ms
      JOIN meetings m ON ms.meeting_id = m.id
      ORDER BY ms.score_total DESC
      LIMIT ?
    `);
    const rows = stmt.all(limit);
    return rows.map(row => this._parseRow(row));
  }

  /**
   * Parse row
   * @private
   */
  _parseRow(row) {
    if (!row) return null;

    return {
      ...row,
      evidencias: row.evidencias ? JSON.parse(row.evidencias) : {},
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      // Convert SQLite integers to booleans
      spin_seguiu_metodologia: row.spin_seguiu_metodologia === 1,
      bant_qualificado: row.bant_qualificado === 1,
      challenger_seguiu_metodologia: row.challenger_seguiu_metodologia === 1
    };
  }
}

export default new MeetingScore();

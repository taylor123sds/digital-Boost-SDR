/**
 * @file MeetingInsight.js
 * @description Model para insights e recomendações de reuniões
 * @architecture Layer: Data Layer - Database Models
 */

//  FIX: Usar getDatabase() singleton ao invés de criar conexão direta
import { getDatabase } from '../db/index.js';


/**
 * MeetingInsight Model
 * Responsável por operações CRUD na tabela meeting_insights
 */
class MeetingInsight {
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
   * Cria novo insight
   */
  create(data) {
    const {
      analysis_id,
      meeting_id,
      tipo,
      categoria = null,
      prioridade = 'media',
      titulo,
      descricao,
      exemplo_transcricao = null,
      acao_recomendada = null,
      impacto_esperado = null,
      origem = 'auto',
      metadata = {}
    } = data;

    const stmt = this.getDb().prepare(`
      INSERT INTO meeting_insights (
        analysis_id, meeting_id, tipo, categoria, prioridade,
        titulo, descricao, exemplo_transcricao, acao_recomendada,
        impacto_esperado, origem, status, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      analysis_id,
      meeting_id,
      tipo,
      categoria,
      prioridade,
      titulo,
      descricao,
      exemplo_transcricao,
      acao_recomendada,
      impacto_esperado,
      origem,
      'nova',
      JSON.stringify(metadata)
    );

    return this.findById(result.lastInsertRowid);
  }

  /**
   * Busca insight por ID
   */
  findById(id) {
    const stmt = this.getDb().prepare('SELECT * FROM meeting_insights WHERE id = ?');
    const row = stmt.get(id);
    return row ? this._parseRow(row) : null;
  }

  /**
   * Busca insights por analysis_id
   */
  findByAnalysisId(analysisId) {
    const stmt = this.getDb().prepare(`
      SELECT * FROM meeting_insights
      WHERE analysis_id = ?
      ORDER BY prioridade DESC, created_at DESC
    `);
    const rows = stmt.all(analysisId);
    return rows.map(row => this._parseRow(row));
  }

  /**
   * Busca insights por meeting_id
   */
  findByMeetingId(meetingId) {
    const stmt = this.getDb().prepare(`
      SELECT * FROM meeting_insights
      WHERE meeting_id = ?
      ORDER BY prioridade DESC, created_at DESC
    `);
    const rows = stmt.all(meetingId);
    return rows.map(row => this._parseRow(row));
  }

  /**
   * Busca insights por tipo
   */
  findByTipo(tipo) {
    const stmt = this.getDb().prepare(`
      SELECT * FROM meeting_insights
      WHERE tipo = ?
      ORDER BY created_at DESC
    `);
    const rows = stmt.all(tipo);
    return rows.map(row => this._parseRow(row));
  }

  /**
   * Busca insights de alta prioridade
   */
  findHighPriority() {
    const stmt = this.getDb().prepare(`
      SELECT * FROM meeting_insights
      WHERE prioridade = 'alta' AND status = 'nova'
      ORDER BY created_at DESC
    `);
    const rows = stmt.all();
    return rows.map(row => this._parseRow(row));
  }

  /**
   * Busca insights pendentes de revisão
   */
  findPending() {
    const stmt = this.getDb().prepare(`
      SELECT * FROM meeting_insights
      WHERE status = 'nova'
      ORDER BY prioridade DESC, created_at DESC
    `);
    const rows = stmt.all();
    return rows.map(row => this._parseRow(row));
  }

  /**
   * Busca insights por categoria
   */
  findByCategoria(categoria) {
    const stmt = this.getDb().prepare(`
      SELECT * FROM meeting_insights
      WHERE categoria = ?
      ORDER BY prioridade DESC, created_at DESC
    `);
    const rows = stmt.all(categoria);
    return rows.map(row => this._parseRow(row));
  }

  /**
   * Atualiza status do insight
   */
  updateStatus(id, status) {
    const now = new Date().toISOString();
    const updates = {
      status,
      updated_at: now
    };

    if (status === 'revisada') {
      updates.revisada_em = now;
    } else if (status === 'aplicada') {
      updates.aplicada_em = now;
    }

    const fields = Object.keys(updates).map(k => `${k} = ?`);
    const values = Object.values(updates);
    values.push(id);

    const stmt = this.getDb().prepare(`
      UPDATE meeting_insights
      SET ${fields.join(', ')}
      WHERE id = ?
    `);
    stmt.run(...values);

    return this.findById(id);
  }

  /**
   * Atualiza insight
   */
  update(id, data) {
    const fields = [];
    const values = [];

    if (data.tipo !== undefined) {
      fields.push('tipo = ?');
      values.push(data.tipo);
    }
    if (data.categoria !== undefined) {
      fields.push('categoria = ?');
      values.push(data.categoria);
    }
    if (data.prioridade !== undefined) {
      fields.push('prioridade = ?');
      values.push(data.prioridade);
    }
    if (data.titulo !== undefined) {
      fields.push('titulo = ?');
      values.push(data.titulo);
    }
    if (data.descricao !== undefined) {
      fields.push('descricao = ?');
      values.push(data.descricao);
    }
    if (data.acao_recomendada !== undefined) {
      fields.push('acao_recomendada = ?');
      values.push(data.acao_recomendada);
    }
    if (data.impacto_esperado !== undefined) {
      fields.push('impacto_esperado = ?');
      values.push(data.impacto_esperado);
    }
    if (data.metadata !== undefined) {
      fields.push('metadata = ?');
      values.push(JSON.stringify(data.metadata));
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push("updated_at = datetime('now')");
    values.push(id);

    const stmt = this.getDb().prepare(`
      UPDATE meeting_insights
      SET ${fields.join(', ')}
      WHERE id = ?
    `);
    stmt.run(...values);

    return this.findById(id);
  }

  /**
   * Deleta insight
   */
  delete(id) {
    const stmt = this.getDb().prepare('DELETE FROM meeting_insights WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Estatísticas de insights
   */
  getStats() {
    const stmt = this.getDb().prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN tipo = 'melhoria' THEN 1 ELSE 0 END) as melhorias,
        SUM(CASE WHEN tipo = 'alerta' THEN 1 ELSE 0 END) as alertas,
        SUM(CASE WHEN tipo = 'destaque' THEN 1 ELSE 0 END) as destaques,
        SUM(CASE WHEN tipo = 'coaching' THEN 1 ELSE 0 END) as coaching,
        SUM(CASE WHEN tipo = 'proximo_passo' THEN 1 ELSE 0 END) as proximos_passos,
        SUM(CASE WHEN prioridade = 'alta' THEN 1 ELSE 0 END) as alta_prioridade,
        SUM(CASE WHEN prioridade = 'media' THEN 1 ELSE 0 END) as media_prioridade,
        SUM(CASE WHEN prioridade = 'baixa' THEN 1 ELSE 0 END) as baixa_prioridade,
        SUM(CASE WHEN status = 'nova' THEN 1 ELSE 0 END) as pendentes,
        SUM(CASE WHEN status = 'revisada' THEN 1 ELSE 0 END) as revisadas,
        SUM(CASE WHEN status = 'aplicada' THEN 1 ELSE 0 END) as aplicadas,
        SUM(CASE WHEN status = 'ignorada' THEN 1 ELSE 0 END) as ignoradas
      FROM meeting_insights
    `);
    return stmt.get();
  }

  /**
   * Distribuição de insights por categoria
   */
  getCategoryDistribution() {
    const stmt = this.getDb().prepare(`
      SELECT
        categoria,
        COUNT(*) as count,
        SUM(CASE WHEN prioridade = 'alta' THEN 1 ELSE 0 END) as alta_prioridade
      FROM meeting_insights
      WHERE categoria IS NOT NULL
      GROUP BY categoria
      ORDER BY count DESC
    `);
    return stmt.all();
  }

  /**
   * Insights mais comuns (agrupados por título similar)
   */
  getCommonInsights(limit = 10) {
    const stmt = this.getDb().prepare(`
      SELECT
        titulo,
        categoria,
        tipo,
        COUNT(*) as occurrences,
        AVG(CASE WHEN prioridade = 'alta' THEN 3 WHEN prioridade = 'media' THEN 2 ELSE 1 END) as avg_priority
      FROM meeting_insights
      GROUP BY titulo, categoria, tipo
      HAVING occurrences > 1
      ORDER BY occurrences DESC, avg_priority DESC
      LIMIT ?
    `);
    return stmt.all(limit);
  }

  /**
   * Taxa de aplicação de insights
   */
  getApplicationRate() {
    const stmt = this.getDb().prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'aplicada' THEN 1 ELSE 0 END) as aplicadas,
        CAST(SUM(CASE WHEN status = 'aplicada' THEN 1 ELSE 0 END) AS REAL) / COUNT(*) * 100 as taxa_aplicacao
      FROM meeting_insights
      WHERE status IN ('aplicada', 'ignorada')
    `);
    return stmt.get();
  }

  /**
   * Parse row
   * @private
   */
  _parseRow(row) {
    if (!row) return null;

    return {
      ...row,
      metadata: row.metadata ? JSON.parse(row.metadata) : {}
    };
  }
}

export default new MeetingInsight();

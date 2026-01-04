/**
 * @file MeetingAnalysis.js
 * @description Model para análise de reuniões (sentiment, talk ratio, objections)
 * @architecture Layer: Data Layer - Database Models
 */

//  FIX: Usar getDatabase() singleton ao invés de criar conexão direta
import { getDatabase } from '../db/index.js';

/**
 * MeetingAnalysis Model
 * Responsável por operações CRUD na tabela meeting_analysis
 */
class MeetingAnalysis {
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
   * Cria nova análise
   */
  create(data) {
    const {
      transcription_id,
      meeting_id,
      sentimento_geral = null,
      sentimento_score = null,
      confianca_sentimento = null,
      talk_ratio_vendedor = null,
      talk_ratio_cliente = null,
      talk_ratio_ideal = 30.0,
      num_perguntas_vendedor = 0,
      num_perguntas_cliente = 0,
      num_interrupcoes = 0,
      silencio_desconfortavel = 0,
      objecoes_detectadas = [],
      resultado_previsto = null,
      probabilidade_fechamento = null,
      confianca_predicao = null,
      momentos_chave = [],
      model_usado = 'gpt-4',
      prompt_version = 'v1.0',
      tokens_usados = null,
      processing_time_ms = null,
      metadata = {}
    } = data;

    const stmt = this.getDb().prepare(`
      INSERT INTO meeting_analysis (
        transcription_id, meeting_id,
        sentimento_geral, sentimento_score, confianca_sentimento,
        talk_ratio_vendedor, talk_ratio_cliente, talk_ratio_ideal, talk_ratio_deviation,
        num_perguntas_vendedor, num_perguntas_cliente, num_interrupcoes, silencio_desconfortavel,
        objecoes_detectadas, num_objecoes, taxa_resolucao_objecoes,
        resultado_previsto, probabilidade_fechamento, confianca_predicao,
        momentos_chave, model_usado, prompt_version, tokens_usados, processing_time_ms, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Calculate derived fields
    const talk_ratio_deviation = talk_ratio_vendedor ? Math.abs(talk_ratio_vendedor - talk_ratio_ideal) : null;
    const num_objecoes = objecoes_detectadas.length;
    const taxa_resolucao_objecoes = num_objecoes > 0
      ? (objecoes_detectadas.filter(o => o.respondida).length / num_objecoes) * 100
      : null;

    const result = stmt.run(
      transcription_id,
      meeting_id,
      sentimento_geral,
      sentimento_score,
      confianca_sentimento,
      talk_ratio_vendedor,
      talk_ratio_cliente,
      talk_ratio_ideal,
      talk_ratio_deviation,
      num_perguntas_vendedor,
      num_perguntas_cliente,
      num_interrupcoes,
      silencio_desconfortavel,
      JSON.stringify(objecoes_detectadas),
      num_objecoes,
      taxa_resolucao_objecoes,
      resultado_previsto,
      probabilidade_fechamento,
      confianca_predicao,
      JSON.stringify(momentos_chave),
      model_usado,
      prompt_version,
      tokens_usados,
      processing_time_ms,
      JSON.stringify(metadata)
    );

    return this.findById(result.lastInsertRowid);
  }

  /**
   * Busca análise por ID
   */
  findById(id) {
    const stmt = this.getDb().prepare('SELECT * FROM meeting_analysis WHERE id = ?');
    const row = stmt.get(id);
    return row ? this._parseRow(row) : null;
  }

  /**
   * Busca análise por transcription_id
   */
  findByTranscriptionId(transcriptionId) {
    const stmt = this.getDb().prepare('SELECT * FROM meeting_analysis WHERE transcription_id = ?');
    const row = stmt.get(transcriptionId);
    return row ? this._parseRow(row) : null;
  }

  /**
   * Busca análise por meeting_id
   */
  findByMeetingId(meetingId) {
    const stmt = this.getDb().prepare('SELECT * FROM meeting_analysis WHERE meeting_id = ?');
    const row = stmt.get(meetingId);
    return row ? this._parseRow(row) : null;
  }

  /**
   * Busca análises com resultado previsto específico
   */
  findByResultado(resultado) {
    const stmt = this.getDb().prepare(`
      SELECT * FROM meeting_analysis
      WHERE resultado_previsto = ?
      ORDER BY created_at DESC
    `);
    const rows = stmt.all(resultado);
    return rows.map(row => this._parseRow(row));
  }

  /**
   * Busca análises com alta probabilidade de fechamento
   */
  findHighProbability(threshold = 70) {
    const stmt = this.getDb().prepare(`
      SELECT * FROM meeting_analysis
      WHERE probabilidade_fechamento >= ?
      ORDER BY probabilidade_fechamento DESC
    `);
    const rows = stmt.all(threshold);
    return rows.map(row => this._parseRow(row));
  }

  /**
   * Busca análises com talk ratio fora do ideal
   */
  findPoorTalkRatio(deviationThreshold = 20) {
    const stmt = this.getDb().prepare(`
      SELECT * FROM meeting_analysis
      WHERE talk_ratio_deviation > ?
      ORDER BY talk_ratio_deviation DESC
    `);
    const rows = stmt.all(deviationThreshold);
    return rows.map(row => this._parseRow(row));
  }

  /**
   * Atualiza análise
   */
  update(id, data) {
    const fields = [];
    const values = [];

    // Campos de sentimento
    if (data.sentimento_geral !== undefined) {
      fields.push('sentimento_geral = ?');
      values.push(data.sentimento_geral);
    }
    if (data.sentimento_score !== undefined) {
      fields.push('sentimento_score = ?');
      values.push(data.sentimento_score);
    }

    // Talk ratio
    if (data.talk_ratio_vendedor !== undefined) {
      fields.push('talk_ratio_vendedor = ?');
      fields.push('talk_ratio_deviation = ?');
      values.push(data.talk_ratio_vendedor);
      values.push(Math.abs(data.talk_ratio_vendedor - (data.talk_ratio_ideal || 30)));
    }

    // Objeções
    if (data.objecoes_detectadas !== undefined) {
      const num_objecoes = data.objecoes_detectadas.length;
      const taxa_resolucao = num_objecoes > 0
        ? (data.objecoes_detectadas.filter(o => o.respondida).length / num_objecoes) * 100
        : null;

      fields.push('objecoes_detectadas = ?');
      fields.push('num_objecoes = ?');
      fields.push('taxa_resolucao_objecoes = ?');
      values.push(JSON.stringify(data.objecoes_detectadas));
      values.push(num_objecoes);
      values.push(taxa_resolucao);
    }

    // Resultado
    if (data.resultado_previsto !== undefined) {
      fields.push('resultado_previsto = ?');
      values.push(data.resultado_previsto);
    }
    if (data.probabilidade_fechamento !== undefined) {
      fields.push('probabilidade_fechamento = ?');
      values.push(data.probabilidade_fechamento);
    }

    // Metadata
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
      UPDATE meeting_analysis
      SET ${fields.join(', ')}
      WHERE id = ?
    `);
    stmt.run(...values);

    return this.findById(id);
  }

  /**
   * Deleta análise
   */
  delete(id) {
    const stmt = this.getDb().prepare('DELETE FROM meeting_analysis WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Estatísticas de análises
   */
  getStats() {
    const stmt = this.getDb().prepare(`
      SELECT
        COUNT(*) as total,
        AVG(sentimento_score) as avg_sentiment,
        AVG(talk_ratio_vendedor) as avg_seller_talk_ratio,
        AVG(talk_ratio_deviation) as avg_talk_ratio_deviation,
        AVG(num_objecoes) as avg_objections,
        AVG(taxa_resolucao_objecoes) as avg_objection_resolution_rate,
        AVG(probabilidade_fechamento) as avg_close_probability,
        SUM(CASE WHEN resultado_previsto = 'venda_provavel' THEN 1 ELSE 0 END) as likely_sales,
        SUM(CASE WHEN resultado_previsto = 'followup_necessario' THEN 1 ELSE 0 END) as need_followup,
        SUM(CASE WHEN resultado_previsto = 'perdido' THEN 1 ELSE 0 END) as lost
      FROM meeting_analysis
    `);
    return stmt.get();
  }

  /**
   * Análise comparativa de vendedores (baseado em talk ratio)
   */
  getSellerComparison() {
    const stmt = this.getDb().prepare(`
      SELECT
        ma.meeting_id,
        m.organizador_id as seller_id,
        AVG(ma.talk_ratio_vendedor) as avg_talk_ratio,
        AVG(ma.talk_ratio_deviation) as avg_deviation,
        AVG(ma.num_perguntas_vendedor) as avg_questions,
        AVG(ma.probabilidade_fechamento) as avg_close_prob,
        COUNT(*) as total_meetings
      FROM meeting_analysis ma
      JOIN meetings m ON ma.meeting_id = m.id
      GROUP BY m.organizador_id
      ORDER BY avg_close_prob DESC
    `);
    return stmt.all();
  }

  /**
   * Parse row
   * @private
   */
  _parseRow(row) {
    if (!row) return null;

    return {
      ...row,
      objecoes_detectadas: row.objecoes_detectadas ? JSON.parse(row.objecoes_detectadas) : [],
      momentos_chave: row.momentos_chave ? JSON.parse(row.momentos_chave) : [],
      metadata: row.metadata ? JSON.parse(row.metadata) : {}
    };
  }
}

export default new MeetingAnalysis();

/**
 * @file MeetingTranscription.js
 * @description Model para gerenciar transcrições de reuniões
 * @architecture Layer: Data Layer - Database Models
 */

//  FIX: Usar getDatabase() singleton ao invés de criar conexão direta
import { getDatabase } from '../db/index.js';


/**
 * MeetingTranscription Model
 * Responsável por operações CRUD na tabela meeting_transcriptions
 */
class MeetingTranscription {
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
   * Cria nova transcrição
   * @param {Object} data - Dados da transcrição
   * @returns {Object} Transcrição criada com ID
   */
  create(data) {
    const {
      meeting_id,
      account_id = null,
      contact_id = null,
      opportunity_id = null,
      google_event_id = null,
      google_drive_file_id = null,
      google_doc_url = null,
      texto_completo,
      idioma = 'pt-BR',
      duracao_segundos = null,
      participantes = [],
      data_reuniao,
      source_type = 'google_meet',
      source_url = null,
      metadata = {}
    } = data;

    const stmt = this.getDb().prepare(`
      INSERT INTO meeting_transcriptions (
        meeting_id, account_id, contact_id, opportunity_id,
        google_event_id, google_drive_file_id, google_doc_url,
        texto_completo, idioma, duracao_segundos,
        participantes, num_participantes, data_reuniao,
        source_type, source_url, metadata, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const participantesJson = JSON.stringify(participantes);
    const metadataJson = JSON.stringify(metadata);

    const result = stmt.run(
      meeting_id,
      account_id,
      contact_id,
      opportunity_id,
      google_event_id,
      google_drive_file_id,
      google_doc_url,
      texto_completo,
      idioma,
      duracao_segundos,
      participantesJson,
      participantes.length,
      data_reuniao,
      source_type,
      source_url,
      metadataJson,
      'pending'
    );

    return this.findById(result.lastInsertRowid);
  }

  /**
   * Busca transcrição por ID
   */
  findById(id) {
    const stmt = this.getDb().prepare('SELECT * FROM meeting_transcriptions WHERE id = ?');
    const row = stmt.get(id);
    return row ? this._parseRow(row) : null;
  }

  /**
   * Busca transcrição por meeting_id
   */
  findByMeetingId(meetingId) {
    const stmt = this.getDb().prepare('SELECT * FROM meeting_transcriptions WHERE meeting_id = ?');
    const row = stmt.get(meetingId);
    return row ? this._parseRow(row) : null;
  }

  /**
   * Busca transcrição por google_event_id
   */
  findByGoogleEventId(eventId) {
    const stmt = this.getDb().prepare('SELECT * FROM meeting_transcriptions WHERE google_event_id = ?');
    const row = stmt.get(eventId);
    return row ? this._parseRow(row) : null;
  }

  /**
   * Busca todas as transcrições pendentes de processamento
   */
  findPending() {
    const stmt = this.getDb().prepare(`
      SELECT * FROM meeting_transcriptions
      WHERE status = 'pending'
      ORDER BY created_at DESC
    `);
    const rows = stmt.all();
    return rows.map(row => this._parseRow(row));
  }

  /**
   * Busca transcrições recentes (últimos N dias)
   */
  findRecent(days = 30) {
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);
    const isoDate = dateThreshold.toISOString();

    const stmt = this.getDb().prepare(`
      SELECT * FROM meeting_transcriptions
      WHERE created_at >= ?
      ORDER BY created_at DESC
    `);
    const rows = stmt.all(isoDate);
    return rows.map(row => this._parseRow(row));
  }

  /**
   * Busca transcrições por account_id
   */
  findByAccountId(accountId) {
    const stmt = this.getDb().prepare(`
      SELECT * FROM meeting_transcriptions
      WHERE account_id = ?
      ORDER BY data_reuniao DESC
    `);
    const rows = stmt.all(accountId);
    return rows.map(row => this._parseRow(row));
  }

  /**
   * Atualiza status da transcrição
   */
  updateStatus(id, status, errorMessage = null) {
    const stmt = this.getDb().prepare(`
      UPDATE meeting_transcriptions
      SET status = ?, error_message = ?, updated_at = datetime('now')
      WHERE id = ?
    `);
    stmt.run(status, errorMessage, id);

    // Se status é 'completed', atualizar processed_at (trigger automático faz isso)
    return this.findById(id);
  }

  /**
   * Atualiza dados da transcrição
   */
  update(id, data) {
    const fields = [];
    const values = [];

    if (data.texto_completo !== undefined) {
      fields.push('texto_completo = ?');
      values.push(data.texto_completo);
    }
    if (data.duracao_segundos !== undefined) {
      fields.push('duracao_segundos = ?');
      values.push(data.duracao_segundos);
    }
    if (data.participantes !== undefined) {
      fields.push('participantes = ?');
      fields.push('num_participantes = ?');
      values.push(JSON.stringify(data.participantes));
      values.push(data.participantes.length);
    }
    if (data.metadata !== undefined) {
      fields.push('metadata = ?');
      values.push(JSON.stringify(data.metadata));
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push('updated_at = datetime("now")');
    values.push(id);

    const stmt = this.getDb().prepare(`
      UPDATE meeting_transcriptions
      SET ${fields.join(', ')}
      WHERE id = ?
    `);
    stmt.run(...values);

    return this.findById(id);
  }

  /**
   * Deleta transcrição
   */
  delete(id) {
    const stmt = this.getDb().prepare('DELETE FROM meeting_transcriptions WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Estatísticas de transcrições
   */
  getStats() {
    const stmt = this.getDb().prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        AVG(duracao_segundos) as avg_duration_seconds,
        AVG(num_palavras) as avg_word_count
      FROM meeting_transcriptions
    `);
    return stmt.get();
  }

  /**
   * Parse row - converte JSON strings para objetos
   * @private
   */
  _parseRow(row) {
    if (!row) return null;

    return {
      ...row,
      participantes: row.participantes ? JSON.parse(row.participantes) : [],
      metadata: row.metadata ? JSON.parse(row.metadata) : {}
    };
  }
}

export default new MeetingTranscription();

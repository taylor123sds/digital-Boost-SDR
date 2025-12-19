/**
 * @file BaseModel.js
 * @description Base model class for all CRM entities with common CRUD operations
 * SECURITY: Uses singleton database connection and whitelist validation
 */

import { getDatabase } from '../db/connection.js';

// Whitelist of allowed column names for ORDER BY (prevents SQL injection)
const ALLOWED_ORDER_COLUMNS = [
  'id', 'created_at', 'updated_at', 'nome', 'empresa', 'email', 'telefone',
  'whatsapp', 'stage_id', 'pipeline_id', 'status', 'bant_score', 'cadence_day',
  'first_response_at', 'title', 'priority', 'due_date', 'scheduled_at'
];
const ALLOWED_ORDER_DIRECTIONS = ['ASC', 'DESC', 'asc', 'desc'];

// Whitelist of allowed table names (prevents SQL injection via tableName)
const ALLOWED_TABLES = [
  'leads', 'users', 'accounts', 'contacts', 'opportunities', 'activities',
  'tasks', 'meetings', 'pipeline_stages', 'cadences', 'cadence_enrollments',
  'cadence_steps', 'cadence_actions_log', 'pipeline_history', 'lead_states',
  'whatsapp_messages', 'memory', 'events', 'notifications', 'team_members',
  'scoring_rules', 'lead_scores', 'score_history', 'teams'
];

/**
 * Validate and sanitize ORDER BY clause
 * @param {string} orderBy - ORDER BY clause (e.g., "created_at DESC")
 * @returns {string} Sanitized ORDER BY clause
 */
function sanitizeOrderBy(orderBy) {
  if (!orderBy || typeof orderBy !== 'string') {
    return 'created_at DESC';
  }

  // Parse the orderBy string (e.g., "created_at DESC" or "nome")
  const parts = orderBy.trim().split(/\s+/);
  const column = parts[0];
  const direction = parts[1] || 'DESC';

  // Validate column name
  if (!ALLOWED_ORDER_COLUMNS.includes(column.toLowerCase())) {
    console.warn(`[SECURITY] Invalid ORDER BY column: ${column}, using default`);
    return 'created_at DESC';
  }

  // Validate direction
  if (!ALLOWED_ORDER_DIRECTIONS.includes(direction)) {
    console.warn(`[SECURITY] Invalid ORDER BY direction: ${direction}, using DESC`);
    return `${column} DESC`;
  }

  return `${column} ${direction.toUpperCase()}`;
}

/**
 * Validate table name against whitelist
 * @param {string} tableName - Table name to validate
 * @returns {boolean} True if valid
 */
function isValidTableName(tableName) {
  return ALLOWED_TABLES.includes(tableName);
}

export class BaseModel {
  constructor(tableName) {
    // Validate table name on construction
    if (!isValidTableName(tableName)) {
      throw new Error(`[SECURITY] Invalid table name: ${tableName}`);
    }
    this.tableName = tableName;
  }

  /**
   * Get database connection (uses singleton from connection.js)
   */
  getDb() {
    return getDatabase();
  }

  /**
   * Create a new record
   * Note: Column names are validated implicitly by SQLite schema
   */
  create(data) {
    const db = this.getDb();

    const columns = Object.keys(data).join(', ');
    const placeholders = Object.keys(data).map(() => '?').join(', ');
    const values = Object.values(data);

    const stmt = db.prepare(`INSERT INTO ${this.tableName} (${columns}) VALUES (${placeholders})`);
    const result = stmt.run(...values);

    // Return the created record
    return this.findById(result.lastInsertRowid);
  }

  /**
   * Find record by ID
   */
  findById(id) {
    const db = this.getDb();
    const stmt = db.prepare(`SELECT * FROM ${this.tableName} WHERE id = ?`);
    return stmt.get(id);
  }

  /**
   * Find all records with optional filters and pagination
   * SECURITY: Uses sanitized ORDER BY to prevent SQL injection
   */
  findAll({ where = {}, limit = 100, offset = 0, orderBy = 'created_at DESC' } = {}) {
    const db = this.getDb();

    let query = `SELECT * FROM ${this.tableName}`;
    const params = [];

    // Add WHERE clause (uses parameterized queries)
    if (Object.keys(where).length > 0) {
      // Validate where keys against allowed columns
      const validKeys = Object.keys(where).filter(key =>
        ALLOWED_ORDER_COLUMNS.includes(key.toLowerCase()) || key === 'id'
      );

      if (validKeys.length > 0) {
        const conditions = validKeys.map(key => `${key} = ?`).join(' AND ');
        query += ` WHERE ${conditions}`;
        validKeys.forEach(key => params.push(where[key]));
      }
    }

    // Add ORDER BY (sanitized)
    const safeOrderBy = sanitizeOrderBy(orderBy);
    query += ` ORDER BY ${safeOrderBy}`;

    // Add LIMIT and OFFSET (validated as numbers)
    const safeLimit = Math.min(Math.max(1, parseInt(limit) || 100), 1000);
    const safeOffset = Math.max(0, parseInt(offset) || 0);
    query += ` LIMIT ? OFFSET ?`;
    params.push(safeLimit, safeOffset);

    const stmt = db.prepare(query);
    return stmt.all(...params);
  }

  /**
   * Update record by ID
   */
  update(id, data) {
    const db = this.getDb();
    const updates = Object.keys(data).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(data), id];

    const stmt = db.prepare(`UPDATE ${this.tableName} SET ${updates} WHERE id = ?`);
    const result = stmt.run(...values);

    if (result.changes === 0) {
      return null;
    }

    return this.findById(id);
  }

  /**
   * Delete record by ID
   */
  delete(id) {
    const db = this.getDb();
    const stmt = db.prepare(`DELETE FROM ${this.tableName} WHERE id = ?`);
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Count records with optional filters
   */
  count({ where = {} } = {}) {
    const db = this.getDb();
    let query = `SELECT COUNT(*) as total FROM ${this.tableName}`;
    const params = [];

    if (Object.keys(where).length > 0) {
      // Validate where keys against allowed columns
      const validKeys = Object.keys(where).filter(key =>
        ALLOWED_ORDER_COLUMNS.includes(key.toLowerCase()) || key === 'id'
      );

      if (validKeys.length > 0) {
        const conditions = validKeys.map(key => `${key} = ?`).join(' AND ');
        query += ` WHERE ${conditions}`;
        validKeys.forEach(key => params.push(where[key]));
      }
    }

    const stmt = db.prepare(query);
    const result = stmt.get(...params);
    return result.total;
  }

  /**
   * Search records by multiple fields
   */
  search(searchTerm, fields, { limit = 100, offset = 0 } = {}) {
    const db = this.getDb();

    // Validate search fields against allowed columns
    const validFields = fields.filter(field =>
      ALLOWED_ORDER_COLUMNS.includes(field.toLowerCase())
    );

    if (validFields.length === 0) {
      console.warn('[SECURITY] No valid search fields provided');
      return [];
    }

    const conditions = validFields.map(field => `${field} LIKE ?`).join(' OR ');
    const params = validFields.map(() => `%${searchTerm}%`);

    // Validate limit and offset
    const safeLimit = Math.min(Math.max(1, parseInt(limit) || 100), 1000);
    const safeOffset = Math.max(0, parseInt(offset) || 0);
    params.push(safeLimit, safeOffset);

    const query = `
      SELECT * FROM ${this.tableName}
      WHERE ${conditions}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    const stmt = db.prepare(query);
    return stmt.all(...params);
  }

  /**
   * Execute custom query
   */
  query(sql, params = []) {
    const db = this.getDb();
    const stmt = db.prepare(sql);
    return stmt.all(...params);
  }

  /**
   * Begin transaction
   */
  transaction(callback) {
    const db = this.getDb();
    const transaction = db.transaction(callback);
    return transaction();
  }
}

export default BaseModel;

/**
 * BASE REPOSITORY
 * Classe base para repositorios com operacoes CRUD comuns
 */

import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';

export class BaseRepository {
  constructor(db, tableName, ModelClass) {
    this.db = db;
    this.tableName = tableName;
    this.ModelClass = ModelClass;
  }

  /**
   * Busca por ID
   */
  findById(id) {
    const row = this.db.prepare(`SELECT * FROM ${this.tableName} WHERE id = ?`).get(id);
    return row ? this.ModelClass.fromDBRow(row) : null;
  }

  /**
   * Busca todos com filtros opcionais
   */
  findAll(filters = {}, options = {}) {
    let query = `SELECT * FROM ${this.tableName}`;
    const params = [];
    const conditions = [];

    // Build WHERE clause
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null) {
        conditions.push(`${key} = ?`);
        params.push(value);
      }
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    // ORDER BY
    if (options.orderBy) {
      const direction = options.orderDesc ? 'DESC' : 'ASC';
      query += ` ORDER BY ${options.orderBy} ${direction}`;
    }

    // LIMIT & OFFSET
    if (options.limit) {
      query += ` LIMIT ?`;
      params.push(options.limit);
    }

    if (options.offset) {
      query += ` OFFSET ?`;
      params.push(options.offset);
    }

    const rows = this.db.prepare(query).all(...params);
    return rows.map(row => this.ModelClass.fromDBRow(row));
  }

  /**
   * Busca um registro com filtros
   */
  findOne(filters) {
    const results = this.findAll(filters, { limit: 1 });
    return results[0] || null;
  }

  /**
   * Cria novo registro
   */
  create(model) {
    const row = model.toDBRow();
    const columns = Object.keys(row);
    const placeholders = columns.map(() => '?').join(', ');
    const values = Object.values(row);

    const query = `INSERT INTO ${this.tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
    this.db.prepare(query).run(...values);

    return model;
  }

  /**
   * Atualiza registro existente
   */
  update(id, updates) {
    const setClause = Object.keys(updates)
      .map(key => `${key} = ?`)
      .join(', ');
    const values = [...Object.values(updates), id];

    const query = `UPDATE ${this.tableName} SET ${setClause} WHERE id = ?`;
    const result = this.db.prepare(query).run(...values);

    return result.changes > 0 ? this.findById(id) : null;
  }

  /**
   * Deleta registro
   */
  delete(id) {
    const query = `DELETE FROM ${this.tableName} WHERE id = ?`;
    const result = this.db.prepare(query).run(id);
    return result.changes > 0;
  }

  /**
   * Conta registros com filtros
   */
  count(filters = {}) {
    let query = `SELECT COUNT(*) as count FROM ${this.tableName}`;
    const params = [];
    const conditions = [];

    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null) {
        conditions.push(`${key} = ?`);
        params.push(value);
      }
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    const result = this.db.prepare(query).get(...params);
    return result.count;
  }

  /**
   * Verifica se registro existe
   */
  exists(filters) {
    return this.count(filters) > 0;
  }

  /**
   * Busca com query customizada
   */
  query(sql, params = []) {
    return this.db.prepare(sql).all(...params);
  }

  /**
   * Executa statement sem retorno
   */
  execute(sql, params = []) {
    return this.db.prepare(sql).run(...params);
  }

  /**
   * Inicia transacao
   */
  transaction(fn) {
    return this.db.transaction(fn)();
  }
}

export default BaseRepository;

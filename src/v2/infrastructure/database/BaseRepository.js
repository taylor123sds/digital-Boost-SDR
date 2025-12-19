/**
 * @file BaseRepository.js
 * @description Classe base abstrata para todos os repositórios
 * Implementa Repository Pattern para abstração de acesso a dados
 * @module infrastructure/database/BaseRepository
 */

import { DatabaseError } from '../../shared/utils/errors.js';
import { dbLogger } from '../../shared/utils/logger.js';

/**
 * Classe base abstrata para repositórios
 * Fornece métodos comuns para operações CRUD
 *
 * @abstract
 * @example
 * class LeadRepository extends BaseRepository {
 *   constructor(db) {
 *     super(db, 'leads');
 *   }
 * }
 */
export class BaseRepository {
  /**
   * @param {object} db - Instância do banco de dados (better-sqlite3)
   * @param {string} tableName - Nome da tabela
   */
  constructor(db, tableName) {
    if (new.target === BaseRepository) {
      throw new Error(
        'BaseRepository é uma classe abstrata e não pode ser instanciada diretamente'
      );
    }

    if (!db) {
      throw new Error('Database instance is required');
    }

    if (!tableName) {
      throw new Error('Table name is required');
    }

    this.db = db;
    this.tableName = tableName;
    this.logger = dbLogger;
  }

  /**
   * Busca um registro por ID
   * @param {string|number} id
   * @returns {object|null}
   */
  findById(id) {
    try {
      const stmt = this.db.prepare(`SELECT * FROM ${this.tableName} WHERE id = ?`);
      const row = stmt.get(id);
      return row || null;
    } catch (error) {
      this.logger.error(`Error finding by ID in ${this.tableName}`, { id, error: error.message });
      throw new DatabaseError(`Failed to find record by ID: ${id}`, error);
    }
  }

  /**
   * Busca todos os registros
   * @param {object} [options] - Opções de paginação e ordenação
   * @param {number} [options.limit] - Limite de resultados
   * @param {number} [options.offset] - Offset para paginação
   * @param {string} [options.orderBy] - Campo para ordenação
   * @param {string} [options.order] - Direção (ASC|DESC)
   * @returns {Array<object>}
   */
  findAll(options = {}) {
    try {
      const { limit = 100, offset = 0, orderBy = 'id', order = 'ASC' } = options;

      const query = `
        SELECT * FROM ${this.tableName}
        ORDER BY ${orderBy} ${order}
        LIMIT ? OFFSET ?
      `;

      const stmt = this.db.prepare(query);
      return stmt.all(limit, offset);
    } catch (error) {
      this.logger.error(`Error finding all in ${this.tableName}`, { error: error.message });
      throw new DatabaseError('Failed to fetch all records', error);
    }
  }

  /**
   * Busca registros com condição WHERE
   * @param {object} conditions - Condições {campo: valor}
   * @param {object} [options] - Opções adicionais
   * @returns {Array<object>}
   */
  findWhere(conditions, options = {}) {
    try {
      const { limit = 100, offset = 0 } = options;

      const keys = Object.keys(conditions);
      const whereClause = keys.map((key) => `${key} = ?`).join(' AND ');
      const values = Object.values(conditions);

      const query = `
        SELECT * FROM ${this.tableName}
        WHERE ${whereClause}
        LIMIT ? OFFSET ?
      `;

      const stmt = this.db.prepare(query);
      return stmt.all(...values, limit, offset);
    } catch (error) {
      this.logger.error(`Error finding where in ${this.tableName}`, {
        conditions,
        error: error.message,
      });
      throw new DatabaseError('Failed to find records with conditions', error);
    }
  }

  /**
   * Busca um único registro com condição
   * @param {object} conditions
   * @returns {object|null}
   */
  findOneWhere(conditions) {
    try {
      const keys = Object.keys(conditions);
      const whereClause = keys.map((key) => `${key} = ?`).join(' AND ');
      const values = Object.values(conditions);

      const query = `SELECT * FROM ${this.tableName} WHERE ${whereClause} LIMIT 1`;
      const stmt = this.db.prepare(query);

      return stmt.get(...values) || null;
    } catch (error) {
      this.logger.error(`Error finding one where in ${this.tableName}`, {
        conditions,
        error: error.message,
      });
      throw new DatabaseError('Failed to find record', error);
    }
  }

  /**
   * Insere um novo registro
   * @param {object} data - Dados a inserir
   * @returns {object} Registro inserido com ID
   */
  create(data) {
    try {
      const keys = Object.keys(data);
      const placeholders = keys.map(() => '?').join(', ');
      const values = Object.values(data);

      const query = `
        INSERT INTO ${this.tableName} (${keys.join(', ')})
        VALUES (${placeholders})
      `;

      const stmt = this.db.prepare(query);
      const result = stmt.run(...values);

      this.logger.debug(`Created record in ${this.tableName}`, { id: result.lastInsertRowid });

      return { ...data, id: result.lastInsertRowid };
    } catch (error) {
      this.logger.error(`Error creating record in ${this.tableName}`, {
        data,
        error: error.message,
      });
      throw new DatabaseError('Failed to create record', error);
    }
  }

  /**
   * Atualiza um registro por ID
   * @param {string|number} id
   * @param {object} data - Dados a atualizar
   * @returns {boolean} True se atualizado com sucesso
   */
  update(id, data) {
    try {
      const keys = Object.keys(data);
      const setClause = keys.map((key) => `${key} = ?`).join(', ');
      const values = [...Object.values(data), id];

      const query = `UPDATE ${this.tableName} SET ${setClause} WHERE id = ?`;
      const stmt = this.db.prepare(query);
      const result = stmt.run(...values);

      const success = result.changes > 0;
      if (success) {
        this.logger.debug(`Updated record in ${this.tableName}`, { id });
      }

      return success;
    } catch (error) {
      this.logger.error(`Error updating record in ${this.tableName}`, {
        id,
        data,
        error: error.message,
      });
      throw new DatabaseError(`Failed to update record: ${id}`, error);
    }
  }

  /**
   * Deleta um registro por ID
   * @param {string|number} id
   * @returns {boolean} True se deletado com sucesso
   */
  delete(id) {
    try {
      const stmt = this.db.prepare(`DELETE FROM ${this.tableName} WHERE id = ?`);
      const result = stmt.run(id);

      const success = result.changes > 0;
      if (success) {
        this.logger.debug(`Deleted record from ${this.tableName}`, { id });
      }

      return success;
    } catch (error) {
      this.logger.error(`Error deleting record from ${this.tableName}`, {
        id,
        error: error.message,
      });
      throw new DatabaseError(`Failed to delete record: ${id}`, error);
    }
  }

  /**
   * Conta registros na tabela
   * @param {object} [conditions] - Condições opcionais
   * @returns {number}
   */
  count(conditions = null) {
    try {
      let query = `SELECT COUNT(*) as total FROM ${this.tableName}`;
      let values = [];

      if (conditions) {
        const keys = Object.keys(conditions);
        const whereClause = keys.map((key) => `${key} = ?`).join(' AND ');
        values = Object.values(conditions);
        query += ` WHERE ${whereClause}`;
      }

      const stmt = this.db.prepare(query);
      const result = stmt.get(...values);

      return result.total;
    } catch (error) {
      this.logger.error(`Error counting records in ${this.tableName}`, { error: error.message });
      throw new DatabaseError('Failed to count records', error);
    }
  }

  /**
   * Verifica se registro existe
   * @param {string|number} id
   * @returns {boolean}
   */
  exists(id) {
    try {
      const stmt = this.db.prepare(`SELECT 1 FROM ${this.tableName} WHERE id = ? LIMIT 1`);
      return stmt.get(id) !== undefined;
    } catch (error) {
      this.logger.error(`Error checking existence in ${this.tableName}`, {
        id,
        error: error.message,
      });
      throw new DatabaseError('Failed to check record existence', error);
    }
  }

  /**
   * Executa query SQL customizada
   * @protected
   * @param {string} query
   * @param {Array} [params]
   * @returns {Array<object>}
   */
  _executeQuery(query, params = []) {
    try {
      const stmt = this.db.prepare(query);
      return stmt.all(...params);
    } catch (error) {
      this.logger.error('Error executing custom query', { query, error: error.message });
      throw new DatabaseError('Failed to execute query', error);
    }
  }

  /**
   * Executa query que retorna um único resultado
   * @protected
   * @param {string} query
   * @param {Array} [params]
   * @returns {object|null}
   */
  _executeQueryOne(query, params = []) {
    try {
      const stmt = this.db.prepare(query);
      return stmt.get(...params) || null;
    } catch (error) {
      this.logger.error('Error executing custom query (one)', { query, error: error.message });
      throw new DatabaseError('Failed to execute query', error);
    }
  }

  /**
   * Inicia uma transação
   * @param {Function} callback - Função a executar na transação
   * @returns {any} Resultado da transação
   */
  transaction(callback) {
    try {
      return this.db.transaction(callback)();
    } catch (error) {
      this.logger.error('Transaction failed', { error: error.message });
      throw new DatabaseError('Transaction failed', error);
    }
  }
}

export default BaseRepository;

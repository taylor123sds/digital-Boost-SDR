/**
 * @file SQLiteDatabaseProvider.js
 * @description Implementação de database com SQLite
 *
 * Para uso em desenvolvimento e instalações single-node
 */

import Database from 'better-sqlite3';
import path from 'path';

/**
 * Implementação de database com SQLite
 * @implements {IDatabaseProvider}
 */
export class SQLiteDatabaseProvider {
  /**
   * @param {Object} opts - Opções
   * @param {string} [opts.filename] - Caminho do arquivo do banco
   * @param {Object} [opts.options] - Opções do better-sqlite3
   */
  constructor(opts = {}) {
    this.filename = opts.filename || process.env.DATABASE_PATH || './orbion.db';
    this.options = opts.options || {};

    // Conexão
    this.db = null;
    this._connected = false;

    // Estatísticas
    this._stats = {
      queries: 0,
      inserts: 0,
      updates: 0,
      deletes: 0,
      errors: 0,
      totalTime: 0
    };
  }

  // ==================== CONEXÃO ====================

  /**
   * Conecta ao banco de dados
   */
  async connect() {
    if (this._connected) return;

    try {
      this.db = new Database(this.filename, {
        verbose: process.env.DB_DEBUG === 'true' ? console.log : null,
        ...this.options
      });

      // Configurações de performance
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('synchronous = NORMAL');
      this.db.pragma('cache_size = -64000'); // 64MB
      this.db.pragma('temp_store = MEMORY');
      this.db.pragma('mmap_size = 268435456'); // 256MB

      this._connected = true;
      console.log(`[SQLite] Conectado a ${this.filename}`);

    } catch (error) {
      console.error('[SQLite] Erro ao conectar:', error.message);
      throw error;
    }
  }

  /**
   * Desconecta do banco de dados
   */
  async disconnect() {
    if (this.db) {
      this.db.close();
      this._connected = false;
      console.log('[SQLite] Desconectado');
    }
  }

  /**
   * Verifica se está conectado
   */
  isConnected() {
    return this._connected && this.db && this.db.open;
  }

  // ==================== QUERIES ====================

  /**
   * Executa query e retorna múltiplos resultados
   * @param {string} sql - SQL query
   * @param {Array} params - Parâmetros
   * @returns {Promise<Array>}
   */
  async query(sql, params = []) {
    await this._ensureConnected();
    const start = Date.now();

    try {
      const stmt = this.db.prepare(sql);
      const results = stmt.all(...params);

      this._stats.queries++;
      this._stats.totalTime += Date.now() - start;

      return results;

    } catch (error) {
      this._stats.errors++;
      console.error('[SQLite] Query error:', error.message, { sql, params });
      throw error;
    }
  }

  /**
   * Executa query e retorna um único resultado
   * @param {string} sql - SQL query
   * @param {Array} params - Parâmetros
   * @returns {Promise<Object|null>}
   */
  async queryOne(sql, params = []) {
    await this._ensureConnected();
    const start = Date.now();

    try {
      const stmt = this.db.prepare(sql);
      const result = stmt.get(...params);

      this._stats.queries++;
      this._stats.totalTime += Date.now() - start;

      return result || null;

    } catch (error) {
      this._stats.errors++;
      console.error('[SQLite] QueryOne error:', error.message, { sql, params });
      throw error;
    }
  }

  /**
   * Executa statement (INSERT, UPDATE, DELETE)
   * @param {string} sql - SQL statement
   * @param {Array} params - Parâmetros
   * @returns {Promise<{changes: number, lastInsertRowid: number}>}
   */
  async execute(sql, params = []) {
    await this._ensureConnected();
    const start = Date.now();

    try {
      const stmt = this.db.prepare(sql);
      const result = stmt.run(...params);

      // Atualizar estatísticas
      const sqlLower = sql.toLowerCase().trim();
      if (sqlLower.startsWith('insert')) this._stats.inserts++;
      else if (sqlLower.startsWith('update')) this._stats.updates++;
      else if (sqlLower.startsWith('delete')) this._stats.deletes++;

      this._stats.totalTime += Date.now() - start;

      return {
        changes: result.changes,
        lastInsertRowid: result.lastInsertRowid
      };

    } catch (error) {
      this._stats.errors++;
      console.error('[SQLite] Execute error:', error.message, { sql, params });
      throw error;
    }
  }

  // ==================== TRANSAÇÕES ====================

  /**
   * Executa função dentro de uma transação
   * @param {Function} fn - Função a executar
   * @returns {Promise<any>}
   */
  async transaction(fn) {
    await this._ensureConnected();

    const trx = this.db.transaction(async () => {
      return fn({
        query: (sql, params) => this.query(sql, params),
        queryOne: (sql, params) => this.queryOne(sql, params),
        execute: (sql, params) => this.execute(sql, params)
      });
    });

    try {
      return trx();
    } catch (error) {
      console.error('[SQLite] Transaction error:', error.message);
      throw error;
    }
  }

  /**
   * Executa múltiplos statements em batch
   * @param {Array<{sql: string, params?: Array}>} statements
   * @returns {Promise<Array>}
   */
  async batch(statements) {
    await this._ensureConnected();

    const results = [];
    const batchTrx = this.db.transaction(() => {
      for (const { sql, params = [] } of statements) {
        const stmt = this.db.prepare(sql);
        const result = stmt.run(...params);
        results.push({
          changes: result.changes,
          lastInsertRowid: result.lastInsertRowid
        });
      }
    });

    try {
      batchTrx();
      return results;
    } catch (error) {
      console.error('[SQLite] Batch error:', error.message);
      throw error;
    }
  }

  // ==================== SCHEMA ====================

  /**
   * Cria tabela se não existir
   * @param {string} tableName
   * @param {Object} schema - Definição da tabela
   */
  async createTable(tableName, schema) {
    const columns = Object.entries(schema)
      .map(([name, def]) => `${name} ${def}`)
      .join(', ');

    const sql = `CREATE TABLE IF NOT EXISTS ${tableName} (${columns})`;
    await this.execute(sql);
  }

  /**
   * Verifica se tabela existe
   * @param {string} tableName
   * @returns {Promise<boolean>}
   */
  async tableExists(tableName) {
    const result = await this.queryOne(
      `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
      [tableName]
    );
    return !!result;
  }

  /**
   * Lista todas as tabelas
   * @returns {Promise<string[]>}
   */
  async listTables() {
    const results = await this.query(
      `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`
    );
    return results.map(r => r.name);
  }

  /**
   * Obtém schema de uma tabela
   * @param {string} tableName
   * @returns {Promise<Array>}
   */
  async getTableSchema(tableName) {
    return this.query(`PRAGMA table_info(${tableName})`);
  }

  // ==================== ÍNDICES ====================

  /**
   * Cria índice
   * @param {string} indexName
   * @param {string} tableName
   * @param {string[]} columns
   * @param {Object} opts
   */
  async createIndex(indexName, tableName, columns, opts = {}) {
    const unique = opts.unique ? 'UNIQUE' : '';
    const sql = `CREATE ${unique} INDEX IF NOT EXISTS ${indexName} ON ${tableName} (${columns.join(', ')})`;
    await this.execute(sql);
  }

  // ==================== MIGRAÇÃO ====================

  /**
   * Executa migrations
   * @param {Array<{name: string, up: string, down?: string}>} migrations
   */
  async migrate(migrations) {
    // Criar tabela de migrations se não existir
    await this.execute(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        executed_at TEXT DEFAULT (datetime('now'))
      )
    `);

    // Verificar migrations já executadas
    const executed = await this.query('SELECT name FROM _migrations');
    const executedNames = new Set(executed.map(m => m.name));

    // Executar migrations pendentes
    for (const migration of migrations) {
      if (executedNames.has(migration.name)) continue;

      console.log(`[SQLite] Executando migration: ${migration.name}`);

      try {
        await this.transaction(async (trx) => {
          // Executar SQL de up
          const statements = migration.up.split(';').filter(s => s.trim());
          for (const sql of statements) {
            await trx.execute(sql);
          }

          // Registrar migration
          await trx.execute(
            'INSERT INTO _migrations (name) VALUES (?)',
            [migration.name]
          );
        });

        console.log(`[SQLite] Migration ${migration.name} concluída`);

      } catch (error) {
        console.error(`[SQLite] Erro na migration ${migration.name}:`, error.message);
        throw error;
      }
    }
  }

  // ==================== HELPERS ====================

  /**
   * Garante que está conectado
   * @private
   */
  async _ensureConnected() {
    if (!this.isConnected()) {
      await this.connect();
    }
  }

  /**
   * Retorna estatísticas
   */
  getStats() {
    return {
      ...this._stats,
      connected: this.isConnected(),
      filename: this.filename,
      avgQueryTime: this._stats.queries > 0
        ? Math.round(this._stats.totalTime / this._stats.queries)
        : 0
    };
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      await this._ensureConnected();
      await this.queryOne('SELECT 1');
      return { healthy: true };
    } catch (error) {
      return { healthy: false, error: error.message };
    }
  }

  /**
   * Backup do banco de dados
   * @param {string} backupPath
   */
  async backup(backupPath) {
    await this._ensureConnected();
    await this.db.backup(backupPath);
    console.log(`[SQLite] Backup criado: ${backupPath}`);
  }

  /**
   * Vacuum (compactação)
   */
  async vacuum() {
    await this._ensureConnected();
    this.db.exec('VACUUM');
    console.log('[SQLite] Vacuum concluído');
  }
}

export default SQLiteDatabaseProvider;

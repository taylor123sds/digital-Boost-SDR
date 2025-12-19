/**
 * @file PostgreSQLDatabaseProvider.js
 * @description Implementação de database com PostgreSQL
 *
 * Para uso em produção com alta disponibilidade
 */

import pg from 'pg';

const { Pool } = pg;

/**
 * Implementação de database com PostgreSQL
 * @implements {IDatabaseProvider}
 */
export class PostgreSQLDatabaseProvider {
  /**
   * @param {Object} opts - Opções
   * @param {string} [opts.connectionString] - URL de conexão
   * @param {Object} [opts.poolConfig] - Configuração do pool
   */
  constructor(opts = {}) {
    this.connectionString = opts.connectionString ||
      process.env.DATABASE_URL ||
      process.env.POSTGRES_URL;

    this.poolConfig = {
      connectionString: this.connectionString,
      max: opts.poolSize || parseInt(process.env.DB_POOL_SIZE) || 20,
      idleTimeoutMillis: opts.idleTimeout || 30000,
      connectionTimeoutMillis: opts.connectionTimeout || 5000,
      ...opts.poolConfig
    };

    // Pool de conexões
    this.pool = null;
    this._connected = false;

    // Estatísticas
    this._stats = {
      queries: 0,
      inserts: 0,
      updates: 0,
      deletes: 0,
      errors: 0,
      totalTime: 0,
      poolSize: 0,
      waitingClients: 0
    };
  }

  // ==================== CONEXÃO ====================

  /**
   * Conecta ao banco de dados
   */
  async connect() {
    if (this._connected) return;

    try {
      this.pool = new Pool(this.poolConfig);

      // Testar conexão
      const client = await this.pool.connect();
      client.release();

      // Event handlers
      this.pool.on('error', (err) => {
        console.error('[PostgreSQL] Pool error:', err.message);
        this._stats.errors++;
      });

      this.pool.on('connect', () => {
        this._stats.poolSize++;
      });

      this._connected = true;
      console.log('[PostgreSQL] Pool de conexões criado');

    } catch (error) {
      console.error('[PostgreSQL] Erro ao conectar:', error.message);
      throw error;
    }
  }

  /**
   * Desconecta do banco de dados
   */
  async disconnect() {
    if (this.pool) {
      await this.pool.end();
      this._connected = false;
      console.log('[PostgreSQL] Pool encerrado');
    }
  }

  /**
   * Verifica se está conectado
   */
  isConnected() {
    return this._connected && this.pool && !this.pool.ended;
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
      // Converter ? para $1, $2, etc (compatibilidade com SQLite)
      const pgSql = this._convertPlaceholders(sql);
      const result = await this.pool.query(pgSql, params);

      this._stats.queries++;
      this._stats.totalTime += Date.now() - start;

      return result.rows;

    } catch (error) {
      this._stats.errors++;
      console.error('[PostgreSQL] Query error:', error.message, { sql, params });
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
    const results = await this.query(sql, params);
    return results[0] || null;
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
      // Converter placeholders
      let pgSql = this._convertPlaceholders(sql);

      // Adicionar RETURNING id para INSERT
      const sqlLower = sql.toLowerCase().trim();
      if (sqlLower.startsWith('insert') && !pgSql.toLowerCase().includes('returning')) {
        pgSql = pgSql.replace(/;?\s*$/, ' RETURNING id');
      }

      const result = await this.pool.query(pgSql, params);

      // Atualizar estatísticas
      if (sqlLower.startsWith('insert')) this._stats.inserts++;
      else if (sqlLower.startsWith('update')) this._stats.updates++;
      else if (sqlLower.startsWith('delete')) this._stats.deletes++;

      this._stats.totalTime += Date.now() - start;

      return {
        changes: result.rowCount,
        lastInsertRowid: result.rows[0]?.id || null
      };

    } catch (error) {
      this._stats.errors++;
      console.error('[PostgreSQL] Execute error:', error.message, { sql, params });
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

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const trx = {
        query: async (sql, params) => {
          const pgSql = this._convertPlaceholders(sql);
          const result = await client.query(pgSql, params);
          return result.rows;
        },
        queryOne: async (sql, params) => {
          const results = await trx.query(sql, params);
          return results[0] || null;
        },
        execute: async (sql, params) => {
          let pgSql = this._convertPlaceholders(sql);
          const sqlLower = sql.toLowerCase().trim();
          if (sqlLower.startsWith('insert') && !pgSql.toLowerCase().includes('returning')) {
            pgSql = pgSql.replace(/;?\s*$/, ' RETURNING id');
          }
          const result = await client.query(pgSql, params);
          return {
            changes: result.rowCount,
            lastInsertRowid: result.rows[0]?.id || null
          };
        }
      };

      const result = await fn(trx);
      await client.query('COMMIT');

      return result;

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[PostgreSQL] Transaction error:', error.message);
      throw error;

    } finally {
      client.release();
    }
  }

  /**
   * Executa múltiplos statements em batch
   * @param {Array<{sql: string, params?: Array}>} statements
   * @returns {Promise<Array>}
   */
  async batch(statements) {
    return this.transaction(async (trx) => {
      const results = [];
      for (const { sql, params = [] } of statements) {
        const result = await trx.execute(sql, params);
        results.push(result);
      }
      return results;
    });
  }

  // ==================== SCHEMA ====================

  /**
   * Cria tabela se não existir
   * @param {string} tableName
   * @param {Object} schema - Definição da tabela
   */
  async createTable(tableName, schema) {
    // Converter tipos SQLite para PostgreSQL
    const typeMap = {
      'INTEGER PRIMARY KEY AUTOINCREMENT': 'SERIAL PRIMARY KEY',
      'INTEGER': 'INTEGER',
      'TEXT': 'TEXT',
      'REAL': 'DOUBLE PRECISION',
      'BLOB': 'BYTEA',
      'BOOLEAN': 'BOOLEAN',
      'TIMESTAMP': 'TIMESTAMP WITH TIME ZONE'
    };

    const columns = Object.entries(schema)
      .map(([name, def]) => {
        // Tentar mapear tipo
        for (const [sqliteType, pgType] of Object.entries(typeMap)) {
          if (def.toUpperCase().includes(sqliteType.toUpperCase())) {
            def = def.replace(new RegExp(sqliteType, 'i'), pgType);
          }
        }
        return `${name} ${def}`;
      })
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
      `SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = $1
      )`,
      [tableName]
    );
    return result?.exists || false;
  }

  /**
   * Lista todas as tabelas
   * @returns {Promise<string[]>}
   */
  async listTables() {
    const results = await this.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    `);
    return results.map(r => r.table_name);
  }

  /**
   * Obtém schema de uma tabela
   * @param {string} tableName
   * @returns {Promise<Array>}
   */
  async getTableSchema(tableName) {
    return this.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position
    `, [tableName]);
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
    const concurrently = opts.concurrently ? 'CONCURRENTLY' : '';
    const sql = `CREATE ${unique} INDEX ${concurrently} IF NOT EXISTS ${indexName} ON ${tableName} (${columns.join(', ')})`;
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
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Verificar migrations já executadas
    const executed = await this.query('SELECT name FROM _migrations');
    const executedNames = new Set(executed.map(m => m.name));

    // Executar migrations pendentes
    for (const migration of migrations) {
      if (executedNames.has(migration.name)) continue;

      console.log(`[PostgreSQL] Executando migration: ${migration.name}`);

      try {
        await this.transaction(async (trx) => {
          // Executar SQL de up
          await trx.execute(migration.up);

          // Registrar migration
          await trx.execute(
            'INSERT INTO _migrations (name) VALUES ($1)',
            [migration.name]
          );
        });

        console.log(`[PostgreSQL] Migration ${migration.name} concluída`);

      } catch (error) {
        console.error(`[PostgreSQL] Erro na migration ${migration.name}:`, error.message);
        throw error;
      }
    }
  }

  // ==================== HELPERS ====================

  /**
   * Converte placeholders ? para $1, $2, etc
   * @private
   */
  _convertPlaceholders(sql) {
    let counter = 0;
    return sql.replace(/\?/g, () => `$${++counter}`);
  }

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
    const poolStats = this.pool ? {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount
    } : {};

    return {
      ...this._stats,
      ...poolStats,
      connected: this.isConnected(),
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
      return {
        healthy: true,
        pool: {
          total: this.pool.totalCount,
          idle: this.pool.idleCount,
          waiting: this.pool.waitingCount
        }
      };
    } catch (error) {
      return { healthy: false, error: error.message };
    }
  }

  /**
   * Explain de query
   * @param {string} sql
   * @param {Array} params
   */
  async explain(sql, params = []) {
    const pgSql = this._convertPlaceholders(sql);
    return this.query(`EXPLAIN ANALYZE ${pgSql}`, params);
  }
}

export default PostgreSQLDatabaseProvider;

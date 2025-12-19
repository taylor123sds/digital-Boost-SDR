/**
 * @file DatabaseConnection.js
 * @description Singleton para gerenciar conexão com banco de dados SQLite
 * @module infrastructure/database/DatabaseConnection
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import env from '../../config/environment.js';
import { dbLogger } from '../../shared/utils/logger.js';
import { DatabaseError } from '../../shared/utils/errors.js';

/**
 * Singleton para conexão com banco de dados
 * Garante uma única instância do database em toda aplicação
 *
 * @example
 * import { DatabaseConnection } from './DatabaseConnection.js';
 *
 * const db = DatabaseConnection.getInstance();
 * const stmt = db.prepare('SELECT * FROM leads');
 * const leads = stmt.all();
 */
export class DatabaseConnection {
  /**
   * Instância singleton
   * @private
   * @static
   */
  static instance = null;

  /**
   * Instância do better-sqlite3
   * @private
   */
  db = null;

  /**
   * Caminho do arquivo de database
   * @private
   */
  dbPath = null;

  /**
   * @private
   * @param {string} [dbPath] - Caminho customizado para o database
   */
  constructor(dbPath = null) {
    if (DatabaseConnection.instance) {
      return DatabaseConnection.instance;
    }

    this.dbPath = dbPath || env.DATABASE_PATH || path.join(process.cwd(), 'orbion.db');
    this._connect();

    DatabaseConnection.instance = this;
  }

  /**
   * Retorna instância singleton
   * @static
   * @param {string} [dbPath] - Caminho customizado (apenas na primeira chamada)
   * @returns {Database}
   */
  static getInstance(dbPath = null) {
    if (!DatabaseConnection.instance) {
      new DatabaseConnection(dbPath);
    }
    return DatabaseConnection.instance.db;
  }

  /**
   * Conecta ao banco de dados
   * @private
   */
  _connect() {
    try {
      // Garantir que diretório existe
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Abrir conexão
      this.db = new Database(this.dbPath, {
        verbose: env.DEBUG ? dbLogger.debug.bind(dbLogger) : null,
      });

      // Configurações de performance
      this.db.pragma('journal_mode = WAL'); // Write-Ahead Logging
      this.db.pragma('busy_timeout = 5000'); //  FIX: Evitar erros de lock
      this.db.pragma('synchronous = NORMAL'); // Performance vs segurança
      this.db.pragma('cache_size = -64000'); // 64MB de cache
      this.db.pragma('temp_store = MEMORY'); // Temp tables em memória
      this.db.pragma('foreign_keys = ON'); // Habilitar foreign keys

      // Verificar se database foi criado
      const isNewDatabase = !fs.existsSync(this.dbPath) || fs.statSync(this.dbPath).size === 0;

      dbLogger.info('Database connected', {
        path: this.dbPath,
        new: isNewDatabase,
      });

      // Se for novo, executar migrations
      if (isNewDatabase) {
        this._runInitialMigrations();
      }
    } catch (error) {
      dbLogger.error('Failed to connect to database', { error: error.message });
      throw new DatabaseError('Failed to connect to database', error);
    }
  }

  /**
   * Executa migrations iniciais
   * @private
   */
  _runInitialMigrations() {
    dbLogger.info('Running initial migrations...');

    try {
      this.db.exec(`
        -- Tabela de memória/cache (compatível com sistema antigo)
        CREATE TABLE IF NOT EXISTS memory (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          created_at INTEGER DEFAULT (strftime('%s', 'now')),
          updated_at INTEGER DEFAULT (strftime('%s', 'now'))
        );

        -- Tabela de mensagens WhatsApp
        CREATE TABLE IF NOT EXISTS whatsapp_messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          from_number TEXT NOT NULL,
          to_number TEXT,
          message_id TEXT UNIQUE,
          message_type TEXT DEFAULT 'text',
          content TEXT,
          timestamp INTEGER DEFAULT (strftime('%s', 'now')),
          direction TEXT CHECK(direction IN ('inbound', 'outbound')),
          status TEXT DEFAULT 'pending',
          metadata TEXT -- JSON
        );

        -- Tabela de eventos/tarefas
        CREATE TABLE IF NOT EXISTS events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          description TEXT,
          start_time INTEGER NOT NULL,
          end_time INTEGER,
          attendees TEXT, -- JSON array
          created_at INTEGER DEFAULT (strftime('%s', 'now'))
        );

        -- Tabela de tasks
        CREATE TABLE IF NOT EXISTS tasks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          description TEXT,
          status TEXT DEFAULT 'pending',
          priority INTEGER DEFAULT 3,
          due_date INTEGER,
          completed_at INTEGER,
          created_at INTEGER DEFAULT (strftime('%s', 'now'))
        );

        -- Tabela de documentos (RAG)
        CREATE TABLE IF NOT EXISTS docs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          content TEXT NOT NULL,
          embedding TEXT, -- JSON array de floats
          metadata TEXT, -- JSON
          created_at INTEGER DEFAULT (strftime('%s', 'now'))
        );

        -- Índices para performance
        CREATE INDEX IF NOT EXISTS idx_messages_from ON whatsapp_messages(from_number);
        CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON whatsapp_messages(timestamp);
        CREATE INDEX IF NOT EXISTS idx_events_start ON events(start_time);
        CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
      `);

      dbLogger.info('Initial migrations completed');
    } catch (error) {
      dbLogger.error('Migration failed', { error: error.message });
      throw new DatabaseError('Failed to run migrations', error);
    }
  }

  /**
   * Fecha conexão com database
   * Deve ser chamado ao encerrar aplicação
   */
  close() {
    if (this.db) {
      try {
        this.db.close();
        dbLogger.info('Database connection closed');
        DatabaseConnection.instance = null;
      } catch (error) {
        dbLogger.error('Error closing database', { error: error.message });
        throw new DatabaseError('Failed to close database', error);
      }
    }
  }

  /**
   * Executa backup do database
   * @param {string} backupPath - Caminho do arquivo de backup
   */
  backup(backupPath) {
    try {
      const backupDir = path.dirname(backupPath);
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      this.db.backup(backupPath);
      dbLogger.info('Database backup created', { path: backupPath });
    } catch (error) {
      dbLogger.error('Backup failed', { error: error.message });
      throw new DatabaseError('Failed to create backup', error);
    }
  }

  /**
   * Retorna estatísticas do database
   * @returns {object}
   */
  getStats() {
    try {
      const stats = {
        path: this.dbPath,
        size: fs.statSync(this.dbPath).size,
        tables: {},
      };

      // Contar registros de cada tabela
      const tables = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();

      for (const { name } of tables) {
        if (!name.startsWith('sqlite_')) {
          const count = this.db.prepare(`SELECT COUNT(*) as count FROM ${name}`).get();
          stats.tables[name] = count.count;
        }
      }

      return stats;
    } catch (error) {
      dbLogger.error('Failed to get stats', { error: error.message });
      throw new DatabaseError('Failed to get database stats', error);
    }
  }

  /**
   * Otimiza o database (VACUUM)
   */
  optimize() {
    try {
      dbLogger.info('Optimizing database...');
      this.db.exec('VACUUM');
      this.db.exec('ANALYZE');
      dbLogger.info('Database optimized');
    } catch (error) {
      dbLogger.error('Optimization failed', { error: error.message });
      throw new DatabaseError('Failed to optimize database', error);
    }
  }

  /**
   * Health check
   * @returns {boolean}
   */
  healthCheck() {
    try {
      this.db.prepare('SELECT 1').get();
      return true;
    } catch (error) {
      dbLogger.error('Health check failed', { error: error.message });
      return false;
    }
  }
}

/**
 * Exporta instância singleton diretamente
 * @returns {Database}
 */
export function getDatabase() {
  return DatabaseConnection.getInstance();
}

export default DatabaseConnection;

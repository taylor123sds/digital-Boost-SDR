/**
 * DATABASE INDEX
 * Inicializacao e exportacao do banco de dados
 */

import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Models
export { Tenant } from './models/Tenant.js';
export { Agent } from './models/Agent.js';
export { Conversation } from './models/Conversation.js';

// Repositories
export { BaseRepository } from './repositories/BaseRepository.js';
export { AgentRepository } from './repositories/AgentRepository.js';
export { ConversationRepository } from './repositories/ConversationRepository.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

let dbInstance = null;
let repositoriesInstance = null;

/**
 * Inicializa o banco de dados
 */
export function initDatabase(dbPath = 'platform.db') {
  if (dbInstance) return dbInstance;

  dbInstance = new Database(dbPath);
  dbInstance.pragma('journal_mode = WAL');
  dbInstance.pragma('foreign_keys = ON');

  return dbInstance;
}

/**
 * Executa migrations
 */
export function runMigrations(db) {
  const migrationPath = join(__dirname, 'migrations', '001_initial_schema.sql');

  try {
    const migration = readFileSync(migrationPath, 'utf8');
    db.exec(migration);
    console.log('[DB] Migrations executadas com sucesso');
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('[DB] Tabelas ja existem, pulando migrations');
    } else {
      throw error;
    }
  }
}

/**
 * Retorna instancia dos repositorios
 */
export async function getRepositories(db) {
  if (repositoriesInstance) return repositoriesInstance;

  const { AgentRepository } = await import('./repositories/AgentRepository.js');
  const { ConversationRepository } = await import('./repositories/ConversationRepository.js');

  repositoriesInstance = {
    agents: new AgentRepository(db),
    conversations: new ConversationRepository(db),
  };

  return repositoriesInstance;
}

/**
 * Classe gerenciadora do database
 */
export class DatabaseManager {
  constructor(dbPath = 'platform.db') {
    this.db = initDatabase(dbPath);
    this.repositories = null;
  }

  async init() {
    runMigrations(this.db);
    await this.initRepositories();
    return this;
  }

  async initRepositories() {
    const { AgentRepository } = await import('./repositories/AgentRepository.js');
    const { ConversationRepository } = await import('./repositories/ConversationRepository.js');

    this.repositories = {
      agents: new AgentRepository(this.db),
      conversations: new ConversationRepository(this.db),
    };
  }

  getAgentRepository() {
    return this.repositories.agents;
  }

  getConversationRepository() {
    return this.repositories.conversations;
  }

  close() {
    if (this.db) {
      this.db.close();
      dbInstance = null;
      repositoriesInstance = null;
    }
  }

  // Helpers para queries diretas
  query(sql, params = []) {
    return this.db.prepare(sql).all(...params);
  }

  run(sql, params = []) {
    return this.db.prepare(sql).run(...params);
  }

  get(sql, params = []) {
    return this.db.prepare(sql).get(...params);
  }
}

export default DatabaseManager;

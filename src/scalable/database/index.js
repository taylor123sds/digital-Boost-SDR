/**
 * @file database/index.js
 * @description Factory e exports do módulo de database
 *
 * Provê abstração para usar PostgreSQL (produção) ou SQLite (dev)
 */

import { SQLiteDatabaseProvider } from './SQLiteDatabaseProvider.js';

// Singleton do database
let databaseInstance = null;

/**
 * Tipos de banco de dados suportados
 */
export const DatabaseType = {
  SQLITE: 'sqlite',
  POSTGRESQL: 'postgresql',
  POSTGRES: 'postgres'
};

/**
 * Cria ou retorna a instância do database
 * @param {Object} opts - Opções
 * @returns {IDatabaseProvider}
 */
export function getDatabase(opts = {}) {
  if (databaseInstance) {
    return databaseInstance;
  }

  databaseInstance = createDatabaseProvider(opts);
  return databaseInstance;
}

/**
 * Cria um provedor de database baseado no ambiente
 * @param {Object} opts
 * @returns {IDatabaseProvider}
 */
export function createDatabaseProvider(opts = {}) {
  const type = opts.type ||
    process.env.DATABASE_TYPE ||
    (process.env.DATABASE_URL ? 'postgresql' : 'sqlite');

  switch (type.toLowerCase()) {
    case 'postgresql':
    case 'postgres':
      return createPostgreSQLProvider(opts);

    case 'sqlite':
    default:
      return new SQLiteDatabaseProvider(opts);
  }
}

/**
 * Cria provedor PostgreSQL
 * @param {Object} opts
 */
async function createPostgreSQLProvider(opts) {
  try {
    const { PostgreSQLDatabaseProvider } = await import('./PostgreSQLDatabaseProvider.js');
    return new PostgreSQLDatabaseProvider(opts);
  } catch (error) {
    console.warn('[Database] PostgreSQL não disponível, usando SQLite:', error.message);
    return new SQLiteDatabaseProvider(opts);
  }
}

/**
 * Reseta a instância do database
 */
export async function resetDatabase() {
  if (databaseInstance) {
    await databaseInstance.disconnect();
    databaseInstance = null;
  }
}

/**
 * Inicializa o database (conecta e executa migrations)
 * @param {Object} opts
 * @param {Array} [opts.migrations] - Migrations a executar
 */
export async function initDatabase(opts = {}) {
  const db = getDatabase(opts);

  // Conectar
  await db.connect();

  // Executar migrations se fornecidas
  if (opts.migrations && opts.migrations.length > 0) {
    await db.migrate(opts.migrations);
  }

  return db;
}

// ==================== MIGRATIONS PADRÃO ====================

/**
 * Migrations do sistema multi-tenant
 */
export const tenantMigrations = [
  {
    name: '001_create_tenants',
    up: `
      CREATE TABLE IF NOT EXISTS tenants (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        email TEXT,
        phone TEXT,
        plan TEXT DEFAULT 'free',
        status TEXT DEFAULT 'trial',
        trial_ends_at TEXT,
        config TEXT DEFAULT '{}',
        agent_config TEXT DEFAULT '{}',
        usage TEXT DEFAULT '{}',
        metadata TEXT DEFAULT '{}',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
      CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
      CREATE INDEX IF NOT EXISTS idx_tenants_plan ON tenants(plan);
    `
  },
  {
    name: '002_create_notifications',
    up: `
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        type TEXT DEFAULT 'info',
        message TEXT NOT NULL,
        read INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (tenant_id) REFERENCES tenants(id)
      );
      CREATE INDEX IF NOT EXISTS idx_notifications_tenant ON notifications(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
    `
  },
  {
    name: '003_add_tenant_id_to_leads',
    up: `
      -- Adicionar tenant_id às tabelas existentes (se não existir)
      -- SQLite não suporta ADD COLUMN IF NOT EXISTS, então verificamos manualmente
    `
  }
];

/**
 * Migrations do sistema de leads
 */
export const leadsMigrations = [
  {
    name: '001_create_leads_table',
    up: `
      CREATE TABLE IF NOT EXISTS leads (
        id TEXT PRIMARY KEY,
        tenant_id TEXT,
        nome TEXT,
        empresa TEXT,
        telefone TEXT NOT NULL,
        email TEXT,
        cargo TEXT,
        origem TEXT,
        stage_id TEXT DEFAULT 'stage_lead_novo',
        cadence_status TEXT DEFAULT 'not_started',
        score INTEGER DEFAULT 0,
        metadata TEXT DEFAULT '{}',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_leads_telefone ON leads(telefone);
      CREATE INDEX IF NOT EXISTS idx_leads_tenant ON leads(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_leads_stage ON leads(stage_id);
    `
  }
];

/**
 * Migrations do sistema de mensagens
 */
export const messagesMigrations = [
  {
    name: '001_create_whatsapp_messages',
    up: `
      CREATE TABLE IF NOT EXISTS whatsapp_messages (
        id TEXT PRIMARY KEY,
        tenant_id TEXT,
        message_id TEXT,
        phone TEXT NOT NULL,
        direction TEXT NOT NULL,
        content TEXT,
        type TEXT DEFAULT 'text',
        status TEXT DEFAULT 'sent',
        metadata TEXT DEFAULT '{}',
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_messages_phone ON whatsapp_messages(phone);
      CREATE INDEX IF NOT EXISTS idx_messages_tenant ON whatsapp_messages(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_messages_direction ON whatsapp_messages(direction);
    `
  }
];

/**
 * Migrations do sistema de meetings
 */
export const meetingsMigrations = [
  {
    name: '001_create_meetings',
    up: `
      CREATE TABLE IF NOT EXISTS meetings (
        id TEXT PRIMARY KEY,
        tenant_id TEXT,
        lead_id TEXT,
        phone TEXT,
        title TEXT,
        scheduled_at TEXT NOT NULL,
        duration INTEGER DEFAULT 30,
        status TEXT DEFAULT 'scheduled',
        notes TEXT,
        metadata TEXT DEFAULT '{}',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_meetings_tenant ON meetings(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_meetings_lead ON meetings(lead_id);
      CREATE INDEX IF NOT EXISTS idx_meetings_scheduled ON meetings(scheduled_at);
      CREATE INDEX IF NOT EXISTS idx_meetings_status ON meetings(status);
    `
  }
];

/**
 * Todas as migrations padrão
 */
export const defaultMigrations = [
  ...tenantMigrations,
  ...leadsMigrations,
  ...messagesMigrations,
  ...meetingsMigrations
];

// ==================== EXPORTS ====================

export { SQLiteDatabaseProvider } from './SQLiteDatabaseProvider.js';

// Export condicional do PostgreSQL
export async function getPostgreSQLProvider() {
  try {
    const { PostgreSQLDatabaseProvider } = await import('./PostgreSQLDatabaseProvider.js');
    return PostgreSQLDatabaseProvider;
  } catch {
    return null;
  }
}

export default {
  DatabaseType,
  getDatabase,
  createDatabaseProvider,
  resetDatabase,
  initDatabase,
  tenantMigrations,
  leadsMigrations,
  messagesMigrations,
  meetingsMigrations,
  defaultMigrations,
  SQLiteDatabaseProvider,
  getPostgreSQLProvider
};

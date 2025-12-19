/**
 * @file migrate.js
 * @description Database migration runner for CRM tables
 * Executes SQL and JS migration files in deterministic order
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env so DATABASE_PATH is respected when running via CLI
dotenv.config({ path: path.join(process.cwd(), '.env') });

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'orbion.db');
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

/**
 * Create migrations tracking table
 */
function createMigrationsTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT UNIQUE NOT NULL,
      executed_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

/**
 * Get list of executed migrations
 */
function getExecutedMigrations(db) {
  const rows = db.prepare('SELECT filename FROM _migrations ORDER BY id').all();
  return rows.map(row => row.filename);
}

/**
 * Custom sort to ensure schema is created before performance indexes
 * and to include .js migrations.
 */
function getMigrationFiles() {
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql') || f.endsWith('.js'));

  const parseOrder = (filename) => {
    const match = filename.match(/^(\d+)/);
    const num = match ? parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;

    // Force performance index migration to run last (depends on tables)
    if (filename.includes('add_performance_indexes')) {
      return { num: Number.MAX_SAFE_INTEGER, weight: 99 };
    }

    // Prioritize table creation before other alterations within same prefix
    const weight = filename.includes('create_') ? 0 : 1;
    return { num, weight };
  };

  return files.sort((a, b) => {
    const aOrder = parseOrder(a);
    const bOrder = parseOrder(b);

    if (aOrder.num !== bOrder.num) {
      return aOrder.num - bOrder.num;
    }
    if (aOrder.weight !== bOrder.weight) {
      return aOrder.weight - bOrder.weight;
    }
    return a.localeCompare(b);
  });
}

/**
 * Execute a single migration file (.sql or .js)
 */
async function executeMigration(db, filename) {
  const filePath = path.join(MIGRATIONS_DIR, filename);

  if (filename.endsWith('.sql')) {
    const sql = fs.readFileSync(filePath, 'utf-8');
    db.exec(sql);
    db.prepare('INSERT INTO _migrations (filename) VALUES (?)').run(filename);
    console.log(` Executed SQL migration: ${filename}`);
    return true;
  }

  if (filename.endsWith('.js')) {
    const moduleUrl = pathToFileURL(filePath).href;
    const migrationModule = await import(moduleUrl);
    const up = migrationModule.up || migrationModule.default?.up;

    if (typeof up !== 'function') {
      throw new Error(`Migration ${filename} does not export an "up" function`);
    }

    await up();

    db.prepare('INSERT INTO _migrations (filename) VALUES (?)').run(filename);
    console.log(` Executed JS migration: ${filename}`);
    return true;
  }

  throw new Error(`Unsupported migration file type: ${filename}`);
}

/**
 * Critical tables that MUST exist after migrations
 * Boot will fail if any of these are missing
 */
const CRITICAL_TABLES = [
  'leads',
  'users',
  'teams',
  'sessions',
  'agents',
  'integrations',
  'pipeline_stages',
  '_migrations'
];

/**
 * Validate critical tables exist
 * @throws Error if any critical table is missing
 */
function validateCriticalTables(db) {
  const missing = [];

  for (const table of CRITICAL_TABLES) {
    const exists = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
    ).get(table);

    if (!exists) {
      missing.push(table);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `CRITICAL: Missing required tables: ${missing.join(', ')}. ` +
      `Database is incomplete. Run migrations or restore from backup.`
    );
  }

  console.log(` Validated ${CRITICAL_TABLES.length} critical tables exist`);
}

/**
 * Main migration runner
 * @param {Object} options - Options
 * @param {boolean} options.validateOnly - Only validate, don't run migrations
 * @param {boolean} options.failOnMissing - Fail if _migrations table doesn't exist (strict mode)
 */
export async function runMigrations(options = {}) {
  const { validateOnly = false, failOnMissing = true } = options;

  console.log(' Starting database migrations...');
  console.log(` Database: ${DB_PATH}`);
  console.log(` Migrations directory: ${MIGRATIONS_DIR}`);
  console.log(` Mode: ${validateOnly ? 'VALIDATE ONLY' : 'EXECUTE'}`);

  let db;
  try {
    // Ensure database directory exists
    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
      console.log(` Created database directory: ${dbDir}`);
    }

    // Open database connection
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL'); // Better performance

    // Check if _migrations table exists (strict mode check)
    const migrationsTableExists = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='_migrations'"
    ).get();

    if (!migrationsTableExists && failOnMissing) {
      // First run or corrupted database - create table
      console.log(' _migrations table not found. Creating...');
    }

    // Create migrations tracking table
    createMigrationsTable(db);

    // Get executed and pending migrations
    const executedMigrations = getExecutedMigrations(db);
    const migrationFiles = getMigrationFiles();
    const pendingMigrations = migrationFiles.filter(f => !executedMigrations.includes(f));

    console.log(`\n Migration status:`);
    console.log(`   Total migrations: ${migrationFiles.length}`);
    console.log(`   Executed: ${executedMigrations.length}`);
    console.log(`   Pending: ${pendingMigrations.length}`);

    if (validateOnly) {
      // Only validate, don't execute
      if (pendingMigrations.length > 0) {
        console.error(`\n VALIDATION FAILED: ${pendingMigrations.length} pending migrations`);
        console.error(` Pending: ${pendingMigrations.join(', ')}`);
        throw new Error(`Database is out of date. ${pendingMigrations.length} migrations pending.`);
      }
      console.log('\n Database schema is up to date');
      validateCriticalTables(db);
      return { executed: 0, total: migrationFiles.length, validated: true };
    }

    if (pendingMigrations.length === 0) {
      console.log('\n Database is up to date! No migrations to run.');
      validateCriticalTables(db);
      return { executed: 0, total: migrationFiles.length };
    }

    console.log(`\n Executing ${pendingMigrations.length} pending migration(s):\n`);

    // Execute pending migrations sequentially to allow mixed SQL/JS files
    for (const filename of pendingMigrations) {
      try {
        await executeMigration(db, filename);
      } catch (error) {
        console.error(` Error executing migration ${filename}:`, error.message);
        throw error;
      }
    }

    console.log(`\n All migrations completed successfully!`);
    console.log(` Database schema version: ${migrationFiles.length}\n`);

    // Validate critical tables after migration
    validateCriticalTables(db);

    return {
      executed: pendingMigrations.length,
      total: migrationFiles.length
    };

  } catch (error) {
    console.error('\n Migration failed:', error);
    throw error;
  } finally {
    if (db) {
      db.close();
      console.log(' Database connection closed');
    }
  }
}

/**
 * Rollback last migration (use with caution!)
 */
export async function rollbackLastMigration() {
  console.log('  Rolling back last migration...');

  let db;
  try {
    db = new Database(DB_PATH);
    const lastMigration = db.prepare('SELECT filename FROM _migrations ORDER BY id DESC LIMIT 1').get();

    if (!lastMigration) {
      console.log(' No migrations to rollback');
      return;
    }

    console.log(` Rolling back: ${lastMigration.filename}`);
    console.log('  WARNING: This will drop all tables created by this migration!');
    console.log('  There is no automatic rollback - manual intervention required.');

    // Remove migration record
    db.prepare('DELETE FROM _migrations WHERE filename = ?').run(lastMigration.filename);

    console.log(` Migration record removed: ${lastMigration.filename}`);
    console.log('  Note: Tables were NOT automatically dropped. Please drop manually if needed.');

  } catch (error) {
    console.error(' Rollback failed:', error);
    throw error;
  } finally {
    if (db) {
      db.close();
    }
  }
}

/**
 * Get migration status
 */
export function getMigrationStatus() {
  let db;
  try {
    db = new Database(DB_PATH);
    createMigrationsTable(db);

    const executedMigrations = getExecutedMigrations(db);
    const migrationFiles = getMigrationFiles();

    return {
      total: migrationFiles.length,
      executed: executedMigrations.length,
      pending: migrationFiles.length - executedMigrations.length,
      executedList: executedMigrations,
      pendingList: migrationFiles.filter(f => !executedMigrations.includes(f))
    };
  } finally {
    if (db) {
      db.close();
    }
  }
}

/**
 * CRITICAL COLUMN CHECKS
 * Maps critical columns to their expected tables
 * Used to detect schema drift (migrations registered but not applied)
 */
const CRITICAL_COLUMNS = {
  leads: ['id', 'telefone', 'nome', 'stage_id', 'cadence_status', 'pipeline_id'],
  users: ['id', 'email', 'password_hash', 'role'],
  agents: ['id', 'tenant_id', 'name', 'status'],
  pipeline_stages: ['id', 'name', 'order_index'],
  inbound_events: ['id', 'event_type', 'payload', 'status'],
  async_jobs: ['id', 'job_type', 'payload', 'status'],
  workspaces: ['id', 'name', 'slug']
};

/**
 * Detect schema drift - when migrations are registered but tables/columns are missing
 * This catches the case where _migrations says a migration ran but the schema wasn't applied
 *
 * @returns {Object} { hasDrift: boolean, issues: string[], dbPath: string }
 */
export function detectSchemaDrift() {
  let db;
  const issues = [];

  try {
    db = new Database(DB_PATH);

    console.log(`\n [DRIFT-DETECTOR] Checking database: ${DB_PATH}`);

    // Check critical tables exist
    for (const tableName of CRITICAL_TABLES) {
      const exists = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
      ).get(tableName);

      if (!exists) {
        issues.push(`Missing table: ${tableName}`);
      }
    }

    // Check critical columns exist (deeper validation)
    for (const [tableName, columns] of Object.entries(CRITICAL_COLUMNS)) {
      // First check table exists
      const tableExists = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
      ).get(tableName);

      if (!tableExists) {
        // Already reported above
        continue;
      }

      // Get actual columns in table
      try {
        const tableInfo = db.prepare(`PRAGMA table_info(${tableName})`).all();
        const actualColumns = tableInfo.map(c => c.name);

        for (const expectedColumn of columns) {
          if (!actualColumns.includes(expectedColumn)) {
            issues.push(`Missing column: ${tableName}.${expectedColumn}`);
          }
        }
      } catch (e) {
        issues.push(`Error checking table ${tableName}: ${e.message}`);
      }
    }

    // Check for _migrations table consistency
    const migrationCount = db.prepare(
      "SELECT COUNT(*) as count FROM _migrations"
    ).get()?.count || 0;

    const migrationFiles = getMigrationFiles();

    if (migrationCount > migrationFiles.length) {
      issues.push(`Anomaly: More migrations in DB (${migrationCount}) than files (${migrationFiles.length})`);
    }

    const result = {
      hasDrift: issues.length > 0,
      issues,
      dbPath: DB_PATH,
      migrationsInDb: migrationCount,
      migrationsOnDisk: migrationFiles.length
    };

    if (result.hasDrift) {
      console.error(`\n [DRIFT-DETECTOR] SCHEMA DRIFT DETECTED!`);
      console.error(`   Issues found: ${issues.length}`);
      issues.forEach(issue => console.error(`   - ${issue}`));
      console.error(`\n   This usually means:`);
      console.error(`   1. Migrations were marked as run but SQL was not applied`);
      console.error(`   2. Database was replaced/recreated without running migrations`);
      console.error(`   3. Wrong database file is being used`);
      console.error(`\n   Resolution:`);
      console.error(`   1. Delete data/orbion.db and let migrations run fresh`);
      console.error(`   2. Or manually apply missing schema changes`);
      console.error(`   3. Verify DATABASE_PATH environment variable`);
    } else {
      console.log(` [DRIFT-DETECTOR] No schema drift detected`);
      console.log(`   Tables: ${CRITICAL_TABLES.length} validated`);
      console.log(`   Migrations: ${migrationCount} in DB, ${migrationFiles.length} on disk`);
    }

    return result;

  } catch (error) {
    console.error(` [DRIFT-DETECTOR] Error:`, error.message);
    return {
      hasDrift: true,
      issues: [`Database error: ${error.message}`],
      dbPath: DB_PATH,
      error: error.message
    };
  } finally {
    if (db) {
      db.close();
    }
  }
}

/**
 * Validate schema and fail fast if drift is detected
 * Used during boot to prevent starting with corrupted schema
 *
 * @param {boolean} failOnDrift - If true, throws error on drift (default: true in production)
 * @returns {Object} drift detection result
 */
export function validateSchemaOrFail(failOnDrift = true) {
  const isProduction = process.env.NODE_ENV === 'production';
  const shouldFail = failOnDrift || isProduction;

  console.log(`\n [SCHEMA-VALIDATOR] Running pre-boot validation...`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Fail on drift: ${shouldFail}`);

  const driftResult = detectSchemaDrift();

  if (driftResult.hasDrift && shouldFail) {
    const errorMessage = [
      '',
      '═══════════════════════════════════════════════════════════',
      ' BOOT FAILED: Schema drift detected!',
      '═══════════════════════════════════════════════════════════',
      '',
      ` Database: ${driftResult.dbPath}`,
      ` Issues:`,
      ...driftResult.issues.map(i => `   - ${i}`),
      '',
      ' Resolution:',
      '   1. Run migrations: node src/db/migrate.js',
      '   2. Or reset database: rm data/orbion.db && restart',
      '   3. Check DATABASE_PATH environment variable',
      '',
      '═══════════════════════════════════════════════════════════',
      ''
    ].join('\n');

    console.error(errorMessage);
    throw new Error(`Schema drift detected: ${driftResult.issues.length} issue(s)`);
  }

  return driftResult;
}

// Run migrations if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

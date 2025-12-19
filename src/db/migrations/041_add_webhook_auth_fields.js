/**
 * @file 041_add_webhook_auth_fields.js
 * @description Add webhook auth columns for integrations.
 */

import { getDatabase } from '../index.js';

function tableExists(db, tableName) {
  return !!db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
  ).get(tableName);
}

function columnExists(db, tableName, columnName) {
  const info = db.prepare(`PRAGMA table_info(${tableName})`).all();
  return info.some(col => col.name === columnName);
}

function addColumnIfMissing(db, tableName, columnName, columnType) {
  if (!tableExists(db, tableName)) return false;
  if (columnExists(db, tableName, columnName)) return false;
  db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnType}`);
  return true;
}

function backfillAuthType(db) {
  if (!tableExists(db, 'integrations')) return false;
  if (!columnExists(db, 'integrations', 'webhook_auth_type')) return false;
  db.exec(`
    UPDATE integrations
    SET webhook_auth_type = CASE
      WHEN json_valid(config_json) AND json_extract(config_json, '$.webhook_auth_type') IS NOT NULL
        THEN json_extract(config_json, '$.webhook_auth_type')
      ELSE 'header_secret'
    END
    WHERE webhook_auth_type IS NULL
  `);
  return true;
}

function backfillOptionalField(db, columnName, jsonPath) {
  if (!tableExists(db, 'integrations')) return false;
  if (!columnExists(db, 'integrations', columnName)) return false;
  db.exec(`
    UPDATE integrations
    SET ${columnName} = json_extract(config_json, '${jsonPath}')
    WHERE ${columnName} IS NULL
      AND json_valid(config_json)
      AND json_extract(config_json, '${jsonPath}') IS NOT NULL
  `);
  return true;
}

function ensureTriggers(db) {
  if (!tableExists(db, 'integrations')) return false;

  db.exec('DROP TRIGGER IF EXISTS trg_integrations_sync_webhook_auth_type_insert;');
  db.exec('DROP TRIGGER IF EXISTS trg_integrations_sync_webhook_auth_type_update;');
  db.exec('DROP TRIGGER IF EXISTS trg_integrations_sync_webhook_query_token_insert;');
  db.exec('DROP TRIGGER IF EXISTS trg_integrations_sync_webhook_query_token_update;');
  db.exec('DROP TRIGGER IF EXISTS trg_integrations_sync_webhook_hmac_secret_insert;');
  db.exec('DROP TRIGGER IF EXISTS trg_integrations_sync_webhook_hmac_secret_update;');

  db.exec(`
    CREATE TRIGGER trg_integrations_sync_webhook_auth_type_insert
    AFTER INSERT ON integrations
    WHEN json_valid(NEW.config_json)
      AND json_extract(NEW.config_json, '$.webhook_auth_type') IS NOT NULL
      AND NEW.webhook_auth_type IS NULL
    BEGIN
      UPDATE integrations
      SET webhook_auth_type = json_extract(NEW.config_json, '$.webhook_auth_type')
      WHERE id = NEW.id;
    END;
  `);

  db.exec(`
    CREATE TRIGGER trg_integrations_sync_webhook_auth_type_update
    AFTER UPDATE OF config_json ON integrations
    WHEN json_valid(NEW.config_json)
      AND json_extract(NEW.config_json, '$.webhook_auth_type') IS NOT NULL
      AND NEW.webhook_auth_type IS NULL
    BEGIN
      UPDATE integrations
      SET webhook_auth_type = json_extract(NEW.config_json, '$.webhook_auth_type')
      WHERE id = NEW.id;
    END;
  `);

  db.exec(`
    CREATE TRIGGER trg_integrations_sync_webhook_query_token_insert
    AFTER INSERT ON integrations
    WHEN json_valid(NEW.config_json)
      AND json_extract(NEW.config_json, '$.webhook_query_token') IS NOT NULL
      AND NEW.webhook_query_token IS NULL
    BEGIN
      UPDATE integrations
      SET webhook_query_token = json_extract(NEW.config_json, '$.webhook_query_token')
      WHERE id = NEW.id;
    END;
  `);

  db.exec(`
    CREATE TRIGGER trg_integrations_sync_webhook_query_token_update
    AFTER UPDATE OF config_json ON integrations
    WHEN json_valid(NEW.config_json)
      AND json_extract(NEW.config_json, '$.webhook_query_token') IS NOT NULL
      AND NEW.webhook_query_token IS NULL
    BEGIN
      UPDATE integrations
      SET webhook_query_token = json_extract(NEW.config_json, '$.webhook_query_token')
      WHERE id = NEW.id;
    END;
  `);

  db.exec(`
    CREATE TRIGGER trg_integrations_sync_webhook_hmac_secret_insert
    AFTER INSERT ON integrations
    WHEN json_valid(NEW.config_json)
      AND json_extract(NEW.config_json, '$.webhook_hmac_secret') IS NOT NULL
      AND NEW.webhook_hmac_secret IS NULL
    BEGIN
      UPDATE integrations
      SET webhook_hmac_secret = json_extract(NEW.config_json, '$.webhook_hmac_secret')
      WHERE id = NEW.id;
    END;
  `);

  db.exec(`
    CREATE TRIGGER trg_integrations_sync_webhook_hmac_secret_update
    AFTER UPDATE OF config_json ON integrations
    WHEN json_valid(NEW.config_json)
      AND json_extract(NEW.config_json, '$.webhook_hmac_secret') IS NOT NULL
      AND NEW.webhook_hmac_secret IS NULL
    BEGIN
      UPDATE integrations
      SET webhook_hmac_secret = json_extract(NEW.config_json, '$.webhook_hmac_secret')
      WHERE id = NEW.id;
    END;
  `);

  return true;
}

export function up() {
  const db = getDatabase();

  addColumnIfMissing(db, 'integrations', 'webhook_auth_type', "TEXT DEFAULT 'header_secret'");
  addColumnIfMissing(db, 'integrations', 'webhook_query_token', 'TEXT');
  addColumnIfMissing(db, 'integrations', 'webhook_hmac_secret', 'TEXT');

  backfillAuthType(db);
  backfillOptionalField(db, 'webhook_query_token', '$.webhook_query_token');
  backfillOptionalField(db, 'webhook_hmac_secret', '$.webhook_hmac_secret');

  ensureTriggers(db);
  return true;
}

export function down() {
  // Non-destructive migration: no down migration
  return true;
}

const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  try {
    up();
    console.log(' Migration 041 executed successfully');
  } catch (error) {
    console.error(' Migration 041 failed:', error);
    process.exit(1);
  }
}

export default { up, down };

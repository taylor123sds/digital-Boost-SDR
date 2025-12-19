// utils/stateManager.js
//  UNIFIED STATE MANAGER - Clean implementation using canonical schema
//  FIX CRÍTICO: Usar conexão centralizada para evitar corrupção do banco

import { getDatabase } from '../db/index.js';
import { StateValidator, createInitialState } from '../schemas/leadState.schema.js';
import { normalizePhone } from './phone_normalizer.js';

//  CORREÇÃO: Usar conexão singleton do db/connection.js
// ANTES: Criava nova conexão independente causando conflitos de WAL
// DEPOIS: Usa conexão centralizada que já configura WAL, busy_timeout, etc.
const db = getDatabase();

/**
 *  CANONICAL STATE TABLE
 * This is the ONLY table used for lead state storage
 */
db.exec(`CREATE TABLE IF NOT EXISTS lead_states (
  phone_number TEXT PRIMARY KEY,
  current_agent TEXT NOT NULL DEFAULT 'sdr',
  message_count INTEGER NOT NULL DEFAULT 0,

  -- JSON columns (using canonical schema)
  company_profile TEXT NOT NULL DEFAULT '{"nome":null,"empresa":null,"setor":null}',
  bant_stages TEXT NOT NULL,
  scheduler TEXT NOT NULL,
  metadata TEXT NOT NULL,

  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// Create index for faster lookups
db.exec(`CREATE INDEX IF NOT EXISTS idx_lead_states_agent ON lead_states(current_agent)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_lead_states_updated ON lead_states(updated_at)`);

console.log(' [STATE-MANAGER] Canonical lead_states table initialized');

/**
 *  SAVE LEAD STATE
 * Validates and persists state using canonical schema
 */
export async function saveLeadState(state) {
  try {
    //  FIX: Normalizar telefone antes de salvar para garantir consistência
    const originalPhone = state.phoneNumber;
    state.phoneNumber = normalizePhone(state.phoneNumber) || state.phoneNumber;

    if (state.phoneNumber !== originalPhone) {
      console.log(` [STATE-MANAGER] Normalizado: ${originalPhone}  ${state.phoneNumber}`);
    }

    // 1. Validate state structure
    const validation = StateValidator.validate(state);
    if (!validation.valid) {
      console.error(` [STATE-MANAGER] Validation failed for ${state.phoneNumber}:`, validation.errors);
      throw new Error(`Invalid state: ${validation.errors.join(', ')}`);
    }

    // 2. Update timestamp
    if (!state.metadata) state.metadata = {};
    state.metadata.updatedAt = new Date().toISOString();

    // 3. Prepare statement
    const stmt = db.prepare(`
      INSERT INTO lead_states (
        phone_number, current_agent, message_count,
        company_profile, bant_stages, scheduler, metadata,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(phone_number) DO UPDATE SET
        current_agent = excluded.current_agent,
        message_count = excluded.message_count,
        company_profile = excluded.company_profile,
        bant_stages = excluded.bant_stages,
        scheduler = excluded.scheduler,
        metadata = excluded.metadata,
        updated_at = datetime('now')
    `);

    // 4. Execute
    const result = stmt.run(
      state.phoneNumber,
      state.currentAgent,
      state.messageCount,
      JSON.stringify(state.companyProfile),
      JSON.stringify(state.bantStages),
      JSON.stringify(state.scheduler),
      JSON.stringify(state.metadata)
    );

    console.log(` [STATE-MANAGER] Saved state for ${state.phoneNumber} (agent: ${state.currentAgent}, messages: ${state.messageCount})`);

    return { success: true, changes: result.changes };
  } catch (error) {
    console.error(` [STATE-MANAGER] Error saving state for ${state.phoneNumber}:`, error.message);
    throw error;
  }
}

/**
 *  GET LEAD STATE
 * Retrieves and deserializes state from database
 */
export async function getLeadState(phoneNumber) {
  try {
    //  FIX: Normalizar telefone para garantir match entre webhook e prospecting
    const cleanNumber = normalizePhone(phoneNumber) || phoneNumber.replace('@s.whatsapp.net', '');

    const stmt = db.prepare(`
      SELECT * FROM lead_states WHERE phone_number = ?
    `);

    const row = stmt.get(cleanNumber);

    if (!row) {
      console.log(` [STATE-MANAGER] No state found for ${cleanNumber} - creating initial state`);
      return createInitialState(cleanNumber);
    }

    // Deserialize JSON fields
    const state = {
      phoneNumber: row.phone_number,
      currentAgent: row.current_agent,
      messageCount: row.message_count,
      companyProfile: JSON.parse(row.company_profile),
      bantStages: JSON.parse(row.bant_stages),
      scheduler: JSON.parse(row.scheduler),
      metadata: JSON.parse(row.metadata)
    };

    console.log(` [STATE-MANAGER] Loaded state for ${cleanNumber} (agent: ${state.currentAgent}, messages: ${state.messageCount})`);

    return state;
  } catch (error) {
    console.error(` [STATE-MANAGER] Error loading state for ${phoneNumber}:`, error.message);
    // Return initial state on error
    return createInitialState(phoneNumber.replace('@s.whatsapp.net', ''));
  }
}

/**
 *  MIGRATE LEGACY STATE
 * Migrates data from old enhanced_conversation_states table to new lead_states
 */
export async function migrateLegacyStates() {
  try {
    console.log(` [STATE-MIGRATION] Starting migration from enhanced_conversation_states...`);

    // Check if old table exists
    const tableExists = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='enhanced_conversation_states'
    `).get();

    if (!tableExists) {
      console.log(`ℹ [STATE-MIGRATION] Old table not found - nothing to migrate`);
      return { migrated: 0, errors: 0 };
    }

    // Get all records from old table
    const oldRecords = db.prepare(`
      SELECT * FROM enhanced_conversation_states
    `).all();

    console.log(` [STATE-MIGRATION] Found ${oldRecords.length} records to migrate`);

    let migrated = 0;
    let errors = 0;

    for (const oldRecord of oldRecords) {
      try {
        // Build legacy state object
        const legacyState = {
          phone_number: oldRecord.phone_number,
          phoneNumber: oldRecord.phone_number,
          current_agent: oldRecord.current_agent,
          currentAgent: oldRecord.current_agent,
          message_count: oldRecord.message_count,
          messageCount: oldRecord.message_count,
          companyProfile: oldRecord.company_profile ? JSON.parse(oldRecord.company_profile) : {},
          bantStages: oldRecord.bant_stages ? JSON.parse(oldRecord.bant_stages) : null,
          bant_stages: oldRecord.bant_stages ? JSON.parse(oldRecord.bant_stages) : null,
          bant_data: oldRecord.bant_data ? JSON.parse(oldRecord.bant_data) : null,
          metadata: oldRecord.metadata ? JSON.parse(oldRecord.metadata) : {}
        };

        // Migrate using StateValidator
        const cleanState = StateValidator.migrate(legacyState);

        // Save to new table
        await saveLeadState(cleanState);

        migrated++;
      } catch (error) {
        console.error(` [STATE-MIGRATION] Error migrating ${oldRecord.phone_number}:`, error.message);
        errors++;
      }
    }

    console.log(` [STATE-MIGRATION] Migration complete: ${migrated} migrated, ${errors} errors`);

    return { migrated, errors };
  } catch (error) {
    console.error(` [STATE-MIGRATION] Fatal migration error:`, error.message);
    throw error;
  }
}

/**
 *  GET ALL LEADS BY AGENT
 * Returns all leads currently assigned to a specific agent
 */
export async function getLeadsByAgent(agentName) {
  try {
    const stmt = db.prepare(`
      SELECT * FROM lead_states WHERE current_agent = ? ORDER BY updated_at DESC
    `);

    const rows = stmt.all(agentName);

    return rows.map(row => ({
      phoneNumber: row.phone_number,
      currentAgent: row.current_agent,
      messageCount: row.message_count,
      companyProfile: JSON.parse(row.company_profile),
      bantStages: JSON.parse(row.bant_stages),
      scheduler: JSON.parse(row.scheduler),
      metadata: JSON.parse(row.metadata)
    }));
  } catch (error) {
    console.error(` [STATE-MANAGER] Error getting leads for agent ${agentName}:`, error.message);
    return [];
  }
}

/**
 *  CLEANUP OLD STATES
 * Removes states older than specified days
 * SECURITY: daysOld is validated as a safe integer to prevent SQL injection
 */
export async function cleanupOldStates(daysOld = 30) {
  try {
    // SECURITY: Validate daysOld as a positive integer within reasonable bounds
    const safeDays = Math.min(Math.max(1, Math.floor(parseInt(daysOld) || 30)), 365);

    // Use parameterized query with datetime calculation in SQLite
    const stmt = db.prepare(`
      DELETE FROM lead_states
      WHERE updated_at < datetime('now', '-' || ? || ' days')
    `);

    const result = stmt.run(safeDays);

    console.log(` [STATE-MANAGER] Cleaned up ${result.changes} states older than ${safeDays} days`);

    return { deleted: result.changes };
  } catch (error) {
    console.error(` [STATE-MANAGER] Error cleaning up old states:`, error.message);
    return { deleted: 0 };
  }
}

/**
 *  GET STATE STATISTICS
 */
export async function getStateStatistics() {
  try {
    const stats = db.prepare(`
      SELECT
        current_agent,
        COUNT(*) as count,
        AVG(message_count) as avg_messages,
        MAX(updated_at) as last_activity
      FROM lead_states
      GROUP BY current_agent
    `).all();

    return stats;
  } catch (error) {
    console.error(` [STATE-MANAGER] Error getting statistics:`, error.message);
    return [];
  }
}

/**
 *  RESET LEAD STATE
 * Deletes existing state for a lead, forcing a fresh start
 * Used by campaign trigger to ensure lead starts from SDR Agent
 */
export async function resetLead(phoneNumber) {
  try {
    const cleanNumber = phoneNumber.replace('@s.whatsapp.net', '');

    const stmt = db.prepare(`
      DELETE FROM lead_states WHERE phone_number = ?
    `);

    const result = stmt.run(cleanNumber);

    if (result.changes > 0) {
      console.log(` [STATE-MANAGER] Reset state for ${cleanNumber} - lead will start fresh with SDR`);
    } else {
      console.log(`ℹ [STATE-MANAGER] No existing state found for ${cleanNumber} - will start fresh`);
    }

    return { success: true, deleted: result.changes };
  } catch (error) {
    console.error(` [STATE-MANAGER] Error resetting lead ${phoneNumber}:`, error.message);
    throw error;
  }
}

export default {
  saveLeadState,
  getLeadState,
  migrateLegacyStates,
  getLeadsByAgent,
  cleanupOldStates,
  getStateStatistics,
  resetLead
};

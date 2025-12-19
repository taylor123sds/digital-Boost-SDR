// schemas/leadState.schema.js
//  CANONICAL LEAD STATE SCHEMA - Single Source of Truth

/**
 * UNIFIED LEAD STATE SCHEMA
 *
 * This is the ONLY state structure used throughout the system.
 * All agents, tools, and persistence layers MUST use this schema.
 */

export const LEAD_STATE_SCHEMA = {
  // ===== IDENTITY =====
  phoneNumber: null,           // Primary key (normalized format: 5584...)

  // ===== AGENT ROUTING =====
  currentAgent: 'sdr',         // sdr | specialist | scheduler | atendimento
  messageCount: 0,             // Total messages exchanged
                               // Note: Use metadata.conversationCompleted=true for finished conversations

  // ===== COMPANY PROFILE (collected by SDR) =====
  companyProfile: {
    nome: null,                // Contact person name
    empresa: null,             // Company name
    setor: null               // Business sector/industry
  },

  // ===== BANT QUALIFICATION (managed by Specialist) =====
  bantStages: {
    currentStage: 'need',      // need | budget | authority | timing
    stageIndex: 0,             // 0-3
    isComplete: false,         // true when all 4 stages completed

    // Stage data - CANONICAL structure
    stageData: {
      need: {
        campos: {},            // { nome_pessoa, nome_negocio, nicho, cargo_funcao, problema_principal, intensidade_problema, receita_mensal, funcionarios, servico_identificado, consequencias }
        tentativas: 0,
        lastUpdate: null
      },
      budget: {
        campos: {},            // { faixa_investimento, roi_esperado, flexibilidade_budget }
        tentativas: 0,
        lastUpdate: null
      },
      authority: {
        campos: {},            // { decisor_principal, autonomia_decisao, processo_decisao }
        tentativas: 0,
        lastUpdate: null
      },
      timing: {
        campos: {},            // { urgencia, prazo_ideal, motivo_urgencia }
        tentativas: 0,
        lastUpdate: null
      }
    },

    conversationHistory: []    // Used by BANT GPT (trimmed to last 10)
  },

  // ===== SCHEDULER (managed by Scheduler Agent) =====
  scheduler: {
    stage: null,               // collecting_email | proposing_times | negotiating | confirmed
    leadEmail: null,           // Collected email
    proposedSlots: [],         // Available time slots
    selectedSlot: null,        // Chosen slot
    meetingData: {
      eventId: null,           // Google Calendar event ID
      meetLink: null,          // Google Meet link
      confirmedAt: null        // ISO timestamp
    }
  },

  // ===== METADATA =====
  metadata: {
    createdAt: null,           // ISO timestamp - first message
    updatedAt: null,           // ISO timestamp - last update
    lastMessageAt: null,       // ISO timestamp - last message from lead
    handoffHistory: [],        // [{ from: 'sdr', to: 'specialist', at: timestamp }]

    // Flags
    introductionSent: false,   // SDR sent first message
    bantComplete: false,       // Specialist completed BANT
    meetingScheduled: false,   // Scheduler confirmed meeting

    // Google Sheets sync
    lastSheetSync: null,       // ISO timestamp
    sheetSyncErrors: 0
  }
};

/**
 * STATE VALIDATOR
 * Ensures state conforms to schema before saving
 */
export class StateValidator {
  /**
   * Validate state structure
   * @param {Object} state - State to validate
   * @returns {{ valid: boolean, errors: string[] }}
   */
  static validate(state) {
    const errors = [];

    // Required fields
    if (!state.phoneNumber) {
      errors.push('phoneNumber is required');
    }

    //  FIX: Removed 'completed' - use metadata.conversationCompleted instead
    if (!['sdr', 'specialist', 'scheduler', 'atendimento'].includes(state.currentAgent)) {
      errors.push(`Invalid currentAgent: ${state.currentAgent} (valid: sdr, specialist, scheduler, atendimento)`);
    }

    // BANT stages structure
    if (state.bantStages) {
      const validStages = ['need', 'budget', 'authority', 'timing'];
      if (!validStages.includes(state.bantStages.currentStage)) {
        errors.push(`Invalid BANT currentStage: ${state.bantStages.currentStage}`);
      }

      //  FIX: When BANT is complete, stageIndex can be 4 (after timing=3)
      // Allow stageIndex 0-4 (4 means completed all 4 stages)
      if (typeof state.bantStages.stageIndex !== 'number' || state.bantStages.stageIndex < 0 || state.bantStages.stageIndex > 4) {
        errors.push(`Invalid BANT stageIndex: ${state.bantStages.stageIndex}`);
      }

      //  FIX: If stageIndex is > 3, force isComplete = true
      if (state.bantStages.stageIndex > 3) {
        state.bantStages.isComplete = true;
        state.bantStages.stageIndex = 3; // Cap at 3 for consistency
      }
    }

    // Scheduler stage
    if (state.scheduler?.stage) {
      const validSchedulerStages = ['collecting_email', 'proposing_times', 'negotiating', 'confirmed'];
      if (!validSchedulerStages.includes(state.scheduler.stage)) {
        errors.push(`Invalid scheduler stage: ${state.scheduler.stage}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Create a clean state from legacy data
   * Migrates old fields to new schema
   */
  static migrate(legacyState) {
    const clean = JSON.parse(JSON.stringify(LEAD_STATE_SCHEMA)); // Deep clone

    // Copy identity
    clean.phoneNumber = legacyState.phone_number || legacyState.phoneNumber;
    clean.currentAgent = legacyState.current_agent || legacyState.currentAgent || 'sdr';
    clean.messageCount = legacyState.message_count || legacyState.messageCount || 0;

    // Migrate company profile
    if (legacyState.companyProfile) {
      clean.companyProfile = { ...legacyState.companyProfile };
    }

    // Migrate BANT stages (NEW: consolidate bant_data into bantStages)
    if (legacyState.bantStages || legacyState.bant_stages) {
      const source = legacyState.bantStages || legacyState.bant_stages;
      clean.bantStages.currentStage = source.currentStage || 'need';
      clean.bantStages.stageIndex = source.stageIndex || 0;
      clean.bantStages.isComplete = source.isComplete || false;
      clean.bantStages.stageData = source.stageData || clean.bantStages.stageData;
      clean.bantStages.conversationHistory = (source.conversationHistory || []).slice(-10); // Keep last 10
    }

    // Migrate old bant_data (DEPRECATED - merge into bantStages)
    if (legacyState.bant_data) {
      console.warn(` [STATE-MIGRATION] Found legacy bant_data for ${clean.phoneNumber} - migrating to bantStages`);
      // Legacy bant_data is discarded - bantStages is source of truth
    }

    // Migrate scheduler (NEW: standardize location)
    if (legacyState.scheduler) {
      clean.scheduler = { ...clean.scheduler, ...legacyState.scheduler };
    } else if (legacyState.metadata?.schedulerStage) {
      // Migrate from old metadata location
      clean.scheduler.stage = legacyState.metadata.schedulerStage;
      console.warn(` [STATE-MIGRATION] Migrated schedulerStage from metadata for ${clean.phoneNumber}`);
    }

    // Migrate metadata
    if (legacyState.metadata) {
      clean.metadata = {
        ...clean.metadata,
        ...legacyState.metadata,
        updatedAt: new Date().toISOString()
      };
    } else {
      clean.metadata.createdAt = new Date().toISOString();
      clean.metadata.updatedAt = new Date().toISOString();
    }

    // Set flags from legacy data
    if (legacyState.bantComplete !== undefined) {
      clean.metadata.bantComplete = legacyState.bantComplete;
    }

    return clean;
  }

  /**
   * Sanitize state for database storage
   * Ensures all nested objects are properly serialized
   */
  static sanitize(state) {
    return {
      phone_number: state.phoneNumber,
      current_agent: state.currentAgent,
      message_count: state.messageCount,

      // Serialize JSON fields
      company_profile: JSON.stringify(state.companyProfile),
      bant_stages: JSON.stringify(state.bantStages),
      scheduler: JSON.stringify(state.scheduler),
      metadata: JSON.stringify(state.metadata)
    };
  }

  /**
   * Deserialize state from database
   */
  static deserialize(dbRow) {
    if (!dbRow) return null;

    try {
      return {
        phoneNumber: dbRow.phone_number,
        currentAgent: dbRow.current_agent || 'sdr',
        messageCount: dbRow.message_count || 0,
        companyProfile: JSON.parse(dbRow.company_profile || '{"nome":null,"empresa":null,"setor":null}'),
        bantStages: JSON.parse(dbRow.bant_stages || JSON.stringify(LEAD_STATE_SCHEMA.bantStages)),
        scheduler: JSON.parse(dbRow.scheduler || JSON.stringify(LEAD_STATE_SCHEMA.scheduler)),
        metadata: JSON.parse(dbRow.metadata || '{}')
      };
    } catch (error) {
      console.error(` [STATE-DESERIALIZE] Error parsing state for ${dbRow.phone_number}:`, error.message);
      // Return clean state on parse error
      const clean = JSON.parse(JSON.stringify(LEAD_STATE_SCHEMA));
      clean.phoneNumber = dbRow.phone_number;
      return clean;
    }
  }
}

/**
 * HELPER: Get initial state for new lead
 */
export function createInitialState(phoneNumber) {
  const state = JSON.parse(JSON.stringify(LEAD_STATE_SCHEMA));
  state.phoneNumber = phoneNumber;
  state.metadata.createdAt = new Date().toISOString();
  state.metadata.updatedAt = new Date().toISOString();
  return state;
}

export default {
  LEAD_STATE_SCHEMA,
  StateValidator,
  createInitialState
};

/**
 * @file installer.js
 * @description Installer for follow-up automations
 * @module automation/followup/installer
 */

import { randomBytes } from 'crypto';
import { getDatabase } from '../../db/connection.js';
import { createLogger } from '../../utils/logger.enhanced.js';
import { ALL_STAGES } from './stages.js';

const logger = createLogger({ module: 'FollowupInstaller' });

/**
 * Generates a unique automation ID
 * @returns {string} Unique ID
 */
function generateId() {
  return `followup_${Date.now()}_${randomBytes(4).toString('hex')}`;
}

/**
 * Checks if a follow-up automation already exists by name pattern
 * @param {Object} db - Database instance
 * @param {string} name - Automation name to check
 * @returns {boolean} True if exists
 */
function automationExists(db, name) {
  const result = db.prepare(
    'SELECT COUNT(*) as count FROM automations WHERE name = ?'
  ).get(name);

  return result.count > 0;
}

/**
 * Installs a single follow-up stage automation
 * @param {Object} db - Database instance
 * @param {Object} stage - Stage definition
 * @param {Object} options - Installation options
 * @returns {Object} Installation result
 */
function installStage(db, stage, options = {}) {
  const { force = false } = options;

  // Check if already exists
  if (!force && automationExists(db, stage.name)) {
    return {
      success: false,
      skipped: true,
      name: stage.name,
      reason: 'Already exists'
    };
  }

  // Remove existing if force mode
  if (force) {
    db.prepare('DELETE FROM automations WHERE name = ?').run(stage.name);
  }

  const id = generateId();

  try {
    db.prepare(`
      INSERT INTO automations (
        id, name, description, trigger_config, conditions, actions, enabled, category, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, datetime('now'))
    `).run(
      id,
      stage.name,
      stage.description,
      JSON.stringify(stage.trigger),
      JSON.stringify(stage.conditions),
      JSON.stringify(stage.actions),
      stage.category
    );

    logger.info(`Installed follow-up stage: ${stage.name}`, { id });

    return {
      success: true,
      id,
      name: stage.name
    };
  } catch (error) {
    logger.error(`Failed to install stage: ${stage.name}`, { error: error.message });

    return {
      success: false,
      name: stage.name,
      error: error.message
    };
  }
}

/**
 * Installs all follow-up automations
 * @param {Object} options - Installation options
 * @param {boolean} options.force - Force reinstall existing automations
 * @returns {Object} Installation summary
 */
export function installAllFollowups(options = {}) {
  const db = getDatabase();
  const results = {
    installed: [],
    skipped: [],
    failed: [],
    total: ALL_STAGES.length
  };

  logger.info('Starting follow-up automations installation', {
    stages: ALL_STAGES.length,
    force: options.force || false
  });

  for (const stage of ALL_STAGES) {
    const result = installStage(db, stage, options);

    if (result.success) {
      results.installed.push(result);
    } else if (result.skipped) {
      results.skipped.push(result);
    } else {
      results.failed.push(result);
    }
  }

  const summary = {
    ...results,
    success: results.failed.length === 0,
    installedCount: results.installed.length,
    skippedCount: results.skipped.length,
    failedCount: results.failed.length
  };

  logger.info('Follow-up installation complete', {
    installed: summary.installedCount,
    skipped: summary.skippedCount,
    failed: summary.failedCount
  });

  return summary;
}

/**
 * Uninstalls all follow-up automations
 * @returns {Object} Uninstallation result
 */
export function uninstallAllFollowups() {
  const db = getDatabase();

  try {
    const result = db.prepare(
      "DELETE FROM automations WHERE category = 'follow_up'"
    ).run();

    logger.info('Uninstalled follow-up automations', { count: result.changes });

    return {
      success: true,
      removed: result.changes
    };
  } catch (error) {
    logger.error('Failed to uninstall follow-ups', { error: error.message });

    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Gets the status of follow-up automations
 * @returns {Object} Status information
 */
export function getFollowupStatus() {
  const db = getDatabase();

  try {
    const automations = db.prepare(`
      SELECT id, name, enabled, created_at,
        (SELECT COUNT(*) FROM automation_executions WHERE automation_id = automations.id) as executions
      FROM automations
      WHERE category = 'follow_up'
      ORDER BY created_at ASC
    `).all();

    const stats = {
      total: automations.length,
      enabled: automations.filter(a => a.enabled).length,
      disabled: automations.filter(a => !a.enabled).length,
      totalExecutions: automations.reduce((sum, a) => sum + a.executions, 0)
    };

    return {
      success: true,
      automations,
      stats
    };
  } catch (error) {
    logger.error('Failed to get follow-up status', { error: error.message });

    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Reinstalls all follow-up automations (removes and installs fresh)
 * @returns {Object} Reinstallation result
 */
export function reinstallFollowups() {
  logger.info('Reinstalling follow-up automations');

  const uninstallResult = uninstallAllFollowups();

  if (!uninstallResult.success) {
    return uninstallResult;
  }

  return installAllFollowups({ force: false });
}

export default {
  installAllFollowups,
  uninstallAllFollowups,
  getFollowupStatus,
  reinstallFollowups
};

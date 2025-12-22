/**
 * @file EntitlementService.js
 * @description Service for checking team entitlements and billing status
 *
 * Central gate for all billing/subscription checks.
 * Use this service to verify if a team can:
 * - Execute AI runtime (send messages via agent)
 * - Create new agents
 * - Use specific features
 */

import { getDatabase } from '../db/connection.js';
import { appendTenantColumns } from '../utils/tenantCompat.js';
import { ValidationError } from '../utils/errors/index.js';

export class EntitlementService {
  constructor(logger) {
    this.logger = logger || console;
  }

  /**
   * Get database connection
   */
  getDb() {
    return getDatabase();
  }

  /**
   * Get team entitlements
   * @param {string} tenantId - Team/tenant ID
   * @returns {Object} Entitlement status
   */
  getTeamEntitlements(tenantId) {
    const db = this.getDb();

    const team = db.prepare(`
      SELECT
        t.*,
        sp.name as plan_name,
        sp.max_agents as plan_max_agents,
        sp.max_messages_per_month as plan_max_messages,
        sp.max_integrations as plan_max_integrations,
        sp.features_json as plan_features
      FROM teams t
      LEFT JOIN subscription_plans sp ON sp.slug = CASE
        WHEN t.billing_status = 'trial' THEN 'trial'
        WHEN t.billing_status = 'paid' THEN COALESCE(t.billing_status, 'starter')
        ELSE 'trial'
      END
      WHERE t.id = ?
    `).get(tenantId);

    if (!team) {
      return {
        found: false,
        isRuntimeAllowed: false,
        reason: 'Team not found'
      };
    }

    const now = new Date();
    const trialEndsAt = team.trial_ends_at ? new Date(team.trial_ends_at) : null;
    const paidUntil = team.paid_until ? new Date(team.paid_until) : null;

    // Calculate days remaining
    let daysRemaining = 0;
    if (team.billing_status === 'trial' && trialEndsAt) {
      daysRemaining = Math.ceil((trialEndsAt - now) / (1000 * 60 * 60 * 24));
    } else if (team.billing_status === 'paid' && paidUntil) {
      daysRemaining = Math.ceil((paidUntil - now) / (1000 * 60 * 60 * 24));
    }

    // Determine if runtime is allowed
    let isRuntimeAllowed = false;
    let reason = '';

    switch (team.billing_status) {
      case 'paid':
        if (paidUntil && paidUntil > now) {
          isRuntimeAllowed = true;
          reason = 'Active paid subscription';
        } else {
          isRuntimeAllowed = false;
          reason = 'Subscription expired';
        }
        break;

      case 'trial':
        if (trialEndsAt && trialEndsAt > now) {
          isRuntimeAllowed = true;
          reason = 'Active trial';
        } else {
          isRuntimeAllowed = false;
          reason = 'Trial expired';
        }
        break;

      case 'trial_expired':
        isRuntimeAllowed = false;
        reason = 'Trial expired - upgrade required';
        break;

      case 'suspended':
        isRuntimeAllowed = false;
        reason = 'Account suspended';
        break;

      default:
        isRuntimeAllowed = false;
        reason = 'Unknown billing status';
    }

    // Check message limits
    const messagesUsed = team.messages_used_this_month || 0;
    const messagesLimit = team.plan_max_messages || team.max_messages_per_month || 1000;
    const messagesRemaining = Math.max(0, messagesLimit - messagesUsed);
    const isAtMessageLimit = messagesRemaining <= 0;

    if (isRuntimeAllowed && isAtMessageLimit) {
      isRuntimeAllowed = false;
      reason = 'Monthly message limit reached';
    }

    // Parse features
    let features = {};
    try {
      features = JSON.parse(team.plan_features || '{}');
    } catch (e) {
      features = {};
    }

    return {
      found: true,
      teamId: team.id,
      teamName: team.name,

      // Billing status
      billingStatus: team.billing_status,
      planName: team.plan_name || 'Trial',

      // Trial info
      trialStartedAt: team.trial_started_at,
      trialEndsAt: team.trial_ends_at,

      // Paid info
      paidUntil: team.paid_until,
      stripeCustomerId: team.stripe_customer_id,

      // Entitlements
      isRuntimeAllowed,
      reason,
      daysRemaining: Math.max(0, daysRemaining),

      // Limits
      maxAgents: team.plan_max_agents || team.max_agents || 1,
      maxMessagesPerMonth: messagesLimit,
      messagesUsed,
      messagesRemaining,
      isAtMessageLimit,

      // Features
      features,
      maxIntegrations: team.plan_max_integrations || 1
    };
  }

  /**
   * Assert that runtime is allowed (throws if not)
   * Use this in middleware/handlers before calling AI
   * @param {string} tenantId - Team/tenant ID
   * @throws {ValidationError} If runtime not allowed
   */
  assertRuntimeAllowed(tenantId) {
    const entitlements = this.getTeamEntitlements(tenantId);

    if (!entitlements.found) {
      throw new ValidationError('Team not found', {
        code: 'TEAM_NOT_FOUND',
        tenantId
      });
    }

    if (!entitlements.isRuntimeAllowed) {
      this.logger.warn('Runtime blocked', {
        tenantId,
        billingStatus: entitlements.billingStatus,
        reason: entitlements.reason
      });

      throw new ValidationError(entitlements.reason, {
        code: 'RUNTIME_NOT_ALLOWED',
        billingStatus: entitlements.billingStatus,
        daysRemaining: entitlements.daysRemaining,
        upgradeRequired: entitlements.billingStatus !== 'paid'
      });
    }

    return entitlements;
  }

  /**
   * Check if team can create more agents
   * @param {string} tenantId - Team/tenant ID
   * @returns {Object} { allowed: boolean, reason: string, current: number, max: number }
   */
  canCreateAgent(tenantId) {
    const db = this.getDb();
    const entitlements = this.getTeamEntitlements(tenantId);

    if (!entitlements.found) {
      return { allowed: false, reason: 'Team not found', current: 0, max: 0 };
    }

    // Count current agents
    const agentCount = db.prepare(`
      SELECT COUNT(*) as count FROM agents
      WHERE tenant_id = ? AND status != 'deleted'
    `).get(tenantId);

    const current = agentCount?.count || 0;
    const max = entitlements.maxAgents;

    if (current >= max) {
      return {
        allowed: false,
        reason: `Agent limit reached (${current}/${max})`,
        current,
        max,
        upgradeRequired: true
      };
    }

    return {
      allowed: true,
      reason: 'OK',
      current,
      max,
      remaining: max - current
    };
  }

  /**
   * Check if team can add more integrations
   * @param {string} tenantId - Team/tenant ID
   * @returns {Object} { allowed: boolean, reason: string }
   */
  canAddIntegration(tenantId) {
    const db = this.getDb();
    const entitlements = this.getTeamEntitlements(tenantId);

    if (!entitlements.found) {
      return { allowed: false, reason: 'Team not found' };
    }

    // Count current integrations
    const integrationCount = db.prepare(`
      SELECT COUNT(*) as count FROM integrations
      WHERE tenant_id = ? AND is_active = 1
    `).get(tenantId);

    const current = integrationCount?.count || 0;
    const max = entitlements.maxIntegrations;

    if (current >= max) {
      return {
        allowed: false,
        reason: `Integration limit reached (${current}/${max})`,
        current,
        max,
        upgradeRequired: true
      };
    }

    return {
      allowed: true,
      reason: 'OK',
      current,
      max,
      remaining: max - current
    };
  }

  /**
   * Increment message count for team
   * Call this after each AI message is processed
   * @param {string} tenantId - Team/tenant ID
   * @param {number} count - Number of messages to add (default 1)
   */
  incrementMessageCount(tenantId, count = 1) {
    const db = this.getDb();

    db.prepare(`
      UPDATE teams
      SET messages_used_this_month = COALESCE(messages_used_this_month, 0) + ?
      WHERE id = ?
    `).run(count, tenantId);

    // Also log to usage_metrics
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

    const usageId = `um_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const baseColumns = ['id', 'metric_type', 'count', 'period_start', 'period_end'];
    const baseValues = [usageId, 'messages_sent', count, periodStart, periodEnd];
    const { columns, values } = appendTenantColumns(db, 'usage_metrics', baseColumns, baseValues, tenantId);
    const placeholders = columns.map(() => '?').join(', ');

    db.prepare(`
      INSERT INTO usage_metrics (${columns.join(', ')})
      VALUES (${placeholders})
      ON CONFLICT(tenant_id, metric_type, period_start)
      DO UPDATE SET count = count + ?, updated_at = datetime('now')
    `).run(...values, count);
  }

  /**
   * Reset monthly message count (call from cron job)
   */
  resetMonthlyMessageCounts() {
    const db = this.getDb();

    db.prepare(`
      UPDATE teams SET messages_used_this_month = 0, billing_cycle_start = datetime('now')
    `).run();

    this.logger.info('Monthly message counts reset');
  }

  /**
   * Expire trials that have ended
   * Call from daily cron job
   * @returns {number} Number of trials expired
   */
  expireTrials() {
    const db = this.getDb();

    // Get teams to expire
    const teamsToExpire = db.prepare(`
      SELECT id, name FROM teams
      WHERE billing_status = 'trial'
      AND datetime(trial_ends_at) <= datetime('now')
    `).all();

    if (teamsToExpire.length === 0) {
      return 0;
    }

    // Update status
    const result = db.prepare(`
      UPDATE teams
      SET billing_status = 'trial_expired'
      WHERE billing_status = 'trial'
      AND datetime(trial_ends_at) <= datetime('now')
    `).run();

    // Pause agents for expired teams
    for (const team of teamsToExpire) {
      db.prepare(`
        UPDATE agents SET status = 'paused' WHERE tenant_id = ?
      `).run(team.id);

      // Log billing event
      const billingId = `be_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const baseColumns = ['id', 'event_type', 'description'];
      const baseValues = [billingId, 'trial_expired', `Trial expired for team ${team.name}`];
      const { columns, values } = appendTenantColumns(db, 'billing_events', baseColumns, baseValues, team.id);
      const placeholders = columns.map(() => '?').join(', ');

      db.prepare(`
        INSERT INTO billing_events (${columns.join(', ')})
        VALUES (${placeholders})
      `).run(...values);

      this.logger.info('Trial expired', { teamId: team.id, teamName: team.name });
    }

    return result.changes;
  }

  /**
   * Normalize email for anti-abuse
   * - Lowercase
   * - Remove Gmail +alias (user+alias@gmail.com -> user@gmail.com)
   * - Remove dots from Gmail local part (u.s.e.r@gmail.com -> user@gmail.com)
   * @param {string} email - Raw email
   * @returns {string} Normalized email
   */
  normalizeEmail(email) {
    if (!email) return email;

    let normalized = email.toLowerCase().trim();
    const [localPart, domain] = normalized.split('@');

    if (!domain) return normalized;

    // Gmail-specific normalization
    if (domain === 'gmail.com' || domain === 'googlemail.com') {
      // Remove everything after +
      let cleanLocal = localPart.split('+')[0];
      // Remove dots
      cleanLocal = cleanLocal.replace(/\./g, '');
      normalized = `${cleanLocal}@gmail.com`;
    } else {
      // Other domains: just remove +alias
      const cleanLocal = localPart.split('+')[0];
      normalized = `${cleanLocal}@${domain}`;
    }

    return normalized;
  }

  /**
   * Check if IP has exceeded trial grant limit
   * @param {string} ipAddress - IP address
   * @param {number} maxTrials - Max trials per IP (default 3)
   * @param {number} windowDays - Time window in days (default 7)
   * @returns {Object} { allowed: boolean, count: number, reason: string }
   */
  checkIPTrialLimit(ipAddress, maxTrials = 3, windowDays = 7) {
    if (!ipAddress) return { allowed: true, count: 0, reason: 'No IP' };

    const db = this.getDb();

    const count = db.prepare(`
      SELECT COUNT(*) as count FROM user_trial_grants
      WHERE ip_address = ?
      AND datetime(created_at) > datetime('now', '-' || ? || ' days')
    `).get(ipAddress, windowDays);

    const trialCount = count?.count || 0;

    if (trialCount >= maxTrials) {
      return {
        allowed: false,
        count: trialCount,
        reason: `IP ${ipAddress} já criou ${trialCount} trials nos últimos ${windowDays} dias`
      };
    }

    return { allowed: true, count: trialCount, reason: 'OK' };
  }

  /**
   * Check if user has already consumed their trial
   * Enhanced with normalized email and IP checking
   * @param {string} userId - User ID
   * @param {string} email - User email (fallback check)
   * @param {string} ipAddress - Optional IP for rate limiting
   * @returns {Object} { consumed: boolean, reason: string, ipLimitExceeded: boolean }
   */
  hasUserConsumedTrial(userId, email, ipAddress = null) {
    const db = this.getDb();
    const normalizedEmail = this.normalizeEmail(email);

    // Check by user ID or normalized email
    const grant = db.prepare(`
      SELECT * FROM user_trial_grants
      WHERE user_id = ? OR email = ? OR normalized_email = ?
    `).get(userId, email, normalizedEmail);

    if (grant) {
      return {
        consumed: true,
        reason: 'Trial já utilizado para este email',
        ipLimitExceeded: false
      };
    }

    // Check IP limit (signal, not hard block for existing)
    if (ipAddress) {
      const ipCheck = this.checkIPTrialLimit(ipAddress);
      if (!ipCheck.allowed) {
        return {
          consumed: true, // Treat as consumed to deny trial
          reason: ipCheck.reason,
          ipLimitExceeded: true
        };
      }
    }

    return { consumed: false, reason: 'OK', ipLimitExceeded: false };
  }

  /**
   * Record that user consumed their trial
   * @param {string} userId - User ID
   * @param {string} email - User email
   * @param {string} tenantId - Tenant ID that got the trial
   * @param {Object} metadata - Additional metadata (ip, user_agent)
   */
  recordTrialConsumption(userId, email, tenantId, metadata = {}) {
    const db = this.getDb();
    const normalizedEmail = this.normalizeEmail(email);

    const trialId = `utg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const baseColumns = ['id', 'user_id', 'email', 'normalized_email', 'ip_address', 'user_agent'];
    const baseValues = [
      trialId,
      userId,
      email,
      normalizedEmail,
      metadata.ipAddress || null,
      metadata.userAgent || null
    ];
    const { columns, values } = appendTenantColumns(db, 'user_trial_grants', baseColumns, baseValues, tenantId);
    const placeholders = columns.map(() => '?').join(', ');

    db.prepare(`
      INSERT OR IGNORE INTO user_trial_grants (${columns.join(', ')})
      VALUES (${placeholders})
    `).run(...values);

    this.logger.info('Trial consumption recorded', {
      userId,
      email,
      normalizedEmail,
      tenantId,
      ip: metadata.ipAddress
    });
  }

  /**
   * Start trial for a team
   * @param {string} teamId - Team ID
   * @param {number} days - Trial duration in days (default 7)
   */
  startTrial(teamId, days = 7) {
    const db = this.getDb();

    db.prepare(`
      UPDATE teams
      SET billing_status = 'trial',
          trial_started_at = datetime('now'),
          trial_ends_at = datetime('now', '+' || ? || ' days'),
          max_agents = 1,
          max_messages_per_month = 500
      WHERE id = ?
    `).run(days, teamId);

    // Log billing event
    const billingId = `be_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const baseColumns = ['id', 'event_type', 'description', 'metadata_json'];
    const baseValues = [billingId, 'trial_started', `Trial started for ${days} days`, JSON.stringify({ days })];
    const { columns, values } = appendTenantColumns(db, 'billing_events', baseColumns, baseValues, teamId);
    const placeholders = columns.map(() => '?').join(', ');

    db.prepare(`
      INSERT INTO billing_events (${columns.join(', ')})
      VALUES (${placeholders})
    `).run(...values);

    this.logger.info('Trial started', { teamId, days });
  }

  /**
   * Get trial expiration message for user
   * @param {string} tenantId - Team/tenant ID
   * @returns {string|null} Message to send to user, or null if not applicable
   */
  getTrialExpirationMessage(tenantId) {
    const entitlements = this.getTeamEntitlements(tenantId);

    if (!entitlements.found) return null;

    if (entitlements.billingStatus === 'trial_expired') {
      return 'Seu periodo de teste terminou. Para continuar usando o agente, faca o upgrade do seu plano em nosso painel. Obrigado por experimentar!';
    }

    if (entitlements.billingStatus === 'trial' && entitlements.daysRemaining <= 2) {
      return `Seu periodo de teste termina em ${entitlements.daysRemaining} dia(s). Considere fazer o upgrade para continuar usando todas as funcionalidades!`;
    }

    if (entitlements.isAtMessageLimit) {
      return 'Voce atingiu o limite de mensagens do seu plano. Faca o upgrade para continuar as conversas!';
    }

    return null;
  }
}

// Singleton instance
let entitlementServiceInstance = null;

export function getEntitlementService(logger) {
  if (!entitlementServiceInstance) {
    entitlementServiceInstance = new EntitlementService(logger);
  }
  return entitlementServiceInstance;
}

export default EntitlementService;

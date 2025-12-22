/**
 * @file AuthService.js
 * @description Authentication service with JWT tokens
 *
 * Includes trial management:
 * - New users get a team with 7-day trial
 * - Anti-abuse: trial only once per user email
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { getDatabase } from '../db/connection.js';
import { getEntitlementService } from './EntitlementService.js';
import { appendTenantColumns } from '../utils/tenantCompat.js';

// JWT Configuration - SECURITY: No fallback for JWT_SECRET
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// Validate JWT_SECRET at module load
if (!JWT_SECRET) {
  console.error('  CRITICAL: JWT_SECRET environment variable is not set!');
  console.error('   Add JWT_SECRET to your .env file before starting the server.');
  // In production, this should throw. For development, we warn but continue
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production environment');
  }
}

export class AuthService {
  constructor() {
    this.userModel = new User();
  }

  /**
   * Get database connection (uses singleton from connection.js)
   */
  getDb() {
    return getDatabase();
  }

  /**
   * Hash password
   */
  async hashPassword(password) {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  /**
   * Compare password with hash
   */
  async comparePassword(password, hash) {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate access token
   */
  generateAccessToken(user) {
    // P0-5: Use tenantId as canonical name in JWT
    const tenantId = user.tenant_id || 'default';

    return jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        tenantId: tenantId  // P0-5: Canonical name
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
  }

  /**
   * Generate refresh token
   */
  generateRefreshToken(user) {
    return jwt.sign(
      { userId: user.id, type: 'refresh' },
      JWT_SECRET,
      { expiresIn: JWT_REFRESH_EXPIRES_IN }
    );
  }

  /**
   * Verify access token
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return null;
    }
  }

  /**
   * Register new user
   *
   * TRIAL LOGIC:
   * - If user has NOT consumed trial: create team with 7-day trial
   * - If user HAS consumed trial: create team with trial_expired (requires payment)
   * - Anti-abuse: trial tracked by email, not just user ID
   */
  async register({
    email,
    password,
    name,
    role = 'sdr',
    tenantId = null,
    company = null,
    sector = null,
    ipAddress = null,
    userAgent = null
  }) {
    const db = this.getDb();
    const entitlementService = getEntitlementService();

    // Check if user already exists
    const existingUser = this.userModel.findByEmail(email);
    if (existingUser) {
      throw new Error('Email já cadastrado');
    }

    // Hash password
    const passwordHash = await this.hashPassword(password);

    // Check if user has already consumed trial (anti-abuse with normalized email + IP)
    const trialCheck = entitlementService.hasUserConsumedTrial(null, email, ipAddress);
    const hasConsumedTrial = trialCheck.consumed;

    // Log anti-abuse check result
    console.log('[AUTH] Trial check:', {
      email,
      ipAddress,
      consumed: hasConsumedTrial,
      reason: trialCheck.reason,
      ipLimitExceeded: trialCheck.ipLimitExceeded
    });

    // Create team for self-registered users (role = 'manager')
    const resolvedTenantId = tenantId;
    let finalTeamId = resolvedTenantId;
    let createdTeam = null;

    if (!resolvedTenantId && (role === 'manager' || !role)) {
      // Self-registration: create new team with trial (or trial_expired if already used)
      const newTeamId = `team_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const teamName = company ? `${company}` : `Equipe de ${name}`;

      if (hasConsumedTrial) {
        // User already used trial - create team as trial_expired
        db.prepare(`
          INSERT INTO teams (id, name, description, billing_status, trial_started_at, trial_ends_at, max_agents, max_messages_per_month)
          VALUES (?, ?, ?, 'trial_expired', datetime('now'), datetime('now'), 1, 0)
        `).run(newTeamId, teamName, `Equipe criada por ${email}`);

        console.log('[AUTH] User already consumed trial, team created as trial_expired:', { email, teamId: newTeamId });
      } else {
        // Fresh trial - 7 days
        db.prepare(`
          INSERT INTO teams (id, name, description, billing_status, trial_started_at, trial_ends_at, max_agents, max_messages_per_month)
          VALUES (?, ?, ?, 'trial', datetime('now'), datetime('now', '+7 days'), 1, 500)
        `).run(newTeamId, teamName, `Equipe criada por ${email}`);

        console.log('[AUTH] New team created with 7-day trial:', { email, teamId: newTeamId });
      }

      finalTeamId = newTeamId;
      createdTeam = { id: newTeamId, name: teamName };
    }

    // Create user with company and sector
    const user = this.userModel.create({
      email,
      password_hash: passwordHash,
      name,
      role: finalTeamId && !resolvedTenantId ? 'manager' : role, // Self-registered = manager
      tenant_id: finalTeamId,
      company,
      sector
    });

    // Record trial consumption if new trial was granted
    if (createdTeam && !hasConsumedTrial) {
      entitlementService.recordTrialConsumption(user.id, email, createdTeam.id, {
        ipAddress,
        userAgent
      });

      // Log billing event
      const billingId = `be_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const baseColumns = ['id', 'event_type', 'description', 'metadata_json'];
      const baseValues = [
        billingId,
        'trial_started',
        `Trial started for new user ${email}`,
        JSON.stringify({ userId: user.id, email, company, sector })
      ];
      const { columns, values } = appendTenantColumns(db, 'billing_events', baseColumns, baseValues, createdTeam.id);
      const placeholders = columns.map(() => '?').join(', ');

      db.prepare(`
        INSERT INTO billing_events (${columns.join(', ')})
        VALUES (${placeholders})
      `).run(...values);
    }

    // Add user to team (user_teams junction)
    if (finalTeamId) {
      try {
        const baseColumns = ['user_id', 'role'];
        const baseValues = [user.id, 'leader'];
        const { columns, values } = appendTenantColumns(db, 'user_teams', baseColumns, baseValues, finalTeamId);
        const placeholders = columns.map(() => '?').join(', ');
        db.prepare(`
          INSERT OR IGNORE INTO user_teams (${columns.join(', ')})
          VALUES (${placeholders})
        `).run(...values);
      } catch (e) {
        // Ignore if already exists
      }
    }

    // Generate tokens
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    // Create session (P3-4: tokens stored ONLY in sessions table, not users table)
    this.createSession(user.id, accessToken, refreshToken, { ipAddress, userAgent });

    // Log audit event
    this.logAuditEvent(user.id, 'login_success', { method: 'register', ipAddress, userAgent });

    // Get entitlements for response
    let entitlements = null;
    if (finalTeamId) {
      entitlements = entitlementService.getTeamEntitlements(finalTeamId);
    }

    return {
      user: this.sanitizeUser(user),
      accessToken,
      refreshToken,
      team: createdTeam,
      entitlements: entitlements ? {
        billingStatus: entitlements.billingStatus,
        trialEndsAt: entitlements.trialEndsAt,
        daysRemaining: entitlements.daysRemaining,
        isRuntimeAllowed: entitlements.isRuntimeAllowed,
        maxAgents: entitlements.maxAgents,
        maxMessagesPerMonth: entitlements.maxMessagesPerMonth
      } : null
    };
  }

  /**
   * Login user
   */
  async login({ email, password, deviceInfo = null, ipAddress = null, userAgent = null }) {
    // Find user
    const user = this.userModel.findByEmail(email);
    if (!user) {
      this.logAuditEvent(null, 'login_failed', { email, reason: 'user_not_found' });
      throw new Error('Credenciais inválidas');
    }

    // Check if user is active
    if (!user.is_active) {
      this.logAuditEvent(user.id, 'login_failed', { reason: 'account_inactive' });
      throw new Error('Conta desativada');
    }

    // Compare password
    const isValidPassword = await this.comparePassword(password, user.password_hash);
    if (!isValidPassword) {
      this.logAuditEvent(user.id, 'login_failed', { reason: 'invalid_password' });
      throw new Error('Credenciais inválidas');
    }

    // Generate tokens
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    // Update last login
    this.userModel.updateLastLogin(user.id);

    // Create session (P3-4: tokens stored ONLY in sessions table, not users table)
    this.createSession(user.id, accessToken, refreshToken, { deviceInfo, ipAddress, userAgent });

    // Log audit event
    this.logAuditEvent(user.id, 'login_success', { ipAddress, userAgent });

    return {
      user: this.sanitizeUser(user),
      accessToken,
      refreshToken
    };
  }

  /**
   * Logout user
   */
  logout(userId, token) {
    // Invalidate session
    this.invalidateSession(token);

    // Clear refresh token
    this.userModel.clearRefreshToken(userId);

    // Log audit event
    this.logAuditEvent(userId, 'logout');

    return true;
  }

  /**
   * Refresh access token
   * P3-4: Verify against sessions table only (not users table)
   * P3-5: Implements token rotation
   */
  async refreshAccessToken(refreshToken) {
    const db = this.getDb();

    // Verify refresh token JWT
    const decoded = this.verifyToken(refreshToken);
    if (!decoded || decoded.type !== 'refresh') {
      throw new Error('Token de refresh inválido');
    }

    // Find user
    const user = this.userModel.findById(decoded.userId);
    if (!user || !user.is_active) {
      throw new Error('Usuário não encontrado ou inativo');
    }

    // P3-4: Verify refresh token exists in sessions table (not users table)
    const session = db.prepare(`
      SELECT id, refresh_token FROM sessions
      WHERE user_id = ?
        AND refresh_token = ?
        AND is_valid = 1
        AND datetime(refresh_expires_at) > datetime('now')
    `).get(decoded.userId, refreshToken);

    if (!session) {
      // Token not found or expired - potential token reuse attack
      this.logAuditEvent(decoded.userId, 'token_refresh_failed', { reason: 'invalid_session' });
      throw new Error('Token de refresh inválido');
    }

    // Generate new tokens (P3-5: rotation)
    const newAccessToken = this.generateAccessToken(user);
    const newRefreshToken = this.generateRefreshToken(user);

    // P3-5: Rotate refresh token in session
    const newRefreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    db.prepare(`
      UPDATE sessions SET
        token = ?,
        refresh_token = ?,
        refresh_expires_at = ?,
        last_used_at = datetime('now')
      WHERE id = ?
    `).run(newAccessToken, newRefreshToken, newRefreshExpiresAt, session.id);

    // Log audit event
    this.logAuditEvent(user.id, 'token_refresh');

    return {
      user: this.sanitizeUser(user),
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    };
  }

  /**
   * Change password
   */
  async changePassword(userId, currentPassword, newPassword) {
    const user = this.userModel.findById(userId);
    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    // Verify current password
    const isValidPassword = await this.comparePassword(currentPassword, user.password_hash);
    if (!isValidPassword) {
      throw new Error('Senha atual incorreta');
    }

    // Hash new password
    const newPasswordHash = await this.hashPassword(newPassword);

    // Update password
    this.userModel.changePassword(userId, newPasswordHash);

    // Invalidate all sessions (force re-login)
    this.invalidateAllUserSessions(userId);

    // Log audit event
    this.logAuditEvent(userId, 'password_changed');

    return true;
  }

  /**
   * Get current user from token
   */
  getCurrentUser(token) {
    const decoded = this.verifyToken(token);
    if (!decoded) {
      return null;
    }

    const user = this.userModel.findByIdWithTeam(decoded.userId);
    return user ? this.sanitizeUser(user) : null;
  }

  /**
   * Create session record
   */
  createSession(userId, token, refreshToken, { deviceInfo = null, ipAddress = null, userAgent = null } = {}) {
    const db = this.getDb();
    // Calculate expiration (24h for access token)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const stmt = db.prepare(`
      INSERT INTO sessions (id, user_id, token, refresh_token, device_info, ip_address, user_agent, expires_at, refresh_expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      token,
      refreshToken,
      deviceInfo,
      ipAddress,
      userAgent,
      expiresAt,
      refreshExpiresAt
    );
  }

  /**
   * Invalidate session by token
   */
  invalidateSession(token) {
    const db = this.getDb();
    const stmt = db.prepare('UPDATE sessions SET is_valid = 0 WHERE token = ?');
    stmt.run(token);
  }

  /**
   * Invalidate all user sessions
   */
  invalidateAllUserSessions(userId) {
    const db = this.getDb();
    const stmt = db.prepare('UPDATE sessions SET is_valid = 0 WHERE user_id = ?');
    stmt.run(userId);
  }

  /**
   * Check if session is valid
   */
  isSessionValid(token) {
    const db = this.getDb();
    const stmt = db.prepare(`
      SELECT * FROM sessions
      WHERE token = ?
        AND is_valid = 1
        AND datetime(expires_at) > datetime('now')
    `);
    return !!stmt.get(token);
  }

  /**
   * Log audit event
   */
  logAuditEvent(userId, eventType, details = {}) {
    const db = this.getDb();
    try {
      const stmt = db.prepare(`
        INSERT INTO auth_audit_log (id, user_id, event_type, ip_address, user_agent, details)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        eventType,
        details.ipAddress || null,
        details.userAgent || null,
        JSON.stringify(details)
      );
    } catch (error) {
      console.warn('[AUTH] Failed to write audit log (non-blocking):', error.message);
    }
  }

  /**
   * Get user's active sessions
   */
  getUserSessions(userId) {
    const db = this.getDb();
    const stmt = db.prepare(`
      SELECT id, device_info, ip_address, user_agent, created_at, last_used_at, expires_at
      FROM sessions
      WHERE user_id = ?
        AND is_valid = 1
        AND datetime(expires_at) > datetime('now')
      ORDER BY last_used_at DESC
    `);
    return stmt.all(userId);
  }

  /**
   * Remove sensitive data from user object
   */
  sanitizeUser(user) {
    const { password_hash, refresh_token, ...sanitized } = user;
    return sanitized;
  }

  /**
   * Clean expired sessions
   */
  cleanExpiredSessions() {
    const db = this.getDb();
    const stmt = db.prepare(`
      DELETE FROM sessions
      WHERE datetime(expires_at) < datetime('now')
         OR is_valid = 0
    `);
    return stmt.run().changes;
  }
}

export default AuthService;

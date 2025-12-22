/**
 * @file User.js
 * @description User model for authentication and team management
 */

import { BaseModel } from './BaseModel.js';
import { getTenantColumnForTable } from '../utils/tenantCompat.js';

export class User extends BaseModel {
  constructor() {
    super('users');
  }

  /**
   * Find user by email
   */
  findByEmail(email) {
    const db = this.getDb();
    try {
      const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
      return stmt.get(email);
    } catch (error) {
      throw error;
    }
    // NOTE: Não fechar db.close() - conexão singleton deve permanecer aberta
  }

  /**
   * Find user by refresh token
   */
  findByRefreshToken(refreshToken) {
    const db = this.getDb();
    try {
      const stmt = db.prepare('SELECT * FROM users WHERE refresh_token = ?');
      return stmt.get(refreshToken);
    } catch (error) {
      throw error;
    }
    // NOTE: Não fechar db.close() - conexão singleton deve permanecer aberta
  }

  /**
   * Find all active users
   */
  findActive({ limit = 100, offset = 0 } = {}) {
    return this.findAll({
      where: { is_active: 1 },
      limit,
      offset
    });
  }

  /**
   * Find users by role
   */
  findByRole(role, { limit = 100, offset = 0 } = {}) {
    return this.findAll({
      where: { role, is_active: 1 },
      limit,
      offset
    });
  }

  /**
   * Find users by team
   */
  findByTeam(teamId, { limit = 100, offset = 0 } = {}) {
    const db = this.getDb();
    try {
      const tenantColumn = getTenantColumnForTable('user_teams', db) || 'tenant_id';
      const stmt = db.prepare(`
        SELECT u.*, ut.role as team_role
        FROM users u
        JOIN user_teams ut ON u.id = ut.user_id
        WHERE ut.${tenantColumn} = ? AND u.is_active = 1
        ORDER BY u.name ASC
        LIMIT ? OFFSET ?
      `);
      return stmt.all(teamId, limit, offset);
    } catch (error) {
      throw error;
    }
    // NOTE: Não fechar db.close() - conexão singleton deve permanecer aberta
  }

  /**
   * Search users
   */
  search(searchTerm, options = {}) {
    const fields = ['name', 'email'];
    return super.search(searchTerm, fields, options);
  }

  /**
   * Update last login timestamp
   */
  updateLastLogin(userId) {
    const db = this.getDb();
    try {
      const stmt = db.prepare(`
        UPDATE users SET last_login = datetime('now') WHERE id = ?
      `);
      stmt.run(userId);
    } catch (error) {
      throw error;
    }
    // NOTE: Não fechar db.close() - conexão singleton deve permanecer aberta
  }

  /**
   * Update refresh token
   */
  updateRefreshToken(userId, refreshToken) {
    return this.update(userId, { refresh_token: refreshToken });
  }

  /**
   * Clear refresh token (logout)
   */
  clearRefreshToken(userId) {
    return this.update(userId, { refresh_token: null });
  }

  /**
   * Change password
   */
  changePassword(userId, newPasswordHash) {
    return this.update(userId, { password_hash: newPasswordHash });
  }

  /**
   * Deactivate user
   */
  deactivate(userId) {
    return this.update(userId, { is_active: 0, refresh_token: null });
  }

  /**
   * Activate user
   */
  activate(userId) {
    return this.update(userId, { is_active: 1 });
  }

  /**
   * Get user with team info
   */
  findByIdWithTeam(userId) {
    const db = this.getDb();
    try {
      const user = this.findById(userId);
      if (!user) return null;

      const tenantColumn = getTenantColumnForTable('user_teams', db) || 'tenant_id';
      const teamsStmt = db.prepare(`
        SELECT t.*, ut.role as member_role
        FROM teams t
        JOIN user_teams ut ON t.id = ut.${tenantColumn}
        WHERE ut.user_id = ?
      `);
      const teams = teamsStmt.all(userId);

      return { ...user, teams };
    } catch (error) {
      throw error;
    }
    // NOTE: Não fechar db.close() - conexão singleton deve permanecer aberta
  }

  /**
   * Get user statistics (for SDR performance)
   */
  getPerformanceStats(userId, { startDate, endDate } = {}) {
    const db = this.getDb();
    try {
      let dateFilter = '';
      const params = [userId];

      if (startDate && endDate) {
        dateFilter = 'AND created_at BETWEEN ? AND ?';
        params.push(startDate, endDate);
      }

      // Leads created
      const leadsStmt = db.prepare(`
        SELECT COUNT(*) as total FROM leads
        WHERE owner_id = ? ${dateFilter}
      `);

      // Opportunities created
      const oppsStmt = db.prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'ganha' THEN 1 ELSE 0 END) as won,
          SUM(CASE WHEN status = 'perdida' THEN 1 ELSE 0 END) as lost,
          SUM(CASE WHEN status = 'ganha' THEN valor ELSE 0 END) as total_value
        FROM opportunities
        WHERE owner_id = ? ${dateFilter}
      `);

      // Activities completed
      const activitiesStmt = db.prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN tipo = 'call' THEN 1 ELSE 0 END) as calls,
          SUM(CASE WHEN tipo = 'meeting' THEN 1 ELSE 0 END) as meetings,
          SUM(CASE WHEN tipo = 'email' THEN 1 ELSE 0 END) as emails
        FROM activities
        WHERE owner_id = ? AND status = 'completed' ${dateFilter}
      `);

      const leads = leadsStmt.get(...params);
      const opportunities = oppsStmt.get(...params);
      const activities = activitiesStmt.get(...params);

      return {
        leads: leads?.total || 0,
        opportunities: {
          total: opportunities?.total || 0,
          won: opportunities?.won || 0,
          lost: opportunities?.lost || 0,
          totalValue: opportunities?.total_value || 0,
          winRate: opportunities?.total > 0
            ? ((opportunities.won / opportunities.total) * 100).toFixed(1)
            : 0
        },
        activities: {
          total: activities?.total || 0,
          calls: activities?.calls || 0,
          meetings: activities?.meetings || 0,
          emails: activities?.emails || 0
        }
      };
    } catch (error) {
      throw error;
    }
    // NOTE: Não fechar db.close() - conexão singleton deve permanecer aberta
  }

  /**
   * Get all users stats for leaderboard
   */
  getLeaderboard({ startDate, endDate, limit = 10 } = {}) {
    const db = this.getDb();
    try {
      let dateFilter = '';
      const params = [];

      if (startDate && endDate) {
        dateFilter = 'AND o.created_at BETWEEN ? AND ?';
        params.push(startDate, endDate);
      }

      const stmt = db.prepare(`
        SELECT
          u.id,
          u.name,
          u.email,
          u.avatar_url,
          u.role,
          COUNT(DISTINCT o.id) as total_opportunities,
          SUM(CASE WHEN o.status = 'ganha' THEN 1 ELSE 0 END) as won_deals,
          SUM(CASE WHEN o.status = 'ganha' THEN o.valor ELSE 0 END) as total_revenue,
          ROUND(
            CAST(SUM(CASE WHEN o.status = 'ganha' THEN 1 ELSE 0 END) AS FLOAT) /
            NULLIF(COUNT(CASE WHEN o.status IN ('ganha', 'perdida') THEN 1 END), 0) * 100,
            1
          ) as win_rate
        FROM users u
        LEFT JOIN opportunities o ON u.id = o.owner_id ${dateFilter}
        WHERE u.is_active = 1 AND u.role IN ('sdr', 'manager')
        GROUP BY u.id
        ORDER BY total_revenue DESC
        LIMIT ?
      `);

      params.push(limit);
      return stmt.all(...params);
    } catch (error) {
      throw error;
    }
    // NOTE: Não fechar db.close() - conexão singleton deve permanecer aberta
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return `usr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create user with defaults
   * Note: Override to use generated TEXT id instead of lastInsertRowid
   */
  create(data) {
    const db = this.getDb();
    const userData = {
      id: this.generateId(),
      role: 'sdr',
      is_active: 1,
      preferences: '{}',
      ...data
    };

    const columns = Object.keys(userData).join(', ');
    const placeholders = Object.keys(userData).map(() => '?').join(', ');
    const values = Object.values(userData);

    const stmt = db.prepare(`INSERT INTO users (${columns}) VALUES (${placeholders})`);
    stmt.run(...values);

    // Return by the TEXT id we generated, not lastInsertRowid
    return this.findById(userData.id);
  }
}

export default User;

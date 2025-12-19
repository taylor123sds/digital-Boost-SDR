/**
 * @file Team.js
 * @description Team model for sales team management
 */

import { BaseModel } from './BaseModel.js';
import { getTenantColumnForTable } from '../utils/tenantCompat.js';

function getUserTeamsColumns(db) {
  const info = db.prepare('PRAGMA table_info(user_teams)').all();
  const hasTenantId = info.some(col => col.name === 'tenant_id');
  const hasTeamId = info.some(col => col.name === 'team_id');
  const tenantColumn = getTenantColumnForTable('user_teams', db) || (hasTenantId ? 'tenant_id' : 'team_id');

  return { tenantColumn, hasTenantId, hasTeamId };
}

export class Team extends BaseModel {
  constructor() {
    super('teams');
  }

  /**
   * Find all active teams
   */
  findActive({ limit = 100, offset = 0 } = {}) {
    return this.findAll({
      where: { is_active: 1 },
      limit,
      offset,
      orderBy: 'name ASC'
    });
  }

  /**
   * Find teams managed by a user
   */
  findByManager(managerId) {
    return this.findAll({
      where: { manager_id: managerId, is_active: 1 }
    });
  }

  /**
   * Get team with members
   */
  findByIdWithMembers(teamId) {
    const db = this.getDb();
    try {
      const team = this.findById(teamId);
      if (!team) return null;

      const { tenantColumn } = getUserTeamsColumns(db);
      // Get team members
      const membersStmt = db.prepare(`
        SELECT u.*, ut.role as team_role, ut.joined_at
        FROM users u
        JOIN user_teams ut ON u.id = ut.user_id
        WHERE ut.${tenantColumn} = ? AND u.is_active = 1
        ORDER BY ut.role DESC, u.name ASC
      `);
      const members = membersStmt.all(teamId);

      // Get manager info
      let manager = null;
      if (team.manager_id) {
        const managerStmt = db.prepare('SELECT id, name, email, avatar_url FROM users WHERE id = ?');
        manager = managerStmt.get(team.manager_id);
      }

      return {
        ...team,
        manager,
        members,
        memberCount: members.length
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Add member to team
   */
  addMember(teamId, userId, role = 'member') {
    const db = this.getDb();
    try {
      const { hasTenantId, hasTeamId } = getUserTeamsColumns(db);

      if (hasTenantId && hasTeamId) {
        const stmt = db.prepare(`
          INSERT OR REPLACE INTO user_teams (user_id, tenant_id, team_id, role, joined_at)
          VALUES (?, ?, ?, ?, datetime('now'))
        `);
        stmt.run(userId, teamId, teamId, role);
      } else {
        const tenantColumn = getTenantColumnForTable('user_teams', db) || 'team_id';
        const stmt = db.prepare(`
          INSERT OR REPLACE INTO user_teams (user_id, ${tenantColumn}, role, joined_at)
          VALUES (?, ?, ?, datetime('now'))
        `);
        stmt.run(userId, teamId, role);
      }
      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Remove member from team
   */
  removeMember(teamId, userId) {
    const db = this.getDb();
    try {
      const { hasTenantId, hasTeamId } = getUserTeamsColumns(db);
      const sql = hasTenantId && hasTeamId
        ? 'DELETE FROM user_teams WHERE (tenant_id = ? OR team_id = ?) AND user_id = ?'
        : `DELETE FROM user_teams WHERE ${getTenantColumnForTable('user_teams', db) || 'team_id'} = ? AND user_id = ?`;
      const result = hasTenantId && hasTeamId
        ? db.prepare(sql).run(teamId, teamId, userId)
        : db.prepare(sql).run(teamId, userId);
      return result.changes > 0;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update member role in team
   */
  updateMemberRole(teamId, userId, newRole) {
    const db = this.getDb();
    try {
      const { hasTenantId, hasTeamId } = getUserTeamsColumns(db);
      const sql = hasTenantId && hasTeamId
        ? 'UPDATE user_teams SET role = ? WHERE (tenant_id = ? OR team_id = ?) AND user_id = ?'
        : `UPDATE user_teams SET role = ? WHERE ${getTenantColumnForTable('user_teams', db) || 'team_id'} = ? AND user_id = ?`;
      const result = hasTenantId && hasTeamId
        ? db.prepare(sql).run(newRole, teamId, teamId, userId)
        : db.prepare(sql).run(newRole, teamId, userId);
      return result.changes > 0;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get team performance stats
   */
  getPerformanceStats(teamId, { startDate, endDate } = {}) {
    const db = this.getDb();
    try {
      let dateFilter = '';
      const params = [teamId];

      if (startDate && endDate) {
        dateFilter = 'AND o.created_at BETWEEN ? AND ?';
        params.push(startDate, endDate);
      }

      // Get team members IDs
      const { tenantColumn } = getUserTeamsColumns(db);
      const membersStmt = db.prepare(`
        SELECT user_id FROM user_teams WHERE ${tenantColumn} = ?
      `);
      const members = membersStmt.all(teamId);
      const memberIds = members.map(m => m.user_id);

      if (memberIds.length === 0) {
        return {
          totalRevenue: 0,
          totalDeals: 0,
          wonDeals: 0,
          lostDeals: 0,
          winRate: 0,
          avgDealSize: 0,
          quotaProgress: 0
        };
      }

      const placeholders = memberIds.map(() => '?').join(',');

      // Pipeline stats
      const statsStmt = db.prepare(`
        SELECT
          COUNT(*) as total_deals,
          SUM(CASE WHEN status = 'ganha' THEN 1 ELSE 0 END) as won_deals,
          SUM(CASE WHEN status = 'perdida' THEN 1 ELSE 0 END) as lost_deals,
          SUM(CASE WHEN status = 'ganha' THEN valor ELSE 0 END) as total_revenue,
          AVG(CASE WHEN status = 'ganha' THEN valor ELSE NULL END) as avg_deal_size
        FROM opportunities o
        WHERE o.owner_id IN (${placeholders}) ${dateFilter}
      `);

      const stats = statsStmt.get(...memberIds, ...(dateFilter ? params.slice(1) : []));

      // Get team quota
      const team = this.findById(teamId);
      const quotaProgress = team.quota_monthly > 0
        ? ((stats.total_revenue || 0) / team.quota_monthly * 100).toFixed(1)
        : 0;

      return {
        totalRevenue: stats?.total_revenue || 0,
        totalDeals: stats?.total_deals || 0,
        wonDeals: stats?.won_deals || 0,
        lostDeals: stats?.lost_deals || 0,
        winRate: stats?.total_deals > 0
          ? ((stats.won_deals / (stats.won_deals + stats.lost_deals)) * 100).toFixed(1)
          : 0,
        avgDealSize: stats?.avg_deal_size || 0,
        quotaMonthly: team.quota_monthly,
        quotaProgress: parseFloat(quotaProgress)
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all teams with summary stats
   */
  getAllWithStats() {
    const db = this.getDb();
    try {
      const { tenantColumn } = getUserTeamsColumns(db);
      const stmt = db.prepare(`
        SELECT
          t.*,
          COUNT(DISTINCT ut.user_id) as member_count,
          u.name as manager_name,
          COALESCE(SUM(CASE WHEN o.status = 'ganha' THEN o.valor ELSE 0 END), 0) as total_revenue,
          COUNT(DISTINCT CASE WHEN o.status = 'aberta' THEN o.id END) as open_deals
        FROM teams t
        LEFT JOIN user_teams ut ON t.id = ut.${tenantColumn}
        LEFT JOIN users u ON t.manager_id = u.id
        LEFT JOIN opportunities o ON o.owner_id IN (
          SELECT user_id FROM user_teams WHERE ${tenantColumn} = t.id
        )
        WHERE t.is_active = 1
        GROUP BY t.id
        ORDER BY t.name ASC
      `);
      return stmt.all();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return `team_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create team with defaults
   */
  create(data) {
    const teamData = {
      id: this.generateId(),
      is_active: 1,
      quota_monthly: 0,
      quota_quarterly: 0,
      color: '#18c5ff',
      ...data
    };
    return super.create(teamData);
  }
}

export default Team;

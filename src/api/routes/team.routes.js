/**
 * @file team.routes.js
 * @description Team and User Management API routes
 */

import express from 'express';
import { User } from '../../models/User.js';
import { Team } from '../../models/Team.js';
import { AuthService } from '../../services/AuthService.js';
import { authenticate, requireManager, requireAdmin } from '../../middleware/auth.middleware.js';

const router = express.Router();
const userModel = new User();
const teamModel = new Team();
const authService = new AuthService();

// =====================
// USER ROUTES
// =====================

/**
 * GET /api/team/users
 * List all users
 */
router.get('/api/team/users', (req, res) => {
  try {
    const { page = 1, limit = 50, role, active, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let users;
    if (search) {
      users = userModel.search(search, { limit: parseInt(limit), offset });
    } else {
      const where = {};
      if (role) where.role = role;
      if (active !== undefined) where.is_active = active === 'true' ? 1 : 0;

      users = userModel.findAll({ where, limit: parseInt(limit), offset, orderBy: 'name ASC' });
    }

    // Remove sensitive data
    users = users.map(u => {
      const { password_hash, refresh_token, ...user } = u;
      return user;
    });

    const total = userModel.count({ where: active !== undefined ? { is_active: active === 'true' ? 1 : 0 } : {} });

    res.json({
      success: true,
      data: users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/team/users/:id
 * Get single user with team info
 */
router.get('/api/team/users/:id', (req, res) => {
  try {
    const user = userModel.findByIdWithTeam(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuário não encontrado'
      });
    }

    // Remove sensitive data
    const { password_hash, refresh_token, ...userData } = user;

    res.json({
      success: true,
      data: userData
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/team/users
 * Create new user
 * P0-5: Accepts both tenant_id (canonical) and team_id (legacy)
 */
router.post('/api/team/users', async (req, res) => {
  try {
    // P0-5: Accept both tenant_id and team_id
    const { email, password, name, role, tenant_id, team_id } = req.body;
    const tenantId = tenant_id || team_id;

    // Validation
    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        error: 'Email, senha e nome são obrigatórios'
      });
    }

    // Check if email already exists
    const existing = userModel.findByEmail(email);
    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'Email já cadastrado'
      });
    }

    // Hash password
    const passwordHash = await authService.hashPassword(password);

    // Create user
    // P0-5: Use tenantId (from tenant_id or team_id)
    const user = userModel.create({
      email,
      password_hash: passwordHash,
      name,
      role: role || 'sdr',
      tenant_id: tenantId,
      team_id: tenantId
    });

    // Add to team if specified
    if (tenantId) {
      teamModel.addMember(tenantId, user.id);
    }

    // Remove sensitive data
    const { password_hash: _, refresh_token, ...userData } = user;

    res.status(201).json({
      success: true,
      data: userData
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/team/users/:id
 * Update user
 */
router.put('/api/team/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { password, ...updates } = req.body;

    const existing = userModel.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Usuário não encontrado'
      });
    }

    // Hash new password if provided
    if (password) {
      updates.password_hash = await authService.hashPassword(password);
    }

    const user = userModel.update(id, updates);

    // Remove sensitive data
    const { password_hash, refresh_token, ...userData } = user;

    res.json({
      success: true,
      data: userData
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/team/users/:id
 * Deactivate user
 */
router.delete('/api/team/users/:id', (req, res) => {
  try {
    const user = userModel.deactivate(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuário não encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Usuário desativado com sucesso'
    });
  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/team/users/:id/performance
 * Get user performance stats
 */
router.get('/api/team/users/:id/performance', (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const stats = userModel.getPerformanceStats(req.params.id, { startDate, endDate });

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get user performance error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/team/leaderboard
 * Get user rankings
 */
router.get('/api/team/leaderboard', (req, res) => {
  try {
    const { startDate, endDate, limit = 10 } = req.query;

    const leaderboard = userModel.getLeaderboard({
      startDate,
      endDate,
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      data: leaderboard
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =====================
// TEAM ROUTES
// =====================

/**
 * GET /api/teams (alias for /api/team/teams)
 * List all teams - compatibility route for dashboard
 */
router.get('/api/teams', (req, res) => {
  try {
    const { withStats } = req.query;

    let teams;
    if (withStats === 'true') {
      teams = teamModel.getAllWithStats();
    } else {
      teams = teamModel.findActive();
    }

    res.json(teams);
  } catch (error) {
    console.error('Get teams error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/team/teams
 * List all teams
 */
router.get('/api/team/teams', (req, res) => {
  try {
    const { withStats } = req.query;

    let teams;
    if (withStats === 'true') {
      teams = teamModel.getAllWithStats();
    } else {
      teams = teamModel.findActive();
    }

    res.json({
      success: true,
      data: teams
    });
  } catch (error) {
    console.error('Get teams error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/team/teams/:id
 * Get team with members
 */
router.get('/api/team/teams/:id', (req, res) => {
  try {
    const team = teamModel.findByIdWithMembers(req.params.id);

    if (!team) {
      return res.status(404).json({
        success: false,
        error: 'Time não encontrado'
      });
    }

    res.json({
      success: true,
      data: team
    });
  } catch (error) {
    console.error('Get team error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/team/teams
 * Create new team
 */
router.post('/api/team/teams', (req, res) => {
  try {
    const { name, description, manager_id, quota_monthly, quota_quarterly, color } = req.body;

    // Validation
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Nome é obrigatório'
      });
    }

    const team = teamModel.create({
      name,
      description,
      manager_id,
      quota_monthly: quota_monthly || 0,
      quota_quarterly: quota_quarterly || 0,
      color: color || '#18c5ff'
    });

    res.status(201).json({
      success: true,
      data: team
    });
  } catch (error) {
    console.error('Create team error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/team/teams/:id
 * Update team
 */
router.put('/api/team/teams/:id', (req, res) => {
  try {
    const { id } = req.params;

    const existing = teamModel.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Time não encontrado'
      });
    }

    const team = teamModel.update(id, req.body);

    res.json({
      success: true,
      data: team
    });
  } catch (error) {
    console.error('Update team error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/team/teams/:id
 * Delete team
 */
router.delete('/api/team/teams/:id', (req, res) => {
  try {
    const success = teamModel.delete(req.params.id);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Time não encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Time excluído com sucesso'
    });
  } catch (error) {
    console.error('Delete team error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/team/teams/:id/members
 * Add member to team
 */
router.post('/api/team/teams/:id/members', (req, res) => {
  try {
    const { user_id, role } = req.body;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        error: 'ID do usuário é obrigatório'
      });
    }

    teamModel.addMember(req.params.id, user_id, role || 'member');

    res.json({
      success: true,
      message: 'Membro adicionado com sucesso'
    });
  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/team/teams/:id/members/:userId
 * Remove member from team
 */
router.delete('/api/team/teams/:id/members/:userId', (req, res) => {
  try {
    const success = teamModel.removeMember(req.params.id, req.params.userId);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Membro não encontrado no time'
      });
    }

    res.json({
      success: true,
      message: 'Membro removido com sucesso'
    });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/team/teams/:id/performance
 * Get team performance stats
 */
router.get('/api/team/teams/:id/performance', (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const stats = teamModel.getPerformanceStats(req.params.id, { startDate, endDate });

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get team performance error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

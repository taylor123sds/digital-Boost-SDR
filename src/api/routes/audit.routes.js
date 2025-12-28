/**
 * @file audit.routes.js
 * @description Audit log endpoints (auth_audit_log)
 */

import express from 'express';
import { getDatabase } from '../../db/index.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireTenant, tenantContext } from '../../middleware/tenant.middleware.js';
import { extractTenantId, getTenantColumnForTable } from '../../utils/tenantCompat.js';
import { defaultLogger } from '../../utils/logger.enhanced.js';

const router = express.Router();
const logger = defaultLogger.child({ module: 'AuditRoutes' });

function safeParseJson(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function buildTenantFilter(db, tenantId) {
  const usersTenantColumn = getTenantColumnForTable('users', db);
  if (!usersTenantColumn) {
    return { clause: '', params: [] };
  }

  return { clause: `AND u.${usersTenantColumn} = ?`, params: [tenantId] };
}

/**
 * GET /api/audit-logs
 * Query params: limit, offset, status, category, q, from, to
 */
router.get('/api/audit-logs', authenticate, tenantContext, requireTenant, (req, res) => {
  const db = getDatabase();
  try {
    const {
      limit = 50,
      offset = 0,
      status,
      category,
      q,
      from,
      to
    } = req.query;
    const tenantId = extractTenantId(req);

    const tenantFilter = buildTenantFilter(db, tenantId);
    const filters = [];
    const params = [];

    if (category && category !== 'all') {
      filters.push(`? = 'auth'`);
      params.push(category);
    }

    if (status && status !== 'all') {
      filters.push(`
        CASE
          WHEN aal.event_type IN ('login_failed', 'account_locked') THEN 'failure'
          WHEN aal.event_type IN ('account_unlocked') THEN 'warning'
          ELSE 'success'
        END = ?
      `);
      params.push(status);
    }

    if (q) {
      filters.push(`(aal.event_type LIKE ? OR u.name LIKE ? OR u.email LIKE ?)`);
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }

    if (from) {
      filters.push(`datetime(aal.created_at) >= datetime(?)`);
      params.push(from);
    }

    if (to) {
      filters.push(`datetime(aal.created_at) <= datetime(?)`);
      params.push(to);
    }

    const whereClause = filters.length ? `AND ${filters.join(' AND ')}` : '';

    const totalRow = db.prepare(`
      SELECT COUNT(*) AS total
      FROM auth_audit_log aal
      LEFT JOIN users u ON u.id = aal.user_id
      WHERE 1=1
        ${tenantFilter.clause}
        ${whereClause}
    `).get(
      ...tenantFilter.params,
      ...params
    );

    const rows = db.prepare(`
      SELECT
        aal.id,
        aal.event_type,
        aal.ip_address,
        aal.details,
        aal.created_at,
        u.id AS user_id,
        u.name AS user_name,
        u.email AS user_email
      FROM auth_audit_log aal
      LEFT JOIN users u ON u.id = aal.user_id
      WHERE 1=1
        ${tenantFilter.clause}
        ${whereClause}
      ORDER BY datetime(aal.created_at) DESC
      LIMIT ? OFFSET ?
    `).all(
      ...tenantFilter.params,
      ...params,
      Number(limit),
      Number(offset)
    );

    const data = rows.map(row => {
      const statusValue = row.event_type === 'login_failed' || row.event_type === 'account_locked'
        ? 'failure'
        : row.event_type === 'account_unlocked'
          ? 'warning'
          : 'success';

      return {
        id: row.id,
        timestamp: row.created_at,
        action: row.event_type,
        category: 'auth',
        actor: {
          type: 'user',
          id: row.user_id || 'unknown',
          name: row.user_name || row.user_email || 'Usuario'
        },
        target: null,
        details: safeParseJson(row.details) || {},
        ip: row.ip_address || null,
        status: statusValue
      };
    });

    res.json({
      success: true,
      data,
      meta: {
        total: totalRow?.total || 0,
        limit: Number(limit),
        offset: Number(offset)
      }
    });
  } catch (error) {
    logger.error('Failed to list audit logs', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to list audit logs' });
  }
});

export default router;

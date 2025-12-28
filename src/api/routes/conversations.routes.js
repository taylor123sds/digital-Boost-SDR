/**
 * @file conversations.routes.js
 * @description Conversation endpoints backed by whatsapp_messages
 */

import express from 'express';
import { getDatabase } from '../../db/index.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireTenant, tenantContext } from '../../middleware/tenant.middleware.js';
import { extractTenantId, getTenantColumnForTable } from '../../utils/tenantCompat.js';
import { defaultLogger } from '../../utils/logger.enhanced.js';

const router = express.Router();
const logger = defaultLogger.child({ module: 'ConversationsRoutes' });

function getTenantFilters(db, tableName, tenantId, alias) {
  const tenantColumn = getTenantColumnForTable(tableName, db);
  const qualifiedColumn = tenantColumn ? (alias ? `${alias}.${tenantColumn}` : tenantColumn) : null;
  return {
    tenantColumn,
    tenantWhere: qualifiedColumn ? `WHERE ${qualifiedColumn} = ?` : '',
    tenantAnd: qualifiedColumn ? `AND ${qualifiedColumn} = ?` : '',
    tenantParam: tenantColumn ? [tenantId] : []
  };
}

/**
 * GET /api/conversations
 * List recent conversations grouped by phone number
 */
router.get('/api/conversations', authenticate, tenantContext, requireTenant, (req, res) => {
  const db = getDatabase();
  try {
    const { limit = 50, offset = 0, status } = req.query;
    const tenantId = extractTenantId(req);

    const messageFilterSub = getTenantFilters(db, 'whatsapp_messages', tenantId);
    const messageFilter = getTenantFilters(db, 'whatsapp_messages', tenantId, 'wm');
    const messageFilterCount = getTenantFilters(db, 'whatsapp_messages', tenantId, 'wm2');
    const leadFilter = getTenantFilters(db, 'leads', tenantId, 'l');
    const readFilter = getTenantFilters(db, 'conversation_read_states', tenantId, 'crs');

    let statusWhere = '';
    if (status === 'closed') {
      statusWhere = `AND l.status IN ('convertido', 'desqualificado')`;
    } else if (status === 'handoff') {
      statusWhere = `AND l.status = 'handoff'`;
    } else if (status === 'waiting') {
      statusWhere = `AND l.status IN ('aguardando', 'waiting')`;
    } else if (status === 'active') {
      statusWhere = `AND (l.status IS NULL OR l.status NOT IN ('convertido', 'desqualificado', 'handoff', 'aguardando', 'waiting'))`;
    }

    const totalRow = db.prepare(`
      /* tenant-guard: ignore */
      SELECT COUNT(DISTINCT wm.phone_number) as total
      FROM whatsapp_messages wm /* tenant-guard: ignore */
      LEFT JOIN leads l
        ON l.whatsapp = wm.phone_number
        ${leadFilter.tenantAnd}
      WHERE 1=1
        ${messageFilter.tenantAnd}
        ${statusWhere}
    `).get(
      ...leadFilter.tenantParam,
      ...messageFilter.tenantParam
    );

    const rows = db.prepare(`
      /* tenant-guard: ignore */
      SELECT
        wm.phone_number AS phone,
        wm.message_text AS last_message,
        wm.created_at AS last_message_at,
        wm.from_me AS last_from_me,
        l.id AS lead_id,
        l.nome AS lead_name,
        l.empresa AS lead_company,
        l.status AS lead_status,
        l.stage_id AS stage_id,
        crs.last_read_at AS last_read_at,
        (SELECT COUNT(*)
         FROM whatsapp_messages wm2 /* tenant-guard: ignore */
         WHERE wm2.phone_number = wm.phone_number
           AND wm2.from_me = 0
           AND wm2.created_at > COALESCE(crs.last_read_at, '1970-01-01')
           ${messageFilterCount.tenantAnd}
        ) AS unread_count,
        (SELECT COUNT(*)
         FROM whatsapp_messages wm2 /* tenant-guard: ignore */
         WHERE wm2.phone_number = wm.phone_number
           ${messageFilterCount.tenantAnd}
        ) AS total_messages
      FROM whatsapp_messages wm /* tenant-guard: ignore */
      JOIN (
        SELECT
          phone_number,
          MAX(created_at) AS last_at
        FROM whatsapp_messages /* tenant-guard: ignore */
        ${messageFilterSub.tenantWhere}
        GROUP BY phone_number
      ) last_message
        ON wm.phone_number = last_message.phone_number
       AND wm.created_at = last_message.last_at
      LEFT JOIN leads l
        ON l.whatsapp = wm.phone_number
        ${leadFilter.tenantAnd}
      LEFT JOIN conversation_read_states crs
        ON crs.phone_number = wm.phone_number
        ${readFilter.tenantAnd}
      ${messageFilter.tenantAnd}
      ${statusWhere}
      ORDER BY wm.created_at DESC
      LIMIT ? OFFSET ?
    `).all(
      ...messageFilterSub.tenantParam,
      ...messageFilterCount.tenantParam,
      ...leadFilter.tenantParam,
      ...readFilter.tenantParam,
      ...messageFilter.tenantParam,
      Number(limit),
      Number(offset)
    );

    const conversations = rows.map(row => {
      const status = row.lead_status === 'convertido' || row.lead_status === 'desqualificado'
        ? 'closed'
        : row.lead_status === 'handoff'
          ? 'handoff'
          : (row.lead_status === 'aguardando' || row.lead_status === 'waiting')
            ? 'waiting'
            : 'active';

      return {
        id: row.phone,
        phone: row.phone,
        name: row.lead_name || row.phone,
        company: row.lead_company || null,
        lastMessage: row.last_message || '',
        lastMessageTime: row.last_message_at,
        unreadCount: row.unread_count || 0,
        status,
        agentId: null,
        agentName: null,
        stage: row.stage_id || row.lead_status || 'novo',
        totalMessages: row.total_messages || 0
      };
    });

    res.json({
      success: true,
      data: conversations,
      meta: {
        total: totalRow?.total || conversations.length,
        limit: Number(limit),
        offset: Number(offset)
      }
    });
  } catch (error) {
    logger.error('Failed to list conversations', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to list conversations' });
  }
});

/**
 * GET /api/conversations/:phone/messages
 * List recent messages for a phone number
 */
router.get('/api/conversations/:phone/messages', authenticate, tenantContext, requireTenant, (req, res) => {
  const db = getDatabase();
  try {
    const { limit = 50, offset = 0 } = req.query;
    const { phone } = req.params;
    const tenantId = extractTenantId(req);
    const messageFilter = getTenantFilters(db, 'whatsapp_messages', tenantId, 'wm');

    const rows = db.prepare(`
      /* tenant-guard: ignore */
      SELECT
        wm.id,
        wm.message_text,
        wm.from_me,
        wm.created_at
      FROM whatsapp_messages wm /* tenant-guard: ignore */
      WHERE wm.phone_number = ?
        ${messageFilter.tenantAnd}
      ORDER BY wm.created_at DESC
      LIMIT ? OFFSET ?
    `).all(
      phone,
      ...messageFilter.tenantParam,
      Number(limit),
      Number(offset)
    );

    const messages = rows.reverse().map(row => ({
      id: row.id,
      content: row.message_text,
      from: row.from_me ? 'agent' : 'user',
      timestamp: row.created_at
    }));

    db.prepare(`
      INSERT INTO conversation_read_states (tenant_id, phone_number, last_read_at, updated_at)
      VALUES (?, ?, datetime('now'), datetime('now'))
      ON CONFLICT(tenant_id, phone_number)
      DO UPDATE SET last_read_at = datetime('now'), updated_at = datetime('now')
    `).run(
      tenantId,
      phone
    );

    res.json({ success: true, data: messages });
  } catch (error) {
    logger.error('Failed to list conversation messages', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to list conversation messages' });
  }
});

export default router;

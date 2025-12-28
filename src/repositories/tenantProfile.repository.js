/**
 * @file tenantProfile.repository.js
 * @description Tenant profile repository for project configuration
 */

import { getDatabase } from '../db/connection.js';
import { defaultLogger } from '../utils/logger.enhanced.js';

const logger = defaultLogger.child({ module: 'TenantProfileRepository' });

export class TenantProfileRepository {
  getByTenant(tenantId) {
    const db = getDatabase();
    const record = db.prepare(
      `SELECT * FROM tenant_profiles WHERE tenant_id = ?`
    ).get(tenantId);

    if (!record) return null;

    return {
      id: record.id,
      tenantId: record.tenant_id,
      profile: JSON.parse(record.profile_json || '{}'),
      integrations: JSON.parse(record.integrations_json || '[]'),
      createdAt: record.created_at,
      updatedAt: record.updated_at
    };
  }

  upsert(tenantId, profile = {}, integrations = []) {
    const db = getDatabase();
    const now = new Date().toISOString();
    const existing = db.prepare(
      `SELECT id FROM tenant_profiles WHERE tenant_id = ?`
    ).get(tenantId);

    const payload = {
      profile_json: JSON.stringify(profile || {}),
      integrations_json: JSON.stringify(integrations || []),
      updated_at: now
    };

    if (existing) {
      db.prepare(
        `UPDATE tenant_profiles
         SET profile_json = ?, integrations_json = ?, updated_at = ?
         WHERE tenant_id = ?`
      ).run(payload.profile_json, payload.integrations_json, payload.updated_at, tenantId);
      logger.info('Tenant profile updated', { tenantId });
      return this.getByTenant(tenantId);
    }

    db.prepare(
      `INSERT INTO tenant_profiles (tenant_id, profile_json, integrations_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`
    ).run(tenantId, payload.profile_json, payload.integrations_json, now, now);

    logger.info('Tenant profile created', { tenantId });
    return this.getByTenant(tenantId);
  }
}

export const tenantProfileRepository = new TenantProfileRepository();

import crypto from 'crypto';
import { getDatabase } from '../db/connection.js';

const ENCRYPTION_KEY = process.env.INTEGRATION_ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
  throw new Error('INTEGRATION_ENCRYPTION_KEY is required for Google Calendar token encryption');
}

export class GoogleCalendarTokenService {
  constructor(logger = console) {
    this.logger = logger;
  }

  getDb() {
    return getDatabase();
  }

  generateId(prefix = 'gcal') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  encryptTokens(tokens) {
    try {
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
      const jsonString = JSON.stringify(tokens);
      let encrypted = cipher.update(jsonString, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const authTag = cipher.getAuthTag();
      return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch (error) {
      this.logger.error('Google Calendar token encryption failed', { error: error.message });
      throw new Error('Failed to encrypt Google Calendar tokens');
    }
  }

  decryptTokens(encryptedString) {
    try {
      const [ivHex, authTagHex, encrypted] = encryptedString.split(':');
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
      decipher.setAuthTag(authTag);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return JSON.parse(decrypted);
    } catch (error) {
      this.logger.error('Google Calendar token decryption failed', { error: error.message });
      throw new Error('Failed to decrypt Google Calendar tokens');
    }
  }

  normalizeScope({ tenantId, integrationId, accountEmail }) {
    if (!tenantId) {
      throw new Error('tenantId is required for Google Calendar tokens');
    }

    return {
      tenantId,
      integrationId: integrationId || '',
      accountEmail: accountEmail || null
    };
  }

  storeTokens({ tenantId, integrationId, accountEmail, tokens, scopes }) {
    const db = this.getDb();
    const scope = this.normalizeScope({ tenantId, integrationId, accountEmail });
    const encrypted = this.encryptTokens(tokens);
    const expiresAt = tokens.expires_at || tokens.expiry_date || null;

    const id = this.generateId('gcal_token');
    const stmt = db.prepare(`
      INSERT INTO google_calendar_tokens (
        id, tenant_id, provider, integration_id, account_email,
        tokens_encrypted, token_expires_at, token_scopes
      ) VALUES (?, ?, 'google_calendar', ?, ?, ?, ?, ?)
      ON CONFLICT(tenant_id, provider, integration_id, account_email)
      DO UPDATE SET
        tokens_encrypted = excluded.tokens_encrypted,
        token_expires_at = excluded.token_expires_at,
        token_scopes = excluded.token_scopes,
        updated_at = datetime('now')
    `);

    stmt.run(
      id,
      scope.tenantId,
      scope.integrationId,
      scope.accountEmail,
      encrypted,
      expiresAt,
      scopes || tokens.scope || null
    );

    this.logger.info('Google Calendar tokens stored', {
      tenantId: scope.tenantId,
      integrationId: scope.integrationId,
      accountEmail: scope.accountEmail
    });

    return { stored: true };
  }

  getTokens({ tenantId, integrationId, accountEmail }) {
    const db = this.getDb();
    const scope = this.normalizeScope({ tenantId, integrationId, accountEmail });

    const params = [scope.tenantId, scope.integrationId];
    let query = `
      SELECT tokens_encrypted, token_expires_at, token_scopes
      FROM google_calendar_tokens
      WHERE tenant_id = ?
        AND provider = 'google_calendar'
        AND integration_id = ?
    `;

    if (scope.accountEmail) {
      query += ' AND account_email = ?';
      params.push(scope.accountEmail);
    }

    query += ' ORDER BY updated_at DESC LIMIT 1';

    const row = db.prepare(query).get(...params);
    if (!row?.tokens_encrypted) {
      return null;
    }

    const tokens = this.decryptTokens(row.tokens_encrypted);

    return {
      tokens,
      scopes: row.token_scopes || null,
      expiresAt: row.token_expires_at || null
    };
  }
}

let calendarTokenServiceInstance = null;

export function getGoogleCalendarTokenService(logger) {
  if (!calendarTokenServiceInstance) {
    calendarTokenServiceInstance = new GoogleCalendarTokenService(logger);
  }
  return calendarTokenServiceInstance;
}

export default GoogleCalendarTokenService;

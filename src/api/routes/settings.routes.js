/**
 * @file settings.routes.js
 * @description User settings endpoints (profile + preferences)
 */

import express from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { tenantContext } from '../../middleware/tenant.middleware.js';
import { User } from '../../models/User.js';
import { defaultLogger } from '../../utils/logger.enhanced.js';

const router = express.Router();
const logger = defaultLogger.child({ module: 'SettingsRoutes' });
const userModel = new User();

function parsePreferences(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/**
 * GET /api/settings
 * Returns current user profile + preferences
 */
router.get('/api/settings', authenticate, tenantContext, (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Usuário não autenticado' });
    }

    const user = userModel.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Usuário não encontrado' });
    }

    const preferences = parsePreferences(user.preferences);
    const profile = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      company: user.company || '',
      sector: user.sector || '',
      avatarUrl: user.avatar_url || ''
    };

    res.json({
      success: true,
      data: {
        profile,
        preferences: {
          phone: preferences.phone || '',
          title: preferences.title || '',
          website: preferences.website || '',
          cnpj: preferences.cnpj || '',
          notifications: preferences.notifications || {
            leads: true,
            messages: true,
            campaigns: false,
            reports: false
          },
          appearance: preferences.appearance || {
            theme: 'dark'
          },
          apiKeys: preferences.apiKeys || []
        }
      }
    });
  } catch (error) {
    logger.error('Failed to load settings', { error: error.message });
    res.status(500).json({ success: false, error: 'Erro ao carregar configuracoes' });
  }
});

/**
 * PUT /api/settings
 * Update current user profile + preferences
 */
router.put('/api/settings', authenticate, tenantContext, (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Usuário não autenticado' });
    }

    const user = userModel.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Usuário não encontrado' });
    }

    const { profile = {}, preferences = {} } = req.body || {};
    const currentPrefs = parsePreferences(user.preferences);

    const updatedPreferences = {
      ...currentPrefs,
      phone: preferences.phone ?? currentPrefs.phone,
      title: preferences.title ?? currentPrefs.title,
      website: preferences.website ?? currentPrefs.website,
      cnpj: preferences.cnpj ?? currentPrefs.cnpj,
      notifications: preferences.notifications ?? currentPrefs.notifications,
      appearance: preferences.appearance ?? currentPrefs.appearance,
      apiKeys: preferences.apiKeys ?? currentPrefs.apiKeys
    };

    const updates = {
      name: profile.name ?? user.name,
      email: profile.email ?? user.email,
      company: profile.company ?? user.company,
      sector: profile.sector ?? user.sector,
      avatar_url: profile.avatarUrl ?? user.avatar_url,
      preferences: JSON.stringify(updatedPreferences)
    };

    const updated = userModel.update(userId, updates);

    res.json({
      success: true,
      data: {
        profile: {
          id: updated.id,
          name: updated.name,
          email: updated.email,
          role: updated.role,
          company: updated.company || '',
          sector: updated.sector || '',
          avatarUrl: updated.avatar_url || ''
        },
        preferences: updatedPreferences
      }
    });
  } catch (error) {
    logger.error('Failed to update settings', { error: error.message });
    res.status(500).json({ success: false, error: 'Erro ao salvar configuracoes' });
  }
});

export default router;

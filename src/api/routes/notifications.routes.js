/**
 * @file notifications.routes.js
 * @description Notifications API routes
 */

import express from 'express';
import { Notification } from '../../models/Notification.js';
import { authenticate, optionalAuth } from '../../middleware/auth.middleware.js';

const router = express.Router();
const notificationModel = new Notification();

/**
 * GET /api/notifications
 * Get user notifications
 */
router.get('/api/notifications', optionalAuth, (req, res) => {
  try {
    const { page = 1, limit = 50, unread } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const userId = req.user?.id || 'default';

    const notifications = notificationModel.findByUser(userId, {
      limit: parseInt(limit),
      offset,
      unreadOnly: unread === 'true'
    });

    res.json({
      success: true,
      data: notifications
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/notifications/unread-count
 * Get unread notification count (for polling)
 */
router.get('/api/notifications/unread-count', optionalAuth, (req, res) => {
  try {
    const userId = req.user?.id || 'default';

    const count = notificationModel.getUnreadCount(userId);
    const byPriority = notificationModel.getUnreadCountByPriority(userId);

    res.json({
      success: true,
      data: {
        count,
        byPriority
      }
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/notifications/:id
 * Get single notification
 */
router.get('/api/notifications/:id', (req, res) => {
  try {
    const notification = notificationModel.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notificação não encontrada'
      });
    }

    res.json({
      success: true,
      data: notification
    });
  } catch (error) {
    console.error('Get notification error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/notifications
 * Create new notification
 */
router.post('/api/notifications', (req, res) => {
  try {
    const { user_id, type, title, message, priority, entity_type, entity_id, action_url } = req.body;

    // Validation
    if (!type || !title) {
      return res.status(400).json({
        success: false,
        error: 'Tipo e título são obrigatórios'
      });
    }

    const notification = notificationModel.create({
      user_id: user_id || 'default',
      type,
      title,
      message,
      priority: priority || 'normal',
      entity_type,
      entity_id,
      action_url
    });

    res.status(201).json({
      success: true,
      data: notification
    });
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/notifications/broadcast
 * Send notification to multiple users
 */
router.post('/api/notifications/broadcast', (req, res) => {
  try {
    const { user_ids, type, title, message, priority, entity_type, entity_id, action_url } = req.body;

    // Validation
    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Lista de usuários é obrigatória'
      });
    }

    if (!type || !title) {
      return res.status(400).json({
        success: false,
        error: 'Tipo e título são obrigatórios'
      });
    }

    const notificationIds = notificationModel.createForUsers(user_ids, {
      type,
      title,
      message,
      priority,
      entity_type,
      entity_id,
      action_url
    });

    res.status(201).json({
      success: true,
      data: {
        count: notificationIds.length,
        ids: notificationIds
      }
    });
  } catch (error) {
    console.error('Broadcast notification error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/notifications/:id/read
 * Mark notification as read
 */
router.put('/api/notifications/:id/read', (req, res) => {
  try {
    const notification = notificationModel.markAsRead(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notificação não encontrada'
      });
    }

    res.json({
      success: true,
      data: notification
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/notifications/read-all
 * Mark all notifications as read
 */
router.put('/api/notifications/read-all', optionalAuth, (req, res) => {
  try {
    const userId = req.user?.id || 'default';
    const count = notificationModel.markAllAsRead(userId);

    res.json({
      success: true,
      data: {
        markedAsRead: count
      }
    });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/notifications/:id
 * Delete notification
 */
router.delete('/api/notifications/:id', (req, res) => {
  try {
    const success = notificationModel.delete(req.params.id);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Notificação não encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Notificação excluída com sucesso'
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/notifications/old
 * Cleanup old notifications
 */
router.delete('/api/notifications/old', (req, res) => {
  try {
    const { days = 30 } = req.query;
    const count = notificationModel.deleteOld(parseInt(days));

    res.json({
      success: true,
      data: {
        deleted: count
      }
    });
  } catch (error) {
    console.error('Delete old notifications error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/notifications/preferences
 * Get user notification preferences
 */
router.get('/api/notifications/preferences', optionalAuth, (req, res) => {
  try {
    const userId = req.user?.id || 'default';
    const preferences = notificationModel.getPreferences(userId);

    res.json({
      success: true,
      data: preferences
    });
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/notifications/preferences
 * Update user notification preferences
 */
router.put('/api/notifications/preferences', optionalAuth, (req, res) => {
  try {
    const userId = req.user?.id || 'default';
    const preferences = notificationModel.updatePreferences(userId, req.body);

    res.json({
      success: true,
      data: preferences
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

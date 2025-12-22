/**
 * @file auth.middleware.js
 * @description Authentication middleware for protecting routes
 */

import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { extractTenantId } from '../utils/tenantCompat.js';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET not configured. Set environment variable before starting the server.');
}

/**
 * Authenticate JWT token
 *
 * P0-5: Sets req.tenantId from JWT tenantId (canonical)
 * This is the canonical tenant identifier used throughout the app
 */
export function authenticate(req, res, next) {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Token de acesso não fornecido'
      });
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    // P0-5: tenantId is canonical
    const tenantId = decoded.tenantId;

    // Attach user info to request
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      tenantId: tenantId  // P0-5: Canonical name
    };

    // P0-5: Set tenantId directly from JWT (canonical tenant identifier)
    // This replaces the need for tenantContext middleware in most cases
    req.tenantId = tenantId || decoded.userId || 'default';

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expirado',
        code: 'TOKEN_EXPIRED'
      });
    }

    return res.status(401).json({
      success: false,
      error: 'Token inválido'
    });
  }
}

/**
 * Optional authentication - doesn't fail if no token
 * P0-5: Also sets req.tenantId when authenticated
 */
export function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);

      // P0-5: tenantId is canonical
      const tenantId = decoded.tenantId;

      req.user = {
        id: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        tenantId: tenantId  // P0-5: Canonical name
      };

      // P0-5: Set tenantId when authenticated
      req.tenantId = tenantId || decoded.userId || 'default';
    } else {
      // For anonymous requests, use default tenant
      req.tenantId = 'default';
    }

    next();
  } catch {
    // Continue without user, use default tenant
    req.tenantId = 'default';
    next();
  }
}

/**
 * Check if user has required role
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Autenticação necessária'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Permissão negada'
      });
    }

    next();
  };
}

/**
 * Check if user is admin
 */
export function requireAdmin(req, res, next) {
  return requireRole('admin')(req, res, next);
}

/**
 * Check if user is manager or admin
 */
export function requireManager(req, res, next) {
  return requireRole('admin', 'manager')(req, res, next);
}

/**
 * Check if user owns the resource or is admin
 */
export function requireOwnerOrAdmin(ownerIdField = 'owner_id') {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Autenticação necessária'
      });
    }

    // Admin can access anything
    if (req.user.role === 'admin') {
      return next();
    }

    // Check if user owns the resource
    const resourceOwnerId = req.body[ownerIdField] || req.params[ownerIdField];

    if (resourceOwnerId === req.user.id) {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: 'Permissão negada'
    });
  };
}

/**
 * Check if user is in the same tenant/team
 */
export function requireSameTeam(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Autenticação necessária'
    });
  }

  // Admin can access anything
  if (req.user.role === 'admin') {
    return next();
  }

  // P0-5: Canonical tenant_id only
  const resourceTenantId = extractTenantId(req);
  const userTenantId = req.user.tenantId;

  if (!userTenantId || userTenantId !== resourceTenantId) {
    return res.status(403).json({
      success: false,
      error: 'Acesso restrito ao seu time'
    });
  }

  next();
}

/**
 * Load full user data into request
 */
export async function loadFullUser(req, res, next) {
  if (!req.user || !req.user.id) {
    return next();
  }

  try {
    const userModel = new User();
    const fullUser = userModel.findByIdWithTeam(req.user.id);

    if (fullUser) {
      req.fullUser = fullUser;
    }

    next();
  } catch (error) {
    console.error('Error loading full user:', error);
    next();
  }
}

export default {
  authenticate,
  optionalAuth,
  requireRole,
  requireAdmin,
  requireManager,
  requireOwnerOrAdmin,
  requireSameTeam,
  loadFullUser
};

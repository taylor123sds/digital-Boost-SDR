/**
 * @file auth.routes.js
 * @description Authentication API routes
 *
 * Includes trial/billing status in responses
 */

import express from 'express';
import { AuthService } from '../../services/AuthService.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { getEntitlementService } from '../../services/EntitlementService.js';

const router = express.Router();
const authService = new AuthService();

// ═══════════════════════════════════════════════════════════════════════════
// SECURITY: Rate limiting for registration (prevent abuse)
// ═══════════════════════════════════════════════════════════════════════════

const registrationRateLimitStore = new Map();
const REGISTRATION_WINDOW = 3600000; // 1 hour
const MAX_REGISTRATIONS_PER_IP = 5; // 5 registrations per hour per IP

function registrationRateLimit(req, res, next) {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  const now = Date.now();

  if (!registrationRateLimitStore.has(ip)) {
    registrationRateLimitStore.set(ip, { count: 1, resetAt: now + REGISTRATION_WINDOW });
    return next();
  }

  const limit = registrationRateLimitStore.get(ip);

  // Reset window if expired
  if (now > limit.resetAt) {
    limit.count = 1;
    limit.resetAt = now + REGISTRATION_WINDOW;
    return next();
  }

  limit.count++;

  if (limit.count > MAX_REGISTRATIONS_PER_IP) {
    console.warn('[AUTH] Registration rate limit exceeded for IP:', ip);
    return res.status(429).json({
      success: false,
      error: 'Muitas tentativas de registro. Tente novamente em 1 hora.',
      retryAfter: Math.ceil((limit.resetAt - now) / 1000)
    });
  }

  next();
}

// Clean up old rate limit entries every 15 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of registrationRateLimitStore.entries()) {
    if (now > value.resetAt + REGISTRATION_WINDOW) {
      registrationRateLimitStore.delete(key);
    }
  }
}, 900000);

// ═══════════════════════════════════════════════════════════════════════════
// SECURITY: Input sanitization for registration
// ═══════════════════════════════════════════════════════════════════════════

function sanitizeRegistrationInput(req, res, next) {
  const sanitize = (str) => {
    if (typeof str !== 'string') return str;
    return str
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/javascript:/gi, '') // Remove JS protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim()
      .substring(0, 255); // Limit length
  };

  if (req.body) {
    for (const key of Object.keys(req.body)) {
      // Prevent prototype pollution
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        delete req.body[key];
        continue;
      }
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitize(req.body[key]);
      }
    }
  }

  next();
}

// Valid business sectors (matches AgentConfigSchema)
const VALID_SECTORS = [
  'energia_solar', 'saas', 'consultoria', 'ecommerce', 'varejo',
  'educacao', 'imobiliario', 'financeiro', 'saude', 'industria',
  'servicos', 'tecnologia', 'marketing', 'outro'
];

/**
 * POST /api/auth/register
 * Public registration for new users
 * SECURITY: Rate limited, input sanitized, validation enforced
 */
router.post('/api/auth/register', registrationRateLimit, sanitizeRegistrationInput, async (req, res) => {
  try {
    const { email, password, name, company, sector } = req.body;

    // ═══════════════════════════════════════════════════════════════════════
    // SECURITY: Comprehensive validation
    // ═══════════════════════════════════════════════════════════════════════

    // Required fields
    if (!email || !password || !name || !company) {
      return res.status(400).json({
        success: false,
        error: 'Email, senha, nome e empresa sao obrigatorios'
      });
    }

    // Email validation (strict format)
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Email invalido'
      });
    }

    // Block disposable email domains (common ones)
    const disposableDomains = ['tempmail.com', 'throwaway.com', 'guerrillamail.com', '10minutemail.com', 'mailinator.com', 'yopmail.com'];
    const emailDomain = email.split('@')[1]?.toLowerCase();
    if (disposableDomains.includes(emailDomain)) {
      return res.status(400).json({
        success: false,
        error: 'Email temporario nao permitido'
      });
    }

    // Password validation (min 8 chars, at least 1 uppercase, 1 lowercase, 1 number)
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Senha deve ter pelo menos 8 caracteres'
      });
    }

    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
      return res.status(400).json({
        success: false,
        error: 'Senha deve conter pelo menos uma letra maiuscula, uma minuscula e um numero'
      });
    }

    // Name validation (2-100 chars, no special chars except spaces and hyphens)
    if (name.length < 2 || name.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Nome deve ter entre 2 e 100 caracteres'
      });
    }

    if (!/^[a-zA-ZÀ-ÿ\s'-]+$/.test(name)) {
      return res.status(400).json({
        success: false,
        error: 'Nome contem caracteres invalidos'
      });
    }

    // Company validation (2-100 chars)
    if (company.length < 2 || company.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Nome da empresa deve ter entre 2 e 100 caracteres'
      });
    }

    // Sector validation (if provided)
    if (sector && !VALID_SECTORS.includes(sector)) {
      return res.status(400).json({
        success: false,
        error: 'Setor invalido',
        validSectors: VALID_SECTORS
      });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Create user (new users are 'manager' role by default for self-registration)
    // ═══════════════════════════════════════════════════════════════════════

    const result = await authService.register({
      email: email.toLowerCase().trim(),
      password,
      name: name.trim(),
      role: 'manager', // Self-registered users are managers of their own account
      company: company.trim(),
      sector: sector || 'outro',
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers['user-agent']
    });

    // Log successful registration
    console.log('[AUTH] New user registered:', {
      email: email.toLowerCase(),
      company: company.trim(),
      sector: sector || 'outro',
      ip: req.ip || req.connection?.remoteAddress
    });

    res.status(201).json({
      success: true,
      data: result,
      message: 'Conta criada com sucesso'
    });

  } catch (error) {
    console.error('[AUTH] Registration error:', error.message);

    // Don't expose internal error details
    const errorMessage = error.message === 'Email já cadastrado'
      ? error.message
      : 'Erro ao criar conta. Tente novamente.';

    res.status(400).json({
      success: false,
      error: errorMessage
    });
  }
});

/**
 * POST /api/auth/create-user
 * Create new user - Admin only
 */
router.post('/api/auth/create-user', authenticate, async (req, res) => {
  try {
    // Only admins can create users
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Apenas administradores podem criar usuários'
      });
    }

    const { email, password, name, role, teamId } = req.body;

    // Validation
    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        error: 'Email, senha e nome são obrigatórios'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Senha deve ter pelo menos 6 caracteres'
      });
    }

    const result = await authService.register({
      email,
      password,
      name,
      role: role || 'sdr',
      teamId
    });

    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/auth/login
 * Login user
 */
router.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email e senha são obrigatórios'
      });
    }

    const result = await authService.login({
      email,
      password,
      deviceInfo: req.headers['user-agent'],
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers['user-agent']
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout user
 */
router.post('/api/auth/logout', authenticate, (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    authService.logout(req.user.id, token);

    res.json({
      success: true,
      message: 'Logout realizado com sucesso'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token
 */
router.post('/api/auth/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token é obrigatório'
      });
    }

    const result = await authService.refreshAccessToken(refreshToken);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(401).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user with entitlements/billing status
 */
router.get('/api/auth/me', authenticate, (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const user = authService.getCurrentUser(token);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuário não encontrado'
      });
    }

    // Get entitlements for user's team
    // P0-5: Use req.tenantId (set by auth middleware) for consistency
    // Fallback order: req.tenantId > user.tenant_id > user.team_id (legacy) > first team
    let entitlements = null;
    const tenantId = req.tenantId || user.tenant_id || user.team_id || user.teams?.[0]?.id;

    if (tenantId && tenantId !== 'default') {
      const entitlementService = getEntitlementService();
      const fullEntitlements = entitlementService.getTeamEntitlements(tenantId);

      if (fullEntitlements.found) {
        entitlements = {
          billingStatus: fullEntitlements.billingStatus,
          planName: fullEntitlements.planName,
          trialEndsAt: fullEntitlements.trialEndsAt,
          trialStartedAt: fullEntitlements.trialStartedAt,
          daysRemaining: fullEntitlements.daysRemaining,
          isRuntimeAllowed: fullEntitlements.isRuntimeAllowed,
          reason: fullEntitlements.reason,
          maxAgents: fullEntitlements.maxAgents,
          maxMessagesPerMonth: fullEntitlements.maxMessagesPerMonth,
          messagesUsed: fullEntitlements.messagesUsed,
          messagesRemaining: fullEntitlements.messagesRemaining,
          isAtMessageLimit: fullEntitlements.isAtMessageLimit,
          features: fullEntitlements.features
        };
      }
    }

    res.json({
      success: true,
      data: {
        ...user,
        entitlements
      }
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/auth/password
 * Change password
 */
router.put('/api/auth/password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Senha atual e nova senha são obrigatórias'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Nova senha deve ter pelo menos 6 caracteres'
      });
    }

    await authService.changePassword(req.user.id, currentPassword, newPassword);

    res.json({
      success: true,
      message: 'Senha alterada com sucesso'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/auth/sessions
 * Get user's active sessions
 */
router.get('/api/auth/sessions', authenticate, (req, res) => {
  try {
    const sessions = authService.getUserSessions(req.user.id);

    res.json({
      success: true,
      data: sessions
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/auth/sessions
 * Logout from all devices
 */
router.delete('/api/auth/sessions', authenticate, (req, res) => {
  try {
    authService.invalidateAllUserSessions(req.user.id);

    res.json({
      success: true,
      message: 'Todas as sessões foram encerradas'
    });
  } catch (error) {
    console.error('Delete sessions error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/auth/entitlements
 * Get user's team entitlements/billing status (trial, limits, etc.)
 */
router.get('/api/auth/entitlements', authenticate, (req, res) => {
  try {
    // P3-6: Use req.tenantId (set by auth middleware) for consistency
    const tenantId = req.tenantId;

    if (!tenantId || tenantId === 'default') {
      return res.status(400).json({
        success: false,
        error: 'Usuário não está associado a um time'
      });
    }

    const entitlementService = getEntitlementService();
    const entitlements = entitlementService.getTeamEntitlements(tenantId);

    if (!entitlements.found) {
      return res.status(404).json({
        success: false,
        error: 'Time não encontrado'
      });
    }

    res.json({
      success: true,
      data: {
        billingStatus: entitlements.billingStatus,
        planName: entitlements.planName,
        trialEndsAt: entitlements.trialEndsAt,
        trialStartedAt: entitlements.trialStartedAt,
        daysRemaining: entitlements.daysRemaining,
        isRuntimeAllowed: entitlements.isRuntimeAllowed,
        reason: entitlements.reason,
        maxAgents: entitlements.maxAgents,
        maxMessagesPerMonth: entitlements.maxMessagesPerMonth,
        messagesUsed: entitlements.messagesUsed,
        messagesRemaining: entitlements.messagesRemaining,
        isAtMessageLimit: entitlements.isAtMessageLimit,
        features: entitlements.features,
        maxIntegrations: entitlements.maxIntegrations
      }
    });
  } catch (error) {
    console.error('Get entitlements error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/auth/verify
 * Verify if token is valid
 */
router.post('/api/auth/verify', (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token é obrigatório'
      });
    }

    const decoded = authService.verifyToken(token);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        valid: false,
        error: 'Token inválido ou expirado'
      });
    }

    res.json({
      success: true,
      valid: true,
      data: {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        exp: decoded.exp
      }
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      valid: false,
      error: 'Token inválido'
    });
  }
});

export default router;

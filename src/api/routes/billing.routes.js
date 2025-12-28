/**
 * @file billing.routes.js
 * @description Billing endpoints (plans)
 */

import express from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireTenant, tenantContext } from '../../middleware/tenant.middleware.js';

const router = express.Router();

const PLANS = [
  {
    id: 'trial',
    name: 'Trial',
    price: 0,
    billingPeriod: 'monthly',
    features: [
      '1 Agente SDR',
      '100 mensagens',
      '10 leads ativos',
      'Qualificacao BANT',
      'Dashboard basico',
      '7 dias de teste'
    ],
    limits: { agents: 1, messages: 100, leads: 10 }
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 97,
    billingPeriod: 'monthly',
    features: [
      '1 Agente SDR',
      '1.000 mensagens/mes',
      '100 leads ativos',
      'Qualificacao BANT',
      'Dashboard basico',
      'Suporte por email'
    ],
    limits: { agents: 1, messages: 1000, leads: 100 }
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 297,
    billingPeriod: 'monthly',
    features: [
      '3 Agentes (SDR, Specialist, Support)',
      '10.000 mensagens/mes',
      '1.000 leads ativos',
      'BANT + SPIN Selling',
      'Analytics avancado',
      'Integracoes CRM',
      'Suporte prioritario'
    ],
    limits: { agents: 3, messages: 10000, leads: 1000 },
    recommended: true
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 997,
    billingPeriod: 'monthly',
    features: [
      'Agentes ilimitados',
      'Mensagens ilimitadas',
      'Leads ilimitados',
      'Multi-tenant',
      'API completa',
      'White-label',
      'SLA garantido',
      'Gerente de conta dedicado'
    ],
    limits: { agents: -1, messages: -1, leads: -1 }
  }
];

/**
 * GET /api/billing/plans
 * Returns catalog of plans
 */
router.get('/api/billing/plans', authenticate, tenantContext, requireTenant, (req, res) => {
  res.json({ success: true, data: PLANS });
});

export default router;

/**
 * PLATFORM API INDEX
 * Configura e exporta todas as rotas da API da plataforma
 */

import { Router } from 'express';
import agentsRoutes from './routes/agents.routes.js';
import runtimeRoutes from './routes/runtime.routes.js';

const router = Router();

// Health check da plataforma
router.get('/health', (req, res) => {
  res.json({
    success: true,
    platform: 'LEADLY Agent Platform',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Rotas de agentes
router.use('/agents', agentsRoutes);

// Rotas de runtime
router.use('/runtime', runtimeRoutes);

// Rota de info
router.get('/info', async (req, res) => {
  try {
    const { PLATFORM_VERSION, PLATFORM_NAME } = await import('../index.js');

    res.json({
      success: true,
      data: {
        name: PLATFORM_NAME,
        version: PLATFORM_VERSION,
        capabilities: {
          roles: ['sdr', 'support', 'scheduler', 'specialist'],
          verticals: ['servicos', 'varejo', 'saas', 'educacao', 'saude'],
          frameworks: ['spin', 'bant', 'spin_bant'],
          channels: ['whatsapp', 'webchat', 'telegram', 'email'],
        },
        templates: ['sdr-servicos', 'sdr-varejo', 'support-geral', 'scheduler-agenda'],
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export { router as platformRouter };
export { RuntimeAdapter, getRuntimeAdapter } from './RuntimeAdapter.js';

export default router;

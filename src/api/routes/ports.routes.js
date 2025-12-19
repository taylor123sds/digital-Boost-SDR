/**
 * @file ports.routes.js
 * @description Rotas de gerenciamento de portas
 * Extraído de server.js (linhas 2519-2579)
 */

import express from 'express';

const router = express.Router();
const PORT = process.env.PORT || 3000;

/**
 * GET /api/ports/status
 * Status de todas as portas do sistema
 */
router.get('/api/ports/status', async (req, res) => {
  try {
    const PortManager = (await import('../../utils/port-manager.js')).default;
    const portManager = new PortManager();

    const status = await portManager.getPortsStatus();
    res.json({
      status: status,
      currentPort: PORT,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/ports/available
 * Buscar porta disponível
 */
router.get('/api/ports/available', async (req, res) => {
  try {
    const PortManager = (await import('../../utils/port-manager.js')).default;
    const portManager = new PortManager();

    const preferredPort = req.query.preferred || 3001;
    const availablePort = await portManager.findAvailablePort(parseInt(preferredPort));

    res.json({
      availablePort: availablePort,
      preferredPort: parseInt(preferredPort),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ports/release/:port
 * Forçar liberação de uma porta
 */
router.post('/api/ports/release/:port', async (req, res) => {
  try {
    const PortManager = (await import('../../utils/port-manager.js')).default;
    const portManager = new PortManager();

    const port = parseInt(req.params.port);
    const success = await portManager.forceReleasePort(port);

    res.json({
      success: success,
      port: port,
      message: success ? `Porta ${port} liberada com sucesso` : `Falha ao liberar porta ${port}`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;

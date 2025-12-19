/**
 * @file calibration.routes.js
 * @description Rotas de calibração do sistema
 * Extraído de server.js (linhas 2403-2479)
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * POST /api/calibration/test
 * Executar teste de calibração do sistema
 */
router.post('/api/calibration/test', async (req, res) => {
  try {
    // Importa dinamicamente o teste
    const { spawn } = await import('child_process');

    // Executa o teste de calibração
    const testProcess = spawn('node', ['test_calibracao_orbion.js'], {
      cwd: path.dirname(path.dirname(__dirname)),
      stdio: 'pipe'
    });

    let output = '';
    let errorOutput = '';

    testProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    testProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    testProcess.on('close', (code) => {
      if (code === 0) {
        res.json({
          success: true,
          output: output,
          timestamp: new Date().toISOString()
        });
      } else {
        res.json({
          success: false,
          output: output,
          error: errorOutput,
          timestamp: new Date().toISOString()
        });
      }
    });

    testProcess.on('error', (error) => {
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/calibration/status
 * Status da calibração do sistema
 */
router.get('/api/calibration/status', async (req, res) => {
  try {
    res.json({
      status: 'calibrated',
      successRate: 100,
      lastCalibration: new Date().toISOString(),
      distribution: {
        STRUCTURED_FLOW: 50,
        ARCHETYPE: 14,
        HYBRID: 29,
        LLM: 7
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

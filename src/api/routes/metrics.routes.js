/**
 * @file metrics.routes.js
 * @description Performance Metrics Routes
 * Wave 7: Performance & Optimization
 */

import express from 'express';
import { PerformanceMonitor } from '../../services/PerformanceMonitor.js';
import { createLogger } from '../../utils/logger.enhanced.js';

const router = express.Router();
const logger = createLogger({ module: 'MetricsRoutes' });

// Global performance monitor instance
let performanceMonitor = null;

/**
 * Get or create performance monitor
 * @returns {PerformanceMonitor}
 */
function getPerformanceMonitor() {
  if (!performanceMonitor) {
    performanceMonitor = new PerformanceMonitor(logger);
  }
  return performanceMonitor;
}

/**
 * GET /api/metrics
 * Get all performance metrics
 */
router.get('/api/metrics', (req, res) => {
  try {
    const monitor = getPerformanceMonitor();
    const metrics = monitor.getMetrics();

    res.status(200).json(metrics);
  } catch (error) {
    logger.error('Failed to get metrics', { error: error.message });
    res.status(500).json({
      error: 'Failed to retrieve metrics',
      message: error.message
    });
  }
});

/**
 * GET /api/metrics/summary
 * Get summary metrics (lightweight)
 */
router.get('/api/metrics/summary', (req, res) => {
  try {
    const monitor = getPerformanceMonitor();
    const summary = monitor.getSummary();

    res.status(200).json(summary);
  } catch (error) {
    logger.error('Failed to get metrics summary', { error: error.message });
    res.status(500).json({
      error: 'Failed to retrieve metrics summary',
      message: error.message
    });
  }
});

/**
 * POST /api/metrics/reset
 * Reset all metrics (admin only)
 */
router.post('/api/metrics/reset', (req, res) => {
  try {
    const monitor = getPerformanceMonitor();
    monitor.reset();

    logger.info('Metrics reset by admin');

    res.status(200).json({
      success: true,
      message: 'Metrics reset successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to reset metrics', { error: error.message });
    res.status(500).json({
      error: 'Failed to reset metrics',
      message: error.message
    });
  }
});

/**
 * Export performance monitor for use in other modules
 */
export { getPerformanceMonitor };

export default router;

/**
 * @file version.routes.js
 * @description P0-1: Version endpoint for runtime debugging
 *
 * Returns:
 * - commit: Git commit hash
 * - buildTime: When the build was created
 * - schemaVersion: Database schema version
 * - env: Environment name (prod/stage/dev)
 * - nodeVersion: Node.js version
 * - uptime: Server uptime in seconds
 *
 * @author ORBION Team
 * @version 1.0.0
 */

import express from 'express';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();

// Get directory name for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cache version info (computed once at startup)
let versionCache = null;

/**
 * Get git commit hash
 */
function getGitCommit() {
  try {
    // Try to read from BUILD_INFO file first (for production builds)
    const buildInfoPath = path.join(__dirname, '../../../BUILD_INFO.json');
    if (fs.existsSync(buildInfoPath)) {
      const buildInfo = JSON.parse(fs.readFileSync(buildInfoPath, 'utf-8'));
      return buildInfo.commit || 'unknown';
    }

    // Fall back to git command
    return execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
  } catch {
    return process.env.GIT_COMMIT || 'unknown';
  }
}

/**
 * Get git branch name
 */
function getGitBranch() {
  try {
    const buildInfoPath = path.join(__dirname, '../../../BUILD_INFO.json');
    if (fs.existsSync(buildInfoPath)) {
      const buildInfo = JSON.parse(fs.readFileSync(buildInfoPath, 'utf-8'));
      return buildInfo.branch || 'unknown';
    }

    return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
  } catch {
    return process.env.GIT_BRANCH || 'unknown';
  }
}

/**
 * Get build time
 */
function getBuildTime() {
  try {
    const buildInfoPath = path.join(__dirname, '../../../BUILD_INFO.json');
    if (fs.existsSync(buildInfoPath)) {
      const buildInfo = JSON.parse(fs.readFileSync(buildInfoPath, 'utf-8'));
      return buildInfo.buildTime || null;
    }

    // If no build info, use server start time
    return new Date().toISOString();
  } catch {
    return process.env.BUILD_TIME || new Date().toISOString();
  }
}

/**
 * Get database schema version from migrations
 */
async function getSchemaVersion(db) {
  try {
    if (!db) return 'unknown';

    // Check if schema_migrations table exists
    const tableExists = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name='schema_migrations'
    `).get();

    if (!tableExists) {
      // Count migration files as fallback
      const migrationsPath = path.join(__dirname, '../../db/migrations');
      if (fs.existsSync(migrationsPath)) {
        const files = fs.readdirSync(migrationsPath).filter(f => f.endsWith('.sql'));
        return `${files.length} migrations`;
      }
      return 'no_tracking';
    }

    // Get latest migration version
    const latest = db.prepare(`
      SELECT version, name FROM schema_migrations
      ORDER BY version DESC LIMIT 1
    `).get();

    return latest ? `${latest.version} (${latest.name})` : '0';
  } catch (error) {
    return `error: ${error.message}`;
  }
}

/**
 * Build version info object
 */
async function buildVersionInfo(db) {
  const startTime = process.env.SERVER_START_TIME || Date.now();

  return {
    service: 'LEADLY AI Agent',
    version: process.env.npm_package_version || '2.1.0',
    commit: getGitCommit(),
    branch: getGitBranch(),
    buildTime: getBuildTime(),
    schemaVersion: await getSchemaVersion(db),
    env: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
    platform: process.platform,
    uptime: Math.floor((Date.now() - startTime) / 1000),
    serverStartTime: new Date(parseInt(startTime)).toISOString()
  };
}

/**
 * GET /api/version
 * Returns version and build information
 */
router.get('/api/version', async (req, res) => {
  try {
    // Get database from container or service locator
    let db = null;
    try {
      const container = req.app.get('container');
      if (container) {
        db = await container.resolve('db');
      }
    } catch {
      // Database not available, continue without schema version
    }

    const versionInfo = await buildVersionInfo(db);

    res.json({
      success: true,
      data: versionInfo,
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

/**
 * GET /api/version/short
 * Returns abbreviated version string
 */
router.get('/api/version/short', (req, res) => {
  const commit = getGitCommit();
  const env = process.env.NODE_ENV || 'dev';
  res.send(`v2.1.0-${commit} (${env})`);
});

/**
 * GET /health/version
 * Alias for health check compatibility
 */
router.get('/health/version', async (req, res) => {
  const commit = getGitCommit();
  const env = process.env.NODE_ENV || 'development';

  res.json({
    status: 'ok',
    version: process.env.npm_package_version || '2.1.0',
    commit,
    env
  });
});

// Record server start time
if (!process.env.SERVER_START_TIME) {
  process.env.SERVER_START_TIME = Date.now().toString();
}

export default router;

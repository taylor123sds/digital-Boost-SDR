/**
 * PM2 Ecosystem Configuration
 * @description Production configuration for ORBION SDR Agent
 *
 * Usage:
 *   pm2 start ecosystem.config.cjs
 *   pm2 start ecosystem.config.cjs --env production
 */

module.exports = {
  apps: [
    {
      name: 'orbion-sdr',
      script: 'src/server.js',
      instances: 1, // Single instance for SQLite compatibility
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',

      // Environment variables (development)
      env: {
        NODE_ENV: 'development',
        PORT: 3001
      },

      // Production environment
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001
      },

      // Logging
      error_file: 'logs/error.log',
      out_file: 'logs/out.log',
      log_file: 'logs/combined.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // Process management
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,

      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,

      // Health check (optional)
      // health_check_http: {
      //   host: 'localhost',
      //   port: 3001,
      //   path: '/api/health',
      //   interval: 30000
      // }
    }
  ]
};

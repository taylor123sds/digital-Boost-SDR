/**
 * @file express.config.js
 * @description Configuração de middlewares do Express
 * Extraído de server.js para melhor modularidade
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import globalErrorHandler from '../utils/error_handler.js';
import { rateLimitAPI } from '../middleware/rate-limiter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Estatísticas globais do servidor
 */
export const serverStats = {
  startTime: Date.now(),
  totalRequests: 0,
  webhooksReceived: 0,
  messagesProcessed: 0,
  errors: 0
};

/**
 * Middleware de logging e estatísticas
 */
function loggingMiddleware(req, res, next) {
  serverStats.totalRequests++;
  console.log(` ${new Date().toISOString()} - ${req.method} ${req.path} - Total: ${serverStats.totalRequests}`);
  next();
}

/**
 * Middleware para rotas não encontradas
 */
function notFoundHandler(req, res) {
  console.log(` Rota não encontrada: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    error: 'Rota não encontrada',
    path: req.originalUrl,
    server: 'LEADLY-Fixed'
  });
}

/**
 * Configura CORS com whitelist de origens
 */
function getCorsOptions() {
  // Origens permitidas via env (separadas por vírgula) ou localhost para dev
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3001'];

  return {
    origin: (origin, callback) => {
      // Permitir requests sem origin (mobile apps, Postman, curl, webhooks)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        return callback(null, true);
      }

      console.warn(` CORS: Origem bloqueada: ${origin}`);
      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  };
}

/**
 * Configura todos os middlewares do Express
 * @param {Express} app - Instância do Express
 */
export function configureExpress(app) {
  // Security headers with Helmet
  // NOTE: CSP disabled for development - inline event handlers need 'unsafe-inline'
  app.use(helmet({
    contentSecurityPolicy: false // Disabled to allow onclick handlers
  }));

  // CORS com whitelist configurável
  app.use(cors(getCorsOptions()));

  // Body parsers
  app.use(express.json({
    limit: '50mb',
    verify: (req, res, buf) => {
      req.rawBody = buf.toString('utf8');
    }
  }));
  app.use(express.urlencoded({ extended: true }));

  // Global Rate Limiting (200 req/min por IP)
  app.use('/api', rateLimitAPI);

  // Logging e estatísticas
  app.use(loggingMiddleware);

  // Global error handler
  app.use(globalErrorHandler.expressErrorMiddleware());

  // Servir arquivos estáticos com ZERO cache
  app.use(express.static(path.join(__dirname, '../../public'), {
    setHeaders: (res, filePath) => {
      // Forçar no-cache para TODOS os arquivos
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      res.set('X-Force-Reload', Date.now().toString());
      res.set('X-Timestamp', new Date().toISOString());
    }
  }));

  console.log(' Express middlewares configurados');
}

/**
 * Configura SPA fallback para React app em /app/*
 * Deve ser chamado APÓS montar as rotas de API mas ANTES do 404 handler
 * @param {Express} app - Instância do Express
 */
export function configureSPAFallback(app) {
  // Redirect raiz para /app (URL canônica)
  app.get('/', (req, res) => {
    res.redirect('/app');
  });

  // Servir assets estáticos do SPA em /app
  app.use('/app', express.static(path.join(__dirname, '../../public/app'), {
    setHeaders: (res, filePath) => {
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      // CORS headers for crossorigin assets (CSS/JS with crossorigin attribute)
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'GET');
    }
  }));

  // Fallback SPA: qualquer rota /app/* serve index.html
  app.get('/app/*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/app/index.html'));
  });

  console.log(' SPA configurado: / → /app (redirect) + /app/* (fallback)');
}

/**
 * Configura 404 handler (deve ser chamado APÓS montar todas as rotas)
 * @param {Express} app - Instância do Express
 */
export function configure404Handler(app) {
  app.use('*', notFoundHandler);
  console.log(' 404 handler configurado');
}

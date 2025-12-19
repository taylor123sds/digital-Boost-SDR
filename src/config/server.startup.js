/**
 * @file server.startup.js
 * @description Lógica de inicialização e graceful shutdown do servidor
 * Extraído de server.js (linhas 2603-2682)
 */

import SingleInstanceManager from '../utils/single-instance.js';
import gracefulShutdownManager from '../utils/graceful_shutdown.js';
import audioCleanup from '../utils/audio_cleanup.js';
import persistenceManager from '../handlers/persistence_manager.js';
import { cleanupLimiters } from '../middleware/rate-limiter.js';
import { getAutomationEngine } from '../automation/engine.js';

const PORT = process.env.PORT || 3000;
const instanceManager = new SingleInstanceManager();

/**
 * Inicia o servidor Express com todas as configurações necessárias
 * @param {Express} app - Instância do Express configurada
 * @returns {Server} Instância do servidor HTTP
 */
export async function startServer(app) {
  try {
    // 1. Verificar se já existe uma instância rodando
    const instanceStatus = await instanceManager.isRunning();

    if (instanceStatus.running) {
      console.log(' LEADLY já está rodando!');
      console.log('   Use "node start-leadly.js restart" para forçar restart');
      process.exit(1);
    }

    // 2. Iniciar servidor HTTP
    const server = app.listen(PORT, async () => {
      console.log(` LEADLY AI Agent rodando na porta ${PORT}`);
      console.log(` Sistema modular iniciado em ${new Date().toISOString()}`);
      console.log(` Memória inicial: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
      console.log(` Webhook URL: http://localhost:${PORT}/api/webhook/evolution`);
      console.log(` Health Check: http://localhost:${PORT}/api/health`);
      console.log(` Dashboard: http://localhost:${PORT}/`);

      // 3. Iniciar limpeza automática de arquivos de áudio
      audioCleanup.startAutoCleanup();
      console.log(' Sistema de limpeza de áudio iniciado');

      // 3.5. Iniciar Automation Engine
      try {
        const automationEngine = getAutomationEngine();
        await automationEngine.initialize();
        console.log(' Automation Engine iniciado');
      } catch (error) {
        console.warn(' Automation Engine não pôde ser iniciado:', error.message);
        console.warn('   Execute "npm run migrate" para criar as tabelas necessárias');
      }

      // 4. Registrar esta instância
      instanceManager.register();
      console.log(' Instância registrada');

      // 5. Configurar graceful shutdown
      gracefulShutdownManager.registerServer(server);

      // Registrar cleanup handlers para componentes críticos
      gracefulShutdownManager.registerCleanupHandler(async () => {
        console.log(' Limpando PersistenceManager...');
        return persistenceManager.forceProcess();
      }, 'PersistenceManager');

      gracefulShutdownManager.registerCleanupHandler(async () => {
        console.log(' Limpando AudioCleanup...');
        return audioCleanup.cleanup();
      }, 'AudioCleanup');

      gracefulShutdownManager.registerCleanupHandler(async () => {
        console.log(' Limpando Rate Limiters...');
        return cleanupLimiters();
      }, 'RateLimiters');

      gracefulShutdownManager.registerCleanupHandler(async () => {
        console.log(' Parando Automation Engine...');
        const engine = getAutomationEngine();
        return engine.stop();
      }, 'AutomationEngine');

      gracefulShutdownManager.registerCleanupHandler(async () => {
        console.log(' Desregistrando instância...');
        return instanceManager.unregister();
      }, 'InstanceManager');

      // Ativar signal handlers (SIGTERM, SIGINT, etc)
      gracefulShutdownManager.setupSignalHandlers();

      console.log(' Graceful shutdown configurado com 5 handlers');
      console.log(' LEADLY pronto para receber requisições!');
      console.log('');
    });

    return server;

  } catch (error) {
    console.error(' Erro ao iniciar servidor:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// src/utils/graceful_shutdown.js
//  FIX GRAVE #3: Graceful shutdown handler to prevent data loss

//  FIX: Usar getDatabase() que verifica e reconecta se necessário
import { getDatabase } from '../db/index.js';

/**
 *  FIX EPIPE: Safe log function that catches EPIPE errors
 * When stdout/stderr is closed (broken pipe), console.log throws EPIPE
 * This wrapper silently ignores those errors during shutdown
 */
function safeLog(...args) {
  try {
    console.log(...args);
  } catch (e) {
    // Ignore EPIPE errors - pipe is closed, nothing we can do
  }
}

function safeError(...args) {
  try {
    console.error(...args);
  } catch (e) {
    // Ignore EPIPE errors
  }
}

/**
 * Graceful Shutdown Manager
 * Handles application shutdown gracefully to prevent data loss and ensure cleanup
 */
class GracefulShutdownManager {
  constructor() {
    this.isShuttingDown = false;
    this.shutdownTimeout = 10000; // 10 seconds max for shutdown
    this.cleanupHandlers = [];
    this.server = null;
  }

  /**
   * Register HTTP server for graceful shutdown
   * @param {Object} server - Express HTTP server
   */
  registerServer(server) {
    this.server = server;
    console.log(' [SHUTDOWN] HTTP server registered for graceful shutdown');
  }

  /**
   * Register a cleanup handler to be called on shutdown
   * @param {Function} handler - Async function to be called on shutdown
   * @param {string} name - Name of the handler for logging
   */
  registerCleanupHandler(handler, name) {
    this.cleanupHandlers.push({ handler, name });
    console.log(` [SHUTDOWN] Cleanup handler registered: ${name}`);
  }

  /**
   * Perform graceful shutdown
   * @param {string} signal - Signal that triggered shutdown (SIGTERM, SIGINT, etc)
   */
  async shutdown(signal) {
    if (this.isShuttingDown) {
      safeLog(' [SHUTDOWN] Already shutting down, ignoring signal');
      return;
    }

    this.isShuttingDown = true;
    safeLog(`\n [SHUTDOWN] Received ${signal}, starting graceful shutdown...`);

    const shutdownStart = Date.now();

    // Create timeout promise
    const timeoutPromise = new Promise((resolve) => {
      setTimeout(() => {
        safeError(` [SHUTDOWN] Timeout reached (${this.shutdownTimeout}ms), forcing exit`);
        resolve('timeout');
      }, this.shutdownTimeout);
    });

    // Create shutdown promise
    const shutdownPromise = (async () => {
      try {
        // Step 1: Stop accepting new connections
        if (this.server) {
          await new Promise((resolve, reject) => {
            safeLog(' [SHUTDOWN] Closing HTTP server...');
            this.server.close((err) => {
              if (err) {
                safeError(' [SHUTDOWN] Error closing server:', err.message);
                reject(err);
              } else {
                safeLog(' [SHUTDOWN] HTTP server closed');
                resolve();
              }
            });
          });
        }

        // Step 2: Execute cleanup handlers
        safeLog(` [SHUTDOWN] Running ${this.cleanupHandlers.length} cleanup handlers...`);

        for (const { handler, name } of this.cleanupHandlers) {
          try {
            safeLog(` [SHUTDOWN] Running cleanup: ${name}...`);
            await handler();
            safeLog(` [SHUTDOWN] Cleanup completed: ${name}`);
          } catch (error) {
            safeError(` [SHUTDOWN] Cleanup failed: ${name}`, error.message);
          }
        }

        // Step 3: Database connection
        //  FIX: NÃO fechar o banco aqui - o process.exit() vai fechar automaticamente
        // Fechar o db.close() no shutdown causava problemas porque cleanup handlers
        // ainda podiam estar tentando acessar o banco
        safeLog(' [SHUTDOWN] Database will be closed automatically on exit');

        const shutdownTime = Date.now() - shutdownStart;
        safeLog(` [SHUTDOWN] Graceful shutdown completed in ${shutdownTime}ms`);

        return 'success';
      } catch (error) {
        safeError(' [SHUTDOWN] Error during shutdown:', error);
        return 'error';
      }
    })();

    // Race between shutdown and timeout
    const result = await Promise.race([shutdownPromise, timeoutPromise]);

    if (result === 'timeout') {
      safeError(' [SHUTDOWN] Forced shutdown due to timeout');
      process.exit(1);
    } else {
      safeLog(' [SHUTDOWN] Goodbye!');
      process.exit(0);
    }
  }

  /**
   * Setup signal handlers for graceful shutdown
   */
  setupSignalHandlers() {
    // Handle SIGTERM (docker stop, kubernetes, etc)
    process.on('SIGTERM', () => {
      this.shutdown('SIGTERM');
    });

    // Handle SIGINT (Ctrl+C)
    process.on('SIGINT', () => {
      this.shutdown('SIGINT');
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      safeError(' [SHUTDOWN] Uncaught Exception:', error);
      this.shutdown('UNCAUGHT_EXCEPTION');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      safeError(' [SHUTDOWN] Unhandled Rejection at:', promise, 'reason:', reason);
      this.shutdown('UNHANDLED_REJECTION');
    });

    console.log(' [SHUTDOWN] Signal handlers configured');
  }
}

// Export singleton instance
const gracefulShutdownManager = new GracefulShutdownManager();

export default gracefulShutdownManager;

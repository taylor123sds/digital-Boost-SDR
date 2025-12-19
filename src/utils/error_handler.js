// src/utils/error_handler.js
// Sistema de tratamento de erros global para ORBION

import fs from 'fs';
import path from 'path';

class GlobalErrorHandler {
    constructor() {
        this.errorLog = [];
        this.maxLogSize = 1000;
        this.logFile = './logs/error.log';
        this.criticalErrors = [];
        this.setupLogDirectory();
        this.setupGlobalHandlers();
    }

    setupLogDirectory() {
        const logDir = path.dirname(this.logFile);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
    }

    setupGlobalHandlers() {
        // Captura erros não tratados
        process.on('uncaughtException', (error) => {
            this.handleCriticalError('UNCAUGHT_EXCEPTION', error);
        });

        // Captura promises rejeitadas
        process.on('unhandledRejection', (reason, promise) => {
            this.handleCriticalError('UNHANDLED_REJECTION', reason, { promise });
        });

        // Captura warnings
        process.on('warning', (warning) => {
            this.logWarning(warning);
        });
    }

    handleCriticalError(type, error, context = {}) {
        const errorInfo = {
            type,
            message: error?.message || error,
            stack: error?.stack,
            timestamp: new Date().toISOString(),
            context,
            pid: process.pid
        };

        this.criticalErrors.push(errorInfo);
        this.logToFile('CRITICAL', errorInfo);

        console.error(' ERRO CRÍTICO:', errorInfo);

        // Para erros críticos, não mata o processo imediatamente
        // Permite tempo para cleanup
        setTimeout(() => {
            console.error(' Sistema será encerrado devido a erro crítico');
            process.exit(1);
        }, 5000);
    }

    logError(operation, error, context = {}) {
        const errorInfo = {
            operation,
            message: error?.message || error,
            stack: error?.stack,
            timestamp: new Date().toISOString(),
            context,
            level: 'ERROR'
        };

        this.errorLog.push(errorInfo);
        this.maintainLogSize();
        this.logToFile('ERROR', errorInfo);

        console.error(` [${operation}] ${errorInfo.message}`, context);
        return errorInfo;
    }

    logWarning(warning, context = {}) {
        const warningInfo = {
            message: warning?.message || warning,
            timestamp: new Date().toISOString(),
            context,
            level: 'WARNING'
        };

        this.logToFile('WARNING', warningInfo);
        console.warn(` ${warningInfo.message}`, context);
    }

    logToFile(level, info) {
        try {
            const logEntry = `[${info.timestamp}] ${level}: ${JSON.stringify(info)}\n`;
            fs.appendFileSync(this.logFile, logEntry);
        } catch (writeError) {
            console.error('Erro ao escrever log:', writeError);
        }
    }

    maintainLogSize() {
        if (this.errorLog.length > this.maxLogSize) {
            this.errorLog = this.errorLog.slice(-this.maxLogSize);
        }
    }

    // Wrapper para operações async com tratamento automático
    async safeAsync(operation, asyncFn, context = {}) {
        try {
            const result = await asyncFn();
            return { success: true, data: result };
        } catch (error) {
            this.logError(operation, error, context);
            return { success: false, error: this.formatError(error) };
        }
    }

    // Wrapper para operações síncronas
    safeSync(operation, syncFn, context = {}) {
        try {
            const result = syncFn();
            return { success: true, data: result };
        } catch (error) {
            this.logError(operation, error, context);
            return { success: false, error: this.formatError(error) };
        }
    }

    formatError(error) {
        return {
            message: error?.message || 'Erro desconhecido',
            type: error?.constructor?.name || 'UnknownError',
            code: error?.code,
            timestamp: new Date().toISOString()
        };
    }

    // Middleware para Express
    expressErrorMiddleware() {
        return (error, req, res, next) => {
            const errorInfo = this.logError('EXPRESS_REQUEST', error, {
                url: req.url,
                method: req.method,
                body: req.body,
                params: req.params,
                query: req.query,
                headers: req.headers
            });

            const statusCode = error.statusCode || error.status || 500;

            res.status(statusCode).json({
                success: false,
                error: {
                    message: error.message || 'Erro interno do servidor',
                    code: error.code,
                    timestamp: errorInfo.timestamp
                }
            });
        };
    }

    // Wrapper para webhooks WhatsApp
    async safeWebhookHandler(handler, req, res, operation = 'WEBHOOK') {
        try {
            await handler(req, res);
        } catch (error) {
            this.logError(operation, error, {
                body: req.body,
                headers: req.headers,
                url: req.url
            });

            if (!res.headersSent) {
                res.status(200).json({
                    success: false,
                    message: 'Erro processado com segurança'
                });
            }
        }
    }

    // Timeout wrapper para operações async
    async withTimeout(operation, asyncFn, timeoutMs = 30000, context = {}) {
        return new Promise(async (resolve, reject) => {
            const timeoutId = setTimeout(() => {
                const error = new Error(`Timeout de ${timeoutMs}ms excedido para ${operation}`);
                this.logError('TIMEOUT', error, context);
                reject(error);
            }, timeoutMs);

            try {
                const result = await asyncFn();
                clearTimeout(timeoutId);
                resolve(result);
            } catch (error) {
                clearTimeout(timeoutId);
                this.logError(operation, error, context);
                reject(error);
            }
        });
    }

    // Health check
    getHealthStatus() {
        const recentErrors = this.errorLog.filter(
            error => Date.now() - new Date(error.timestamp).getTime() < 300000 // 5 minutos
        );

        return {
            status: this.criticalErrors.length === 0 ? 'healthy' : 'critical',
            criticalErrors: this.criticalErrors.length,
            recentErrors: recentErrors.length,
            totalErrors: this.errorLog.length,
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            timestamp: new Date().toISOString()
        };
    }

    // Limpar logs antigos
    clearOldLogs(maxAgeMs = 86400000) { // 24 horas
        const cutoff = Date.now() - maxAgeMs;
        this.errorLog = this.errorLog.filter(
            error => new Date(error.timestamp).getTime() > cutoff
        );
    }

    // Estatísticas de erro
    getErrorStats() {
        const operations = {};
        this.errorLog.forEach(error => {
            operations[error.operation] = (operations[error.operation] || 0) + 1;
        });

        return {
            totalErrors: this.errorLog.length,
            criticalErrors: this.criticalErrors.length,
            operationBreakdown: operations,
            lastError: this.errorLog[this.errorLog.length - 1],
            timestamp: new Date().toISOString()
        };
    }
}

// Instância singleton
const globalErrorHandler = new GlobalErrorHandler();

export default globalErrorHandler;

// Exports de conveniência
export const {
    logError,
    logWarning,
    safeAsync,
    safeSync,
    withTimeout,
    safeWebhookHandler,
    expressErrorMiddleware,
    getHealthStatus,
    getErrorStats
} = globalErrorHandler;
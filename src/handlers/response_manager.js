// handlers/response_manager.js
// Gerenciador centralizado de respostas para evitar duplicações

import crypto from 'crypto';
import conversationAnalytics from '../learning/conversation_analytics.js';

export class ResponseManager {
  constructor() {
    this.sentResponses = new Map();
    this.sendingQueue = new Map();
    this.DUPLICATE_WINDOW = 5000; // 5 segundos
    this.MAX_RETRIES = 3;
    this.totalSent = 0;
    this.duplicatesBlocked = 0;
  }

  async sendResponse(to, message, metadata = {}) {
    this.totalSent++;

    try {
      // 1. Criar hash da resposta
      const responseHash = this.createHash(to, message);

      // 2. Verificar se já foi enviada recentemente
      if (this.wasRecentlySent(responseHash)) {
        this.duplicatesBlocked++;
        console.log(`🚫 Resposta duplicada bloqueada para ${to}: "${message.substring(0, 50)}..."`);

        return {
          sent: false,
          reason: 'duplicate_blocked',
          originalTime: this.sentResponses.get(responseHash),
          duplicateCount: this.duplicatesBlocked
        };
      }

      // 3. Verificar se está na fila de envio
      if (this.sendingQueue.has(responseHash)) {
        console.log(`⏳ Resposta já na fila de envio para ${to}`);
        return this.sendingQueue.get(responseHash);
      }

      // 4. Adicionar à fila de envio
      const sendPromise = this.performSend(to, message, responseHash, metadata);
      this.sendingQueue.set(responseHash, sendPromise);

      // 5. Executar envio
      const result = await sendPromise;

      // 6. Remover da fila
      this.sendingQueue.delete(responseHash);

      return result;

    } catch (error) {
      console.error(`❌ ResponseManager: Erro ao enviar para ${to}:`, error);
      return {
        sent: false,
        error: error.message,
        to,
        message: message.substring(0, 100)
      };
    }
  }

  async performSend(to, message, responseHash, metadata) {
    let lastError = null;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        console.log(`📤 Enviando resposta (tentativa ${attempt}/${this.MAX_RETRIES}) para ${to}`);

        // Registrar envio antes de tentar
        this.sentResponses.set(responseHash, {
          timestamp: Date.now(),
          to,
          message: message.substring(0, 100),
          attempt
        });

        // Importar e usar a função de envio do WhatsApp
        const { sendWhatsAppMessage } = await import('../tools/whatsapp.js');

        // Executar envio com timeout
        const sendResult = await this.withTimeout(
          sendWhatsAppMessage(to, message),
          10000,
          `Envio para ${to}`
        );

        // Configurar limpeza automática
        this.scheduleCacheCleanup(responseHash);

        console.log(`✅ Resposta enviada com sucesso para ${to}`);

        // 🧠 Self-Learning: Detectar sinais após envio (não-bloqueante)
        this.trackConversationSignals(to, metadata.userMessage, message).catch(err => {
          console.error('⚠️ [LEARNING] Erro ao rastrear sinais:', err.message);
        });

        return {
          sent: true,
          result: sendResult,
          attempt,
          timestamp: Date.now(),
          responseHash,
          metadata
        };

      } catch (error) {
        lastError = error;
        console.error(`❌ Tentativa ${attempt} falhou para ${to}:`, error.message);

        // Se não é a última tentativa, aguarda antes de tentar novamente
        if (attempt < this.MAX_RETRIES) {
          const delay = Math.pow(2, attempt) * 1000; // Backoff exponencial
          console.log(`⏱️ Aguardando ${delay}ms antes da próxima tentativa...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // Todas as tentativas falharam - remover do cache
    this.sentResponses.delete(responseHash);

    throw new Error(`Falha após ${this.MAX_RETRIES} tentativas: ${lastError?.message || 'Erro desconhecido'}`);
  }

  async withTimeout(promise, timeoutMs, context) {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Timeout: ${context} demorou mais de ${timeoutMs}ms`));
      }, timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  createHash(to, message) {
    // Criar identificador único baseado no destinatário e conteúdo
    const cleanMessage = message
      .substring(0, 200)
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();

    // Incluir timestamp arredondado para janela de duplicação
    const timeWindow = Math.floor(Date.now() / this.DUPLICATE_WINDOW);

    const hashInput = `${to}_${cleanMessage}_${timeWindow}`;
    return crypto.createHash('md5').update(hashInput).digest('hex').slice(0, 16);
  }

  wasRecentlySent(hash) {
    if (!this.sentResponses.has(hash)) return false;

    const sentData = this.sentResponses.get(hash);
    const elapsed = Date.now() - sentData.timestamp;

    // Se passou da janela de duplicação, remover
    if (elapsed > this.DUPLICATE_WINDOW) {
      this.sentResponses.delete(hash);
      return false;
    }

    return true;
  }

  scheduleCacheCleanup(hash) {
    setTimeout(() => {
      this.sentResponses.delete(hash);
    }, this.DUPLICATE_WINDOW);
  }

  // Método para enviar múltiplas respostas de forma eficiente
  async sendBatch(responses) {
    if (!Array.isArray(responses) || responses.length === 0) {
      return { sent: 0, failed: 0, results: [] };
    }

    console.log(`📦 Enviando lote de ${responses.length} respostas`);

    const promises = responses.map(({ to, message, metadata }) =>
      this.sendResponse(to, message, metadata).catch(error => ({
        sent: false,
        error: error.message,
        to,
        message: message.substring(0, 50)
      }))
    );

    const results = await Promise.all(promises);

    const stats = {
      sent: results.filter(r => r.sent).length,
      failed: results.filter(r => !r.sent).length,
      results
    };

    console.log(`📊 Lote processado: ${stats.sent} enviadas, ${stats.failed} falharam`);

    return stats;
  }

  // Verificar saúde do sistema de envio
  async healthCheck() {
    try {
      // Teste simples de conectividade
      const testNumber = '558499999999'; // Número de teste
      const testMessage = 'Teste de conectividade - ignore';

      const startTime = Date.now();

      // Simular envio (não executa realmente)
      await new Promise(resolve => setTimeout(resolve, 100));

      const responseTime = Date.now() - startTime;

      return {
        healthy: true,
        responseTime,
        queueSize: this.sendingQueue.size,
        cacheSize: this.sentResponses.size,
        stats: this.getStats()
      };

    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        queueSize: this.sendingQueue.size,
        cacheSize: this.sentResponses.size
      };
    }
  }

  getStats() {
    return {
      totalSent: this.totalSent,
      duplicatesBlocked: this.duplicatesBlocked,
      duplicateRate: this.totalSent > 0
        ? (this.duplicatesBlocked / this.totalSent * 100).toFixed(2) + '%'
        : '0%',
      currentQueue: this.sendingQueue.size,
      recentCache: this.sentResponses.size,
      efficiency: this.totalSent > 0
        ? ((this.totalSent - this.duplicatesBlocked) / this.totalSent * 100).toFixed(2) + '%'
        : '100%'
    };
  }

  // Limpar cache manualmente
  clearCache() {
    const cleared = this.sentResponses.size + this.sendingQueue.size;
    this.sentResponses.clear();
    this.sendingQueue.clear();

    console.log(`🧹 ResponseManager: Cache limpo (${cleared} entradas removidas)`);
    return cleared;
  }

  // Limpeza automática periódica
  startPeriodicCleanup(intervalMs = 60000) { // 1 minuto
    setInterval(() => {
      const before = this.sentResponses.size;
      const cutoff = Date.now() - this.DUPLICATE_WINDOW;

      // Remover entradas antigas
      for (const [hash, data] of this.sentResponses) {
        if (data.timestamp < cutoff) {
          this.sentResponses.delete(hash);
        }
      }

      const after = this.sentResponses.size;
      const cleaned = before - after;

      if (cleaned > 0) {
        console.log(`🧹 Limpeza automática: ${cleaned} entradas antigas removidas`);
      }

    }, intervalMs);
  }

  // Monitoramento em tempo real
  startMonitoring(intervalMs = 30000) { // 30 segundos
    setInterval(() => {
      const stats = this.getStats();

      console.log('📊 === MONITOR DE RESPOSTAS ===');
      console.log(`Total enviado: ${stats.totalSent}`);
      console.log(`Duplicatas bloqueadas: ${stats.duplicatesBlocked}`);
      console.log(`Taxa de duplicação: ${stats.duplicateRate}`);
      console.log(`Eficiência: ${stats.efficiency}`);
      console.log(`Fila atual: ${stats.currentQueue}`);
      console.log(`Cache ativo: ${stats.recentCache}`);

      // Alertas
      if (parseInt(stats.duplicateRate) > 15) {
        console.error('🚨 ALERTA: Alta taxa de duplicação detectada!');
      }

      if (stats.currentQueue > 10) {
        console.error('🚨 ALERTA: Fila de envio muito grande!');
      }

    }, intervalMs);
  }

  /**
   * Envia áudio explicativo da Digital Boost
   * @param {string} to - Número do destinatário
   * @returns {Promise<Object>} - Resultado do envio
   */
  async sendDigitalBoostAudio(to) {
    try {
      console.log(`🎤 [DIGITAL-BOOST-AUDIO] Enviando áudio explicativo para ${to}`);

      const { sendDigitalBoostAudioExplanation } = await import('../tools/digital_boost_explainer.js');
      const { sendWhatsAppAudio } = await import('../tools/whatsapp.js');

      // Função wrapper para enviar áudio
      const sendAudioFunc = async (recipient, audioPath) => {
        return await sendWhatsAppAudio(recipient, audioPath);
      };

      const result = await sendDigitalBoostAudioExplanation(to, sendAudioFunc);

      console.log(`✅ [DIGITAL-BOOST-AUDIO] Áudio enviado com sucesso para ${to}`);

      return {
        sent: true,
        type: 'audio',
        result
      };

    } catch (error) {
      console.error(`❌ [DIGITAL-BOOST-AUDIO] Erro ao enviar áudio para ${to}:`, error);
      throw error;
    }
  }

  /**
   * 🧠 Self-Learning: Rastreia sinais de sucesso/falha na conversa
   * @param {string} contactId - ID do contato
   * @param {string} userMessage - Mensagem do usuário
   * @param {string} botResponse - Resposta do bot
   */
  async trackConversationSignals(contactId, userMessage, botResponse) {
    if (!userMessage || !botResponse) {
      return; // Precisa de ambas as mensagens para analisar
    }

    try {
      const signals = await conversationAnalytics.detectSuccessSignals(
        contactId,
        userMessage,
        botResponse
      );

      if (signals.length > 0) {
        console.log(`🧠 [LEARNING] ${signals.length} sinais detectados para ${contactId}`);
      }
    } catch (error) {
      // Não propagar erro - learning é não-bloqueante
      console.error('⚠️ [LEARNING] Erro ao detectar sinais:', error.message);
    }
  }
}

// Instância singleton
const responseManager = new ResponseManager();

// Iniciar limpeza e monitoramento automáticos
responseManager.startPeriodicCleanup();
responseManager.startMonitoring();

export default responseManager;
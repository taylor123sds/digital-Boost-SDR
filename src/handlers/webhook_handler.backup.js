// handlers/webhook_handler.js
// Sistema unificado de webhook para eliminar duplicações

import crypto from 'crypto';

export class WebhookHandler {
  constructor() {
    this.processingQueue = new Map();
    this.processedMessages = new Set();
    this.MESSAGE_EXPIRY = 60000; // 1 minuto
    this.duplicateCount = 0;
    this.totalMessages = 0;
  }

  async handleWebhook(data) {
    this.totalMessages++;

    try {
      console.log('🔍 WEBHOOK RECEBIDO - DEBUG:', JSON.stringify(data, null, 2));

      // 1. VERIFICAR SE É MENSAGEM DO PRÓPRIO BOT (CRÍTICO - EVITA LOOP INFINITO)
      if (this.isFromBot(data)) {
        console.log('🤖 Mensagem do bot ignorada - prevenindo loop infinito');
        return { status: 'ignored', reason: 'from_bot' };
      }

      // 2. Extrair ID único da mensagem
      const messageId = this.extractMessageId(data);

      if (!messageId) {
        console.log('⚠️ Webhook sem ID válido ignorado');
        return { status: 'invalid', reason: 'no_message_id' };
      }

      // 3. Verificar duplicação
      if (this.isDuplicate(messageId)) {
        this.duplicateCount++;
        console.log(`⚠️ Mensagem duplicada ignorada: ${messageId} (Total: ${this.duplicateCount})`);
        return { status: 'duplicate', messageId, duplicateCount: this.duplicateCount };
      }

      // 4. Marcar como processada
      this.markAsProcessed(messageId);

      // 5. Extrair dados da mensagem
      const messageData = this.extractMessageData(data);
      console.log('📊 DADOS EXTRAÍDOS:', JSON.stringify(messageData, null, 2));

      // VALIDAÇÃO SIMPLIFICADA - aceitar qualquer mensagem com remetente
      if (!messageData.from) {
        console.log('⚠️ Mensagem sem remetente válido ignorada');
        return { status: 'invalid', reason: 'no_sender' };
      }

      // Aceitar TODAS as mensagens com remetente válido
      // Pode ser texto, mídia, reação, etc.
      console.log(`📨 Tipo de mensagem: ${messageData.messageType}, Texto: "${messageData.text}"`);

      // Se não tem texto, criar texto padrão baseado no tipo
      if (!messageData.text) {
        switch (messageData.messageType) {
          case 'image':
            messageData.text = '[Usuário enviou uma imagem]';
            break;
          case 'video':
            messageData.text = '[Usuário enviou um vídeo]';
            break;
          case 'audio':
            messageData.text = '[Usuário enviou um áudio]';
            break;
          case 'document':
            messageData.text = '[Usuário enviou um documento]';
            break;
          default:
            messageData.text = '[Mensagem especial recebida]';
        }
      }

      console.log(`✅ Webhook válido processado: ${messageId} de ${messageData.from} - Tipo: ${messageData.messageType}`);

      // 6. Retornar dados estruturados para processamento
      return {
        status: 'valid',
        messageId,
        from: messageData.from,
        text: messageData.text || '[Mensagem sem texto]',
        messageType: messageData.messageType,
        timestamp: messageData.timestamp,
        metadata: messageData.metadata
      };

    } catch (error) {
      console.error('❌ Erro no WebhookHandler:', error);
      console.error('❌ Dados que causaram erro:', JSON.stringify(data, null, 2));
      return { status: 'error', error: error.message };
    }
  }

  isFromBot(data) {
    // APENAS verificar o campo fromMe - mais confiável
    const possibleFromMeFields = [
      data?.data?.key?.fromMe,
      data?.key?.fromMe,
      data?.data?.fromMe,
      data?.fromMe,
      data?.message?.key?.fromMe,
      data?.message?.fromMe
    ];

    // Se qualquer campo fromMe for explicitamente true, é mensagem do bot
    const isFromMe = possibleFromMeFields.some(field => field === true);

    if (isFromMe) {
      console.log('🤖 Detectado fromMe=true - mensagem do bot');
      return true;
    }

    // Verificar apenas números específicos do bot (mais restritivo)
    const sender = this.extractSender(data);

    // APENAS verificar se é exatamente o número do bot
    if (sender === '558496791624') {
      console.log('🤖 Detectado número do bot como remetente');
      return true;
    }

    // Verificar status updates do WhatsApp
    if (sender && sender.includes('status@broadcast')) {
      console.log('🤖 Detectado status broadcast');
      return true;
    }

    // NÃO verificar conteúdo da mensagem para evitar falsos positivos
    return false;
  }

  extractTextFromData(data) {
    // Extrair texto para verificação rápida
    const messageContent = data?.data?.message || data?.message || data?.data || data;

    if (messageContent?.conversation) {
      return messageContent.conversation;
    } else if (messageContent?.extendedTextMessage?.text) {
      return messageContent.extendedTextMessage.text;
    } else if (messageContent?.text) {
      return messageContent.text;
    } else if (messageContent?.body) {
      return messageContent.body;
    }

    return '';
  }

  extractMessageId(data) {
    // Tentar diferentes estruturas de ID de mensagem
    const possibleIds = [
      data?.data?.key?.id,
      data?.key?.id,
      data?.data?.id,
      data?.id,
      data?.message?.key?.id,
      data?.message?.id
    ];

    const messageId = possibleIds.find(id => id);

    if (!messageId) {
      // Gerar ID baseado em timestamp e remetente
      const from = this.extractSender(data);
      const timestamp = Date.now();
      return from ? `${from}_${timestamp}` : `unknown_${timestamp}_${crypto.randomUUID().slice(0, 8)}`;
    }

    return messageId;
  }

  extractSender(data) {
    // Tentar diferentes estruturas de remetente
    const possibleSenders = [
      data?.data?.key?.remoteJid,
      data?.key?.remoteJid,
      data?.data?.from,
      data?.from,
      data?.message?.key?.remoteJid,
      data?.message?.from
    ];

    const sender = possibleSenders.find(s => s);

    if (sender) {
      // Limpar e padronizar número
      return sender.replace('@s.whatsapp.net', '').replace('@c.us', '');
    }

    return null;
  }

  extractMessageData(data) {
    const from = this.extractSender(data);

    // Extrair texto da mensagem
    let text = '';
    let messageType = 'text';

    // Diferentes estruturas de mensagem
    const messageContent = data?.data?.message || data?.message || data?.data || data;

    if (messageContent?.conversation) {
      text = messageContent.conversation;
    } else if (messageContent?.extendedTextMessage?.text) {
      text = messageContent.extendedTextMessage.text;
    } else if (messageContent?.text) {
      text = messageContent.text;
    } else if (messageContent?.body) {
      text = messageContent.body;
    } else if (messageContent?.imageMessage?.caption) {
      text = messageContent.imageMessage.caption;
      messageType = 'image';
    } else if (messageContent?.videoMessage?.caption) {
      text = messageContent.videoMessage.caption;
      messageType = 'video';
    } else if (messageContent?.audioMessage) {
      text = '[Áudio]';
      messageType = 'audio';
    } else if (messageContent?.documentMessage) {
      text = '[Documento]';
      messageType = 'document';
    }

    // Metadados
    const metadata = {
      originalData: data,
      timestamp: Date.now(),
      instanceId: data?.instance || 'unknown',
      messageType,
      hasMedia: ['image', 'video', 'audio', 'document'].includes(messageType)
    };

    return {
      from,
      text: text.trim(),
      messageType,
      timestamp: Date.now(),
      metadata
    };
  }

  isDuplicate(messageId) {
    if (this.processedMessages.has(messageId)) {
      return true;
    }

    // Verificar se está na fila de processamento
    if (this.processingQueue.has(messageId)) {
      return true;
    }

    return false;
  }

  markAsProcessed(messageId) {
    this.processedMessages.add(messageId);
    this.processingQueue.set(messageId, Date.now());

    // Limpar após expirar
    setTimeout(() => {
      this.processedMessages.delete(messageId);
      this.processingQueue.delete(messageId);
    }, this.MESSAGE_EXPIRY);
  }

  getStats() {
    return {
      totalMessages: this.totalMessages,
      duplicatesBlocked: this.duplicateCount,
      duplicateRate: this.totalMessages > 0 ? (this.duplicateCount / this.totalMessages * 100).toFixed(2) : 0,
      currentlyProcessing: this.processingQueue.size,
      recentMessages: this.processedMessages.size
    };
  }

  clearCache() {
    this.processedMessages.clear();
    this.processingQueue.clear();
    console.log('🧹 Cache do WebhookHandler limpo');
  }
}

// Instância singleton
const webhookHandler = new WebhookHandler();

export default webhookHandler;
// handlers/webhook_handler.js
// Sistema unificado de webhook com correção de detecção de bot

import crypto from 'crypto';

export class WebhookHandler {
  constructor() {
    this.processingQueue = new Map();
    this.processedMessages = new Set();
    this.MESSAGE_EXPIRY = 60000; // 1 minuto
    this.duplicateCount = 0;
    this.totalMessages = 0;
    // Número do bot (IMPORTANTE: sem sufixo para evitar confusão)
    this.BOT_NUMBER = '558492194616';
  }

  async handleWebhook(data) {
    this.totalMessages++;

    try {
      console.log('📍 WEBHOOK RECEBIDO - DEBUG:', JSON.stringify(data, null, 2));

      // 1. FILTRAR EVENTOS RELEVANTES - só processar mensagens reais
      if (!this.isMessageEvent(data)) {
        console.log(`📋 Evento ignorado: ${data.event || 'unknown'} - não é mensagem`);
        return { status: 'ignored', reason: 'non_message_event', event: data.event };
      }

      // 2. VERIFICAR SE É MENSAGEM DO PRÓPRIO BOT (CRÍTICO - EVITA LOOP INFINITO)
      if (this.isFromBot(data)) {
        console.log('🤖 Mensagem do bot ignorada - prevenindo loop infinito');
        return { status: 'ignored', reason: 'from_bot' };
      }

      // 3. Extrair ID único da mensagem
      const messageId = this.extractMessageId(data);

      if (!messageId) {
        console.log('⚠️ Webhook sem ID válido ignorado');
        return { status: 'invalid', reason: 'no_message_id' };
      }

      // 4. Verificar duplicação
      if (this.isDuplicate(messageId)) {
        this.duplicateCount++;
        console.log(`⚠️ Mensagem duplicada ignorada: ${messageId} (Total: ${this.duplicateCount})`);
        return { status: 'duplicate', messageId, duplicateCount: this.duplicateCount };
      }

      // 5. Marcar como processada
      this.markAsProcessed(messageId);

      // 6. Extrair dados da mensagem
      const messageData = this.extractMessageData(data);
      console.log('📊 DADOS EXTRAÍDOS:', JSON.stringify(messageData, null, 2));

      // VALIDAÇÃO MAIS FLEXÍVEL - aceitar mensagens vazias ou especiais
      if (!messageData.from) {
        console.log('⚠️ Mensagem sem remetente válido ignorada');
        return { status: 'invalid', reason: 'no_sender' };
      }

      // Aceitar mensagens mesmo sem texto (pode ser mídia, status, etc.)
      if (!messageData.text && !['image', 'video', 'audio', 'document'].includes(messageData.messageType)) {
        // Atribuir texto padrão para mensagens sem conteúdo
        messageData.text = '[Mensagem sem texto]';
      }

      console.log(`✅ Webhook válido processado: ${messageId} de ${messageData.from} - Tipo: ${messageData.messageType}`);

      // 7. Retornar dados estruturados para processamento
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
    // 1. PRIMEIRO: Verificar campo fromMe (mais confiável)
    const possibleFromMeFields = [
      data?.data?.key?.fromMe,
      data?.key?.fromMe,
      data?.data?.fromMe,
      data?.fromMe,
      data?.message?.key?.fromMe,
      data?.message?.fromMe
    ];

    // Se qualquer campo fromMe for TRUE, é mensagem do bot
    const isFromMe = possibleFromMeFields.some(field => field === true);
    
    if (isFromMe) {
      console.log('🔍 Detecção: fromMe=true, é mensagem do bot');
      return true;
    }

    // 2. SEGUNDO: Verificar se é status broadcast (não é mensagem real)
    const sender = this.extractSender(data);
    if (sender === 'status@broadcast') {
      console.log('🔍 Detecção: status broadcast, ignorando');
      return true;
    }

    // 3. TERCEIRO: Verificar se o REMETENTE é o bot (não o destinatário!)
    // CORREÇÃO CRÍTICA: Apenas verificar se o FROM é o número do bot
    const messageFrom = this.extractActualSender(data);
    
    if (messageFrom && messageFrom.includes(this.BOT_NUMBER)) {
      console.log(`🔍 Detecção: mensagem FROM ${messageFrom} é do próprio bot`);
      return true;
    }

    // 4. NÃO verificar frases no conteúdo - isso impede respostas legítimas!
    // REMOVIDO: verificação de botIndicators no texto da mensagem

    console.log(`✅ Mensagem de usuário válida: ${sender}`);
    return false;
  }

  extractActualSender(data) {
    // Extrair quem ENVIOU a mensagem (não o destinatário)
    // Estrutura típica Evolution API: data.data.key.participant ou data.data.key.remoteJid
    
    // Para mensagens em grupo, participant é o remetente real
    const participant = data?.data?.key?.participant || data?.key?.participant;
    if (participant) {
      return participant.replace('@s.whatsapp.net', '').replace('@c.us', '');
    }
    
    // Para mensagens diretas, remoteJid pode ser o remetente (se fromMe=false)
    const isFromMe = data?.data?.key?.fromMe || data?.key?.fromMe;
    if (!isFromMe) {
      const remoteJid = data?.data?.key?.remoteJid || data?.key?.remoteJid;
      if (remoteJid) {
        return remoteJid.replace('@s.whatsapp.net', '').replace('@c.us', '');
      }
    }
    
    return null;
  }

  extractSender(data) {
    // Extrair o remetente ou destinatário conforme contexto
    const possibleSenders = [
      data?.data?.key?.remoteJid,
      data?.key?.remoteJid,
      data?.data?.key?.participant, // Em grupos
      data?.key?.participant,
      data?.data?.from,
      data?.from,
      data?.message?.key?.remoteJid,
      data?.message?.from
    ];

    const sender = possibleSenders.find(s => s && typeof s === 'string');

    if (sender) {
      // Limpar e padronizar número
      return sender.replace('@s.whatsapp.net', '').replace('@c.us', '').replace('@g.us', '');
    }

    return null;
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

    const messageId = possibleIds.find(id => id && typeof id === 'string');

    if (!messageId) {
      // Gerar ID baseado em timestamp e remetente
      const from = this.extractSender(data);
      const timestamp = Date.now();
      return from ? 
        `${from}_${timestamp}` : 
        `unknown_${timestamp}_${crypto.randomUUID().slice(0, 8)}`;
    }

    return messageId;
  }

  extractMessageData(data) {
    const from = this.extractSender(data);

    // Extrair texto da mensagem
    let text = '';
    let messageType = 'text';

    // Diferentes estruturas de mensagem
    const messageContent = data?.data?.message || data?.message || data?.data || data;

    // Inicializar metadados PRIMEIRO (CORRIGIDO)
    const metadata = {
      originalData: data,
      timestamp: Date.now(),
      instanceId: data?.instance || 'unknown',
      messageType: 'text', // será atualizado conforme necessário
      hasMedia: false // será atualizado conforme necessário
    };

    if (messageContent?.conversation) {
      text = messageContent.conversation;
    } else if (messageContent?.extendedTextMessage?.text) {
      text = messageContent.extendedTextMessage.text;
    } else if (messageContent?.text) {
      text = messageContent.text;
    } else if (messageContent?.body) {
      text = messageContent.body;
    } else if (messageContent?.imageMessage?.caption) {
      text = messageContent.imageMessage.caption || '[Imagem]';
      messageType = 'image';
    } else if (messageContent?.videoMessage?.caption) {
      text = messageContent.videoMessage.caption || '[Vídeo]';
      messageType = 'video';
    } else if (messageContent?.audioMessage) {
      // 🚀 PROCESSAMENTO INTELIGENTE DE ÁUDIO
      text = '[Áudio - Processando transcrição...]';
      messageType = 'audio';

      // Marcar para processamento assíncrono posterior
      metadata.needsTranscription = true;
      metadata.audioData = messageContent.audioMessage;
    } else if (messageContent?.documentMessage) {
      text = '[Documento]';
      messageType = 'document';
    } else if (messageContent?.stickerMessage) {
      text = '[Sticker]';
      messageType = 'sticker';
    } else if (messageContent?.locationMessage) {
      text = '[Localização]';
      messageType = 'location';
    } else if (messageContent?.contactMessage) {
      text = '[Contato]';
      messageType = 'contact';
    }

    // Atualizar metadados finais (CORRIGIDO)
    metadata.messageType = messageType;
    metadata.hasMedia = ['image', 'video', 'audio', 'document', 'sticker'].includes(messageType);

    return {
      from,
      text: text ? text.trim() : '',
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
      duplicateRate: this.totalMessages > 0 ? 
        (this.duplicateCount / this.totalMessages * 100).toFixed(2) : 0,
      currentlyProcessing: this.processingQueue.size,
      recentMessages: this.processedMessages.size
    };
  }

  /**
   * Verifica se o evento é relacionado a mensagens
   */
  isMessageEvent(data) {
    const event = data?.event;

    // Eventos que DEVEM ser ignorados (não são mensagens)
    const ignoredEvents = [
      'presence.update',
      'contacts.update',
      'chats.update',
      'connection.update',
      'call.offer',
      'call.accept',
      'call.end',
      'groups.upsert',
      'group-participants.update'
    ];

    // Se não tem evento, assumir que é mensagem (fallback para formatos antigos)
    if (!event) {
      console.log('📋 Evento sem tipo - assumindo mensagem (formato legado)');
      return true;
    }

    // Se está na lista de ignorados, rejeitar
    if (ignoredEvents.includes(event)) {
      console.log(`📋 Evento ${event} ignorado - não é mensagem`);
      return false;
    }

    // ACEITAR TODOS OS OUTROS EVENTOS (approach mais inclusivo)
    console.log(`📋 Evento ${event} aceito - processando como mensagem`);
    return true;
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

// src/tools/message_polling.js
import fetch from 'node-fetch';
import { processIncomingMessage } from './conversation_manager.js';
import dotenv from 'dotenv';

dotenv.config();

const EVOLUTION_BASE_URL = process.env.EVOLUTION_BASE_URL || 'http://localhost:8080';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || 'digitalboosst';

let lastProcessedMessageId = null;
let isPolling = false;

/**
 * Verifica mensagens recentes na Evolution API
 * @returns {Promise<array>} Mensagens encontradas
 */
export async function checkForNewMessages() {
  try {
    if (!EVOLUTION_API_KEY) {
      throw new Error('EVOLUTION_API_KEY não configurada');
    }

    // Buscar mensagens recentes - usar endpoint correto
    const response = await fetch(
      `${EVOLUTION_BASE_URL}/chat/findMessages/${EVOLUTION_INSTANCE}`, 
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_KEY
        },
        body: JSON.stringify({
          where: {
            "key.fromMe": false
          },
          limit: 10
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Evolution API erro: ${response.status}`);
    }

    const result = await response.json();
    console.log(`🔍 Debug API response:`, result);
    
    // A Evolution API retorna formato: {messages: {records: []}}
    const messages = result.messages?.records || result.records || [];
    console.log(`🔍 Encontradas ${Array.isArray(messages) ? messages.length : 'não é array'} mensagens recentes`);
    
    // Garantir que sempre retornamos array
    return Array.isArray(messages) ? messages : [];
    
  } catch (error) {
    console.error('❌ Erro ao verificar mensagens:', error);
    return [];
  }
}

/**
 * Processa mensagens não processadas
 * @param {array} messages - Array de mensagens
 * @returns {Promise<number>} Número de mensagens processadas
 */
export async function processNewMessages(messages) {
  let processedCount = 0;
  
  for (const msg of messages) {
    try {
      // Verificar se é uma mensagem de texto não processada
      if (msg.message?.conversation && 
          !msg.key?.fromMe && 
          msg.messageTimestamp) {
        
        const messageId = msg.key?.id;
        const messageText = msg.message.conversation;
        const senderNumber = msg.key?.remoteJid;
        const timestamp = msg.messageTimestamp;
        
        // Verificar se já processamos esta mensagem
        if (messageId === lastProcessedMessageId) {
          continue;
        }
        
        // Verificar se a mensagem é recente (últimos 5 minutos)
        const now = Math.floor(Date.now() / 1000);
        if (now - timestamp > 300) { // 5 minutos
          continue;
        }
        
        console.log(`📥 Processando nova mensagem de ${senderNumber}: ${messageText}`);
        
        // Processar mensagem
        await processIncomingMessage(senderNumber, messageText, 'text');
        
        lastProcessedMessageId = messageId;
        processedCount++;
        
        // Aguardar um pouco entre mensagens
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
    } catch (error) {
      console.error('❌ Erro ao processar mensagem:', error);
    }
  }
  
  if (processedCount > 0) {
    console.log(`✅ ${processedCount} mensagens processadas`);
  }
  
  return processedCount;
}

/**
 * Inicia polling de mensagens
 * @param {number} intervalMs - Intervalo em milissegundos
 */
export function startMessagePolling(intervalMs = 10000) {
  if (isPolling) {
    console.log('⚠️ Polling já está ativo');
    return;
  }
  
  console.log(`🔄 Iniciando polling de mensagens (${intervalMs}ms)`);
  isPolling = true;
  
  const pollMessages = async () => {
    if (!isPolling) return;
    
    try {
      const messages = await checkForNewMessages();
      await processNewMessages(messages);
    } catch (error) {
      console.error('❌ Erro no polling:', error);
    }
    
    // Próximo polling
    setTimeout(pollMessages, intervalMs);
  };
  
  // Iniciar imediatamente
  pollMessages();
}

/**
 * Para o polling de mensagens
 */
export function stopMessagePolling() {
  console.log('⏹️ Parando polling de mensagens');
  isPolling = false;
}

/**
 * Verifica status do polling
 * @returns {boolean} Se está ativo
 */
export function isPollingActive() {
  return isPolling;
}
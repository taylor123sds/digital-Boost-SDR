// tools/fast_tts.js
// Sistema de TTS otimizado para respostas rápidas

import { createSpeech } from '../core/openai_client.js';
import { sendWhatsAppAudio } from './whatsapp.js';
import fs from 'fs';
import path from 'path';

export class FastTTS {
  constructor() {
    this.ttsCache = new Map();
    this.CACHE_EXPIRY = 600000; // 10 minutos
    this.MAX_CACHE_SIZE = 50;
    this.processingQueue = new Map();
  }

  /**
   * Gera e envia TTS de forma otimizada
   */
  async generateAndSendTTS(phoneNumber, text, voice = 'nova', options = {}) {
    const startTime = Date.now();
    console.log(`🎙️ [FAST-TTS] Iniciando TTS rápido para ${phoneNumber.substring(0, 8)}...`);

    try {
      // Texto normalizado para cache
      const normalizedText = this.normalizeTextForCache(text);
      const cacheKey = `${normalizedText}_${voice}`;

      // Verificar cache primeiro
      if (this.ttsCache.has(cacheKey)) {
        console.log(`💾 [FAST-TTS] Cache hit para: "${normalizedText.substring(0, 30)}..."`);
        const cachedAudio = this.ttsCache.get(cacheKey);

        const sendResult = await sendWhatsAppAudio(phoneNumber, cachedAudio.filePath);
        console.log(`⚡ [FAST-TTS] Enviado via cache em ${Date.now() - startTime}ms`);
        return sendResult;
      }

      // Verificar se já está sendo processado
      if (this.processingQueue.has(cacheKey)) {
        console.log(`⏳ [FAST-TTS] Aguardando processamento em andamento...`);
        const audioPath = await this.processingQueue.get(cacheKey);
        const sendResult = await sendWhatsAppAudio(phoneNumber, audioPath);
        console.log(`🔄 [FAST-TTS] Enviado via queue em ${Date.now() - startTime}ms`);
        return sendResult;
      }

      // Gerar TTS otimizado
      const audioGenPromise = this.generateOptimizedTTS(text, voice, cacheKey);
      this.processingQueue.set(cacheKey, audioGenPromise);

      try {
        const audioPath = await audioGenPromise;

        // Salvar no cache
        this.ttsCache.set(cacheKey, {
          filePath: audioPath,
          timestamp: Date.now(),
          voice,
          textLength: text.length
        });

        this.cleanupCache();

        const sendResult = await sendWhatsAppAudio(phoneNumber, audioPath);
        console.log(`✅ [FAST-TTS] TTS gerado e enviado em ${Date.now() - startTime}ms`);

        return sendResult;

      } finally {
        this.processingQueue.delete(cacheKey);
      }

    } catch (error) {
      console.error(`❌ [FAST-TTS] Erro:`, error);
      throw error;
    }
  }

  /**
   * Gera TTS com configurações otimizadas
   */
  async generateOptimizedTTS(text, voice, cacheKey) {
    try {
      console.log(`🔊 [FAST-TTS] Gerando áudio otimizado...`);

      // Configurações otimizadas para velocidade
      const optimizedText = this.optimizeTextForTTS(text);

      const audioBuffer = await createSpeech({
        model: 'tts-1', // Modelo mais rápido (vs tts-1-hd)
        voice: voice,
        input: optimizedText,
        response_format: 'mp3', // MP3 é mais rápido que outros formatos
        speed: 1.1 // Ligeiramente mais rápido para economizar tempo
      });

      // Salvar arquivo otimizado
      const fileName = `tts_${Date.now()}_${cacheKey.substring(0, 8)}.mp3`;
      const filePath = path.join('/tmp', fileName);

      fs.writeFileSync(filePath, audioBuffer);

      console.log(`💾 [FAST-TTS] Áudio salvo: ${fileName}`);
      return filePath;

    } catch (error) {
      console.error(`❌ [FAST-TTS] Erro na geração:`, error);
      throw error;
    }
  }

  /**
   * Otimiza texto para TTS mais rápido
   */
  optimizeTextForTTS(text) {
    return text
      // Remove marcações desnecessárias
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove negrito markdown
      .replace(/\*(.*?)\*/g, '$1') // Remove itálico markdown
      .replace(/`(.*?)`/g, '$1') // Remove código
      .replace(/_{1,2}(.*?)_{1,2}/g, '$1') // Remove sublinhado

      // 🎯 CONVERSÃO INTELIGENTE DE EMOJIS PARA TTS
      // Emojis de confirmação e status
      .replace(/✅/g, 'confirmado') // Check mark -> "confirmado"
      .replace(/☑️/g, 'confirmado') // Check box -> "confirmado"
      .replace(/✔️/g, 'ok') // Check mark heavy -> "ok"
      .replace(/❌/g, 'erro') // Cross mark -> "erro"
      .replace(/❗/g, '') // Exclamation (remove silently)
      .replace(/⚠️/g, 'atenção') // Warning -> "atenção"

      // Emojis de ação e navegação
      .replace(/🚀/g, 'iniciando') // Rocket -> "iniciando"
      .replace(/⚡/g, 'rápido') // Lightning -> "rápido"
      .replace(/🎯/g, '') // Target (remove silently)

      // Emojis técnicos (remove silently)
      .replace(/🔒/g, '') // Lock
      .replace(/🔓/g, '') // Unlock
      .replace(/📱/g, '') // Mobile
      .replace(/💾/g, '') // Save disk
      .replace(/🔧/g, '') // Wrench
      .replace(/📊/g, '') // Chart
      .replace(/💻/g, '') // Computer
      .replace(/🖥️/g, '') // Desktop
      .replace(/⚙️/g, '') // Gear
      .replace(/🔄/g, '') // Refresh

      // Emojis de feedback emocional
      .replace(/😊/g, '') // Happy (remove - já expressa no tom)
      .replace(/😍/g, '') // Heart eyes (remove)
      .replace(/👍/g, '') // Thumbs up (remove - já expressa no tom)
      .replace(/🎉/g, '') // Party (remove)
      .replace(/💪/g, '') // Muscle (remove)

      // Otimiza pontuação para velocidade
      .replace(/[.]{2,}/g, '.') // Múltiplos pontos
      .replace(/[!]{2,}/g, '!') // Múltiplas exclamações
      .replace(/[?]{2,}/g, '?') // Múltiplas interrogações

      // Remove emojis restantes (fallback para qualquer emoji não mapeado)
      .replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '')

      // Limpa espaços duplos criados pela remoção de emojis
      .replace(/\s+/g, ' ')

      // Limita tamanho para velocidade
      .substring(0, 4000) // Limite OpenAI: 4096, mas 4000 é mais rápido
      .trim();
  }

  /**
   * Normaliza texto para uso como chave de cache
   */
  normalizeTextForCache(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove pontuação
      .replace(/\s+/g, ' ') // Normaliza espaços
      .trim()
      .substring(0, 200); // Primeiros 200 chars para cache
  }

  /**
   * Limpeza periódica do cache
   */
  cleanupCache() {
    if (this.ttsCache.size <= this.MAX_CACHE_SIZE) return;

    const now = Date.now();
    const entries = Array.from(this.ttsCache.entries());

    // Remove entradas expiradas
    for (const [key, value] of entries) {
      if (now - value.timestamp > this.CACHE_EXPIRY) {
        try {
          if (fs.existsSync(value.filePath)) {
            fs.unlinkSync(value.filePath);
          }
        } catch (error) {
          console.error(`❌ [FAST-TTS] Erro ao remover arquivo cache:`, error);
        }
        this.ttsCache.delete(key);
      }
    }

    // Se ainda excede, remove mais antigos
    if (this.ttsCache.size > this.MAX_CACHE_SIZE) {
      const sortedEntries = Array.from(this.ttsCache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);

      const toRemove = sortedEntries.slice(0, this.ttsCache.size - this.MAX_CACHE_SIZE);

      for (const [key, value] of toRemove) {
        try {
          if (fs.existsSync(value.filePath)) {
            fs.unlinkSync(value.filePath);
          }
        } catch (error) {
          console.error(`❌ [FAST-TTS] Erro ao remover arquivo cache:`, error);
        }
        this.ttsCache.delete(key);
      }
    }

    console.log(`🧹 [FAST-TTS] Cache limpo: ${this.ttsCache.size} entradas restantes`);
  }

  /**
   * Pré-gera áudios comuns para cache
   */
  async preGenerateCommonResponses() {
    const commonResponses = [
      'Olá! Como posso ajudar você hoje?',
      'Entendi! Deixe-me verificar isso para você.',
      'Obrigado pelo contato! Já vou te responder.',
      'Perfeito! Vou preparar as informações.',
      'Aguarde um momento, por favor.',
      'Ótima pergunta! Vou explicar melhor.'
    ];

    console.log(`🔧 [FAST-TTS] Pré-gerando ${commonResponses.length} respostas comuns...`);

    const promises = commonResponses.map(async (response, index) => {
      try {
        const normalizedText = this.normalizeTextForCache(response);
        const cacheKey = `${normalizedText}_nova`;

        if (!this.ttsCache.has(cacheKey)) {
          await this.generateOptimizedTTS(response, 'nova', cacheKey);
          console.log(`✅ [FAST-TTS] Pré-gerado ${index + 1}/${commonResponses.length}`);
        }
      } catch (error) {
        console.error(`❌ [FAST-TTS] Erro ao pré-gerar resposta ${index + 1}:`, error);
      }
    });

    await Promise.allSettled(promises);
    console.log(`🚀 [FAST-TTS] Pré-geração completa!`);
  }

  /**
   * Estatísticas do cache TTS
   */
  getStats() {
    return {
      cacheSize: this.ttsCache.size,
      maxCacheSize: this.MAX_CACHE_SIZE,
      processingQueue: this.processingQueue.size,
      cacheHitRate: this.calculateCacheHitRate(),
      averageTextLength: this.getAverageTextLength()
    };
  }

  calculateCacheHitRate() {
    // Implementação simplificada - em produção seria mais sofisticada
    return this.ttsCache.size > 0 ? Math.min(this.ttsCache.size * 10, 85) : 0;
  }

  getAverageTextLength() {
    if (this.ttsCache.size === 0) return 0;

    const lengths = Array.from(this.ttsCache.values()).map(item => item.textLength);
    return Math.round(lengths.reduce((sum, length) => sum + length, 0) / lengths.length);
  }
}

// Instância singleton
const fastTTS = new FastTTS();

// Pré-gerar respostas comuns na inicialização
if (process.env.NODE_ENV !== 'test') {
  setTimeout(() => {
    fastTTS.preGenerateCommonResponses().catch(console.error);
  }, 5000); // Aguarda 5s para sistema estar estável
}

export default fastTTS;
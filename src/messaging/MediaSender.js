// messaging/MediaSender.js
//  MEDIA SENDER UNIFICADO - TTS, Imagens e Documentos

/**
 * MediaSender - Sistema unificado de envio de mídia via WhatsApp
 *
 * RESPONSABILIDADES:
 * 1. Enviar áudios (TTS via ElevenLabs ou OpenAI)
 * 2. Enviar imagens (URL ou base64)
 * 3. Enviar documentos (PDF, etc)
 * 4. Cache de áudios gerados
 * 5. Fallback entre provedores
 *
 * INTEGRAÇÃO:
 * - Usa Evolution API para envio WhatsApp
 * - Integra com ElevenLabs para TTS premium
 * - Fallback para OpenAI TTS se ElevenLabs falhar
 */

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurações
const EVOLUTION_BASE_URL = process.env.EVOLUTION_BASE_URL || 'http://localhost:8080';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || 'digitalboost';

// Diretórios
const AUDIO_DIR = path.join(__dirname, '../../audio');
const UPLOADS_DIR = path.join(__dirname, '../../uploads');

// Garantir diretórios existem
[AUDIO_DIR, UPLOADS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Cache de áudios TTS
const audioCache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 horas

// Singleton
let instance = null;

export class MediaSender {
  constructor() {
    if (instance) {
      return instance;
    }
    instance = this;

    this.elevenLabsClient = null;
    this.openaiClient = null;

    this._initClients();
    console.log(' [MediaSender] Inicializado');
  }

  async _initClients() {
    // ElevenLabs
    if (process.env.ELEVENLABS_API_KEY) {
      try {
        const { ElevenLabsClient } = await import('@elevenlabs/elevenlabs-js');
        this.elevenLabsClient = new ElevenLabsClient({
          apiKey: process.env.ELEVENLABS_API_KEY
        });
        console.log(' [MediaSender] ElevenLabs Client inicializado');
      } catch (error) {
        console.warn(' [MediaSender] ElevenLabs não disponível:', error.message);
      }
    }

    // OpenAI (fallback TTS)
    if (process.env.OPENAI_API_KEY) {
      try {
        const OpenAI = (await import('openai')).default;
        this.openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        console.log(' [MediaSender] OpenAI Client inicializado (TTS fallback)');
      } catch (error) {
        console.warn(' [MediaSender] OpenAI não disponível:', error.message);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  TTS - TEXT TO SPEECH
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Gera áudio TTS e envia via WhatsApp
   * @param {string} number - Número do destinatário
   * @param {string} text - Texto para converter em áudio
   * @param {Object} options - Opções de configuração
   * @returns {Promise<Object>} Resultado do envio
   */
  async sendTTS(number, text, options = {}) {
    const {
      voiceId = '21m00Tcm4TlvDq8ikWAM', // Rachel - voz feminina natural
      provider = 'elevenlabs', // elevenlabs | openai
      cache = true
    } = options;

    try {
      console.log(` [MediaSender] Gerando TTS para ${number} (${text.length} chars)`);

      // Verificar cache
      const cacheKey = `${text.substring(0, 50)}_${voiceId}`;
      if (cache && audioCache.has(cacheKey)) {
        const cached = audioCache.get(cacheKey);
        if (Date.now() - cached.timestamp < CACHE_TTL) {
          console.log(' [MediaSender] Usando áudio em cache');
          return await this._sendAudioBuffer(number, cached.buffer, text);
        }
      }

      // Gerar áudio
      let audioBuffer;

      if (provider === 'elevenlabs' && this.elevenLabsClient) {
        audioBuffer = await this._generateElevenLabsTTS(text, voiceId);
      } else if (this.openaiClient) {
        audioBuffer = await this._generateOpenAITTS(text);
      } else {
        throw new Error('Nenhum provedor de TTS disponível');
      }

      // Cache
      if (cache) {
        audioCache.set(cacheKey, {
          buffer: audioBuffer,
          timestamp: Date.now()
        });
      }

      // Enviar
      return await this._sendAudioBuffer(number, audioBuffer, text);

    } catch (error) {
      console.error(' [MediaSender] Erro no TTS:', error.message);

      // Fallback: enviar como texto
      return {
        success: false,
        error: error.message,
        fallback: 'text'
      };
    }
  }

  async _generateElevenLabsTTS(text, voiceId) {
    const audio = await this.elevenLabsClient.textToSpeech.convert(voiceId, {
      text: text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.8
      }
    });

    const chunks = [];
    for await (const chunk of audio) {
      chunks.push(chunk);
    }

    return Buffer.concat(chunks);
  }

  async _generateOpenAITTS(text) {
    const response = await this.openaiClient.audio.speech.create({
      model: 'tts-1',
      voice: 'nova', // Voz feminina natural
      input: text,
      response_format: 'mp3'
    });

    const buffer = Buffer.from(await response.arrayBuffer());
    return buffer;
  }

  async _sendAudioBuffer(number, buffer, caption = '') {
    const base64Audio = buffer.toString('base64');

    const response = await fetch(`${EVOLUTION_BASE_URL}/message/sendWhatsAppAudio/${EVOLUTION_INSTANCE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY
      },
      body: JSON.stringify({
        number: this._formatNumber(number),
        audio: base64Audio,
        encoding: true // PTT (Push To Talk) style
      })
    });

    if (!response.ok) {
      // Tentar endpoint alternativo
      const altResponse = await fetch(`${EVOLUTION_BASE_URL}/message/sendMedia/${EVOLUTION_INSTANCE}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_KEY
        },
        body: JSON.stringify({
          number: this._formatNumber(number),
          mediatype: 'audio',
          media: base64Audio,
          mimetype: 'audio/mpeg',
          caption: caption
        })
      });

      if (!altResponse.ok) {
        throw new Error(`Falha ao enviar áudio: ${response.status}`);
      }

      return await altResponse.json();
    }

    console.log(' [MediaSender] Áudio enviado com sucesso');
    return await response.json();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  IMAGENS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Envia imagem via WhatsApp
   * @param {string} number - Número do destinatário
   * @param {string} imageSource - URL ou caminho do arquivo
   * @param {Object} options - Opções (caption, etc)
   * @returns {Promise<Object>} Resultado do envio
   */
  async sendImage(number, imageSource, options = {}) {
    const { caption = '' } = options;

    try {
      console.log(` [MediaSender] Enviando imagem para ${number}`);

      let imageData;
      let mimetype = 'image/jpeg';

      // Detectar tipo de source
      if (imageSource.startsWith('http://') || imageSource.startsWith('https://')) {
        // URL externa
        imageData = imageSource;
      } else if (imageSource.startsWith('data:image')) {
        // Base64 com header
        const matches = imageSource.match(/data:([^;]+);base64,(.+)/);
        if (matches) {
          mimetype = matches[1];
          imageData = matches[2];
        }
      } else if (fs.existsSync(imageSource)) {
        // Arquivo local
        imageData = fs.readFileSync(imageSource).toString('base64');
        mimetype = this._getMimeType(imageSource);
      } else {
        // Assumir base64 puro
        imageData = imageSource;
      }

      // Enviar via Evolution API
      const response = await fetch(`${EVOLUTION_BASE_URL}/message/sendMedia/${EVOLUTION_INSTANCE}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_KEY
        },
        body: JSON.stringify({
          number: this._formatNumber(number),
          mediatype: 'image',
          media: imageData,
          mimetype: mimetype,
          caption: caption
        })
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Falha ao enviar imagem: ${response.status} - ${errorBody}`);
      }

      console.log(' [MediaSender] Imagem enviada com sucesso');
      return await response.json();

    } catch (error) {
      console.error(' [MediaSender] Erro ao enviar imagem:', error.message);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  DOCUMENTOS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Envia documento via WhatsApp
   * @param {string} number - Número do destinatário
   * @param {string} documentSource - URL ou caminho do arquivo
   * @param {Object} options - Opções (filename, caption)
   * @returns {Promise<Object>} Resultado do envio
   */
  async sendDocument(number, documentSource, options = {}) {
    const {
      filename = 'documento.pdf',
      caption = ''
    } = options;

    try {
      console.log(` [MediaSender] Enviando documento para ${number}: ${filename}`);

      let documentData;
      let mimetype = this._getMimeType(filename);

      // Detectar tipo de source
      if (documentSource.startsWith('http://') || documentSource.startsWith('https://')) {
        // URL externa - baixar primeiro
        const response = await fetch(documentSource);
        const buffer = await response.buffer();
        documentData = buffer.toString('base64');
      } else if (fs.existsSync(documentSource)) {
        // Arquivo local
        documentData = fs.readFileSync(documentSource).toString('base64');
        mimetype = this._getMimeType(documentSource);
      } else {
        // Assumir base64 puro
        documentData = documentSource;
      }

      // Enviar via Evolution API
      const response = await fetch(`${EVOLUTION_BASE_URL}/message/sendMedia/${EVOLUTION_INSTANCE}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_KEY
        },
        body: JSON.stringify({
          number: this._formatNumber(number),
          mediatype: 'document',
          media: documentData,
          mimetype: mimetype,
          fileName: filename,
          caption: caption
        })
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Falha ao enviar documento: ${response.status} - ${errorBody}`);
      }

      console.log(' [MediaSender] Documento enviado com sucesso');
      return await response.json();

    } catch (error) {
      console.error(' [MediaSender] Erro ao enviar documento:', error.message);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  VÍDEO (placeholder para futuro)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Envia vídeo via WhatsApp
   * @param {string} number - Número do destinatário
   * @param {string} videoSource - URL ou caminho do arquivo
   * @param {Object} options - Opções
   * @returns {Promise<Object>} Resultado do envio
   */
  async sendVideo(number, videoSource, options = {}) {
    const { caption = '' } = options;

    try {
      console.log(` [MediaSender] Enviando vídeo para ${number}`);

      let videoData;

      if (videoSource.startsWith('http://') || videoSource.startsWith('https://')) {
        videoData = videoSource; // URL direta
      } else if (fs.existsSync(videoSource)) {
        videoData = fs.readFileSync(videoSource).toString('base64');
      } else {
        videoData = videoSource;
      }

      const response = await fetch(`${EVOLUTION_BASE_URL}/message/sendMedia/${EVOLUTION_INSTANCE}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_KEY
        },
        body: JSON.stringify({
          number: this._formatNumber(number),
          mediatype: 'video',
          media: videoData,
          mimetype: 'video/mp4',
          caption: caption
        })
      });

      if (!response.ok) {
        throw new Error(`Falha ao enviar vídeo: ${response.status}`);
      }

      console.log(' [MediaSender] Vídeo enviado com sucesso');
      return await response.json();

    } catch (error) {
      console.error(' [MediaSender] Erro ao enviar vídeo:', error.message);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  UTILITÁRIOS
  // ═══════════════════════════════════════════════════════════════════════════

  _formatNumber(number) {
    return number.toString()
      .replace('@s.whatsapp.net', '')
      .replace('@c.us', '')
      .replace(/\D/g, '');
  }

  _getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.mp3': 'audio/mpeg',
      '.ogg': 'audio/ogg',
      '.mp4': 'video/mp4',
      '.txt': 'text/plain'
    };

    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Salva áudio em arquivo para reutilização
   * @param {Buffer} buffer - Buffer do áudio
   * @param {string} filename - Nome do arquivo
   * @returns {string} Caminho do arquivo salvo
   */
  saveAudioToFile(buffer, filename) {
    const filePath = path.join(AUDIO_DIR, filename);
    fs.writeFileSync(filePath, buffer);
    console.log(` [MediaSender] Áudio salvo: ${filePath}`);
    return filePath;
  }

  /**
   * Limpa cache de áudios
   */
  clearAudioCache() {
    audioCache.clear();
    console.log(' [MediaSender] Cache de áudio limpo');
  }

  /**
   * Retorna estatísticas do cache
   */
  getCacheStats() {
    return {
      audioCount: audioCache.size,
      audioCacheDir: AUDIO_DIR,
      uploadsDir: UPLOADS_DIR
    };
  }
}

// Singleton getter
export function getMediaSender() {
  if (!instance) {
    instance = new MediaSender();
  }
  return instance;
}

export default MediaSender;

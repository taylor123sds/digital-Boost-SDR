/**
 * @file MeetingTranscriptionService.js
 * @description Service para buscar transcrições automáticas do Google Meet via Google Drive API
 * @architecture Layer: Service Layer - External API Integration
 *
 * IMPORTANTE: Este serviço APENAS LÊ transcrições já criadas pelo Google Meet.
 * Não faz gravação de áudio ou transcrição própria.
 *
 * Como funciona:
 * 1. Google Meet com transcrição ativada cria automaticamente um Google Doc
 * 2. Este serviço usa Google Drive API para buscar esse documento
 * 3. Lê o conteúdo do Google Doc e salva no banco
 * 4. MeetingAnalysisService processa o texto depois
 */

import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

/**
 * MeetingTranscriptionService
 * Responsável por:
 * - Autenticar com Google Drive API
 * - Buscar documentos de transcrição do Google Meet
 * - Ler conteúdo dos Google Docs
 * - Extrair metadados (participantes, duração, etc.)
 */
class MeetingTranscriptionService {
  constructor() {
    this.auth = null;
    this.drive = null;
    this.docs = null;
    this.calendar = null;
  }

  /**
   * Inicializa autenticação com Google APIs
   * Usa Service Account ou OAuth2 dependendo da configuração
   */
  async initialize() {
    try {
      // Opção 1: Service Account (recomendado para servidor)
      if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
        const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
        this.auth = new google.auth.GoogleAuth({
          credentials,
          scopes: [
            'https://www.googleapis.com/auth/drive.readonly',
            'https://www.googleapis.com/auth/documents.readonly',
            'https://www.googleapis.com/auth/calendar.readonly'
          ]
        });
      }
      // Opção 2: OAuth2 (requer fluxo de autorização)
      else if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
        const oauth2Client = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET,
          process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/auth/google/callback'
        );

        // Se já temos refresh token, usar
        if (process.env.GOOGLE_REFRESH_TOKEN) {
          oauth2Client.setCredentials({
            refresh_token: process.env.GOOGLE_REFRESH_TOKEN
          });
        }

        this.auth = oauth2Client;
      } else {
        throw new Error('Google API credentials not configured. Set GOOGLE_SERVICE_ACCOUNT_KEY or GOOGLE_CLIENT_ID/SECRET');
      }

      // Inicializar APIs
      this.drive = google.drive({ version: 'v3', auth: this.auth });
      this.docs = google.docs({ version: 'v1', auth: this.auth });
      this.calendar = google.calendar({ version: 'v3', auth: this.auth });

      console.log(' [MEETING-TRANSCRIPTION] Google APIs initialized');
      return true;
    } catch (error) {
      console.error(' [MEETING-TRANSCRIPTION] Failed to initialize Google APIs:', error.message);
      throw error;
    }
  }

  /**
   * Busca transcrições do Google Meet por evento do calendário
   * @param {string} eventId - ID do evento no Google Calendar
   * @returns {Promise<Object>} Dados da transcrição
   */
  async fetchTranscriptionByEventId(eventId) {
    try {
      if (!this.calendar) await this.initialize();

      // 1. Buscar evento no calendário
      const event = await this.calendar.events.get({
        calendarId: 'primary',
        eventId: eventId
      });

      console.log(` [MEETING-TRANSCRIPTION] Event found: ${event.data.summary}`);

      // 2. Verificar se tem Google Meet link
      const meetLink = event.data.hangoutLink || event.data.conferenceData?.entryPoints?.find(e => e.entryPointType === 'video')?.uri;

      if (!meetLink) {
        throw new Error('Event does not have Google Meet link');
      }

      // 3. Buscar documento de transcrição no Google Drive
      // Google Meet salva transcrições com padrão: "[Nome da Reunião] - Transcript"
      const eventName = event.data.summary;
      const transcriptionDoc = await this._findTranscriptionDoc(eventName, event.data.start.dateTime);

      if (!transcriptionDoc) {
        throw new Error(`Transcription document not found for event: ${eventName}`);
      }

      // 4. Ler conteúdo do Google Doc
      const transcriptionText = await this._readGoogleDoc(transcriptionDoc.id);

      // 5. Extrair metadados da transcrição
      const metadata = this._extractTranscriptionMetadata(transcriptionText);

      return {
        success: true,
        eventId: eventId,
        googleDriveFileId: transcriptionDoc.id,
        googleDocUrl: transcriptionDoc.webViewLink,
        fileName: transcriptionDoc.name,
        eventName: eventName,
        meetingDate: event.data.start.dateTime,
        transcriptionText: transcriptionText,
        metadata: metadata,
        source: 'google_meet'
      };
    } catch (error) {
      console.error(` [MEETING-TRANSCRIPTION] Error fetching transcription for event ${eventId}:`, error.message);
      return {
        success: false,
        error: error.message,
        eventId: eventId
      };
    }
  }

  /**
   * Busca transcrições recentes do Google Meet (últimos N dias)
   * @param {number} daysBack - Quantos dias para trás buscar (padrão: 7)
   * @returns {Promise<Array>} Lista de transcrições encontradas
   */
  async fetchRecentTranscriptions(daysBack = 7) {
    try {
      if (!this.drive) await this.initialize();

      const dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - daysBack);

      // Buscar no Google Drive arquivos com nome contendo "Transcript" ou "Transcrição"
      // criados após a data limite
      const response = await this.drive.files.list({
        q: `(name contains 'Transcript' or name contains 'Transcrição') and mimeType='application/vnd.google-apps.document' and createdTime > '${dateThreshold.toISOString()}'`,
        fields: 'files(id, name, createdTime, modifiedTime, webViewLink, size)',
        orderBy: 'createdTime desc',
        pageSize: 50
      });

      const files = response.data.files || [];
      console.log(` [MEETING-TRANSCRIPTION] Found ${files.length} transcription documents in last ${daysBack} days`);

      // Processar cada documento
      const transcriptions = [];
      for (const file of files) {
        try {
          const text = await this._readGoogleDoc(file.id);
          const metadata = this._extractTranscriptionMetadata(text);

          transcriptions.push({
            googleDriveFileId: file.id,
            googleDocUrl: file.webViewLink,
            fileName: file.name,
            createdAt: file.createdTime,
            modifiedAt: file.modifiedTime,
            transcriptionText: text,
            metadata: metadata,
            source: 'google_meet'
          });
        } catch (error) {
          console.error(` [MEETING-TRANSCRIPTION] Failed to read file ${file.name}:`, error.message);
        }
      }

      return {
        success: true,
        count: transcriptions.length,
        transcriptions: transcriptions
      };
    } catch (error) {
      console.error(' [MEETING-TRANSCRIPTION] Error fetching recent transcriptions:', error.message);
      return {
        success: false,
        error: error.message,
        transcriptions: []
      };
    }
  }

  /**
   * Busca documento de transcrição por nome do evento e data
   * Suporta padrões de nomenclatura do sistema LEADLY:
   * - "Reunião de Discovery - [Lead/Empresa]"
   * - "Reunião de Negociação - [Lead/Empresa]"
   * - "Reunião de Follow-up - [Lead/Empresa]"
   * - "Reunião de Fechamento - [Lead/Empresa]"
   * @private
   */
  async _findTranscriptionDoc(eventName, eventDate) {
    try {
      // Google Meet salva transcrições com padrão: "[Nome] - Transcript" ou "[Nome] - Transcrição"
      // Geramos múltiplos termos de busca para aumentar chances de match
      const searchTerms = [
        `"${eventName} - Transcript"`,
        `"${eventName} - Transcrição"`,
        `"${eventName}"`
      ];

      // Se o nome contém "Reunião de", extrair o nome do lead para busca alternativa
      const leadMatch = eventName.match(/Reunião de (?:Discovery|Negociação|Follow-up|Fechamento) - (.+)/i);
      if (leadMatch) {
        const leadName = leadMatch[1];
        // Adicionar buscas alternativas pelo nome do lead
        searchTerms.push(`"Reunião" and "${leadName}"`);
        searchTerms.push(`"${leadName}" and "Transcript"`);
        searchTerms.push(`"${leadName}" and "Transcrição"`);
      }

      console.log(` [MEETING-TRANSCRIPTION] Buscando transcrição com ${searchTerms.length} padrões...`);

      for (const term of searchTerms) {
        const response = await this.drive.files.list({
          q: `name contains ${term} and mimeType='application/vnd.google-apps.document'`,
          fields: 'files(id, name, createdTime, webViewLink)',
          orderBy: 'createdTime desc',
          pageSize: 5
        });

        if (response.data.files && response.data.files.length > 0) {
          console.log(` [MEETING-TRANSCRIPTION] Encontrado com padrão: ${term}`);

          // Se forneceu data do evento, filtrar por proximidade
          if (eventDate) {
            const eventTimestamp = new Date(eventDate).getTime();
            const closest = response.data.files.reduce((prev, curr) => {
              const prevDiff = Math.abs(new Date(prev.createdTime).getTime() - eventTimestamp);
              const currDiff = Math.abs(new Date(curr.createdTime).getTime() - eventTimestamp);
              return currDiff < prevDiff ? curr : prev;
            });
            return closest;
          }
          return response.data.files[0];
        }
      }

      console.log(` [MEETING-TRANSCRIPTION] Nenhuma transcrição encontrada para: ${eventName}`);
      return null;
    } catch (error) {
      console.error(' [MEETING-TRANSCRIPTION] Error finding transcription doc:', error.message);
      return null;
    }
  }

  /**
   * Busca transcrições por tipo de reunião (Discovery, Negociação, etc)
   * @param {string} meetingType - Tipo: 'discovery', 'negotiation', 'followup', 'closing'
   * @param {number} daysBack - Quantos dias para trás buscar (padrão: 30)
   * @returns {Promise<Object>} Lista de transcrições filtradas
   */
  async fetchTranscriptionsByType(meetingType, daysBack = 30) {
    try {
      if (!this.drive) await this.initialize();

      const typeLabels = {
        discovery: 'Discovery',
        negotiation: 'Negociação',
        followup: 'Follow-up',
        closing: 'Fechamento'
      };

      const typeLabel = typeLabels[meetingType];
      if (!typeLabel) {
        throw new Error(`Tipo de reunião inválido: ${meetingType}. Use: discovery, negotiation, followup, closing`);
      }

      const dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - daysBack);

      // Buscar transcrições com o padrão específico
      const searchQuery = `name contains 'Reunião de ${typeLabel}' and (name contains 'Transcript' or name contains 'Transcrição') and mimeType='application/vnd.google-apps.document' and createdTime > '${dateThreshold.toISOString()}'`;

      console.log(` [MEETING-TRANSCRIPTION] Buscando transcrições de ${typeLabel}...`);

      const response = await this.drive.files.list({
        q: searchQuery,
        fields: 'files(id, name, createdTime, modifiedTime, webViewLink)',
        orderBy: 'createdTime desc',
        pageSize: 50
      });

      const files = response.data.files || [];
      console.log(` [MEETING-TRANSCRIPTION] Encontradas ${files.length} transcrições de ${typeLabel}`);

      // Processar cada documento
      const transcriptions = [];
      for (const file of files) {
        try {
          const text = await this._readGoogleDoc(file.id);
          const metadata = this._extractTranscriptionMetadata(text);

          // Extrair nome do lead do título
          const leadMatch = file.name.match(/Reunião de \w+ - ([^-]+)/);
          const leadName = leadMatch ? leadMatch[1].trim() : null;

          transcriptions.push({
            googleDriveFileId: file.id,
            googleDocUrl: file.webViewLink,
            fileName: file.name,
            meetingType: meetingType,
            leadName: leadName,
            createdAt: file.createdTime,
            modifiedAt: file.modifiedTime,
            transcriptionText: text,
            metadata: metadata,
            source: 'google_meet'
          });
        } catch (error) {
          console.error(` [MEETING-TRANSCRIPTION] Falha ao ler arquivo ${file.name}:`, error.message);
        }
      }

      return {
        success: true,
        meetingType: meetingType,
        count: transcriptions.length,
        transcriptions: transcriptions
      };
    } catch (error) {
      console.error(` [MEETING-TRANSCRIPTION] Erro buscando transcrições de ${meetingType}:`, error.message);
      return {
        success: false,
        error: error.message,
        transcriptions: []
      };
    }
  }

  /**
   * Lê conteúdo de um Google Doc
   * @private
   */
  async _readGoogleDoc(documentId) {
    try {
      const doc = await this.docs.documents.get({
        documentId: documentId
      });

      // Extrair texto dos elementos do documento
      const content = doc.data.body.content || [];
      let fullText = '';

      for (const element of content) {
        if (element.paragraph) {
          const paragraphElements = element.paragraph.elements || [];
          for (const elem of paragraphElements) {
            if (elem.textRun) {
              fullText += elem.textRun.content;
            }
          }
        }
      }

      return fullText.trim();
    } catch (error) {
      console.error(` [MEETING-TRANSCRIPTION] Error reading Google Doc ${documentId}:`, error.message);
      throw error;
    }
  }

  /**
   * Extrai metadados da transcrição (participantes, timestamps, etc.)
   * Formato típico do Google Meet:
   * "João Silva 00:00:15
   *  Olá, bom dia..."
   * @private
   */
  _extractTranscriptionMetadata(text) {
    const metadata = {
      participantes: [],
      numPalavras: 0,
      duracaoEstimada: 0,
      timestamps: []
    };

    try {
      // Contar palavras
      metadata.numPalavras = text.split(/\s+/).length;

      // Detectar participantes e timestamps
      // Padrão: Nome HH:MM:SS ou Nome MM:SS
      const participantPattern = /^([A-Za-zÀ-ÿ\s]+)\s+(\d{1,2}:\d{2}(?::\d{2})?)/gm;
      const matches = [...text.matchAll(participantPattern)];

      const participantMap = new Map();
      let lastTimestamp = 0;

      for (const match of matches) {
        const name = match[1].trim();
        const timestamp = match[2];

        // Adicionar participante único
        if (!participantMap.has(name)) {
          participantMap.set(name, {
            nome: name,
            numFalas: 0,
            tempoFalaSegundos: 0
          });
        }

        participantMap.get(name).numFalas++;

        // Converter timestamp para segundos
        const parts = timestamp.split(':').map(Number);
        const seconds = parts.length === 3
          ? parts[0] * 3600 + parts[1] * 60 + parts[2]
          : parts[0] * 60 + parts[1];

        if (seconds > lastTimestamp) {
          lastTimestamp = seconds;
        }

        metadata.timestamps.push({
          nome: name,
          timestamp: timestamp,
          segundos: seconds
        });
      }

      metadata.participantes = Array.from(participantMap.values());
      metadata.duracaoEstimada = lastTimestamp;

      // Calcular tempo de fala aproximado por participante
      // (tempo entre início de fala e próximo participante)
      for (let i = 0; i < metadata.timestamps.length - 1; i++) {
        const current = metadata.timestamps[i];
        const next = metadata.timestamps[i + 1];
        const duration = next.segundos - current.segundos;

        const participant = metadata.participantes.find(p => p.nome === current.nome);
        if (participant) {
          participant.tempoFalaSegundos += duration;
        }
      }

    } catch (error) {
      console.error(' [MEETING-TRANSCRIPTION] Error extracting metadata:', error.message);
    }

    return metadata;
  }

  /**
   * Gera URL de autorização OAuth2 (se necessário)
   * Para primeira configuração ou renovação de token
   */
  getAuthUrl() {
    // Se já tem OAuth2 configurado, usar
    if (this.auth && this.auth.generateAuthUrl) {
      return this.auth.generateAuthUrl({
        access_type: 'offline',
        scope: [
          'https://www.googleapis.com/auth/drive.readonly',
          'https://www.googleapis.com/auth/documents.readonly',
          'https://www.googleapis.com/auth/calendar.readonly'
        ],
        prompt: 'consent'
      });
    }

    // Tentar gerar URL a partir das credenciais do ambiente
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/oauth2callback';

    if (!clientId) {
      throw new Error('OAuth2 not configured. Set GOOGLE_CLIENT_ID in environment.');
    }

    const scopes = [
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/documents.readonly',
      'https://www.googleapis.com/auth/calendar.readonly'
    ];

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scopes.join(' '));
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');

    return authUrl.toString();
  }

  /**
   * Processa código de autorização OAuth2 e obtém tokens
   * @param {string} code - Código retornado pelo Google após autorização
   */
  async handleAuthCallback(code) {
    try {
      if (!this.auth || !this.auth.getToken) {
        throw new Error('OAuth2 not configured');
      }

      const { tokens } = await this.auth.getToken(code);
      this.auth.setCredentials(tokens);

      console.log(' [MEETING-TRANSCRIPTION] OAuth2 tokens obtained');
      console.log(' Save this refresh_token in .env as GOOGLE_REFRESH_TOKEN:');
      console.log(tokens.refresh_token);

      return {
        success: true,
        refreshToken: tokens.refresh_token,
        accessToken: tokens.access_token
      };
    } catch (error) {
      console.error(' [MEETING-TRANSCRIPTION] Error handling auth callback:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Singleton instance
const meetingTranscriptionService = new MeetingTranscriptionService();

export default meetingTranscriptionService;

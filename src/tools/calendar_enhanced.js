// src/tools/calendar_enhanced.js
// Sistema de calendário simplificado para compatibilidade com meeting_scheduler.js
//  FIX CRIT-003: Recriando módulo ausente

import { getMemory, setMemory } from '../memory.js';
import fs from 'fs';

/**
 *  NOVA FUNÇÃO: Cria evento real no Google Calendar via API
 */
async function createGoogleCalendarEvent(eventData) {
  const tokenPath = './google_token.json';

  // Verificar se token existe
  if (!fs.existsSync(tokenPath)) {
    throw new Error('Google Calendar não autenticado. Configure OAuth primeiro.');
  }

  // Carregar tokens
  const tokens = JSON.parse(fs.readFileSync(tokenPath, 'utf-8'));

  // Montar corpo do evento para API do Google Calendar
  const startDateTime = new Date(`${eventData.date}T${eventData.time}:00`);
  const endDateTime = new Date(startDateTime.getTime() + eventData.duration * 60000);

  const eventBody = {
    summary: eventData.title,
    description: eventData.description || '',
    location: eventData.location || '',
    start: {
      dateTime: startDateTime.toISOString(),
      timeZone: 'America/Fortaleza'
    },
    end: {
      dateTime: endDateTime.toISOString(),
      timeZone: 'America/Fortaleza'
    },
    attendees: (eventData.attendees || []).map(email => ({ email })),
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 24 * 60 }, // 1 dia antes
        { method: 'popup', minutes: 30 }        // 30 min antes
      ]
    }
  };

  //  ADICIONAR GOOGLE MEET se solicitado
  if (eventData.meetEnabled !== false) {
    eventBody.conferenceData = {
      createRequest: {
        requestId: `meet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        conferenceSolutionKey: { type: 'hangoutsMeet' }
      }
    };
  }

  // Fazer requisição POST para criar evento
  const url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${tokens.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(eventBody)
  });

  // Se token expirou, tentar refresh
  if (response.status === 401 && tokens.refresh_token) {
    console.log(' [CALENDAR-ENHANCED] Access token expirado, tentando refresh...');
    const newTokens = await refreshAccessToken(tokens.refresh_token);

    // Salvar novos tokens
    fs.writeFileSync(tokenPath, JSON.stringify(newTokens, null, 2));

    // Tentar novamente com novo token
    const retryResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${newTokens.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(eventBody)
    });

    if (!retryResponse.ok) {
      const error = await retryResponse.json();
      throw new Error(`Erro ao criar evento: ${error.error?.message || retryResponse.statusText}`);
    }

    const data = await retryResponse.json();
    return {
      success: true,
      id: data.id,
      htmlLink: data.htmlLink,
      meetLink: data.hangoutLink || data.conferenceData?.entryPoints?.find(e => e.entryPointType === 'video')?.uri || null
    };
  }

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Erro ao criar evento: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return {
    success: true,
    id: data.id,
    htmlLink: data.htmlLink,
    meetLink: data.hangoutLink || data.conferenceData?.entryPoints?.find(e => e.entryPointType === 'video')?.uri || null
  };
}

/**
 * Cria um evento no calendário (tenta Google Calendar primeiro, fallback para local)
 *
 * @param {object} eventData - Dados do evento
 * @param {string} eventData.title - Título do evento
 * @param {string} eventData.date - Data no formato YYYY-MM-DD
 * @param {string} eventData.time - Hora no formato HH:MM
 * @param {number} eventData.duration - Duração em minutos (padrão: 60)
 * @param {string} eventData.description - Descrição do evento
 * @param {string} eventData.location - Local do evento
 * @param {Array<string>} eventData.attendees - Lista de e-mails dos participantes
 * @param {boolean} eventData.meetEnabled - Se deve criar link do Google Meet
 * @param {boolean} eventData.sendNotifications - Se deve enviar notificações
 * @returns {Promise<object>} Resultado da criação
 */
export async function createEvent(eventData) {
  try {
    // Validação de dados obrigatórios
    if (!eventData.title || !eventData.date || !eventData.time) {
      return {
        success: false,
        error: 'Dados obrigatórios faltando: title, date ou time'
      };
    }

    // Gerar ID único do evento
    const eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Construir objeto do evento
    const event = {
      id: eventId,
      title: eventData.title,
      date: eventData.date,
      time: eventData.time,
      duration: eventData.duration || 60,
      description: eventData.description || '',
      location: eventData.location || 'Online - Google Meet',
      attendees: eventData.attendees || [],
      meetEnabled: eventData.meetEnabled !== false,
      sendNotifications: eventData.sendNotifications !== false,
      createdAt: new Date().toISOString(),
      status: 'confirmed'
    };

    // Calcular data/hora de término
    const startDateTime = new Date(`${event.date}T${event.time}:00`);
    const endDateTime = new Date(startDateTime.getTime() + event.duration * 60000);

    event.startDateTime = startDateTime.toISOString();
    event.endDateTime = endDateTime.toISOString();

    //  TENTAR CRIAR NO GOOGLE CALENDAR (se OAuth configurado)
    try {
      const googleEvent = await createGoogleCalendarEvent(event);

      if (googleEvent.success) {
        console.log(` [CALENDAR-ENHANCED] Evento criado no Google Calendar: ${googleEvent.id}`);
        console.log(`    Data/Hora: ${event.date} ${event.time}`);
        console.log(`    Participantes: ${event.attendees.join(', ') || 'nenhum'}`);
        console.log(`    Calendar: ${googleEvent.htmlLink}`);
        if (googleEvent.meetLink) console.log(`    Meet: ${googleEvent.meetLink}`);

        // Atualizar evento com dados reais do Google Calendar
        event.id = googleEvent.id;
        event.calendarLink = googleEvent.htmlLink;
        event.meetLink = googleEvent.meetLink;
        event.source = 'google_calendar';

        // Persistir no banco de dados (tabela events)
        await saveEventToDatabase(event);

        return {
          success: true,
          event,
          eventId: googleEvent.id,
          eventLink: googleEvent.htmlLink,
          meetLink: googleEvent.meetLink,
          message: 'Evento criado com sucesso no Google Calendar'
        };
      }
    } catch (error) {
      console.error(` [CALENDAR-ENHANCED] Erro ao criar no Google Calendar, usando fallback local:`, error.message);
    }

    // FALLBACK: Gerar links locais (mock - se OAuth não configurado ou falhou)
    const calendarLink = `https://calendar.google.com/calendar/r/eventedit?text=${encodeURIComponent(event.title)}&dates=${startDateTime.toISOString().replace(/[-:]/g, '').split('.')[0]}Z/${endDateTime.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;
    const meetLink = event.meetEnabled ? `https://meet.google.com/mock-${eventId.substr(-8)}` : null;

    event.calendarLink = calendarLink;
    event.meetLink = meetLink;

    // Persistir no banco de dados (tabela events)
    await saveEventToDatabase(event);

    console.log(` [CALENDAR-ENHANCED] Evento criado localmente: ${event.id}`);
    console.log(`    Data/Hora: ${event.date} ${event.time}`);
    console.log(`    Participantes: ${event.attendees.join(', ') || 'nenhum'}`);
    console.log(`    Calendar: ${calendarLink}`);
    if (meetLink) console.log(`    Meet (MOCK): ${meetLink}`);

    return {
      success: true,
      event,
      eventId: event.id,
      eventLink: calendarLink,
      meetLink: meetLink,
      message: 'Evento criado localmente (Google Calendar não disponível)'
    };

  } catch (error) {
    console.error(` [CALENDAR-ENHANCED] Erro ao criar evento:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 *  NOVA FUNÇÃO: Atualiza evento existente no Google Calendar
 * Permite mudar email, horário, data ou outros campos
 *
 * @param {string} eventId - ID do evento no Google Calendar
 * @param {Object} updates - Campos a atualizar
 * @param {string[]} [updates.attendees] - Novos participantes (emails)
 * @param {string} [updates.date] - Nova data (YYYY-MM-DD)
 * @param {string} [updates.time] - Novo horário (HH:mm)
 * @param {number} [updates.duration] - Nova duração em minutos
 * @param {string} [updates.title] - Novo título
 * @param {string} [updates.description] - Nova descrição
 * @param {string} [updates.location] - Nova localização
 * @returns {Promise<Object>} Resultado da atualização
 */
export async function updateEvent(eventId, updates) {
  const tokenPath = './google_token.json';

  try {
    // Verificar se token existe
    if (!fs.existsSync(tokenPath)) {
      throw new Error('Google Calendar não autenticado. Configure OAuth primeiro.');
    }

    // Carregar tokens
    const tokens = JSON.parse(fs.readFileSync(tokenPath, 'utf-8'));

    // Primeiro, buscar evento atual
    const getUrl = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`;

    const getResponse = await fetch(getUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`
      }
    });

    if (!getResponse.ok) {
      throw new Error(`Erro ao buscar evento: ${getResponse.statusText}`);
    }

    const currentEvent = await getResponse.json();
    console.log(` [CALENDAR-ENHANCED] Evento atual obtido: ${currentEvent.summary}`);

    // Montar corpo do update
    const updateBody = { ...currentEvent };

    // Atualizar campos conforme solicitado
    if (updates.attendees) {
      updateBody.attendees = updates.attendees.map(email => ({ email }));
      console.log(` [CALENDAR-ENHANCED] Atualizando participantes: ${updates.attendees.join(', ')}`);
    }

    if (updates.date && updates.time) {
      const startDateTime = new Date(`${updates.date}T${updates.time}:00`);
      const duration = updates.duration || 30;
      const endDateTime = new Date(startDateTime.getTime() + duration * 60000);

      updateBody.start = {
        dateTime: startDateTime.toISOString(),
        timeZone: 'America/Fortaleza'
      };

      updateBody.end = {
        dateTime: endDateTime.toISOString(),
        timeZone: 'America/Fortaleza'
      };

      console.log(` [CALENDAR-ENHANCED] Atualizando data/hora: ${updates.date} ${updates.time}`);
    } else if (updates.date) {
      // Só mudar data, manter hora
      const currentStart = new Date(currentEvent.start.dateTime);
      const newDate = new Date(updates.date);
      newDate.setHours(currentStart.getHours(), currentStart.getMinutes());

      const duration = updates.duration || (new Date(currentEvent.end.dateTime) - new Date(currentEvent.start.dateTime)) / 60000;
      const endDateTime = new Date(newDate.getTime() + duration * 60000);

      updateBody.start = {
        dateTime: newDate.toISOString(),
        timeZone: 'America/Fortaleza'
      };

      updateBody.end = {
        dateTime: endDateTime.toISOString(),
        timeZone: 'America/Fortaleza'
      };

      console.log(` [CALENDAR-ENHANCED] Atualizando apenas data: ${updates.date}`);
    } else if (updates.time) {
      // Só mudar hora, manter data
      const currentStart = new Date(currentEvent.start.dateTime);
      const [hours, minutes] = updates.time.split(':');
      currentStart.setHours(parseInt(hours), parseInt(minutes));

      const duration = updates.duration || (new Date(currentEvent.end.dateTime) - new Date(currentEvent.start.dateTime)) / 60000;
      const endDateTime = new Date(currentStart.getTime() + duration * 60000);

      updateBody.start = {
        dateTime: currentStart.toISOString(),
        timeZone: 'America/Fortaleza'
      };

      updateBody.end = {
        dateTime: endDateTime.toISOString(),
        timeZone: 'America/Fortaleza'
      };

      console.log(` [CALENDAR-ENHANCED] Atualizando apenas horário: ${updates.time}`);
    }

    if (updates.title) {
      updateBody.summary = updates.title;
    }

    if (updates.description) {
      updateBody.description = updates.description;
    }

    if (updates.location) {
      updateBody.location = updates.location;
    }

    // Fazer requisição PUT para atualizar evento
    const updateUrl = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`;

    const updateResponse = await fetch(updateUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateBody)
    });

    // Se token expirou, tentar refresh
    if (updateResponse.status === 401 && tokens.refresh_token) {
      console.log(' [CALENDAR-ENHANCED] Access token expirado, tentando refresh...');
      const newTokens = await refreshAccessToken(tokens.refresh_token);

      // Salvar novos tokens
      fs.writeFileSync(tokenPath, JSON.stringify(newTokens, null, 2));

      // Tentar novamente com novo token
      const retryResponse = await fetch(updateUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${newTokens.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateBody)
      });

      if (!retryResponse.ok) {
        const error = await retryResponse.json();
        throw new Error(`Erro ao atualizar evento: ${error.error?.message || retryResponse.statusText}`);
      }

      const data = await retryResponse.json();
      console.log(` [CALENDAR-ENHANCED] Evento atualizado com sucesso: ${data.summary}`);

      return {
        success: true,
        eventId: data.id,
        eventLink: data.htmlLink,
        meetLink: data.hangoutLink || data.conferenceData?.entryPoints?.find(e => e.entryPointType === 'video')?.uri || null
      };
    }

    if (!updateResponse.ok) {
      const error = await updateResponse.json();
      throw new Error(`Erro ao atualizar evento: ${error.error?.message || updateResponse.statusText}`);
    }

    const data = await updateResponse.json();
    console.log(` [CALENDAR-ENHANCED] Evento atualizado com sucesso: ${data.summary}`);

    return {
      success: true,
      eventId: data.id,
      eventLink: data.htmlLink,
      meetLink: data.hangoutLink || data.conferenceData?.entryPoints?.find(e => e.entryPointType === 'video')?.uri || null
    };

  } catch (error) {
    console.error(` [CALENDAR-ENHANCED] Erro ao atualizar evento:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Encontra horários livres na agenda para uma data específica
 * @param {object} params - Parâmetros de busca
 * @param {string} params.date - Data para buscar (YYYY-MM-DD)
 * @param {number} params.durationMinutes - Duração em minutos (padrão: 60)
 * @returns {Promise<object>} Resultado com slots disponíveis
 */
export async function findFreeSlots(params = {}) {
  try {
    const { date, durationMinutes = 60 } = params;

    if (!date) {
      return { success: false, error: 'Data é obrigatória' };
    }

    const targetDate = new Date(date);
    const slots = [];

    // Horários comerciais (9h-18h)
    const businessHours = [
      { hour: 9, minute: 0 },
      { hour: 9, minute: 30 },
      { hour: 10, minute: 0 },
      { hour: 10, minute: 30 },
      { hour: 11, minute: 0 },
      { hour: 11, minute: 30 },
      { hour: 14, minute: 0 },
      { hour: 14, minute: 30 },
      { hour: 15, minute: 0 },
      { hour: 15, minute: 30 },
      { hour: 16, minute: 0 },
      { hour: 16, minute: 30 },
      { hour: 17, minute: 0 }
    ];

    // Buscar eventos existentes do Google Calendar ou local
    let existingEvents = [];
    const tokenPath = process.env.GOOGLE_TOKEN_PATH || './google_token.json';

    if (fs.existsSync(tokenPath)) {
      try {
        const events = await listEvents({ range: 'day', maxResults: 50 });
        existingEvents = events.events || [];
      } catch {
        existingEvents = await getEventsFromDatabase();
      }
    } else {
      existingEvents = await getEventsFromDatabase();
    }

    // Verificar cada slot
    for (const time of businessHours) {
      const slotStart = new Date(targetDate);
      slotStart.setHours(time.hour, time.minute, 0, 0);

      const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60000);

      // Verificar conflitos
      const hasConflict = existingEvents.some(evt => {
        const evtStart = new Date(evt.start?.dateTime || evt.startDateTime);
        const evtEnd = new Date(evt.end?.dateTime || evt.endDateTime);
        return (slotStart < evtEnd && slotEnd > evtStart);
      });

      if (!hasConflict && slotStart > new Date()) {
        slots.push({
          start: slotStart.toISOString(),
          end: slotEnd.toISOString(),
          time: `${time.hour.toString().padStart(2, '0')}:${time.minute.toString().padStart(2, '0')}`,
          available: true
        });
      }
    }

    console.log(` [CALENDAR-ENHANCED] ${slots.length} slots livres encontrados para ${date}`);

    return {
      success: true,
      date,
      durationMinutes,
      slots,
      totalSlots: slots.length
    };

  } catch (error) {
    console.error(` [CALENDAR-ENHANCED] Erro ao buscar slots livres:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Sugere horários disponíveis para reunião
 * @param {object} params - Parâmetros de busca
 * @param {string} params.date - Data desejada (opcional)
 * @param {number} params.duration - Duração em minutos (padrão: 60)
 * @param {number} params.count - Quantidade de sugestões (padrão: 3)
 * @returns {Promise<Array>} Lista de horários sugeridos
 */
export async function suggestMeetingTimes(params = {}) {
  try {
    const duration = params.duration || 60;
    const count = params.count || 3;
    const baseDate = params.date ? new Date(params.date) : new Date();

    // Se data no passado, usar amanhã
    if (baseDate < new Date()) {
      baseDate.setDate(baseDate.getDate() + 1);
    }

    const suggestions = [];
    const businessHours = [
      { hour: 9, minute: 0 },
      { hour: 10, minute: 0 },
      { hour: 11, minute: 0 },
      { hour: 14, minute: 0 },
      { hour: 15, minute: 0 },
      { hour: 16, minute: 0 }
    ];

    // Buscar eventos existentes
    const existingEvents = await getEventsFromDatabase();

    // Gerar sugestões
    for (let day = 0; day < 7 && suggestions.length < count; day++) {
      const checkDate = new Date(baseDate);
      checkDate.setDate(checkDate.getDate() + day);

      // Pular finais de semana
      if (checkDate.getDay() === 0 || checkDate.getDay() === 6) continue;

      for (const time of businessHours) {
        if (suggestions.length >= count) break;

        const slotStart = new Date(checkDate);
        slotStart.setHours(time.hour, time.minute, 0, 0);

        const slotEnd = new Date(slotStart.getTime() + duration * 60000);

        // Verificar conflitos
        const hasConflict = existingEvents.some(evt => {
          const evtStart = new Date(evt.startDateTime);
          const evtEnd = new Date(evt.endDateTime);
          return (slotStart < evtEnd && slotEnd > evtStart);
        });

        if (!hasConflict) {
          suggestions.push({
            date: slotStart.toISOString().split('T')[0],
            time: `${time.hour.toString().padStart(2, '0')}:${time.minute.toString().padStart(2, '0')}`,
            datetime: slotStart.toISOString(),
            available: true
          });
        }
      }
    }

    console.log(` [CALENDAR-ENHANCED] ${suggestions.length} horários sugeridos`);
    return suggestions;

  } catch (error) {
    console.error(` [CALENDAR-ENHANCED] Erro ao sugerir horários:`, error);
    return [];
  }
}

/**
 * Retorna status do calendário
 * @returns {Promise<object>} Status do sistema de calendário
 */
export async function getCalendarStatus() {
  try {
    const tokenPath = process.env.GOOGLE_TOKEN_PATH || './google_token.json';

    // Verificar se Google Calendar está autenticado
    if (fs.existsSync(tokenPath)) {
      try {
        const tokenContent = fs.readFileSync(tokenPath, 'utf8');
        const tokens = JSON.parse(tokenContent);

        if (tokens.access_token && tokens.refresh_token) {
          // Tentar buscar eventos do Google para verificar conexão
          const events = await listEvents({ range: 'week', maxResults: 10 });

          return {
            available: true,
            provider: 'google',
            authenticated: true,
            totalEvents: events.events?.length || 0,
            upcomingEvents: events.events?.length || 0,
            message: 'Google Calendar conectado e funcionando'
          };
        }
      } catch (googleError) {
        console.warn(` [CALENDAR-ENHANCED] Google Calendar falhou, usando local:`, googleError.message);
      }
    }

    // Fallback para calendário local
    const events = await getEventsFromDatabase();
    const now = new Date();
    const upcomingEvents = events.filter(e => new Date(e.startDateTime) > now);

    return {
      available: true,
      provider: 'local',
      authenticated: false,
      totalEvents: events.length,
      upcomingEvents: upcomingEvents.length,
      message: 'Sistema de calendário local (Google Calendar não autenticado)'
    };
  } catch (error) {
    console.error(` [CALENDAR-ENHANCED] Erro ao obter status:`, error);
    return {
      available: false,
      error: error.message
    };
  }
}

/**
 * Salva evento no banco de dados SQLite (tabela events)
 */
async function saveEventToDatabase(event) {
  try {
    // Usar setMemory com namespace events
    const eventsKey = `events:${event.id}`;
    await setMemory(eventsKey, JSON.stringify(event));

    // Também adicionar à lista de todos os eventos
    const allEventsKey = 'events:all';
    const existingEventsJson = await getMemory(allEventsKey) || '[]';
    const allEvents = JSON.parse(existingEventsJson);
    allEvents.push(event.id);
    await setMemory(allEventsKey, JSON.stringify(allEvents));

    console.log(` [CALENDAR-ENHANCED] Evento ${event.id} salvo no banco`);
  } catch (error) {
    console.error(` [CALENDAR-ENHANCED] Erro ao salvar evento no banco:`, error);
    throw error;
  }
}

/**
 * Busca eventos do banco de dados
 */
async function getEventsFromDatabase() {
  try {
    const allEventsKey = 'events:all';
    const eventsListJson = await getMemory(allEventsKey) || '[]';
    const eventIds = JSON.parse(eventsListJson);

    const events = [];
    for (const eventId of eventIds) {
      const eventKey = `events:${eventId}`;
      const eventJson = await getMemory(eventKey);
      if (eventJson) {
        events.push(JSON.parse(eventJson));
      }
    }

    return events;
  } catch (error) {
    console.error(` [CALENDAR-ENHANCED] Erro ao buscar eventos:`, error);
    return [];
  }
}

/**
 * Retorna URL de autorização do Google OAuth
 * @returns {string} URL de autorização OAuth do Google
 */
export function getGoogleAuthUrl() {
  try {
    const credentialsPath = process.env.GOOGLE_CREDENTIALS_FILE || './google_credentials.json';
    const credentialsContent = fs.readFileSync(credentialsPath, 'utf8');
    const credentials = JSON.parse(credentialsContent);

    const { client_id, redirect_uris } = credentials.web;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || redirect_uris[0];

    // Construir URL de autenticação OAuth do Google
    // Incluindo Calendar + Sheets + Drive/Docs para transcrições de reuniões
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive.readonly',      // Para buscar transcrições no Drive
      'https://www.googleapis.com/auth/documents.readonly'   // Para ler Google Docs (transcrições)
    ];

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', client_id);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scopes.join(' '));
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');

    console.log(' [CALENDAR-ENHANCED] URL de autenticação gerada com credenciais reais');
    console.log(`    Client ID: ${client_id.substring(0, 20)}...`);
    console.log(`    Redirect URI: ${redirectUri}`);

    return authUrl.toString();

  } catch (error) {
    console.error(' [CALENDAR-ENHANCED] Erro ao gerar URL de auth:', error);
    // Fallback para URL de placeholder em caso de erro
    return 'https://accounts.google.com/o/oauth2/v2/auth?client_id=YOUR_CLIENT_ID&redirect_uri=http://localhost:3001/oauth2callback&response_type=code&scope=https://www.googleapis.com/auth/calendar';
  }
}

/**
 * Manipula callback do OAuth do Google
 * Troca o código de autorização por tokens de acesso
 * @param {object} req - Express request
 * @param {object} res - Express response
 */
export async function handleOAuthCallback(req, res) {
  try {
    const authCode = req.query.code;

    if (!authCode) {
      res.send(`
        <h1> Erro no OAuth</h1>
        <p>Código de autorização não recebido.</p>
        <p><a href="/">Voltar ao Dashboard</a></p>
      `);
      return;
    }

    // Ler credenciais
    const credentialsPath = process.env.GOOGLE_CREDENTIALS_FILE || './google_credentials.json';
    const credentialsContent = fs.readFileSync(credentialsPath, 'utf8');
    const credentials = JSON.parse(credentialsContent);
    const { client_id, client_secret, redirect_uris } = credentials.web;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || redirect_uris[0];

    // Trocar código por tokens
    const tokenUrl = 'https://oauth2.googleapis.com/token';
    const params = new URLSearchParams({
      code: authCode,
      client_id: client_id,
      client_secret: client_secret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(' [CALENDAR-ENHANCED] Erro ao trocar código por token:', errorData);
      throw new Error(`Falha ao obter token: ${response.statusText}`);
    }

    const tokens = await response.json();

    // Salvar tokens no arquivo
    const tokenPath = process.env.GOOGLE_TOKEN_PATH || './google_token.json';
    fs.writeFileSync(tokenPath, JSON.stringify(tokens, null, 2));

    console.log(' [CALENDAR-ENHANCED] Tokens OAuth salvos com sucesso');
    console.log(`    Token salvo em: ${tokenPath}`);

    res.send(`
      <h1> Google Calendar Autorizado!</h1>
      <p>Autenticação concluída com sucesso.</p>
      <p>Tokens salvos em: <code>${tokenPath}</code></p>
      <p>Agora você pode usar o Google Calendar através do sistema.</p>
      <p><a href="/">Voltar ao Dashboard</a></p>
      <script>
        // Fechar janela popup automaticamente após 3 segundos
        setTimeout(() => {
          window.close();
        }, 3000);
      </script>
    `);

  } catch (error) {
    console.error(' [CALENDAR-ENHANCED] Erro no OAuth callback:', error);
    res.send(`
      <h1> Erro na Autenticação</h1>
      <p>Ocorreu um erro ao processar a autorização:</p>
      <pre>${error.message}</pre>
      <p><a href="/">Voltar ao Dashboard</a></p>
    `);
  }
}

/**
 * Lista eventos do Google Calendar
 * @param {object} params - Parâmetros de busca
 * @param {string} params.range - 'day', 'week', 'month'
 * @param {string} params.query - Texto para buscar
 * @param {number} params.maxResults - Máximo de resultados
 * @returns {Promise<object>} Lista de eventos
 */
export async function listEvents(params = {}) {
  try {
    const { range = 'week', query = '', maxResults = 50 } = params;

    // Verificar se temos token
    const tokenPath = process.env.GOOGLE_TOKEN_PATH || './google_token.json';

    if (!fs.existsSync(tokenPath)) {
      console.log(' [CALENDAR-ENHANCED] Token não encontrado, retornando eventos locais');
      return await listLocalEvents(params);
    }

    // Ler tokens
    const tokenContent = fs.readFileSync(tokenPath, 'utf8');
    const tokens = JSON.parse(tokenContent);

    // Calcular período de busca
    const now = new Date();
    const timeMin = new Date(now);
    const timeMax = new Date(now);

    switch (range) {
      case 'day':
        timeMax.setDate(timeMax.getDate() + 1);
        break;
      case 'week':
        timeMax.setDate(timeMax.getDate() + 7);
        break;
      case 'month':
        timeMax.setMonth(timeMax.getMonth() + 1);
        break;
      default:
        timeMax.setDate(timeMax.getDate() + 7);
    }

    // Montar URL da API do Google Calendar
    const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
    url.searchParams.set('timeMin', timeMin.toISOString());
    url.searchParams.set('timeMax', timeMax.toISOString());
    url.searchParams.set('maxResults', maxResults.toString());
    url.searchParams.set('singleEvents', 'true');
    url.searchParams.set('orderBy', 'startTime');

    if (query) {
      url.searchParams.set('q', query);
    }

    // Buscar eventos
    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      // Se token expirou, tentar refresh
      if (response.status === 401 && tokens.refresh_token) {
        console.log(' [CALENDAR-ENHANCED] Access token expirado, tentando refresh...');
        const newTokens = await refreshAccessToken(tokens.refresh_token);

        // Salvar novos tokens
        fs.writeFileSync(tokenPath, JSON.stringify(newTokens, null, 2));

        // Tentar novamente com novo token
        const retryResponse = await fetch(url.toString(), {
          headers: {
            'Authorization': `Bearer ${newTokens.access_token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!retryResponse.ok) {
          throw new Error(`Erro ao buscar eventos: ${retryResponse.statusText}`);
        }

        const data = await retryResponse.json();
        return formatCalendarEvents(data);
      }

      throw new Error(`Erro ao buscar eventos: ${response.statusText}`);
    }

    const data = await response.json();
    return formatCalendarEvents(data);

  } catch (error) {
    console.error(' [CALENDAR-ENHANCED] Erro ao listar eventos:', error);
    // Fallback para eventos locais
    return await listLocalEvents(params);
  }
}

/**
 * Formata eventos do Google Calendar para o formato do dashboard
 */
function formatCalendarEvents(data) {
  const events = (data.items || []).map(event => ({
    id: event.id,
    title: event.summary || 'Sem título',
    description: event.description || '',
    startDateTime: event.start?.dateTime || event.start?.date,
    endDateTime: event.end?.dateTime || event.end?.date,
    location: event.location || '',
    attendees: (event.attendees || []).map(a => a.email),
    meetLink: event.hangoutLink || event.conferenceData?.entryPoints?.[0]?.uri || null,
    status: event.status || 'confirmed',
    source: 'google_calendar'
  }));

  console.log(` [CALENDAR-ENHANCED] ${events.length} eventos buscados do Google Calendar`);

  return {
    success: true,
    events: events,
    count: events.length
  };
}

/**
 * Lista eventos locais (fallback quando OAuth não está configurado)
 */
async function listLocalEvents(params) {
  const events = await getEventsFromDatabase();
  const { query = '', maxResults = 50 } = params;

  let filtered = events;

  // Filtrar por query se fornecido
  if (query) {
    const lowerQuery = query.toLowerCase();
    filtered = events.filter(e =>
      e.title?.toLowerCase().includes(lowerQuery) ||
      e.description?.toLowerCase().includes(lowerQuery)
    );
  }

  // Limitar resultados
  filtered = filtered.slice(0, maxResults);

  console.log(` [CALENDAR-ENHANCED] ${filtered.length} eventos locais retornados`);

  return {
    success: true,
    events: filtered,
    count: filtered.length,
    source: 'local'
  };
}

/**
 * Refresh do access token usando refresh token
 */
async function refreshAccessToken(refreshToken) {
  const credentialsPath = process.env.GOOGLE_CREDENTIALS_FILE || './google_credentials.json';
  const credentialsContent = fs.readFileSync(credentialsPath, 'utf8');
  const credentials = JSON.parse(credentialsContent);
  const { client_id, client_secret } = credentials.web;

  const tokenUrl = 'https://oauth2.googleapis.com/token';
  const params = new URLSearchParams({
    client_id: client_id,
    client_secret: client_secret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token'
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  });

  if (!response.ok) {
    throw new Error(`Erro ao refresh token: ${response.statusText}`);
  }

  const newTokens = await response.json();

  // Manter refresh_token antigo (Google não sempre retorna um novo)
  if (!newTokens.refresh_token) {
    newTokens.refresh_token = refreshToken;
  }

  console.log(' [CALENDAR-ENHANCED] Access token atualizado');
  return newTokens;
}

export default {
  createEvent,
  findFreeSlots,
  suggestMeetingTimes,
  getCalendarStatus,
  getGoogleAuthUrl,
  handleOAuthCallback,
  listEvents
};

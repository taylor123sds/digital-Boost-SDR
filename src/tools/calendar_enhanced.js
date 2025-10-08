// src/tools/calendar_enhanced.js
// Sistema de calendário profissional e robusto para ORBION
import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import { google } from "googleapis";
import openaiClient from '../core/openai_client.js';
import { getMemory, setMemory } from '../memory.js';

// ===== CONFIGURAÇÕES =====
const CREDENTIALS_PATH = process.env.GOOGLE_CREDENTIALS_FILE || "./google_credentials.json";
const TOKEN_PATH = process.env.GOOGLE_TOKEN_PATH || "./google_token.json";
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/oauth2callback";

// Scopes necessários para funcionamento completo
const SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.settings.readonly"
];

// ===== UTILITÁRIOS =====
function assertFileExists(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`❌ Arquivo não encontrado: ${path.resolve(filePath)}. Configure as credenciais do Google Calendar.`);
  }
}

function loadCredentials() {
  assertFileExists(CREDENTIALS_PATH);
  const raw = fs.readFileSync(CREDENTIALS_PATH, "utf-8");
  const json = JSON.parse(raw);

  const cfg = json.web || json.installed || json;
  const client_id = cfg.client_id;
  const client_secret = cfg.client_secret;
  const redirect_uris = cfg.redirect_uris || [REDIRECT_URI];

  if (!client_id || !client_secret) {
    throw new Error("❌ Credenciais inválidas: client_id/client_secret ausentes.");
  }

  return { client_id, client_secret, redirectUri: REDIRECT_URI || redirect_uris[0] };
}

function createOAuthClient() {
  const { client_id, client_secret, redirectUri } = loadCredentials();
  return new google.auth.OAuth2(client_id, client_secret, redirectUri);
}

async function getAuthenticatedClient() {
  const auth = createOAuthClient();

  if (!fs.existsSync(TOKEN_PATH)) {
    const authUrl = getGoogleAuthUrl();
    throw new Error(`❌ TOKEN_MISSING: Acesse ${authUrl} para autorizar o Google Calendar.`);
  }

  try {
    const raw = await fsp.readFile(TOKEN_PATH, "utf-8");
    const token = JSON.parse(raw);
    auth.setCredentials(token);

    // Verifica se o token ainda é válido
    await auth.getAccessToken();
    return auth;

  } catch (error) {
    console.warn("⚠️ Token expirado ou inválido, removendo arquivo...");
    await fsp.unlink(TOKEN_PATH).catch(() => {});
    const authUrl = getGoogleAuthUrl();
    throw new Error(`❌ TOKEN_EXPIRED: Acesse ${authUrl} para renovar a autorização.`);
  }
}

function addMinutes(date, minutes) {
  const result = new Date(date.getTime());
  result.setMinutes(result.getMinutes() + minutes);
  return result;
}

function formatDateTime(date, time) {
  return new Date(`${date}T${time}:00`);
}

function formatBrazilianDate(date) {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date(date));
}

function formatBrazilianTime(time) {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Fortaleza'
  }).format(new Date(`2000-01-01T${time}:00`));
}

// ===== OAUTH E AUTENTICAÇÃO =====
export function getGoogleAuthUrl() {
  const auth = createOAuthClient();
  return auth.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES
  });
}

export async function handleOAuthCallback(req, res) {
  try {
    const code = req.query.code;
    if (!code) {
      return res.status(400).json({ error: "Código OAuth ausente" });
    }

    const auth = createOAuthClient();
    const { tokens } = await auth.getToken(code);
    auth.setCredentials(tokens);

    await fsp.writeFile(TOKEN_PATH, JSON.stringify(tokens, null, 2));
    console.log("✅ Token do Google Calendar salvo com sucesso");

    // Testa a conexão
    const calendar = google.calendar({ version: "v3", auth });
    await calendar.calendarList.list({ maxResults: 1 });

    return res.redirect("/dashboard-pro.html?google=success");

  } catch (error) {
    console.error("❌ Erro no OAuth callback:", error);
    return res.status(500).json({ error: "Falha ao autorizar Google Calendar" });
  }
}

// ===== OPERAÇÕES DE CALENDÁRIO =====

/**
 * Lista eventos com filtros avançados
 */
export async function listEvents({
  range = "week",
  query = "",
  calendarId = "primary",
  maxResults = 50,
  showDeleted = false
} = {}) {
  try {
    const auth = await getAuthenticatedClient();
    const calendar = google.calendar({ version: "v3", auth });

    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    switch (range) {
      case "day":
        end.setDate(end.getDate() + 1);
        break;
      case "month":
        end.setMonth(end.getMonth() + 1);
        break;
      case "year":
        end.setFullYear(end.getFullYear() + 1);
        break;
      default: // week
        end.setDate(end.getDate() + 7);
    }

    const response = await calendar.events.list({
      calendarId,
      timeMin: start.toISOString(),
      timeMax: end.toISOString(),
      q: query || undefined,
      singleEvents: true,
      orderBy: "startTime",
      maxResults,
      showDeleted
    });

    const events = (response.data.items || []).map(event => ({
      id: event.id,
      status: event.status,
      title: event.summary || "Sem título",
      description: event.description || "",
      location: event.location || "",
      start: event.start?.dateTime || event.start?.date,
      end: event.end?.dateTime || event.end?.date,
      attendees: (event.attendees || []).map(a => ({
        email: a.email,
        name: a.displayName || a.email,
        status: a.responseStatus,
        organizer: a.organizer || false
      })),
      meetLink: event.hangoutLink ||
                event.conferenceData?.entryPoints?.find(p => p.entryPointType === "video")?.uri,
      htmlLink: event.htmlLink,
      created: event.created,
      updated: event.updated,
      creator: event.creator,
      organizer: event.organizer,
      recurring: !!event.recurringEventId,
      visibility: event.visibility || "default"
    }));

    console.log(`📅 ${events.length} eventos encontrados para período: ${range}`);
    return { success: true, events, count: events.length };

  } catch (error) {
    console.error("❌ Erro ao listar eventos:", error);
    return { success: false, error: error.message, events: [] };
  }
}

/**
 * Cria evento com validações e tratamentos avançados
 */
export async function createEvent({
  title,
  date,
  time,
  duration = 60,
  description = "",
  location = "",
  attendees = [],
  meetEnabled = true,
  timezone = "America/Fortaleza",
  calendarId = "primary",
  sendNotifications = true,
  visibility = "default"
}) {
  try {
    // Validações
    if (!title || !date || !time) {
      throw new Error("Título, data e horário são obrigatórios");
    }

    const auth = await getAuthenticatedClient();
    const calendar = google.calendar({ version: "v3", auth });

    // Processa datas
    const startDate = formatDateTime(date, time);
    const endDate = addMinutes(startDate, Number(duration));

    // Processa participantes
    const processedAttendees = Array.isArray(attendees)
      ? attendees
      : attendees.split(',').map(email => email.trim());

    const eventData = {
      summary: title,
      description,
      location,
      start: {
        dateTime: startDate.toISOString(),
        timeZone: timezone
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: timezone
      },
      attendees: processedAttendees.filter(Boolean).map(email => ({ email })),
      visibility,
      reminders: {
        useDefault: false,
        overrides: [
          { method: "email", minutes: 24 * 60 }, // 1 dia antes
          { method: "popup", minutes: 30 }       // 30 min antes
        ]
      }
    };

    // Configurações para Google Meet
    const insertParams = {
      calendarId,
      sendUpdates: sendNotifications ? "all" : "none",
      requestBody: eventData
    };

    if (meetEnabled) {
      eventData.conferenceData = {
        createRequest: {
          requestId: `orbion-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        }
      };
      insertParams.conferenceDataVersion = 1;
    }

    const response = await calendar.events.insert(insertParams);
    const createdEvent = response.data;

    // Salva no histórico local
    await saveEventToMemory(createdEvent);

    const result = {
      id: createdEvent.id,
      title: createdEvent.summary,
      htmlLink: createdEvent.htmlLink,
      meetLink: createdEvent.hangoutLink ||
                createdEvent.conferenceData?.entryPoints?.find(p => p.entryPointType === "video")?.uri,
      start: createdEvent.start.dateTime,
      end: createdEvent.end.dateTime,
      attendees: createdEvent.attendees || [],
      created: createdEvent.created
    };

    console.log(`✅ Evento criado: ${title} (${date} ${time})`);
    return { success: true, event: result };

  } catch (error) {
    console.error("❌ Erro ao criar evento:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Atualiza evento existente
 */
export async function updateEvent(eventId, updates) {
  try {
    const auth = await getAuthenticatedClient();
    const calendar = google.calendar({ version: "v3", auth });

    // Busca evento atual
    const currentEvent = await calendar.events.get({
      calendarId: "primary",
      eventId
    });

    const eventData = { ...currentEvent.data };

    // Aplica atualizações
    if (updates.title) eventData.summary = updates.title;
    if (updates.description !== undefined) eventData.description = updates.description;
    if (updates.location !== undefined) eventData.location = updates.location;

    if (updates.date || updates.time) {
      const date = updates.date || eventData.start.dateTime.split('T')[0];
      const time = updates.time || eventData.start.dateTime.split('T')[1].substr(0, 5);
      const startDate = formatDateTime(date, time);
      const endDate = addMinutes(startDate, updates.duration || 60);

      eventData.start.dateTime = startDate.toISOString();
      eventData.end.dateTime = endDate.toISOString();
    }

    const response = await calendar.events.update({
      calendarId: "primary",
      eventId,
      sendUpdates: "all",
      requestBody: eventData
    });

    console.log(`✅ Evento atualizado: ${eventId}`);
    return { success: true, event: response.data };

  } catch (error) {
    console.error("❌ Erro ao atualizar evento:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Remove evento
 */
export async function deleteEvent(eventId, sendNotifications = true) {
  try {
    const auth = await getAuthenticatedClient();
    const calendar = google.calendar({ version: "v3", auth });

    await calendar.events.delete({
      calendarId: "primary",
      eventId,
      sendUpdates: sendNotifications ? "all" : "none"
    });

    console.log(`✅ Evento removido: ${eventId}`);
    return { success: true };

  } catch (error) {
    console.error("❌ Erro ao remover evento:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Busca horários livres para agendamento
 */
export async function findFreeSlots({
  date,
  durationMinutes = 60,
  workingHours = { start: "09:00", end: "18:00" },
  timezone = "America/Fortaleza"
}) {
  try {
    const auth = await getAuthenticatedClient();
    const calendar = google.calendar({ version: "v3", auth });

    const startOfDay = new Date(`${date}T${workingHours.start}:00`);
    const endOfDay = new Date(`${date}T${workingHours.end}:00`);

    // Busca eventos do dia
    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString(),
      singleEvents: true,
      orderBy: "startTime"
    });

    const events = response.data.items || [];
    const freeSlots = [];
    let currentTime = new Date(startOfDay);

    for (const event of events) {
      const eventStart = new Date(event.start.dateTime);

      if (currentTime < eventStart) {
        const availableMinutes = (eventStart - currentTime) / (1000 * 60);
        if (availableMinutes >= durationMinutes) {
          freeSlots.push({
            start: currentTime.toTimeString().substr(0, 5),
            end: eventStart.toTimeString().substr(0, 5),
            duration: availableMinutes
          });
        }
      }

      currentTime = new Date(Math.max(currentTime, new Date(event.end.dateTime)));
    }

    // Verifica tempo restante até fim do expediente
    if (currentTime < endOfDay) {
      const remainingMinutes = (endOfDay - currentTime) / (1000 * 60);
      if (remainingMinutes >= durationMinutes) {
        freeSlots.push({
          start: currentTime.toTimeString().substr(0, 5),
          end: endOfDay.toTimeString().substr(0, 5),
          duration: remainingMinutes
        });
      }
    }

    return { success: true, freeSlots, date };

  } catch (error) {
    console.error("❌ Erro ao buscar horários livres:", error);
    return { success: false, error: error.message, freeSlots: [] };
  }
}

/**
 * Gera sugestões inteligentes de agendamento
 */
export async function suggestMeetingTimes({
  clientName,
  urgencyLevel = "medium",
  preferredDuration = 60,
  preferredTimeSlots = ["morning", "afternoon"]
}) {
  try {
    const suggestions = [];
    const today = new Date();

    // Define quantos dias à frente buscar baseado na urgência
    const daysAhead = {
      high: 1,
      medium: 3,
      low: 7
    }[urgencyLevel] || 3;

    // Define horários preferenciais
    const timeSlots = {
      morning: ["09:00", "09:30", "10:00", "10:30", "11:00"],
      afternoon: ["14:00", "14:30", "15:00", "15:30", "16:00"],
      evening: ["17:00", "17:30", "18:00"]
    };

    for (let i = 0; i < daysAhead; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() + i + 1);

      // Pula fins de semana
      if (checkDate.getDay() === 0 || checkDate.getDay() === 6) continue;

      const dateStr = checkDate.toISOString().split('T')[0];
      const freeSlots = await findFreeSlots({
        date: dateStr,
        durationMinutes: preferredDuration
      });

      if (freeSlots.success) {
        for (const period of preferredTimeSlots) {
          const times = timeSlots[period] || [];

          for (const time of times) {
            const isAvailable = freeSlots.freeSlots.some(slot =>
              time >= slot.start && time < slot.end
            );

            if (isAvailable) {
              suggestions.push({
                date: dateStr,
                time,
                dateFormatted: formatBrazilianDate(dateStr),
                timeFormatted: formatBrazilianTime(time),
                period,
                urgencyScore: urgencyLevel === "high" ? 10 : urgencyLevel === "medium" ? 7 : 5
              });

              if (suggestions.length >= 5) break;
            }
          }
          if (suggestions.length >= 5) break;
        }
      }
      if (suggestions.length >= 5) break;
    }

    return { success: true, suggestions, clientName };

  } catch (error) {
    console.error("❌ Erro ao sugerir horários:", error);
    return { success: false, error: error.message, suggestions: [] };
  }
}

/**
 * Salva evento na memória local para referência rápida
 */
async function saveEventToMemory(event) {
  try {
    const eventKey = `calendar_event_${event.id}`;
    const eventData = {
      id: event.id,
      title: event.summary,
      start: event.start.dateTime,
      end: event.end.dateTime,
      created: event.created,
      attendees: event.attendees || []
    };

    await setMemory(eventKey, JSON.stringify(eventData));

    // Atualiza lista de eventos recentes
    const recentEvents = JSON.parse(await getMemory("recent_events") || "[]");
    recentEvents.unshift(event.id);
    if (recentEvents.length > 50) recentEvents.pop();

    await setMemory("recent_events", JSON.stringify(recentEvents));

  } catch (error) {
    console.warn("⚠️ Falha ao salvar evento na memória:", error);
  }
}

/**
 * Status e diagnósticos do sistema
 */
export async function getCalendarStatus() {
  try {
    const hasCredentials = fs.existsSync(CREDENTIALS_PATH);
    const hasToken = fs.existsSync(TOKEN_PATH);

    let authStatus = "not_configured";
    let calendarInfo = null;

    if (hasCredentials && hasToken) {
      try {
        const auth = await getAuthenticatedClient();
        const calendar = google.calendar({ version: "v3", auth });

        const calendarList = await calendar.calendarList.get({ calendarId: "primary" });
        authStatus = "authenticated";
        calendarInfo = {
          email: calendarList.data.id,
          name: calendarList.data.summary,
          timezone: calendarList.data.timeZone
        };

      } catch (error) {
        authStatus = "token_expired";
      }
    } else if (hasCredentials) {
      authStatus = "needs_authorization";
    }

    return {
      status: authStatus,
      hasCredentials,
      hasToken,
      calendarInfo,
      authUrl: authStatus !== "authenticated" ? getGoogleAuthUrl() : null
    };

  } catch (error) {
    return {
      status: "error",
      error: error.message,
      hasCredentials: false,
      hasToken: false
    };
  }
}
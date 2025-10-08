// src/tools/calendar_google.js
// Integração Google Calendar (OAuth2) — compatível com server.js (/api/events usa date+time+duration)
import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import { google } from "googleapis";

// --------- Config (.env) ---------
const CREDENTIALS_PATH = process.env.GOOGLE_CREDENTIALS_FILE || "./google_credentials.json";
const TOKEN_PATH       = process.env.GOOGLE_TOKEN_PATH       || "./google_token.json";
const REDIRECT_URI     = process.env.GOOGLE_REDIRECT_URI     || "http://localhost:3001/oauth2callback";

// Scopes para Calendar, Sheets e Drive (projeto unificado)
const SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/spreadsheets"
];

// ========= Helpers básicos =========
function assertFileExists(p) {
  if (!fs.existsSync(p)) {
    throw new Error(`Credenciais não encontradas em ${path.resolve(p)}. Baixe o JSON no Console e salve como ${CREDENTIALS_PATH}`);
  }
}

function loadCredentials() {
  assertFileExists(CREDENTIALS_PATH);
  const raw = fs.readFileSync(CREDENTIALS_PATH, "utf-8");
  const json = JSON.parse(raw);

  // lida com formatos "web" (console) e "installed"
  const cfg = json.web || json.installed || json;

  const client_id     = cfg.client_id;
  const client_secret = cfg.client_secret;
  const redirect_uris = cfg.redirect_uris || [REDIRECT_URI];

  if (!client_id || !client_secret) {
    throw new Error("Arquivo de credenciais não possui client_id/client_secret.");
  }
  const redirectUri = REDIRECT_URI || redirect_uris[0];

  return { client_id, client_secret, redirectUri };
}

function newOAuthClient() {
  const { client_id, client_secret, redirectUri } = loadCredentials();
  return new google.auth.OAuth2(client_id, client_secret, redirectUri);
}

async function getAuthedClient() {
  const auth = newOAuthClient();
  if (!fs.existsSync(TOKEN_PATH)) {
    const hint = `TOKEN_MISSING: nenhum token encontrado em ${path.resolve(TOKEN_PATH)}. Abra /auth/google para autorizar o acesso.`;
    throw new Error(hint);
  }
  const raw = await fsp.readFile(TOKEN_PATH, "utf-8");
  const token = JSON.parse(raw);
  auth.setCredentials(token);
  return auth;
}

function addMinutes(date, minutes) {
  const d = new Date(date.getTime());
  d.setMinutes(d.getMinutes() + minutes);
  return d;
}

function toLocalDate(dateStr /* YYYY-MM-DD */, timeStr /* HH:mm */) {
  // Retorna Date no timezone local da máquina.
  // Ao enviar para o Google, informamos timeZone explicitamente, então está OK.
  // Ex.: "2025-08-26", "14:30" -> Date(2025-08-26T14:30:00 local)
  return new Date(`${dateStr}T${timeStr}:00`);
}

// ========= Fluxo OAuth =========
export function getGoogleAuthUrl() {
  const auth = newOAuthClient();
  const url = auth.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES
  });
  return url;
}

export async function handleOAuthCallback(req, res) {
  try {
    const code = req.query.code;
    if (!code) {
      return res.status(400).send("Código OAuth ausente.");
    }
    const auth = newOAuthClient();
    const { tokens } = await auth.getToken(code);
    auth.setCredentials(tokens);
    await fsp.writeFile(TOKEN_PATH, JSON.stringify(tokens, null, 2));
    // Redireciona de volta ao dashboard com “ok”
    return res.redirect("/dashboard-pro.html?google=ok");
  } catch (e) {
    console.error("Erro no OAuth callback:", e);
    return res.status(500).send("Falha ao salvar token do Google.");
  }
}

// ========= LISTAR EVENTOS =========
export async function gcalListEventsDetailed({ range = "week", q = "" } = {}) {
  const auth = await getAuthedClient(); // pode lançar TOKEN_MISSING
  const calendar = google.calendar({ version: "v3", auth });

  // Calcula timeMin/timeMax simples
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  if (range === "day") end.setDate(end.getDate() + 1);
  else if (range === "month") end.setMonth(end.getMonth() + 1);
  else end.setDate(end.getDate() + 7); // default week

  const resp = await calendar.events.list({
    calendarId: "primary",
    timeMin: start.toISOString(),
    timeMax: end.toISOString(),
    q: q || undefined,
    singleEvents: true,
    orderBy: "startTime"
  });

  const events = (resp.data.items || []).map(evt => {
    const start = evt.start?.dateTime || evt.start?.date || null;
    const end = evt.end?.dateTime || evt.end?.date || null;
    const attendees = (evt.attendees || []).map(a => a.email);
    const meet = evt.hangoutLink || evt.conferenceData?.entryPoints?.find(p => p.entryPointType === "video")?.uri || null;

    return {
      id: evt.id,
      status: evt.status,
      summary: evt.summary,
      description: evt.description,
      location: evt.location,
      start,
      end,
      attendees,
      meet,
      htmlLink: evt.htmlLink
    };
  });

  return events;
}

// ========= CRIAR EVENTO =========
export async function gcalAddEvent({
  title,
  date,         // "YYYY-MM-DD"
  time,         // "HH:mm"
  duration = 60,// minutos
  location,
  attendees = [], // array de e-mails OU string "a@b.com,b@c.com" (server já normaliza)
  notes,
  meet = "google", // "google" | "none"
  timezone = "America/Fortaleza"
}) {
  const auth = await getAuthedClient(); // pode lançar TOKEN_MISSING
  const calendar = google.calendar({ version: "v3", auth });

  // Monta início/fim como dateTime + timeZone
  const startDate = toLocalDate(date, time);
  const endDate = addMinutes(startDate, Number(duration) || 60);

  const event = {
    summary: title,
    description: notes || "",
    location: location || "",
    start: { dateTime: startDate.toISOString().slice(0, 19), timeZone: timezone },
    end:   { dateTime: endDate.toISOString().slice(0, 19),   timeZone: timezone },
    attendees: (attendees || []).filter(Boolean).map(email => ({ email })),
  };

  // Conferência (Google Meet)
  const requestBody = { ...event };
  const params = { calendarId: "primary" };
  if (meet === "google") {
    const requestId = `orbion-${Date.now()}`;
    requestBody.conferenceData = {
      createRequest: { requestId }
    };
    params.conferenceDataVersion = 1;
  }

  const resp = await calendar.events.insert({
    ...params,
    requestBody
  });

  const created = resp.data || {};
  return {
    id: created.id,
    htmlLink: created.htmlLink,
    meet:
      created.hangoutLink ||
      created.conferenceData?.entryPoints?.find(p => p.entryPointType === "video")?.uri ||
      null
  };
}


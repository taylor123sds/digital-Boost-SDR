// src/tools/google_auth.js
// Gerador de URL de autorização específica para Google Sheets
import fs from "fs";
import { google } from "googleapis";

const CREDENTIALS_PATH = "./google_credentials.json";
const REDIRECT_URI = "http://localhost:3001/oauth2callback";

// Escopos necessários para Google Sheets + Drive + Calendar
const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events"
];

function loadCredentials() {
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    throw new Error(`Credenciais não encontradas: ${CREDENTIALS_PATH}`);
  }

  const raw = fs.readFileSync(CREDENTIALS_PATH, "utf-8");
  const json = JSON.parse(raw);
  const cfg = json.web || json.installed || json;

  return {
    client_id: cfg.client_id,
    client_secret: cfg.client_secret,
    redirect_uri: cfg.redirect_uris ? cfg.redirect_uris[0] : REDIRECT_URI
  };
}

export function getSheetsAuthUrl() {
  const { client_id, client_secret, redirect_uri } = loadCredentials();

  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uri
  );

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES
  });

  return authUrl;
}

export function newOAuthClient() {
  const { client_id, client_secret, redirect_uri } = loadCredentials();

  return new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uri
  );
}
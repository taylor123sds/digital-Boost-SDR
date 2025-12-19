import { google } from 'googleapis';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const CREDENTIALS_PATH = process.env.GOOGLE_CREDENTIALS_FILE || "./google_credentials.json";
const TOKEN_PATH = process.env.GOOGLE_TOKEN_PATH || "./google_token.json";

async function clearFunilSheet() {
  try {
    // Load credentials
    const credRaw = fs.readFileSync(CREDENTIALS_PATH, 'utf-8');
    const cred = JSON.parse(credRaw);
    const cfg = cred.web || cred.installed || cred;

    // Create OAuth2 client
    const oAuth2Client = new google.auth.OAuth2(
      cfg.client_id,
      cfg.client_secret,
      process.env.GOOGLE_REDIRECT_URI || "http://localhost:3001/oauth2callback"
    );

    // Load saved token
    const tokenRaw = fs.readFileSync(TOKEN_PATH, 'utf-8');
    const token = JSON.parse(tokenRaw);
    oAuth2Client.setCredentials(token);

    const sheets = google.sheets({ version: 'v4', auth: oAuth2Client });
    const sheetId = process.env.GOOGLE_FUNIL_SHEET_ID || process.env.GOOGLE_LEADS_SHEET_ID;

    // Clear all data except header row
    await sheets.spreadsheets.values.clear({
      spreadsheetId: sheetId,
      range: 'funil!A2:M1000'
    });

    console.log('✅ Aba funil do Google Sheets limpa com sucesso!');
    console.log('   Planilha:', sheetId);

  } catch (error) {
    console.error('❌ Erro ao limpar funil:', error.message);
  }
}

clearFunilSheet();

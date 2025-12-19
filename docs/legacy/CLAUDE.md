# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ORBION - A comprehensive AI SDR (Sales Development Representative) agent built in Node.js with ES6 modules. This is an advanced WhatsApp-integrated AI agent system with:
- OpenAI GPT-4o-mini integration for conversational AI
- Evolution API WhatsApp integration with full multimedia support
- SQLite database for conversation memory and lead management
- Audio processing with FFmpeg, Whisper transcription, and TTS
- Excel-based lead management and qualification
- Google Calendar and Google Sheets integration
- Advanced sales intelligence and qualification systems
- Multiple dashboard interfaces for management

## Commands

```bash
# Install dependencies
npm install

# Start server (both commands equivalent)
npm start
npm run dev
# Both run: node src/server.js

# WhatsApp Integration - Evolution API Stack
docker-compose up -d    # Starts PostgreSQL, Redis, and Evolution API
docker-compose down     # Stops the stack
```

## Environment Configuration

Copy `.env.example` to `.env` and configure:

### Required
- `OPENAI_API_KEY` - OpenAI API key for GPT and Whisper
- `PORT` - Server port (default: 3000)

### OpenAI Models
- `OPENAI_CHAT_MODEL` - Chat model (default: gpt-4o-mini)
- `OPENAI_EMB_MODEL` - Embedding model (default: text-embedding-3-small)

### WhatsApp Integration
- `EVOLUTION_BASE_URL` - Evolution API URL (default: http://localhost:8080)
- `EVOLUTION_API_KEY` - Evolution API key (default: ORBION_KEY_123456)
- `EVOLUTION_INSTANCE` - Instance name (default: orbion)

### Lead Management
- `LEADS_FILE` - Excel file path (default: data/leads.xlsx)

### Google Integrations
- `GOOGLE_CREDENTIALS_FILE` - Google OAuth credentials file (default: ./google_credentials.json)
- `GOOGLE_TOKEN_PATH` - Google OAuth token storage (default: ./google_token.json)
- `GOOGLE_REDIRECT_URI` - OAuth callback URL (default: http://localhost:3001/oauth2callback)
- `GOOGLE_LEADS_SHEET_ID` - Sheet ID for automatic lead saving (optional)
- `GOOGLE_INTERACTIONS_SHEET_ID` - Sheet ID for interaction logging (optional)

## Architecture

### Core Files
- **src/server.js** - Main Express server with comprehensive WhatsApp API integration
- **src/agent.js** - OpenAI conversation handler with ORBION company profile
- **src/memory.js** - SQLite database management (orbion.db)
- **src/tools_spec.js** - Tool definitions (currently inactive)

### Database Schema (SQLite: orbion.db)
- `memory` - Key-value storage for system state
- `whatsapp_messages` - WhatsApp conversation history
- `events` - Calendar events storage
- `tasks` - Task management
- `docs` - RAG document chunks with embeddings

### Advanced Tools (src/tools/)
Comprehensive suite of sales and WhatsApp tools:
- `whatsapp.js` - Core WhatsApp operations with Evolution API
- `audio.js` - Audio processing, FFmpeg, Whisper transcription, TTS
- `conversation_manager.js` - Advanced conversation handling
- `sales_intelligence.js` - Lead profiling and strategy generation
- `qualification_system.js` - Lead qualification and objection handling
- `profile_analyzer.js` - Contact analysis for personalization
- `archetypes.js` - Behavioral archetype analysis
- `natal_personas.js` - Local business persona identification
- `meeting_scheduler.js` - Calendar integration for scheduling
- `search_knowledge.js` - RAG knowledge retrieval
- `calendar_google.js` - Google Calendar OAuth integration

### Dashboard Interfaces (public/)
Multiple specialized dashboards:
- `dashboard-pro.html` - Main desktop dashboard (default route)
- `mobile-dashboard.html` - Mobile-optimized interface
- `sales-dashboard.html` - Sales analytics and metrics
- `archetypes-dashboard.html` - Archetype system management
- `campaign-dashboard.html` - Campaign management interface

## Key API Endpoints

### Core Chat
- `POST /api/chat` - Main agent conversation endpoint

### WhatsApp Integration
- `POST /api/webhook/evolution` - Evolution API webhook for incoming messages
- `POST /api/whatsapp/send` - Send text messages
- `POST /api/whatsapp/send-tts` - Send voice messages with TTS
- `POST /api/whatsapp/call-lead` - Intelligent lead calling
- `POST /api/whatsapp/intelligent-campaign` - Automated campaigns
- `GET /api/whatsapp/status` - Evolution API connection status

### Lead Management
- `GET /api/leads?q=search` - Search leads from Excel file
- `GET /api/leads/debug` - Lead file diagnostics

### Analytics
- `GET /api/analytics/overview` - Comprehensive metrics
- `GET /api/analytics/hourly` - Hourly message statistics
- `GET /api/analytics/top-contacts` - Most active contacts

### Google Calendar
- `GET /api/google/auth-url` - OAuth authorization URL
- `GET /oauth2callback` - OAuth callback handler
- `GET /api/events` - List calendar events
- `POST /api/events` - Create events

## Module System

**Critical**: This project uses ES6 modules (`"type": "module"` in package.json)
- Use `import/export` syntax, not `require/module.exports`
- All file imports must include `.js` extension
- Example: `import { chatHandler } from "./agent.js"`

## WhatsApp Integration Setup

### Evolution API Stack
1. Start services: `docker-compose up -d`
2. Access Evolution Manager: http://localhost:8080/manager
3. Create instance named "orbion" (or your EVOLUTION_INSTANCE value)
4. Configure webhook URL: http://localhost:3000/api/webhook/evolution
5. Scan QR code to authenticate WhatsApp

### Docker Services
- **PostgreSQL** (port 5432): Database for Evolution API
- **Redis** (port 6379): Cache for Evolution API
- **Evolution API** (port 8080): WhatsApp Web integration

## Development Workflow

### Starting Development
1. `cp .env.example .env` and configure environment
2. `docker-compose up -d` for WhatsApp integration
3. `npm install` to install dependencies
4. `npm start` to run the server
5. Visit http://localhost:3000 (redirects to appropriate dashboard)

### Database Access
- SQLite database: `orbion.db` (auto-created)
- Direct SQL queries used (no ORM)
- Memory functions in `src/memory.js`

### Audio Processing
- Requires FFmpeg (auto-installed via @ffmpeg-installer)
- Supports voice message transcription via Whisper
- TTS generation via OpenAI API
- Handles multiple audio formats

## Business Context

ORBION represents Digital Boost, a Natal-based growth company targeting PMEs (small-medium businesses) with:
- AI agents for 24/7 customer service
- CRM automation with Kommo
- Growth consulting and digital strategies
- Recognized by Sebrae as top 15 tech startups in Brazil

The agent specializes in:
- Lead qualification and nurturing
- WhatsApp-based sales conversations
- Local market expertise (Natal, RN)
- Behavioral analysis and personalization
- Automated campaign management

## Google Sheets Integration

### Setup
1. See `GOOGLE_SHEETS_SETUP.md` for complete setup guide
2. Copy `google_credentials.json.example` to `google_credentials.json`
3. Configure Google Cloud Console OAuth2 credentials

### API Endpoints
- `GET /api/sheets/search` - Search Google Sheets
- `GET /api/sheets/:id/read` - Read sheet data
- `POST /api/sheets/create` - Create new sheet
- `POST /api/sheets/:id/append` - Add data to sheet
- `POST /api/sheets/save-lead` - Auto-save leads
- `POST /api/sheets/save-interaction` - Log interactions

### Dashboard
- Access: http://localhost:3001/sheets-dashboard.html
- Test endpoints and OAuth authorization

## Important Files

- `docker-compose.yml` - Evolution API stack configuration
- `data/leads.xlsx` - Lead database (Excel format)
- `docs/sample_faq.txt` - Knowledge base for RAG
- `google_credentials.json` - Google OAuth setup (required for Sheets)
- `google_token.json` - OAuth tokens (auto-generated)
- `GOOGLE_SHEETS_SETUP.md` - Complete setup guide
- `orbion.db` - Main SQLite database (auto-created)
- `public/sheets-dashboard.html` - Google Sheets management interface
#!/bin/bash

# Script auxiliar para extrair rotas do server.js
# Este script ajuda a visualizar as seções que precisam ser extraídas

echo "🔍 Visualizador de Rotas - server.js"
echo "===================================="
echo ""

SERVER_FILE="src/server.js"

if [ ! -f "$SERVER_FILE" ]; then
  echo "❌ Arquivo server.js não encontrado em: $SERVER_FILE"
  exit 1
fi

echo "📊 Seções identificadas para extração:"
echo ""

echo "1. ✅ WEBHOOK (linhas 149-543) - JÁ EXTRAÍDO"
echo "   - POST /api/webhook/evolution"
echo ""

echo "2. ✅ ADMIN (linhas 545-853) - JÁ EXTRAÍDO"
echo "   - 15 endpoints de administração"
echo ""

echo "3. ✅ DASHBOARD (linhas 855-1127) - JÁ EXTRAÍDO"
echo "   - 6 endpoints + TTS"
echo ""

echo "4. ⏳ WHATSAPP (linhas 1129-1366)"
echo "   - POST /api/whatsapp/send"
echo "   - POST /api/campaign/run"
echo "   - GET /api/whatsapp/campaign-status"
echo "   - POST /api/whatsapp/intelligent-campaign"
echo ""

echo "5. ⏳ GOOGLE/CALENDAR (linhas 1370-1597)"
echo "   - GET /api/google/auth-url"
echo "   - GET /auth/google"
echo "   - GET /oauth2callback"
echo "   - GET /api/calendar/status"
echo "   - GET /api/events"
echo "   - POST /api/events"
echo "   - PUT /api/events/:eventId"
echo "   - DELETE /api/events/:eventId"
echo "   - GET /api/calendar/free-slots"
echo "   - POST /api/calendar/suggest-times"
echo ""

echo "6. ⏳ GOOGLE/SHEETS (linhas 1599-1784)"
echo "   - GET /api/sheets/search"
echo "   - GET /api/sheets/:id/read"
echo "   - POST /api/sheets/create"
echo "   - POST /api/sheets/:id/append"
echo "   - POST /api/sheets/save-lead"
echo "   - POST /api/sheets/save-interaction"
echo "   - GET /api/leads"
echo "   - GET /api/dashboard/leads"
echo ""

echo "7. ⏳ ANALYTICS (linhas 1786-2182)"
echo "   - GET /api/analytics/overview"
echo "   - GET /api/memory/stats"
echo "   - GET /api/leads/debug"
echo "   - POST /api/leads/update-stage"
echo "   - GET /api/analytics/hourly"
echo "   - GET /api/analytics/top-contacts"
echo "   - GET /api/analytics/whatsapp-stats"
echo "   - GET /api/analytics/agent-metrics"
echo ""

echo "8. ⏳ FUNIL (linhas 2183-2338)"
echo "   - GET /api/funil/bant"
echo "   - GET /api/funil/bant/:contactId"
echo ""

echo "9. ⏳ LEARNING (linhas 2340-2401)"
echo "   - GET /api/learning/report"
echo "   - GET /api/learning/patterns"
echo "   - GET /api/learning/score/:contactId"
echo ""

echo "10. ⏳ CALIBRATION (linhas 2403-2479)"
echo "    - POST /api/calibration/test"
echo "    - GET /api/calibration/status"
echo ""

echo "11. ⏳ DEBUG (linhas 2481-2517)"
echo "    - GET /api/debug/sheets"
echo ""

echo "12. ⏳ PORTS (linhas 2519-2579)"
echo "    - GET /api/ports/status"
echo "    - GET /api/ports/available"
echo "    - POST /api/ports/release/:port"
echo ""

echo "===================================="
echo ""
echo "📝 Para extrair uma seção, use:"
echo "   sed -n '<início>,<fim>p' src/server.js > temp_extract.txt"
echo ""
echo "Exemplo para WHATSAPP:"
echo "   sed -n '1129,1366p' src/server.js > temp_whatsapp.txt"
echo ""
echo "Depois copie o conteúdo e aplique o template de rotas."
echo ""

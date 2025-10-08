# Sistema de Calendário ORBION - Enhanced

Sistema profissional e robusto de calendário integrado com Google Calendar para o agente ORBION.

## 🎯 Melhorias Implementadas

### Problemas Resolvidos
- ✅ **Inconsistência de portas**: Corrigido uso incorreto da porta 3001
- ✅ **Dependências circulares**: Eliminadas com imports otimizados
- ✅ **Tratamento de erros**: Sistema robusto de error handling
- ✅ **Interface limitada**: Dashboard profissional criado
- ✅ **Sincronização**: Sistema automático de sincronização

### Novos Recursos
- 📅 **Calendar Enhanced**: Sistema completo com validações avançadas
- 🎨 **Interface Profissional**: Dashboard moderno e responsivo
- 🔍 **Busca Inteligente**: Horários livres e sugestões de agendamento
- 🔄 **Auto-sync**: Sincronização automática com Google Calendar
- 📱 **Responsivo**: Interface adaptada para mobile
- 🎯 **IA Integration**: Sugestões inteligentes baseadas em urgência

## 📁 Arquivos Principais

### Backend
- `src/tools/calendar_enhanced.js` - Sistema principal de calendário
- `src/tools/meeting_scheduler.js` - Agendamento de reuniões (atualizado)
- `src/server.js` - Endpoints da API (enhanced)

### Frontend
- `public/calendar-dashboard.html` - Dashboard profissional
- `public/dashboard-pro.html` - Dashboard principal (com calendário integrado)

## 🔧 API Endpoints

### Calendário Enhanced
```bash
# Status da conexão
GET /api/calendar/status

# Listar eventos com filtros
GET /api/events?range=week&query=reunião&maxResults=50

# Criar evento
POST /api/events
{
  "title": "Reunião com Cliente",
  "date": "2025-01-23",
  "time": "14:00",
  "duration": 60,
  "description": "Discussão sobre projeto",
  "attendees": ["cliente@email.com"],
  "meetEnabled": true
}

# Atualizar evento
PUT /api/events/:eventId
{
  "title": "Novo título",
  "date": "2025-01-24",
  "time": "15:00"
}

# Remover evento
DELETE /api/events/:eventId?sendNotifications=true

# Buscar horários livres
GET /api/calendar/free-slots?date=2025-01-23&duration=60

# Sugestões inteligentes
POST /api/calendar/suggest-times
{
  "clientName": "João Silva",
  "urgencyLevel": "high",
  "duration": 60
}
```

### OAuth Enhanced
```bash
# URL de autorização
GET /api/google/auth-url

# Callback de autorização (automático)
GET /oauth2callback?code=xxx
```

## 🚀 Uso do Sistema

### 1. Configuração Inicial
```bash
# Copiar credenciais do Google
cp google_credentials.json.example google_credentials.json

# Configurar variáveis de ambiente
GOOGLE_CREDENTIALS_FILE=./google_credentials.json
GOOGLE_TOKEN_PATH=./google_token.json
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth2callback
```

### 2. Autorização Google Calendar
```bash
# Acessar dashboard
http://localhost:3000/calendar-dashboard.html

# Clicar em "Verificar Auth" para autorizar
# Seguir fluxo OAuth no Google
```

### 3. Uso no Agente
```javascript
import {
  createEvent,
  listEvents,
  suggestMeetingTimes,
  getCalendarStatus
} from './tools/calendar_enhanced.js';

// Verificar status
const status = await getCalendarStatus();

// Criar evento
const result = await createEvent({
  title: "Reunião ORBION",
  date: "2025-01-23",
  time: "14:00",
  duration: 60,
  attendees: ["cliente@email.com"]
});

// Sugerir horários
const suggestions = await suggestMeetingTimes({
  clientName: "João Silva",
  urgencyLevel: "high"
});
```

### 4. Agendamento de Reuniões
```javascript
import {
  completeSchedulingProcess,
  generateMeetingSuggestions,
  rescheduleMeeting
} from './tools/meeting_scheduler.js';

// Processo completo
const result = await completeSchedulingProcess(
  "João Silva",
  "joao@email.com",
  "5511999999999",
  analysisData
);

// Reagendar
await rescheduleMeeting(eventId, "2025-01-24", "15:00");
```

## 🎨 Interface do Dashboard

### Recursos Principais
- **Visualização Multi-view**: Mês, semana, dia
- **Navegação Intuitiva**: Controles de data otimizados
- **Eventos Visuais**: Cores categorizadas por tipo
- **Ações Rápidas**: Criação, sincronização, sugestões
- **Status Real-time**: Indicador de conexão
- **Modal Profissional**: Formulário de criação completo

### Ações Disponíveis
- ➕ **Novo Evento**: Modal com todos os campos
- 🔄 **Sincronizar**: Atualização manual dos eventos
- 🎯 **Sugerir Horários**: IA para sugestões inteligentes
- 🔍 **Horários Livres**: Busca de disponibilidade
- 📍 **Ir para Hoje**: Navegação rápida
- 🔑 **Verificar Auth**: Status da autorização

## 🔒 Segurança e Validações

### Validações de Entrada
- ✅ Títulos obrigatórios
- ✅ Datas e horários válidos
- ✅ Duração mínima/máxima
- ✅ Emails de participantes válidos
- ✅ Campos sanitizados

### Tratamento de Erros
- 🔐 **Token Expirado**: Remoção automática e re-auth
- 🚫 **API Limits**: Handling gracioso de quotas
- 📡 **Conectividade**: Fallbacks para offline
- 🔍 **Validação**: Feedback claro de erros

### Sincronização Robusta
- 🔄 **Auto-retry**: Tentativas automáticas em falhas
- 💾 **Cache Local**: Armazenamento na memória SQLite
- 🕒 **Timestamps**: Controle de versão de eventos
- 📊 **Logging**: Rastreamento completo de operações

## 🎯 Integração com Agente ORBION

### WhatsApp Integration
```javascript
// No agente, quando cliente solicita agendamento
const suggestions = await suggestMeetingTimes({
  clientName: analysis.clientName,
  urgencyLevel: analysis.urgency,
  preferredDuration: 60
});

// Enviar opções via WhatsApp
await sendWhatsAppMessage(phoneNumber, `
🗓️ Horários disponíveis para reunião:

${suggestions.suggestions.map((s, i) =>
  `${i+1}. ${s.dateFormatted} às ${s.timeFormatted}`
).join('\n')}

Qual horário prefere?
`);
```

### Lead Management
```javascript
// Após confirmação do cliente
const meetingResult = await completeSchedulingProcess(
  clientName,
  clientEmail,
  phoneNumber,
  conversationAnalysis
);

// Automático: Google Calendar + WhatsApp + Database
```

## 📱 Responsividade

### Desktop (1200px+)
- Grid 2 colunas (calendário + sidebar)
- Calendário completo mensal
- Sidebar com eventos e ações

### Tablet (768px - 1199px)
- Grid adaptativo
- Calendário semanal otimizado
- Controles reorganizados

### Mobile (< 768px)
- Layout single-column
- Calendário de semana
- Modais full-screen
- Touch-friendly controls

## 🚀 Performance

### Otimizações Implementadas
- 📦 **Lazy Loading**: Carregamento sob demanda
- 🗂️ **Caching**: SQLite para cache local
- 🔄 **Debouncing**: Evita requests excessivos
- 📊 **Pagination**: Controle de quantidade de eventos
- 🎭 **Virtual Rendering**: Otimização de DOM

### Métricas Esperadas
- ⚡ **First Load**: < 2s
- 🔄 **Sync Time**: < 1s
- 📱 **Mobile FCP**: < 1.5s
- 💾 **Memory Usage**: < 50MB

## 🔮 Roadmap Futuro

### Próximas Versões
- 🤖 **IA Avançada**: Análise de padrões de agendamento
- 📊 **Analytics**: Métricas de produtividade
- 🔗 **Integrações**: Zoom, Teams, etc.
- 📧 **Email**: Confirmações automáticas
- 🌐 **Multi-calendar**: Suporte a múltiplos calendários
- 🎨 **Themes**: Personalização visual

### Melhorias Técnicas
- 🚀 **WebSockets**: Updates real-time
- 🔄 **Service Workers**: Funcionalidade offline
- 📱 **PWA**: Instalação como app
- 🔔 **Push Notifications**: Lembretes nativos

---

## 📞 Suporte

Para dúvidas ou problemas com o sistema de calendário:

1. Verificar logs do servidor: `npm start`
2. Testar endpoints: Dashboard > Verificar Auth
3. Reautorizar Google: Acessar URL de auth no console
4. Verificar credenciais: `google_credentials.json`

Sistema desenvolvido para **ORBION Digital Boost** 🚀
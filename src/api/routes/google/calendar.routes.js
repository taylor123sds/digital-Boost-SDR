/**
 * @file calendar.routes.js
 * @description Rotas do Google Calendar (auth + CRUD de eventos)
 * Extraído de server.js (linhas 1386-1597)
 */

import express from 'express';

const router = express.Router();

// Lazy import do calendar enhanced
let calendarEnhanced;
async function getCalendarEnhanced() {
  if (!calendarEnhanced) {
    const module = await import('../../../tools/calendar_enhanced.js');
    calendarEnhanced = module.default;
  }
  return calendarEnhanced;
}

// ===== GOOGLE AUTH ROUTES =====

/**
 * GET /api/google/auth-url
 * Retorna a URL de autenticação OAuth do Google em JSON
 */
router.get('/api/google/auth-url', async (req, res) => {
  try {
    const calendar = await getCalendarEnhanced();
    const authUrl = calendar.getGoogleAuthUrl();
    res.json({ authUrl, success: true });
  } catch (error) {
    console.error(' Erro ao gerar URL de auth:', error);
    res.status(500).json({ error: error.message, success: false });
  }
});

/**
 * GET /api/google/auth-status
 * Verifica o status de autenticação do Google
 */
router.get('/api/google/auth-status', async (req, res) => {
  try {
    const fs = await import('fs');
    const tokenPath = process.env.GOOGLE_TOKEN_PATH || './google_token.json';
    const authenticated = fs.existsSync(tokenPath);

    let tokenInfo = null;
    if (authenticated) {
      try {
        const tokenContent = fs.readFileSync(tokenPath, 'utf8');
        const tokens = JSON.parse(tokenContent);
        // Não retornar os tokens completos por segurança, apenas informações básicas
        tokenInfo = {
          hasAccessToken: !!tokens.access_token,
          hasRefreshToken: !!tokens.refresh_token,
          expiresIn: tokens.expiry_date
            ? Math.floor((tokens.expiry_date - Date.now()) / 1000)
            : null
        };
      } catch (error) {
        console.error(' Erro ao ler token:', error);
      }
    }

    res.json({
      authenticated,
      tokenInfo,
      success: true
    });
  } catch (error) {
    console.error(' Erro ao verificar status de auth:', error);
    res.status(500).json({ error: error.message, success: false });
  }
});

/**
 * GET /auth/google
 * Iniciar fluxo de autenticação OAuth do Google (redirect)
 */
router.get('/auth/google', async (req, res) => {
  try {
    const calendar = await getCalendarEnhanced();
    const authUrl = calendar.getGoogleAuthUrl();
    res.redirect(authUrl);
  } catch (error) {
    console.error(' Erro ao gerar URL de auth:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /oauth2callback
 * Callback do OAuth do Google (recebe o código de autorização)
 */
router.get('/oauth2callback', async (req, res) => {
  try {
    const calendar = await getCalendarEnhanced();
    await calendar.handleOAuthCallback(req, res);
  } catch (error) {
    console.error(' Erro no callback OAuth:', error);
    res.status(500).send(`<h1> Erro na autorização</h1><p>${error.message}</p>`);
  }
});

// ===== CALENDAR ENHANCED API =====

/**
 * GET /api/calendar/status
 * Status do Google Calendar (autenticação, permissões, etc)
 */
router.get('/api/calendar/status', async (req, res) => {
  try {
    const calendar = await getCalendarEnhanced();
    const status = await calendar.getCalendarStatus();
    res.json(status);
  } catch (error) {
    console.error(' Erro ao verificar status do calendário:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/events
 * Listar eventos do calendário com filtros avançados
 */
router.get('/api/events', async (req, res) => {
  try {
    const { range = 'week', query = '', maxResults = 50 } = req.query;

    const calendar = await getCalendarEnhanced();
    const result = await calendar.listEvents({
      range,
      query,
      maxResults: parseInt(maxResults)
    });

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.json({
      events: result.events,
      total: result.count,
      success: true
    });
  } catch (error) {
    console.error(' Erro ao listar eventos:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/events
 * Criar novo evento no calendário
 */
router.post('/api/events', async (req, res) => {
  try {
    const {
      title,
      summary,
      description,
      date,
      time,
      startDateTime,
      endDateTime,
      location,
      attendees,
      duration = 60,
      meetEnabled = true
    } = req.body;

    // Suporte a ambos os formatos (legacy e enhanced)
    const eventTitle = title || summary;
    let eventDate, eventTime;

    if (date && time) {
      // Formato enhanced
      eventDate = date;
      eventTime = time;
    } else if (startDateTime) {
      // Formato legacy
      eventDate = startDateTime.split('T')[0];
      eventTime = startDateTime.split('T')[1].slice(0, 5);
    } else {
      return res.status(400).json({
        error: 'Forneça date+time ou startDateTime'
      });
    }

    if (!eventTitle) {
      return res.status(400).json({
        error: 'Título é obrigatório'
      });
    }

    const calendar = await getCalendarEnhanced();
    const result = await calendar.createEvent({
      title: eventTitle,
      date: eventDate,
      time: eventTime,
      duration: parseInt(duration),
      description: description || '',
      location: location || '',
      attendees: attendees || [],
      meetEnabled,
      sendNotifications: true
    });

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.json({ success: true, event: result.event });
  } catch (error) {
    console.error(' Erro ao criar evento:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/events/:eventId
 * Atualizar evento existente
 */
router.put('/api/events/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const updates = req.body;

    const calendar = await getCalendarEnhanced();
    const result = await calendar.updateEvent(eventId, updates);

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.json({ success: true, event: result.event });
  } catch (error) {
    console.error(' Erro ao atualizar evento:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/events/:eventId
 * Remover evento do calendário
 */
router.delete('/api/events/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { sendNotifications = true } = req.query;

    const calendar = await getCalendarEnhanced();
    const result = await calendar.deleteEvent(eventId, sendNotifications === 'true');

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.json({ success: true, message: 'Evento removido com sucesso' });
  } catch (error) {
    console.error(' Erro ao remover evento:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/calendar/free-slots
 * Encontrar horários livres na agenda
 */
router.get('/api/calendar/free-slots', async (req, res) => {
  try {
    const { date, duration = 60 } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'Data é obrigatória' });
    }

    const calendar = await getCalendarEnhanced();
    const result = await calendar.findFreeSlots({
      date,
      durationMinutes: parseInt(duration)
    });

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.json(result);
  } catch (error) {
    console.error(' Erro ao buscar horários livres:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/calendar/suggest-times
 * Sugerir melhores horários para reunião com base em IA
 */
router.post('/api/calendar/suggest-times', async (req, res) => {
  try {
    const { clientName, urgencyLevel = 'medium', duration = 60 } = req.body;

    if (!clientName) {
      return res.status(400).json({ error: 'Nome do cliente é obrigatório' });
    }

    const calendar = await getCalendarEnhanced();
    const result = await calendar.suggestMeetingTimes({
      clientName,
      urgencyLevel,
      preferredDuration: parseInt(duration)
    });

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.json(result);
  } catch (error) {
    console.error(' Erro ao sugerir horários:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

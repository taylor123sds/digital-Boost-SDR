/**
 * @file meetings.routes.js
 * @description API Routes para análise de transcrições de reuniões
 * @architecture Layer: API Layer - HTTP Routes
 */

import express from 'express';
import meetingTranscriptionService from '../../services/meetings/MeetingTranscriptionService.js';
import meetingAnalysisService from '../../services/meetings/MeetingAnalysisService.js';
import MeetingTranscription from '../../models/MeetingTranscription.js';
import MeetingAnalysis from '../../models/MeetingAnalysis.js';
import MeetingScore from '../../models/MeetingScore.js';
import MeetingInsight from '../../models/MeetingInsight.js';

const router = express.Router();

// ============================================================================
// TRANSCRIPTION ENDPOINTS
// ============================================================================

/**
 * POST /api/meetings/transcriptions/fetch-by-event
 * Busca transcrição do Google Meet por ID do evento do calendário
 */
router.post('/api/meetings/transcriptions/fetch-by-event', async (req, res) => {
  try {
    const { eventId, meetingId } = req.body;

    if (!eventId) {
      return res.status(400).json({
        success: false,
        error: 'eventId is required'
      });
    }

    console.log(` [MEETINGS-API] Fetching transcription for event ${eventId}`);

    // Buscar transcrição do Google Drive
    const result = await meetingTranscriptionService.fetchTranscriptionByEventId(eventId);

    if (!result.success) {
      return res.status(404).json(result);
    }

    // Salvar transcrição no banco
    const transcription = MeetingTranscription.create({
      meeting_id: meetingId || result.eventId,
      google_event_id: result.eventId,
      google_drive_file_id: result.googleDriveFileId,
      google_doc_url: result.googleDocUrl,
      texto_completo: result.transcriptionText,
      data_reuniao: result.meetingDate,
      duracao_segundos: result.metadata.duracaoEstimada,
      participantes: result.metadata.participantes,
      source_type: result.source,
      metadata: result.metadata
    });

    console.log(` [MEETINGS-API] Transcription saved: ${transcription.id}`);

    res.json({
      success: true,
      transcription: transcription,
      message: 'Transcription fetched and saved successfully'
    });
  } catch (error) {
    console.error(' [MEETINGS-API] Error fetching transcription:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/meetings/transcriptions/fetch-by-type
 * Busca transcrições por tipo de reunião (Discovery, Negociação, etc)
 */
router.post('/api/meetings/transcriptions/fetch-by-type', async (req, res) => {
  try {
    const { meetingType, daysBack = 30 } = req.body;

    if (!meetingType) {
      return res.status(400).json({
        success: false,
        error: 'meetingType is required. Use: discovery, negotiation, followup, closing'
      });
    }

    console.log(` [MEETINGS-API] Fetching ${meetingType} transcriptions from last ${daysBack} days`);

    const result = await meetingTranscriptionService.fetchTranscriptionsByType(meetingType, daysBack);

    if (!result.success) {
      return res.status(500).json(result);
    }

    // Salvar cada transcrição no banco (skip se já existe)
    const saved = [];
    for (const trans of result.transcriptions) {
      const existing = trans.googleDriveFileId
        ? MeetingTranscription.findByGoogleEventId(trans.googleDriveFileId)
        : null;

      if (existing) {
        console.log(` [MEETINGS-API] Transcription already exists: ${trans.fileName}`);
        saved.push(existing);
        continue;
      }

      const transcription = MeetingTranscription.create({
        meeting_id: trans.googleDriveFileId,
        google_drive_file_id: trans.googleDriveFileId,
        google_doc_url: trans.googleDocUrl,
        meeting_type: trans.meetingType,
        lead_name: trans.leadName,
        texto_completo: trans.transcriptionText,
        data_reuniao: trans.createdAt,
        duracao_segundos: trans.metadata.duracaoEstimada,
        participantes: trans.metadata.participantes,
        source_type: trans.source,
        metadata: trans.metadata
      });

      saved.push(transcription);
    }

    console.log(` [MEETINGS-API] ${saved.length} ${meetingType} transcriptions processed`);

    res.json({
      success: true,
      meetingType: meetingType,
      count: saved.length,
      transcriptions: saved
    });
  } catch (error) {
    console.error(' [MEETINGS-API] Error fetching transcriptions by type:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/meetings/transcriptions/fetch-recent
 * Busca transcrições recentes do Google Drive
 */
router.post('/api/meetings/transcriptions/fetch-recent', async (req, res) => {
  try {
    const { daysBack = 7 } = req.body;

    console.log(` [MEETINGS-API] Fetching transcriptions from last ${daysBack} days`);

    const result = await meetingTranscriptionService.fetchRecentTranscriptions(daysBack);

    if (!result.success) {
      return res.status(500).json(result);
    }

    // Salvar cada transcrição no banco (skip se já existe)
    const saved = [];
    for (const trans of result.transcriptions) {
      const existing = trans.googleDriveFileId
        ? MeetingTranscription.findByGoogleEventId(trans.googleDriveFileId)
        : null;

      if (existing) {
        console.log(` [MEETINGS-API] Transcription already exists: ${trans.fileName}`);
        saved.push(existing);
        continue;
      }

      const transcription = MeetingTranscription.create({
        meeting_id: trans.googleDriveFileId, // Usar como meeting_id temporário
        google_drive_file_id: trans.googleDriveFileId,
        google_doc_url: trans.googleDocUrl,
        texto_completo: trans.transcriptionText,
        data_reuniao: trans.createdAt,
        duracao_segundos: trans.metadata.duracaoEstimada,
        participantes: trans.metadata.participantes,
        source_type: trans.source,
        metadata: trans.metadata
      });

      saved.push(transcription);
    }

    console.log(` [MEETINGS-API] ${saved.length} transcriptions saved`);

    res.json({
      success: true,
      count: saved.length,
      transcriptions: saved
    });
  } catch (error) {
    console.error(' [MEETINGS-API] Error fetching recent transcriptions:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/meetings/transcriptions/:id
 * Busca transcrição por ID
 */
router.get('/api/meetings/transcriptions/:id', async (req, res) => {
  try {
    const transcription = MeetingTranscription.findById(req.params.id);

    if (!transcription) {
      return res.status(404).json({
        success: false,
        error: 'Transcription not found'
      });
    }

    res.json({
      success: true,
      transcription
    });
  } catch (error) {
    console.error(' [MEETINGS-API] Error fetching transcription:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/meetings/transcriptions
 * Lista transcrições com filtros
 */
router.get('/api/meetings/transcriptions', async (req, res) => {
  try {
    const { status, days = 30 } = req.query;

    let transcriptions;
    if (status === 'pending') {
      transcriptions = MeetingTranscription.findPending();
    } else {
      transcriptions = MeetingTranscription.findRecent(parseInt(days));
    }

    res.json({
      success: true,
      count: transcriptions.length,
      transcriptions
    });
  } catch (error) {
    console.error(' [MEETINGS-API] Error listing transcriptions:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// ANALYSIS ENDPOINTS
// ============================================================================

/**
 * POST /api/meetings/analyze/:transcriptionId
 * Analisa transcrição completa (pipeline de 5 camadas)
 */
router.post('/api/meetings/analyze/:transcriptionId', async (req, res) => {
  try {
    const { transcriptionId } = req.params;

    console.log(` [MEETINGS-API] Starting analysis for transcription ${transcriptionId}`);

    const result = await meetingAnalysisService.analyzeTranscription(transcriptionId);

    res.json(result);
  } catch (error) {
    console.error(' [MEETINGS-API] Error analyzing transcription:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/meetings/analyze/quick
 * Análise rápida (apenas sentiment, sem salvar no banco)
 */
router.post('/api/meetings/analyze/quick', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'text is required'
      });
    }

    const result = await meetingAnalysisService.quickAnalysis(text);

    res.json(result);
  } catch (error) {
    console.error(' [MEETINGS-API] Error in quick analysis:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/meetings/analysis/:id
 * Busca análise completa por ID
 */
router.get('/api/meetings/analysis/:id', async (req, res) => {
  try {
    const analysis = MeetingAnalysis.findById(req.params.id);

    if (!analysis) {
      return res.status(404).json({
        success: false,
        error: 'Analysis not found'
      });
    }

    // Buscar score e insights relacionados
    const score = MeetingScore.findByAnalysisId(analysis.id);
    const insights = MeetingInsight.findByAnalysisId(analysis.id);

    res.json({
      success: true,
      analysis,
      score,
      insights
    });
  } catch (error) {
    console.error(' [MEETINGS-API] Error fetching analysis:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/meetings/analysis/by-meeting/:meetingId
 * Busca análise por meeting_id
 */
router.get('/api/meetings/analysis/by-meeting/:meetingId', async (req, res) => {
  try {
    const analysis = MeetingAnalysis.findByMeetingId(req.params.meetingId);

    if (!analysis) {
      return res.status(404).json({
        success: false,
        error: 'Analysis not found for this meeting'
      });
    }

    const score = MeetingScore.findByAnalysisId(analysis.id);
    const insights = MeetingInsight.findByAnalysisId(analysis.id);

    res.json({
      success: true,
      analysis,
      score,
      insights
    });
  } catch (error) {
    console.error(' [MEETINGS-API] Error fetching analysis:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// SCORES & METHODOLOGY ENDPOINTS
// ============================================================================

/**
 * GET /api/meetings/scores/excellent
 * Busca reuniões com score excelente (90+)
 */
router.get('/api/meetings/scores/excellent', async (req, res) => {
  try {
    const scores = MeetingScore.findExcellent();

    res.json({
      success: true,
      count: scores.length,
      scores
    });
  } catch (error) {
    console.error(' [MEETINGS-API] Error fetching excellent scores:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/meetings/scores/bant-qualified
 * Busca leads qualificados pelo BANT
 */
router.get('/api/meetings/scores/bant-qualified', async (req, res) => {
  try {
    const scores = MeetingScore.findBANTQualified();

    res.json({
      success: true,
      count: scores.length,
      scores
    });
  } catch (error) {
    console.error(' [MEETINGS-API] Error fetching BANT qualified:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/meetings/scores/stats
 * Estatísticas de scores
 */
router.get('/api/meetings/scores/stats', async (req, res) => {
  try {
    const stats = MeetingScore.getStats();
    const methodologyDist = MeetingScore.getMethodologyDistribution();

    res.json({
      success: true,
      stats,
      methodology_distribution: methodologyDist
    });
  } catch (error) {
    console.error(' [MEETINGS-API] Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// INSIGHTS ENDPOINTS
// ============================================================================

/**
 * GET /api/meetings/insights/high-priority
 * Busca insights de alta prioridade pendentes
 */
router.get('/api/meetings/insights/high-priority', async (req, res) => {
  try {
    const insights = MeetingInsight.findHighPriority();

    res.json({
      success: true,
      count: insights.length,
      insights
    });
  } catch (error) {
    console.error(' [MEETINGS-API] Error fetching high priority insights:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PATCH /api/meetings/insights/:id/status
 * Atualiza status de um insight (nova, revisada, aplicada, ignorada)
 */
router.patch('/api/meetings/insights/:id/status', async (req, res) => {
  try {
    const { status } = req.body;

    if (!['nova', 'revisada', 'aplicada', 'ignorada'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be: nova, revisada, aplicada, ignorada'
      });
    }

    const insight = MeetingInsight.updateStatus(req.params.id, status);

    if (!insight) {
      return res.status(404).json({
        success: false,
        error: 'Insight not found'
      });
    }

    res.json({
      success: true,
      insight
    });
  } catch (error) {
    console.error(' [MEETINGS-API] Error updating insight status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/meetings/insights/stats
 * Estatísticas de insights
 */
router.get('/api/meetings/insights/stats', async (req, res) => {
  try {
    const stats = MeetingInsight.getStats();
    const categoryDist = MeetingInsight.getCategoryDistribution();
    const commonInsights = MeetingInsight.getCommonInsights(10);

    res.json({
      success: true,
      stats,
      category_distribution: categoryDist,
      common_insights: commonInsights
    });
  } catch (error) {
    console.error(' [MEETINGS-API] Error fetching insights stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// GOOGLE OAUTH ENDPOINTS (para configuração inicial)
// ============================================================================

/**
 * GET /api/meetings/auth/google/url
 * Gera URL de autorização OAuth2 do Google
 */
router.get('/api/meetings/auth/google/url', async (req, res) => {
  try {
    const url = meetingTranscriptionService.getAuthUrl();

    res.json({
      success: true,
      auth_url: url,
      instructions: 'Visit this URL to authorize the application. After authorization, use the callback endpoint with the code.'
    });
  } catch (error) {
    console.error(' [MEETINGS-API] Error generating auth URL:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/meetings/auth/google/callback
 * Processa callback do OAuth2 e obtém tokens
 */
router.post('/api/meetings/auth/google/callback', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'code is required'
      });
    }

    const result = await meetingTranscriptionService.handleAuthCallback(code);

    res.json(result);
  } catch (error) {
    console.error(' [MEETINGS-API] Error handling OAuth callback:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;

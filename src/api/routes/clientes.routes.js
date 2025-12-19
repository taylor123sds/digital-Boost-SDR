/**
 * @file clientes.routes.js
 * @description Rotas para gestão de clientes (vendas fechadas)
 * Data source: SQLite (primary) with optional Google Sheets sync
 */

import express from 'express';
import { leadRepository } from '../../repositories/lead.repository.js';
import { getDatabase } from '../../db/connection.js';
import { Notification } from '../../models/Notification.js';

const router = express.Router();

/**
 * GET /api/clientes
 * Listar todos os clientes (leads com stage_id = 'stage_ganhou')
 */
router.get('/api/clientes', async (req, res) => {
  try {
    console.log('[CLIENTES-API] Fetching clientes...');

    // Get leads that are in "won" stage (clientes)
    const clientes = leadRepository.findByStage('stage_ganhou', { limit: 500 });

    // Map to expected format
    const mappedClientes = clientes.map(cli => ({
      id: cli.id,
      nome: cli.nome || cli.empresa || 'Sem nome',
      empresa: cli.empresa || '',
      email: cli.email || '',
      telefone: cli.telefone || cli.whatsapp || '',
      valor_fechado: parseFloat(cli.valor || cli.bant_budget || 0),
      data_fechamento: cli.stage_entered_at || cli.updated_at || '',
      status: cli.status || 'ativo',
      setor: cli.segmento || '',
      origem: cli.origem || 'whatsapp',
      notas: cli.notas || ''
    }));

    // Calcular estatísticas
    const stats = {
      total_clientes: mappedClientes.length,
      total_vendas: mappedClientes.reduce((sum, cli) => sum + (parseFloat(cli.valor_fechado) || 0), 0),
      avg_ticket: mappedClientes.length > 0
        ? mappedClientes.reduce((sum, cli) => sum + (parseFloat(cli.valor_fechado) || 0), 0) / mappedClientes.length
        : 0,
      this_month: mappedClientes.filter(cli => {
        const dataFechamento = new Date(cli.data_fechamento);
        const now = new Date();
        return dataFechamento.getMonth() === now.getMonth() &&
               dataFechamento.getFullYear() === now.getFullYear();
      }).length
    };

    console.log(`[CLIENTES-API] Found ${mappedClientes.length} clientes`);

    res.json({
      success: true,
      clientes: mappedClientes,
      stats,
      source: 'sqlite'
    });
  } catch (error) {
    console.error('[CLIENTES-API] Error fetching clientes:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      clientes: [],
      stats: { total_clientes: 0, total_vendas: 0, avg_ticket: 0, this_month: 0 }
    });
  }
});

/**
 * POST /api/clientes/from-opportunity
 * Mover oportunidade fechada para clientes (change stage to stage_ganhou)
 */
router.post('/api/clientes/from-opportunity', async (req, res) => {
  try {
    const { opportunityId, closingData } = req.body;

    if (!opportunityId) {
      return res.status(400).json({
        success: false,
        error: 'opportunityId é obrigatório'
      });
    }

    console.log(`[CLIENTES-API] Moving opportunity ${opportunityId} to clientes...`);

    // Find the lead/opportunity
    const lead = leadRepository.findById(opportunityId);
    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Oportunidade não encontrada'
      });
    }

    // Update to "won" stage
    const updateData = {
      stage_id: 'stage_ganhou',
      stage_entered_at: new Date().toISOString(),
      status: 'cliente'
    };

    // Add closing data if provided
    if (closingData) {
      if (closingData.valor_fechado) updateData.valor = parseFloat(closingData.valor_fechado);
      if (closingData.notas) updateData.notas = closingData.notas;
    }

    leadRepository.update(opportunityId, updateData);

    res.json({
      success: true,
      message: 'Oportunidade movida para clientes com sucesso',
      clienteId: opportunityId,
      opportunityId: opportunityId
    });

  } catch (error) {
    console.error('[CLIENTES-API] Error moving opportunity to clientes:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/clientes/:id
 * Obter detalhes de um cliente específico
 */
router.get('/api/clientes/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const lead = leadRepository.findById(id);

    if (!lead || lead.stage_id !== 'stage_ganhou') {
      return res.status(404).json({
        success: false,
        error: 'Cliente não encontrado'
      });
    }

    const cliente = {
      id: lead.id,
      nome: lead.nome || lead.empresa || 'Sem nome',
      empresa: lead.empresa || '',
      email: lead.email || '',
      telefone: lead.telefone || lead.whatsapp || '',
      valor_fechado: parseFloat(lead.valor || lead.bant_budget || 0),
      data_fechamento: lead.stage_entered_at || lead.updated_at || '',
      status: lead.status || 'ativo',
      setor: lead.segmento || '',
      origem: lead.origem || 'whatsapp',
      notas: lead.notas || ''
    };

    res.json({
      success: true,
      cliente
    });
  } catch (error) {
    console.error('[CLIENTES-API] Error fetching cliente:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/clientes/:id/status
 * Atualizar status do cliente (inadimplente, perdido, etc)
 */
router.put('/api/clientes/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'status é obrigatório'
      });
    }

    console.log(`[CLIENTES-API] Updating status for cliente ${id} to ${status}...`);

    const result = leadRepository.update(id, { status });

    if (result) {
      res.json({
        success: true,
        message: `Status atualizado para ${status}`,
        clienteId: id
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Cliente não encontrado'
      });
    }
  } catch (error) {
    console.error('[CLIENTES-API] Error updating status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/clientes/:id/greeting
 * Enviar saudação para cliente
 */
router.post('/api/clientes/:id/greeting', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      greeting_type = 'general', // general, birthday, anniversary, holiday, thank_you
      custom_message
    } = req.body;

    console.log(`[CLIENTES-API] Sending greeting to cliente ${id}...`);

    const lead = leadRepository.findById(id);

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Cliente não encontrado'
      });
    }

    const phone = lead.telefone || lead.whatsapp;
    if (!phone) {
      return res.status(400).json({
        success: false,
        error: 'Cliente não possui telefone cadastrado'
      });
    }

    // Build greeting message based on type
    const greetingTemplates = {
      general: `Olá ${lead.nome || 'prezado cliente'}! \n\nEsperamos que esteja tudo bem! Passando para saber como estão as coisas e se podemos ajudar em algo.\n\nEstamos à disposição!`,
      birthday: ` Feliz Aniversário, ${lead.nome}! \n\nDesejamos um dia incrível e muito sucesso!\n\nUm grande abraço da equipe!`,
      anniversary: ` Parabéns pelo aniversário de parceria! \n\nÉ uma honra ter ${lead.nome || lead.empresa} como cliente!\n\nObrigado pela confiança!`,
      holiday: ` Boas Festas!\n\nDesejamos a você e toda equipe da ${lead.empresa || 'sua empresa'} um excelente período de festas!\n\nForte abraço!`,
      thank_you: `Olá ${lead.nome || 'prezado cliente'}! \n\nGostaríamos de agradecer pela parceria e confiança!\n\nConte sempre conosco!`
    };

    const message = custom_message || greetingTemplates[greeting_type] || greetingTemplates.general;

    // Send WhatsApp message
    try {
      const { sendWhatsAppMessage } = await import('../../tools/whatsapp.js');
      await sendWhatsAppMessage(phone, message);

      console.log(`[CLIENTES-API] Greeting sent to ${lead.nome} (${phone})`);

      // Update last contact
      try {
        leadRepository.update(id, { last_contact: new Date().toISOString() });
      } catch (updateError) {
        console.warn('[CLIENTES-API] Could not update last_contact:', updateError.message);
      }

      res.json({
        success: true,
        message: 'Saudação enviada com sucesso',
        clienteId: id,
        greeting: {
          type: greeting_type,
          phone,
          sent_at: new Date().toISOString()
        }
      });
    } catch (waError) {
      console.error('[CLIENTES-API] WhatsApp error:', waError.message);
      res.status(500).json({
        success: false,
        error: `Erro ao enviar WhatsApp: ${waError.message}`
      });
    }
  } catch (error) {
    console.error('[CLIENTES-API] Error sending greeting:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/clientes/:id/followup
 * Agendar follow-up com cliente
 */
router.post('/api/clientes/:id/followup', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      due_date,
      priority = 'medium',
      followup_type = 'check_in' // check_in, upsell, renewal, support, feedback
    } = req.body;

    console.log(`[CLIENTES-API] Scheduling followup for cliente ${id}...`);

    const lead = leadRepository.findById(id);

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Cliente não encontrado'
      });
    }

    const db = getDatabase();

    // Calculate due date (default: 7 days from now)
    const followupDate = due_date
      ? new Date(due_date).toISOString()
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // Generate task ID
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Build task title based on type
    const followupTitles = {
      check_in: ` Check-in com ${lead.nome || lead.empresa}`,
      upsell: ` Oportunidade de upsell - ${lead.nome || lead.empresa}`,
      renewal: ` Renovação - ${lead.nome || lead.empresa}`,
      support: ` Suporte - ${lead.nome || lead.empresa}`,
      feedback: ` Solicitar feedback - ${lead.nome || lead.empresa}`
    };

    const taskTitle = title || followupTitles[followup_type] || `Follow-up: ${lead.nome || lead.empresa}`;
    const taskDescription = description || `Follow-up agendado para cliente ${lead.nome || lead.empresa}. Telefone: ${lead.telefone || lead.whatsapp || 'N/A'}`;

    // Create task in database
    try {
      db.prepare(`
        INSERT INTO tasks (id, title, description, due_date, priority, status, related_type, related_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'pending', 'cliente', ?, datetime('now'), datetime('now'))
      `).run(taskId, taskTitle, taskDescription, followupDate, priority, id);

      console.log(`[CLIENTES-API] Task ${taskId} created for followup`);
    } catch (dbError) {
      // If tasks table doesn't exist, try to create it first
      if (dbError.message.includes('no such table')) {
        console.log('[CLIENTES-API] Creating tasks table...');
        db.exec(`
          CREATE TABLE IF NOT EXISTS tasks (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            due_date TEXT,
            priority TEXT DEFAULT 'medium',
            status TEXT DEFAULT 'pending',
            related_type TEXT,
            related_id TEXT,
            assigned_to TEXT,
            completed_at TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
          )
        `);

        // Retry insert
        db.prepare(`
          INSERT INTO tasks (id, title, description, due_date, priority, status, related_type, related_id, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, 'pending', 'cliente', ?, datetime('now'), datetime('now'))
        `).run(taskId, taskTitle, taskDescription, followupDate, priority, id);
      } else {
        throw dbError;
      }
    }

    // Update lead's next_followup field
    try {
      leadRepository.update(id, { next_followup: followupDate });
    } catch (updateError) {
      console.warn('[CLIENTES-API] Could not update next_followup:', updateError.message);
    }

    // Create notification for the task
    try {
      const notification = new Notification();
      const userId = req.body.user_id || process.env.ADMIN_USER_ID || 'admin';

      notification.create({
        user_id: userId,
        type: 'task_created',
        title: ' Follow-up Agendado',
        message: `${taskTitle} - ${new Date(followupDate).toLocaleDateString('pt-BR')}`,
        priority: priority === 'high' ? 'high' : 'normal',
        entity_type: 'task',
        entity_id: taskId,
        action_url: `/clientes/${id}`
      });
    } catch (notifError) {
      console.warn('[CLIENTES-API] Could not create notification:', notifError.message);
    }

    console.log(`[CLIENTES-API] Followup scheduled for ${lead.nome} on ${followupDate}`);

    res.json({
      success: true,
      message: 'Follow-up agendado com sucesso',
      clienteId: id,
      task: {
        id: taskId,
        title: taskTitle,
        description: taskDescription,
        due_date: followupDate,
        priority,
        followup_type,
        status: 'pending'
      }
    });
  } catch (error) {
    console.error('[CLIENTES-API] Error scheduling followup:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;

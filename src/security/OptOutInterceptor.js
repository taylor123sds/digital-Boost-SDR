/**
 * @file OptOutInterceptor.js
 * @description Clean Architecture - Opt-Out Interceptor
 *
 * Detecta pedidos de opt-out e gerencia lista de bloqueio.
 * Implementado como interceptor de early return no pipeline.
 *
 *  FIX v2.1.0: Persistência no banco de dados
 * - Atualiza cadence_status do lead para 'opt_out'
 * - Atualiza status do prospect_leads para 'opt_out'
 * - Mantém blacklist em memória para bloqueio imediato
 *
 * @author ORBION Team
 * @version 2.1.0
 */

import { blacklist } from '../utils/blacklist.js';
import { getDatabase } from '../db/connection.js';
import log from '../utils/logger-wrapper.js';

// ═══════════════════════════════════════════════════════════════
// PADRÕES DE OPT-OUT
// ═══════════════════════════════════════════════════════════════

const OPT_OUT_PATTERNS = [
  // Comandos diretos
  /^(stop|parar|pare|sair|remover|cancelar)$/i,

  // Frases explícitas
  /quero\s+(parar|sair|remover|cancelar)/i,
  /não\s+quero\s+mais/i,
  /para\s+de\s+(me\s+)?mandar/i,
  /não\s+me\s+(mande|envie)\s+mais/i,

  // Pedidos de remoção
  /me\s+remove/i,
  /remove\s+meu\s+(número|contato)/i,
  /tire\s+meu\s+(número|contato)/i,
  /excluir\s+meu\s+(número|contato)/i
];

// ═══════════════════════════════════════════════════════════════
// PERSISTÊNCIA NO BANCO DE DADOS
// ═══════════════════════════════════════════════════════════════

/**
 * Normaliza número de telefone para busca no banco
 * @param {string} contactId - ID do contato (pode ter @s.whatsapp.net)
 * @returns {string} Número normalizado
 */
function normalizePhone(contactId) {
  return contactId.replace('@s.whatsapp.net', '').replace(/\D/g, '');
}

/**
 * Persiste opt-out no banco de dados
 * - Atualiza cadence_status do lead para 'opt_out'
 * - Atualiza status do prospect_leads para 'opt_out'
 * - Registra timestamp do opt-out
 *
 * @param {string} contactId - ID do contato
 * @returns {Object} Resultado da persistência
 */
async function persistOptOutToDatabase(contactId) {
  try {
    const db = getDatabase();
    const phone = normalizePhone(contactId);

    log.info('[OPT-OUT] Persistindo opt-out no banco', { phone });

    let leadsUpdated = 0;
    let prospectsUpdated = 0;

    // 1. Atualizar leads (buscar por telefone ou whatsapp)
    try {
      const updateLeads = db.prepare(`
        UPDATE leads
        SET cadence_status = 'opt_out',
            stage_id = 'stage_perdeu',
            updated_at = datetime('now'),
            notes = COALESCE(notes, '') || ' | OPT-OUT: ' || datetime('now')
        WHERE telefone LIKE ? OR whatsapp LIKE ?
      `);

      const leadsResult = updateLeads.run(`%${phone}%`, `%${phone}%`);
      leadsUpdated = leadsResult.changes;

      if (leadsUpdated > 0) {
        log.info('[OPT-OUT] Leads atualizados', { count: leadsUpdated, phone });
      }
    } catch (err) {
      log.warn('[OPT-OUT] Erro ao atualizar leads (tabela pode não existir)', { error: err.message });
    }

    // 2. Atualizar prospect_leads
    try {
      const updateProspects = db.prepare(`
        UPDATE prospect_leads
        SET status = 'opt_out',
            updated_at = datetime('now')
        WHERE telefone_normalizado LIKE ? OR whatsapp LIKE ?
      `);

      const prospectsResult = updateProspects.run(`%${phone}%`, `%${phone}%`);
      prospectsUpdated = prospectsResult.changes;

      if (prospectsUpdated > 0) {
        log.info('[OPT-OUT] Prospects atualizados', { count: prospectsUpdated, phone });
      }
    } catch (err) {
      log.warn('[OPT-OUT] Erro ao atualizar prospect_leads (tabela pode não existir)', { error: err.message });
    }

    // 3. Registrar na tabela de blacklist permanente (criar se não existir)
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS opt_out_registry (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          phone TEXT UNIQUE NOT NULL,
          contact_id TEXT,
          opted_out_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          reason TEXT DEFAULT 'user_request'
        )
      `);

      const insertOptOut = db.prepare(`
        INSERT OR REPLACE INTO opt_out_registry (phone, contact_id, opted_out_at, reason)
        VALUES (?, ?, datetime('now'), 'user_request')
      `);

      insertOptOut.run(phone, contactId);
      log.info('[OPT-OUT] Registrado na opt_out_registry', { phone });
    } catch (err) {
      log.warn('[OPT-OUT] Erro ao registrar opt-out (continuando)', { error: err.message });
    }

    return {
      success: true,
      leadsUpdated,
      prospectsUpdated,
      phone
    };

  } catch (error) {
    log.error('[OPT-OUT] Erro ao persistir opt-out', { error: error.message, contactId });
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Verifica se contato está permanentemente em opt-out (no banco)
 * @param {string} contactId - ID do contato
 * @returns {boolean} True se está em opt-out permanente
 */
function isOptOutInDatabase(contactId) {
  try {
    const db = getDatabase();
    const phone = normalizePhone(contactId);

    // Verificar na tabela opt_out_registry
    const checkRegistry = db.prepare(`
      SELECT 1 FROM opt_out_registry WHERE phone = ? LIMIT 1
    `);
    const inRegistry = checkRegistry.get(phone);

    if (inRegistry) return true;

    // Verificar se lead tem status opt_out
    const checkLead = db.prepare(`
      SELECT 1 FROM leads
      WHERE (telefone LIKE ? OR whatsapp LIKE ?)
      AND cadence_status = 'opt_out'
      LIMIT 1
    `);
    const leadOptOut = checkLead.get(`%${phone}%`, `%${phone}%`);

    return !!leadOptOut;

  } catch (error) {
    // Se erro na verificação, não bloquear (fail open)
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// DETECTOR
// ═══════════════════════════════════════════════════════════════

/**
 * Verifica se mensagem contém pedido de opt-out
 *
 * @param {string} contactId - ID do contato
 * @param {string} messageText - Texto da mensagem
 * @returns {Object} Resultado da verificação
 */
export async function checkOptOut(contactId, messageText) {
  log.info('[OPT-OUT] Verificando opt-out', { contactId: contactId?.substring(0, 15) });

  // 1. Verificar se já está na blacklist em memória
  if (blacklist.isBlocked(contactId)) {
    log.warn('[OPT-OUT] Contato já está na blacklist (memória)', { contactId: contactId?.substring(0, 15) });
    return {
      isOptOut: true,
      alreadyBlacklisted: true,
      reason: 'already_blacklisted',
      confirmationMessage: 'Você já está removido da nossa lista. Não receberá mais mensagens.'
    };
  }

  // 2. Verificar se já está em opt-out no banco de dados
  if (isOptOutInDatabase(contactId)) {
    log.warn('[OPT-OUT] Contato já está em opt-out (banco)', { contactId: contactId?.substring(0, 15) });
    // Adicionar também à blacklist em memória para bloqueio rápido
    blacklist.block(contactId, 'opt_out_database', 0);
    return {
      isOptOut: true,
      alreadyBlacklisted: true,
      reason: 'opt_out_in_database',
      confirmationMessage: 'Você já está removido da nossa lista. Não receberá mais mensagens.'
    };
  }

  // 3. Verificar padrões de opt-out na mensagem
  const hasOptOut = OPT_OUT_PATTERNS.some(pattern => pattern.test(messageText));

  if (hasOptOut) {
    log.info('[OPT-OUT] Opt-out detectado!', { contactId: contactId?.substring(0, 15) });

    // Adicionar à blacklist em memória (bloqueio imediato)
    blacklist.block(contactId, 'opt_out_request', 0);

    //  NOVO: Persistir no banco de dados (permanente)
    const persistResult = await persistOptOutToDatabase(contactId);

    log.success('[OPT-OUT] Opt-out processado', {
      contactId: contactId?.substring(0, 15),
      leadsUpdated: persistResult.leadsUpdated,
      prospectsUpdated: persistResult.prospectsUpdated
    });

    return {
      isOptOut: true,
      alreadyBlacklisted: false,
      reason: 'opt_out_detected',
      persistResult,
      confirmationMessage: `Entendido! Você foi removido da nossa lista e não receberá mais mensagens.

Se mudou de ideia no futuro, é só me enviar uma mensagem. `
    };
  }

  log.debug('[OPT-OUT] Nenhum opt-out detectado');
  return {
    isOptOut: false
  };
}

export default {
  checkOptOut,
  isOptOutInDatabase,
  persistOptOutToDatabase
};

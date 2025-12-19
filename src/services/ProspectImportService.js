/**
 * @file ProspectImportService.js
 * @description Serviço de importação de leads da planilha Google Sheets para SQLite
 *
 * Este serviço:
 * 1. Lê leads da Sheet1 (planilha de prospecção)
 * 2. Normaliza os dados
 * 3. Importa para a tabela prospect_leads no SQLite
 * 4. Evita duplicatas usando telefone normalizado
 * 5. Pode sincronizar bidirecionalmente (SQLite  Sheets)
 */

import { getDatabase } from '../db/index.js';
import { getLeadsFromGoogleSheets, readSheet } from '../tools/google_sheets.js';
import { normalizePhone } from '../utils/phone_normalizer.js';
import log from '../utils/logger-wrapper.js';

/**
 * Normaliza telefone para formato padrão (12 dígitos)
 */
function normalizePhoneNumber(phone) {
  if (!phone) return null;

  let cleaned = String(phone)
    .replace('@s.whatsapp.net', '')
    .replace('@c.us', '')
    .replace('@lid', '')
    .replace(/\D/g, '');

  //  FIX: Preservar 9 em celulares (E.164) - NÃO remover o 9!
  // Celular: 13 dígitos (55+DDD+9+8), Fixo: 12 dígitos (55+DDD+8)

  // Adicionar 55 se não tiver DDI
  if (cleaned.length === 10 || cleaned.length === 11) {
    cleaned = '55' + cleaned;
  }

  return cleaned.length >= 12 ? cleaned : null;
}

/**
 * Importa leads da Google Sheets para SQLite
 */
export async function importLeadsFromSheets(options = {}) {
  const {
    spreadsheetId = process.env.GOOGLE_LEADS_SHEET_ID,
    sheetName = 'Sheet1',
    skipExisting = true,  // Pular leads que já existem
    updateExisting = false  // Atualizar dados de leads existentes
  } = options;

  const db = getDatabase();
  const stats = {
    total: 0,
    imported: 0,
    skipped: 0,
    updated: 0,
    errors: 0,
    duplicates: 0
  };

  try {
    log.info(` [IMPORT] Iniciando importação de ${sheetName}...`);

    // 1. Buscar dados da planilha
    const range = `${sheetName}!A:Z`;
    const data = await readSheet(spreadsheetId, range);

    if (!data || data.length <= 1) {
      log.warn('[IMPORT] Nenhum dado encontrado na planilha');
      return { success: false, error: 'NO_DATA', stats };
    }

    // 2. Identificar headers
    const headers = data[0].map(h => String(h || '').trim().toLowerCase());
    log.info(`[IMPORT] Headers: ${headers.join(', ')}`);

    // Mapear índices das colunas
    const colIndex = {
      empresa: headers.findIndex(h => h.includes('empresa') || h.includes('nome')),
      cnpj: headers.findIndex(h => h.includes('cnpj')),
      segmento: headers.findIndex(h => h.includes('segmento')),
      porte: headers.findIndex(h => h.includes('porte')),
      faturamento: headers.findIndex(h => h.includes('faturamento')),
      cidade: headers.findIndex(h => h.includes('cidade') || h.includes('estado')),
      whatsapp: headers.findIndex(h => h.includes('whatsapp') || h.includes('celular')),
      telefone: headers.findIndex(h => h.includes('telefone') && !h.includes('whatsapp')),
      email: headers.findIndex(h => h.includes('email') || h.includes('e-mail')),
      site: headers.findIndex(h => h.includes('site') || h.includes('website')),
      endereco: headers.findIndex(h => h.includes('endere')),
      bairro: headers.findIndex(h => h.includes('bairro')),
      cep: headers.findIndex(h => h.includes('cep'))
    };

    log.info(`[IMPORT] Mapeamento de colunas:`, colIndex);

    // 3. Preparar statements
    const insertStmt = db.prepare(`
      INSERT INTO prospect_leads (
        id, empresa, nome, cnpj, segmento, porte, faturamento_estimado,
        cidade, estado, endereco, bairro, cep,
        whatsapp, telefone, telefone_normalizado, email, site,
        origem, fonte_lista, status, prioridade
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        'google_sheets', ?, 'pendente', 0
      )
    `);

    const updateStmt = db.prepare(`
      UPDATE prospect_leads SET
        empresa = ?, cnpj = ?, segmento = ?, porte = ?, faturamento_estimado = ?,
        cidade = ?, endereco = ?, bairro = ?, cep = ?,
        email = ?, site = ?, updated_at = datetime('now')
      WHERE telefone_normalizado = ?
    `);

    const checkExistingProspect = db.prepare(`
      SELECT id FROM prospect_leads WHERE telefone_normalizado = ?
    `);

    const checkExistingLead = db.prepare(`
      SELECT id FROM leads WHERE telefone = ? OR whatsapp = ?
    `);

    // 4. Processar cada linha
    const rows = data.slice(1); // Pular header
    stats.total = rows.length;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      try {
        // Extrair dados
        const getValue = (idx) => idx >= 0 && row[idx] ? String(row[idx]).trim() : null;

        const empresa = getValue(colIndex.empresa);
        const whatsappRaw = getValue(colIndex.whatsapp) || getValue(colIndex.telefone);

        // Validar campos obrigatórios
        if (!empresa || !whatsappRaw) {
          stats.skipped++;
          continue;
        }

        // Normalizar telefone
        const phoneNormalized = normalizePhoneNumber(whatsappRaw);
        if (!phoneNormalized) {
          log.warn(`[IMPORT] Telefone inválido: ${whatsappRaw}`);
          stats.skipped++;
          continue;
        }

        // Verificar se já existe na tabela leads (já foi prospectado)
        const existingLead = checkExistingLead.get(phoneNormalized, phoneNormalized);
        if (existingLead) {
          stats.duplicates++;
          continue;
        }

        // Verificar se já existe na tabela prospect_leads
        const existingProspect = checkExistingProspect.get(phoneNormalized);

        if (existingProspect) {
          if (updateExisting) {
            // Atualizar dados
            updateStmt.run(
              empresa,
              getValue(colIndex.cnpj),
              getValue(colIndex.segmento),
              getValue(colIndex.porte),
              getValue(colIndex.faturamento),
              getValue(colIndex.cidade),
              getValue(colIndex.endereco),
              getValue(colIndex.bairro),
              getValue(colIndex.cep),
              getValue(colIndex.email),
              getValue(colIndex.site),
              phoneNormalized
            );
            stats.updated++;
          } else {
            stats.duplicates++;
          }
          continue;
        }

        // Extrair cidade/estado
        const cidadeEstado = getValue(colIndex.cidade) || '';
        const [cidade, estado] = cidadeEstado.includes('/')
          ? cidadeEstado.split('/').map(s => s.trim())
          : [cidadeEstado, null];

        // Inserir novo prospect
        const id = `prospect_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        insertStmt.run(
          id,
          empresa,
          empresa, // nome = empresa por padrão
          getValue(colIndex.cnpj),
          getValue(colIndex.segmento),
          getValue(colIndex.porte),
          getValue(colIndex.faturamento),
          cidade,
          estado,
          getValue(colIndex.endereco),
          getValue(colIndex.bairro),
          getValue(colIndex.cep),
          whatsappRaw,
          getValue(colIndex.telefone),
          phoneNormalized,
          getValue(colIndex.email),
          getValue(colIndex.site),
          sheetName
        );

        stats.imported++;

      } catch (err) {
        if (err.message.includes('UNIQUE constraint')) {
          stats.duplicates++;
        } else {
          log.error(`[IMPORT] Erro na linha ${i + 2}: ${err.message}`);
          stats.errors++;
        }
      }
    }

    log.info(` [IMPORT] Importação concluída!`);
    log.info(`   Total: ${stats.total}`);
    log.info(`   Importados: ${stats.imported}`);
    log.info(`   Atualizados: ${stats.updated}`);
    log.info(`   Duplicados (já existem): ${stats.duplicates}`);
    log.info(`   Pulados (inválidos): ${stats.skipped}`);
    log.info(`   Erros: ${stats.errors}`);

    return { success: true, stats };

  } catch (error) {
    log.error(` [IMPORT] Erro na importação: ${error.message}`);
    return { success: false, error: error.message, stats };
  }
}

/**
 * Move um prospect para a tabela leads (quando é contatado)
 */
export function moveProspectToLeads(prospectId, additionalData = {}) {
  const db = getDatabase();

  try {
    // 1. Buscar prospect
    const prospect = db.prepare('SELECT * FROM prospect_leads WHERE id = ?').get(prospectId);
    if (!prospect) {
      return { success: false, error: 'PROSPECT_NOT_FOUND' };
    }

    // 2. Criar lead na tabela leads
    const leadId = `lead_${prospect.telefone_normalizado}`;

    const insertLead = db.prepare(`
      INSERT INTO leads (
        id, nome, empresa, telefone, whatsapp, email, cidade,
        origem, pipeline_id, stage_id, cadence_status, cadence_day,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(id) DO UPDATE SET
        updated_at = datetime('now')
    `);

    insertLead.run(
      leadId,
      prospect.nome || prospect.empresa,
      prospect.empresa,
      prospect.telefone_normalizado,
      prospect.telefone_normalizado,
      prospect.email,
      prospect.cidade,
      'prospecção_automática',
      'pipeline_outbound_solar',
      additionalData.stage_id || 'stage_em_cadencia',
      additionalData.cadence_status || 'active',
      additionalData.cadence_day || 1
    );

    // 3. Atualizar status do prospect
    db.prepare(`
      UPDATE prospect_leads
      SET status = 'enviado', processado_at = datetime('now')
      WHERE id = ?
    `).run(prospectId);

    // 4. Registrar no histórico
    db.prepare(`
      INSERT INTO prospect_history (id, prospect_id, lead_id, action, details)
      VALUES (?, ?, ?, 'converted', ?)
    `).run(
      `ph_${Date.now()}`,
      prospectId,
      leadId,
      JSON.stringify({ convertedAt: new Date().toISOString(), ...additionalData })
    );

    log.info(` [PROSPECT] Movido para leads: ${prospect.empresa} (${prospect.telefone_normalizado})`);

    return { success: true, leadId, prospectId };

  } catch (error) {
    log.error(` [PROSPECT] Erro ao mover prospect: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Busca próximo prospect a ser processado
 */
export function getNextProspect(options = {}) {
  const db = getDatabase();

  const {
    excludePhones = [],
    limit = 1
  } = options;

  try {
    let query = `
      SELECT p.* FROM prospect_leads p
      WHERE p.status = 'pendente'
        AND p.telefone_normalizado IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM leads l
          WHERE l.telefone = p.telefone_normalizado
             OR l.whatsapp = p.telefone_normalizado
        )
    `;

    if (excludePhones.length > 0) {
      const placeholders = excludePhones.map(() => '?').join(',');
      query += ` AND p.telefone_normalizado NOT IN (${placeholders})`;
    }

    query += ` ORDER BY p.prioridade DESC, p.created_at ASC LIMIT ?`;

    const params = [...excludePhones, limit];
    const prospects = db.prepare(query).all(...params);

    return limit === 1 ? prospects[0] : prospects;

  } catch (error) {
    log.error(` [PROSPECT] Erro ao buscar próximo: ${error.message}`);
    return null;
  }
}

/**
 * Atualiza status de um prospect
 */
export function updateProspectStatus(prospectId, status, details = {}) {
  const db = getDatabase();

  try {
    const updateFields = ['status = ?', 'updated_at = datetime(\'now\')'];
    const params = [status];

    if (details.erro) {
      updateFields.push('erro_ultima_tentativa = ?');
      params.push(details.erro);
    }

    if (status === 'erro' || status === 'enviado') {
      updateFields.push('ultima_tentativa = datetime(\'now\')');
      updateFields.push('tentativas = tentativas + 1');
    }

    params.push(prospectId);

    db.prepare(`
      UPDATE prospect_leads
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `).run(...params);

    return { success: true };

  } catch (error) {
    log.error(` [PROSPECT] Erro ao atualizar status: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Retorna estatísticas dos prospects
 */
export function getProspectStats() {
  const db = getDatabase();

  try {
    const stats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pendente' THEN 1 ELSE 0 END) as pendentes,
        SUM(CASE WHEN status = 'enviado' THEN 1 ELSE 0 END) as enviados,
        SUM(CASE WHEN status = 'erro' THEN 1 ELSE 0 END) as erros,
        SUM(CASE WHEN status = 'sem_whatsapp' THEN 1 ELSE 0 END) as sem_whatsapp
      FROM prospect_leads
    `).get();

    const leadsConvertidos = db.prepare(`
      SELECT COUNT(*) as count FROM leads WHERE origem = 'prospecção_automática'
    `).get();

    return {
      ...stats,
      convertidos: leadsConvertidos.count
    };

  } catch (error) {
    log.error(` [PROSPECT] Erro ao buscar stats: ${error.message}`);
    return null;
  }
}

/**
 * Sincroniza SQLite  Sheets (exportar prospects pendentes)
 */
export async function syncToSheets() {
  // TODO: Implementar exportação de volta para Sheets se necessário
  log.warn('[PROSPECT] syncToSheets não implementado ainda');
  return { success: false, error: 'NOT_IMPLEMENTED' };
}

export default {
  importLeadsFromSheets,
  moveProspectToLeads,
  getNextProspect,
  updateProspectStatus,
  getProspectStats,
  syncToSheets
};

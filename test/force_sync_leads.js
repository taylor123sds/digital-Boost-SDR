// force_sync_leads.js - Força sincronização de leads do banco para Google Sheets
import 'dotenv/config';
import Database from 'better-sqlite3';
import * as googleSheets from '../src/tools/google_sheets.js';

async function forceSyncLeads() {
  console.log('🔄 FORÇANDO SINCRONIZAÇÃO DE LEADS DO BANCO PARA GOOGLE SHEETS\n');
  console.log('=' .repeat(70));

  const db = new Database('orbion.db');

  try {
    // 1. Buscar todos os estados BANT do banco
    console.log('\n1️⃣ BUSCANDO ESTADOS BANT NO BANCO DE DADOS:');
    const bantStates = db.prepare("SELECT key, value FROM memory WHERE key LIKE 'bant_state_%'").all();

    console.log(`   Encontrados ${bantStates.length} estados BANT no banco`);

    if (bantStates.length === 0) {
      console.log('\n   ⚠️ Nenhum estado BANT encontrado. O sistema pode estar usando outro formato.');
      console.log('   Verificando formato alternativo...\n');

      // Buscar por lead_state
      const leadStates = db.prepare('SELECT key FROM memory WHERE key LIKE "lead_state:%"').all();
      console.log(`   Encontrados ${leadStates.length} estados de lead no formato alternativo`);

      if (leadStates.length === 0) {
        console.log('\n   ❌ Nenhum lead encontrado no banco de dados.');
        console.log('   Execute uma conversa pelo WhatsApp primeiro.\n');
        process.exit(1);
      }
    }

    // 2. Processar cada lead
    console.log('\n2️⃣ PROCESSANDO LEADS:');
    let synced = 0;
    let skipped = 0;
    let errors = 0;

    for (const row of bantStates) {
      const telefone = row.key.replace('bant_state_', '');

      try {
        const bantState = JSON.parse(row.value);

        console.log(`\n   📞 Lead: ${telefone}`);
        console.log(`      Stage: ${bantState.currentStage || 'N/A'}`);

        // Verificar se tem dados mínimos
        const needData = bantState.stageData?.need?.campos || {};
        const budgetData = bantState.stageData?.budget?.campos || {};
        const authorityData = bantState.stageData?.authority?.campos || {};
        const timingData = bantState.stageData?.timing?.campos || {};

        if (Object.keys(needData).length === 0 &&
            Object.keys(budgetData).length === 0 &&
            Object.keys(authorityData).length === 0 &&
            Object.keys(timingData).length === 0) {
          console.log(`      ⏭️  Pulando - sem dados BANT coletados`);
          skipped++;
          continue;
        }

        // Preparar dados para sincronização
        const sheetData = {
          nome: needData.nome || '',
          empresa: needData.empresa || '',
          setor: needData.setor || '',
          stage: bantState.currentStage || 'need',
          bant_stage: bantState.currentStage || '',
          currentAgent: 'specialist',
          score: calculateScore(needData, budgetData, authorityData, timingData),
          problema_principal: needData.problema_principal || '',
          investimento_disponivel: budgetData.faixa_investimento || budgetData.verba_disponivel || '',
          decisor_principal: authorityData.decisor_principal || '',
          urgencia: timingData.urgencia || '',
          updated_at: new Date().toISOString()
        };

        console.log(`      💾 Sincronizando com Google Sheets...`);
        const result = await googleSheets.updateFunnelLead(telefone, sheetData);

        if (result.success) {
          console.log(`      ✅ ${result.action} com sucesso (linha ${result.row})`);
          synced++;
        } else {
          console.log(`      ❌ Erro: ${result.error}`);
          errors++;
        }

      } catch (error) {
        console.log(`      ❌ Erro ao processar: ${error.message}`);
        errors++;
      }
    }

    // 3. Resumo
    console.log('\n' + '='.repeat(70));
    console.log('📊 RESUMO DA SINCRONIZAÇÃO:');
    console.log(`   ✅ Sincronizados: ${synced}`);
    console.log(`   ⏭️  Pulados: ${skipped}`);
    console.log(`   ❌ Erros: ${errors}`);
    console.log(`   📝 Total processados: ${bantStates.length}`);

    // 4. Verificar planilha final
    console.log('\n4️⃣ VERIFICANDO PLANILHA FINAL:');
    const sheetId = process.env.GOOGLE_FUNIL_SHEET_ID || process.env.GOOGLE_LEADS_SHEET_ID;
    const funnelLeads = await googleSheets.getFunnelLeads(sheetId);
    console.log(`   📊 Total de leads na planilha "funil": ${funnelLeads.length}`);

    console.log('\n✅ SINCRONIZAÇÃO CONCLUÍDA!\n');

  } catch (error) {
    console.error('\n❌ ERRO FATAL:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    db.close();
  }
}

// Função auxiliar para calcular score
function calculateScore(need, budget, authority, timing) {
  let score = 0;

  // Need stage: 25 pontos
  if (need.problema_principal) score += 10;
  if (need.intensidade_problema) score += 8;
  if (need.receita_mensal) score += 7;

  // Budget stage: 25 pontos
  if (budget.verba_disponivel || budget.faixa_investimento) score += 15;
  if (budget.expectativa_retorno) score += 10;

  // Authority stage: 25 pontos
  if (authority.decisor_principal) score += 15;
  if (authority.autonomia_decisao) score += 10;

  // Timing stage: 25 pontos
  if (timing.urgencia) score += 15;
  if (timing.prazo_ideal) score += 10;

  return Math.min(score, 100);
}

// Executar
forceSyncLeads().catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});

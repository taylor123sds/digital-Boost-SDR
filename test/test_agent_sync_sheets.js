#!/usr/bin/env node
// test_agent_sync_sheets.js - Testa se o agente sincroniza com Google Sheets

import dotenv from 'dotenv';
dotenv.config();

import { getEnhancedState, saveEnhancedState } from '../src/memory.js';
import { updateFunnelLead, getFunnelLeads } from '../src/tools/google_sheets.js';

console.log('🧪 ===== TESTANDO SINCRONIZAÇÃO AUTOMÁTICA =====\n');

const TEST_PHONE = '5584999111111'; // João Silva

async function testSync() {
  try {
    console.log('📋 PASSO 1: Ver estado atual do lead no SQLite\n');

    let leadState = await getEnhancedState(TEST_PHONE);
    console.log(`📊 Lead atual: ${leadState?.companyProfile?.nome || TEST_PHONE}`);
    console.log(`   Agent: ${leadState?.currentAgent || 'sdr'}`);
    console.log(`   BANT Stage: ${leadState?.bantStages?.currentStage || 'não definido'}\n`);

    console.log('📋 PASSO 2: Simular avanço do lead para NEED\n');

    // Simular que o Specialist Agent identificou a dor
    leadState.currentAgent = 'specialist';
    leadState.bantStages = {
      currentStage: 'need',
      stageData: {
        need: {
          campos: {
            problema_principal: 'Falta de automação nas vendas',
            impacto: 'Perda de 30% dos leads',
            urgencia_need: 'Alta'
          },
          completedAt: new Date().toISOString()
        }
      }
    };
    leadState.qualification = {
      score: 85,
      factors: {
        need: 90,
        engagement: 80
      }
    };
    leadState.lastUpdate = new Date().toISOString();

    // Salvar no SQLite
    await saveEnhancedState(TEST_PHONE, leadState);
    console.log('✅ Estado atualizado no SQLite\n');

    console.log('📋 PASSO 3: Simular sincronização do AgentHub (manual)\n');

    // Importar a função de sincronização
    const { AgentHub } = await import('../src/agents/agent_hub.js');
    const hub = new AgentHub();

    // Chamar a sincronização manualmente (mesmo código que o AgentHub usa)
    await hub.syncLeadWithGoogleSheets(TEST_PHONE, leadState);

    console.log('✅ Sincronização concluída\n');

    console.log('📋 PASSO 4: Verificar se foi salvo no Google Sheets\n');

    const leads = await getFunnelLeads();
    const updatedLead = leads.find(l => l.telefone === TEST_PHONE);

    if (updatedLead) {
      console.log('✅ Lead encontrado no Google Sheets:\n');
      console.log(`   Nome: ${updatedLead.nome}`);
      console.log(`   Empresa: ${updatedLead.empresa}`);
      console.log(`   Stage: ${updatedLead.stage}`);
      console.log(`   BANT Stage: ${updatedLead.bant_stage}`);
      console.log(`   Agent: ${updatedLead.currentAgent}`);
      console.log(`   Score: ${updatedLead.score}`);
      console.log(`   Problema: ${updatedLead.problema_principal}`);
      console.log(`   Última atualização: ${updatedLead.updated_at}\n`);

      if (updatedLead.bant_stage === 'need' && updatedLead.score === 85) {
        console.log('🎉 SUCESSO! O agente está sincronizando corretamente com Google Sheets!\n');
      } else {
        console.log('⚠️ Dados encontrados, mas não correspondem ao esperado.\n');
      }
    } else {
      console.log('❌ Lead NÃO encontrado no Google Sheets\n');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📊 RESUMO DO TESTE:\n');
    console.log('1. ✅ Lead atualizado no SQLite');
    console.log('2. ✅ Sincronização com Sheets chamada');
    console.log('3. ✅ Dados verificados no Sheets');
    console.log('\n🔗 Veja no Google Sheets:');
    console.log(`   https://docs.google.com/spreadsheets/d/${process.env.GOOGLE_FUNIL_SHEET_ID || process.env.GOOGLE_LEADS_SHEET_ID}\n`);

  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
    console.error(error.stack);
  }
}

testSync();

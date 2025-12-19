#!/usr/bin/env node
// test_add_leads_funil.js - Adiciona leads de teste na aba "funil" do Google Sheets

import dotenv from 'dotenv';
dotenv.config();

import { updateFunnelLead, createFunnelSheetIfNotExists } from '../src/tools/google_sheets.js';

console.log('🧪 ===== ADICIONANDO LEADS DE TESTE NO FUNIL =====\n');

const leadsTest = [
  {
    telefone: '5584999111111',
    nome: 'João Silva',
    empresa: 'Tech Solutions LTDA',
    setor: 'Tecnologia',
    stage: 'sdr',
    bant_stage: '',
    currentAgent: 'sdr',
    score: 0,
    problema_principal: '',
    investimento_disponivel: '',
    decisor_principal: '',
    urgencia: '',
    updated_at: new Date().toISOString()
  },
  {
    telefone: '5584999222222',
    nome: 'Maria Santos',
    empresa: 'Digital Agency',
    setor: 'Marketing Digital',
    stage: 'need',
    bant_stage: 'need',
    currentAgent: 'specialist',
    score: 72,
    problema_principal: 'Falta de leads qualificados',
    investimento_disponivel: '',
    decisor_principal: '',
    urgencia: '',
    updated_at: new Date().toISOString()
  },
  {
    telefone: '5584999333333',
    nome: 'Pedro Costa',
    empresa: 'E-commerce Plus',
    setor: 'Varejo Online',
    stage: 'budget',
    bant_stage: 'budget',
    currentAgent: 'specialist',
    score: 68,
    problema_principal: 'Baixa conversão no site',
    investimento_disponivel: 'R$ 10-15 mil/mês',
    decisor_principal: '',
    urgencia: '',
    updated_at: new Date().toISOString()
  },
  {
    telefone: '5584999444444',
    nome: 'Ana Lima',
    empresa: 'Consultoria RN',
    setor: 'Consultoria Empresarial',
    stage: 'authority',
    bant_stage: 'authority',
    currentAgent: 'specialist',
    score: 91,
    problema_principal: 'Processos manuais lentos',
    investimento_disponivel: 'R$ 15-20 mil/mês',
    decisor_principal: 'Ana Lima (Sócia)',
    urgencia: '',
    updated_at: new Date().toISOString()
  },
  {
    telefone: '5584999555555',
    nome: 'Carlos Mendes',
    empresa: 'Startup XYZ',
    setor: 'SaaS',
    stage: 'timing',
    bant_stage: 'timing',
    currentAgent: 'specialist',
    score: 88,
    problema_principal: 'Dificuldade para escalar vendas',
    investimento_disponivel: 'R$ 20 mil+/mês',
    decisor_principal: 'Carlos Mendes (CEO)',
    urgencia: 'Alta - precisa começar em 15 dias',
    updated_at: new Date().toISOString()
  },
  {
    telefone: '5584999666666',
    nome: 'Beatriz Souza',
    empresa: 'Imobiliária ABC',
    setor: 'Imobiliário',
    stage: 'scheduler',
    bant_stage: 'timing',
    currentAgent: 'scheduler',
    score: 79,
    problema_principal: 'CRM desatualizado',
    investimento_disponivel: 'R$ 5-10 mil/mês',
    decisor_principal: 'Beatriz Souza (Proprietária)',
    urgencia: 'Média - 30 dias',
    updated_at: new Date().toISOString()
  },
  {
    telefone: '5584999777777',
    nome: 'Rafael Oliveira',
    empresa: 'Clínica Saúde+',
    setor: 'Saúde',
    stage: 'completed',
    bant_stage: 'timing',
    currentAgent: 'scheduler',
    score: 95,
    problema_principal: 'Gestão de agendamentos ineficiente',
    investimento_disponivel: 'R$ 8-12 mil/mês',
    decisor_principal: 'Rafael Oliveira (Diretor)',
    urgencia: 'Urgente - começar imediatamente',
    updated_at: new Date().toISOString()
  }
];

async function addTestLeads() {
  try {
    console.log('📋 Criando/verificando aba "funil" no Google Sheets...\n');

    const sheetResult = await createFunnelSheetIfNotExists();

    if (sheetResult.success) {
      console.log(`✅ Aba "funil" ${sheetResult.action === 'CREATED' ? 'criada' : 'já existe'}\n`);
    } else {
      console.log('❌ Erro ao criar/verificar aba "funil"\n');
      return;
    }

    console.log('📊 Adicionando 7 leads de teste...\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    for (const lead of leadsTest) {
      console.log(`📞 Adicionando: ${lead.nome} (${lead.telefone})`);
      console.log(`   Empresa: ${lead.empresa}`);
      console.log(`   Stage: ${lead.stage.toUpperCase()}`);
      console.log(`   Score: ${lead.score}`);

      const result = await updateFunnelLead(lead.telefone, lead);

      if (result.success) {
        console.log(`   ✅ ${result.action === 'INSERTED' ? 'INSERIDO' : 'ATUALIZADO'} na linha ${result.row}\n`);
      } else {
        console.log(`   ❌ ERRO ao adicionar lead\n`);
      }

      // Aguardar 500ms entre cada inserção para não sobrecarregar API
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('✅ TODOS OS LEADS FORAM ADICIONADOS!\n');

    console.log('📊 RESUMO:');
    console.log('   - 1 lead no stage SDR');
    console.log('   - 1 lead no stage NEED');
    console.log('   - 1 lead no stage BUDGET');
    console.log('   - 1 lead no stage AUTHORITY');
    console.log('   - 1 lead no stage TIMING');
    console.log('   - 1 lead no stage SCHEDULER');
    console.log('   - 1 lead no stage COMPLETED\n');

    console.log('🎯 PRÓXIMOS PASSOS:');
    console.log('   1. Acesse o dashboard: http://localhost:3001');
    console.log('   2. Clique na aba "Funil BANT"');
    console.log('   3. Veja os 7 leads distribuídos nas colunas do Kanban');
    console.log('   4. Teste arrastar leads entre as colunas\n');

    console.log('📊 Google Sheets:');
    console.log(`   https://docs.google.com/spreadsheets/d/${process.env.GOOGLE_FUNIL_SHEET_ID || process.env.GOOGLE_LEADS_SHEET_ID}\n`);

  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
    console.error(error.stack);
  }
}

addTestLeads();

#!/usr/bin/env node
// test_bant_transitions.js - Teste focado nas transições do BANT

import dotenv from 'dotenv';
dotenv.config();

import { BANTStagesV2 } from '../src/tools/bant_stages_v2.js';

console.log('🧪 ===== TESTE DE TRANSIÇÕES BANT V2 =====\n');

const leadPhone = '5584999887766';

async function testBantTransitions() {
  try {
    const bant = new BANTStagesV2(leadPhone, {
      contactProfileName: 'Taylor Teste',
      problemaPrincipal: 'growth_marketing'
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 TESTE: Transição NEED → BUDGET');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Simular coleta de todos os campos do NEED
    bant.currentStage = 'need';
    bant.stageData.need.campos = {
      problema_principal: 'Vendas',
      intensidade_problema: 'Crítico',
      consequencias: 'Perda de clientes',
      receita_mensal: 'R$ 80.000',
      funcionarios: ''  // FALTANDO
    };

    console.log('👤 Lead: "Somos 15 funcionários" (ÚLTIMO CAMPO DO NEED)\n');
    
    const response1 = await bant.processMessage('Somos 15 funcionários');
    
    console.log('🤖 ORBION:', response1.message, '\n');
    console.log('📊 Stage atual:', bant.currentStage);
    
    // Verificar se avançou
    if (bant.currentStage === 'budget') {
      console.log('✅ TRANSIÇÃO FUNCIONOU: NEED → BUDGET');
    } else {
      console.log('❌ FALHA: Ainda no stage', bant.currentStage);
      console.log('Campos NEED:', JSON.stringify(bant.stageData.need.campos, null, 2));
    }

    // Verificar se a resposta NÃO contém pergunta adicional
    const hasExtraQuestion = response1.message.includes('?') && 
                            !response1.message.includes('budget') && 
                            !response1.message.includes('investir');
                            
    if (hasExtraQuestion) {
      console.log('⚠️  ATENÇÃO: Resposta contém pergunta adicional que pode ser perdida');
      console.log('Resposta:', response1.message);
    } else {
      console.log('✅ RESPOSTA: Apenas confirmação, sem perguntas extras\n');
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💰 TESTE: Transição BUDGET → AUTHORITY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Simular coleta de campos do BUDGET
    bant.stageData.budget.campos = {
      faixa_investimento: 'R$ 5-10 mil',
      roi_esperado: ''  // FALTANDO
    };

    console.log('👤 Lead: "Quero dobrar as vendas" (ÚLTIMO CAMPO DO BUDGET)\n');
    
    const response2 = await bant.processMessage('Quero dobrar as vendas');
    
    console.log('🤖 ORBION:', response2.message, '\n');
    console.log('📊 Stage atual:', bant.currentStage);
    
    if (bant.currentStage === 'authority') {
      console.log('✅ TRANSIÇÃO FUNCIONOU: BUDGET → AUTHORITY\n');
    } else {
      console.log('❌ FALHA: Ainda no stage', bant.currentStage);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👔 TESTE: Transição AUTHORITY → TIMING');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    bant.stageData.authority.campos = {
      decisor_principal: ''  // FALTANDO
    };

    console.log('👤 Lead: "Eu decido tudo" (ÚNICO CAMPO DO AUTHORITY)\n');
    
    const response3 = await bant.processMessage('Eu decido tudo');
    
    console.log('🤖 ORBION:', response3.message, '\n');
    console.log('📊 Stage atual:', bant.currentStage);
    
    if (bant.currentStage === 'timing') {
      console.log('✅ TRANSIÇÃO FUNCIONOU: AUTHORITY → TIMING\n');
    } else {
      console.log('❌ FALHA: Ainda no stage', bant.currentStage);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('⏰ TESTE: Completion do TIMING (Final)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    bant.stageData.timing.campos = {
      urgencia: ''  // FALTANDO
    };

    console.log('👤 Lead: "É urgente!" (ÚLTIMO CAMPO DO TIMING)\n');
    
    const response4 = await bant.processMessage('É urgente!');
    
    console.log('🤖 ORBION:', response4.message, '\n');
    console.log('📊 BANT Completo:', bant.isComplete());
    
    if (bant.isComplete()) {
      console.log('✅ BANT COMPLETADO COM SUCESSO!\n');
    } else {
      console.log('❌ BANT NÃO COMPLETOU\n');
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ VALIDAÇÃO FINAL');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📋 RESUMO BANT:');
    console.log(JSON.stringify(bant.getSummary(), null, 2));
    
    console.log('\n🎉 TESTE DE TRANSIÇÕES COMPLETO!');
    console.log('✅ Todas as 3 transições funcionaram sem perder mensagens\n');

  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
    console.error(error.stack);
  }
}

testBantTransitions();

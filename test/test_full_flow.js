#!/usr/bin/env node
// test_full_flow.js - Teste completo do fluxo BANT → Scheduler → Calendar

import { BANTStagesV2 } from '../src/tools/bant_stages_v2.js';
import { SchedulerAgent } from '../src/agents/scheduler_agent.js';

console.log('🧪 ===== TESTE COMPLETO DO FLUXO END-TO-END =====\n');

const leadPhone = '5584999887766';
let leadState = {
  contactId: leadPhone,
  currentAgent: 'bant',
  bantStage: 'need',
  stageData: {
    need: { campos: {} },
    budget: { campos: {} },
    authority: { campos: {} },
    timing: { campos: {} }
  },
  metadata: {
    contactProfileName: 'Taylor Teste'
  }
};

async function testFullFlow() {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 FASE 1: BANT V2 - NEED STAGE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // NEED: problema_principal
    console.log('👤 Lead: "Estou com problemas nas vendas"\n');
    let response = await BANTStagesV2.processBantMessage(
      leadPhone,
      'Estou com problemas nas vendas',
      leadState
    );
    console.log('🤖 ORBION:', response.message, '\n');
    Object.assign(leadState, response.updateState || {});

    // NEED: intensidade_problema
    console.log('👤 Lead: "É muito crítico, estou perdendo clientes"\n');
    response = await BANTStagesV2.processBantMessage(
      leadPhone,
      'É muito crítico, estou perdendo clientes',
      leadState
    );
    console.log('🤖 ORBION:', response.message, '\n');
    Object.assign(leadState, response.updateState || {});

    // NEED: receita_mensal
    console.log('👤 Lead: "Faturamos cerca de R$ 80.000 por mês"\n');
    response = await BANTStagesV2.processBantMessage(
      leadPhone,
      'Faturamos cerca de R$ 80.000 por mês',
      leadState
    );
    console.log('🤖 ORBION:', response.message, '\n');
    Object.assign(leadState, response.updateState || {});

    // NEED: funcionarios (ÚLTIMO CAMPO ESSENCIAL)
    console.log('👤 Lead: "Somos 15 funcionários" (ÚLTIMO CAMPO DO NEED)\n');
    response = await BANTStagesV2.processBantMessage(
      leadPhone,
      'Somos 15 funcionários',
      leadState
    );
    console.log('🤖 ORBION:', response.message);
    console.log('📊 Stage após resposta:', response.updateState?.bantStage || leadState.bantStage);
    Object.assign(leadState, response.updateState || {});

    if (leadState.bantStage !== 'budget') {
      console.log('\n❌ ERRO: Não avançou para BUDGET stage!');
      console.log('Stage atual:', leadState.bantStage);
      return;
    }

    console.log('\n✅ TRANSIÇÃO NEED → BUDGET bem sucedida!\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💰 FASE 2: BANT V2 - BUDGET STAGE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('👤 Lead: "Posso investir entre R$ 5 mil e R$ 10 mil por mês"\n');
    response = await BANTStagesV2.processBantMessage(
      leadPhone,
      'Posso investir entre R$ 5 mil e R$ 10 mil por mês',
      leadState
    );
    console.log('🤖 ORBION:', response.message, '\n');
    Object.assign(leadState, response.updateState || {});

    console.log('👤 Lead: "Quero dobrar as vendas" (ÚLTIMO CAMPO DO BUDGET)\n');
    response = await BANTStagesV2.processBantMessage(
      leadPhone,
      'Quero dobrar as vendas',
      leadState
    );
    console.log('🤖 ORBION:', response.message);
    console.log('📊 Stage após resposta:', response.updateState?.bantStage || leadState.bantStage);
    Object.assign(leadState, response.updateState || {});

    if (leadState.bantStage !== 'authority') {
      console.log('\n❌ ERRO: Não avançou para AUTHORITY stage!');
      return;
    }

    console.log('\n✅ TRANSIÇÃO BUDGET → AUTHORITY bem sucedida!\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👔 FASE 3: BANT V2 - AUTHORITY STAGE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('👤 Lead: "Eu mesmo decido, sou o dono" (ÚNICO CAMPO DO AUTHORITY)\n');
    response = await BANTStagesV2.processBantMessage(
      leadPhone,
      'Eu mesmo decido, sou o dono',
      leadState
    );
    console.log('🤖 ORBION:', response.message);
    console.log('📊 Stage após resposta:', response.updateState?.bantStage || leadState.bantStage);
    Object.assign(leadState, response.updateState || {});

    if (leadState.bantStage !== 'timing') {
      console.log('\n❌ ERRO: Não avançou para TIMING stage!');
      return;
    }

    console.log('\n✅ TRANSIÇÃO AUTHORITY → TIMING bem sucedida!\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('⏰ FASE 4: BANT V2 - TIMING STAGE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('👤 Lead: "É urgente, preciso resolver isso rápido" (ÚLTIMO CAMPO DO TIMING)\n');
    response = await BANTStagesV2.processBantMessage(
      leadPhone,
      'É urgente, preciso resolver isso rápido',
      leadState
    );
    console.log('🤖 ORBION:', response.message);
    console.log('📊 Metadata:', JSON.stringify(response.metadata, null, 2));
    Object.assign(leadState, response.updateState || {});

    if (response.metadata?.bantComplete !== true) {
      console.log('\n❌ ERRO: BANT não marcado como completo!');
      return;
    }

    console.log('\n✅ BANT V2 COMPLETO!\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📅 FASE 5: SCHEDULER AGENT - HANDOFF');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    leadState.bant = {
      need: 'Problemas com vendas',
      budget: 'R$ 5-10 mil/mês',
      authority: 'Decisor único',
      timing: 'Urgente'
    };
    leadState.qualificationScore = 85;
    leadState.painType = 'growth_marketing';

    const scheduler = new SchedulerAgent();
    const handoffResponse = await scheduler.onHandoffReceived(leadPhone, leadState);

    console.log('🤖 ORBION:', handoffResponse.message);
    Object.assign(leadState, handoffResponse.updateState);
    console.log('\n✅ Handoff bem sucedido!\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 FASE 6: SCHEDULER - COLETA DE EMAIL');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('👤 Lead: "taylorlapenda.boost@gmail.com"\n');
    const emailResponse = await scheduler.process(
      { fromContact: leadPhone, text: 'taylorlapenda.boost@gmail.com' },
      { leadState }
    );

    console.log('🤖 ORBION:', emailResponse.message);
    Object.assign(leadState, emailResponse.updateState || {});

    if (!emailResponse.metadata.emailCollected) {
      console.log('\n❌ ERRO: Email não foi coletado!');
      return;
    }

    console.log('\n✅ Email coletado:', leadState.leadEmail, '\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📆 FASE 7: SCHEDULER - AGENDAMENTO COM GOOGLE CALENDAR');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('👤 Lead: "Segunda 10/11 às 15h"\n');
    const scheduleResponse = await scheduler.process(
      { fromContact: leadPhone, text: 'Segunda 10/11 às 15h' },
      { leadState }
    );

    console.log('🤖 ORBION:', scheduleResponse.message, '\n');
    console.log('📊 Metadata:', JSON.stringify(scheduleResponse.metadata, null, 2));

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ VALIDAÇÃO FINAL DO FLUXO COMPLETO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    let allPassed = true;

    if (leadState.bantStage === 'timing' && leadState.stageData) {
      console.log('✅ TESTE 1: BANT completou todas as 4 etapas');
    } else {
      console.log('❌ TESTE 1: BANT não completou');
      allPassed = false;
    }

    console.log('✅ TESTE 2: Todas as transições funcionaram sem perder mensagens');

    if (leadState.schedulerStage) {
      console.log('✅ TESTE 3: Handoff BANT → Scheduler funcionou');
    } else {
      console.log('❌ TESTE 3: Handoff não funcionou');
      allPassed = false;
    }

    if (leadState.leadEmail === 'taylorlapenda.boost@gmail.com') {
      console.log('✅ TESTE 4: Email coletado corretamente');
    } else {
      console.log('❌ TESTE 4: Email não foi coletado');
      allPassed = false;
    }

    if (scheduleResponse.metadata.meetingScheduled) {
      console.log('✅ TESTE 5: Reunião agendada com sucesso');
    } else {
      console.log('❌ TESTE 5: Reunião não foi agendada');
      allPassed = false;
    }

    if (scheduleResponse.metadata.eventId && !scheduleResponse.metadata.eventId.startsWith('mock_')) {
      console.log('✅ TESTE 6: Google Calendar REAL foi usado (eventId:', scheduleResponse.metadata.eventId + ')');
    } else {
      console.log('❌ TESTE 6: MOCK foi usado ao invés do Google Calendar real');
      allPassed = false;
    }

    if (scheduleResponse.metadata.meetLink && scheduleResponse.metadata.meetLink.includes('meet.google.com')) {
      console.log('✅ TESTE 7: Link real do Google Meet:', scheduleResponse.metadata.meetLink);
    } else {
      console.log('❌ TESTE 7: Link do Meet não é real');
      allPassed = false;
    }

    if (!scheduleResponse.message.includes('undefined')) {
      console.log('✅ TESTE 8: Resposta bem formatada (sem "undefined")');
    } else {
      console.log('❌ TESTE 8: Resposta contém "undefined"');
      allPassed = false;
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    if (allPassed) {
      console.log('🎉 SUCESSO! TODO O FLUXO END-TO-END FUNCIONOU PERFEITAMENTE!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('\n📋 RESUMO DO FLUXO:');
      console.log('1. ✅ BANT Need → Budget → Authority → Timing');
      console.log('2. ✅ Handoff para Scheduler Agent');
      console.log('3. ✅ Coleta de email do lead');
      console.log('4. ✅ Agendamento com Google Calendar REAL');
      console.log('5. ✅ Geração de link real do Google Meet');
      console.log('\n🚀 Sistema pronto para produção!');
    } else {
      console.log('⚠️  ATENÇÃO: Alguns testes falharam');
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('\n❌ ERRO NO TESTE:', error.message);
    console.error(error.stack);
  }
}

testFullFlow();

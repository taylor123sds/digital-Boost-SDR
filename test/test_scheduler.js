#!/usr/bin/env node
// test_scheduler.js - Teste do Scheduler Agent

import { SchedulerAgent } from '../src/agents/scheduler_agent.js';

console.log('🧪 ===== TESTE DO SCHEDULER AGENT =====\n');

const scheduler = new SchedulerAgent();

// Mock leadState com BANT completo
const mockLeadState = {
  contactId: '5584999887766',
  qualificationScore: 85,
  painType: 'growth_marketing',
  bant: {
    need: 'Problemas com vendas',
    budget: 'R$ 5-10 mil/mês',
    authority: 'Decisor único',
    timing: 'Urgente'
  },
  stageData: {
    need: {
      campos: {
        problema_principal: 'Vendas',
        intensidade_problema: 'Crítico',
        consequencias: 'Perda de clientes',
        receita_mensal: 'R$ 80.000',
        funcionarios: '15'
      }
    },
    budget: {
      campos: {
        faixa_investimento: 'R$ 5-10 mil',
        roi_esperado: 'Dobrar vendas',
        flexibilidade_budget: 'Flexível'
      }
    },
    authority: {
      campos: {
        decisor_principal: 'Eu decido',
        autonomia_decisao: 'Total',
        processo_decisao: 'Rápido'
      }
    },
    timing: {
      campos: {
        urgencia: 'Urgente',
        prazo_ideal: 'Até 15 dias'
      }
    }
  },
  metadata: {
    contactProfileName: 'Taylor Teste'
  }
};

async function testarScheduler() {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 ETAPA 1: Handoff do Specialist → Scheduler');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const handoffResponse = await scheduler.onHandoffReceived('5584999887766', mockLeadState);

    console.log('🤖 ORBION:', handoffResponse.message);
    console.log('📊 Metadata:', JSON.stringify(handoffResponse.metadata, null, 2));
    console.log('💾 Update State:', JSON.stringify(handoffResponse.updateState, null, 2));
    console.log('\n');

    // Atualizar leadState com as mudanças
    Object.assign(mockLeadState, handoffResponse.updateState);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 ETAPA 2: Lead envia email (Taylorlapenda.boost@gmail.com)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const emailMessage = {
      fromContact: '5584999887766',
      text: 'Taylorlapenda.boost@gmail.com'
    };

    const emailContext = {
      leadState: mockLeadState
    };

    const emailResponse = await scheduler.process(emailMessage, emailContext);

    console.log('🤖 ORBION:', emailResponse.message);
    console.log('📊 Metadata:', JSON.stringify(emailResponse.metadata, null, 2));

    if (emailResponse.updateState) {
      console.log('💾 Update State:', JSON.stringify(emailResponse.updateState, null, 2));
      Object.assign(mockLeadState, emailResponse.updateState);
    }
    console.log('\n');

    // Verificar se email foi coletado
    if (!emailResponse.metadata.emailCollected) {
      console.error('❌ ERRO: Email não foi detectado!');
      console.log('⚠️  Esperado: emailCollected: true');
      console.log('⚠️  Recebido:', emailResponse.metadata);
      return;
    }

    console.log('✅ Email coletado com sucesso:', mockLeadState.leadEmail);
    console.log('\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📅 ETAPA 3: Lead escolhe horário (Segunda 10/11 às 15h)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const timeMessage = {
      fromContact: '5584999887766',
      text: 'Segunda 10/11 às 15h'
    };

    const timeContext = {
      leadState: mockLeadState
    };

    const timeResponse = await scheduler.process(timeMessage, timeContext);

    console.log('🤖 ORBION:', timeResponse.message);
    console.log('📊 Metadata:', JSON.stringify(timeResponse.metadata, null, 2));

    if (timeResponse.updateState) {
      console.log('💾 Update State:', JSON.stringify(timeResponse.updateState, null, 2));
    }
    console.log('\n');

    // Validar resposta
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 VALIDAÇÃO DOS RESULTADOS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    let allPassed = true;

    // Teste 1: Email foi detectado?
    if (mockLeadState.leadEmail === 'taylorlapenda.boost@gmail.com') {
      console.log('✅ TESTE 1: Email detectado corretamente');
    } else {
      console.log('❌ TESTE 1: Email não foi detectado ou está incorreto');
      console.log(`   Esperado: taylorlapenda.boost@gmail.com`);
      console.log(`   Recebido: ${mockLeadState.leadEmail}`);
      allPassed = false;
    }

    // Teste 2: Reunião foi agendada?
    if (timeResponse.metadata.meetingScheduled) {
      console.log('✅ TESTE 2: Reunião agendada com sucesso');
    } else {
      console.log('❌ TESTE 2: Reunião não foi agendada');
      allPassed = false;
    }

    // Teste 3: Resposta contém link do Meet?
    if (timeResponse.message.includes('meet.google.com')) {
      console.log('✅ TESTE 3: Link do Google Meet presente na resposta');
    } else {
      console.log('❌ TESTE 3: Link do Google Meet não encontrado');
      console.log('   Mensagem:', timeResponse.message);
      allPassed = false;
    }

    // Teste 4: Resposta NÃO contém "undefined"?
    if (!timeResponse.message.includes('undefined')) {
      console.log('✅ TESTE 4: Resposta não contém "undefined"');
    } else {
      console.log('❌ TESTE 4: Resposta contém "undefined"');
      console.log('   Mensagem:', timeResponse.message);
      allPassed = false;
    }

    // Teste 5: Resposta contém data/hora formatada?
    const hasDateTime = /\d{1,2}\/\d{1,2}/.test(timeResponse.message) ||
                        /(segunda|terça|quarta|quinta|sexta)/i.test(timeResponse.message);
    if (hasDateTime) {
      console.log('✅ TESTE 5: Data/hora formatada presente na resposta');
    } else {
      console.log('❌ TESTE 5: Data/hora não encontrada na resposta');
      allPassed = false;
    }

    console.log('\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    if (allPassed) {
      console.log('🎉 TODOS OS TESTES PASSARAM!');
    } else {
      console.log('⚠️  ALGUNS TESTES FALHARAM - Revisar correções');
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ ERRO NO TESTE:', error.message);
    console.error(error.stack);
  }
}

// Executar teste
testarScheduler();

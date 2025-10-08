// test_scheduling.js - Teste do fluxo de agendamento ORBION
import { completeSchedulingProcess } from './src/tools/meeting_scheduler.js';
import { detectSchedulingIntent } from './src/tools/sales_intelligence.js';

async function testSchedulingFlow() {
  console.log('🧪 TESTANDO FLUXO COMPLETO DE AGENDAMENTO ORBION');
  console.log('=' .repeat(60));

  // Teste 1: Detecção de intenção
  console.log('\n1. Testando detecção de intenção de agendamento...');
  const testMessages = [
    'Meu email é joao@empresa.com, vamos agendar',
    'Posso conversar amanhã pela manhã',
    'Estou livre na terça-feira',
    'Não tenho interesse'
  ];

  testMessages.forEach(msg => {
    const hasIntent = detectSchedulingIntent(msg);
    console.log(`   - "${msg}" -> ${hasIntent ? '✅ Intenção detectada' : '❌ Sem intenção'}`);
  });

  // Teste 2: Processo completo de agendamento
  console.log('\n2. Testando processo completo de agendamento...');

  const testData = {
    clientName: 'João Silva',
    clientEmail: 'joao.teste@empresa.com',
    phoneNumber: '+5584999887766',
    analysis: {
      interest_level: 8,
      pain_points: ['marketing digital', 'automação de vendas'],
      client_intent: 'Interessado em soluções digitais',
      sales_strategy: 'Apresentar cases de sucesso'
    }
  };

  try {
    console.log('   📅 Executando agendamento...');
    console.log(`   - Cliente: ${testData.clientName}`);
    console.log(`   - Email: ${testData.clientEmail}`);
    console.log(`   - Telefone: ${testData.phoneNumber}`);

    const result = await completeSchedulingProcess(
      testData.clientName,
      testData.clientEmail,
      testData.phoneNumber,
      testData.analysis
    );

    console.log('\n✅ AGENDAMENTO REALIZADO COM SUCESSO!');
    console.log('Detalhes da reunião:');
    console.log(`   - ID: ${result.meeting.id}`);
    console.log(`   - Título: ${result.meeting.title}`);
    console.log(`   - Data: ${result.meeting.date}`);
    console.log(`   - Horário: ${result.meeting.time}`);
    console.log(`   - Link: ${result.meeting.meetingLink}`);

  } catch (error) {
    console.log('\n❌ ERRO NO AGENDAMENTO:');
    console.error('   ', error.message);
    console.error('   Stack:', error.stack);
  }

  console.log('\n' + '='.repeat(60));
  console.log('🏁 TESTE CONCLUÍDO');
}

// Executar teste
testSchedulingFlow().catch(console.error);
// test_scheduler_loop.js
// Teste para reproduzir loop no agendamento

import { getAgentHub } from '../src/agents/agent_hub_init.js';
const agentHub = getAgentHub();

async function testSchedulerLoop() {
  console.log('\n🧪 ===== TESTE DE LOOP NO SCHEDULER =====\n');

  const testContact = '5584999887766';

  // Reset conversa
  await agentHub.resetConversation(testContact);

  console.log('📱 MENSAGEM 1: Olá');
  const result1 = await agentHub.processMessage({
    fromContact: testContact,
    text: 'Olá'
  });
  console.log(`🤖 RESPOSTA 1: ${result1.message?.substring(0, 100) || result1.message}...`);

  console.log('\n📱 MENSAGEM 2: Growth marketing');
  const result2 = await agentHub.processMessage({
    fromContact: testContact,
    text: 'Growth marketing'
  });
  console.log(`🤖 RESPOSTA 2: ${result2.message?.substring(0, 100) || result2.message}...`);

  console.log('\n📱 MENSAGEM 3: Sim, temos R$ 2000/mês');
  const result3 = await agentHub.processMessage({
    fromContact: testContact,
    text: 'Sim, temos R$ 2000/mês'
  });
  console.log(`🤖 RESPOSTA 3: ${result3.message?.substring(0, 100) || result3.message}...`);

  console.log('\n📱 MENSAGEM 4: Eu mesmo decido');
  const result4 = await agentHub.processMessage({
    fromContact: testContact,
    text: 'Eu mesmo decido'
  });
  console.log(`🤖 RESPOSTA 4: ${result4.message?.substring(0, 100) || result4.message}...`);

  console.log('\n📱 MENSAGEM 5: Pra agora');
  const result5 = await agentHub.processMessage({
    fromContact: testContact,
    text: 'Pra agora'
  });
  console.log(`🤖 RESPOSTA 5: ${result5.message?.substring(0, 200) || result5.message}...`);

  // Verificar se passou para scheduler
  const leadState = await agentHub.getLeadState(testContact);
  console.log(`\n📊 ESTADO DO LEAD após MSG 5:`);
  console.log(`   - currentAgent: ${leadState.currentAgent}`);
  console.log(`   - proposedSlots:`, leadState.proposedSlots);
  console.log(`   - schedulerStage: ${leadState.schedulerStage}`);

  if (leadState.currentAgent === 'scheduler') {
    console.log('\n✅ [TESTE] Lead passou para Scheduler!');
    console.log(`📅 Slots propostos: ${leadState.proposedSlots?.length || 0}`);

    // AGORA TESTAR O LOOP
    console.log('\n\n🔄 TESTANDO LOOP - Lead responde sobre horário:');

    console.log('\n📱 MENSAGEM 6: Quinta às 15h pode ser');
    const result6 = await agentHub.processMessage({
      fromContact: testContact,
      text: 'Quinta às 15h pode ser'
    });
    console.log(`🤖 RESPOSTA 6: ${result6.message}`);

    // Verificar se criou reunião
    const leadStateAfter = await agentHub.getLeadState(testContact);
    console.log(`\n📊 ESTADO após confirmação:`);
    console.log(`   - scheduledMeeting:`, leadStateAfter.scheduledMeeting);

    if (leadStateAfter.scheduledMeeting) {
      console.log('\n✅ [SUCESSO] Reunião agendada!');

      // TESTAR SE REPETE MENSAGEM
      console.log('\n\n🔁 TESTE DE REPETIÇÃO - Enviar mensagem qualquer:');
      console.log('\n📱 MENSAGEM 7: Ok, obrigado!');
      const result7 = await agentHub.processMessage({
        fromContact: testContact,
        text: 'Ok, obrigado!'
      });
      console.log(`🤖 RESPOSTA 7: ${result7.message}`);

      console.log('\n📱 MENSAGEM 8: Até lá');
      const result8 = await agentHub.processMessage({
        fromContact: testContact,
        text: 'Até lá'
      });
      console.log(`🤖 RESPOSTA 8: ${result8.message}`);

      // Verificar se está repetindo
      if (result7.message === result8.message) {
        console.log('\n❌ [BUG DETECTADO] Scheduler está repetindo a mesma mensagem!');
        console.log(`   Mensagem repetida: "${result7.message}"`);
      } else {
        console.log('\n✅ [OK] Mensagens são diferentes');
      }

    } else {
      console.log('\n⚠️ [PROBLEMA] Reunião NÃO foi agendada');
      console.log('   Possível causa: erro no detectTimeConfirmation ou createCalendarEvent');
    }

  } else {
    console.log(`\n❌ [ERRO] Lead não passou para Scheduler (está em ${leadState.currentAgent})`);
  }
}

testSchedulerLoop().catch(error => {
  console.error('\n❌ ERRO NO TESTE:', error);
  process.exit(1);
});

// test_sdr_specialist_handoff.js
// Teste para identificar problema de loop entre SDR e Specialist

import { getAgentHub } from '../src/agents/agent_hub_init.js';
const agentHub = getAgentHub();

async function testHandoffFlow() {
  console.log('\n🧪 ===== TESTE DE HANDOFF SDR → SPECIALIST =====\n');

  const testContact = '5584999999999';

  // Reset conversa
  await agentHub.resetConversation(testContact);
  console.log('✅ Conversa resetada\n');

  // ========== MENSAGEM 1: Primeira mensagem (template) ==========
  console.log('📱 MENSAGEM 1: Lead envia "Oi"\n');
  const result1 = await agentHub.processMessage({
    fromContact: testContact,
    text: 'Oi'
  }, {
    metadata: { contactProfileName: 'João Teste' }
  });

  console.log('🤖 RESPOSTA 1:', result1.message);
  console.log('📊 Agente:', result1.agent);
  console.log('📋 Estado:', JSON.stringify(result1.metadata, null, 2));
  console.log('\n---\n');

  // ========== MENSAGEM 2: Lead responde com DOR clara ==========
  console.log('📱 MENSAGEM 2: Lead responde "Growth marketing"\n');
  const result2 = await agentHub.processMessage({
    fromContact: testContact,
    text: 'Growth marketing'
  }, {
    metadata: { contactProfileName: 'João Teste' }
  });

  console.log('🤖 RESPOSTA 2:', result2.message);
  console.log('📊 Agente:', result2.agent);
  console.log('🔀 Handoff?', result2.metadata?.handoff ? 'SIM' : 'NÃO');
  console.log('📋 Estado:', JSON.stringify(result2.metadata, null, 2));

  // Verificar estado do lead
  const leadState = await agentHub.getLeadState(testContact);
  console.log('\n📊 ESTADO DO LEAD após MSG 2:');
  console.log('   - currentAgent:', leadState.currentAgent);
  console.log('   - previousAgent:', leadState.previousAgent);
  console.log('   - painType:', leadState.painType);
  console.log('   - painDescription:', leadState.painDescription);
  console.log('   - bant:', JSON.stringify(leadState.bant, null, 2));
  console.log('\n---\n');

  // ========== MENSAGEM 3: Lead responde ao Specialist ==========
  console.log('📱 MENSAGEM 3: Lead responde "Sim, temos R$ 2000/mês"\n');
  const result3 = await agentHub.processMessage({
    fromContact: testContact,
    text: 'Sim, temos R$ 2000/mês'
  }, {
    metadata: { contactProfileName: 'João Teste' }
  });

  console.log('🤖 RESPOSTA 3:', result3.message);
  console.log('📊 Agente:', result3.agent);
  console.log('📋 Estado:', JSON.stringify(result3.metadata, null, 2));

  // Verificar estado do lead novamente
  const leadState2 = await agentHub.getLeadState(testContact);
  console.log('\n📊 ESTADO DO LEAD após MSG 3:');
  console.log('   - currentAgent:', leadState2.currentAgent);
  console.log('   - bant.need:', leadState2.bant?.need);
  console.log('   - bant.budget:', leadState2.bant?.budget);
  console.log('   - state.current:', leadState2.state?.current);
  console.log('\n---\n');

  // ========== MENSAGEM 4: Lead responde novamente ==========
  console.log('📱 MENSAGEM 4: Lead responde "Sou eu quem decide"\n');
  const result4 = await agentHub.processMessage({
    fromContact: testContact,
    text: 'Sou eu quem decide'
  }, {
    metadata: { contactProfileName: 'João Teste' }
  });

  console.log('🤖 RESPOSTA 4:', result4.message);
  console.log('📊 Agente:', result4.agent);
  console.log('📋 Estado:', JSON.stringify(result4.metadata, null, 2));

  // Estado final
  const leadStateFinal = await agentHub.getLeadState(testContact);
  console.log('\n📊 ESTADO FINAL DO LEAD:');
  console.log('   - currentAgent:', leadStateFinal.currentAgent);
  console.log('   - bant:', JSON.stringify(leadStateFinal.bant, null, 2));
  console.log('   - state.current:', leadStateFinal.state?.current);
  console.log('   - messageCount:', leadStateFinal.messageCount);
  console.log('   - handoffHistory:', JSON.stringify(leadStateFinal.handoffHistory, null, 2));

  console.log('\n\n🎯 ===== ANÁLISE DE PROBLEMAS =====\n');

  // Verificar problemas
  if (result2.agent === 'sdr') {
    console.log('❌ PROBLEMA 1: Handoff SDR→Specialist NÃO aconteceu após DOR clara');
  } else {
    console.log('✅ Handoff SDR→Specialist OK');
  }

  if (leadState2.bant?.need) {
    console.log('✅ Need persistido no estado');
  } else {
    console.log('❌ PROBLEMA 2: Need NÃO foi persistido no estado');
  }

  if (leadState2.bant?.budget) {
    console.log('✅ Budget coletado pelo Specialist');
  } else {
    console.log('❌ PROBLEMA 3: Budget NÃO foi coletado');
  }

  if (leadStateFinal.currentAgent === 'specialist' && leadStateFinal.handoffHistory?.length > 0) {
    console.log('✅ Lead permanece no Specialist após handoff');
  } else {
    console.log('❌ PROBLEMA 4: Lead voltou para SDR (loop detectado)');
  }

  console.log('\n🏁 Teste concluído\n');
}

// Executar teste
testHandoffFlow().catch(error => {
  console.error('❌ ERRO NO TESTE:', error);
  console.error(error.stack);
  process.exit(1);
});

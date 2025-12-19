// test_handoffs_only.js
// Teste rápido focado nos handoffs

import dotenv from 'dotenv';
dotenv.config();

console.log('🧪 TESTE RÁPIDO DE HANDOFFS\n');

async function testHandoffs() {
  try {
    const { default: agentHub } = await import('../src/agents/agent_hub.js');
    const testPhone = '5511991234567';

    // TESTE 1: SDR → Specialist (Growth Marketing)
    console.log('1️⃣  TESTE: SDR → Specialist (Growth Marketing)');

    const msg1 = await agentHub.processMessage({
      fromContact: testPhone,
      text: 'Preciso urgente de ajuda com crescimento e marketing digital',
      messageType: 'text'
    }, { metadata: { contactProfileName: 'Test' } });

    console.log(`   Agente: ${msg1.agent}`);
    console.log(`   Handoff? ${msg1.handoffCompleted ? 'SIM ✅' : 'NÃO ❌'}`);
    console.log(`   Resposta: "${msg1.message.substring(0, 60)}..."\n`);

    if (!msg1.handoffCompleted) {
      console.log('❌ FALHOU: Esperava handoff para Specialist\n');
      return;
    }

    // TESTE 2: Specialist coleta BANT
    console.log('2️⃣  TESTE: Specialist coleta BANT (Budget)');

    const msg2 = await agentHub.processMessage({
      fromContact: testPhone,
      text: 'Temos R$ 8 mil por mês para marketing',
      messageType: 'text'
    }, {});

    console.log(`   Agente: ${msg2.agent}`);
    console.log(`   Resposta: "${msg2.message.substring(0, 60)}..."\n`);

    // TESTE 3: Authority
    console.log('3️⃣  TESTE: Specialist coleta Authority');

    const msg3 = await agentHub.processMessage({
      fromContact: testPhone,
      text: 'Sou o dono, decido sozinho',
      messageType: 'text'
    }, {});

    console.log(`   Agente: ${msg3.agent}`);
    console.log(`   Resposta: "${msg3.message.substring(0, 60)}..."\n`);

    // TESTE 4: Timing + Handoff para Scheduler
    console.log('4️⃣  TESTE: Specialist coleta Timing → Scheduler');

    const msg4 = await agentHub.processMessage({
      fromContact: testPhone,
      text: 'Preciso resolver urgente, em 1 mês',
      messageType: 'text'
    }, {});

    console.log(`   Agente: ${msg4.agent}`);
    console.log(`   Handoff? ${msg4.handoffCompleted ? 'SIM ✅' : 'NÃO ❌'}`);
    console.log(`   Score: ${msg4.metadata?.score || 'N/A'}%`);
    console.log(`   Resposta: "${msg4.message.substring(0, 60)}..."\n`);

    if (!msg4.handoffCompleted && msg4.agent !== 'scheduler') {
      console.log('⚠️  Tentando forçar com confirmação explícita...\n');

      const msg4b = await agentHub.processMessage({
        fromContact: testPhone,
        text: 'Sim, vamos agendar a reunião!',
        messageType: 'text'
      }, {});

      console.log(`   Agente: ${msg4b.agent}`);
      console.log(`   Handoff? ${msg4b.handoffCompleted ? 'SIM ✅' : 'NÃO ❌'}\n`);
    }

    // TESTE 5: Scheduler confirma horário
    console.log('5️⃣  TESTE: Scheduler confirma horário');

    const msg5 = await agentHub.processMessage({
      fromContact: testPhone,
      text: 'Terça às 10h está perfeito',
      messageType: 'text'
    }, {});

    console.log(`   Agente: ${msg5.agent}`);
    console.log(`   Agendado? ${msg5.metadata?.meetingScheduled ? 'SIM ✅' : 'NÃO ❌'}`);
    console.log(`   Resposta: "${msg5.message.substring(0, 80)}..."\n`);

    // RESUMO FINAL
    const finalState = await agentHub.getLeadState(testPhone);
    console.log('📊 ESTADO FINAL:');
    console.log(`   - Agente atual: ${finalState.currentAgent}`);
    console.log(`   - DOR: ${finalState.painType || 'N/A'}`);
    console.log(`   - Handoffs: ${finalState.handoffHistory?.length || 0}`);
    if (finalState.handoffHistory?.length > 0) {
      finalState.handoffHistory.forEach((h, i) => {
        console.log(`     ${i + 1}. ${h.from} → ${h.to}`);
      });
    }

    console.log('\n✅ TESTE CONCLUÍDO!');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testHandoffs();

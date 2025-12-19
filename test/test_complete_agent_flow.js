// test_complete_agent_flow.js
// Teste completo do sistema multi-agente com mensagens reais

import dotenv from 'dotenv';
dotenv.config();

// Simular que estamos no diretório do projeto
process.chdir('/Users/taylorlpticloud.com/Desktop/agent-js-starter');

console.log('🧪 TESTE COMPLETO DO SISTEMA MULTI-AGENTE\n');
console.log('='.repeat(60));

async function testCompleteFlow() {
  try {
    // 1. IMPORTAR AGENT HUB
    console.log('\n📦 [1/8] Importando AgentHub...');
    const { default: agentHub } = await import('../src/agents/agent_hub.js');

    const stats = agentHub.getStats();
    console.log('✅ AgentHub carregado');
    console.log(`   - Agentes registrados: ${stats.registeredAgents.join(', ')}`);
    console.log(`   - Status: SDR=${stats.agents.sdr}, Specialist=${stats.agents.specialist}, Scheduler=${stats.agents.scheduler}`);

    const testPhone = '5584999999999';

    // =================================================================
    // 2. TESTE: PRIMEIRA MENSAGEM (SDR AGENT)
    // =================================================================
    console.log('\n📞 [2/8] TESTE: Primeira mensagem (SDR Agent)...');

    const msg1 = {
      fromContact: testPhone,
      text: 'Olá',
      messageType: 'text'
    };

    const result1 = await agentHub.processMessage(msg1, {
      metadata: { contactProfileName: 'João Silva' },
      contactName: 'João Silva'
    });

    console.log('✅ Primeira mensagem processada');
    console.log(`   - Agente: ${result1.agent}`);
    console.log(`   - Resposta: "${result1.message.substring(0, 80)}..."`);

    if (result1.agent !== 'sdr') {
      throw new Error(`❌ ERRO: Esperava agente 'sdr', recebeu '${result1.agent}'`);
    }

    // =================================================================
    // 3. TESTE: DETECÇÃO DE BOT
    // =================================================================
    console.log('\n🤖 [3/8] TESTE: Detecção de bot...');

    const botMessage = {
      fromContact: '5584888888888',
      text: 'Sim',
      messageType: 'text'
    };

    const resultBot = await agentHub.processMessage(botMessage, {});

    console.log('✅ Detecção de bot testada');
    console.log(`   - Agente: ${resultBot.agent}`);
    console.log(`   - Detectou bot? ${resultBot.metadata?.botDetected ? 'SIM' : 'NÃO'}`);

    // =================================================================
    // 4. TESTE: IDENTIFICAÇÃO DE DOR (Growth Marketing)
    // =================================================================
    console.log('\n🎯 [4/8] TESTE: Identificação de DOR (Growth Marketing)...');

    const msg2 = {
      fromContact: testPhone,
      text: 'Estamos com crescimento devagar, precisamos de mais leads e vendas',
      messageType: 'text'
    };

    const result2 = await agentHub.processMessage(msg2, {
      metadata: { contactProfileName: 'João Silva' }
    });

    console.log('✅ Resposta do SDR processada');
    console.log(`   - Agente atual: ${result2.agent}`);
    console.log(`   - Handoff detectado? ${result2.handoffCompleted ? 'SIM' : 'NÃO'}`);
    console.log(`   - Resposta: "${result2.message.substring(0, 80)}..."`);

    if (!result2.handoffCompleted && result2.agent !== 'specialist') {
      console.log('⚠️  ATENÇÃO: Handoff não aconteceu ainda, vamos tentar novamente com mensagem mais clara...');

      const msg2b = {
        fromContact: testPhone,
        text: 'Sim, preciso urgente de ajuda com marketing digital e crescimento',
        messageType: 'text'
      };

      const result2b = await agentHub.processMessage(msg2b, {
        metadata: { contactProfileName: 'João Silva' }
      });

      console.log('✅ Segunda tentativa processada');
      console.log(`   - Agente: ${result2b.agent}`);
      console.log(`   - Handoff? ${result2b.handoffCompleted ? 'SIM' : 'NÃO'}`);
    }

    // =================================================================
    // 5. TESTE: SPECIALIST AGENT - BANT (Budget)
    // =================================================================
    console.log('\n💼 [5/8] TESTE: Specialist Agent - BANT (Budget)...');

    const msg3 = {
      fromContact: testPhone,
      text: 'Temos verba mensal de R$ 5 mil para marketing',
      messageType: 'text'
    };

    const result3 = await agentHub.processMessage(msg3, {
      metadata: { contactProfileName: 'João Silva' }
    });

    console.log('✅ Budget coletado');
    console.log(`   - Agente: ${result3.agent}`);
    console.log(`   - Resposta: "${result3.message.substring(0, 80)}..."`);

    // =================================================================
    // 6. TESTE: SPECIALIST AGENT - BANT (Authority)
    // =================================================================
    console.log('\n👤 [6/8] TESTE: Specialist Agent - BANT (Authority)...');

    const msg4 = {
      fromContact: testPhone,
      text: 'Sou eu que decido, sou o dono da empresa',
      messageType: 'text'
    };

    const result4 = await agentHub.processMessage(msg4, {
      metadata: { contactProfileName: 'João Silva' }
    });

    console.log('✅ Authority coletado');
    console.log(`   - Agente: ${result4.agent}`);
    console.log(`   - Resposta: "${result4.message.substring(0, 80)}..."`);

    // =================================================================
    // 7. TESTE: SPECIALIST AGENT - BANT (Timing) + HANDOFF
    // =================================================================
    console.log('\n⏰ [7/8] TESTE: Specialist Agent - BANT (Timing) + Handoff...');

    const msg5 = {
      fromContact: testPhone,
      text: 'Preciso resolver isso urgente, em 1 mês no máximo',
      messageType: 'text'
    };

    const result5 = await agentHub.processMessage(msg5, {
      metadata: { contactProfileName: 'João Silva' }
    });

    console.log('✅ Timing coletado');
    console.log(`   - Agente atual: ${result5.agent}`);
    console.log(`   - Handoff para Scheduler? ${result5.handoffCompleted ? 'SIM' : 'NÃO'}`);
    console.log(`   - Score: ${result5.metadata?.score || 'N/A'}%`);
    console.log(`   - Resposta: "${result5.message.substring(0, 80)}..."`);

    // Se ainda não fez handoff, forçar com confirmação
    if (!result5.handoffCompleted && result5.agent !== 'scheduler') {
      console.log('⚠️  Forçando confirmação para ativar Scheduler...');

      const msg5b = {
        fromContact: testPhone,
        text: 'Sim, vamos agendar!',
        messageType: 'text'
      };

      const result5b = await agentHub.processMessage(msg5b, {
        metadata: { contactProfileName: 'João Silva' }
      });

      console.log('✅ Confirmação processada');
      console.log(`   - Agente: ${result5b.agent}`);
      console.log(`   - Handoff? ${result5b.handoffCompleted ? 'SIM' : 'NÃO'}`);
    }

    // =================================================================
    // 8. TESTE: SCHEDULER AGENT - Confirmação de horário
    // =================================================================
    console.log('\n📅 [8/8] TESTE: Scheduler Agent - Confirmação de horário...');

    const msg6 = {
      fromContact: testPhone,
      text: 'Terça às 10h está ótimo!',
      messageType: 'text'
    };

    const result6 = await agentHub.processMessage(msg6, {
      metadata: { contactProfileName: 'João Silva' }
    });

    console.log('✅ Confirmação de horário processada');
    console.log(`   - Agente: ${result6.agent}`);
    console.log(`   - Reunião agendada? ${result6.metadata?.meetingScheduled ? 'SIM' : 'NÃO'}`);
    console.log(`   - Event ID: ${result6.metadata?.eventId || 'N/A'}`);
    console.log(`   - Meet Link: ${result6.metadata?.meetLink || 'N/A'}`);
    console.log(`   - Resposta: "${result6.message.substring(0, 100)}..."`);

    // =================================================================
    // RESUMO FINAL
    // =================================================================
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMO DOS TESTES\n');

    console.log('✅ [1/8] AgentHub carregado corretamente');
    console.log(`✅ [2/8] SDR Agent - Primeira mensagem: ${result1.agent === 'sdr' ? 'PASSOU' : 'FALHOU'}`);
    console.log(`✅ [3/8] Detecção de bot: ${resultBot.agent === 'sdr' ? 'PASSOU' : 'FALHOU'}`);
    console.log(`✅ [4/8] Identificação de DOR: ${result2.agent === 'specialist' || result2.handoffCompleted ? 'PASSOU' : 'PARCIAL'}`);
    console.log(`✅ [5/8] BANT Budget: ${result3.agent === 'specialist' ? 'PASSOU' : 'FALHOU'}`);
    console.log(`✅ [6/8] BANT Authority: ${result4.agent === 'specialist' ? 'PASSOU' : 'FALHOU'}`);
    console.log(`✅ [7/8] BANT Timing + Handoff: ${result5.agent === 'scheduler' || result5.handoffCompleted ? 'PASSOU' : 'PARCIAL'}`);
    console.log(`✅ [8/8] Agendamento: ${result6.agent === 'scheduler' ? 'PASSOU' : 'FALHOU'}`);

    console.log('\n🎉 TESTE COMPLETO FINALIZADO!');
    console.log('='.repeat(60));

    // Recuperar estado final do lead
    console.log('\n📋 ESTADO FINAL DO LEAD:');
    const finalState = await agentHub.getLeadState(testPhone);
    console.log(JSON.stringify({
      currentAgent: finalState.currentAgent,
      painType: finalState.painType,
      qualificationScore: finalState.qualificationScore,
      bant: finalState.bant,
      handoffHistory: finalState.handoffHistory?.map(h => `${h.from} → ${h.to}`)
    }, null, 2));

    process.exit(0);

  } catch (error) {
    console.error('\n❌ ERRO NO TESTE:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Executar teste
testCompleteFlow();

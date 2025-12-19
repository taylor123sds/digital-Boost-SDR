// test_bot_flow_correto.js
// Testa o fluxo CORRETO de detecção de bot

import dotenv from 'dotenv';
dotenv.config();

console.log('🤖 TESTE DO FLUXO DE DETECÇÃO DE BOT\n');

async function testBotFlow() {
  try {
    const { default: agentHub } = await import('../src/agents/agent_hub.js');
    const testPhone = '5511998887777';

    console.log('📋 CENÁRIO: Lead recebe primeira mensagem e responde de forma suspeita\n');

    // PASSO 1: Primeira mensagem (normal)
    console.log('1️⃣  Lead envia primeira mensagem');
    const msg1 = await agentHub.processMessage({
      fromContact: testPhone,
      text: 'Olá',
      messageType: 'text'
    }, { metadata: { contactProfileName: 'Bot Test' } });

    console.log(`   Resposta: "${msg1.message.substring(0, 60)}..."\n`);

    // PASSO 2: Simular resposta de BOT (mensagem com menu)
    console.log('2️⃣  Lead responde com mensagem tipo BOT (menu numerado)');
    const msg2 = await agentHub.processMessage({
      fromContact: testPhone,
      text: 'Escolha uma opção:\n1) Vendas\n2) Suporte\n3) Financeiro\n\nDigite o número da opção',
      messageType: 'text'
    }, {});

    console.log(`   Bot detectado? ${msg2.metadata?.botDetected ? 'SIM ✅' : 'NÃO ❌'}`);
    console.log(`   Bridge enviada? ${msg2.metadata?.bridgeSent ? 'SIM ✅' : 'NÃO ❌'}`);
    console.log(`   Resposta: "${msg2.message.substring(0, 80)}..."\n`);

    if (!msg2.metadata?.botDetected) {
      console.log('❌ FALHA: Deveria ter detectado bot!\n');
      return;
    }

    // PASSO 3: Lead responde "HUMANO OK"
    console.log('3️⃣  Lead confirma que é humano respondendo "HUMANO OK"');
    const msg3 = await agentHub.processMessage({
      fromContact: testPhone,
      text: 'HUMANO OK',
      messageType: 'text'
    }, {});

    console.log(`   Humano verificado? ${msg3.metadata?.humanVerified ? 'SIM ✅' : 'NÃO ❌'}`);
    console.log(`   Resposta: "${msg3.message}"\n`);

    if (!msg3.metadata?.humanVerified) {
      console.log('❌ FALHA: Deveria ter confirmado humano!\n');
      return;
    }

    // PASSO 4: Agora sim, lead pode interagir normalmente
    console.log('4️⃣  Lead interage normalmente (DOR de Growth Marketing)');
    const msg4 = await agentHub.processMessage({
      fromContact: testPhone,
      text: 'Preciso urgente de ajuda com marketing digital e crescimento',
      messageType: 'text'
    }, {});

    console.log(`   Agente: ${msg4.agent}`);
    console.log(`   Handoff? ${msg4.handoffCompleted ? 'SIM ✅' : 'NÃO ❌'}`);
    console.log(`   Resposta: "${msg4.message.substring(0, 60)}..."\n`);

    // RESUMO
    console.log('='.repeat(60));
    console.log('📊 RESUMO DO FLUXO:\n');
    console.log('✅ 1. Primeira mensagem enviada pelo SDR');
    console.log(`${msg2.metadata?.botDetected ? '✅' : '❌'} 2. Bot detectado corretamente`);
    console.log(`${msg2.metadata?.bridgeSent ? '✅' : '❌'} 3. Mensagem-ponte enviada`);
    console.log(`${msg3.metadata?.humanVerified ? '✅' : '❌'} 4. Humano verificado com "HUMANO OK"`);
    console.log(`${msg4.handoffCompleted ? '✅' : '❌'} 5. Handoff para Specialist após confirmação`);

    console.log('\n✅ TESTE CONCLUÍDO!');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testBotFlow();

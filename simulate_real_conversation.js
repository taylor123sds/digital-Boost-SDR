/**
 * SIMULAÇÃO DA CONVERSA REAL CORRIGIDA
 * Testa o fluxo como deveria ter acontecido
 */

import structuredFlow from './src/tools/structured_flow_system.js';

async function simulateRealConversation() {
  console.log('🎭 SIMULAÇÃO DA CONVERSA REAL CORRIGIDA\n');

  const contact = '558496791624';
  const profile = {
    name: 'Taylor M Lapenda',
    status: 'Empresário'
  };

  // Limpa estado anterior
  structuredFlow.conversationStates.delete(contact);

  console.log('👤 Cliente: Taylor M Lapenda');
  console.log('📱 Número: 558496791624');
  console.log(''.padEnd(60, '='));

  // MENSAGEM 1: Cliente pergunta o que vocês fazem
  console.log('\n💬 CLIENTE: "Ola orbion, poderia me falar o que vocês fazem?"');

  const result1 = await structuredFlow.processStructuredFlow({
    from: contact,
    text: 'Ola orbion, poderia me falar o que vocês fazem?',
    profile,
    timestamp: Date.now()
  });

  console.log(`📊 Fase: ${result1.current_phase} (${result1.flow_progress?.percentage}%)`);
  console.log(`🤖 ORBION responde:`);
  console.log('─'.padEnd(50, '─'));
  console.log(result1.message);
  console.log('─'.padEnd(50, '─'));

  // MENSAGEM 2: Cliente demonstra interesse
  console.log('\n💬 CLIENTE: "Interessante! Como vocês conseguem esses resultados?"');

  const result2 = await structuredFlow.processStructuredFlow({
    from: contact,
    text: 'Interessante! Como vocês conseguem esses resultados?',
    profile,
    timestamp: Date.now()
  });

  console.log(`📊 Fase: ${result2.current_phase} (${result2.flow_progress?.percentage}%)`);
  console.log(`🤖 ORBION responde:`);
  console.log('─'.padEnd(50, '─'));
  console.log(result2.message);
  console.log('─'.padEnd(50, '─'));

  // MENSAGEM 3: Cliente quer saber mais
  console.log('\n💬 CLIENTE: "Parece muito bom! Me conte mais sobre como funciona"');

  const result3 = await structuredFlow.processStructuredFlow({
    from: contact,
    text: 'Parece muito bom! Me conte mais sobre como funciona',
    profile,
    timestamp: Date.now()
  });

  console.log(`📊 Fase: ${result3.current_phase} (${result3.flow_progress?.percentage}%)`);
  console.log(`🤖 ORBION responde:`);
  console.log('─'.padEnd(50, '─'));
  console.log(result3.message);
  console.log('─'.padEnd(50, '─'));

  // MENSAGEM 4: Cliente quer agendar
  console.log('\n💬 CLIENTE: "Ótimo! Vamos agendar essa demonstração então"');

  const result4 = await structuredFlow.processStructuredFlow({
    from: contact,
    text: 'Ótimo! Vamos agendar essa demonstração então',
    profile,
    timestamp: Date.now()
  });

  console.log(`📊 Fase: ${result4.current_phase} (${result4.flow_progress?.percentage}%)`);
  console.log(`🤖 ORBION responde:`);
  console.log('─'.padEnd(50, '─'));
  console.log(result4.message);
  console.log('─'.padEnd(50, '─'));

  console.log('\n🎯 RESUMO DO FLUXO:');
  console.log(`✅ Pergunta respondida: ${result1.current_phase === 'identification' ? 'SIM' : 'NÃO'}`);
  console.log(`✅ Interesse capturado: ${result2.current_phase === 'business_discovery' ? 'SIM' : 'NÃO'}`);
  console.log(`✅ Solução apresentada: ${result3.current_phase === 'solution_presentation' ? 'SIM' : 'NÃO'}`);
  console.log(`✅ Agendamento iniciado: ${result4.current_phase === 'scheduling' ? 'SIM' : 'NÃO'}`);
  console.log(`📈 Progresso final: ${result4.flow_progress?.percentage}%`);
}

await simulateRealConversation();
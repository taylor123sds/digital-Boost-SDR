// test_audio_digital_boost.js
// Teste completo do fluxo de áudio para perguntas sobre Digital Boost

console.log('🎤 TESTE DE ÁUDIO - DIGITAL BOOST\n');
console.log('═'.repeat(80));

const testContactId = '5584999887766';
const testName = 'Carlos Teste';

async function testChat(message, description) {
  console.log(`\n📨 ${description}`);
  console.log(`   Mensagem: "${message}"`);

  const response = await fetch('http://localhost:3001/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      contactId: testContactId,
      contactName: testName
    })
  });

  const data = await response.json();
  console.log(`   ✅ Resposta:\n   ${data.response.substring(0, 150)}...`);
  console.log(`   📊 Stage: ${data.metadata?.stage || 'unknown'} | Score: ${data.metadata?.score || 0}%`);

  // 🎤 VERIFICAR FLAG DE ÁUDIO
  if (data.sendDigitalBoostAudio) {
    console.log(`   🎤 ✅ FLAG DE ÁUDIO ATIVA - Deve enviar resposta em áudio via TTS`);
  } else {
    console.log(`   📝 Resposta apenas em texto`);
  }

  return data;
}

// Executar teste
(async () => {
  try {
    // Mensagem 1: Primeira interação (não deve ter áudio)
    await testChat('Oi, tudo bem?', 'MENSAGEM 1: Primeira interação (SEM áudio)');

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Mensagem 2: Pergunta sobre o problema (não deve ter áudio)
    await testChat('Meu problema é que perco leads', 'MENSAGEM 2: Problema do cliente (SEM áudio)');

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Mensagem 3: PERGUNTA SOBRE DIGITAL BOOST (DEVE TER ÁUDIO!)
    await testChat('O que a Digital Boost faz?', 'MENSAGEM 3: Pergunta sobre empresa (COM ÁUDIO!)');

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Mensagem 4: PERGUNTA SOBRE SERVIÇOS (DEVE TER ÁUDIO!)
    await testChat('Quais serviços vocês oferecem?', 'MENSAGEM 4: Pergunta sobre serviços (COM ÁUDIO!)');

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Mensagem 5: Interesse em solução (não deve ter áudio)
    await testChat('Tenho interesse, pode me explicar mais?', 'MENSAGEM 5: Demonstração de interesse (PODE TER ÁUDIO!)');

    console.log('\n' + '═'.repeat(80));
    console.log('✅ TESTE DE ÁUDIO DIGITAL BOOST CONCLUÍDO!\n');

    console.log('📋 RESUMO:');
    console.log('- Mensagens 1 e 2: Respostas em texto (sem trigger de áudio)');
    console.log('- Mensagem 3: "O que a Digital Boost faz?" → DEVE ENVIAR ÁUDIO 🎤');
    console.log('- Mensagem 4: "Quais serviços vocês oferecem?" → DEVE ENVIAR ÁUDIO 🎤');
    console.log('- Mensagem 5: "pode me explicar mais?" → PODE ENVIAR ÁUDIO 🎤\n');

  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
})();

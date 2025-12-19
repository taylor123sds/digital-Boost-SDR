// test_detection.js - Teste da detecção de áudio Digital Boost

const testMessages = [
  { msg: 'Oi, tudo bem?', expect: false, desc: 'Saudação simples' },
  { msg: 'Meu problema é que perco leads', expect: false, desc: 'Problema do cliente' },
  { msg: 'O que a Digital Boost faz?', expect: true, desc: 'Pergunta direta sobre DB' },
  { msg: 'Quais serviços vocês oferecem?', expect: true, desc: 'Pergunta sobre serviços' },
  { msg: 'Me explica sobre branding', expect: false, desc: 'Tópico genérico (branding)' },
  { msg: 'Preciso de marketing', expect: false, desc: 'Tópico genérico (marketing)' },
  { msg: 'O que vocês fazem?', expect: true, desc: 'Pergunta sobre empresa' },
  { msg: 'Como funciona?', expect: false, desc: 'Pergunta vaga' },
  { msg: 'Quem são vocês?', expect: true, desc: 'Pergunta sobre identidade' },
  { msg: 'Me fala sobre vocês', expect: true, desc: 'Pergunta sobre empresa' }
];

async function testDetection() {
  const { default: agent } = await import('../src/agent.js');

  console.log('🧪 TESTE DE DETECÇÃO DE ÁUDIO - DIGITAL BOOST\n');
  console.log('═'.repeat(70));

  let passed = 0;
  let failed = 0;

  for (const test of testMessages) {
    try {
      const result = await agent.chatHandler(test.msg, '5584999887766', 'Teste');
      const detected = result.sendDigitalBoostAudio || false;
      const match = detected === test.expect;

      if (match) {
        passed++;
        console.log(`✅ "${test.msg}"`);
        console.log(`   ${test.desc} → Detectado: ${detected} ✓`);
      } else {
        failed++;
        console.log(`❌ "${test.msg}"`);
        console.log(`   ${test.desc}`);
        console.log(`   Esperado: ${test.expect} | Detectado: ${detected} ✗`);
      }

      console.log('');
    } catch (err) {
      failed++;
      console.log(`❌ "${test.msg}" - ERRO: ${err.message}\n`);
    }
  }

  console.log('═'.repeat(70));
  console.log(`\n📊 RESULTADO: ${passed}/${testMessages.length} testes passaram`);

  if (failed === 0) {
    console.log('✅ TODOS OS TESTES PASSARAM!\n');
  } else {
    console.log(`⚠️  ${failed} testes falharam\n`);
    process.exit(1);
  }
}

testDetection().catch(err => {
  console.error('❌ Erro fatal no teste:', err);
  process.exit(1);
});

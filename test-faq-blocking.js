// test-faq-blocking.js
// Testa que respostas ao BANT com keywords de FAQ não são confundidas com perguntas FAQ

import BANTStagesV2 from './src/tools/bant_stages_v2.js';

console.log('🧪 TESTE: FAQ BLOCKING - Respostas ao BANT não devem virar FAQ\n');
console.log('═'.repeat(80));

async function testFAQBlocking() {
  const phoneNumber = '5584999999999';
  const bant = new BANTStagesV2(phoneNumber);

  // ====== CENÁRIO 1: Pergunta BANT sobre consequências ======
  console.log('\n📍 CENÁRIO: ORBION pergunta sobre consequências do problema\n');
  console.log('─'.repeat(80));
  console.log('🤖 ORBION: "Quais consequências vocês têm observado?"');
  console.log('─'.repeat(80));

  // Simular que ORBION fez essa pergunta
  bant.conversationHistory.push({
    role: 'assistant',
    content: 'E quais consequências vocês têm observado devido a essa dificuldade na geração de leads? (perda de clientes, crescimento estagnado, etc.)'
  });

  // ====== TESTE 1: Resposta com keyword "clientes" (deve BLOQUEAR FAQ) ======
  console.log('\n\n[TESTE 1] 👤 LEAD: "Perca de clientes"');
  console.log('─'.repeat(80));
  console.log('🎯 ESPERADO: Tratar como resposta ao BANT (NÃO detectar FAQ de cases)');

  let response = await bant.processMessage('Perca de clientes');

  console.log(`\n✅ RESULTADO:`);
  console.log(`   FAQ Detectada: ${response.faqDetected ? '❌ SIM (ERRO!)' : '✅ NÃO (CORRETO!)'}`);

  if (response.faqDetected) {
    console.log(`   ❌ ERRO: FAQ ${response.faqCategory} foi detectada incorretamente!`);
    console.log(`   📝 Stage: ${response.stage}`);
  } else {
    console.log(`   ✅ CORRETO: Tratado como resposta ao BANT`);
    console.log(`   📝 Stage: ${response.stage}`);
    console.log(`   🤖 ORBION: ${response.message.substring(0, 100)}...`);
  }

  // ====== TESTE 2: Pergunta explícita FAQ (deve ACEITAR FAQ) ======
  console.log('\n\n[TESTE 2] 👤 LEAD: "Vocês têm cases de sucesso?"');
  console.log('─'.repeat(80));
  console.log('🎯 ESPERADO: Detectar FAQ e responder com cases');

  response = await bant.processMessage('Vocês têm cases de sucesso?');

  console.log(`\n✅ RESULTADO:`);
  console.log(`   FAQ Detectada: ${response.faqDetected ? '✅ SIM (CORRETO!)' : '❌ NÃO (ERRO!)'}`);

  if (response.faqDetected) {
    console.log(`   ✅ CORRETO: FAQ ${response.faqCategory} detectada`);
    console.log(`   🤖 ORBION: ${response.message.substring(0, 100)}...`);
  } else {
    console.log(`   ❌ ERRO: FAQ deveria ter sido detectada!`);
  }

  // ====== TESTE 3: Resposta com "resultados" (deve BLOQUEAR FAQ) ======
  console.log('\n\n[TESTE 3] 👤 LEAD: "Resultados ruins em vendas"');
  console.log('─'.repeat(80));
  console.log('🎯 ESPERADO: Tratar como resposta ao BANT (NÃO detectar FAQ de cases)');

  // Simular nova pergunta BANT
  bant.conversationHistory.push({
    role: 'assistant',
    content: 'Entendo. E como isso afeta o negócio?'
  });

  response = await bant.processMessage('Resultados ruins em vendas');

  console.log(`\n✅ RESULTADO:`);
  console.log(`   FAQ Detectada: ${response.faqDetected ? '❌ SIM (ERRO!)' : '✅ NÃO (CORRETO!)'}`);

  if (response.faqDetected) {
    console.log(`   ❌ ERRO: FAQ ${response.faqCategory} foi detectada incorretamente!`);
  } else {
    console.log(`   ✅ CORRETO: Tratado como resposta ao BANT`);
  }

  // ====== TESTE 4: Pergunta começando com palavra interrogativa (deve ACEITAR FAQ) ======
  console.log('\n\n[TESTE 4] 👤 LEAD: "Quais resultados vocês têm?"');
  console.log('─'.repeat(80));
  console.log('🎯 ESPERADO: Detectar FAQ (começa com "Quais")');

  response = await bant.processMessage('Quais resultados vocês têm?');

  console.log(`\n✅ RESULTADO:`);
  console.log(`   FAQ Detectada: ${response.faqDetected ? '✅ SIM (CORRETO!)' : '❌ NÃO (ERRO!)'}`);

  if (response.faqDetected) {
    console.log(`   ✅ CORRETO: FAQ ${response.faqCategory} detectada`);
  } else {
    console.log(`   ❌ ERRO: Pergunta explícita deveria detectar FAQ!`);
  }

  console.log('\n\n' + '═'.repeat(80));
  console.log('📊 RESUMO DOS TESTES\n');

  console.log('✅ TESTES ESPERADOS:');
  console.log('   1. ❌ "Perca de clientes" → NÃO detecta FAQ (resposta ao BANT)');
  console.log('   2. ✅ "Vocês têm cases de sucesso?" → DETECTA FAQ (pergunta explícita)');
  console.log('   3. ❌ "Resultados ruins em vendas" → NÃO detecta FAQ (resposta ao BANT)');
  console.log('   4. ✅ "Quais resultados vocês têm?" → DETECTA FAQ (começa com palavra interrogativa)');

  console.log('\n🎯 LÓGICA IMPLEMENTADA:');
  console.log('   • FAQ aceita se: pergunta explícita (? ou palavra interrogativa)');
  console.log('   • FAQ bloqueada se: ORBION fez pergunta E lead respondeu sem pergunta explícita');
}

// Executar teste
testFAQBlocking()
  .then(() => {
    console.log('\n✅ TESTE CONCLUÍDO\n');
  })
  .catch(error => {
    console.error('\n❌ ERRO NO TESTE:', error);
    console.error(error.stack);
  });

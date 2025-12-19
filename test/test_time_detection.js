// test_time_detection.js
// Teste de detecção de bot por tempo de resposta

import webhookHandler from '../src/handlers/webhook_handler.js';

console.log('🧪 TESTE DE DETECÇÃO POR TEMPO\n');
console.log('═'.repeat(80));

const testContactId = '5584999999999'; // Número de teste

// CENÁRIO 1: Simular envio de mensagem (ORBION envia)
console.log('\n📤 CENÁRIO 1: ORBION envia mensagem para o contato');
console.log(`   Contato: ${testContactId}`);
webhookHandler.trackOutgoingMessage(testContactId);
console.log('   ✅ Timestamp registrado\n');

// CENÁRIO 2: Resposta INSTANTÂNEA (<2s) - DEVE DETECTAR BOT
console.log('📥 CENÁRIO 2: Resposta INSTANTÂNEA (500ms depois)');
setTimeout(() => {
  console.log(`   Contato ${testContactId} responde...`);
  const result = webhookHandler.checkResponseTime(testContactId);
  console.log(`   ⏱️  Tempo de resposta: ${result.responseTime}ms`);
  console.log(`   🤖 É bot? ${result.isBot ? 'SIM ✅' : 'NÃO ❌'}`);

  if (result.isBot) {
    console.log('   ✅ PASSOU: Bot detectado corretamente por tempo\n');
  } else {
    console.log('   ❌ FALHOU: Bot NÃO foi detectado\n');
  }

  // CENÁRIO 3: Registrar novo envio
  console.log('═'.repeat(80));
  console.log('\n📤 CENÁRIO 3: ORBION envia outra mensagem');
  webhookHandler.trackOutgoingMessage(testContactId);
  console.log('   ✅ Novo timestamp registrado\n');

  // CENÁRIO 4: Resposta NORMAL (3s depois) - NÃO DEVE DETECTAR BOT
  console.log('📥 CENÁRIO 4: Resposta NORMAL (3000ms depois)');
  setTimeout(() => {
    console.log(`   Contato ${testContactId} responde...`);
    const result2 = webhookHandler.checkResponseTime(testContactId);
    console.log(`   ⏱️  Tempo de resposta: ${result2.responseTime}ms`);
    console.log(`   🤖 É bot? ${result2.isBot ? 'SIM ❌' : 'NÃO ✅'}`);

    if (!result2.isBot) {
      console.log('   ✅ PASSOU: Humano identificado corretamente\n');
    } else {
      console.log('   ❌ FALHOU: Humano foi detectado como bot\n');
    }

    // CENÁRIO 5: Sem histórico de envio
    console.log('═'.repeat(80));
    console.log('\n📥 CENÁRIO 5: Mensagem de contato SEM histórico de envio');
    const newContact = '5584888888888';
    const result3 = webhookHandler.checkResponseTime(newContact);
    console.log(`   Contato: ${newContact}`);
    console.log(`   ⏱️  Tempo de resposta: ${result3.responseTime || 'N/A'}`);
    console.log(`   🤖 É bot? ${result3.isBot ? 'SIM ❌' : 'NÃO ✅'}`);

    if (!result3.isBot) {
      console.log('   ✅ PASSOU: Primeira mensagem não é detectada como bot\n');
    } else {
      console.log('   ❌ FALHOU: Primeira mensagem foi detectada como bot\n');
    }

    console.log('═'.repeat(80));
    console.log('\n✅ TESTES DE TEMPO CONCLUÍDOS!\n');

  }, 3000); // 3 segundos

}, 500); // 500ms

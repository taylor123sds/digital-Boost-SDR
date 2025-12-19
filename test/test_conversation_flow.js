// test_conversation_flow.js
// Teste completo de fluxo de conversa após primeira mensagem

const testContactId = '5511999888777';
const testName = 'Pedro Silva';

console.log('🧪 TESTE DE FLUXO DE CONVERSA COMPLETO\n');
console.log('═'.repeat(80));

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
  console.log(`   ✅ Resposta:\n${data.reply}\n`);
  console.log(`   📊 Stage: ${data.conversationStage} | Score: ${data.qualificationScore}%`);

  return data;
}

// Executar teste
(async () => {
  try {
    // Mensagem 1: Primeira interação
    await testChat('Oi', 'MENSAGEM 1: Primeira interação (deve usar nova apresentação)');

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Mensagem 2: Resposta positiva
    await testChat('Sim, isso acontece aqui', 'MENSAGEM 2: Confirmação do problema');

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Mensagem 3: Interesse
    await testChat('Como funciona?', 'MENSAGEM 3: Demonstração de interesse');

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Mensagem 4: Qualificação
    await testChat('Somos uma loja de roupas', 'MENSAGEM 4: Informação sobre negócio');

    console.log('\n' + '═'.repeat(80));
    console.log('✅ TESTE DE FLUXO COMPLETO CONCLUÍDO!\n');

  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
})();

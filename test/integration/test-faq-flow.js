// test-faq-flow.js
// Simula fluxo completo: BANT → FAQ → Retorno ao BANT

import BANTStagesV2 from './src/tools/bant_stages_v2.js';

console.log('🎭 SIMULAÇÃO DE FLUXO: BANT → FAQ → RETORNO\n');
console.log('═'.repeat(80));

async function simulateConversation() {
  const phoneNumber = '5584999999999';
  const bant = new BANTStagesV2(phoneNumber);

  console.log('\n📍 CENÁRIO: Lead inicia conversa, ORBION pergunta sobre problema\n');

  // ====== MENSAGEM 1: Lead inicia ======
  console.log('─'.repeat(80));
  console.log('👤 LEAD: "Oi, queria saber mais sobre automação"');
  console.log('─'.repeat(80));

  let response = await bant.processMessage('Oi, queria saber mais sobre automação');

  console.log(`\n🤖 ORBION:\n${response.message}\n`);
  console.log(`📊 Stage Atual: ${response.stage}`);
  console.log(`📝 FAQ Detectada: ${response.faqDetected ? 'SIM' : 'NÃO'}`);

  // ====== MENSAGEM 2: Lead interrompe com FAQ ======
  console.log('\n' + '─'.repeat(80));
  console.log('👤 LEAD: "O que é a Digital Boost?"');
  console.log('─'.repeat(80));

  response = await bant.processMessage('O que é a Digital Boost?');

  console.log(`\n🤖 ORBION:\n${response.message}\n`);
  console.log(`📊 Stage Atual: ${response.stage}`);
  console.log(`📝 FAQ Detectada: ${response.faqDetected ? '✅ SIM' : '❌ NÃO'}`);

  if (response.faqDetected) {
    console.log(`📂 Categoria FAQ: ${response.faqCategory}`);
  }

  // ====== MENSAGEM 3: Lead responde a pergunta do FAQ ======
  console.log('\n' + '─'.repeat(80));
  console.log('👤 LEAD: "Nosso principal desafio é gerar mais leads"');
  console.log('─'.repeat(80));

  response = await bant.processMessage('Nosso principal desafio é gerar mais leads');

  console.log(`\n🤖 ORBION:\n${response.message}\n`);
  console.log(`📊 Stage Atual: ${response.stage}`);
  console.log(`📝 FAQ Detectada: ${response.faqDetected ? 'SIM' : 'NÃO'}`);

  console.log('\n📈 DADOS COLETADOS NO NEED:');
  console.log(JSON.stringify(response.stageData.need?.campos || {}, null, 2));

  // ====== MENSAGEM 4: Outra pergunta FAQ ======
  console.log('\n' + '─'.repeat(80));
  console.log('👤 LEAD: "Quanto custa?"');
  console.log('─'.repeat(80));

  response = await bant.processMessage('Quanto custa?');

  console.log(`\n🤖 ORBION:\n${response.message}\n`);
  console.log(`📊 Stage Atual: ${response.stage}`);
  console.log(`📝 FAQ Detectada: ${response.faqDetected ? '✅ SIM' : '❌ NÃO'}`);

  if (response.faqDetected) {
    console.log(`📂 Categoria FAQ: ${response.faqCategory}`);
  }

  // ====== MENSAGEM 5: Lead continua respondendo BANT ======
  console.log('\n' + '─'.repeat(80));
  console.log('👤 LEAD: "É bem crítico, estamos perdendo vendas"');
  console.log('─'.repeat(80));

  response = await bant.processMessage('É bem crítico, estamos perdendo vendas');

  console.log(`\n🤖 ORBION:\n${response.message}\n`);
  console.log(`📊 Stage Atual: ${response.stage}`);
  console.log(`📝 Campos Coletados: ${Object.keys(response.stageData.need?.campos || {}).length}/5`);

  console.log('\n\n' + '═'.repeat(80));
  console.log('✅ ANÁLISE DO FLUXO\n');

  console.log('🎯 COMPORTAMENTO ESPERADO:');
  console.log('   1. ✅ Detecta FAQ "O que é a Digital Boost?"');
  console.log('   2. ✅ Responde com informações da empresa');
  console.log('   3. ✅ Termina com pergunta BANT');
  console.log('   4. ✅ Continua coletando dados do stage NEED');
  console.log('   5. ✅ Detecta FAQ "Quanto custa?"');
  console.log('   6. ✅ Responde valores mas redireciona para qualificação');
  console.log('   7. ✅ Retorna ao fluxo BANT normalmente');

  console.log('\n📊 ESTADO FINAL:');
  console.log(`   Stage: ${response.stage}`);
  console.log(`   Completo: ${response.isComplete ? 'SIM' : 'NÃO'}`);
  console.log(`   Campos NEED: ${Object.keys(response.stageData.need?.campos || {}).length}/5`);
}

// Executar simulação
simulateConversation()
  .then(() => {
    console.log('\n✅ SIMULAÇÃO CONCLUÍDA\n');
  })
  .catch(error => {
    console.error('\n❌ ERRO NA SIMULAÇÃO:', error);
    console.error(error.stack);
  });

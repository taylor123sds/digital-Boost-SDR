// test_campaign_message.js - Teste direto do generatePersonalizedMessage

import { generatePersonalizedMessage } from '../src/tools/campaign_manager.js';

console.log('🧪 TESTE: Gerando mensagem de campanha\n');
console.log('═'.repeat(80));

const testLead = {
  name: 'ReiDecor',
  nome: 'ReiDecor',
  phone: '5584999999999'
};

// Testa os 5 templates
for (let i = 0; i < 5; i++) {
  console.log(`\n📧 TEMPLATE ${i + 1}:`);
  console.log('─'.repeat(80));

  const message = generatePersonalizedMessage(testLead, null, i);
  console.log(message);
  console.log('─'.repeat(80));

  // Verificar se contém os elementos necessários
  const checks = {
    'Sebrae': /Sebrae/i.test(message),
    'Expert Turismo': /Expert Turismo/i.test(message),
    'Clínica Pedro Cavalcanti': /Clínica Pedro Cavalcanti/i.test(message) || /Pedro Cavalcanti/i.test(message),
    'BRC Lightning': /BRC Lightning/i.test(message),
    'Pergunta consultiva': /\?/i.test(message),
    'Opt-out': /(SAIR|PARAR|NÃO|REMOVER|STOP)/i.test(message)
  };

  console.log('\n✅ Checklist:');
  for (const [check, passed] of Object.entries(checks)) {
    console.log(`   ${passed ? '✓' : '✗'} ${check}`);
  }

  const allPassed = Object.values(checks).every(v => v);
  console.log(`\n${allPassed ? '✅ TEMPLATE OK' : '❌ TEMPLATE COM PROBLEMAS'}`);
}

console.log('\n' + '═'.repeat(80));
console.log('\n🎯 TODOS OS TEMPLATES TESTADOS\n');

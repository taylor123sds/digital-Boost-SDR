// test_opt_out_fix.js - Teste da correção do sistema de opt-out

import { classifyOptOutIntent } from '../src/tools/intelligent_opt_out.js';

console.log('🧪 TESTE DE CORREÇÃO DO SISTEMA DE OPT-OUT\n');
console.log('═'.repeat(80));
console.log('Objetivo: Verificar se mensagens com "parar" + razão temporária');
console.log('são classificadas como PAUSA TEMPORÁRIA, não opt-out definitivo\n');
console.log('═'.repeat(80) + '\n');

const testCases = [
  {
    message: 'Ainda não, quero definir isso ainda, podemos parar nosso contato por enquanto, tenho que ir buscar meu filho no hospital',
    expectedType: 'temporary_pause_with_reason',
    expectedAction: 'reschedule',
    description: 'Caso real - parar por enquanto com razão (hospital)'
  },
  {
    message: 'podemos parar por enquanto',
    expectedType: 'temporary_pause_with_reason',
    expectedAction: 'reschedule',
    description: 'Pausa temporária explícita'
  },
  {
    message: 'tenho que parar agora, vou para o médico',
    expectedType: 'temporary_pause_with_reason',
    expectedAction: 'reschedule',
    description: 'Parar com razão urgente (médico)'
  },
  {
    message: 'parar de vez, não quero mais',
    expectedType: 'definitive_opt_out',
    expectedAction: 'remove_immediately',
    description: 'Opt-out definitivo real (parar de vez)'
  },
  {
    message: 'pare de me enviar mensagens',
    expectedType: 'definitive_opt_out',
    expectedAction: 'remove_immediately',
    description: 'Opt-out definitivo real (comando direto)'
  },
  {
    message: 'não quero mais receber suas mensagens',
    expectedType: 'definitive_opt_out',
    expectedAction: 'remove_immediately',
    description: 'Opt-out definitivo real (recusa clara)'
  },
  {
    message: 'parar agora, tenho compromisso',
    expectedType: 'temporary_pause_with_reason',
    expectedAction: 'reschedule',
    description: 'Parar com razão (compromisso)'
  },
  {
    message: 'agora não, estou ocupado',
    expectedType: 'temporary_refusal',
    expectedAction: 'reschedule',
    description: 'Recusa temporária sem palavra "parar"'
  }
];

let passed = 0;
let failed = 0;

testCases.forEach((test, index) => {
  console.log(`\n${index + 1}. ${test.description}`);
  console.log(`   Mensagem: "${test.message}"`);
  console.log('   ' + '─'.repeat(76));

  const result = classifyOptOutIntent(test.message, '5584999999999');

  const typeMatch = result.type === test.expectedType;
  const actionMatch = result.action === test.expectedAction;
  const allMatch = typeMatch && actionMatch;

  if (allMatch) {
    passed++;
    console.log(`   ✅ PASSOU`);
    console.log(`   Tipo: ${result.type}`);
    console.log(`   Ação: ${result.action}`);
    console.log(`   Mensagem: ${result.message}`);
  } else {
    failed++;
    console.log(`   ❌ FALHOU`);
    console.log(`   Esperado - Tipo: ${test.expectedType}, Ação: ${test.expectedAction}`);
    console.log(`   Recebido - Tipo: ${result.type}, Ação: ${result.action}`);
  }
});

console.log('\n' + '═'.repeat(80));
console.log(`\n📊 RESULTADO FINAL: ${passed}/${testCases.length} testes passaram\n`);

if (failed === 0) {
  console.log('✅ TODOS OS TESTES PASSARAM!');
  console.log('\n🎯 CORREÇÃO VALIDADA:');
  console.log('   - Mensagens com "parar por enquanto" + razão → PAUSA TEMPORÁRIA ✓');
  console.log('   - Mensagens com "parar" + hospital/médico/emergência → PAUSA TEMPORÁRIA ✓');
  console.log('   - Opt-outs definitivos reais continuam funcionando corretamente ✓\n');
  process.exit(0);
} else {
  console.log(`⚠️  ${failed} teste(s) falharam\n`);
  process.exit(1);
}

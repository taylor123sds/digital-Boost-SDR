/**
 * TESTE DO SISTEMA DE CAMPANHA COM LEADDATA
 * ✅ Verifica se o handoff direto SDR → Specialist funciona corretamente
 */

import { triggerSDRForPhone } from './src/tools/campaign_trigger.js';

console.log('🧪 TESTE DE CAMPANHA COM LEADDATA (Handoff Direto ao Specialist)\n');
console.log('═'.repeat(80));

// Simular lead de teste da planilha
const testLead = {
  Nome: 'João Silva',
  Empresa: 'Academia PowerFit',
  Segmento: 'Fitness',
  'ICP Fit': 'Alto',
  'Nível de autoridade': 'Decisor'
};

const testPhone = '5584996791624';

console.log('\n📋 DADOS DO LEAD:');
console.log('   Nome:', testLead.Nome);
console.log('   Empresa:', testLead.Empresa);
console.log('   Segmento:', testLead.Segmento);
console.log('   Telefone:', testPhone);

console.log('\n📞 Chamando triggerSDRForPhone() COM leadData...\n');

try {
  const result = await triggerSDRForPhone(testPhone, testLead);

  console.log('\n📊 RESULTADO:\n');
  console.log('  Success:', result.success);
  console.log('  Phone:', result.phone);
  console.log('  Agent:', result.agent);
  console.log('  Handoff Completed:', result.handoffCompleted);
  console.log('  Has Message:', result.message ? 'YES' : 'NO');

  if (result.success && result.message) {
    console.log('\n✅ SUCESSO! Mensagem gerada pelo Specialist Agent:');
    console.log('─'.repeat(80));
    console.log(result.message);
    console.log('─'.repeat(80));

    // Validar estrutura
    const checks = {
      'Agent correto (specialist)': result.agent === 'specialist',
      'Handoff realizado': result.handoffCompleted === true,
      'Mensagem existe': !!result.message,
      'Mensagem não vazia': result.message.length > 100
    };

    console.log('\n✅ VALIDAÇÕES DE ARQUITETURA:');
    for (const [key, value] of Object.entries(checks)) {
      console.log(`   ${value ? '✅' : '❌'} ${key}`);
    }

    const allPassed = Object.values(checks).every(v => v);
    console.log(`\n${allPassed ? '✅ SISTEMA DE CAMPANHA FUNCIONANDO PERFEITAMENTE!' : '❌ ALGUMA VALIDAÇÃO FALHOU'}`);

  } else if (!result.success) {
    console.log(`\n❌ FALHOU: ${result.error}`);
  } else {
    console.log('\n⚠️  Specialist não retornou mensagem');
  }

  console.log('\n' + '═'.repeat(80));

} catch (error) {
  console.error('\n❌ ERRO:', error.message);
  console.error(error.stack);
}

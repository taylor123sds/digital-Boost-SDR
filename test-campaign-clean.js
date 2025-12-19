import { triggerSDRForPhone } from './src/tools/campaign_trigger.js';

console.log('🧪 TESTE DE CAMPANHA COM BANCO LIMPO\n');
console.log('═'.repeat(80));

const testPhone = '5584996791624';

console.log('📞 Chamando triggerSDRForPhone()...\n');

try {
  const result = await triggerSDRForPhone(testPhone);

  console.log('\n📊 RESULTADO:\n');
  console.log('  Success:', result.success);
  console.log('  Phone:', result.phone);
  console.log('  Has Message:', result.message ? 'YES' : 'NO');

  if (result.success && result.message) {
    console.log('\n✅ SUCESSO! Mensagem gerada pelo SDR Agent:');
    console.log('─'.repeat(80));
    console.log(result.message);
    console.log('─'.repeat(80));

    // Validar estrutura
    const checks = {
      'ORBION': result.message.includes('ORBION'),
      'Digital Boost': result.message.includes('Digital Boost'),
      'SEBRAE': result.message.includes('SEBRAE') || result.message.includes('Sebrae'),
      'Insight': result.message.includes('Você sabia'),
      'Opt-out': result.message.toLowerCase().includes('remov'),
      'Coleta dados': result.message.includes('Qual seu nome')
    };

    console.log('\n✅ VALIDAÇÕES:');
    for (const [key, value] of Object.entries(checks)) {
      console.log(`   ${value ? '✅' : '❌'} ${key}`);
    }

    const allPassed = Object.values(checks).every(v => v);
    console.log(`\n${allPassed ? '✅ SISTEMA FUNCIONANDO PERFEITAMENTE!' : '❌ ALGUMA VALIDAÇÃO FALHOU'}`);

  } else if (!result.success) {
    console.log(`\n❌ FALHOU: ${result.error}`);
  } else {
    console.log('\n⚠️  SDR não retornou mensagem');
  }

  console.log('\n' + '═'.repeat(80));

} catch (error) {
  console.error('\n❌ ERRO:', error.message);
  console.error(error.stack);
}

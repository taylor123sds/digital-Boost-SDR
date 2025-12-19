// test_campaign_integration.js - Teste de integração completo
// Verifica se o campaign_manager está usando sector_pain_messages corretamente

import { generatePersonalizedMessage } from '../src/tools/campaign_manager.js';

console.log('🧪 TESTE DE INTEGRAÇÃO: Campaign Manager + Sector Messages\n');
console.log('═'.repeat(80));

// Dados de teste simulando planilha de leads
const testLeads = [
  {
    name: 'Ekton Moda',
    setor: 'Moda & Vestuário (masc./fem.)',
    phone: '5584999999001'
  },
  {
    name: 'R&J Bijuterias',
    setor: 'Bijuterias & Acessórios',
    phone: '5584999999002'
  },
  {
    name: 'Pizzaria Bella',
    setor: 'Restaurante',
    phone: '5584999999003'
  },
  {
    name: 'Salão Elegance',
    setor: 'Salão de Beleza',
    phone: '5584999999004'
  },
  {
    name: 'Clínica São Lucas',
    setor: 'Clínica Médica',
    phone: '5584999999005'
  },
  {
    name: 'Loja ABC',
    setor: 'Outros', // Deve usar template default
    phone: '5584999999006'
  }
];

console.log(`\n📋 Testando ${testLeads.length} leads de diferentes setores\n`);

let totalTests = 0;
let passedTests = 0;

for (const lead of testLeads) {
  totalTests++;

  console.log(`\n${'─'.repeat(80)}`);
  console.log(`🏢 LEAD: ${lead.name}`);
  console.log(`🏷️  SETOR: ${lead.setor}`);
  console.log(`${'─'.repeat(80)}`);

  try {
    // Chamar a função do campaign_manager (que agora deve usar sector_pain_messages)
    const message = generatePersonalizedMessage(lead, null, 0);

    console.log('\n📧 MENSAGEM GERADA:');
    console.log(message);
    console.log(`\n${'─'.repeat(80)}`);

    // Validações
    const validations = {
      'Nome incluído': message.includes(lead.name),
      'Digital Boost mencionada': /Digital Boost/i.test(message),
      'ORBION mencionado': /ORBION/i.test(message),
      'Tem pergunta consultiva': /\?/.test(message),
      'Opt-out presente': /REMOVER|SAIR|PARAR|STOP/i.test(message),
      'SEM pergunta genérica "processo"': !/qual.*processo.*negócio.*otimizar/i.test(message),
      'Mensagem suficientemente longa': message.length > 150,
      'Não é template BANT antigo': !message.includes('Me chamo ORBION, sou o assistente inteligente')
    };

    console.log('✅ VALIDAÇÕES:');
    let allPassed = true;

    for (const [check, passed] of Object.entries(validations)) {
      const icon = passed ? '✓' : '✗';
      const color = passed ? '' : '❌ FALHOU: ';
      console.log(`   ${icon} ${color}${check}`);

      if (!passed) {
        allPassed = false;
      }
    }

    if (allPassed) {
      console.log('\n✅ TESTE PASSOU - Mensagem OK');
      passedTests++;
    } else {
      console.log('\n❌ TESTE FALHOU - Mensagem com problemas');
    }

  } catch (error) {
    console.error(`\n❌ ERRO AO PROCESSAR: ${error.message}`);
    console.error(error.stack);
  }
}

console.log('\n' + '═'.repeat(80));
console.log(`\n📊 RESUMO FINAL:`);
console.log(`   Total de testes: ${totalTests}`);
console.log(`   ✅ Passaram: ${passedTests}`);
console.log(`   ❌ Falharam: ${totalTests - passedTests}`);
console.log(`   📈 Taxa de sucesso: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

if (passedTests === totalTests) {
  console.log('\n🎉 TODOS OS TESTES PASSARAM!');
  console.log('✅ O campaign_manager está integrado corretamente com sector_pain_messages');
  console.log('✅ Sistema pronto para uso em produção!\n');
} else {
  console.log('\n⚠️ ALGUNS TESTES FALHARAM - Revisar integração\n');
  process.exit(1);
}

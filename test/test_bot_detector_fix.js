// test_bot_detector_fix.js
// Testa se o bot detector agora detecta a mensagem de ausência automática do Observatório do Café

import { analyzeBotSignals } from '../src/utils/bot_detector.js';

// Mensagem que FALHOU em detectar como bot
const failedMessage = `Agradecemos sua mensagem. Não estamos disponíveis no momento, mas responderemos assim que possível.
Atenciosamente
Equipe Observatório do Café`;

console.log('🧪 TESTE: Bot Detector Fix - Mensagem de Ausência Automática\n');
console.log('=' .repeat(80));
console.log('\n📝 Mensagem a ser testada:');
console.log(failedMessage);
console.log('\n' + '=' .repeat(80));

const result = analyzeBotSignals(failedMessage);

console.log('\n📊 RESULTADO DA ANÁLISE:\n');
console.log(`Total de sinais detectados: ${result.signalCount}`);
console.log(`É bot?: ${result.isBot ? '✅ SIM (CORRETO!)' : '❌ NÃO (FALHOU!)'}`);
console.log(`\nSinais detectados: [${result.signals.join(', ')}]`);
console.log(`\nDetalhes:`);
console.log(`  - Menu: ${result.details.hasMenu ? 'SIM' : 'NÃO'}`);
console.log(`  - Assinatura auto-resposta: ${result.details.hasSignature ? 'SIM' : 'NÃO'}`);
console.log(`  - Protocolo/código: ${result.details.hasProtocol ? 'SIM' : 'NÃO'}`);
console.log(`  - Frase clássica de bot: ${result.details.hasClassicPhrase ? 'SIM' : 'NÃO'} (${result.details.classicPhraseCount} frases)`);

console.log('\n' + '=' .repeat(80));

if (result.isBot) {
  console.log('\n✅ TESTE PASSOU! A mensagem foi corretamente identificada como bot.');
  console.log('🎉 Fix aplicado com sucesso - ORBION não responderá mais a mensagens de ausência automática.');
} else {
  console.log('\n❌ TESTE FALHOU! A mensagem ainda não foi detectada como bot.');
  console.log('⚠️  Fix precisa de ajustes - a mensagem deveria ter pelo menos 2 sinais.');
}

console.log('\n');

// Testar outras variações comuns de mensagens de ausência
console.log('🧪 TESTE ADICIONAL: Variações de mensagens de ausência\n');
console.log('=' .repeat(80));

const variations = [
  {
    name: 'Ausência com "responderemos em breve"',
    message: 'Recebemos sua mensagem. Não estamos disponíveis agora, mas responderemos em breve.\nAtenciosamente\nTime de Suporte'
  },
  {
    name: 'Ausência com "responderemos logo"',
    message: 'Obrigado pelo contato! Nao estamos disponiveis no momento, mas responderemos logo.'
  },
  {
    name: 'Mensagem humana normal (não deve detectar como bot)',
    message: 'Olá! Tudo bem? Sim, tenho interesse em conhecer mais sobre os serviços. Quando podemos conversar?'
  }
];

variations.forEach((variation, i) => {
  console.log(`\n${i + 1}. ${variation.name}`);
  const testResult = analyzeBotSignals(variation.message);
  console.log(`   É bot?: ${testResult.isBot ? '✅ SIM' : '❌ NÃO'}`);
  console.log(`   Sinais: ${testResult.signalCount}`);
});

console.log('\n' + '=' .repeat(80));
console.log('\n🏁 Testes concluídos!\n');

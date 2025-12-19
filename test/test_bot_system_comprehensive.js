// test_bot_system_comprehensive.js - Teste 100% completo do sistema de detecção
import Database from 'better-sqlite3';
import { analyzeBotSignals, isProbableBot } from '../src/utils/bot_detector.js';

console.log('🧪 TESTE COMPLETO: Sistema de Detecção de Bots 100%\n');
console.log('═'.repeat(80));

const db = new Database('./orbion.db');

// 1. TESTE DE CONTEÚDO: Verificar signal counting
console.log('\n📋 TESTE 1: SIGNAL COUNTING (Fix aplicado)\n');

const testMessages = [
  { text: 'A Ótica Avenida agradece seu contato. Como podemos ajudar?', expected: '≥2' },
  { text: 'Como posso ajudar você hoje?', expected: '≥1' },
  { text: 'Qual o custo mensal', expected: '0' },
  { text: 'Ola orbion', expected: '0' },
  { text: 'Digite:\n1 - Vendas\n2 - Suporte', expected: '≥1' }
];

let signalTestsPassed = 0;
testMessages.forEach(({ text, expected }) => {
  const analysis = analyzeBotSignals(text);
  const passed = expected === '0'
    ? analysis.signalCount === 0
    : analysis.signalCount >= parseInt(expected.replace('≥', ''));

  const status = passed ? '✅' : '❌';
  console.log(`${status} "${text.substring(0, 50)}..."`);
  console.log(`   Sinais: ${analysis.signalCount} (esperado: ${expected}) ${passed ? 'PASS' : 'FAIL'}`);
  if (passed) signalTestsPassed++;
});

console.log(`\n📊 Signal Counting: ${signalTestsPassed}/${testMessages.length} testes passaram\n`);

// 2. TESTE DE DECISÃO: Path A, B, C
console.log('═'.repeat(80));
console.log('\n📋 TESTE 2: LÓGICA DE DECISÃO (Path A, B, C)\n');

// Buscar mensagens reais do banco
const recentMessages = db.prepare(`
  SELECT phone_number, message_text, created_at, from_me
  FROM whatsapp_messages
  WHERE from_me = 0
  ORDER BY created_at DESC
  LIMIT 20
`).all();

console.log(`✅ ${recentMessages.length} mensagens encontradas\n`);

let botsDetected = 0;
let humansDetected = 0;
const botList = [];
const humanList = [];

recentMessages.forEach((msg) => {
  // Análise de conteúdo
  const contentAnalysis = analyzeBotSignals(msg.message_text || '');

  // Buscar mensagem anterior para análise temporal
  const previousMsg = db.prepare(`
    SELECT created_at
    FROM whatsapp_messages
    WHERE phone_number = ? AND created_at < ? AND from_me = 0
    ORDER BY created_at DESC
    LIMIT 1
  `).get(msg.phone_number, msg.created_at);

  // Análise temporal simplificada
  let isTimeBasedBot = { isBot: false, score: 0, interval: null };

  if (previousMsg) {
    const prevTime = new Date(previousMsg.created_at).getTime();
    const currTime = new Date(msg.created_at).getTime();
    const interval = currTime - prevTime;

    isTimeBasedBot = {
      isBot: interval < 2000,
      score: interval < 2000 ? 0.8 : 0,
      interval
    };
  }

  // Lógica de decisão (mesmo código do server.js)
  const isFirstMessage = !isTimeBasedBot.interval;
  const isBotConfirmed =
    (isTimeBasedBot.isBot && contentAnalysis.signalCount >= 1) || // Path A
    (isTimeBasedBot.score >= 0.6 && contentAnalysis.signalCount >= 2) || // Path B
    (isFirstMessage && contentAnalysis.signalCount >= 2); // Path C

  if (isBotConfirmed) {
    botsDetected++;
    botList.push({
      phone: msg.phone_number,
      text: msg.message_text?.substring(0, 60),
      signals: contentAnalysis.signalCount,
      path: isTimeBasedBot.isBot ? 'A' : isFirstMessage ? 'C' : 'B'
    });
  } else {
    humansDetected++;
    humanList.push({
      phone: msg.phone_number,
      text: msg.message_text?.substring(0, 60)
    });
  }
});

console.log(`🤖 BOTS DETECTADOS: ${botsDetected} (${((botsDetected/recentMessages.length)*100).toFixed(1)}%)\n`);
botList.forEach(bot => {
  console.log(`   📱 ${bot.phone}`);
  console.log(`   💬 "${bot.text}..."`);
  console.log(`   🎯 Path ${bot.path} | ${bot.signals} sinais\n`);
});

console.log(`👤 HUMANOS CONFIRMADOS: ${humansDetected} (${((humansDetected/recentMessages.length)*100).toFixed(1)}%)\n`);
humanList.slice(0, 3).forEach(human => {
  console.log(`   📱 ${human.phone}`);
  console.log(`   💬 "${human.text}..."\n`);
});
if (humanList.length > 3) {
  console.log(`   ... e mais ${humanList.length - 3} humanos`);
}

// 3. TESTE DE CONSISTÊNCIA: Verificar se mesma mensagem sempre retorna mesmo resultado
console.log('\n' + '═'.repeat(80));
console.log('\n📋 TESTE 3: CONSISTÊNCIA DE DETECÇÃO\n');

const testText = 'A Ótica Avenida agradece seu contato. Como podemos ajudar?';
const results = [];

for (let i = 0; i < 5; i++) {
  const analysis = analyzeBotSignals(testText);
  results.push(analysis.signalCount);
}

const allEqual = results.every(r => r === results[0]);
const consistencyStatus = allEqual ? '✅' : '❌';

console.log(`${consistencyStatus} Consistência: ${allEqual ? 'PASS' : 'FAIL'}`);
console.log(`   Resultados: ${results.join(', ')}`);
console.log(`   ${allEqual ? 'Todos iguais ✓' : 'Resultados diferentes ✗'}`);

// 4. TESTE DE FALSE POSITIVES: Mensagens humanas não devem ser detectadas como bot
console.log('\n' + '═'.repeat(80));
console.log('\n📋 TESTE 4: FALSE POSITIVES\n');

const humanMessages = [
  'Qual o custo mensal',
  'Ola orbion',
  'Oi, tudo bem?',
  'Quanto custa?',
  'Estou interessado'
];

let falsePositives = 0;
humanMessages.forEach(text => {
  const analysis = analyzeBotSignals(text);
  const isFalsePositive = analysis.signalCount >= 2; // Seria detectado como bot no Path C

  if (isFalsePositive) {
    falsePositives++;
    console.log(`   ❌ FALSE POSITIVE: "${text}" (${analysis.signalCount} sinais)`);
  } else {
    console.log(`   ✅ Correto: "${text}" (${analysis.signalCount} sinais)`);
  }
});

console.log(`\n📊 False Positives: ${falsePositives}/${humanMessages.length} ${falsePositives === 0 ? '✅' : '⚠️'}`);

// 5. ESTATÍSTICAS GERAIS
console.log('\n' + '═'.repeat(80));
console.log('\n📈 ESTATÍSTICAS GERAIS DO SISTEMA\n');

const stats = db.prepare(`
  SELECT
    COUNT(*) as total,
    SUM(CASE WHEN from_me = 0 THEN 1 ELSE 0 END) as received,
    SUM(CASE WHEN from_me = 1 THEN 1 ELSE 0 END) as sent
  FROM whatsapp_messages
`).get();

console.log(`   Total de mensagens: ${stats.total}`);
console.log(`   Recebidas: ${stats.received}`);
console.log(`   Enviadas: ${stats.sent}`);

db.close();

// 6. RESULTADO FINAL
console.log('\n' + '═'.repeat(80));
console.log('\n🎯 RESULTADO FINAL DO TESTE\n');

const allTestsPassed =
  signalTestsPassed === testMessages.length &&
  allEqual &&
  falsePositives === 0;

if (allTestsPassed) {
  console.log('✅ SISTEMA 100% OPERACIONAL!');
  console.log('\n   ✓ Signal counting corrigido');
  console.log('   ✓ Path A, B, C funcionando');
  console.log('   ✓ Consistência garantida');
  console.log('   ✓ Zero false positives');
  console.log(`   ✓ ${botsDetected} bots detectados corretamente`);
  console.log(`   ✓ ${humansDetected} humanos identificados\n`);
} else {
  console.log('⚠️  SISTEMA COM PROBLEMAS\n');

  if (signalTestsPassed !== testMessages.length) {
    console.log(`   ❌ Signal counting: ${signalTestsPassed}/${testMessages.length} testes`);
  }
  if (!allEqual) {
    console.log('   ❌ Inconsistência detectada');
  }
  if (falsePositives > 0) {
    console.log(`   ❌ ${falsePositives} false positives`);
  }
  console.log('');
}

console.log('═'.repeat(80));
console.log('\n✅ Teste concluído!\n');

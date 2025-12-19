// test_response_time_detection.js
// Teste da detecção por tempo de resposta

import messageTimingStore from '../src/utils/message_timing_store.js';
import { trackMessageTiming } from '../src/utils/bot_detector.js';

console.log('🧪 TESTE: Detecção por Tempo de Resposta\n');

const testContact = '5584999999999';

// Simular fluxo real
console.log('1️⃣ ORBION envia mensagem...');
messageTimingStore.recordOutgoingMessage(testContact);

// Simular resposta RÁPIDA (bot)
setTimeout(() => {
  console.log('\n2️⃣ Contato responde RÁPIDO (500ms - provável BOT)...');
  const result = trackMessageTiming(testContact, 'Obrigado pela mensagem, responderemos em breve');

  console.log('\n📊 RESULTADO:');
  console.log(`   Total Score: ${(result.totalScore * 100).toFixed(1)}%`);
  console.log(`   Risk Level: ${result.riskLevel}`);
  console.log(`   Action: ${result.action}`);
  console.log(`\n   Breakdown:`);
  console.log(`   - Frequency: ${(result.breakdown.frequency * 100).toFixed(0)}%`);
  console.log(`   - Pattern: ${(result.breakdown.pattern * 100).toFixed(0)}%`);
  console.log(`   - Entropy: ${(result.breakdown.entropy * 100).toFixed(0)}%`);
  console.log(`   - Content: ${(result.breakdown.content * 100).toFixed(0)}%`);
  console.log(`   - Circuit: ${(result.breakdown.circuit * 100).toFixed(0)}%`);

  if (result.breakdown.responseTime !== undefined) {
    console.log(`   - Response Time: ${(result.breakdown.responseTime * 100).toFixed(0)}%`);
    console.log('\n✅ Detecção por tempo FUNCIONANDO!');
  } else {
    console.log('\n❌ Detecção por tempo NÃO funcionou!');
  }

  // Teste 2: Resposta NORMAL (humano)
  console.log('\n\n3️⃣ Novo teste: Resposta NORMAL...');
  const testContact2 = '5584888888888';

  messageTimingStore.recordOutgoingMessage(testContact2);

  setTimeout(() => {
    console.log('4️⃣ Contato responde NORMAL (5s - humano)...');
    const result2 = trackMessageTiming(testContact2, 'Sim, gostaria de saber mais');

    console.log('\n📊 RESULTADO:');
    console.log(`   Total Score: ${(result2.totalScore * 100).toFixed(1)}%`);
    console.log(`   Risk Level: ${result2.riskLevel}`);
    console.log(`   Action: ${result2.action}`);

    if (result2.totalScore < 0.3) {
      console.log('\n✅ Humano NÃO foi bloqueado! Sistema funcionando corretamente.');
    } else {
      console.log('\n⚠️ Humano foi marcado como suspeito!');
    }

    console.log('\n🎯 TESTE COMPLETO!\n');
    process.exit(0);
  }, 5000); // 5 segundos - resposta humana normal

}, 500); // 500ms - resposta muito rápida (bot)

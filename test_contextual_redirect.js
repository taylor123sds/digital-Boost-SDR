// test_contextual_redirect.js
// Script de teste para o sistema de redirecionamento contextual

import { agent } from './src/agent.js';
import fs from 'fs';
import path from 'path';

console.log('🧪 ═══════════════════════════════════════════════════════');
console.log('🧪 TESTE: Sistema de Redirecionamento Contextual');
console.log('🧪 ═══════════════════════════════════════════════════════\n');

// Casos de teste
const testCases = [
  {
    name: 'CLIMA (Weather)',
    file: '/tmp/test_redirect_weather.json',
    expectedCategory: 'weather',
    expectedPattern: /tempo|clima|atendimento|resposta|vendas/i
  },
  {
    name: 'ESPORTES (Sports)',
    file: '/tmp/test_redirect_sports.json',
    expectedCategory: 'sports',
    expectedPattern: /time|performance|vendas|comercial|automatizar/i
  },
  {
    name: 'ALIMENTAÇÃO (Food)',
    file: '/tmp/test_redirect_food.json',
    expectedCategory: 'food',
    expectedPattern: /atendimento|servir|cliente|rápido|leads/i
  },
  {
    name: 'TRÂNSITO (Traffic)',
    file: '/tmp/test_redirect_traffic.json',
    expectedCategory: 'traffic',
    expectedPattern: /trânsito|leads|atendimento|tempo|agente/i
  }
];

async function runTests() {
  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    console.log(`\n📋 TESTE: ${testCase.name}`);
    console.log('━'.repeat(60));

    try {
      // Ler arquivo de teste
      const testData = JSON.parse(fs.readFileSync(testCase.file, 'utf-8'));

      console.log(`📥 INPUT: "${testData.message}"`);
      console.log(`📍 Contato: ${testData.context.fromContact}`);

      // Executar agente
      const startTime = Date.now();
      const result = await agent(testData.message, [], testData.context);
      const duration = Date.now() - startTime;

      console.log(`\n✅ RESPOSTA (${duration}ms):`);
      console.log(`"${result.answer}"`);

      // Validar resposta
      const hasRedirection = testCase.expectedPattern.test(result.answer);

      if (hasRedirection) {
        console.log(`\n✅ VALIDAÇÃO: Redirecionamento detectado!`);
        console.log(`   Padrão encontrado: ${testCase.expectedPattern}`);
        passed++;
      } else {
        console.log(`\n❌ VALIDAÇÃO: Redirecionamento NÃO detectado`);
        console.log(`   Padrão esperado: ${testCase.expectedPattern}`);
        failed++;
      }

      // Verificar estrutura da resposta
      const hasQuestion = result.answer.includes('?');
      const isShort = result.answer.length < 300;

      console.log(`\n📊 MÉTRICAS:`);
      console.log(`   - Tem pergunta de retorno: ${hasQuestion ? '✅' : '❌'}`);
      console.log(`   - Resposta concisa (<300 chars): ${isShort ? '✅' : '❌'}`);
      console.log(`   - Tamanho: ${result.answer.length} caracteres`);

    } catch (error) {
      console.log(`\n❌ ERRO: ${error.message}`);
      failed++;
    }
  }

  // Resumo final
  console.log('\n\n🏁 ═══════════════════════════════════════════════════════');
  console.log('🏁 RESUMO DOS TESTES');
  console.log('🏁 ═══════════════════════════════════════════════════════');
  console.log(`\n✅ Passou: ${passed}/${testCases.length}`);
  console.log(`❌ Falhou: ${failed}/${testCases.length}`);
  console.log(`📊 Taxa de sucesso: ${((passed / testCases.length) * 100).toFixed(1)}%\n`);

  if (passed === testCases.length) {
    console.log('🎉 TODOS OS TESTES PASSARAM! Sistema de redirecionamento funcionando perfeitamente.\n');
  } else {
    console.log('⚠️  Alguns testes falharam. Revise os resultados acima.\n');
  }

  process.exit(failed > 0 ? 1 : 0);
}

// Executar testes
runTests().catch(error => {
  console.error('💥 ERRO FATAL:', error);
  process.exit(1);
});

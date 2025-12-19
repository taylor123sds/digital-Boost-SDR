/**
 * @file test-archetypes-comparison.js
 * @description Testa como CADA ARQUÉTIPO responde à mesma mensagem
 * Mostra a diferença de tom, urgência e conexão
 */

import { DynamicConsultativeEngine } from './src/core/DynamicConsultativeEngine.js';

// Mensagem do lead para testar
const LEAD_MESSAGE = 'Trabalhamos com energia solar aqui em Recife. A maioria dos clientes vem por indicação, mas tem mês que fica bem fraco.';

// Arquétipos para testar
const ARCHETYPES_TO_TEST = ['heroi', 'rebelde', 'cuidador', 'sabio', 'mago', 'amante'];

async function testArchetypeComparison() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║        🎭 TESTE: COMPARAÇÃO DE ARQUÉTIPOS                                    ║');
  console.log('║           Mesma mensagem, respostas diferentes por arquétipo                 ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝');

  console.log('\n📝 MENSAGEM DO LEAD (igual para todos):');
  console.log('┌──────────────────────────────────────────────────────────────────────────────┐');
  console.log(`│ "${LEAD_MESSAGE}"`);
  console.log('└──────────────────────────────────────────────────────────────────────────────┘');

  const results = [];

  for (const archetype of ARCHETYPES_TO_TEST) {
    console.log('\n' + '═'.repeat(80));
    console.log(`🎭 ARQUÉTIPO: ${archetype.toUpperCase()}`);
    console.log('═'.repeat(80));

    // Criar novo engine para cada teste
    const contactId = `arch_test_${archetype}_${Date.now()}`;
    const engine = new DynamicConsultativeEngine(contactId, {
      leadName: 'Carlos',
      empresa: 'Solar Nordeste',
      segmento: 'energia_solar'
    });

    // Forçar arquétipo específico
    engine.setArchetype(archetype);

    // Processar a mesma mensagem
    const result = await engine.processMessage(LEAD_MESSAGE);

    console.log('\n┌──────────────────────────────────────────────────────────────────────────────┐');
    console.log(`│ 🤖 RESPOSTA (${archetype.toUpperCase()}):`);
    console.log('├──────────────────────────────────────────────────────────────────────────────┤');

    if (result.message) {
      const lines = result.message.split('\n');
      for (const line of lines) {
        console.log(`│   ${line}`);
      }
    }
    console.log('└──────────────────────────────────────────────────────────────────────────────┘');

    results.push({
      archetype,
      response: result.message
    });

    // Pausa para rate limiting
    await new Promise(r => setTimeout(r, 2000));
  }

  // Resumo comparativo
  console.log('\n\n' + '═'.repeat(80));
  console.log('📊 COMPARAÇÃO LADO A LADO');
  console.log('═'.repeat(80));

  for (const r of results) {
    console.log(`\n🎭 ${r.archetype.toUpperCase()}:`);
    console.log(`   "${r.response?.substring(0, 150)}..."`);
  }

  console.log('\n' + '═'.repeat(80));
  console.log('✅ TESTE DE ARQUÉTIPOS CONCLUÍDO');
  console.log('═'.repeat(80));
}

testArchetypeComparison().catch(console.error);

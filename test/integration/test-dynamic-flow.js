/**
 * @file test-dynamic-flow.js
 * @description Teste do novo fluxo DINÂMICO - Planner + Writer v4
 * Mostra como o Planner gera INSTRUÇÕES e o Writer cria mensagens LIVRES
 */

import { DynamicConsultativeEngine } from './src/core/DynamicConsultativeEngine.js';

// ═══════════════════════════════════════════════════════════════════════════
// CONVERSA PARA TESTAR O FLUXO DINÂMICO
// ═══════════════════════════════════════════════════════════════════════════

const CONVERSATION = [
  {
    turno: 1,
    leadMessage: 'Oi, aqui é o Carlos da Solar Nordeste. Trabalhamos com energia solar aqui em Recife.',
    esperado: 'Fase SITUATION - Perguntar sobre captação de clientes'
  },
  {
    turno: 2,
    leadMessage: 'A maioria vem por indicação mesmo. Fazemos uns 6-7 projetos por mês quando tá bom.',
    esperado: 'Coletar volume + canal, avançar para PROBLEM'
  },
  {
    turno: 3,
    leadMessage: 'Sim, tem mês que vem bem menos. Quando as indicações param, a gente fica esperando.',
    esperado: 'Fase PROBLEM - Lead verbalizou dor, explorar mais'
  },
  {
    turno: 4,
    leadMessage: 'É complicado. Os custos não param, mas os projetos sim. Já tive que segurar instalador sem ter trabalho pra ele.',
    esperado: 'Fase IMPLICATION - Amplificar impacto financeiro/equipe'
  },
  {
    turno: 5,
    leadMessage: 'Verdade, faz sentido pensar nisso. E quanto custa esse serviço de vocês?',
    esperado: 'Detectar objeção PREÇO, dar range e redirecionar'
  }
];

// ═══════════════════════════════════════════════════════════════════════════
// EXECUÇÃO DO TESTE
// ═══════════════════════════════════════════════════════════════════════════

async function testDynamicFlow() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║           🔄 TESTE DO FLUXO DINÂMICO - Planner + Writer v4                   ║');
  console.log('║                    Mensagens LIVRES seguindo BRIEFING                        ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝');

  const contactId = `dynamic_test_${Date.now()}`;
  const engine = new DynamicConsultativeEngine(contactId, {
    leadName: 'Carlos',
    empresa: 'Solar Nordeste',
    segmento: 'energia_solar',
    cidade: 'Recife',
    estado: 'PE'
  });

  // Configurar arquétipo
  engine.setArchetype('heroi');

  console.log('\n📋 CONFIGURAÇÃO:');
  console.log('   Lead: Carlos - Solar Nordeste (Recife/PE)');
  console.log('   Arquétipo: Herói');
  console.log('   Engine: DynamicConsultativeEngine v4 DINÂMICO');

  for (const turn of CONVERSATION) {
    console.log('\n' + '═'.repeat(80));
    console.log(`📍 TURNO ${turn.turno}`);
    console.log('═'.repeat(80));

    console.log(`\n🎯 ESPERADO: ${turn.esperado}`);

    console.log('\n┌──────────────────────────────────────────────────────────────────────────────┐');
    console.log(`│ 👤 LEAD: "${turn.leadMessage}"`);
    console.log('└──────────────────────────────────────────────────────────────────────────────┘');

    // Processar mensagem
    const result = await engine.processMessage(turn.leadMessage);

    // Mostrar dados coletados
    console.log('\n📊 DADOS BANT COLETADOS:');
    const bant = engine.bantData || {};
    const collected = Object.entries(bant)
      .filter(([k, v]) => v !== null && v !== undefined && v !== '')
      .slice(0, 6);

    if (collected.length > 0) {
      collected.forEach(([k, v]) => console.log(`   • ${k}: ${v}`));
    } else {
      console.log('   (ainda coletando...)');
    }

    // Mostrar fase SPIN
    console.log(`\n🎯 FASE SPIN: ${engine.spin?.currentStage || 'situation'}`);

    // Mostrar resposta do agente
    console.log('\n┌──────────────────────────────────────────────────────────────────────────────┐');
    console.log('│ 🤖 AGENTE ORBION (mensagem DINÂMICA):');
    console.log('├──────────────────────────────────────────────────────────────────────────────┤');

    if (result.message) {
      const lines = result.message.split('\n');
      for (const line of lines) {
        console.log(`│   ${line}`);
      }
    } else {
      console.log('│   [Sem resposta]');
    }
    console.log('└──────────────────────────────────────────────────────────────────────────────┘');

    // Pausa para rate limiting
    await new Promise(r => setTimeout(r, 2500));
  }

  // Resumo final
  console.log('\n\n' + '═'.repeat(80));
  console.log('📊 RESUMO DO FLUXO DINÂMICO');
  console.log('═'.repeat(80));

  console.log('\n✅ O QUE MUDOU COM O v4 DINÂMICO:');
  console.log('   • Planner gera INSTRUÇÕES, não escolhe perguntas prontas');
  console.log('   • Writer CRIA mensagens livremente seguindo o briefing');
  console.log('   • Cada execução gera mensagens DIFERENTES (não templates)');
  console.log('   • Perguntas se adaptam ao contexto específico da conversa');
  console.log('   • Arquétipo influencia o TOM, não o conteúdo fixo');

  console.log('\n📋 DADOS BANT FINAL:');
  const finalBant = engine.bantData || {};
  Object.entries(finalBant)
    .filter(([k, v]) => v !== null && v !== undefined && v !== '')
    .forEach(([k, v]) => console.log(`   • ${k}: ${v}`));

  console.log('\n' + '═'.repeat(80));
  console.log('✅ TESTE DO FLUXO DINÂMICO CONCLUÍDO');
  console.log('═'.repeat(80));
}

testDynamicFlow().catch(console.error);

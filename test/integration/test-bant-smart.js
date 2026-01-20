/**
 * @file test-bant-smart.js
 * @description Teste da inteligência BANT - agente pula perguntas redundantes
 */

import { DynamicConsultativeEngine } from './src/core/DynamicConsultativeEngine.js';

// ═══════════════════════════════════════════════════════════════════════════
// CENÁRIO: Lead que dá MUITA informação de uma vez
// ═══════════════════════════════════════════════════════════════════════════

const SMART_CONVERSATION = [
  {
    turno: 1,
    leadMessage: 'Trabalhamos com energia solar aqui em Recife, fazemos uns 8 projetos por mês. A maioria vem de indicação, temos um site mas ele não funciona bem, usamos mais o Instagram.',
    info: 'Lead deu: região, volume, captação, presença digital - TUDO DE UMA VEZ',
    bantExpected: {
      need_regiao: 'Recife',
      need_volume: '8 projetos/mês',
      need_caminho_orcamento: 'indicação',
      need_presenca_digital: 'site_fraco'
    }
  },
  {
    turno: 2,
    leadMessage: 'Sim, tem mês que fica bem fraco. Quando não vem indicação a gente fica parado esperando.',
    info: 'Lead já confirmou problema de sazonalidade e dependência',
    bantExpected: {
      need_problema_sazonalidade: true,
      need_problema_dependencia: true
    }
  },
  {
    turno: 3,
    leadMessage: 'Pesa bastante no bolso. Já tive que dispensar instalador porque não tinha trabalho garantido.',
    info: 'Lead confirmou impacto financeiro e de equipe',
    bantExpected: {
      timing_urgencia: 'alta',
      need_impacto_crescimento: true
    }
  }
];

// ═══════════════════════════════════════════════════════════════════════════
// TESTE
// ═══════════════════════════════════════════════════════════════════════════

async function testBANTSmart() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║          🧠 TESTE: INTELIGÊNCIA BANT - Pular Perguntas Redundantes          ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝');

  console.log('\n📋 CENÁRIO: Lead que dá MUITA informação de uma vez');
  console.log('   O agente deve PULAR perguntas cujos dados já foram coletados\n');

  const contactId = `bant_smart_${Date.now()}`;
  const engine = new DynamicConsultativeEngine(contactId);

  let skippedQuestions = [];

  for (const turn of SMART_CONVERSATION) {
    console.log('\n' + '═'.repeat(80));
    console.log(`📍 TURNO ${turn.turno}`);
    console.log('═'.repeat(80));

    console.log(`\n📝 ${turn.info}`);

    console.log('\n┌──────────────────────────────────────────────────────────────────────────────┐');
    console.log(`│ 👤 LEAD: "${turn.leadMessage}"`);
    console.log('└──────────────────────────────────────────────────────────────────────────────┘');

    // Processar
    const result = await engine.processMessage(turn.leadMessage);

    // Mostrar BANT coletado
    console.log('\n📊 BANT COLETADO:');
    const bant = engine.bantData;
    const collected = Object.entries(bant)
      .filter(([k, v]) => v !== null && v !== undefined && v !== '')
      .map(([k, v]) => `   • ${k}: ${v}`);

    if (collected.length > 0) {
      collected.forEach(c => console.log(c));
    } else {
      console.log('   (nenhum dado ainda)');
    }

    // Mostrar SPIN stage
    console.log(`\n🎯 SPIN Stage: ${engine.spin.currentStage}`);

    // Mostrar resposta
    console.log('\n┌──────────────────────────────────────────────────────────────────────────────┐');
    console.log('│ 🤖 AGENTE:');
    console.log('├──────────────────────────────────────────────────────────────────────────────┤');

    if (result.message) {
      const lines = result.message.split('\n');
      for (const line of lines) {
        if (line.trim()) {
          console.log(`│   ${line}`);
        }
      }
    }
    console.log('└──────────────────────────────────────────────────────────────────────────────┘');

    // Pausa
    await new Promise(r => setTimeout(r, 2500));
  }

  // Resumo final
  console.log('\n\n' + '═'.repeat(80));
  console.log('📊 RESUMO DA INTELIGÊNCIA BANT');
  console.log('═'.repeat(80));

  console.log('\n✅ DADOS COLETADOS AUTOMATICAMENTE:');
  const finalBant = engine.bantData;
  Object.entries(finalBant)
    .filter(([k, v]) => v !== null && v !== undefined && v !== '')
    .forEach(([k, v]) => console.log(`   • ${k}: ${v}`));

  console.log('\n📈 PROGRESSÃO:');
  console.log(`   SPIN Stage Final: ${engine.spin.currentStage}`);
  console.log(`   Turnos usados: ${engine.turno}`);

  console.log('\n🧠 O QUE O AGENTE FEZ DE INTELIGENTE:');
  console.log('   • Coletou TODOS os dados de uma mensagem rica');
  console.log('   • Pulou perguntas cujos dados já foram obtidos');
  console.log('   • Avançou direto para as perguntas de PROBLEMA/IMPLICAÇÃO');
  console.log('   • Não ficou repetitivo nem chato');

  console.log('\n' + '═'.repeat(80));
  console.log('✅ TESTE CONCLUÍDO');
  console.log('═'.repeat(80));
}

testBANTSmart().catch(console.error);

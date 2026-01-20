/**
 * @file test-sales-techniques.js
 * @description Teste das 4 TÉCNICAS DE VENDA implementadas:
 * 1. TENSÃO (custo da dor) - Problem/Implication
 * 2. DIREÇÃO (próximo passo inevitável) - Need-Payoff
 * 3. ENTREGÁVEL (valor da call) - Closing
 * 4. FECHAMENTO (horário com firmeza) - Closing
 */

import { DynamicConsultativeEngine } from './src/core/DynamicConsultativeEngine.js';

// ═══════════════════════════════════════════════════════════════════════════
// CENÁRIOS PARA TESTAR CADA TÉCNICA
// ═══════════════════════════════════════════════════════════════════════════

const SCENARIOS = [
  {
    fase: 'PROBLEM',
    tecnica: 'TENSÃO - Custo da Dor',
    conversa: [
      { role: 'lead', text: 'Trabalhamos com energia solar aqui em Recife. A maioria vem por indicação.' },
      { role: 'lead', text: 'Sim, tem mês que fica bem fraco. Quando não vem indicação a gente fica parado.' }
    ],
    esperado: 'Quantificação da dor: R$, tempo perdido, oportunidades'
  },
  {
    fase: 'IMPLICATION',
    tecnica: 'TENSÃO - Amplificação do Impacto',
    conversa: [
      { role: 'lead', text: 'Trabalhamos com energia solar aqui em Recife. Fazemos uns 8 projetos por mês.' },
      { role: 'lead', text: 'Sim, tem mês que cai pra 3, 4 projetos só.' },
      { role: 'lead', text: 'Pesa no bolso mesmo. Já tive que dispensar instalador.' }
    ],
    esperado: 'Impacto na equipe, financeiro, crescimento bloqueado'
  },
  {
    fase: 'NEED-PAYOFF',
    tecnica: 'DIREÇÃO - Próximo Passo Inevitável',
    conversa: [
      { role: 'lead', text: 'Trabalhamos com energia solar. Dependemos muito de indicação.' },
      { role: 'lead', text: 'Sim, a variação é grande. Mês forte e mês fraco.' },
      { role: 'lead', text: 'Impacta demais. Custos fixos não param.' },
      { role: 'lead', text: 'Faz sentido mesmo ter algo mais previsível.' }
    ],
    esperado: 'Guiar para solução óbvia, fazer parecer lógico avançar'
  },
  {
    fase: 'CLOSING',
    tecnica: 'ENTREGÁVEL + FECHAMENTO',
    conversa: [
      { role: 'lead', text: 'Trabalhamos com energia solar. Indicação é nossa principal fonte.' },
      { role: 'lead', text: 'Sim, varia muito entre os meses.' },
      { role: 'lead', text: 'Já tive que segurar gente sem trabalho.' },
      { role: 'lead', text: 'Preciso resolver isso, faz sentido.' },
      { role: 'lead', text: 'Quero entender melhor como vocês podem ajudar.' }
    ],
    esperado: 'Valor tangível da call + horário específico (alternativa dupla)'
  }
];

// ═══════════════════════════════════════════════════════════════════════════
// EXECUÇÃO DOS TESTES
// ═══════════════════════════════════════════════════════════════════════════

async function testSalesTechniques() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║     💰 TESTE: 4 TÉCNICAS DE VENDA DO VENDEDOR INTELIGENTE                   ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝');

  for (const scenario of SCENARIOS) {
    console.log('\n' + '═'.repeat(80));
    console.log(`🎯 FASE: ${scenario.fase}`);
    console.log(`💡 TÉCNICA: ${scenario.tecnica}`);
    console.log(`📋 ESPERADO: ${scenario.esperado}`);
    console.log('═'.repeat(80));

    // Criar engine
    const contactId = `sales_test_${scenario.fase.toLowerCase()}_${Date.now()}`;
    const engine = new DynamicConsultativeEngine(contactId, {
      leadName: 'Carlos',
      empresa: 'Solar Nordeste',
      segmento: 'energia_solar'
    });

    // Simular conversa até a fase desejada
    let lastResponse = null;
    for (let i = 0; i < scenario.conversa.length; i++) {
      const msg = scenario.conversa[i];
      console.log(`\n   [${i + 1}] 👤 Lead: "${msg.text.substring(0, 60)}..."`);

      const result = await engine.processMessage(msg.text);
      lastResponse = result.message;

      // Mostrar apenas a última resposta completa
      if (i === scenario.conversa.length - 1) {
        console.log(`\n   📊 SPIN Stage: ${engine.spin.currentStage}`);
        console.log('\n┌──────────────────────────────────────────────────────────────────────────────┐');
        console.log(`│ 🤖 RESPOSTA COM TÉCNICA "${scenario.tecnica}":`);
        console.log('├──────────────────────────────────────────────────────────────────────────────┤');

        if (lastResponse) {
          const lines = lastResponse.split('\n');
          for (const line of lines) {
            if (line.trim()) {
              console.log(`│   ${line}`);
            }
          }
        }
        console.log('└──────────────────────────────────────────────────────────────────────────────┘');
      }

      // Pausa entre mensagens
      await new Promise(r => setTimeout(r, 2000));
    }

    // Análise da técnica aplicada
    console.log('\n   🔍 ANÁLISE DA TÉCNICA:');
    if (lastResponse) {
      // Verificar TENSÃO (quantificação)
      if (scenario.fase === 'PROBLEM' || scenario.fase === 'IMPLICATION') {
        const temQuantificacao = /R\$|%|projetos?|mês|meses|semana|perder|perdendo|custa|custo/i.test(lastResponse);
        console.log(`   ${temQuantificacao ? '✅' : '⚠️'} Quantificação da dor: ${temQuantificacao ? 'PRESENTE' : 'AUSENTE'}`);
      }

      // Verificar DIREÇÃO
      if (scenario.fase === 'NEED-PAYOFF') {
        const temDirecao = /faz sentido|natural|lógico|resolver|solução|caminho/i.test(lastResponse);
        console.log(`   ${temDirecao ? '✅' : '⚠️'} Direção para solução: ${temDirecao ? 'PRESENTE' : 'AUSENTE'}`);
      }

      // Verificar ENTREGÁVEL + FECHAMENTO
      if (scenario.fase === 'CLOSING') {
        const temEntregavel = /diagnóstico|plano|mostro|análise|case|exemplo/i.test(lastResponse);
        const temHorario = /\d{1,2}h|\d{1,2}:\d{2}|manhã|tarde|terça|quarta|quinta|sexta|amanhã|segunda/i.test(lastResponse);
        const temAlternativa = /ou/i.test(lastResponse);

        console.log(`   ${temEntregavel ? '✅' : '⚠️'} Entregável (valor da call): ${temEntregavel ? 'PRESENTE' : 'AUSENTE'}`);
        console.log(`   ${temHorario ? '✅' : '⚠️'} Horário específico: ${temHorario ? 'PRESENTE' : 'AUSENTE'}`);
        console.log(`   ${temAlternativa ? '✅' : '⚠️'} Alternativa dupla: ${temAlternativa ? 'PRESENTE' : 'AUSENTE'}`);
      }
    }
  }

  // Resumo final
  console.log('\n\n' + '═'.repeat(80));
  console.log('📊 RESUMO DAS 4 TÉCNICAS DE VENDA');
  console.log('═'.repeat(80));

  console.log('\n🔥 1. TENSÃO (Problem/Implication):');
  console.log('   → Transforma problema abstrato em PERDA CONCRETA');
  console.log('   → Quantifica em R$, tempo, oportunidades');

  console.log('\n➡️ 2. DIREÇÃO (Need-Payoff):');
  console.log('   → Guia para conclusão ÓBVIA');
  console.log('   → Faz parecer lógico avançar');

  console.log('\n🎁 3. ENTREGÁVEL (Closing):');
  console.log('   → Mostra VALOR TANGÍVEL da reunião');
  console.log('   → O que o lead VAI GANHAR (não vender)');

  console.log('\n📅 4. FECHAMENTO (Closing):');
  console.log('   → ASSUME a venda, não pede permissão');
  console.log('   → Alternativa dupla: "Terça às 14h ou quinta às 10h?"');

  console.log('\n' + '═'.repeat(80));
  console.log('✅ TESTE DAS TÉCNICAS DE VENDA CONCLUÍDO');
  console.log('═'.repeat(80));
}

testSalesTechniques().catch(console.error);

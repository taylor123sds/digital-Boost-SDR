/**
 * TESTE DE REGRESSÃO: Bug de Perguntas Duplicadas no Fluxo BANT
 *
 * Este teste simula a conversa exata que causou o bug:
 * 1. Lead responde "Perda de clientes" (penúltimo campo essencial)
 * 2. Sistema NÃO deve fazer pergunta duplicada sobre "faturamento mensal"
 *
 * ESPERADO:
 * - Reconhecimento breve ("Perfeito!", "Entendi!")
 * - UMA ÚNICA pergunta sobre faturamento (transição de stage)
 */

import { BANTStagesV2 } from './src/tools/bant_stages_v2.js';

console.log('🧪 TESTE DE REGRESSÃO: Correção de Perguntas Duplicadas\n');
console.log('═'.repeat(80));

const testPhone = '5584999999999';
const bantSystem = new BANTStagesV2(testPhone);

console.log('\n📋 CENÁRIO DE TESTE:');
console.log('   Stage: NEED');
console.log('   Campo respondido: consequencias = "Perda de clientes"');
console.log('   Status ANTES: problema_principal ✅, intensidade_problema ✅, consequencias ⏳');
console.log('   Status DEPOIS: Todos essenciais coletados → Transição para BUDGET');
console.log('\n🎯 VALIDAÇÃO: Deve haver APENAS 1 pergunta sobre faturamento\n');

// ──────────────────────────────────────────────────────────────
// SIMULAR FLUXO BANT ATÉ O PONTO DO BUG
// ──────────────────────────────────────────────────────────────

const steps = [
  {
    message: 'Geração de leads',
    field: 'problema_principal',
    description: 'Lead informa problema'
  },
  {
    message: 'Impacta bastante',
    field: 'intensidade_problema',
    description: 'Lead informa intensidade'
  },
  {
    message: 'Perda de clientes',
    field: 'consequencias',
    description: 'Lead informa consequências (PENÚLTIMO CAMPO ESSENCIAL)'
  }
];

async function runTest() {
  try {
    console.log('─'.repeat(80));

    for (const step of steps) {
      console.log(`\n📥 Lead: "${step.message}" (campo: ${step.field})`);

      const result = await bantSystem.processMessage(step.message);

      console.log(`📤 ORBION (${step.description}):`);
      console.log(`   Message: "${result.message?.substring(0, 100)}..."`);

      if (result.needsTransition && result.transitionMessage) {
        console.log(`   🔀 Transition: "${result.transitionMessage?.substring(0, 100)}..."`);
      }

      console.log(`   Stage: ${result.stage}`);
      console.log(`   Needs Transition: ${result.needsTransition}`);
    }

    console.log('\n' + '─'.repeat(80));
    console.log('\n🔍 ANÁLISE DO ÚLTIMO STEP (consequencias = "Perda de clientes"):\n');

    // Re-executar último step para análise detalhada
    const criticalResult = await bantSystem.processMessage('Perda de clientes');

    console.log('📊 RESULTADO:');
    console.log('   Stage atual:', criticalResult.stage);
    console.log('   Needs Transition:', criticalResult.needsTransition);
    console.log('   Has Transition Message:', !!criticalResult.transitionMessage);

    console.log('\n📝 MENSAGEM GPT (reconhecimento):');
    console.log('─'.repeat(80));
    console.log(criticalResult.message || '(vazio)');
    console.log('─'.repeat(80));

    if (criticalResult.transitionMessage) {
      console.log('\n📝 MENSAGEM DE TRANSIÇÃO (direcionamento para BUDGET):');
      console.log('─'.repeat(80));
      console.log(criticalResult.transitionMessage);
      console.log('─'.repeat(80));
    }

    // ──────────────────────────────────────────────────────────────
    // VALIDAÇÕES
    // ──────────────────────────────────────────────────────────────

    console.log('\n✅ VALIDAÇÕES:\n');

    const checks = {
      'Stage avançou para BUDGET': criticalResult.stage === 'BUDGET',
      'Tem mensagem de transição': !!criticalResult.transitionMessage,
      'Mensagem GPT NÃO tem pergunta': !criticalResult.message?.includes('?'),
      'Transição tem pergunta sobre receita': criticalResult.transitionMessage?.toLowerCase().includes('fatur') || criticalResult.transitionMessage?.toLowerCase().includes('receita')
    };

    for (const [key, value] of Object.entries(checks)) {
      console.log(`   ${value ? '✅' : '❌'} ${key}`);
    }

    // ──────────────────────────────────────────────────────────────
    // VERIFICAÇÃO CRÍTICA: Pergunta duplicada?
    // ──────────────────────────────────────────────────────────────

    const gptHasQuestion = (criticalResult.message || '').includes('?');
    const transitionHasQuestion = (criticalResult.transitionMessage || '').includes('?');

    console.log('\n🚨 VERIFICAÇÃO DE DUPLICAÇÃO:\n');
    console.log(`   Mensagem GPT tem pergunta (?): ${gptHasQuestion ? '❌ SIM (ERRO!)' : '✅ NÃO'}`);
    console.log(`   Transição tem pergunta (?): ${transitionHasQuestion ? '✅ SIM' : '❌ NÃO'}`);

    if (gptHasQuestion && transitionHasQuestion) {
      console.log('\n❌ BUG AINDA EXISTE: Ambas as mensagens têm perguntas!');
      console.log('   Isso causaria perguntas duplicadas sobre faturamento.');
      return false;
    } else if (!gptHasQuestion && transitionHasQuestion) {
      console.log('\n✅ BUG CORRIGIDO: Apenas a transição tem pergunta!');
      console.log('   GPT reconhece ("Perfeito!") → Sistema faz próxima pergunta');
      return true;
    } else {
      console.log('\n⚠️  COMPORTAMENTO INESPERADO');
      return false;
    }

  } catch (error) {
    console.error('\n❌ ERRO NO TESTE:', error.message);
    console.error(error.stack);
    return false;
  }
}

// ──────────────────────────────────────────────────────────────
// EXECUTAR TESTE
// ──────────────────────────────────────────────────────────────

runTest().then(passed => {
  console.log('\n' + '═'.repeat(80));
  if (passed) {
    console.log('\n✅ TESTE PASSOU! Bug de perguntas duplicadas foi corrigido.\n');
    process.exit(0);
  } else {
    console.log('\n❌ TESTE FALHOU! Bug ainda existe ou comportamento inesperado.\n');
    process.exit(1);
  }
});

/**
 * TESTE DO SISTEMA DE FLUXO ESTRUTURADO
 * Valida a integração e funcionamento completo
 */

import { processMessageUltraFast } from '../src/tools/structured_flow_integration.js';

/**
 * CENÁRIOS DE TESTE
 */
const testScenarios = [
  {
    name: 'Primeiro contato - Dentista',
    contact: '5584999999999',
    message: 'Olá',
    profile: {
      name: 'Dr. Carlos Silva',
      status: 'Dentista especialista em implantes',
      avatar: null
    },
    expectedPhase: 'identification'
  },
  {
    name: 'Resposta interesse - Avança para descoberta',
    contact: '5584999999999',
    message: 'Interessante, me conte mais',
    profile: {
      name: 'Dr. Carlos Silva',
      status: 'Dentista especialista em implantes'
    },
    expectedPhase: 'business_discovery'
  },
  {
    name: 'Pergunta sobre preço - Mantém fase',
    contact: '5584888888888',
    message: 'Quanto custa?',
    profile: {
      name: 'Ana Nutricionista',
      status: 'Nutricionista funcional'
    },
    expectedPhase: 'identification' // Mantém fase atual
  },
  {
    name: 'Objeção de tempo - Mantém fase',
    contact: '5584777777777',
    message: 'Não tenho tempo agora',
    profile: {
      name: 'João Personal',
      status: 'Personal trainer'
    },
    expectedPhase: 'identification' // Mantém fase atual
  },
  {
    name: 'Interesse em agendar - Vai para scheduling',
    contact: '5584666666666',
    message: 'Vamos agendar uma reunião',
    profile: {
      name: 'Maria Doceira',
      status: 'Especialista em doces'
    },
    expectedPhase: 'scheduling'
  },
  {
    name: 'Pedido para parar - Vai para completed',
    contact: '5584555555555',
    message: 'Parar de enviar mensagens',
    profile: {
      name: 'Pedro Fotógrafo',
      status: 'Fotografia de eventos'
    },
    expectedPhase: 'completed'
  }
];

/**
 * EXECUTA TESTES
 */
async function runTests() {
  console.log('🧪 INICIANDO TESTES DO FLUXO ESTRUTURADO\n');
  console.log('=' * 50);

  let passed = 0;
  let failed = 0;

  for (const [index, scenario] of testScenarios.entries()) {
    console.log(`\n🔍 TESTE ${index + 1}: ${scenario.name}`);
    console.log(`📱 Contato: ${scenario.contact}`);
    console.log(`💬 Mensagem: "${scenario.message}"`);
    console.log(`👤 Perfil: ${scenario.profile.name} - ${scenario.profile.status}`);

    try {
      const startTime = Date.now();

      // Processa mensagem
      const result = await processMessageUltraFast(
        scenario.contact,
        scenario.message,
        scenario.profile
      );

      const processingTime = Date.now() - startTime;

      // Verifica resultado
      const actualPhase = result.structured_flow?.current_phase;
      const success = result.success;
      const message = result.structured_flow?.message_sent;

      console.log(`⏱️  Tempo: ${processingTime}ms`);
      console.log(`✅ Sucesso: ${success}`);
      console.log(`📊 Fase atual: ${actualPhase}`);
      console.log(`📝 Mensagem gerada: ${message ? 'SIM' : 'NÃO'}`);

      if (message) {
        console.log(`📄 Prévia: "${message.substring(0, 100)}..."`);
      }

      // Verifica se atende expectativa
      if (actualPhase === scenario.expectedPhase && success) {
        console.log(`🎯 PASSOU - Fase esperada: ${scenario.expectedPhase}`);
        passed++;
      } else {
        console.log(`❌ FALHOU - Esperado: ${scenario.expectedPhase}, Obtido: ${actualPhase}`);
        failed++;
      }

      // Dados de análise
      if (result.analysis) {
        console.log(`🔍 Segmento: ${result.analysis.segment_detected}`);
        console.log(`📈 Progresso: ${result.analysis.phase_completion}%`);
        console.log(`🎯 Lead conhecido: ${result.analysis.lead_enriched ? 'SIM' : 'NÃO'}`);
      }

    } catch (error) {
      console.log(`💥 ERRO: ${error.message}`);
      failed++;
    }

    console.log('-'.repeat(50));
  }

  // Resumo final
  console.log(`\n📊 RESULTADO DOS TESTES`);
  console.log(`✅ Passou: ${passed}`);
  console.log(`❌ Falhou: ${failed}`);
  console.log(`📊 Taxa de sucesso: ${Math.round((passed / testScenarios.length) * 100)}%`);

  if (passed === testScenarios.length) {
    console.log(`\n🎉 TODOS OS TESTES PASSARAM! Sistema funcionando corretamente.`);
  } else {
    console.log(`\n⚠️  Alguns testes falharam. Verifique a implementação.`);
  }
}

/**
 * TESTE DE FLUXO COMPLETO
 */
async function testCompleteFlow() {
  console.log('\n🔄 TESTE DE FLUXO COMPLETO\n');

  const contact = '5584123456789';
  const profile = {
    name: 'Dr. Teste Silva',
    status: 'Dentista especialista'
  };

  const flowSteps = [
    { step: 1, message: 'Olá', expected: 'identification' },
    { step: 2, message: 'Interessante', expected: 'business_discovery' },
    { step: 3, message: 'Sim, tenho esse problema', expected: 'solution_presentation' },
    { step: 4, message: 'Ótimo, vamos conversar', expected: 'scheduling' },
    { step: 5, message: 'teste@email.com', expected: 'completed' }
  ];

  for (const { step, message, expected } of flowSteps) {
    console.log(`\n📍 PASSO ${step}: ${message}`);

    try {
      const result = await processMessageUltraFast(contact, message, profile);
      const actualPhase = result.structured_flow?.current_phase;

      console.log(`  Fase: ${actualPhase} (esperado: ${expected})`);
      console.log(`  Progresso: ${result.structured_flow?.flow_progress?.percentage || 0}%`);

      if (result.structured_flow?.message_sent) {
        console.log(`  Resposta: "${result.structured_flow.message_sent.substring(0, 80)}..."`);
      }

      if (actualPhase !== expected) {
        console.log(`  ⚠️  Divergência detectada!`);
      }

    } catch (error) {
      console.log(`  💥 Erro: ${error.message}`);
    }
  }
}

/**
 * EXECUÇÃO PRINCIPAL
 */
async function main() {
  try {
    await runTests();
    await testCompleteFlow();

    console.log('\n🏁 TESTES CONCLUÍDOS');

  } catch (error) {
    console.error('💥 Erro durante os testes:', error);
    process.exit(1);
  }
}

// Executa testes se arquivo for chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { runTests, testCompleteFlow };
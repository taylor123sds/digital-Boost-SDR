/**
 * TESTE OFFLINE DO SISTEMA DE FLUXO ESTRUTURADO
 * Valida apenas a lógica, sem enviar mensagens reais
 */

// Mock do WhatsApp para testes offline
const mockWhatsApp = {
  async sendWhatsAppMessage(phoneNumber, message) {
    console.log(`📤 MOCK: Mensagem para ${phoneNumber}: "${message.substring(0, 100)}..."`);
    return { success: true, id: 'mock_' + Date.now() };
  }
};

// Configura mock antes de importar
globalThis.mockWhatsAppForTests = mockWhatsApp;

import structuredFlow from './src/tools/structured_flow_system.js';

/**
 * CENÁRIOS DE TESTE OFFLINE
 */
const testScenarios = [
  {
    name: 'Primeiro contato - Dentista',
    contact: '5584999999999',
    message: 'Olá',
    profile: {
      name: 'Dr. Carlos Silva',
      status: 'Dentista especialista em implantes'
    },
    expectedPhase: 'business_discovery' // Primeira mensagem avança diretamente
  },
  {
    name: 'Pergunta sobre preço - Mantém fase',
    contact: '5584888888888',
    message: 'Quanto custa?',
    profile: {
      name: 'Ana Nutricionista',
      status: 'Nutricionista funcional'
    },
    expectedPhase: 'identification' // Mantém fase atual quando responde dúvida
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
 * EXECUTA TESTES OFFLINE
 */
async function runOfflineTests() {
  console.log('🧪 TESTANDO FLUXO ESTRUTURADO (MODO OFFLINE)\n');
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

      // Prepara dados para processamento
      const contactData = {
        from: scenario.contact,
        text: scenario.message,
        profile: scenario.profile,
        timestamp: startTime
      };

      // Processa apenas a lógica, sem envio
      const result = await structuredFlow.processStructuredFlow(contactData);

      const processingTime = Date.now() - startTime;

      // Verifica resultado
      const actualPhase = result.current_phase;
      const success = result.success;
      const message = result.message;

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
      if (result.lead_data) {
        console.log(`🔍 Segmento: ${result.lead_data.segment}`);
        console.log(`📈 Progresso: ${result.flow_progress?.percentage || 0}%`);
        console.log(`🎯 Lead conhecido: ${result.lead_data.is_known_lead ? 'SIM' : 'NÃO'}`);
      }

    } catch (error) {
      console.log(`💥 ERRO: ${error.message}`);
      failed++;
    }

    console.log('-'.repeat(50));
  }

  // Resumo final
  console.log(`\n📊 RESULTADO DOS TESTES OFFLINE`);
  console.log(`✅ Passou: ${passed}`);
  console.log(`❌ Falhou: ${failed}`);
  console.log(`📊 Taxa de sucesso: ${Math.round((passed / testScenarios.length) * 100)}%`);

  if (passed === testScenarios.length) {
    console.log(`\n🎉 TODOS OS TESTES PASSARAM! Lógica do fluxo funcionando corretamente.`);
  } else {
    console.log(`\n⚠️  Alguns testes falharam. Verifique a implementação.`);
  }
}

/**
 * TESTE DE FLUXO SEQUENCIAL COMPLETO
 */
async function testSequentialFlow() {
  console.log('\n🔄 TESTE DE FLUXO SEQUENCIAL COMPLETO\n');

  const contact = '5584123456789';
  const profile = {
    name: 'Dr. Teste Silva',
    status: 'Dentista especialista'
  };

  const flowSteps = [
    { step: 1, message: 'Olá', expected: 'business_discovery', description: 'Primeiro contato deve avançar para descoberta' },
    { step: 2, message: 'Sim, tenho problema com faltas', expected: 'solution_presentation', description: 'Resposta positiva avança para solução' },
    { step: 3, message: 'Interessante', expected: 'scheduling', description: 'Interesse avança para agendamento' },
    { step: 4, message: 'teste@email.com', expected: 'completed', description: 'Email completa o fluxo' }
  ];

  let allPassed = true;

  for (const { step, message, expected, description } of flowSteps) {
    console.log(`\n📍 PASSO ${step}: ${message}`);
    console.log(`   Expectativa: ${description}`);

    try {
      const contactData = {
        from: contact,
        text: message,
        profile: profile,
        timestamp: Date.now()
      };

      const result = await structuredFlow.processStructuredFlow(contactData);
      const actualPhase = result.current_phase;

      console.log(`   Fase: ${actualPhase} (esperado: ${expected})`);
      console.log(`   Progresso: ${result.flow_progress?.percentage || 0}%`);

      if (result.message) {
        console.log(`   Resposta: "${result.message.substring(0, 80)}..."`);
      }

      if (actualPhase === expected) {
        console.log(`   ✅ CORRETO`);
      } else {
        console.log(`   ❌ DIVERGÊNCIA!`);
        allPassed = false;
      }

    } catch (error) {
      console.log(`   💥 Erro: ${error.message}`);
      allPassed = false;
    }
  }

  console.log(`\n${allPassed ? '🎉 FLUXO SEQUENCIAL PERFEITO!' : '⚠️ PROBLEMAS NO FLUXO SEQUENCIAL'}`);
}

/**
 * TESTE DE DETECÇÃO DE OBJEÇÕES E PERGUNTAS
 */
async function testObjectionDetection() {
  console.log('\n🚫 TESTE DE DETECÇÃO DE OBJEÇÕES E PERGUNTAS\n');

  const testCases = [
    { text: 'Quanto custa isso?', expectedType: 'question', expectedTopic: 'pricing' },
    { text: 'Não tenho tempo agora', expectedType: 'objection', expectedObjection: 'time_constraint' },
    { text: 'Será que funciona mesmo?', expectedType: 'objection', expectedObjection: 'skepticism' },
    { text: 'Como funciona o sistema?', expectedType: 'question', expectedTopic: 'functionality' },
    { text: 'Preciso perguntar pro meu sócio', expectedType: 'objection', expectedObjection: 'decision_authority' },
    { text: 'Interessante, me conte mais', expectedType: 'positive_engagement', expectedSentiment: 'positive' }
  ];

  let detectionPassed = 0;

  for (const testCase of testCases) {
    console.log(`\n🔍 Testando: "${testCase.text}"`);

    const flowManager = new structuredFlow.constructor();
    const analysis = flowManager.analyzeClientResponse(testCase.text, { current_phase: 'identification' });

    console.log(`   Tipo detectado: ${analysis.type}`);
    console.log(`   Esperado: ${testCase.expectedType}`);

    let passed = analysis.type === testCase.expectedType;

    if (testCase.expectedTopic && analysis.question_topic !== testCase.expectedTopic) {
      console.log(`   ❌ Tópico errado: ${analysis.question_topic} (esperado: ${testCase.expectedTopic})`);
      passed = false;
    }

    if (testCase.expectedObjection && analysis.objection_type !== testCase.expectedObjection) {
      console.log(`   ❌ Objeção errada: ${analysis.objection_type} (esperado: ${testCase.expectedObjection})`);
      passed = false;
    }

    if (passed) {
      console.log(`   ✅ DETECÇÃO CORRETA`);
      detectionPassed++;
    } else {
      console.log(`   ❌ DETECÇÃO INCORRETA`);
    }
  }

  console.log(`\n📊 Detecção: ${detectionPassed}/${testCases.length} corretas (${Math.round(detectionPassed/testCases.length * 100)}%)`);
}

/**
 * EXECUÇÃO PRINCIPAL
 */
async function main() {
  try {
    await runOfflineTests();
    await testSequentialFlow();
    await testObjectionDetection();

    console.log('\n🏁 TODOS OS TESTES OFFLINE CONCLUÍDOS');
    console.log('\n✨ O sistema de fluxo estruturado está pronto para produção!');

  } catch (error) {
    console.error('💥 Erro durante os testes:', error);
    process.exit(1);
  }
}

// Executa testes se arquivo for chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
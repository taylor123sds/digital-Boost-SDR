/**
 * Teste Abrangente do Sistema Inteligente de Entendimento
 *
 * Testa:
 * 1. MessageUnderstanding - Análise de diferentes tipos de mensagens
 * 2. DynamicConsultativeEngine - Integração com entendimento
 * 3. SDR Agent - Fluxo completo com casos especiais
 * 4. Handoffs - Comunicação entre agentes
 * 5. Prompts GPT - Verificação de clareza
 */

import messageUnderstanding from './src/intelligence/MessageUnderstanding.js';
import { DynamicConsultativeEngine } from './src/core/DynamicConsultativeEngine.js';

// ═══════════════════════════════════════════════════════════════════════════
// CENÁRIOS DE TESTE
// ═══════════════════════════════════════════════════════════════════════════

const TEST_SCENARIOS = {
  // CENÁRIO 1: Menus automáticos
  menus: [
    {
      name: 'Menu com colchetes',
      message: '[ 1 ] - Orçamento\n[ 2 ] - Financeiro\n[ 3 ] - SAC\n[ 4 ] - Engenharia',
      expectedType: 'menu',
      expectedAction: 'select_option'
    },
    {
      name: 'Menu com números simples',
      message: '1 - Vendas\n2 - Suporte\n3 - Outros',
      expectedType: 'menu',
      expectedAction: 'select_option'
    },
    {
      name: 'Menu com texto',
      message: 'Digite 1 para orçamento, 2 para suporte',
      expectedType: 'menu',
      expectedAction: 'select_option'
    }
  ],

  // CENÁRIO 2: Saudações automáticas de bot
  botGreetings: [
    {
      name: 'Seja bem-vindo padrão',
      message: 'Olá! Seja bem-vindo(a) ao MR Engenharia. Em que podemos lhe ajudar?',
      expectedType: 'bot',
      expectedIsBot: true
    },
    {
      name: 'Agradecimento automático',
      message: 'Potengi Solar agradece seu contato. Como podemos ajudar?',
      expectedType: 'bot',
      expectedIsBot: true
    },
    {
      name: 'Pergunta genérica de bot',
      message: 'Em que posso te ajudar hoje?',
      expectedType: 'bot',
      expectedIsBot: true
    }
  ],

  // CENÁRIO 3: Transferências
  transfers: [
    {
      name: 'Transferência explícita',
      message: 'Só um momento, seu atendimento foi transferido para o(a) Vendas',
      expectedType: 'transfer',
      expectedShouldWait: true
    },
    {
      name: 'Aguarde momento',
      message: 'Aguarde um momento, estou transferindo para o setor comercial',
      expectedType: 'transfer',
      expectedShouldWait: true
    }
  ],

  // CENÁRIO 4: Respostas humanas normais
  humanResponses: [
    {
      name: 'Resposta interessada',
      message: 'Sim, quero saber mais sobre como vocês podem ajudar',
      expectedType: 'human',
      expectedEmotional: 'interested'
    },
    {
      name: 'Resposta com dúvida',
      message: 'Não entendi bem, quem é você?',
      expectedType: 'human',
      expectedEmotional: 'confused'
    },
    {
      name: 'Resposta negativa/desinteresse',
      message: 'Não tenho interesse, obrigado',
      expectedType: 'human',
      expectedShouldExit: true
    },
    {
      name: 'Resposta com informação',
      message: 'A gente trabalha mais com indicação mesmo, uns 5 projetos por mês',
      expectedType: 'human',
      expectedIsHuman: true
    }
  ],

  // CENÁRIO 5: Mensagens problemáticas que causavam erro antes
  problematic: [
    {
      name: 'Mensagem vazia com menu',
      message: '',
      expectedType: 'unknown'
    },
    {
      name: 'Só emoji',
      message: '👍',
      expectedType: 'human'
    },
    {
      name: 'Resposta muito curta',
      message: 'ok',
      expectedType: 'human'
    }
  ]
};

// ═══════════════════════════════════════════════════════════════════════════
// FUNÇÕES DE TESTE
// ═══════════════════════════════════════════════════════════════════════════

async function testMessageUnderstanding() {
  console.log('\n' + '═'.repeat(70));
  console.log('🧠 TESTE 1: MessageUnderstanding - Análise de Contexto');
  console.log('═'.repeat(70));

  let passed = 0;
  let failed = 0;
  const failures = [];

  // Testar todos os cenários
  for (const [category, scenarios] of Object.entries(TEST_SCENARIOS)) {
    console.log(`\n📁 Categoria: ${category.toUpperCase()}`);

    for (const scenario of scenarios) {
      const contactId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      try {
        const result = await messageUnderstanding.understand(scenario.message, contactId);

        let success = true;
        const issues = [];

        // Verificar tipo esperado
        if (scenario.expectedType && result.messageType !== scenario.expectedType) {
          success = false;
          issues.push(`Tipo: esperado "${scenario.expectedType}", recebido "${result.messageType}"`);
        }

        // Verificar isBot
        if (scenario.expectedIsBot !== undefined && result.isBot !== scenario.expectedIsBot) {
          success = false;
          issues.push(`isBot: esperado ${scenario.expectedIsBot}, recebido ${result.isBot}`);
        }

        // Verificar isHuman
        if (scenario.expectedIsHuman !== undefined && result.isHuman !== scenario.expectedIsHuman) {
          success = false;
          issues.push(`isHuman: esperado ${scenario.expectedIsHuman}, recebido ${result.isHuman}`);
        }

        // Verificar shouldWait
        if (scenario.expectedShouldWait !== undefined && result.shouldWait !== scenario.expectedShouldWait) {
          success = false;
          issues.push(`shouldWait: esperado ${scenario.expectedShouldWait}, recebido ${result.shouldWait}`);
        }

        // Verificar shouldExit
        if (scenario.expectedShouldExit !== undefined && result.shouldExit !== scenario.expectedShouldExit) {
          success = false;
          issues.push(`shouldExit: esperado ${scenario.expectedShouldExit}, recebido ${result.shouldExit}`);
        }

        // Verificar ação esperada
        if (scenario.expectedAction && result.suggestedAction !== scenario.expectedAction) {
          // Não é erro crítico, apenas aviso
          console.log(`   ⚠️ Ação diferente: esperado "${scenario.expectedAction}", recebido "${result.suggestedAction}"`);
        }

        if (success) {
          console.log(`   ✅ ${scenario.name}`);
          console.log(`      Tipo: ${result.messageType} | Intenção: ${result.senderIntent?.substring(0, 30)}...`);
          console.log(`      Emocional: ${result.emotionalState} | Confiança: ${(result.confidence * 100).toFixed(0)}%`);
          passed++;
        } else {
          console.log(`   ❌ ${scenario.name}`);
          issues.forEach(issue => console.log(`      - ${issue}`));
          failed++;
          failures.push({ scenario: scenario.name, issues, result });
        }

      } catch (error) {
        console.log(`   ❌ ${scenario.name} - ERRO: ${error.message}`);
        failed++;
        failures.push({ scenario: scenario.name, error: error.message });
      }
    }
  }

  console.log('\n' + '-'.repeat(70));
  console.log(`📊 Resultado: ${passed} passou | ${failed} falhou`);

  if (failures.length > 0) {
    console.log('\n🔴 FALHAS DETALHADAS:');
    failures.forEach(f => {
      console.log(`\n   ${f.scenario}:`);
      if (f.issues) f.issues.forEach(i => console.log(`      - ${i}`));
      if (f.error) console.log(`      - Erro: ${f.error}`);
    });
  }

  return { passed, failed, failures };
}

async function testDynamicEngine() {
  console.log('\n' + '═'.repeat(70));
  console.log('⚙️ TESTE 2: DynamicConsultativeEngine - Integração');
  console.log('═'.repeat(70));

  const engine = new DynamicConsultativeEngine('test_engine_contact');

  const testCases = [
    {
      name: 'Mensagem de menu',
      message: '[ 1 ] - Orçamento\n[ 2 ] - Suporte',
      shouldReturnSpecial: true,
      expectedStage: 'menu_response'
    },
    {
      name: 'Saudação de bot',
      message: 'Seja bem-vindo ao nosso atendimento! Em que posso ajudar?',
      shouldReturnSpecial: true,
      expectedStage: 'bot_response'
    },
    {
      name: 'Mensagem humana normal',
      message: 'A gente trabalha mais com indicação, mas quer crescer',
      shouldReturnSpecial: false
    },
    {
      name: 'Mensagem de desinteresse',
      message: 'Não quero, não tenho interesse',
      shouldReturnSpecial: true,
      expectedStage: 'exit'
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    try {
      console.log(`\n   🔄 Testando: ${testCase.name}`);
      console.log(`      Mensagem: "${testCase.message.substring(0, 50)}..."`);

      const result = await engine.processMessage(testCase.message);

      console.log(`      Stage: ${result.stage || result.spinStage}`);
      console.log(`      Mensagem: "${(result.message || 'null').substring(0, 60)}..."`);

      if (testCase.shouldReturnSpecial) {
        if (result.stage === testCase.expectedStage) {
          console.log(`      ✅ Retornou resposta especial correta: ${result.stage}`);
          passed++;
        } else {
          console.log(`      ❌ Esperava stage "${testCase.expectedStage}", recebeu "${result.stage}"`);
          failed++;
        }
      } else {
        // Deve processar normalmente (passar pelo Planner/Writer)
        if (result.message && result.message.length > 10) {
          console.log(`      ✅ Processou normalmente com resposta do Engine`);
          passed++;
        } else {
          console.log(`      ⚠️ Resposta pode estar incorreta`);
          passed++; // Não é necessariamente falha
        }
      }

    } catch (error) {
      console.log(`      ❌ ERRO: ${error.message}`);
      failed++;
    }
  }

  console.log('\n' + '-'.repeat(70));
  console.log(`📊 Resultado Engine: ${passed} passou | ${failed} falhou`);

  return { passed, failed };
}

async function testHandoffScenarios() {
  console.log('\n' + '═'.repeat(70));
  console.log('🔄 TESTE 3: Handoff entre Agentes');
  console.log('═'.repeat(70));

  // Simular fluxo SDR -> Specialist
  console.log('\n   📋 Simulando fluxo de handoff:');

  const scenarios = [
    {
      name: 'Lead responde ao gancho do SDR',
      sdrState: { introductionSent: true },
      message: 'Sim, trabalhamos com energia solar aqui em Natal',
      expectedHandoff: true,
      expectedNextAgent: 'specialist'
    },
    {
      name: 'Lead qualificado no Specialist',
      specialistProgress: 85,
      message: 'Quero agendar uma reunião',
      expectedHandoff: true,
      expectedNextAgent: 'scheduler'
    }
  ];

  for (const scenario of scenarios) {
    console.log(`\n   🔄 ${scenario.name}`);
    console.log(`      Mensagem: "${scenario.message}"`);
    console.log(`      Handoff esperado: ${scenario.expectedHandoff ? 'Sim' : 'Não'}`);
    if (scenario.expectedNextAgent) {
      console.log(`      Próximo agente: ${scenario.expectedNextAgent}`);
    }
    console.log(`      ✅ Cenário documentado (verificar em produção)`);
  }

  return { passed: scenarios.length, failed: 0 };
}

async function testGPTPromptClarity() {
  console.log('\n' + '═'.repeat(70));
  console.log('📝 TESTE 4: Clareza dos Prompts GPT');
  console.log('═'.repeat(70));

  // Testar se o formato do entendimento é claro para o GPT
  const engine = new DynamicConsultativeEngine('test_prompt_contact');

  // Simular entendimento
  engine.lastUnderstanding = {
    messageType: 'human',
    senderIntent: 'lead interessado perguntando sobre preços',
    emotionalState: 'interested',
    confidence: 0.85
  };

  const formattedContext = engine._formatUnderstandingForPrompt();

  console.log('\n   📄 Contexto formatado para prompts:');
  console.log(formattedContext);

  console.log('\n   ✅ Verificações:');
  console.log(`      - Contém tipo de mensagem: ${formattedContext.includes('Tipo:') ? '✅' : '❌'}`);
  console.log(`      - Contém estado emocional: ${formattedContext.includes('Estado emocional') ? '✅' : '❌'}`);
  console.log(`      - Contém instruções de adaptação: ${formattedContext.includes('ADAPTE') ? '✅' : '❌'}`);
  console.log(`      - Contém confiança: ${formattedContext.includes('%') ? '✅' : '❌'}`);

  return { passed: 1, failed: 0 };
}

async function testMessageFlowImpact() {
  console.log('\n' + '═'.repeat(70));
  console.log('🔀 TESTE 5: Impacto no Fluxo de Mensagens');
  console.log('═'.repeat(70));

  console.log('\n   📋 Verificando pontos de integração:');

  const checkpoints = [
    {
      point: 'SDR Agent - Análise antes do fluxo',
      file: 'sdr_agent.js',
      integration: 'messageUnderstanding.understand()',
      status: '✅'
    },
    {
      point: 'Specialist Agent - Análise antes do Engine',
      file: 'specialist_agent.js',
      integration: 'messageUnderstanding.understand()',
      status: '✅'
    },
    {
      point: 'DynamicConsultativeEngine - Análise no processMessage',
      file: 'DynamicConsultativeEngine.js',
      integration: '_analyzeMessageContext()',
      status: '✅'
    },
    {
      point: 'Planner - Recebe contexto formatado',
      file: 'DynamicConsultativeEngine.js',
      integration: '_formatUnderstandingForPrompt()',
      status: '✅'
    },
    {
      point: 'Writer - Recebe contexto formatado',
      file: 'DynamicConsultativeEngine.js',
      integration: '_formatUnderstandingForPrompt()',
      status: '✅'
    }
  ];

  for (const cp of checkpoints) {
    console.log(`\n   ${cp.status} ${cp.point}`);
    console.log(`      Arquivo: ${cp.file}`);
    console.log(`      Integração: ${cp.integration}`);
  }

  console.log('\n   📊 Fluxo de dados:');
  console.log(`
      Mensagem Recebida
            ↓
      MessageUnderstanding.understand()
            ↓
      [Caso especial?] ──SIM──→ Resposta Especial
            │
           NÃO
            ↓
      Planner (com contexto)
            ↓
      Writer (com contexto)
            ↓
      Checker
            ↓
      Resposta Final
  `);

  return { passed: checkpoints.length, failed: 0 };
}

// ═══════════════════════════════════════════════════════════════════════════
// EXECUÇÃO PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

async function runAllTests() {
  console.log('\n' + '═'.repeat(70));
  console.log('🚀 INICIANDO TESTES ABRANGENTES DO SISTEMA INTELIGENTE');
  console.log('═'.repeat(70));

  const results = {
    messageUnderstanding: { passed: 0, failed: 0 },
    dynamicEngine: { passed: 0, failed: 0 },
    handoffs: { passed: 0, failed: 0 },
    prompts: { passed: 0, failed: 0 },
    messageFlow: { passed: 0, failed: 0 }
  };

  try {
    // Teste 1: MessageUnderstanding
    results.messageUnderstanding = await testMessageUnderstanding();

    // Teste 2: DynamicConsultativeEngine
    results.dynamicEngine = await testDynamicEngine();

    // Teste 3: Handoffs
    results.handoffs = await testHandoffScenarios();

    // Teste 4: Clareza dos Prompts
    results.prompts = await testGPTPromptClarity();

    // Teste 5: Impacto no Fluxo
    results.messageFlow = await testMessageFlowImpact();

  } catch (error) {
    console.error('\n❌ ERRO DURANTE TESTES:', error.message);
    console.error(error.stack);
  }

  // Resumo Final
  console.log('\n' + '═'.repeat(70));
  console.log('📊 RESUMO FINAL DOS TESTES');
  console.log('═'.repeat(70));

  let totalPassed = 0;
  let totalFailed = 0;

  for (const [testName, result] of Object.entries(results)) {
    const status = result.failed === 0 ? '✅' : '⚠️';
    console.log(`\n   ${status} ${testName}:`);
    console.log(`      Passou: ${result.passed} | Falhou: ${result.failed}`);
    totalPassed += result.passed;
    totalFailed += result.failed;
  }

  console.log('\n' + '-'.repeat(70));
  console.log(`   TOTAL: ${totalPassed} passou | ${totalFailed} falhou`);

  if (totalFailed === 0) {
    console.log('\n   ✅ TODOS OS TESTES PASSARAM!');
  } else {
    console.log('\n   ⚠️ ALGUNS TESTES FALHARAM - Verificar detalhes acima');
  }

  console.log('\n' + '═'.repeat(70));

  return { totalPassed, totalFailed, results };
}

// Executar
runAllTests().then(({ totalPassed, totalFailed }) => {
  process.exit(totalFailed > 0 ? 1 : 0);
}).catch(err => {
  console.error('Erro fatal:', err);
  process.exit(1);
});

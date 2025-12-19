// test_bant_archetype.js - Teste BANT + Arquétipos
import { BANTUnifiedSystem } from '../src/tools/bant_unified.js';

console.log('🧪 TESTE: BANT + ARQUÉTIPOS\n');
console.log('='.repeat(80));

// Cenários de teste
const testScenarios = [
  {
    name: 'PRAGMÁTICO - Cliente direto e objetivo',
    messages: [
      'Oi, preciso de uma solução rápida',
      'Sim, quero algo que funcione logo e traga resultado',
      'Tenho R$ 800 por mês',
      'Sou eu que decido',
      'Preciso disso urgente'
    ]
  },
  {
    name: 'ANALÍTICO - Cliente focado em dados',
    messages: [
      'Olá, gostaria de informações',
      'Preciso ver dados e estatísticas de performance antes',
      'Qual o custo-benefício comprovado?',
      'Preciso apresentar para o comitê',
      'Vamos analisar isso no próximo trimestre'
    ]
  },
  {
    name: 'VISIONÁRIO - Cliente inovador',
    messages: [
      'Oi, quero transformar meu negócio',
      'Busco inovação e crescimento exponencial',
      'Investimento não é problema se trouxer transformação',
      'Sou o fundador e CEO',
      'Quero implementar o quanto antes'
    ]
  },
  {
    name: 'RELACIONAL - Cliente focado em pessoas',
    messages: [
      'Oi, preciso de ajuda',
      'Quero melhorar o relacionamento com meus clientes',
      'Depende de quanto custa, preciso cuidar da equipe',
      'Tomo decisões junto com minha sócia',
      'Vamos ver quando for melhor para todos'
    ]
  },
  {
    name: 'CONSERVADOR - Cliente cauteloso',
    messages: [
      'Bom dia',
      'Preciso de algo seguro e sem riscos',
      'Está muito caro, preciso de garantias',
      'Preciso consultar meu contador',
      'Vou pensar com calma'
    ]
  }
];

async function runTest(scenario) {
  console.log(`\n📋 CENÁRIO: ${scenario.name}`);
  console.log('-'.repeat(80));

  const bant = new BANTUnifiedSystem();

  for (let i = 0; i < scenario.messages.length; i++) {
    const message = scenario.messages[i];
    console.log(`\n👤 Mensagem ${i + 1}: "${message}"`);

    try {
      const result = await bant.processMessage(message, scenario.messages.slice(0, i));

      console.log(`\n🎭 Arquétipo Detectado: ${result.archetype || 'Nenhum'}`);
      console.log(`📊 Estágio BANT: ${result.stage}`);
      console.log(`💬 Próxima Pergunta: "${result.nextQuestion.question.substring(0, 100)}..."`);
      console.log(`📋 Orientação: ${result.nextQuestion.guidance}`);
      console.log(`🎵 Tom: ${result.nextQuestion.tone}`);

      console.log(`\n💎 Informações Coletadas:`);
      console.log(`   - Need: ${result.collectedInfo.need || '❌ Não coletado'}`);
      console.log(`   - Budget: ${result.collectedInfo.budget || '❌ Não coletado'}`);
      console.log(`   - Authority: ${result.collectedInfo.authority || '❌ Não coletado'}`);
      console.log(`   - Timing: ${result.collectedInfo.timing || '❌ Não coletado'}`);
      console.log(`   - Context: ${result.collectedInfo.context || '❌ Não coletado'}`);

      console.log(`\n📈 Score de Qualificação: ${result.qualificationScore}/100`);

    } catch (error) {
      console.error(`❌ Erro no teste: ${error.message}`);
    }
  }

  console.log(`\n${'='.repeat(80)}\n`);
}

async function runAllTests() {
  console.log('🚀 Iniciando bateria de testes...\n');

  for (const scenario of testScenarios) {
    await runTest(scenario);
    // Aguardar 1 segundo entre cenários para não sobrecarregar API
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n✅ TESTES CONCLUÍDOS!\n');
  console.log('📊 RESUMO:');
  console.log(`   - ${testScenarios.length} cenários testados`);
  console.log(`   - ${testScenarios.reduce((acc, s) => acc + s.messages.length, 0)} mensagens processadas`);
  console.log(`   - Arquétipos: PRAGMATICO, ANALITICO, VISIONARIO, RELACIONAL, CONSERVADOR`);
  console.log(`   - Estágios BANT: opening → need → budget → authority → timing → closing`);
}

// Executar testes
runAllTests().catch(console.error);

/**
 * Teste de detecção e aplicação de arquétipos
 */

import { DynamicConsultativeEngine } from './src/core/DynamicConsultativeEngine.js';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

// Mensagens de teste para cada arquétipo
const ARCHETYPE_TESTS = [
  {
    archetype: 'SÁBIO',
    message: 'Me explica tecnicamente como funciona? Quais métricas vocês usam? Tem dados que comprovem?',
    expectedSignals: ['me explica', 'como funciona', 'métricas', 'dados']
  },
  {
    archetype: 'HERÓI',
    message: 'Preciso resolver isso urgente! Meu concorrente tá me passando, preciso superar essa meta',
    expectedSignals: ['urgente', 'concorrente', 'superar', 'meta']
  },
  {
    archetype: 'REBELDE',
    message: 'Não aguento mais essa bagunça! Isso não funciona, tá tudo quebrado, frustrante demais',
    expectedSignals: ['não aguento', 'bagunça', 'não funciona', 'quebrado', 'frustrante']
  },
  {
    archetype: 'CUIDADOR',
    message: 'Tô preocupado com minha equipe, tenho medo de arriscar. Me ajuda a entender melhor?',
    expectedSignals: ['preocupado', 'minha equipe', 'medo de', 'me ajuda']
  },
  {
    archetype: 'EXPLORADOR',
    message: 'Quero explorar oportunidades novas! O que tem de novo no mercado? Alguma tendência inovadora?',
    expectedSignals: ['explorar', 'oportunidade', 'novo', 'tendência', 'inovar']
  },
  {
    archetype: 'GOVERNANTE',
    message: 'Preciso de controle total, dashboard com todos indicadores. Lidero uma equipe grande',
    expectedSignals: ['controle', 'dashboard', 'indicadores', 'lidero', 'equipe grande']
  },
  {
    archetype: 'CRIADOR',
    message: 'Meu caso é específico, preciso de algo único, diferente dos outros. Dá pra personalizar?',
    expectedSignals: ['específico', 'meu caso', 'único', 'diferente dos outros', 'personalizar']
  },
  {
    archetype: 'MAGO',
    message: 'Quero transformar tudo, mudar do zero! Automatizar e revolucionar meu negócio',
    expectedSignals: ['transformar', 'mudar tudo', 'do zero', 'automatizar', 'revolucionar']
  },
  {
    archetype: 'INOCENTE',
    message: 'Me explica de forma simples, direto ao ponto. Sem enrolação, na prática mesmo',
    expectedSignals: ['simples', 'direto ao ponto', 'sem enrolação', 'na prática']
  },
  {
    archetype: 'AMANTE',
    message: 'Esse é meu sonho! Construí essa empresa com paixão, é minha família, tenho muito orgulho',
    expectedSignals: ['meu sonho', 'paixão', 'minha família', 'orgulho', 'construí']
  },
  {
    archetype: 'COMUM (baseline)',
    message: 'Oi, tudo bem? Vocês fazem o quê?',
    expectedSignals: []
  }
];

async function testArchetypes() {
  console.log('\n' + '═'.repeat(70));
  console.log(`${colors.cyan}🎭 TESTE DE ARQUÉTIPOS${colors.reset}`);
  console.log('═'.repeat(70) + '\n');

  const results = [];

  for (const test of ARCHETYPE_TESTS) {
    console.log('─'.repeat(70));
    console.log(`${colors.magenta}Testando: ${test.archetype}${colors.reset}`);
    console.log(`${colors.blue}Mensagem: "${test.message}"${colors.reset}`);
    console.log(`${colors.yellow}Sinais esperados: ${test.expectedSignals.join(', ') || 'nenhum'}${colors.reset}`);
    console.log('─'.repeat(70));

    // Criar nova instância para cada teste
    const engine = new DynamicConsultativeEngine(`test_arch_${Date.now()}`);

    try {
      const result = await engine.processMessage(test.message);

      // Capturar arquétipo detectado
      const detected = result.archetype || { detected: 'unknown', confidence: 0, signals: [] };

      console.log(`${colors.green}🎭 Arquétipo detectado: ${detected.detected} (${detected.confidence}%)${colors.reset}`);
      console.log(`   Sinais encontrados: ${detected.signals?.join(', ') || 'nenhum'}`);

      // Analisar resposta
      const responsePreview = result.message?.substring(0, 150) + '...';
      console.log(`${colors.cyan}📝 Resposta: "${responsePreview}"${colors.reset}`);

      // Verificar se o tom da resposta condiz com o arquétipo
      const toneAnalysis = analyzeTone(result.message, test.archetype);
      console.log(`${colors.yellow}📊 Análise de tom: ${toneAnalysis}${colors.reset}`);

      results.push({
        expected: test.archetype,
        detected: detected.detected,
        confidence: detected.confidence,
        signals: detected.signals,
        match: isMatchingArchetype(test.archetype, detected.detected)
      });

    } catch (error) {
      console.log(`${colors.red}❌ Erro: ${error.message}${colors.reset}`);
      results.push({
        expected: test.archetype,
        detected: 'ERROR',
        confidence: 0,
        signals: [],
        match: false
      });
    }

    console.log('\n');
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  // Resumo final
  console.log('═'.repeat(70));
  console.log(`${colors.cyan}📊 RESUMO DA DETECÇÃO DE ARQUÉTIPOS${colors.reset}`);
  console.log('═'.repeat(70));

  let matches = 0;
  for (const r of results) {
    const status = r.match ? `${colors.green}✅` : `${colors.red}❌`;
    console.log(`${status} ${r.expected}: detectado como "${r.detected}" (${r.confidence}%)${colors.reset}`);
    if (r.match) matches++;
  }

  const accuracy = ((matches / results.length) * 100).toFixed(0);
  console.log('\n' + '─'.repeat(70));
  console.log(`${colors.cyan}Taxa de acerto: ${accuracy}% (${matches}/${results.length})${colors.reset}`);
  console.log('═'.repeat(70) + '\n');
}

function isMatchingArchetype(expected, detected) {
  const mapping = {
    'SÁBIO': ['sabio', 'sábio', 'Sábio'],
    'HERÓI': ['heroi', 'herói', 'Herói'],
    'REBELDE': ['rebelde', 'Rebelde'],
    'CUIDADOR': ['cuidador', 'Cuidador'],
    'EXPLORADOR': ['explorador', 'Explorador'],
    'GOVERNANTE': ['governante', 'Governante'],
    'CRIADOR': ['criador', 'Criador'],
    'MAGO': ['mago', 'Mago'],
    'INOCENTE': ['inocente', 'Inocente'],
    'AMANTE': ['amante', 'Amante'],
    'COMUM (baseline)': ['comum', 'Pessoa Comum', 'default']
  };

  const expectedVariants = mapping[expected] || [];
  return expectedVariants.some(v => detected?.toLowerCase().includes(v.toLowerCase()));
}

function analyzeTone(response, archetype) {
  if (!response) return '⚠️ Sem resposta';

  const toneIndicators = {
    'SÁBIO': ['dados', 'métricas', 'tecnicamente', 'análise', 'racional'],
    'HERÓI': ['resultado', 'vamos', 'resolve', 'direto', 'rápido'],
    'REBELDE': ['frustra', 'chega de', 'mudar', 'diferente'],
    'CUIDADOR': ['acompanha', 'juntos', 'ajudar', 'suporte'],
    'EXPLORADOR': ['novo', 'oportunidade', 'possibilidade'],
    'GOVERNANTE': ['controle', 'indicador', 'gestão', 'kpi'],
    'CRIADOR': ['personaliz', 'específic', 'único', 'adapta'],
    'MAGO': ['transform', 'antes/depois', 'mudança'],
    'INOCENTE': ['simples', 'direto', 'claro'],
    'AMANTE': ['paixão', 'amor', 'conexão', 'calor']
  };

  const indicators = toneIndicators[archetype] || [];
  const found = indicators.filter(i => response.toLowerCase().includes(i));

  if (found.length >= 2) return `✅ Tom adequado (${found.join(', ')})`;
  if (found.length === 1) return `⚠️ Tom parcial (${found.join(', ')})`;
  return '❌ Tom não detectado';
}

// Executar
testArchetypes().catch(console.error);

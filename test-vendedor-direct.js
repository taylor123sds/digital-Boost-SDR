/**
 * Teste direto do agente vendedor - sem WhatsApp
 * Mostra as respostas reais do GPT para cada cenário
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

// Cenários de teste
const SCENARIOS = [
  {
    name: '1️⃣ PRIMEIRO CONTATO',
    message: 'Oi',
    expectation: 'Pergunta sobre captação de orçamentos'
  },
  {
    name: '2️⃣ RESPOSTA SOBRE INDICAÇÃO',
    message: 'A gente trabalha mais com indicação mesmo, às vezes instagram',
    expectation: 'Espelhar indicação + pergunta sobre irregularidade'
  },
  {
    name: '3️⃣ MENCIONOU DOR (mês ruim)',
    message: 'Sim, tem mês que é ótimo e tem mês que a gente fica parado esperando',
    expectation: 'Espelhar a dor + amplificar impacto'
  },
  {
    name: '4️⃣ PERGUNTA SOBRE PREÇO',
    message: 'Quanto custa isso?',
    expectation: 'Range R$1.500-5.000 + comparação com projeto solar'
  },
  {
    name: '5️⃣ OFF-TOPIC: PERGUNTA SOBRE MÃE',
    message: 'E aí, como tá sua mãe?',
    expectation: 'Redirect educado + volta ao fluxo'
  },
  {
    name: '6️⃣ OFF-TOPIC: FUTEBOL',
    message: 'Você viu o jogo ontem?',
    expectation: 'Redirect educado + volta ao fluxo'
  },
  {
    name: '7️⃣ OBJEÇÃO: VOU PENSAR',
    message: 'Deixa eu pensar e te falo depois',
    expectation: 'Handler de objeção + entender dúvida'
  },
  {
    name: '8️⃣ INTERESSE CLARO',
    message: 'Faz sentido sim, quero entender melhor como funciona',
    expectation: 'CTA firme com 2 opções de horário'
  },
  {
    name: '9️⃣ ACEITA AGENDAR',
    message: 'Quinta funciona pra mim',
    expectation: 'Confirmar horário específico'
  }
];

function analyzeResponse(response, scenario) {
  const checks = [];
  const responseLower = response.toLowerCase();

  // Verificar proibições
  const forbidden = ['entendo', 'entendi', 'perfeito', 'ótimo', 'legal'];
  const startsWithForbidden = forbidden.some(f => responseLower.startsWith(f));

  if (startsWithForbidden) {
    checks.push(`${colors.red}❌ Começa com palavra proibida${colors.reset}`);
  } else {
    checks.push(`${colors.green}✅ Não começa com palavra proibida${colors.reset}`);
  }

  // Verificar tamanho
  const lines = response.split('\n').filter(l => l.trim());
  if (lines.length <= 5) {
    checks.push(`${colors.green}✅ Tamanho OK (${lines.length} linhas)${colors.reset}`);
  } else {
    checks.push(`${colors.yellow}⚠️ Mensagem longa (${lines.length} linhas)${colors.reset}`);
  }

  // Verificar se termina com pergunta
  const hasQuestion = response.includes('?');
  if (hasQuestion) {
    checks.push(`${colors.green}✅ Contém pergunta${colors.reset}`);
  } else {
    checks.push(`${colors.yellow}⚠️ Sem pergunta no final${colors.reset}`);
  }

  // Verificações específicas por cenário
  if (scenario.name.includes('PREÇO')) {
    if (response.includes('1.500') || response.includes('5.000') || response.includes('R$')) {
      checks.push(`${colors.green}✅ Menciona range de preço${colors.reset}`);
    } else {
      checks.push(`${colors.red}❌ Não menciona preço${colors.reset}`);
    }
  }

  if (scenario.name.includes('OFF-TOPIC')) {
    if (responseLower.includes('voltando') || responseLower.includes('canal digital') ||
        responseLower.includes('orçamento') || responseLower.includes('captação')) {
      checks.push(`${colors.green}✅ Redireciona para o fluxo${colors.reset}`);
    } else {
      checks.push(`${colors.yellow}⚠️ Verificar se voltou ao fluxo${colors.reset}`);
    }
  }

  if (scenario.name.includes('AGENDAR') || scenario.name.includes('INTERESSE')) {
    if (response.includes('terça') || response.includes('quinta') ||
        response.includes('horário') || response.includes('diagnóstico')) {
      checks.push(`${colors.green}✅ Propõe agendamento${colors.reset}`);
    }
  }

  return checks.join('\n');
}

async function runTest() {
  console.log('\n' + '═'.repeat(70));
  console.log(`${colors.cyan}🧪 TESTE DIRETO DO AGENTE VENDEDOR${colors.reset}`);
  console.log(`${colors.yellow}   Usando DynamicConsultativeEngine diretamente${colors.reset}`);
  console.log('═'.repeat(70) + '\n');

  // Criar instância do engine
  const testContactId = `test_${Date.now()}`;
  const engine = new DynamicConsultativeEngine(testContactId);

  // Configurar arquétipo inicial (pessoa comum)
  engine.setArchetype('comum');

  for (let i = 0; i < SCENARIOS.length; i++) {
    const scenario = SCENARIOS[i];

    console.log('─'.repeat(70));
    console.log(`${colors.magenta}${scenario.name}${colors.reset}`);
    console.log(`${colors.yellow}Expectativa: ${scenario.expectation}${colors.reset}`);
    console.log('─'.repeat(70));

    // Mensagem do lead
    console.log(`${colors.blue}👤 LEAD: "${scenario.message}"${colors.reset}`);
    console.log(`${colors.yellow}⏳ Gerando resposta...${colors.reset}`);

    try {
      // Processar turno
      const result = await engine.processMessage(scenario.message);

      if (result && result.message) {
        console.log(`${colors.green}🤖 TAYLOR: "${result.message}"${colors.reset}`);

        // Análise da resposta
        console.log(`\n${colors.cyan}📊 ANÁLISE:${colors.reset}`);
        console.log(analyzeResponse(result.message, scenario));

        // Info do engine
        if (result.stage) {
          console.log(`${colors.cyan}📍 Stage: ${result.stage}${colors.reset}`);
        }
        if (result.progress !== undefined) {
          console.log(`${colors.cyan}📈 Progresso: ${result.progress}%${colors.reset}`);
        }
      } else {
        console.log(`${colors.red}❌ Sem resposta gerada${colors.reset}`);
        console.log('Result:', JSON.stringify(result, null, 2));
      }
    } catch (error) {
      console.log(`${colors.red}❌ Erro: ${error.message}${colors.reset}`);
    }

    console.log('\n');

    // Pausa entre cenários
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('═'.repeat(70));
  console.log(`${colors.cyan}✅ TESTE COMPLETO${colors.reset}`);
  console.log('═'.repeat(70) + '\n');
}

// Executar
runTest().catch(console.error);

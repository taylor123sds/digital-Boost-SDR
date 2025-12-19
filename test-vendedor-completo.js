/**
 * Teste completo do agente vendedor
 * Simula uma conversa real com vários cenários
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3001';
const TEST_PHONE = '5584988887777'; // Número de teste

// Cores para output
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
    expectation: 'Intro com gancho + gatilho + permissão + opt-out'
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

async function sendMessage(phone, text, messageId) {
  const timestamp = Math.floor(Date.now() / 1000);

  const payload = {
    event: 'messages.upsert',
    instance: 'digitalboost',
    data: {
      key: {
        remoteJid: `${phone}@s.whatsapp.net`,
        fromMe: false,
        id: messageId
      },
      message: {
        conversation: text
      },
      messageTimestamp: timestamp,
      pushName: 'Lead Teste'
    }
  };

  try {
    const response = await fetch(`${BASE_URL}/api/webhook/evolution`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    return await response.json();
  } catch (error) {
    console.error(`${colors.red}Erro ao enviar:${colors.reset}`, error.message);
    return null;
  }
}

async function getAgentResponse(phone) {
  // Aguardar processamento
  await new Promise(resolve => setTimeout(resolve, 4000));

  try {
    // Buscar última mensagem do agente no histórico
    const response = await fetch(`${BASE_URL}/api/admin/conversation/${phone}`);
    if (!response.ok) return null;

    const data = await response.json();
    const messages = data.messages || [];

    // Pegar última mensagem do agente
    const agentMessages = messages.filter(m => m.role === 'assistant');
    return agentMessages.length > 0 ? agentMessages[agentMessages.length - 1].content : null;
  } catch (error) {
    return null;
  }
}

async function resetLead(phone) {
  try {
    await fetch(`${BASE_URL}/api/admin/leads/${phone}`, { method: 'DELETE' });
    console.log(`${colors.yellow}🔄 Lead resetado${colors.reset}\n`);
  } catch (e) {
    // Ignora se não existir
  }
}

async function runTest() {
  console.log('\n' + '═'.repeat(70));
  console.log(`${colors.cyan}🧪 TESTE DO AGENTE VENDEDOR - SIMULAÇÃO COMPLETA${colors.reset}`);
  console.log('═'.repeat(70) + '\n');

  // Resetar lead antes do teste
  await resetLead(TEST_PHONE);

  for (let i = 0; i < SCENARIOS.length; i++) {
    const scenario = SCENARIOS[i];
    const messageId = `TEST_${Date.now()}_${i}`;

    console.log('─'.repeat(70));
    console.log(`${colors.magenta}${scenario.name}${colors.reset}`);
    console.log(`${colors.yellow}Expectativa: ${scenario.expectation}${colors.reset}`);
    console.log('─'.repeat(70));

    // Mensagem do lead
    console.log(`${colors.blue}👤 LEAD: "${scenario.message}"${colors.reset}`);

    // Enviar mensagem
    await sendMessage(TEST_PHONE, scenario.message, messageId);

    // Aguardar resposta do GPT
    console.log(`${colors.yellow}⏳ Aguardando resposta...${colors.reset}`);
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Buscar resposta
    const agentResponse = await getAgentResponse(TEST_PHONE);

    if (agentResponse) {
      console.log(`${colors.green}🤖 TAYLOR: "${agentResponse}"${colors.reset}`);

      // Análise básica da resposta
      const analysis = analyzeResponse(agentResponse, scenario);
      console.log(`\n${colors.cyan}📊 ANÁLISE:${colors.reset}`);
      console.log(analysis);
    } else {
      console.log(`${colors.red}❌ Sem resposta capturada (verificar logs do servidor)${colors.reset}`);
    }

    console.log('\n');

    // Pausa entre cenários
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('═'.repeat(70));
  console.log(`${colors.cyan}✅ TESTE COMPLETO${colors.reset}`);
  console.log('═'.repeat(70) + '\n');
}

function analyzeResponse(response, scenario) {
  const checks = [];
  const responseLower = response.toLowerCase();

  // Verificar proibições
  const forbidden = ['entendo', 'entendi', 'perfeito', 'ótimo', 'legal'];
  const startsWithForbidden = forbidden.some(f => responseLower.startsWith(f));

  if (startsWithForbidden) {
    checks.push(`❌ Começa com palavra proibida`);
  } else {
    checks.push(`✅ Não começa com palavra proibida`);
  }

  // Verificar tamanho
  const lines = response.split('\n').filter(l => l.trim());
  if (lines.length <= 5) {
    checks.push(`✅ Tamanho OK (${lines.length} linhas)`);
  } else {
    checks.push(`⚠️ Mensagem longa (${lines.length} linhas)`);
  }

  // Verificar se termina com pergunta
  const hasQuestion = response.includes('?');
  if (hasQuestion) {
    checks.push(`✅ Contém pergunta`);
  } else {
    checks.push(`⚠️ Sem pergunta no final`);
  }

  // Verificações específicas por cenário
  if (scenario.name.includes('PREÇO')) {
    if (response.includes('1.500') || response.includes('5.000') || response.includes('R$')) {
      checks.push(`✅ Menciona range de preço`);
    } else {
      checks.push(`❌ Não menciona preço`);
    }
  }

  if (scenario.name.includes('OFF-TOPIC')) {
    if (responseLower.includes('voltando') || responseLower.includes('canal digital') || responseLower.includes('orçamento')) {
      checks.push(`✅ Redireciona para o fluxo`);
    } else {
      checks.push(`⚠️ Verificar se voltou ao fluxo`);
    }
  }

  if (scenario.name.includes('AGENDAR') || scenario.name.includes('INTERESSE')) {
    if (response.includes('terça') || response.includes('quinta') || response.includes('horário')) {
      checks.push(`✅ Propõe agendamento`);
    }
  }

  return checks.join('\n');
}

// Executar
runTest().catch(console.error);

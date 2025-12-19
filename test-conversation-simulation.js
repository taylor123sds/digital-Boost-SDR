/**
 * @file test-conversation-simulation.js
 * @description Simulação de conversas completas para visualização
 */

import { DynamicConsultativeEngine } from './src/core/DynamicConsultativeEngine.js';
import messageUnderstanding from './src/intelligence/MessageUnderstanding.js';

// ═══════════════════════════════════════════════════════════════════════════
// CENÁRIOS DE CONVERSA
// ═══════════════════════════════════════════════════════════════════════════

const SCENARIOS = [
  {
    name: '🤖 CENÁRIO 1: Lead responde com menu automático',
    description: 'Agente recebe menu de opções de um bot',
    messages: [
      {
        from: 'lead',
        text: `Olá! Seja bem-vindo(a) à Solar Tech!

Selecione uma opção:
[ 1 ] - Orçamento
[ 2 ] - Financeiro
[ 3 ] - SAC
[ 4 ] - Engenharia`
      }
    ]
  },
  {
    name: '🔄 CENÁRIO 2: Transferência de atendimento',
    description: 'Lead é transferido para setor comercial',
    messages: [
      {
        from: 'lead',
        text: 'Só um momento, estou transferindo você para o setor comercial. Aguarde...'
      }
    ]
  },
  {
    name: '✅ CENÁRIO 3: Lead interessado',
    description: 'Lead demonstra interesse real',
    messages: [
      {
        from: 'lead',
        text: 'Olá, trabalhamos com energia solar aqui em Natal. Fazemos uns 8 projetos por mês, a maioria vem de indicação.'
      }
    ]
  },
  {
    name: '❓ CENÁRIO 4: Lead confuso',
    description: 'Lead não entende quem está falando',
    messages: [
      {
        from: 'lead',
        text: 'Quem é você? Não entendi do que você está falando.'
      }
    ]
  },
  {
    name: '❌ CENÁRIO 5: Lead não interessado',
    description: 'Lead expressa desinteresse',
    messages: [
      {
        from: 'lead',
        text: 'Não tenho interesse, obrigado. Já temos parceria com outra empresa.'
      }
    ]
  },
  {
    name: '💬 CENÁRIO 6: Conversa completa SPIN',
    description: 'Fluxo completo de qualificação',
    messages: [
      {
        from: 'lead',
        text: 'Oi, vi que vocês trabalham com marketing. Qual é a proposta?'
      },
      {
        from: 'lead',
        text: 'A gente trabalha com indicação mesmo, uns 5 projetos por mês.'
      },
      {
        from: 'lead',
        text: 'Sim, às vezes os meses são fracos porque dependemos das indicações.'
      }
    ]
  }
];

// ═══════════════════════════════════════════════════════════════════════════
// SIMULADOR DE CONVERSA
// ═══════════════════════════════════════════════════════════════════════════

async function simulateConversation(scenario) {
  console.log('\n' + '═'.repeat(80));
  console.log(scenario.name);
  console.log('─'.repeat(80));
  console.log(`📝 ${scenario.description}`);
  console.log('═'.repeat(80));

  const contactId = `sim_${Date.now()}`;
  const engine = new DynamicConsultativeEngine(contactId, {
    leadName: 'João Silva',
    empresa: 'Solar Test LTDA',
    segmento: 'energia_solar'
  });

  for (let i = 0; i < scenario.messages.length; i++) {
    const msg = scenario.messages[i];

    console.log('\n' + '─'.repeat(60));
    console.log(`📩 MENSAGEM ${i + 1} DO LEAD:`);
    console.log('─'.repeat(60));
    console.log(`"${msg.text}"`);
    console.log('─'.repeat(60));

    // Primeiro: Análise de entendimento
    console.log('\n🧠 ANÁLISE DO MessageUnderstanding:');
    const understanding = await messageUnderstanding.understand(msg.text, contactId);

    console.log(`   • Tipo: ${understanding.messageType}`);
    console.log(`   • Intenção: ${understanding.senderIntent}`);
    console.log(`   • Estado emocional: ${understanding.emotionalState}`);
    console.log(`   • É bot/automático: ${understanding.isBot ? 'SIM' : 'NÃO'}`);
    console.log(`   • Ação sugerida: ${understanding.suggestedAction}`);
    console.log(`   • Confiança: ${Math.round(understanding.confidence * 100)}%`);

    if (understanding.suggestedResponse) {
      console.log(`   • Resposta sugerida: "${understanding.suggestedResponse}"`);
    }

    // Segundo: Processamento pelo Engine
    console.log('\n⚙️ PROCESSAMENTO PELO DynamicConsultativeEngine:');

    const response = await engine.processMessage(msg.text);

    console.log(`   • Stage: ${response.stage}`);
    console.log(`   • SPIN Phase: ${engine.currentSpinStage}`);

    console.log('\n' + '─'.repeat(60));
    console.log('💬 RESPOSTA DO AGENTE:');
    console.log('─'.repeat(60));

    if (response.message) {
      // Formatar resposta bonita
      const lines = response.message.split('\n');
      for (const line of lines) {
        console.log(`   ${line}`);
      }
    } else {
      console.log('   [SILÊNCIO - Agente não responde]');
    }

    if (response.silent) {
      console.log('\n   ⏸️ AÇÃO: Aguardando silenciosamente');
    }

    if (response.optOut) {
      console.log('\n   👋 AÇÃO: Lead marcado como opt-out');
    }

    // Pausa para evitar rate limiting
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log('\n' + '═'.repeat(80));
  console.log('FIM DO CENÁRIO');
  console.log('═'.repeat(80));
}

// ═══════════════════════════════════════════════════════════════════════════
// EXECUÇÃO
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                    🎬 SIMULAÇÃO DE CONVERSAS COMPLETAS                       ║');
  console.log('║                         Sistema Inteligente ORBION                           ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝');

  // Executar apenas os primeiros 5 cenários para demonstração rápida
  for (let i = 0; i < Math.min(5, SCENARIOS.length); i++) {
    await simulateConversation(SCENARIOS[i]);

    // Pausa entre cenários
    if (i < SCENARIOS.length - 1) {
      console.log('\n⏳ Próximo cenário em 2 segundos...\n');
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                         ✅ SIMULAÇÃO CONCLUÍDA                               ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
  console.log('\n');
}

main().catch(console.error);

/**
 * @file test-specialist-flow.js
 * @description Teste do fluxo COMPLETO do Specialist Agent
 * Mostra como cada mensagem é gerada seguindo o SPIN Selling
 */

import { DynamicConsultativeEngine } from './src/core/DynamicConsultativeEngine.js';

// ═══════════════════════════════════════════════════════════════════════════
// CONVERSA DE UM LEAD REAL (após handoff do SDR)
// ═══════════════════════════════════════════════════════════════════════════

const SPECIALIST_CONVERSATION = [
  {
    turno: 1,
    contexto: 'Lead responde à primeira pergunta do Specialist sobre captação de clientes',
    leadMessage: 'A gente trabalha mais com indicação. Uns 7 projetos por mês, quando tá bom.',
    fase: 'SITUATION - Coletando dados'
  },
  {
    turno: 2,
    contexto: 'Lead confirma que usa mais Instagram que site',
    leadMessage: 'Temos um site mas tá bem abandonado. Usamos mais o Instagram mesmo.',
    fase: 'SITUATION → PROBLEM'
  },
  {
    turno: 3,
    contexto: 'Lead admite problema de sazonalidade',
    leadMessage: 'Sim, tem mês que fica bem fraco. Aí a gente fica esperando as indicações aparecerem.',
    fase: 'PROBLEM - Dor identificada'
  },
  {
    turno: 4,
    contexto: 'Lead confirma impacto financeiro',
    leadMessage: 'É complicado. Quando não vem projeto, os custos continuam rodando. Às vezes tenho que tirar do próprio bolso.',
    fase: 'PROBLEM → IMPLICATION'
  },
  {
    turno: 5,
    contexto: 'Lead expressa frustração com a situação',
    leadMessage: 'Já perdi bons instaladores porque não conseguia garantir trabalho todo mês. É uma dor de cabeça.',
    fase: 'IMPLICATION - Amplificando dor'
  },
  {
    turno: 6,
    contexto: 'Lead pergunta sobre solução',
    leadMessage: 'E como vocês podem ajudar com isso? O que vocês fazem exatamente?',
    fase: 'IMPLICATION → NEED-PAYOFF'
  },
  {
    turno: 7,
    contexto: 'Lead demonstra interesse em saber mais',
    leadMessage: 'Interessante. E quanto isso custa? Qual o investimento?',
    fase: 'NEED-PAYOFF - Qualificado'
  },
  {
    turno: 8,
    contexto: 'Lead quer entender melhor a proposta',
    leadMessage: 'Faz sentido. Vou conversar com meu sócio. Dá pra agendar uma reunião pra vocês mostrarem melhor?',
    fase: 'HANDOFF → SCHEDULER'
  }
];

// ═══════════════════════════════════════════════════════════════════════════
// FUNÇÃO PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

async function testSpecialistFlow() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║             💼 FLUXO COMPLETO DO SPECIALIST AGENT                            ║');
  console.log('║                    Metodologia SPIN Selling                                   ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝');

  // Criar engine simulando handoff do SDR
  const contactId = `specialist_test_${Date.now()}`;
  const engine = new DynamicConsultativeEngine(contactId, {
    leadName: 'Marcos',
    empresa: 'Sol Energia LTDA',
    segmento: 'energia_solar',
    cidade: 'Recife',
    estado: 'PE'
  });

  // Configurar arquétipo (como viria do SDR)
  engine.setArchetype('heroi'); // Exemplo: arquétipo detectado

  console.log('\n📋 CONFIGURAÇÃO INICIAL:');
  console.log('   Lead: Marcos - Sol Energia LTDA');
  console.log('   Cidade: Recife/PE');
  console.log('   Arquétipo: Herói');
  console.log('   Engine: DynamicConsultativeEngine v3 SPIN');

  const responses = [];

  for (const turn of SPECIALIST_CONVERSATION) {
    console.log('\n');
    console.log('═'.repeat(80));
    console.log(`📍 TURNO ${turn.turno} | ${turn.fase}`);
    console.log('═'.repeat(80));

    console.log(`\n📝 Contexto: ${turn.contexto}`);

    console.log('\n┌──────────────────────────────────────────────────────────────────────────────┐');
    console.log(`│ 👤 LEAD: "${turn.leadMessage}"`);
    console.log('└──────────────────────────────────────────────────────────────────────────────┘');

    // Processar mensagem pelo Engine
    const result = await engine.processMessage(turn.leadMessage);

    // Mostrar estado atual do SPIN
    console.log('\n📊 ESTADO DO ENGINE:');
    console.log(`   SPIN Stage: ${engine.currentSpinStage || 'situation'}`);
    console.log(`   Progress: ${result.progress || 0}%`);
    console.log(`   Ready for Scheduling: ${result.readyForScheduling ? 'SIM ✅' : 'NÃO'}`);

    // Mostrar BANT coletado
    const bant = engine.bantQualification || {};
    if (Object.keys(bant).length > 0) {
      console.log(`   BANT Tracking: ${JSON.stringify(bant).substring(0, 60)}...`);
    }

    // Mostrar resposta gerada
    console.log('\n┌──────────────────────────────────────────────────────────────────────────────┐');
    console.log('│ 🤖 AGENTE ORBION:');
    console.log('├──────────────────────────────────────────────────────────────────────────────┤');

    if (result.message) {
      // Formatar resposta em linhas
      const lines = result.message.split('\n');
      for (const line of lines) {
        if (line.trim()) {
          console.log(`│   ${line}`);
        }
      }
    } else {
      console.log('│   [Sem resposta gerada]');
    }

    console.log('└──────────────────────────────────────────────────────────────────────────────┘');

    // Guardar para análise
    responses.push({
      turno: turn.turno,
      fase: turn.fase,
      leadMessage: turn.leadMessage,
      agentResponse: result.message,
      spinStage: engine.currentSpinStage,
      progress: result.progress,
      readyForScheduling: result.readyForScheduling
    });

    // Verificar se deve fazer handoff
    if (result.readyForScheduling) {
      console.log('\n🎯 HANDOFF TRIGGER: Lead qualificado para agendamento!');
    }

    // Pausa para rate limiting
    await new Promise(r => setTimeout(r, 2500));
  }

  // Resumo final
  console.log('\n\n');
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                         📊 RESUMO DO FLUXO                                   ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝');

  console.log('\n📈 PROGRESSÃO SPIN:');
  for (const r of responses) {
    const progress = r.progress || 0;
    const bar = '█'.repeat(Math.floor(progress / 10)) + '░'.repeat(10 - Math.floor(progress / 10));
    console.log(`   Turno ${r.turno}: [${bar}] ${progress}% | ${r.spinStage || 'situation'}`);
  }

  console.log('\n💬 TODAS AS MENSAGENS DO AGENTE:');
  console.log('─'.repeat(80));

  for (const r of responses) {
    console.log(`\n[TURNO ${r.turno}] ${r.fase}`);
    console.log(`Lead: "${r.leadMessage.substring(0, 50)}..."`);
    console.log(`Agente: "${r.agentResponse?.substring(0, 100) || '[sem resposta]'}..."`);
  }

  console.log('\n' + '═'.repeat(80));
  console.log('✅ TESTE DO SPECIALIST FLOW CONCLUÍDO');
  console.log('═'.repeat(80));
}

testSpecialistFlow().catch(console.error);

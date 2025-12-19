/**
 * @file test-full-flow.js
 * @description Teste de fluxo completo - conversa real com múltiplas trocas
 */

import { DynamicConsultativeEngine } from './src/core/DynamicConsultativeEngine.js';
import messageUnderstanding from './src/intelligence/MessageUnderstanding.js';

// ═══════════════════════════════════════════════════════════════════════════
// CONVERSA COMPLETA REALISTA
// ═══════════════════════════════════════════════════════════════════════════

const FULL_CONVERSATION = [
  {
    turn: 1,
    leadMessage: `Olá! Seja bem-vindo à Solar Nordeste!

Selecione uma opção:
[ 1 ] - Orçamento
[ 2 ] - Suporte
[ 3 ] - Outros`,
    expectedBehavior: 'Detectar menu e selecionar opção de orçamento/vendas'
  },
  {
    turn: 2,
    leadMessage: 'Aguarde, estou transferindo para o setor comercial...',
    expectedBehavior: 'Detectar transferência e AGUARDAR em silêncio'
  },
  {
    turn: 3,
    leadMessage: 'Oi, aqui é o Carlos do comercial. Em que posso ajudar?',
    expectedBehavior: 'Detectar humano e iniciar abordagem consultiva'
  },
  {
    turn: 4,
    leadMessage: 'Sim, trabalhamos com energia solar. Fazemos uns 6 projetos por mês, a maioria vem de indicação dos clientes.',
    expectedBehavior: 'Detectar interesse, capturar dados BANT, avançar SPIN para Problem'
  },
  {
    turn: 5,
    leadMessage: 'Às vezes sim, tem mês que fica fraco. A gente depende muito das indicações.',
    expectedBehavior: 'Identificar dor/problema, aprofundar com Implication'
  },
  {
    turn: 6,
    leadMessage: 'É, quando fica fraco a equipe fica parada e os custos continuam. Já pensamos em fazer algo diferente.',
    expectedBehavior: 'Detectar problema claro, avançar para Need-Payoff'
  },
  {
    turn: 7,
    leadMessage: 'Seria bom ter algo mais previsível. Quanto custa esse serviço de vocês?',
    expectedBehavior: 'Detectar interesse em preço, preparar para handoff ao Specialist'
  }
];

// ═══════════════════════════════════════════════════════════════════════════
// SIMULADOR
// ═══════════════════════════════════════════════════════════════════════════

async function runFullFlowTest() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║            🎯 TESTE DE FLUXO COMPLETO - CONVERSA REALISTA                    ║');
  console.log('║                  Verificando se o agente segue o SPIN                        ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝');

  const contactId = `flow_test_${Date.now()}`;
  const engine = new DynamicConsultativeEngine(contactId, {
    leadName: 'Carlos',
    empresa: 'Solar Nordeste',
    segmento: 'energia_solar'
  });

  const results = [];

  for (const turn of FULL_CONVERSATION) {
    console.log('\n' + '═'.repeat(80));
    console.log(`📍 TURNO ${turn.turn}`);
    console.log('═'.repeat(80));

    console.log('\n📩 LEAD DIZ:');
    console.log('─'.repeat(60));
    console.log(turn.leadMessage);
    console.log('─'.repeat(60));

    console.log(`\n🎯 COMPORTAMENTO ESPERADO: ${turn.expectedBehavior}`);

    // Análise de entendimento
    console.log('\n🧠 ANÁLISE INTELIGENTE:');
    const understanding = await messageUnderstanding.understand(turn.leadMessage, contactId);

    const analysisInfo = {
      tipo: understanding.messageType,
      intencao: understanding.senderIntent?.substring(0, 50) + '...',
      emocional: understanding.emotionalState,
      isBot: understanding.isBot,
      acao: understanding.suggestedAction,
      confianca: Math.round(understanding.confidence * 100) + '%'
    };

    console.log(`   Tipo: ${analysisInfo.tipo} | Emocional: ${analysisInfo.emocional}`);
    console.log(`   É bot: ${analysisInfo.isBot ? 'SIM' : 'NÃO'} | Ação: ${analysisInfo.acao}`);
    console.log(`   Intenção: ${analysisInfo.intencao}`);

    // Processamento pelo Engine
    console.log('\n⚙️ PROCESSAMENTO:');
    const response = await engine.processMessage(turn.leadMessage);

    const spinStage = engine.currentSpinStage || 'N/A';
    const bantData = engine.bantQualification || {};

    console.log(`   SPIN Stage: ${spinStage}`);
    console.log(`   Response Stage: ${response.stage}`);

    if (Object.keys(bantData).length > 0) {
      console.log(`   BANT Capturado: ${JSON.stringify(bantData).substring(0, 80)}...`);
    }

    console.log('\n💬 RESPOSTA DO AGENTE:');
    console.log('─'.repeat(60));

    if (response.message) {
      console.log(response.message);
    } else {
      console.log('[SILÊNCIO - Agente aguarda]');
    }
    console.log('─'.repeat(60));

    // Avaliar se comportamento foi correto
    let passed = true;
    let reason = '';

    if (turn.turn === 1) {
      // Menu - deve detectar e responder
      passed = understanding.isMenu || understanding.messageType === 'menu';
      reason = passed ? 'Menu detectado corretamente' : 'FALHOU em detectar menu';
    } else if (turn.turn === 2) {
      // Transferência - deve aguardar
      passed = understanding.messageType === 'transfer' || response.silent;
      reason = passed ? 'Transferência detectada, aguardou' : 'FALHOU em detectar transferência';
    } else if (turn.turn === 3) {
      // Humano - deve iniciar conversa
      passed = understanding.isHuman && response.message && response.message.length > 20;
      reason = passed ? 'Humano detectado, iniciou conversa' : 'FALHOU em iniciar conversa';
    } else if (turn.turn === 4) {
      // Interesse - deve capturar dados
      passed = spinStage === 'problem' || response.stage?.includes('problem');
      reason = passed ? 'Avançou para Problem, dados capturados' : `SPIN stage: ${spinStage}`;
    } else if (turn.turn === 5) {
      // Problema - deve aprofundar
      passed = response.message && response.message.length > 50;
      reason = passed ? 'Aprofundou no problema' : 'Resposta muito curta';
    } else if (turn.turn === 6) {
      // Implicação - deve avançar
      passed = spinStage === 'implication' || spinStage === 'need_payoff' || response.message?.length > 30;
      reason = passed ? `Avançou para ${spinStage}` : 'Não avançou no SPIN';
    } else if (turn.turn === 7) {
      // Preço - deve preparar handoff
      passed = response.message && (
        response.message.toLowerCase().includes('reunião') ||
        response.message.toLowerCase().includes('conversa') ||
        response.message.toLowerCase().includes('mostrar') ||
        response.message.toLowerCase().includes('especialista') ||
        response.stage === 'handoff' ||
        response.readyForHandoff
      );
      reason = passed ? 'Preparou para handoff/reunião' : 'Não direcionou para próximo passo';
    }

    const statusIcon = passed ? '✅' : '❌';
    console.log(`\n${statusIcon} AVALIAÇÃO: ${reason}`);

    results.push({
      turn: turn.turn,
      passed,
      reason,
      spinStage,
      responseStage: response.stage
    });

    // Pausa para evitar rate limiting
    await new Promise(r => setTimeout(r, 2000));
  }

  // Resumo final
  console.log('\n\n' + '═'.repeat(80));
  console.log('📊 RESUMO DO FLUXO COMPLETO');
  console.log('═'.repeat(80));

  const passedCount = results.filter(r => r.passed).length;
  const totalCount = results.length;

  console.log('\n| Turno | Status | SPIN Stage | Avaliação |');
  console.log('|-------|--------|------------|-----------|');

  for (const r of results) {
    const status = r.passed ? '✅' : '❌';
    console.log(`| ${r.turn}     | ${status}     | ${r.spinStage.padEnd(10)} | ${r.reason.substring(0, 30)}... |`);
  }

  console.log('\n' + '─'.repeat(80));
  console.log(`RESULTADO FINAL: ${passedCount}/${totalCount} turnos passaram`);

  if (passedCount === totalCount) {
    console.log('\n✅ FLUXO COMPLETO FUNCIONANDO CORRETAMENTE!');
    console.log('   O agente segue o SPIN de forma inteligente e adaptativa.');
  } else {
    console.log('\n⚠️ ALGUNS TURNOS PRECISAM DE AJUSTES');
    const failed = results.filter(r => !r.passed);
    for (const f of failed) {
      console.log(`   - Turno ${f.turn}: ${f.reason}`);
    }
  }

  console.log('\n' + '═'.repeat(80));
}

runFullFlowTest().catch(console.error);

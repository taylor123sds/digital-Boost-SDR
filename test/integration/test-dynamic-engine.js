/**
 * Teste do DynamicConsultativeEngine v4 - Solar Integrators
 *
 * Arquitetura: Planner (rígido) + Writer (livre) + Checker
 * Foco: Canal Digital de Orçamento para Integradoras de Energia Solar
 */

import { DynamicConsultativeEngine } from './src/core/DynamicConsultativeEngine.js';
import dotenv from 'dotenv';

dotenv.config();

async function testSolarEngine() {
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('   TESTE: DynamicConsultativeEngine v4 (Solar Integrators)');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  const engine = new DynamicConsultativeEngine('5584999999999');

  // Simular conversa com integradora solar
  const mensagens = [
    // Turno 1: Apresentação
    'Oi, vi vocês no Instagram. Sou da Solar Norte, aqui de Natal',

    // Turno 2: Situação atual
    'Não temos site não, só o Instagram mesmo. Os clientes vêm mais por indicação',

    // Turno 3: Caminho do orçamento
    'Ah, é tudo indicação mesmo. Às vezes aparece alguém pelo Insta perguntando',

    // Turno 4: Dor
    'Tem mês que tá bom, mês que tá fraco. Quando as indicações caem, fica complicado',

    // Turno 5: Timing
    'Queria estruturar isso logo, antes do verão que é a época boa de venda',
  ];

  for (const msg of mensagens) {
    console.log('\n' + '─'.repeat(70));
    console.log(`   LEAD: "${msg}"`);
    console.log('─'.repeat(70));

    const result = await engine.processMessage(msg);

    console.log(`\n   AGENTE: "${result.message}"`);
    console.log(`\n   Progresso: ${result.progress?.percentComplete}%`);
    console.log(`   Fase: ${result.stage}`);
    console.log(`   Pronto pra agendar: ${result.readyForScheduling}`);

    // Mostrar arquétipo detectado
    if (result.archetype) {
      console.log(`\n   ARQUÉTIPO DETECTADO:`);
      console.log(`   → Nome: ${result.archetype.detected}`);
      console.log(`   → Confiança: ${result.archetype.confidence}%`);
      if (result.archetype.signals?.length > 0) {
        console.log(`   → Sinais: ${result.archetype.signals.join(', ')}`);
      }
    }

    if (result.plan) {
      console.log(`\n   PLANNER DECIDIU:`);
      console.log(`   → Next slot: ${result.plan.nextSlot}`);
      console.log(`   → Pergunta: "${result.plan.nextQuestion}"`);
      console.log(`   → Tom: ${result.plan.toneDirectives?.join(', ')}`);
    }

    // Esperar um pouco entre mensagens
    await new Promise(r => setTimeout(r, 1500));
  }

  console.log('\n' + '═'.repeat(70));
  console.log('   RESUMO FINAL BANT SOLAR:');
  console.log('═'.repeat(70));
  console.log(JSON.stringify(engine.getBANTSummary(), null, 2));

  console.log('\n' + '═'.repeat(70));
  console.log('   ARQUÉTIPO FINAL:');
  console.log('═'.repeat(70));
  const archetype = engine.getArchetype();
  console.log(JSON.stringify({
    key: archetype.key,
    name: archetype.name,
    confidence: archetype.confidence
  }, null, 2));

  console.log('\n   Teste concluído!');
}

// Teste específico de slots solares
async function testSolarSlots() {
  console.log('\n\n═══════════════════════════════════════════════════════════════════');
  console.log('   TESTE DE DETECÇÃO DE SLOTS SOLARES');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  const testCases = [
    { msg: 'Não temos site, só Instagram mesmo', slot: 'need_presenca_digital', expected: 'so_instagram' },
    { msg: 'Os clientes vêm tudo por indicação', slot: 'need_caminho_orcamento', expected: 'indicacao' },
    { msg: 'Atendemos Natal e região metropolitana', slot: 'need_regiao', expected: 'natal_regiao' },
    { msg: 'Fazemos uns 5 projetos por mês', slot: 'need_volume', expected: '5_projetos_mes' },
    { msg: 'Projeto médio de 30 mil', slot: 'need_ticket', expected: '30k' },
    { msg: 'Nosso diferencial é o financiamento próprio', slot: 'need_diferencial', expected: 'financiamento' },
    { msg: 'Preciso disso logo, antes do verão', slot: 'timing_prazo', expected: 'urgente' },
    { msg: 'Eu decido junto com meu sócio', slot: 'authority_decisor', expected: 'com_socio' },
    { msg: 'Quero algo simples, só uma página de orçamento', slot: 'budget_escopo', expected: 'simples' },
  ];

  for (const test of testCases) {
    const engine = new DynamicConsultativeEngine('test_solar');

    console.log(`📝 "${test.msg.substring(0, 50)}..."`);
    console.log(`   Slot esperado: ${test.slot} = ${test.expected}`);

    await engine.processMessage(test.msg);
    const summary = engine.getBANTSummary();

    console.log(`   Resultado: ${JSON.stringify(summary, null, 2).substring(0, 100)}...\n`);
  }
}

// Teste de objeções solares
async function testSolarObjections() {
  console.log('\n\n═══════════════════════════════════════════════════════════════════');
  console.log('   TESTE DE OBJEÇÕES SOLARES');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  const objections = [
    'Já tenho Instagram, acho que não preciso de site',
    'Já tive site antes e não deu retorno',
    'Não tenho tempo pra ficar cuidando de site',
    'Tá caro, não tenho budget pra isso agora',
    'Já tenho uma agência que cuida do meu marketing',
  ];

  for (const objection of objections) {
    const engine = new DynamicConsultativeEngine('test_objection');

    // Primeiro uma mensagem normal pra contexto
    await engine.processMessage('Oi, sou da Solar Norte');

    console.log(`\n💬 OBJEÇÃO: "${objection}"`);

    const result = await engine.processMessage(objection);

    console.log(`🤖 RESPOSTA: "${result.message}"\n`);
    console.log('─'.repeat(60));

    await new Promise(r => setTimeout(r, 1000));
  }
}

// Executar testes
testSolarEngine()
  .then(() => testSolarSlots())
  .then(() => testSolarObjections())
  .catch(console.error);

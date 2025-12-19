/**
 * 🧪 TESTE COMPLETO DE DETECÇÃO DE BOTS
 *
 * Simula 4 cenários realistas:
 * 1. BOT COM RESPOSTAS INSTANTÂNEAS (< 1s)
 * 2. BOT COM MENSAGENS DE MENU
 * 3. HUMANO REAL (tempos variados, linguagem natural)
 * 4. CASO AMBÍGUO (rápido mas com variação)
 */

import webhookHandler from '../src/handlers/webhook_handler.js';
import { trackMessageTiming, isProbableBot, clearBotTracking } from '../src/utils/bot_detector.js';
import messageTimingStore from '../src/utils/message_timing_store.js';

console.log('\n🧪 ========== TESTE DE DETECÇÃO DE BOTS ==========\n');

// Função auxiliar para simular delay
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Função para simular webhook de mensagem
function createWebhook(phone, text, fromMe = false) {
  return {
    event: 'messages.upsert',
    instance: 'orbion',
    data: {
      key: {
        remoteJid: `${phone}@s.whatsapp.net`,
        fromMe: fromMe,
        id: `MSG_${Date.now()}_${Math.random()}`
      },
      pushName: `Teste ${phone}`,
      message: {
        conversation: text
      }
    }
  };
}

// ============================================================================
// CENÁRIO 1: BOT AUTO-RESPONDER (respostas instantâneas < 1s)
// ============================================================================
async function scenario1_BotInstantResponses() {
  console.log('📋 ===== CENÁRIO 1: BOT AUTO-RESPONDER (Respostas Instantâneas) =====\n');

  const PHONE = '5584111111111';
  clearBotTracking(PHONE);
  messageTimingStore.clearAll();

  console.log('🤖 Simulando bot que responde INSTANTANEAMENTE (<500ms)\n');

  // ORBION envia mensagem
  messageTimingStore.recordOutgoingMessage(PHONE);
  console.log('[ORBION] Enviou: "Olá! Sou ORBION. Como posso ajudar?"');
  await sleep(100); // Bot responde em 100ms

  // Bot responde INSTANTANEAMENTE
  const msg1 = createWebhook(PHONE, '1');
  const result1 = await webhookHandler.handleWebhook(msg1);
  console.log(`[BOT] Respondeu em ~100ms: "${msg1.data.message.conversation}"`);
  console.log(`   Status: ${result1.status} | Bot detectado: ${result1.botDetected || false}\n`);

  if (result1.status === 'valid') {
    // Segunda mensagem instantânea
    messageTimingStore.recordOutgoingMessage(PHONE);
    await sleep(200); // 200ms

    const msg2 = createWebhook(PHONE, 'Olá, como posso ajudar?');
    const result2 = await webhookHandler.handleWebhook(msg2);
    console.log(`[BOT] Respondeu em ~200ms: "${msg2.data.message.conversation}"`);
    console.log(`   Status: ${result2.status} | Bot detectado: ${result2.botDetected || false}\n`);

    if (result2.status === 'valid') {
      // Terceira mensagem instantânea
      messageTimingStore.recordOutgoingMessage(PHONE);
      await sleep(300); // 300ms

      const msg3 = createWebhook(PHONE, 'Digite 1 para falar com atendente');
      const result3 = await webhookHandler.handleWebhook(msg3);
      console.log(`[BOT] Respondeu em ~300ms: "${msg3.data.message.conversation}"`);
      console.log(`   Status: ${result3.status} | Bot detectado: ${result3.botDetected || false}\n`);
    }
  }

  // Verificar score final
  const finalCheck = isProbableBot(PHONE);
  console.log(`📊 RESULTADO FINAL:`);
  console.log(`   Bot Score: ${(finalCheck.score * 100).toFixed(1)}%`);
  console.log(`   É Bot?: ${finalCheck.isBot ? '✅ SIM' : '❌ NÃO'}`);
  console.log(`   Circuit Breaker: ${finalCheck.circuitBreakerTriggered ? 'ATIVADO' : 'Normal'}\n`);

  return finalCheck.isBot;
}

// ============================================================================
// CENÁRIO 2: BOT COM MENSAGENS DE MENU
// ============================================================================
async function scenario2_BotWithMenus() {
  console.log('📋 ===== CENÁRIO 2: BOT COM MENSAGENS DE MENU =====\n');

  const PHONE = '5584222222222';
  clearBotTracking(PHONE);
  messageTimingStore.clearAll();

  console.log('🤖 Simulando bot com menus e opções numeradas\n');

  // Primeira mensagem com menu
  const menuMsg = `Olá! Bem-vindo ao atendimento automático.

Digite:
1️⃣ - Vendas
2️⃣ - Suporte
3️⃣ - Financeiro

Como posso ajudar?`;

  const msg1 = createWebhook(PHONE, menuMsg);
  const result1 = await webhookHandler.handleWebhook(msg1);
  console.log(`[BOT] Enviou menu com opções`);
  console.log(`   Status: ${result1.status} | Bot detectado: ${result1.botDetected || false}\n`);

  await sleep(1000);

  // Segunda mensagem - resposta padrão
  const msg2 = createWebhook(PHONE, 'Não entendi sua resposta. Por favor, digite novamente.');
  const result2 = await webhookHandler.handleWebhook(msg2);
  console.log(`[BOT] "${msg2.data.message.conversation}"`);
  console.log(`   Status: ${result2.status} | Bot detectado: ${result2.botDetected || false}\n`);

  await sleep(1000);

  // Terceira mensagem - outro menu
  const msg3 = createWebhook(PHONE, 'Escolha uma opção válida:\n1. Sim\n2. Não');
  const result3 = await webhookHandler.handleWebhook(msg3);
  console.log(`[BOT] Enviou outro menu`);
  console.log(`   Status: ${result3.status} | Bot detectado: ${result3.botDetected || false}\n`);

  // Verificar score final
  const finalCheck = isProbableBot(PHONE);
  console.log(`📊 RESULTADO FINAL:`);
  console.log(`   Bot Score: ${(finalCheck.score * 100).toFixed(1)}%`);
  console.log(`   É Bot?: ${finalCheck.isBot ? '✅ SIM' : '❌ NÃO'}`);
  console.log(`   Circuit Breaker: ${finalCheck.circuitBreakerTriggered ? 'ATIVADO' : 'Normal'}\n`);

  return finalCheck.isBot;
}

// ============================================================================
// CENÁRIO 3: HUMANO REAL (variação de tempo e linguagem)
// ============================================================================
async function scenario3_RealHuman() {
  console.log('📋 ===== CENÁRIO 3: HUMANO REAL (Variação Natural) =====\n');

  const PHONE = '5584333333333';
  clearBotTracking(PHONE);
  messageTimingStore.clearAll();

  console.log('👤 Simulando humano com tempos variados e linguagem natural\n');

  // ORBION envia mensagem
  messageTimingStore.recordOutgoingMessage(PHONE);
  console.log('[ORBION] Enviou: "Olá! Como posso ajudar?"');
  await sleep(4500); // Humano demora 4.5s para ler e responder

  // Humano responde após ler
  const msg1 = createWebhook(PHONE, 'Oi! Tudo bem? Queria saber mais sobre automação');
  const result1 = await webhookHandler.handleWebhook(msg1);
  console.log(`[HUMANO] Respondeu em ~4.5s: "${msg1.data.message.conversation}"`);
  console.log(`   Status: ${result1.status} | Bot detectado: ${result1.botDetected || false}\n`);

  if (result1.status === 'valid') {
    // ORBION responde
    messageTimingStore.recordOutgoingMessage(PHONE);
    await sleep(7000); // Humano demora 7s (estava fazendo outra coisa)

    const msg2 = createWebhook(PHONE, 'Quanto custa mais ou menos?');
    const result2 = await webhookHandler.handleWebhook(msg2);
    console.log(`[HUMANO] Respondeu em ~7s: "${msg2.data.message.conversation}"`);
    console.log(`   Status: ${result2.status} | Bot detectado: ${result2.botDetected || false}\n`);

    if (result2.status === 'valid') {
      // Terceira resposta - rápida (pergunta simples)
      messageTimingStore.recordOutgoingMessage(PHONE);
      await sleep(2500); // 2.5s (pergunta curta)

      const msg3 = createWebhook(PHONE, 'Legal! Tem como agendar uma reunião?');
      const result3 = await webhookHandler.handleWebhook(msg3);
      console.log(`[HUMANO] Respondeu em ~2.5s: "${msg3.data.message.conversation}"`);
      console.log(`   Status: ${result3.status} | Bot detectado: ${result3.botDetected || false}\n`);

      if (result3.status === 'valid') {
        // Quarta resposta - com erro de digitação (humano)
        messageTimingStore.recordOutgoingMessage(PHONE);
        await sleep(5500); // 5.5s

        const msg4 = createWebhook(PHONE, 'Blzz, valeuuu!! rsrs');
        const result4 = await webhookHandler.handleWebhook(msg4);
        console.log(`[HUMANO] Respondeu em ~5.5s: "${msg4.data.message.conversation}"`);
        console.log(`   Status: ${result4.status} | Bot detectado: ${result4.botDetected || false}\n`);
      }
    }
  }

  // Verificar score final
  const finalCheck = isProbableBot(PHONE);
  console.log(`📊 RESULTADO FINAL:`);
  console.log(`   Bot Score: ${(finalCheck.score * 100).toFixed(1)}%`);
  console.log(`   É Bot?: ${finalCheck.isBot ? '✅ SIM' : '❌ NÃO'}`);
  console.log(`   Circuit Breaker: ${finalCheck.circuitBreakerTriggered ? 'ATIVADO' : 'Normal'}\n`);

  return finalCheck.isBot;
}

// ============================================================================
// CENÁRIO 4: CASO AMBÍGUO (humano rápido mas com variação)
// ============================================================================
async function scenario4_AmbiguousCase() {
  console.log('📋 ===== CENÁRIO 4: CASO AMBÍGUO (Humano Rápido) =====\n');

  const PHONE = '5584444444444';
  clearBotTracking(PHONE);
  messageTimingStore.clearAll();

  console.log('🤔 Simulando humano que responde rápido mas com variação\n');

  // ORBION envia mensagem
  messageTimingStore.recordOutgoingMessage(PHONE);
  console.log('[ORBION] Enviou: "Tem interesse?"');
  await sleep(1800); // 1.8s - rápido mas humanamente possível

  const msg1 = createWebhook(PHONE, 'sim');
  const result1 = await webhookHandler.handleWebhook(msg1);
  console.log(`[HUMANO] Respondeu em ~1.8s: "${msg1.data.message.conversation}"`);
  console.log(`   Status: ${result1.status} | Bot detectado: ${result1.botDetected || false}\n`);

  if (result1.status === 'valid') {
    messageTimingStore.recordOutgoingMessage(PHONE);
    await sleep(2200); // 2.2s

    const msg2 = createWebhook(PHONE, 'ok');
    const result2 = await webhookHandler.handleWebhook(msg2);
    console.log(`[HUMANO] Respondeu em ~2.2s: "${msg2.data.message.conversation}"`);
    console.log(`   Status: ${result2.status} | Bot detectado: ${result2.botDetected || false}\n`);

    if (result2.status === 'valid') {
      messageTimingStore.recordOutgoingMessage(PHONE);
      await sleep(3500); // 3.5s - variação

      const msg3 = createWebhook(PHONE, 'pode ser amanhã?');
      const result3 = await webhookHandler.handleWebhook(msg3);
      console.log(`[HUMANO] Respondeu em ~3.5s: "${msg3.data.message.conversation}"`);
      console.log(`   Status: ${result3.status} | Bot detectado: ${result3.botDetected || false}\n`);
    }
  }

  // Verificar score final
  const finalCheck = isProbableBot(PHONE);
  console.log(`📊 RESULTADO FINAL:`);
  console.log(`   Bot Score: ${(finalCheck.score * 100).toFixed(1)}%`);
  console.log(`   É Bot?: ${finalCheck.isBot ? '✅ SIM' : '❌ NÃO'}`);
  console.log(`   Circuit Breaker: ${finalCheck.circuitBreakerTriggered ? 'ATIVADO' : 'Normal'}\n`);

  return finalCheck.isBot;
}

// ============================================================================
// CENÁRIO 5: LOOP INFINITO (6 mensagens em poucos segundos)
// ============================================================================
async function scenario5_InfiniteLoop() {
  console.log('📋 ===== CENÁRIO 5: LOOP INFINITO (Circuit Breaker) =====\n');

  const PHONE = '5584555555555';
  clearBotTracking(PHONE);
  messageTimingStore.clearAll();

  console.log('🚨 Simulando loop infinito - 6+ mensagens rapidamente com padrões de bot\n');

  // Enviar 6 mensagens rapidamente com padrões de bot
  for (let i = 1; i <= 6; i++) {
    const botMessages = [
      'Como posso ajudar?',
      'Digite 1 para continuar',
      'Não entendi sua resposta',
      'Por favor, escolha uma opção',
      'Digite novamente',
      'Opção inválida'
    ];

    const msg = createWebhook(PHONE, botMessages[i - 1]);
    const result = await webhookHandler.handleWebhook(msg);
    console.log(`[BOT-LOOP] Mensagem ${i}: "${botMessages[i - 1]}"`);
    console.log(`   Status: ${result.status} | Bot detectado: ${result.botDetected || false}`);

    if (result.botDetected) {
      console.log(`   🚨 LOOP DETECTADO na mensagem ${i}!\n`);
      break;
    }

    await sleep(1500); // 1.5s entre mensagens = 9s total
  }

  // Verificar score final
  const finalCheck = isProbableBot(PHONE);
  console.log(`📊 RESULTADO FINAL:`);
  console.log(`   Bot Score: ${(finalCheck.score * 100).toFixed(1)}%`);
  console.log(`   É Bot?: ${finalCheck.isBot ? '✅ SIM' : '❌ NÃO'}`);
  console.log(`   Circuit Breaker: ${finalCheck.circuitBreakerTriggered ? '🚨 ATIVADO' : 'Normal'}\n`);

  return finalCheck.isBot;
}

// ============================================================================
// EXECUTOR PRINCIPAL
// ============================================================================
async function runAllScenarios() {
  try {
    console.log('🚀 Iniciando bateria completa de testes de detecção de bots...\n');
    console.log('═'.repeat(80));
    console.log('\n');

    const result1 = await scenario1_BotInstantResponses();
    console.log('═'.repeat(80));
    console.log('\n');

    const result2 = await scenario2_BotWithMenus();
    console.log('═'.repeat(80));
    console.log('\n');

    const result3 = await scenario3_RealHuman();
    console.log('═'.repeat(80));
    console.log('\n');

    const result4 = await scenario4_AmbiguousCase();
    console.log('═'.repeat(80));
    console.log('\n');

    const result5 = await scenario5_InfiniteLoop();
    console.log('═'.repeat(80));
    console.log('\n');

    // Resumo final
    console.log('📊 ===== RESUMO DOS TESTES =====\n');
    console.log(`   ${result1 ? '✅' : '❌'} Cenário 1: Bot com respostas instantâneas ${result1 ? '(DETECTADO)' : '(NÃO DETECTADO)'}`);
    console.log(`   ${result2 ? '✅' : '❌'} Cenário 2: Bot com mensagens de menu ${result2 ? '(DETECTADO)' : '(NÃO DETECTADO)'}`);
    console.log(`   ${!result3 ? '✅' : '❌'} Cenário 3: Humano real ${!result3 ? '(PASSOU)' : '(FALSO POSITIVO!)'}`);
    console.log(`   ${!result4 ? '✅' : '❌'} Cenário 4: Humano rápido (ambíguo) ${!result4 ? '(PASSOU)' : '(FALSO POSITIVO!)'}`);
    console.log(`   ${result5 ? '✅' : '❌'} Cenário 5: Loop infinito ${result5 ? '(DETECTADO)' : '(NÃO DETECTADO)'}`);
    console.log('');

    // Validação
    const botsDetected = result1 && result2 && result5;
    const humansNotBlocked = !result3 && !result4;
    const allPassed = botsDetected && humansNotBlocked;

    if (allPassed) {
      console.log('🎉 TODOS OS TESTES PASSARAM! Sistema de detecção funcionando perfeitamente.\n');
      console.log('✅ Bots foram detectados corretamente');
      console.log('✅ Humanos não foram bloqueados\n');
      process.exit(0);
    } else {
      console.log('⚠️  ALGUNS TESTES FALHARAM:\n');
      if (!botsDetected) {
        console.log('❌ Alguns bots não foram detectados');
      }
      if (!humansNotBlocked) {
        console.log('❌ FALSO POSITIVO: Humanos foram bloqueados incorretamente!');
      }
      console.log('\nRevise os thresholds do sistema.\n');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ ERRO FATAL:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Executar testes
runAllScenarios();

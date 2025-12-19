/**
 * 🧪 TESTE DO FLUXO COMPLETO DE BOT DETECTION
 * Verifica se o bot detector está sendo chamado corretamente no webhook handler
 */

import webhookHandler from '../src/handlers/webhook_handler.js';

console.log('\n🧪 ========== TESTE DO FLUXO DE BOT DETECTION ==========\n');

// Simular webhook com mensagem de teste
const testWebhook = {
  event: 'messages.upsert',
  instance: 'orbion',
  data: {
    key: {
      remoteJid: '5584999999999@s.whatsapp.net',
      fromMe: false,
      id: 'TEST_MESSAGE_ID_001'
    },
    pushName: 'Teste Bot Detector',
    message: {
      conversation: 'Olá, teste de bot detection'
    }
  }
};

console.log('📨 Enviando mensagem de teste para webhook handler...\n');
console.log('📋 Dados do webhook:', JSON.stringify(testWebhook, null, 2));
console.log('\n' + '='.repeat(80) + '\n');

// Processar webhook
const result = await webhookHandler.handleWebhook(testWebhook);

console.log('\n' + '='.repeat(80) + '\n');
console.log('📊 RESULTADO DO PROCESSAMENTO:\n');
console.log(JSON.stringify(result, null, 2));

console.log('\n✅ Teste concluído!\n');
console.log('🔍 Verifique os logs acima para confirmar que:');
console.log('   1. Webhook foi processado');
console.log('   2. Bot detector foi chamado (linha "[BOT-SCORE]")');
console.log('   3. Score foi calculado');
console.log('   4. Decisão foi tomada (ignorar ou processar)\n');

// test_realistic_conversation.js
// Teste com conversa realista em português brasileiro

import { chatHandler } from '../src/agent.js';
import { saveMessage } from '../src/memory.js';

const testLeadNumber = '5584888888888';
const conversaRealista = [
  { msg: 'Oi, vi que vocês trabalham com automação', esperado: 'opening/need' },
  { msg: 'Tenho uma imobiliária aqui em Natal', esperado: 'need' },
  { msg: 'O problema é que a gente perde muito cliente porque demora pra responder no WhatsApp', esperado: 'need->budget' },
  { msg: 'A gente consegue investir uns 10 a 15 mil por mês nisso', esperado: 'budget->authority' },
  { msg: 'Sou o dono, decido tudo sozinho', esperado: 'authority->timing' },
  { msg: 'Preciso resolver urgente, tá perdendo negócio todo dia', esperado: 'timing->closing' },
  { msg: 'Bora marcar então, quero conhecer a solução', esperado: 'closing (DEVE PEDIR EMAIL!)' },
  { msg: 'contato@imobiliarianatal.com.br', esperado: 'closing (DEVE AGENDAR!)' },
  { msg: 'Pode ser amanhã às 14h', esperado: 'closing (CONFIRMAR AGENDAMENTO!)' }
];

async function testarConversaRealista() {
  console.log('🧪 TESTE: Conversa Realista em Português\n');
  console.log('='.repeat(80));
  console.log('📱 Lead: Imobiliária em Natal');
  console.log('🎯 Cenário: Dono precisa de automação de WhatsApp com urgência\n');
  console.log('='.repeat(80) + '\n');

  for (let i = 0; i < conversaRealista.length; i++) {
    const { msg, esperado } = conversaRealista[i];

    console.log(`\n${'─'.repeat(80)}`);
    console.log(`📨 [${i + 1}/${conversaRealista.length}] LEAD: "${msg}"`);
    console.log(`   ⏳ Esperado: ${esperado}`);

    const response = await chatHandler(msg, {
      fromContact: testLeadNumber,
      from: testLeadNumber
    });

    await saveMessage(testLeadNumber, msg, false);
    await saveMessage(testLeadNumber, response.message, true);

    console.log(`\n🤖 ORBION: ${response.message}`);
    console.log(`\n📊 Estado:`);
    console.log(`   - Estágio: ${response.context.stage}`);
    console.log(`   - Qualificação: ${response.context.score}%`);
    console.log(`   - Próxima ação: ${response.context.nextAction}`);

    // Verificação específica para pedido de email
    if (i === 6) { // "Bora marcar então"
      const pediuEmail = response.message.toLowerCase().includes('email') ||
                        response.message.toLowerCase().includes('e-mail');
      console.log(`\n   ✅ VALIDAÇÃO: ${pediuEmail ? '✓ Pediu email!' : '✗ NÃO PEDIU EMAIL (FALHA!)'}`);
      if (!pediuEmail) {
        console.log(`   🚨 ERRO CRÍTICO: Sistema deveria pedir email antes de agendar!`);
      }
    }

    // Verificação para confirmação de agendamento
    if (i === 8) { // "Pode ser amanhã às 14h"
      const confirmouAgendamento = response.message.toLowerCase().includes('confirmad') ||
                                   response.message.toLowerCase().includes('agendam') ||
                                   response.message.toLowerCase().includes('calendar');
      console.log(`\n   ✅ VALIDAÇÃO: ${confirmouAgendamento ? '✓ Confirmou agendamento!' : '? Verificar resposta'}`);
    }

    // Aguarda 800ms entre mensagens (mais realista)
    await new Promise(resolve => setTimeout(resolve, 800));
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ TESTE CONCLUÍDO!');
  console.log('\n📋 RESUMO DO FLUXO:');
  console.log('   1. Opening → Identificou o lead');
  console.log('   2. Need → Detectou dor (demora no WhatsApp)');
  console.log('   3. Budget → Coletou orçamento (10-15k/mês)');
  console.log('   4. Authority → Confirmou decisor (dono)');
  console.log('   5. Timing → Identificou urgência (perdendo negócio)');
  console.log('   6. Closing → DEVE ter pedido email');
  console.log('   7. Closing → Coletou email');
  console.log('   8. Closing → Agendou reunião\n');
}

testarConversaRealista().catch(error => {
  console.error('\n❌ Erro no teste:', error.message);
  console.error(error.stack);
  process.exit(1);
});

// test_full_bant_flow.js
// Teste completo do fluxo BANT com novo lead
// Objetivo: Verificar se o sistema pede email ao agendar reunião

import { chatHandler } from '../src/agent.js';
import { saveMessage } from '../src/memory.js';

const testLeadNumber = '5584999999999';
const conversationFlow = [
  'Oi, recebi mensagem de vocês',
  'Sou dono de uma loja de roupas aqui em Natal',
  'Nosso maior problema é perder clientes porque não conseguimos responder todos no WhatsApp',
  'Temos uns 15 mil por mês para investir em melhorias',
  'Sim, sou eu quem decide os investimentos da empresa',
  'Precisamos resolver isso logo, estamos perdendo vendas todo dia',
  'Quero marcar uma reunião para conhecer a solução'
];

async function runTestConversation() {
  console.log('🧪 TESTE: Fluxo BANT Completo com Novo Lead\n');
  console.log('='.repeat(70));
  console.log('📱 Lead de Teste: ' + testLeadNumber);
  console.log('🎯 Objetivo: Verificar se sistema pede email ao agendar reunião\n');
  console.log('='.repeat(70) + '\n');

  for (let i = 0; i < conversationFlow.length; i++) {
    const userMsg = conversationFlow[i];

    console.log(`\n📨 [${i + 1}/${conversationFlow.length}] LEAD: ${userMsg}`);

    const response = await chatHandler(userMsg, {
      fromContact: testLeadNumber,
      from: testLeadNumber
    });

    await saveMessage(testLeadNumber, userMsg, false);
    await saveMessage(testLeadNumber, response.message, true);

    console.log(`🤖 ORBION: ${response.message}`);
    console.log(`📊 Estágio: ${response.context.stage} | Score: ${response.context.score}%`);

    // Aguarda 500ms entre mensagens
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ TESTE CONCLUÍDO!');
  console.log('\n📧 RESULTADO ESPERADO:');
  console.log('   O ORBION deve ter pedido o EMAIL antes de confirmar a reunião');
  console.log('   Mensagem esperada: "Qual seu melhor e-mail para enviar o convite da reunião?"\n');
}

runTestConversation().catch(console.error);

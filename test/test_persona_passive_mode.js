// test_persona_passive_mode.js
// Teste do reconhecimento de persona em modo passivo (inbound)

import { chatHandler } from '../src/agent.js';

console.log('🧪 TESTE: Reconhecimento de Persona - Modo Passivo (Inbound)\n');
console.log('='.repeat(80));
console.log('📋 CENÁRIOS DE TESTE:\n');
console.log('1. Contato que ESTÁ na planilha do Google Sheets');
console.log('2. Contato que NÃO ESTÁ na planilha (reconhecimento por nome)');
console.log('3. Contato sem nome (perfil genérico)\n');
console.log('='.repeat(80) + '\n');

async function testPassiveModePersona() {
  // CENÁRIO 1: Contato que ESTÁ na planilha (usar um dos 100 leads existentes)
  console.log('\n📌 CENÁRIO 1: Contato QUE ESTÁ na planilha');
  console.log('─'.repeat(80));
  console.log('📱 Número: 5584921594898 (RN Performance - Lead da planilha)');
  console.log('💬 Mensagem: "Oi, quero saber mais sobre automação"');

  const response1 = await chatHandler('Oi, quero saber mais sobre automação', {
    fromContact: '5584921594898',
    from: '5584921594898',
    fromWhatsApp: true, // ATIVA O MODO PASSIVO
    fromCampaign: false, // NÃO é campanha ativa
    contactName: 'RN Performance'
  });

  console.log(`\n🤖 RESPOSTA: ${response1.message}`);
  console.log(`📊 CONTEXTO:`, JSON.stringify(response1.context, null, 2));


  // CENÁRIO 2: Contato que NÃO está na planilha (reconhecimento por nome)
  console.log('\n\n📌 CENÁRIO 2: Contato que NÃO ESTÁ na planilha (inferir por nome)');
  console.log('─'.repeat(80));
  console.log('📱 Número: 5584999999999 (número fictício)');
  console.log('👤 Nome: "Pizzaria Bella Napoli"');
  console.log('💬 Mensagem: "Olá, vi seu anúncio sobre automação"');

  const response2 = await chatHandler('Olá, vi seu anúncio sobre automação', {
    fromContact: '5584999999999',
    from: '5584999999999',
    fromWhatsApp: true, // ATIVA O MODO PASSIVO
    fromCampaign: false, // NÃO é campanha ativa
    contactName: 'Pizzaria Bella Napoli' // Nome para inferir tipo de negócio
  });

  console.log(`\n🤖 RESPOSTA: ${response2.message}`);
  console.log(`📊 CONTEXTO:`, JSON.stringify(response2.context, null, 2));


  // CENÁRIO 3: Contato sem nome (perfil genérico)
  console.log('\n\n📌 CENÁRIO 3: Contato SEM nome (perfil genérico)');
  console.log('─'.repeat(80));
  console.log('📱 Número: 5584888888888 (número fictício)');
  console.log('👤 Nome: (vazio)');
  console.log('💬 Mensagem: "Bom dia"');

  const response3 = await chatHandler('Bom dia', {
    fromContact: '5584888888888',
    from: '5584888888888',
    fromWhatsApp: true, // ATIVA O MODO PASSIVO
    fromCampaign: false, // NÃO é campanha ativa
    contactName: '' // Sem nome
  });

  console.log(`\n🤖 RESPOSTA: ${response3.message}`);
  console.log(`📊 CONTEXTO:`, JSON.stringify(response3.context, null, 2));


  console.log('\n\n' + '='.repeat(80));
  console.log('✅ TESTE CONCLUÍDO!\n');
  console.log('📋 RESUMO:');
  console.log('   1. Sistema detecta se está na planilha → usa dados completos');
  console.log('   2. Se NÃO está → infere persona pelo nome do contato');
  console.log('   3. Se sem nome → usa perfil genérico');
  console.log('\n🎯 IMPORTANTE:');
  console.log('   - Sistema só ativa em fromWhatsApp=true E fromCampaign=false');
  console.log('   - NÃO afeta campanhas ativas (evita conflitos)');
  console.log('   - Análise executada apenas na primeira mensagem');
  console.log('   - Dados de persona salvos em enhancedState para reuso\n');
}

testPassiveModePersona().catch(error => {
  console.error('\n❌ Erro no teste:', error.message);
  console.error(error.stack);
  process.exit(1);
});

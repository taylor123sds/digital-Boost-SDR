/**
 * RESET DE CONVERSA ESPECÍFICA
 * Limpa o estado de uma conversa específica
 */

import structuredFlow from './src/tools/structured_flow_system.js';

async function resetConversation(contactId) {
  console.log(`🔄 RESETANDO CONVERSA: ${contactId}`);

  // Limpa o estado da conversa
  structuredFlow.conversationStates.delete(contactId);

  console.log(`✅ Estado da conversa ${contactId} foi resetado`);
  console.log(`📊 Estados ativos: ${structuredFlow.conversationStates.size}`);

  // Testa o estado limpo
  const newState = structuredFlow.getConversationState(contactId);
  console.log(`📝 Novo estado:`, {
    phase: newState.current_phase,
    message_count: newState.message_count,
    created_at: new Date(newState.created_at).toISOString()
  });
}

// Reset do contacto específico
await resetConversation('558496791624');

console.log(`\n🧪 TESTANDO PRIMEIRO CONTATO LIMPO...`);

// Testa primeira mensagem após reset
const contactData = {
  from: '558496791624',
  text: 'Ola orbion, poderia me falar o que vocês fazem?',
  profile: {
    name: 'Taylor M Lapenda',
    status: 'Empresário'
  },
  timestamp: Date.now()
};

const result = await structuredFlow.processStructuredFlow(contactData);

console.log(`\n📊 RESULTADO APÓS RESET:`);
console.log(`✅ Sucesso: ${result.success}`);
console.log(`📍 Fase atual: ${result.current_phase}`);
console.log(`📈 Progresso: ${result.flow_progress?.percentage}%`);
console.log(`🎯 Lead conhecido: ${result.lead_data?.is_known_lead}`);
console.log(`🔍 Segmento: ${result.lead_data?.segment}`);

if (result.message) {
  console.log(`\n📝 MENSAGEM CORRETA:`);
  console.log(''.padEnd(50, '='));
  console.log(result.message);
  console.log(''.padEnd(50, '='));
}
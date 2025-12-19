// test-faq-detection.js
// Teste rápido da detecção de FAQ

import { detectFAQ, logFAQDetection } from './src/tools/faq_responses.js';

console.log('🧪 TESTANDO DETECÇÃO DE FAQ\n');
console.log('═'.repeat(60));

const testCases = [
  'O que é a Digital Boost?',
  'Quanto custa o serviço?',
  'Quais serviços vocês oferecem?',
  'Quem são os sócios?',
  'Vocês têm cases de sucesso?',
  'Como funciona a tecnologia?',
  'Quero agendar uma demonstração',
  'Qual o preço?',
  'Me fale sobre a empresa',
  'Isso é muito caro' // não deve detectar
];

testCases.forEach((testMessage, index) => {
  console.log(`\n\n[TESTE ${index + 1}] Mensagem: "${testMessage}"`);
  console.log('─'.repeat(60));

  const faqResult = detectFAQ(testMessage);

  if (faqResult) {
    console.log('✅ FAQ DETECTADA!');
    console.log(`📂 Categoria: ${faqResult.category}`);
    console.log(`🔍 Keywords: ${faqResult.matchedKeywords.join(', ')}`);
    console.log(`📝 Contexto: ${faqResult.contexto}`);
    console.log(`\n💬 RESPOSTA:\n${faqResult.response}`);
  } else {
    console.log('❌ FAQ NÃO DETECTADA');
  }
});

console.log('\n\n' + '═'.repeat(60));
console.log('✅ TESTE COMPLETO\n');

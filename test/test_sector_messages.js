// test_sector_messages.js - Teste de mensagens por setor
// ✅ ATUALIZADO: Usa sistema unificado

import { buildUnifiedFirstMessage, detectSector } from '../src/messaging/UnifiedMessageBuilder.js';

console.log('🧪 TESTE: Mensagens Consultivas por Setor\n');
console.log('═'.repeat(80));

const testLeads = [
  { name: 'Ekton Moda', sector: 'Moda & Vestuário (masc./fem.)' },
  { name: 'R&J Bijuterias', sector: 'Bijuterias & Acessórios' },
  { name: 'Pizzaria do Bairro', sector: 'Restaurante' },
  { name: 'Salão Elegance', sector: 'Salão de Beleza' },
  { name: 'Barbearia 84', sector: 'Barbearia' },
  { name: 'Clínica Pedro Cavalcanti', sector: 'Clínica Médica' },
  { name: 'Expert Turismo', sector: 'Agência de Viagens' },
  { name: 'Loja Qualquer', sector: 'Outros Serviços' } // Deve usar default
];

for (const lead of testLeads) {
  const sectorInfo = detectSector(lead.sector);
  const message = buildUnifiedFirstMessage(lead.name, { sector: lead.sector });

  console.log(`\n📊 LEAD: ${lead.name}`);
  console.log(`🏷️  SETOR: ${lead.sector}`);
  console.log(`🎯 CATEGORIA DETECTADA: ${sectorInfo.category}`);
  console.log('─'.repeat(80));
  console.log(message);
  console.log('─'.repeat(80));

  // Checklist de validação
  const checks = {
    'Nome incluído': message.includes(lead.name),
    'Digital Boost mencionada': /Digital Boost/i.test(message),
    'Pergunta consultiva sobre DOR': /\?/.test(message),
    'Opt-out REMOVER': /REMOVER/i.test(message),
    'SEM pergunta genérica "processo"': !/qual.*processo/i.test(message),
    'Foca em DOR específica': message.length > 200 // Mensagens detalhadas
  };

  console.log('\n✅ Checklist:');
  for (const [check, passed] of Object.entries(checks)) {
    console.log(`   ${passed ? '✓' : '✗'} ${check}`);
  }

  const allPassed = Object.values(checks).every(v => v);
  console.log(`\n${allPassed ? '✅ MENSAGEM OK' : '❌ MENSAGEM COM PROBLEMAS'}`);
}

console.log('\n' + '═'.repeat(80));
console.log('\n🎯 TODOS OS SETORES TESTADOS\n');

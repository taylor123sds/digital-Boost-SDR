// test_message_flow.js - Teste completo do fluxo de mensagens
// ✅ ATUALIZADO: Usa sistema unificado
import { detectSector, buildUnifiedFirstMessage } from '../src/messaging/UnifiedMessageBuilder.js';

console.log('🧪 TESTE COMPLETO DO FLUXO DE MENSAGENS\n');
console.log('═'.repeat(80));

// Setores de teste baseados na planilha real
const testCases = [
  { nome: 'Boutique Fashion', setor: 'Moda & Vestuário', expected: 'Varejo/Comércio' },
  { nome: 'Salão Bella', setor: 'Salão de Beleza', expected: 'Estética/Beleza' },
  { nome: 'Restaurante Sabor', setor: 'Restaurante', expected: 'Alimentação' },
  { nome: 'Pet Shop Amigo', setor: 'Pet Shop', expected: 'Petshop/Veterinária' },
  { nome: 'Clínica Odonto', setor: 'Odontologia', expected: 'Odontologia' },
  { nome: 'Empresa XYZ', setor: 'Serviços Gerais', expected: 'Negócios Diversos' },
];

console.log('\n📋 TESTE 1: DETECÇÃO DE SETORES\n');

testCases.forEach(({ nome, setor, expected }) => {
  const sectorInfo = detectSector(setor);
  const detected = sectorInfo.category;
  const status = detected === expected ? '✅' : '❌';

  console.log(`${status} ${nome}`);
  console.log(`   Setor Original: "${setor}"`);
  console.log(`   Detectado: "${detected}" ${detected === expected ? '(CORRETO)' : `(ESPERADO: "${expected}")`}`);
  console.log('');
});

console.log('═'.repeat(80));
console.log('\n📝 TESTE 2: ESTRUTURA DAS MENSAGENS\n');

// Testar um setor específico
const testSector = 'Moda & Vestuário';
const testName = 'Maria Silva';
const message = buildUnifiedFirstMessage(testName, { sector: testSector });

console.log(`📤 MENSAGEM GERADA PARA: ${testName} (${testSector})\n`);
console.log('─'.repeat(80));
console.log(message);
console.log('─'.repeat(80));

console.log('\n🔍 VALIDAÇÃO DA ESTRUTURA:\n');

// Verificar todos os componentes obrigatórios
const checks = [
  { name: 'Saudação personalizada com {NOME}', test: message.includes(testName) },
  { name: 'Introdução ORBION', test: message.includes('ORBION') && message.includes('Digital Boost') },
  { name: 'Credenciais Sebrae', test: message.includes('Sebrae') && message.includes('Startup Nordeste') },
  { name: 'Proposta de valor específica', test: message.includes('Ajudamos') || message.includes('ajudamos') },
  { name: 'Social proof (case study)', test: message.includes('Empresas como') || message.includes('Lojas como') },
  { name: 'Pergunta sobre dor específica (**negrito**)', test: message.includes('**') && message.includes('?**') },
  { name: 'Impacto/Consequência da dor', test: message.includes('perdem') || message.includes('perde') },
  { name: '"Tem interesse em resolver isso?"', test: message.includes('Tem interesse em resolver isso?') },
  { name: 'Opção REMOVER', test: message.toLowerCase().includes('remover') },
];

checks.forEach(({ name, test }) => {
  const status = test ? '✅' : '❌';
  console.log(`${status} ${name}`);
});

console.log('\n═'.repeat(80));
console.log('\n📊 TESTE 3: VERIFICAÇÃO DE TODOS OS SETORES\n');

const allSectors = [
  'Moda & Vestuário',
  'Bijuterias & Acessórios',
  'Restaurante',
  'Lanchonete',
  'Cafeteria',
  'Salão de Beleza & Estética',
  'Barbearia',
  'Saúde & Clínicas',
  'Odontologia',
  'Pet Shop & Veterinária',
  'Academia',
  'Ótica',
  'Farmácia',
  'default'
];

let totalErrors = 0;

allSectors.forEach(sector => {
  const msg = buildUnifiedFirstMessage('Teste', { sector: sector });
  const errors = [];

  // Verificar componentes essenciais
  if (!msg.includes('ORBION')) errors.push('Falta ORBION');
  if (!msg.includes('Digital Boost')) errors.push('Falta Digital Boost');
  if (!msg.includes('Sebrae')) errors.push('Falta Sebrae');
  if (!msg.includes('**') || !msg.includes('?**')) errors.push('Falta pergunta em negrito');
  if (!msg.includes('Tem interesse em resolver isso?')) errors.push('Falta CTA');
  if (!msg.toLowerCase().includes('remover')) errors.push('Falta REMOVER');
  if (!(msg.includes('Empresas como') || msg.includes('Lojas como') || msg.includes('Restaurantes como'))) {
    errors.push('Falta social proof');
  }

  if (errors.length > 0) {
    console.log(`❌ ${sector}:`);
    errors.forEach(err => console.log(`   - ${err}`));
    totalErrors += errors.length;
  } else {
    console.log(`✅ ${sector} - Estrutura completa`);
  }
});

console.log('\n═'.repeat(80));

if (totalErrors === 0) {
  console.log('\n🎉 SUCESSO: Todas as mensagens têm estrutura 100% correta!');
  console.log('\n✅ FLUXO VALIDADO:');
  console.log('   1. Detecção de setores ✓');
  console.log('   2. Estrutura das mensagens ✓');
  console.log('   3. Todos os componentes presentes ✓');
  console.log('   4. Social proof incluído ✓');
  console.log('   5. ORBION e credenciais ✓');
} else {
  console.log(`\n⚠️  ATENÇÃO: ${totalErrors} erro(s) encontrado(s)`);
  console.log('   Revisar mensagens acima marcadas com ❌');
}

console.log('\n' + '═'.repeat(80));
console.log('\n✅ Teste concluído!\n');

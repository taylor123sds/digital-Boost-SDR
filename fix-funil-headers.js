import { writeSheet } from './src/tools/google_sheets.js';

const SHEET_ID = process.env.GOOGLE_FUNIL_SHEET_ID || process.env.GOOGLE_LEADS_SHEET_ID;

// ✅ Estrutura canônica do sheetsManager.js (17 colunas A-Q)
const CORRECT_HEADERS = [
  'telefone',           // A
  'nome',               // B
  'empresa',            // C
  'setor',              // D
  'currentAgent',       // E
  'messageCount',       // F
  'bant_stage',         // G
  'bant_complete',      // H
  'problema_principal', // I
  'faixa_investimento', // J
  'decisor_principal',  // K
  'urgencia',           // L
  'scheduler_stage',    // M
  'lead_email',         // N
  'score',              // O
  'created_at',         // P
  'updated_at'          // Q
];

console.log('🔧 CORREÇÃO DOS HEADERS DA ABA FUNIL\n');
console.log('═'.repeat(80));

console.log('\n📋 Headers CORRETOS (17 colunas):');
console.log('─'.repeat(80));
CORRECT_HEADERS.forEach((header, idx) => {
  const letter = String.fromCharCode(65 + idx);
  console.log(`  ${letter}: ${header}`);
});

console.log('\n⚠️  ATENÇÃO: Isso vai SOBRESCREVER a linha 1 da aba "funil"');
console.log('   Os dados existentes NÃO serão afetados (apenas os headers)\n');

try {
  console.log('🔄 Atualizando headers...');

  await writeSheet(SHEET_ID, 'funil!A1:Q1', [CORRECT_HEADERS]);

  console.log('\n✅ HEADERS CORRIGIDOS COM SUCESSO!');
  console.log('═'.repeat(80));
  console.log('\n📌 Próximo passo: Reiniciar o servidor para testar\n');

} catch (error) {
  console.error('\n❌ Erro ao atualizar headers:', error.message);
  console.error(error.stack);
}

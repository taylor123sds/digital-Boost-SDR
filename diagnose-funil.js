import { readSheet } from './src/tools/google_sheets.js';

const SHEET_ID = process.env.GOOGLE_FUNIL_SHEET_ID || process.env.GOOGLE_LEADS_SHEET_ID;

console.log('📊 DIAGNÓSTICO DA ABA FUNIL\n');
console.log('═'.repeat(80));

try {
  console.log('📋 Lendo primeiras 5 linhas da aba "funil"...\n');

  const data = await readSheet(SHEET_ID, 'funil!A1:Z5');

  if (!data || data.length === 0) {
    console.log('⚠️  Aba "funil" vazia ou não existe');
  } else {
    console.log('✅ Aba encontrada!\n');
    console.log('📋 LINHA 1 (HEADERS):');
    console.log('─'.repeat(80));
    if (data[0]) {
      data[0].forEach((header, idx) => {
        const letter = String.fromCharCode(65 + idx); // A=65
        console.log(`  ${letter}: ${header || '(vazio)'}`);
      });
    }

    console.log(`\n📋 TOTAL DE COLUNAS: ${data[0]?.length || 0}`);

    if (data.length > 1) {
      console.log(`\n📋 PRIMEIROS DADOS (linha 2):`);
      console.log('─'.repeat(80));
      if (data[1]) {
        data[1].forEach((val, idx) => {
          const letter = String.fromCharCode(65 + idx);
          console.log(`  ${letter}: ${val || '(vazio)'}`);
        });
      }
    }
  }

} catch (error) {
  console.error('❌ Erro:', error.message);
}

console.log('\n' + '═'.repeat(80));

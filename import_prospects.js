/**
 * Script para importar leads da Sheet1 para SQLite
 * Uso: node import_prospects.js
 */

import dotenv from 'dotenv';
dotenv.config();

import { importLeadsFromSheets, getProspectStats } from './src/services/ProspectImportService.js';

async function main() {
  console.log('\n📊 IMPORTAÇÃO DE LEADS - Sheet1 → SQLite\n');
  console.log('='.repeat(50));

  try {
    // Importar da Sheet1
    const result = await importLeadsFromSheets({
      sheetName: 'Sheet1',
      skipExisting: true,
      updateExisting: false
    });

    console.log('\n' + '='.repeat(50));

    if (result.success) {
      console.log('✅ Importação concluída com sucesso!\n');

      // Mostrar estatísticas
      const stats = getProspectStats();
      console.log('📈 Estatísticas da tabela prospect_leads:');
      console.log(`   Total: ${stats.total}`);
      console.log(`   Pendentes: ${stats.pendentes}`);
      console.log(`   Enviados: ${stats.enviados}`);
      console.log(`   Erros: ${stats.erros}`);
      console.log(`   Sem WhatsApp: ${stats.sem_whatsapp}`);
      console.log(`   Convertidos para leads: ${stats.convertidos}`);
    } else {
      console.log('❌ Erro na importação:', result.error);
    }

  } catch (error) {
    console.error('❌ Erro fatal:', error);
  }

  console.log('\n' + '='.repeat(50) + '\n');
}

main();

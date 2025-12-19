// test_sheets.js - Script de teste para verificar integração Google Sheets
import 'dotenv/config';
import * as googleSheets from '../src/tools/google_sheets.js';

async function testSheetsIntegration() {
  console.log('🧪 TESTE DE INTEGRAÇÃO GOOGLE SHEETS\n');
  console.log('=' .repeat(60));

  // 1. Verificar variáveis de ambiente
  console.log('\n1️⃣ VERIFICANDO VARIÁVEIS DE AMBIENTE:');
  console.log(`   GOOGLE_LEADS_SHEET_ID: ${process.env.GOOGLE_LEADS_SHEET_ID ? '✅ Configurado' : '❌ NÃO configurado'}`);
  console.log(`   GOOGLE_FUNIL_SHEET_ID: ${process.env.GOOGLE_FUNIL_SHEET_ID ? '✅ Configurado' : '❌ NÃO configurado'}`);
  console.log(`   GOOGLE_CREDENTIALS_FILE: ${process.env.GOOGLE_CREDENTIALS_FILE || './google_credentials.json'}`);
  console.log(`   GOOGLE_TOKEN_PATH: ${process.env.GOOGLE_TOKEN_PATH || './google_token.json'}`);

  if (!process.env.GOOGLE_LEADS_SHEET_ID && !process.env.GOOGLE_FUNIL_SHEET_ID) {
    console.error('\n❌ ERRO: Nenhum ID de planilha configurado no .env');
    process.exit(1);
  }

  try {
    // 2. Testar leitura da planilha
    console.log('\n2️⃣ TESTANDO LEITURA DA PLANILHA:');
    const sheetId = process.env.GOOGLE_FUNIL_SHEET_ID || process.env.GOOGLE_LEADS_SHEET_ID;
    console.log(`   ID da planilha: ${sheetId}`);

    const funnelLeads = await googleSheets.getFunnelLeads(sheetId);
    console.log(`   ✅ ${funnelLeads.length} leads encontrados na aba "funil"`);

    if (funnelLeads.length > 0) {
      console.log(`   Exemplo do primeiro lead:`);
      console.log(`   - Telefone: ${funnelLeads[0].telefone}`);
      console.log(`   - Nome: ${funnelLeads[0].nome}`);
      console.log(`   - Stage: ${funnelLeads[0].stage}`);
    }

    // 3. Testar salvamento de lead de teste
    console.log('\n3️⃣ TESTANDO SALVAMENTO DE LEAD DE TESTE:');
    const testLead = {
      nome: 'Lead Teste ORBION',
      empresa: 'Empresa Teste',
      setor: 'Tecnologia',
      stage: 'sdr',
      bant_stage: 'need',
      currentAgent: 'sdr',
      score: 25,
      problema_principal: 'Teste de integração',
      investimento_disponivel: 'R$ 5.000',
      decisor_principal: 'CEO',
      urgencia: 'Média',
      updated_at: new Date().toISOString()
    };

    const testPhone = `5584999999999_TEST_${Date.now()}`;
    console.log(`   Telefone de teste: ${testPhone}`);

    const result = await googleSheets.updateFunnelLead(testPhone, testLead, sheetId);

    if (result.success) {
      console.log(`   ✅ Lead de teste ${result.action === 'UPDATED' ? 'ATUALIZADO' : 'ADICIONADO'} com sucesso!`);
      console.log(`   Linha na planilha: ${result.row || 'N/A'}`);
    } else {
      console.log(`   ❌ Falha ao salvar: ${result.error}`);
    }

    // 4. Verificar se o lead foi realmente salvo
    console.log('\n4️⃣ VERIFICANDO SE O LEAD FOI SALVO:');
    const updatedLeads = await googleSheets.getFunnelLeads(sheetId);
    const savedLead = updatedLeads.find(l => l.telefone === testPhone);

    if (savedLead) {
      console.log(`   ✅ Lead de teste ENCONTRADO na planilha!`);
      console.log(`   Dados salvos:`);
      console.log(`   - Nome: ${savedLead.nome}`);
      console.log(`   - Empresa: ${savedLead.empresa}`);
      console.log(`   - Stage: ${savedLead.stage}`);
      console.log(`   - Score: ${savedLead.score}`);
    } else {
      console.log(`   ⚠️ Lead de teste NÃO encontrado na planilha`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ TESTE CONCLUÍDO COM SUCESSO!\n');

  } catch (error) {
    console.error('\n❌ ERRO DURANTE O TESTE:');
    console.error(`   Mensagem: ${error.message}`);
    console.error(`   Stack: ${error.stack}`);
    process.exit(1);
  }
}

// Executar teste
testSheetsIntegration().catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});

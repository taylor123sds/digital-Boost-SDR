/**
 * Script para adicionar novas colunas ao Google Sheets Pipeline
 * Executa: node add-pipeline-columns.js
 */

import { readSheet, writeSheet } from './src/tools/google_sheets.js';

const SHEET_ID = process.env.GOOGLE_SHEET_ID;

async function addPipelineColumns() {
  try {
    console.log('🔧 Atualizando colunas do Pipeline...\n');

    // 1. Ler headers atuais
    const data = await readSheet(SHEET_ID, 'pipeline!A1:Z1');

    if (!data || data.length === 0) {
      throw new Error('Não foi possível ler os headers da planilha');
    }

    const currentHeaders = data[0];
    console.log(`📊 Headers atuais (${currentHeaders.length} colunas):`, currentHeaders);

    // 2. Novos headers completos (26 colunas A:Z)
    const newHeaders = [
      'id',           // A - Identificador único
      'nome',         // B - Nome da oportunidade
      'empresa',      // C - Nome da empresa
      'valor',        // D - Valor da oportunidade (R$)
      'email',        // E - Email do contato
      'telefone',     // F - Telefone do contato
      'setor',        // G - Setor da empresa
      'dor',          // H - Problema/dor principal
      'pipeline_stage', // I - Estágio: discovery, proposal, negotiation, closed_won
      'probability',  // J - Probabilidade de fechamento (%)
      'close_date',   // K - Data prevista de fechamento
      'created_at',   // L - Data de criação
      'updated_at',   // M - Data de última atualização
      // Discovery
      'discovery_transcription_id', // N - ID da transcrição vinculada
      'discovery_meeting_id',       // O - ID da reunião
      // Proposal
      'proposal_valor_original',    // P - Valor original da proposta
      'proposal_desconto',          // Q - Desconto aplicado
      'proposal_valor_final',       // R - Valor final com desconto
      'proposal_servico',           // S - Serviço/produto proposto
      'proposal_data_inicio',       // T - Data de início do serviço
      // Negotiation
      'negotiation_transcription_id', // U - ID da transcrição de negociação
      'negotiation_meeting_id',       // V - ID da reunião de negociação
      'negotiation_resultado',        // W - Resultado (positivo/negativo)
      'negotiation_sentimento',       // X - Sentimento geral
      'negotiation_manual',           // Y - Se foi entrada manual (true/false)
      'negotiation_observacoes'       // Z - Observações adicionais
    ];

    console.log(`\n✨ Novos headers (${newHeaders.length} colunas)`);

    // 3. Escrever novos headers
    await writeSheet(SHEET_ID, 'pipeline!A1:Z1', [newHeaders]);

    console.log('\n✅ Headers atualizados com sucesso!');
    console.log('\n📋 Novas colunas adicionadas:');
    console.log('  N-O: Discovery (transcription_id, meeting_id)');
    console.log('  P-T: Proposal (valor_original, desconto, valor_final, servico, data_inicio)');
    console.log('  U-Z: Negotiation (transcription_id, meeting_id, resultado, sentimento, manual, observacoes)');

    // 4. Ler todas as linhas existentes e expandir para 26 colunas
    const allData = await readSheet(SHEET_ID, 'pipeline!A:M');

    if (allData && allData.length > 1) {
      console.log(`\n📦 Expandindo ${allData.length - 1} linhas de dados para 26 colunas...`);

      const expandedData = allData.slice(1).map(row => {
        // Expandir cada linha para ter 26 colunas (preencher com vazio)
        const expandedRow = [...row];
        while (expandedRow.length < 26) {
          expandedRow.push('');
        }
        return expandedRow;
      });

      // Escrever linhas expandidas
      if (expandedData.length > 0) {
        await writeSheet(SHEET_ID, `pipeline!A2:Z${expandedData.length + 1}`, expandedData);
        console.log('✅ Linhas de dados expandidas com sucesso!');
      }
    }

    console.log('\n🎉 Processo concluído! O Google Sheets agora tem 26 colunas (A:Z)');

  } catch (error) {
    console.error('\n❌ Erro ao atualizar colunas:', error.message);
    process.exit(1);
  }
}

// Executar
addPipelineColumns()
  .then(() => {
    console.log('\n✨ Script finalizado com sucesso!');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n💥 Erro fatal:', err);
    process.exit(1);
  });

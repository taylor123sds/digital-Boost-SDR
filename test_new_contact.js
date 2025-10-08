/**
 * TESTE DE NOVO CONTATO - 558496791624
 * Simula primeiro contato com o fluxo estruturado
 */

import { processMessageUltraFast } from './src/tools/structured_flow_integration.js';

async function testNewContact() {
  console.log('🧪 TESTANDO NOVO CONTATO: 558496791624\n');

  const contactData = {
    phone: '558496791624',
    message: 'Olá',
    profile: {
      name: 'Cliente Teste',
      status: 'Empresário de Natal/RN',
      avatar: null
    }
  };

  console.log('📱 Contato:', contactData.phone);
  console.log('💬 Mensagem:', contactData.message);
  console.log('👤 Perfil:', contactData.profile.name, '-', contactData.profile.status);
  console.log(''.padEnd(50, '-'));

  try {
    const startTime = Date.now();

    // Simula primeira mensagem "Olá"
    console.log('\n🔄 PROCESSANDO PRIMEIRO CONTATO...\n');

    const result = await processMessageUltraFast(
      contactData.phone,
      contactData.message,
      contactData.profile
    );

    const processingTime = Date.now() - startTime;

    console.log('⏱️  Tempo de processamento:', processingTime + 'ms');
    console.log('✅ Sucesso:', result.success);

    if (result.structured_flow) {
      console.log('📊 Fase atual:', result.structured_flow.current_phase);
      console.log('📈 Progresso:', result.structured_flow.flow_progress?.percentage + '%');

      if (result.structured_flow.message_sent) {
        console.log('\n📝 MENSAGEM DE RESPOSTA:');
        console.log(''.padEnd(50, '='));
        console.log(result.structured_flow.message_sent);
        console.log(''.padEnd(50, '='));
      }

      if (result.analysis) {
        console.log('\n🔍 ANÁLISE:');
        console.log('  • Segmento detectado:', result.analysis.segment_detected);
        console.log('  • Lead conhecido:', result.analysis.lead_enriched ? 'SIM' : 'NÃO');
        console.log('  • Nível de personalização:', result.analysis.personalization_level);
      }

      if (result.system_metadata) {
        console.log('\n🏷️  METADADOS:');
        console.log('  • Próxima ação:', result.system_metadata.next_action);
        console.log('  • Versão do fluxo:', result.system_metadata.version);
        console.log('  • ID de processamento:', result.system_metadata.processing_id);
      }

    } else {
      console.log('❌ Fluxo estruturado não foi executado');
      console.log('📄 Resposta:', result.response);
    }

    // Simula resposta do cliente
    console.log('\n\n🔄 SIMULANDO RESPOSTA DO CLIENTE...\n');

    const clientResponse = 'Interessante, me conte mais sobre isso';
    console.log('💬 Cliente responde:', clientResponse);

    const result2 = await processMessageUltraFast(
      contactData.phone,
      clientResponse,
      contactData.profile
    );

    if (result2.structured_flow?.message_sent) {
      console.log('\n📝 SEGUNDA MENSAGEM (DESCOBERTA):');
      console.log(''.padEnd(50, '='));
      console.log(result2.structured_flow.message_sent);
      console.log(''.padEnd(50, '='));
      console.log('📊 Nova fase:', result2.structured_flow.current_phase);
      console.log('📈 Progresso:', result2.structured_flow.flow_progress?.percentage + '%');
    }

  } catch (error) {
    console.error('💥 ERRO:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Executa teste
testNewContact();
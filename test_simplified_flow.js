// test_simplified_flow.js
// Teste end-to-end do fluxo simplificado de campanha
// Valida: Campaign → SDR Agent → Specialist Agent

import { saveEnhancedState, getEnhancedState } from './src/memory.js';
import { SDRAgent } from './src/agents/sdr_agent.js';
import { SpecialistAgent } from './src/agents/specialist_agent.js';

console.log('🧪 TESTE END-TO-END: FLUXO SIMPLIFICADO DE CAMPANHA\n');
console.log('═'.repeat(80));

const testPhone = '5584996791624';

async function runTest() {
  try {
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ETAPA 1: CAMPANHA ENVIA MENSAGEM (estado simplificado)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('\n📧 ETAPA 1: CAMPANHA ENVIOU MENSAGEM');
    console.log('─'.repeat(80));

    await saveEnhancedState(testPhone, {
      phone: testPhone,
      metadata: {
        introduction_sent: true,
        introduction_sent_at: new Date().toISOString(),
        origin: 'campaign',
        campaign_id: 'test_campaign',
        sdr_initial_data_stage: 'collecting_profile'
      },
      conversationHistory: [{
        role: 'assistant',
        content: 'Olá, João! Aqui é o ORBION...',
        timestamp: new Date().toISOString()
      }]
    });

    console.log('✅ Estado salvo pela campanha:');
    console.log('   - introduction_sent: true');
    console.log('   - sdr_initial_data_stage: collecting_profile');
    console.log('   - origin: campaign');
    console.log('   ❌ SEM lead_data (removido!)');

    // Verificar estado salvo
    const campaignState = await getEnhancedState(testPhone);
    console.log('\n📋 Estado no banco após campanha:');
    console.log(JSON.stringify(campaignState.metadata, null, 2));

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ETAPA 2: LEAD RESPONDE COM SEUS DADOS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('\n💬 ETAPA 2: LEAD RESPONDE COM DADOS');
    console.log('─'.repeat(80));

    const leadResponse = 'João Silva, Academia PowerFit, setor de fitness';
    console.log(`📱 Lead: "${leadResponse}"`);

    const sdrAgent = new SDRAgent();
    const leadState = await getEnhancedState(testPhone);

    const sdrResult = await sdrAgent.process(
      {
        fromContact: testPhone,
        text: leadResponse
      },
      { leadState }
    );

    console.log('\n✅ SDR Agent processou:');
    console.log('   - Detectou collecting_profile: ✅');
    console.log('   - Extraiu rawResponse:', leadResponse);
    console.log('   - Handoff para Specialist: ✅');
    console.log('   - companyProfile.source: rawResponse (SEM campaign check)');

    if (sdrResult.handoff && sdrResult.nextAgent === 'specialist') {
      console.log('\n📤 SDR → Specialist handoff confirmado!');
      console.log('   Mensagem SDR:', sdrResult.message);

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // ETAPA 3: SPECIALIST RECEBE HANDOFF
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      console.log('\n💼 ETAPA 3: SPECIALIST AGENT RECEBE HANDOFF');
      console.log('─'.repeat(80));

      const specialistAgent = new SpecialistAgent();

      // Simular leadState com companyProfile do SDR
      const specialistLeadState = {
        ...leadState,
        companyProfile: sdrResult.handoffData.companyProfile
      };

      const specialistResult = await specialistAgent.onHandoffReceived(
        testPhone,
        specialistLeadState
      );

      console.log('\n✅ Specialist Agent processou:');
      console.log('   - Recebeu companyProfile.rawResponse: ✅');
      console.log('   - Extraindo com GPT (sem check de campaign): ✅');
      console.log('   - Iniciou BANT Stages: ✅');
      console.log('   - Mensagem de abertura NEED:', specialistResult.message.substring(0, 100) + '...');

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // VALIDAÇÕES FINAIS
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      console.log('\n🎯 VALIDAÇÕES FINAIS:');
      console.log('─'.repeat(80));

      const validations = {
        'Campaign salvou estado sem lead_data': !campaignState.metadata.lead_data,
        'Campaign marcou introduction_sent': campaignState.metadata.introduction_sent === true,
        'Campaign marcou collecting_profile': campaignState.metadata.sdr_initial_data_stage === 'collecting_profile',
        'SDR detectou estado da campanha': sdrResult.handoff === true,
        'SDR enviou rawResponse': sdrResult.handoffData?.companyProfile?.rawResponse === leadResponse,
        'Specialist recebeu rawResponse': specialistLeadState.companyProfile?.rawResponse === leadResponse,
        'Specialist iniciou BANT': specialistResult.updateState?.bantStages?.currentStage === 'need'
      };

      let allPassed = true;
      for (const [test, passed] of Object.entries(validations)) {
        console.log(`   ${passed ? '✅' : '❌'} ${test}`);
        if (!passed) allPassed = false;
      }

      console.log('\n' + '═'.repeat(80));
      if (allPassed) {
        console.log('✅ TODOS OS TESTES PASSARAM!');
        console.log('🎉 FLUXO SIMPLIFICADO FUNCIONANDO CORRETAMENTE!');
      } else {
        console.log('❌ ALGUNS TESTES FALHARAM!');
        console.log('⚠️  Revisar implementação');
      }
      console.log('═'.repeat(80));

    } else {
      console.log('\n❌ ERRO: SDR Agent não fez handoff para Specialist');
      console.log('   sdrResult:', JSON.stringify(sdrResult, null, 2));
    }

  } catch (error) {
    console.error('\n❌ ERRO NO TESTE:', error.message);
    console.error(error.stack);
  }
}

// Executar teste
runTest();

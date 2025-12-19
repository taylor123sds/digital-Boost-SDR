/**
 * 🧪 TESTE COMPLETO DO SISTEMA DE PRIMEIRA MENSAGEM
 *
 * Valida 3 cenários:
 * 1. Conversa orgânica com lead novo (template híbrido setorizado)
 * 2. Conversa orgânica com lead novo (template genérico)
 * 3. Resposta a campanha (sem duplicação de primeira mensagem)
 */

import { saveEnhancedState, getEnhancedState } from '../src/memory.js';
import { chatHandler } from '../src/agent.js';
import Database from 'better-sqlite3';

const db = new Database('orbion.db');

console.log('\n🧪 ===== TESTE COMPLETO DO SISTEMA =====\n');

// Função auxiliar para limpar dados de teste
function clearTestData(phone) {
  db.prepare('DELETE FROM whatsapp_messages WHERE phone_number = ?').run(phone);
  db.prepare('DELETE FROM memory WHERE key = ?').run(`enhanced_state_${phone}`);
  console.log(`🧹 Dados limpos para ${phone}\n`);
}

// ============================================================================
// TESTE 1: CONVERSA ORGÂNICA COM SETOR DETECTADO (Ótica)
// ============================================================================
async function test1_OrganicWithSector() {
  console.log('📋 ===== TESTE 1: CONVERSA ORGÂNICA COM SETOR =====\n');

  const TEST_PHONE = '5584111111111';
  clearTestData(TEST_PHONE);

  console.log('📞 Cenário: Lead novo envia primeira mensagem');
  console.log('   Nome: "Ótica Visão Clara"');
  console.log('   Setor: Detectado como "Ótica"\n');

  const userMessage = 'Olá, quero saber mais sobre automação';
  const context = {
    fromContact: TEST_PHONE,
    contactName: 'Ótica Visão Clara',
    metadata: {
      contactProfileName: 'Ótica Visão Clara'
    }
  };

  console.log('🤖 Enviando mensagem para o agent...\n');
  const response = await chatHandler(userMessage, context);

  console.log('📤 Resposta do agent:');
  console.log('---');
  console.log(response.message);
  console.log('---\n');

  // Validações
  const hasOrbionIntro = response.message.includes('Sou ORBION');
  const hasDigitalBoost = response.message.includes('Digital Boost');
  const hasOticaContext = response.message.includes('ótica') || response.message.includes('Ótica');

  console.log('🔍 Validações:');
  console.log(`   ✓ Tem introdução ORBION: ${hasOrbionIntro ? '✅' : '❌'}`);
  console.log(`   ✓ Menciona Digital Boost: ${hasDigitalBoost ? '✅' : '❌'}`);
  console.log(`   ✓ Contexto de Ótica: ${hasOticaContext ? '✅' : '❌'}`);

  const state = await getEnhancedState(TEST_PHONE);
  console.log(`   ✓ Estado salvo: ${state ? '✅' : '❌'}`);
  console.log(`   ✓ Origin: ${state?.metadata?.origin === 'organic' ? '✅ organic' : '❌'}\n`);

  const success = hasOrbionIntro && hasDigitalBoost && hasOticaContext && state?.metadata?.origin === 'organic';

  if (success) {
    console.log('✅ TESTE 1 PASSOU!\n');
  } else {
    console.log('❌ TESTE 1 FALHOU!\n');
  }

  return success;
}

// ============================================================================
// TESTE 2: CONVERSA ORGÂNICA SEM SETOR DETECTADO (Genérico)
// ============================================================================
async function test2_OrganicGeneric() {
  console.log('📋 ===== TESTE 2: CONVERSA ORGÂNICA SEM SETOR =====\n');

  const TEST_PHONE = '5584222222222';
  clearTestData(TEST_PHONE);

  console.log('📞 Cenário: Lead novo sem setor identificável');
  console.log('   Nome: "João Silva"');
  console.log('   Setor: Não detectado (template genérico)\n');

  const userMessage = 'Oi, tudo bem?';
  const context = {
    fromContact: TEST_PHONE,
    contactName: 'João Silva',
    metadata: {
      contactProfileName: 'João Silva'
    }
  };

  console.log('🤖 Enviando mensagem para o agent...\n');
  const response = await chatHandler(userMessage, context);

  console.log('📤 Resposta do agent:');
  console.log('---');
  console.log(response.message);
  console.log('---\n');

  // Validações
  const hasOrbionIntro = response.message.includes('Sou ORBION');
  const hasDigitalBoost = response.message.includes('Digital Boost');
  const hasGenericContent = response.message.includes('empresa') || response.message.includes('automação');

  console.log('🔍 Validações:');
  console.log(`   ✓ Tem introdução ORBION: ${hasOrbionIntro ? '✅' : '❌'}`);
  console.log(`   ✓ Menciona Digital Boost: ${hasDigitalBoost ? '✅' : '❌'}`);
  console.log(`   ✓ Conteúdo genérico: ${hasGenericContent ? '✅' : '❌'}`);

  const state = await getEnhancedState(TEST_PHONE);
  console.log(`   ✓ Estado salvo: ${state ? '✅' : '❌'}`);
  console.log(`   ✓ Origin: ${state?.metadata?.origin === 'organic' ? '✅ organic' : '❌'}\n`);

  const success = hasOrbionIntro && hasDigitalBoost && hasGenericContent && state?.metadata?.origin === 'organic';

  if (success) {
    console.log('✅ TESTE 2 PASSOU!\n');
  } else {
    console.log('❌ TESTE 2 FALHOU!\n');
  }

  return success;
}

// ============================================================================
// TESTE 3: RESPOSTA A CAMPANHA (SEM DUPLICAÇÃO)
// ============================================================================
async function test3_CampaignResponse() {
  console.log('📋 ===== TESTE 3: RESPOSTA A CAMPANHA =====\n');

  const TEST_PHONE = '5584333333333';
  clearTestData(TEST_PHONE);

  console.log('📞 Cenário: Lead respondendo campanha');
  console.log('   Campanha já enviou primeira mensagem');
  console.log('   Objetivo: NÃO enviar outra primeira mensagem\n');

  // ETAPA 1: Simular campanha enviando mensagem
  console.log('📧 [ETAPA 1] Campanha enviando primeira mensagem...\n');

  const campaignState = {
    contactId: TEST_PHONE,
    state: {
      current: 'opening',
      subState: 'first_contact',
      lastUpdate: new Date().toISOString()
    },
    bant: {
      budget: null,
      authority: null,
      need: null,
      timing: null,
      email: null
    },
    qualification: {
      score: 70,
      archetype: null,
      persona: null
    },
    engagement: {
      level: 'low',
      lastInteraction: new Date().toISOString()
    },
    metadata: {
      origin: 'campaign',  // 🔑 CAMPO CRÍTICO
      campaign_id: 'test_campaign_001',
      sent_at: new Date().toISOString(),
      lead_info: {
        name: 'Padaria Pão Quentinho',
        company: 'Padaria Pão Quentinho',
        sector: 'Padaria'
      }
    },
    nextBestAction: 'wait_for_response'
  };

  await saveEnhancedState(TEST_PHONE, campaignState);
  console.log('✅ Estado de campanha salvo\n');

  // ETAPA 2: Lead responde
  console.log('💬 [ETAPA 2] Lead respondendo campanha...\n');

  const userMessage = 'Oi, tenho interesse sim!';
  const context = {
    fromContact: TEST_PHONE,
    contactName: 'Padaria Pão Quentinho',
    metadata: {
      contactProfileName: 'Padaria Pão Quentinho'
    }
  };

  console.log('🤖 Processando resposta no agent...\n');
  const response = await chatHandler(userMessage, context);

  console.log('📤 Resposta do agent:');
  console.log('---');
  console.log(response.message);
  console.log('---\n');

  // Validações
  const hasOrbionIntro = response.message.includes('Sou ORBION');
  const isBantContinuation = !hasOrbionIntro && response.message.length < 500;

  console.log('🔍 Validações:');
  console.log(`   ✓ NÃO enviou segunda primeira mensagem: ${!hasOrbionIntro ? '✅' : '❌'}`);
  console.log(`   ✓ Continuou fluxo BANT: ${isBantContinuation ? '✅' : '❌'}`);

  const state = await getEnhancedState(TEST_PHONE);
  console.log(`   ✓ Estado manteve origin=campaign: ${state?.metadata?.origin === 'campaign' ? '✅' : '❌'}\n`);

  const success = !hasOrbionIntro && isBantContinuation && state?.metadata?.origin === 'campaign';

  if (success) {
    console.log('✅ TESTE 3 PASSOU!\n');
  } else {
    console.log('❌ TESTE 3 FALHOU!\n');
  }

  return success;
}

// ============================================================================
// EXECUTOR PRINCIPAL
// ============================================================================
async function runAllTests() {
  try {
    console.log('🚀 Iniciando bateria de testes...\n');
    console.log('═'.repeat(80));
    console.log('\n');

    const result1 = await test1_OrganicWithSector();
    console.log('═'.repeat(80));
    console.log('\n');

    const result2 = await test2_OrganicGeneric();
    console.log('═'.repeat(80));
    console.log('\n');

    const result3 = await test3_CampaignResponse();
    console.log('═'.repeat(80));
    console.log('\n');

    // Resumo final
    console.log('📊 ===== RESUMO DOS TESTES =====\n');
    console.log(`   ${result1 ? '✅' : '❌'} Teste 1: Conversa orgânica com setor`);
    console.log(`   ${result2 ? '✅' : '❌'} Teste 2: Conversa orgânica genérica`);
    console.log(`   ${result3 ? '✅' : '❌'} Teste 3: Resposta a campanha\n`);

    const allPassed = result1 && result2 && result3;

    if (allPassed) {
      console.log('🎉 TODOS OS TESTES PASSARAM! Sistema funcionando corretamente.\n');
      process.exit(0);
    } else {
      console.log('⚠️  ALGUNS TESTES FALHARAM. Revise a implementação.\n');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ ERRO FATAL:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Executar testes
runAllTests();

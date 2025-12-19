#!/usr/bin/env node
// test_human_confirmation.js - Teste do fluxo de confirmação humana

import dotenv from 'dotenv';
dotenv.config();

import { SDRAgent } from '../src/agents/sdr_agent.js';

console.log('🧪 ===== TESTE DE CONFIRMAÇÃO HUMANA =====\n');

const sdrAgent = new SDRAgent();
const leadPhone = '5584999887766';

async function testHumanConfirmation() {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 CENÁRIO 1: Lead envia primeira mensagem');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    let leadState = {
      contactId: leadPhone,
      currentAgent: 'sdr',
      metadata: {
        contactProfileName: 'Taylor Teste'
      }
    };

    console.log('👤 Lead: "Olá, gostaria de saber mais sobre os serviços"\n');

    let response = await sdrAgent.process(
      {
        fromContact: leadPhone,
        text: 'Olá, gostaria de saber mais sobre os serviços',
        metadata: {}
      },
      {
        leadState,
        metadata: { contactProfileName: 'Taylor Teste' }
      }
    );

    console.log('🤖 ORBION:\n', response.message, '\n');
    console.log('📊 Metadata:', JSON.stringify(response.metadata, null, 2), '\n');

    if (response.updateState) {
      Object.assign(leadState, response.updateState);
    }

    // Verificar se pediu confirmação
    if (!response.metadata?.requiresHumanOk) {
      console.log('❌ ERRO: Sistema NÃO pediu confirmação humana!\n');
      return;
    }

    console.log('✅ TESTE 1 PASSOU: Sistema pediu confirmação "HUMANO OK"\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 CENÁRIO 2: Bot continua enviando mensagens (sem confirmar)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    for (let i = 1; i <= 3; i++) {
      console.log(`👤 Bot (tentativa ${i}/3): "Olá! Visite nosso site!"\n`);

      response = await sdrAgent.process(
        {
          fromContact: leadPhone,
          text: 'Olá! Visite nosso site!',
          metadata: {}
        },
        {
          leadState,
          metadata: { contactProfileName: 'Taylor Teste' }
        }
      );

      if (response.updateState) {
        Object.assign(leadState, response.updateState);
      }

      if (i < 3) {
        if (response.silent) {
          console.log('🔕 Sistema ignorou mensagem (silencioso)\n');
          console.log('📊 Tentativas:', leadState.metadata?.humanConfirmationAttempts, '/3\n');
        } else {
          console.log('⚠️ Sistema respondeu:', response.message, '\n');
        }
      } else {
        // Terceira tentativa deve bloquear
        if (response.metadata?.blocked) {
          console.log('🚫 Sistema BLOQUEOU o lead!\n');
          console.log('🤖 Mensagem de bloqueio:\n', response.message, '\n');
        } else {
          console.log('❌ ERRO: Sistema NÃO bloqueou após 3 tentativas!\n');
          return;
        }
      }
    }

    console.log('✅ TESTE 2 PASSOU: Sistema bloqueou após 3 tentativas sem confirmação\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 CENÁRIO 3: Lead bloqueado tenta enviar nova mensagem');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('👤 Lead bloqueado: "Olá!"\n');

    response = await sdrAgent.process(
      {
        fromContact: leadPhone,
        text: 'Olá!',
        metadata: {}
      },
      {
        leadState,
        metadata: { contactProfileName: 'Taylor Teste' }
      }
    );

    if (response.silent && response.metadata?.blocked) {
      console.log('✅ Sistema ignorou mensagem de lead bloqueado\n');
    } else {
      console.log('❌ ERRO: Sistema respondeu para lead bloqueado!\n');
      return;
    }

    console.log('✅ TESTE 3 PASSOU: Lead bloqueado é ignorado permanentemente\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 CENÁRIO 4: Lead REAL confirma "HUMANO OK"');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Novo lead que vai confirmar corretamente
    const leadPhone2 = '5584999887777';
    let leadState2 = {
      contactId: leadPhone2,
      currentAgent: 'sdr',
      metadata: {
        contactProfileName: 'João Real'
      }
    };

    console.log('👤 Lead: "Olá, quero informações"\n');

    response = await sdrAgent.process(
      {
        fromContact: leadPhone2,
        text: 'Olá, quero informações',
        metadata: {}
      },
      {
        leadState: leadState2,
        metadata: { contactProfileName: 'João Real' }
      }
    );

    console.log('🤖 ORBION pede confirmação:\n', response.message.substring(0, 150), '...\n');

    if (response.updateState) {
      Object.assign(leadState2, response.updateState);
    }

    console.log('👤 Lead: "HUMANO OK"\n');

    response = await sdrAgent.process(
      {
        fromContact: leadPhone2,
        text: 'HUMANO OK',
        metadata: {}
      },
      {
        leadState: leadState2,
        metadata: { contactProfileName: 'João Real' }
      }
    );

    console.log('🤖 ORBION:\n', response.message, '\n');

    if (response.updateState) {
      Object.assign(leadState2, response.updateState);
    }

    if (leadState2.metadata?.humanConfirmed) {
      console.log('✅ TESTE 4 PASSOU: Lead confirmou e foi marcado como humano\n');
    } else {
      console.log('❌ ERRO: Lead não foi marcado como humano confirmado!\n');
      return;
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ TODOS OS TESTES PASSARAM!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📋 RESUMO:');
    console.log('1. ✅ Sistema sempre pede confirmação "HUMANO OK"');
    console.log('2. ✅ Bots são bloqueados após 3 tentativas sem confirmação');
    console.log('3. ✅ Leads bloqueados são ignorados permanentemente');
    console.log('4. ✅ Leads reais que confirmam continuam o fluxo normalmente\n');

    console.log('🎉 SISTEMA DE CONFIRMAÇÃO HUMANA FUNCIONANDO PERFEITAMENTE!\n');

  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
    console.error(error.stack);
  }
}

testHumanConfirmation();

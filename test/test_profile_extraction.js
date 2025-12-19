// test_profile_extraction.js
// Script de teste automatizado para verificar extração de perfil

import Database from 'better-sqlite3';
import fetch from 'node-fetch';

const TEST_PHONE = '558496791624';
const API_BASE = 'http://localhost:3001';

console.log('\n🧪 TESTE: Extração de Perfil da Empresa\n');
console.log('═'.repeat(80));

// 1. Resetar conversa do lead de teste
console.log('\n📌 ETAPA 1: Resetando conversa do lead de teste...');
const db = new Database('./orbion.db');

try {
  db.exec(`DELETE FROM enhanced_conversation_states WHERE phone_number = '${TEST_PHONE}'`);
  console.log(`✅ Lead ${TEST_PHONE} removido do banco`);
} catch (error) {
  console.log(`⚠️ Erro ao resetar (pode não existir): ${error.message}`);
}

db.close();

// 2. Simular primeira mensagem
console.log('\n📌 ETAPA 2: Simulando primeira mensagem "Ola"...');

const firstMessage = {
  from: TEST_PHONE,
  text: 'Ola',
  messageType: 'text',
  timestamp: Date.now(),
  metadata: {
    contactProfileName: 'Teste Automatizado',
    humanVerified: true  // Simular webhook verification
  }
};

try {
  const response1 = await fetch(`${API_BASE}/api/webhook/evolution`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: 'messages.upsert',
      instance: 'digitalboost',
      data: {
        key: {
          remoteJid: `${TEST_PHONE}@s.whatsapp.net`,
          fromMe: false,
          id: `TEST_${Date.now()}_1`
        },
        pushName: 'Teste Automatizado',
        message: { conversation: 'Ola' },
        messageType: 'conversation',
        messageTimestamp: Math.floor(Date.now() / 1000)
      }
    })
  });

  const result1 = await response1.json();
  console.log(`✅ Primeira mensagem enviada`);
  console.log(`📤 Resposta: "${result1.response?.substring(0, 100)}..."`);

  // Aguardar 2 segundos para processar
  await new Promise(resolve => setTimeout(resolve, 2000));
} catch (error) {
  console.error(`❌ Erro na primeira mensagem: ${error.message}`);
  process.exit(1);
}

// 3. Simular resposta com perfil
console.log('\n📌 ETAPA 3: Simulando resposta com perfil da empresa...');

const profileMessage = {
  from: TEST_PHONE,
  text: 'Taylor Lapenda / Digital Boost Tecnologia / Consultoria em Growth e Automação',
  messageType: 'text',
  timestamp: Date.now(),
  metadata: {
    contactProfileName: 'Teste Automatizado',
    humanVerified: true
  }
};

try {
  const response2 = await fetch(`${API_BASE}/api/webhook/evolution`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: 'messages.upsert',
      instance: 'digitalboost',
      data: {
        key: {
          remoteJid: `${TEST_PHONE}@s.whatsapp.net`,
          fromMe: false,
          id: `TEST_${Date.now()}_2`
        },
        pushName: 'Teste Automatizado',
        message: {
          conversation: 'Taylor Lapenda / Digital Boost Tecnologia / Consultoria em Growth e Automação'
        },
        messageType: 'conversation',
        messageTimestamp: Math.floor(Date.now() / 1000)
      }
    })
  });

  const result2 = await response2.json();
  console.log(`✅ Mensagem com perfil enviada`);
  console.log(`📤 Resposta: "${result2.response?.substring(0, 100)}..."`);

  // Aguardar 5 segundos para GPT processar
  console.log('\n⏳ Aguardando 5 segundos para GPT extrair perfil...');
  await new Promise(resolve => setTimeout(resolve, 5000));
} catch (error) {
  console.error(`❌ Erro na mensagem de perfil: ${error.message}`);
  process.exit(1);
}

// 4. Verificar banco de dados
console.log('\n📌 ETAPA 4: Verificando dados no banco...');

const db2 = new Database('./orbion.db', { readonly: true });

try {
  const row = db2.prepare(`
    SELECT
      phone_number,
      current_agent,
      company_profile,
      bant_stages,
      metadata
    FROM enhanced_conversation_states
    WHERE phone_number = ?
  `).get(TEST_PHONE);

  if (!row) {
    console.error(`❌ Lead não encontrado no banco!`);
    process.exit(1);
  }

  console.log(`\n📊 RESULTADOS DO BANCO:`);
  console.log(`─`.repeat(80));
  console.log(`👤 Telefone: ${row.phone_number}`);
  console.log(`🤖 Agente Ativo: ${row.current_agent}`);

  // Parse company_profile
  let companyProfile = {};
  try {
    companyProfile = JSON.parse(row.company_profile || '{}');
  } catch (e) {
    companyProfile = {};
  }

  console.log(`\n🏢 COMPANY PROFILE:`);
  console.log(`─`.repeat(80));
  if (Object.keys(companyProfile).length === 0) {
    console.log(`❌ VAZIO - Perfil NÃO foi extraído!`);
  } else {
    console.log(`✅ Perfil EXTRAÍDO com sucesso:`);
    console.log(JSON.stringify(companyProfile, null, 2));
  }

  // Parse bant_stages
  let bantStages = {};
  try {
    bantStages = JSON.parse(row.bant_stages || '{}');
  } catch (e) {
    bantStages = {};
  }

  console.log(`\n📋 BANT STAGES:`);
  console.log(`─`.repeat(80));
  console.log(`Stage Atual: ${bantStages.currentStage || 'N/A'}`);
  console.log(`Completo: ${bantStages.isComplete ? 'Sim' : 'Não'}`);

  // Resultado final
  console.log(`\n🎯 RESULTADO DO TESTE:`);
  console.log(`═`.repeat(80));

  if (Object.keys(companyProfile).length > 0 && companyProfile.nome && companyProfile.empresa) {
    console.log(`✅ TESTE PASSOU - Perfil extraído corretamente!`);
    console.log(`   Nome: ${companyProfile.nome}`);
    console.log(`   Empresa: ${companyProfile.empresa}`);
    console.log(`   Setor: ${companyProfile.setor}`);
    process.exit(0);
  } else {
    console.log(`❌ TESTE FALHOU - Perfil não foi extraído ou está incompleto`);
    console.log(`   Company Profile: ${JSON.stringify(companyProfile)}`);
    process.exit(1);
  }

} catch (error) {
  console.error(`❌ Erro ao verificar banco: ${error.message}`);
  process.exit(1);
} finally {
  db2.close();
}

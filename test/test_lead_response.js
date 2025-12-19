// test_lead_response.js
// Script de teste para sistema de registro de leads que respondem
// Sistema de 3 Estágios: SEM INTERESSE | POSSIVELMENTE INTERESSADO | INTERESSADO

import { saveLeadResponse } from '../src/tools/google_sheets.js';

console.log('🧪 TESTE: Sistema de 3 Estágios de Classificação de Leads\n');
console.log('='.repeat(70));
console.log('\n📋 ESTÁGIOS:');
console.log('1️⃣  ❌ SEM INTERESSE - Lead pediu para parar mensagens');
console.log('2️⃣  🟡 POSSIVELMENTE INTERESSADO - Continuou conversa');
console.log('3️⃣  ✅ INTERESSADO - Confirmou reunião/interesse\n');
console.log('='.repeat(70));

// Simula leads nos 3 estágios
const leadsQueResponderam = [
  // ESTÁGIO 1: SEM INTERESSE
  {
    numero: '5584111111111',
    nome: 'Carlos Rejeição',
    mensagem: 'Para de me mandar mensagem, não tenho interesse',
    qualificationScore: 0
  },
  {
    numero: '5584222222222',
    nome: 'Ana Bloqueio',
    mensagem: 'Não quero, pode remover meu número',
    qualificationScore: 0
  },

  // ESTÁGIO 2: POSSIVELMENTE INTERESSADO
  {
    numero: '5584333333333',
    nome: 'Pedro Curioso',
    mensagem: 'Me fala mais sobre isso',
    qualificationScore: 30
  },
  {
    numero: '5584444444444',
    nome: 'Julia Exploração',
    mensagem: 'Quanto custa?',
    qualificationScore: 50
  },

  // ESTÁGIO 3: INTERESSADO
  {
    numero: '5584555555555',
    nome: 'Roberto Qualificado',
    mensagem: 'Sim, quero agendar a reunião!',
    qualificationScore: 85
  },
  {
    numero: '5584666666666',
    nome: 'Fernanda Interessada',
    mensagem: 'Gostei da proposta, vamos conversar',
    qualificationScore: 90
  }
];

async function testarRegistroLeads() {
  console.log('\n📊 Testando registro de leads na planilha LEADS-RESPOSTA...\n');

  for (const lead of leadsQueResponderam) {
    try {
      console.log(`\n🔵 Processando: ${lead.nome} (${lead.numero})`);

      const resultado = await saveLeadResponse(null, lead);

      console.log(`✅ Lead registrado com sucesso!`);
      console.log(`   - Timestamp: ${resultado.timestamp}`);
      console.log(`   - Nome: ${resultado.nome}`);
      console.log(`   - Número: ${resultado.numero}`);

    } catch (error) {
      console.error(`❌ Erro ao registrar ${lead.nome}:`, error.message);
    }

    // Aguarda 1 segundo entre registros
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ Teste concluído!');
  console.log('\n📋 Verifique a planilha do Google Sheets na aba "LEADS-RESPOSTA"');
  console.log('   Os leads devem aparecer com formato: Número | Nome | Status\n');
}

// Executar teste
testarRegistroLeads().catch(error => {
  console.error('\n❌ Erro no teste:', error.message);
  process.exit(1);
});

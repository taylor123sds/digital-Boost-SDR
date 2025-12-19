// test_all_logic_contexts.js
// 🧪 Teste Completo de Todas as Lógicas com Contextos Diferentes

const BASE_URL = 'http://localhost:3001';

// Aguardar entre mensagens para simular conversa realística
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Função para enviar mensagem
async function sendMessage(phone, message, name = 'Test User') {
  const timestamp = Math.floor(Date.now() / 1000);
  const messageId = `TEST_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const payload = {
    event: 'messages.upsert',
    instance: 'orbion',
    data: {
      key: {
        remoteJid: `${phone}@s.whatsapp.net`,
        fromMe: false,
        id: messageId
      },
      message: {
        conversation: message
      },
      messageTimestamp: timestamp,
      pushName: name
    }
  };

  try {
    const response = await fetch(`${BASE_URL}/api/webhook/evolution`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      console.error(`❌ Erro HTTP: ${response.status}`);
      return null;
    }

    return await response.text();
  } catch (error) {
    console.error(`❌ Erro ao enviar: ${error.message}`);
    return null;
  }
}

// 🧪 TESTE 1: Bot Detection + HUMANO OK
async function test1_BotDetection() {
  console.log('\n🧪 ===== TESTE 1: BOT DETECTION + HUMANO OK =====\n');

  const phone = '5584998771111';

  console.log('📤 Enviando primeira mensagem...');
  await sendMessage(phone, 'Oi', 'João Silva');
  await sleep(2000);

  console.log('📤 Resposta inicial (deve pedir HUMANO OK)...');
  await sendMessage(phone, 'Tenho interesse', 'João Silva');
  await sleep(2000);

  console.log('📤 Confirmando HUMANO OK...');
  await sendMessage(phone, 'HUMANO OK', 'João Silva');
  await sleep(2000);

  console.log('✅ Teste 1 concluído: Deve ter feito handoff SDR → Specialist\n');
}

// 🧪 TESTE 2: Fluxo BANT Completo (Respostas Específicas)
async function test2_BANTComplete() {
  console.log('\n🧪 ===== TESTE 2: FLUXO BANT COMPLETO (Respostas Específicas) =====\n');

  const phone = '5584998772222';

  console.log('📤 Primeira mensagem...');
  await sendMessage(phone, 'Olá', 'Maria Santos');
  await sleep(2000);

  console.log('📤 Interesse...');
  await sendMessage(phone, 'Sim, tenho interesse', 'Maria Santos');
  await sleep(2000);

  console.log('📤 HUMANO OK...');
  await sendMessage(phone, 'HUMANO OK', 'Maria Santos');
  await sleep(3000);

  console.log('📤 NEED: Vendas (resposta específica esperada)...');
  await sendMessage(phone, 'Vendas', 'Maria Santos');
  await sleep(3000);

  console.log('📤 NEED: Intensidade...');
  await sendMessage(phone, 'Muito grave', 'Maria Santos');
  await sleep(3000);

  console.log('📤 NEED: Consequências...');
  await sendMessage(phone, 'Perdemos clientes toda semana', 'Maria Santos');
  await sleep(3000);

  console.log('📤 BUDGET: R$ 10k (resposta específica esperada)...');
  await sendMessage(phone, 'R$ 10mil por mês', 'Maria Santos');
  await sleep(3000);

  console.log('📤 BUDGET: ROI...');
  await sendMessage(phone, '3x em 6 meses', 'Maria Santos');
  await sleep(3000);

  console.log('📤 BUDGET: Flexibilidade...');
  await sendMessage(phone, 'Posso aumentar se funcionar', 'Maria Santos');
  await sleep(3000);

  console.log('📤 AUTHORITY: Eu decido (resposta específica esperada)...');
  await sendMessage(phone, 'Eu decido sozinho', 'Maria Santos');
  await sleep(3000);

  console.log('📤 AUTHORITY: Autonomia...');
  await sendMessage(phone, 'Tenho autonomia total', 'Maria Santos');
  await sleep(3000);

  console.log('📤 AUTHORITY: Processo...');
  await sendMessage(phone, 'Costumo decidir rápido, em dias', 'Maria Santos');
  await sleep(3000);

  console.log('📤 TIMING: Urgente...');
  await sendMessage(phone, 'É urgente, preciso começar agora', 'Maria Santos');
  await sleep(3000);

  console.log('📤 TIMING: Motivo...');
  await sendMessage(phone, 'Temos meta de trimestre chegando', 'Maria Santos');
  await sleep(3000);

  console.log('📤 TIMING: Prazo ideal...');
  await sendMessage(phone, 'Até 30 dias', 'Maria Santos');
  await sleep(2000);

  console.log('✅ Teste 2 concluído: Deve ter completado BANT e feito handoff para Scheduler\n');
}

// 🧪 TESTE 3: Off-Topic (Pergunta fora do contexto)
async function test3_OffTopic() {
  console.log('\n🧪 ===== TESTE 3: OFF-TOPIC (Perguntas fora do contexto) =====\n');

  const phone = '5584998773333';

  console.log('📤 Primeira mensagem...');
  await sendMessage(phone, 'Olá', 'Pedro Oliveira');
  await sleep(2000);

  console.log('📤 Interesse...');
  await sendMessage(phone, 'Tenho interesse', 'Pedro Oliveira');
  await sleep(2000);

  console.log('📤 HUMANO OK...');
  await sendMessage(phone, 'HUMANO OK', 'Pedro Oliveira');
  await sleep(3000);

  console.log('📤 OFF-TOPIC: Pergunta sobre horário...');
  await sendMessage(phone, 'Vocês atendem até que horas?', 'Pedro Oliveira');
  await sleep(3000);

  console.log('📤 Voltando ao BANT...');
  await sendMessage(phone, 'Nosso problema é marketing', 'Pedro Oliveira');
  await sleep(3000);

  console.log('✅ Teste 3 concluído: Deve ter respondido off-topic com empatia e redirecionado\n');
}

// 🧪 TESTE 4: Opt-Out (Pedido de remoção)
async function test4_OptOut() {
  console.log('\n🧪 ===== TESTE 4: OPT-OUT (Pedido de remoção) =====\n');

  const phone = '5584998774444';

  console.log('📤 Primeira mensagem...');
  await sendMessage(phone, 'Oi', 'Ana Costa');
  await sleep(2000);

  console.log('📤 Pedido de opt-out...');
  await sendMessage(phone, 'Não quero mais receber mensagens, me remove', 'Ana Costa');
  await sleep(2000);

  console.log('✅ Teste 4 concluído: Deve ter removido e enviado confirmação\n');
}

// 🧪 TESTE 5: Respostas Curtas Válidas
async function test5_ShortAnswers() {
  console.log('\n🧪 ===== TESTE 5: RESPOSTAS CURTAS VÁLIDAS =====\n');

  const phone = '5584998775555';

  console.log('📤 Primeira mensagem...');
  await sendMessage(phone, 'Olá', 'Carlos Lima');
  await sleep(2000);

  console.log('📤 Interesse...');
  await sendMessage(phone, 'Sim', 'Carlos Lima');
  await sleep(2000);

  console.log('📤 HUMANO OK...');
  await sendMessage(phone, 'HUMANO OK', 'Carlos Lima');
  await sleep(3000);

  console.log('📤 NEED: Resposta curta "Conversão"...');
  await sendMessage(phone, 'Conversão', 'Carlos Lima');
  await sleep(3000);

  console.log('📤 NEED: Resposta curta "Crítico"...');
  await sendMessage(phone, 'Crítico', 'Carlos Lima');
  await sleep(3000);

  console.log('📤 NEED: Resposta curta...');
  await sendMessage(phone, 'Perdemos receita', 'Carlos Lima');
  await sleep(3000);

  console.log('✅ Teste 5 concluído: Respostas de 1-2 palavras devem ser aceitas\n');
}

// Executar todos os testes
async function runAllTests() {
  console.log('\n🚀 ===== INICIANDO TESTES COMPLETOS DO SISTEMA ORBION =====\n');
  console.log('Aguardando servidor estar pronto...\n');
  await sleep(3000);

  try {
    await test1_BotDetection();
    await test2_BANTComplete();
    await test3_OffTopic();
    await test4_OptOut();
    await test5_ShortAnswers();

    console.log('\n🎉 ===== TODOS OS TESTES CONCLUÍDOS =====\n');
    console.log('📊 Verifique os logs do servidor para validar:');
    console.log('   ✅ Respostas específicas (não genéricas)');
    console.log('   ✅ Bot detection funcionando');
    console.log('   ✅ Off-topic com empatia');
    console.log('   ✅ Opt-out executado');
    console.log('   ✅ Respostas curtas aceitas');
    console.log('\n');

  } catch (error) {
    console.error('\n❌ Erro durante os testes:', error);
  }
}

// Executar
runAllTests().catch(console.error);

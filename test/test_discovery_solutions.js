// test_discovery_solutions.js - Teste do fluxo de discovery de dores e apresentação de soluções

const testConversations = [
  {
    name: 'Conversa 1: Dor de perda de leads → Solução IA',
    messages: [
      { from: 'cliente', text: 'Oi, tudo bem?' },
      { from: 'cliente', text: 'Meu problema é que demoro muito pra responder os clientes e perco vendas' },
      { from: 'cliente', text: 'Sim, as vezes demoro horas pra responder no WhatsApp' },
    ]
  },
  {
    name: 'Conversa 2: Dor de vendas desorganizadas → Solução Growth',
    messages: [
      { from: 'cliente', text: 'Olá' },
      { from: 'cliente', text: 'Meu time de vendas está uma bagunça, não tenho controle nenhum' },
      { from: 'cliente', text: 'Não sei quantos leads tenho, nem em que etapa cada um está' },
    ]
  },
  {
    name: 'Conversa 3: Dor de marca fraca → Solução Branding',
    messages: [
      { from: 'cliente', text: 'Oi' },
      { from: 'cliente', text: 'Minha marca não tem força, o povo não me conhece' },
      { from: 'cliente', text: 'Não tenho identidade visual, cada post é de um jeito' },
    ]
  },
  {
    name: 'Conversa 4: Dor de pouco cliente → Solução Marketing',
    messages: [
      { from: 'cliente', text: 'Oi' },
      { from: 'cliente', text: 'Preciso atrair mais clientes pro meu negócio' },
      { from: 'cliente', text: 'Já tentei fazer posts mas não dá resultado' },
    ]
  },
  {
    name: 'Conversa 5: Cliente pergunta sobre empresa antes de falar da dor',
    messages: [
      { from: 'cliente', text: 'Oi' },
      { from: 'cliente', text: 'O que a Digital Boost faz?' },
      { from: 'cliente', text: 'Interessante. Meu problema é que perco muitos leads' },
    ]
  }
];

async function testDiscoveryFlow() {
  const { default: agent } = await import('../src/agent.js');

  console.log('🧪 TESTE DE DISCOVERY DE DORES E APRESENTAÇÃO DE SOLUÇÕES\n');
  console.log('═'.repeat(80));
  console.log('\n📋 OBJETIVO: Verificar se ORBION:\n');
  console.log('1. Identifica corretamente as dores do cliente');
  console.log('2. Apresenta a solução ESPECÍFICA para aquela dor');
  console.log('3. NÃO despeja todos os 4 serviços de uma vez');
  console.log('4. Mantém abordagem consultiva BANT\n');
  console.log('═'.repeat(80));
  console.log('');

  for (const conversation of testConversations) {
    console.log('\n' + '▶'.repeat(40));
    console.log(`📞 ${conversation.name}`);
    console.log('▶'.repeat(40) + '\n');

    const phoneNumber = `55849${Math.floor(10000000 + Math.random() * 90000000)}`;
    const clientName = `Cliente Teste ${Math.floor(Math.random() * 1000)}`;

    for (let i = 0; i < conversation.messages.length; i++) {
      const msg = conversation.messages[i];

      console.log(`\n${i + 1}. 👤 CLIENTE: "${msg.text}"`);
      console.log('─'.repeat(80));

      try {
        const result = await agent.chatHandler(msg.text, phoneNumber, clientName);

        console.log(`🤖 ORBION: ${result.message.substring(0, 200)}${result.message.length > 200 ? '...' : ''}`);

        // Análise da resposta
        console.log('\n📊 ANÁLISE:');

        // Verificar se detectou dor
        const painKeywords = {
          'demora|demoro|lento|responder': 'Atendimento lento',
          'bagunça|desorganizado|controle|funil|vendas': 'Vendas desorganizadas',
          'marca|identidade|visual|conhecido': 'Marca fraca',
          'atrair|cliente|post|divulgar': 'Baixa atração de clientes'
        };

        let detectedPain = 'Nenhuma';
        for (const [pattern, pain] of Object.entries(painKeywords)) {
          const regex = new RegExp(pattern, 'i');
          if (regex.test(msg.text)) {
            detectedPain = pain;
            break;
          }
        }
        console.log(`   🎯 Dor detectada na mensagem: ${detectedPain}`);

        // Verificar qual solução foi apresentada
        const solutionKeywords = {
          'inteligência artificial|agente|automação|24/7|atendimento automático': 'IA/Automação',
          'growth|funil|crm|processo|playbook|vendas': 'Growth',
          'branding|identidade visual|marca|posicionamento': 'Branding',
          'marketing|campanha|tráfego|aquisição|conteúdo': 'Marketing'
        };

        let presentedSolutions = [];
        for (const [pattern, solution] of Object.entries(solutionKeywords)) {
          const regex = new RegExp(pattern, 'i');
          if (regex.test(result.message)) {
            presentedSolutions.push(solution);
          }
        }

        if (presentedSolutions.length === 0) {
          console.log(`   💡 Solução apresentada: Ainda em discovery (consultivo)`);
        } else if (presentedSolutions.length === 1) {
          console.log(`   ✅ Solução apresentada: ${presentedSolutions[0]} (FOCADA)`);
        } else {
          console.log(`   ⚠️  Soluções apresentadas: ${presentedSolutions.join(', ')} (MÚLTIPLAS - pode estar despejando tudo)`);
        }

        // Verificar se está sendo consultivo
        const hasQuestion = /\?/.test(result.message);
        console.log(`   🔍 Está fazendo perguntas? ${hasQuestion ? 'Sim (consultivo ✓)' : 'Não'}`);

        // Verificar se enviou áudio
        if (result.sendDigitalBoostAudio) {
          console.log(`   🎤 Enviou áudio explicativo sobre Digital Boost: Sim`);
        }

        // Delay para não sobrecarregar
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (err) {
        console.log(`   ❌ ERRO: ${err.message}`);
      }
    }

    console.log('\n' + '═'.repeat(80));
    console.log('Aguardando 2s para próxima conversa...');
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n\n🏁 TESTE CONCLUÍDO!\n');
  console.log('📝 ANÁLISE FINAL:');
  console.log('   - Verifique se cada dor foi mapeada corretamente');
  console.log('   - Verifique se a solução apresentada é específica para a dor');
  console.log('   - Verifique se manteve abordagem consultiva com perguntas');
  console.log('   - Verifique se NÃO apresentou múltiplas soluções simultaneamente\n');
}

testDiscoveryFlow().catch(err => {
  console.error('❌ Erro fatal no teste:', err);
  process.exit(1);
});

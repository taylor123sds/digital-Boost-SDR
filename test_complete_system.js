#!/usr/bin/env node

// test_complete_system.js
// Teste completo do sistema ORBION após correções

import axios from 'axios';
import chalk from 'chalk';

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3001';

console.log(chalk.blue.bold('\n🔬 TESTE COMPLETO DO SISTEMA ORBION\n'));
console.log(chalk.gray('═'.repeat(50)));

// Função para aguardar
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Teste de cada componente
async function runCompleteTest() {
  const testResults = {
    health: false,
    webhook: false,
    processing: false,
    response: false
  };

  try {
    // 1. TESTE DE HEALTH CHECK
    console.log(chalk.yellow('\n📋 Teste 1: Health Check do Sistema'));
    const healthResponse = await axios.get(`${SERVER_URL}/api/health`);
    
    if (healthResponse.data.status === 'healthy') {
      console.log(chalk.green('✅ Sistema está saudável'));
      console.log(chalk.gray(`   Uptime: ${healthResponse.data.uptime}s`));
      console.log(chalk.gray(`   Webhooks recebidos: ${healthResponse.data.stats.webhooksReceived}`));
      console.log(chalk.gray(`   Mensagens processadas: ${healthResponse.data.stats.messagesProcessed}`));
      testResults.health = true;
    } else {
      console.log(chalk.red('❌ Sistema não está saudável'));
    }

    await sleep(1000);

    // 2. TESTE DE WEBHOOK (Mensagem Real)
    console.log(chalk.yellow('\n📋 Teste 2: Processamento de Webhook'));
    
    const testMessage = {
      data: {
        key: {
          remoteJid: "5511999887766@s.whatsapp.net",
          fromMe: false,
          id: `TEST_${Date.now()}`
        },
        message: {
          conversation: "Olá ORBION, quero saber sobre automação"
        }
      },
      instance: "test"
    };

    console.log(chalk.gray('   Enviando mensagem de teste...'));
    const webhookResponse = await axios.post(
      `${SERVER_URL}/webhook/evolution`,
      testMessage,
      { timeout: 5000 }
    );

    if (webhookResponse.status === 200) {
      console.log(chalk.green('✅ Webhook aceito e processado'));
      testResults.webhook = true;
      
      // Aguardar processamento
      console.log(chalk.gray('   Aguardando processamento...'));
      await sleep(3000);
      
      // Verificar se foi processado
      const statsAfter = await axios.get(`${SERVER_URL}/api/health`);
      if (statsAfter.data.stats.messagesProcessed > healthResponse.data.stats.messagesProcessed) {
        console.log(chalk.green('✅ Mensagem foi processada com sucesso'));
        testResults.processing = true;
      }
    }

    await sleep(1000);

    // 3. TESTE DE CHAT DIRETO
    console.log(chalk.yellow('\n📋 Teste 3: Chat API Direto'));
    
    const chatResponse = await axios.post(`${SERVER_URL}/api/chat`, {
      message: "Quanto custa o serviço de automação?",
      context: { isTest: true }
    });

    if (chatResponse.data.response && chatResponse.data.success) {
      console.log(chalk.green('✅ Chat API respondeu corretamente'));
      console.log(chalk.gray(`   Resposta: "${chatResponse.data.response.substring(0, 100)}..."`));
      testResults.response = true;
    }

    await sleep(1000);

    // 4. TESTE DE ESTATÍSTICAS
    console.log(chalk.yellow('\n📋 Teste 4: Verificando Estatísticas'));
    
    const finalStats = await axios.get(`${SERVER_URL}/api/stats`);
    console.log(chalk.green('📊 Estatísticas do Sistema:'));
    
    const stats = finalStats.data;
    console.log(chalk.gray(`   Taxa de sucesso: ${stats.performance.successRate}`));
    console.log(chalk.gray(`   Duplicações bloqueadas: ${stats.webhook.duplicatesBlocked}`));
    console.log(chalk.gray(`   Processamento ativo: ${stats.orchestrator.currentlyProcessing}`));
    console.log(chalk.gray(`   Cache de respostas: ${stats.response.cacheSize}`));

  } catch (error) {
    console.error(chalk.red('\n❌ Erro durante teste:'), error.message);
  }

  // RESULTADO FINAL
  console.log(chalk.blue.bold('\n' + '═'.repeat(50)));
  console.log(chalk.blue.bold('📊 RESULTADO FINAL'));
  console.log(chalk.blue.bold('═'.repeat(50)));

  const totalTests = Object.keys(testResults).length;
  const passedTests = Object.values(testResults).filter(r => r).length;
  const successRate = ((passedTests / totalTests) * 100).toFixed(0);

  console.log(chalk.white(`\nTestes executados: ${totalTests}`));
  console.log(chalk.green(`✅ Passou: ${passedTests}`));
  console.log(chalk.red(`❌ Falhou: ${totalTests - passedTests}`));
  
  console.log(chalk.yellow(`\n📈 Taxa de sucesso: ${successRate}%`));

  // Detalhamento
  console.log(chalk.cyan('\n📋 Detalhamento:'));
  console.log(testResults.health ? chalk.green('  ✅ Health Check OK') : chalk.red('  ❌ Health Check FALHOU'));
  console.log(testResults.webhook ? chalk.green('  ✅ Webhook Processing OK') : chalk.red('  ❌ Webhook Processing FALHOU'));
  console.log(testResults.processing ? chalk.green('  ✅ Message Processing OK') : chalk.red('  ❌ Message Processing FALHOU'));
  console.log(testResults.response ? chalk.green('  ✅ Response Generation OK') : chalk.red('  ❌ Response Generation FALHOU'));

  if (passedTests === totalTests) {
    console.log(chalk.green.bold('\n🎉 SISTEMA 100% FUNCIONAL!'));
    console.log(chalk.green('O ORBION está pronto para receber e responder mensagens!'));
  } else if (passedTests >= 3) {
    console.log(chalk.yellow.bold('\n⚠️ SISTEMA PARCIALMENTE FUNCIONAL'));
    console.log(chalk.yellow('Verifique os componentes que falharam'));
  } else {
    console.log(chalk.red.bold('\n❌ SISTEMA COM PROBLEMAS'));
    console.log(chalk.red('Verifique logs e configurações'));
  }

  // LOGS DE VERIFICAÇÃO
  console.log(chalk.gray('\n💡 Comandos úteis para debug:'));
  console.log(chalk.gray('  pm2 logs orbion-server --lines 50'));
  console.log(chalk.gray('  curl http://localhost:3000/api/health'));
  console.log(chalk.gray('  tail -f logs/error.log'));
  
  return passedTests === totalTests;
}

// Executar teste
(async () => {
  try {
    console.log(chalk.gray('Verificando servidor...'));
    await axios.get(`${SERVER_URL}/api/health`, { timeout: 3000 });
    console.log(chalk.green('✅ Servidor está online\n'));
    
    const success = await runCompleteTest();
    process.exit(success ? 0 : 1);
    
  } catch (error) {
    console.log(chalk.red('❌ Servidor não está acessível'));
    console.log(chalk.yellow(`Certifique-se que está rodando em ${SERVER_URL}`));
    process.exit(1);
  }
})();

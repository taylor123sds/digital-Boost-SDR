#!/usr/bin/env node

// monitor_orbion.js
// Monitor em tempo real do sistema ORBION

import axios from 'axios';
import chalk from 'chalk';
import readline from 'readline';

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';

// Limpar console
const clearConsole = () => {
  process.stdout.write('\x1Bc');
};

// Formatar uptime
const formatUptime = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours}h ${minutes}m ${secs}s`;
};

// Formatar número
const formatNumber = (num) => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

// Buscar estatísticas
async function fetchStats() {
  try {
    const [health, stats] = await Promise.all([
      axios.get(`${SERVER_URL}/api/health`),
      axios.get(`${SERVER_URL}/api/stats`)
    ]);
    
    return {
      health: health.data,
      stats: stats.data,
      online: true
    };
  } catch (error) {
    return {
      online: false,
      error: error.message
    };
  }
}

// Renderizar dashboard
function renderDashboard(data) {
  clearConsole();
  
  // Header
  console.log(chalk.cyan.bold('╔═══════════════════════════════════════════════════════════════╗'));
  console.log(chalk.cyan.bold('║') + chalk.white.bold('           🤖 ORBION AI AGENT - MONITOR EM TEMPO REAL         ') + chalk.cyan.bold('║'));
  console.log(chalk.cyan.bold('╚═══════════════════════════════════════════════════════════════╝'));
  console.log();
  
  if (!data.online) {
    console.log(chalk.red.bold('❌ SISTEMA OFFLINE'));
    console.log(chalk.red(`Erro: ${data.error}`));
    return;
  }
  
  const h = data.health;
  const s = data.stats;
  
  // Status Geral
  const statusColor = h.status === 'healthy' ? chalk.green : chalk.red;
  console.log(statusColor.bold(`📊 STATUS: ${h.status.toUpperCase()}`));
  console.log(chalk.gray(`⏱️  Uptime: ${formatUptime(h.uptime)}`));
  console.log(chalk.gray(`💾 Memória: ${h.memory.used}MB / ${h.memory.total}MB (${Math.round(h.memory.used/h.memory.total*100)}%)`));
  console.log();
  
  // Estatísticas de Mensagens
  console.log(chalk.yellow.bold('📨 MENSAGENS'));
  console.log(chalk.white(`  Total Webhooks: ${formatNumber(h.stats.webhooksReceived)}`));
  console.log(chalk.white(`  Processadas: ${formatNumber(h.stats.messagesProcessed)}`));
  console.log(chalk.white(`  Erros: ${chalk.red(h.stats.errors)}`));
  
  const successRate = h.stats.messagesProcessed > 0 
    ? ((h.stats.messagesProcessed - h.stats.errors) / h.stats.messagesProcessed * 100).toFixed(1)
    : 100;
  const rateColor = successRate >= 95 ? chalk.green : successRate >= 80 ? chalk.yellow : chalk.red;
  console.log(chalk.white(`  Taxa de Sucesso: ${rateColor(successRate + '%')}`));
  console.log();
  
  // Webhook Handler
  console.log(chalk.blue.bold('🔗 WEBHOOK HANDLER'));
  if (s.webhook) {
    console.log(chalk.white(`  Duplicações Bloqueadas: ${s.webhook.duplicatesBlocked}`));
    console.log(chalk.white(`  Taxa de Duplicação: ${s.webhook.duplicateRate}%`));
    console.log(chalk.white(`  Em Processamento: ${s.webhook.currentlyProcessing}`));
    console.log(chalk.white(`  Cache: ${s.webhook.recentMessages} mensagens`));
  }
  console.log();
  
  // Message Orchestrator
  console.log(chalk.magenta.bold('🎯 MESSAGE ORCHESTRATOR'));
  if (s.orchestrator) {
    console.log(chalk.white(`  Total Processado: ${formatNumber(s.orchestrator.totalProcessed)}`));
    console.log(chalk.white(`  Erros: ${s.orchestrator.totalErrors}`));
    console.log(chalk.white(`  Taxa de Sucesso: ${s.orchestrator.successRate}%`));
    console.log(chalk.white(`  Processando Agora: ${s.orchestrator.currentlyProcessing}`));
  }
  console.log();
  
  // Response Manager
  console.log(chalk.green.bold('💬 RESPONSE MANAGER'));
  if (s.response) {
    console.log(chalk.white(`  Total Enviado: ${formatNumber(s.response.totalSent)}`));
    console.log(chalk.white(`  Duplicações Evitadas: ${s.response.duplicatesBlocked}`));
    console.log(chalk.white(`  Taxa de Sucesso: ${s.response.successRate}%`));
    console.log(chalk.white(`  Cache: ${s.response.cacheSize} respostas`));
  }
  console.log();
  
  // Performance
  console.log(chalk.yellow.bold('⚡ PERFORMANCE'));
  if (s.performance) {
    const avgTime = s.performance.averageProcessingTime;
    const timeColor = avgTime < 1000 ? chalk.green : avgTime < 3000 ? chalk.yellow : chalk.red;
    console.log(chalk.white(`  Tempo Médio: ${timeColor(avgTime + 'ms')}`));
    console.log(chalk.white(`  Requests/min: ${s.performance.requestsPerMinute}`));
  }
  console.log();
  
  // Indicadores Visuais
  console.log(chalk.cyan('═══════════════════════════════════════════════════════════════'));
  
  // Barra de status
  const indicators = [];
  
  if (h.status === 'healthy') {
    indicators.push(chalk.green('✅ SAUDÁVEL'));
  } else {
    indicators.push(chalk.red('❌ PROBLEMAS'));
  }
  
  if (s.orchestrator?.currentlyProcessing > 0) {
    indicators.push(chalk.yellow(`⚡ ${s.orchestrator.currentlyProcessing} PROCESSANDO`));
  }
  
  if (successRate >= 95) {
    indicators.push(chalk.green('📈 ALTA PERFORMANCE'));
  } else if (successRate >= 80) {
    indicators.push(chalk.yellow('📊 PERFORMANCE MÉDIA'));
  } else {
    indicators.push(chalk.red('📉 BAIXA PERFORMANCE'));
  }
  
  console.log(indicators.join(' | '));
  console.log();
  
  // Última atualização
  console.log(chalk.gray(`Última atualização: ${new Date().toLocaleTimeString('pt-BR')}`));
  console.log(chalk.gray('Pressione Ctrl+C para sair'));
}

// Loop principal
async function startMonitoring() {
  console.log(chalk.yellow('Iniciando monitoramento...'));
  
  // Configurar intervalo de atualização
  const UPDATE_INTERVAL = 2000; // 2 segundos
  
  // Primeira renderização
  const initialData = await fetchStats();
  renderDashboard(initialData);
  
  // Atualização contínua
  const interval = setInterval(async () => {
    const data = await fetchStats();
    renderDashboard(data);
  }, UPDATE_INTERVAL);
  
  // Capturar Ctrl+C
  process.on('SIGINT', () => {
    clearInterval(interval);
    clearConsole();
    console.log(chalk.green('\n✅ Monitor finalizado'));
    process.exit(0);
  });
}

// Verificar conexão inicial
async function checkConnection() {
  try {
    console.log(chalk.gray('Conectando ao servidor...'));
    await axios.get(`${SERVER_URL}/api/health`, { timeout: 3000 });
    return true;
  } catch (error) {
    console.log(chalk.red('❌ Não foi possível conectar ao servidor'));
    console.log(chalk.yellow(`Verifique se o servidor está rodando em ${SERVER_URL}`));
    return false;
  }
}

// Executar
(async () => {
  const connected = await checkConnection();
  if (connected) {
    await startMonitoring();
  } else {
    process.exit(1);
  }
})();

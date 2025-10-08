#!/usr/bin/env node

/**
 * ORBION STARTER - SMART PORT MANAGEMENT
 * Inicia o ORBION com gerenciamento inteligente de portas
 */

import PortManager from './src/utils/port-manager.js';
import SingleInstanceManager from './src/utils/single-instance.js';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class OrbionStarter {
  constructor() {
    this.portManager = new PortManager();
    this.instanceManager = new SingleInstanceManager();
    this.serverProcess = null;
  }

  /**
   * Atualiza variável de ambiente PORT no .env
   */
  updateEnvPort(port) {
    const envPath = join(__dirname, '.env');

    if (!fs.existsSync(envPath)) {
      console.log('⚠️ Arquivo .env não encontrado');
      return;
    }

    try {
      let envContent = fs.readFileSync(envPath, 'utf8');

      // Atualiza ou adiciona a linha PORT
      if (envContent.includes('PORT=')) {
        envContent = envContent.replace(/PORT=.*$/m, `PORT=${port}`);
      } else {
        envContent += `\nPORT=${port}\n`;
      }

      fs.writeFileSync(envPath, envContent);
      console.log(`✅ Arquivo .env atualizado: PORT=${port}`);
    } catch (error) {
      console.log(`❌ Erro ao atualizar .env:`, error.message);
    }
  }

  /**
   * Mostra status da instância
   */
  async showInstanceStatus() {
    console.log('\n📊 STATUS DA INSTÂNCIA ORBION:');
    console.log('='.repeat(50));

    const status = await this.instanceManager.getStatus();

    if (!status.running) {
      console.log('🔴 ORBION não está rodando');
    } else {
      console.log('🟢 ORBION está rodando');
      console.log(`   PID: ${status.pid}`);
      console.log(`   Porta: ${status.port}`);
      console.log(`   Iniciado: ${new Date(status.startTime).toLocaleString()}`);
      console.log(`   Uptime: ${Math.round(status.uptime / 1000)}s`);
      console.log(`   Node.js: ${status.nodeVersion}`);
      console.log(`   Platform: ${status.platform}`);
    }

    console.log('='.repeat(50));
  }

  /**
   * Mostra status das portas
   */
  async showPortsStatus() {
    console.log('\n📊 STATUS DAS PORTAS:');
    console.log('='.repeat(50));

    const status = await this.portManager.getPortsStatus();

    Object.entries(status).forEach(([name, info]) => {
      const emoji = info.inUse ? '🔴' : '🟢';
      const status = info.inUse ? 'OCUPADA' : 'LIVRE';
      console.log(`${emoji} ${name.padEnd(15)} ${info.port.toString().padEnd(6)} ${status}`);
    });

    console.log('='.repeat(50));
  }

  /**
   * Inicia o servidor ORBION
   */
  async startServer(options = {}) {
    const {
      force = false,
      preferredPort = null,
      autoPort = true
    } = options;

    console.log('🚀 INICIANDO ORBION...\n');

    // 1. VERIFICAÇÃO DE INSTÂNCIA ÚNICA
    console.log('🔍 Verificando instâncias existentes...');
    const instanceStatus = await this.instanceManager.isRunning();

    if (instanceStatus.running && !force) {
      console.log('❌ ORBION já está rodando!');
      if (instanceStatus.pid) {
        console.log(`   PID: ${instanceStatus.pid}`);
      }
      if (instanceStatus.port) {
        console.log(`   Porta: ${instanceStatus.port}`);
      }
      console.log('\n💡 Opções:');
      console.log('   node start-orbion.js start --force    # Força restart');
      console.log('   node start-orbion.js status           # Ver status');
      console.log('   node start-orbion.js kill             # Parar instância');
      return null;
    }

    if (force) {
      console.log('🔄 Modo FORÇA ativado - Matando instâncias...');
      await this.instanceManager.killPrevious();
    }

    // Mostra status atual das portas
    await this.showPortsStatus();

    // Determina a porta a usar
    let targetPort;

    if (force && preferredPort) {
      console.log(`\n🚨 MODO FORÇA: Liberando porta ${preferredPort}...`);
      await this.portManager.forceReleasePort(preferredPort);
      targetPort = preferredPort;
    } else if (autoPort) {
      console.log(`\n🔍 MODO AUTO: Procurando porta disponível...`);
      targetPort = await this.portManager.autoConfigurePort(preferredPort);
    } else {
      targetPort = preferredPort || process.env.PORT || 3001;
    }

    // Atualiza .env com a porta escolhida
    this.updateEnvPort(targetPort);

    // Inicia o servidor
    console.log(`\n🚀 Iniciando ORBION na porta ${targetPort}...`);

    const serverPath = join(__dirname, 'src', 'server.js');
    this.serverProcess = spawn('node', [serverPath], {
      stdio: 'inherit',
      env: { ...process.env, PORT: targetPort }
    });

    this.serverProcess.on('close', (code) => {
      if (code !== 0) {
        console.log(`\n❌ Servidor terminou com código ${code}`);
      } else {
        console.log(`\n✅ Servidor terminou normalmente`);
      }
    });

    this.serverProcess.on('error', (error) => {
      console.log(`\n❌ Erro ao iniciar servidor:`, error.message);
    });

    // Lida com sinais de terminação
    process.on('SIGINT', () => {
      console.log('\n🛑 Encerrando ORBION...');
      if (this.serverProcess) {
        this.serverProcess.kill('SIGTERM');
      }
      process.exit(0);
    });

    return targetPort;
  }

  /**
   * Mostra ajuda
   */
  showHelp() {
    console.log(`
🤖 ORBION STARTER - COMANDOS DISPONÍVEIS

Uso: node start-orbion.js [comando] [opções]

COMANDOS:
  start                 Inicia o ORBION (modo automático)
  start --port 3001     Inicia na porta específica
  start --force         Força restart (mata instâncias)
  status               Mostra status da instância
  ports                Mostra status das portas
  kill                 Para a instância atual
  kill 3001            Mata processo na porta específica
  restart              Força restart limpo
  help                 Mostra esta ajuda

EXEMPLOS:
  node start-orbion.js start
  node start-orbion.js start --port 3000
  node start-orbion.js start --force
  node start-orbion.js status
  node start-orbion.js ports
  node start-orbion.js restart

ALIASES npm (adicione ao package.json):
  npm run start:auto   # Porta automática
  npm run start:3000   # Porta 3000
  npm run start:force  # Força porta padrão
  npm run ports        # Status das portas
`);
  }

  /**
   * Executa comando baseado nos argumentos
   */
  async run() {
    const args = process.argv.slice(2);
    const command = args[0] || 'start';

    try {
      switch (command) {
        case 'start':
          const portFlag = args.findIndex(arg => arg === '--port');
          const forceFlag = args.findIndex(arg => arg === '--force');

          const preferredPort = portFlag !== -1 ? parseInt(args[portFlag + 1]) : null;
          const forcePort = forceFlag !== -1 ? parseInt(args[forceFlag + 1]) : null;

          await this.startServer({
            force: forceFlag !== -1,
            preferredPort: forcePort || preferredPort,
            autoPort: portFlag === -1 && forceFlag === -1
          });
          break;

        case 'status':
          await this.showInstanceStatus();
          break;

        case 'ports':
          await this.showPortsStatus();
          break;

        case 'kill':
          const killPort = parseInt(args[1]);
          if (killPort) {
            await this.portManager.forceReleasePort(killPort);
          } else {
            await this.instanceManager.killPrevious();
          }
          break;

        case 'restart':
          console.log('🔄 FORÇA RESTART - Limpando sistema...');
          await this.instanceManager.forceRestart();
          console.log('✅ Sistema limpo! Execute "start" para iniciar');
          break;

        case 'help':
        default:
          this.showHelp();
          break;
      }
    } catch (error) {
      console.log('❌ ERRO:', error.message);
      process.exit(1);
    }
  }
}

// Executa se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const starter = new OrbionStarter();
  starter.run();
}

export default OrbionStarter;
/**
 * PORT MANAGER - ORBION
 * Gerenciamento inteligente de portas para evitar conflitos
 */

import { spawn } from 'child_process';
import { promisify } from 'util';

class PortManager {
  constructor() {
    this.defaultPorts = {
      main: 3001,
      alternative: [3000, 3002, 3003, 3004],
      evolution: 8080,
      complementary: 3002
    };
  }

  /**
   * Verifica se uma porta está em uso
   */
  async isPortInUse(port) {
    return new Promise((resolve) => {
      const command = process.platform === 'win32'
        ? `netstat -an | findstr :${port}`
        : `lsof -i :${port}`;

      const child = spawn('sh', ['-c', command], { stdio: 'pipe' });

      let hasOutput = false;
      child.stdout.on('data', () => {
        hasOutput = true;
      });

      child.on('close', () => {
        resolve(hasOutput);
      });

      child.on('error', () => {
        resolve(false);
      });

      // Timeout de 2 segundos
      setTimeout(() => {
        child.kill();
        resolve(false);
      }, 2000);
    });
  }

  /**
   * Encontra a primeira porta disponível
   */
  async findAvailablePort(startPort = this.defaultPorts.main) {
    // Primeiro tenta a porta preferencial
    if (!(await this.isPortInUse(startPort))) {
      return startPort;
    }

    // Depois tenta as alternativas
    for (const port of this.defaultPorts.alternative) {
      if (!(await this.isPortInUse(port))) {
        return port;
      }
    }

    // Se todas estão ocupadas, tenta portas sequenciais
    for (let port = startPort + 1; port <= startPort + 20; port++) {
      if (!(await this.isPortInUse(port))) {
        return port;
      }
    }

    throw new Error('Nenhuma porta disponível encontrada');
  }

  /**
   * Mata processo em uma porta específica
   */
  async killPortProcess(port) {
    return new Promise((resolve, reject) => {
      const command = process.platform === 'win32'
        ? `for /f "tokens=5" %a in ('netstat -aon ^| findstr :${port}') do taskkill /f /pid %a`
        : `lsof -ti:${port} | xargs kill -9`;

      const child = spawn('sh', ['-c', command], { stdio: 'pipe' });

      child.on('close', (code) => {
        if (code === 0 || code === 1) { // 1 = não encontrou processo
          resolve(true);
        } else {
          reject(new Error(`Falha ao matar processo na porta ${port}`));
        }
      });

      child.on('error', reject);
    });
  }

  /**
   * Verifica status das portas principais
   */
  async getPortsStatus() {
    const status = {};

    const portsToCheck = [
      { name: 'main', port: this.defaultPorts.main },
      { name: 'evolution', port: this.defaultPorts.evolution },
      { name: 'complementary', port: this.defaultPorts.complementary },
      ...this.defaultPorts.alternative.map(port => ({ name: `alt-${port}`, port }))
    ];

    for (const { name, port } of portsToCheck) {
      status[name] = {
        port,
        inUse: await this.isPortInUse(port)
      };
    }

    return status;
  }

  /**
   * Configura porta automaticamente
   */
  async autoConfigurePort(preferredPort = null) {
    const targetPort = preferredPort || process.env.PORT || this.defaultPorts.main;

    console.log(`🔍 Verificando porta ${targetPort}...`);

    if (!(await this.isPortInUse(targetPort))) {
      console.log(`✅ Porta ${targetPort} disponível`);
      return targetPort;
    }

    console.log(`⚠️ Porta ${targetPort} ocupada, procurando alternativa...`);

    const availablePort = await this.findAvailablePort(targetPort);
    console.log(`✅ Porta ${availablePort} disponível`);

    return availablePort;
  }

  /**
   * Força liberação de porta (usar com cuidado)
   */
  async forceReleasePort(port) {
    console.log(`🚨 Forçando liberação da porta ${port}...`);

    if (!(await this.isPortInUse(port))) {
      console.log(`✅ Porta ${port} já está livre`);
      return true;
    }

    try {
      await this.killPortProcess(port);

      // Aguarda um momento para o processo terminar
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (!(await this.isPortInUse(port))) {
        console.log(`✅ Porta ${port} liberada com sucesso`);
        return true;
      } else {
        console.log(`❌ Falha ao liberar porta ${port}`);
        return false;
      }
    } catch (error) {
      console.log(`❌ Erro ao liberar porta ${port}:`, error.message);
      return false;
    }
  }
}

export default PortManager;
/**
 * SINGLE INSTANCE MANAGER - LEADLY
 * Garante que apenas uma instância do LEADLY rode por vez
 */

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SingleInstanceManager {
  constructor() {
    this.lockFile = path.join(__dirname, '../../.orbion.lock');
    this.pidFile = path.join(__dirname, '../../.orbion.pid');
    this.port = process.env.PORT || 3001;
  }

  /**
   * Verifica se já existe uma instância rodando
   * NOTA: Em Docker, PID 1 é o processo principal - não devemos bloquear
   */
  async isRunning() {
    try {
      // Skip instance check in Docker containers
      const isDocker = process.env.NODE_ENV === 'production' ||
                       fs.existsSync('/.dockerenv') ||
                       process.env.DOCKER_CONTAINER === 'true';

      if (isDocker) {
        console.log(' Running in Docker - skipping instance check');
        return { running: false };
      }

      // 1. Verifica arquivo PID
      if (fs.existsSync(this.pidFile)) {
        const pid = fs.readFileSync(this.pidFile, 'utf8').trim();
        const pidNum = parseInt(pid);

        // PID 1 é o init do Docker, ignora
        if (pidNum === 1 || pidNum === process.pid) {
          this.cleanup();
          return { running: false };
        }

        // Verifica se o processo ainda existe
        try {
          process.kill(pidNum, 0); // Signal 0 apenas testa se o processo existe
          console.log(` Instância já rodando (PID: ${pid})`);
          return { running: true, pid: pidNum };
        } catch (error) {
          // Processo não existe mais, limpa arquivos órfãos
          this.cleanup();
        }
      }

      // 2. Verifica porta (já tem skip para Docker)
      const portInUse = await this.isPortInUse(this.port);
      if (portInUse) {
        console.log(` Porta ${this.port} já está em uso`);
        return { running: true, port: this.port };
      }

      return { running: false };

    } catch (error) {
      console.error(' Erro ao verificar instância:', error.message);
      return { running: false };
    }
  }

  /**
   * Verifica se a porta está em uso
   * NOTA: Em containers Docker, pula a verificação pois o Docker proxy aparece como "em uso"
   */
  async isPortInUse(port) {
    // Skip port check in Docker containers (production mode or /.dockerenv exists)
    const isDocker = process.env.NODE_ENV === 'production' ||
                     fs.existsSync('/.dockerenv') ||
                     process.env.DOCKER_CONTAINER === 'true';

    if (isDocker) {
      console.log(' Running in Docker/Production - skipping port check');
      return false;
    }

    return new Promise((resolve) => {
      const command = process.platform === 'win32'
        ? `netstat -an | findstr :${port}`
        // Restrict to LISTEN to avoid false positives from ESTABLISHED/CLOSE_WAIT
        : `lsof -nP -iTCP:${port} -sTCP:LISTEN`;

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
   * Mata instância anterior
   */
  async killPrevious() {
    try {
      console.log(' Terminando instâncias anteriores...');

      // 1. Mata pelo PID se existir
      if (fs.existsSync(this.pidFile)) {
        const pid = fs.readFileSync(this.pidFile, 'utf8').trim();
        try {
          process.kill(parseInt(pid), 'SIGTERM');
          console.log(` Processo ${pid} terminado`);

          // Aguarda um momento para o processo terminar
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          console.log(` Processo ${pid} já não existe`);
        }
      }

      // 2. Mata processos na porta
      const command = process.platform === 'win32'
        ? `for /f "tokens=5" %a in ('netstat -aon ^| findstr :${this.port}') do taskkill /f /pid %a`
        : `lsof -ti:${this.port} | xargs kill -SIGTERM 2>/dev/null || true`;

      await new Promise((resolve) => {
        const child = spawn('sh', ['-c', command], { stdio: 'pipe' });
        child.on('close', () => {
          console.log(` Processos na porta ${this.port} terminados`);
          resolve();
        });
        child.on('error', () => resolve());

        // Timeout de 5 segundos
        setTimeout(() => {
          child.kill();
          resolve();
        }, 5000);
      });

      // 3. Força matança se necessário
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (await this.isPortInUse(this.port)) {
        console.log(' Forçando terminação...');
        const forceCommand = process.platform === 'win32'
          ? `for /f "tokens=5" %a in ('netstat -aon ^| findstr :${this.port}') do taskkill /f /pid %a`
          : `lsof -ti:${this.port} | xargs kill -9 2>/dev/null || true`;

        await new Promise((resolve) => {
          const child = spawn('sh', ['-c', forceCommand], { stdio: 'pipe' });
          child.on('close', resolve);
          child.on('error', resolve);
          setTimeout(() => {
            child.kill();
            resolve();
          }, 3000);
        });
      }

      // 4. Limpa arquivos
      this.cleanup();

      console.log(' Limpeza concluída');
      return true;

    } catch (error) {
      console.error(' Erro ao matar instâncias:', error.message);
      return false;
    }
  }

  /**
   * Registra a instância atual
   */
  register() {
    try {
      // Cria arquivo PID
      fs.writeFileSync(this.pidFile, process.pid.toString());

      // Cria arquivo lock com informações
      const lockData = {
        pid: process.pid,
        port: this.port,
        startTime: new Date().toISOString(),
        nodeVersion: process.version,
        platform: process.platform
      };

      fs.writeFileSync(this.lockFile, JSON.stringify(lockData, null, 2));

      console.log(` Instância registrada (PID: ${process.pid}, Porta: ${this.port})`);

      // Configura limpeza automática ao sair
      process.on('exit', () => this.cleanup());
      process.on('SIGINT', () => {
        console.log('\n Encerrando LEADLY...');
        this.cleanup();
        process.exit(0);
      });
      process.on('SIGTERM', () => {
        console.log('\n SIGTERM recebido, encerrando...');
        this.cleanup();
        process.exit(0);
      });

      return true;

    } catch (error) {
      console.error(' Erro ao registrar instância:', error.message);
      return false;
    }
  }

  /**
   * Limpa arquivos de lock
   */
  cleanup() {
    try {
      if (fs.existsSync(this.pidFile)) {
        fs.unlinkSync(this.pidFile);
      }
      if (fs.existsSync(this.lockFile)) {
        fs.unlinkSync(this.lockFile);
      }
    } catch (error) {
      // Ignora erros de limpeza
    }
  }

  /**
   * Mostra status da instância
   */
  async getStatus() {
    try {
      if (!fs.existsSync(this.lockFile)) {
        return { running: false };
      }

      const lockData = JSON.parse(fs.readFileSync(this.lockFile, 'utf8'));
      const isActuallyRunning = await this.isRunning();

      return {
        running: isActuallyRunning.running,
        ...lockData,
        uptime: new Date() - new Date(lockData.startTime)
      };

    } catch (error) {
      return { running: false, error: error.message };
    }
  }

  /**
   * Força restart limpo
   */
  async forceRestart() {
    console.log(' FORÇA RESTART - Limpando tudo...');

    await this.killPrevious();

    // Aguarda mais um pouco para garantir que tudo parou
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log(' Sistema limpo, pronto para restart');
    return true;
  }
}

export default SingleInstanceManager;

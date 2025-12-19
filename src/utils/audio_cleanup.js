// utils/audio_cleanup.js
// Sistema de limpeza automática de arquivos de áudio

import fs from 'fs';
import path from 'path';

export class AudioCleanup {
  constructor() {
    this.uploadsDir = path.join(process.cwd(), 'uploads');
    this.cleanupIntervalMinutes = 30; // Limpeza a cada 30 minutos
    this.maxFileAgeMinutes = 60; // Remover arquivos com mais de 1 hora
    this.isRunning = false;
    this.intervalId = null;
  }

  /**
   * Inicia limpeza automática
   */
  startAutoCleanup() {
    if (this.isRunning) {
      console.log(' [CLEANUP] Sistema de limpeza já está ativo');
      return;
    }

    console.log(` [CLEANUP] Iniciando limpeza automática (a cada ${this.cleanupIntervalMinutes}min)`);

    // Executar limpeza imediatamente
    this.performCleanup();

    // Agendar limpezas periódicas
    this.intervalId = setInterval(() => {
      this.performCleanup();
    }, this.cleanupIntervalMinutes * 60 * 1000);

    this.isRunning = true;
  }

  /**
   * Para limpeza automática
   */
  stopAutoCleanup() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log(' [CLEANUP] Sistema de limpeza parado');
  }

  /**
   * Executa limpeza dos arquivos antigos
   */
  async performCleanup() {
    try {
      console.log(' [CLEANUP] Iniciando limpeza de arquivos de áudio...');

      // Verificar se diretório existe
      if (!fs.existsSync(this.uploadsDir)) {
        console.log(' [CLEANUP] Diretório uploads não existe');
        return;
      }

      const files = fs.readdirSync(this.uploadsDir);
      const audioFiles = files.filter(file =>
        /\.(ogg|mp3|wav|m4a|webm)$/i.test(file)
      );

      if (audioFiles.length === 0) {
        console.log(' [CLEANUP] Nenhum arquivo de áudio encontrado');
        return;
      }

      let removedCount = 0;
      let freedSpace = 0;
      const cutoffTime = Date.now() - (this.maxFileAgeMinutes * 60 * 1000);

      for (const file of audioFiles) {
        const filePath = path.join(this.uploadsDir, file);

        try {
          const stats = fs.statSync(filePath);

          // Se arquivo é mais antigo que o limite
          if (stats.mtime.getTime() < cutoffTime) {
            const fileSize = stats.size;
            fs.unlinkSync(filePath);
            removedCount++;
            freedSpace += fileSize;
            console.log(` [CLEANUP] Removido: ${file} (${this.formatBytes(fileSize)})`);
          }
        } catch (error) {
          console.error(` [CLEANUP] Erro ao processar ${file}:`, error.message);
        }
      }

      // Limpar arquivos de teste na raiz
      await this.cleanupTestFiles();

      console.log(` [CLEANUP] Concluído: ${removedCount} arquivos removidos, ${this.formatBytes(freedSpace)} liberados`);

    } catch (error) {
      console.error(' [CLEANUP] Erro na limpeza:', error);
    }
  }

  /**
   * Remove arquivos de teste da raiz do projeto
   */
  async cleanupTestFiles() {
    try {
      const rootDir = process.cwd();
      const files = fs.readdirSync(rootDir);
      const testFiles = files.filter(file =>
        file.startsWith('test_decrypt_') && /\.(ogg|mp3|wav|m4a)$/i.test(file)
      );

      let removedTestCount = 0;
      for (const file of testFiles) {
        const filePath = path.join(rootDir, file);
        try {
          fs.unlinkSync(filePath);
          removedTestCount++;
          console.log(` [CLEANUP] Arquivo de teste removido: ${file}`);
        } catch (error) {
          console.error(` [CLEANUP] Erro ao remover teste ${file}:`, error.message);
        }
      }

      if (removedTestCount > 0) {
        console.log(` [CLEANUP] ${removedTestCount} arquivos de teste removidos`);
      }
    } catch (error) {
      console.error(' [CLEANUP] Erro ao limpar arquivos de teste:', error);
    }
  }

  /**
   * Limpeza manual forçada
   */
  async forceCleanup() {
    console.log(' [CLEANUP] Executando limpeza manual forçada...');
    await this.performCleanup();
  }

  /**
   * Formata bytes em formato legível
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  /**
   * Retorna estatísticas do sistema de limpeza
   */
  getStats() {
    try {
      const files = fs.existsSync(this.uploadsDir) ? fs.readdirSync(this.uploadsDir) : [];
      const audioFiles = files.filter(file =>
        /\.(ogg|mp3|wav|m4a|webm)$/i.test(file)
      );

      let totalSize = 0;
      let oldFileCount = 0;
      const cutoffTime = Date.now() - (this.maxFileAgeMinutes * 60 * 1000);

      for (const file of audioFiles) {
        const filePath = path.join(this.uploadsDir, file);
        try {
          const stats = fs.statSync(filePath);
          totalSize += stats.size;
          if (stats.mtime.getTime() < cutoffTime) {
            oldFileCount++;
          }
        } catch (error) {
          // Arquivo pode ter sido removido durante a verificação
        }
      }

      return {
        isActive: this.isRunning,
        totalAudioFiles: audioFiles.length,
        oldFilesCount: oldFileCount,
        totalSize: this.formatBytes(totalSize),
        cleanupInterval: this.cleanupIntervalMinutes,
        maxFileAge: this.maxFileAgeMinutes
      };
    } catch (error) {
      console.error(' [CLEANUP] Erro ao obter estatísticas:', error);
      return {
        isActive: this.isRunning,
        error: error.message
      };
    }
  }
}

// Instância singleton
const audioCleanup = new AudioCleanup();
export default audioCleanup;
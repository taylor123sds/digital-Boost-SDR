#!/usr/bin/env node
// scripts/backup_database.js
//  Script de Backup Automático do Banco de Dados ORBION

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurações
const DB_PATH = path.join(__dirname, '..', 'orbion.db');
const BACKUP_DIR = path.join(__dirname, '..', 'backups');
const MAX_BACKUPS = 30; // Manter últimos 30 backups

/**
 * Cria diretório de backups se não existir
 */
function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    console.log(` Diretório de backups criado: ${BACKUP_DIR}`);
  }
}

/**
 * Formata timestamp para nome de arquivo
 */
function getTimestamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
}

/**
 * Executa backup do banco de dados
 */
function backupDatabase() {
  console.log('\n [BACKUP] Iniciando backup do banco de dados...');

  // Verificar se banco existe
  if (!fs.existsSync(DB_PATH)) {
    console.error(` [BACKUP] Banco de dados não encontrado: ${DB_PATH}`);
    process.exit(1);
  }

  // Criar diretório de backups
  ensureBackupDir();

  // Nome do arquivo de backup
  const timestamp = getTimestamp();
  const backupFileName = `orbion_${timestamp}.db`;
  const backupPath = path.join(BACKUP_DIR, backupFileName);

  try {
    // Copiar arquivo
    fs.copyFileSync(DB_PATH, backupPath);

    // Verificar tamanho
    const stats = fs.statSync(backupPath);
    const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

    console.log(` [BACKUP] Backup criado com sucesso!`);
    console.log(`    Arquivo: ${backupFileName}`);
    console.log(`    Tamanho: ${sizeInMB} MB`);
    console.log(`    Local: ${backupPath}`);

    return backupPath;

  } catch (error) {
    console.error(` [BACKUP] Erro ao criar backup:`, error.message);
    process.exit(1);
  }
}

/**
 * Remove backups antigos, mantendo apenas os últimos MAX_BACKUPS
 */
function cleanOldBackups() {
  console.log(`\n [CLEANUP] Limpando backups antigos (mantendo últimos ${MAX_BACKUPS})...`);

  try {
    // Listar todos os arquivos de backup
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.startsWith('orbion_') && file.endsWith('.db'))
      .map(file => ({
        name: file,
        path: path.join(BACKUP_DIR, file),
        time: fs.statSync(path.join(BACKUP_DIR, file)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time); // Mais recente primeiro

    console.log(`    Total de backups encontrados: ${files.length}`);

    // Remover backups excedentes
    if (files.length > MAX_BACKUPS) {
      const toRemove = files.slice(MAX_BACKUPS);

      for (const file of toRemove) {
        fs.unlinkSync(file.path);
        console.log(`     Removido: ${file.name}`);
      }

      console.log(` [CLEANUP] ${toRemove.length} backup(s) antigo(s) removido(s)`);
    } else {
      console.log(` [CLEANUP] Nenhum backup para remover`);
    }

  } catch (error) {
    console.error(` [CLEANUP] Erro ao limpar backups:`, error.message);
  }
}

/**
 * Lista todos os backups disponíveis
 */
function listBackups() {
  console.log('\n [LIST] Backups disponíveis:\n');

  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.startsWith('orbion_') && file.endsWith('.db'))
      .map(file => ({
        name: file,
        path: path.join(BACKUP_DIR, file),
        stats: fs.statSync(path.join(BACKUP_DIR, file))
      }))
      .sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime());

    if (files.length === 0) {
      console.log('     Nenhum backup encontrado');
      return;
    }

    files.forEach((file, index) => {
      const sizeInMB = (file.stats.size / (1024 * 1024)).toFixed(2);
      const date = file.stats.mtime.toLocaleString('pt-BR');
      console.log(`   ${index + 1}. ${file.name}`);
      console.log(`       ${date}`);
      console.log(`       ${sizeInMB} MB\n`);
    });

  } catch (error) {
    console.error(` [LIST] Erro ao listar backups:`, error.message);
  }
}

/**
 * Restaura um backup específico
 */
function restoreBackup(backupFileName) {
  console.log(`\n [RESTORE] Restaurando backup: ${backupFileName}`);

  const backupPath = path.join(BACKUP_DIR, backupFileName);

  // Verificar se backup existe
  if (!fs.existsSync(backupPath)) {
    console.error(` [RESTORE] Backup não encontrado: ${backupPath}`);
    process.exit(1);
  }

  try {
    // Fazer backup do banco atual antes de restaurar
    if (fs.existsSync(DB_PATH)) {
      const safeguardPath = `${DB_PATH}.before_restore`;
      fs.copyFileSync(DB_PATH, safeguardPath);
      console.log(`    Backup de segurança criado: ${safeguardPath}`);
    }

    // Restaurar backup
    fs.copyFileSync(backupPath, DB_PATH);

    console.log(` [RESTORE] Backup restaurado com sucesso!`);
    console.log(`    Arquivo: ${backupFileName}`);
    console.log(`    Restaurado em: ${DB_PATH}`);

  } catch (error) {
    console.error(` [RESTORE] Erro ao restaurar backup:`, error.message);
    process.exit(1);
  }
}

/**
 * Exibe ajuda
 */
function showHelp() {
  console.log(`
 ORBION Database Backup Tool

USO:
  npm run backup              # Criar novo backup
  npm run backup:list         # Listar backups disponíveis
  npm run backup:restore <arquivo>  # Restaurar backup específico

EXEMPLOS:
  npm run backup
  npm run backup:list
  npm run backup:restore orbion_2025-10-21_14-30-00.db

CONFIGURAÇÕES:
  - Banco de dados: ${DB_PATH}
  - Diretório de backups: ${BACKUP_DIR}
  - Máximo de backups mantidos: ${MAX_BACKUPS}

AUTOMAÇÃO (cron):
  # Backup diário às 3h da manhã
  0 3 * * * cd ${path.join(__dirname, '..')} && npm run backup

  # Backup a cada 6 horas
  0 */6 * * * cd ${path.join(__dirname, '..')} && npm run backup
  `);
}

// CLI
const command = process.argv[2];

switch (command) {
  case 'backup':
  case undefined:
    backupDatabase();
    cleanOldBackups();
    break;

  case 'list':
    listBackups();
    break;

  case 'restore':
    const fileName = process.argv[3];
    if (!fileName) {
      console.error(' Especifique o nome do arquivo de backup');
      console.log('   Uso: npm run backup:restore <arquivo>');
      process.exit(1);
    }
    restoreBackup(fileName);
    break;

  case 'help':
  case '--help':
  case '-h':
    showHelp();
    break;

  default:
    console.error(` Comando desconhecido: ${command}`);
    showHelp();
    process.exit(1);
}

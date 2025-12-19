/**
 * @file test_v2_modules.js
 * @description Script para testar novos módulos V2.0
 */

import chalk from 'chalk';

console.log(chalk.bold.cyan('\n🧪 TESTE DOS MÓDULOS V2.0\n'));
console.log('='.repeat(60));

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

/**
 * Helper para executar teste
 */
async function test(name, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(chalk.green(`✅ ${name}`));
    return true;
  } catch (error) {
    failedTests++;
    console.log(chalk.red(`❌ ${name}`));
    console.log(chalk.gray(`   Error: ${error.message}`));
    if (process.env.DEBUG) {
      console.log(chalk.gray(`   Stack: ${error.stack}`));
    }
    return false;
  }
}

/**
 * Helper para assert
 */
function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

// ========== TESTES ==========

async function runTests() {
  console.log(chalk.yellow('\n1️⃣  CONFIG LAYER\n'));

  await test('Import config/environment', async () => {
    const { default: env } = await import('../src/v2/config/environment.js');
    assert(env, 'env should be defined');
    assert(env.PORT, 'PORT should be defined');
    assert(env.OPENAI_API_KEY, 'OPENAI_API_KEY should be defined');
  });

  await test('Import config/constants', async () => {
    const { default: constants } = await import('../src/v2/config/constants.js');
    assert(constants, 'constants should be defined');
    assert(constants.FUNNEL_STAGES, 'FUNNEL_STAGES should be defined');
    assert(constants.AGENT_TYPES, 'AGENT_TYPES should be defined');
  });

  await test('Import config/index', async () => {
    const { config } = await import('../src/v2/config/index.js');
    assert(config, 'config should be defined');
    assert(config.server, 'config.server should be defined');
    assert(config.openai, 'config.openai should be defined');
  });

  console.log(chalk.yellow('\n2️⃣  SHARED/UTILS LAYER\n'));

  await test('Import logger', async () => {
    const { default: logger, log, createLogger } = await import('../src/v2/shared/utils/logger.js');
    assert(logger, 'logger should be defined');
    assert(log, 'log should be defined');
    assert(typeof createLogger === 'function', 'createLogger should be a function');
  });

  await test('Logger funciona', async () => {
    const { log } = await import('../src/v2/shared/utils/logger.js');
    log.debug('Test debug message');
    log.info('Test info message');
    // Se não lançar erro, passou
  });

  await test('createLogger funciona', async () => {
    const { createLogger } = await import('../src/v2/shared/utils/logger.js');
    const testLogger = createLogger('TestService');
    assert(testLogger, 'testLogger should be defined');
    testLogger.info('Test from TestService');
  });

  await test('Import errors', async () => {
    const errors = await import('../src/v2/shared/utils/errors.js');
    assert(errors.BaseError, 'BaseError should be defined');
    assert(errors.ValidationError, 'ValidationError should be defined');
    assert(errors.DatabaseError, 'DatabaseError should be defined');
  });

  await test('Criar erro customizado', async () => {
    const { ValidationError } = await import('../src/v2/shared/utils/errors.js');
    const error = new ValidationError('Test error', { field: 'test' });
    assert(error.message === 'Test error', 'Error message should match');
    assert(error.statusCode === 400, 'Error statusCode should be 400');
    assert(error.code, 'Error should have code');
  });

  await test('parseError funciona', async () => {
    const { parseError, ValidationError } = await import('../src/v2/shared/utils/errors.js');
    const error = new ValidationError('Test');
    const parsed = parseError(error);
    assert(parsed.message, 'Parsed error should have message');
    assert(parsed.code, 'Parsed error should have code');
  });

  console.log(chalk.yellow('\n3️⃣  INFRASTRUCTURE/DATABASE LAYER\n'));

  await test('Import DatabaseConnection', async () => {
    const { DatabaseConnection } = await import('../src/v2/infrastructure/database/DatabaseConnection.js');
    assert(DatabaseConnection, 'DatabaseConnection should be defined');
    assert(typeof DatabaseConnection.getInstance === 'function', 'getInstance should be a function');
  });

  await test('DatabaseConnection.getInstance()', async () => {
    const { DatabaseConnection } = await import('../src/v2/infrastructure/database/DatabaseConnection.js');
    const db = DatabaseConnection.getInstance('./test_orbion.db');
    assert(db, 'db should be defined');
    assert(typeof db.prepare === 'function', 'db should have prepare method');
  });

  await test('Database healthCheck', async () => {
    const { DatabaseConnection } = await import('../src/v2/infrastructure/database/DatabaseConnection.js');
    const connection = new DatabaseConnection('./test_orbion.db');
    const isHealthy = connection.healthCheck();
    assert(isHealthy === true, 'Database should be healthy');
  });

  await test('Database getStats', async () => {
    const { DatabaseConnection } = await import('../src/v2/infrastructure/database/DatabaseConnection.js');
    const connection = new DatabaseConnection('./test_orbion.db');
    const stats = connection.getStats();
    assert(stats, 'stats should be defined');
    assert(stats.path, 'stats should have path');
    assert(stats.tables, 'stats should have tables');
  });

  await test('Import BaseRepository', async () => {
    const { BaseRepository } = await import('../src/v2/infrastructure/database/BaseRepository.js');
    assert(BaseRepository, 'BaseRepository should be defined');
  });

  await test('BaseRepository não pode ser instanciado', async () => {
    const { BaseRepository } = await import('../src/v2/infrastructure/database/BaseRepository.js');
    try {
      new BaseRepository(null, 'test');
      assert(false, 'Should throw error');
    } catch (error) {
      assert(error.message.includes('abstrata'), 'Should mention abstract class');
    }
  });

  console.log(chalk.yellow('\n4️⃣  DOMAIN LAYER\n'));

  await test('Import BaseService', async () => {
    const { BaseService } = await import('../src/v2/domain/BaseService.js');
    assert(BaseService, 'BaseService should be defined');
  });

  await test('BaseService não pode ser instanciado', async () => {
    const { BaseService } = await import('../src/v2/domain/BaseService.js');
    try {
      new BaseService('TestService');
      assert(false, 'Should throw error');
    } catch (error) {
      assert(error.message.includes('abstrata'), 'Should mention abstract class');
    }
  });

  // ========== RESULTADOS ==========

  console.log('\n' + '='.repeat(60));
  console.log(chalk.bold.cyan('\n📊 RESULTADOS\n'));

  console.log(`Total de testes:    ${chalk.bold(totalTests)}`);
  console.log(`${chalk.green('✅ Passou:')}          ${chalk.bold.green(passedTests)}`);
  console.log(`${chalk.red('❌ Falhou:')}          ${chalk.bold.red(failedTests)}`);

  const successRate = ((passedTests / totalTests) * 100).toFixed(1);
  console.log(`\nTaxa de sucesso:   ${chalk.bold(successRate + '%')}`);

  // Cleanup
  console.log(chalk.gray('\n🧹 Limpando arquivos de teste...'));
  const fs = await import('fs');
  try {
    if (fs.existsSync('./test_orbion.db')) {
      fs.unlinkSync('./test_orbion.db');
    }
    if (fs.existsSync('./test_orbion.db-shm')) {
      fs.unlinkSync('./test_orbion.db-shm');
    }
    if (fs.existsSync('./test_orbion.db-wal')) {
      fs.unlinkSync('./test_orbion.db-wal');
    }
  } catch (error) {
    console.log(chalk.yellow('⚠️  Erro ao limpar: ' + error.message));
  }

  console.log('\n' + '='.repeat(60));

  if (failedTests > 0) {
    console.log(chalk.red.bold('\n❌ ALGUNS TESTES FALHARAM\n'));
    process.exit(1);
  } else {
    console.log(chalk.green.bold('\n✅ TODOS OS TESTES PASSARAM!\n'));
    process.exit(0);
  }
}

// Executar testes
runTests().catch(error => {
  console.error(chalk.red.bold('\n💥 ERRO FATAL:'), error);
  process.exit(1);
});

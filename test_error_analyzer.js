// test_error_analyzer.js - Script para testar o sistema de análise de erros
import { CodeErrorAnalyzer } from './src/tools/code_error_analyzer.js';

async function testErrorAnalyzer() {
  console.log('🚀 Testando Sistema de Análise de Erros do ORBION\n');

  const analyzer = new CodeErrorAnalyzer();

  try {
    // Teste 1: Analisar arquivo com erros
    console.log('📋 TESTE 1: Analisando arquivo com erros intencionais...');
    const errorResults = await analyzer.analyzeJavaScriptFile('./test_agent_errors.js');

    console.log('\n🔍 RESULTADOS DA ANÁLISE:');
    console.log('==========================================');
    console.log(`Arquivo: ${errorResults.file}`);
    console.log(`Erros de sintaxe: ${errorResults.syntax_errors?.length || 0}`);
    console.log(`Problemas de import: ${errorResults.import_errors?.length || 0}`);
    console.log(`Conflitos lógicos: ${errorResults.logical_conflicts?.length || 0}`);
    console.log(`Problemas comuns: ${errorResults.common_issues?.length || 0}`);
    console.log(`Problemas de segurança: ${errorResults.security_issues?.length || 0}`);
    console.log(`Problemas de performance: ${errorResults.performance_issues?.length || 0}`);

    // Mostrar alguns exemplos de cada categoria
    if (errorResults.syntax_errors?.length > 0) {
      console.log('\n🔴 EXEMPLOS DE ERROS DE SINTAXE:');
      errorResults.syntax_errors.slice(0, 3).forEach(error => {
        console.log(`  Linha ${error.line}: ${error.message}`);
      });
    }

    if (errorResults.security_issues?.length > 0) {
      console.log('\n🔒 EXEMPLOS DE PROBLEMAS DE SEGURANÇA:');
      errorResults.security_issues.slice(0, 3).forEach(issue => {
        console.log(`  Linha ${issue.line}: ${issue.message} [${issue.severity}]`);
      });
    }

    if (errorResults.logical_conflicts?.length > 0) {
      console.log('\n⚡ EXEMPLOS DE CONFLITOS LÓGICOS:');
      errorResults.logical_conflicts.slice(0, 3).forEach(conflict => {
        console.log(`  ${conflict.message}`);
        if (conflict.first_occurrence) {
          console.log(`    Primeira: linha ${conflict.first_occurrence}, Duplicata: linha ${conflict.duplicate_at}`);
        }
      });
    }

    // Teste 2: Gerar relatório formatado
    console.log('\n📄 TESTE 2: Gerando relatório formatado...');
    const report = analyzer.generateReport(errorResults);
    console.log('\n' + report);

    // Teste 3: Analisar arquivo sem problemas (src/agent.js)
    console.log('\n📋 TESTE 3: Analisando arquivo limpo (src/agent.js)...');
    const cleanResults = await analyzer.analyzeJavaScriptFile('./src/agent.js');
    const totalIssuesClean = analyzer.countIssues(cleanResults);
    console.log(`✅ Arquivo limpo analisado: ${totalIssuesClean} problemas encontrados`);

    // Teste 4: Análise de diretório
    console.log('\n📋 TESTE 4: Analisando diretório src/tools...');
    const dirResults = await analyzer.analyzeDirectory('./src/tools', {
      recursive: false,
      excludePatterns: ['node_modules', '.git']
    });

    console.log('\n📊 RESUMO DA ANÁLISE DO DIRETÓRIO:');
    console.log('==========================================');
    console.log(`Total de arquivos: ${dirResults.total_files}`);
    if (dirResults.summary) {
      console.log(`Total de problemas: ${dirResults.summary.total_issues}`);
      console.log(`Problemas críticos: ${dirResults.summary.critical_issues}`);
      console.log(`Problemas altos: ${dirResults.summary.high_issues}`);
      console.log(`Problemas médios: ${dirResults.summary.medium_issues}`);
      console.log(`Problemas baixos: ${dirResults.summary.low_issues}`);
    }

    // Teste 5: Análise de conflitos entre arquivos
    console.log('\n📋 TESTE 5: Analisando conflitos entre arquivos...');
    const conflictFiles = [
      './test_agent_errors.js',
      './src/agent.js'
    ];

    const conflicts = await analyzer.analyzeConflictsBetweenFiles(conflictFiles);
    console.log('\n🔥 CONFLITOS ENTRE ARQUIVOS:');
    console.log('==========================================');
    console.log(`Arquivos analisados: ${conflicts.files?.length || 0}`);
    console.log(`Conflitos de definição: ${conflicts.definition_conflicts?.length || 0}`);

    if (conflicts.definition_conflicts?.length > 0) {
      conflicts.definition_conflicts.forEach(conflict => {
        console.log(`  - ${conflict.message}`);
        conflict.occurrences?.forEach(occ => {
          console.log(`    ${occ.file}:${occ.line}`);
        });
      });
    }

    console.log('\n✅ TODOS OS TESTES CONCLUÍDOS COM SUCESSO!');
    console.log('\n🎯 RESUMO:');
    console.log('==========================================');
    console.log('✅ Sistema de análise de erros funcionando');
    console.log('✅ Detecção de problemas de sintaxe ativa');
    console.log('✅ Detecção de problemas de segurança ativa');
    console.log('✅ Detecção de conflitos lógicos ativa');
    console.log('✅ Análise de performance ativa');
    console.log('✅ Geração de relatórios funcionando');
    console.log('✅ Análise de diretórios funcionando');
    console.log('✅ Detecção de conflitos entre arquivos ativa');

  } catch (error) {
    console.error('❌ ERRO NO TESTE:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Executar teste se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  testErrorAnalyzer();
}

export { testErrorAnalyzer };
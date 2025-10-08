// run_code_analysis.js - Script simplificado para análise de erros focada
import { CodeErrorAnalyzer } from './src/tools/code_error_analyzer.js';

async function analyzeCodeFocused() {
  console.log('🔍 ANÁLISE FOCALIZADA DE ERROS NO ORBION\n');

  const analyzer = new CodeErrorAnalyzer();

  // Arquivos críticos para analisar
  const criticalFiles = [
    './src/server.js',
    './src/agent.js',
    './src/memory.js',
    './src/core/OrbionHybridAgent.js',
    './src/tools/whatsapp.js',
    './src/tools/conversation_manager.js'
  ];

  let totalCriticalIssues = 0;
  let totalHighIssues = 0;
  let totalIssues = 0;

  console.log('📋 ANALISANDO ARQUIVOS CRÍTICOS DO SISTEMA...\n');

  for (const file of criticalFiles) {
    try {
      console.log(`🔍 Analisando: ${file}`);

      const results = await analyzer.analyzeJavaScriptFile(file);
      const issues = analyzer.countIssues(results);

      if (issues === 0) {
        console.log(`✅ ${file}: Nenhum problema detectado\n`);
        continue;
      }

      console.log(`⚠️ ${file}: ${issues} problemas encontrados`);

      // Contar por severidade
      let criticalCount = 0;
      let highCount = 0;

      [
        ...(results.syntax_errors || []),
        ...(results.security_issues || []),
        ...(results.logical_conflicts || [])
      ].forEach(issue => {
        if (issue.severity === 'critical') criticalCount++;
        else if (issue.severity === 'high') highCount++;
      });

      totalCriticalIssues += criticalCount;
      totalHighIssues += highCount;
      totalIssues += issues;

      // Mostrar problemas mais críticos
      if (results.security_issues?.length > 0) {
        console.log('  🔒 PROBLEMAS DE SEGURANÇA:');
        results.security_issues.slice(0, 3).forEach(issue => {
          console.log(`    Linha ${issue.line}: ${issue.message} [${issue.severity}]`);
        });
      }

      if (results.logical_conflicts?.length > 0) {
        console.log('  ⚡ CONFLITOS LÓGICOS:');
        results.logical_conflicts.slice(0, 3).forEach(conflict => {
          console.log(`    ${conflict.message}`);
          if (conflict.first_occurrence) {
            console.log(`      Primeira: linha ${conflict.first_occurrence}, Duplicata: linha ${conflict.duplicate_at}`);
          }
        });
      }

      if (results.syntax_errors?.length > 0) {
        // Mostrar apenas erros de sintaxe mais sérios
        const seriousSyntaxErrors = results.syntax_errors.filter(error =>
          error.message.includes('balanceados') ||
          error.message.includes('correspondente') ||
          error.severity === 'high'
        );

        if (seriousSyntaxErrors.length > 0) {
          console.log('  🔴 ERROS DE SINTAXE CRÍTICOS:');
          seriousSyntaxErrors.slice(0, 3).forEach(error => {
            console.log(`    Linha ${error.line}: ${error.message}`);
          });
        }
      }

      console.log(''); // linha em branco

    } catch (error) {
      console.log(`❌ Erro ao analisar ${file}: ${error.message}\n`);
    }
  }

  // Análise de conflitos entre arquivos críticos
  console.log('🔍 VERIFICANDO CONFLITOS ENTRE ARQUIVOS CRÍTICOS...\n');

  try {
    const existingFiles = [];

    // Verificar quais arquivos existem
    for (const file of criticalFiles) {
      try {
        await analyzer.analyzeJavaScriptFile(file);
        existingFiles.push(file);
      } catch (error) {
        console.log(`⚠️ Arquivo não encontrado: ${file}`);
      }
    }

    if (existingFiles.length > 1) {
      const conflicts = await analyzer.analyzeConflictsBetweenFiles(existingFiles);

      if (conflicts.definition_conflicts?.length > 0) {
        console.log('🔥 CONFLITOS ENCONTRADOS:');
        conflicts.definition_conflicts.forEach(conflict => {
          console.log(`  ❌ ${conflict.message}`);
          conflict.occurrences?.forEach(occ => {
            console.log(`    - ${occ.file}:${occ.line}`);
          });
        });
      } else {
        console.log('✅ Nenhum conflito entre arquivos detectado');
      }
    }

  } catch (error) {
    console.log(`❌ Erro na análise de conflitos: ${error.message}`);
  }

  // Resumo final
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMO DA ANÁLISE');
  console.log('='.repeat(60));
  console.log(`Total de problemas encontrados: ${totalIssues}`);
  console.log(`Problemas críticos: ${totalCriticalIssues}`);
  console.log(`Problemas altos: ${totalHighIssues}`);

  if (totalCriticalIssues > 0) {
    console.log('\n🚨 AÇÃO NECESSÁRIA: Problemas críticos encontrados!');
    console.log('Recomenda-se correção imediata antes do uso em produção.');
  } else if (totalHighIssues > 5) {
    console.log('\n⚠️ ATENÇÃO: Múltiplos problemas de alta prioridade encontrados.');
    console.log('Recomenda-se revisão e correção.');
  } else {
    console.log('\n✅ Sistema em estado aceitável para operação.');
  }

  console.log('='.repeat(60));
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  analyzeCodeFocused().catch(console.error);
}

export { analyzeCodeFocused };
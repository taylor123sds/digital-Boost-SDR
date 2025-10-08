// CodeErrorAnalyzer.js - Sistema de Análise de Erros para ORBION
// Detecta conflitos, erros de sintaxe e problemas em arquivos de código
// Baseado no toolkit Python adaptado para JavaScript/Node.js

import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const readFile = promisify(fs.readFile);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

/**
 * Analisador de Erros em Código para ORBION
 * Detecta conflitos entre agentes, erros de sintaxe e problemas comuns
 */
export class CodeErrorAnalyzer {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.conflicts = [];
    this.analysisId = this.generateId();
  }

  generateId() {
    return crypto.randomUUID().slice(0, 8);
  }

  /**
   * Analisa erros em arquivos JavaScript/Node.js
   */
  async analyzeJavaScriptFile(filepath) {
    const results = {
      file: filepath,
      syntax_errors: [],
      import_errors: [],
      logical_conflicts: [],
      common_issues: [],
      security_issues: [],
      performance_issues: []
    };

    try {
      const content = await readFile(filepath, 'utf-8');
      const lines = content.split('\n');

      console.log(`🔍 [${this.analysisId}] Analisando ${filepath}...`);

      // 1. Verificar erros de sintaxe básicos
      results.syntax_errors = this.checkJavascriptSyntax(content, lines);

      // 2. Verificar imports e exports
      results.import_errors = this.checkImportsExports(content, lines);

      // 3. Detectar conflitos lógicos
      results.logical_conflicts = this.checkLogicalConflicts(content, lines);

      // 4. Problemas comuns JavaScript
      results.common_issues = this.checkCommonIssues(content, lines);

      // 5. Problemas de segurança
      results.security_issues = this.checkSecurityIssues(content, lines);

      // 6. Problemas de performance
      results.performance_issues = this.checkPerformanceIssues(content, lines);

      console.log(`✅ [${this.analysisId}] Análise concluída: ${this.countIssues(results)} problemas encontrados`);

    } catch (error) {
      results.file_error = `Erro ao analisar arquivo: ${error.message}`;
      console.error(`❌ [${this.analysisId}] Erro ao analisar ${filepath}:`, error.message);
    }

    return results;
  }

  /**
   * Verifica erros de sintaxe JavaScript
   */
  checkJavascriptSyntax(content, lines) {
    const errors = [];

    // Padrões de erro de sintaxe comuns
    const syntaxPatterns = [
      { pattern: /for\s*\([^)]*\)\s*[^{]/, message: 'Loop for sem chaves' },
      { pattern: /if\s*\([^)]*\)\s*[^{]\s*else/, message: 'if/else sem chaves' },
      { pattern: /function\s+\w+\s*\([^)]*\)\s*[^{]/, message: 'Função sem chaves' },
      { pattern: /=([^=])/, message: 'Possível atribuição ao invés de comparação (==)' },
      { pattern: /catch\s*\(\s*\)\s*{/, message: 'catch vazio sem tratamento' }
    ];

    lines.forEach((line, index) => {
      syntaxPatterns.forEach(({ pattern, message }) => {
        if (pattern.test(line)) {
          errors.push({
            line: index + 1,
            message,
            text: line.trim(),
            severity: 'high'
          });
        }
      });
    });

    // Verificar balanceamento de parênteses, chaves e colchetes
    const balanceErrors = this.checkBracketsBalance(content, lines);
    errors.push(...balanceErrors);

    return errors;
  }

  /**
   * Verifica problemas com imports e exports
   */
  checkImportsExports(content, lines) {
    const errors = [];
    const imports = [];
    const exports = [];

    lines.forEach((line, index) => {
      const lineNum = index + 1;

      // Detectar imports
      if (line.includes('import') && !line.trim().startsWith('//')) {
        const importMatch = line.match(/import\s+.*\s+from\s+['"]([^'"]+)['"]/);
        if (importMatch) {
          imports.push({ line: lineNum, module: importMatch[1], text: line.trim() });
        }

        // Import sem extensão .js em ES modules
        if (importMatch && importMatch[1].startsWith('./') && !importMatch[1].endsWith('.js')) {
          errors.push({
            line: lineNum,
            message: 'Import sem extensão .js (necessário em ES modules)',
            text: line.trim(),
            severity: 'medium'
          });
        }
      }

      // Detectar exports
      if (line.includes('export') && !line.trim().startsWith('//')) {
        exports.push({ line: lineNum, text: line.trim() });
      }

      // Import não utilizado (heurística simples)
      const importVarMatch = line.match(/import\s+\{?\s*(\w+)/);
      if (importVarMatch && !content.includes(importVarMatch[1])) {
        const varName = importVarMatch[1];
        const usageRegex = new RegExp(`\\b${varName}\\b`, 'g');
        const matches = content.match(usageRegex);
        if (!matches || matches.length <= 1) {
          errors.push({
            line: lineNum,
            message: `Import '${varName}' possivelmente não utilizado`,
            text: line.trim(),
            severity: 'low'
          });
        }
      }
    });

    return errors;
  }

  /**
   * Detecta conflitos lógicos
   */
  checkLogicalConflicts(content, lines) {
    const conflicts = [];
    const functions = {};
    const classes = {};
    const variables = {};

    lines.forEach((line, index) => {
      const lineNum = index + 1;

      // Detectar funções duplicadas
      const funcMatch = line.match(/(?:function\s+(\w+)|(\w+)\s*=\s*(?:function|\([^)]*\)\s*=>))/);
      if (funcMatch) {
        const funcName = funcMatch[1] || funcMatch[2];
        if (functions[funcName]) {
          conflicts.push({
            type: 'duplicate_function',
            name: funcName,
            first_occurrence: functions[funcName],
            duplicate_at: lineNum,
            message: `Função '${funcName}' definida múltiplas vezes`,
            severity: 'high'
          });
        } else {
          functions[funcName] = lineNum;
        }
      }

      // Detectar classes duplicadas
      const classMatch = line.match(/class\s+(\w+)/);
      if (classMatch) {
        const className = classMatch[1];
        if (classes[className]) {
          conflicts.push({
            type: 'duplicate_class',
            name: className,
            first_occurrence: classes[className],
            duplicate_at: lineNum,
            message: `Classe '${className}' definida múltiplas vezes`,
            severity: 'high'
          });
        } else {
          classes[className] = lineNum;
        }
      }

      // Detectar redeclaração de variáveis
      const varMatch = line.match(/(?:const|let|var)\s+(\w+)/);
      if (varMatch) {
        const varName = varMatch[1];
        if (variables[varName]) {
          conflicts.push({
            type: 'variable_redeclaration',
            name: varName,
            first_occurrence: variables[varName],
            duplicate_at: lineNum,
            message: `Variável '${varName}' redeclarada`,
            severity: 'medium'
          });
        } else {
          variables[varName] = lineNum;
        }
      }
    });

    return conflicts;
  }

  /**
   * Verifica problemas comuns JavaScript/Node.js
   */
  checkCommonIssues(content, lines) {
    const issues = [];

    // Padrões de problemas comuns
    const patterns = [
      { pattern: /console\.log/, message: 'console.log deixado no código', severity: 'low' },
      { pattern: /console\.error/, message: 'console.error deixado no código', severity: 'low' },
      { pattern: /debugger/, message: 'debugger statement deixado no código', severity: 'medium' },
      { pattern: /var\s+/, message: 'Uso de var ao invés de let/const', severity: 'medium' },
      { pattern: /==\s*(?!==)/, message: 'Usar === ao invés de ==', severity: 'medium' },
      { pattern: /!=\s*(?!==)/, message: 'Usar !== ao invés de !=', severity: 'medium' },
      { pattern: /setTimeout\s*\([^,]+,\s*0\s*\)/, message: 'setTimeout com 0ms pode ser substituído por setImmediate', severity: 'low' },
      { pattern: /eval\s*\(/, message: 'Uso de eval() é perigoso', severity: 'high' },
      { pattern: /new\s+Function\s*\(/, message: 'new Function() é perigoso como eval', severity: 'high' }
    ];

    lines.forEach((line, index) => {
      patterns.forEach(({ pattern, message, severity }) => {
        if (pattern.test(line) && !line.trim().startsWith('//')) {
          issues.push({
            line: index + 1,
            message,
            text: line.trim(),
            severity
          });
        }
      });

      // Verificar try/catch vazio
      if (line.includes('catch') && lines[index + 1] && lines[index + 1].trim() === '}') {
        issues.push({
          line: index + 1,
          message: 'catch block vazio - erro silenciado',
          text: line.trim(),
          severity: 'high'
        });
      }

      // Verificar async/await mal utilizado
      if (line.includes('await') && !line.includes('async')) {
        // Verificar se a função pai é async (heurística simples)
        const precedingLines = lines.slice(Math.max(0, index - 10), index);
        const hasAsyncFunc = precedingLines.some(l => l.includes('async'));
        if (!hasAsyncFunc) {
          issues.push({
            line: index + 1,
            message: 'await usado fora de função async',
            text: line.trim(),
            severity: 'high'
          });
        }
      }
    });

    return issues;
  }

  /**
   * Verifica problemas de segurança
   */
  checkSecurityIssues(content, lines) {
    const issues = [];

    // Padrões de segurança
    const securityPatterns = [
      { pattern: /process\.env\.\w+\s*\+|`[^`]*\$\{process\.env/, message: 'Concatenação insegura de variáveis de ambiente', severity: 'high' },
      { pattern: /require\s*\(\s*[^)]*process\.env/, message: 'require() dinâmico com env vars é perigoso', severity: 'high' },
      { pattern: /(password|senha|secret|key|token)\s*[:=]\s*['"][^'"]*['"]/, message: 'Credencial hardcoded detectada', severity: 'critical' },
      { pattern: /Math\.random\(\)/, message: 'Math.random() não é criptograficamente seguro', severity: 'medium' },
      { pattern: /innerHTML\s*[+=]/, message: 'innerHTML pode causar XSS', severity: 'high' },
      { pattern: /document\.write/, message: 'document.write pode causar XSS', severity: 'high' },
      { pattern: /eval\s*\(.*req\.|eval\s*\(.*input/, message: 'eval() com input externo - RCE risk', severity: 'critical' }
    ];

    lines.forEach((line, index) => {
      securityPatterns.forEach(({ pattern, message, severity }) => {
        if (pattern.test(line) && !line.trim().startsWith('//')) {
          issues.push({
            line: index + 1,
            message,
            text: line.trim(),
            severity
          });
        }
      });
    });

    return issues;
  }

  /**
   * Verifica problemas de performance
   */
  checkPerformanceIssues(content, lines) {
    const issues = [];

    lines.forEach((line, index) => {
      const lineNum = index + 1;

      // Loop aninhado detectado
      if (line.includes('for') && lines.slice(index + 1, index + 10).some(l => l.includes('for'))) {
        issues.push({
          line: lineNum,
          message: 'Loops aninhados detectados - possível problema de performance O(n²)',
          text: line.trim(),
          severity: 'medium'
        });
      }

      // Operações síncronas em loops
      if (line.includes('for') || line.includes('while')) {
        const loopBlock = lines.slice(index, index + 20);
        const hasSyncOp = loopBlock.some(l =>
          l.includes('fs.readFileSync') ||
          l.includes('fs.writeFileSync') ||
          l.includes('.sync()')
        );
        if (hasSyncOp) {
          issues.push({
            line: lineNum,
            message: 'Operação síncrona dentro de loop - bloqueia event loop',
            text: line.trim(),
            severity: 'high'
          });
        }
      }

      // Memory leaks potenciais
      if (line.includes('setInterval') && !content.includes('clearInterval')) {
        issues.push({
          line: lineNum,
          message: 'setInterval sem clearInterval correspondente - memory leak',
          text: line.trim(),
          severity: 'medium'
        });
      }

      if (line.includes('setTimeout') && !content.includes('clearTimeout')) {
        issues.push({
          line: lineNum,
          message: 'setTimeout sem clearTimeout - possível memory leak',
          text: line.trim(),
          severity: 'low'
        });
      }
    });

    return issues;
  }

  /**
   * Verifica balanceamento de parênteses, chaves e colchetes
   */
  checkBracketsBalance(content, lines) {
    const issues = [];
    const stack = [];
    const pairs = { '(': ')', '[': ']', '{': '}' };

    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      const lineNum = content.substring(0, i).split('\n').length;

      if (pairs[char]) {
        stack.push({ char, line: lineNum });
      } else if (Object.values(pairs).includes(char)) {
        if (stack.length === 0) {
          issues.push({
            line: lineNum,
            message: `Fechamento '${char}' sem abertura correspondente`,
            text: lines[lineNum - 1] || '',
            severity: 'high'
          });
        } else {
          const { char: opening, line: openLine } = stack.pop();
          if (pairs[opening] !== char) {
            issues.push({
              line: lineNum,
              message: `Fechamento '${char}' não corresponde à abertura '${opening}' na linha ${openLine}`,
              text: lines[lineNum - 1] || '',
              severity: 'high'
            });
          }
        }
      }
    }

    // Verificar aberturas não fechadas
    stack.forEach(({ char, line }) => {
      issues.push({
        line,
        message: `Abertura '${char}' sem fechamento correspondente`,
        text: lines[line - 1] || '',
        severity: 'high'
      });
    });

    return issues;
  }

  /**
   * Analisa conflitos entre múltiplos arquivos
   */
  async analyzeConflictsBetweenFiles(filePaths) {
    const conflicts = {
      files: filePaths,
      naming_conflicts: [],
      import_conflicts: [],
      definition_conflicts: [],
      dependency_cycles: []
    };

    console.log(`🔍 [${this.analysisId}] Analisando conflitos entre ${filePaths.length} arquivos...`);

    try {
      const fileContents = await Promise.all(
        filePaths.map(async (filePath) => ({
          path: filePath,
          content: await readFile(filePath, 'utf-8')
        }))
      );

      // Verificar definições duplicadas entre arquivos
      const allFunctions = {};
      const allClasses = {};
      const allExports = {};

      fileContents.forEach(({ path, content }) => {
        const lines = content.split('\n');

        lines.forEach((line, index) => {
          // Funções
          const funcMatch = line.match(/(?:export\s+)?(?:function\s+(\w+)|(\w+)\s*=\s*(?:function|\([^)]*\)\s*=>))/);
          if (funcMatch) {
            const funcName = funcMatch[1] || funcMatch[2];
            if (!allFunctions[funcName]) allFunctions[funcName] = [];
            allFunctions[funcName].push({ file: path, line: index + 1 });
          }

          // Classes
          const classMatch = line.match(/(?:export\s+)?class\s+(\w+)/);
          if (classMatch) {
            const className = classMatch[1];
            if (!allClasses[className]) allClasses[className] = [];
            allClasses[className].push({ file: path, line: index + 1 });
          }

          // Exports
          const exportMatch = line.match(/export\s+(?:default\s+)?(?:function\s+(\w+)|class\s+(\w+)|(?:const|let|var)\s+(\w+))/);
          if (exportMatch) {
            const exportName = exportMatch[1] || exportMatch[2] || exportMatch[3];
            if (!allExports[exportName]) allExports[exportName] = [];
            allExports[exportName].push({ file: path, line: index + 1 });
          }
        });
      });

      // Encontrar conflitos
      Object.entries(allFunctions).forEach(([name, occurrences]) => {
        if (occurrences.length > 1) {
          conflicts.definition_conflicts.push({
            type: 'function',
            name,
            occurrences,
            message: `Função '${name}' definida em múltiplos arquivos`
          });
        }
      });

      Object.entries(allClasses).forEach(([name, occurrences]) => {
        if (occurrences.length > 1) {
          conflicts.definition_conflicts.push({
            type: 'class',
            name,
            occurrences,
            message: `Classe '${name}' definida em múltiplos arquivos`
          });
        }
      });

      // Detectar importações circulares (heurística simples)
      const importGraph = {};
      fileContents.forEach(({ path, content }) => {
        importGraph[path] = [];
        const importMatches = content.match(/import\s+.*\s+from\s+['"]([^'"]+)['"]/g);
        if (importMatches) {
          importMatches.forEach(importLine => {
            const match = importLine.match(/from\s+['"]([^'"]+)['"]/);
            if (match && match[1].startsWith('./')) {
              const resolvedPath = this.resolvePath(path, match[1]);
              importGraph[path].push(resolvedPath);
            }
          });
        }
      });

      console.log(`✅ [${this.analysisId}] Análise de conflitos concluída`);

    } catch (error) {
      conflicts.error = error.message;
      console.error(`❌ [${this.analysisId}] Erro na análise de conflitos:`, error.message);
    }

    return conflicts;
  }

  /**
   * Resolve caminho relativo para absoluto
   */
  resolvePath(basePath, relativePath) {
    const baseDir = path.dirname(basePath);
    let resolved = path.resolve(baseDir, relativePath);
    if (!resolved.endsWith('.js')) {
      resolved += '.js';
    }
    return resolved;
  }

  /**
   * Analisa diretório inteiro em busca de agentes conflitantes
   */
  async analyzeDirectory(dirPath, options = {}) {
    const {
      includePatterns = ['*.js', '*.mjs', '*.ts'],
      excludePatterns = ['node_modules', '.git', 'dist', 'build'],
      recursive = true
    } = options;

    console.log(`🔍 [${this.analysisId}] Analisando diretório: ${dirPath}`);

    const results = {
      directory: dirPath,
      total_files: 0,
      analyzed_files: [],
      conflicts: null,
      summary: {
        total_issues: 0,
        critical_issues: 0,
        high_issues: 0,
        medium_issues: 0,
        low_issues: 0
      }
    };

    try {
      const files = await this.findJavaScriptFiles(dirPath, excludePatterns, recursive);
      results.total_files = files.length;

      console.log(`📁 [${this.analysisId}] Encontrados ${files.length} arquivos para análise`);

      // Analisar cada arquivo
      for (const file of files) {
        const analysis = await this.analyzeJavaScriptFile(file);
        results.analyzed_files.push(analysis);

        // Contar issues por severidade
        this.countIssuesBySeverity(analysis, results.summary);
      }

      // Analisar conflitos entre arquivos
      if (files.length > 1) {
        results.conflicts = await this.analyzeConflictsBetweenFiles(files);
      }

      console.log(`🎯 [${this.analysisId}] Análise completa: ${results.summary.total_issues} problemas encontrados`);

    } catch (error) {
      results.error = error.message;
      console.error(`❌ [${this.analysisId}] Erro na análise do diretório:`, error.message);
    }

    return results;
  }

  /**
   * Encontra arquivos JavaScript no diretório
   */
  async findJavaScriptFiles(dirPath, excludePatterns, recursive) {
    const files = [];

    async function scan(currentPath) {
      const items = await readdir(currentPath);

      for (const item of items) {
        const fullPath = path.join(currentPath, item);

        // Verificar se deve excluir
        if (excludePatterns.some(pattern => fullPath.includes(pattern))) {
          continue;
        }

        const itemStat = await stat(fullPath);

        if (itemStat.isDirectory() && recursive) {
          await scan(fullPath);
        } else if (itemStat.isFile() && /\.(js|mjs|ts)$/.test(item)) {
          files.push(fullPath);
        }
      }
    }

    await scan(dirPath);
    return files;
  }

  /**
   * Conta issues por severidade
   */
  countIssuesBySeverity(analysis, summary) {
    const allIssues = [
      ...(analysis.syntax_errors || []),
      ...(analysis.import_errors || []),
      ...(analysis.logical_conflicts || []),
      ...(analysis.common_issues || []),
      ...(analysis.security_issues || []),
      ...(analysis.performance_issues || [])
    ];

    allIssues.forEach(issue => {
      summary.total_issues++;
      switch (issue.severity) {
        case 'critical':
          summary.critical_issues++;
          break;
        case 'high':
          summary.high_issues++;
          break;
        case 'medium':
          summary.medium_issues++;
          break;
        case 'low':
          summary.low_issues++;
          break;
      }
    });
  }

  /**
   * Conta total de issues em um resultado
   */
  countIssues(results) {
    let count = 0;
    const categories = ['syntax_errors', 'import_errors', 'logical_conflicts',
                      'common_issues', 'security_issues', 'performance_issues'];

    categories.forEach(category => {
      if (results[category]) {
        count += results[category].length;
      }
    });

    return count;
  }

  /**
   * Gera relatório formatado dos erros encontrados
   */
  generateReport(results) {
    const report = [];
    report.push("=" * 60);
    report.push("🔍 RELATÓRIO DE ANÁLISE DE ERROS - ORBION");
    report.push("=" * 60);

    if (results.directory) {
      report.push(`\n📁 Diretório: ${results.directory}`);
      report.push(`📊 Arquivos analisados: ${results.total_files}`);

      if (results.summary) {
        report.push(`\n📈 RESUMO DE PROBLEMAS:`);
        report.push(`  🔴 Críticos: ${results.summary.critical_issues}`);
        report.push(`  🟠 Altos: ${results.summary.high_issues}`);
        report.push(`  🟡 Médios: ${results.summary.medium_issues}`);
        report.push(`  🟢 Baixos: ${results.summary.low_issues}`);
        report.push(`  📊 Total: ${results.summary.total_issues}`);
      }
    }

    const filesToAnalyze = results.analyzed_files || [results];

    filesToAnalyze.forEach(fileResults => {
      if (fileResults.file) {
        report.push(`\n📄 Arquivo: ${path.basename(fileResults.file)}`);
        report.push("-".repeat(40));

        // Erros de sintaxe
        if (fileResults.syntax_errors?.length > 0) {
          report.push("\n🔴 ERROS DE SINTAXE:");
          fileResults.syntax_errors.forEach(error => {
            report.push(`  Linha ${error.line}: ${error.message}`);
            if (error.text) {
              report.push(`    > ${error.text}`);
            }
          });
        }

        // Problemas de import
        if (fileResults.import_errors?.length > 0) {
          report.push("\n📦 PROBLEMAS DE IMPORT:");
          fileResults.import_errors.forEach(error => {
            report.push(`  Linha ${error.line}: ${error.message}`);
          });
        }

        // Conflitos lógicos
        if (fileResults.logical_conflicts?.length > 0) {
          report.push("\n⚡ CONFLITOS LÓGICOS:");
          fileResults.logical_conflicts.forEach(conflict => {
            report.push(`  ${conflict.message}`);
            if (conflict.first_occurrence) {
              report.push(`    Primeira ocorrência: linha ${conflict.first_occurrence}`);
              report.push(`    Duplicata: linha ${conflict.duplicate_at}`);
            }
          });
        }

        // Problemas comuns
        if (fileResults.common_issues?.length > 0) {
          report.push("\n💡 PROBLEMAS COMUNS:");
          fileResults.common_issues.forEach(issue => {
            report.push(`  Linha ${issue.line}: ${issue.message}`);
          });
        }

        // Problemas de segurança
        if (fileResults.security_issues?.length > 0) {
          report.push("\n🔒 PROBLEMAS DE SEGURANÇA:");
          fileResults.security_issues.forEach(issue => {
            report.push(`  Linha ${issue.line}: ${issue.message} [${issue.severity}]`);
          });
        }

        // Problemas de performance
        if (fileResults.performance_issues?.length > 0) {
          report.push("\n⚡ PROBLEMAS DE PERFORMANCE:");
          fileResults.performance_issues.forEach(issue => {
            report.push(`  Linha ${issue.line}: ${issue.message}`);
          });
        }
      }
    });

    // Conflitos entre arquivos
    if (results.conflicts?.definition_conflicts?.length > 0) {
      report.push("\n🔥 CONFLITOS ENTRE ARQUIVOS:");
      results.conflicts.definition_conflicts.forEach(conflict => {
        report.push(`  ${conflict.message}:`);
        conflict.occurrences.forEach(occ => {
          report.push(`    - ${path.basename(occ.file)}:${occ.line}`);
        });
      });
    }

    report.push("\n" + "=".repeat(60));

    const totalIssues = results.summary?.total_issues || this.countIssues(results);
    report.push(`🎯 Total de problemas encontrados: ${totalIssues}`);

    if (totalIssues === 0) {
      report.push("✅ Nenhum problema detectado!");
    } else if (results.summary?.critical_issues > 0) {
      report.push("🚨 ATENÇÃO: Problemas críticos encontrados! Corrija imediatamente.");
    }

    report.push("=".repeat(60));

    return report.join("\n");
  }

  /**
   * Salva relatório detalhado em JSON
   */
  async saveDetailedReport(results, outputPath = null) {
    const reportPath = outputPath || `./orbion_error_analysis_${this.analysisId}.json`;

    const detailedReport = {
      analysis_id: this.analysisId,
      timestamp: new Date().toISOString(),
      orbion_version: "3.0",
      ...results
    };

    try {
      await fs.promises.writeFile(reportPath, JSON.stringify(detailedReport, null, 2));
      console.log(`📄 [${this.analysisId}] Relatório detalhado salvo em: ${reportPath}`);
      return reportPath;
    } catch (error) {
      console.error(`❌ [${this.analysisId}] Erro ao salvar relatório:`, error.message);
      throw error;
    }
  }
}

// Funções de conveniência para uso direto
export async function analyzeAgentFiles(directoryPath, options = {}) {
  const analyzer = new CodeErrorAnalyzer();
  return await analyzer.analyzeDirectory(directoryPath, options);
}

export async function analyzeConflictingAgents(filePaths) {
  const analyzer = new CodeErrorAnalyzer();
  return await analyzer.analyzeConflictsBetweenFiles(filePaths);
}

export async function generateAgentReport(results) {
  const analyzer = new CodeErrorAnalyzer();
  return analyzer.generateReport(results);
}
// tools/response_schema_validator.js
// Sistema Unificado de Validação e Padronização de Respostas ORBION - PRIORIDADE 1

/**
 * 🔧 ESQUEMA UNIFICADO DE RESPOSTA ORBION
 *
 * Este sistema padroniza todas as respostas entre componentes, garantindo:
 * - Estrutura consistente de dados
 * - Validação automática de esquemas
 * - Compatibilidade entre agent.js, cache, sanitizador e outros módulos
 * - Segurança e rastreabilidade completa
 */

export class ResponseSchemaValidator {
  constructor() {
    // 🏗️ ESQUEMA UNIFICADO ORBION - BASE PARA TODAS AS RESPOSTAS
    this.unifiedSchema = {
      // ✅ CAMPOS OBRIGATÓRIOS
      required: {
        response: 'string',     // Texto da resposta para o usuário
        success: 'boolean',     // Status de sucesso da operação
        timestamp: 'number',    // Timestamp da resposta
        source: 'string'        // Origem da resposta (agent|cache|sanitizer|error)
      },

      // 🔄 CAMPOS OPCIONAIS PADRONIZADOS
      optional: {
        // Ação estruturada (para navegação, comandos, etc)
        action: 'string',
        instructions: 'object',

        // Contexto e metadados
        metadata: 'object',
        context: 'object',

        // Cache e performance
        cached: 'boolean',
        cacheSource: 'string',
        similarity: 'number',
        responseTime: 'number',

        // Análise e validação
        scopeAnalysis: 'object',
        securityCheck: 'object',

        // Dados específicos
        data: 'object',
        error: 'string',
        processId: 'string',

        // Compatibilidade
        answer: 'string',        // Alias para response (retrocompatibilidade)
        fullContext: 'object',   // Contexto completo para agent.js
        agentContext: 'object'   // Contexto do agente
      }
    };

    // 🎯 TIPOS DE RESPOSTA SUPORTADOS
    this.responseTypes = {
      // Resposta conversacional padrão
      CONVERSATIONAL: 'conversational',

      // Comando de navegação/ação
      ACTION: 'action',

      // Resposta de erro
      ERROR: 'error',

      // Resposta de cache
      CACHED: 'cached',

      // Resposta sanitizada (segurança)
      SANITIZED: 'sanitized'
    };

    // 📊 Métricas de validação
    this.validationStats = {
      totalValidations: 0,
      successfulValidations: 0,
      failedValidations: 0,
      schemaViolations: {},
      performanceMetrics: {
        averageValidationTime: 0,
        totalValidationTime: 0
      }
    };

    console.log('🔧 ResponseSchemaValidator: Sistema de padronização de respostas inicializado');
  }

  /**
   * 🏗️ CRIA RESPOSTA PADRONIZADA
   * Função principal para criar respostas seguindo o esquema unificado
   *
   * @param {string} response - Texto da resposta
   * @param {Object} options - Opções da resposta
   * @returns {Object} Resposta padronizada e validada
   */
  createStandardResponse(response, options = {}) {
    const startTime = performance.now();

    try {
      // 🔧 Base padronizada obrigatória
      const standardResponse = {
        // ✅ CAMPOS OBRIGATÓRIOS
        response: String(response || ''),
        success: Boolean(options.success !== undefined ? options.success : true),
        timestamp: Date.now(),
        source: String(options.source || 'system'),

        // 🔄 CAMPOS OPCIONAIS (apenas se fornecidos)
        ...(options.action && { action: String(options.action) }),
        ...(options.instructions && { instructions: options.instructions }),
        ...(options.metadata && { metadata: options.metadata }),
        ...(options.context && { context: options.context }),
        ...(options.cached !== undefined && { cached: Boolean(options.cached) }),
        ...(options.cacheSource && { cacheSource: String(options.cacheSource) }),
        ...(options.similarity !== undefined && { similarity: Number(options.similarity) }),
        ...(options.responseTime !== undefined && { responseTime: Number(options.responseTime) }),
        ...(options.scopeAnalysis && { scopeAnalysis: options.scopeAnalysis }),
        ...(options.securityCheck && { securityCheck: options.securityCheck }),
        ...(options.data && { data: options.data }),
        ...(options.error && { error: String(options.error) }),
        ...(options.processId && { processId: String(options.processId) }),
        ...(options.fullContext && { fullContext: options.fullContext }),
        ...(options.agentContext && { agentContext: options.agentContext })
      };

      // 🔄 Retrocompatibilidade: answer = response
      if (!standardResponse.answer) {
        standardResponse.answer = standardResponse.response;
      }

      // ⚡ Calcular tempo de processamento se não fornecido
      if (!standardResponse.responseTime) {
        standardResponse.responseTime = performance.now() - startTime;
      }

      // ✅ Validar esquema
      const validation = this.validateSchema(standardResponse);
      if (!validation.isValid) {
        console.error('🚨 ERRO DE ESQUEMA:', validation.errors);
        return this.createErrorResponse(
          'Erro interno de validação de esquema',
          { originalResponse: response, validationErrors: validation.errors }
        );
      }

      // 📊 Atualizar métricas
      this.updateValidationStats(startTime, true);

      console.log(`✅ Resposta padronizada criada: ${standardResponse.source} (${standardResponse.responseTime.toFixed(1)}ms)`);

      return standardResponse;

    } catch (error) {
      this.updateValidationStats(startTime, false);
      console.error('🚨 ERRO ao criar resposta padronizada:', error);

      return this.createErrorResponse(
        'Erro interno do sistema',
        { error: error.message, originalResponse: response }
      );
    }
  }

  /**
   * 🏗️ CRIA RESPOSTA DE AÇÃO (NAVEGAÇÃO/COMANDOS)
   * Especializada para comandos de navegação e ações estruturadas
   */
  createActionResponse(response, action, instructions, options = {}) {
    return this.createStandardResponse(response, {
      ...options,
      action,
      instructions,
      source: options.source || 'action',
      metadata: {
        type: 'action',
        actionType: action,
        ...options.metadata
      }
    });
  }

  /**
   * 🏗️ CRIA RESPOSTA DE ERRO PADRONIZADA
   */
  createErrorResponse(errorMessage, errorData = {}) {
    return this.createStandardResponse(errorMessage, {
      success: false,
      source: 'error',
      error: errorMessage,
      data: errorData,
      metadata: {
        type: 'error',
        errorCode: errorData.code || 'GENERIC_ERROR',
        timestamp: Date.now()
      }
    });
  }

  /**
   * 🏗️ CRIA RESPOSTA DE CACHE PADRONIZADA
   */
  createCacheResponse(cachedData, cacheSource = 'unknown', options = {}) {
    // Se cachedData já tem estrutura, preservar
    const response = typeof cachedData === 'object' && cachedData.response
      ? cachedData.response
      : String(cachedData);

    return this.createStandardResponse(response, {
      ...options,
      cached: true,
      cacheSource,
      source: 'cache',
      similarity: options.similarity || 1.0,
      // Preservar estrutura de ação se existir
      ...(cachedData.action && { action: cachedData.action }),
      ...(cachedData.instructions && { instructions: cachedData.instructions }),
      ...(cachedData.metadata && {
        metadata: {
          ...cachedData.metadata,
          cacheHit: true,
          cacheSource
        }
      })
    });
  }

  /**
   * 🏗️ CRIA RESPOSTA SANITIZADA (SEGURANÇA)
   */
  createSanitizedResponse(response, securityInfo, options = {}) {
    return this.createStandardResponse(response, {
      ...options,
      source: 'sanitizer',
      securityCheck: {
        sanitized: true,
        level: securityInfo.level || 'high',
        checks: securityInfo.checks || [],
        timestamp: Date.now()
      },
      metadata: {
        type: 'sanitized',
        security: securityInfo.level || 'high',
        ...options.metadata
      }
    });
  }

  /**
   * ✅ VALIDA ESQUEMA DE RESPOSTA
   * Verifica se a resposta segue o esquema unificado
   */
  validateSchema(responseObj) {
    const errors = [];
    const warnings = [];

    try {
      // ✅ Verificar campos obrigatórios
      for (const [field, expectedType] of Object.entries(this.unifiedSchema.required)) {
        if (!(field in responseObj)) {
          errors.push(`Campo obrigatório ausente: ${field}`);
          continue;
        }

        const actualType = typeof responseObj[field];
        if (actualType !== expectedType) {
          errors.push(`Tipo inválido para ${field}: esperado ${expectedType}, recebido ${actualType}`);
        }
      }

      // 🔄 Verificar tipos de campos opcionais (se presentes)
      for (const [field, expectedType] of Object.entries(this.unifiedSchema.optional)) {
        if (field in responseObj) {
          const actualType = typeof responseObj[field];
          if (actualType !== expectedType) {
            warnings.push(`Tipo inválido para campo opcional ${field}: esperado ${expectedType}, recebido ${actualType}`);
          }
        }
      }

      // 🔍 Verificações específicas
      if (responseObj.response && responseObj.response.trim().length === 0) {
        errors.push('Campo response não pode estar vazio');
      }

      if (responseObj.timestamp && responseObj.timestamp <= 0) {
        errors.push('Timestamp deve ser um número positivo');
      }

      if (responseObj.similarity !== undefined && (responseObj.similarity < 0 || responseObj.similarity > 1)) {
        warnings.push('Similarity deve estar entre 0 e 1');
      }

      const isValid = errors.length === 0;

      // 📊 Atualizar estatísticas de violações
      if (!isValid) {
        errors.forEach(error => {
          this.validationStats.schemaViolations[error] =
            (this.validationStats.schemaViolations[error] || 0) + 1;
        });
      }

      return {
        isValid,
        errors,
        warnings,
        score: isValid ? (warnings.length === 0 ? 100 : 80) : 0
      };

    } catch (error) {
      return {
        isValid: false,
        errors: [`Erro de validação: ${error.message}`],
        warnings: [],
        score: 0
      };
    }
  }

  /**
   * 🔄 CONVERTE RESPOSTA LEGADA PARA PADRÃO
   * Converte respostas antigas para o novo esquema unificado
   */
  convertLegacyResponse(legacyResponse, source = 'legacy') {
    try {
      // Resposta de string simples
      if (typeof legacyResponse === 'string') {
        return this.createStandardResponse(legacyResponse, { source });
      }

      // Resposta já é objeto
      if (typeof legacyResponse === 'object') {
        let fallbackResponse = '[Objeto sem resposta]';
        try {
          fallbackResponse = JSON.stringify(legacyResponse, null, 2);
        } catch (jsonError) {
          console.log('⚠️ Erro ao serializar objeto legado:', jsonError.message);
          fallbackResponse = String(legacyResponse) || '[Objeto não serializável]';
        }
        const response = legacyResponse.response || legacyResponse.answer || fallbackResponse;

        return this.createStandardResponse(response, {
          source,
          success: legacyResponse.success !== false,
          action: legacyResponse.action,
          instructions: legacyResponse.instructions,
          metadata: {
            ...legacyResponse.metadata,
            convertedFromLegacy: true,
            originalFormat: typeof legacyResponse
          },
          cached: legacyResponse.cached,
          cacheSource: legacyResponse.source,
          similarity: legacyResponse.similarity,
          data: legacyResponse
        });
      }

      // Fallback para outros tipos
      return this.createStandardResponse(String(legacyResponse), {
        source,
        metadata: { convertedFromLegacy: true, originalType: typeof legacyResponse }
      });

    } catch (error) {
      console.error('🚨 Erro convertendo resposta legada:', error);
      return this.createErrorResponse(
        'Erro na conversão de resposta legada',
        { originalResponse: legacyResponse, error: error.message }
      );
    }
  }

  /**
   * 📊 ATUALIZA ESTATÍSTICAS DE VALIDAÇÃO
   */
  updateValidationStats(startTime, success) {
    const validationTime = performance.now() - startTime;

    this.validationStats.totalValidations++;
    this.validationStats.totalValidationTime += validationTime;

    if (success) {
      this.validationStats.successfulValidations++;
    } else {
      this.validationStats.failedValidations++;
    }

    // Calcular média
    this.validationStats.performanceMetrics.averageValidationTime =
      this.validationStats.totalValidationTime / this.validationStats.totalValidations;
  }

  /**
   * 📊 OBTÉM ESTATÍSTICAS DO VALIDADOR
   */
  getValidationStats() {
    const total = this.validationStats.totalValidations;
    const success = this.validationStats.successfulValidations;

    return {
      ...this.validationStats,
      successRate: total > 0 ? ((success / total) * 100).toFixed(1) + '%' : '0%',
      failureRate: total > 0 ? (((total - success) / total) * 100).toFixed(1) + '%' : '0%',
      averageValidationTime: this.validationStats.performanceMetrics.averageValidationTime.toFixed(2) + 'ms',
      topViolations: Object.entries(this.validationStats.schemaViolations)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([violation, count]) => ({ violation, count }))
    };
  }

  /**
   * 🧪 TESTA COMPATIBILIDADE COM COMPONENTE
   */
  testComponentCompatibility(componentName, sampleResponses = []) {
    console.log(`🧪 Testando compatibilidade: ${componentName}`);

    const results = {
      componentName,
      totalTests: sampleResponses.length,
      passed: 0,
      failed: 0,
      issues: []
    };

    sampleResponses.forEach((sample, index) => {
      try {
        const converted = this.convertLegacyResponse(sample, componentName);
        const validation = this.validateSchema(converted);

        if (validation.isValid) {
          results.passed++;
        } else {
          results.failed++;
          results.issues.push({
            testIndex: index,
            sample: sample,
            errors: validation.errors,
            warnings: validation.warnings
          });
        }
      } catch (error) {
        results.failed++;
        results.issues.push({
          testIndex: index,
          sample: sample,
          error: error.message
        });
      }
    });

    results.successRate = results.totalTests > 0
      ? ((results.passed / results.totalTests) * 100).toFixed(1) + '%'
      : '0%';

    console.log(`🧪 ${componentName}: ${results.successRate} compatibilidade (${results.passed}/${results.totalTests})`);

    return results;
  }

  /**
   * 🧹 CLEANUP E RESET
   */
  reset() {
    this.validationStats = {
      totalValidations: 0,
      successfulValidations: 0,
      failedValidations: 0,
      schemaViolations: {},
      performanceMetrics: {
        averageValidationTime: 0,
        totalValidationTime: 0
      }
    };

    console.log('🧹 ResponseSchemaValidator: Estatísticas resetadas');
  }

  /**
   * 🔧 CLEANUP
   */
  destroy() {
    this.reset();
    console.log('🔧 ResponseSchemaValidator: Sistema destruído');
  }
}

// Singleton instance para uso global
const responseSchemaValidator = new ResponseSchemaValidator();

export default responseSchemaValidator;

// 🔧 UTILITÁRIOS DE CONVENIÊNCIA

/**
 * 🚀 FUNÇÃO DE CONVENIÊNCIA: Criar resposta padrão
 */
export function createResponse(response, options = {}) {
  return responseSchemaValidator.createStandardResponse(response, options);
}

/**
 * 🚀 FUNÇÃO DE CONVENIÊNCIA: Criar resposta de ação
 */
export function createActionResponse(response, action, instructions, options = {}) {
  return responseSchemaValidator.createActionResponse(response, action, instructions, options);
}

/**
 * 🚀 FUNÇÃO DE CONVENIÊNCIA: Criar resposta de erro
 */
export function createErrorResponse(errorMessage, errorData = {}) {
  return responseSchemaValidator.createErrorResponse(errorMessage, errorData);
}

/**
 * 🚀 FUNÇÃO DE CONVENIÊNCIA: Validar resposta
 */
export function validateResponse(responseObj) {
  return responseSchemaValidator.validateSchema(responseObj);
}
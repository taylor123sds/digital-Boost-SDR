/**
 * AGENT FACTORY
 * Fabrica de agentes - cria agentes completos a partir de configuracao
 *
 * Responsabilidades:
 * - Validar configuracao contra schema
 * - Compilar prompt usando PromptCompiler
 * - Inicializar state machine apropriada
 * - Criar instancia do agente pronta para uso
 */

import { PromptCompiler, compileAgentPrompt, previewPrompt } from './runtime/PromptCompiler.js';
import { SDRStateMachine, createSDRStateMachine } from './runtime/state_machines/SDRStateMachine.js';

/**
 * Classe principal da fabrica de agentes
 */
export class AgentFactory {
  constructor() {
    this.registry = new Map(); // Cache de agentes criados
    this.templates = new Map(); // Cache de templates compilados
  }

  /**
   * Cria um agente a partir da configuracao
   * @param {object} config - Configuracao do agente (AgentConfig)
   * @returns {object} Agente pronto para uso
   */
  createAgent(config) {
    // Valida configuracao
    const validation = this.validateConfig(config);
    if (!validation.valid) {
      throw new Error(`Configuracao invalida: ${validation.errors.join(', ')}`);
    }

    // Compila prompt
    const compiler = new PromptCompiler(config);
    const { prompt, buildReport } = compiler.compile();

    // Inicializa state machine baseado na role
    const stateMachine = this.createStateMachine(config);

    // Cria instancia do agente
    const agent = {
      id: config.id,
      version: config.version || '1.0.0',
      config,
      prompt,
      buildReport,
      stateMachine,
      createdAt: new Date().toISOString(),

      // Metodos do agente
      getPrompt: () => prompt,
      getCompactPrompt: () => compiler.compileCompact(),
      getStateMachine: () => stateMachine,
      getBuildReport: () => buildReport,

      // Processa mensagem
      processMessage: (message, extractedData = {}) => {
        return stateMachine.processMessage(message, extractedData);
      },

      // Serializa para persistencia
      serialize: () => ({
        id: config.id,
        version: config.version,
        state: stateMachine.serialize(),
      }),

      // Restaura de dados persistidos
      restore: (data) => {
        if (data.state) stateMachine.restore(data.state);
      },
    };

    // Adiciona ao registry
    this.registry.set(config.id, agent);

    return agent;
  }

  /**
   * Valida configuracao contra schema
   */
  validateConfig(config) {
    const errors = [];

    // Campos obrigatorios
    if (!config.id) errors.push('id e obrigatorio');
    if (!config.empresa?.nome) errors.push('empresa.nome e obrigatorio');
    if (!config.agente?.nome) errors.push('agente.nome e obrigatorio');
    if (!config.agente?.role) errors.push('agente.role e obrigatorio');

    // Validacoes de tipo
    const validRoles = ['sdr', 'specialist', 'scheduler', 'support'];
    if (config.agente?.role && !validRoles.includes(config.agente.role)) {
      errors.push(`role deve ser um de: ${validRoles.join(', ')}`);
    }

    const validVerticals = ['varejo', 'servicos', 'saas', 'educacao', 'saude'];
    if (config.agente?.vertical && !validVerticals.includes(config.agente.vertical)) {
      errors.push(`vertical deve ser um de: ${validVerticals.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Cria state machine apropriada para a role
   */
  createStateMachine(config) {
    const role = config.agente?.role || 'sdr';

    switch (role) {
      case 'sdr':
      case 'specialist':
        return createSDRStateMachine(config);

      case 'scheduler':
        // TODO: Implementar SchedulerStateMachine
        return createSDRStateMachine(config);

      case 'support':
        // TODO: Implementar SupportStateMachine
        return createSDRStateMachine(config);

      default:
        return createSDRStateMachine(config);
    }
  }

  /**
   * Preview do agente sem criar instancia completa
   */
  preview(config) {
    const validation = this.validateConfig(config);
    if (!validation.valid) {
      return {
        valid: false,
        errors: validation.errors,
        prompt: null,
        buildReport: null,
      };
    }

    const { prompt, buildReport } = previewPrompt(config);

    return {
      valid: true,
      errors: [],
      prompt,
      buildReport,
      estimatedTokens: buildReport.stats.estimatedTokens,
    };
  }

  /**
   * Retorna agente do registry
   */
  getAgent(agentId) {
    return this.registry.get(agentId);
  }

  /**
   * Remove agente do registry
   */
  removeAgent(agentId) {
    return this.registry.delete(agentId);
  }

  /**
   * Lista todos os agentes no registry
   */
  listAgents() {
    return Array.from(this.registry.entries()).map(([id, agent]) => ({
      id,
      version: agent.version,
      createdAt: agent.createdAt,
      role: agent.config.agente?.role,
      vertical: agent.config.agente?.vertical,
      empresa: agent.config.empresa?.nome,
    }));
  }

  /**
   * Cria agente a partir de template pre-definido
   */
  createFromTemplate(templateId, overrides = {}) {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} nao encontrado`);
    }

    const config = this.mergeConfig(template, overrides);
    return this.createAgent(config);
  }

  /**
   * Registra um template
   */
  registerTemplate(templateId, template) {
    this.templates.set(templateId, template);
  }

  /**
   * Retorna template
   */
  getTemplate(templateId) {
    return this.templates.get(templateId);
  }

  /**
   * Merge de configuracoes
   */
  mergeConfig(base, overrides) {
    return this.deepMerge(JSON.parse(JSON.stringify(base)), overrides);
  }

  /**
   * Deep merge de objetos
   */
  deepMerge(target, source) {
    for (const key in source) {
      if (source[key] instanceof Object && key in target && !(source[key] instanceof Array)) {
        target[key] = this.deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
    return target;
  }
}

/**
 * Instancia singleton
 */
let factoryInstance = null;

/**
 * Retorna instancia singleton da factory
 */
export function getAgentFactory() {
  if (!factoryInstance) {
    factoryInstance = new AgentFactory();
    initializeDefaultTemplates(factoryInstance);
  }
  return factoryInstance;
}

/**
 * Inicializa templates padrao
 */
function initializeDefaultTemplates(factory) {
  // Template SDR Servicos
  factory.registerTemplate('sdr-servicos', {
    id: 'sdr-servicos-template',
    version: '1.0.0',
    empresa: {
      nome: '{{EMPRESA_NOME}}',
      segmento: 'Servicos',
      descricao: '{{EMPRESA_DESCRICAO}}',
    },
    agente: {
      nome: '{{AGENTE_NOME}}',
      role: 'sdr',
      vertical: 'servicos',
      objetivo: 'Qualificar leads e agendar reunioes com especialistas',
      kpis: ['reunioes_agendadas', 'leads_qualificados', 'taxa_conversao'],
    },
    qualificacao: {
      framework: 'spin_bant',
      criterios_obrigatorios: ['need', 'authority'],
      criterios_desejaveis: ['budget', 'timeline'],
      pontuacao_sql: 60,
    },
    brandVoice: {
      tom: 'profissional',
      tratamento: 'voce',
      emojis: false,
      max_paragrafos: 3,
    },
  });

  // Template SDR Varejo
  factory.registerTemplate('sdr-varejo', {
    id: 'sdr-varejo-template',
    version: '1.0.0',
    empresa: {
      nome: '{{EMPRESA_NOME}}',
      segmento: 'Varejo',
      descricao: '{{EMPRESA_DESCRICAO}}',
    },
    agente: {
      nome: '{{AGENTE_NOME}}',
      role: 'sdr',
      vertical: 'varejo',
      objetivo: 'Atender clientes, apresentar produtos e fechar vendas',
      kpis: ['vendas', 'ticket_medio', 'satisfacao'],
    },
    qualificacao: {
      framework: 'bant',
      criterios_obrigatorios: ['need'],
      pontuacao_sql: 50,
    },
    brandVoice: {
      tom: 'casual',
      tratamento: 'voce',
      emojis: true,
      max_paragrafos: 2,
    },
  });

  // Template Support
  factory.registerTemplate('support-geral', {
    id: 'support-geral-template',
    version: '1.0.0',
    empresa: {
      nome: '{{EMPRESA_NOME}}',
      segmento: '{{SEGMENTO}}',
      descricao: '{{EMPRESA_DESCRICAO}}',
    },
    agente: {
      nome: '{{AGENTE_NOME}}',
      role: 'support',
      vertical: 'servicos',
      objetivo: 'Resolver duvidas e problemas dos clientes com agilidade',
      kpis: ['fcr', 'csat', 'tempo_resposta'],
    },
    brandVoice: {
      tom: 'profissional',
      tratamento: 'voce',
      emojis: false,
      max_paragrafos: 3,
    },
  });

  // Template Scheduler (Agenda)
  factory.registerTemplate('scheduler-agenda', {
    id: 'scheduler-agenda-template',
    version: '1.0.0',
    empresa: {
      nome: '{{EMPRESA_NOME}}',
      segmento: 'Servicos',
      descricao: '{{EMPRESA_DESCRICAO}}',
    },
    agente: {
      nome: '{{AGENTE_NOME}}',
      role: 'scheduler',
      vertical: 'servicos',
      objetivo: 'Gerenciar agendamentos de forma eficiente',
      kpis: ['agendamentos', 'taxa_confirmacao', 'no_shows'],
    },
    agendamento: {
      habilitado: true,
      duracao_padrao: 30,
      antecedencia_minima: 2,
      antecedencia_maxima: 30,
      buffer_entre_reunioes: 15,
    },
    brandVoice: {
      tom: 'profissional',
      tratamento: 'voce',
      emojis: false,
      max_paragrafos: 2,
    },
  });
}

/**
 * Factory function simples
 */
export function createAgent(config) {
  return getAgentFactory().createAgent(config);
}

/**
 * Preview function simples
 */
export function previewAgent(config) {
  return getAgentFactory().preview(config);
}

export default {
  AgentFactory,
  getAgentFactory,
  createAgent,
  previewAgent,
};

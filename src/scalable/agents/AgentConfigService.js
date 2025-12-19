/**
 * @file AgentConfigService.js
 * @description Servico para gerenciar configuracoes de agentes
 *
 * Responsabilidades:
 * - CRUD de configuracoes de agentes
 * - Versionamento de configuracoes
 * - Geracao de configuracoes a partir de templates
 * - Cache de configuracoes ativas
 */

import crypto from 'crypto';
import { getDatabase } from '../../db/index.js';
import {
  BusinessSectors,
  CTATypes,
  AgentConfigSchema,
  generateSectorDefaults,
  validateAgentConfig,
  agentConfigMigration
} from './AgentConfigSchema.js';

// Cache de configuracoes ativas
const configCache = new Map();

/**
 * Servico de Configuracao de Agentes
 */
export class AgentConfigService {
  constructor() {
    this.db = null;
  }

  /**
   * Inicializa o servico
   */
  async initialize() {
    try {
      this.db = getDatabase();
      await this.ensureTable();
      console.log('[AGENT-CONFIG] Servico inicializado');
      return true;
    } catch (error) {
      console.error('[AGENT-CONFIG] Erro ao inicializar:', error.message);
      return false;
    }
  }

  /**
   * Garante que a tabela existe
   */
  async ensureTable() {
    this.db.exec(agentConfigMigration.up);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CRUD DE CONFIGURACOES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Cria nova configuracao para um agente
   * @param {string} agentId - ID do agente
   * @param {string} tenantId - ID do tenant
   * @param {Object} config - Configuracao do agente
   * @param {string} createdBy - Usuario que criou
   * @returns {Object} Configuracao criada
   */
  async createConfig(agentId, tenantId, config, createdBy = null) {
    // Validar configuracao
    const validation = validateAgentConfig(config);
    if (!validation.valid) {
      throw new Error(`Configuracao invalida: ${validation.errors.join(', ')}`);
    }

    // Obter proxima versao
    const currentVersion = this._getCurrentVersion(agentId);
    const newVersion = currentVersion + 1;

    // Desativar versoes anteriores
    if (currentVersion > 0) {
      const deactivateStmt = this.db.prepare(`
        UPDATE agent_configs SET is_active = 0 WHERE agent_id = ?
      `);
      deactivateStmt.run(agentId);
    }

    // Inserir nova configuracao
    const id = crypto.randomUUID();
    const insertStmt = this.db.prepare(`
      INSERT INTO agent_configs (id, agent_id, tenant_id, version, config, is_active, created_by)
      VALUES (?, ?, ?, ?, ?, 1, ?)
    `);

    insertStmt.run(id, agentId, tenantId, newVersion, JSON.stringify(config), createdBy);

    // Atualizar cache
    configCache.set(agentId, config);

    console.log(`[AGENT-CONFIG] Criada versao ${newVersion} para agente ${agentId}`);

    return {
      id,
      agentId,
      tenantId,
      version: newVersion,
      config,
      isActive: true,
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Obtem configuracao ativa de um agente
   * @param {string} agentId - ID do agente
   * @returns {Object|null} Configuracao ou null
   */
  getActiveConfig(agentId) {
    // Verificar cache primeiro
    if (configCache.has(agentId)) {
      return configCache.get(agentId);
    }

    const stmt = this.db.prepare(`
      SELECT * FROM agent_configs
      WHERE agent_id = ? AND is_active = 1
      ORDER BY version DESC
      LIMIT 1
    `);

    const row = stmt.get(agentId);

    if (row) {
      const config = JSON.parse(row.config);
      configCache.set(agentId, config);
      return config;
    }

    return null;
  }

  /**
   * Obtem configuracao por tenant (para quando nao sabe o agentId)
   * @param {string} tenantId - ID do tenant
   * @param {string} agentType - Tipo do agente (sdr, support, etc)
   * @returns {Object|null} Configuracao ou null
   */
  getConfigByTenant(tenantId, agentType = 'sdr') {
    const stmt = this.db.prepare(`
      SELECT ac.* FROM agent_configs ac
      INNER JOIN agents a ON ac.agent_id = a.id
      WHERE ac.tenant_id = ? AND a.type = ? AND ac.is_active = 1
      ORDER BY ac.version DESC
      LIMIT 1
    `);

    const row = stmt.get(tenantId, agentType);

    if (row) {
      return JSON.parse(row.config);
    }

    return null;
  }

  /**
   * Atualiza configuracao existente (cria nova versao)
   * @param {string} agentId - ID do agente
   * @param {Object} updates - Campos a atualizar
   * @param {string} updatedBy - Usuario que atualizou
   * @returns {Object} Nova versao da configuracao
   */
  async updateConfig(agentId, updates, updatedBy = null) {
    const current = this.getActiveConfig(agentId);

    if (!current) {
      throw new Error(`Configuracao nao encontrada para agente ${agentId}`);
    }

    // Obter tenant_id da configuracao atual
    const stmt = this.db.prepare(`
      SELECT tenant_id FROM agent_configs WHERE agent_id = ? AND is_active = 1
    `);
    const row = stmt.get(agentId);
    const tenantId = row?.tenant_id;

    // Merge profundo das configuracoes
    const merged = this._deepMerge(current, updates);

    // Criar nova versao
    return this.createConfig(agentId, tenantId, merged, updatedBy);
  }

  /**
   * Lista todas as versoes de configuracao de um agente
   * @param {string} agentId - ID do agente
   * @returns {Array} Lista de versoes
   */
  listConfigVersions(agentId) {
    const stmt = this.db.prepare(`
      SELECT id, version, is_active, created_at, created_by
      FROM agent_configs
      WHERE agent_id = ?
      ORDER BY version DESC
    `);

    return stmt.all(agentId);
  }

  /**
   * Restaura uma versao anterior
   * @param {string} agentId - ID do agente
   * @param {number} version - Versao a restaurar
   * @returns {Object} Configuracao restaurada
   */
  async restoreVersion(agentId, version) {
    const stmt = this.db.prepare(`
      SELECT * FROM agent_configs WHERE agent_id = ? AND version = ?
    `);

    const row = stmt.get(agentId, version);

    if (!row) {
      throw new Error(`Versao ${version} nao encontrada para agente ${agentId}`);
    }

    const config = JSON.parse(row.config);

    // Criar nova versao com o conteudo antigo
    return this.createConfig(agentId, row.tenant_id, config, `restored_from_v${version}`);
  }

  /**
   * Deleta todas as configuracoes de um agente
   * @param {string} agentId - ID do agente
   */
  deleteAllConfigs(agentId) {
    const stmt = this.db.prepare(`DELETE FROM agent_configs WHERE agent_id = ?`);
    stmt.run(agentId);
    configCache.delete(agentId);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GERACAO DE CONFIGURACOES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Gera configuracao base a partir de um setor
   * @param {Object} params - Parametros basicos
   * @returns {Object} Configuracao gerada
   */
  generateConfigFromSector(params) {
    const {
      companyName,
      agentName = 'Agente',
      sector,
      description,
      offerings = [],
      valueProposition = '',
      ctaDescription = 'agendar uma reuniao',
      ctaType = CTATypes.REUNIAO
    } = params;

    // Obter defaults do setor
    const sectorDefaults = generateSectorDefaults(sector);

    // Construir configuracao completa
    const config = {
      identity: {
        agentName,
        companyName,
        sector,
        role: 'SDR',
        personality: 'consultivo',
        language: 'pt-BR'
      },

      business: {
        description,
        valueProposition,
        offerings,
        offeringSummary: offerings.slice(0, 3).join(', '),
        targetAudience: '',
        differentials: [],
        socialProof: '',
        honesty: {
          doNotPromise: [],
          beHonestAbout: []
        }
      },

      cta: {
        type: ctaType,
        description: ctaDescription,
        valueForLead: '',
        duration: '30 min',
        scheduling: {
          enabled: false,
          calendarUrl: '',
          availability: ''
        }
      },

      spinConfig: this._buildSpinConfig(sectorDefaults),

      bantConfig: {
        fields: sectorDefaults.bantFields || {},
        questions: sectorDefaults.questionTypes || {},
        qualificationThreshold: 60
      },

      objectionHandlers: this._buildObjectionHandlers(sectorDefaults),

      styleRules: {
        forbiddenStarters: [
          'Entendo', 'Entendi', 'Perfeito', 'Otimo', 'Legal',
          'Certo', 'Claro', 'Ok', 'Maravilha', 'Show', 'Top'
        ],
        allowedAcknowledgments: [
          'Faz sentido.', 'Acontece muito.', 'Vejo isso direto.',
          'E comum.', 'Acontece bastante.'
        ],
        maxLines: 4,
        mustEndWith: 'UMA pergunta (nunca duas)',
        forbiddenCorporate: [
          'agregar valor', 'solucoes personalizadas', 'parceria estrategica',
          'alavancar', 'potencializar', 'maximizar', 'viabilizar'
        ],
        messageStructure: {
          gancho: 'Espelhar algo especifico que o lead disse (3-10 palavras)',
          fato: 'Insight/dado que agrega valor (1-2 frases)',
          pergunta: 'UMA pergunta que coleta dado BANT'
        }
      },

      knowledgeBase: {
        faqs: {},
        commonQuestions: {},
        canShare: [],
        requiresHuman: []
      },

      aiConfig: {
        model: 'gpt-4o-mini',
        plannerTemperature: 0.3,
        writerTemperature: 0.9,
        maxTokensPlanner: 1000,
        maxTokensWriter: 300
      },

      integrations: {
        calendar: { enabled: false, provider: '', config: {} },
        crm: { enabled: false, provider: '', config: {} },
        whatsapp: { instanceName: '', evolutionConfig: {} }
      }
    };

    return config;
  }

  /**
   * Constroi configuracao SPIN a partir dos defaults do setor
   */
  _buildSpinConfig(sectorDefaults) {
    const questionTypes = sectorDefaults.questionTypes || {};

    return {
      phases: {
        situation: {
          name: 'Situacao',
          objective: 'Entender como funciona a operacao hoje - buscar pontos de dor',
          tone: 'Curioso, neutro, buscando brechas',
          dataToCollect: Object.keys(sectorDefaults.bantFields || {}).filter(k =>
            sectorDefaults.bantFields[k]?.fromPhase === 'situation'
          ),
          questionTypes: questionTypes.situation || [],
          advanceSignals: ['indicacao', 'instagram', 'site', 'depende', 'varia'],
          minTurns: 1
        },
        problem: {
          name: 'Problema',
          objective: 'Amplificar a dor - fazer o lead sentir o custo do problema',
          tone: 'Empatico mas provocativo - custo da dor',
          technique: {
            name: 'Tensao',
            description: 'Transformar problema abstrato em PERDA CONCRETA (R$, tempo, oportunidades)'
          },
          dataToCollect: Object.keys(sectorDefaults.bantFields || {}).filter(k =>
            sectorDefaults.bantFields[k]?.fromPhase === 'problem'
          ),
          questionTypes: questionTypes.problem || [],
          advanceSignals: ['dificil', 'complica', 'perde', 'custa', 'preocupa'],
          minTurns: 1
        },
        implication: {
          name: 'Implicacao',
          objective: 'Amplificar consequencias - o que acontece se nao resolver',
          tone: 'Tensao amplificada - urgencia',
          technique: {
            name: 'Tensao Amplificada',
            description: 'Mostrar impacto a longo prazo e oportunidades perdidas'
          },
          dataToCollect: [],
          questionTypes: questionTypes.implication || [],
          advanceSignals: ['precisa', 'tem que', 'urgente', 'resolver'],
          minTurns: 1
        },
        needPayoff: {
          name: 'Necessidade-Beneficio',
          objective: 'Direcionar para solucao como proximo passo logico',
          tone: 'Direcional - caminho unico',
          technique: {
            name: 'Direcao',
            description: 'Guiar para conclusao OBVIA. Fazer parecer logico avancar.'
          },
          dataToCollect: Object.keys(sectorDefaults.bantFields || {}).filter(k =>
            sectorDefaults.bantFields[k]?.fromPhase === 'needPayoff'
          ),
          questionTypes: questionTypes.needPayoff || [],
          advanceSignals: ['faz sentido', 'interessante', 'quero', 'preciso'],
          minTurns: 1
        },
        closing: {
          name: 'Fechamento',
          objective: 'Converter interesse em acao concreta',
          tone: 'Assertivo com valor - entregavel claro',
          technique: {
            name: 'Entregavel + Fechamento',
            description: 'Mostrar valor tangivel da call e fechar com alternativa dupla'
          },
          closingTechniques: ['alternativa_dupla', 'assumir_venda', 'urgencia_real'],
          dataToCollect: [],
          questionTypes: questionTypes.closing || [],
          minTurns: 1
        }
      },
      transitions: {
        advanceSignals: {},
        regressSignals: {
          backToSituation: ['nao preciso', 'nao quero', 'sem interesse'],
          backToProblem: ['nao sei', 'talvez', 'vou pensar']
        }
      }
    };
  }

  /**
   * Constroi handlers de objecoes a partir dos defaults do setor
   */
  _buildObjectionHandlers(sectorDefaults) {
    const objections = sectorDefaults.objections || {};

    return {
      price: {
        detection: ['caro', 'preco', 'custo', 'quanto custa', 'orcamento', 'nao tenho dinheiro'],
        reframe: objections.price?.reframe || 'Entendo. Mas quanto custa NAO resolver isso?',
        response: '',
        followUp: 'O que seria um investimento justo pra resolver esse problema?'
      },
      time: {
        detection: ['sem tempo', 'ocupado', 'correria', 'depois', 'agora nao'],
        reframe: 'Justamente por estar ocupado que faz sentido otimizar isso.',
        response: '',
        followUp: '20 minutos seria muito? E o tempo que investir pode voltar em resultados.'
      },
      think: {
        detection: ['vou pensar', 'deixa eu ver', 'preciso analisar', 'vou conversar'],
        reframe: 'Faz sentido. O que falta pra voce ter certeza?',
        response: '',
        followUp: 'Tem alguma duvida que posso esclarecer agora?'
      },
      alreadyHave: {
        detection: ['ja tenho', 'ja uso', 'ja faco', 'funciona bem'],
        reframe: objections.alreadyHave?.reframe || 'Otimo! Como esta a performance?',
        response: '',
        followUp: 'Da pra melhorar alguma coisa?'
      },
      noNeed: {
        detection: ['nao preciso', 'nao quero', 'nao me interessa', 'sem interesse'],
        reframe: 'Entendo. O que te fez chegar a essa conclusao?',
        response: '',
        followUp: 'Posso perguntar como funciona hoje?'
      }
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Obtem versao atual da configuracao
   */
  _getCurrentVersion(agentId) {
    const stmt = this.db.prepare(`
      SELECT MAX(version) as max_version FROM agent_configs WHERE agent_id = ?
    `);
    const row = stmt.get(agentId);
    return row?.max_version || 0;
  }

  /**
   * Merge profundo de objetos
   */
  _deepMerge(target, source) {
    const result = { ...target };

    for (const key of Object.keys(source)) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this._deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }

  /**
   * Limpa cache de um agente
   */
  clearCache(agentId) {
    if (agentId) {
      configCache.delete(agentId);
    } else {
      configCache.clear();
    }
  }
}

// Singleton
let serviceInstance = null;

export function getAgentConfigService() {
  if (!serviceInstance) {
    serviceInstance = new AgentConfigService();
  }
  return serviceInstance;
}

export function resetAgentConfigService() {
  serviceInstance = null;
}

export default {
  AgentConfigService,
  getAgentConfigService,
  resetAgentConfigService,
  BusinessSectors,
  CTATypes
};

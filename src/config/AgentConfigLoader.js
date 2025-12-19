/**
 * AGENT CONFIG LOADER
 *
 * Carrega configuracao do agente de forma dinamica.
 * - Se tem tenant_id: carrega do banco
 * - Se nao: usa defaults (Digital Boost)
 *
 * Este modulo substitui os valores hardcoded mantendo
 * retrocompatibilidade total com o sistema existente.
 */

import { getDatabase } from '../db/index.js';

// ============================================================
// DEFAULTS - DIGITAL BOOST (TENANT PRINCIPAL)
// Mantidos aqui para retrocompatibilidade
// ============================================================

const DEFAULT_CONFIG = {
  // Empresa
  empresa: {
    nome: 'Digital Boost',
    nome_curto: 'Digital Boost',
    segmento: 'Marketing Digital',
    website: 'digitalboost.com.br',
    telefone: '558492194616',
    email: 'contato@digitalboost.com.br',
    cnpj: null,
    endereco: {
      cidade: 'Natal',
      estado: 'RN',
      pais: 'Brasil'
    }
  },

  // Agente
  agente: {
    nome: 'ORBION',
    nome_apresentacao: 'Leadly',
    role: 'SDR',
    voz: 'nova', // TTS voice
    personalidade: 'profissional_amigavel',
    horario_trabalho: {
      inicio: '08:00',
      fim: '18:00',
      dias: ['seg', 'ter', 'qua', 'qui', 'sex']
    }
  },

  // Servicos oferecidos
  servicos: [
    'Marketing Digital',
    'Gestao de Redes Sociais',
    'Google Ads e Meta Ads',
    'Automacao de Marketing',
    'E-commerce',
    'SEO e Otimizacao',
    'Consultoria Digital',
    'Criacao de Conteudo',
    'Landing Pages',
    'Funis de Vendas'
  ],

  // Palavras-chave do escopo (para redirecionar conversas off-topic)
  escopo: [
    'marketing digital', 'publicidade online', 'redes sociais',
    'automacao', 'vendas online', 'e-commerce', 'SEO',
    'trafego pago', 'conversao', 'leads', 'ROI',
    'campanhas', 'digital', 'online'
  ],

  // ICP - Ideal Customer Profile
  icp: {
    segmentos_ideais: {
      PERFECT: {
        industries: ['saude', 'clinica', 'advocacia', 'contabilidade', 'educacao', 'escola', 'curso'],
        sizes: ['10-50', '50-200'],
        locations: ['natal', 'rn', 'nordeste'],
        score: 25
      },
      GOOD: {
        industries: ['varejo', 'e-commerce', 'servicos', 'consultoria', 'imobiliaria'],
        sizes: ['5-10', '200-500'],
        locations: ['brasil'],
        score: 20
      },
      ACCEPTABLE: {
        industries: ['outros'],
        sizes: ['1-5', '500+'],
        locations: ['internacional'],
        score: 10
      }
    }
  },

  // Precos e planos (BANT)
  precos: {
    entry: {
      nome: 'Starter',
      valor: 550,
      descricao: 'Para quem esta comecando'
    },
    growth: {
      nome: 'Growth',
      valor: 800,
      descricao: 'Para empresas em crescimento'
    },
    enterprise: {
      nome: 'Enterprise',
      valor: 1500,
      descricao: 'Para grandes operacoes'
    }
  },

  // Catalogo de servicos detalhado
  catalogo: {
    DRE: {
      nome: 'DRE Digital',
      descricao: 'Diagnostico Rapido Empresarial',
      valor_base: 0,
      tipo: 'consultoria'
    },
    FLUXO_CAIXA: {
      nome: 'Gestao de Fluxo de Caixa',
      descricao: 'Controle financeiro completo',
      valor_base: 600,
      tipo: 'servico'
    },
    MARKETING_DIGITAL: {
      nome: 'Marketing Digital Completo',
      descricao: 'Gestao de campanhas e redes sociais',
      valor_base: 800,
      tipo: 'servico'
    }
  },

  // Mensagens padrao
  mensagens: {
    saudacao_inicial: 'Ola! Eu sou a Leadly da Digital Boost.',
    apresentacao: 'Somos especialistas em marketing digital, automacao de processos, gestao de redes sociais e campanhas de ads.',
    proposta_valor: 'Estou aqui para ajudar a impulsionar seu negocio online e aumentar suas vendas atraves de estrategias digitais comprovadas.',
    cta_inicial: 'Vamos conversar sobre como podemos transformar seus resultados?',
    fallback: 'Obrigado pelo contato! Como especialista da Digital Boost, foco em solucoes de marketing digital. Como posso ajudar seu negocio?',
    fora_escopo: 'Obrigado pelo contato! Sou especialista em marketing digital da Digital Boost. Como posso ajudar a impulsionar seu negocio online?',
    agendamento: 'Perfeito! Vou agendar nossa reuniao estrategica. Para enviar o convite, preciso do seu email. Qual o melhor email para contato?'
  },

  // Configuracoes de integracao
  integracoes: {
    whatsapp: {
      bot_number: '558492194616',
      instance_name: 'digitalboost'
    },
    calendario: {
      provider: 'google',
      calendar_id: null
    },
    crm: {
      provider: 'interno',
      sync_enabled: false
    }
  },

  // Configuracoes de qualificacao
  qualificacao: {
    framework: 'spin_bant',
    scoring_weights: {
      behavior: 30,
      firmographics: 25,
      bant: 30,
      intent: 15
    },
    mql_threshold: 60,
    sql_threshold: 80
  }
};

// ============================================================
// CONFIG LOADER CLASS
// ============================================================

class AgentConfigLoader {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutos
    this.defaultConfig = DEFAULT_CONFIG;
  }

  /**
   * Carrega configuracao do agente
   * @param {string} tenantId - ID do tenant (opcional)
   * @param {string} agentId - ID do agente (opcional)
   * @returns {object} Configuracao do agente
   */
  async loadConfig(tenantId = null, agentId = null) {
    // Se nao tem tenant, retorna default
    if (!tenantId) {
      return this.defaultConfig;
    }

    // Verifica cache
    const cacheKey = `${tenantId}:${agentId || 'default'}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.config;
    }

    // Tenta carregar do banco
    try {
      const dbConfig = await this.loadFromDatabase(tenantId, agentId);
      if (dbConfig) {
        // Merge com defaults para garantir campos faltantes
        const merged = this.mergeWithDefaults(dbConfig);
        this.cache.set(cacheKey, {
          config: merged,
          timestamp: Date.now()
        });
        return merged;
      }
    } catch (error) {
      console.error('[ConfigLoader] Erro ao carregar config do banco:', error.message);
    }

    // Fallback para defaults
    return this.defaultConfig;
  }

  /**
   * Carrega configuracao do banco de dados
   */
  async loadFromDatabase(tenantId, agentId) {
    try {
      const db = getDatabase();

      // Primeiro busca o agente
      let agent;
      if (agentId) {
        agent = db.prepare(`
          SELECT a.*, t.name as tenant_name, t.slug as tenant_slug
          FROM agents a
          JOIN tenants t ON a.tenant_id = t.id
          WHERE a.id = ? AND a.tenant_id = ?
        `).get(agentId, tenantId);
      } else {
        // Busca agente padrao do tenant
        agent = db.prepare(`
          SELECT a.*, t.name as tenant_name, t.slug as tenant_slug
          FROM agents a
          JOIN tenants t ON a.tenant_id = t.id
          WHERE a.tenant_id = ? AND a.is_active = 1
          ORDER BY a.created_at ASC
          LIMIT 1
        `).get(tenantId);
      }

      if (!agent) {
        return null;
      }

      // Parse config JSON
      const config = JSON.parse(agent.config || '{}');

      // Monta objeto de configuracao
      return {
        empresa: config.empresa || {},
        agente: config.agente || {},
        servicos: config.servicos || [],
        escopo: config.escopo || [],
        icp: config.icp || {},
        precos: config.precos || {},
        catalogo: config.catalogo || {},
        mensagens: config.mensagens || {},
        integracoes: config.integracoes || {},
        qualificacao: config.qualificacao || {},
        // Metadados
        _meta: {
          tenant_id: tenantId,
          agent_id: agent.id,
          agent_name: agent.name,
          tenant_name: agent.tenant_name,
          loaded_at: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('[ConfigLoader] Erro DB:', error.message);
      return null;
    }
  }

  /**
   * Merge configuracao carregada com defaults
   */
  mergeWithDefaults(loadedConfig) {
    return this.deepMerge(this.defaultConfig, loadedConfig);
  }

  /**
   * Deep merge de objetos
   */
  deepMerge(target, source) {
    const result = { ...target };

    for (const key in source) {
      if (source[key] === null || source[key] === undefined) {
        continue;
      }

      if (typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (typeof target[key] === 'object' && !Array.isArray(target[key])) {
          result[key] = this.deepMerge(target[key], source[key]);
        } else {
          result[key] = source[key];
        }
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }

  /**
   * Limpa cache de um tenant
   */
  clearCache(tenantId = null) {
    if (tenantId) {
      for (const key of this.cache.keys()) {
        if (key.startsWith(tenantId)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  /**
   * Retorna configuracao default (Digital Boost)
   */
  getDefaults() {
    return this.defaultConfig;
  }

  // ============================================================
  // HELPERS PARA ACESSO RAPIDO A CONFIGURACOES ESPECIFICAS
  // ============================================================

  /**
   * Retorna contexto da empresa para conversation_manager
   */
  async getCompanyContext(tenantId = null, agentId = null) {
    const config = await this.loadConfig(tenantId, agentId);

    return {
      company: config.empresa.nome,
      services: config.servicos,
      scope: config.escopo,
      agent_name: config.agente.nome,
      agent_role: `Especialista ${config.empresa.segmento} da ${config.empresa.nome}`
    };
  }

  /**
   * Retorna numero do bot para webhook_handler
   */
  async getBotNumber(tenantId = null, agentId = null) {
    const config = await this.loadConfig(tenantId, agentId);
    return config.integracoes?.whatsapp?.bot_number || '558492194616';
  }

  /**
   * Retorna ICP para lead_scoring_system
   */
  async getIdealProfiles(tenantId = null, agentId = null) {
    const config = await this.loadConfig(tenantId, agentId);
    return config.icp?.segmentos_ideais || this.defaultConfig.icp.segmentos_ideais;
  }

  /**
   * Retorna precos para BANT
   */
  async getPricing(tenantId = null, agentId = null) {
    const config = await this.loadConfig(tenantId, agentId);
    return config.precos || this.defaultConfig.precos;
  }

  /**
   * Retorna mensagens padrao
   */
  async getMessages(tenantId = null, agentId = null) {
    const config = await this.loadConfig(tenantId, agentId);
    return config.mensagens || this.defaultConfig.mensagens;
  }

  /**
   * Retorna catalogo de servicos
   */
  async getCatalog(tenantId = null, agentId = null) {
    const config = await this.loadConfig(tenantId, agentId);
    return config.catalogo || this.defaultConfig.catalogo;
  }
}

// ============================================================
// SINGLETON & EXPORTS
// ============================================================

let configLoaderInstance = null;

export function getConfigLoader() {
  if (!configLoaderInstance) {
    configLoaderInstance = new AgentConfigLoader();
  }
  return configLoaderInstance;
}

// Export defaults para uso direto (retrocompatibilidade)
export const DEFAULT_COMPANY_CONTEXT = {
  company: DEFAULT_CONFIG.empresa.nome,
  services: DEFAULT_CONFIG.servicos,
  scope: DEFAULT_CONFIG.escopo,
  agent_name: DEFAULT_CONFIG.agente.nome,
  agent_role: `Especialista ${DEFAULT_CONFIG.empresa.segmento} da ${DEFAULT_CONFIG.empresa.nome}`
};

export const DEFAULT_BOT_NUMBER = DEFAULT_CONFIG.integracoes.whatsapp.bot_number;
export const DEFAULT_IDEAL_PROFILES = DEFAULT_CONFIG.icp.segmentos_ideais;
export const DEFAULT_PRICING = DEFAULT_CONFIG.precos;
export const DEFAULT_MESSAGES = DEFAULT_CONFIG.mensagens;

export { DEFAULT_CONFIG };
export default AgentConfigLoader;

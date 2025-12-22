/**
 * @file AgentConfigRoutes.js
 * @description Rotas REST para gerenciamento de configuracoes de agentes
 * STACK_DEPRECATED_OK: legacy route stack (read-only)
 *
 * Endpoints:
 * - GET    /api/agents/:agentId/config          - Obter configuracao ativa
 * - POST   /api/agents/:agentId/config          - Criar/atualizar configuracao
 * - GET    /api/agents/:agentId/config/versions - Listar versoes
 * - POST   /api/agents/:agentId/config/restore  - Restaurar versao
 * - GET    /api/config/sectors                  - Listar setores disponiveis
 * - POST   /api/config/generate                 - Gerar configuracao base
 * - GET    /api/config/schema                   - Obter schema de configuracao
 */

import express from 'express';
import { getAgentConfigService } from './AgentConfigService.js';
import { BusinessSectors, CTATypes, AgentConfigSchema, generateSectorDefaults } from './AgentConfigSchema.js';

/**
 * Cria router de configuracao de agentes
 * @returns {express.Router}
 */
export function createAgentConfigRoutes() {
  const router = express.Router();

  // ═══════════════════════════════════════════════════════════════════════════
  // CONFIGURACAO DO AGENTE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * GET /api/agents/:agentId/config
   * Obtem configuracao ativa de um agente
   */
  router.get('/agents/:agentId/config', async (req, res) => {
    try {
      const { agentId } = req.params;
      const service = getAgentConfigService();
      await service.initialize();

      const config = service.getActiveConfig(agentId);

      if (!config) {
        return res.status(404).json({
          success: false,
          error: 'Configuracao nao encontrada',
          message: 'Este agente ainda nao possui configuracao. Use POST para criar.'
        });
      }

      res.json({
        success: true,
        data: config
      });

    } catch (error) {
      console.error('[CONFIG-API] Erro ao obter config:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /api/agents/:agentId/config
   * Cria ou atualiza configuracao de um agente
   */
  router.post('/agents/:agentId/config', async (req, res) => {
    try {
      const { agentId } = req.params;
      const { config, tenantId } = req.body;
      const userId = req.user?.id || 'system';

      if (!config) {
        return res.status(400).json({
          success: false,
          error: 'Campo "config" e obrigatorio'
        });
      }

      const service = getAgentConfigService();
      await service.initialize();

      // Verificar se ja existe configuracao
      const existing = service.getActiveConfig(agentId);

      let result;
      if (existing) {
        // Atualizar (cria nova versao)
        result = await service.updateConfig(agentId, config, userId);
      } else {
        // Criar nova
        if (!tenantId) {
          return res.status(400).json({
            success: false,
            error: 'Campo "tenantId" e obrigatorio para criar nova configuracao'
          });
        }
        result = await service.createConfig(agentId, tenantId, config, userId);
      }

      res.json({
        success: true,
        data: result,
        message: existing ? 'Configuracao atualizada' : 'Configuracao criada'
      });

    } catch (error) {
      console.error('[CONFIG-API] Erro ao salvar config:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * PATCH /api/agents/:agentId/config
   * Atualiza parcialmente a configuracao (merge)
   */
  router.patch('/agents/:agentId/config', async (req, res) => {
    try {
      const { agentId } = req.params;
      const updates = req.body;
      const userId = req.user?.id || 'system';

      const service = getAgentConfigService();
      await service.initialize();

      const result = await service.updateConfig(agentId, updates, userId);

      res.json({
        success: true,
        data: result,
        message: 'Configuracao atualizada parcialmente'
      });

    } catch (error) {
      console.error('[CONFIG-API] Erro ao atualizar config:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/agents/:agentId/config/versions
   * Lista todas as versoes de configuracao de um agente
   */
  router.get('/agents/:agentId/config/versions', async (req, res) => {
    try {
      const { agentId } = req.params;
      const service = getAgentConfigService();
      await service.initialize();

      const versions = service.listConfigVersions(agentId);

      res.json({
        success: true,
        data: versions
      });

    } catch (error) {
      console.error('[CONFIG-API] Erro ao listar versoes:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /api/agents/:agentId/config/restore
   * Restaura uma versao anterior da configuracao
   */
  router.post('/agents/:agentId/config/restore', async (req, res) => {
    try {
      const { agentId } = req.params;
      const { version } = req.body;

      if (!version) {
        return res.status(400).json({
          success: false,
          error: 'Campo "version" e obrigatorio'
        });
      }

      const service = getAgentConfigService();
      await service.initialize();

      const result = await service.restoreVersion(agentId, version);

      res.json({
        success: true,
        data: result,
        message: `Versao ${version} restaurada com sucesso`
      });

    } catch (error) {
      console.error('[CONFIG-API] Erro ao restaurar versao:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS DE CONFIGURACAO
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * GET /api/config/sectors
   * Lista setores de negocio disponiveis com seus defaults
   */
  router.get('/config/sectors', (req, res) => {
    try {
      const sectors = Object.entries(BusinessSectors).map(([key, value]) => {
        const defaults = generateSectorDefaults(value);
        return {
          id: value,
          name: key.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
          bantFields: Object.keys(defaults.bantFields || {}),
          hasDefaults: !!defaults.bantFields
        };
      });

      res.json({
        success: true,
        data: sectors
      });

    } catch (error) {
      console.error('[CONFIG-API] Erro ao listar setores:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/config/cta-types
   * Lista tipos de CTA disponiveis
   */
  router.get('/config/cta-types', (req, res) => {
    try {
      const ctaTypes = Object.entries(CTATypes).map(([key, value]) => ({
        id: value,
        name: key.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
        description: getCtaDescription(value)
      }));

      res.json({
        success: true,
        data: ctaTypes
      });

    } catch (error) {
      console.error('[CONFIG-API] Erro ao listar CTAs:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /api/config/generate
   * Gera configuracao base a partir de parametros basicos
   */
  router.post('/config/generate', async (req, res) => {
    try {
      const {
        companyName,
        agentName,
        sector,
        description,
        offerings,
        valueProposition,
        ctaDescription,
        ctaType
      } = req.body;

      if (!companyName || !sector) {
        return res.status(400).json({
          success: false,
          error: 'Campos "companyName" e "sector" sao obrigatorios'
        });
      }

      const service = getAgentConfigService();
      await service.initialize();

      const config = service.generateConfigFromSector({
        companyName,
        agentName,
        sector,
        description,
        offerings,
        valueProposition,
        ctaDescription,
        ctaType
      });

      res.json({
        success: true,
        data: config,
        message: 'Configuracao gerada. Personalize conforme necessario.'
      });

    } catch (error) {
      console.error('[CONFIG-API] Erro ao gerar config:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/config/schema
   * Retorna o schema de configuracao para referencia
   */
  router.get('/config/schema', (req, res) => {
    try {
      // Retornar schema com descricoes
      const schemaWithDescriptions = {
        identity: {
          _description: 'Identidade do agente',
          agentName: { type: 'string', description: 'Nome do agente (ex: Leadly, Sofia)', required: true },
          companyName: { type: 'string', description: 'Nome da empresa', required: true },
          sector: { type: 'string', description: 'Setor do negocio', enum: Object.values(BusinessSectors), required: true },
          role: { type: 'string', description: 'Papel do agente', default: 'SDR' },
          personality: { type: 'string', description: 'Personalidade', default: 'consultivo' },
          language: { type: 'string', description: 'Idioma', default: 'pt-BR' }
        },
        business: {
          _description: 'Contexto do negocio',
          description: { type: 'string', description: 'O que a empresa faz', required: true },
          valueProposition: { type: 'string', description: 'Proposta de valor principal', required: true },
          offerings: { type: 'array', description: 'Lista de produtos/servicos', required: true },
          offeringSummary: { type: 'string', description: 'Resumo dos produtos em 1 frase' },
          targetAudience: { type: 'string', description: 'Publico-alvo ideal' },
          differentials: { type: 'array', description: 'Diferenciais competitivos' },
          socialProof: { type: 'string', description: 'Prova social (cases, numeros)' },
          honesty: {
            doNotPromise: { type: 'array', description: 'O que NAO prometer' },
            beHonestAbout: { type: 'array', description: 'O que ser honesto sobre' }
          }
        },
        cta: {
          _description: 'Call to Action',
          type: { type: 'string', description: 'Tipo do CTA', enum: Object.values(CTATypes) },
          description: { type: 'string', description: 'Descricao do CTA (ex: diagnostico gratuito)' },
          valueForLead: { type: 'string', description: 'O que o lead GANHA na call' },
          duration: { type: 'string', description: 'Duracao (ex: 30 min)' }
        },
        spinConfig: {
          _description: 'Configuracao SPIN Selling',
          phases: {
            _description: 'Configuracao por fase SPIN',
            situation: { objective: 'string', tone: 'string', dataToCollect: 'array' },
            problem: { objective: 'string', tone: 'string', technique: 'object' },
            implication: { objective: 'string', tone: 'string' },
            needPayoff: { objective: 'string', tone: 'string' },
            closing: { objective: 'string', closingTechniques: 'array' }
          }
        },
        bantConfig: {
          _description: 'Campos BANT a coletar',
          fields: { type: 'object', description: 'Campos com label, weight, fromPhase' },
          questions: { type: 'object', description: 'Perguntas sugeridas por campo' },
          qualificationThreshold: { type: 'number', description: 'Score minimo para qualificar', default: 60 }
        },
        objectionHandlers: {
          _description: 'Como tratar objecoes',
          price: { detection: 'array', reframe: 'string', followUp: 'string' },
          time: { detection: 'array', reframe: 'string', followUp: 'string' },
          think: { detection: 'array', reframe: 'string', followUp: 'string' },
          alreadyHave: { detection: 'array', reframe: 'string', followUp: 'string' },
          noNeed: { detection: 'array', reframe: 'string', followUp: 'string' }
        },
        styleRules: {
          _description: 'Regras de estilo de mensagem',
          forbiddenStarters: { type: 'array', description: 'Palavras proibidas no inicio' },
          maxLines: { type: 'number', description: 'Maximo de linhas', default: 4 },
          forbiddenCorporate: { type: 'array', description: 'Linguagem corporativa proibida' }
        },
        knowledgeBase: {
          _description: 'Base de conhecimento do agente',
          faqs: { type: 'object', description: 'FAQs por categoria' },
          commonQuestions: { type: 'object', description: 'Respostas para perguntas comuns' },
          canShare: { type: 'array', description: 'Informacoes que pode compartilhar' },
          requiresHuman: { type: 'array', description: 'Assuntos que requerem humano' }
        },
        aiConfig: {
          _description: 'Configuracao de IA',
          model: { type: 'string', default: 'gpt-4o-mini' },
          plannerTemperature: { type: 'number', default: 0.3 },
          writerTemperature: { type: 'number', default: 0.9 }
        }
      };

      res.json({
        success: true,
        data: schemaWithDescriptions
      });

    } catch (error) {
      console.error('[CONFIG-API] Erro ao obter schema:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/config/sector-defaults/:sector
   * Retorna defaults completos para um setor
   */
  router.get('/config/sector-defaults/:sector', (req, res) => {
    try {
      const { sector } = req.params;

      if (!Object.values(BusinessSectors).includes(sector)) {
        return res.status(400).json({
          success: false,
          error: `Setor invalido. Use um de: ${Object.values(BusinessSectors).join(', ')}`
        });
      }

      const defaults = generateSectorDefaults(sector);

      res.json({
        success: true,
        data: {
          sector,
          ...defaults
        }
      });

    } catch (error) {
      console.error('[CONFIG-API] Erro ao obter defaults:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  return router;
}

/**
 * Helper: Descricao dos tipos de CTA
 */
function getCtaDescription(ctaType) {
  const descriptions = {
    reuniao: 'Agendar uma reuniao ou call de descoberta',
    demonstracao: 'Demonstracao do produto/servico',
    orcamento: 'Enviar proposta comercial ou orcamento',
    visita: 'Agendar visita presencial',
    teste_gratis: 'Oferecer trial ou teste gratuito',
    whatsapp: 'Continuar conversa no WhatsApp',
    compra: 'Compra direta do produto'
  };
  return descriptions[ctaType] || '';
}

export default { createAgentConfigRoutes };

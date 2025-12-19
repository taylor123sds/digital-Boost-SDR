/**
 * @file AgentModel.js
 * @description Modelo de Agente para SaaS multi-agente
 *
 * Cada tenant pode ter múltiplos agentes com:
 * - Prompts personalizados
 * - Mensagens customizadas
 * - Configurações de comportamento
 * - Integrações específicas
 */

/**
 * Tipos de agente suportados
 */
export const AgentType = {
  SDR: 'sdr',                    // Sales Development Representative
  VENDEDOR: 'vendedor',          // Vendedor Varejo (vende produtos/servicos diretamente)
  SUPPORT: 'support',            // Atendimento ao cliente
  ONBOARDING: 'onboarding',      // Onboarding de clientes
  COLLECTION: 'collection',      // Cobranca
  NPS: 'nps',                    // Pesquisa de satisfacao
  CUSTOM: 'custom'               // Personalizado
};

/**
 * Status do agente
 */
export const AgentStatus = {
  DRAFT: 'draft',           // Em criação
  ACTIVE: 'active',         // Ativo e respondendo
  PAUSED: 'paused',         // Pausado temporariamente
  DISABLED: 'disabled',     // Desabilitado
  TESTING: 'testing'        // Em modo de teste
};

/**
 * Modelo de dados do Agente
 */
export class AgentModel {
  constructor(data = {}) {
    // Identificação
    this.id = data.id || this._generateId();
    this.tenant_id = data.tenant_id || null;
    this.name = data.name || 'Novo Agente';
    this.slug = data.slug || this._slugify(this.name);
    this.type = data.type || AgentType.SDR;
    this.status = data.status || AgentStatus.DRAFT;

    // Persona do Agente
    this.persona = {
      name: data.persona?.name || 'Assistente',
      role: data.persona?.role || 'Assistente Virtual',
      company: data.persona?.company || '',
      tone: data.persona?.tone || 'professional', // professional, friendly, casual, formal
      language: data.persona?.language || 'pt-BR',
      avatar_url: data.persona?.avatar_url || null,
      ...data.persona
    };

    // System Prompt Principal
    this.system_prompt = data.system_prompt || this._getDefaultSystemPrompt();

    // Prompts Específicos por Situação
    this.prompts = {
      greeting: data.prompts?.greeting || '',
      qualification: data.prompts?.qualification || '',
      objection_handling: data.prompts?.objection_handling || '',
      closing: data.prompts?.closing || '',
      follow_up: data.prompts?.follow_up || '',
      faq: data.prompts?.faq || '',
      escalation: data.prompts?.escalation || '',
      ...data.prompts
    };

    // Templates de Mensagens
    this.message_templates = {
      first_contact: data.message_templates?.first_contact || [],
      follow_up_d1: data.message_templates?.follow_up_d1 || [],
      follow_up_d3: data.message_templates?.follow_up_d3 || [],
      follow_up_d7: data.message_templates?.follow_up_d7 || [],
      meeting_confirmation: data.message_templates?.meeting_confirmation || [],
      meeting_reminder: data.message_templates?.meeting_reminder || [],
      thank_you: data.message_templates?.thank_you || [],
      ...data.message_templates
    };

    // Configurações de Comportamento
    this.behavior = {
      response_delay_min: data.behavior?.response_delay_min ?? 2000,
      response_delay_max: data.behavior?.response_delay_max ?? 5000,
      typing_simulation: data.behavior?.typing_simulation ?? true,
      max_messages_per_hour: data.behavior?.max_messages_per_hour ?? 20,
      working_hours: data.behavior?.working_hours ?? {
        enabled: false,
        start: '09:00',
        end: '18:00',
        timezone: 'America/Sao_Paulo',
        days: [1, 2, 3, 4, 5] // Segunda a Sexta
      },
      auto_escalate: data.behavior?.auto_escalate ?? true,
      escalate_after_messages: data.behavior?.escalate_after_messages ?? 10,
      ...data.behavior
    };

    // Configurações de IA
    this.ai_config = {
      model: data.ai_config?.model || 'gpt-4o-mini',
      temperature: data.ai_config?.temperature ?? 0.7,
      max_tokens: data.ai_config?.max_tokens ?? 500,
      presence_penalty: data.ai_config?.presence_penalty ?? 0,
      frequency_penalty: data.ai_config?.frequency_penalty ?? 0,
      ...data.ai_config
    };

    // Integrações
    this.integrations = {
      whatsapp: {
        enabled: data.integrations?.whatsapp?.enabled ?? true,
        instance_name: data.integrations?.whatsapp?.instance_name || null,
        phone_number: data.integrations?.whatsapp?.phone_number || null
      },
      calendar: {
        enabled: data.integrations?.calendar?.enabled ?? false,
        provider: data.integrations?.calendar?.provider || 'google', // google, outlook
        calendar_id: data.integrations?.calendar?.calendar_id || null
      },
      crm: {
        enabled: data.integrations?.crm?.enabled ?? false,
        provider: data.integrations?.crm?.provider || null, // hubspot, pipedrive, salesforce
        api_key: data.integrations?.crm?.api_key || null
      },
      webhook: {
        enabled: data.integrations?.webhook?.enabled ?? false,
        url: data.integrations?.webhook?.url || null,
        events: data.integrations?.webhook?.events || ['lead_created', 'meeting_scheduled']
      },
      ...data.integrations
    };

    // Knowledge Base
    this.knowledge_base = {
      enabled: data.knowledge_base?.enabled ?? true,
      documents: data.knowledge_base?.documents || [],
      faqs: data.knowledge_base?.faqs || [],
      urls: data.knowledge_base?.urls || []
    };

    // Métricas
    this.metrics = {
      total_conversations: data.metrics?.total_conversations ?? 0,
      total_messages_sent: data.metrics?.total_messages_sent ?? 0,
      total_messages_received: data.metrics?.total_messages_received ?? 0,
      meetings_scheduled: data.metrics?.meetings_scheduled ?? 0,
      leads_qualified: data.metrics?.leads_qualified ?? 0,
      avg_response_time: data.metrics?.avg_response_time ?? 0,
      satisfaction_score: data.metrics?.satisfaction_score ?? 0,
      ...data.metrics
    };

    // Timestamps
    this.created_at = data.created_at || new Date().toISOString();
    this.updated_at = data.updated_at || new Date().toISOString();
    this.last_active_at = data.last_active_at || null;
  }

  /**
   * Gera ID único
   * @private
   */
  _generateId() {
    return `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Gera slug a partir do nome
   * @private
   */
  _slugify(text) {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  /**
   * Retorna system prompt padrão baseado no tipo
   * @private
   */
  _getDefaultSystemPrompt() {
    const prompts = {
      [AgentType.SDR]: `Voce e um SDR (Sales Development Representative) profissional e consultivo.
Seu objetivo e qualificar leads e agendar reunioes com o time de vendas.

Diretrizes:
- Seja cordial e profissional
- Faca perguntas para entender as necessidades do prospect
- Identifique se o prospect e um bom fit para nossa solucao
- Agende reunioes quando o prospect estiver qualificado
- Nunca seja insistente ou agressivo`,

      [AgentType.VENDEDOR]: `Voce e um Vendedor Virtual especializado em atender e vender produtos/servicos.
Seu objetivo e ajudar o cliente a encontrar o melhor produto, tirar duvidas e fechar a venda.

Diretrizes:
- Seja prestativo e conhecedor do catalogo
- Entenda o que o cliente precisa antes de oferecer
- Apresente beneficios, nao apenas caracteristicas
- Ofereca promocoes e combos quando relevante
- Facilite o processo de compra (pagamento, entrega)
- Use tecnicas de cross-sell e up-sell com moderacao
- Seja honesto sobre prazos e disponibilidade
- Crie urgencia real (estoque limitado, promocao por tempo)`,

      [AgentType.SUPPORT]: `Você é um assistente de suporte ao cliente.
Seu objetivo é ajudar clientes com dúvidas e problemas.

Diretrizes:
- Seja empático e paciente
- Entenda o problema antes de sugerir soluções
- Forneça instruções claras e passo a passo
- Escale para um humano quando necessário
- Sempre confirme se o problema foi resolvido`,

      [AgentType.ONBOARDING]: `Você é um assistente de onboarding.
Seu objetivo é guiar novos clientes na configuração e uso da plataforma.

Diretrizes:
- Seja didático e paciente
- Explique passo a passo
- Ofereça recursos adicionais (vídeos, docs)
- Celebre cada etapa concluída
- Identifique quando o cliente precisa de ajuda humana`,

      [AgentType.COLLECTION]: `Você é um assistente de cobrança.
Seu objetivo é ajudar clientes a regularizar pendências financeiras.

Diretrizes:
- Seja respeitoso e profissional
- Ofereça opções de pagamento flexíveis
- Nunca seja ameaçador ou constrangedor
- Entenda a situação do cliente
- Facilite o processo de regularização`,

      [AgentType.NPS]: `Você é um assistente de pesquisa de satisfação.
Seu objetivo é coletar feedback dos clientes.

Diretrizes:
- Seja breve e objetivo
- Agradeça pelo tempo do cliente
- Colete feedback construtivo
- Registre sugestões e reclamações
- Encaminhe casos críticos para o time`,

      [AgentType.CUSTOM]: `Você é um assistente virtual.
Ajude o usuário da melhor forma possível.`
    };

    return prompts[this.type] || prompts[AgentType.CUSTOM];
  }

  /**
   * Verifica se o agente está ativo
   */
  isActive() {
    return this.status === AgentStatus.ACTIVE;
  }

  /**
   * Verifica se está em horário de funcionamento
   */
  isWithinWorkingHours() {
    if (!this.behavior.working_hours.enabled) {
      return true;
    }

    const now = new Date();
    const day = now.getDay();

    if (!this.behavior.working_hours.days.includes(day)) {
      return false;
    }

    const [startHour, startMin] = this.behavior.working_hours.start.split(':').map(Number);
    const [endHour, endMin] = this.behavior.working_hours.end.split(':').map(Number);

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  }

  /**
   * Obtém delay de resposta aleatório
   */
  getResponseDelay() {
    const min = this.behavior.response_delay_min;
    const max = this.behavior.response_delay_max;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Atualiza métricas
   */
  updateMetrics(updates) {
    Object.assign(this.metrics, updates);
    this.updated_at = new Date().toISOString();
  }

  /**
   * Converte para objeto de banco de dados
   */
  toDatabase() {
    return {
      id: this.id,
      tenant_id: this.tenant_id,
      name: this.name,
      slug: this.slug,
      type: this.type,
      status: this.status,
      persona: JSON.stringify(this.persona),
      system_prompt: this.system_prompt,
      prompts: JSON.stringify(this.prompts),
      message_templates: JSON.stringify(this.message_templates),
      behavior: JSON.stringify(this.behavior),
      ai_config: JSON.stringify(this.ai_config),
      integrations: JSON.stringify(this.integrations),
      knowledge_base: JSON.stringify(this.knowledge_base),
      metrics: JSON.stringify(this.metrics),
      created_at: this.created_at,
      updated_at: this.updated_at,
      last_active_at: this.last_active_at
    };
  }

  /**
   * Cria instância a partir de dados do banco
   */
  static fromDatabase(row) {
    if (!row) return null;

    return new AgentModel({
      ...row,
      persona: typeof row.persona === 'string' ? JSON.parse(row.persona) : row.persona,
      prompts: typeof row.prompts === 'string' ? JSON.parse(row.prompts) : row.prompts,
      message_templates: typeof row.message_templates === 'string' ? JSON.parse(row.message_templates) : row.message_templates,
      behavior: typeof row.behavior === 'string' ? JSON.parse(row.behavior) : row.behavior,
      ai_config: typeof row.ai_config === 'string' ? JSON.parse(row.ai_config) : row.ai_config,
      integrations: typeof row.integrations === 'string' ? JSON.parse(row.integrations) : row.integrations,
      knowledge_base: typeof row.knowledge_base === 'string' ? JSON.parse(row.knowledge_base) : row.knowledge_base,
      metrics: typeof row.metrics === 'string' ? JSON.parse(row.metrics) : row.metrics
    });
  }

  /**
   * Converte para JSON
   */
  toJSON() {
    return {
      id: this.id,
      tenant_id: this.tenant_id,
      name: this.name,
      slug: this.slug,
      type: this.type,
      status: this.status,
      persona: this.persona,
      system_prompt: this.system_prompt,
      prompts: this.prompts,
      message_templates: this.message_templates,
      behavior: this.behavior,
      ai_config: this.ai_config,
      integrations: this.integrations,
      knowledge_base: this.knowledge_base,
      metrics: this.metrics,
      created_at: this.created_at,
      updated_at: this.updated_at,
      last_active_at: this.last_active_at,
      is_active: this.isActive(),
      is_within_working_hours: this.isWithinWorkingHours()
    };
  }
}

export default AgentModel;

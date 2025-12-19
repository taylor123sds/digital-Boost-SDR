/**
 * TOOL REGISTRY
 * Registro central de ferramentas disponiveis para agentes
 *
 * Cada agente pode ter acesso a diferentes ferramentas baseado em:
 * - Plano do tenant
 * - Tipo de agente (SDR vs Support)
 * - Configuracao especifica
 */

export class ToolRegistry {
  constructor() {
    this.tools = new Map();
    this.toolsByCategory = new Map();
    this.tenantPermissions = new Map();
  }

  /**
   * Registra uma nova ferramenta
   */
  register(tool) {
    const { name, category, handler, schema, requiredPlan, description } = tool;

    if (!name || !handler) {
      throw new Error('Tool deve ter name e handler');
    }

    this.tools.set(name, {
      name,
      category: category || 'general',
      handler,
      schema: schema || {},
      requiredPlan: requiredPlan || 'starter',
      description: description || '',
      registeredAt: new Date().toISOString(),
    });

    // Indexa por categoria
    if (!this.toolsByCategory.has(category)) {
      this.toolsByCategory.set(category, []);
    }
    this.toolsByCategory.get(category).push(name);

    return this;
  }

  /**
   * Busca ferramenta por nome
   */
  get(name) {
    return this.tools.get(name);
  }

  /**
   * Executa ferramenta
   */
  async execute(name, params, context = {}) {
    const tool = this.tools.get(name);

    if (!tool) {
      throw new Error(`Ferramenta '${name}' nao encontrada`);
    }

    // Verifica permissao do tenant
    if (context.tenantId && !this.hasPermission(context.tenantId, name)) {
      throw new Error(`Tenant nao tem permissao para usar '${name}'`);
    }

    try {
      const startTime = Date.now();
      const result = await tool.handler(params, context);
      const executionTime = Date.now() - startTime;

      return {
        success: true,
        toolName: name,
        result,
        executionTime,
      };
    } catch (error) {
      return {
        success: false,
        toolName: name,
        error: error.message,
      };
    }
  }

  /**
   * Lista ferramentas disponiveis
   */
  list(category = null) {
    if (category) {
      const names = this.toolsByCategory.get(category) || [];
      return names.map(name => this.tools.get(name));
    }
    return Array.from(this.tools.values());
  }

  /**
   * Lista categorias
   */
  listCategories() {
    return Array.from(this.toolsByCategory.keys());
  }

  /**
   * Retorna schema OpenAI para ferramentas
   */
  getOpenAITools(toolNames = null) {
    const selectedTools = toolNames
      ? toolNames.map(name => this.tools.get(name)).filter(Boolean)
      : Array.from(this.tools.values());

    return selectedTools.map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.schema,
      },
    }));
  }

  /**
   * Verifica permissao do tenant
   */
  hasPermission(tenantId, toolName) {
    const permissions = this.tenantPermissions.get(tenantId);
    if (!permissions) return true; // Default: permitido

    const tool = this.tools.get(toolName);
    if (!tool) return false;

    // Verifica plano
    const planHierarchy = ['starter', 'growth', 'enterprise'];
    const requiredIdx = planHierarchy.indexOf(tool.requiredPlan);
    const tenantIdx = planHierarchy.indexOf(permissions.plan || 'starter');

    return tenantIdx >= requiredIdx;
  }

  /**
   * Define permissoes do tenant
   */
  setTenantPermissions(tenantId, permissions) {
    this.tenantPermissions.set(tenantId, permissions);
  }

  /**
   * Remove ferramenta
   */
  unregister(name) {
    const tool = this.tools.get(name);
    if (tool) {
      this.tools.delete(name);
      const categoryTools = this.toolsByCategory.get(tool.category);
      if (categoryTools) {
        const idx = categoryTools.indexOf(name);
        if (idx > -1) categoryTools.splice(idx, 1);
      }
    }
  }
}

// Singleton
let registryInstance = null;

export function getToolRegistry() {
  if (!registryInstance) {
    registryInstance = new ToolRegistry();
    registerDefaultTools(registryInstance);
  }
  return registryInstance;
}

/**
 * Registra ferramentas padrao
 */
function registerDefaultTools(registry) {
  // ========================================
  // CATEGORIA: CALENDAR
  // ========================================

  registry.register({
    name: 'check_availability',
    category: 'calendar',
    description: 'Verifica horarios disponiveis para agendamento',
    requiredPlan: 'starter',
    schema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Data no formato YYYY-MM-DD' },
        duration: { type: 'number', description: 'Duracao em minutos', default: 30 },
      },
      required: ['date'],
    },
    handler: async (params, context) => {
      // Mock - em producao conectaria com Google Calendar
      const slots = [
        '09:00', '09:30', '10:00', '10:30', '11:00',
        '14:00', '14:30', '15:00', '15:30', '16:00',
      ];
      return {
        date: params.date,
        availableSlots: slots,
        timezone: 'America/Sao_Paulo',
      };
    },
  });

  registry.register({
    name: 'book_appointment',
    category: 'calendar',
    description: 'Agenda uma reuniao',
    requiredPlan: 'starter',
    schema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Data YYYY-MM-DD' },
        time: { type: 'string', description: 'Horario HH:MM' },
        duration: { type: 'number', default: 30 },
        attendee_name: { type: 'string' },
        attendee_email: { type: 'string' },
        attendee_phone: { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string' },
      },
      required: ['date', 'time', 'attendee_name'],
    },
    handler: async (params, context) => {
      // Mock - em producao criaria no Google Calendar
      const meetingId = `meet_${Date.now()}`;
      return {
        success: true,
        meetingId,
        datetime: `${params.date}T${params.time}`,
        meetingLink: `https://meet.google.com/${meetingId}`,
        confirmationSent: true,
      };
    },
  });

  registry.register({
    name: 'cancel_appointment',
    category: 'calendar',
    description: 'Cancela uma reuniao',
    requiredPlan: 'starter',
    schema: {
      type: 'object',
      properties: {
        meeting_id: { type: 'string' },
        reason: { type: 'string' },
      },
      required: ['meeting_id'],
    },
    handler: async (params, context) => {
      return {
        success: true,
        meetingId: params.meeting_id,
        cancelled: true,
      };
    },
  });

  // ========================================
  // CATEGORIA: CRM
  // ========================================

  registry.register({
    name: 'create_lead',
    category: 'crm',
    description: 'Cria novo lead no CRM',
    requiredPlan: 'starter',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        email: { type: 'string' },
        phone: { type: 'string' },
        company: { type: 'string' },
        source: { type: 'string', default: 'whatsapp' },
        score: { type: 'number', default: 0 },
        tags: { type: 'array', items: { type: 'string' } },
      },
      required: ['name', 'phone'],
    },
    handler: async (params, context) => {
      const leadId = `lead_${Date.now()}`;
      return {
        success: true,
        leadId,
        createdAt: new Date().toISOString(),
        ...params,
      };
    },
  });

  registry.register({
    name: 'update_lead_score',
    category: 'crm',
    description: 'Atualiza score do lead',
    requiredPlan: 'starter',
    schema: {
      type: 'object',
      properties: {
        lead_id: { type: 'string' },
        score: { type: 'number' },
        reason: { type: 'string' },
      },
      required: ['lead_id', 'score'],
    },
    handler: async (params, context) => {
      return {
        success: true,
        leadId: params.lead_id,
        newScore: params.score,
        updatedAt: new Date().toISOString(),
      };
    },
  });

  registry.register({
    name: 'assign_lead',
    category: 'crm',
    description: 'Atribui lead a um vendedor',
    requiredPlan: 'growth',
    schema: {
      type: 'object',
      properties: {
        lead_id: { type: 'string' },
        user_id: { type: 'string' },
        notify: { type: 'boolean', default: true },
      },
      required: ['lead_id', 'user_id'],
    },
    handler: async (params, context) => {
      return {
        success: true,
        leadId: params.lead_id,
        assignedTo: params.user_id,
        notificationSent: params.notify,
      };
    },
  });

  // ========================================
  // CATEGORIA: CATALOG
  // ========================================

  registry.register({
    name: 'search_products',
    category: 'catalog',
    description: 'Busca produtos no catalogo',
    requiredPlan: 'starter',
    schema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        category: { type: 'string' },
        min_price: { type: 'number' },
        max_price: { type: 'number' },
        limit: { type: 'number', default: 5 },
      },
    },
    handler: async (params, context) => {
      // Mock - em producao buscaria no banco
      return {
        products: [
          { id: 'prod_1', name: 'Produto A', price: 99.90 },
          { id: 'prod_2', name: 'Produto B', price: 149.90 },
        ],
        total: 2,
        query: params.query,
      };
    },
  });

  registry.register({
    name: 'check_stock',
    category: 'catalog',
    description: 'Verifica estoque de produto',
    requiredPlan: 'starter',
    schema: {
      type: 'object',
      properties: {
        product_id: { type: 'string' },
      },
      required: ['product_id'],
    },
    handler: async (params, context) => {
      return {
        productId: params.product_id,
        inStock: true,
        quantity: 15,
        estimatedDelivery: '3-5 dias uteis',
      };
    },
  });

  // ========================================
  // CATEGORIA: COMMUNICATION
  // ========================================

  registry.register({
    name: 'send_email',
    category: 'communication',
    description: 'Envia email para o lead',
    requiredPlan: 'growth',
    schema: {
      type: 'object',
      properties: {
        to: { type: 'string' },
        subject: { type: 'string' },
        body: { type: 'string' },
        template: { type: 'string' },
      },
      required: ['to', 'subject'],
    },
    handler: async (params, context) => {
      return {
        success: true,
        messageId: `email_${Date.now()}`,
        sentAt: new Date().toISOString(),
      };
    },
  });

  registry.register({
    name: 'send_sms',
    category: 'communication',
    description: 'Envia SMS para o lead',
    requiredPlan: 'growth',
    schema: {
      type: 'object',
      properties: {
        to: { type: 'string' },
        message: { type: 'string' },
      },
      required: ['to', 'message'],
    },
    handler: async (params, context) => {
      return {
        success: true,
        messageId: `sms_${Date.now()}`,
        sentAt: new Date().toISOString(),
      };
    },
  });

  // ========================================
  // CATEGORIA: KNOWLEDGE
  // ========================================

  registry.register({
    name: 'search_faq',
    category: 'knowledge',
    description: 'Busca na base de conhecimento/FAQ',
    requiredPlan: 'starter',
    schema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        category: { type: 'string' },
        limit: { type: 'number', default: 3 },
      },
      required: ['query'],
    },
    handler: async (params, context) => {
      // Mock - em producao usaria embeddings/RAG
      return {
        results: [
          {
            question: 'Como funciona o servico?',
            answer: 'Nosso servico funciona...',
            relevance: 0.95,
          },
        ],
        query: params.query,
      };
    },
  });

  // ========================================
  // CATEGORIA: HANDOFF
  // ========================================

  registry.register({
    name: 'escalate_to_human',
    category: 'handoff',
    description: 'Escala conversa para atendente humano',
    requiredPlan: 'starter',
    schema: {
      type: 'object',
      properties: {
        conversation_id: { type: 'string' },
        reason: { type: 'string' },
        priority: { type: 'string', enum: ['low', 'normal', 'high', 'urgent'] },
        context_summary: { type: 'string' },
      },
      required: ['conversation_id', 'reason'],
    },
    handler: async (params, context) => {
      return {
        success: true,
        handoffId: `handoff_${Date.now()}`,
        status: 'pending',
        estimatedWait: '5 minutos',
      };
    },
  });

  // ========================================
  // CATEGORIA: ANALYTICS
  // ========================================

  registry.register({
    name: 'log_event',
    category: 'analytics',
    description: 'Registra evento para analytics',
    requiredPlan: 'starter',
    schema: {
      type: 'object',
      properties: {
        event_name: { type: 'string' },
        properties: { type: 'object' },
      },
      required: ['event_name'],
    },
    handler: async (params, context) => {
      return {
        success: true,
        eventId: `evt_${Date.now()}`,
        logged: true,
      };
    },
  });
}

export default ToolRegistry;

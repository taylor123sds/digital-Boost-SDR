const API_BASE = import.meta.env.VITE_API_URL || '/api';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: unknown;
  headers?: Record<string, string>;
  skipAuthRedirect?: boolean;
  retry?: boolean;
}

export interface ApiError extends Error {
  status?: number;
  data?: unknown;
}

class ApiClient {
  private baseUrl: string;
  private refreshPromise: Promise<string | null> | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getToken(): string | null {
    return localStorage.getItem('token');
  }

  private setToken(token: string) {
    localStorage.setItem('token', token);
  }

  private async refreshAccessToken(): Promise<string | null> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      return null;
    }

    this.refreshPromise = (async () => {
      try {
        const response = await fetch(`${this.baseUrl}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken })
        });

        if (!response.ok) {
          return null;
        }

        const result = await response.json();
        const newAccessToken = result?.data?.accessToken;
        const newRefreshToken = result?.data?.refreshToken;

        if (newAccessToken) {
          this.setToken(newAccessToken);
        }

        if (newRefreshToken) {
          localStorage.setItem('refreshToken', newRefreshToken);
        }

        return newAccessToken || null;
      } catch {
        return null;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, headers = {}, skipAuthRedirect = false, retry = false } = options;
    const token = this.getToken();
    const isAuthEndpoint = endpoint.startsWith('/auth/');

    const config: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...headers,
      },
    };

    if (body) {
      config.body = JSON.stringify(body);
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, config);

    if (!response.ok) {
      if (response.status === 401 && !skipAuthRedirect && !retry && !isAuthEndpoint) {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          return this.request<T>(endpoint, { ...options, retry: true });
        }

        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        window.location.href = '/app/login';
      }
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      const apiError = new Error(error.message || `HTTP ${response.status}`) as ApiError;
      apiError.status = response.status;
      apiError.data = error;
      throw apiError;
    }

    return response.json();
  }

  // Auth
  async login(email: string, password: string) {
    const result = await this.request<{
      success: boolean;
      data: {
        accessToken: string;
        refreshToken: string;
        user: User;
      };
    }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    // Store refresh token for token rotation
    if (result.data.refreshToken) {
      localStorage.setItem('refreshToken', result.data.refreshToken);
    }
    if (result.data.accessToken) {
      this.setToken(result.data.accessToken);
    }
    return { token: result.data.accessToken, user: result.data.user };
  }

  async register(data: { name: string; email: string; password: string; company?: string }) {
    const result = await this.request<{
      success: boolean;
      data: {
        accessToken: string;
        refreshToken: string;
        user: User;
        entitlements?: {
          billingStatus: string;
          trialEndsAt: string;
          daysRemaining: number;
          isRuntimeAllowed: boolean;
        };
      };
    }>('/auth/register', {
      method: 'POST',
      body: { ...data, sector: 'outro' },
    });
    // Store refresh token for token rotation
    if (result.data.refreshToken) {
      localStorage.setItem('refreshToken', result.data.refreshToken);
    }
    if (result.data.accessToken) {
      this.setToken(result.data.accessToken);
    }
    return {
      token: result.data.accessToken,
      user: result.data.user,
      entitlements: result.data.entitlements
    };
  }

  // Dashboard - real stats from funil and command-center
  async getDashboardStats() {
    try {
      const [funilStats, overview] = await Promise.all([
        this.request<{ success: boolean; stats: any }>('/funil/stats').catch(() => ({ success: false, stats: {} })),
        this.request<{ success: boolean; metrics: any }>('/command-center/overview').catch(() => ({ success: false, metrics: {} }))
      ]);

      const stats = funilStats.stats || {};
      const metrics = overview.metrics || {};

      return {
        totalLeads: stats.total || 0,
        activeAgents: 1,
        messagesTotal: metrics.messages_today || 0,
        conversionRate: stats.conversionRate || 0,
        leadsByStage: Object.entries(stats.byStage || {}).map(([stage, count]) => ({
          stage,
          count: count as number
        })),
        recentActivity: []
      };
    } catch {
      return {
        totalLeads: 0,
        activeAgents: 0,
        messagesTotal: 0,
        conversionRate: 0,
        leadsByStage: [],
        recentActivity: []
      };
    }
  }

  // Agents - uses real /api/agents endpoints (VPS schema)
  async getAgents() {
    try {
      const result = await this.request<{ success: boolean; data: any[] }>('/agents', { skipAuthRedirect: true });
      const agents = result.data || [];
      return agents.map((a: any) => this._mapAgent(a)) as Agent[];
    } catch {
      return [];
    }
  }

  async getAgent(id: string) {
    const result = await this.request<{ success: boolean; data: any }>(`/agents/${id}`);
    return this._mapAgent(result.data) as Agent;
  }

  private _mapAgent(a: any): Agent {
    if (!a) return {} as Agent;
    return {
      id: a.id,
      name: a.name,
      slug: a.slug,
      type: a.type || 'sdr',
      status: a.status || 'draft',
      channel: a.channel || 'whatsapp',
      persona: a.persona || {},
      systemPrompt: a.system_prompt,
      prompts: a.prompts || {},
      messageTemplates: a.message_templates || {},
      behavior: a.behavior || {},
      aiConfig: a.ai_config || {},
      integrations: a.integrations || {},
      knowledgeBase: a.knowledge_base || {},
      metrics: a.metrics || {},
      createdAt: a.created_at,
      updatedAt: a.updated_at,
      lastActiveAt: a.last_active_at
    };
  }

  async createAgent(data: Partial<Agent>) {
    const result = await this.request<{ success: boolean; data: any }>('/agents', { method: 'POST', body: data });
    return result.data as Agent;
  }

  async updateAgent(id: string, data: Partial<Agent>) {
    const result = await this.request<{ success: boolean; data: any }>(`/agents/${id}`, { method: 'PUT', body: data });
    return result.data as Agent;
  }

  async deleteAgent(id: string) {
    await this.request<{ success: boolean }>(`/agents/${id}`, { method: 'DELETE' });
  }

  // CRM / Leads - uses real /api/crm/leads endpoints with agent isolation
  async getLeads(params?: { stage?: string; search?: string; page?: number; agentId?: string | null }) {
    try {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.set('page', String(params.page));
      if (params?.search) queryParams.set('search', params.search);
      if (params?.stage) queryParams.set('status', params.stage);

      const headers: Record<string, string> = {};
      if (params?.agentId) {
        headers['X-Agent-Id'] = params.agentId;
      }

      const queryString = queryParams.toString();
      const endpoint = `/crm/leads${queryString ? `?${queryString}` : ''}`;

      const result = await this.request<{ success: boolean; data: any[]; pagination?: any }>(endpoint, { headers });
      const leads = result.data || [];

      return {
        leads: leads.map((l: any) => ({
          id: l.id,
          name: l.nome || l.name || 'Sem nome',
          phone: l.telefone || l.phone || l.whatsapp || '',
          email: l.email || '',
          company: l.empresa || l.company || '',
          stage: l.status || l.stage_id || 'novo',
          score: l.score || l.bant_score || 0,
          assignedAgent: l.agent_id,
          lastContact: l.ultimo_contato || l.updated_at,
          createdAt: l.created_at
        })) as Lead[],
        total: result.pagination?.total || leads.length
      };
    } catch {
      return { leads: [], total: 0 };
    }
  }

  async getLead(id: string) {
    const result = await this.request<{ success: boolean; lead: any }>(`/funil/bant/${id}`);
    const l = result.lead || {};
    return {
      id: l.contactId || id,
      name: l.nome || 'Sem nome',
      phone: l.contactId || id,
      company: l.empresa || '',
      stage: l.bantStages?.currentStage || 'need',
      score: l.score || 0,
      createdAt: l.lastUpdate
    } as Lead;
  }

  async updateLead(id: string, data: Partial<Lead>) {
    await this.request<{ success: boolean }>('/leads/update-stage', {
      method: 'POST',
      body: { leadId: id, stage: data.stage }
    });
    return { id, ...data } as Lead;
  }

  async createLead(data: { name: string; phone: string; email?: string; company?: string; stage?: string; score?: number; agentId?: string | null }) {
    const headers: Record<string, string> = {};
    if (data.agentId) {
      headers['X-Agent-Id'] = data.agentId;
    }

    const result = await this.request<{ success: boolean; data: any }>('/crm/leads', {
      method: 'POST',
      headers,
      body: {
        nome: data.name,
        telefone: data.phone,
        email: data.email || null,
        empresa: data.company || null,
        status: 'novo'
      }
    });
    const l = result.data || {};
    return {
      id: l.id,
      name: l.nome || data.name,
      phone: l.telefone || data.phone,
      email: l.email || data.email || '',
      company: l.empresa || data.company || '',
      stage: l.status || 'novo',
      score: 0,
      assignedAgent: l.agent_id || data.agentId,
      createdAt: l.created_at || new Date().toISOString()
    } as Lead;
  }

  async deleteLead(id: string) {
    await this.request<{ success: boolean }>(`/crm/leads/${id}`, { method: 'DELETE' });
  }

  // Campaigns
  async getCampaigns() {
    return this.request<Campaign[]>('/campaigns');
  }

  async getCampaign(id: string) {
    return this.request<Campaign>(`/campaigns/${id}`);
  }

  async createCampaign(data: Partial<Campaign>) {
    return this.request<Campaign>('/campaigns', { method: 'POST', body: data });
  }

  // Analytics - overview metrics
  async getAnalytics(_period: '7d' | '30d' | '90d') {
    try {
      const overview = await this.request<{ success: boolean; overview: any }>('/analytics/overview');
      const data = overview.overview || {};

      return {
        metrics: {
          totalConversations: data.totalConversations || 0,
          avgResponseTime: data.averageMessagesPerConversation || 0,
          conversionRate: data.successRate || 0,
          satisfactionScore: 0
        },
        chartData: {
          labels: [],
          conversations: [],
          conversions: []
        }
      };
    } catch {
      return {
        metrics: { totalConversations: 0, avgResponseTime: 0, conversionRate: 0, satisfactionScore: 0 },
        chartData: { labels: [], conversations: [], conversions: [] }
      };
    }
  }

  // Conversations
  async getConversations(limit = 50, offset = 0, status?: string): Promise<{ data: ConversationSummary[]; total: number }> {
    try {
      const statusParam = status ? `&status=${encodeURIComponent(status)}` : '';
      const result = await this.request<{ success: boolean; data: ConversationSummary[]; meta?: { total?: number } }>(
        `/conversations?limit=${limit}&offset=${offset}${statusParam}`
      );
      return {
        data: result.data || [],
        total: result.meta?.total ?? (result.data ? result.data.length : 0)
      };
    } catch {
      return { data: [], total: 0 };
    }
  }

  async getConversationMessages(phone: string, limit = 50, offset = 0): Promise<Message[]> {
    try {
      const result = await this.request<{ success: boolean; data: Message[] }>(
        `/conversations/${encodeURIComponent(phone)}/messages?limit=${limit}&offset=${offset}`
      );
      return result.data || [];
    } catch {
      return [];
    }
  }

  async getAuditLogs(params: {
    limit?: number;
    offset?: number;
    status?: string;
    category?: string;
    q?: string;
    from?: string;
    to?: string;
  } = {}): Promise<{ data: AuditEntry[]; total: number }> {
    try {
      const {
        limit = 50,
        offset = 0,
        status,
        category,
        q,
        from,
        to
      } = params;

      const searchParams = new URLSearchParams();
      searchParams.set('limit', String(limit));
      searchParams.set('offset', String(offset));
      if (status) searchParams.set('status', status);
      if (category) searchParams.set('category', category);
      if (q) searchParams.set('q', q);
      if (from) searchParams.set('from', from);
      if (to) searchParams.set('to', to);

      const result = await this.request<{ success: boolean; data: AuditEntry[]; meta?: { total?: number } }>(
        `/audit-logs?${searchParams.toString()}`
      );

      return {
        data: result.data || [],
        total: result.meta?.total ?? (result.data ? result.data.length : 0)
      };
    } catch {
      return { data: [], total: 0 };
    }
  }

  async sendMessage(phone: string, content: string) {
    try {
      await this.request<{ success: boolean }>('/whatsapp/send', {
        method: 'POST',
        body: { to: phone, message: content },
      });
      return { success: true };
    } catch {
      return { success: false };
    }
  }

  // Funnel / Pipeline
  async getFunnel() {
    return this.request<{ data: any[] }>('/funil');
  }

  async getPipelineStages() {
    try {
      const result = await this.request<{ success: boolean; data: PipelineStage[] }>('/pipeline/stages');
      return result.data || [];
    } catch {
      return [];
    }
  }

  // Cadences
  async getCadences() {
    return this.request<{ data: any[] }>('/cadences');
  }

  async getCadenceStats() {
    return this.request<{ active: number; pending: number; completed: number }>('/cadences/stats');
  }

  async getIntegrationsCatalog(): Promise<{ categories: IntegrationCategory[]; integrations: IntegrationCatalogItem[] }> {
    try {
      const result = await this.request<{ success: boolean; data: { categories: IntegrationCategory[]; integrations: IntegrationCatalogItem[] } }>(
        '/integrations/catalog'
      );
      return result.data || { categories: [], integrations: [] };
    } catch {
      return { categories: [], integrations: [] };
    }
  }

  async getBillingPlans(): Promise<BillingPlan[]> {
    try {
      const result = await this.request<{ success: boolean; data: BillingPlan[] }>('/billing/plans');
      return result.data || [];
    } catch {
      return [];
    }
  }

  async getChannelBreakdown(): Promise<ChannelBreakdownItem[]> {
    try {
      const result = await this.request<{ success: boolean; data: ChannelBreakdownItem[] }>('/analytics/channel-breakdown');
      return result.data || [];
    } catch {
      return [];
    }
  }

  async getTopAgents(): Promise<TopAgentItem[]> {
    try {
      const result = await this.request<{ success: boolean; data: TopAgentItem[] }>('/analytics/top-agents');
      return result.data || [];
    } catch {
      return [];
    }
  }

  // Settings
  async getSettings(): Promise<UserSettings | null> {
    try {
      const result = await this.request<{ success: boolean; data: UserSettings }>('/settings');
      return result.data;
    } catch {
      return null;
    }
  }

  async updateSettings(payload: Partial<UserSettings>): Promise<UserSettings | null> {
    try {
      const result = await this.request<{ success: boolean; data: UserSettings }>(
        '/settings',
        { method: 'PUT', body: payload }
      );
      return result.data;
    } catch {
      return null;
    }
  }

  async changePassword(currentPassword: string, newPassword: string) {
    return this.request<{ success: boolean; error?: string }>(
      '/auth/password',
      { method: 'PUT', body: { currentPassword, newPassword } }
    );
  }

  async getAgentPresets(): Promise<AgentPresets> {
    try {
      const result = await this.request<{ success: boolean; data: AgentPresets }>('/config/agent-presets');
      return result.data;
    } catch {
      return {
        agentTypes: [],
        sectors: [],
        ctaTypes: [],
        qualificationFrameworks: [],
        bantFieldsConfig: [],
        weekDays: [],
        steps: [],
        toneLabels: []
      };
    }
  }

  // Prospecting
  async getProspectingStats() {
    return this.request<{ pending: number; sentToday: number; replies: number; isRunning: boolean }>('/prospecting/stats');
  }

  async getProspects() {
    return this.request<{ data: any[] }>('/prospecting/leads');
  }

  async startProspecting() {
    return this.request<{ success: boolean }>('/prospecting/start', { method: 'POST' });
  }

  async stopProspecting() {
    return this.request<{ success: boolean }>('/prospecting/stop', { method: 'POST' });
  }

  // Integrations
  async getIntegrations() {
    const result = await this.request<{ success: boolean; data?: any[]; integrations?: any[] }>('/integrations');
    return result.data || result.integrations || [];
  }

  async getAgentIntegrations(agentId: string): Promise<AgentIntegrationBinding[]> {
    try {
      const result = await this.request<{ success: boolean; data: AgentIntegrationBinding[] }>(
        `/agents/${agentId}/integrations`
      );
      return result.data || [];
    } catch {
      return [];
    }
  }

  async getEvolutionStatus(agentId: string) {
    const result = await this.request<{ success: boolean; data: any }>(
      `/agents/${agentId}/channels/evolution/status`
    );
    return result.data;
  }

  async connectEvolution(agentId: string, payload?: { instanceName?: string }) {
    const result = await this.request<{ success: boolean; data: any }>(
      `/agents/${agentId}/channels/evolution/connect`,
      { method: 'POST', body: payload }
    );
    return result.data;
  }

  async disconnectEvolution(agentId: string) {
    return this.request<{ success: boolean }>(
      `/agents/${agentId}/channels/evolution/disconnect`,
      { method: 'POST' }
    );
  }

  async testIntegration(integrationId: string) {
    return this.request<{ success: boolean; data?: any; error?: string }>(`/integrations/${integrationId}/test`);
  }

  async disconnectIntegration(integrationId: string) {
    return this.request<{ success: boolean }>(
      `/integrations/${integrationId}/disconnect`,
      { method: 'POST' }
    );
  }

  async startCrmOauth(provider: string) {
    return this.request<{ success: boolean; data?: { authUrl?: string } }>(
      `/integrations/crm/${provider}/oauth/start`
    );
  }

  // Documents
  async getDocuments(params?: { agentId?: string | null; limit?: number; status?: string }) {
    try {
      const queryParams = new URLSearchParams();
      if (params?.limit) queryParams.set('limit', String(params.limit));
      if (params?.status) queryParams.set('status', params.status);

      const headers: Record<string, string> = {};
      if (params?.agentId) {
        headers['X-Agent-Id'] = params.agentId;
      }

      const queryString = queryParams.toString();
      const endpoint = `/documents${queryString ? `?${queryString}` : ''}`;

      const result = await this.request<{ success: boolean; documents: DocumentItem[] }>(endpoint, { headers });
      return result.documents || [];
    } catch {
      return [];
    }
  }

  async getDocumentPackages(params?: { agentId?: string | null; limit?: number; type?: string }) {
    try {
      const queryParams = new URLSearchParams();
      if (params?.limit) queryParams.set('limit', String(params.limit));
      if (params?.type) queryParams.set('type', params.type);

      const headers: Record<string, string> = {};
      if (params?.agentId) {
        headers['X-Agent-Id'] = params.agentId;
      }

      const queryString = queryParams.toString();
      const endpoint = `/packages${queryString ? `?${queryString}` : ''}`;

      const result = await this.request<{ success: boolean; packages: DocumentPackageItem[] }>(endpoint, { headers });
      return result.packages || [];
    } catch {
      return [];
    }
  }

  async uploadDocument(formData: FormData, agentId?: string | null) {
    try {
      const token = this.getToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (agentId) headers['X-Agent-Id'] = agentId;

      const response = await fetch(`${this.baseUrl}/documents/upload`, {
        method: 'POST',
        headers,
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  }

  async deleteDocument(docId: string) {
    return this.request<{ success: boolean }>(`/documents/${docId}`, { method: 'DELETE' });
  }
}

// Types
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  tenantId: string;
}

export interface DashboardStats {
  totalLeads: number;
  activeAgents: number;
  messagesTotal: number;
  conversionRate: number;
  leadsByStage: { stage: string; count: number }[];
  recentActivity: Activity[];
}

export interface Agent {
  id: string;
  name: string;
  slug?: string;
  type: 'sdr' | 'support' | 'custom' | 'scheduler';
  status: 'active' | 'paused' | 'offline' | 'draft' | 'deleted';
  channel: 'whatsapp' | 'email' | 'chat' | 'voice';
  persona?: Record<string, unknown>;
  systemPrompt?: string;
  prompts?: Record<string, unknown>;
  messageTemplates?: Record<string, unknown>;
  behavior?: Record<string, unknown>;
  aiConfig?: Record<string, unknown>;
  integrations?: Record<string, unknown>;
  knowledgeBase?: Record<string, unknown>;
  metrics?: Record<string, unknown>;
  createdAt: string;
  updatedAt?: string;
  lastActiveAt?: string;
  // Stats fields
  messagesProcessed?: number;
  avgResponseTime?: number;
  conversionRate?: number;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  company?: string;
  stage: string;
  score: number;
  assignedAgent?: string;
  lastContact?: string;
  createdAt: string;
}

export interface Campaign {
  id: string;
  name: string;
  status: 'draft' | 'active' | 'paused' | 'completed';
  type: 'prospecting' | 'nurture' | 'reactivation';
  totalLeads: number;
  sentCount: number;
  responseRate: number;
  createdAt: string;
}

export interface Activity {
  id: string;
  type: 'message' | 'lead' | 'campaign' | 'agent';
  description: string;
  timestamp: string;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  action: string;
  category: 'auth' | 'agent' | 'lead' | 'message' | 'config' | 'billing' | 'system';
  actor: {
    type: 'user' | 'agent' | 'system';
    id: string;
    name: string;
  };
  target?: {
    type: string;
    id: string;
    name?: string;
  } | null;
  details?: Record<string, unknown>;
  ip?: string | null;
  status: 'success' | 'failure' | 'warning';
}

export interface PipelineStage {
  id: string;
  name: string;
  slug?: string;
  color?: string;
  position?: number;
  probability?: number;
}

export interface IntegrationCategory {
  id: string;
  name: string;
  icon?: string;
}

export interface IntegrationCatalogItem {
  id: string;
  name: string;
  type: string;
  provider: string;
  status: string;
  icon: string;
  description: string;
}

export interface AgentIntegrationBinding {
  id: string;
  tenant_id?: string;
  agent_id?: string;
  integration_id?: string;
  is_primary?: number;
  provider?: string;
  instance_name?: string | null;
  phone_number?: string | null;
  integration_status?: string;
  config_json?: string | null;
  last_sync?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface UserSettings {
  profile: {
    id: string;
    name: string;
    email: string;
    role: string;
    company: string;
    sector: string;
    avatarUrl?: string;
  };
  preferences: {
    phone?: string;
    title?: string;
    website?: string;
    cnpj?: string;
    notifications?: {
      leads?: boolean;
      messages?: boolean;
      campaigns?: boolean;
      reports?: boolean;
    };
    appearance?: {
      theme?: 'dark' | 'light' | 'system';
    };
    apiKeys?: Array<{ id: string; label: string; key: string; createdAt?: string }>;
  };
}

export interface BillingPlan {
  id: string;
  name: string;
  price: number;
  billingPeriod: 'monthly' | 'yearly';
  features: string[];
  limits: {
    agents: number;
    messages: number;
    leads: number;
  };
  recommended?: boolean;
}

export interface ChannelBreakdownItem {
  channel: string;
  count: number;
  percentage: string;
}

export interface TopAgentItem {
  id: string;
  name: string;
  conversations: number;
  conversionRate: number;
}

export interface AgentPresets {
  agentTypes: Array<{ id: string; name: string; description: string; icon: string; color: string }>;
  sectors: Array<{ id: string; name: string; icon: string }>;
  ctaTypes: Array<{ id: string; name: string; description: string }>;
  qualificationFrameworks: Array<{ id: string; name: string; description: string }>;
  bantFieldsConfig: Array<{ key: string; label: string; description: string }>;
  weekDays: string[];
  steps: Array<{ id: number; title: string; subtitle: string; icon: string }>;
  toneLabels: string[];
  // Document Handler specific
  documentTypes?: Array<{ id: string; name: string; icon: string; requiredFields: string[]; autoApprove: boolean }>;
  routingDestinations?: Array<{ id: string; name: string; description: string }>;
}

export interface AnalyticsData {
  metrics: {
    totalConversations: number;
    avgResponseTime: number;
    conversionRate: number;
    satisfactionScore: number;
  };
  chartData: {
    labels: string[];
    conversations: number[];
    conversions: number[];
  };
}

export interface Message {
  id: string;
  content: string;
  from: 'agent' | 'user';
  timestamp: string;
}

export interface ConversationSummary {
  id: string;
  phone: string;
  name: string;
  company?: string | null;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  status: 'active' | 'waiting' | 'closed' | 'handoff';
  agentId?: string | null;
  agentName?: string | null;
  stage?: string | null;
  totalMessages?: number;
}

export interface DocumentItem {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  origin: string;
  agent_id?: string;
  created_at: string;
  metadata?: Record<string, unknown>;
}

export interface DocumentPackageItem {
  id: string;
  name: string;
  process_number?: string;
  organization?: string;
  package_type: string;
  status: string;
  created_at: string;
  documents?: DocumentItem[];
}

export const api = new ApiClient(API_BASE);

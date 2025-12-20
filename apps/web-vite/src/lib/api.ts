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

  // CRM / Leads - uses real /api/funil endpoints
  async getLeads(params?: { stage?: string; search?: string; page?: number }) {
    try {
      const result = await this.request<{ success: boolean; leads: any[] }>('/funil/bant');
      let leads = result.leads || [];

      // Filter by stage if provided
      if (params?.stage) {
        leads = leads.filter((l: any) => l.currentStage === params.stage || l.pipeline_stage === params.stage);
      }

      // Filter by search if provided
      if (params?.search) {
        const search = params.search.toLowerCase();
        leads = leads.filter((l: any) =>
          (l.nome || '').toLowerCase().includes(search) ||
          (l.empresa || '').toLowerCase().includes(search) ||
          (l.contactId || '').includes(search)
        );
      }

      return {
        leads: leads.map((l: any) => ({
          id: l.contactId || l.id,
          name: l.nome || l.contactName || 'Sem nome',
          phone: l.contactId || '',
          email: '',
          company: l.empresa || '',
          stage: l.currentStage || l.pipeline_stage || 'need',
          score: l.score || 0,
          assignedAgent: l.currentAgent,
          lastContact: l.lastUpdate,
          createdAt: l.lastUpdate
        })) as Lead[],
        total: leads.length
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

  // Analytics - uses real forecasting endpoints
  async getAnalytics(_period: '7d' | '30d' | '90d') {
    try {
      const [velocity, monthly] = await Promise.all([
        this.request<{ success: boolean; velocity: any }>('/forecasting/velocity').catch(() => ({ success: false, velocity: {} })),
        this.request<{ success: boolean; forecast: any }>('/forecasting/monthly').catch(() => ({ success: false, forecast: {} }))
      ]);

      const v = velocity.velocity || {};
      const f = monthly.forecast || {};

      return {
        metrics: {
          totalConversations: v.total_conversations || 0,
          avgResponseTime: v.avg_response_time_seconds || 0,
          conversionRate: f.current_conversion_rate || 0,
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

  // Messages - uses activity-feed for conversation data
  async getMessages(phone: string): Promise<{ messages: Message[] }> {
    try {
      const result = await this.request<{ success: boolean; activities: any[] }>('/command-center/activity-feed');
      const activities = result.activities || [];

      // Filter messages for this phone
      const messages: Message[] = activities
        .filter((a: any) => a.type === 'message' && (a.phone === phone || a.contact_phone === phone))
        .map((a: any) => ({
          id: a.id || String(Date.now()),
          content: a.text || a.message || '',
          from: (a.from_me ? 'agent' : 'user') as 'agent' | 'user',
          timestamp: a.timestamp || a.created_at
        }));

      return { messages };
    } catch {
      return { messages: [] };
    }
  }

  async sendMessage(phone: string, content: string) {
    try {
      await this.request<{ success: boolean }>('/whatsapp/send', {
        method: 'POST',
        body: { phone, message: content },
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

  // Cadences
  async getCadences() {
    return this.request<{ data: any[] }>('/cadences');
  }

  async getCadenceStats() {
    return this.request<{ active: number; pending: number; completed: number }>('/cadences/stats');
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

export const api = new ApiClient(API_BASE);

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: unknown;
  headers?: Record<string, string>;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  }

  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, headers = {} } = options;
    const token = this.getToken();

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
      if (response.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Auth
  async login(email: string, password: string) {
    return this.request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
  }

  async register(data: { name: string; email: string; password: string; company?: string }) {
    return this.request<{ token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: data,
    });
  }

  // Dashboard
  async getDashboardStats() {
    return this.request<DashboardStats>('/dashboard/stats');
  }

  // Agents
  async getAgents() {
    return this.request<Agent[]>('/agents');
  }

  async getAgent(id: string) {
    return this.request<Agent>(`/agents/${id}`);
  }

  async createAgent(data: Partial<Agent>) {
    return this.request<Agent>('/agents', { method: 'POST', body: data });
  }

  async updateAgent(id: string, data: Partial<Agent>) {
    return this.request<Agent>(`/agents/${id}`, { method: 'PUT', body: data });
  }

  async deleteAgent(id: string) {
    return this.request<void>(`/agents/${id}`, { method: 'DELETE' });
  }

  // CRM / Leads
  async getLeads(params?: { stage?: string; search?: string; page?: number }) {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return this.request<{ leads: Lead[]; total: number }>(`/leads?${query}`);
  }

  async getLead(id: string) {
    return this.request<Lead>(`/leads/${id}`);
  }

  async updateLead(id: string, data: Partial<Lead>) {
    return this.request<Lead>(`/leads/${id}`, { method: 'PUT', body: data });
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

  // Analytics
  async getAnalytics(period: '7d' | '30d' | '90d') {
    return this.request<AnalyticsData>(`/analytics?period=${period}`);
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
  type: 'sdr' | 'support' | 'custom';
  status: 'active' | 'paused' | 'offline';
  channel: 'whatsapp' | 'email' | 'chat';
  messagesProcessed: number;
  avgResponseTime: number;
  createdAt: string;
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

export const api = new ApiClient(API_BASE);

import { useEffect, useState, type ChangeEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plug, MessageSquare, Calendar, Database, Webhook,
  CheckCircle, XCircle, Settings, RefreshCw, ExternalLink,
  AlertTriangle, QrCode
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import TopBar from '../components/layout/TopBar';
import { cn } from '../lib/utils';
import { api, type ApiError, type AgentIntegrationBinding } from '../lib/api';

// Types
interface Integration {
  id: string;
  integrationId?: string;
  tenantId?: string;
  instanceName?: string;
  name: string;
  type: 'whatsapp' | 'calendar' | 'crm' | 'webhook' | 'ai';
  provider: string;
  status: 'connected' | 'disconnected' | 'error' | 'pending';
  icon: string;
  description: string;
  lastSync?: string;
  config?: Record<string, unknown>;
}

const categoryIconMap: Record<string, typeof MessageSquare> = {
  MessageSquare,
  Calendar,
  Database,
  Webhook
};

export default function IntegrationsPage() {
  const [searchParams] = useSearchParams();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [showConfigModal, setShowConfigModal] = useState<string | null>(null);
  const [agents, setAgents] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [catalogCategories, setCatalogCategories] = useState<Array<{ id: string; name: string; icon: typeof MessageSquare }>>([]);
  const [catalogIntegrations, setCatalogIntegrations] = useState<Integration[]>([]);

  const categoryTypeMap: Record<string, string[]> = {
    messaging: ['whatsapp'],
    calendar: ['calendar'],
    crm: ['crm'],
    webhooks: ['webhook']
  };

  const parseConfig = (config: unknown) => {
    if (!config) return null;
    if (typeof config === 'object') return config as Record<string, unknown>;
    if (typeof config === 'string') {
      try {
        return JSON.parse(config) as Record<string, unknown>;
      } catch {
        return null;
      }
    }
    return null;
  };

  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async (overrideAgentId?: string | null) => {
    try {
      const catalog = await api.getIntegrationsCatalog();
      const categories = (catalog.categories || []).map(category => ({
        id: category.id,
        name: category.name,
        icon: categoryIconMap[category.icon || 'MessageSquare'] || MessageSquare
      }));
      setCatalogCategories(categories);

      const catalogItems = (catalog.integrations || []).map(item => ({
        ...item,
        status: item.status as Integration['status']
      }));
      setCatalogIntegrations(catalogItems as Integration[]);

      const agentsList = await api.getAgents().catch(() => []);
      setAgents(agentsList);

      const requestedAgentId = overrideAgentId ?? searchParams.get('agentId');
      let agentId: string | null = null;
      if (requestedAgentId && agentsList.some(agent => agent.id === requestedAgentId)) {
        agentId = requestedAgentId;
      } else if (agentsList.length > 0) {
        agentId = agentsList[0].id;
      }
      setSelectedAgentId(agentId);

      const bindings: AgentIntegrationBinding[] = agentId
        ? await api.getAgentIntegrations(agentId).catch(() => [])
        : [];

      // Check Evolution status using correct endpoint with agentId
      let evolutionStatus: Integration['status'] = 'disconnected';
      if (agentId) {
        try {
          const evolData = await api.getEvolutionStatus(agentId);
          if (evolData?.connected || evolData?.status === 'connected' || evolData?.state === 'open') {
            evolutionStatus = 'connected';
          }
        } catch {
          // Ignore
        }
      }

      const bindingByProvider = new Map<string, AgentIntegrationBinding>();
      bindings.forEach(binding => {
        if (binding.provider) {
          bindingByProvider.set(binding.provider, binding);
        }
      });

      const merged = catalogItems.map(avail => {
        const binding = bindingByProvider.get(avail.provider);

        if (binding) {
          const config = parseConfig(binding.config_json);
          return {
            ...avail,
            integrationId: binding.integration_id,
            tenantId: binding.tenant_id,
            instanceName: binding.instance_name || config?.instance_name || config?.instanceName,
            status: (binding.integration_status || avail.status) as Integration['status'],
            lastSync: binding.last_sync || undefined,
            config
          };
        }

        if (avail.provider === 'evolution' && agentId) {
          return { ...avail, status: evolutionStatus };
        }

        return avail;
      });

      setIntegrations(merged as Integration[]);
    } catch (error) {
      console.error('Erro ao carregar integracoes:', error);
      setIntegrations([]);
      setCatalogCategories([]);
      setCatalogIntegrations([]);
    } finally {
      setLoading(false);
    }
  };

  const connectIntegration = async (integration: Integration) => {
    setConnectingId(integration.id);

    if (integration.provider === 'evolution') {
      if (!selectedAgentId) {
        alert('Nenhum agente encontrado. Crie um agente primeiro.');
        setConnectingId(null);
        return;
      }

      try {
        const data = await api.connectEvolution(selectedAgentId, { instanceName: 'leadly_main' });
        if (data?.qrcode?.base64) {
          setQrCode(data.qrcode.base64);
          setShowQRModal(true);
        } else if (data?.status === 'open' || data?.connected) {
          alert('WhatsApp ja esta conectado!');
          loadIntegrations();
        }
      } catch (error) {
        console.error('Erro ao conectar Evolution:', error);
        alert((error as Error).message || 'Erro ao conectar Evolution API');
      }
    } else if (integration.provider === 'google') {
      // Google Calendar OAuth flow
      window.location.href = '/auth/google';
    } else if (['kommo', 'hubspot', 'pipedrive'].includes(integration.provider)) {
      // CRM OAuth flow
      try {
        const data = await api.startCrmOauth(integration.provider);
        if (data.data?.authUrl) {
          window.location.href = data.data.authUrl;
        }
      } catch (error) {
        console.error('Erro ao iniciar OAuth:', error);
        const apiError = error as ApiError;
        if (apiError.data && (apiError.data as { upgradeRequired?: boolean }).upgradeRequired) {
          alert('Limite de integracoes atingido. Faca upgrade do seu plano.');
        } else {
          alert(apiError.message || 'Erro ao conectar CRM');
        }
      }
    } else {
      setShowConfigModal(integration.id);
    }

    setConnectingId(null);
  };

  const disconnectIntegration = async (integration: Integration) => {
    try {
      if (integration.provider === 'evolution') {
        if (!selectedAgentId) {
          alert('Nenhum agente encontrado. Crie um agente primeiro.');
          return;
        }
        await api.disconnectEvolution(selectedAgentId);
      } else {
        if (!integration.integrationId) {
          alert('Integracao nao encontrada no backend.');
          return;
        }
        await api.disconnectIntegration(integration.integrationId);
      }
      setIntegrations(prev =>
        prev.map(i => i.id === integration.id ? { ...i, status: 'disconnected' } : i)
      );
    } catch (error) {
      console.error('Erro ao desconectar:', error);
      alert('Erro ao desconectar integracao');
    }
  };

  const testIntegration = async (integration: Integration) => {
    try {
      if (integration.provider === 'evolution') {
        if (!selectedAgentId) {
          alert('Nenhum agente encontrado. Crie um agente primeiro.');
          return;
        }
        const status = await api.getEvolutionStatus(selectedAgentId);
        if (status?.connected) {
          alert('Conexao OK!');
        } else {
          alert(`Erro: ${status?.status || 'Conexao falhou'}`);
        }
        return;
      }

      if (!integration.integrationId) {
        alert('Integracao nao encontrada no backend.');
        return;
      }

      const data = await api.testIntegration(integration.integrationId);
      if (data.success && data.data?.connected) {
        alert('Conexao OK!');
      } else {
        alert(`Erro: ${data.data?.reason || data.error || 'Conexao falhou'}`);
      }
    } catch {
      alert('Erro ao testar conexao');
    }
  };

  const filteredIntegrations = activeCategory === 'all'
    ? integrations
    : integrations.filter(i => {
        const allowed = categoryTypeMap[activeCategory] || [];
        return allowed.includes(i.type);
      });

  const handleAgentChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextAgentId = event.target.value || null;
    setSelectedAgentId(nextAgentId);
    loadIntegrations(nextAgentId);
  };

  const getStatusBadge = (status: Integration['status']) => {
    const config = {
      connected: { variant: 'success' as const, label: 'Conectado', icon: CheckCircle },
      disconnected: { variant: 'default' as const, label: 'Desconectado', icon: XCircle },
      error: { variant: 'danger' as const, label: 'Erro', icon: AlertTriangle },
      pending: { variant: 'warning' as const, label: 'Pendente', icon: RefreshCw },
    };
    const { variant, label, icon: Icon } = config[status];
    return (
      <Badge variant={variant} className="flex items-center gap-1">
        <Icon size={12} />
        {label}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen">
      <TopBar title="Integracoes" />

      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Hub de Integracoes</h1>
          <p className="text-gray-400 mt-1">Conecte seus servicos e ferramentas</p>
        </div>

        {/* Agent Selector */}
        <Card className="p-4 mb-6">
          <div className="flex flex-col gap-2">
            <span className="text-sm text-gray-400">Agente selecionado</span>
            <select
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm"
              value={selectedAgentId || ''}
              onChange={handleAgentChange}
            >
              {agents.length === 0 && (
                <option value="">Nenhum agente encontrado</option>
              )}
              {agents.map(agent => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
            {!selectedAgentId && (
              <span className="text-xs text-yellow-400">
                Crie um agente para conectar integracoes.
              </span>
            )}
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="text-2xl font-bold text-cyan">
              {integrations.filter(i => i.status === 'connected').length}
            </div>
            <div className="text-sm text-gray-400">Conectadas</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-yellow-500">
              {integrations.filter(i => i.status === 'pending').length}
            </div>
            <div className="text-sm text-gray-400">Pendentes</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-red-500">
              {integrations.filter(i => i.status === 'error').length}
            </div>
            <div className="text-sm text-gray-400">Com Erro</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-gray-400">
              {catalogIntegrations.length}
            </div>
            <div className="text-sm text-gray-400">Disponiveis</div>
          </Card>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveCategory('all')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
              activeCategory === 'all'
                ? "bg-cyan/20 text-cyan"
                : "bg-white/5 text-gray-400 hover:bg-white/10"
            )}
          >
            Todas
          </button>
          {catalogCategories.map(cat => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap",
                  activeCategory === cat.id
                    ? "bg-cyan/20 text-cyan"
                    : "bg-white/5 text-gray-400 hover:bg-white/10"
                )}
              >
                <Icon size={16} />
                {cat.name}
              </button>
            );
          })}
        </div>

        {/* Integrations Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-cyan border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredIntegrations.map(integration => (
              <Card key={integration.id} className="p-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan/20 to-violet/20 flex items-center justify-center text-2xl">
                      {integration.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold">{integration.name}</h3>
                      <p className="text-xs text-gray-400">{integration.provider}</p>
                    </div>
                  </div>
                  {getStatusBadge(integration.status)}
                </div>

                <p className="text-sm text-gray-400 mb-4">{integration.description}</p>

                {integration.provider === 'evolution' && integration.integrationId && (
                  <div className="mb-4 rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-gray-400">
                    <div className="font-medium text-gray-300 mb-1">Health-check</div>
                    <div>integrationId: {integration.integrationId}</div>
                    <div>tenantId: {integration.tenantId || '—'}</div>
                    <div>instance: {integration.instanceName || '—'}</div>
                  </div>
                )}

                {integration.lastSync && (
                  <p className="text-xs text-gray-500 mb-4">
                    Ultimo sync: {new Date(integration.lastSync).toLocaleString('pt-BR')}
                  </p>
                )}

                <div className="flex gap-2">
                  {integration.status === 'connected' ? (
                    <>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="flex-1"
                        onClick={() => testIntegration(integration)}
                        icon={<RefreshCw size={14} />}
                      >
                        Testar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowConfigModal(integration.id)}
                        icon={<Settings size={14} />}
                      >
                        Config
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => disconnectIntegration(integration)}
                        icon={<XCircle size={14} />}
                        className="text-red-400"
                      >
                        Desconectar
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => connectIntegration(integration)}
                      disabled={connectingId === integration.id}
                      icon={integration.provider === 'evolution' ? <QrCode size={14} /> : <Plug size={14} />}
                    >
                      {connectingId === integration.id ? 'Conectando...' : 'Conectar'}
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* QR Code Modal */}
        {showQRModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md p-6">
              <h3 className="text-lg font-semibold mb-4 text-center">Conectar WhatsApp</h3>
              <p className="text-sm text-gray-400 text-center mb-6">
                Escaneie o QR Code com seu WhatsApp para conectar
              </p>

              <div className="bg-white p-4 rounded-xl mb-6 flex items-center justify-center">
                {qrCode ? (
                  <img src={qrCode} alt="QR Code" className="w-64 h-64" />
                ) : (
                  <div className="w-64 h-64 flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-dark-bg border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setShowQRModal(false)}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => loadIntegrations()}
                  icon={<RefreshCw size={16} />}
                >
                  Verificar Status
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Config Modal */}
        {showConfigModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-lg p-6">
              <h3 className="text-lg font-semibold mb-4">
                Configurar {integrations.find(i => i.id === showConfigModal)?.name}
              </h3>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">API Key</label>
                  <input
                    type="password"
                    placeholder="Sua API Key"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan/50"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Webhook URL</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`https://api.leadly.com/webhooks/${showConfigModal}`}
                      className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-gray-400"
                    />
                    <Button variant="secondary" icon={<ExternalLink size={16} />}>
                      Copiar
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setShowConfigModal(null)}
                >
                  Cancelar
                </Button>
                <Button className="flex-1">
                  Salvar Configuracao
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

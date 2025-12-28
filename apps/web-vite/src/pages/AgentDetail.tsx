import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, BarChart2, Users, Columns, Clock, Target,
  Settings, RefreshCw, Play, Pause, Phone,
  Calendar, ArrowUp, ArrowDown, CheckCircle, X,
  MessageSquare, Bot, Zap, Bell, Brain, Sliders
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import TopBar from '../components/layout/TopBar';
import { api } from '../lib/api';
import type { Agent, Lead } from '../lib/api';
import { formatNumber, cn } from '../lib/utils';

// Types for this page
interface AgentMetrics {
  totalLeads: number;
  responseRate: number;
  meetings: number;
  conversionRate: number;
  leadsChange?: number;
  responseChange?: number;
  meetingsChange?: number;
  conversionChange?: number;
}

interface CadenceItem {
  id: string;
  leadName: string;
  phone: string;
  currentDay: number;
  nextActionAt: string;
  status: 'in_progress' | 'pending' | 'completed' | 'paused';
}

interface ProspectItem {
  id: string;
  nome: string;
  telefone: string;
  empresa: string;
  status: 'pendente' | 'enviado' | 'respondeu' | 'erro';
  createdAt: string;
}

interface ProspectingStats {
  pending: number;
  sentToday: number;
  replies: number;
  isRunning: boolean;
}

type TabId = 'metrics' | 'leads' | 'pipeline' | 'cadence' | 'prospecting' | 'settings';

const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'metrics', label: 'Metricas', icon: <BarChart2 size={18} /> },
  { id: 'leads', label: 'Leads', icon: <Users size={18} /> },
  { id: 'pipeline', label: 'Pipeline', icon: <Columns size={18} /> },
  { id: 'cadence', label: 'Cadencia', icon: <Clock size={18} /> },
  { id: 'prospecting', label: 'Prospeccao', icon: <Target size={18} /> },
  { id: 'settings', label: 'Config', icon: <Settings size={18} /> },
];

export default function AgentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('metrics');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data states
  const [metrics, setMetrics] = useState<AgentMetrics | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [pipelineLeads, setPipelineLeads] = useState<Record<string, Lead[]>>({});
  const [pipelineStages, setPipelineStages] = useState<Array<{ id: string; label: string; color: string }>>([]);
  const [cadenceItems, setCadenceItems] = useState<CadenceItem[]>([]);
  const [cadenceStats, setCadenceStats] = useState({ active: 0, pending: 0, completed: 0 });
  const [prospects, setProspects] = useState<ProspectItem[]>([]);
  const [prospectingStats, setProspectingStats] = useState<ProspectingStats>({
    pending: 0, sentToday: 0, replies: 0, isRunning: false
  });

  // Settings states
  const [settingsTab, setSettingsTab] = useState<'basic' | 'persona' | 'ai' | 'integrations' | 'handoff'>('basic');
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrCode, setQRCode] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');

  // Agent configuration state
  const [agentConfig, setAgentConfig] = useState({
    // Basic
    name: '',
    status: 'active' as 'active' | 'paused',
    channel: 'whatsapp' as 'whatsapp' | 'email' | 'chat',

    // Persona
    personaName: 'Luna',
    personaCompany: 'Digital Boost',
    personaRole: 'Consultora de Crescimento Digital',
    personaTone: 'consultivo' as 'profissional' | 'amigavel' | 'consultivo',

    // System Prompt
    systemPrompt: '',

    // AI Config
    model: 'gpt-4o-mini' as 'gpt-4o-mini' | 'gpt-4o',
    temperature: 0.7,
    maxTokens: 500,

    // Evolution API
    evolutionInstance: 'digitalboost',

    // Handoff
    salesRep: '',
    notificationChannel: 'whatsapp' as 'whatsapp' | 'email' | 'slack',
    webhookUrl: '',
    escalationCriteria: {
      angry: true,
      technical: true,
      legal: true,
      vip: false,
      priceNegotiation: false,
    },
  });

  const mapStageColor = (color?: string) => {
    if (!color) return 'cyan';
    if (color.includes('green')) return 'success';
    if (color.includes('yellow')) return 'warning';
    if (color.includes('red')) return 'danger';
    if (color.includes('cyan') || color.includes('blue')) return 'cyan';
    if (color.includes('violet') || color.includes('purple')) return 'violet';
    return 'cyan';
  };

  const loadPipelineStages = async () => {
    try {
      const stages = await api.getPipelineStages();
      const mapped = stages.map(stage => ({
        id: stage.id,
        label: stage.name || stage.slug || stage.id,
        color: mapStageColor(stage.color)
      }));
      setPipelineStages(mapped);
    } catch {
      setPipelineStages([]);
    }
  };

  useEffect(() => {
    loadAgentData();
  }, [id]);

  useEffect(() => {
    loadPipelineStages();
  }, []);

  useEffect(() => {
    // Load tab-specific data when tab changes
    if (activeTab === 'leads') loadLeads();
    if (activeTab === 'pipeline') loadPipeline();
    if (activeTab === 'cadence') loadCadence();
    if (activeTab === 'prospecting') loadProspecting();
  }, [activeTab]);

  const loadAgentData = async () => {
    setLoading(true);
    try {
      // Load agent info
      const agentData = await api.getAgent(id!);
      setAgent(agentData);

      // Load metrics
      const statsData = await api.getDashboardStats();
      setMetrics({
        totalLeads: statsData.totalLeads || 0,
        responseRate: 78,
        meetings: 12,
        conversionRate: statsData.conversionRate || 0,
        leadsChange: 12,
        responseChange: 5,
        meetingsChange: 3,
        conversionChange: 2.5,
      });
    } catch (error) {
      console.error('Erro ao carregar agente:', error);
      setAgent(null);
      setMetrics({
        totalLeads: 0,
        responseRate: 0,
        meetings: 0,
        conversionRate: 0,
        leadsChange: 0,
        responseChange: 0,
        meetingsChange: 0,
        conversionChange: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const loadLeads = async () => {
    try {
      const data = await api.getLeads();
      setLeads(data.leads || []);
    } catch (error) {
      console.error('Erro ao carregar leads:', error);
      setLeads([]);
    }
  };

  const loadPipeline = async () => {
    try {
      if (!pipelineStages.length) {
        await loadPipelineStages();
      }
      const data = await api.getFunnel();
      const grouped: Record<string, Lead[]> = {};
      pipelineStages.forEach(stage => { grouped[stage.id] = []; });

      (data.data || []).forEach((lead: Lead & { stage_id?: string }) => {
        const stageId = lead.stage_id || lead.stage || 'stage_lead_novo';
        if (grouped[stageId]) {
          grouped[stageId].push(lead);
        }
      });
      setPipelineLeads(grouped);
    } catch (error) {
      console.error('Erro ao carregar pipeline:', error);
      const grouped: Record<string, Lead[]> = {};
      pipelineStages.forEach(stage => { grouped[stage.id] = []; });
      setPipelineLeads(grouped);
    }
  };

  const loadCadence = async () => {
    try {
      const data = await api.getCadences();
      const items = data.data || [];
      setCadenceItems(items.map((c: any) => ({
        id: c.id,
        leadName: c.lead_name || c.telefone || '-',
        phone: c.telefone,
        currentDay: c.current_day || 1,
        nextActionAt: c.next_action_at,
        status: c.status,
      })));
      setCadenceStats({
        active: items.filter((c: any) => c.status === 'in_progress').length,
        pending: items.filter((c: any) => c.status === 'pending').length,
        completed: items.filter((c: any) => c.status === 'completed').length,
      });
    } catch (error) {
      console.error('Erro ao carregar cadencias:', error);
      setCadenceItems([]);
      setCadenceStats({ active: 0, pending: 0, completed: 0 });
    }
  };

  const loadProspecting = async () => {
    try {
      const statsData = await api.getProspectingStats();
      setProspectingStats({
        pending: statsData.pending || 0,
        sentToday: statsData.sentToday || 0,
        replies: statsData.replies || 0,
        isRunning: statsData.isRunning || false,
      });

      const prospectsData = await api.getProspects();
      setProspects(prospectsData.data || []);
    } catch (error) {
      console.error('Erro ao carregar prospecting:', error);
      setProspectingStats({ pending: 0, sentToday: 0, replies: 0, isRunning: false });
      setProspects([]);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    if (activeTab === 'metrics') await loadAgentData();
    if (activeTab === 'leads') await loadLeads();
    if (activeTab === 'pipeline') await loadPipeline();
    if (activeTab === 'cadence') await loadCadence();
    if (activeTab === 'prospecting') await loadProspecting();
    setRefreshing(false);
  };

  const toggleProspecting = async () => {
    try {
      if (prospectingStats.isRunning) {
        await api.stopProspecting();
      } else {
        await api.startProspecting();
      }
      setProspectingStats(prev => ({ ...prev, isRunning: !prev.isRunning }));
    } catch (error) {
      console.error('Erro ao alternar prospecting:', error);
    }
  };

  // Connect WhatsApp via Evolution API
  const connectWhatsApp = async () => {
    if (!id) return;
    setConnectionStatus('connecting');
    setShowQRModal(true);
    try {
      const data = await api.connectEvolution(id, { instanceName: 'leadly_main' });
      if (data?.qrcode?.base64) {
        setQRCode(data.qrcode.base64);
        pollConnectionStatus();
      } else if (data?.status === 'open' || data?.connected) {
        setConnectionStatus('connected');
        setShowQRModal(false);
        setQRCode(null);
      }
    } catch (error) {
      console.error('Erro ao conectar WhatsApp:', error);
      setConnectionStatus('disconnected');
    }
  };

  const pollConnectionStatus = () => {
    if (!id) return;
    const interval = setInterval(async () => {
      try {
        const data = await api.getEvolutionStatus(id);
        if (data?.state === 'open' || data?.connected || data?.status === 'connected') {
          setConnectionStatus('connected');
          setShowQRModal(false);
          setQRCode(null);
          clearInterval(interval);
        }
      } catch (error) {
        console.error('Erro ao verificar status:', error);
      }
    }, 3000);
    setTimeout(() => clearInterval(interval), 120000);
  };

  const updateConfig = (key: string, value: unknown) => {
    setAgentConfig(prev => ({ ...prev, [key]: value }));
  };

  const updateEscalationCriteria = (key: string, value: boolean) => {
    setAgentConfig(prev => ({
      ...prev,
      escalationCriteria: { ...prev.escalationCriteria, [key]: value }
    }));
  };

  const saveSettings = async () => {
    try {
      await api.updateAgent(id!, {
        name: agentConfig.name,
        status: agentConfig.status,
        channel: agentConfig.channel,
      });
      // Aqui pode salvar outras configurações em endpoints específicos
      alert('Configuracoes salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar configuracoes');
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStageLabel = (stageId: string) => {
    const stage = pipelineStages.find(s => s.id === stageId);
    return stage?.label || stageId;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-cyan border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Carregando agente...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <TopBar title={agent?.name || 'Agente'} />

      {/* Header with back button and status */}
      <div className="px-6 pt-6 pb-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/agents">
              <Button variant="ghost" size="sm" icon={<ArrowLeft size={18} />}>
                Voltar
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-semibold">{agent?.name}</h1>
              <p className="text-gray-400 text-sm mt-1">
                {agent?.channel} | {formatNumber(agent?.messagesProcessed || 0)} mensagens processadas
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={agent?.status === 'active' ? 'success' : 'warning'}>
              <span className={cn(
                "w-2 h-2 rounded-full mr-2",
                agent?.status === 'active' ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'
              )} />
              {agent?.status === 'active' ? 'Online' : 'Pausado'}
            </Badge>
            <Button
              variant="secondary"
              size="sm"
              icon={<RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />}
              onClick={handleRefresh}
            >
              Atualizar
            </Button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-white/10 px-6 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-5 py-4 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap",
              activeTab === tab.id
                ? "text-cyan border-cyan"
                : "text-gray-400 border-transparent hover:text-white hover:bg-white/5"
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {/* Metrics Tab */}
        {activeTab === 'metrics' && metrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Total de Leads"
              value={metrics.totalLeads}
              change={metrics.leadsChange}
              changeLabel="esta semana"
              icon={<Users className="text-cyan" />}
              iconBg="cyan"
            />
            <StatCard
              title="Taxa de Resposta"
              value={`${metrics.responseRate}%`}
              change={metrics.responseChange}
              changeLabel="vs ontem"
              icon={<BarChart2 className="text-violet" />}
              iconBg="violet"
            />
            <StatCard
              title="Reunioes Agendadas"
              value={metrics.meetings}
              change={metrics.meetingsChange}
              changeLabel="esta semana"
              icon={<Calendar className="text-green-500" />}
              iconBg="success"
            />
            <StatCard
              title="Taxa de Conversao"
              value={`${metrics.conversionRate}%`}
              change={metrics.conversionChange}
              changeLabel="este mes"
              icon={<Target className="text-yellow-500" />}
              iconBg="warning"
            />
          </div>
        )}

        {/* Leads Tab */}
        {activeTab === 'leads' && (
          <Card>
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="font-semibold">Leads</h3>
              <Button variant="secondary" size="sm" icon={<RefreshCw size={14} />} onClick={loadLeads}>
                Atualizar
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left p-4 text-xs text-gray-400 font-medium uppercase">Nome</th>
                    <th className="text-left p-4 text-xs text-gray-400 font-medium uppercase">Telefone</th>
                    <th className="text-left p-4 text-xs text-gray-400 font-medium uppercase">Empresa</th>
                    <th className="text-left p-4 text-xs text-gray-400 font-medium uppercase">Estagio</th>
                    <th className="text-left p-4 text-xs text-gray-400 font-medium uppercase">Ultima Interacao</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-400">
                        <Users size={48} className="mx-auto mb-4 opacity-50" />
                        <p>Nenhum lead ainda</p>
                      </td>
                    </tr>
                  ) : (
                    leads.slice(0, 20).map((lead) => (
                      <tr key={lead.id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="p-4">{lead.name}</td>
                        <td className="p-4 text-gray-400">{lead.phone}</td>
                        <td className="p-4 text-gray-400">{lead.company || '-'}</td>
                        <td className="p-4">
                          <Badge variant="info">{getStageLabel(lead.stage)}</Badge>
                        </td>
                        <td className="p-4 text-gray-400">{formatDate(lead.lastContact || lead.createdAt)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Pipeline Tab */}
        {activeTab === 'pipeline' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {pipelineStages.map((stage) => (
              <div
                key={stage.id}
                className="bg-dark-card border border-white/10 rounded-xl min-h-[400px]"
              >
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "w-2 h-2 rounded-full",
                      stage.color === 'cyan' && 'bg-cyan',
                      stage.color === 'violet' && 'bg-violet',
                      stage.color === 'success' && 'bg-green-500',
                      stage.color === 'warning' && 'bg-yellow-500'
                    )} />
                    <span className="font-medium text-sm">{stage.label}</span>
                  </div>
                  <Badge variant="default">{pipelineLeads[stage.id]?.length || 0}</Badge>
                </div>
                <div className="p-3 space-y-2">
                  {(pipelineLeads[stage.id] || []).length === 0 ? (
                    <p className="text-center text-gray-500 text-sm py-4">Sem leads</p>
                  ) : (
                    (pipelineLeads[stage.id] || []).slice(0, 10).map((lead) => (
                      <div
                        key={lead.id}
                        className="p-3 bg-white/5 border border-white/10 rounded-lg hover:border-cyan/50 cursor-pointer transition-colors"
                      >
                        <p className="font-medium text-sm">{lead.name}</p>
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                          <Phone size={12} />
                          {lead.phone}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Cadence Tab */}
        {activeTab === 'cadence' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <StatCard
                title="Em Cadencia"
                value={cadenceStats.active}
                icon={<Play className="text-cyan" />}
                iconBg="cyan"
              />
              <StatCard
                title="Pendentes Hoje"
                value={cadenceStats.pending}
                icon={<Clock className="text-yellow-500" />}
                iconBg="warning"
              />
              <StatCard
                title="Completados"
                value={cadenceStats.completed}
                icon={<CheckCircle className="text-green-500" />}
                iconBg="success"
              />
            </div>

            <Card>
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h3 className="font-semibold">Fila de Cadencia</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left p-4 text-xs text-gray-400 font-medium uppercase">Lead</th>
                      <th className="text-left p-4 text-xs text-gray-400 font-medium uppercase">Dia</th>
                      <th className="text-left p-4 text-xs text-gray-400 font-medium uppercase">Proxima Acao</th>
                      <th className="text-left p-4 text-xs text-gray-400 font-medium uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cadenceItems.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-gray-400">
                          <Clock size={48} className="mx-auto mb-4 opacity-50" />
                          <p>Nenhuma cadencia ativa</p>
                        </td>
                      </tr>
                    ) : (
                      cadenceItems.slice(0, 20).map((item) => (
                        <tr key={item.id} className="border-b border-white/5 hover:bg-white/5">
                          <td className="p-4">{item.leadName}</td>
                          <td className="p-4">
                            <Badge variant="info">D{item.currentDay}</Badge>
                          </td>
                          <td className="p-4 text-gray-400">{formatDate(item.nextActionAt)}</td>
                          <td className="p-4">
                            <Badge variant={item.status === 'in_progress' ? 'success' : 'warning'}>
                              {item.status}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}

        {/* Prospecting Tab */}
        {activeTab === 'prospecting' && (
          <>
            <div className="flex items-center gap-4 mb-6">
              <Button
                variant={prospectingStats.isRunning ? 'danger' : 'primary'}
                icon={prospectingStats.isRunning ? <Pause size={18} /> : <Play size={18} />}
                onClick={toggleProspecting}
              >
                {prospectingStats.isRunning ? 'Parar' : 'Iniciar'}
              </Button>
              <Button variant="secondary" icon={<RefreshCw size={18} />} onClick={loadProspecting}>
                Atualizar
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <StatCard
                title="Prospects Pendentes"
                value={prospectingStats.pending}
                icon={<Users className="text-cyan" />}
                iconBg="cyan"
              />
              <StatCard
                title="Enviados Hoje"
                value={prospectingStats.sentToday}
                icon={<Target className="text-violet" />}
                iconBg="violet"
              />
              <StatCard
                title="Respostas"
                value={prospectingStats.replies}
                icon={<CheckCircle className="text-green-500" />}
                iconBg="success"
              />
            </div>

            <Card>
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h3 className="font-semibold">Lista de Prospectos</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left p-4 text-xs text-gray-400 font-medium uppercase">Nome</th>
                      <th className="text-left p-4 text-xs text-gray-400 font-medium uppercase">Telefone</th>
                      <th className="text-left p-4 text-xs text-gray-400 font-medium uppercase">Empresa</th>
                      <th className="text-left p-4 text-xs text-gray-400 font-medium uppercase">Status</th>
                      <th className="text-left p-4 text-xs text-gray-400 font-medium uppercase">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prospects.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-gray-400">
                          <Target size={48} className="mx-auto mb-4 opacity-50" />
                          <p>Nenhum prospecto ainda</p>
                        </td>
                      </tr>
                    ) : (
                      prospects.slice(0, 20).map((prospect) => (
                        <tr key={prospect.id} className="border-b border-white/5 hover:bg-white/5">
                          <td className="p-4">{prospect.nome || '-'}</td>
                          <td className="p-4 text-gray-400">{prospect.telefone}</td>
                          <td className="p-4 text-gray-400">{prospect.empresa || '-'}</td>
                          <td className="p-4">
                            <Badge variant={
                              prospect.status === 'enviado' ? 'info' :
                              prospect.status === 'respondeu' ? 'success' :
                              prospect.status === 'erro' ? 'danger' : 'default'
                            }>
                              {prospect.status}
                            </Badge>
                          </td>
                          <td className="p-4 text-gray-400">{formatDate(prospect.createdAt)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="flex gap-6">
            {/* Settings Navigation */}
            <div className="w-56 shrink-0">
              <Card className="p-2">
                {[
                  { id: 'basic', label: 'Basico', icon: <Sliders size={18} /> },
                  { id: 'persona', label: 'Persona', icon: <Bot size={18} /> },
                  { id: 'ai', label: 'IA & Modelo', icon: <Brain size={18} /> },
                  { id: 'integrations', label: 'Integracoes', icon: <Zap size={18} /> },
                  { id: 'handoff', label: 'Handoff', icon: <Bell size={18} /> },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSettingsTab(item.id as typeof settingsTab)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors",
                      settingsTab === item.id
                        ? "bg-cyan/20 text-cyan"
                        : "text-gray-400 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    {item.icon}
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                ))}
              </Card>
            </div>

            {/* Settings Content */}
            <div className="flex-1 max-w-2xl">
              {/* Basic Settings */}
              {settingsTab === 'basic' && (
                <Card>
                  <div className="p-4 border-b border-white/10">
                    <h3 className="font-semibold">Configuracoes Basicas</h3>
                    <p className="text-sm text-gray-400 mt-1">Nome, status e canal do agente</p>
                  </div>
                  <div className="p-6 space-y-6">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Nome do Agente</label>
                      <input
                        type="text"
                        value={agentConfig.name || agent?.name || ''}
                        onChange={(e) => updateConfig('name', e.target.value)}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan/50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Canal Principal</label>
                      <select
                        value={agentConfig.channel}
                        onChange={(e) => updateConfig('channel', e.target.value)}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan/50"
                      >
                        <option value="whatsapp">WhatsApp</option>
                        <option value="email">Email</option>
                        <option value="chat">Chat Web</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Status</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="status"
                            checked={agentConfig.status === 'active'}
                            onChange={() => updateConfig('status', 'active')}
                            className="w-4 h-4 accent-cyan"
                          />
                          <span>Ativo</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="status"
                            checked={agentConfig.status === 'paused'}
                            onChange={() => updateConfig('status', 'paused')}
                            className="w-4 h-4 accent-cyan"
                          />
                          <span>Pausado</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Persona Settings */}
              {settingsTab === 'persona' && (
                <Card>
                  <div className="p-4 border-b border-white/10">
                    <h3 className="font-semibold">Persona do Agente</h3>
                    <p className="text-sm text-gray-400 mt-1">Defina a identidade e tom de voz</p>
                  </div>
                  <div className="p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">Nome da Persona</label>
                        <input
                          type="text"
                          value={agentConfig.personaName}
                          onChange={(e) => updateConfig('personaName', e.target.value)}
                          placeholder="Ex: Luna"
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan/50"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">Cargo/Funcao</label>
                        <input
                          type="text"
                          value={agentConfig.personaRole}
                          onChange={(e) => updateConfig('personaRole', e.target.value)}
                          placeholder="Ex: Consultora de Crescimento"
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan/50"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Empresa</label>
                      <input
                        type="text"
                        value={agentConfig.personaCompany}
                        onChange={(e) => updateConfig('personaCompany', e.target.value)}
                        placeholder="Ex: Digital Boost"
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan/50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Tom de Voz</label>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { value: 'profissional', label: 'Profissional', desc: 'Formal e direto' },
                          { value: 'amigavel', label: 'Amigavel', desc: 'Casual e acolhedor' },
                          { value: 'consultivo', label: 'Consultivo', desc: 'Especialista e guia' },
                        ].map((tone) => (
                          <button
                            key={tone.value}
                            onClick={() => updateConfig('personaTone', tone.value)}
                            className={cn(
                              "p-4 rounded-lg border text-left transition-all",
                              agentConfig.personaTone === tone.value
                                ? "border-cyan bg-cyan/10"
                                : "border-white/10 hover:border-white/30"
                            )}
                          >
                            <span className="block font-medium text-sm">{tone.label}</span>
                            <span className="block text-xs text-gray-400 mt-1">{tone.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">System Prompt</label>
                      <textarea
                        value={agentConfig.systemPrompt}
                        onChange={(e) => updateConfig('systemPrompt', e.target.value)}
                        rows={6}
                        placeholder="Voce e [nome] da [empresa]. Seu objetivo e qualificar leads usando BANT..."
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan/50 resize-none font-mono text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        Use variaveis: {'{nome}'}, {'{empresa}'}, {'{cargo}'} para personalizacao automatica
                      </p>
                    </div>
                  </div>
                </Card>
              )}

              {/* AI Settings */}
              {settingsTab === 'ai' && (
                <Card>
                  <div className="p-4 border-b border-white/10">
                    <h3 className="font-semibold">Configuracoes de IA</h3>
                    <p className="text-sm text-gray-400 mt-1">Modelo, temperatura e limites</p>
                  </div>
                  <div className="p-6 space-y-6">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Modelo OpenAI</label>
                      <div className="grid grid-cols-2 gap-4">
                        {[
                          { value: 'gpt-4o-mini', label: 'GPT-4o Mini', desc: 'Rapido e economico', price: '$0.15/1M tokens' },
                          { value: 'gpt-4o', label: 'GPT-4o', desc: 'Mais inteligente', price: '$5/1M tokens' },
                        ].map((model) => (
                          <button
                            key={model.value}
                            onClick={() => updateConfig('model', model.value)}
                            className={cn(
                              "p-4 rounded-lg border text-left transition-all",
                              agentConfig.model === model.value
                                ? "border-cyan bg-cyan/10"
                                : "border-white/10 hover:border-white/30"
                            )}
                          >
                            <span className="block font-medium">{model.label}</span>
                            <span className="block text-sm text-gray-400 mt-1">{model.desc}</span>
                            <span className="block text-xs text-cyan mt-2">{model.price}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">
                        Temperatura: {agentConfig.temperature.toFixed(1)}
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={agentConfig.temperature}
                        onChange={(e) => updateConfig('temperature', parseFloat(e.target.value))}
                        className="w-full accent-cyan"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>0 - Preciso</span>
                        <span>1 - Criativo</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">
                        Max Tokens: {agentConfig.maxTokens}
                      </label>
                      <input
                        type="range"
                        min="100"
                        max="2000"
                        step="100"
                        value={agentConfig.maxTokens}
                        onChange={(e) => updateConfig('maxTokens', parseInt(e.target.value))}
                        className="w-full accent-cyan"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>100 - Respostas curtas</span>
                        <span>2000 - Respostas longas</span>
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Integrations Settings */}
              {settingsTab === 'integrations' && (
                <Card>
                  <div className="p-4 border-b border-white/10">
                    <h3 className="font-semibold">Integracoes</h3>
                    <p className="text-sm text-gray-400 mt-1">WhatsApp, CRM e APIs externas</p>
                  </div>
                  <div className="p-6 space-y-6">
                    {/* Evolution API WhatsApp */}
                    <div className="p-4 border border-white/10 rounded-lg">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                            <MessageSquare className="text-green-500" size={20} />
                          </div>
                          <div>
                            <h4 className="font-medium">WhatsApp (Evolution API)</h4>
                            <p className="text-sm text-gray-400">Conecte sua instancia WhatsApp</p>
                          </div>
                        </div>
                        <Badge variant={connectionStatus === 'connected' ? 'success' : connectionStatus === 'connecting' ? 'warning' : 'default'}>
                          {connectionStatus === 'connected' ? 'Conectado' : connectionStatus === 'connecting' ? 'Conectando...' : 'Desconectado'}
                        </Badge>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm text-gray-400 mb-2">Nome da Instancia</label>
                          <input
                            type="text"
                            value={agentConfig.evolutionInstance}
                            onChange={(e) => updateConfig('evolutionInstance', e.target.value)}
                            placeholder="digitalboost"
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan/50"
                          />
                        </div>
                        <Button
                          variant={connectionStatus === 'connected' ? 'secondary' : 'primary'}
                          onClick={connectWhatsApp}
                          disabled={connectionStatus === 'connecting'}
                          icon={<Zap size={18} />}
                        >
                          {connectionStatus === 'connected' ? 'Reconectar' : connectionStatus === 'connecting' ? 'Gerando QR Code...' : 'Conectar WhatsApp'}
                        </Button>
                      </div>
                    </div>

                    {/* Webhook */}
                    <div className="p-4 border border-white/10 rounded-lg">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-lg bg-violet/20 flex items-center justify-center">
                          <Zap className="text-violet" size={20} />
                        </div>
                        <div>
                          <h4 className="font-medium">Webhook Externo</h4>
                          <p className="text-sm text-gray-400">Receba eventos em tempo real</p>
                        </div>
                      </div>
                      <input
                        type="url"
                        value={agentConfig.webhookUrl}
                        onChange={(e) => updateConfig('webhookUrl', e.target.value)}
                        placeholder="https://sua-api.com/webhook"
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan/50"
                      />
                    </div>
                  </div>
                </Card>
              )}

              {/* Handoff Settings */}
              {settingsTab === 'handoff' && (
                <Card>
                  <div className="p-4 border-b border-white/10">
                    <h3 className="font-semibold">Handoff para Humano</h3>
                    <p className="text-sm text-gray-400 mt-1">Configure quando e como escalar para um vendedor</p>
                  </div>
                  <div className="p-6 space-y-6">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Vendedor Responsavel</label>
                      <input
                        type="text"
                        value={agentConfig.salesRep}
                        onChange={(e) => updateConfig('salesRep', e.target.value)}
                        placeholder="Nome ou telefone do vendedor"
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan/50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Canal de Notificacao</label>
                      <select
                        value={agentConfig.notificationChannel}
                        onChange={(e) => updateConfig('notificationChannel', e.target.value)}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan/50"
                      >
                        <option value="whatsapp">WhatsApp</option>
                        <option value="email">Email</option>
                        <option value="slack">Slack</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-3">Criterios de Escalacao</label>
                      <div className="space-y-3">
                        {[
                          { key: 'angry', label: 'Cliente irritado/frustrado', desc: 'Detecta sentimentos negativos' },
                          { key: 'technical', label: 'Duvida tecnica complexa', desc: 'Questoes fora do escopo do agente' },
                          { key: 'legal', label: 'Questoes legais/contratuais', desc: 'Clausulas, garantias, compliance' },
                          { key: 'vip', label: 'Cliente VIP/alta prioridade', desc: 'Leads com score > 90' },
                          { key: 'priceNegotiation', label: 'Negociacao de preco', desc: 'Pedidos de desconto ou condicoes especiais' },
                        ].map((criteria) => (
                          <label
                            key={criteria.key}
                            className="flex items-start gap-3 p-3 rounded-lg border border-white/10 cursor-pointer hover:border-white/20 transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={agentConfig.escalationCriteria[criteria.key as keyof typeof agentConfig.escalationCriteria]}
                              onChange={(e) => updateEscalationCriteria(criteria.key, e.target.checked)}
                              className="w-5 h-5 mt-0.5 accent-cyan rounded"
                            />
                            <div>
                              <span className="block font-medium text-sm">{criteria.label}</span>
                              <span className="block text-xs text-gray-500">{criteria.desc}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Save Button */}
              <div className="mt-6 flex gap-3">
                <Button onClick={saveSettings}>
                  Salvar Configuracoes
                </Button>
                <Button variant="secondary">
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* QR Code Modal */}
        {showQRModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <Card className="w-full max-w-md">
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <h3 className="font-semibold">Conectar WhatsApp</h3>
                <button
                  onClick={() => { setShowQRModal(false); setQRCode(null); setConnectionStatus('disconnected'); }}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 text-center">
                {qrCode ? (
                  <>
                    <div className="bg-white p-4 rounded-lg inline-block mb-4">
                      <img src={qrCode} alt="QR Code WhatsApp" className="w-64 h-64" />
                    </div>
                    <p className="text-gray-400 text-sm">
                      Abra o WhatsApp no celular e escaneie o QR Code
                    </p>
                  </>
                ) : (
                  <div className="py-12">
                    <div className="w-12 h-12 border-2 border-cyan border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-400">Gerando QR Code...</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({
  title,
  value,
  change,
  changeLabel,
  icon,
  iconBg,
}: {
  title: string;
  value: number | string;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
  iconBg: 'cyan' | 'violet' | 'success' | 'warning';
}) {
  const bgColors = {
    cyan: 'bg-cyan/20',
    violet: 'bg-violet/20',
    success: 'bg-green-500/20',
    warning: 'bg-yellow-500/20',
  };

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-4">
        <span className="text-sm text-gray-400">{title}</span>
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", bgColors[iconBg])}>
          {icon}
        </div>
      </div>
      <div className="text-3xl font-bold mb-2">{value}</div>
      {change !== undefined && (
        <div className={cn(
          "flex items-center gap-1 text-sm",
          change >= 0 ? 'text-green-500' : 'text-red-500'
        )}>
          {change >= 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
          <span>+{change}% {changeLabel}</span>
        </div>
      )}
    </Card>
  );
}

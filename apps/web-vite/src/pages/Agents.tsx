import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bot, Plus, Play, Pause, Settings, MoreVertical } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import TopBar from '../components/layout/TopBar';
import { useSidebar } from '../App';
import { api } from '../lib/api';
import type { Agent } from '../lib/api';
import { formatNumber } from '../lib/utils';

export default function AgentsPage() {
  const { openSidebar } = useSidebar();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      const data = await api.getAgents();
      setAgents(data);
    } catch (error) {
      console.error('Erro ao carregar agentes:', error);
      // Mock data
      setAgents([
        {
          id: '1',
          name: 'ORBION SDR',
          type: 'sdr',
          status: 'active',
          channel: 'whatsapp',
          messagesProcessed: 15432,
          avgResponseTime: 2.3,
          createdAt: new Date().toISOString(),
        },
        {
          id: '2',
          name: 'Support Bot',
          type: 'support',
          status: 'paused',
          channel: 'chat',
          messagesProcessed: 8923,
          avgResponseTime: 1.8,
          createdAt: new Date(Date.now() - 86400000).toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: Agent['status']) => {
    const variants: Record<Agent['status'], 'success' | 'warning' | 'danger' | 'default'> = {
      active: 'success',
      paused: 'warning',
      offline: 'danger',
      draft: 'default',
      deleted: 'danger',
    };
    const labels: Record<Agent['status'], string> = {
      active: 'Ativo',
      paused: 'Pausado',
      offline: 'Offline',
      draft: 'Rascunho',
      deleted: 'Deletado',
    };
    return <Badge variant={variants[status]}>{labels[status]}</Badge>;
  };

  const getChannelIcon = (channel: Agent['channel']) => {
    const icons: Record<Agent['channel'], string> = {
      whatsapp: '📱',
      email: '📧',
      chat: '💬',
      voice: '🎙️',
    };
    return icons[channel];
  };

  return (
    <div className="min-h-screen">
      <TopBar title="Agentes" onMenuClick={openSidebar} />

      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Seus Agentes</h1>
            <p className="text-gray-400 mt-1">Gerencie seus agentes de IA</p>
          </div>
          <Link to="/agents/new">
            <Button icon={<Plus size={18} />}>Novo Agente</Button>
          </Link>
        </div>

        {/* Agents Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-cyan border-t-transparent rounded-full animate-spin" />
          </div>
        ) : agents.length === 0 ? (
          <Card className="text-center py-12">
            <Bot size={48} className="mx-auto text-gray-500 mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum agente criado</h3>
            <p className="text-gray-400 mb-6">Crie seu primeiro agente de IA para comecar</p>
            <Link to="/agents/new">
              <Button>Criar Agente</Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent) => (
              <Link key={agent.id} to={`/agents/${agent.id}`}>
                <Card hover className="relative cursor-pointer">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan/20 to-violet/20 flex items-center justify-center">
                        <Bot size={24} className="text-cyan" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{agent.name}</h3>
                        <p className="text-sm text-gray-400 flex items-center gap-1">
                          {getChannelIcon(agent.channel)} {agent.channel}
                        </p>
                      </div>
                    </div>
                    <button
                      className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                      onClick={(e) => e.preventDefault()}
                    >
                      <MoreVertical size={18} className="text-gray-400" />
                    </button>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Status</span>
                      {getStatusBadge(agent.status)}
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Mensagens</span>
                      <span>{formatNumber(agent.messagesProcessed || 0)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Tempo medio</span>
                      <span>{agent.avgResponseTime || 0}s</span>
                    </div>
                  </div>

                  <div className="flex gap-2" onClick={(e) => e.preventDefault()}>
                    {agent.status === 'active' ? (
                      <Button variant="secondary" size="sm" className="flex-1" icon={<Pause size={14} />}>
                        Pausar
                      </Button>
                    ) : (
                      <Button variant="secondary" size="sm" className="flex-1" icon={<Play size={14} />}>
                        Ativar
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" icon={<Settings size={14} />}>
                      Config
                    </Button>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

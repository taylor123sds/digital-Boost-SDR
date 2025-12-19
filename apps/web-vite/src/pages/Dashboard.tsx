import { useEffect, useState } from 'react';
import {
  Users,
  Bot,
  MessageCircle,
  TrendingUp,
  ArrowUpRight,
  Activity
} from 'lucide-react';
import { Card, StatCard } from '../components/ui/Card';
import TopBar from '../components/layout/TopBar';
import { api } from '../lib/api';
import type { DashboardStats } from '../lib/api';
import { formatNumber, formatDateTime } from '../lib/utils';
import { Link } from 'react-router-dom';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (error) {
      console.error('Erro ao carregar stats:', error);
      // Mock data for development
      setStats({
        totalLeads: 1247,
        activeAgents: 3,
        messagesTotal: 45892,
        conversionRate: 12.5,
        leadsByStage: [
          { stage: 'Novo', count: 342 },
          { stage: 'Qualificado', count: 189 },
          { stage: 'Proposta', count: 87 },
          { stage: 'Negociacao', count: 45 },
          { stage: 'Fechado', count: 156 },
        ],
        recentActivity: [
          { id: '1', type: 'message', description: 'Nova mensagem de Joao Silva', timestamp: new Date().toISOString() },
          { id: '2', type: 'lead', description: 'Lead Maria Santos qualificado', timestamp: new Date(Date.now() - 300000).toISOString() },
          { id: '3', type: 'campaign', description: 'Campanha "Black Friday" iniciada', timestamp: new Date(Date.now() - 600000).toISOString() },
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-cyan border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <TopBar title="Dashboard" />

      <div className="p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total de Leads"
            value={formatNumber(stats?.totalLeads || 0)}
            change={{ value: 12.5, positive: true }}
            icon={<Users size={24} className="text-cyan" />}
          />
          <StatCard
            title="Agentes Ativos"
            value={stats?.activeAgents || 0}
            icon={<Bot size={24} className="text-violet" />}
          />
          <StatCard
            title="Mensagens Enviadas"
            value={formatNumber(stats?.messagesTotal || 0)}
            change={{ value: 8.3, positive: true }}
            icon={<MessageCircle size={24} className="text-green-400" />}
          />
          <StatCard
            title="Taxa de Conversao"
            value={`${stats?.conversionRate || 0}%`}
            change={{ value: 2.1, positive: true }}
            icon={<TrendingUp size={24} className="text-yellow-400" />}
          />
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pipeline / Funnel */}
          <Card className="lg:col-span-2">
            <h3 className="text-lg font-semibold mb-6">Pipeline de Vendas</h3>
            <div className="space-y-4">
              {stats?.leadsByStage.map((stage, index) => {
                const maxCount = Math.max(...(stats?.leadsByStage.map(s => s.count) || [1]));
                const percentage = (stage.count / maxCount) * 100;
                const colors = ['bg-cyan', 'bg-blue-500', 'bg-violet', 'bg-purple-500', 'bg-green-500'];

                return (
                  <div key={stage.stage} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">{stage.stage}</span>
                      <span className="font-medium">{stage.count}</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${colors[index % colors.length]} transition-all duration-500`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Recent Activity */}
          <Card>
            <h3 className="text-lg font-semibold mb-6">Atividade Recente</h3>
            <div className="space-y-4">
              {stats?.recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <div className="p-2 rounded-lg bg-gradient-to-br from-cyan/20 to-violet/20">
                    <Activity size={16} className="text-cyan" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-300 truncate">
                      {activity.description}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDateTime(activity.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link to="/agents/new">
            <Card hover className="cursor-pointer group">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium mb-1">Criar Agente</h4>
                  <p className="text-sm text-gray-400">Configure um novo agente de IA</p>
                </div>
                <ArrowUpRight className="text-gray-400 group-hover:text-cyan transition-colors" />
              </div>
            </Card>
          </Link>
          <Link to="/campaigns">
            <Card hover className="cursor-pointer group">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium mb-1">Nova Campanha</h4>
                  <p className="text-sm text-gray-400">Inicie uma campanha de prospeccao</p>
                </div>
                <ArrowUpRight className="text-gray-400 group-hover:text-cyan transition-colors" />
              </div>
            </Card>
          </Link>
          <Link to="/analytics">
            <Card hover className="cursor-pointer group">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium mb-1">Ver Analytics</h4>
                  <p className="text-sm text-gray-400">Analise metricas detalhadas</p>
                </div>
                <ArrowUpRight className="text-gray-400 group-hover:text-cyan transition-colors" />
              </div>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}

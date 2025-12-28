import { useEffect, useState } from 'react';
import { TrendingUp, Users, MessageCircle, Clock } from 'lucide-react';
import { Card, StatCard } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import TopBar from '../components/layout/TopBar';
import { api } from '../lib/api';
import type { AnalyticsData, ChannelBreakdownItem, TopAgentItem } from '../lib/api';

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [channels, setChannels] = useState<ChannelBreakdownItem[]>([]);
  const [topAgents, setTopAgents] = useState<TopAgentItem[]>([]);
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [period]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const [result, channelData, agentData] = await Promise.all([
        api.getAnalytics(period),
        api.getChannelBreakdown(),
        api.getTopAgents()
      ]);
      setData(result);
      setChannels(channelData);
      setTopAgents(agentData);
    } catch (error) {
      console.error('Erro ao carregar analytics:', error);
      setData({
        metrics: {
          totalConversations: 0,
          avgResponseTime: 0,
          conversionRate: 0,
          satisfactionScore: 0,
        },
        chartData: {
          labels: [],
          conversations: [],
          conversions: [],
        },
      });
      setChannels([]);
      setTopAgents([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <TopBar title="Analytics" />

      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Metricas e Analytics</h1>
            <p className="text-gray-400 mt-1">Acompanhe a performance dos seus agentes</p>
          </div>
          <div className="flex gap-2">
            {(['7d', '30d', '90d'] as const).map((p) => (
              <Button
                key={p}
                variant={period === p ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setPeriod(p)}
              >
                {p === '7d' ? '7 dias' : p === '30d' ? '30 dias' : '90 dias'}
              </Button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-cyan border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Total Conversas"
                value={data?.metrics.totalConversations || 0}
                icon={<MessageCircle size={24} className="text-cyan" />}
              />
              <StatCard
                title="Tempo Medio Resposta"
                value={`${data?.metrics.avgResponseTime || 0}s`}
                icon={<Clock size={24} className="text-violet" />}
              />
              <StatCard
                title="Taxa de Conversao"
                value={`${data?.metrics.conversionRate || 0}%`}
                icon={<TrendingUp size={24} className="text-green-400" />}
              />
              <StatCard
                title="Satisfacao"
                value={`${data?.metrics.satisfactionScore || 0}/5`}
                icon={<Users size={24} className="text-yellow-400" />}
              />
            </div>

            {/* Chart */}
            <Card>
              <h3 className="text-lg font-semibold mb-6">Conversas por Dia</h3>
              <div className="h-64 flex items-end gap-4">
                {data?.chartData.labels.map((label, index) => {
                  const value = data?.chartData.conversations[index] || 0;
                  const maxValue = Math.max(...(data?.chartData.conversations || [1]));
                  const height = (value / maxValue) * 100;

                  return (
                    <div key={label} className="flex-1 flex flex-col items-center">
                      <div className="w-full flex flex-col items-center">
                        <span className="text-sm text-gray-400 mb-2">{value}</span>
                        <div
                          className="w-full bg-gradient-to-t from-cyan to-violet rounded-t-lg transition-all duration-500"
                          style={{ height: `${height * 2}px` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 mt-2">{label}</span>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Additional Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <h3 className="text-lg font-semibold mb-4">Performance por Canal</h3>
                <div className="space-y-4">
                  {channels.map((item) => {
                    const value = Number(item.percentage) || 0;
                    const color = item.channel === 'whatsapp'
                      ? 'bg-green-500'
                      : item.channel === 'email'
                        ? 'bg-blue-500'
                        : 'bg-violet';
                    return (
                    <div key={item.channel} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-300">{item.channel}</span>
                        <span className="font-medium">{value}%</span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${color} transition-all duration-500`}
                          style={{ width: `${value}%` }}
                        />
                      </div>
                    </div>
                  );})}
                  {channels.length === 0 && (
                    <p className="text-sm text-gray-400">Sem dados de canais.</p>
                  )}
                </div>
              </Card>

              <Card>
                <h3 className="text-lg font-semibold mb-4">Top Agentes</h3>
                <div className="space-y-3">
                  {topAgents.map((agent, index) => (
                    <div key={agent.name} className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                      <span className="w-6 h-6 rounded-full bg-gradient-to-r from-cyan to-violet flex items-center justify-center text-xs font-bold text-dark-bg">
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium">{agent.name}</p>
                        <p className="text-xs text-gray-400">{agent.conversations} conversas</p>
                      </div>
                      <span className="text-sm text-green-400">{agent.conversionRate}%</span>
                    </div>
                  ))}
                  {topAgents.length === 0 && (
                    <p className="text-sm text-gray-400">Sem dados de agentes.</p>
                  )}
                </div>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

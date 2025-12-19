'use client';

import { useEffect, useState } from 'react';
import {
  MessageCircle,
  Clock,
  TrendingUp,
  Star,
  Calendar,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { Card, StatCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import TopBar from '@/components/layout/TopBar';
import { api, AnalyticsData } from '@/lib/api';
import { formatNumber } from '@/lib/utils';

type Period = '7d' | '30d' | '90d';

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>('30d');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [period]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const result = await api.getAnalytics(period);
      setData(result);
    } catch (error) {
      // Mock data
      const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
      const labels = Array.from({ length: days }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (days - i - 1));
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
      });

      setData({
        metrics: {
          totalConversations: 15847,
          avgResponseTime: 2.4,
          conversionRate: 12.8,
          satisfactionScore: 4.6,
        },
        chartData: {
          labels: labels.slice(-10),
          conversations: Array.from({ length: 10 }, () => Math.floor(Math.random() * 500) + 200),
          conversions: Array.from({ length: 10 }, () => Math.floor(Math.random() * 50) + 20),
        },
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-cyan border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <TopBar title="Analytics" />

      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">Analytics</h2>
            <p className="text-gray-400 mt-1">Métricas e performance dos agentes</p>
          </div>
          <div className="flex gap-2">
            {(['7d', '30d', '90d'] as Period[]).map((p) => (
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

        {/* Main Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total de Conversas"
            value={formatNumber(data?.metrics.totalConversations || 0)}
            change={{ value: 15.3, positive: true }}
            icon={<MessageCircle size={24} className="text-cyan" />}
          />
          <StatCard
            title="Tempo Médio de Resposta"
            value={`${data?.metrics.avgResponseTime || 0}s`}
            change={{ value: 8.2, positive: true }}
            icon={<Clock size={24} className="text-green-400" />}
          />
          <StatCard
            title="Taxa de Conversão"
            value={`${data?.metrics.conversionRate || 0}%`}
            change={{ value: 2.1, positive: true }}
            icon={<TrendingUp size={24} className="text-violet" />}
          />
          <StatCard
            title="Satisfação"
            value={`${data?.metrics.satisfactionScore || 0}/5`}
            change={{ value: 0.3, positive: true }}
            icon={<Star size={24} className="text-yellow-400" />}
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Conversations Chart */}
          <Card>
            <h3 className="text-lg font-semibold mb-6">Conversas por Dia</h3>
            <div className="h-64 flex items-end gap-2">
              {data?.chartData.conversations.map((value, index) => {
                const maxValue = Math.max(...(data?.chartData.conversations || [1]));
                const height = (value / maxValue) * 100;

                return (
                  <div key={index} className="flex-1 flex flex-col items-center gap-2">
                    <div
                      className="w-full bg-gradient-to-t from-cyan to-violet rounded-t-lg transition-all hover:opacity-80"
                      style={{ height: `${height}%` }}
                    />
                    <span className="text-xs text-gray-500 truncate">
                      {data?.chartData.labels[index]}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Conversions Chart */}
          <Card>
            <h3 className="text-lg font-semibold mb-6">Conversões por Dia</h3>
            <div className="h-64 flex items-end gap-2">
              {data?.chartData.conversions.map((value, index) => {
                const maxValue = Math.max(...(data?.chartData.conversions || [1]));
                const height = (value / maxValue) * 100;

                return (
                  <div key={index} className="flex-1 flex flex-col items-center gap-2">
                    <div
                      className="w-full bg-gradient-to-t from-green-500 to-cyan rounded-t-lg transition-all hover:opacity-80"
                      style={{ height: `${height}%` }}
                    />
                    <span className="text-xs text-gray-500 truncate">
                      {data?.chartData.labels[index]}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Performing Agents */}
          <Card>
            <h3 className="text-lg font-semibold mb-6">Agentes Top</h3>
            <div className="space-y-4">
              {[
                { name: 'ORBION SDR', conversations: 5432, rate: 15.2 },
                { name: 'Suporte Geral', conversations: 3218, rate: 92.1 },
                { name: 'Qualificador', conversations: 1847, rate: 28.4 },
              ].map((agent, index) => (
                <div key={agent.name} className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan to-violet flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{agent.name}</p>
                    <p className="text-sm text-gray-400">
                      {formatNumber(agent.conversations)} conversas
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-green-400">{agent.rate}%</p>
                    <p className="text-xs text-gray-500">taxa</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Peak Hours */}
          <Card>
            <h3 className="text-lg font-semibold mb-6">Horários de Pico</h3>
            <div className="space-y-4">
              {[
                { hour: '09:00 - 11:00', messages: 2847 },
                { hour: '14:00 - 16:00', messages: 2156 },
                { hour: '19:00 - 21:00', messages: 1892 },
                { hour: '11:00 - 13:00', messages: 1654 },
              ].map((slot) => {
                const maxMessages = 2847;
                const width = (slot.messages / maxMessages) * 100;

                return (
                  <div key={slot.hour} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">{slot.hour}</span>
                      <span className="text-gray-400">{formatNumber(slot.messages)}</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan to-violet"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Response Distribution */}
          <Card>
            <h3 className="text-lg font-semibold mb-6">Distribuição de Respostas</h3>
            <div className="space-y-4">
              {[
                { label: 'Resolvido pelo agente', value: 68, color: 'bg-green-500' },
                { label: 'Transferido para humano', value: 18, color: 'bg-yellow-500' },
                { label: 'Sem resposta', value: 9, color: 'bg-gray-500' },
                { label: 'Opt-out', value: 5, color: 'bg-red-500' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${item.color}`} />
                  <div className="flex-1">
                    <p className="text-sm text-gray-300">{item.label}</p>
                  </div>
                  <p className="font-medium">{item.value}%</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

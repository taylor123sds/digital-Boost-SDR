'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bot, Plus, MoreVertical, Zap, MessageCircle, Clock } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import TopBar from '@/components/layout/TopBar';
import { api, Agent } from '@/lib/api';
import { formatNumber } from '@/lib/utils';

export default function AgentsPage() {
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
      // Mock data for development
      setAgents([
        {
          id: '1',
          name: 'ORBION SDR',
          type: 'sdr',
          status: 'active',
          channel: 'whatsapp',
          messagesProcessed: 12847,
          avgResponseTime: 2.3,
          createdAt: '2024-01-15',
        },
        {
          id: '2',
          name: 'Suporte Geral',
          type: 'support',
          status: 'active',
          channel: 'whatsapp',
          messagesProcessed: 8432,
          avgResponseTime: 1.8,
          createdAt: '2024-02-20',
        },
        {
          id: '3',
          name: 'Qualificador',
          type: 'custom',
          status: 'paused',
          channel: 'email',
          messagesProcessed: 3421,
          avgResponseTime: 4.5,
          createdAt: '2024-03-10',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: Agent['status']) => {
    const variants = {
      active: 'success',
      paused: 'warning',
      offline: 'danger',
    } as const;

    const labels = {
      active: 'Ativo',
      paused: 'Pausado',
      offline: 'Offline',
    };

    return <Badge variant={variants[status]}>{labels[status]}</Badge>;
  };

  const getTypeBadge = (type: Agent['type']) => {
    const labels = {
      sdr: 'SDR',
      support: 'Suporte',
      custom: 'Custom',
    };

    return <Badge variant="info">{labels[type]}</Badge>;
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
      <TopBar title="Agentes" />

      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold">Seus Agentes</h2>
            <p className="text-gray-400 mt-1">Gerencie e configure seus agentes de IA</p>
          </div>
          <Link href="/agents/new">
            <Button icon={<Plus size={18} />}>
              Novo Agente
            </Button>
          </Link>
        </div>

        {/* Agents Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent) => (
            <Link key={agent.id} href={`/agents/${agent.id}`}>
              <Card hover className="h-full">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-cyan/20 to-violet/20">
                      <Bot size={24} className="text-cyan" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{agent.name}</h3>
                      <div className="flex gap-2 mt-1">
                        {getTypeBadge(agent.type)}
                        {getStatusBadge(agent.status)}
                      </div>
                    </div>
                  </div>
                  <button className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                    <MoreVertical size={18} className="text-gray-400" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-glass-border">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
                      <MessageCircle size={14} />
                    </div>
                    <p className="font-semibold">{formatNumber(agent.messagesProcessed)}</p>
                    <p className="text-xs text-gray-500">Mensagens</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
                      <Clock size={14} />
                    </div>
                    <p className="font-semibold">{agent.avgResponseTime}s</p>
                    <p className="text-xs text-gray-500">Tempo Resp.</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
                      <Zap size={14} />
                    </div>
                    <p className="font-semibold capitalize">{agent.channel}</p>
                    <p className="text-xs text-gray-500">Canal</p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}

          {/* Add Agent Card */}
          <Link href="/agents/new">
            <Card hover className="h-full flex items-center justify-center min-h-[200px] border-dashed border-2 border-glass-border bg-transparent">
              <div className="text-center">
                <div className="p-4 rounded-full bg-white/5 inline-block mb-3">
                  <Plus size={24} className="text-gray-400" />
                </div>
                <p className="text-gray-400">Adicionar Agente</p>
              </div>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}

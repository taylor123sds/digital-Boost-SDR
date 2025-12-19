'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Megaphone,
  Plus,
  Play,
  Pause,
  MoreVertical,
  Users,
  Send,
  TrendingUp
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/Table';
import TopBar from '@/components/layout/TopBar';
import { api, Campaign } from '@/lib/api';
import { formatNumber, formatDate } from '@/lib/utils';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      const data = await api.getCampaigns();
      setCampaigns(data);
    } catch (error) {
      // Mock data
      setCampaigns([
        {
          id: '1',
          name: 'Black Friday 2024',
          status: 'active',
          type: 'prospecting',
          totalLeads: 5420,
          sentCount: 3218,
          responseRate: 24.5,
          createdAt: '2024-03-01T10:00:00Z',
        },
        {
          id: '2',
          name: 'Reativação Q1',
          status: 'completed',
          type: 'reactivation',
          totalLeads: 1850,
          sentCount: 1850,
          responseRate: 18.2,
          createdAt: '2024-02-15T14:30:00Z',
        },
        {
          id: '3',
          name: 'Nurturing - Leads Frios',
          status: 'paused',
          type: 'nurture',
          totalLeads: 892,
          sentCount: 456,
          responseRate: 12.8,
          createdAt: '2024-03-10T09:00:00Z',
        },
        {
          id: '4',
          name: 'Prospecção Tech',
          status: 'draft',
          type: 'prospecting',
          totalLeads: 2100,
          sentCount: 0,
          responseRate: 0,
          createdAt: '2024-03-14T16:00:00Z',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: Campaign['status']) => {
    const config = {
      draft: { variant: 'default' as const, label: 'Rascunho' },
      active: { variant: 'success' as const, label: 'Ativa' },
      paused: { variant: 'warning' as const, label: 'Pausada' },
      completed: { variant: 'info' as const, label: 'Concluída' },
    };

    const { variant, label } = config[status];
    return <Badge variant={variant}>{label}</Badge>;
  };

  const getTypeBadge = (type: Campaign['type']) => {
    const labels = {
      prospecting: 'Prospecção',
      nurture: 'Nurture',
      reactivation: 'Reativação',
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
      <TopBar title="Campanhas" />

      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Campanhas</h2>
            <p className="text-gray-400 mt-1">Gerencie suas campanhas de outbound</p>
          </div>
          <Button icon={<Plus size={18} />}>
            Nova Campanha
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-cyan/20 to-violet/20">
                <Megaphone size={20} className="text-cyan" />
              </div>
              <div>
                <p className="text-2xl font-bold">{campaigns.length}</p>
                <p className="text-sm text-gray-400">Campanhas</p>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-green-500/20">
                <Play size={20} className="text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {campaigns.filter(c => c.status === 'active').length}
                </p>
                <p className="text-sm text-gray-400">Ativas</p>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-violet/20">
                <Users size={20} className="text-violet" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {formatNumber(campaigns.reduce((acc, c) => acc + c.totalLeads, 0))}
                </p>
                <p className="text-sm text-gray-400">Leads Total</p>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-yellow-500/20">
                <TrendingUp size={20} className="text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {(campaigns.reduce((acc, c) => acc + c.responseRate, 0) / campaigns.length).toFixed(1)}%
                </p>
                <p className="text-sm text-gray-400">Taxa Média</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Campaigns Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableHead>Campanha</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Progresso</TableHead>
              <TableHead>Taxa de Resposta</TableHead>
              <TableHead>Criada em</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableHeader>
            <TableBody>
              {campaigns.map((campaign) => {
                const progress = campaign.totalLeads > 0
                  ? (campaign.sentCount / campaign.totalLeads) * 100
                  : 0;

                return (
                  <TableRow key={campaign.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-cyan/20 to-violet/20">
                          <Megaphone size={18} className="text-cyan" />
                        </div>
                        <div>
                          <p className="font-medium">{campaign.name}</p>
                          <p className="text-sm text-gray-400">
                            {formatNumber(campaign.totalLeads)} leads
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getTypeBadge(campaign.type)}</TableCell>
                    <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                    <TableCell>
                      <div className="w-32">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-400">
                            {formatNumber(campaign.sentCount)} enviados
                          </span>
                          <span>{progress.toFixed(0)}%</span>
                        </div>
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-cyan to-violet transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={campaign.responseRate >= 20 ? 'text-green-400' : 'text-gray-300'}>
                        {campaign.responseRate}%
                      </span>
                    </TableCell>
                    <TableCell className="text-gray-400 text-sm">
                      {formatDate(campaign.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {campaign.status === 'active' ? (
                          <button className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                            <Pause size={16} className="text-yellow-400" />
                          </button>
                        ) : campaign.status !== 'completed' ? (
                          <button className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                            <Play size={16} className="text-green-400" />
                          </button>
                        ) : null}
                        <button className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                          <MoreVertical size={16} className="text-gray-400" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}

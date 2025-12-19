import { useEffect, useState } from 'react';
import { Plus, Play, Pause, BarChart3 } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import TopBar from '../components/layout/TopBar';
import { api } from '../lib/api';
import type { Campaign } from '../lib/api';
import { formatNumber } from '../lib/utils';

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
      console.error('Erro ao carregar campanhas:', error);
      // Mock data
      setCampaigns([
        { id: '1', name: 'Black Friday 2024', status: 'active', type: 'prospecting', totalLeads: 1500, sentCount: 890, responseRate: 12.5, createdAt: new Date().toISOString() },
        { id: '2', name: 'Natal Promocional', status: 'draft', type: 'nurture', totalLeads: 800, sentCount: 0, responseRate: 0, createdAt: new Date().toISOString() },
        { id: '3', name: 'Reativacao Q4', status: 'paused', type: 'reactivation', totalLeads: 450, sentCount: 320, responseRate: 8.2, createdAt: new Date().toISOString() },
        { id: '4', name: 'Lancamento Produto', status: 'completed', type: 'prospecting', totalLeads: 2000, sentCount: 2000, responseRate: 15.3, createdAt: new Date().toISOString() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: Campaign['status']) => {
    const config = {
      draft: { variant: 'default', label: 'Rascunho' },
      active: { variant: 'success', label: 'Ativa' },
      paused: { variant: 'warning', label: 'Pausada' },
      completed: { variant: 'info', label: 'Concluida' },
    } as const;
    const { variant, label } = config[status];
    return <Badge variant={variant}>{label}</Badge>;
  };

  const getTypeLabel = (type: Campaign['type']) => {
    const labels = {
      prospecting: 'Prospeccao',
      nurture: 'Nurture',
      reactivation: 'Reativacao',
    };
    return labels[type];
  };

  return (
    <div className="min-h-screen">
      <TopBar title="Campanhas" />

      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Campanhas</h1>
            <p className="text-gray-400 mt-1">Gerencie suas campanhas de outreach</p>
          </div>
          <Button icon={<Plus size={18} />}>Nova Campanha</Button>
        </div>

        {/* Campaigns Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-cyan border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {campaigns.map((campaign) => (
              <Card key={campaign.id}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">{campaign.name}</h3>
                    <p className="text-sm text-gray-400">{getTypeLabel(campaign.type)}</p>
                  </div>
                  {getStatusBadge(campaign.status)}
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-400">Total Leads</p>
                    <p className="text-xl font-semibold">{formatNumber(campaign.totalLeads)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Enviados</p>
                    <p className="text-xl font-semibold">{formatNumber(campaign.sentCount)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Taxa Resposta</p>
                    <p className="text-xl font-semibold text-cyan">{campaign.responseRate}%</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan to-violet transition-all"
                      style={{ width: `${(campaign.sentCount / campaign.totalLeads) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {Math.round((campaign.sentCount / campaign.totalLeads) * 100)}% concluido
                  </p>
                </div>

                <div className="flex gap-2">
                  {campaign.status === 'active' ? (
                    <Button variant="secondary" size="sm" className="flex-1" icon={<Pause size={14} />}>
                      Pausar
                    </Button>
                  ) : campaign.status !== 'completed' ? (
                    <Button variant="secondary" size="sm" className="flex-1" icon={<Play size={14} />}>
                      Iniciar
                    </Button>
                  ) : null}
                  <Button variant="ghost" size="sm" icon={<BarChart3 size={14} />}>
                    Relatorio
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    type: 'prospecting' as Campaign['type']
  });

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      const data = await api.getCampaigns();
      setCampaigns(data);
    } catch (error) {
      console.error('Erro ao carregar campanhas:', error);
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCampaign = async () => {
    if (!newCampaign.name.trim()) {
      alert('Nome da campanha é obrigatório.');
      return;
    }
    setCreating(true);
    try {
      await api.createCampaign({
        name: newCampaign.name.trim(),
        type: newCampaign.type
      });
      setShowCreateModal(false);
      setNewCampaign({ name: '', type: 'prospecting' });
      loadCampaigns();
    } finally {
      setCreating(false);
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
          <Button icon={<Plus size={18} />} onClick={() => setShowCreateModal(true)}>
            Nova Campanha
          </Button>
        </div>

        {/* Campaigns Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-cyan border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {campaigns.map((campaign) => {
              const progress = campaign.totalLeads > 0
                ? (campaign.sentCount / campaign.totalLeads) * 100
                : 0;

              return (
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
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {Math.round(progress)}% concluido
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
              );
            })}
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <Card className="w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">Nova Campanha</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Nome</label>
                <input
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10"
                  value={newCampaign.name}
                  onChange={(e) => setNewCampaign(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Tipo</label>
                <select
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10"
                  value={newCampaign.type}
                  onChange={(e) => setNewCampaign(prev => ({ ...prev, type: e.target.value as Campaign['type'] }))}
                >
                  <option value="prospecting">Prospeccao</option>
                  <option value="nurture">Nurture</option>
                  <option value="reactivation">Reativacao</option>
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
                  Cancelar
                </Button>
                <Button loading={creating} onClick={handleCreateCampaign}>
                  Criar
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

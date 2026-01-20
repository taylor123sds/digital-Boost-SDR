import { useEffect, useState } from 'react';
import { Search, Filter, Plus, RefreshCw } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import TopBar from '../components/layout/TopBar';
import { useSidebar } from '../App';
import LeadDetailModal from '../components/crm/LeadDetailModal';
import LeadCreateModal from '../components/crm/LeadCreateModal';
import { api } from '../lib/api';
import type { Lead } from '../lib/api';
import { useActiveAgentId, useAgent } from '../contexts/AgentContext';

export default function CRMPage() {
  const { openSidebar } = useSidebar();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stages, setStages] = useState<Array<{ id: string; label: string; color: 'default' | 'success' | 'warning' | 'danger' | 'info' }>>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Agent context for data isolation
  const agentId = useActiveAgentId();
  const { activeAgent, loading: agentLoading } = useAgent();

  // Reload leads when active agent changes
  useEffect(() => {
    if (!agentLoading) {
      loadLeads();
    }
  }, [agentId, agentLoading]);

  const loadLeads = async () => {
    setLoading(true);
    try {
      const data = await api.getLeads({ agentId });
      setLeads(data.leads || []);
    } catch (error) {
      console.error('Erro ao carregar leads:', error);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!leads.length) {
      setStages([]);
      return;
    }

    const uniqueStages = Array.from(
      new Set(leads.map(lead => lead.stage).filter(Boolean))
    );

    const palette: Array<'info' | 'success' | 'warning' | 'default'> = ['info', 'success', 'warning', 'default'];
    const mapped = uniqueStages.map((stage, index) => ({
      id: stage,
      label: stage.charAt(0).toUpperCase() + stage.slice(1),
      color: palette[index % palette.length]
    }));
    setStages(mapped);
  }, [leads]);

  const handleLeadClick = (lead: Lead) => {
    setSelectedLead(lead);
    setModalOpen(true);
  };

  const handleLeadUpdate = (updatedLead: Lead) => {
    setLeads(prev => prev.map(l => l.id === updatedLead.id ? updatedLead : l));
    setSelectedLead(updatedLead);
  };

  const handleLeadCreate = (newLead: Lead) => {
    setLeads(prev => [newLead, ...prev]);
  };

  const getLeadsByStage = (stageId: string) => {
    return leads
      .filter(lead => lead.stage === stageId)
      .filter(lead => {
        if (!search) return true;
        const searchLower = search.toLowerCase();
        return (
          lead.name?.toLowerCase().includes(searchLower) ||
          lead.company?.toLowerCase().includes(searchLower) ||
          lead.phone?.includes(search) ||
          lead.email?.toLowerCase().includes(searchLower)
        );
      });
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getTotalLeads = () => {
    if (!search) return leads.length;
    return leads.filter(lead => {
      const searchLower = search.toLowerCase();
      return (
        lead.name?.toLowerCase().includes(searchLower) ||
        lead.company?.toLowerCase().includes(searchLower) ||
        lead.phone?.includes(search) ||
        lead.email?.toLowerCase().includes(searchLower)
      );
    }).length;
  };

  return (
    <div className="min-h-screen">
      <TopBar title="CRM" onMenuClick={openSidebar} />

      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold">Pipeline de Leads</h1>
              {activeAgent && (
                <span className="px-2 py-1 text-xs bg-cyan/10 text-cyan border border-cyan/20 rounded-full">
                  {activeAgent.name}
                </span>
              )}
            </div>
            <p className="text-gray-400 mt-1">
              {getTotalLeads()} leads {search && `encontrados de ${leads.length}`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-64">
              <Input
                placeholder="Buscar leads..."
                value={search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                icon={<Search size={18} />}
              />
            </div>
            <button
              onClick={() => loadLeads()}
              className="p-2 rounded-lg hover:bg-white/5 transition-colors"
              title="Recarregar"
            >
              <RefreshCw size={20} className={`text-gray-400 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button className="p-2 rounded-lg hover:bg-white/5 transition-colors">
              <Filter size={20} className="text-gray-400" />
            </button>
            <Button icon={<Plus size={18} />} onClick={() => setCreateModalOpen(true)}>
              Novo Lead
            </Button>
          </div>
        </div>

        {stages.length > 0 && (
          <div className="grid grid-cols-5 gap-4 mb-6">
            {stages.map((stage) => {
              const count = getLeadsByStage(stage.id).length;
              return (
                <div
                  key={stage.id}
                  className="p-4 bg-white/5 rounded-xl border border-white/10"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant={stage.color as any}>{stage.label}</Badge>
                    <span className="text-2xl font-bold">{count}</span>
                  </div>
                  <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r from-cyan to-violet transition-all`}
                      style={{ width: `${leads.length ? (count / leads.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Kanban Board */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-cyan border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Carregando leads...</p>
            </div>
          </div>
        ) : stages.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Nenhum lead encontrado</div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4">
              {stages.map((stage) => {
                const stageLeads = getLeadsByStage(stage.id);
                return (
                  <div key={stage.id} className="flex-shrink-0 w-80">
                    <div className="flex items-center justify-between mb-4 sticky top-0 bg-dark-bg py-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={stage.color as any}>{stage.label}</Badge>
                        <span className="text-sm text-gray-400">{stageLeads.length}</span>
                      </div>
                    </div>
                    <div className="space-y-3 min-h-[200px]">
                      {stageLeads.length === 0 ? (
                        <div className="p-4 border border-dashed border-white/10 rounded-xl text-center text-gray-500 text-sm">
                          Nenhum lead
                        </div>
                      ) : (
                        stageLeads.map((lead) => (
                          <Card
                            key={lead.id}
                            hover
                            className="cursor-pointer"
                            onClick={() => handleLeadClick(lead)}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan/20 to-violet/20 flex items-center justify-center text-sm font-bold">
                                  {lead.name?.charAt(0) || '?'}
                                </div>
                                <div>
                                  <h4 className="font-medium">{lead.name}</h4>
                                  <p className="text-sm text-gray-400">{lead.company}</p>
                                </div>
                              </div>
                              <div className={`px-2 py-1 rounded text-xs font-medium ${getScoreColor(lead.score)} bg-white/5`}>
                                {lead.score}
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-white/5">
                              <span>{lead.phone}</span>
                              <span>{new Date(lead.createdAt).toLocaleDateString('pt-BR')}</span>
                            </div>
                          </Card>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
        )}
      </div>

      {/* Lead Detail Modal */}
      <LeadDetailModal
        lead={selectedLead}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onUpdate={handleLeadUpdate}
        stages={stages}
      />

      {/* Lead Create Modal */}
      <LeadCreateModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreate={handleLeadCreate}
        agentId={agentId}
      />
    </div>
  );
}
